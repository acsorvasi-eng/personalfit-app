# nura — Architecture Guide
> **Cursor kontextus fajl.** Olvasd be minden session elejen: `@ARCHITECTURE.md`

---

## Projekt vizio

Offline-first fitness & nutrition app iOS + Android platformra. Magyar es roman piac.
- **Capacitor** nativ shell (React SPA becsomagolva)
- **Firebase Auth** (Google Sign-In) + **Cloud Firestore** cross-device sync
- **Stripe** elofizetesi fizetes
- **Vercel Serverless** backend (10+ API fuggveny)
- **Chef AI agent** — szemelyre szabott etrend generalas es review

---

## Platform strategia

### Jelenlegi — Capacitor (elo)
A meglevo React SPA-t Capacitor shell foglalja be -> App Store + Play Store.
Vite build -> `dist/` -> `npx cap sync` -> nativ build.

### Jovobeni — React Native (opcionalis)
Ha szukseges, a backend services (`src/app/backend/`) valtozatlanul hasznalhato RN-ben.
Csak a UI komponensek kulonboznek — minden mas megosztott.

---

## Mappastruktura

```
PersonalFit/
├── api/                            <- Vercel serverless functions
│   ├── chef-review.ts
│   ├── chef-suggest.ts
│   ├── create-checkout-session.ts
│   ├── food-image.ts
│   ├── generate-meal-plan.ts
│   ├── lookup-foods.ts
│   ├── parse-document.ts
│   ├── parse-gmon.ts
│   ├── split-food-name.ts
│   └── stripe-webhook.ts
│
├── src/
│   └── app/
│       ├── features/
│       │   ├── nutrition/          <- Foods.tsx, GenerateMealPlanSheet
│       │   ├── workout/            <- Workout.tsx, WorkoutCalendar
│       │   ├── menu/               <- UnifiedMenu, MealCard, RecipeOverlay
│       │   ├── shopping/           <- ShoppingList, OrderDeliverySheet
│       │   └── profile/            <- Profile.tsx
│       │
│       ├── shared/
│       │   ├── components/         <- PageHeader, kozos UI elemek
│       │   └── layouts/            <- Layout.tsx
│       │
│       ├── components/             <- megosztott: dsm/, ui/, onboarding/, Checkout
│       ├── backend/
│       │   ├── services/           <- 20+ service (Chef, FoodCatalog, NutritionPlan, stb.)
│       │   ├── models/
│       │   ├── db.ts               <- IDatabase adapter (IndexedDB)
│       │   ├── seed.ts
│       │   └── seedFoods.ts
│       ├── services/               <- authService, paymentService, userFirestoreService, DailyMenuMatcher
│       ├── hooks/                  <- useAppData, usePlanData, useNearbyStores, stb.
│       ├── contexts/               <- AuthContext, stb.
│       ├── data/                   <- aiFoodKnowledge (~250+ etel), foodImages, mealData, dailyMenuSources
│       └── utils/
│
├── ios/                            <- Capacitor iOS projekt
├── android/                        <- Capacitor Android projekt
├── capacitor.config.ts
├── vercel.json
└── vite.config.ts
```

**Szabalyok:**
- Service-ek a `backend/services/` mappaban maradnak (nem kerulnek a feature mappakba).
- Csak UI komponensek es (opcionalisam) hook-ok kerulnek a `features/*` ala.
- API fuggvenyek mindig a root `api/` mappaban (Vercel deploy).

---

## Az 5 Szabaly — MINDIG tartsd be

### 1. Service-ek soha nem importalnak UI-t
```typescript
// TILOS
import { useState } from 'react';
import { toast } from '../components/Toast';

// HELYES — Service csak pure TypeScript, semmi React
```

### 2. Service-ek soha nem ernek el kozvetlenul adatbazist
```typescript
// TILOS — IndexedDB kozvetlen hivas
const db = await openDB('personalfit', 1);
await db.put('foods', food);

// HELYES — adapter interface-en keresztul
await this.db.set('foods', food.id, food);
```

### 3. Modellek pure TypeScript interface-ek
```typescript
export interface NutritionPlan {
  id: string;
  name: string;
  weeks: Week[];
  createdAt: string;
}
```

### 4. UI csak hook-okon keresztul er adatot
```typescript
// Screen -> Hook -> Service -> DB Adapter -> IndexedDB
function FoodsScreen() {
  const { foods, addFood } = useFoodCatalog();
}
```

### 5. localStorage TILOS — csak DB adapter
```typescript
// TILOS — nem mukodik React Native-ban
localStorage.setItem('userProfile', JSON.stringify(profile));

// HELYES
await this.db.set('profile', 'current', profile);
```

---

## Database Adapter Interface

Minden service ezt kapja dependency injection-on.

```typescript
export interface IDatabase {
  get<T>(store: string, key: string): Promise<T | null>;
  set<T>(store: string, key: string, value: T): Promise<void>;
  query<T>(store: string, filter?: Partial<T>): Promise<T[]>;
  delete(store: string, key: string): Promise<void>;
  clear(store: string): Promise<void>;
}
```

### IndexedDB implementacio (Capacitor/web)
```typescript
export class IndexedDBAdapter implements IDatabase {
  async get<T>(store: string, key: string): Promise<T | null> {
    const db = await getDB();
    return db.get(store, key) ?? null;
  }
  // ... set, query, delete, clear
}
```

---

## AI Parser — Mukodesi elvek

Az `AIParserService` a fo feldolgozo motor.

```
PDF / szoveg / Excel / hang
        |
  normalize() -> tiszta UTF-8 szoveg
        |
  langDetect() -> HU / RO / EN
        |
  structureParser() -> hetek -> napok -> etkezesek
        |
  ingredientExtractor() -> nev + mennyiseg + egyseg
        |
  noiseFilter() -> kizarja: osszefoglalok, fejlecek, kaloria-sorok
        |
  nutritionEnrich() -> LocalDB -> FuzzyMatch -> CategoryFallback
        |
  [LLM fallback — csak ha confidence < 60%]
        |
  MealPlan JSON
```

### Fast Mode vs Full Mode
```typescript
// FAST MODE — 3-5mp, csak eteliista
uploadFileFoodsOnly(file) / processTextFoodsOnly(text)
-> extractFoodsOnly() -> deduplikalt Food lista -> FoodCatalog

// FULL MODE — teljes etrend import
uploadFile(file) / processText(text)
-> NutritionPlan + MealDays + Meals + MealItems + ShoppingList
```

---

## Elelmiszer Adatbazis

**Jelenlegi allapot:** ~250+ alap etel (`aiFoodKnowledge.ts` + seedFoods)
- Magyar alapetelek, osszetett etelek, roman etelek
- HU/RO/EN alias rendszer

### Alias rendszer
```typescript
{
  names: ['csirkemell', 'csirke mell', 'csirkemell file', 'chicken breast', 'piept de pui'],
  category: 'Hus & Hal',
  per100: { calories: 165, protein: 31, carbs: 0, fat: 3.6 }
}
```

---

## Auth & Sync Strategia

**Firebase Auth:** Google Sign-In (web + Capacitor)
- `authService.ts` — Firebase Auth logika
- `AuthContext` — app-szintu auth allapot
- `LoginScreen.tsx` — belepes UI

**Cloud Firestore:** Cross-device szinkronizacio
- `userFirestoreService.ts` — profil, etkezesi terv, kedvencek sync
- Offline-first: lokalis IndexedDB az elsodleges, Firestore a masodlagos

**Stripe:** Elofizetesi fizetes
- `create-checkout-session.ts` (API) — Stripe Checkout Session letrehozas
- `stripe-webhook.ts` (API) — webhook feldolgozas
- `paymentService.ts` — kliens oldali fizetes logika
- `SubscriptionScreen.tsx` — elofizetesi UI

---

## Capacitor Integracio

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.personalfit.app',
  appName: 'nura',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: { launchShowDuration: 2000 },
  }
};
```

Build: `npm run build && npx cap sync && npx cap open ios`

---

## Tech Stack Osszefoglalo

| Reteg | Technologia |
|-------|-------------|
| UI framework | React 18 + Tailwind v4 |
| Animaciok | Framer Motion |
| Komponensek | Radix UI |
| Navigation | React Router |
| DB (lokal) | IndexedDB via `idb` |
| DB (cloud) | Cloud Firestore |
| Auth | Firebase Auth (Google Sign-In) |
| Fizetes | Stripe |
| Backend | Vercel Serverless (10+ function) |
| AI | OpenAI API (Chef agent, food parsing) |
| Nativ | Capacitor (iOS + Android) |
| Build | Vite |
| Deploy | Vercel (web) + App Store / Play Store (nativ) |

---

## Design System Rules

**Applies to every page in the entire app.** No exceptions.

### Universal Header Standard (Rule 1)

- Every page header uses the shared **PageHeader** component from `src/app/shared/components/PageHeader.tsx`.
- Spec: full viewport width (edge to edge), `border-radius: 0`, `padding-top: 48px`, `padding-bottom: 1rem`, `padding-left/right: 1rem`, background `linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #14b8a6 100%)`, color white, `position: sticky`, `top: 0`, `z-index: 50`.
- Title: `font-size: 1.25rem`, `font-weight: 700`, color white.
- Subtitle: `font-size: 0.875rem`, color `rgba(255,255,255,0.8)`.
- Close/back button (subpages): `position: absolute`, `top: 1rem`, `right: 1rem`, 2rem x 2rem, `background: rgba(255,255,255,0.2)`, `border-radius: 50%`, white, no border.
- **Zero custom header implementations** — always use `<PageHeader>`.

### Universal Footer Standard (Rule 2)

- Every page footer (primary action area) uses the shared **PageFooter** component or the same visual spec.
- Primary button: full width, `padding: 1rem`, `border-radius: 0.75rem`, background `linear-gradient(135deg, #3b82f6, #14b8a6)`, color white, `font-size: 1rem`, `font-weight: 700`.
- **Zero custom footer implementations** for action bars.

### Rule 3 — Meal names

- Meal names (Reggeli, Ebed, Vacsora, etc.) use the existing translation keys.

---

*Utoljara frissitve: 2026. marcius — nura Architecture v2.0*
