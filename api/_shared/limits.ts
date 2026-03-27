/**
 * Server-side rate limiting using Firestore.
 * Stores usage counts in `usage/{uid}` documents.
 */
import { getFirestore } from './auth';

const FREE_DAILY_LIMIT = 5;

interface UsageDoc {
  generationsToday: number;
  lastResetDate: string; // YYYY-MM-DD
  totalGenerations: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check and increment usage for a user.
 * Returns the remaining count after increment.
 * Throws { status: 429 } if the user has exceeded their limit.
 */
export async function checkAndIncrementUsage(
  uid: string,
  isAdmin: boolean,
  plan: 'free' | 'pro' = 'free',
): Promise<{ remaining: number; limit: number }> {
  // Admin and pro users have unlimited access
  if (isAdmin || plan === 'pro') {
    return { remaining: 999, limit: 999 };
  }

  const db = getFirestore();
  const docRef = db.collection('usage').doc(uid);
  const today = todayStr();

  const snap = await docRef.get();
  const data = snap.data() as UsageDoc | undefined;

  let generationsToday = 0;

  if (data) {
    if (data.lastResetDate === today) {
      generationsToday = data.generationsToday || 0;
    }
    // If different day, reset counter
  }

  if (generationsToday >= FREE_DAILY_LIMIT) {
    const resetDate = new Date();
    resetDate.setUTCDate(resetDate.getUTCDate() + 1);
    resetDate.setUTCHours(0, 0, 0, 0);
    throw {
      status: 429,
      message: 'Daily generation limit reached. Upgrade to Pro for unlimited access.',
      resetsAt: resetDate.toISOString(),
    };
  }

  // Increment
  await docRef.set({
    generationsToday: generationsToday + 1,
    lastResetDate: today,
    totalGenerations: (data?.totalGenerations || 0) + 1,
  });

  return {
    remaining: FREE_DAILY_LIMIT - generationsToday - 1,
    limit: FREE_DAILY_LIMIT,
  };
}

/**
 * Get current usage without incrementing (for the usage badge).
 */
export async function getUsage(
  uid: string,
  isAdmin: boolean,
  plan: 'free' | 'pro' = 'free',
): Promise<{ remaining: number | null; limit: number | null; isAdmin: boolean; resetsAt: string }> {
  if (isAdmin || plan === 'pro') {
    return { remaining: null, limit: null, isAdmin, resetsAt: '' };
  }

  const db = getFirestore();
  const docRef = db.collection('usage').doc(uid);
  const today = todayStr();

  const snap = await docRef.get();
  const data = snap.data() as UsageDoc | undefined;

  let generationsToday = 0;
  if (data && data.lastResetDate === today) {
    generationsToday = data.generationsToday || 0;
  }

  const resetDate = new Date();
  resetDate.setUTCDate(resetDate.getUTCDate() + 1);
  resetDate.setUTCHours(0, 0, 0, 0);

  return {
    remaining: Math.max(0, FREE_DAILY_LIMIT - generationsToday),
    limit: FREE_DAILY_LIMIT,
    isAdmin,
    resetsAt: resetDate.toISOString(),
  };
}
