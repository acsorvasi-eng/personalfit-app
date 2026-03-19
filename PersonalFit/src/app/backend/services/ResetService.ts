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
  // Safety net: force reload after 3 s regardless of what the async chain does.
  // This prevents the UI from getting permanently stuck if any IndexedDB op hangs.
  setTimeout(() => window.location.reload(), 3000);

  try {
    console.log('[Reset] Starting full data wipe...');

    // Step 1: Destroy IndexedDB (best-effort)
    await destroyDatabase();
    console.log('[Reset] IndexedDB destroy requested.');

    // NOTE: clearAllStores() is intentionally skipped here.
    // After destroyDatabase() the DB is gone; re-opening it just to clear stores
    // can block indefinitely on some browsers (IDB open hangs after delete).
    // The destroy + reload is sufficient to produce a clean state.

    // Step 2: Clear settings store (uses a fresh DB open — best-effort)
    try {
      await clearAllSettings();
    } catch {
      // ignore — a fresh DB open after delete may fail; reload cleans up anyway
    }
    if (options.clearTheme) {
      try {
        const { setSetting } = await import('./SettingsService');
        await setSetting('themeMode', 'light');
      } catch { /* ignore */ }
    }
    console.log('[Reset] Settings cleared.');

    // Step 2b: Set a flag so the UI/plan loader knows we're in a "no active plan" state.
    try {
      const { setSetting } = await import('./SettingsService');
      await setSetting('forceNoActivePlan', '1');
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

    // Step 6: Hard reload to ensure absolutely clean runtime state
    try {
      window.location.reload();
    } catch {
      // ignore if not in browser context
    }

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