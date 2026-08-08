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

const state = {
  user: null, profile: null, profileLoaded: false, authResolved: false,
  // the open server-issued run, if any (see startRun/submitScore)
  runToken: null, runPending: null,
};

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
    startRun() {},
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

  // POST to one of our serverless handlers, carrying the caller's Firebase ID
  // token so the server can prove who is asking. Same origin in production, so
  // no CORS; running the game off a plain static server locally means /api
  // isn't there and these calls simply fail (the run stays local).
  const api = async (path, body) => {
    if (!auth.currentUser) throw new Error('not signed in');
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    return res.json();
  };

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
      state.runToken = null; // an open run doesn't survive signing out
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

    // sets the leaderboard name only if no other account already uses it
    // (case-insensitive). Accounts created before usernameLower existed are
    // covered too: every account's name is compared, lowered client-side.
    // Resolves {ok} or {ok:false, msg} so callers can reprompt. If the
    // availability check can't run, the write is refused — never risk a
    // duplicate.
    async setUsername(name) {
      if (!state.user) return { ok: false, msg: 'not signed in' };
      name = String(name).trim().slice(0, 16) || 'player';
      const lower = name.toLowerCase();
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(1000)));
        let taken = false;
        snap.forEach((d) => {
          if (d.id === state.user.uid) return;
          const v = d.data();
          const other = v.usernameLower || String(v.username || '').trim().toLowerCase();
          if (other && other === lower) taken = true;
        });
        if (taken) return { ok: false, msg: `"${name}" is taken — names must be unique` };
      } catch (e) {
        console.warn('name check failed', e);
        return { ok: false, msg: 'could not verify the name, try again' };
      }
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

    // Ask the server to open a run. The token it returns carries the server's
    // clock reading, which is what /api/submit-run measures the finished run
    // against. Fire-and-forget: if it fails (offline, API not deployed yet) the
    // run still plays, it just won't reach the leaderboard.
    startRun() {
      state.runToken = null;
      if (!auth.currentUser) return;
      state.runPending = api('/api/start-run')
        .then((r) => { state.runToken = (r && r.runToken) || null; })
        .catch(() => { state.runToken = null; });
    },

    // Takes the single-use ticket RUNGUARD minted at game over — never a raw
    // number — and posts the recorded run for the server to replay. Nothing
    // here writes the score: firestore.rules denies client writes to `best`,
    // so the leaderboard only moves if api/submit-run.js agrees.
    async submitScore(ticket) {
      if (!state.user) return;
      const run = window.RUNGUARD ? window.RUNGUARD.consume(ticket) : null;
      if (!run || !run.score) return;
      const best = (state.profile && state.profile.best) || 0;
      if (run.score <= best) return;

      await state.runPending;              // the token may still be in flight
      if (!state.runToken) return;         // no server run open — nothing to submit
      const token = state.runToken;
      state.runToken = null;               // one submission per run, always

      try {
        const res = await api('/api/submit-run', {
          runToken: token, score: run.score, trace: run.trace,
        });
        if (!res || !res.ok) {
          console.warn('run rejected:', (res && res.reason) || 'unknown');
          return;
        }
        state.profile = { ...(state.profile || {}), best: res.best };
        emit();
      } catch (e) { console.warn('score submit failed', e); }
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
