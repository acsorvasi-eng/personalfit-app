/**
 * GET /api/usage
 *
 * Returns the current user's remaining generation quota.
 * Uses the verified Firebase token to identify the user (no userId in URL).
 */

import { handleCors } from './_shared/cors';
import { verifyAuth, sendAuthError } from './_shared/auth';
import { getUsage } from './_shared/limits';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let authUser;
  try {
    authUser = await verifyAuth(req);
  } catch (err: any) {
    return sendAuthError(res, err);
  }

  try {
    const usage = await getUsage(authUser.uid, authUser.isAdmin);
    return res.status(200).json(usage);
  } catch (err: any) {
    console.error('[usage] Error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to fetch usage data' });
  }
}
