class LeaderboardScene extends Phaser.Scene {
  constructor() { super('Leaderboard'); }

  create() {
    const SS = window.SS, TS = window.TEX_SCALE;
    window.setupCamera(this);
    const W = this.scale.width / SS, H = this.scale.height / SS;
    this.W = W; this.H = H;
    // scene instances persist across visits but input listeners are cleared on
    // shutdown — reset the per-visit state so scrolling rebinds every time
    this._scrollBound = false;
    this._scroll = null;
    this.boardBits = null;
    const save = window.SAVE.data;
    buildFaceTextures(this); // circular avatars for each player's profile picture

    this.add.image(W / 2, H / 2, 'sky-' + save.map).setScale(TS);
    this.add.rectangle(W / 2, H / 2, W, H, 0x090b18, 0.66);

    this.add.text(W / 2, 40, 'LEADERBOARD', {
      fontFamily: FONT, fontSize: '34px', color: '#f5c542',
      stroke: '#71301f', strokeThickness: 7,
    }).setOrigin(0.5);

    this.status = this.add.text(W / 2, 320, 'loading...', {
      fontFamily: FONT, fontSize: '20px', color: '#ffe9c9', align: 'center',
    }).setOrigin(0.5);

    uiButton(this, W / 2, H - 44, 200, 50, 'BACK',
      () => this.scene.start('Menu'), { color: 0x2b3a5e, size: 21 });

    this.loadBoard();
  }

  // ---- helpers ----------------------------------------------------------

  colorForRank(i) {
    return [0xf5c542, 0xcfd6e0, 0xcd7f32][i] || 0x2f9c8f; // gold, silver, bronze
  }
  hexForRank(i) {
    return ['#f5c542', '#cfd6e0', '#cd7f32'][i] || '#8fd6c8';
  }

  crown(cont, x, y, w, color) {
    const g = this.add.graphics();
    const h = w * 0.72, b = h * 0.28;
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(x - w / 2, y + h / 2);
    g.lineTo(x - w / 2, y - h / 2);
    g.lineTo(x - w / 4, y);
    g.lineTo(x, y - h * 0.72);
    g.lineTo(x + w / 4, y);
    g.lineTo(x + w / 2, y - h / 2);
    g.lineTo(x + w / 2, y + h / 2);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, 0.85);
    [[-w / 2, -h / 2], [0, -h * 0.72], [w / 2, -h / 2]].forEach(([dx, dy]) =>
      g.fillCircle(x + dx, y + dy, w * 0.08));
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - w / 2, y + h / 2 - b / 2, w, b, b * 0.4);
    // subtle shine
    const gl = g.lineStyle ? g : g;
    cont.add(g);
    return g;
  }

  avatar(cont, x, y, r, p, ringColor, ringW) {
    const bg = this.add.circle(x, y, r, 0x1c2a4a).setStrokeStyle(ringW, ringColor);
    cont.add(bg);
    const key = 'face-' + (p.pfp || 'trump');
    if (this.textures.exists(key)) {
      cont.add(this.add.image(x, y, key).setDisplaySize((r - ringW * 0.4) * 2, (r - ringW * 0.4) * 2));
    } else {
      cont.add(this.add.text(x, y + 1, ((p.username || '?')[0] || '?').toUpperCase(), {
        fontFamily: FONT, fontSize: Math.round(r * 1.05) + 'px', color: '#ffffff',
      }).setOrigin(0.5));
    }
    return bg;
  }

  rankBadge(cont, x, y, n) {
    const c = this.add.circle(x, y, 13, 0x7c3aed).setStrokeStyle(2, 0xffffff);
    const t = this.add.text(x, y + 1, `${n}`, {
      fontFamily: FONT, fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);
    cont.add([c, t]);
  }

  // ---- data + rendering -------------------------------------------------

  async loadBoard() {
    const fb = window.FB;
    if (!fb || !fb.enabled) {
      this.status.setText('leaderboard offline\nsign in to compete');
      return;
    }

    // show the last fetched board immediately; refresh from the server in the
    // background and only re-render if the standings actually changed
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem('tj-lb-cache') || 'null'); } catch (e) {}
    if (cached && cached.length) this.render(cached);

    let rows = [];
    try { rows = await fb.topScores(50); } catch (e) { /* fall through */ }
    if (!this.scene.isActive()) return;

    if (!rows.length) {
      if (!cached || !cached.length) this.status.setText('no scores yet\nbe the first!');
      return;
    }
    try { localStorage.setItem('tj-lb-cache', JSON.stringify(rows)); } catch (e) {}
    if (JSON.stringify(rows) !== JSON.stringify(cached)) this.render(rows);
  }

  render(rows) {
    this.status.setVisible(false);
    const fb = window.FB;
    let hint = null;
    try { hint = JSON.parse(localStorage.getItem('tj-auth-hint') || 'null'); } catch (e) {}
    this.myUid = (fb.user && fb.user.uid) || (hint && hint.uid) || null;

    if (this.boardBits) this.boardBits.forEach(o => o.destroy());
    this.boardBits = [];
    this._scroll = null; // rebuilt by buildList (stays null for short boards)
    this.buildPodium(rows.slice(0, 3));
    this.buildList(rows.slice(3));
  }

  buildPodium(top) {
    const W = this.W;
    const cont = this.add.container(0, 0);
    this.boardBits.push(cont);
    // slots: [center #1, left #2, right #3]
    const slots = [
      { x: W / 2, y: 196, r: 54, i: 0 },
      { x: 104,   y: 250, r: 42, i: 1 },
      { x: W - 104, y: 250, r: 42, i: 2 },
    ];
    slots.forEach((s) => {
      const p = top[s.i];
      if (!p) return;
      const col = this.colorForRank(s.i);
      const hex = this.hexForRank(s.i);

      if (s.i === 0) {
        const glow = this.add.image(s.x, s.y, 'sun').setScale(window.TEX_SCALE * 1.7)
          .setTint(0xf5c542).setAlpha(0.6);
        cont.add(glow);
        this.tweens.add({ targets: glow, alpha: 0.3, scale: window.TEX_SCALE * 1.9,
          duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }

      this.crown(cont, s.x, s.y - s.r - 20, s.i === 0 ? 46 : 34, col);
      this.avatar(cont, s.x, s.y, s.r, p, col, s.i === 0 ? 6 : 4);
      this.rankBadge(cont, s.x + s.r * 0.72, s.y - s.r * 0.72, s.i + 1);

      const mine = p.uid === this.myUid;
      let ny = s.y + s.r + 14;
      if (s.i === 0) {
        cont.add(this.add.text(s.x, ny, 'KING OF HORMUZ', {
          fontFamily: FONT, fontSize: '16px', color: '#f5c542',
          stroke: '#71301f', strokeThickness: 4,
        }).setOrigin(0.5));
        ny += 24;
      }
      cont.add(this.add.text(s.x, ny, p.username + (mine ? ' (you)' : ''), {
        fontFamily: FONT, fontSize: s.i === 0 ? '20px' : '17px',
        color: mine ? '#ffe95e' : '#ffffff',
      }).setOrigin(0.5));
      cont.add(this.add.text(s.x, ny + (s.i === 0 ? 24 : 20), `${p.best} m`, {
        fontFamily: FONT, fontSize: s.i === 0 ? '19px' : '16px', color: hex,
      }).setOrigin(0.5));
    });
  }

  buildList(rest) {
    const W = this.W, H = this.H;
    const top = 360, bottom = H - 78;
    const rowH = 58, gap = 8;

    // divider
    this.boardBits.push(this.add.rectangle(W / 2, top - 12, W - 48, 2, 0xf5c542, 0.35));

    if (!rest.length) return;

    const box = this.add.container(0, top);
    this.boardBits.push(box);
    rest.forEach((p, idx) => {
      const rank = idx + 4;
      const y = idx * (rowH + gap) + rowH / 2;
      const mine = p.uid === this.myUid;

      const g = this.add.graphics();
      g.fillStyle(mine ? 0x243a63 : 0x16223f, 0.92);
      g.fillRoundedRect(24, y - rowH / 2, W - 48, rowH, 16);
      if (mine) { g.lineStyle(3, 0xf5c542, 0.9); g.strokeRoundedRect(24, y - rowH / 2, W - 48, rowH, 16); }
      box.add(g);

      box.add(this.add.text(52, y, `${rank}`, {
        fontFamily: FONT, fontSize: '20px', color: '#8fa0c0',
      }).setOrigin(0.5));

      this.avatar(box, 100, y, 20, p, mine ? 0xf5c542 : 0x3a4a6a, 3);

      box.add(this.add.text(134, y, p.username + (mine ? ' (you)' : ''), {
        fontFamily: FONT, fontSize: '18px', color: mine ? '#ffe95e' : '#eaf0ff',
      }).setOrigin(0, 0.5));

      box.add(this.add.text(W - 44, y, `${p.best} m`, {
        fontFamily: FONT, fontSize: '18px', color: '#f5c542',
      }).setOrigin(1, 0.5));
    });

    // clip to the list area
    const maskG = this.make.graphics();
    maskG.fillRect(0, top, W, bottom - top);
    box.setMask(maskG.createGeometryMask());
    this.boardBits.push(maskG);

    // scrolling (drag + wheel) — state lives on this._scroll so a background
    // re-render swaps the target box without stacking duplicate handlers
    const contentH = rest.length * (rowH + gap);
    const visibleH = bottom - top;
    this._scroll = {
      box,
      minY: top - Math.max(0, contentH - visibleH),
      maxY: top,
    };
    if (!this._scrollBound) {
      this._scrollBound = true;
      const SS = window.SS;
      let dragging = false, lastY = 0;
      const clamp = () => {
        const s = this._scroll;
        if (s) s.box.y = Phaser.Math.Clamp(s.box.y, s.minY, s.maxY);
      };
      this.input.on('pointerdown', (p) => { dragging = true; lastY = p.y; });
      this.input.on('pointerup', () => { dragging = false; });
      this.input.on('pointermove', (p) => {
        if (!dragging || !p.isDown || !this._scroll) return;
        this._scroll.box.y += (p.y - lastY) / SS;
        lastY = p.y;
        clamp();
      });
      this.input.on('wheel', (p, over, dx, dy) => {
        if (!this._scroll) return;
        this._scroll.box.y -= dy * 0.4;
        clamp();
      });
    }
  }
}
