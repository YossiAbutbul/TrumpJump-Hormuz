// ---------------------------------------------------------------------------
// Firebase config. Paste your project's web-app config below.
//   Firebase console > Project settings (gear) > General
//   > "Your apps" > Web app > SDK setup and configuration > "Config".
// These values are safe to expose in client code; access is enforced by the
// Firestore security rules, not by hiding the keys.
// Until real values are pasted, the game runs fine with leaderboard disabled.
// ---------------------------------------------------------------------------
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC1dWT1Jj3NTQyaHY0Pltfo5d-rEblWvrs",
  authDomain: "trump-jump-strait-of-hormuz.firebaseapp.com",
  projectId: "trump-jump-strait-of-hormuz",
  storageBucket: "trump-jump-strait-of-hormuz.firebasestorage.app",
  messagingSenderId: "393573764290",
  appId: "1:393573764290:web:59ed71254468bef3703f5b",
  measurementId: "G-8NWTBTEDQD",
};

// Funny Trump-themed fallback names, given a random 2-4 digit suffix so each
// user gets a distinct handle when they don't pick one.
window.FUNNY_NAMES = [
  'Bigly', 'Covfefe', 'Tremendous', 'SirTanalot', 'CombOver',
  'WallGuy', 'YugeCheeto', 'MagaMan', 'GoldToupee', 'NukeButton',
  'FakeNewsFoe', 'RallyKing', 'Sharpiegate', 'Bonespurs', 'Hamberder',
];
window.randomFunnyName = () => {
  const base = window.FUNNY_NAMES[Math.floor(Math.random() * window.FUNNY_NAMES.length)];
  const n = 2 + Math.floor(Math.random() * 3); // 2..4 digits
  let digits = '';
  for (let i = 0; i < n; i++) digits += Math.floor(Math.random() * 10);
  return (base + digits).slice(0, 16);
};

// While a DOM modal is open, stop Phaser from also processing the tap on the
// game buttons behind it (pointer events bubble to the window regardless of the
// overlay, so a tap on a modal control could otherwise also hit PLAY, etc.).
window.setGameInputEnabled = (on) => {
  const g = window.game;
  if (!g || !g.scene) return;
  g.scene.scenes.forEach((s) => { if (s.input) s.input.enabled = on; });
};

// Small DOM modal for picking a leaderboard username after first sign-in.
// Defined here (classic script) so it is available before the module loads.
// Closing (X) keeps the current name, or invents a funny one if there is none.
window.promptUsername = (current, cb) => {
  const modal = document.getElementById('name-modal');
  const input = document.getElementById('name-input');
  const save = document.getElementById('name-save');
  const closeBtn = document.getElementById('name-close');
  if (!modal || !input || !save) { cb((current && current.trim()) || window.randomFunnyName()); return; }
  input.value = current || '';
  modal.style.display = 'flex';
  window.setGameInputEnabled(false);
  input.focus();

  const cleanup = () => {
    save.removeEventListener('click', onSave);
    input.removeEventListener('keydown', onKey);
    if (closeBtn) closeBtn.removeEventListener('click', onClose);
  };
  // resolve to a name: typed value if given, else the existing name, else a
  // generated funny one — never empty
  const finish = (useInput) => {
    let v = useInput ? input.value.trim().slice(0, 16) : '';
    if (!v) v = (current && current.trim().slice(0, 16)) || window.randomFunnyName();
    modal.style.display = 'none';
    window.setGameInputEnabled(true);
    cleanup();
    cb(v);
  };
  const onSave = () => finish(true);
  const onClose = () => finish(false);
  const onKey = (e) => { if (e.key === 'Enter') finish(true); };
  save.addEventListener('click', onSave);
  input.addEventListener('keydown', onKey);
  if (closeBtn) closeBtn.addEventListener('click', onClose);
};

// Populate a container with a profile-picture picker: every (non-secret)
// Trump-skin face. Selecting one saves it and refreshes the on-screen avatar.
window.renderPfpGrid = (grid) => {
  if (!grid || !window.CATALOG) return;
  grid.innerHTML = '';
  const current = (window.SAVE && window.SAVE.data.pfp) || 'trump';
  Object.entries(window.CATALOG.SKINS).forEach(([id, s]) => {
    if (s.secret) return;
    const btn = document.createElement('button');
    btn.className = 'pfp' + (id === current ? ' sel' : '');
    btn.title = s.name;
    const im = document.createElement('img');
    im.src = 'assets/skins/' + s.dir + '/idle.png';
    im.alt = s.name;
    btn.appendChild(im);
    btn.onclick = () => {
      if (!window.SAVE) return;
      window.SAVE.data.pfp = id;
      window.SAVE.save();
      grid.querySelectorAll('.pfp').forEach((b) => b.classList.remove('sel'));
      btn.classList.add('sel');
      document.dispatchEvent(new CustomEvent('pfp-change'));
      if (window.SFX && window.SFX.click) window.SFX.click();
    };
    grid.appendChild(btn);
  });
};

// Custom account modal: sign-in choice when signed out, account actions when in.
window.accountModal = () => {
  const modal = document.getElementById('account-modal');
  const box = document.getElementById('account-box');
  if (!modal || !box) return;
  const fb = window.FB;
  const close = () => { modal.style.display = 'none'; window.setGameInputEnabled(true); };
  box.innerHTML = '';

  const x = document.createElement('button');
  x.className = 'm-close';
  x.innerHTML = '&times;';
  x.setAttribute('aria-label', 'Close');
  x.onclick = close;
  box.appendChild(x);

  const title = (txt) => { const h = document.createElement('h3'); h.textContent = txt; box.appendChild(h); };
  const sub = (txt) => { const p = document.createElement('p'); p.className = 'm-sub'; p.textContent = txt; box.appendChild(p); };
  const btn = (label, cls, cb, html) => {
    const b = document.createElement('button');
    b.className = 'm-btn ' + (cls || '');
    if (html) b.innerHTML = html; else b.textContent = label;
    b.onclick = cb;
    box.appendChild(b);
    return b;
  };
  const pfpSection = () => {
    const label = document.createElement('p');
    label.className = 'm-sub'; label.textContent = 'Profile picture';
    label.style.margin = '2px 0 8px';
    box.appendChild(label);
    const grid = document.createElement('div');
    grid.id = 'pfp-grid';
    box.appendChild(grid);
    window.renderPfpGrid(grid);
  };

  if (fb && fb.user) {
    const name = (fb.profile && fb.profile.username) || 'player';
    title('HI, ' + name.toUpperCase());
    sub('best: ' + ((fb.profile && fb.profile.best) || 0) + ' m');
    pfpSection();
    btn('CHANGE NAME', 'ghost', () => {
      close();
      window.promptUsername(name, (n) => { if (n && fb.setUsername) fb.setUsername(n); });
    });
    btn('SIGN OUT', 'danger', () => { close(); if (fb.signOut) fb.signOut(); });
    btn('CLOSE', 'ghost', close);
  } else {
    title('PLAY');
    sub('sign in to save your progress across devices and climb the leaderboard');
    btn('SIGN IN WITH GOOGLE', 'google', () => {
      close();
      if (fb && fb.signIn) fb.signIn();
    }, '<span class="gi">G</span> SIGN IN WITH GOOGLE');
    btn('PLAY AS GUEST', 'ghost', close);
  }
  modal.style.display = 'flex';
  window.setGameInputEnabled(false);
};

// Check a typed code against the catalog's secret skins and unlock (free) on
// match. Generic: any skin with a `code` field can be redeemed here.
window.redeemCode = (code) => {
  code = String(code || '').trim();
  if (!code) return { ok: false, msg: 'enter a code' };
  const skins = window.CATALOG && window.CATALOG.SKINS;
  const save = window.SAVE && window.SAVE.data;
  if (!skins || !save) return { ok: false, msg: 'try again in a moment' };
  const match = Object.entries(skins).find(([, s]) => s.code && String(s.code) === code);
  if (!match) return { ok: false, msg: 'invalid code' };
  const [key, skin] = match;
  if (save.skins.includes(key)) return { ok: false, msg: `${skin.name} already unlocked` };
  save.skins.push(key);
  window.SAVE.save();
  return { ok: true, msg: `${skin.name} unlocked! find it in the shop` };
};

// Settings modal: enter a friend code to unlock a secret skin.
window.settingsModal = () => {
  const modal = document.getElementById('settings-modal');
  const input = document.getElementById('code-input');
  const msg = document.getElementById('code-msg');
  const redeem = document.getElementById('code-redeem');
  const closeBtn = document.getElementById('settings-close');
  const muteBtn = document.getElementById('mute-toggle');
  if (!modal || !input) return;
  input.value = '';
  msg.textContent = '';
  modal.style.display = 'flex';
  window.setGameInputEnabled(false);
  input.focus();

  const syncMute = () => {
    const m = window.SAVE && window.SAVE.data.muted;
    muteBtn.textContent = m ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
  };
  syncMute();
  const onMute = () => {
    if (!window.SAVE) return;
    window.SAVE.data.muted = !window.SAVE.data.muted;
    window.SAVE.save();
    syncMute();
    if (window.SFX && window.SFX.click) window.SFX.click();
  };

  const cleanup = () => {
    redeem.removeEventListener('click', onRedeem);
    closeBtn.removeEventListener('click', doClose);
    input.removeEventListener('keydown', onKey);
    modal.removeEventListener('click', onBackdrop);
    muteBtn.removeEventListener('click', onMute);
  };
  const doClose = () => { modal.style.display = 'none'; window.setGameInputEnabled(true); cleanup(); };
  const onRedeem = () => {
    const res = window.redeemCode(input.value);
    msg.textContent = res.msg;
    msg.style.color = res.ok ? '#79e08a' : '#ff7a7a';
    if (res.ok) input.value = '';
  };
  const onKey = (e) => { if (e.key === 'Enter') onRedeem(); };
  const onBackdrop = (e) => { if (e.target === modal) doClose(); };
  redeem.addEventListener('click', onRedeem);
  closeBtn.addEventListener('click', doClose);
  input.addEventListener('keydown', onKey);
  modal.addEventListener('click', onBackdrop);
  muteBtn.addEventListener('click', onMute);
};
