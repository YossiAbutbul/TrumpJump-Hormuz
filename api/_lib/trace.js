// Trace validator — the server's replay of a run.
//
// The client records the run as a list of keyframes and posts them here. This
// walks the list and asks the questions a real run always answers yes to:
//
//   - does time move forward, in believable steps?
//   - does the score only ever climb, and never faster than the game's own
//     physics can climb it?
//   - is the claimed score the one the trace actually ends on?
//   - did the run take as long as the trace says? (checked by the caller
//     against the signed start-run stamp — the part a browser cannot forge)
//
// Keep the constants below in step with src/systems/runguard.js. The client
// clamps to the same numbers, so an honest trace never comes near a limit here
// and any rejection is a real anomaly, not a tight tolerance.

// Fastest the game can physically climb: jet cruise 850 px/s at the 1.4x max
// pace ramp, and 10 px = 1 m.
export const MAX_M_PER_S = 130;
// score ceiling — matches maxBest() in firestore.rules
export const MAX_SCORE = 50000;
// The client aims for a keyframe every 250 ms, but compacts the trace when it
// fills up (merging pairs and doubling the interval), so a long run legitimately
// arrives with wider gaps. This ceiling covers three compactions plus a hitching
// or briefly-backgrounded tab.
export const MAX_GAP_MS = 8000;
// generous cap on trace length: 4000 keyframes ≈ 16 minutes of play
export const MAX_KEYFRAMES = 4000;
// absolute tolerance, absorbing the one-off slack the client allows itself
export const SLACK_M = 12;

const isInt = (n) => typeof n === 'number' && Number.isInteger(n);

/**
 * @param {unknown} trace  the posted trace
 * @param {number} claimedScore  the score the client says it earned
 * @returns {{ok: true, score: number, durationMs: number} | {ok: false, reason: string}}
 */
export function validateTrace(trace, claimedScore) {
  if (!trace || typeof trace !== 'object') return bad('no trace');
  if (trace.v !== 1) return bad('unknown trace version');
  const frames = trace.s;
  if (!Array.isArray(frames)) return bad('trace has no keyframes');
  if (frames.length < 1) return bad('trace is empty');
  if (frames.length > MAX_KEYFRAMES) return bad('trace too long');
  if (!isInt(claimedScore) || claimedScore < 0 || claimedScore > MAX_SCORE) {
    return bad('score out of range');
  }

  let elapsed = 0;
  let score = 0;

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (!Array.isArray(f) || f.length !== 2) return bad(`keyframe ${i} malformed`);
    const [dt, alt] = f;

    if (!isInt(dt) || dt < 0 || dt > MAX_GAP_MS) return bad(`keyframe ${i} has an impossible gap`);
    if (!isInt(alt) || alt < 0 || alt > MAX_SCORE) return bad(`keyframe ${i} altitude out of range`);

    // the trace records the running best, so it may never go down
    if (alt < score) return bad(`keyframe ${i} score went backwards`);

    // ...and may not climb faster than the game can fly
    const allowed = score + MAX_M_PER_S * dt / 1000 + SLACK_M;
    if (alt > allowed) return bad(`keyframe ${i} climbed ${alt - score} m in ${dt} ms`);

    elapsed += dt;
    score = alt;
  }

  // the run must end on the score it claims — no quietly submitting a bigger
  // number than the trace supports
  if (score !== claimedScore) return bad('claimed score does not match the trace');

  return { ok: true, score, durationMs: elapsed };
}

function bad(reason) { return { ok: false, reason }; }
