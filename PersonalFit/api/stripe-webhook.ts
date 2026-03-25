/**
 * POST /api/stripe-webhook
 *
 * Receives Stripe events and updates the user's plan in Firestore.
 * Must be registered in the Stripe Dashboard → Webhooks.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY       — Stripe secret key
 *   STRIPE_WEBHOOK_SECRET   — Webhook signing secret (whsec_...)
 *   FIREBASE_ADMIN_KEY      — Base64-encoded Firebase service account JSON
 *
 * Handled events:
 *   checkout.session.completed   → upgrade user to 'pro'
 *   customer.subscription.deleted
 *   customer.subscription.updated (status: canceled/unpaid) → downgrade to 'free'
 */

import { handleCors } from './_cors';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

// ─── Firebase Admin ───────────────────────────────────────────────
function getAdminApp(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!;
  const keyB64 = process.env.FIREBASE_ADMIN_KEY;
  if (!keyB64) return null;
  try {
    const credential = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(credential) });
  } catch (e) {
    console.warn('[stripe-webhook] Firebase Admin init failed:', e);
    return null;
  }
}

async function setUserPlan(userId: string, plan: 'free' | 'pro'): Promise<void> {
  const app = getAdminApp();
  if (!app) { console.warn('[stripe-webhook] No Firebase Admin — cannot update plan'); return; }
  await admin.firestore(app).collection('users').doc(userId).update({
    plan,
    updatedAt: new Date().toISOString(),
  });
  console.log(`[stripe-webhook] User ${userId} plan → ${plan}`);
}

// ─── Handler ──────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    console.warn('[stripe-webhook] Missing Stripe env vars');
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  const stripe = new Stripe(stripeKey);

  // Verify webhook signature
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;
  try {
    // req.body must be the raw Buffer — set in Vercel via config below
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
  }

  // ── Handle events ─────────────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId ?? session.client_reference_id;
        if (userId && session.payment_status === 'paid') {
          await setUserPlan(userId, 'pro');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) await setUserPlan(userId, 'free');
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId && ['canceled', 'unpaid', 'past_due'].includes(sub.status)) {
          await setUserPlan(userId, 'free');
        }
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }
  } catch (err: any) {
    console.error('[stripe-webhook] Handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json({ received: true });
}

// Vercel: disable body parsing so we get the raw Buffer for signature verification
export const config = {
  api: { bodyParser: false },
};
