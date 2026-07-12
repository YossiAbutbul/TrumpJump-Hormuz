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
  where, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const cfg = window.FIREBASE_CONFIG || {};
const configured = cfg.apiKey && !String(cfg.apiKey).startsWith('PASTE');

const state = { user: null, profile: null, profileLoaded: false, authResolved: false };

// last-known signed-in identity, persisted so the next app open can render
// the signed-in UI immediately instead of flashing "guest" while Firebase
// restores the session (1-2s). Cleared on sign-out.
const HINT_KEY = 'tj-auth-hint';
const writeHint = (uid, username) => {
  try { localStorage.setItem(HINT_KEY, JSON.stringify({ uid, username: username || '' })); } catch (e) {}
};
const emit = () => document.dispatchEvent(new CustomEvent('fb-auth', {
  detail: { user: state.user, profile: state.profile },
}));

if (!configured) {
  window.FB = {
    enabled: false,
    get user() { return null; },
    get profile() { return null; },
    get profileLoaded() { return true; },
    get authResolved() { return true; },
    signIn() { alert('Leaderboard is not set up yet — paste your Firebase config in src/config/firebase-config.js.'); },
    signOut() {},
    setUsername() { return Promise.resolve(); },
    submitScore() { return Promise.resolve(); },
    saveCloud() { return Promise.resolve(); },
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

  // write the local save blob up to the user's Firestore doc
  const pushSave = async () => {
    if (!state.user || !window.SAVE) return;
    const blob = window.SAVE.cloudBlob();
    try {
      await setDoc(doc(db, 'users', state.user.uid), {
        ...blob, updatedAt: serverTimestamp(),
      }, { merge: true });
      state.profile = { ...(state.profile || {}), ...blob };
    } catch (e) { console.warn('save push failed', e); }
  };

  onAuthStateChanged(auth, async (u) => {
    state.user = u ? { uid: u.uid, email: u.email, photo: u.photoURL } : null;
    state.authResolved = true;
    if (u) {
      state.profile = await loadProfile(u.uid);
      state.profileLoaded = true; // profile is now resolved (may be null for a new user)
      // merge cloud <-> local, keeping this account's own leaderboard best
      if (window.SAVE && window.SAVE.mergeCloud) {
        window.SAVE.mergeCloud(state.profile, u.uid);
        pushSave(); // background — don't hold up the UI on a network round-trip
      }
      writeHint(u.uid, state.profile && state.profile.username);
    } else {
      state.profile = null;
      state.profileLoaded = true;
      // real sign-out (we previously had a user) -> fresh guest: wipe wallet,
      // best and everything owned back to defaults. The account's real data
      // stays safe in the cloud and returns via mergeCloud on the next sign-in.
      // A plain guest boot (no prior user) keeps local guest progress.
      let hadUser = false;
      try {
        hadUser = !!localStorage.getItem(HINT_KEY);
        localStorage.removeItem(HINT_KEY);
      } catch (e) {}
      if (hadUser && window.SAVE && window.SAVE.resetToGuest) window.SAVE.resetToGuest();
    }
    emit();
  });

  window.FB = {
    enabled: true,
    get user() { return state.user; },
    get profile() { return state.profile; },
    get profileLoaded() { return state.profileLoaded; },
    get authResolved() { return state.authResolved; },

    async signIn() {
      try { await signInWithPopup(auth, provider); }
      catch (e) { console.warn('sign-in failed', e); }
    },

    async signOut() { try { await signOut(auth); } catch (e) { console.warn(e); } },

    // sets the leaderboard name if it's not already taken by another account
    // (case-insensitive). Resolves {ok} or {ok:false, msg} so callers can
    // reprompt. If the availability check itself fails we let the write
    // through — better a rare duplicate than blocking the user on a flaky read.
    async setUsername(name) {
      if (!state.user) return { ok: false, msg: 'not signed in' };
      name = String(name).trim().slice(0, 16) || 'player';
      const lower = name.toLowerCase();
      try {
        const takenBy = async (field, value) => {
          const snap = await getDocs(query(
            collection(db, 'users'), where(field, '==', value), limit(5)
          ));
          return snap.docs.some((d) => d.id !== state.user.uid);
        };
        // usernameLower covers everything written from now on; the exact-match
        // fallback still protects names saved before it existed
        if (await takenBy('usernameLower', lower) || await takenBy('username', name)) {
          return { ok: false, msg: 'name already taken' };
        }
      } catch (e) { console.warn('name check failed', e); }
      try {
        await setDoc(doc(db, 'users', state.user.uid), {
          username: name, usernameLower: lower, updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('name save failed', e);
        return { ok: false, msg: 'could not save, try again' };
      }
      state.profile = { ...(state.profile || {}), username: name, usernameLower: lower };
      writeHint(state.user.uid, name);
      emit();
      return { ok: true };
    },

    saveCloud() { return pushSave(); },

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
          if (v.best) rows.push({ uid: d.id, username: v.username || 'anon', best: v.best, pfp: v.pfp || 'trump' });
        });
        return rows;
      } catch (e) { console.warn('leaderboard load failed', e); return []; }
    },
  };
}
