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
