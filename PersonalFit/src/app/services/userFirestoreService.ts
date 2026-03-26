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
const ADMIN_EMAILS = ['acsorvasi@gmail.com', 'acsorvasi@yahoo.com'];

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
export async function canGenerate(uid: string, email?: string): Promise<UsageStatus> {
  // Admin bypass — unlimited generations
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
    return { allowed: true, remaining: 999, plan: 'pro', totalToday: 0 };
  }
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      return { allowed: true, remaining: FREE_DAILY_LIMIT, plan: 'free', totalToday: 0 };
    }

    const data = snap.data() as UserFirestoreProfile;
    // Check admin by email from Firestore
    if (data.email && ADMIN_EMAILS.includes(data.email.toLowerCase())) {
      return { allowed: true, remaining: 999, plan: 'pro', totalToday: 0 };
    }
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

// ─── Cross-device sync: Profile ─────────────────────────────────

/**
 * Save the full local profile to Firestore under users/{uid}.profile
 * Fire-and-forget — never blocks the UI.
 */
export async function syncProfileToCloud(uid: string, profile: any): Promise<void> {
  try {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, {
      profile,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('[userFirestore] syncProfileToCloud failed:', err);
  }
}

/**
 * Load profile from Firestore (returns null if not found or on error).
 */
export async function loadProfileFromCloud(uid: string): Promise<any | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data()?.profile ?? null;
  } catch (err) {
    console.warn('[userFirestore] loadProfileFromCloud failed:', err);
    return null;
  }
}

// ─── Cross-device sync: Settings ────────────────────────────────

/**
 * Save key settings to Firestore under users/{uid}.settings
 */
export async function syncSettingsToCloud(uid: string, settings: Record<string, string>): Promise<void> {
  try {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, {
      settings,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('[userFirestore] syncSettingsToCloud failed:', err);
  }
}

/**
 * Load settings from Firestore (returns null if not found or on error).
 */
export async function loadSettingsFromCloud(uid: string): Promise<Record<string, string> | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data()?.settings ?? null;
  } catch (err) {
    console.warn('[userFirestore] loadSettingsFromCloud failed:', err);
    return null;
  }
}

// ─── Cross-device sync: Plan summary ────────────────────────────

export interface PlanSummary {
  planName: string;
  createdAt: string;
  isActive: boolean;
  calorieTarget: number | null;
  mealCount: number | null;
}

/**
 * Save nutrition plan summary (metadata only, not full meals) to Firestore.
 */
export async function syncPlanSummaryToCloud(uid: string, summary: PlanSummary): Promise<void> {
  try {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, {
      planSummary: summary,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('[userFirestore] syncPlanSummaryToCloud failed:', err);
  }
}

/**
 * Load plan summary from Firestore.
 */
export async function loadPlanSummaryFromCloud(uid: string): Promise<PlanSummary | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data()?.planSummary ?? null;
  } catch (err) {
    console.warn('[userFirestore] loadPlanSummaryFromCloud failed:', err);
    return null;
  }
}

// ─── Cross-device sync: Full Nutrition Plan ─────────────────────

/**
 * Save the active nutrition plan (full data) to Firestore.
 * Stored as a single document under users/{uid}/nutrition_plans/active.
 *
 * The planData should be the output of NutritionPlanService.exportActivePlan(),
 * which uses the same AIParsedNutritionPlan format that importFromAIParse accepts.
 *
 * Fire-and-forget — never blocks the UI.
 */
export async function syncPlanToCloud(uid: string, planData: any): Promise<void> {
  try {
    const ref = doc(db, 'users', uid, 'nutrition_plans', 'active');
    await setDoc(ref, {
      ...planData,
      syncedAt: new Date().toISOString(),
    });
    console.log('[userFirestore] Plan synced to cloud');
  } catch (err) {
    console.warn('[userFirestore] syncPlanToCloud failed:', err);
  }
}

/**
 * Load the full nutrition plan from Firestore.
 * Returns the plan data in a format compatible with importFromAIParse,
 * or null if no plan exists or on error.
 */
export async function loadPlanFromCloud(uid: string): Promise<any | null> {
  try {
    const ref = doc(db, 'users', uid, 'nutrition_plans', 'active');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    // Strip Firestore metadata field
    const { syncedAt, ...planData } = data;
    return planData;
  } catch (err) {
    console.warn('[userFirestore] loadPlanFromCloud failed:', err);
    return null;
  }
}
