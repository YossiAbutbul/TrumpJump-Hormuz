# Developer setup

Everything needed to run Trump Jump on a new machine. Nothing here is required
to *play* the game — it's static files — only to run the score-verification API
and to deploy.

## Prerequisites

- **Node 20+** (`node -v`)
- **Git**
- Access to the Vercel project `trump-jump-hormuz` and the Firebase project
  `trump-jump-strait-of-hormuz`

## First run on a new PC

```bash
git clone https://github.com/<owner>/TrumpGame.git
cd TrumpGame
npm install
```

Link to Vercel and pull the server secrets into a local `.env`:

```bash
npx vercel login
npx vercel link          # "link to existing project" -> trump-jump-hormuz
npx vercel env pull .env --environment=production
```

Then start the dev server:

```bash
npx vercel dev           # http://localhost:3000, game + /api
```

Check it came up correctly:

```bash
curl.exe -s -X POST http://localhost:3000/api/start-run -w '\nHTTP %{http_code}\n'
```

`401 {"error":"sign in first"}` is the healthy answer — the credentials loaded
and it's refusing an unauthenticated call. A `500` means the env vars didn't
load; the body says which one.

### Working on the game only

If you're not touching `/api`, skip the Vercel steps entirely and serve the
files:

```bash
npx http-server -p 8123 -c-1 .
```

`/api` won't exist, so scores don't reach the leaderboard. Everything else
plays normally.

## Notes

- **`.env` — not `.env.local`.** `vercel dev` doesn't pick up `.env.local` in
  this repo's link mode. Both are gitignored; never commit either.
- The Firebase **web** config in `src/config/firebase-config.js` is public by
  design. Access is enforced by `firestore.rules`, not by hiding the keys.
- The service-account key and `RUN_SECRET` live only in Vercel's environment
  variables. If either ever lands in a file or a chat, rotate it: Firebase
  console → Service accounts → generate a new key.
- Firestore rules are **not** deployed by pushing. Paste `firestore.rules` into
  Firebase console → Firestore → Rules when it changes.
- `assets/sfx/*.mp3` and `assets/voice/*.mp3` are optional. Missing files fall
  back to the built-in synth. To add one, drop the file and list its name in
  `assets/sfx/index.json` (or `assets/voice/manifest.json`).

## How score verification fits together

| File | Role |
|---|---|
| `src/systems/runguard.js` | Tracks altitude in a private closure, clamps anything faster than the game's physics, records a keyframe trace |
| `api/start-run.js` | Signs the server clock into a token when a run starts |
| `api/submit-run.js` | Replays the trace against real elapsed time, writes `best` with the Admin SDK |
| `firestore.rules` | Denies the client any write to `best`, so the handler above is the only way in |

Required Vercel environment variables: `FIREBASE_PROJECT_ID`,
`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `RUN_SECRET`.
