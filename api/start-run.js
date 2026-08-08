// POST /api/start-run
//
// Called when a run begins. Hands back a signed token carrying the server's
// clock reading, which /api/submit-run later reads to learn how long the run
// really took. Costs no database writes.
//
// Body: none. Auth: Authorization: Bearer <firebase id token>.
// Returns: { runToken }

import { uidFromRequest } from './_lib/admin.js';
import { issueRunToken } from './_lib/run-token.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const uid = await uidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'sign in first' });

  if (!process.env.RUN_SECRET) {
    return res.status(500).json({ error: 'server misconfigured: RUN_SECRET is not set' });
  }

  return res.status(200).json({ runToken: issueRunToken(uid, Date.now()) });
}
