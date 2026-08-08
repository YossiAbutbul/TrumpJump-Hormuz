// Firebase Admin, initialised once per serverless instance.
//
// The Admin SDK bypasses Firestore rules entirely, which is the whole point:
// firestore.rules denies every client write to `best`, so this is the only
// code path in the world that can put a score on the leaderboard.
//
// Required Vercel environment variables (Project Settings > Environment
// Variables). Get all three from a service-account key:
//   Firebase console > Project settings > Service accounts > Generate new
//   private key. That downloads a JSON file; copy the fields out of it.
//
//   FIREBASE_PROJECT_ID    e.g. trump-jump-strait-of-hormuz
//   FIREBASE_CLIENT_EMAIL  firebase-adminsdk-xxxxx@<project>.iam.gserviceaccount.com
//   FIREBASE_PRIVATE_KEY   the whole "-----BEGIN PRIVATE KEY-----\n..." string
//   RUN_SECRET             any long random string you invent (see run-token.js)
//
// Treat the private key and RUN_SECRET like passwords: they belong in Vercel's
// env vars only, never in this repo.

import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Built on first use, not at import time. Initialising at import means a
// missing or malformed key throws while the module is still loading, which
// kills the whole function process — the caller sees a dropped connection
// instead of an error it can read. Lazily, the throw lands inside the handler
// where it becomes a plain 500 with a message.
let app = null;
function getApp_() {
  if (app) return app;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel stores the key with literal \n sequences; turn them back into real
  // newlines or the PEM parser rejects it.
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  const missing = [
    !projectId && 'FIREBASE_PROJECT_ID',
    !clientEmail && 'FIREBASE_CLIENT_EMAIL',
    !privateKey && 'FIREBASE_PRIVATE_KEY',
  ].filter(Boolean);
  if (missing.length) throw new Error(`missing env vars: ${missing.join(', ')}`);

  app = getApps().length ? getApp() : initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

export const getDb = () => getFirestore(getApp_());

// Resolve the caller from the `Authorization: Bearer <firebase id token>`
// header. Returns the uid, or null for anything we can't verify — an expired,
// forged or missing token is simply not a user.
// Throws if the service account isn't configured — that's a server fault, not
// a bad caller, and the handlers turn it into a 500 the logs can explain.
export async function uidFromRequest(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const auth = getAuth(getApp_());
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid || null;
  } catch {
    return null;
  }
}
