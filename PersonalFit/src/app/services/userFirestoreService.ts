/**
 * userFirestoreService — Firestore user profile + usage tracking
 *
 * Collection: users/{uid}
 * {
 *   uid, name, email,
 *   plan: 'free' | 'pro',
 *   usage: { generationsToday: number, lastResetDate: 'YYYY-MM-DD', totalGenerations: number },
 *   createdAt, updatedAt
 * }
 *
 * Free tier: 5 meal-plan generations per day.
 * Pro tier: unlimited.
 */

import { db } from '../../firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────

export interface UserFirestoreProfile {
  uid: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  usage: {
    generationsToday: number;
    lastResetDate: string; // YYYY-MM-DD
    totalGenerations: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ───────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 5;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ─── Create / update user doc on login ───────────────────────────

/**
 * Called once after successful Firebase auth (Google or email).
 * Creates doc if new user, updates name/email if returning.
 */
export async function createOrUpdateUser(
  uid: string,
  name: string,
  email: string,
): Promise<void> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        name,
        email,
        plan: 'free',
        usage: {
          generationsToday: 0,
          lastResetDate: todayStr(),
          totalGenerations: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(ref, {
        name,
        email,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    // Non-fatal: app works without Firestore (demo mode / offline)
    console.warn('[userFirestore] createOrUpdateUser failed:', err);
  }
}

// ─── Usage check ─────────────────────────────────────────────────

export interface UsageStatus {
  allowed: boolean;
  remaining: number;
  plan: 'free' | 'pro';
  totalToday: number;
}

/**
 * Check whether this user can generate a new meal plan.
 * Fails open (returns allowed=true) if Firestore is unreachable.
 */
export async function canGenerate(uid: string): Promise<UsageStatus> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      return { allowed: true, remaining: FREE_DAILY_LIMIT, plan: 'free', totalToday: 0 };
    }

    const data = snap.data() as UserFirestoreProfile;
    const isPro = data.plan === 'pro';
    if (isPro) return { allowed: true, remaining: 999, plan: 'pro', totalToday: data.usage.totalGenerations };

    // Reset counter if new day
    const count = data.usage.lastResetDate !== todayStr() ? 0 : data.usage.generationsToday;
    const remaining = Math.max(0, FREE_DAILY_LIMIT - count);

    return {
      allowed: count < FREE_DAILY_LIMIT,
      remaining,
      plan: 'free',
      totalToday: count,
    };
  } catch (err) {
    console.warn('[userFirestore] canGenerate check failed, failing open:', err);
    return { allowed: true, remaining: FREE_DAILY_LIMIT, plan: 'free', totalToday: 0 };
  }
}

// ─── Usage increment ─────────────────────────────────────────────

/**
 * Increment generation count. Resets daily counter if new day.
 * Call this after a successful meal-plan API response.
 */
export async function incrementUsage(uid: string): Promise<void> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    const today = todayStr();

    if (snap.exists() && snap.data().usage?.lastResetDate !== today) {
      // New day — reset daily counter
      await updateDoc(ref, {
        'usage.generationsToday': 1,
        'usage.lastResetDate': today,
        'usage.totalGenerations': increment(1),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(ref, {
        'usage.generationsToday': increment(1),
        'usage.totalGenerations': increment(1),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('[userFirestore] incrementUsage failed:', err);
  }
}

// ─── Plan management ─────────────────────────────────────────────

export async function upgradeToPro(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      plan: 'pro',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[userFirestore] upgradeToPro failed:', err);
  }
}
