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
//   - the run is recorded as a keyframe trace and posted to /api/submit-run,
//     which replays it against the real time that passed on the server clock
//     before it will write anything to the leaderboard
//
// None of the client-side half is trusted by the server — it exists so honest
// players never notice, and so the trace that gets posted is the same one the
// game actually played. The decision lives in api/submit-run.js.

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
  // one trace keyframe per this much play time. 250 ms keeps a 16-minute run
  // under the server's 4000-keyframe cap and the whole POST under ~50 KB.
  const KEYFRAME_MS = 250;

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

  // hard cap on trace size, matching MAX_KEYFRAMES in api/_lib/trace.js
  const MAX_KEYFRAMES = 4000;

  let run = null;      // the live run — private state, no outside reference
  let pending = null;  // the one ticket finish() handed out, until it's consumed

  // Bank a keyframe: how long since the last one, and the best altitude so far.
  // Recording the running best rather than the live altitude means the trace
  // ends on exactly the score being claimed, with nothing to reconcile.
  const keyframe = () => {
    run.trace.push([Math.round(run.sinceKey), run.max]);
    run.sinceKey = 0;
    if (run.trace.length >= MAX_KEYFRAMES) compact();
  };

  // A run has no time limit, so a full trace is halved in place instead of
  // truncated: merge each pair of keyframes (keeping the later score, summing
  // the gap) and double the interval. An hour-long run costs the same bytes as
  // a 30-second one, and the server's climb-rate check still holds because the
  // merged keyframe carries the merged time with it.
  const compact = () => {
    const t = run.trace, out = [];
    for (let i = 0; i < t.length; i += 2) {
      const a = t[i], b = t[i + 1];
      out.push(b ? [a[0] + b[0], b[1]] : a);
    }
    run.trace = out;
    run.keyMs *= 2;
  };

  // the trace is signed along with the score, so a ticket can't be handed on
  // with somebody else's trace stapled to it
  const sign = (t) => hash([
    SECRET, t.nonce, t.score, t.frames, t.runMs, hash(JSON.stringify(t.trace)),
  ].join('|'));

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
        trace: [],                // [msSinceLastKeyframe, bestSoFar] pairs
        sinceKey: 0,              // play time banked toward the next keyframe
        keyMs: KEYFRAME_MS,       // grows if the trace has to be compacted
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
      const dt = Math.min(MAX_DT_MS, Math.max(0, time - run.lastT));
      run.elapsed += dt;
      run.sinceKey += dt;
      run.lastT = time;
      run.frames++;
      if (run.sinceKey >= run.keyMs) keyframe();
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
      keyframe(); // close the trace on the final score, so it ends where the ticket does
      const t = {
        score: run.max,
        frames: run.frames,
        runMs: Math.round(run.elapsed),
        nonce: run.nonce,
        trace: { v: 1, s: run.trace },
      };
      t.sig = sign(t);
      run = null;
      pending = t;
      return t;
    },

    // Exchange a ticket for the score and trace it certifies. Returns null for
    // anything forged, replayed or stale — FB.submitScore takes nothing else.
    consume(ticket) {
      if (!pending || !ticket || typeof ticket !== 'object') return null;
      if (ticket.nonce !== pending.nonce || ticket.sig !== pending.sig) return null;
      if (ticket.score !== pending.score) return null;
      if (sign(ticket) !== ticket.sig) return null;
      pending = null; // single use: a replayed ticket verifies against nothing
      return { score: Math.max(0, Math.floor(ticket.score)), trace: ticket.trace };
    },
  };

  // non-writable + non-configurable, so `window.RUNGUARD = fake`, `delete
  // window.RUNGUARD` and a redefine all bounce off instead of installing a
  // guard that says yes to everything
  Object.defineProperty(window, 'RUNGUARD', {
    value: Object.freeze(API), writable: false, configurable: false,
  });
})();
