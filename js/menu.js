class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  preload() {
    this.load.image('trump-img', 'assets/processed/trump.png');
    this.load.image('trump-fly-img', 'assets/processed/trump-fly.png');
    this.load.image('trump-hit-img', 'assets/processed/trump-hit.png');
    this.load.on('loaderror', () => {}); // missing art -> procedural fallback
  }

  create() {
    buildTextures(this);
    const save = window.SAVE.data;
    buildMapTextures(this, save.map);
    buildShipTextures(this, save.ship);
    window.VOICE.init(this);

    window.SKIN = {
      idle: this.textures.exists('trump-img') ? 'trump-img' : 'trump',
      fly: this.textures.exists('trump-fly-img') ? 'trump-fly-img' : 'trump-fly',
      hit: this.textures.exists('trump-hit-img') ? 'trump-hit-img' : null,
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

    // bank + best pills
    uiPanel(this, 12, 12, 130, 40);
    this.add.image(34, 32, 'coin').setScale(0.9 * TS);
    this.add.text(50, 32, `${save.bank}`, {
      fontFamily: FONT, fontSize: '20px', color: '#f5c542',
    }).setOrigin(0, 0.5);
    uiPanel(this, W - 142, 12, 130, 40);
    this.add.text(W - 77, 32, `BEST ${save.best}`, {
      fontFamily: FONT, fontSize: '16px', color: '#ffe9c9',
    }).setOrigin(0.5);

    // title
    this.add.text(W / 2, 130, 'TRUMP JUMP', {
      fontFamily: FONT, fontSize: '58px', color: '#f5c542',
      stroke: '#71301f', strokeThickness: 10,
    }).setOrigin(0.5);
    this.add.text(W / 2, 182, 'STRAIT OF HORMUZ', {
      fontFamily: FONT, fontSize: '24px', color: '#ffe9c9',
      stroke: '#71301f', strokeThickness: 6,
    }).setOrigin(0.5);

    // bouncing trump with glow
    const glow = this.add.image(W / 2, 330, 'sun').setScale(1.1 * TS).setAlpha(0.5);
    const srcH = this.textures.get(window.SKIN.idle).getSourceImage().height;
    const trump = this.add.image(W / 2, 320, window.SKIN.idle).setScale(150 / srcH);
    this.tweens.add({
      targets: trump, y: 292, duration: 700,
      yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: glow, alpha: 0.25, duration: 700, yoyo: true, repeat: -1,
    });

    // powerup legend, compact
    const legend = [
      ['cap', 'JET'], ['spring', 'BOUNCE'], ['shield', 'DOME'],
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
    uiButton(this, W / 2, 585, 260, 66, 'PLAY', () => this.go(), { size: 30 });
    uiButton(this, W / 2, 660, 200, 52, 'SHOP', () => {
      window.SFX.init();
      this.scene.start('Shop');
    }, { color: 0xb8860b, size: 22 });

    this.add.text(W / 2, 715, 'move: arrows / A D / touch left, right', {
      fontFamily: 'Arial', fontSize: '14px', color: '#ffd9a8',
    }).setOrigin(0.5);
    this.add.text(W / 2, 738, 'P: pause', {
      fontFamily: 'Arial', fontSize: '13px', color: '#c9a97f',
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-SPACE', () => this.go());
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
