# Smart Shopping List Recommendations — Design Spec

## Goal

Replace the current health-first (lowest-fat-per-category) `browseProducts` algorithm in `ShoppingList.tsx` with a priority-based smart recommendation engine that surfaces personally relevant products using meal plan needs, purchase history, favorite foods, and category-based discovery for new users.

## Architecture

Three new pieces are introduced alongside the existing `ShoppingList.tsx`:

1. **Purchase History** — lightweight IndexedDB counter (no backend)
2. **Favorite-to-Product Mapper** — maps food catalog IDs to `productDatabase` entries
3. **Smart Recommendation Engine** — replaces `browseProducts` memoized block

The `ShoppingList` component already imports `usePlanData` and has access to `planData`. The hook `useFavoriteFoods` is not currently imported into `ShoppingList.tsx` — it will be added.

---

## Data Layer: Purchase History

**Settings key:** `"sh-purchase-history"` (IndexedDB via `getSetting`/`setSetting`)

**Type:**
```ts
type PurchaseHistory = Record<string, { addCount: number; lastAdded: number }>;
// key = product.id (e.g. "chicken_breast_kaufland")
```

**Write path:** `addProduct()` in `ShoppingList.tsx`. After the optimistic cart update, the function must asynchronously read `"sh-purchase-history"`, increment `addCount` for the product's ID, set `lastAdded = Date.now()`, and write back:

```ts
const addProduct = async (product: Product) => {
  const exists = shoppingItems.some((i) => i.product.id === product.id);
  if (exists) return;
  updateShoppingItems((prev) => [...prev, { product, quantity: product.defaultQuantity, checked: false }]);
  // Persist purchase history
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

**Read path:** Loaded on mount alongside `shoppingItems` and `storePreferences`.

**Size:** No deletion logic needed for v1. The product catalog is bounded (~300 products); growth is negligible. See Out of Scope for future size-cap.

---

## Ingredient String Pre-Processing

`MealOption.ingredients` entries have the format `"{food name} ({quantity}{unit})"` — e.g. `"Csirkemell (220g)"`, `"Brokkoli (150g)"`. The quantity suffix must be stripped before matching against product names.

The existing `parseIngredientToKeyword()` utility in `src/app/utils/mealPlanToShoppingList.ts` (lines 139–153) already handles this. It is currently module-private (no `export` keyword). It must be exported before it can be reused:

**Change in `mealPlanToShoppingList.ts` line 139:**
```ts
// before:
function parseIngredientToKeyword(ingredient: string): string | null {
// after:
export function parseIngredientToKeyword(ingredient: string): string | null {
```

Then import in `smartRecommendations.ts`:
```ts
import { parseIngredientToKeyword, getCurrentWeekIndex } from '../../../utils/mealPlanToShoppingList';
```

`getCurrentWeekIndex()` from the same file is used to determine which week's meals are active when extracting `mealIngredients` from `planData`.

---

## Favorite-to-Product Mapping

`useFavoriteFoods` returns `favoriteIds: Set<string>` where each ID is a food catalog food ID string (e.g. `"mozzarella"`, `"gomba"`, `"zabtehenes_tej"`). Food IDs are typically the food name lowercased and underscored — treated directly as a search keyword after replacing `_` with space.

**Matching function:**
```ts
function matchFoodToProducts(keyword: string, products: Product[]): Product[] {
  const norm = keyword.toLowerCase().replace(/[_-]/g, ' ');
  return products.filter(p => {
    const pName = p.name.toLowerCase();
    const aliases = (p.aliases ?? []).map(a => a.toLowerCase());
    return pName.includes(norm) || norm.includes(pName) ||
      aliases.some(a => a.includes(norm) || norm.includes(a));
  });
}
```

Returns all matching products across all stores. Downstream scoring and deduplication handle selection.

---

## Loading Guard for `isNewUser`

`useFavoriteFoods` loads favorites asynchronously (Firestore `onSnapshot` + IndexedDB cache). On first render, `favoriteIds` is an empty `Set`. Without a guard, the new-user fallback would briefly trigger on every mount for returning users.

**Solution:** Add a `favoritesLoaded` flag from the hook or derive it from purchase history. Since `purchaseHistory` also loads async, use a combined guard:

```ts
const isFavoritesLoaded = useFavoriteFoods returns a `loaded: boolean` flag
```

However, to avoid modifying `useFavoriteFoods`, use a simpler approach: delay recommendation computation until **both** `purchaseHistoryLoaded` and `favoritesLoaded` state are true. Introduce a `favoritesLoaded` boolean state in `ShoppingList.tsx`, initialized to `false`, set to `true` on the first non-empty `favoriteIds` update OR after a 300ms timeout (preventing indefinite loading for users with no favorites).

```ts
// In ShoppingList.tsx
const [favoritesLoaded, setFavoritesLoaded] = useState(false);
useEffect(() => {
  if (favoriteIds.size > 0) setFavoritesLoaded(true);
}, [favoriteIds]);
useEffect(() => {
  const t = setTimeout(() => setFavoritesLoaded(true), 300);
  return () => clearTimeout(t);
}, []);
```

Recommendations are only computed when `favoritesLoaded && purchaseHistoryLoaded`.

---

## Recommendation Engine

New function `buildSmartRecommendations()` replaces the `browseProducts` memoized block.

**New-user detection:**
```ts
const isNewUser = favoriteIds.size === 0 && Object.keys(purchaseHistory).length === 0;
```
When `isNewUser` is true, the function falls back to the **existing health-first algorithm** (lowest fat per category, Kaufland preferred). This algorithm is extracted into a named helper `buildHealthFirstRecommendations()` inside `smartRecommendations.ts` so it can be called from both the new-user branch and tested independently.

**Algorithm — single pass with score map:**

```ts
function buildSmartRecommendations(params: SmartRecsParams): Product[] {
  if (params.searchQuery.trim()) return [];  // preserve existing guard

  const { products, currentCartIds, mealIngredients, favoriteIds,
          purchaseHistory, selectedStores, isNewUser } = params;

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
    if (!keyword) continue;  // parseIngredientToKeyword returns null for unparseable strings
    for (const p of matchFoodToProducts(keyword, filtered)) score(p, 1000);
  }

  // Priority 2: purchase history
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

The single-pass approach over each tier with `score()` deduplications ensures O(n) per tier and correct highest-score-wins semantics.

**`searchQuery` guard is preserved:** The first line of `buildSmartRecommendations` returns `[]` when the user is searching, exactly matching the current `browseProducts` behaviour.

---

## New Helper File

**`src/app/features/shopping/utils/smartRecommendations.ts`**

Exports:
- `PurchaseHistory` type
- `SmartRecsParams` interface
- `matchFoodToProducts(keyword, products): Product[]`
- `buildSmartRecommendations(params): Product[]`
- `buildHealthFirstRecommendations(products, selectedStores): Product[]` (extracted from current `browseProducts`)

---

## Component Changes to `ShoppingList.tsx`

1. Add import: `import { useFavoriteFoods } from '../../../hooks/useFavoriteFoods'`
2. Add import: `import { buildSmartRecommendations, PurchaseHistory } from '../utils/smartRecommendations'`
3. Add state: `const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory>({})`
4. Add state: `const [purchaseHistoryLoaded, setPurchaseHistoryLoaded] = useState(false)`
5. Add state: `const [favoritesLoaded, setFavoritesLoaded] = useState(false)`
6. Add load effect for `"sh-purchase-history"` (runs once on mount)
7. Add `favoritesLoaded` guard effects (described above)
8. Call `const { favoriteIds } = useFavoriteFoods()`
9. Derive `mealIngredients`: flatten current week's `planData` meals using `getCurrentWeekIndex()`
10. Replace `browseProducts` memo block with `buildSmartRecommendations(...)` — keep the variable name `browseProducts` so all JSX references (e.g. `{!searchQuery && browseProducts.length > 0 && ...}`) remain unchanged
11. Update `addProduct` to persist purchase history (async, shown above)

---

## UI Changes

None. `browseProducts` feeds `displayProducts` which drives the existing carousel. Output shape (`Product[]`) is identical. Section header "Ajánlott termékek" remains appropriate.

---

## Error Handling

- Missing purchase history (first launch): `getSetting` returns null → default to `{}` → falls through to favorites/discovery
- No favorites + no history + loaded: `isNewUser = true` → health-first fallback
- Failed settings read: catch silently; use `{}`; degraded but not broken
- No matching products for a favorite: that favorite is skipped silently
- `parseIngredientToKeyword` returns `null` for unparseable strings: null guard in loop skips the ingredient (safe)

---

## Out of Scope

- Backend-synced purchase history
- Recommendation explanations ("Because you bought X")
- Price-based sorting within a priority tier
- Manual re-ordering by user
- Purchase history size cap (future: retain top 100 by `lastAdded` when `Object.keys(history).length > 200`)
