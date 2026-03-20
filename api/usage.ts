// api/usage.ts
// Lightweight GET endpoint — returns current generation usage without incrementing.
// Used by GenerateMealPlanSheet to show the counter before the user generates.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { FREE_MONTHLY_LIMIT, ADMIN_EMAILS, currentMonthStr, nextMonthFirstDay } from './_shared/limits';

function getAdminApp(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!;
  const keyB64 = process.env.FIREBASE_ADMIN_KEY;
  if (!keyB64) return null;
  try {
    const credential = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(credential) });
  } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.query.userId as string | undefined;
  const resetsAt = nextMonthFirstDay();
  const openResponse = { remaining: FREE_MONTHLY_LIMIT, limit: FREE_MONTHLY_LIMIT, isAdmin: false, resetsAt };

  if (!userId) return res.status(200).json(openResponse);

  const app = getAdminApp();
  if (!app) return res.status(200).json(openResponse);

  try {
    const snap = await admin.firestore(app).collection('users').doc(userId).get();
    if (!snap.exists) return res.status(200).json(openResponse);

    const data = snap.data()!;
    const email: string = data.email ?? '';

    if (ADMIN_EMAILS.includes(email)) {
      return res.status(200).json({ remaining: null, limit: null, isAdmin: true, resetsAt });
    }

    if (data.plan === 'pro') {
      return res.status(200).json({ remaining: null, limit: null, isAdmin: false, resetsAt });
    }

    const thisMonth = currentMonthStr();
    const count: number = data.usage?.lastResetMonth !== thisMonth ? 0 : (data.usage?.generationsThisMonth ?? 0);
    const remaining = Math.max(0, FREE_MONTHLY_LIMIT - count);

    return res.status(200).json({ remaining, limit: FREE_MONTHLY_LIMIT, isAdmin: false, resetsAt });
  } catch (e) {
    console.warn('[usage] Failed, failing open:', e);
    return res.status(200).json(openResponse);
  }
}
