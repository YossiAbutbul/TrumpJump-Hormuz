// Persistent save data, item catalog, shared UI helpers.

window.FONT = '"Luckiest Guy", "Arial Black", Arial';

window.CATALOG = {
  MAPS: {
    sunset: {
      name: 'SUNSET GULF', price: 0,
      sky: ['#26224e', '#7a4a7a', '#e88a5d', '#f6c667'],
      sea: ['#2a6f9e', '#0c3352'],
      sun: 'sun', stars: false, cloudTint: 0xffffff,
    },
    night: {
      name: 'MIDNIGHT RAID', price: 250,
      sky: ['#040614', '#0d1530', '#16264d', '#20365f'],
      sea: ['#0d2b45', '#051624'],
      sun: 'moon', stars: true, cloudTint: 0x8899bb,
    },
    storm: {
      name: 'DESERT HAZE', price: 450,
      sky: ['#2e2a22', '#5c4a30', '#8a6a3e', '#c39a55'],
      sea: ['#3f5d5e', '#1c2f30'],
      sun: 'sun', stars: false, cloudTint: 0xa8956f,
    },
    dawn: {
      name: 'DAWN PATROL', price: 650,
      sky: ['#1a1436', '#4a3a6a', '#c96a8a', '#f4b48c'],
      sea: ['#3a6f95', '#123040'],
      sun: 'sun', stars: false, cloudTint: 0xffe0e8,
    },
    arctic: {
      name: 'ARCTIC FRONT', price: 850,
      sky: ['#08131f', '#1c3a52', '#3a6f92', '#8ac4dc'],
      sea: ['#2a7a9e', '#0c3a52'],
      sun: 'moon', stars: true, cloudTint: 0xd4ecfa,
    },
  },
  SHIPS: {
    classic: {
      name: 'CLASSIC FLEET', price: 0,
      hull: '#8a2f2b', hullDark: '#5f1f1c', boat: '#f0efe9', stripe: '#c93a35',
    },
    gold: {
      name: 'GOLD FLEET', price: 300,
      hull: '#b8860b', hullDark: '#8a6508', boat: '#f5d76e', stripe: '#a52a26',
    },
    stealth: {
      name: 'STEALTH FLEET', price: 550,
      hull: '#2e3440', hullDark: '#1c2128', boat: '#4c566a', stripe: '#222831',
    },
    navy: {
      name: 'NAVY FLEET', price: 700,
      hull: '#2a4a7a', hullDark: '#1a3050', boat: '#dce6f0', stripe: '#c93a35',
    },
    crimson: {
      name: 'CRIMSON FLEET', price: 950,
      hull: '#7a1a2a', hullDark: '#500f1c', boat: '#f0d2d2', stripe: '#f5c542',
    },
  },
  UPGRADES: {
    jet: { name: 'HAIR FORCE ONE', desc: '+0.5s flight per level', icon: 'cap' },
    dome: { name: 'GOLDEN DOME', desc: '+1.8s shield per level', icon: 'shield' },
    magnet: { name: 'MONEY MAGNET', desc: '+1.5s magnet per level', icon: 'magnet' },
  },
  UPGRADE_COST: [150, 400, 900],
};

window.SAVE = {
  data: null,
  load() {
    const def = {
      bank: 0, best: 0,
      maps: ['sunset'], map: 'sunset',
      ships: ['classic'], ship: 'classic',
      up: { jet: 0, dome: 0, magnet: 0 },
      muted: false,
    };
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem('tj-save') || 'null'); } catch (e) {}
    this.data = Object.assign(def, stored);
    this.data.up = Object.assign({ jet: 0, dome: 0, magnet: 0 }, this.data.up);
    // migrate pre-shop best score
    const old = Number(localStorage.getItem('tj-best') || 0);
    if (old > this.data.best) this.data.best = old;
    this.save();
  },
  save() { localStorage.setItem('tj-save', JSON.stringify(this.data)); },
};
window.SAVE.load();

// rounded translucent panel
function uiPanel(scene, x, y, w, h, opts = {}) {
  const g = scene.add.graphics();
  g.fillStyle(opts.color ?? 0x11142a, opts.alpha ?? 0.72);
  g.fillRoundedRect(x, y, w, h, opts.radius ?? 14);
  if (opts.stroke !== false) {
    g.lineStyle(2, opts.strokeColor ?? 0xf5c542, opts.strokeAlpha ?? 0.45);
    g.strokeRoundedRect(x, y, w, h, opts.radius ?? 14);
  }
  return g;
}

// rounded button with hover and press feedback
function uiButton(scene, x, y, w, h, label, onClick, opts = {}) {
  const c = scene.add.container(x, y);
  const r = Math.min(16, h / 2 - 2);
  const g = scene.add.graphics();
  g.fillStyle(opts.color ?? 0xc9312b, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.lineStyle(3, 0xffffff, 0.22);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  const t = scene.add.text(0, 1, label, {
    fontFamily: window.FONT, fontSize: (opts.size ?? 20) + 'px',
    color: opts.textColor ?? '#ffffff',
  }).setOrigin(0.5);
  c.add([g, t]);
  c.setSize(w, h);
  c.label = t;
  if (opts.disabled) {
    c.setAlpha(0.5);
  } else {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => c.setScale(1.06));
    c.on('pointerout', () => c.setScale(1));
    c.on('pointerdown', () => c.setScale(0.94));
    c.on('pointerup', () => {
      c.setScale(1);
      window.SFX.click();
      if (onClick) onClick();
    });
  }
  return c;
}
