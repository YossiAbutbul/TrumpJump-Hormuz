class LeaderboardScene extends Phaser.Scene {
  constructor() { super('Leaderboard'); }

  create() {
    const SS = window.SS, TS = window.TEX_SCALE;
    window.setupCamera(this);
    const W = this.scale.width / SS, H = this.scale.height / SS;
    const save = window.SAVE.data;

    this.add.image(W / 2, H / 2, 'sky-' + save.map).setScale(TS);
    this.add.rectangle(W / 2, H / 2, W, H, 0x090b18, 0.6);

    this.add.text(W / 2, 52, 'LEADERBOARD', {
      fontFamily: FONT, fontSize: '38px', color: '#f5c542',
      stroke: '#71301f', strokeThickness: 8,
    }).setOrigin(0.5);

    this.status = this.add.text(W / 2, 300, 'loading...', {
      fontFamily: FONT, fontSize: '20px', color: '#ffe9c9',
    }).setOrigin(0.5);

    this.listBox = this.add.container(0, 0);

    uiButton(this, W / 2, H - 56, 200, 52, 'BACK',
      () => this.scene.start('Menu'), { color: 0x2b3a5e, size: 22 });

    this.loadBoard(W);
  }

  async loadBoard(W) {
    const fb = window.FB;
    if (!fb || !fb.enabled) {
      this.status.setText('leaderboard offline\nsign in to compete');
      this.status.setAlign('center').setOrigin(0.5);
      return;
    }
    let rows = [];
    try { rows = await fb.topScores(20); } catch (e) { /* handled below */ }
    if (!this.scene.isActive()) return;

    if (!rows.length) {
      this.status.setText('no scores yet\nbe the first!');
      this.status.setAlign('center').setOrigin(0.5);
      return;
    }
    this.status.setVisible(false);

    const myUid = fb.user && fb.user.uid;
    rows.forEach((r, i) => {
      const y = 110 + i * 30;
      const mine = r.uid === myUid;
      const color = mine ? '#ffe95e' : (i < 3 ? '#f5c542' : '#ffffff');
      const rank = this.add.text(40, y, `${i + 1}`, {
        fontFamily: FONT, fontSize: '17px', color,
      }).setOrigin(0, 0.5);
      const name = this.add.text(84, y, r.username, {
        fontFamily: FONT, fontSize: '17px', color,
      }).setOrigin(0, 0.5);
      const score = this.add.text(W - 40, y, `${r.best} m`, {
        fontFamily: FONT, fontSize: '17px', color,
      }).setOrigin(1, 0.5);
      this.listBox.add([rank, name, score]);
      if (mine) {
        const hl = this.add.rectangle(W / 2, y, W - 48, 26, 0xf5c542, 0.12)
          .setOrigin(0.5);
        this.listBox.addAt(hl, 0);
      }
    });
  }
}
