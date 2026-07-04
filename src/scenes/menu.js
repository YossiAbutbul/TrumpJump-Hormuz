class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  preload() {
    // load every character skin; texture keys are skin-<id>-idle / -fly / -hit
    Object.entries(CATALOG.SKINS).forEach(([id, s]) => {
      this.load.image(`skin-${id}-idle`, `assets/skins/${s.dir}/idle.png`);
      this.load.image(`skin-${id}-fly`, `assets/skins/${s.dir}/fly.png`);
      if (s.hit) this.load.image(`skin-${id}-hit`, `assets/skins/${s.dir}/hit.png`);
    });
    this.load.on('loaderror', () => {}); // missing art -> procedural fallback
  }

  create() {
    buildTextures(this);
    const save = window.SAVE.data;
    buildMapTextures(this, save.map);
    buildShipTextures(this, save.ship);
    buildFaceTextures(this); // circular profile-picture avatars
    window.VOICE.init(this);

    // resolve the equipped skin's textures; fall back to the default trump skin
    // if the saved id is unknown (e.g. removed from the catalog)
    const id = this.textures.exists(`skin-${save.skin}-idle`) ? save.skin : 'trump';
    window.SKIN = {
      idle: `skin-${id}-idle`,
      fly: this.textures.exists(`skin-${id}-fly`) ? `skin-${id}-fly` : `skin-${id}-idle`,
      hit: this.textures.exists(`skin-${id}-hit`) ? `skin-${id}-hit` : null,
    };
    const SS = window.SS, TS = window.TEX_SCALE;
    window.setupCamera(this);
    const W = this.scale.width / SS, H = this.scale.height / SS;
    const map = CATALOG.MAPS[save.map];

    this.add.image(W / 2, H / 2, 'sky-' + save.map).setScale(TS);
    this.add.image(W / 2, H - 340, map.sun === 'moon' ? 'moon' : 'sun').setScale(1.6 * TS);
    this.add.image(W / 2, H - 250, 'coast').setScale(TS);
    this.add.image(W / 2, H - 90, 'sea-' + save.map).setScale(TS);

    // drifting clouds
    this.clouds = [];
    for (let i = 0; i < 4; i++) {
      const c = this.add.image(
        Phaser.Math.Between(0, W), Phaser.Math.Between(60, 300), 'cloud'
      ).setAlpha(0.8).setScale(Phaser.Math.FloatBetween(0.7, 1.3) * TS)
       .setTint(map.cloudTint);
      c.speed = Phaser.Math.FloatBetween(8, 20);
      this.clouds.push(c);
    }

    // tanker sailing through the strait
    const tanker = this.add.image(-100, H - 165, 'tanker-' + save.ship).setScale(TS);
    this.tweens.add({
      targets: tanker, x: W + 120, duration: 24000, repeat: -1,
      onRepeat: () => { tanker.x = -100; },
    });

    // bank + best pills (refs kept so login/sign-out can update them live)
    uiPanel(this, 12, 12, 130, 40);
    this.add.image(34, 32, 'coin').setScale(0.9 * TS);
    this.bankText = this.add.text(50, 32, `${save.bank}`, {
      fontFamily: FONT, fontSize: '20px', color: '#f5c542',
    }).setOrigin(0, 0.5);
    uiPanel(this, W - 202, 12, 130, 40);
    this.bestText = this.add.text(W - 137, 32, `BEST ${save.best}`, {
      fontFamily: FONT, fontSize: '16px', color: '#ffe9c9',
    }).setOrigin(0.5);

    // title
    this.add.text(W / 2, 160, 'TRUMP JUMP', {
      fontFamily: FONT, fontSize: '58px', color: '#f5c542',
      stroke: '#71301f', strokeThickness: 10,
    }).setOrigin(0.5);
    this.add.text(W / 2, 212, 'STRAIT OF HORMUZ', {
      fontFamily: FONT, fontSize: '24px', color: '#ffe9c9',
      stroke: '#71301f', strokeThickness: 6,
    }).setOrigin(0.5);

    // welcome greeting above the title (updates on login / sign-out / name change)
    this.welcomeText = this.add.text(W / 2, 104, '', {
      fontFamily: FONT, fontSize: '17px', color: '#f5c542',
      stroke: '#71301f', strokeThickness: 4,
    }).setOrigin(0.5);
    this.refreshWelcome();

    // bouncing trump with glow — centered between the header and the powerups
    const glow = this.add.image(W / 2, 342, 'sun').setScale(1.1 * TS).setAlpha(0.5);
    const srcH = this.textures.get(window.SKIN.idle).getSourceImage().height;
    const trump = this.add.image(W / 2, 332, window.SKIN.idle).setScale(150 / srcH);
    this.tweens.add({
      targets: trump, y: 322, duration: 1800,
      yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: glow, alpha: 0.35, duration: 1800, yoyo: true, repeat: -1,
      ease: 'Sine.inOut',
    });

    // powerup legend, compact — the JET icon uses the equipped skin's cap
    const skinDef = CATALOG.SKINS[save.skin] || {};
    const capIcon = (skinDef.cap && this.textures.exists(skinDef.cap)) ? skinDef.cap : 'cap';
    const legend = [
      [capIcon, 'JET'], ['spring', 'BOUNCE'], ['shield', 'DOME'],
      ['magnet', 'MAGNET'], ['coin', 'CASH'],
    ];
    legend.forEach(([key, label], i) => {
      const x = W / 2 + (i - 2) * 84;
      this.add.image(x, 452, key).setScale(TS);
      this.add.text(x, 480, label, {
        fontFamily: FONT, fontSize: '13px', color: '#ffd9a8',
      }).setOrigin(0.5);
    });
    this.add.text(W / 2, 512, 'dodge drones and missiles', {
      fontFamily: 'Arial', fontSize: '14px', color: '#ffd9a8',
    }).setOrigin(0.5);

    // buttons
    uiButton(this, W / 2, 556, 260, 60, 'PLAY', () => this.go(), { size: 28 });
    uiButton(this, W / 2, 622, 200, 48, 'SHOP', () => {
      window.SFX.init();
      this.scene.start('Shop');
    }, { color: 0xb8860b, size: 20 });
    uiButton(this, W / 2, 682, 200, 48, 'LEADERBOARD', () => {
      window.SFX.init();
      this.scene.start('Leaderboard');
    }, { color: 0x2b3a5e, size: 18 });

    this.add.text(W / 2, 732, 'arrows / A D / touch  •  P: pause', {
      fontFamily: 'Arial', fontSize: '13px', color: '#ffd9a8',
    }).setOrigin(0.5);

    // settings gear (bottom-left) — enter friend codes to unlock secret skins
    const gear = this.add.container(40, H - 40).setDepth(6);
    const gearBg = this.add.circle(0, 0, 21, 0x2b3a5e)
      .setStrokeStyle(3, 0xffffff, 0.75)
      .setInteractive({ useHandCursor: true });
    gear.add(gearBg);
    gear.add(this.add.text(0, 1, '⚙', { fontSize: '22px' }).setOrigin(0.5));
    gearBg.on('pointerover', () => gear.setScale(1.1));
    gearBg.on('pointerout', () => gear.setScale(1));
    gearBg.on('pointerup', () => {
      if (window.SFX && window.SFX.click) window.SFX.click();
      if (window.settingsModal) window.settingsModal();
    });

    // account chip (top center) + live auth updates. Track the current user so
    // a sign-in/out (identity change) rebuilds the whole menu — character,
    // fleet, map and pills all reflect the newly loaded / reset save.
    this._lastUid = (window.FB && window.FB.user) ? window.FB.user.uid : null;
    this.updateAccountChip();
    this._authHandler = () => this.onAuth();
    document.addEventListener('fb-auth', this._authHandler);
    this._pfpHandler = () => this.updateAccountChip();
    document.addEventListener('pfp-change', this._pfpHandler);
    this.events.once('shutdown', () => {
      document.removeEventListener('fb-auth', this._authHandler);
      document.removeEventListener('pfp-change', this._pfpHandler);
    });
    this.onAuth();

    // first-ever visit: offer sign in vs play as guest
    if (!localStorage.getItem('tj-intro') && (!window.FB || !window.FB.user)) {
      localStorage.setItem('tj-intro', '1');
      this.time.delayedCall(500, () => {
        if (window.accountModal && (!window.FB || !window.FB.user)) window.accountModal();
      });
    }

    // SPACE starts the game — but not while typing in a modal input (e.g.
    // entering a name/code), where space is a normal character
    this.input.keyboard.on('keydown-SPACE', () => {
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
      this.go();
    });
  }

  onAuth() {
    const fb = window.FB;
    // a real sign-in/out (identity change) rebuilds the menu so the equipped
    // skin, fleet, map and pills all reflect the loaded/reset save
    const uid = (fb && fb.user) ? fb.user.uid : null;
    if (uid !== this._lastUid) {
      this._lastUid = uid;
      this.scene.restart();
      return;
    }
    // prompt for a leaderboard name on first sign-in — only once the profile
    // has actually loaded, so a mid-load refresh doesn't falsely prompt
    if (fb && fb.user && fb.profileLoaded
        && (!fb.profile || !fb.profile.username) && !this._prompting) {
      this._prompting = true;
      window.promptUsername('', (name) => {
        this._prompting = false;
        if (name) fb.setUsername(name);
      });
    }
    // reflect the merged (login) or reset-to-guest (sign-out) save immediately
    this.refreshStats();
    this.refreshWelcome();
    this.updateAccountChip();
  }

  refreshWelcome() {
    const fb = window.FB;
    const name = (fb && fb.profile && fb.profile.username) ? fb.profile.username : 'GUEST';
    if (this.welcomeText) this.welcomeText.setText(`WELCOME, ${name.toUpperCase()}`);
  }

  refreshStats() {
    const save = window.SAVE.data;
    if (this.bankText) this.bankText.setText(`${save.bank}`);
    if (this.bestText) this.bestText.setText(`BEST ${save.best}`);
  }

  updateAccountChip() {
    if (this.acct) this.acct.destroy();
    const fb = window.FB;
    const W = this.scale.width / window.SS;
    const signedIn = fb && fb.user;
    const cx = W - 32, cy = 33, R = 19;
    const c = this.add.container(cx, cy).setDepth(6);
    const bg = signedIn ? 0x2e7d32 : 0x2b3a5e;
    const circle = this.add.circle(0, 0, R, bg)
      .setStrokeStyle(3, 0xffffff, 0.85)
      .setInteractive({ useHandCursor: true });
    c.add(circle);

    // signed in: the chosen Trump-skin face (pre-rendered circular avatar).
    // guests get a plain silhouette — no profile picture.
    const faceKey = 'face-' + (window.SAVE.data.pfp || 'trump');
    if (signedIn && this.textures.exists(faceKey)) {
      const img = this.add.image(0, 0, faceKey).setDisplaySize((R - 1.5) * 2, (R - 1.5) * 2);
      c.add(img);
    } else if (signedIn) {
      const name = (fb.profile && fb.profile.username) || '';
      c.add(this.add.text(0, 1, (name[0] || '?').toUpperCase(), {
        fontFamily: FONT, fontSize: '18px', color: '#ffffff',
      }).setOrigin(0.5));
    } else {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.92);
      g.fillCircle(0, -4, 5);
      g.fillEllipse(0, 11, 17, 12);
      c.add(g);
    }
    circle.on('pointerup', () => {
      if (window.SFX && window.SFX.click) window.SFX.click();
      this.onAccountClick();
    });
    this.acct = c;
  }

  onAccountClick() {
    if (window.accountModal) window.accountModal();
  }

  go() {
    window.SFX.init();
    window.SFX.power();
    this.scene.start('Game');
  }

  update(_, dt) {
    const W = this.scale.width / window.SS;
    this.clouds.forEach(c => {
      c.x += c.speed * dt / 1000;
      if (c.x > W + 70) c.x = -70;
    });
  }
}
