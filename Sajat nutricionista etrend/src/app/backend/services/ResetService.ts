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

// ═══════════════════════════════════════════════════════════════
// RESET TOKENS
// ═══════════════════════════════════════════════════════════════

const LOCAL_STORAGE_KEYS_TO_CLEAR = [
  'userProfile', 'authUser', 'authToken',
  'totalConsumedCalories', 'dailyHistory', 'lastActiveDate',
  'menuCheckedMeals', 'selectedMeals',
  'foodFavorites',
  'shoppingList', 'shoppingChecked',
  // NOTE: workoutTracking, workoutSchedule, workoutFavorites, exerciseFavorites, connectedWorkoutApps
  // are intentionally NOT cleared — sport data is managed locally/manually
  'waterTracking',
  'weightHistory',
  'bodyVisionData',
  'appFirstUsageDate',
  'onboardingCompleted', 'hasSeenSplash',
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
    localStorage.removeItem(key);
  }

  // Clear dynamically named keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('loggedMeals_') ||
      key.startsWith('water_') ||
      key.startsWith('meal_') ||
      key.startsWith('day-')
      // NOTE: 'workout_' prefix intentionally excluded — sport data preserved
    )) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
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
  options: ResetOptions = { clearTheme: false, reseed: true }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Reset] Starting full data wipe...');

    // Step 1: Destroy IndexedDB
    await destroyDatabase();
    console.log('[Reset] IndexedDB destroyed.');

    // Step 2: Clear localStorage
    clearLocalStorage();
    if (options.clearTheme) {
      localStorage.removeItem('themeMode');
    }
    console.log('[Reset] localStorage cleared.');

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