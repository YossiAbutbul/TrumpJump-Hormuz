// Persistent save data + shared UI helpers. The item catalog lives in
// config/catalog.js (window.CATALOG); colour, depth and type come from
// config/theme.js (window.THEME, window.FONT, window.FONT_BODY).

window.SAVE = {
  data: null,
  load() {
    const def = {
      bank: 0, bills: 0, boosts: 0, best: 0, bestUid: null,
      maps: ['sunset'], map: 'sunset',
      ships: ['classic'], ship: 'classic',
      skins: ['trump'], skin: 'trump',
      pfp: 'trump', // chosen profile-picture face
      up: { jet: 0, dome: 0, magnet: 0 },
      muted: false,
      boostSide: 'right', // launch-button side; 'left' for left-handed players
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

  // force an immediate cloud sync — used at game over so earned money is
  // committed to the account right away instead of waiting on the debounce
  // (which can be interrupted by leaving the screen, a sign-out, etc.)
  flush() {
    localStorage.setItem('tj-save', JSON.stringify(this.data));
    clearTimeout(this._cloudT);
    if (window.FB && window.FB.user && window.FB.saveCloud) window.FB.saveCloud();
  },

  // The subset of save data that lives in the user's Firestore doc.
  //
  // `best` is deliberately NOT here. It is written only by api/submit-run.js
  // after the run has been verified, and firestore.rules rejects any client
  // write that changes it. Putting it back would make every save fail the
  // moment the local best drifts from the cloud one — which happens on any run
  // the server didn't accept — and the user would silently stop syncing coins
  // and purchases. `d.best` stays local, for the menus to display.
  cloudBlob() {
    const d = this.data;
    return {
      bank: d.bank, bills: d.bills, boosts: d.boosts, maps: d.maps,
      ships: d.ships, skins: d.skins, up: d.up, ship: d.ship, map: d.map,
      skin: d.skin, pfp: d.pfp, boostSide: d.boostSide,
    };
  },

  // merge a cloud save into local, keeping the best of each (never loses
  // purchases). Persists locally and returns the merged data. `uid` is the
  // signed-in user's id, used to keep the leaderboard best per-account.
  mergeCloud(cloud, uid) {
    cloud = cloud || {}; // a brand-new account has no cloud doc yet
    const d = this.data;
    d.bank = Math.max(d.bank || 0, cloud.bank || 0);
    d.bills = Math.max(d.bills || 0, cloud.bills || 0);
    d.boosts = Math.max(d.boosts || 0, cloud.boosts || 0);
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
    if (cloud.pfp) d.pfp = cloud.pfp;
    if (cloud.boostSide) d.boostSide = cloud.boostSide;
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
    d.bills = 0;
    d.boosts = 0;
    d.best = 0;
    d.bestUid = null;
    d.maps = ['sunset']; d.map = 'sunset';
    d.ships = ['classic']; d.ship = 'classic';
    d.skins = ['trump']; d.skin = 'trump';
    d.pfp = 'trump';
    d.up = { jet: 0, dome: 0, magnet: 0 };
    this.save();
    return this.data;
  },
};
window.SAVE.load();

// ---- shared UI components -------------------------------------------------
// Every panel, button and badge on every screen is built here, so the whole
// game speaks one language: chunky shapes, a thick navy outline on everything,
// and depth from a hard offset edge rather than a blur.
//
// A raised thing (button) sits on a solid `outline`-coloured edge and presses
// down onto it. A sunken thing (currency badge, score readout) has that same
// shadow cast inward from its top lip. Nothing invents its own shading.

// A surface: panels, cards, modal bodies.
// `inset: true` sinks it into the screen instead — currency pills, score wells.
function uiPanel(scene, x, y, w, h, opts = {}) {
  const T = window.THEME;
  const r = opts.radius ?? T.radius;
  const alpha = opts.alpha ?? 1;
  const base = opts.color ?? T.surfaceContainer;
  // callers that re-layout (pills that resize with their value) pass their own
  // graphics object and clear it themselves
  const g = opts.g || scene.add.graphics();

  if (opts.inset) {
    // Sunken: a shadow cast in from the top lip. Drawn as two stacked fills —
    // a dark pill, then the surface pill shifted down over it, so the shadow
    // is a crescent along the top edge and follows the corner radius exactly.
    // (Painting a short rounded rect inside instead gives a radius larger than
    // its own height, which renders as a detached blob above the shape.)
    g.fillStyle(0x000817, 0.55 * alpha);
    g.fillRoundedRect(x, y, w, h, r);
    g.fillStyle(base, alpha);
    g.fillRoundedRect(x, y + 3, w, h - 3, r);
  } else {
    g.fillStyle(base, alpha);
    g.fillRoundedRect(x, y, w, h, r);
  }

  if (opts.stroke !== false) {
    const bw = opts.borderWidth ?? T.border;
    g.lineStyle(bw, opts.strokeColor ?? T.outline, opts.strokeAlpha ?? 1);
    g.strokeRoundedRect(x, y, w, h, r);
  }
  return g;
}

// A pill-shaped readout — coins, bills, BEST. Sunken, never pressable.
function uiBadge(scene, x, y, w, h, opts = {}) {
  return uiPanel(scene, x, y, w, h, {
    color: window.THEME.surfaceHighest, borderWidth: 3,
    ...opts, radius: h / 2, inset: true,
  });
}

// The arcade button. Two layers: a base in the outline colour, and a face on
// top of it. Pressing moves the face down onto the base, exactly like a
// mechanical switch — box-shadow: 0 4px 0 #1D3557, then translateY(4px).
function uiButton(scene, x, y, w, h, label, onClick, opts = {}) {
  const T = window.THEME;
  const c = scene.add.container(x, y);
  const r = Math.min(opts.radius ?? T.radius, h / 2);
  const base = opts.color ?? T.primary;
  const edge = opts.edge ?? T.edge;
  const bw = opts.borderWidth ?? T.border;

  // the hard edge the face presses onto — same shape, offset down, no blur
  const back = scene.add.graphics();
  back.fillStyle(T.outline, 1);
  back.fillRoundedRect(-w / 2, -h / 2 + edge, w, h, r);

  const top = scene.add.container(0, 0);
  const face = scene.add.graphics();
  face.fillStyle(base, 1);
  face.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  face.lineStyle(bw, T.outline, 1);
  face.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

  // gold and pale surfaces take the dark ink; everything else takes white
  const ink = opts.textColor
    ?? (base === T.secondary ? '#694900' : base === T.secondaryLight ? '#422c00' : '#ffffff');
  const t = scene.add.text(0, 1, label, {
    fontFamily: window.FONT, fontSize: (opts.size ?? 20) + 'px', color: ink,
  }).setOrigin(0.5);
  // the signature: a hard, unblurred navy shadow under every headline
  if (ink === '#ffffff') t.setShadow(0, 3, '#1d3557', 0, false, true);

  top.add([face, t]);
  c.add([back, top]);
  c.setSize(w, h + edge);
  c.label = t;

  // let callers restyle the face later (shop tabs recolour on selection)
  c.setFaceColor = (color) => {
    face.clear();
    face.fillStyle(color, 1);
    face.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    face.lineStyle(bw, T.outline, 1);
    face.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  };

  if (opts.disabled) {
    c.setAlpha(0.45);
  } else {
    const release = () => { top.y = 0; };
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => top.setScale(1.02));
    c.on('pointerout', () => { top.setScale(1); release(); });
    c.on('pointerdown', () => { top.y = edge; });
    c.on('pointerup', () => {
      top.setScale(1);
      release();
      window.SFX.click();
      if (onClick) onClick();
    });
  }
  return c;
}
