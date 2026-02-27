/**
 * ====================================================================
 * Security Service
 * ====================================================================
 * Provides security primitives for the local-first architecture.
 *
 * SECURITY MODEL:
 *   - User owns ALL data (no cloud dependency)
 *   - Data encrypted at rest via Web Crypto API
 *   - GDPR-ready: all data is local, exportable, and deletable
 *   - No PII transmitted to external services
 *   - Optional future cloud sync with E2E encryption
 *
 * ENCRYPTION:
 *   Uses AES-GCM 256-bit encryption with a key derived from
 *   a user-provided passphrase via PBKDF2.
 */

import { getDB } from '../db';

// ═══════════════════════════════════════════════════════════════
// KEY DERIVATION
// ═══════════════════════════════════════════════════════════════

const SALT_KEY = 'nutriplan_encryption_salt';
const KEY_ITERATIONS = 100000;
const KEY_LENGTH = 256;

async function getSalt(): Promise<Uint8Array> {
  const stored = localStorage.getItem(SALT_KEY);
  if (stored) {
    return new Uint8Array(JSON.parse(stored));
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_KEY, JSON.stringify(Array.from(salt)));
  return salt;
}

export async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = await getSalt();
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: KEY_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ═══════════════════════════════════════════════════════════════
// ENCRYPT / DECRYPT
// ═══════════════════════════════════════════════════════════════

export async function encrypt(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
  );

  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

// ═══════════════════════════════════════════════════════════════
// SESSION KEY CACHE
// ═══════════════════════════════════════════════════════════════

let sessionKey: CryptoKey | null = null;

export function cacheKey(key: CryptoKey): void {
  sessionKey = key;
}

export function getCachedKey(): CryptoKey | null {
  return sessionKey;
}

export function clearCachedKey(): void {
  sessionKey = null;
}

// ═══════════════════════════════════════════════════════════════
// DATA EXPORT (GDPR)
// ═══════════════════════════════════════════════════════════════

/**
 * Export all user data as a JSON blob.
 * GDPR Article 20: Right to data portability.
 */
export async function exportAllData(): Promise<string> {
  const db = await getDB();

  const exportData = {
    export_date: new Date().toISOString(),
    format_version: '1.0',
    data: {
      foods: await db.getAll('foods'),
      nutrition_plans: await db.getAll('nutrition_plans'),
      meal_days: await db.getAll('meal_days'),
      meals: await db.getAll('meals'),
      meal_items: await db.getAll('meal_items'),
      shopping_list: await db.getAll('shopping_list'),
      activity_logs: await db.getAll('activity_logs'),
      training_plans: await db.getAll('training_plans'),
      training_plan_days: await db.getAll('training_plan_days'),
      measurements: await db.getAll('measurements'),
      versions: await db.getAll('versions'),
      user_profile: await db.getAll('user_profile'),
      daily_history: await db.getAll('daily_history'),
    },
    local_storage: {
      userProfile: localStorage.getItem('userProfile'),
      weightHistory: localStorage.getItem('weightHistory'),
      dailyHistory: localStorage.getItem('dailyHistory'),
      themeMode: localStorage.getItem('themeMode'),
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download the exported data as a file.
 */
export async function downloadDataExport(): Promise<void> {
  const jsonStr = await exportAllData();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nutriplan-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════
// INTEGRITY CHECK
// ═══════════════════════════════════════════════════════════════

export async function verifyIntegrity(): Promise<{
  ok: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  const db = await getDB();

  // Check that all meal items reference existing foods
  const allItems = await db.getAll<any>('meal_items');
  const allFoodIds = new Set((await db.getAll<any>('foods')).map((f: any) => f.id));
  for (const item of allItems) {
    if (!allFoodIds.has(item.food_id)) {
      issues.push(`MealItem ${item.id} referencia hiányzó food: ${item.food_id}`);
    }
  }

  // Check that all meals reference existing meal_days
  const allMeals = await db.getAll<any>('meals');
  const allDayIds = new Set((await db.getAll<any>('meal_days')).map((d: any) => d.id));
  for (const meal of allMeals) {
    if (!allDayIds.has(meal.meal_day_id)) {
      issues.push(`Meal ${meal.id} referencia hiányzó meal_day: ${meal.meal_day_id}`);
    }
  }

  // Check for orphaned versions
  const allVersions = await db.getAll<any>('versions');
  const planIds = new Set((await db.getAll<any>('nutrition_plans')).map((p: any) => p.id));
  const trainingIds = new Set((await db.getAll<any>('training_plans')).map((p: any) => p.id));
  for (const version of allVersions) {
    if (version.entity_type === 'NutritionPlan' && !planIds.has(version.entity_id)) {
      issues.push(`Version ${version.id} árult NutritionPlan ref: ${version.entity_id}`);
    }
    if (version.entity_type === 'TrainingPlan' && !trainingIds.has(version.entity_id)) {
      issues.push(`Version ${version.id} árult TrainingPlan ref: ${version.entity_id}`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
