class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  create() {
    buildTextures(this);
    Object.keys(CATALOG.SHIPS).forEach(k => buildShipTextures(this, k));
    Object.keys(CATALOG.MAPS).forEach(k => buildMapTextures(this, k));

    const SS = window.SS, TS = window.TEX_SCALE;
    window.setupCamera(this);
    const W = this.scale.width / SS, H = this.scale.height / SS;
    this.W = W; this.H = H;
    const save = window.SAVE.data;

    this.add.image(W / 2, H / 2, 'sky-' + save.map).setScale(TS);
    this.add.rectangle(W / 2, H / 2, W, H, 0x090b18, 0.55);

    this.add.text(W / 2, 46, 'SHOP', {
      fontFamily: FONT, fontSize: '42px', color: '#f5c542',
      stroke: '#71301f', strokeThickness: 8,
    }).setOrigin(0.5);

    // bank pill
    uiPanel(this, W - 152, 20, 132, 44);
    this.add.image(W - 130, 42, 'coin').setScale(TS);
    this.bankText = this.add.text(W - 112, 42, `${save.bank}`, {
      fontFamily: FONT, fontSize: '22px', color: '#f5c542',
    }).setOrigin(0, 0.5);

    // tabs
    this.tab = 'SKINS';
    this.tabButtons = {};
    ['SKINS', 'FLEET', 'MAPS', 'POWER'].forEach((name, i) => {
      this.tabButtons[name] = uiButton(
        this, W / 2 + (i - 1.5) * 114, 110, 106, 42, name,
        () => { this.tab = name; this.refresh(); },
        { color: 0x2b3a5e, size: 15 }
      );
    });

    uiButton(this, W / 2, H - 56, 200, 52, 'BACK', () => this.scene.start('Menu'),
      { color: 0x2b3a5e, size: 22 })
      .setDepth(30); // always above the (possibly scrolling) item list

    // scrollable list area: below the tabs, above the BACK button
    this.listTop = 160;
    this.listBottom = H - 74;
    this.setupListScroll();

    this.rows = null;
    this.refresh();
  }

  // ---------- scrolling ----------

  setupListScroll() {
    let dragging = false, lastY = 0;
    const SS = window.SS;
    this.input.on('pointerdown', (p) => {
      if (p.y / SS < this.listTop) return; // ignore drags starting on tabs/header
      dragging = true;
      lastY = p.y;
    });
    this.input.on('pointerup', () => { dragging = false; });
    this.input.on('pointerupoutside', () => { dragging = false; });
    this.input.on('pointermove', (p) => {
      if (!dragging || !p.isDown || !this.rows) return;
      this.rows.y += (p.y - lastY) / SS;
      lastY = p.y;
      this.clampListScroll();
    });
    this.input.on('wheel', (p, over, dx, dy) => {
      if (!this.rows) return;
      this.rows.y -= dy * 0.4;
      this.clampListScroll();
    });
  }

  clampListScroll() {
    const visibleH = this.listBottom - this.listTop;
    const overflow = Math.max(0, this.contentHeight - visibleH);
    const minY = -overflow;
    this.rows.y = Phaser.Math.Clamp(this.rows.y, minY, 0);
  }

  // ---------- main refresh ----------

  refresh() {
    const save = window.SAVE.data;
    this.bankText.setText(`${save.bank}`);
    Object.entries(this.tabButtons).forEach(([name, btn]) => {
      btn.label.setColor(name === this.tab ? '#f5c542' : '#ffffff');
      btn.setAlpha(name === this.tab ? 1 : 0.75);
    });
    if (this.rows) this.rows.destroy(true);
    this.rows = this.add.container(0, 0);
    this.rowCount = 0;

    if (this.tab === 'SKINS') {
      this.itemRows(CATALOG.SKINS, save.skins, save.skin,
        (key) => {
          const src = this.textures.get(`skin-${key}-idle`).getSourceImage();
          return this.add.image(0, 0, `skin-${key}-idle`).setScale(78 / src.height);
        },
        (key) => { save.skin = key; },
        (key) => { save.skins.push(key); save.skin = key; },
        'equipped');
    } else if (this.tab === 'FLEET') {
      this.itemRows(CATALOG.SHIPS, save.ships, save.ship,
        (key) => this.add.image(0, 0, 'tanker-' + key).setScale(0.55 * window.TEX_SCALE),
        (key) => { save.ship = key; },
        (key) => { save.ships.push(key); save.ship = key; });
    } else if (this.tab === 'MAPS') {
      this.itemRows(CATALOG.MAPS, save.maps, save.map,
        (key) => {
          const img = this.add.image(0, 0, 'sky-' + key);
          img.setDisplaySize(66, 66);
          return img;
        },
        (key) => { save.map = key; },
        (key) => { save.maps.push(key); save.map = key; });
    } else {
      this.upgradeRows();
    }

    // recompute scrollable content height for the tab we just built, and
    // clip + reset scroll position (switching tabs always starts at the top)
    this.contentHeight = 170 + this.rowCount * 108;
    if (this.listMask) this.listMask.destroy();
    const maskG = this.make.graphics();
    maskG.fillRect(0, this.listTop, this.W, this.listBottom - this.listTop);
    this.listMask = maskG.createGeometryMask();
    this.rows.setMask(this.listMask);
    this.rows.y = 0;
  }

  rowPanel(i) {
    const y = 170 + i * 108;
    const p = uiPanel(this, 20, y, this.W - 40, 96);
    this.rows.add(p);
    this.rowCount = Math.max(this.rowCount, i + 1);
    return y;
  }

  itemRows(catalog, owned, active, makeIcon, select, buy, activeLabel = 'sailing now') {
    const save = window.SAVE.data;
    Object.entries(catalog).forEach(([key, item], i) => {
      const y = this.rowPanel(i);
      const icon = makeIcon(key);
      icon.setPosition(78, y + 48);
      this.rows.add(icon);
      this.rows.add(this.add.text(150, y + 26, item.name, {
        fontFamily: FONT, fontSize: '20px', color: '#ffe9c9',
      }));
      const isOwned = owned.includes(key);
      const isActive = key === active;
      let sub = isActive ? activeLabel : isOwned ? 'owned' : `price: ${item.price}`;
      this.rows.add(this.add.text(150, y + 56, sub, {
        fontFamily: 'Arial', fontSize: '14px', color: '#c9a97f',
      }));

      let btn;
      if (isActive) {
        btn = uiButton(this, this.W - 90, y + 48, 110, 44, 'ACTIVE',
          null, { color: 0x2e7d32, size: 16, disabled: true });
      } else if (isOwned) {
        btn = uiButton(this, this.W - 90, y + 48, 110, 44, 'USE', () => {
          select(key); window.SAVE.save(); this.refresh();
        }, { color: 0xb8860b, size: 18 });
      } else {
        const canAfford = save.bank >= item.price;
        btn = uiButton(this, this.W - 90, y + 48, 110, 44,
          `BUY ${item.price}`, () => {
            if (window.SAVE.data.bank < item.price) return;
            window.SAVE.data.bank -= item.price;
            buy(key);
            window.SAVE.save();
            window.SFX.power();
            this.refresh();
          }, { size: 15, disabled: !canAfford });
      }
      this.rows.add(btn);
    });
  }

  upgradeRows() {
    const save = window.SAVE.data;
    Object.entries(CATALOG.UPGRADES).forEach(([key, up], i) => {
      const y = this.rowPanel(i);
      const icon = this.add.image(78, y + 48, up.icon).setScale(1.4 * window.TEX_SCALE);
      this.rows.add(icon);
      const lvl = save.up[key];
      this.rows.add(this.add.text(150, y + 20, up.name, {
        fontFamily: FONT, fontSize: '19px', color: '#ffe9c9',
      }));
      this.rows.add(this.add.text(150, y + 48, up.desc, {
        fontFamily: 'Arial', fontSize: '13px', color: '#c9a97f',
      }));
      // level pips
      for (let p = 0; p < 3; p++) {
        this.rows.add(this.add.circle(158 + p * 22, y + 76, 7,
          p < lvl ? 0xf5c542 : 0x3a425f));
      }

      let btn;
      if (lvl >= 3) {
        btn = uiButton(this, this.W - 90, y + 48, 110, 44, 'MAX',
          null, { color: 0x2e7d32, size: 18, disabled: true });
      } else {
        const cost = CATALOG.UPGRADE_COST[lvl];
        btn = uiButton(this, this.W - 90, y + 48, 110, 44,
          `BUY ${cost}`, () => {
            if (window.SAVE.data.bank < cost) return;
            window.SAVE.data.bank -= cost;
            window.SAVE.data.up[key]++;
            window.SAVE.save();
            window.SFX.power();
            this.refresh();
          }, { size: 15, disabled: save.bank < cost });
      }
      this.rows.add(btn);
    });

    this.rows.add(this.add.text(this.W / 2, 170 + 3 * 108 + 20,
      'upgrades make every powerup last longer', {
        fontFamily: 'Arial', fontSize: '14px', color: '#c9a97f',
      }).setOrigin(0.5));
  }
}