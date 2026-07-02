// ---------------------------------------------------------------------------
// Firebase config. Paste your project's web-app config below.
//   Firebase console > Project settings (gear) > General
//   > "Your apps" > Web app > SDK setup and configuration > "Config".
// These values are safe to expose in client code; access is enforced by the
// Firestore security rules, not by hiding the keys.
// Until real values are pasted, the game runs fine with leaderboard disabled.
// ---------------------------------------------------------------------------
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
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
