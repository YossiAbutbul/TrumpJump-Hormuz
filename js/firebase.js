// Firebase integration (module). Exposes a small API on window.FB and emits a
// document 'fb-auth' event whenever auth state / profile changes.
// Degrades gracefully: if FIREBASE_CONFIG is not filled in, leaderboard/login
// are disabled and the rest of the game works unchanged.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const cfg = window.FIREBASE_CONFIG || {};
const configured = cfg.apiKey && !String(cfg.apiKey).startsWith('PASTE');

const state = { user: null, profile: null };
const emit = () => document.dispatchEvent(new CustomEvent('fb-auth', {
  detail: { user: state.user, profile: state.profile },
}));

if (!configured) {
  window.FB = {
    enabled: false,
    get user() { return null; },
    get profile() { return null; },
    signIn() { alert('Leaderboard is not set up yet — paste your Firebase config in js/firebase-config.js.'); },
    signOut() {},
    setUsername() { return Promise.resolve(); },
    submitScore() { return Promise.resolve(); },
    topScores() { return Promise.resolve([]); },
  };
  setTimeout(emit, 0);
} else {
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();

  const loadProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? snap.data() : null;
    } catch (e) { console.warn('profile load failed', e); return null; }
  };

  onAuthStateChanged(auth, async (u) => {
    state.user = u ? { uid: u.uid, email: u.email, photo: u.photoURL } : null;
    state.profile = u ? await loadProfile(u.uid) : null;
    emit();
  });

  window.FB = {
    enabled: true,
    get user() { return state.user; },
    get profile() { return state.profile; },

    async signIn() {
      try { await signInWithPopup(auth, provider); }
      catch (e) { console.warn('sign-in failed', e); }
    },

    async signOut() { try { await signOut(auth); } catch (e) { console.warn(e); } },

    async setUsername(name) {
      if (!state.user) return;
      name = String(name).trim().slice(0, 16) || 'player';
      await setDoc(doc(db, 'users', state.user.uid), {
        username: name, email: state.user.email, updatedAt: serverTimestamp(),
      }, { merge: true });
      state.profile = { ...(state.profile || {}), username: name };
      emit();
    },

    async submitScore(score) {
      if (!state.user) return;
      score = Math.max(0, Math.floor(score));
      const best = (state.profile && state.profile.best) || 0;
      if (score <= best) return;
      await setDoc(doc(db, 'users', state.user.uid), {
        best: score, updatedAt: serverTimestamp(),
      }, { merge: true });
      state.profile = { ...(state.profile || {}), best: score };
      emit();
    },

    async topScores(n = 20) {
      try {
        const q = query(collection(db, 'users'), orderBy('best', 'desc'), limit(n));
        const snap = await getDocs(q);
        const rows = [];
        snap.forEach((d) => {
          const v = d.data();
          if (v.best) rows.push({ uid: d.id, username: v.username || 'anon', best: v.best });
        });
        return rows;
      } catch (e) { console.warn('leaderboard load failed', e); return []; }
    },
  };
}
