/**
 * POST /api/create-checkout-session
 *
 * Creates a Stripe Checkout Session for the monthly Pro subscription.
 * Returns { url } — the client redirects to it.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY      — Stripe secret key (sk_live_... or sk_test_...)
 *   STRIPE_PRICE_ID        — Stripe Price ID for the Pro subscription (price_...)
 *   APP_URL                — Base URL for success/cancel redirects (https://yourapp.com)
 */

import { handleCors } from './_shared/cors';
import { verifyAuth, sendAuthError } from './_shared/auth';
import Stripe from 'stripe';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check — use verified UID from the token
  let authUser;
  try {
    authUser = await verifyAuth(req);
  } catch (err: any) {
    return sendAuthError(res, err);
  }

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on this server.' });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return res.status(503).json({ error: 'STRIPE_PRICE_ID env var is missing.' });
  }

  // Use verified UID and email from token, not from request body
  const userId = authUser.uid;
  const userEmail = authUser.email;

  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail ?? undefined,
      client_reference_id: userId, // used in webhook to identify the user
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
      metadata: { userId },
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('[create-checkout-session] Stripe error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session. Please try again.' });
  }
}
