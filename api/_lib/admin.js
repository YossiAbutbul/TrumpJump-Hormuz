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

const app = getApps().length ? getApp() : initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Vercel stores the key with literal \n sequences; turn them back into
    // real newlines or the PEM parser rejects it.
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});

export const auth = getAuth(app);
export const db = getFirestore(app);

// Resolve the caller from the `Authorization: Bearer <firebase id token>`
// header. Returns the uid, or null for anything we can't verify — an expired,
// forged or missing token is simply not a user.
export async function uidFromRequest(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid || null;
  } catch {
    return null;
  }
}
