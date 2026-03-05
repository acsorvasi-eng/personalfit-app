# PersonalFit — Service Migration Kit
# WeightHistoryService + CalorieStatsService + FuturisticDashboard átállás

Cursor prompt: @ARCHITECTURE.md @SERVICE_MIGRATION.md

---

## 1. WeightHistoryService

```typescript
// src/app/backend/services/WeightHistoryService.ts

import { getDB, generateId, nowISO } from '../db';

export interface WeightEntry {
  id: string;
  date: string;        // ISO string: "2026-03-04"
  weight: number;      // kg
  weekNumber?: number; // opcionális heti sorszám
  note?: string;
}

export class WeightHistoryService {
  private static readonly STORE = 'weight_history';

  // ------- OLVASÁS -------

  static async getAll(): Promise<WeightEntry[]> {
    const db = await getDB();
    const entries = await db.getAll(this.STORE);
    return entries.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  static async getLatest(): Promise<WeightEntry | null> {
    const all = await this.getAll();
    return all.length > 0 ? all[all.length - 1] : null;
  }

  static async getByDateRange(from: string, to: string): Promise<WeightEntry[]> {
    const all = await this.getAll();
    return all.filter(e => e.date >= from && e.date <= to);
  }

  // ------- ÍRÁS -------

  static async addEntry(weight: number, date?: string, note?: string): Promise<WeightEntry> {
    const db = await getDB();
    const entry: WeightEntry = {
      id: generateId(),
      date: date ?? nowISO().split('T')[0],
      weight,
      note,
    };
    await db.put(this.STORE, entry);
    return entry;
  }

  static async updateEntry(id: string, updates: Partial<WeightEntry>): Promise<void> {
    const db = await getDB();
    const existing = await db.get(this.STORE, id);
    if (!existing) throw new Error(`WeightEntry not found: ${id}`);
    await db.put(this.STORE, { ...existing, ...updates });
  }

  static async deleteEntry(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(this.STORE, id);
  }

  // ------- MIGRÁCIÓ localStorage → IndexedDB -------

  static async migrateFromLocalStorage(): Promise<void> {
    const raw = localStorage.getItem('weightHistory');
    if (!raw) return;

    try {
      const history = JSON.parse(raw);
      const db = await getDB();
      const existing = await db.getAll(this.STORE);
      
      // Csak akkor migráljuk ha IndexedDB még üres
      if (existing.length > 0) {
        localStorage.removeItem('weightHistory');
        return;
      }

      // Array vagy object formátum kezelése
      const entries = Array.isArray(history) ? history : Object.values(history);
      
      for (const entry of entries) {
        await db.put(this.STORE, {
          id: entry.id ?? generateId(),
          date: entry.date ?? nowISO().split('T')[0],
          weight: entry.weight ?? entry.kg ?? 0,
          weekNumber: entry.weekNumber ?? entry.week,
          note: entry.note,
        });
      }

      // Sikeres migráció után localStorage törlése
      localStorage.removeItem('weightHistory');
      console.log(`[WeightHistoryService] Migrated ${entries.length} entries from localStorage`);
    } catch (e) {
      console.error('[WeightHistoryService] Migration failed:', e);
    }
  }

  // ------- RESET -------

  static async clearAll(): Promise<void> {
    const db = await getDB();
    await db.clear(this.STORE);
    localStorage.removeItem('weightHistory'); // cleanup legacy
  }
}
```

---

## 2. CalorieStatsService

```typescript
// src/app/backend/services/CalorieStatsService.ts

import { getDB, generateId, nowISO } from '../db';

export interface DailyCalorieStat {
  id: string;
  date: string;         // "2026-03-04"
  consumed: number;     // kcal elfogyasztva
  target: number;       // kcal cél aznap
  burned?: number;      // kcal edzéssel égetett (opcionális)
}

export class CalorieStatsService {
  private static readonly STORE = 'calorie_stats';

  // ------- OLVASÁS -------

  static async getToday(): Promise<DailyCalorieStat | null> {
    const today = nowISO().split('T')[0];
    return this.getByDate(today);
  }

  static async getByDate(date: string): Promise<DailyCalorieStat | null> {
    const db = await getDB();
    const all = await db.getAll(this.STORE);
    return all.find(s => s.date === date) ?? null;
  }

  static async getAll(): Promise<DailyCalorieStat[]> {
    const db = await getDB();
    const entries = await db.getAll(this.STORE);
    return entries.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  static async getTotalConsumed(): Promise<number> {
    const today = await this.getToday();
    return today?.consumed ?? 0;
  }

  // ------- ÍRÁS -------

  static async logMeal(kcal: number, date?: string): Promise<void> {
    const targetDate = date ?? nowISO().split('T')[0];
    const db = await getDB();
    const all = await db.getAll(this.STORE);
    const existing = all.find(s => s.date === targetDate);

    if (existing) {
      await db.put(this.STORE, {
        ...existing,
        consumed: existing.consumed + kcal,
      });
    } else {
      await db.put(this.STORE, {
        id: generateId(),
        date: targetDate,
        consumed: kcal,
        target: 0, // CalorieEngineService tölti fel
      });
    }
  }

  static async setTarget(kcal: number, date?: string): Promise<void> {
    const targetDate = date ?? nowISO().split('T')[0];
    const db = await getDB();
    const all = await db.getAll(this.STORE);
    const existing = all.find(s => s.date === targetDate);

    if (existing) {
      await db.put(this.STORE, { ...existing, target: kcal });
    } else {
      await db.put(this.STORE, {
        id: generateId(),
        date: targetDate,
        consumed: 0,
        target: kcal,
      });
    }
  }

  static async resetToday(): Promise<void> {
    const today = nowISO().split('T')[0];
    const db = await getDB();
    const all = await db.getAll(this.STORE);
    const existing = all.find(s => s.date === today);
    if (existing) {
      await db.put(this.STORE, { ...existing, consumed: 0 });
    }
    localStorage.removeItem('totalConsumedCalories'); // cleanup legacy
  }

  // ------- MIGRÁCIÓ localStorage → IndexedDB -------

  static async migrateFromLocalStorage(): Promise<void> {
    const raw = localStorage.getItem('totalConsumedCalories');
    if (!raw) return;

    try {
      const consumed = parseFloat(raw);
      if (isNaN(consumed) || consumed === 0) {
        localStorage.removeItem('totalConsumedCalories');
        return;
      }

      const today = nowISO().split('T')[0];
      const existing = await this.getToday();

      // Csak ha ma még nincs adat
      if (!existing) {
        const db = await getDB();
        await db.put(this.STORE, {
          id: generateId(),
          date: today,
          consumed,
          target: 0,
        });
        console.log(`[CalorieStatsService] Migrated ${consumed} kcal from localStorage`);
      }

      localStorage.removeItem('totalConsumedCalories');
    } catch (e) {
      console.error('[CalorieStatsService] Migration failed:', e);
    }
  }

  // ------- RESET -------

  static async clearAll(): Promise<void> {
    const db = await getDB();
    await db.clear(this.STORE);
    localStorage.removeItem('totalConsumedCalories');
  }
}
```

---

## 3. DB Schema — új store-ok hozzáadása

```typescript
// src/app/backend/db.ts — kiegészítés
// Az openDB() hívásban add hozzá az új store-okat:

const db = await openDB('personalfit-db', VERSION + 1, {
  upgrade(db, oldVersion) {
    // ... meglévő store-ok ...

    // ÚJ: weight_history
    if (!db.objectStoreNames.contains('weight_history')) {
      db.createObjectStore('weight_history', { keyPath: 'id' });
    }

    // ÚJ: calorie_stats
    if (!db.objectStoreNames.contains('calorie_stats')) {
      db.createObjectStore('calorie_stats', { keyPath: 'id' });
    }
  }
});
```

---

## 4. App indulásakor — migráció trigger

```typescript
// src/main.tsx vagy App.tsx — legfelső szinten, egyszer fut le

import { WeightHistoryService } from './app/backend/services/WeightHistoryService';
import { CalorieStatsService } from './app/backend/services/CalorieStatsService';
import { UserProfileService } from './app/backend/services/UserProfileService';

async function runMigrations() {
  await UserProfileService.migrateFromLocalStorage();    // már megvan
  await WeightHistoryService.migrateFromLocalStorage();  // ÚJ
  await CalorieStatsService.migrateFromLocalStorage();   // ÚJ
}

// App render előtt:
runMigrations().catch(console.error);
```

---

## 5. FuturisticDashboard + hookok átállítása

### useCalorieTracker átírás

```typescript
// ELŐTTE — localStorage
const [consumed, setConsumed] = useState(() => {
  return parseFloat(localStorage.getItem('totalConsumedCalories') ?? '0');
});

const logMeal = (kcal: number) => {
  const next = consumed + kcal;
  setConsumed(next);
  localStorage.setItem('totalConsumedCalories', String(next));
};

// UTÁNA — CalorieStatsService
const [consumed, setConsumed] = useState(0);

useEffect(() => {
  CalorieStatsService.getTotalConsumed().then(setConsumed);
}, []);

const logMeal = async (kcal: number) => {
  await CalorieStatsService.logMeal(kcal);
  const updated = await CalorieStatsService.getTotalConsumed();
  setConsumed(updated);
};
```

### FuturisticDashboard profil olvasás

```typescript
// ELŐTTE — localStorage
const profile = JSON.parse(localStorage.getItem('userProfile') ?? '{}');

// UTÁNA — UserProfileService
const [profile, setProfile] = useState(null);

useEffect(() => {
  UserProfileService.getProfile().then(setProfile);
}, []);
```

### WeightHistory grafikon

```typescript
// ELŐTTE — localStorage
const history = JSON.parse(localStorage.getItem('weightHistory') ?? '[]');

// UTÁNA — WeightHistoryService
const [history, setHistory] = useState([]);

useEffect(() => {
  WeightHistoryService.getAll().then(setHistory);
}, []);
```

---

## 6. Reset flow átírás

```typescript
// ResetService.ts vagy ahol a reset gomb kezelve van

// ELŐTTE
localStorage.removeItem('weightHistory');
localStorage.removeItem('totalConsumedCalories');
localStorage.removeItem('userProfile');

// UTÁNA
await WeightHistoryService.clearAll();
await CalorieStatsService.clearAll();
await UserProfileService.clearProfile();
// + meglévő IndexedDB store-ok törlése (nutrition_plans, stb.)
```

---

## 7. Cursor promptok ehhez a sprinthez

```
# Sprint 1 — WeightHistoryService
"@ARCHITECTURE.md @SERVICE_MIGRATION.md 
Hozd létre a WeightHistoryService-t a megadott interface alapján.
Ellenőrizd hogy a db.ts-ben megvan-e a weight_history store, 
ha nincs add hozzá az upgrade blokkba."

# Sprint 2 — CalorieStatsService  
"@ARCHITECTURE.md @SERVICE_MIGRATION.md
Hozd létre a CalorieStatsService-t. Keresd meg az összes helyet
ahol totalConsumedCalories localStorage kulcsot használnak és
írd át CalorieStatsService.logMeal() / getTotalConsumed() hívásokra."

# Sprint 3 — FuturisticDashboard
"@ARCHITECTURE.md @SERVICE_MIGRATION.md
A FuturisticDashboard.tsx-ben cseréld le az összes localStorage
olvasást: profil → UserProfileService, súly → WeightHistoryService,
kalória → CalorieStatsService. Ne változtasd meg a UI-t."

# Ellenőrzés bármikor
"@ARCHITECTURE.md Ellenőrizd ezt a fájlt: van-e benne
localStorage.getItem / setItem hívás? Ha igen, mutasd meg
melyik sorban és mit kellene helyette használni."
```

---

## Ellenőrzőlista — Sprint vége

- [ ] `weight_history` store létezik a db.ts-ben
- [ ] `calorie_stats` store létezik a db.ts-ben  
- [ ] `WeightHistoryService.ts` létrehozva és exportálva
- [ ] `CalorieStatsService.ts` létrehozva és exportálva
- [ ] `runMigrations()` fut app indulásakor
- [ ] `FuturisticDashboard` nem olvas localStorage-ból profilt
- [ ] `useCalorieTracker` CalorieStatsService-t használ
- [ ] Grafikon komponens WeightHistoryService-t használ
- [ ] Reset flow mind három service `clearAll()`-ját hívja
- [ ] `localStorage.getItem('weightHistory')` → 0 találat a kódbázisban
- [ ] `localStorage.getItem('totalConsumedCalories')` → 0 találat
- [ ] `localStorage.getItem('userProfile')` → 0 találat (csak UserProfileService)

---

*PersonalFit Service Migration Kit v1.0 — Capacitor-ready sprint*
