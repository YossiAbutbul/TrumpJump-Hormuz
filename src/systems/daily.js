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

  // Day key in Israel time, matching the server's reset boundary exactly
  // (api/_lib/daily.js builds the same formatter). The day flips at 00:00 in
  // Jerusalem for every player, wherever they are — the zone is fixed here, so
  // it is not the device's.
  IL_DAY: new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
  }),
  IL_CLOCK: new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit',
    second: '2-digit', hourCycle: 'h23',
  }),
  dayKey(ms) { return this.IL_DAY.format(new Date(ms)); },

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

  // ms until the next midnight in Israel — when the bonus comes back.
  // Measured off the Jerusalem wall clock rather than the device's, so the
  // countdown means the same thing to a player abroad. On the two DST nights a
  // year the hour the clock jumps is not accounted for, which can leave this an
  // hour out for part of that day; the claim itself is the server's call
  // regardless, so the cost is a slightly wrong countdown, not a wrong payout.
  msToReset() {
    const now = Date.now();
    const parts = {};
    this.IL_CLOCK.formatToParts(new Date(now))
      .forEach((p) => { parts[p.type] = p.value; });
    const secs = (+parts.hour) * 3600 + (+parts.minute) * 60 + (+parts.second);
    return Math.max(0, (86400 - secs) * 1000 - (now % 1000));
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

// "1.5K" — a day tile is ~46px wide, four digits don't fit
const short = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n));

// The Trump Buck the player actually collects, rather than an emoji: the note
// is drawn procedurally into a Phaser canvas texture, so it can be lifted out
// as an image and reused here. Exporting is not cheap, hence the cache; if the
// texture is not built yet (modal opened before the first scene) it falls back
// to the emoji rather than showing nothing.
let billDataUrl;
function billIcon(cls) {
  if (billDataUrl === undefined) {
    billDataUrl = null;
    const t = window.game && window.game.textures;
    if (t && t.exists('bill')) {
      const src = t.get('bill').getSourceImage();
      if (src && src.toDataURL) {
        try { billDataUrl = src.toDataURL(); } catch (e) { billDataUrl = null; }
      }
    }
  }
  if (!billDataUrl) return document.createTextNode('💵');
  const im = document.createElement('img');
  im.className = cls;
  im.src = billDataUrl;
  im.alt = 'Trump Bucks';
  return im;
}

// The modal is built in JS (like the account modal) so index.html only has to
// carry the empty shell. Layout: title, streak line, six day tiles, the day-7
// plate, a status line, then the same m-btn buttons the other modals use —
// this should read as another panel of the game, not a visitor.
function renderDailyModal() {
  const modal = document.getElementById('daily-modal');
  const box = document.getElementById('daily-box');
  if (!modal || !box) return;

  let tick = null; // countdown interval, alive only while the modal is open
  // The claim is in flight and has been drawn as if it succeeded. The server is
  // still the one that decides — this only stops the panel from redrawing the
  // CLAIM button underneath the celebration while we wait for it.
  let pending = false;

  // A serverless claim handler that hasn't run recently is a cold start, which
  // is most of the wait the player feels. Poke it as the modal opens (GET is
  // refused with a 405 straight away, but the container is up by the time they
  // press CLAIM). Fire and forget; a build without /api just 404s.
  const warm = () => { try { fetch('/api/daily-claim').catch(() => {}); } catch (e) {} };

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
    // `pending` counts as claimed: an in-flight claim is drawn as won so the
    // celebration is not undone by a redraw while the request is out
    const claimed = st.claimedToday || pending;
    // a day is banked if it sits behind today's rung, or is today and today is done
    const isDone = (day) => st.signedIn
      && (day < st.pos || (day === st.pos && claimed));

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

    // ---- the six day tiles. No connecting rail: a banked day is already
    // struck in the reward colour, so the row shows progress on its own and
    // the rail only added a line of debris between the tiles.
    const track = el('div', 'd-track');
    const chips = el('div', 'd-chips');
    rewards.slice(0, 6).forEach((r, i) => {
      const day = i + 1;
      const done = isDone(day);
      const chip = el('div', 'd-chip'
        + (done ? ' done' : '')
        + (day === st.pos && !claimed ? ' now' : '')
        + (msg && msg.ok && day === st.pos ? ' won' : ''));
      chip.appendChild(el('span', 'd-n', done ? '✓' : 'DAY ' + day));
      chip.appendChild(el('span', 'd-v', short(r.coins)));
      if (r.bills) {
        const b = el('span', 'd-b', '+' + r.bills);
        b.appendChild(billIcon('d-bill'));
        chip.appendChild(b);
      }
      chips.appendChild(chip);
    });
    track.appendChild(chips);
    box.appendChild(track);

    // ---- day 7: the vault, given the whole width it's worth
    const jackDone = isDone(7);
    const jack = el('div', 'd-jack'
      + (jackDone ? ' done' : '')
      + (st.pos === 7 && !claimed ? ' now' : ''));
    jack.appendChild(el('span', 'd-j-label', jackDone ? 'day 7 · collected' : 'day 7 · jackpot'));
    const jval = el('span', 'd-j-val', `${short(jackpot.coins)} + ${jackpot.bills}`);
    jval.appendChild(billIcon('d-bill'));
    jack.appendChild(jval);
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
      const later = el('button', 'm-btn text', 'NOT NOW');
      later.onclick = close;
      box.appendChild(later);
      return;
    }

    const today = rewards[st.pos - 1];
    if (msg) {
      note.textContent = msg.text;
      note.className = 'm-sub ' + (msg.ok ? 'win' : 'bad');
    } else if (claimed) {
      // live clock: a claimed day still has something ticking on it
      const paint = () => {
        note.textContent = 'next bonus in ' + window.DAILY.resetLabel() + ' (00:00 Israel)';
      };
      paint();
      tick = setInterval(paint, 1000);
    } else {
      // Today's payout is on the button already — this line is the hook for
      // coming back, so it shows what tomorrow is worth (day 7 wraps to day 1).
      // Kept short: set in letterspaced mono caps, the long form ran the whole
      // width, and the tile for that day already shows any bonus Bucks.
      const next = rewards[st.pos % rewards.length];
      note.textContent = `tomorrow · ${next.coins} coins`;
    }

    const spent = claimed;
    const claim = el('button', 'm-btn danger',
      spent ? 'COME BACK TOMORROW'
        : `CLAIM ${today.coins}` + (today.bills ? ` + ${today.bills} 💵` : ''));
    claim.disabled = spent;
    if (spent) claim.style.opacity = '0.55';
    // The payout lands on the tap, not on the reply. Waiting for the round trip
    // (token, a possibly cold serverless function, a Firestore transaction) left
    // the button sitting on CLAIMING… for as long as a second or two, which read
    // as a broken button rather than a reward. The client already knows which
    // rung today is — REWARDS is mirrored here — so it shows that, and the
    // server's answer either confirms it silently or takes it back.
    claim.onclick = () => {
      claim.disabled = true;
      pending = true;
      const bills = today.bills;
      if (window.SFX && window.SFX.power) window.SFX.power();
      draw({
        ok: true,
        text: `+${today.coins} COINS`
          + (bills ? ` +${bills} TRUMP BUCK${bills > 1 ? 'S' : ''}` : '') + '!',
      });
      burst();
      Promise.resolve(window.FB && window.FB.claimDaily ? window.FB.claimDaily() : null)
        .then((res) => {
          pending = false;
          if (res && res.ok) {
            // Confirmed. Only redraw if the server paid something other than
            // what was shown (a streak the client had stale) — a redraw for its
            // own sake would only make the panel flicker under the celebration.
            const r = res.reward || {};
            if ((r.coins || 0) !== today.coins || (r.bills || 0) !== (today.bills || 0)) {
              draw({
                ok: true,
                text: `+${r.coins || 0} COINS`
                  + (r.bills ? ` +${r.bills} TRUMP BUCK${r.bills > 1 ? 'S' : ''}` : '') + '!',
              });
            }
          } else {
            // Refused — most often "already claimed today" from another device.
            // The profile has been refreshed by then, so the redraw tells the
            // truth and takes the celebration back with it.
            draw({ ok: false, text: (res && res.reason) || 'could not claim, try again' });
          }
        });
    };
    box.appendChild(claim);

    const later = el('button', 'm-btn text', 'CLOSE');
    later.onclick = close;
    box.appendChild(later);
  };

  draw(null);
  if (window.DAILY.state().claimable) warm();
  modal.style.display = 'flex';
  window.setGameInputEnabled(false);
}
