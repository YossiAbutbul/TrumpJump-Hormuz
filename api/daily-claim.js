// POST /api/daily-claim
//
// Hands out the daily sign-in bonus and moves the streak along. This is the
// only place either can happen: firestore.rules denies the browser every write
// to `streak` and `lastClaimDay`, and the reward lands on `bank` / `bills` in
// the same transaction, so a tampered client cannot pay itself.
//
// The streak rule, measured against the server clock only:
//   claimed yesterday  -> streak + 1
//   claimed today      -> refused, nothing changes
//   anything else      -> streak resets to 1
//
// Body: none. Auth: Authorization: Bearer <firebase id token>.
// Returns { ok: true, streak, day, reward, bank, bills, lastClaimDay } or
// { ok: false, reason, ... } — a refusal is a normal outcome, not an error.

import { getDb, uidFromRequest } from './_lib/admin.js';
import { dayKey, dayOfCycle, prevDayKey, rewardFor } from './_lib/daily.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    return await claim(req, res);
  } catch (e) {
    console.error('daily-claim failed:', e);
    return res.status(500).json({ error: `server error: ${e.message}` });
  }
}

async function claim(req, res) {
  const uid = await uidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'sign in first' });

  const db = getDb();
  const now = Date.now();
  const today = dayKey(now);
  const yesterday = prevDayKey(now);
  const ref = db.collection('users').doc(uid);

  // A transaction, so two tabs (or a double tap) racing each other still pay
  // out exactly once — the loser re-reads lastClaimDay and refuses.
  const out = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = (snap.exists && snap.data()) || {};
    const last = d.lastClaimDay || null;

    if (last === today) {
      return {
        ok: false, reason: 'already claimed today',
        streak: d.streak || 0, lastClaimDay: last,
      };
    }

    const streak = last === yesterday ? (d.streak || 0) + 1 : 1;
    const reward = rewardFor(streak);
    const bank = (d.bank || 0) + (reward.coins || 0);
    const bills = (d.bills || 0) + (reward.bills || 0);

    tx.set(ref, {
      bank, bills, streak, lastClaimDay: today, updatedAt: new Date(now),
    }, { merge: true });

    return {
      ok: true, streak, day: dayOfCycle(streak), reward, bank, bills,
      lastClaimDay: today,
    };
  });

  if (!out.ok) {
    console.warn('daily refused:', out.reason, JSON.stringify({ uid }));
  } else {
    console.log('daily claimed:', JSON.stringify({
      uid, streak: out.streak, day: out.day, reward: out.reward,
    }));
  }
  return res.status(200).json(out);
}
