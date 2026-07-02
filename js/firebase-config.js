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
