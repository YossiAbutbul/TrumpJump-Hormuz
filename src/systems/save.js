// Persistent save data + shared UI helpers. The item catalog lives in
// config/catalog.js (window.CATALOG).

window.FONT = '"Luckiest Guy", "Arial Black", Arial';

window.SAVE = {
  data: null,
  load() {
    const def = {
      bank: 0, best: 0, bestUid: null,
      maps: ['sunset'], map: 'sunset',
      ships: ['classic'], ship: 'classic',
      skins: ['trump'], skin: 'trump',
      up: { jet: 0, dome: 0, magnet: 0 },
      muted: false,
    };
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem('tj-save') || 'null'); } catch (e) {}
    this.data = Object.assign(def, stored);
    this.data.up = Object.assign({ jet: 0, dome: 0, magnet: 0 }, this.data.up);
    // migrate saves from before skins existed
    if (!Array.isArray(this.data.skins) || !this.data.skins.length) this.data.skins = ['trump'];
    if (!this.data.skin) this.data.skin = 'trump';
    // migrate pre-shop best score
    const old = Number(localStorage.getItem('tj-best') || 0);
    if (old > this.data.best) this.data.best = old;
    this.save();
  },
  save() {
    localStorage.setItem('tj-save', JSON.stringify(this.data));
    // debounced sync to the signed-in user's cloud save
    if (window.FB && window.FB.user && window.FB.saveCloud) {
      clearTimeout(this._cloudT);
      this._cloudT = setTimeout(() => window.FB.saveCloud(), 800);
    }
  },

  // the subset of save data that lives in the user's Firestore doc
  cloudBlob() {
    const d = this.data;
    return {
      bank: d.bank, best: d.best, maps: d.maps, ships: d.ships, skins: d.skins,
      up: d.up, ship: d.ship, map: d.map, skin: d.skin,
    };
  },

  // merge a cloud save into local, keeping the best of each (never loses
  // purchases). Persists locally and returns the merged data. `uid` is the
  // signed-in user's id, used to keep the leaderboard best per-account.
  mergeCloud(cloud, uid) {
    cloud = cloud || {}; // a brand-new account has no cloud doc yet
    const d = this.data;
    d.bank = Math.max(d.bank || 0, cloud.bank || 0);
    // best is per-account: only keep the local best if it already belongs to
    // this signed-in user (e.g. an unsynced new record). Otherwise the local
    // best is a guest's or another user's — adopt this account's own best.
    const cloudBest = cloud.best || 0;
    d.best = (uid && d.bestUid === uid) ? Math.max(d.best || 0, cloudBest) : cloudBest;
    d.bestUid = uid || null;
    d.maps = Array.from(new Set([...(d.maps || ['sunset']), ...(cloud.maps || [])]));
    d.ships = Array.from(new Set([...(d.ships || ['classic']), ...(cloud.ships || [])]));
    d.skins = Array.from(new Set([...(d.skins || ['trump']), ...(cloud.skins || [])]));
    const up = d.up || {}, cup = cloud.up || {};
    ['jet', 'dome', 'magnet'].forEach(k => { up[k] = Math.max(up[k] || 0, cup[k] || 0); });
    d.up = up;
    // restore the account's equipped selections (as long as they're owned)
    if (cloud.ship && d.ships.includes(cloud.ship)) d.ship = cloud.ship;
    if (cloud.map && d.maps.includes(cloud.map)) d.map = cloud.map;
    if (cloud.skin && d.skins.includes(cloud.skin)) d.skin = cloud.skin;
    this.save();
    return this.data;
  },

  // wipe everything an account owns back to the free defaults — used on sign-out
  // so a guest doesn't see the previous user's purchases. The account's real
  // data stays in the cloud and returns via mergeCloud on the next sign-in.
  // `muted` is a device preference, not account data, so it's left untouched.
  resetToGuest() {
    const d = this.data;
    d.bank = 0;
    d.best = 0;
    d.bestUid = null;
    d.maps = ['sunset']; d.map = 'sunset';
    d.ships = ['classic']; d.ship = 'classic';
    d.skins = ['trump']; d.skin = 'trump';
    d.up = { jet: 0, dome: 0, magnet: 0 };
    this.save();
    return this.data;
  },
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
