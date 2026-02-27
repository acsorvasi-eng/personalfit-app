/**
 * Payment Service
 * Handles Stripe subscription simulation.
 * In production, replace with real Stripe API integration.
 */

import { SUBSCRIPTION_PRICE_USD, SUBSCRIPTION_PRICE_HUF } from '../utils/currencyConverter';

export interface SubscriptionData {
  id: string;
  userId: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  plan: 'monthly';
  priceUsd: number;
  priceHuf: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

const SUBSCRIPTION_STORAGE_KEY = 'subscriptionData';

/**
 * Process Stripe payment and create subscription
 * In production, this would call Stripe's API
 */
export async function createSubscription(userId: string): Promise<SubscriptionData> {
  // Simulate Stripe payment processing (2-3 seconds)
  await new Promise(resolve => setTimeout(resolve, 2500));

  // Simulate a 3% chance of payment failure
  if (Math.random() < 0.03) {
    throw new Error('A fizetés sikertelen. Kérjük, ellenőrizd a kártyaadatokat és próbáld újra.');
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription: SubscriptionData = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    status: 'active',
    plan: 'monthly',
    priceUsd: SUBSCRIPTION_PRICE_USD,
    priceHuf: SUBSCRIPTION_PRICE_HUF,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    createdAt: now.toISOString(),
    stripeCustomerId: `cus_${Math.random().toString(36).substr(2, 14)}`,
    stripeSubscriptionId: `sub_${Math.random().toString(36).substr(2, 14)}`,
  };

  localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(subscription));
  return subscription;
}

/**
 * Get current subscription data
 */
export function getSubscription(): SubscriptionData | null {
  try {
    const data = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (!data) return null;

    const subscription: SubscriptionData = JSON.parse(data);

    // Check if subscription has expired
    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);

    if (now > periodEnd && subscription.status === 'active') {
      subscription.status = 'expired';
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(subscription));
    }

    return subscription;
  } catch {
    return null;
  }
}

/**
 * Check if user has an active subscription
 */
export function isSubscriptionActive(): boolean {
  const sub = getSubscription();
  return sub?.status === 'active';
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const sub = getSubscription();
  if (sub) {
    sub.status = 'cancelled';
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(sub));
  }
}

/**
 * Renew/resubscribe after cancellation or expiry
 */
export async function renewSubscription(userId: string): Promise<SubscriptionData> {
  return createSubscription(userId);
}
