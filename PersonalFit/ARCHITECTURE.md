# PersonalFit — Architecture Guide
> **Cursor kontextus fájl.** Olvasd be minden session elején: `@ARCHITECTURE.md`

---

## Projekt vízió

Offline-first fitness app iOS + Android platformra. Magyar és román piac.  
- **€5/hó** előfizetés (Apple/Google IAP)  
- **Nincs szerver**, nincs adatgyűjtés, nincs GDPR rizikó  
- **Minden adat a user telefonján** — ez a fő marketing üzenet  
- **Bolt integráció** (Lidl HU/RO, Carrefour RO) affiliate linkeken keresztül

---

## Platform stratégia

### Fázis 1 — Capacitor (most, ~6-8 hét)
A meglévő React SPA-t Capacitor shell foglalja be → App Store + Play Store.  
A cél: minél hamarabb élő app, minél kevesebb kód változtatással.

### Fázis 2 — React Native (párhuzamosan épül)
Igazi natív élmény. A `packages/core` **változatlanul** használható RN-ben.  
Csak a UI komponensek különböznek — minden más megosztott.

---

## Mappastruktúra — jelenlegi (feature-based, src/app)

A UI feature-alapú struktúrában van; a backend és a megosztott elemek külön mappákban.

```
src/
├── app/
│   ├── features/
│   │   ├── nutrition/
│   │   │   ├── components/       ← Foods.tsx, stb.
│   │   │   └── hooks/           ← (üres, később: useFoodCatalog, useNutritionPlan)
│   │   │
│   │   ├── workout/
│   │   │   ├── components/      ← Workout.tsx, WorkoutCalendar.tsx
│   │   │   └── hooks/          ← (üres, később: useWorkout, useTimer)
│   │   │
│   │   ├── menu/
│   │   │   ├── components/     ← UnifiedMenu.tsx, MealDetail.tsx
│   │   │   └── hooks/         ← (üres, később: useMenu, useDailyPlan)
│   │   │
│   │   ├── coach/              ← (üres, később: AI voice panel, useAICoach)
│   │   ├── shopping/
│   │   │   └── components/     ← ShoppingList.tsx
│   │   │
│   │   └── profile/
│   │       └── components/    ← Profile.tsx
│   │
│   ├── shared/
│   │   ├── components/         ← (közös UI elemek, pl. WaterWidget, Toast — opcionális)
│   │   ├── hooks/              ← (üres, később: useAppData, useDB áthelyezés)
│   │   └── layouts/            ← Layout.tsx, (BottomNav a components/dsm-ben marad)
│   │
│   ├── components/             ← megosztott / legacy: PageHeader, EmptyState, dsm/, ui/, onboarding/, stb.
│   ├── backend/
│   │   ├── services/           ← FoodCatalogService, NutritionPlanService, ActivityService, stb.
│   │   ├── models/
│   │   └── db.ts               ← IDatabase adapter
│   ├── hooks/                  ← useAppData, usePlanData, useCalorieTracker, stb.
│   ├── contexts/
│   ├── data/
│   └── utils/
│
├── api/                        ← Vercel serverless (változatlan)
└── capacitor.config.ts
```

**Szabályok:**  
- Service-ek a `backend/services/` mappában maradnak (nem kerülnek a feature mappákba).  
- Csak UI komponensek és (opcionálisan) hook-ok kerülnek a `features/*` alá.  
- Importok: feature komponensek a `../../../components`, `../../../hooks`, `../../../backend` stb. útvonalakkal hivatkoznak az app rétegre.

---

## Mappastruktúra (cél állapot — packages/core)

```
personalfit/
│
├── packages/
│   └── core/                          ← PLATFORM-FÜGGETLEN (megosztott mag)
│       ├── services/
│       │   ├── AIParserService.ts
│       │   ├── NutritionPlanService.ts
│       │   ├── FoodCatalogService.ts
│       │   ├── ShoppingListService.ts
│       │   ├── MeasurementService.ts
│       │   └── ActivityService.ts
│       ├── db/
│       │   ├── IDatabase.ts            ← közös interface
│       │   ├── IndexedDBAdapter.ts     ← web/Capacitor implementáció
│       │   └── SQLiteAdapter.ts        ← React Native implementáció (később)
│       ├── models/
│       │   ├── NutritionPlan.ts
│       │   ├── Food.ts
│       │   ├── MealItem.ts
│       │   └── UserProfile.ts
│       ├── parsers/
│       │   ├── foodKnowledge.ts        ← HU/RO élelmiszer adatbázis (~500+ étel)
│       │   └── regexPatterns.ts        ← HU/RO/EN minták
│       └── utils/
│           ├── macroCalculator.ts
│           ├── affiliateLinks.ts       ← Lidl/Carrefour link generátor
│           └── i18n/
│               ├── hu.json
│               └── ro.json
│
├── apps/
│   ├── capacitor/                      ← Jelenlegi React SPA + Capacitor
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   └── hooks/
│   │   └── capacitor.config.ts
│   │
│   └── react-native/                   ← Jövőbeni RN app
│       ├── src/
│       │   ├── components/
│       │   ├── screens/
│       │   └── hooks/
│       └── app.json
│
└── landing/                            ← Vercel landing (Next.js / HTML)
```

---

## Az 5 Szabály — MINDIG tartsd be

Ezek a szabályok garantálják hogy a React Native átírás ne legyen fájdalmas.

### ① Service-ek soha nem importálnak UI-t
```typescript
// ❌ TILOS
import { useState } from 'react';
import { toast } from '../components/Toast';

// ✅ HELYES
// Service csak pure TypeScript, semmi React
```

### ② Service-ek soha nem érnek el közvetlenül adatbázist
```typescript
// ❌ TILOS — IndexedDB közvetlen hívás
const db = await openDB('personalfit', 1);
await db.put('foods', food);

// ✅ HELYES — adapter interface-en keresztül
await this.db.set('foods', food.id, food);
```

### ③ Modellek pure TypeScript interface-ek
```typescript
// ✅ HELYES — semmi platform-specifikus
export interface NutritionPlan {
  id: string;
  name: string;
  weeks: Week[];
  createdAt: string;
}
```

### ④ UI csak hook-okon keresztül ér adatot
```typescript
// ✅ HELYES — adatáramlás
// Screen → Hook → Service → DB Adapter → IndexedDB/SQLite
function FoodsScreen() {
  const { foods, addFood } = useFoodCatalog(); // hook
  // nem hív közvetlenül FoodCatalogService-t
}
```

### ⑤ localStorage TILOS — csak DB adapter
```typescript
// ❌ TILOS — nem működik React Native-ban
localStorage.setItem('userProfile', JSON.stringify(profile));

// ✅ HELYES
await this.db.set('profile', 'current', profile);
```

---

## Database Adapter Interface

Ez a legfontosabb absztrakció. Minden service ezt kapja dependency injection-ön.

```typescript
// packages/core/db/IDatabase.ts

export interface IDatabase {
  get<T>(store: string, key: string): Promise<T | null>;
  set<T>(store: string, key: string, value: T): Promise<void>;
  query<T>(store: string, filter?: Partial<T>): Promise<T[]>;
  delete(store: string, key: string): Promise<void>;
  clear(store: string): Promise<void>;
}

// Stores (konstansok):
export const STORES = {
  FOODS: 'foods',
  NUTRITION_PLANS: 'nutrition_plans',
  MEAL_DAYS: 'meal_days',
  MEALS: 'meals',
  MEAL_ITEMS: 'meal_items',
  SHOPPING_LIST: 'shopping_list',
  PROFILE: 'profile',
  MEASUREMENTS: 'measurements',
  ACTIVITIES: 'activities',
} as const;
```

### IndexedDB implementáció (Capacitor/web)
```typescript
// packages/core/db/IndexedDBAdapter.ts
import { IDatabase } from './IDatabase';

export class IndexedDBAdapter implements IDatabase {
  async get<T>(store: string, key: string): Promise<T | null> {
    const db = await getDB();
    return db.get(store, key) ?? null;
  }
  async set<T>(store: string, key: string, value: T): Promise<void> {
    const db = await getDB();
    await db.put(store, value, key);
  }
  // ... query, delete, clear
}
```

### Service-ek dependency injection-nel
```typescript
// packages/core/services/FoodCatalogService.ts
export class FoodCatalogService {
  constructor(private db: IDatabase) {}

  async getAllFoods(): Promise<Food[]> {
    return this.db.query<Food>(STORES.FOODS);
  }

  async saveFood(food: Food): Promise<void> {
    await this.db.set(STORES.FOODS, food.id, food);
  }
}

// Inicializálás (Capacitor appban):
const db = new IndexedDBAdapter();
const foodService = new FoodCatalogService(db);

// Inicializálás (React Native appban — UGYANAZ a service!):
const db = new SQLiteAdapter();
const foodService = new FoodCatalogService(db);
```

---

## AI Parser — Működési elvek

Az `AIParserService` a fő feldolgozó motor. **Lokális, offline, determinisztikus.**

```
PDF / szöveg / Excel / hang
        ↓
  normalize() → tiszta UTF-8 szöveg
        ↓
  langDetect() → HU / RO / EN
        ↓
  structureParser() → hetek → napok → étkezések
        ↓
  ingredientExtractor() → név + mennyiség + egység
        ↓
  noiseFilter() → kizárja: összefoglalók, fejlécek, kalória-sorok
        ↓
  nutritionEnrich() → LocalDB → FuzzyMatch → CategoryFallback
        ↓
  [LLM fallback — csak ha confidence < 60%]
        ↓
  MealPlan JSON
```

### Fast Mode vs Full Mode
```typescript
// FAST MODE — 3-5mp, csak ételista
uploadFileFoodsOnly(file) / processTextFoodsOnly(text)
→ extractFoodsOnly() → deduplikált Food lista → FoodCatalog

// FULL MODE — teljes étrend import
uploadFile(file) / processText(text)
→ NutritionPlan + MealDays + Meals + MealItems + ShoppingList
```

### Confidence Score
Minden ételnél:
- `✓ megbízható` — LocalDB pontos találat
- `⚠ becsült` — FuzzyMatch vagy kategória fallback
- `✗ ismeretlen` — LLM fallback szükséges

---

## Élelmiszer Adatbázis

**Jelenlegi állapot:** ~60-70 alap étel (`foodKnowledge.ts` + `foodDatabase.ts`)  
**Célállapot:** ~500-800 HU + RO specifikus élelmiszer

### Prioritás lista (bővítéshez)
1. Magyar alapételek (tojás, csirkemell, marha, sertés, hal fajták)
2. Magyar összetett ételek (lencsefőzelék, karfiolpüré, lecsó, stb.)
3. Román ételek (mămăligă, sarmale, ciorbă, mici, stb.)
4. Lidl HU/RO tipikus termékek (private label)
5. Carrefour RO tipikus termékek

### Alias rendszer
```typescript
// foodKnowledge.ts
{
  name: 'csirkemell',
  aliases: ['csirke mell', 'csirkemell filé', 'chicken breast', 'piept de pui'],
  per100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 }
}
```

---

## Affiliate / Bolt Integráció

```typescript
// packages/core/utils/affiliateLinks.ts

export function generateShoppingLink(
  items: ShoppingItem[],
  store: 'lidl_hu' | 'lidl_ro' | 'carrefour_ro' | 'kaufland_hu',
  country: 'HU' | 'RO'
): string {
  const base = STORE_URLS[store];
  const affiliateTag = AFFILIATE_TAGS[store];
  // deep link generálás a bolt saját appjához / weboldalához
  return `${base}?ref=${affiliateTag}&items=${encodeItems(items)}`;
}
```

**Regisztrációk szükségesek:**
- Lidl HU affiliate program → lidl.hu/affiliate (vagy impact.com)
- Carrefour RO affiliate program → carrefour.ro / 2performant.com
- Kaufland HU → kaufland.hu affiliate

---

## Auth Stratégia

**Jelenlegi:** Firebase Auth (email + Google OAuth)  
**Célállapot:** Teljesen lokális, nincs regisztráció

### Firebase kivezetési terv
```typescript
// Amit el kell távolítani:
// - firebase SDK dependency
// - AuthContext Firebase logika
// - LoginScreen (vagy drastikusan egyszerűsíteni)

// Ami marad:
// - Lokális userProfile az IDatabase-ben
// - Onboarding flow (profil adatok helyi mentése)
// - Nincs jelszó, nincs email — csak a telefon azonosít
```

**GDPR üzenet utána:**  
*"Az egyetlen magyar/román fitness app ahol az adataid soha nem hagyják el a telefonodat."*

---

## Capacitor Integráció — Lépések

```bash
# 1. Telepítés
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npx cap init

# 2. Build + sync
npm run build
npx cap sync

# 3. Natív projektek megnyitása
npx cap open ios     # Xcode
npx cap open android # Android Studio

# 4. OTA update (kis javítások store approval nélkül)
npm install @capacitor/live-updates
```

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.personalfit.app',
  appName: 'PersonalFit',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: { launchShowDuration: 2000 },
  }
};
```

---

## Tech Stack Összefoglaló

| Réteg | Capacitor app | React Native app |
|-------|--------------|-----------------|
| UI framework | React 18 + Tailwind v4 | React Native + StyleSheet |
| Animációk | Framer Motion | Reanimated 3 |
| Komponensek | Radix UI | React Native Paper / custom |
| Navigation | React Router | React Navigation |
| **DB** | **IndexedDBAdapter** | **SQLiteAdapter** |
| **Services** | **packages/core (megosztott)** | **packages/core (ugyanaz)** |
| **Parser** | **packages/core (megosztott)** | **packages/core (ugyanaz)** |
| **i18n** | **packages/core/utils/i18n** | **packages/core/utils/i18n** |
| Build | Vite + Capacitor | Expo EAS |
| Deploy | App Store + Play Store | App Store + Play Store |

---

## Migrációs Prioritások (sorrendben)

### Most (Capacitor előtt) — 1-2 hét
- [ ] `localStorage` → `IDatabase` migráció (`userProfile`, `weightHistory`)
- [ ] `IDatabase` interface létrehozása
- [ ] `IndexedDBAdapter` refaktor (jelenlegi `db.ts` alapján)
- [ ] Service-ek dependency injection-re átállítása
- [ ] `window.*` / `document.*` referenciák kiszedése service fájlokból

### Capacitor integráció — 1-2 hét
- [ ] `@capacitor/core` + `@capacitor/ios` + `@capacitor/android` telepítés
- [ ] `capacitor.config.ts` beállítás
- [ ] iOS + Android első build tesztelés
- [ ] Splash screen + app icon beállítás

### Firebase kivezetés — 1 hét
- [ ] Firebase Auth eltávolítása
- [ ] Lokális profil kezelés `IDatabase`-ben
- [ ] Login screen egyszerűsítése vagy eltávolítása
- [ ] Onboarding flow frissítése

### Bolt integráció — 1 hét
- [ ] `affiliateLinks.ts` utility megírása
- [ ] Affiliate programok regisztrációja (Lidl HU/RO, Carrefour RO)
- [ ] ShoppingList UI-hoz "Rendelés" CTA hozzáadása

### App Store submit — 3-4 hét
- [ ] Apple Developer Program ($99/év)
- [ ] Google Play Console ($25 egyszeri)
- [ ] Privacy policy oldal (Vercelen)
- [ ] App Store screenshots + leírás (HU + RO)
- [ ] Review + publish

---

## Cursor-ban való használat

```
# Session elején mindig:
@ARCHITECTURE.md

# Példa promptok:
"@ARCHITECTURE.md alapján refaktoráld a FoodCatalogService-t 
hogy IDatabase interface-t használjon dependency injection-nel"

"@ARCHITECTURE.md alapján hozd létre az IndexedDBAdapter-t 
a packages/core/db/ mappába"

"@ARCHITECTURE.md szabályai szerint ellenőrizd ezt a service fájlt 
— van-e benne localStorage vagy közvetlen IndexedDB hívás?"
```

---

*Utoljára frissítve: 2026. március — PersonalFit Architecture v1.0*
