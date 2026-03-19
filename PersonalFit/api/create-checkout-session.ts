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

import Stripe from 'stripe';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on this server.' });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return res.status(503).json({ error: 'STRIPE_PRICE_ID env var is missing.' });
  }

  const { userId, userEmail } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });

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
    return res.status(500).json({ error: err.message });
  }
}
