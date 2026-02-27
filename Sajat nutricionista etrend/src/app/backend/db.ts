/**
 * ====================================================================
 * IndexedDB Database Layer — Native Wrapper (Zero Dependencies)
 * ====================================================================
 * Lightweight promise-based wrapper around the native IndexedDB API.
 * No external packages required.
 *
 * STORAGE ARCHITECTURE DECISION:
 *
 * IndexedDB was chosen over alternatives for these reasons:
 *
 * vs SQLite (via WASM):
 *   + No WASM binary required (~1MB+ savings)
 *   + Native browser API, no serialization overhead
 *   - No SQL, but structured queries via indexes compensate
 *
 * vs Realm:
 *   + No proprietary dependency
 *   + Works in all modern browsers natively
 *   - No built-in sync, but future cloud sync is planned separately
 *
 * vs localStorage (current):
 *   + Structured data with indexes (fast category/date queries)
 *   + No 5MB limit (IndexedDB: typically 50%+ of disk)
 *   + Transactional integrity
 *   + Supports binary data (future: images, PDFs)
 *   - Slightly more complex API (mitigated by this wrapper)
 *
 * HYBRID APPROACH:
 *   IndexedDB for all structured entity data.
 *   localStorage retained for lightweight config (theme, auth tokens, trial info).
 *   BroadcastChannel for cross-tab reactivity.
 */

// ═══════════════════════════════════════════════════════════════
// DATABASE CONFIG
// ═══════════════════════════════════════════════════════════════

export const DB_NAME = 'NutriPlanDB';
export const DB_VERSION = 1;

// ═══════════════════════════════════════════════════════════════
// STORE SCHEMAS — defines indexes for each object store
// ═══════════════════════════════════════════════════════════════

interface StoreSchema {
  keyPath: string;
  indexes: Array<{
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }>;
}

const STORE_SCHEMAS: Record<string, StoreSchema> = {
  foods: {
    keyPath: 'id',
    indexes: [
      { name: 'by-category', keyPath: 'category' },
      { name: 'by-source', keyPath: 'source' },
      { name: 'by-name', keyPath: 'name' },
      { name: 'by-favorite', keyPath: 'is_favorite' },
      { name: 'by-search', keyPath: 'search_index' },
    ],
  },
  nutrition_plans: {
    keyPath: 'id',
    indexes: [
      { name: 'by-active', keyPath: 'is_active' },
      { name: 'by-version', keyPath: 'version' },
    ],
  },
  meal_days: {
    keyPath: 'id',
    indexes: [
      { name: 'by-plan', keyPath: 'nutrition_plan_id' },
      { name: 'by-plan-week', keyPath: ['nutrition_plan_id', 'week'] },
      { name: 'by-plan-week-day', keyPath: ['nutrition_plan_id', 'week', 'day'] },
    ],
  },
  meals: {
    keyPath: 'id',
    indexes: [
      { name: 'by-meal-day', keyPath: 'meal_day_id' },
      { name: 'by-plan', keyPath: 'nutrition_plan_id' },
      { name: 'by-type', keyPath: 'meal_type' },
    ],
  },
  meal_items: {
    keyPath: 'id',
    indexes: [
      { name: 'by-meal', keyPath: 'meal_id' },
      { name: 'by-food', keyPath: 'food_id' },
    ],
  },
  shopping_list: {
    keyPath: 'id',
    indexes: [
      { name: 'by-plan', keyPath: 'nutrition_plan_id' },
      { name: 'by-week', keyPath: 'week' },
      { name: 'by-food', keyPath: 'food_id' },
      { name: 'by-checked', keyPath: 'is_checked' },
    ],
  },
  activity_logs: {
    keyPath: 'id',
    indexes: [
      { name: 'by-date', keyPath: 'date' },
      { name: 'by-type', keyPath: 'activity_type' },
      { name: 'by-date-type', keyPath: ['date', 'activity_type'] },
    ],
  },
  training_plans: {
    keyPath: 'id',
    indexes: [
      { name: 'by-active', keyPath: 'is_active' },
      { name: 'by-version', keyPath: 'version' },
    ],
  },
  training_plan_days: {
    keyPath: 'id',
    indexes: [
      { name: 'by-plan', keyPath: 'training_plan_id' },
      { name: 'by-plan-week', keyPath: ['training_plan_id', 'week'] },
      { name: 'by-plan-week-day', keyPath: ['training_plan_id', 'week', 'day'] },
    ],
  },
  measurements: {
    keyPath: 'id',
    indexes: [
      { name: 'by-date', keyPath: 'date' },
      { name: 'by-version', keyPath: 'version' },
    ],
  },
  versions: {
    keyPath: 'id',
    indexes: [
      { name: 'by-entity-type', keyPath: 'entity_type' },
      { name: 'by-entity-id', keyPath: 'entity_id' },
      { name: 'by-active', keyPath: 'is_active' },
      { name: 'by-type-active', keyPath: ['entity_type', 'is_active'] },
    ],
  },
  user_profile: {
    keyPath: 'id',
    indexes: [],
  },
  daily_history: {
    keyPath: 'date',
    indexes: [
      { name: 'by-date', keyPath: 'date' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
// TYPED DB WRAPPER
// ═══════════════════════════════════════════════════════════════

export type StoreName = keyof typeof STORE_SCHEMAS;

export class NutriPlanDB {
  private db: IDBDatabase;

  constructor(db: IDBDatabase) {
    this.db = db;
  }

  /** Get a single record by key */
  get<T = any>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  /** Get all records from a store */
  getAll<T = any>(storeName: StoreName): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  /** Get all records matching an index value */
  getAllFromIndex<T = any>(
    storeName: StoreName,
    indexName: string,
    key: IDBValidKey | IDBValidKey[]
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(Array.isArray(key) ? key : key);
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  /** Put (upsert) a record */
  put<T = any>(storeName: StoreName, value: T): Promise<IDBValidKey> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /** Delete a record by key */
  delete(storeName: StoreName, key: IDBValidKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /** Count records in a store */
  count(storeName: StoreName): Promise<number> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /** Clear all records from a store */
  clear(storeName: StoreName): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Execute a batch of operations in a single transaction.
   * Provides a TransactionHelper for chained operations.
   */
  async batch(
    storeNames: StoreName | StoreName[],
    mode: IDBTransactionMode,
    operations: (helper: TransactionHelper) => Promise<void>
  ): Promise<void> {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = this.db.transaction(names, mode);
    const helper = new TransactionHelper(tx);

    await operations(helper);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction aborted'));
    });
  }

  /** Close the database connection */
  close(): void {
    this.db.close();
  }
}

/** Helper for batch transaction operations */
export class TransactionHelper {
  private tx: IDBTransaction;

  constructor(tx: IDBTransaction) {
    this.tx = tx;
  }

  store(name: string): IDBObjectStore {
    return this.tx.objectStore(name);
  }

  get<T = any>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const request = this.tx.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  getAll<T = any>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = this.tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  getAllFromIndex<T = any>(
    storeName: string,
    indexName: string,
    key: IDBValidKey | IDBValidKey[]
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const index = this.tx.objectStore(storeName).index(indexName);
      const request = index.getAll(Array.isArray(key) ? key : key);
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  put(storeName: string, value: any): Promise<IDBValidKey> {
    return new Promise((resolve, reject) => {
      const request = this.tx.objectStore(storeName).put(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  delete(storeName: string, key: IDBValidKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.tx.objectStore(storeName).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  clear(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.tx.objectStore(storeName).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// DATABASE INSTANCE (SINGLETON)
// ═══════════════════════════════════════════════════════════════

let dbInstance: NutriPlanDB | null = null;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        // Create all object stores and indexes
        for (const [storeName, schema] of Object.entries(STORE_SCHEMAS)) {
          const store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
          for (const idx of schema.indexes) {
            store.createIndex(idx.name, idx.keyPath as any, idx.options);
          }
        }
      }
      // Future migrations: if (oldVersion < 2) { ... }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn('[NutriPlanDB] Database upgrade blocked. Close other tabs.');
    };
  });
}

export async function getDB(): Promise<NutriPlanDB> {
  if (dbInstance) return dbInstance;
  const rawDB = await openDatabase();

  // Handle unexpected close
  rawDB.onclose = () => { dbInstance = null; };
  rawDB.onversionchange = () => {
    rawDB.close();
    dbInstance = null;
  };

  dbInstance = new NutriPlanDB(rawDB);
  return dbInstance;
}

// ═══════════════════════════════════════════════════════════════
// CROSS-TAB REACTIVITY
// ═══════════════════════════════════════════════════════════════

export type DBChangeEvent = {
  store: string;
  action: 'put' | 'delete' | 'clear';
  key?: string;
};

let broadcastChannel: BroadcastChannel | null = null;

export function getDBChannel(): BroadcastChannel {
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel('nutriplan-db-sync');
  }
  return broadcastChannel;
}

export function notifyDBChange(event: DBChangeEvent) {
  try {
    getDBChannel().postMessage(event);
  } catch {
    // BroadcastChannel not supported or closed
  }
}

export function onDBChange(callback: (event: DBChangeEvent) => void): () => void {
  const channel = getDBChannel();
  const handler = (e: MessageEvent<DBChangeEvent>) => callback(e.data);
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}

// ═══════════════════════════════════════════════════════════════
// UTILITY: Generate IDs
// ═══════════════════════════════════════════════════════════════

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════
// DATABASE DESTRUCTION (for reset)
// ═══════════════════════════════════════════════════════════════

export async function destroyDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn('[NutriPlanDB] Delete blocked — close all tabs');
      resolve(); // Don't block the reset flow
    };
  });
}
