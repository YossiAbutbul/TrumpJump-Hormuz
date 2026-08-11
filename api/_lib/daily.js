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

// The day a moment belongs to, as 'YYYY-MM-DD' in Israel time — the bonus
// resets at 00:00 in Jerusalem, not at UTC midnight.
//
// Still one fixed instant worldwide, which is what keeps this checkable: the
// zone is baked in here on the server, so a player changing their device's
// timezone moves nothing. en-CA is the locale that formats as YYYY-MM-DD, and
// the zone handles IST/IDT (UTC+2/+3) on its own.
//
// src/systems/daily.js has the same formatter so the modal agrees with the
// server about which day it is.
const IL_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
});
export const dayKey = (ms) => IL_DAY.format(new Date(ms));

export const prevDayKey = (ms) => dayKey(ms - 86400000);
