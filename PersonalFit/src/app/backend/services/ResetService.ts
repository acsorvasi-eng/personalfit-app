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
import { clearAllSettings } from './SettingsService';

// ═══════════════════════════════════════════════════════════════
// SELECTIVE CLEAR
// ═══════════════════════════════════════════════════════════════

export async function clearAllStores(): Promise<void> {
  const db = await getDB();
  const storeNames: StoreName[] = [
    'foods', 'nutrition_plans', 'meal_days', 'meals', 'meal_items',
    'shopping_list', 'activity_logs', 'training_plans', 'training_plan_days',
    'measurements', 'versions', 'user_profile', 'daily_history',
    'water_log', 'weight_history', 'settings',
  ];

  for (const storeName of storeNames) {
    try {
      await db.clear(storeName);
    } catch {
      // store may not exist in older DB versions
    }
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
  // Safety net: force reload after 4 s regardless of what the async chain does.
  setTimeout(() => window.location.reload(), 4000);

  try {
    // Step 1: Clear all stores IN-PLACE on the currently-open connection.
    // This is the primary data wipe — reliable even when deleteDatabase is blocked.
    await clearAllStores();
    // Step 2: Destroy the DB structure (belt + suspenders).
    // If this blocks (another tab/context holds a connection) we still
    // cleared the data in Step 1, so the wipe is effective either way.
    destroyDatabase().catch(() => {}); // non-blocking, best-effort

    // Step 3: Notify all tabs
    try {
      const channel = new BroadcastChannel('nutriplan-db-sync');
      channel.postMessage({ store: '*', action: 'clear' });
      channel.close();
    } catch { /* BroadcastChannel not supported in all envs */ }

    // Step 4: Dispatch storage event for same-tab reactivity
    window.dispatchEvent(new Event('storage'));

    // Step 5: Hard reload — produces a completely clean runtime state
    window.location.reload();

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ismeretlen hiba';
    console.error('[Reset] Failed:', message);
    window.location.reload();
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