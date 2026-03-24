# Smart Shopping List Recommendations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static health-first product carousel in ShoppingList with a priority-based recommendation engine driven by meal plan needs, purchase history, favorite foods, and new-user discovery.

**Architecture:** A new pure utility `smartRecommendations.ts` holds all scoring logic; `ShoppingList.tsx` is wired to call it, persist purchase history on add, and guard against async loading races. `parseIngredientToKeyword` is exported from `mealPlanToShoppingList.ts` so it can be reused without duplication.

**Tech Stack:** TypeScript, Vitest, IndexedDB (via `getSetting`/`setSetting`), Firestore (via `useFavoriteFoods`), existing `productDatabase`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `PersonalFit/src/app/utils/mealPlanToShoppingList.ts` | Modify line 139 | Export `parseIngredientToKeyword` |
| `PersonalFit/src/app/features/shopping/utils/smartRecommendations.ts` | Create | Types, matching, scoring (does not exist yet — directory must be created) |
| `PersonalFit/src/app/features/shopping/utils/smartRecommendations.test.ts` | Create | Vitest unit tests |
| `PersonalFit/src/app/features/shopping/components/ShoppingList.tsx` | Modify | Wire state, effects, hook, replace `browseProducts`, update `addProduct` |

---

## Task 1: Export `parseIngredientToKeyword`

**Files:**
- Modify: `PersonalFit/src/app/utils/mealPlanToShoppingList.ts:139`

- [ ] **Step 1: Add `export` keyword at line 139**

```ts
// BEFORE:
function parseIngredientToKeyword(ingredient: string): string | null {

// AFTER:
export function parseIngredientToKeyword(ingredient: string): string | null {
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd PersonalFit && npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add PersonalFit/src/app/utils/mealPlanToShoppingList.ts
git commit -m "feat: export parseIngredientToKeyword for reuse"
```

---

## Task 2: Create `smartRecommendations.ts` with types and stubs

**Files:**
- Create: `PersonalFit/src/app/features/shopping/utils/smartRecommendations.ts`

> **Context:** The `utils/` directory under the shopping feature does not exist yet. It must be created. This task creates the file with real types and the simplest function (`matchFoodToProducts`) fully implemented — the two larger functions are left as stubs so tests can be written against them first.

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "PersonalFit/src/app/features/shopping/utils"
```

- [ ] **Step 2: Create the file with types, `matchFoodToProducts`, and stubs**

Create `PersonalFit/src/app/features/shopping/utils/smartRecommendations.ts`:

```ts
import { Product, productDatabase, StoreName } from '../../../data/productDatabase';
import { parseIngredientToKeyword } from '../../../utils/mealPlanToShoppingList';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchaseHistory = Record<string, { addCount: number; lastAdded: number }>;

export interface SmartRecsParams {
  searchQuery: string;
  products: Product[];
  currentCartIds: Set<string>;
  mealIngredients: string[];
  favoriteIds: Set<string>;
  purchaseHistory: PurchaseHistory;
  selectedStores: StoreName[];
  isNewUser: boolean;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

/**
 * Find products whose name or aliases contain the given keyword (or vice-versa).
 * Normalizes both sides to lowercase, replaces _ and - with space.
 */
export function matchFoodToProducts(keyword: string, products: Product[]): Product[] {
  const norm = keyword.toLowerCase().replace(/[_-]/g, ' ');
  return products.filter(p => {
    const pName = p.name.toLowerCase();
    const aliases = (p.aliases ?? []).map(a => a.toLowerCase());
    return pName.includes(norm) || norm.includes(pName) ||
      aliases.some(a => a.includes(norm) || norm.includes(a));
  });
}

// ─── Health-first fallback ────────────────────────────────────────────────────

/**
 * STUB — implemented in Task 4.
 * Pick the lowest-fat product per category, preferring Kaufland.
 */
export function buildHealthFirstRecommendations(
  products: Product[],
  selectedStores: StoreName[],
): Product[] {
  throw new Error('not implemented');
}

// ─── Smart recommendation engine ─────────────────────────────────────────────

/**
 * STUB — implemented in Task 4.
 */
export function buildSmartRecommendations(params: SmartRecsParams): Product[] {
  throw new Error('not implemented');
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd PersonalFit && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add PersonalFit/src/app/features/shopping/utils/smartRecommendations.ts
git commit -m "feat: add smartRecommendations types and matchFoodToProducts"
```

---

## Task 3: Write failing tests

**Files:**
- Create: `PersonalFit/src/app/features/shopping/utils/smartRecommendations.test.ts`

> **Context:** Tests use Vitest (`describe`, `it`, `expect` from `'vitest'`). Run with `cd PersonalFit && npm test -- smartRecommendations`. The `matchFoodToProducts` tests will pass now (it's already implemented). The `buildHealthFirstRecommendations` and `buildSmartRecommendations` tests will throw "not implemented" — that is expected and correct for TDD.
>
> **Important:** The tests for `buildSmartRecommendations` that call `parseIngredientToKeyword` under the hood (via a meal ingredient like `'Csirkemell (220g)'`) depend on the real `INGREDIENT_KEYWORD_MAP` in `mealPlanToShoppingList.ts`. That map has `'csirkemell'` as a key (line 25 of that file), so `parseIngredientToKeyword('Csirkemell (220g)')` returns `'csirkemell'`. The product `makeProduct({ name: 'Csirkemell' })` in the test matches because `'csirkemell'.includes('csirkemell')` is true. These are integration-style tests — they depend on the real keyword map, not mocked behavior.

- [ ] **Step 1: Create the test file**

Create `PersonalFit/src/app/features/shopping/utils/smartRecommendations.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Product, StoreName } from '../../../data/productDatabase';
import {
  matchFoodToProducts,
  buildHealthFirstRecommendations,
  buildSmartRecommendations,
  type PurchaseHistory,
  type SmartRecsParams,
} from './smartRecommendations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> & { id: string; name: string }): Product {
  return {
    brand: '', category: 'Tejtermék', store: 'Kaufland' as StoreName,
    image: '', unit: 'db', defaultQuantity: 1, caloriesPer100: 100,
    price: 10, protein: 10, carbs: 10, fat: 5, tags: [],
    aliases: [],
    ...overrides,
  };
}

function baseParams(overrides: Partial<SmartRecsParams> = {}): SmartRecsParams {
  return {
    searchQuery: '',
    products: [],
    currentCartIds: new Set(),
    mealIngredients: [],
    favoriteIds: new Set(),
    purchaseHistory: {},
    selectedStores: [],
    isNewUser: false,
    ...overrides,
  };
}

// ─── matchFoodToProducts ──────────────────────────────────────────────────────

describe('matchFoodToProducts', () => {
  const products = [
    makeProduct({ id: 'mozzarella_kauf', name: 'Mozzarella' }),
    makeProduct({ id: 'chicken_kauf', name: 'Csirkemell', aliases: ['chicken breast'] }),
    makeProduct({ id: 'broccoli_kauf', name: 'Brokkoli' }),
  ];

  it('matches by product name substring (case-insensitive)', () => {
    const result = matchFoodToProducts('mozzarella', products);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('mozzarella_kauf');
  });

  it('matches by alias substring', () => {
    const result = matchFoodToProducts('chicken breast', products);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('chicken_kauf');
  });

  it('matches when keyword contains product name', () => {
    const result = matchFoodToProducts('csirkemell fillet', products);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('chicken_kauf');
  });

  it('normalises underscores in keyword to spaces', () => {
    const result = matchFoodToProducts('chicken_breast', products);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('chicken_kauf');
  });

  it('returns empty array when nothing matches', () => {
    expect(matchFoodToProducts('quinoa', products)).toHaveLength(0);
  });
});

// ─── buildHealthFirstRecommendations ──────────────────────────────────────────

describe('buildHealthFirstRecommendations', () => {
  const products = [
    makeProduct({ id: 'low_fat_kauf', name: 'Low Fat Milk', category: 'Tejtermék', store: 'Kaufland', fat: 1 }),
    makeProduct({ id: 'high_fat_kauf', name: 'Full Fat Milk', category: 'Tejtermék', store: 'Kaufland', fat: 10 }),
    makeProduct({ id: 'low_fat_lidl', name: 'Low Fat Milk Lidl', category: 'Tejtermék', store: 'Lidl', fat: 1 }),
    makeProduct({ id: 'chicken_kauf', name: 'Csirkemell', category: 'Hús & Hal', store: 'Kaufland', fat: 2 }),
  ];

  it('picks lowest fat per category', () => {
    const result = buildHealthFirstRecommendations(products, []);
    const dairy = result.find(p => p.category === 'Tejtermék');
    expect(dairy?.id).toBe('low_fat_kauf');
  });

  it('prefers Kaufland when fat is equal across stores', () => {
    const equal = [
      makeProduct({ id: 'milk_lidl', name: 'Milk Lidl', category: 'Tejtermék', store: 'Lidl', fat: 1 }),
      makeProduct({ id: 'milk_kauf', name: 'Milk Kauf', category: 'Tejtermék', store: 'Kaufland', fat: 1 }),
    ];
    const result = buildHealthFirstRecommendations(equal, []);
    expect(result[0].id).toBe('milk_kauf');
  });

  it('respects selectedStores filter', () => {
    const result = buildHealthFirstRecommendations(products, ['Lidl']);
    expect(result.every(p => p.store === 'Lidl')).toBe(true);
  });

  it('returns one product per category', () => {
    const result = buildHealthFirstRecommendations(products, []);
    const categories = result.map(p => p.category);
    expect(new Set(categories).size).toBe(categories.length);
  });
});

// ─── buildSmartRecommendations ────────────────────────────────────────────────

describe('buildSmartRecommendations', () => {
  const chicken = makeProduct({ id: 'chicken_kauf', name: 'Csirkemell', category: 'Hús & Hal', fat: 2 });
  const mozzarella = makeProduct({ id: 'mozz_kauf', name: 'Mozzarella', category: 'Tejtermék', fat: 5 });
  const broccoli = makeProduct({ id: 'broc_kauf', name: 'Brokkoli', category: 'Zöldség', fat: 0 });
  const yoghurt = makeProduct({ id: 'yoghurt_kauf', name: 'Joghurt', category: 'Tejtermék', fat: 3 });
  const allProducts = [chicken, mozzarella, broccoli, yoghurt];

  it('returns [] when searchQuery is non-empty', () => {
    const result = buildSmartRecommendations(baseParams({ searchQuery: 'csirke', products: allProducts }));
    expect(result).toHaveLength(0);
  });

  it('falls back to health-first when isNewUser is true', () => {
    const result = buildSmartRecommendations(baseParams({
      products: allProducts,
      isNewUser: true,
    }));
    expect(result.length).toBeGreaterThan(0);
  });

  it('scores meal plan ingredients at 1000 (highest priority)', () => {
    // Note: 'Csirkemell (220g)' is processed by the real parseIngredientToKeyword,
    // which looks up 'csirkemell' in INGREDIENT_KEYWORD_MAP and returns 'csirkemell'.
    // matchFoodToProducts('csirkemell', [...]) matches product name 'Csirkemell'.
    const result = buildSmartRecommendations(baseParams({
      products: allProducts,
      mealIngredients: ['Csirkemell (220g)'],
    }));
    expect(result[0].id).toBe('chicken_kauf');
  });

  it('scores purchase history (addCount >= 2) at 500+', () => {
    const history: PurchaseHistory = {
      'yoghurt_kauf': { addCount: 3, lastAdded: Date.now() },
    };
    const result = buildSmartRecommendations(baseParams({
      products: allProducts,
      purchaseHistory: history,
    }));
    expect(result[0].id).toBe('yoghurt_kauf');
  });

  it('does not include purchase history items with addCount < 2', () => {
    const history: PurchaseHistory = {
      'yoghurt_kauf': { addCount: 1, lastAdded: Date.now() },
    };
    const result = buildSmartRecommendations(baseParams({
      products: allProducts,
      purchaseHistory: history,
    }));
    expect(result.some(p => p.id === 'yoghurt_kauf')).toBe(false);
  });

  it('scores favorites at 300', () => {
    const result = buildSmartRecommendations(baseParams({
      products: allProducts,
      favoriteIds: new Set(['mozzarella']),
    }));
    expect(result[0].id).toBe('mozz_kauf');
  });

  it('meal plan beats purchase history beats favorites', () => {
    const history: PurchaseHistory = {
      'yoghurt_kauf': { addCount: 5, lastAdded: Date.now() },
    };
    const result = buildSmartRecommendations(baseParams({
      products: allProducts,
      mealIngredients: ['Csirkemell (220g)'],
      purchaseHistory: history,
      favoriteIds: new Set(['mozzarella']),
    }));
    expect(result[0].id).toBe('chicken_kauf');   // meal plan: 1000
    expect(result[1].id).toBe('yoghurt_kauf');   // history: 550
    expect(result[2].id).toBe('mozz_kauf');      // favorites: 300
  });

  it('excludes products already in cart', () => {
    const result = buildSmartRecommendations(baseParams({
      products: allProducts,
      mealIngredients: ['Csirkemell (220g)'],
      currentCartIds: new Set(['chicken_kauf']),
    }));
    expect(result.every(p => p.id !== 'chicken_kauf')).toBe(true);
  });

  it('a product matching multiple tiers appears only once (highest score wins)', () => {
    const history: PurchaseHistory = {
      'chicken_kauf': { addCount: 3, lastAdded: Date.now() },
    };
    const result = buildSmartRecommendations(baseParams({
      products: allProducts,
      mealIngredients: ['Csirkemell (220g)'],
      purchaseHistory: history,
    }));
    const chickens = result.filter(p => p.id === 'chicken_kauf');
    expect(chickens).toHaveLength(1);
    expect(result[0].id).toBe('chicken_kauf');
  });

  it('respects selectedStores filter', () => {
    const lidlChicken = makeProduct({ id: 'chicken_lidl', name: 'Csirkemell', category: 'Hús & Hal', store: 'Lidl', fat: 2 });
    const result = buildSmartRecommendations(baseParams({
      products: [...allProducts, lidlChicken],
      mealIngredients: ['Csirkemell (220g)'],
      selectedStores: ['Lidl'],
    }));
    expect(result.every(p => p.store === 'Lidl')).toBe(true);
  });

  it('returns at most 20 products', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      makeProduct({ id: `prod_${i}`, name: `Product ${i}`, category: 'Tejtermék' })
    );
    const history: PurchaseHistory = Object.fromEntries(
      many.map(p => [p.id, { addCount: 2, lastAdded: Date.now() }])
    );
    const result = buildSmartRecommendations(baseParams({
      products: many,
      purchaseHistory: history,
    }));
    expect(result.length).toBeLessThanOrEqual(20);
  });
});
```

- [ ] **Step 2: Run tests — verify `matchFoodToProducts` passes, stubs throw**

```bash
cd PersonalFit && npm test -- smartRecommendations 2>&1
```
Expected: `matchFoodToProducts` tests pass. `buildHealthFirstRecommendations` and `buildSmartRecommendations` tests fail with "not implemented". That is correct TDD — proceed to Task 4.

- [ ] **Step 3: Commit the tests**

```bash
git add PersonalFit/src/app/features/shopping/utils/smartRecommendations.test.ts
git commit -m "test: add smartRecommendations unit tests (stubs failing)"
```

---

## Task 4: Implement `buildHealthFirstRecommendations` and `buildSmartRecommendations`

**Files:**
- Modify: `PersonalFit/src/app/features/shopping/utils/smartRecommendations.ts`

Replace both stub function bodies with real implementations.

- [ ] **Step 1: Implement `buildHealthFirstRecommendations`**

Replace the stub body:

```ts
export function buildHealthFirstRecommendations(
  products: Product[],
  selectedStores: StoreName[],
): Product[] {
  const all = selectedStores.length > 0
    ? products.filter(p => selectedStores.includes(p.store))
    : products;

  const byCategory = new Map<string, Product>();
  const preferredStore = 'Kaufland';
  for (const p of all) {
    const existing = byCategory.get(p.category);
    if (!existing) { byCategory.set(p.category, p); continue; }
    const existingIsPreferred = existing.store === preferredStore;
    const currentIsPreferred = p.store === preferredStore;
    if (existingIsPreferred && !currentIsPreferred) continue;
    if (!existingIsPreferred && currentIsPreferred) { byCategory.set(p.category, p); continue; }
    if (p.fat < existing.fat) { byCategory.set(p.category, p); }
  }

  const categoryOrder = [
    'Hús & Hal', 'Zöldség', 'Tejtermék', 'Gyümölcs', 'Gabona',
    'Hüvelyes', 'Diófélék', 'Olaj & Fűszer', 'Ital', 'Konzerv',
    'Édesség', 'Sport & Kiegészítő',
  ];
  const sorted: Product[] = [];
  for (const cat of categoryOrder) {
    const p = byCategory.get(cat);
    if (p) sorted.push(p);
  }
  for (const [, p] of byCategory) {
    if (!sorted.includes(p)) sorted.push(p);
  }
  return sorted;
}
```

- [ ] **Step 2: Run health-first tests to verify they pass**

```bash
cd PersonalFit && npm test -- smartRecommendations 2>&1
```
Expected: all `buildHealthFirstRecommendations` tests pass. `buildSmartRecommendations` tests still fail with "not implemented".

- [ ] **Step 3: Implement `buildSmartRecommendations`**

Replace the stub body:

```ts
export function buildSmartRecommendations(params: SmartRecsParams): Product[] {
  if (params.searchQuery.trim()) return [];

  const {
    products, currentCartIds, mealIngredients, favoriteIds,
    purchaseHistory, selectedStores, isNewUser,
  } = params;

  if (isNewUser) return buildHealthFirstRecommendations(products, selectedStores);

  const filtered = selectedStores.length > 0
    ? products.filter(p => selectedStores.includes(p.store))
    : products;

  const scoreMap = new Map<string, { product: Product; score: number }>();

  const score = (p: Product, s: number) => {
    if (currentCartIds.has(p.id)) return;
    const existing = scoreMap.get(p.id);
    if (!existing || existing.score < s) scoreMap.set(p.id, { product: p, score: s });
  };

  // Priority 1: meal plan ingredients
  for (const ingredient of mealIngredients) {
    const keyword = parseIngredientToKeyword(ingredient);
    if (!keyword) continue;
    for (const p of matchFoodToProducts(keyword, filtered)) score(p, 1000);
  }

  // Priority 2: purchase history (≥2 adds)
  for (const p of filtered) {
    const h = purchaseHistory[p.id];
    if (h && h.addCount >= 2) score(p, 500 + h.addCount * 10);
  }

  // Priority 3: favorites
  for (const foodId of favoriteIds) {
    for (const p of matchFoodToProducts(foodId, filtered)) score(p, 300);
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(e => e.product);
}
```

- [ ] **Step 4: Run all tests — verify everything passes**

```bash
cd PersonalFit && npm test 2>&1
```
Expected: all tests pass, including the full suite.

- [ ] **Step 5: Commit**

```bash
git add PersonalFit/src/app/features/shopping/utils/smartRecommendations.ts
git commit -m "feat: implement buildHealthFirstRecommendations and buildSmartRecommendations"
```

---

## Task 5: Wire `ShoppingList.tsx`

**Files:**
- Modify: `PersonalFit/src/app/features/shopping/components/ShoppingList.tsx`

> **Context for the implementer:**
> - `ShoppingList.tsx` is ~1091 lines.
> - `usePlanData` is already imported (line 33) and called at line 356 as `const { planData } = usePlanData();`
> - Add `const { favoriteIds } = useFavoriteFoods();` immediately after that line (line 357).
> - Three new state variables go at line 431 — immediately after the `storePreferences` state declaration at line 430: `const [storePreferences, setStorePreferences] = useState<StorePreferences>({});`
> - The purchase history load effect goes immediately after the `storePreferences` load effect that closes at line 378.
> - `browseProducts` memo runs from line 464 through line 499 (inclusive). Replace only lines 464–499. Line 501 (`const displayProducts = ...`) must not be touched.
> - `addProduct` runs from line 510 through line 517 (inclusive). Replace only those lines.
> - `planData` type is `WeekData[] | null`. Each `WeekData` has `days: DayData[]`. Each `DayData` has `meals: MealOption[]`. Each `MealOption` has `ingredients: string[]`.

- [ ] **Step 1: Add three new imports**

After the existing import block at the top of the file, add:

```ts
import { useFavoriteFoods } from '../../../hooks/useFavoriteFoods';
import { buildSmartRecommendations, type PurchaseHistory } from '../utils/smartRecommendations';
import { getCurrentWeekIndex } from '../../../utils/mealPlanToShoppingList';
```

- [ ] **Step 2: Call `useFavoriteFoods` hook (line 357)**

Immediately after `const { planData } = usePlanData();` add:

```ts
const { favoriteIds } = useFavoriteFoods();
```

- [ ] **Step 3: Add three new state variables (after line 430)**

Immediately after `const [storePreferences, setStorePreferences] = useState<StorePreferences>({});` add:

```ts
const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory>({});
const [purchaseHistoryLoaded, setPurchaseHistoryLoaded] = useState(false);
const [favoritesLoaded, setFavoritesLoaded] = useState(false);
```

- [ ] **Step 4: Add purchase history load effect (after the storePreferences load effect)**

The `storePreferences` load effect closes at line 378. Immediately after it, add:

```ts
// Load purchase history from IndexedDB
useEffect(() => {
  getSetting('sh-purchase-history').then((raw) => {
    try {
      if (raw) setPurchaseHistory(JSON.parse(raw));
    } catch { /* ignore */ }
    setPurchaseHistoryLoaded(true);
  });
}, []);
```

- [ ] **Step 5: Add favorites loading guard effects (after the purchase history effect)**

```ts
// Mark favorites loaded once Firestore delivers, or after 300ms timeout
useEffect(() => {
  if (favoriteIds.size > 0) setFavoritesLoaded(true);
}, [favoriteIds]);
useEffect(() => {
  const t = setTimeout(() => setFavoritesLoaded(true), 300);
  return () => clearTimeout(t);
}, []);
```

- [ ] **Step 6: Add `mealIngredients` derivation (before `searchResults` memo, ~line 448)**

Add this `useMemo` before the `searchResults` memo:

```ts
const mealIngredients = useMemo(() => {
  if (!planData) return [];
  const weekIdx = getCurrentWeekIndex();
  const week = planData[weekIdx];
  if (!week) return [];
  return week.days.flatMap(day => day.meals.flatMap(meal => meal.ingredients));
}, [planData]);
```

- [ ] **Step 7: Replace `browseProducts` memo block (lines 464–499 only)**

Replace only the `const browseProducts = useMemo(...)` block — lines 464 through 499 inclusive. Do **not** modify line 501 (`const displayProducts = ...`).

```ts
const browseProducts = useMemo(() => {
  if (!favoritesLoaded || !purchaseHistoryLoaded) return [];
  const currentCartIds = new Set(shoppingItems.map(i => i.product.id));
  const isNewUser = favoriteIds.size === 0 && Object.keys(purchaseHistory).length === 0;
  return buildSmartRecommendations({
    searchQuery,
    products: productDatabase,
    currentCartIds,
    mealIngredients,
    favoriteIds,
    purchaseHistory,
    selectedStores,
    isNewUser,
  });
}, [searchQuery, selectedStores, shoppingItems, mealIngredients, favoriteIds,
    purchaseHistory, favoritesLoaded, purchaseHistoryLoaded]);
```

- [ ] **Step 8: Replace `addProduct` function (lines 510–517 only)**

Replace only `const addProduct = (product: Product) => { ... };` — lines 510 through 517 inclusive:

```ts
const addProduct = async (product: Product) => {
  const exists = shoppingItems.some((i) => i.product.id === product.id);
  if (exists) return;
  updateShoppingItems((prev) => [
    ...prev,
    { product, quantity: product.defaultQuantity, checked: false },
  ]);
  // Persist purchase history (fire-and-forget; UI updates optimistically)
  try {
    const raw = await getSetting('sh-purchase-history');
    const history: PurchaseHistory = raw ? JSON.parse(raw) : {};
    const prev = history[product.id] ?? { addCount: 0, lastAdded: 0 };
    history[product.id] = { addCount: prev.addCount + 1, lastAdded: Date.now() };
    await setSetting('sh-purchase-history', JSON.stringify(history));
    setPurchaseHistory(history);
  } catch { /* silently ignore */ }
};
```

- [ ] **Step 9: Verify TypeScript compiles clean**

```bash
cd PersonalFit && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 10: Run full test suite**

```bash
cd PersonalFit && npm test 2>&1
```
Expected: all tests pass.

- [ ] **Step 11: Commit**

```bash
git add PersonalFit/src/app/features/shopping/components/ShoppingList.tsx
git commit -m "feat: smart shopping recommendations — meal plan, history, favorites"
```

---

## Task 6: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
cd PersonalFit && npm run dev
```
Open `http://localhost:5173` in a browser and navigate to the shopping tab.

- [ ] **Step 2: Verify new-user fallback**

If there are no favorites in Firestore and no purchase history in IndexedDB, the carousel should show the health-first list (one product per category, Kaufland preferred). Confirm at least 8 categories appear.

- [ ] **Step 3: Test purchase history**

Add any product to the cart, then clear all cart items (tap the trash icon or uncheck all). Add the same product again. Reload the page and open the shopping tab — that product should appear near the top of the carousel (addCount is now 2, score ≥ 520).

- [ ] **Step 4: Verify search hides carousel**

Type any text in the search box. The "Ajánlott termékek" carousel should disappear. Clear the text — it should reappear.

- [ ] **Step 5: Commit any fixes**

```bash
git add -p
git commit -m "fix: smart recommendations smoke test fixes"
```

---

## Done

After Task 6 passes, invoke `superpowers:finishing-a-development-branch` to merge or create a PR.
