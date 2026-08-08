// POST /api/submit-run
//
// The only way a score reaches the leaderboard. firestore.rules denies every
// client write to `best`, so a browser can shout any number it likes and
// nothing happens unless this handler agrees.
//
// Four things have to line up:
//   1. the caller is a real signed-in user (Firebase ID token)
//   2. the run token was minted by /api/start-run, for this same user
//   3. enough real server time passed between the two calls to cover the trace
//   4. the trace itself replays cleanly (see _lib/trace.js)
//
// Body: { runToken, score, trace }.  Auth: Authorization: Bearer <id token>.
// Returns: { ok, best } on success, or { ok: false, reason } — a rejected run
// is never an error the player sees, it just doesn't count.

import crypto from 'node:crypto';
import { getDb, uidFromRequest } from './_lib/admin.js';
import { readRunToken } from './_lib/run-token.js';
import { validateTrace, MAX_M_PER_S, SLACK_M } from './_lib/trace.js';

// A trace may claim slightly more play time than the wall clock shows — clocks
// drift and the token is minted a beat before the first frame. It may never
// claim meaningfully MORE time than really passed, which is the check that
// makes a fabricated long run impossible.
const CLOCK_SLACK_MS = 5000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    return await submit(req, res);
  } catch (e) {
    console.error('submit-run failed:', e);
    return res.status(500).json({ error: `server error: ${e.message}` });
  }
}

async function submit(req, res) {
  const db = getDb();
  const uid = await uidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'sign in first' });

  const { runToken, score, trace } = req.body || {};

  const now = Date.now();
  const token = readRunToken(runToken, now);
  if (token.error) return reject(res, token.error);
  // a token issued to somebody else is not yours to spend
  if (token.uid !== uid) return reject(res, 'run token belongs to another account');

  const replay = validateTrace(trace, score);
  if (!replay.ok) return reject(res, replay.reason);

  // The load-bearing check: the run cannot have taken longer than the real time
  // between start-run and now, and cannot have climbed further than that real
  // time allows. Everything above this line is client-supplied; `token.ageMs`
  // is measured by the server clock at both ends.
  if (replay.durationMs > token.ageMs + CLOCK_SLACK_MS) {
    return reject(res, 'trace claims more play time than actually passed');
  }
  if (replay.score > MAX_M_PER_S * (token.ageMs / 1000) + SLACK_M) {
    return reject(res, 'score climbed faster than the game allows');
  }

  // Single use. create() fails if the marker already exists, so a captured
  // request cannot be replayed to bank the same run twice.
  const marker = crypto.createHash('sha256').update(String(runToken)).digest('hex');
  try {
    await db.collection('runsUsed').doc(marker).create({
      uid, score: replay.score, at: new Date(now),
      // set a Firestore TTL policy on this field so old markers clean
      // themselves up: Firestore console > TTL > collection `runsUsed`,
      // field `expireAt`
      expireAt: new Date(now + 24 * 60 * 60 * 1000),
    });
  } catch {
    return reject(res, 'this run was already submitted');
  }

  // Write the score ourselves. The Admin SDK bypasses the rules, which is why
  // the rules can afford to deny the client outright.
  const userRef = db.collection('users').doc(uid);
  const best = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const current = (snap.exists && snap.data().best) || 0;
    if (replay.score <= current) return current;
    tx.set(userRef, { best: replay.score, updatedAt: new Date(now) }, { merge: true });
    return replay.score;
  });

  return res.status(200).json({ ok: true, best });
}

// A refusal is a normal outcome, not a server fault: answer 200 with a reason
// so the client can log it and move on without a console full of red.
function reject(res, reason) {
  return res.status(200).json({ ok: false, reason });
}
