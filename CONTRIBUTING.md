# Contributing to Trump Jump

Welcome! This doc gets you from a fresh machine to a running game.

The game is plain JavaScript with [Phaser 3](https://phaser.io) loaded from a
CDN. **There is no build step** — no bundler, no transpiler, no framework. Edit
a file, refresh the browser, see the change.

---

## Pick your path

Most work needs nothing but a static file server.

| You're working on | Use | Needs Vercel access |
|---|---|---|
| Gameplay, art, UI, shop, menus, balance | **Path A** | No |
| The score-verification API (`/api/*`) | **Path B** | Yes |

---

## Path A — game only (start here)

```bash
git clone https://github.com/<owner>/TrumpGame.git
cd TrumpGame
```

Serve the folder. Any static server works — the VS Code **Live Server**
extension, or:

```bash
npx http-server -p 8123 -c-1 .
```

Open **`http://localhost:8123`**.

> Use `localhost`, not `127.0.0.1`. Firebase Auth authorises `localhost` by
> default; `127.0.0.1` may not be on the Authorized domains list and Google
> sign-in will fail with `auth/unauthorized-domain`.

Everything works except submitting a new high score: `/api` doesn't exist on a
static server, so `startRun` quietly fails and the run isn't sent to the
leaderboard. Sign-in, cloud saves, the shop and leaderboard *viewing* all work
normally against the real Firebase project.

You do **not** need `npm install`, a `.env` file, or a Vercel account for this.

---

## Path B — with the verification API

Only needed if you're changing `api/`. Requires Node 20+ and membership of the
Vercel project (ask the owner to add you — use your own Vercel account, never
someone else's login).

```bash
npm install
npx vercel login
npx vercel link                                    # existing project -> trump-jump-hormuz
npx vercel env pull .env --environment=production
npx vercel dev                                     # http://localhost:3000
```

Health check:

```bash
curl.exe -s -X POST http://localhost:3000/api/start-run -w '\nHTTP %{http_code}\n'
```

`401 {"error":"sign in first"}` means it's working — credentials loaded, and it
is correctly refusing an unauthenticated call. A `500` means the environment
didn't load; the response body names the missing variable.

> **`.env`, not `.env.local`.** `vercel dev` does not pick up `.env.local` in
> this repo's link mode. Note that `vercel env pull` writes `.env.local` unless
> you name the file, so pass `.env` explicitly every time.

`vercel dev` signs you into the **real** Firebase project, so a test run writes
a real score to the real leaderboard. Keep that in mind before grinding.

---

## Running the whole thing locally

Once you've done Path B, this is the copy-paste sequence for a full local stack
on any later day:

```bash
git pull
npm install                                        # only if package.json changed
npx vercel env pull .env --environment=production  # only if a secret changed
npx vercel dev
```

Open `http://localhost:3000`. What you get:

| Piece | Runs where | Notes |
|---|---|---|
| Game, scenes, art | your browser | edit a file, refresh |
| `/api/start-run`, `/api/submit-run`, `/api/daily-claim` | local Node, via `vercel dev` | real code, real credentials |
| Auth, Firestore, leaderboard | **live Firebase** | not a local emulator |
| `firestore.rules` | **live Firebase** | your local copy of the file is inert |

So two things are always production, even locally: the **database** and the
**rules**. A local run that beats your best writes a real leaderboard entry, and
editing `firestore.rules` on disk changes nothing until you paste it into the
Firebase console.

Verify the stack is healthy:

```bash
curl.exe -s -X POST http://localhost:3000/api/start-run -w '\nHTTP %{http_code}\n'
```

| Response | Meaning |
|---|---|
| `401 sign in first` | Healthy — credentials loaded, unauthenticated call refused |
| `500 RUN_SECRET is not set` | `.env` missing or named `.env.local`; re-pull and restart |
| `500 missing env vars: …` | That variable didn't load |
| `404` | Functions didn't build — run `npm install` |
| connection refused | `vercel dev` isn't running, or crashed on startup |

Then in the browser console after a run: no `POST /api/start-run` error means
the run was opened; sign in, beat your best, and check the leaderboard scene.

---

## Layout

```
index.html              loads everything, in order
src/config/             Firebase web config, item catalog
src/systems/            save, audio, voice, firebase, runguard, daily
src/gfx/                procedurally generated textures and hats
src/scenes/             menu, shop, game, leaderboard
api/                    Vercel serverless functions (score verification)
firestore.rules         server-side database rules
assets/                 art, optional sounds
```

Scripts are loaded as plain `<script>` tags in `index.html` and communicate
through globals (`window.SAVE`, `window.FB`, `window.RUNGUARD`, …). If you add a
file, add a tag — order matters.

---

## House rules

**Never commit secrets.** `.env*`, service-account JSON files and `.vercel/` are
gitignored. The Firebase *web* config in `src/config/firebase-config.js` is
public on purpose — access is enforced by `firestore.rules`, not by hiding keys.

**Firestore rules don't deploy on push.** If you change `firestore.rules`, paste
it into Firebase console → Firestore → Rules by hand. Test in the Rules
playground first; a mistake there locks every player out of saving.

**Scores are verified server-side.** `src/systems/runguard.js` records each run;
`api/submit-run.js` replays it against real elapsed server time before writing
`best`. The client cannot write `best` at all — the rules deny it. If you touch
run logic, keep `MAX_M_PER_S` in `runguard.js` and `api/_lib/trace.js` in step.

**The daily bonus is paid server-side too.** `api/daily-claim.js` advances
`streak` / `lastClaimDay` against the server clock and pays the coins in the
same transaction; the rules deny the client both fields, so a wound-forward
device clock earns nothing. The reset boundary is UTC midnight. If you retune
the payouts, change `REWARDS` in **both** `api/_lib/daily.js` (the one that
pays) and `src/systems/daily.js` (the one the modal draws).

**`firebase-admin` is pinned to an exact version** (`12.7.0`, no caret) on
purpose. From 13 onward it pulls `jwks-rsa@4` → `jose@6`, which is ESM-only,
and Vercel's function runtime can't `require()` it — every call dies with
`FUNCTION_INVOCATION_FAILED`. This does **not** reproduce on a dev machine:
Node 22.12+ allows `require(esm)`, so `vercel dev` works fine while production
is broken. If you ever bump it, test the deployed URL, or locally with:

```bash
node --no-experimental-require-module --input-type=module -e "import('firebase-admin/auth').then(()=>console.log('ok'))"
```

**Sounds are optional.** Missing `assets/sfx/*.mp3` falls back to the built-in
synth. To add one, drop the file in and list its name in `assets/sfx/index.json`
(voice clips go in `assets/voice/manifest.json`).

---

## Before you open a PR

- Play a full run: jump, spring, jet, shield, magnet, die.
- Check the browser console is clean.
- Test one narrow viewport (phone) and one wide one.
- If you touched saving or scoring, sign in and confirm your best still lands.
