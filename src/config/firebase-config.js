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

// Small DOM modal for picking a leaderboard username after first sign-in.
// Defined here (classic script) so it is available before the module loads.
window.promptUsername = (current, cb) => {
  const modal = document.getElementById('name-modal');
  const input = document.getElementById('name-input');
  const save = document.getElementById('name-save');
  if (!modal || !input || !save) { cb(current || 'player'); return; }
  input.value = current || '';
  modal.style.display = 'flex';
  input.focus();
  const done = () => {
    const v = input.value.trim().slice(0, 16) || 'player';
    modal.style.display = 'none';
    save.removeEventListener('click', done);
    input.removeEventListener('keydown', onKey);
    cb(v);
  };
  const onKey = (e) => { if (e.key === 'Enter') done(); };
  save.addEventListener('click', done);
  input.addEventListener('keydown', onKey);
};

// Custom account modal: sign-in choice when signed out, account actions when in.
window.accountModal = () => {
  const modal = document.getElementById('account-modal');
  const box = document.getElementById('account-box');
  if (!modal || !box) return;
  const fb = window.FB;
  const close = () => { modal.style.display = 'none'; };
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

  if (fb && fb.user) {
    const name = (fb.profile && fb.profile.username) || 'player';
    title('HI, ' + name.toUpperCase());
    sub('best: ' + ((fb.profile && fb.profile.best) || 0) + ' m');
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
  const doClose = () => { modal.style.display = 'none'; cleanup(); };
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
