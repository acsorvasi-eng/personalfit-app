/**
 * ====================================================================
 * Storage Migrations — Database versioning & schema updates
 * ====================================================================
 * Manages schema evolution for the domain IndexedDB database.
 * Each migration is a pure function that runs inside an
 * onupgradeneeded transaction.
 *
 * Pattern: version-based migrations that run sequentially.
 */

import { logger } from '../core/config';

// ═══════════════════════════════════════════════════════════════
// Migration Registry
// ═══════════════════════════════════════════════════════════════

export interface Migration {
  version: number;
  description: string;
  migrate: (db: IDBDatabase, tx: IDBTransaction) => void;
}

/**
 * All migrations in order. Each runs when upgrading to its version.
 * Never modify a migration after it's been released — add a new one.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initial domain schema — user_profile, nutrition_logs, workout_logs, progress_entries, ai_history, recommendations, goals, preferences',
    migrate: (db) => {
      // This is handled by database.ts initial creation.
      // Kept here for documentation purposes.
      logger.info('[Migrations] v1: Initial schema (handled by database.ts)');
    },
  },
  // ── Future migrations ──────────────────────────────────────
  // {
  //   version: 2,
  //   description: 'Add meal_plans store with week/day compound index',
  //   migrate: (db) => {
  //     if (!db.objectStoreNames.contains('meal_plans')) {
  //       const store = db.createObjectStore('meal_plans', { keyPath: 'id' });
  //       store.createIndex('by-active', 'isActive');
  //       store.createIndex('by-week-day', ['week', 'day']);
  //     }
  //   },
  // },
  // {
  //   version: 3,
  //   description: 'Add encrypted_at field index to all stores',
  //   migrate: (db, tx) => {
  //     const storeNames = ['nutrition_logs', 'workout_logs', 'progress_entries'];
  //     for (const name of storeNames) {
  //       if (db.objectStoreNames.contains(name)) {
  //         const store = tx.objectStore(name);
  //         if (!store.indexNames.contains('by-encrypted')) {
  //           store.createIndex('by-encrypted', 'encryptedPayload');
  //         }
  //       }
  //     }
  //   },
  // },
];

// ═══════════════════════════════════════════════════════════════
// Migration Runner
// ═══════════════════════════════════════════════════════════════

/**
 * Run all pending migrations for a database upgrade.
 * Called inside the onupgradeneeded event handler.
 */
export function runMigrations(
  db: IDBDatabase,
  tx: IDBTransaction,
  oldVersion: number,
  newVersion: number
): void {
  logger.info(`[Migrations] Upgrading from v${oldVersion} to v${newVersion}`);

  const pending = MIGRATIONS.filter(
    (m) => m.version > oldVersion && m.version <= newVersion
  );

  for (const migration of pending) {
    logger.info(`[Migrations] Running v${migration.version}: ${migration.description}`);
    try {
      migration.migrate(db, tx);
    } catch (err) {
      logger.error(`[Migrations] v${migration.version} failed:`, err);
      throw err; // Abort the upgrade
    }
  }

  logger.info(`[Migrations] Upgrade complete. Now at v${newVersion}`);
}

// ═══════════════════════════════════════════════════════════════
// Version Check
// ═══════════════════════════════════════════════════════════════

/**
 * Get the latest migration version number.
 */
export function getLatestVersion(): number {
  return MIGRATIONS.length > 0
    ? MIGRATIONS[MIGRATIONS.length - 1].version
    : 1;
}

/**
 * Check if a database needs migration.
 */
export function needsMigration(currentVersion: number): boolean {
  return currentVersion < getLatestVersion();
}

// ═══════════════════════════════════════════════════════════════
// Data Export / Import (for backup before migration)
// ═══════════════════════════════════════════════════════════════

/**
 * Export all data from a store as a JSON-serializable array.
 * Useful for backup before risky migrations.
 */
export async function exportStore<T>(
  db: IDBDatabase,
  storeName: string
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Import data into a store (overwrite mode).
 */
export async function importStore<T>(
  db: IDBDatabase,
  storeName: string,
  records: T[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    for (const record of records) {
      store.put(record);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
