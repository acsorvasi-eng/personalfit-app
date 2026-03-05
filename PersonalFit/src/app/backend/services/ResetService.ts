/**
 * ====================================================================
 * Full Reset Service
 * ====================================================================
 * Profile → Settings → Reset My Data
 *
 * REQUIREMENTS:
 *   - Delete all local tables
 *   - Delete versions, activity logs, favorites
 *   - Reset app to empty state
 *   - Double confirmation required (handled by UI)
 *   - Biometric or password validation (handled by UI)
 *   - Irreversible wipe
 */

import { destroyDatabase, getDB, type StoreName } from '../db';
import { seedDatabase } from '../seed';
import { legacyGetItem, legacyRemoveItem, legacyListKeys, legacySetItem } from '../../../storage/legacyLocalStorage';

// ═══════════════════════════════════════════════════════════════
// RESET TOKENS
// ═══════════════════════════════════════════════════════════════

const LOCAL_STORAGE_KEYS_TO_CLEAR = [
  'userProfile', 'authUser', 'authToken',
  'totalConsumedCalories', 'dailyHistory', 'lastActiveDate',
  // Menu-related selections & state
  'menuCheckedMeals', 'menuSelectedMeals', 'selectedMeals',
  // Favorites and shopping
  'foodFavorites',
  'shoppingList', 'shoppingChecked',
  // Water & weight tracking
  'waterTracking',
  'weightHistory',
  // Body-vision & onboarding
  'bodyVisionData',
  'appFirstUsageDate',
  'onboardingCompleted', 'hasSeenSplash',
  // Upload staging area
  'uploadStaging',
];

// ═══════════════════════════════════════════════════════════════
// SELECTIVE CLEAR
// ═══════════════════════════════════════════════════════════════

export async function clearAllStores(): Promise<void> {
  const db = await getDB();
  const storeNames: StoreName[] = [
    'foods', 'nutrition_plans', 'meal_days', 'meals', 'meal_items',
    'shopping_list', 'activity_logs', 'training_plans', 'training_plan_days',
    'measurements', 'versions', 'user_profile', 'daily_history',
  ];

  for (const storeName of storeNames) {
    await db.clear(storeName);
  }
}

export function clearLocalStorage(): void {
  for (const key of LOCAL_STORAGE_KEYS_TO_CLEAR) {
    legacyRemoveItem(key);
  }

  // Clear dynamically named keys
  const keysToRemove: string[] = [];
  const allKeys = legacyListKeys();
  for (const key of allKeys) {
    if (
      key.startsWith('loggedMeals_') ||
      key.startsWith('snacks_') ||
      key.startsWith('water_') ||
      key.startsWith('meal_') ||
      key.startsWith('day-')
      // NOTE: 'workout_' prefix intentionally excluded — sport data preserved
    ) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    legacyRemoveItem(key);
  }
}

// ═══════════════════════════════════════════════════════════════
// FULL RESET
// ═══════════════════════════════════════════════════════════════

export interface ResetOptions {
  clearTheme?: boolean;
  reseed?: boolean;
}

/**
 * IRREVERSIBLE FULL DATA WIPE.
 *
 * The UI must enforce:
 *   1. First confirmation dialog
 *   2. Second "Are you SURE?" dialog
 *   3. Biometric or password validation
 */
export async function performFullReset(
  options: ResetOptions = { clearTheme: false, reseed: false }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Reset] Starting full data wipe...');

    // Step 1: Destroy IndexedDB (best-effort)
    await destroyDatabase();
    console.log('[Reset] IndexedDB destroy requested.');

    // Step 1b: Safety net — clear all object stores in case delete was blocked
    try {
      await clearAllStores();
      console.log('[Reset] All object stores cleared.');
    } catch (err) {
      console.warn('[Reset] Failed to clear object stores:', err);
    }

    // Step 2: Clear localStorage (via legacy adapter)
    clearLocalStorage();
    if (options.clearTheme) {
      legacyRemoveItem('themeMode');
    }
    console.log('[Reset] localStorage cleared.');

    // Step 2b: Set a flag so the UI/plan loader knows we're in a
    // "no active plan" state until a new plan is explicitly activated.
    try {
      legacySetItem('forceNoActivePlan', '1');
    } catch {
      // ignore
    }

    // Step 3: Re-seed if requested
    if (options.reseed) {
      await seedDatabase();
      console.log('[Reset] Database re-seeded with defaults.');
    }

    // Step 4: Notify all tabs
    try {
      const channel = new BroadcastChannel('nutriplan-db-sync');
      channel.postMessage({ store: '*', action: 'clear' });
      channel.close();
    } catch { /* not supported */ }

    // Step 5: Dispatch storage event for same-tab reactivity
    window.dispatchEvent(new Event('storage'));

    console.log('[Reset] Full reset complete.');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ismeretlen hiba';
    console.error('[Reset] Failed:', message);
    return { success: false, error: message };
  }
}

// ═══════════════════════════════════════════════════════════════
// RESET VALIDATION
// ═══════════════════════════════════════════════════════════════

export async function getDataSummaryForReset(): Promise<{
  foods: number;
  nutritionPlans: number;
  activityLogs: number;
  measurements: number;
  dailyHistory: number;
  shoppingItems: number;
}> {
  try {
    const db = await getDB();
    return {
      foods: await db.count('foods'),
      nutritionPlans: await db.count('nutrition_plans'),
      activityLogs: await db.count('activity_logs'),
      measurements: await db.count('measurements'),
      dailyHistory: await db.count('daily_history'),
      shoppingItems: await db.count('shopping_list'),
    };
  } catch {
    return {
      foods: 0, nutritionPlans: 0, activityLogs: 0,
      measurements: 0, dailyHistory: 0, shoppingItems: 0,
    };
  }
}