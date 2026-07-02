const QUOTES = {
  cap:    ['HAIR FORCE ONE!', 'TO THE MOON!', 'TREMENDOUS LIFT!'],
  spring: ['HUGE BOUNCE!', 'THE BEST SPRING!', 'YUGE!'],
  shield: ['GOLDEN DOME!', 'TOTALLY PROTECTED!'],
  magnet: ['MONEY MAGNET!', 'GIMME THOSE COINS!'],
  coins:  ['SO MUCH WINNING!', 'BILLIONS AND BILLIONS!', 'ART OF THE DEAL!'],
  drone:  ['DRONE? WRONG!', 'FAKE NEWS DRONE!', 'NOBODY ZAPS BETTER!'],
  missile: ['MISSILE? PATHETIC!', 'NOT EVEN CLOSE!'],
  ambient: [
    'NOBODY JUMPS BETTER!', 'TREMENDOUS ALTITUDE!',
    'THE BEST STRAIT, BELIEVE ME!', 'SO HIGH, SO BEAUTIFUL!',
    'I OWN THIS SKY!',
  ],
  milestone: ['HUGE MILESTONE!', 'RECORD BREAKING!', 'UNBELIEVABLE!'],
};

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    buildTextures(this);
    const save = window.SAVE.data;
    this.saveData = save;
    buildMapTextures(this, save.map);
    buildShipTextures(this, save.ship);
    this.tankerKey = 'tanker-' + save.ship;
    this.boatKey = 'boat-' + save.ship;
    const map = CATALOG.MAPS[save.map];

    const SS = window.SS, TS = window.TEX_SCALE;
    // Render at SS× resolution but keep the world in logical 480×800 units.
    window.setupCamera(this);
    const W = this.scale.width / SS, H = this.scale.height / SS;
    this.W = W; this.H = H;

    this.dead = false;
    this.gameOver = false;
    this.paused = false;
    this.flying = false;
    this.flyUntil = 0;
    this.shieldUntil = 0;
    this.magnetUntil = 0;
    this.coinCount = 0;
    this.maxMeters = 0;
    this.nextMilestone = 300;
    this.baseY = H - 150;
    this.lastQuoteAt = 0;
    this.consecutiveBarrels = 0;

    // upgrade-scaled powerup durations
    this.jetDur = 2300 + 500 * save.up.jet;
    this.domeDur = 7000 + 1800 * save.up.dome;
    this.magDur = 6000 + 1500 * save.up.magnet;

    // --- background ---
    this.add.image(W / 2, H / 2, 'sky-' + save.map).setScale(TS).setScrollFactor(0).setDepth(-10);
    this.sun = this.add.image(W / 2, H - 340, map.sun === 'moon' ? 'moon' : 'sun')
      .setScale(1.6 * TS).setScrollFactor(0).setDepth(-9);
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      const c = this.add.image(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 'cloud'
      ).setScrollFactor(0).setDepth(-8).setTint(map.cloudTint)
       .setAlpha(0.6).setScale(Phaser.Math.FloatBetween(0.6, 1.2) * TS);
      c.speed = Phaser.Math.FloatBetween(6, 18);
      c.par = Phaser.Math.FloatBetween(0.08, 0.2);
      c.baseY = c.y;
      this.clouds.push(c);
    }
    this.add.image(W / 2, this.baseY - 60, 'coast').setScale(TS).setDepth(-7);
    this.sea = this.add.image(W / 2, H - 60, 'sea-' + save.map).setScale(TS).setDepth(5);

    // --- groups ---
    this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
    this.springs = this.physics.add.group({ allowGravity: false, immovable: true });
    this.items = this.physics.add.group({ allowGravity: false, immovable: true });
    this.drones = this.physics.add.group({ allowGravity: false, immovable: true });
    this.missiles = this.physics.add.group({ allowGravity: false, immovable: true });

    // --- player ---
    this.skin = window.SKIN || { idle: 'trump', fly: 'trump-fly', hit: null };
    this.player = this.physics.add.sprite(W / 2, this.baseY - 60, this.skin.idle);
    this.player.setDepth(10);
    const src = this.textures.get(this.skin.idle).getSourceImage();
    this.pScale = 94 / src.height;
    this.player.setScale(this.pScale);
    const bw = 42 / this.pScale, bh = 74 / this.pScale;
    this.player.body.setSize(bw, bh)
      .setOffset((src.width - bw) / 2, src.height - bh);
    this.player.setVelocityY(-400);

    this.spawnPlatform(W / 2, this.baseY, 'tanker');
    this.nextPlatformY = this.baseY - 100;
    for (let i = 0; i < 8; i++) this.spawnNext();

    // --- particles ---
    this.jetFlame = this.add.particles(0, 0, 'flame', {
      speed: { min: 120, max: 220 }, angle: { min: 80, max: 100 },
      scale: { start: 1.4 * TS, end: 0 }, lifespan: 380, quantity: 2,
      emitting: false,
    }).setDepth(9);
    this.jetFlame.startFollow(this.player, 0, 42);
    this.burst = this.add.particles(0, 0, 'spark', {
      speed: { min: 80, max: 260 }, scale: { start: 1 * TS, end: 0 },
      lifespan: 450, emitting: false,
    }).setDepth(12);

    this.aura = this.add.image(0, 0, 'aura').setScale(TS).setDepth(11).setVisible(false);

    // --- collisions ---
    this.physics.add.collider(
      this.player, this.platforms,
      (p, plat) => this.onLand(plat),
      () => this.player.body.velocity.y > 0 && !this.flying && !this.dead,
      this
    );
    this.physics.add.overlap(this.player, this.springs, (p, s) => {
      if (p.body.velocity.y > 0 && !this.dead) this.onSpring(s);
    });
    this.physics.add.overlap(this.player, this.items,
      (p, item) => this.collect(item));
    this.physics.add.overlap(this.player, this.drones,
      (p, d) => this.onHazard(d, 'drone'));
    this.physics.add.overlap(this.player, this.missiles,
      (p, m) => this.onHazard(m, 'missile'));

    // --- input ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D');
    this.input.keyboard.on('keydown-P', () => this.togglePause());

    this.buildHud();

    // ambient trash talk
    this.time.addEvent({
      delay: 9000, loop: true,
      callback: () => {
        if (!this.dead && !this.paused && !this.gameOver) this.quote('ambient', 0.55);
      },
    });

    this.cameras.main.scrollY = 0;
    this.camY = 0;
    window.VOICE.play(this, 'start');
  }

  buildHud() {
    const W = this.W;
    const hud = this.add.graphics().setScrollFactor(0).setDepth(19);
    hud.fillStyle(0x11142a, 0.6);
    hud.fillRoundedRect(10, 10, 140, 44, 12);
    hud.fillRoundedRect(10, 60, 112, 36, 12);
    hud.lineStyle(2, 0xf5c542, 0.4);
    hud.strokeRoundedRect(10, 10, 140, 44, 12);
    hud.strokeRoundedRect(10, 60, 112, 36, 12);

    this.scoreText = this.add.text(26, 32, '0 m', {
      fontFamily: FONT, fontSize: '24px', color: '#ffffff',
      stroke: '#71301f', strokeThickness: 5,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(20);
    this.add.image(30, 78, 'coin').setScale(0.85 * window.TEX_SCALE).setScrollFactor(0).setDepth(20);
    this.coinText = this.add.text(46, 78, '0', {
      fontFamily: FONT, fontSize: '18px', color: '#f5c542',
      stroke: '#71301f', strokeThickness: 4,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(20);
    this.powerText = this.add.text(W - 14, 60, '', {
      fontFamily: FONT, fontSize: '15px', color: '#ffe95e',
      stroke: '#71301f', strokeThickness: 4, align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);

    // mute + pause buttons
    const mkCircle = (x, label, cb) => {
      const c = this.add.circle(x, 32, 19, 0x11142a, 0.65)
        .setScrollFactor(0).setDepth(20)
        .setStrokeStyle(2, 0xf5c542, 0.5)
        .setInteractive({ useHandCursor: true });
      const t = this.add.text(x, 32, label, { fontSize: '17px' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(21);
      c.on('pointerdown', () => cb(t));
      return { c, t };
    };
    mkCircle(this.W - 32, this.saveData.muted ? '🔇' : '🔊', (t) => {
      this.saveData.muted = !this.saveData.muted;
      window.SAVE.save();
      t.setText(this.saveData.muted ? '🔇' : '🔊');
    });
    mkCircle(this.W - 76, '⏸', () => this.togglePause());

    // pause overlay (hidden)
    this.pauseOverlay = this.add.container(0, 0).setDepth(40).setVisible(false);
    const dim = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x090b18, 0.6)
      .setScrollFactor(0).setInteractive();
    dim.on('pointerdown', () => this.togglePause());
    this.pauseOverlay.add(dim);
    this.pauseOverlay.add(this.add.text(this.W / 2, this.H / 2 - 20, 'PAUSED', {
      fontFamily: FONT, fontSize: '48px', color: '#f5c542',
      stroke: '#71301f', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0));
    this.pauseOverlay.add(this.add.text(this.W / 2, this.H / 2 + 34, 'tap or press P to resume', {
      fontFamily: 'Arial', fontSize: '16px', color: '#ffd9a8',
    }).setOrigin(0.5).setScrollFactor(0));
  }

  togglePause() {
    if (this.gameOver) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.pausedAt = this.time.now;
      this.physics.world.pause();
      this.jetFlame.stop();
      this.pauseOverlay.setVisible(true);
    } else {
      const shift = this.time.now - this.pausedAt;
      this.flyUntil += shift;
      this.shieldUntil += shift;
      this.magnetUntil += shift;
      this.physics.world.resume();
      if (this.flying) this.jetFlame.start();
      this.pauseOverlay.setVisible(false);
    }
  }

  // ---------- spawning ----------

  difficulty() { return Phaser.Math.Clamp(this.maxMeters / 1500, 0, 1); }

  spawnPlatform(x, y, type) {
    const texKey = type === 'tanker' ? this.tankerKey
      : type === 'boat' ? this.boatKey : type;
    const SS = window.SS;
    const plat = this.platforms.create(x, y, texKey);
    plat.type = type;
    plat.setScale(window.TEX_SCALE);
    plat.setDepth(4);
    plat.body.checkCollision.down = false;
    plat.body.checkCollision.left = false;
    plat.body.checkCollision.right = false;
    // body sizes/offsets are in source (SS×) pixels, so scale them up by SS
    if (type === 'tanker') plat.body.setSize(140 * SS, 14 * SS).setOffset(5 * SS, 12 * SS);
    if (type === 'boat')   plat.body.setSize(96 * SS, 12 * SS).setOffset(7 * SS, 10 * SS);
    if (type === 'barrels') plat.body.setSize(90 * SS, 12 * SS).setOffset(3 * SS, 2 * SS);
    if (type === 'buoy')   plat.body.setSize(40 * SS, 12 * SS).setOffset(4 * SS, 30 * SS);
    if (type === 'boat') {
      const spd = (50 + 90 * this.difficulty()) * Phaser.Math.FloatBetween(0.8, 1.2);
      plat.setVelocityX(Phaser.Math.Between(0, 1) ? spd : -spd);
    }
    return plat;
  }

  spawnNext() {
    const d = this.difficulty();
    const gap = Phaser.Math.Between(75, 115 + Math.floor(85 * d));
    this.nextPlatformY -= gap;
    const y = this.nextPlatformY;
    const x = Phaser.Math.Between(70, this.W - 70);

    let type;
    const r = Math.random();
    if (r < 0.45 - 0.25 * d) type = 'tanker';
    else if (r < 0.70) type = 'boat';
    else if (r < 0.87) type = 'barrels';
    else type = 'buoy';

    if (type === 'barrels') {
      this.consecutiveBarrels++;
      if (this.consecutiveBarrels >= 2) { type = 'tanker'; this.consecutiveBarrels = 0; }
    } else this.consecutiveBarrels = 0;

    this.spawnPlatform(x, y, type);

    if (type === 'tanker') {
      const roll = Math.random();
      if (roll < 0.08) {
        this.springs.create(x + Phaser.Math.Between(-40, 40), y - 22, 'spring')
          .setScale(window.TEX_SCALE).setDepth(5);
      } else if (roll < 0.105) {
        this.spawnItem(x, y - 60, 'cap');
      } else if (roll < 0.13) {
        this.spawnItem(x, y - 60, 'shield');
      } else if (roll < 0.155) {
        this.spawnItem(x, y - 60, 'magnet');
      } else if (roll < 0.45) {
        const n = Phaser.Math.Between(1, 3);
        for (let i = 0; i < n; i++)
          this.spawnItem(x + (i - (n - 1) / 2) * 34, y - 50, 'coin');
      }
    } else if (Math.random() < 0.15) {
      this.spawnItem(x, y - 55, 'coin');
    }

    if (this.maxMeters > 500 && Math.random() < 0.02 + 0.10 * d) {
      const drone = this.drones.create(
        Phaser.Math.Between(60, this.W - 60), y - gap / 2, 'drone');
      drone.setScale(window.TEX_SCALE).setDepth(6);
      const spd = 60 + 130 * d;
      drone.setVelocityX(Phaser.Math.Between(0, 1) ? spd : -spd);
    }

    if (this.maxMeters > 1000 && Math.random() < 0.02 + 0.06 * d) {
      this.scheduleMissile();
    }
  }

  scheduleMissile() {
    const TS = window.TEX_SCALE;
    // each missile gets its own launch column and indicator; travels straight up
    const x = Phaser.Math.Between(50, this.W - 50);
    const iy = this.H - 92;
    // yellow warning at the entry point
    const warn = this.add.image(x, iy, 'warn')
      .setScale(TS * 1.3).setTint(0xffe95e)
      .setScrollFactor(0).setDepth(22);
    window.SFX.alarm();
    this.tweens.add({
      targets: warn, alpha: 0.2, duration: 190, yoyo: true, repeat: 3,
    });
    this.tweens.add({
      targets: warn, scale: TS * 1.7, duration: 380, yoyo: true, repeat: -1,
    });
    this.time.delayedCall(190 * 2 * 4, () => {
      warn.destroy();
      if (this.gameOver) return;
      const m = this.missiles.create(
        x, this.cameras.main.scrollY + this.H + 90, 'missile');
      m.setScale(TS).setDepth(8);
      m.setVelocityY(-680);
    });
  }

  spawnItem(x, y, type) {
    const it = this.items.create(x, y, type);
    it.itemType = type;
    it.setScale(window.TEX_SCALE);
    it.setDepth(6);
    if (type === 'coin') {
      this.tweens.add({ targets: it, scaleX: 0.15 * window.TEX_SCALE, duration: 380, yoyo: true, repeat: -1 });
    } else {
      this.tweens.add({ targets: it, y: y - 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  // ---------- gameplay events ----------

  onLand(plat) {
    this.player.setVelocityY(-800);
    window.SFX.jump();
    this.squash();
    if (plat.type === 'barrels') {
      plat.body.enable = false;
      this.tweens.add({
        targets: plat, y: plat.y + 60, alpha: 0, angle: 12, duration: 500,
        onComplete: () => plat.destroy(),
      });
    }
  }

  onSpring(s) {
    this.player.setVelocityY(-1250);
    window.SFX.spring();
    this.squash();
    this.tweens.add({ targets: s, scaleY: 0.5 * window.TEX_SCALE, duration: 90, yoyo: true });
    this.quote('spring', 0.4);
  }

  squash() {
    this.player.setScale(this.pScale * 1.15, this.pScale * 0.85);
    this.tweens.add({
      targets: this.player,
      scaleX: this.pScale, scaleY: this.pScale, duration: 180,
    });
  }

  collect(item) {
    if (this.dead) return;
    const t = item.itemType;
    this.burst.explode(14, item.x, item.y);
    item.destroy();
    if (t === 'coin') {
      this.coinCount++;
      window.SFX.coin();
      this.coinText.setText(`${this.coinCount}`);
      if (this.coinCount % 10 === 0) this.quote('coins', 1);
    } else if (t === 'cap') {
      this.flying = true;
      this.flyUntil = this.time.now + this.jetDur;
      this.player.setTexture(this.skin.fly);
      this.jetFlame.start();
      window.SFX.power();
      window.VOICE.play(this, 'power');
      this.quote('cap', 1);
    } else if (t === 'shield') {
      this.shieldUntil = this.time.now + this.domeDur;
      this.aura.setVisible(true);
      window.SFX.shield();
      window.VOICE.play(this, 'power');
      this.quote('shield', 1);
    } else if (t === 'magnet') {
      this.magnetUntil = this.time.now + this.magDur;
      window.SFX.power();
      window.VOICE.play(this, 'power');
      this.quote('magnet', 1);
    }
  }

  onHazard(obj, kind) {
    if (this.dead || !obj.active) return;
    const p = this.player;

    // stomp a drone from above: kill it, bounce off, survive.
    // side/bottom hits (not falling, or not clearly above) still kill.
    if (kind === 'drone' && !obj.stomped && !this.flying
        && this.time.now >= this.shieldUntil
        && p.body.velocity.y > 0 && p.y < obj.y - 4) {
      this.stompDrone(obj);
      return;
    }

    if (this.flying) {
      // jet flight smashes through everything for coins
      this.burst.explode(24, obj.x, obj.y);
      obj.destroy();
      window.SFX.zap();
      this.coinCount += 5;
      this.coinText.setText(`${this.coinCount}`);
      this.quote(kind, 1);
      this.cameras.main.shake(120, 0.008);
    } else if (this.time.now < this.shieldUntil) {
      // shield absorbs a single hit, then shatters
      this.burst.explode(24, obj.x, obj.y);
      obj.destroy();
      window.SFX.zap();
      this.quote(kind, 1);
      this.cameras.main.shake(120, 0.008);
      this.breakShield();
    } else {
      this.die();
    }
  }

  stompDrone(drone) {
    drone.stomped = true;
    drone.body.enable = false;
    this.burst.explode(14, drone.x, drone.y);
    window.SFX.zap();
    this.tweens.add({
      targets: drone, y: drone.y + 220, angle: 180, alpha: 0, duration: 650,
      onComplete: () => drone.destroy(),
    });
    this.player.setVelocityY(-780);
    this.squash();
    this.coinCount += 2;
    this.coinText.setText(`${this.coinCount}`);
    this.quote('drone', 1);
  }

  breakShield() {
    this.shieldUntil = 0;
    this.aura.setVisible(false);
    window.SFX.shield();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    window.SFX.hit();
    if (this.skin.hit) this.player.setTexture(this.skin.hit);
    else this.player.setTint(0xff7766);
    this.player.setVelocity(Phaser.Math.Between(-120, 120), -300);
    this.player.body.setAngularVelocity(400);
    this.player.body.checkCollision.none = true;
    this.cameras.main.shake(180, 0.007);
  }

  quote(kind, chance) {
    if (Math.random() > chance) return;
    if (this.time.now - this.lastQuoteAt < 900) return;
    this.lastQuoteAt = this.time.now;
    const txt = this.add.text(
      this.player.x, this.player.y - 70,
      Phaser.Utils.Array.GetRandom(QUOTES[kind]), {
        fontFamily: FONT, fontSize: '20px', color: '#ffe95e',
        stroke: '#a5382a', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(25);
    txt.x = Phaser.Math.Clamp(txt.x, txt.width / 2 + 8, this.W - txt.width / 2 - 8);
    this.tweens.add({
      targets: txt, y: txt.y - 60, alpha: 0, duration: 1300,
      ease: 'Cubic.out', onComplete: () => txt.destroy(),
    });
  }

  banner(msg) {
    const t = this.add.text(this.W / 2, 250, msg, {
      fontFamily: FONT, fontSize: '40px', color: '#f5c542',
      stroke: '#71301f', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(26).setScale(0);
    this.tweens.add({
      targets: t, scale: 1, duration: 350, ease: 'Back.out',
      onComplete: () => this.tweens.add({
        targets: t, alpha: 0, y: 210, delay: 900, duration: 500,
        onComplete: () => t.destroy(),
      }),
    });
  }

  // ---------- game over ----------

  endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    window.SFX.over();
    window.VOICE.play(this, 'death');
    this.physics.pause();
    this.jetFlame.stop();

    const save = this.saveData;
    const bonus = Math.floor(this.maxMeters / 20);
    const earned = this.coinCount + bonus;
    save.bank += earned;
    const score = this.maxMeters;
    const isBest = score > save.best;
    if (isBest) save.best = score;
    window.SAVE.save();

    const W = this.W, H = this.H;
    this.add.rectangle(W / 2, H / 2, W, H, 0x090b18, 0.7)
      .setScrollFactor(0).setDepth(30);
    uiPanel(this, W / 2 - 190, H / 2 - 240, 380, 480, { alpha: 0.9 })
      .setScrollFactor(0).setDepth(30);

    this.add.text(W / 2, H / 2 - 185, "YOU'RE FIRED!", {
      fontFamily: FONT, fontSize: '42px', color: '#ff5544',
      stroke: '#3a0d0d', strokeThickness: 9,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(31);

    const lines = [
      `altitude: ${this.maxMeters} m`,
      `coins: ${this.coinCount}  +  bonus: ${bonus}`,
      `bank deposit: +${earned}`,
      `bank total: ${save.bank}`,
    ];
    this.add.text(W / 2, H / 2 - 130, lines.join('\n'), {
      fontFamily: FONT, fontSize: '19px', color: '#ffe9c9',
      stroke: '#71301f', strokeThickness: 4, align: 'center', lineSpacing: 12,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(31);

    this.add.text(W / 2, H / 2 + 42,
      isBest ? 'NEW BEST! THE BEST EVER!' : `best: ${save.best} m`, {
        fontFamily: FONT, fontSize: '20px', color: '#f5c542',
        stroke: '#71301f', strokeThickness: 5,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(31);

    this.time.delayedCall(400, () => {
      uiButton(this, W / 2, H / 2 + 100, 240, 54, 'REMATCH',
        () => this.scene.restart(), { size: 24 })
        .setScrollFactor(0).setDepth(31);
      uiButton(this, W / 2 - 70, H / 2 + 170, 120, 46, 'SHOP',
        () => this.scene.start('Shop'), { color: 0xb8860b, size: 18 })
        .setScrollFactor(0).setDepth(31);
      uiButton(this, W / 2 + 70, H / 2 + 170, 120, 46, 'MENU',
        () => this.scene.start('Menu'), { color: 0x2b3a5e, size: 18 })
        .setScrollFactor(0).setDepth(31);
      this.input.keyboard.once('keydown-SPACE', () => this.scene.restart());
    });
  }

  // ---------- main loop ----------

  update(time, dt) {
    if (this.gameOver || this.paused) return;
    const p = this.player;
    const cam = this.cameras.main;

    if (!this.dead) {
      let dir = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown) dir = -1;
      if (this.cursors.right.isDown || this.keys.D.isDown) dir = 1;
      const ptr = this.input.activePointer;
      const SS = window.SS;
      if (ptr.isDown && ptr.y / SS > 105) dir = ptr.x / SS < this.W / 2 ? -1 : 1;
      p.setVelocityX(dir * 330);
      if (dir !== 0) p.setFlipX(dir < 0);
    }

    if (p.x < -20) p.x = this.W + 20;
    else if (p.x > this.W + 20) p.x = -20;

    if (this.flying) {
      if (time < this.flyUntil) {
        p.setVelocityY(-1050);
      } else {
        this.flying = false;
        p.setTexture(this.skin.idle);
        this.jetFlame.stop();
      }
    }

    if (time < this.shieldUntil) {
      this.aura.setVisible(true).setPosition(p.x, p.y);
      this.aura.rotation += 0.02 * dt / 16;
      if (this.shieldUntil - time < 1500) {
        this.aura.setAlpha(Math.sin(time / 80) > 0 ? 1 : 0.25);
      } else this.aura.setAlpha(1);
    } else this.aura.setVisible(false);

    // magnet pulls nearby coins
    if (time < this.magnetUntil) {
      this.items.children.iterate(it => {
        if (!it || it.itemType !== 'coin') return;
        const d2 = Phaser.Math.Distance.Between(it.x, it.y, p.x, p.y);
        if (d2 < 240) this.physics.moveToObject(it, p, 460);
      });
    }

    const bits = [];
    if (this.flying) bits.push(`JET ${((this.flyUntil - time) / 1000).toFixed(1)}s`);
    if (time < this.shieldUntil) bits.push(`DOME ${((this.shieldUntil - time) / 1000).toFixed(1)}s`);
    if (time < this.magnetUntil) bits.push(`MAGNET ${((this.magnetUntil - time) / 1000).toFixed(1)}s`);
    this.powerText.setText(bits.join('\n'));

    const targetY = p.y - this.H * 0.42;
    if (targetY < this.camY) this.camY = targetY;
    cam.scrollY = this.camY;

    const meters = Math.max(0, Math.floor((this.baseY - 60 - p.y) / 10));
    if (meters > this.maxMeters && !this.dead) {
      this.maxMeters = meters;
      this.scoreText.setText(`${meters} m`);
      if (meters >= this.nextMilestone) {
        this.banner(`${this.nextMilestone} m!`);
        this.quote('milestone', 0.8);
        window.VOICE.play(this, 'milestone');
        this.nextMilestone += 300;
      }
    }

    this.clouds.forEach(c => {
      c.x += c.speed * dt / 1000;
      if (c.x > this.W + 70) c.x = -70;
      c.y = Phaser.Math.Wrap(c.baseY - cam.scrollY * c.par, -60, this.H + 60);
    });

    this.platforms.children.iterate(pl => {
      if (!pl || pl.type !== 'boat') return;
      if (pl.x < 60 && pl.body.velocity.x < 0) pl.body.velocity.x *= -1;
      if (pl.x > this.W - 60 && pl.body.velocity.x > 0) pl.body.velocity.x *= -1;
      if (pl.body.velocity.x !== 0) pl.setFlipX(pl.body.velocity.x < 0);
    });
    this.drones.children.iterate(d => {
      if (!d || d.stomped) return;
      if (d.x < 40 && d.body.velocity.x < 0) d.body.velocity.x *= -1;
      if (d.x > this.W - 40 && d.body.velocity.x > 0) d.body.velocity.x *= -1;
      d.y += Math.sin(time / 300 + d.x) * 0.4;
    });

    while (this.nextPlatformY > cam.scrollY - 250) this.spawnNext();
    const cull = cam.scrollY + this.H + 120;
    [this.platforms, this.springs, this.items, this.drones].forEach(g =>
      g.children.iterate(o => { if (o && o.y > cull) o.destroy(); }));
    this.missiles.children.iterate(m => {
      if (m && m.y < cam.scrollY - 200) m.destroy();
    });

    if (p.y > cam.scrollY + this.H + 80) {
      if (!this.dead) this.dead = true;
      this.endGame();
    }
  }
}
