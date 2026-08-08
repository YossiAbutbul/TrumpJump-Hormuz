// The run ticket: a stateless, server-signed "you started a run at this
// instant" note.
//
// Why it exists: the one thing a browser can never fake is how much real time
// passed. /api/start-run stamps the server clock into a token and signs it with
// RUN_SECRET (which only ever lives in Vercel's env). /api/submit-run reads
// that stamp back and knows exactly how long the run really took. A trace
// claiming 5000 m from a token minted four seconds ago is a cheat, full stop —
// no matter how convincing the trace itself looks.
//
// Signed instead of stored so issuing a run costs zero database writes; the
// only write is the single-use marker at submit time.

import crypto from 'node:crypto';

const SECRET = process.env.RUN_SECRET || '';

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sign = (payload) =>
  crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

// A run may not be submitted before this much time has passed (a real run
// takes a moment) nor after this much (a token can't be banked for later).
export const MIN_RUN_MS = 1500;
export const MAX_RUN_MS = 90 * 60 * 1000; // 90 min covers any honest session

export function issueRunToken(uid, nowMs) {
  const payload = b64(JSON.stringify({ u: uid, t: nowMs }));
  return `${payload}.${sign(payload)}`;
}

// Returns { uid, issuedAt } or { error } — never throws on bad input.
export function readRunToken(token, nowMs) {
  if (!SECRET) return { error: 'server misconfigured: RUN_SECRET is not set' };
  if (typeof token !== 'string' || token.length > 512) return { error: 'bad run token' };
  const dot = token.indexOf('.');
  if (dot < 1) return { error: 'bad run token' };

  const payload = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const want = Buffer.from(sign(payload));
  // constant-time compare, and length-check first because timingSafeEqual
  // throws on a length mismatch
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    return { error: 'bad run token' };
  }

  let body;
  try { body = JSON.parse(Buffer.from(payload, 'base64url').toString()); }
  catch { return { error: 'bad run token' }; }
  if (!body || typeof body.u !== 'string' || typeof body.t !== 'number') {
    return { error: 'bad run token' };
  }

  const age = nowMs - body.t;
  if (age < MIN_RUN_MS) return { error: 'run finished impossibly fast' };
  if (age > MAX_RUN_MS) return { error: 'run token expired' };

  return { uid: body.u, issuedAt: body.t, ageMs: age };
}
