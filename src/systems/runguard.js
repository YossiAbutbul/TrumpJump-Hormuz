// Run-integrity guard: the only source of truth for a run's altitude.
//
// The problem it solves: everything in this game runs in the player's browser,
// so anything reachable from the console can be rewritten. Before this file,
// `SAVE.data.best = 49999` or `FB.submitScore(49999)` from devtools was enough
// to take the top of the leaderboard.
//
// How it works:
//   - the run's altitude is tracked in a closure below, not on the scene, so
//     poking GameScene.maxMeters only changes the HUD text, never the score
//   - altitude is measured from the physics body and may only rise as fast as
//     the game's own physics permits, so teleporting the player is clamped away
//   - endGame() gets back a single-use signed ticket; FB.submitScore takes only
//     that ticket, so submitScore can't be called with a made-up number
//
// What it does NOT solve (needs a server; see firestore.rules for the parts
// that ARE enforced on Google's side): a determined attacker can still drive
// the real game loop with a script, or skip this code entirely and write to
// their own Firestore doc with the public SDK. The Firestore rules cap how far
// and how fast `best` can move, which is the only server-side backstop we have
// without Cloud Functions.

(function () {
  'use strict';

  // Hard physics ceiling on climb speed, in metres per second. The fastest the
  // player can ever rise is the jet cruise — 850 px/s scaled by the 1.4 max
  // pace ramp (GameScene.update), and 10 px = 1 m. 130 leaves headroom.
  const MAX_M_PER_S = 130;
  // one-off tolerance on the ceiling. Deliberately NOT per frame: a per-frame
  // allowance compounds, and a held teleport would ratchet up on the slack
  // alone. The ceiling below is absolute from the run's start, so a hitching
  // frame costs nothing either — the next frame's ceiling has already caught up.
  const SLACK_M = 8;
  // dt is clamped before it buys altitude: a stalled tab (or a forged clock)
  // must not hand out a huge allowance in a single frame
  const MAX_DT_MS = 120;

  const rnd = () => {
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return a[0].toString(36) + a[1].toString(36);
  };

  // per-page-load signing secret; never leaves this closure
  const SECRET = rnd();

  // FNV-1a. Not cryptography — the secrecy lives in SECRET and in `run` being
  // unreachable from outside. It only has to make a ticket unwritable by hand.
  const hash = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36);
  };

  let run = null;      // the live run — private state, no outside reference
  let pending = null;  // the one ticket finish() handed out, until it's consumed

  const sign = (t) => hash([SECRET, t.nonce, t.score, t.frames, t.runMs].join('|'));

  const API = {
    // start tracking a fresh run. Called from GameScene.create, so a rematch
    // (scene.restart) always starts from zero.
    begin(scene) {
      run = {
        base: scene.baseY - 60,   // same origin the HUD counts metres from
        max: 0,
        elapsed: 0,               // clamped play time, the altitude budget
        lastT: -1,
        frames: 0,
        nonce: rnd(),
      };
      pending = null;
    },

    // Called once per update tick. Measures altitude off the physics body and
    // returns the verified best-so-far, which the HUD then displays.
    sample(scene, time) {
      if (!run) return 0;
      const p = scene.player;
      if (!p || !p.body) return run.max;

      if (run.lastT < 0) run.lastT = time;
      run.elapsed += Math.min(MAX_DT_MS, Math.max(0, time - run.lastT));
      run.lastT = time;
      run.frames++;
      if (scene.dead) return run.max; // falling to your death earns nothing

      const raw = Math.max(0, Math.floor((run.base - p.y) / 10));
      // The run may not have climbed further than its own play time allows.
      // Honest play never comes near this — even a full-length jet flight
      // averages well under the cruise speed — but a teleport (a console poke
      // at player.y, or a hooked update()) lands far above it and is clamped
      // away. Holding the teleport buys nothing extra: the cheat can rise no
      // faster than a player who flew the whole run.
      const ceiling = MAX_M_PER_S * run.elapsed / 1000 + SLACK_M;
      const credited = Math.min(raw, ceiling);
      if (credited > run.max) run.max = Math.floor(credited);
      return run.max;
    },

    // Close the run and mint a single-use ticket for the verified score.
    // Returns null if there is no run open (e.g. finish() called twice).
    finish() {
      if (!run) return null;
      const t = {
        score: run.max,
        frames: run.frames,
        runMs: Math.round(run.elapsed),
        nonce: run.nonce,
      };
      t.sig = sign(t);
      run = null;
      pending = t;
      return t;
    },

    // Exchange a ticket for the score it certifies. Returns 0 for anything
    // forged, replayed or stale — FB.submitScore takes nothing else.
    consume(ticket) {
      if (!pending || !ticket || typeof ticket !== 'object') return 0;
      if (ticket.nonce !== pending.nonce || ticket.sig !== pending.sig) return 0;
      if (ticket.score !== pending.score) return 0;
      if (sign(ticket) !== ticket.sig) return 0;
      pending = null; // single use: a replayed ticket verifies against nothing
      return Math.max(0, Math.floor(ticket.score));
    },
  };

  // non-writable + non-configurable, so `window.RUNGUARD = fake`, `delete
  // window.RUNGUARD` and a redefine all bounce off instead of installing a
  // guard that says yes to everything
  Object.defineProperty(window, 'RUNGUARD', {
    value: Object.freeze(API), writable: false, configurable: false,
  });
})();
