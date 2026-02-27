/**
 * ====================================================================
 * Storage Database — Unified IndexedDB access for domain entities
 * ====================================================================
 * Thin adapter layer that bridges the new domain models with
 * the existing app/backend/db.ts IndexedDB infrastructure.
 *
 * This module re-exports the core DB utilities and adds domain-specific
 * store names for the new entity types (progress, workouts, AI history).
 *
 * For web: uses IndexedDB (via the existing NutriPlanDB wrapper).
 * For mobile (future): can swap to SQLite via Capacitor.
 */

import { DB_NAME, DB_CURRENT_VERSION, STORAGE_KEYS } from '../core/constants';
import { logger } from '../core/config';

// ═══════════════════════════════════════════════════════════════
// Extended Store Names (domain layer)
// ═══════════════════════════════════════════════════════════════

/**
 * Store names for the domain entity layer.
 * These extend the existing app/backend/db.ts stores.
 */
export const DOMAIN_STORES = {
  USER_PROFILE: 'user_profile',
  NUTRITION_LOGS: 'nutrition_logs',
  WORKOUT_LOGS: 'workout_logs',
  PROGRESS_ENTRIES: 'progress_entries',
  AI_HISTORY: 'ai_history',
  RECOMMENDATIONS: 'recommendations',
  GOALS: 'goals',
  PREFERENCES: 'preferences',
} as const;

export type DomainStoreName = typeof DOMAIN_STORES[keyof typeof DOMAIN_STORES];

// ═══════════════════════════════════════════════════════════════
// Generic CRUD Operations (IndexedDB)
// ═══════════════════════════════════════════════════════════════

/**
 * Open the domain IndexedDB database.
 * This is separate from the existing NutriPlanDB to avoid version conflicts.
 */
const DOMAIN_DB_NAME = 'SixthHaltDomainDB';
const DOMAIN_DB_VERSION = 1;

let domainDB: IDBDatabase | null = null;

interface DomainStoreSchema {
  keyPath: string;
  indexes: Array<{ name: string; keyPath: string | string[]; unique?: boolean }>;
}

const DOMAIN_STORE_SCHEMAS: Record<string, DomainStoreSchema> = {
  [DOMAIN_STORES.USER_PROFILE]: {
    keyPath: 'id',
    indexes: [],
  },
  [DOMAIN_STORES.NUTRITION_LOGS]: {
    keyPath: 'id',
    indexes: [
      { name: 'by-date', keyPath: 'date' },
      { name: 'by-meal-type', keyPath: 'mealType' },
    ],
  },
  [DOMAIN_STORES.WORKOUT_LOGS]: {
    keyPath: 'id',
    indexes: [
      { name: 'by-date', keyPath: 'date' },
      { name: 'by-category', keyPath: 'category' },
    ],
  },
  [DOMAIN_STORES.PROGRESS_ENTRIES]: {
    keyPath: 'id',
    indexes: [
      { name: 'by-date', keyPath: 'date' },
      { name: 'by-source', keyPath: 'source' },
    ],
  },
  [DOMAIN_STORES.AI_HISTORY]: {
    keyPath: 'id',
    indexes: [
      { name: 'by-category', keyPath: 'category' },
      { name: 'by-timestamp', keyPath: 'timestamp' },
    ],
  },
  [DOMAIN_STORES.RECOMMENDATIONS]: {
    keyPath: 'id',
    indexes: [
      { name: 'by-type', keyPath: 'type' },
      { name: 'by-priority', keyPath: 'priority' },
    ],
  },
  [DOMAIN_STORES.GOALS]: {
    keyPath: 'id',
    indexes: [
      { name: 'by-active', keyPath: 'isActive' },
    ],
  },
  [DOMAIN_STORES.PREFERENCES]: {
    keyPath: 'id',
    indexes: [],
  },
};

function openDomainDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DOMAIN_DB_NAME, DOMAIN_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      for (const [storeName, schema] of Object.entries(DOMAIN_STORE_SCHEMAS)) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
          for (const idx of schema.indexes) {
            store.createIndex(idx.name, idx.keyPath as string, { unique: idx.unique ?? false });
          }
        }
      }
    };

    request.onsuccess = () => {
      logger.info('[DomainDB] Opened successfully');
      resolve(request.result);
    };
    request.onerror = () => {
      logger.error('[DomainDB] Open failed:', request.error);
      reject(request.error);
    };
    request.onblocked = () => {
      logger.warn('[DomainDB] Upgrade blocked. Close other tabs.');
    };
  });
}

export async function getDomainDB(): Promise<IDBDatabase> {
  if (domainDB) return domainDB;
  domainDB = await openDomainDB();
  domainDB.onclose = () => { domainDB = null; };
  domainDB.onversionchange = () => {
    domainDB?.close();
    domainDB = null;
  };
  return domainDB;
}

// ═══════════════════════════════════════════════════════════════
// Generic CRUD Helpers
// ═══════════════════════════════════════════════════════════════

export async function dbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await getDomainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await getDomainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetByIndex<T>(
  storeName: string,
  indexName: string,
  key: IDBValidKey
): Promise<T[]> {
  const db = await getDomainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).index(indexName).getAll(key);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut<T>(storeName: string, value: T): Promise<IDBValidKey> {
  const db = await getDomainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await getDomainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbClear(storeName: string): Promise<void> {
  const db = await getDomainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbCount(storeName: string): Promise<number> {
  const db = await getDomainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ═══════════════════════════════════════════════════════════════
// Database Destruction
// ═══════════════════════════════════════════════════════════════

export async function destroyDomainDB(): Promise<void> {
  if (domainDB) {
    domainDB.close();
    domainDB = null;
  }
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DOMAIN_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      logger.warn('[DomainDB] Delete blocked');
      resolve();
    };
  });
}
