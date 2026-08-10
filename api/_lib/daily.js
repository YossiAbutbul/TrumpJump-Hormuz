// The daily-bonus ladder and the day maths behind it.
//
// The server owns both. A device clock can be wound forward in two taps, so
// nothing here ever reads a time the client sent — api/daily-claim.js passes
// its own Date.now() in and firestore.rules denies the browser any write to
// `streak` / `lastClaimDay`.
//
// src/systems/daily.js carries a copy of REWARDS so the menu can draw the week
// ahead without a round-trip. Keep the two lists in sync; the payout the player
// actually gets is always the one computed here.

// One cycle of seven days. Past day 7 the ladder wraps to day 1 while the
// streak counter keeps climbing, so a long streak stays rewarding without
// inflating forever.
export const REWARDS = [
  { coins: 100 },
  { coins: 150 },
  { coins: 250 },
  { coins: 400 },
  { coins: 600, bills: 1 },
  { coins: 900 },
  { coins: 1500, bills: 3 },
];

// Which rung a streak of `n` days lands on (1-based, wraps every 7).
export const dayOfCycle = (n) => ((Math.max(1, n) - 1) % REWARDS.length) + 1;

export const rewardFor = (n) => REWARDS[dayOfCycle(n) - 1];

// The day a moment belongs to, as 'YYYY-MM-DD' in UTC. UTC (not the player's
// zone) is what makes this checkable: the reset is the same instant worldwide
// and cannot be moved by changing a device's timezone.
export const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);

export const prevDayKey = (ms) => dayKey(ms - 86400000);
