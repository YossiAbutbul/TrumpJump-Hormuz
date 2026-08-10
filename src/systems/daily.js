// Daily sign-in bonus — the browser half.
//
// Everything here is display only. The streak lives on the user's Firestore
// doc, is advanced by api/daily-claim.js against the server clock, and is
// denied to client writes by firestore.rules. So a wound-forward device clock
// can at most make this modal *look* claimable; pressing CLAIM then comes back
// refused and the UI settles on whatever the server says.
//
// Requires an account: the reward is written server-side to a signed-in user's
// doc, so guests are shown the ladder plus a sign-in button instead.

window.DAILY = {
  // Mirror of REWARDS in api/_lib/daily.js — kept here so the week ahead can be
  // drawn without a round-trip. Keep the two in sync; the server's copy is the
  // one that pays.
  REWARDS: [
    { coins: 100 },
    { coins: 150 },
    { coins: 250 },
    { coins: 400 },
    { coins: 600, bills: 1 },
    { coins: 900 },
    { coins: 1500, bills: 3 },
  ],

  // UTC day key, matching the server's reset boundary exactly
  dayKey(ms) { return new Date(ms).toISOString().slice(0, 10); },

  // What the modal should show right now, from the loaded profile:
  //   streak      days claimed in a row, as the server last told us
  //   nextStreak  what the streak becomes after today's claim
  //   pos         1..7 rung of the cycle today sits on
  //   claimedToday / claimable / signedIn
  state() {
    const fb = window.FB;
    const signedIn = !!(fb && fb.user);
    const p = (fb && fb.profile) || {};
    const now = Date.now();
    const today = this.dayKey(now);
    const yesterday = this.dayKey(now - 86400000);
    const streak = p.streak || 0;
    const last = p.lastClaimDay || null;
    const claimedToday = last === today;
    // a gap of two or more days breaks the run and starts a fresh day 1
    const nextStreak = claimedToday ? streak : (last === yesterday ? streak + 1 : 1);
    return {
      signedIn,
      profileLoaded: !!(fb && fb.profileLoaded),
      streak, nextStreak, claimedToday,
      pos: ((Math.max(1, nextStreak) - 1) % this.REWARDS.length) + 1,
      claimable: signedIn && !claimedToday,
    };
  },

  // ms until the next UTC midnight — when the bonus comes back
  msToReset() {
    const now = new Date();
    const next = Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0
    );
    return Math.max(0, next - now.getTime());
  },

  // "07:12:44" — a ticking clock, so a claimed day still has something alive
  // on it to look at
  resetLabel() {
    const s = Math.floor(this.msToReset() / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  },

  open() { renderDailyModal(); },
};

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

// "1.5K" — chips are 38px wide, four digits don't fit
const short = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n));

// The modal is built in JS (like the account modal) so index.html only has to
// carry the empty shell. Layout: title, streak line, six chips on a gold rail,
// the day-7 bar, a status line, then the same m-btn buttons the other modals
// use — this should read as another panel of the game, not a visitor.
function renderDailyModal() {
  const modal = document.getElementById('daily-modal');
  const box = document.getElementById('daily-box');
  if (!modal || !box) return;

  let tick = null; // countdown interval, alive only while the modal is open
  const close = () => {
    clearInterval(tick);
    modal.style.display = 'none';
    window.setGameInputEnabled(true);
  };

  // coins thrown out of the ticket when a claim lands
  const burst = () => {
    const b = el('div', 'd-burst');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 90 + Math.random() * 90;
      const c = el('i');
      c.style.setProperty('--tx', Math.cos(a) * dist + 'px');
      c.style.setProperty('--ty', (Math.sin(a) * dist - 40) + 'px');
      c.style.setProperty('--r', Math.round(Math.random() * 540 - 270) + 'deg');
      c.style.animationDelay = (i * 18) + 'ms';
      b.appendChild(c);
    }
    box.appendChild(b);
    setTimeout(() => b.remove(), 1500);
  };

  const draw = (msg) => {
    const st = window.DAILY.state();
    const rewards = window.DAILY.REWARDS;
    const jackpot = rewards[rewards.length - 1];
    // a day is banked if it sits behind today's rung, or is today and today is done
    const isDone = (day) => st.signedIn
      && (day < st.pos || (day === st.pos && st.claimedToday));

    clearInterval(tick);
    box.innerHTML = '';

    const x = el('button', 'm-close');
    x.innerHTML = '&times;';
    x.setAttribute('aria-label', 'Close');
    x.onclick = close;
    box.appendChild(x);

    box.appendChild(el('h3', null, 'DAILY BONUS'));

    box.appendChild(el('p', 'm-sub',
      !st.signedIn ? 'sign in to start your streak'
        : st.streak > 0 ? `🔥 ${st.streak} day streak — keep it alive`
        : 'come back every day for a bigger payout'));

    // ---- the six chips, strung on a rail that fills as the week is banked
    const track = el('div', 'd-track');
    const rail = el('div', 'd-rail');
    const fill = el('span');
    const banked = rewards.slice(0, 6).filter((_, i) => isDone(i + 1)).length;
    // the rail runs chip-centre to chip-centre, so one banked day is 0%
    fill.style.width = (banked > 1 ? ((banked - 1) / 5) * 100 : 0) + '%';
    rail.appendChild(fill);
    track.appendChild(rail);

    const chips = el('div', 'd-chips');
    rewards.slice(0, 6).forEach((r, i) => {
      const day = i + 1;
      const done = isDone(day);
      const chip = el('div', 'd-chip'
        + (done ? ' done' : '')
        + (day === st.pos && !st.claimedToday ? ' now' : '')
        + (msg && msg.ok && day === st.pos ? ' won' : ''));
      chip.appendChild(el('span', 'd-n', done ? '✓' : 'D' + day));
      chip.appendChild(el('span', 'd-v', short(r.coins)));
      if (r.bills) chip.appendChild(el('span', 'd-b', '+' + r.bills + '💵'));
      chips.appendChild(chip);
    });
    track.appendChild(chips);
    box.appendChild(track);

    // ---- day 7: the vault, given the whole width it's worth
    const jackDone = isDone(7);
    const jack = el('div', 'd-jack'
      + (jackDone ? ' done' : '')
      + (st.pos === 7 && !st.claimedToday ? ' now' : ''));
    jack.appendChild(el('span', 'd-j-label', jackDone ? 'day 7 · collected' : 'day 7 · jackpot'));
    jack.appendChild(el('span', 'd-j-val',
      `${short(jackpot.coins)} + ${jackpot.bills} 💵`));
    box.appendChild(jack);

    const note = el('p', 'm-sub');
    note.id = 'daily-msg';
    box.appendChild(note);

    // ---- guests get the ladder as a pitch, plus the way in
    if (!st.signedIn) {
      note.textContent = 'the streak is tied to your account, not this device';
      const b = el('button', 'm-btn google');
      b.innerHTML = '<span class="gi">G</span> SIGN IN &amp; START';
      b.onclick = () => { close(); if (window.FB && window.FB.signIn) window.FB.signIn(); };
      box.appendChild(b);
      const later = el('button', 'm-btn ghost', 'NOT NOW');
      later.onclick = close;
      box.appendChild(later);
      return;
    }

    const today = rewards[st.pos - 1];
    if (msg) {
      note.textContent = msg.text;
      note.className = 'm-sub ' + (msg.ok ? 'win' : 'bad');
    } else if (st.claimedToday) {
      // live clock: a claimed day still has something ticking on it
      const paint = () => { note.textContent = 'next bonus in ' + window.DAILY.resetLabel(); };
      paint();
      tick = setInterval(paint, 1000);
    } else {
      // today's payout is on the button already — this line is the hook for
      // coming back, so it shows what tomorrow is worth (day 7 wraps to day 1)
      const next = rewards[st.pos % rewards.length];
      note.textContent = `tomorrow: ${next.coins} coins`
        + (next.bills ? ` + ${next.bills} Trump Buck${next.bills > 1 ? 's' : ''}` : '');
    }

    const spent = st.claimedToday;
    const claim = el('button', 'm-btn danger',
      spent ? 'COME BACK TOMORROW'
        : `CLAIM ${today.coins}` + (today.bills ? ` + ${today.bills} 💵` : ''));
    claim.disabled = spent;
    if (spent) claim.style.opacity = '0.55';
    claim.onclick = () => {
      claim.disabled = true;
      claim.textContent = 'CLAIMING…';
      Promise.resolve(window.FB && window.FB.claimDaily ? window.FB.claimDaily() : null)
        .then((res) => {
          if (res && res.ok) {
            if (window.SFX && window.SFX.power) window.SFX.power();
            const bills = res.reward && res.reward.bills;
            draw({
              ok: true,
              text: `+${(res.reward && res.reward.coins) || 0} COINS`
                + (bills ? ` +${bills} TRUMP BUCK${bills > 1 ? 'S' : ''}` : '') + '!',
            });
            burst();
          } else {
            // most often "already claimed today" from another device — the
            // profile has been refreshed by then, so the redraw tells the truth
            draw({ ok: false, text: (res && res.reason) || 'could not claim, try again' });
          }
        });
    };
    box.appendChild(claim);

    const later = el('button', 'm-btn ghost', 'CLOSE');
    later.onclick = close;
    box.appendChild(later);
  };

  draw(null);
  modal.style.display = 'flex';
  window.setGameInputEnabled(false);
}
