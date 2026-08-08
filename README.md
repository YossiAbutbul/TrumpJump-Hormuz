# TRUMP JUMP: Strait of Hormuz

**The internet's most TREMENDOUS arcade climber. Jump higher. Dodge missiles. Win bigly.**

![Trump Jump - Strait of Hormuz](assets/brand/og.jpg)

[![Play Now](https://img.shields.io/badge/▶_PLAY_NOW-C9312B?style=for-the-badge)](https://trump-jump-hormuz.vercel.app/)


---

## 🎮 What is it?

**Trump Jump** is a fast, addictive, endlessly-replayable vertical arcade game you can play right in your browser - on your phone, tablet, or desktop. Bounce your way up through the Strait of Hormuz on oil tankers and speedboats, grab power-ups, dodge drones and missiles, and climb the global leaderboard.

It's the kind of "just one more run" game that people pick up for 30 seconds and put down 20 minutes later.

- ⚡ **Instant play** - loads in seconds, works on any device, nothing to install
- 🕹️ **Dead-simple controls** - tap left/right, arrow keys, or A/D. Anyone can play in 5 seconds
- ♾️ **Endless & escalating** - the higher you climb, the faster and wilder it gets
- 😂 **Meme-ready humor** - over-the-top one-liners and voice lines players love to share

---

## 🔥 Features

### Climb, dodge, survive
- **Power-ups galore** - the 🧢 **Jet Cap** for rocket flight, 🌀 **Springs** for mega-bounces, 🛡️ **Golden Dome** shield, 🧲 **Money Magnet**, and coins to collect
- **Hazards with attitude** - stomp **drones** for coins, dodge incoming **missiles**
- **Living platforms** - oil tankers, moving speedboats, breakable barrels, and buoys
- **Smart difficulty** - a gentle start that ramps into a heart-pounding sprint at high altitude

### A shop worth grinding for
Earn coins every run and spend them on real progression:
- 👤 **Character skins** - THE DONALD, plus a full wardrobe: **Disco King, Cowboy, Santa, Mummy, Sumo**… and secret **friend-code** unlocks
- 🚢 **Fleets** - Classic, Gold, Stealth, Navy, Crimson
- 🌅 **Map themes** - Sunset Gulf, Midnight Raid, Desert Haze, Dawn Patrol, Arctic Front
- ⬆️ **Power-up upgrades** - level up your Jet, Shield, and Magnet (8 levels each)

### Compete & keep your progress
- 🏆 **Global leaderboard** - one-tap Google sign-in and battle the world for the top spot
- ☁️ **Cloud saves** - your coins, skins, and best score follow you across every device
- 🔑 **Secret codes** - hand out friend codes to unlock exclusive bonus characters

---

## 🎯 How to play

1. Open the game - it starts instantly.
2. Move **left / right** (touch, arrow keys, or A/D) to steer your bounces.
3. Land on platforms to keep climbing. Grab power-ups. Dodge missiles.
4. Beat your best altitude and climb the leaderboard.

That's it. Easy to learn, hard to master.

---

## 💼 A commercial-ready product

Trump Jump isn't a prototype - it's a **finished, polished, monetization-ready web game** with everything a live product needs already built in.

**Why it's a strong opportunity:**
- 🌍 **Zero-friction reach** - a pure web game means no app-store approvals, no installs, and instant sharing via a single link. Perfect for viral, ad, and social distribution.
- 📈 **Built-in retention** - an economy, unlockable content, upgrades, cloud accounts, and a global leaderboard are already live, keeping players coming back.
- 💰 **Monetization-ready** - the coin economy and shop are structured to slot in rewarded ads, in-app purchases, premium skins, or sponsor placements.
- 🎨 **Fully re-skinnable** - characters, fleets, and map themes are data-driven, so new seasonal content, branded skins, or a complete white-label rebrand can ship in hours, not weeks.
- 📱 **Every screen, one codebase** - mobile and desktop from the same lightweight build.
- 🔥 **Topical & shareable** - a bold, meme-friendly theme built for the moment and the feed.

Ideal for **acquisition, licensing, white-labeling, ad-network integration, or brand campaigns.**

---

## 📬 Business & licensing

Interested in acquiring, licensing, white-labeling, or partnering on Trump Jump?

**Contact:** abyossi22@gmail.com

---

## 🛡️ Leaderboard integrity (setup required)

Scores are verified on the server, so the leaderboard can't be edited from the browser console. The pieces:

| Where | What it does |
|---|---|
| `src/systems/runguard.js` | Tracks the run's altitude in a private closure, clamps anything faster than the game's physics, records a keyframe trace |
| `api/start-run.js` | Stamps the server clock into a signed token when a run begins |
| `api/submit-run.js` | Replays the trace, checks it against the real elapsed time, writes `best` with the Admin SDK |
| `firestore.rules` | Denies every client write to `best`, so the handler above is the only way in |

### One-time setup

**1. Service account.** Firebase console → Project settings → Service accounts → *Generate new private key*. That downloads a JSON file — keep it off the repo and out of chat.

**2. Vercel environment variables.** Project Settings → Environment Variables, for Production *and* Preview:

| Variable | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | `project_id` from the JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from the JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` from the JSON, the whole `-----BEGIN PRIVATE KEY-----...` string |
| `RUN_SECRET` | any long random string you invent — see below |

Generate a `RUN_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**3. Deploy the Firestore rules.** Paste `firestore.rules` into Firebase console → Firestore → Rules. Check the Rules playground first.

**4. Optional cleanup.** Firestore console → TTL → add a policy on collection `runsUsed`, field `expireAt`, so used-run markers delete themselves after a day.

### Note on secrets

No key or secret is stored in this repo — `api/_lib/admin.js` only reads `process.env`, so the file is safe to be public. Everything under `api/` is a serverless function, not a static asset, and the `_lib` underscore keeps it from being routed at all. After deploying you can confirm it isn't reachable:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://trump-jump-hormuz.vercel.app/api/_lib/admin.js
```

That should print `404`. If it ever prints `200`, the only thing exposed is the variable *names* — but tell me and I'll add an explicit block.

---

## 👥 Contributors

- [**@MayaKatan**](https://github.com/MayaKatan) (Maya Katan) — design & coding 🎨💻

## 🙏 Acknowledgments

Big thanks to [**@Eladharel1**](https://github.com/Eladharel1) (Elad Harel) for helping QA the game and hunt down bugs. 🐛

---

## ⚖️ Disclaimer

Trump Jump is a work of **satire and parody** created for entertainment. It is not affiliated with, endorsed by, or sponsored by any political figure, campaign, or organization. All characters are caricatures.

---

<sub>© Trump Jump. All rights reserved.</sub>
