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
    this.counting = false;
    this.pendingMissiles = 0;
    this.flying = false;
    this.flyUntil = 0;
    this.shieldUntil = 0;
    this.shieldOn = false;
    this.magnetUntil = 0;
    this.coinCount = 0;
    this.billCount = 0; // rare Trump Bucks collected this run
    this.maxMeters = 0;
    this.bestCrossed = false;
    this.nextMilestone = 300;
    this.baseY = H - 150;
    this.lastQuoteAt = 0;
    this.consecutiveBarrels = 0;

    // upgrade-scaled powerup durations
    this.jetDur = 2800 + 500 * save.up.jet;
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
    this.skin = window.SKIN || { idle: 'skin-trump-idle', fly: 'skin-trump-fly', hit: null };
    // per-skin jet powerup art (falls back to the MAGA cap); only use the
    // custom texture if it actually loaded
    const skinDef = (window.CATALOG.SKINS[window.SAVE.data.skin]) || {};
    this.capKey = (skinDef.cap && this.textures.exists(skinDef.cap)) ? skinDef.cap : 'cap';
    this.player = this.physics.add.sprite(W / 2, this.baseY - 60, this.skin.idle);
    this.player.setDepth(10);
    const src = this.textures.get(this.skin.idle).getSourceImage();
    this.pScale = 94 / src.height;
    this.player.setScale(this.pScale);
    // on-screen size of the standing character's longest extent; the hit/dying
    // pose is scaled to match this so it never renders bigger
    this.idleRenderedMax = this.contentMax(this.skin.idle) * this.pScale;
    // fly pose: keep the body/head the same size as the idle by matching the
    // dimension the pose does NOT extend. Raised hands stretch the content
    // height, spread arms stretch the width — max() picks the un-extended
    // dimension, so the limbs overflow past the idle silhouette while the
    // head stays aligned (instead of the whole character shrinking).
    // (These contentBox calls also warm the pixel-scan cache now, during the
    // scene transition, so the first jet doesn't measure mid-run.)
    const idleBox = this.contentBox(this.skin.idle);
    const flyBox = this.contentBox(this.skin.fly);
    this.flyScale = this.pScale * Math.max(idleBox.w / flyBox.w, idleBox.h / flyBox.h);
    if (this.skin.hit) this.poseScale(this.skin.hit);
    const bw = 42 / this.pScale, bh = 74 / this.pScale;
    this.player.body.setSize(bw, bh)
      .setOffset((src.width - bw) / 2, src.height - bh);
    this.player.setVelocityY(-260);

    this.spawnPlatform(W / 2, this.baseY, 'tanker');
    this.nextPlatformY = this.baseY - 100;
    this.lastPlatX = W / 2; // each platform stays within reach of the last one
    for (let i = 0; i < 8; i++) this.spawnNext();

    this.addAltitudeMarkers();

    // the sea is a safe, invisible bounce floor at the very start — drifting off
    // the first platform into the water bounces you instead of killing you. It
    // is a normal platform, so it scrolls down and gets culled once you climb
    // clear of the start (after which a fall is lethal again).
    const water = this.platforms.create(W / 2, this.sea.y - 34, 'spark');
    water.type = 'water';
    water.setVisible(false).setScale(1);
    water.body.setSize(W * 3, 20);
    water.body.checkCollision.down = false;
    water.body.checkCollision.left = false;
    water.body.checkCollision.right = false;

    // --- particles ---
    // exiting to the menu mid-flight must not leave the jet loop playing
    this.events.once('shutdown', () => window.SFX.jetStop());

    this.jetFlame = this.add.particles(0, 0, 'flame', {
      speed: { min: 200, max: 360 }, angle: { min: 74, max: 106 },
      scale: { start: 2.2 * TS, end: 0 }, lifespan: 460, quantity: 4,
      frequency: 14, tint: [0xfff3b0, 0xffc24a, 0xff6a2a],
      emitting: false,
    }).setDepth(9);
    this.jetFlame.startFollow(this.player, 0, 42);
    this.burst = this.add.particles(0, 0, 'spark', {
      speed: { min: 80, max: 260 }, scale: { start: 1 * TS, end: 0 },
      lifespan: 450, emitting: false,
    }).setDepth(12);
    // water droplets flung up when a raft breaks the surface and sinks
    this.splash = this.add.particles(0, 0, 'spark', {
      speed: { min: 70, max: 200 }, angle: { min: 245, max: 295 },
      gravityY: 620, scale: { start: 0.9 * TS, end: 0 }, lifespan: 520,
      tint: [0xffffff, 0xbfe0ff, 0x7fb8e8], emitting: false,
    }).setDepth(5);

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
    this.input.keyboard.on('keydown-P', () => {
      if (this.counting) return;
      if (this.paused) this.continueCountdown();
      else this.pauseGame();
    });

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

    // LAUNCH PAD: if the player owns boost charges, offer a tap-to-launch button
    // for the first 2 seconds of the run
    this.offerStartupBoost();
  }

  // small icon-only boost button on the right for the first 2s; tapping it
  // spends one charge and fires the jet. Only one boost per run. Ignored
  // (charge kept) if the window closes unused.
  offerStartupBoost() {
    if (!this.saveData.boosts || this.saveData.boosts <= 0) return;
    const W = this.W, H = this.H;
    // lower corner, out of the way of the HUD/controls — big and bright so it
    // clearly reads as a tappable launch button. Side is a left-handed setting.
    const onLeft = this.saveData.boostSide === 'left';
    const bx = onLeft ? 62 : W - 62, by = H - 110;
    const c = this.add.container(bx, by).setScrollFactor(0).setDepth(41);
    this.boostBtnX = bx; this.boostBtnY = by;
    // soft glow ring behind the button
    const glow = this.add.circle(0, 0, 40, 0x4caf50, 0.22);
    const bg = this.add.circle(0, 0, 32, 0x2e7d32, 1)
      .setStrokeStyle(4, 0xaef5be, 0.95);
    const icon = this.add.image(0, 1, 'boost').setScale(1.05 * window.TEX_SCALE);
    c.add([glow, bg, icon]);
    c.setSize(64, 64).setInteractive({ useHandCursor: true });
    this.boostBtn = c;
    // a livelier pulse to catch the eye
    this.tweens.add({ targets: c, scale: 1.16, duration: 340, yoyo: true,
      repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: glow, alpha: 0.5, scale: 1.15, duration: 620,
      yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    c.on('pointerdown', () => this.useStartupBoost());
    // window closes after 2s if unused — the charge is kept for next run
    this.time.delayedCall(2000, () => this.hideBoostBtn());
  }

  useStartupBoost() {
    if (!this.boostBtn || this.flying || this.dead || this.gameOver) return;
    if (!this.saveData.boosts || this.saveData.boosts <= 0) { this.hideBoostBtn(); return; }
    this.saveData.boosts--;
    window.SAVE.save();
    this.hideBoostBtn();
    this.startBoost();
  }

  hideBoostBtn() {
    if (!this.boostBtn) return;
    const c = this.boostBtn; this.boostBtn = null;
    this.tweens.killTweensOf(c);
    this.tweens.add({ targets: c, alpha: 0, y: c.y + 16, duration: 250,
      onComplete: () => c.destroy(true) });
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
      // the jet loop runs across frames — sync it with the new mute state
      if (this.saveData.muted) window.SFX.jetStop();
      else if (this.flying && !this.paused) window.SFX.jetStart();
    });
    mkCircle(this.W - 76, '⏸', () => this.pauseGame());

    // pause overlay (hidden) — dim + title + CONTINUE / EXIT buttons, all
    // fixed to the screen and toggled together via setPauseUI()
    const dim = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x090b18, 0.72)
      .setScrollFactor(0).setDepth(40).setInteractive(); // swallow stray taps
    const title = this.add.text(this.W / 2, this.H / 2 - 96, 'PAUSED', {
      fontFamily: FONT, fontSize: '48px', color: '#f5c542',
      stroke: '#71301f', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(41);
    const contBtn = uiButton(this, this.W / 2, this.H / 2 - 12, 250, 58, 'CONTINUE',
      () => this.continueCountdown(), { color: 0x2e7d32, size: 24 })
      .setScrollFactor(0).setDepth(41);
    const exitBtn = uiButton(this, this.W / 2, this.H / 2 + 66, 250, 58, 'EXIT GAME',
      () => this.exitGame(), { color: 0xc9312b, size: 24 })
      .setScrollFactor(0).setDepth(41);
    const hint = this.add.text(this.W / 2, this.H / 2 + 118, 'exit ends the run', {
      fontFamily: 'Arial', fontSize: '13px', color: '#ffd9a8',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(41);
    this.pauseUI = [dim, title, contBtn, exitBtn, hint];
    this.setPauseUI(false);
  }

  setPauseUI(v) {
    this.pauseUI.forEach(o => o.setVisible(v));
  }

  pauseGame() {
    if (this.gameOver || this.paused) return;
    this.paused = true;
    this.pausedAt = this.time.now;
    this.physics.world.pause();
    this.jetFlame.stop();
    window.SFX.jetStop();
    this.setPauseUI(true);
  }

  // CONTINUE: hide the menu, run a 3-2-1 countdown, then resume play
  continueCountdown() {
    if (this.gameOver || this.counting) return;
    this.counting = true;
    this.setPauseUI(false);
    const label = this.add.text(this.W / 2, this.H / 2, '3', {
      fontFamily: FONT, fontSize: '120px', color: '#f5c542',
      stroke: '#71301f', strokeThickness: 12,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(41);
    let n = 3;
    const tick = () => {
      if (n === 0) {
        label.destroy();
        this.counting = false;
        this.resumeGame();
        return;
      }
      label.setText(`${n}`).setScale(0.4).setAlpha(1);
      this.tweens.add({ targets: label, scale: 1, duration: 320, ease: 'Back.out' });
      this.tweens.add({ targets: label, alpha: 0.15, duration: 900, delay: 100 });
      window.SFX.click();
      n--;
      this.time.delayedCall(1000, tick);
    };
    tick();
  }

  resumeGame() {
    // credit all paused time (menu + countdown) back to the active powerups
    const shift = this.time.now - this.pausedAt;
    this.flyUntil += shift;
    this.shieldUntil += shift;
    this.magnetUntil += shift;
    this.physics.world.resume();
    if (this.flying) { this.jetFlame.start(); window.SFX.jetStart(); }
    this.paused = false;
  }

  // EXIT GAME: kill the player instantly and drop straight to the score screen
  exitGame() {
    if (this.gameOver) return;
    this.paused = false;
    this.setPauseUI(false);
    this.physics.world.resume();
    this.die();
    this.endGame();
  }

  // ---------- spawning ----------

  difficulty() { return Phaser.Math.Clamp(this.maxMeters / 2600, 0, 1); }

  // overall tempo climbs with altitude so the run never gets stale. Jump
  // heights stay identical (bounce scales ×pace, gravity ×pace²) — only the
  // pacing quickens. Ramps on its own longer scale than difficulty() (which
  // caps at 2600m) so high-score play keeps speeding up: 1.0x at the start,
  // up to 1.4x by ~4000m.
  pace() { return 1 + 0.4 * Phaser.Math.Clamp(this.maxMeters / 4000, 0, 1); }

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
    if (type === 'buoy')   plat.body.setSize(40 * SS, 12 * SS).setOffset(6 * SS, 28 * SS); // duck's back
    if (type === 'boat') {
      // slower so a boat can't drift out of reach during a single jump
      const spd = (35 + 40 * this.difficulty()) * Phaser.Math.FloatBetween(0.8, 1.2);
      plat.setVelocityX(Phaser.Math.Between(0, 1) ? spd : -spd);
    }
    return plat;
  }

  spawnNext() {
    const d = this.difficulty();
    // keep the largest gap comfortably under the jump height (~240px) so the
    // player can always reach the next platform — never stranded with no room
    const gap = Phaser.Math.Between(75, 95 + Math.floor(15 * d));
    this.nextPlatformY -= gap;
    const y = this.nextPlatformY;
    // place within horizontal reach of the previous platform so there is always
    // a climbable path (fully random X could strand you far + high to the side)
    const x = Phaser.Math.Clamp(
      this.lastPlatX + Phaser.Math.Between(-165, 165), 70, this.W - 70);
    this.lastPlatX = x;

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

    // rare Trump Bucks drop — a premium currency, uncommon per platform
    if (Math.random() < 0.007) this.spawnItem(x, y - 74, 'bill');

    if (this.maxMeters > 500 && this.drones.countActive() < 2
        && Math.random() < 0.02 + 0.06 * d) {
      const drone = this.drones.create(
        Phaser.Math.Between(60, this.W - 60), y - gap / 2, 'drone');
      drone.setScale(window.TEX_SCALE).setDepth(6);
      const spd = 55 + 85 * d;
      drone.setVelocityX(Phaser.Math.Between(0, 1) ? spd : -spd);
      // blinking red light on the drone's top — a fixed-size overlay, so the
      // drone body never changes size and the hitbox stays clear
      const eye = this.add.image(drone.x, drone.y - 3, 'drone-eye')
        .setScale(window.TEX_SCALE).setDepth(7);
      drone.eye = eye;
      const blink = this.tweens.add({
        targets: eye, alpha: 0.1, duration: 300, yoyo: true, repeat: -1,
        ease: 'Sine.inOut',
      });
      drone.once('destroy', () => { blink.remove(); eye.destroy(); });
    }

    // missiles: one at a time to start, up to two together later in the run.
    // none while flying — you'd outrun them and never see the warning anyway
    if (!this.flying && this.maxMeters > 1000 && Math.random() < 0.015 + 0.04 * d) {
      const cap = this.maxMeters > 2000 ? 2 : 1;
      if (this.missiles.countActive() + this.pendingMissiles < cap) {
        this.scheduleMissile();
      }
    }
  }

  scheduleMissile() {
    const TS = window.TEX_SCALE;
    this.pendingMissiles++; // counts toward the cap during the warning phase
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
      this.pendingMissiles = Math.max(0, this.pendingMissiles - 1);
      warn.destroy();
      if (this.gameOver || this.flying) return; // don't launch during flight
      const m = this.missiles.create(
        x, this.cameras.main.scrollY + this.H + 90, 'missile');
      m.setScale(TS).setDepth(8);
      m.setVelocityY(-680);
    });
  }

  spawnItem(x, y, type) {
    // the jet powerup swaps its look per equipped skin (bucket hat for yohai67)
    const texKey = type === 'cap' ? this.capKey : type;
    const it = this.items.create(x, y, texKey);
    it.itemType = type;
    it.setScale(window.TEX_SCALE);
    it.setDepth(6);
    if (type === 'coin') {
      this.tweens.add({ targets: it, scaleX: 0.15 * window.TEX_SCALE, duration: 380, yoyo: true, repeat: -1 });
    } else if (type === 'bill') {
      // a rare bill floats higher and sways so it reads as a special pickup
      it.setDepth(7);
      this.tweens.add({ targets: it, y: y - 11, duration: 720, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: it, angle: 9, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    } else {
      this.tweens.add({ targets: it, y: y - 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  // ---------- gameplay events ----------

  onLand(plat) {
    this.player.setVelocityY(-560 * this.pace());
    // quack is disabled for now — every platform uses the normal jump blip.
    // the duck still gets its springy squeeze on landing.
    if (plat.type === 'buoy') this.squashDuck(plat);
    window.SFX.jump();
    this.squash();
    if (plat.type === 'barrels') this.breakRaft(plat);
  }

  // rubber-duck bounce: squash flat and wide, then spring back with a little
  // overshoot so it reads as elastic rubber taking the player's weight
  squashDuck(plat) {
    const TS = window.TEX_SCALE;
    this.tweens.killTweensOf(plat);
    plat.setScale(TS * 1.18, TS * 0.72);
    this.tweens.add({
      targets: plat, scaleX: TS, scaleY: TS, duration: 280, ease: 'Back.out',
    });
  }

  // a bounced raft shatters: the deck planks kick up, the drums tumble apart
  // and sink, and the surface throws a spray of droplets. Reads as the raft
  // giving way under the player instead of just sliding away.
  breakRaft(plat) {
    const TS = window.TEX_SCALE;
    plat.body.enable = false;
    plat.setVisible(false);
    const cx = plat.x, cy = plat.y;
    window.SFX.splash();
    this.splash.explode(18, cx, cy + 8 * TS);

    // three drums tumble outward and sink under the surface
    for (let i = 0; i < 3; i++) {
      const dir = i - 1; // -1, 0, +1
      const chunk = this.add.image(cx + dir * 32 * TS, cy + 8 * TS, 'barrel-chunk')
        .setScale(TS).setDepth(3);
      this.tweens.add({
        targets: chunk,
        x: chunk.x + dir * 55 + Phaser.Math.Between(-12, 12),
        y: chunk.y + 95 + Phaser.Math.Between(0, 30),
        angle: dir * 150 + Phaser.Math.Between(-40, 40),
        alpha: 0, duration: 640, ease: 'Quad.in',
        onComplete: () => chunk.destroy(),
      });
    }

    // deck planks pop up first, then fall back and splash down
    for (let i = 0; i < 3; i++) {
      const dir = i - 1;
      const plank = this.add.image(cx + dir * 26 * TS, cy - 4 * TS, 'plank-chunk')
        .setScale(TS).setDepth(6).setAngle(Phaser.Math.Between(-8, 8));
      this.tweens.add({
        targets: plank,
        x: plank.x + dir * 42, y: cy - 26 - Phaser.Math.Between(0, 14),
        angle: dir * 80, duration: 220, ease: 'Quad.out',
        onComplete: () => this.tweens.add({
          targets: plank, y: cy + 85, angle: plank.angle + dir * 130,
          alpha: 0, duration: 460, ease: 'Quad.in',
          onComplete: () => plank.destroy(),
        }),
      });
    }

    plat.destroy();
  }

  onSpring(s) {
    this.player.setVelocityY(-680 * this.pace());
    window.SFX.spring();
    this.squash();
    this.tweens.add({ targets: s, scaleY: 0.5 * window.TEX_SCALE, duration: 90, yoyo: true });
    this.quote('spring', 0.4);
  }

  squash() {
    // subtle launch stretch: a quick, gentle vertical stretch on takeoff that
    // eases back to normal — reads as a jump without wobbling in place
    this.tweens.killTweensOf(this.player);
    this.player.setScale(this.pScale * 0.96, this.pScale * 1.06);
    this.tweens.add({
      targets: this.player,
      scaleX: this.pScale, scaleY: this.pScale, duration: 160, ease: 'Quad.out',
    });
  }

  // jet takeoff: powerful ignition — spark burst, camera kick, launch stretch
  startBoost() {
    this.flying = true;
    this.flyUntil = this.time.now + this.jetDur;
    // clear any missiles already in the air so flight starts clean
    this.missiles.clear(true, true);
    this.player.setTexture(this.skin.fly);
    // cyan shield ring for the whole flight (and the grace window after) so
    // the invulnerability is visible; a running GOLDEN DOME keeps its gold ring
    if (this.time.now >= this.shieldUntil) this.aura.setTexture('aura-jet');
    this.aura.setVisible(true);
    this.jetFlame.start();
    window.SFX.jetStart();
    this.burst.explode(32, this.player.x, this.player.y + 24);
    this.cameras.main.shake(140, 0.003);
    this.tweens.killTweensOf(this.player);
    const fs = this.flyScale;
    this.player.setScale(fs * 0.86, fs * 1.2);
    this.tweens.add({
      targets: this.player, scaleX: fs, scaleY: fs,
      duration: 280, ease: 'Back.out',
    });
    window.SFX.power();
    window.VOICE.play(this, 'power');
    this.quote('cap', 1);
  }

  collect(item) {
    if (this.dead) return;
    const t = item.itemType;
    const ix = item.x, iy = item.y; // remember where it was picked up
    this.burst.explode(14, item.x, item.y);
    item.destroy();
    if (t === 'coin') {
      this.coinCount++;
      window.SFX.coin();
      this.coinText.setText(`${this.coinCount}`);
      if (this.coinCount % 10 === 0) this.quote('coins', 1);
    } else if (t === 'bill') {
      this.billCount++;
      window.SFX.power(); // richer chime than a coin — it's a rare pickup
      window.VOICE.play(this, 'power');
      this.billPop(ix, iy); // "+1 bill" flourish at the pickup spot (no total)
      this.quote('coins', 1);
    } else if (t === 'cap') {
      this.startBoost();
    } else if (t === 'shield') {
      this.shieldUntil = this.time.now + this.domeDur;
      this.aura.setTexture('aura').setVisible(true);
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

  // "+1 bill" flourish that pops right where the player grabbed the bill —
  // signals a rare pickup without ever showing the running total mid-game
  billPop(x, y) {
    const TS = window.TEX_SCALE;
    const icon = this.add.image(x, y, 'bill').setScale(0.2 * TS).setDepth(15);
    const txt = this.add.text(x, y - 22, '+1', {
      fontFamily: FONT, fontSize: '22px', color: '#9dfcb4',
      stroke: '#0e3b22', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(15).setScale(0);
    // punch in with an overshoot so it clearly pops at the pickup point
    this.tweens.add({ targets: icon, scale: 1.05 * TS, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: txt, scale: 1, duration: 260, ease: 'Back.out' });
    // hold a beat, then float up and fade out
    this.tweens.add({
      targets: [icon, txt], y: '-=52', alpha: 0, duration: 720, delay: 360,
      ease: 'Cubic.in', onComplete: () => { icon.destroy(); txt.destroy(); },
    });
  }

  onHazard(obj, kind) {
    if (this.dead || !obj.active) return;
    const p = this.player;

    // stomp a drone from above: kill it, bounce off, survive — and keep the
    // shield if one is running; only side/bottom contact consumes it.
    if (kind === 'drone' && !obj.stomped && !this.flying
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
      this.cameras.main.shake(110, 0.003);
    } else if (this.time.now < this.shieldUntil) {
      // shield absorbs a single hit, then shatters
      this.burst.explode(24, obj.x, obj.y);
      obj.destroy();
      window.SFX.zap();
      this.quote(kind, 1);
      this.cameras.main.shake(110, 0.003);
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
    // fade the blinking eye out with the body so the glow doesn't linger
    if (drone.eye) {
      this.tweens.killTweensOf(drone.eye);
      this.tweens.add({ targets: drone.eye, alpha: 0, duration: 400 });
    }
    this.tweens.add({
      targets: drone, y: drone.y + 220, angle: 180, alpha: 0, duration: 650,
      onComplete: () => drone.destroy(),
    });
    this.player.setVelocityY(-470 * this.pace());
    this.squash();
    this.coinCount += 2;
    this.coinText.setText(`${this.coinCount}`);
    this.quote('drone', 1);
  }

  breakShield() {
    this.shieldUntil = 0;
    this.shieldOn = false;
    this.popShield();
    this.aura.setVisible(false);
    window.SFX.shield();
  }

  // one-shot flourish when a shield ends (absorbed a hit or timed out):
  // the ring blows outward and fades, in the shield's own color
  popShield() {
    const pop = this.add.image(this.player.x, this.player.y, this.aura.texture.key)
      .setScale(this.aura.scale).setDepth(11);
    this.tweens.add({
      targets: pop, scale: this.aura.scale * 1.8, alpha: 0,
      duration: 340, ease: 'Quad.out',
      // ride along with the player — otherwise the ring hangs in the air
      // while the character keeps moving
      onUpdate: () => pop.setPosition(this.player.x, this.player.y),
      onComplete: () => pop.destroy(),
    });
  }

  // longest extent of the actual drawn character (non-transparent pixels),
  // ignoring transparent canvas padding.
  //
  // The result only feeds sprite sizing, so pixel-exact bounds aren't needed:
  // we scan a downscaled copy (~80px) instead of the full 300×360 image. A
  // full-res scan costs ~70ms — a visible stall on the first jet/hit of a run;
  // the small scan is ~1ms. Cached on window so it survives scene restarts and
  // is computed at most once per texture per session, not once per game.
  contentMax(key) {
    const b = this.contentBox(key);
    return Math.max(b.w, b.h);
  }

  // content bounding box (width/height of the drawn pixels) in original-image
  // pixels; same downscaled-scan + session cache scheme as described above.
  contentBox(key) {
    const cache = (window.__contentBoxCache = window.__contentBoxCache || {});
    if (cache[key] != null) return cache[key];
    const img = this.textures.get(key).getSourceImage();
    const scale = Math.min(1, 80 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0, w, h);
    const data = cx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 8) {
          found = true;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    // divide back out of the downscale to get the extents in original pixels
    const b = found ? { w: (maxX - minX) / scale, h: (maxY - minY) / scale }
                    : { w: img.width, h: img.height };
    cache[key] = b;
    return b;
  }

  // display scale for a pose: match the drawn character to the idle's on-screen
  // size (by content, not canvas) so a wide sprawled hit/dying frame or a
  // tightly-cropped image never renders bigger than other characters. The 0.8
  // factor makes a sprawled pose read a touch smaller than the standing idle.
  poseScale(key) {
    return 0.8 * this.idleRenderedMax / this.contentMax(key);
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    window.SFX.hit();
    if (this.skin.hit) {
      this.player.setTexture(this.skin.hit);
      this.player.setScale(this.poseScale(this.skin.hit));
    } else {
      this.player.setTint(0xff7766);
    }
    this.player.setVelocity(Phaser.Math.Between(-120, 120), -225);
    this.player.body.setAngularVelocity(400);
    this.player.body.checkCollision.none = true;
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

  // ---------- altitude markers: your best + leaderboard ghosts ----------

  // dashed line across the world at a given altitude, with a face avatar and
  // label riding its left end. Placed in world coords so it scrolls naturally.
  addAltitudeMarker(meters, label, faceKey, color, textColor) {
    const y = this.baseY - 60 - meters * 10;
    const g = this.add.graphics().setDepth(3).setAlpha(0.85);
    g.lineStyle(2.5, color, 0.6);
    for (let x = 6; x < this.W - 6; x += 20) g.lineBetween(x, y, x + 11, y);
    // face + label ride the right end of the line, above every world object
    // (platforms 4, items 6, missiles 8, player 10) so nothing can hide them;
    // only the fixed HUD (20) stays on top
    const face = this.textures.exists(faceKey) ? faceKey : 'face-trump';
    if (this.textures.exists(face)) {
      this.add.image(this.W - 28, y - 17, face).setScale(0.19).setDepth(12).setAlpha(0.95);
    }
    this.add.text(this.W - 48, y - 25, `${label} · ${meters}m`, {
      fontFamily: FONT, fontSize: '13px', color: textColor,
      stroke: '#71301f', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(12).setAlpha(0.95);
  }

  addAltitudeMarkers() {
    const best = this.saveData.best || 0;
    if (best > 0) {
      this.addAltitudeMarker(best, 'YOUR BEST',
        'face-' + (this.saveData.pfp || 'trump'), 0xf5c542, '#f5c542');
    }
    // leaderboard ghosts: the next few players above your best, so there is
    // always a visible target line to chase. Uses the leaderboard scene's
    // localStorage cache; falls back to a live fetch when the cache is empty.
    const place = (rows) => {
      const me = window.FB && window.FB.user && window.FB.user.uid;
      (rows || [])
        .filter(r => r && r.best > best && r.uid !== me)
        .sort((a, b) => a.best - b.best)
        .slice(0, 3)
        .forEach(r => this.addAltitudeMarker(r.best, r.username || 'anon',
          'face-' + (r.pfp || 'trump'), 0x9ecbff, '#cfe6ff'));
    };
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem('tj-lb-cache') || 'null'); } catch (e) {}
    if (cached && cached.length) place(cached);
    else if (window.FB && window.FB.topScores) {
      window.FB.topScores(50).then((rows) => {
        try { localStorage.setItem('tj-lb-cache', JSON.stringify(rows)); } catch (e) {}
        if (this.scene.isActive()) place(rows); // scene may have ended meanwhile
      }).catch(() => {});
    }
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
    window.SFX.jetStop();

    const save = this.saveData;
    const bonus = Math.floor(this.maxMeters / 20);
    const earned = this.coinCount + bonus;
    save.bank += earned;
    save.bills = (save.bills || 0) + this.billCount; // rare Trump Bucks
    const score = this.maxMeters;
    const isBest = score > save.best;
    if (isBest) save.best = score;
    // flush to the cloud immediately so earned money reaches the account even
    // if the player leaves the game-over screen before the debounced save fires
    window.SAVE.flush();
    if (window.FB && window.FB.user) window.FB.submitScore(score);

    // an extra stats line (Trump Bucks) needs more room, so grow the panel and
    // push the best line + buttons down to keep everything clear
    const extra = this.billCount > 0 ? 34 : 0;
    const W = this.W, H = this.H;
    this.add.rectangle(W / 2, H / 2, W, H, 0x090b18, 0.7)
      .setScrollFactor(0).setDepth(30);
    uiPanel(this, W / 2 - 190, H / 2 - 240, 380, 480 + extra, { alpha: 0.9 })
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

    // Trump Bucks earned this run get their own green highlight line, centered
    if (this.billCount > 0) {
      this.add.text(W / 2, H / 2 + 20,
        `TRUMP BUCKS  +${this.billCount}`, {
          fontFamily: FONT, fontSize: '18px', color: '#8ff0a8',
          stroke: '#1e5233', strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(31);
    }

    this.add.text(W / 2, H / 2 + 42 + extra,
      isBest ? 'NEW BEST! THE BEST EVER!' : `best: ${save.best} m`, {
        fontFamily: FONT, fontSize: '20px', color: '#f5c542',
        stroke: '#71301f', strokeThickness: 5,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(31);

    this.time.delayedCall(400, () => {
      uiButton(this, W / 2, H / 2 + 100 + extra, 240, 54, 'REMATCH',
        () => this.scene.restart(), { size: 24 })
        .setScrollFactor(0).setDepth(31);
      uiButton(this, W / 2 - 70, H / 2 + 170 + extra, 120, 46, 'SHOP',
        () => this.scene.start('Shop'), { color: 0xb8860b, size: 18 })
        .setScrollFactor(0).setDepth(31);
      uiButton(this, W / 2 + 70, H / 2 + 170 + extra, 120, 46, 'MENU',
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
    // tempo ramp: gravity ×pace² keeps jump heights constant while quickening
    this.physics.world.gravity.y = 650 * this.pace() ** 2;

    if (!this.dead) {
      let dir = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown) dir = -1;
      if (this.cursors.right.isDown || this.keys.D.isDown) dir = 1;
      const ptr = this.input.activePointer;
      const SS = window.SS;
      // while the boost button is showing, ignore touch-steering on it so a tap
      // to launch doesn't also nudge the player sideways
      const onBoost = this.boostBtn
        && Math.abs(ptr.x / SS - this.boostBtnX) < 46
        && Math.abs(ptr.y / SS - this.boostBtnY) < 46;
      if (ptr.isDown && ptr.y / SS > 105 && !onBoost) dir = ptr.x / SS < this.W / 2 ? -1 : 1;
      // scale run speed with the tempo so you can still aim in the shorter airtime
      p.setVelocityX(dir * 330 * this.pace());
      if (dir !== 0) p.setFlipX(dir < 0);
    }

    if (p.x < -20) p.x = this.W + 20;
    else if (p.x > this.W + 20) p.x = -20;

    if (this.flying) {
      if (time < this.flyUntil) {
        // ease toward cruise speed instead of snapping, so takeoff is smooth
        const vy = p.body.velocity.y;
        const cruise = -850 * this.pace();
        p.setVelocityY(vy + (cruise - vy) * Math.min(1, dt / 250));
      } else {
        this.flying = false;
        p.setTexture(this.skin.idle);
        p.setScale(this.pScale);
        this.jetFlame.stop();
        window.SFX.jetStop();
        // brief landing shield: the boost's leftover momentum still carries you
        // up faster than you can react, straight into any drone parked above —
        // an unavoidable insta-death. The existing shield (blinking aura, one
        // hit) covers that window; a running GOLDEN DOME is left untouched.
        // cyan ring: jet grace, not GOLDEN DOME (unless a dome is already up)
        if (time >= this.shieldUntil) this.aura.setTexture('aura-jet');
        this.shieldUntil = Math.max(this.shieldUntil, time + 1500);
      }
    }

    // the ring shows for the whole jet flight (smash-through is active) and
    // for any running shield; it only blinks when a shield timer is about to
    // run out — never mid-flight
    if (this.flying || time < this.shieldUntil) {
      this.shieldOn = true;
      this.aura.setVisible(true).setPosition(p.x, p.y);
      this.aura.rotation += 0.02 * dt / 16;
      if (!this.flying && this.shieldUntil - time < 1500) {
        this.aura.setAlpha(Math.sin(time / 80) > 0 ? 1 : 0.25);
      } else this.aura.setAlpha(1);
    } else {
      // timed out this frame (a broken shield already popped in breakShield)
      if (this.shieldOn) { this.shieldOn = false; this.popShield(); }
      this.aura.setVisible(false);
    }

    // keep each drone's blinking light glued to its top
    this.drones.children.iterate(dr => {
      if (dr && dr.eye) { dr.eye.x = dr.x; dr.eye.y = dr.y - 3; }
    });

    // magnet pulls nearby coins and bills
    if (time < this.magnetUntil) {
      this.items.children.iterate(it => {
        if (!it || (it.itemType !== 'coin' && it.itemType !== 'bill')) return;
        const d2 = Phaser.Math.Distance.Between(it.x, it.y, p.x, p.y);
        if (d2 < 240) this.physics.moveToObject(it, p, 460);
      });
    }

    const bits = [];
    if (this.flying) bits.push(`JET ${((this.flyUntil - time) / 1000).toFixed(1)}s`);
    if (time < this.shieldUntil) bits.push(`DOME ${((this.shieldUntil - time) / 1000).toFixed(1)}s`);
    if (time < this.magnetUntil) bits.push(`MAGNET ${((this.magnetUntil - time) / 1000).toFixed(1)}s`);
    this.powerText.setText(bits.join('\n'));

    // camera only ever climbs (with the player's highest point) and holds still
    // otherwise — a fixed frame, not a swooping follow. One constant anchor for
    // jumping and flying alike: the character stays put while the world scrolls
    // past, so a jet climb reads as straight-up motion with no jump when it ends.
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
      // celebrate crossing your own best line the moment it happens
      if (!this.bestCrossed && this.saveData.best > 0 && meters > this.saveData.best) {
        this.bestCrossed = true;
        this.banner('NEW BEST!');
        window.SFX.power();
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
    // cull at the screen bottom: nothing landable may live below the visible
    // area, or the player can bounce on an offscreen platform and never fall
    // to their death (softlock at the bottom of the screen).
    const cull = cam.scrollY + this.H;
    [this.platforms, this.springs, this.items, this.drones].forEach(g =>
      g.children.iterate(o => { if (o && o.y > cull) o.destroy(); }));
    this.missiles.children.iterate(m => {
      if (m && m.y < cam.scrollY - 200) m.destroy();
    });

    if (p.y > cam.scrollY + this.H + 40) {
      if (!this.dead) this.dead = true;
      this.endGame();
    }
  }
}
