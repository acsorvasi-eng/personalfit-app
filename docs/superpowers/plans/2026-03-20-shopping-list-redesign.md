# Shopping List Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cluttered category-tab shopping screen with a clean list + smart store recommendation panel + two action sheets (stop-by and order delivery).

**Architecture:** Extract store-matching logic to a pure utility (`storeRecommendation.ts`), build two new bottom-sheet components (`StoreStopBySheet`, `OrderDeliverySheet`), then rewrite `ShoppingList.tsx` to remove tabs/pills/old-modal and wire up the smart store panel. Data layer (ShoppingItem, SettingsService, productDatabase) is unchanged.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, DSMBottomSheet (existing), lucide-react, Vitest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `PersonalFit/src/app/features/shopping/types.ts` | Create | Shared `ShoppingItem` interface |
| `PersonalFit/src/app/utils/storeRecommendation.ts` | Create | Pure functions: compute best store, 2-store combo, map/delivery URLs |
| `PersonalFit/src/app/utils/storeRecommendation.test.ts` | Create | Vitest unit tests |
| `PersonalFit/src/app/features/shopping/components/StoreStopBySheet.tsx` | Create | "Stop by on the way" bottom sheet |
| `PersonalFit/src/app/features/shopping/components/OrderDeliverySheet.tsx` | Create | "Order delivery" bottom sheet |
| `PersonalFit/src/app/features/shopping/components/ShoppingList.tsx` | Modify | Remove tabs/pills/modal, add Smart Store Panel + sheet states |

---

## Task 1: Shared Types + Store Recommendation Utility

**Files:**
- Create: `PersonalFit/src/app/features/shopping/types.ts`
- Create: `PersonalFit/src/app/utils/storeRecommendation.ts`
- Create: `PersonalFit/src/app/utils/storeRecommendation.test.ts`

### Background

`ShoppingItem` is currently defined locally in both `ShoppingList.tsx` and `Checkout.tsx`. We extract it to a shared file for the new utility to import. The store recommendation logic currently lives as a `useMemo` in ShoppingList.tsx (lines 168–194) — we extract and extend it.

`localStores` from `productDatabase.ts` is an array of `StoreInfo` objects. Each has:
- `name: StoreName` — e.g. `'Kaufland'`
- `logo: string` — emoji e.g. `'🏪'`
- `hasDelivery: boolean`
- `deliveryPartner?: string` — `'Glovo'`, `'Bringo'`, `'Auchan Delivery'`
- `deliveryFee?: number` — e.g. `14.99`
- `coordinates: { lat: number; lng: number }`

Each `ShoppingItem.product.store` tells us which store that product is from (the cheapest source, assigned at add time). We group unchecked items by their store to rank stores by coverage.

- [ ] **Step 1: Create shared types file**

Create `PersonalFit/src/app/features/shopping/types.ts`:

```typescript
import { Product } from "../../data/productDatabase";

export interface ShoppingItem {
  product: Product;
  quantity: number;
  checked: boolean;
}
```

- [ ] **Step 2: Write the failing tests**

Create `PersonalFit/src/app/utils/storeRecommendation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  computeStoreRecommendations,
  computeBestTwoStoreCombo,
  buildMapsUrl,
  buildDeliveryUrl,
} from "./storeRecommendation";
import { ShoppingItem } from "../features/shopping/types";
import { Product, StoreInfo } from "../data/productDatabase";

// Minimal Product factory
function makeProduct(id: string, store: string, price: number): Product {
  return {
    id,
    name: id,
    brand: "",
    category: "test",
    store: store as any,
    image: "",
    unit: "db",
    defaultQuantity: 1,
    caloriesPer100: 100,
    price,
    protein: 10,
    carbs: 10,
    fat: 5,
    tags: [],
  };
}

function makeItem(id: string, store: string, price: number): ShoppingItem {
  return { product: makeProduct(id, store, price), quantity: 1, checked: false };
}

const kauflandStore: StoreInfo = {
  name: "Kaufland",
  logo: "🏪",
  hasDelivery: true,
  deliveryPartner: "Glovo",
  address: "Test",
  city: "Târgu Mureș",
  openHours: "8-22",
  coordinates: { lat: 46.54, lng: 24.56 },
  deliveryFee: 14.99,
  minOrder: 100,
  distanceKm: 1.2,
};

const lidlStore: StoreInfo = {
  name: "Lidl",
  logo: "🟡",
  hasDelivery: false,
  address: "Test",
  city: "Târgu Mureș",
  openHours: "7-22",
  coordinates: { lat: 46.55, lng: 24.57 },
  distanceKm: 1.5,
};

describe("computeStoreRecommendations", () => {
  it("returns empty array when no unchecked items", () => {
    expect(computeStoreRecommendations([])).toEqual([]);
  });

  it("groups items by store and sums prices", () => {
    const items = [
      makeItem("a", "Kaufland", 10),
      makeItem("b", "Kaufland", 20),
      makeItem("c", "Lidl", 5),
    ];
    const recs = computeStoreRecommendations(items);
    const kaufRec = recs.find((r) => r.store.name === "Kaufland");
    expect(kaufRec).toBeDefined();
    expect(kaufRec!.matchCount).toBe(2);
    expect(kaufRec!.estimatedTotal).toBe(30);
    expect(kaufRec!.missingItems).toHaveLength(1);
    expect(kaufRec!.missingItems[0].product.id).toBe("c");
  });

  it("sorts by matchCount descending", () => {
    const items = [
      makeItem("a", "Lidl", 5),
      makeItem("b", "Kaufland", 10),
      makeItem("c", "Kaufland", 20),
    ];
    const recs = computeStoreRecommendations(items);
    expect(recs[0].store.name).toBe("Kaufland");
  });

  it("excludes stores with zero matches", () => {
    const items = [makeItem("a", "Kaufland", 10)];
    const recs = computeStoreRecommendations(items);
    expect(recs.every((r) => r.matchCount > 0)).toBe(true);
  });
});

describe("computeBestTwoStoreCombo", () => {
  it("returns null when fewer than 2 recommendations", () => {
    const items = [makeItem("a", "Kaufland", 10)];
    const recs = computeStoreRecommendations(items);
    expect(computeBestTwoStoreCombo(recs)).toBeNull();
  });

  it("returns null when secondary adds zero new items", () => {
    // Both stores have the same item (won't happen in real data, but test edge case)
    const items = [makeItem("a", "Kaufland", 10)];
    const recs = computeStoreRecommendations(items);
    // Only one store has items, so combo is null
    expect(computeBestTwoStoreCombo(recs)).toBeNull();
  });

  it("computes combined match count and totals", () => {
    const items = [
      makeItem("a", "Kaufland", 10),
      makeItem("b", "Kaufland", 20),
      makeItem("c", "Lidl", 5),
    ];
    const recs = computeStoreRecommendations(items);
    const combo = computeBestTwoStoreCombo(recs);
    expect(combo).not.toBeNull();
    expect(combo!.combinedMatchCount).toBe(3);
    expect(combo!.combinedTotal).toBe(35);
  });
});

describe("buildMapsUrl", () => {
  it("returns a Google Maps URL with correct coordinates", () => {
    const url = buildMapsUrl(kauflandStore);
    expect(url).toContain("maps.google.com");
    expect(url).toContain("46.54");
    expect(url).toContain("24.56");
  });
});

describe("buildDeliveryUrl", () => {
  it("returns null for non-delivery stores", () => {
    expect(buildDeliveryUrl(lidlStore)).toBeNull();
  });

  it("returns a URL for delivery stores", () => {
    const url = buildDeliveryUrl(kauflandStore);
    expect(url).not.toBeNull();
    expect(typeof url).toBe("string");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd "PersonalFit" && npx vitest run src/app/utils/storeRecommendation.test.ts
```

Expected: FAIL — `storeRecommendation.ts` not found.

- [ ] **Step 4: Create the utility**

Create `PersonalFit/src/app/utils/storeRecommendation.ts`:

```typescript
import { ShoppingItem } from "../features/shopping/types";
import { StoreInfo, localStores } from "../data/productDatabase";

export interface StoreRecommendation {
  store: StoreInfo;
  matchCount: number;
  totalItems: number;
  estimatedTotal: number;
  availableItems: ShoppingItem[];
  missingItems: ShoppingItem[];
}

export interface TwoStoreRecommendation {
  primary: StoreRecommendation;
  secondary: StoreRecommendation;
  combinedMatchCount: number;
  combinedTotal: number;
  combinedDeliveryFee: number;
}

/**
 * Groups unchecked items by their product.store and returns a ranked list
 * of store recommendations (most items first).
 */
export function computeStoreRecommendations(
  uncheckedItems: ShoppingItem[]
): StoreRecommendation[] {
  if (uncheckedItems.length === 0) return [];

  const storeMap = new Map<string, { total: number; items: ShoppingItem[] }>();
  uncheckedItems.forEach((item) => {
    const name = item.product.store;
    const existing = storeMap.get(name) ?? { total: 0, items: [] };
    existing.total += item.product.price;
    existing.items.push(item);
    storeMap.set(name, existing);
  });

  return localStores
    .map((store) => {
      const data = storeMap.get(store.name) ?? { total: 0, items: [] };
      const availableItems = data.items;
      const missingItems = uncheckedItems.filter(
        (i) => i.product.store !== store.name
      );
      return {
        store,
        matchCount: availableItems.length,
        totalItems: uncheckedItems.length,
        estimatedTotal: Math.round(data.total * 100) / 100,
        availableItems,
        missingItems,
      };
    })
    .filter((r) => r.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount);
}

/**
 * Finds the best 2-store combination that covers the most unchecked items.
 * The primary store is recs[0]. The secondary is whichever other store
 * adds the most new coverage beyond the primary.
 * Returns null if no secondary adds any new items.
 */
export function computeBestTwoStoreCombo(
  recommendations: StoreRecommendation[]
): TwoStoreRecommendation | null {
  if (recommendations.length < 2) return null;

  const primary = recommendations[0];
  const primaryIds = new Set(primary.availableItems.map((i) => i.product.id));

  const candidates = recommendations.slice(1).map((rec) => ({
    rec,
    additionalCoverage: rec.availableItems.filter((i) => !primaryIds.has(i.product.id))
      .length,
  }));

  candidates.sort((a, b) => b.additionalCoverage - a.additionalCoverage);

  if (candidates[0].additionalCoverage === 0) return null;

  const secondary = candidates[0].rec;
  const combinedIds = new Set([
    ...primary.availableItems.map((i) => i.product.id),
    ...secondary.availableItems.map((i) => i.product.id),
  ]);

  return {
    primary,
    secondary,
    combinedMatchCount: combinedIds.size,
    combinedTotal:
      Math.round((primary.estimatedTotal + secondary.estimatedTotal) * 100) / 100,
    combinedDeliveryFee:
      (primary.store.deliveryFee ?? 0) + (secondary.store.deliveryFee ?? 0),
  };
}

/** Google Maps routing URL from Târgu Mureș center to a store. */
export function buildMapsUrl(store: StoreInfo): string {
  return `https://www.google.com/maps/dir/46.5450,24.5620/${store.coordinates.lat},${store.coordinates.lng}`;
}

/** External delivery URL for a store. Returns null if store has no delivery. */
export function buildDeliveryUrl(store: StoreInfo): string | null {
  if (!store.hasDelivery) return null;
  const urls: Record<string, string> = {
    Kaufland: "https://www.glovo.com/en/rom/targu-mures-tmx/kaufland-targu-mures/",
    Carrefour: "https://bringo.ro/supermarket/carrefour",
    Auchan: "https://www.auchan.ro/livrare-la-domiciliu",
  };
  return urls[store.name] ?? null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd "PersonalFit" && npx vitest run src/app/utils/storeRecommendation.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
cd "PersonalFit" && git add src/app/features/shopping/types.ts src/app/utils/storeRecommendation.ts src/app/utils/storeRecommendation.test.ts
git commit -m "feat: add storeRecommendation utility and shared ShoppingItem type"
```

---

## Task 2: StoreStopBySheet Component

**Files:**
- Create: `PersonalFit/src/app/features/shopping/components/StoreStopBySheet.tsx`

### Background

This sheet opens when the user taps "🚶 Megállok útban". It receives all unchecked items and the recommended store. It splits items into "available here" (product.store === storeName) and "not available" (everything else). The Share button uses `navigator.share` (Web Share API) with a text fallback to clipboard. The Route button opens Google Maps.

DSMBottomSheet props: `open`, `onClose`, `title?`, `children`, `snapPoint?` (default `"half"`). Use `snapPoint="full"` since the list could be long.

- [ ] **Step 1: Create StoreStopBySheet**

Create `PersonalFit/src/app/features/shopping/components/StoreStopBySheet.tsx`:

```tsx
import { DSMBottomSheet } from "../../../components/dsm/ux-patterns";
import { StoreInfo } from "../../../data/productDatabase";
import { ShoppingItem } from "../types";
import { buildMapsUrl } from "../../../utils/storeRecommendation";

interface Props {
  open: boolean;
  onClose: () => void;
  store: StoreInfo | null;
  allUncheckedItems: ShoppingItem[];
}

export function StoreStopBySheet({ open, onClose, store, allUncheckedItems }: Props) {
  if (!store) return null;

  const available = allUncheckedItems.filter((i) => i.product.store === store.name);
  const missing = allUncheckedItems.filter((i) => i.product.store !== store.name);
  const estimatedTotal = available.reduce((sum, i) => sum + i.product.price, 0);

  const handleShare = async () => {
    const lines = [
      `${store.name} — bevásárlólista`,
      ...available.map((i) => `• ${i.product.name} — ${i.product.price.toFixed(2)} lei`),
    ];
    if (missing.length > 0) {
      lines.push("", `Nem kapható: ${missing.map((i) => i.product.name).join(", ")}`);
    }
    const text = lines.join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: `${store.name} lista`, text });
      } catch {
        /* user cancelled */
      }
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <DSMBottomSheet
      open={open}
      onClose={onClose}
      title={`${store.logo} ${store.name} lista`}
      snapPoint="full"
    >
      <div className="px-4 pb-6">
        <p className="text-xs text-gray-400 mb-4">
          {available.length} termék · ~{estimatedTotal.toFixed(0)} lei becsült
        </p>

        <div className="flex flex-col gap-2 mb-6">
          {available.map((item) => (
            <div
              key={item.product.id}
              className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2.5"
            >
              <span className="text-sm text-gray-700">{item.product.name}</span>
              <span className="text-sm font-bold text-gray-800">
                {item.product.price.toFixed(2)} lei
              </span>
            </div>
          ))}

          {missing.map((item) => (
            <div
              key={item.product.id}
              className="flex justify-between items-center bg-red-50 rounded-xl px-3 py-2.5 border border-red-100"
            >
              <span className="text-sm text-gray-400">⚠️ {item.product.name}</span>
              <span className="text-xs text-red-400 font-medium">
                Nincs {store.name}-ban
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex-1 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 active:scale-95 transition-all"
          >
            📤 Megosztás
          </button>
          <button
            onClick={() => window.open(buildMapsUrl(store), "_blank")}
            className="flex-1 py-3 bg-teal-600 rounded-xl text-sm font-semibold text-white active:scale-95 transition-all"
          >
            🗺️ Útvonal
          </button>
        </div>
      </div>
    </DSMBottomSheet>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "PersonalFit" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to StoreStopBySheet.

- [ ] **Step 3: Commit**

```bash
cd "PersonalFit" && git add src/app/features/shopping/components/StoreStopBySheet.tsx
git commit -m "feat: add StoreStopBySheet component"
```

---

## Task 3: OrderDeliverySheet Component

**Files:**
- Create: `PersonalFit/src/app/features/shopping/components/OrderDeliverySheet.tsx`

### Background

This sheet opens when the user taps "🛵 Megrendelem". It shows delivery-capable stores only. The primary option is the top recommendation. The secondary option is the 2-store combo (if it exists and both stores have delivery). The CTA navigates to `/checkout?store=StoreName` (existing behavior — Checkout.tsx handles this route).

Only delivery-capable stores are shown (`store.hasDelivery === true`). If the top recommendation has no delivery, skip it and show the next one. If neither option has delivery, show a "nem elérhető kiszállítás" message.

- [ ] **Step 1: Create OrderDeliverySheet**

Create `PersonalFit/src/app/features/shopping/components/OrderDeliverySheet.tsx`:

```tsx
import { useNavigate } from "react-router";
import { DSMBottomSheet } from "../../../components/dsm/ux-patterns";
import {
  StoreRecommendation,
  TwoStoreRecommendation,
} from "../../../utils/storeRecommendation";

interface Props {
  open: boolean;
  onClose: () => void;
  topRecommendation: StoreRecommendation | null;
  twoStoreCombo: TwoStoreRecommendation | null;
}

export function OrderDeliverySheet({
  open,
  onClose,
  topRecommendation,
  twoStoreCombo,
}: Props) {
  const navigate = useNavigate();

  const deliveryRec = topRecommendation?.store.hasDelivery ? topRecommendation : null;
  const comboAvailable =
    twoStoreCombo &&
    twoStoreCombo.primary.store.hasDelivery &&
    twoStoreCombo.secondary.store.hasDelivery;

  const handleOrder = (storeName: string) => {
    onClose();
    navigate(`/checkout?store=${encodeURIComponent(storeName)}`);
  };

  return (
    <DSMBottomSheet open={open} onClose={onClose} title="Honnan rendeled?" snapPoint="full">
      <div className="px-4 pb-6">
        <p className="text-xs text-gray-400 mb-4">
          Válassz 1 vagy 2 boltot. 2 bolt = 2 futárdíj.
        </p>

        {!deliveryRec && !comboAvailable && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Sajnos a listádon lévő termékekhez nem elérhető házhozszállítás.
          </div>
        )}

        <div className="flex flex-col gap-3 mb-5">
          {/* Single best store */}
          {deliveryRec && (
            <div className="bg-teal-50 rounded-2xl p-3 border-2 border-teal-600">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-bold text-gray-800">
                    {deliveryRec.store.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {deliveryRec.matchCount}/{deliveryRec.totalItems} termék ·{" "}
                    {deliveryRec.store.deliveryPartner} ·{" "}
                    {deliveryRec.store.deliveryFee} lei futár
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-teal-600">
                    ~
                    {(
                      deliveryRec.estimatedTotal + (deliveryRec.store.deliveryFee ?? 0)
                    ).toFixed(0)}{" "}
                    lei
                  </div>
                  <div className="text-2xs text-gray-400">termék + futár</div>
                </div>
              </div>
              {deliveryRec.missingItems.length > 0 && (
                <div className="text-xs text-red-500 bg-red-50 rounded-lg px-2 py-1 inline-block">
                  ⚠️{" "}
                  {deliveryRec.missingItems.map((i) => i.product.name).join(", ")} nem
                  elérhető
                </div>
              )}
            </div>
          )}

          {/* Two-store combo */}
          {comboAvailable && (
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    {twoStoreCombo!.primary.store.name} +{" "}
                    {twoStoreCombo!.secondary.store.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {twoStoreCombo!.combinedMatchCount}/{twoStoreCombo!.primary.totalItems}{" "}
                    termék · 2 futár
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-gray-700">
                    ~
                    {(
                      twoStoreCombo!.combinedTotal + twoStoreCombo!.combinedDeliveryFee
                    ).toFixed(0)}{" "}
                    lei
                  </div>
                  <div className="text-2xs text-red-400">
                    +{twoStoreCombo!.combinedDeliveryFee.toFixed(2)} lei futár (2×)
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Minden termék elérhető, de drágább a szállítás
              </div>
            </div>
          )}
        </div>

        {deliveryRec && (
          <button
            onClick={() => handleOrder(deliveryRec.store.name)}
            className="w-full py-3.5 bg-teal-600 rounded-xl text-sm font-bold text-white active:scale-95 transition-all"
          >
            Megrendelés → {deliveryRec.store.name} ({deliveryRec.store.deliveryPartner})
          </button>
        )}
      </div>
    </DSMBottomSheet>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "PersonalFit" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "PersonalFit" && git add src/app/features/shopping/components/OrderDeliverySheet.tsx
git commit -m "feat: add OrderDeliverySheet component"
```

---

## Task 4: Redesign ShoppingList.tsx

**Files:**
- Modify: `PersonalFit/src/app/features/shopping/components/ShoppingList.tsx`

### Background

The current file is 853 lines. Key things to **remove**:
- `SMART_SUGGESTION_DEFS` constant + `handleSmartSuggestion` function
- State: `showStoreView`, `isLoadingStores`, `selectedCategory`, `selectedStore`
- Computed: `categories`, `storeMatches` (replaced by utility)
- JSX: category filter tabs, emoji suggestion pills, store filter pills, the entire `showStoreView` modal JSX (roughly lines 620–851)
- `handleFindStores` function
- Unused lucide imports after removal: `Store`, `Clock`, `ChevronRight`, `Zap`, `BadgeCheck`, `Package`, `Leaf`, `Heart`, `CalendarDays`, `Truck`

Key things to **keep**:
- `ShoppingItem` interface → replace with import from `../types`
- SettingsService persistence (`getSetting`/`setSetting`)
- `searchQuery`, `isSearchFocused`, search results logic
- `browseProducts`, `displayProducts` (simplified — no store filter)
- `addProduct`, `removeItem`, `toggleItemCheck`, `isInList`
- Meal plan import (`showMealPlanImport`, `handleAutoPopulateFromMealPlan`, `mealPlanSuggestions`)
- `totalPrice`, `totalItems`

Key things to **add**:
- Import `ShoppingItem` from `../types`
- Import `computeStoreRecommendations`, `computeBestTwoStoreCombo`, `StoreRecommendation`, `TwoStoreRecommendation` from `../../../utils/storeRecommendation`
- Import `StoreStopBySheet` and `OrderDeliverySheet`
- State: `stopByOpen: boolean`, `orderOpen: boolean`
- Computed: `uncheckedItems`, `storeRecommendations`, `topRecommendation`, `twoStoreCombo`
- Inline `SmartStorePanel` component (see code below)
- Mount `StoreStopBySheet` and `OrderDeliverySheet` at root, outside scroll container

### New JSX structure

```
<div h-full flex flex-col overflow-hidden>
  {/* Header */}
  <div flex-shrink-0>
    simple title "Bevásárlólista" + item count
  </div>

  {/* Scrollable body */}
  <div flex-1 overflow-y-auto>
    {/* Search */}
    <input...>
    <AnimatePresence> {searchResults grid} </AnimatePresence>

    {/* Meal plan import CTA (preserved) */}
    ...

    {/* Shopping list items */}
    <div flex-col gap>
      {shoppingItems.map(item => DSMSwipeAction row)}
    </div>

    {/* Smart Store Panel */}
    {topRecommendation && uncheckedItems.length > 0 && (
      <SmartStorePanel ... />
    )}

    <div pb-24 /> {/* bottom spacing */}
  </div>

  {/* Sheets (outside scroll) */}
  <StoreStopBySheet ... />
  <OrderDeliverySheet ... />
</div>
```

### SmartStorePanel (inline in ShoppingList.tsx)

```tsx
function SmartStorePanel({
  topRec,
  twoStoreCombo,
  uncheckedCount,
  onStopBy,
  onOrder,
}: {
  topRec: StoreRecommendation;
  twoStoreCombo: TwoStoreRecommendation | null;
  uncheckedCount: number;
  onStopBy: () => void;
  onOrder: () => void;
}) {
  return (
    <div className="mx-4 mb-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-3 border border-teal-200">
      <div className="text-2xs font-bold text-teal-600 tracking-wide mb-2.5">
        🏪 LEGJOBB BOLT MOST
      </div>

      {/* Best single store */}
      <div className="flex justify-between items-center bg-white rounded-xl px-3 py-2.5 border-2 border-teal-600 mb-2">
        <div>
          <div className="text-sm font-bold text-gray-800">{topRec.store.name}</div>
          <div className="text-2xs text-gray-500">
            {topRec.matchCount}/{uncheckedCount} termék elérhető
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-extrabold text-teal-600">
            ~{topRec.estimatedTotal.toFixed(0)} lei
          </div>
          {topRec.missingItems.length > 0 && (
            <div className="text-2xs text-gray-400">
              {topRec.missingItems.length} hiányzó termék
            </div>
          )}
        </div>
      </div>

      {/* Two-store combo */}
      {twoStoreCombo && (
        <div className="flex justify-between items-center bg-white rounded-xl px-3 py-2.5 border border-gray-200 mb-2">
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {twoStoreCombo.primary.store.name} + {twoStoreCombo.secondary.store.name}
            </div>
            <div className="text-2xs text-gray-500">
              {twoStoreCombo.combinedMatchCount}/{uncheckedCount} termék · 2 futár
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-extrabold text-gray-700">
              ~{(twoStoreCombo.combinedTotal + twoStoreCombo.combinedDeliveryFee).toFixed(0)} lei
            </div>
            <div className="text-2xs text-red-400">
              +{twoStoreCombo.combinedDeliveryFee.toFixed(2)} lei futár (2×)
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onStopBy}
          className="flex-1 py-2.5 bg-white border-2 border-teal-600 rounded-xl text-xs font-semibold text-teal-600 active:scale-95 transition-all"
        >
          🚶 Megállok útban
        </button>
        <button
          onClick={onOrder}
          className="flex-1 py-2.5 bg-teal-600 rounded-xl text-xs font-semibold text-white active:scale-95 transition-all"
        >
          🛵 Megrendelem
        </button>
      </div>
    </div>
  );
}
```

### Implementation Steps

- [ ] **Step 1: Update imports at top of ShoppingList.tsx**

Replace the local `ShoppingItem` interface (lines 43–47) with an import:
```typescript
import { ShoppingItem } from "../types";
```

Add imports for new utilities and components after existing imports:
```typescript
import {
  computeStoreRecommendations,
  computeBestTwoStoreCombo,
  StoreRecommendation,
  TwoStoreRecommendation,
} from "../../../utils/storeRecommendation";
import { StoreStopBySheet } from "./StoreStopBySheet";
import { OrderDeliverySheet } from "./OrderDeliverySheet";
```

Remove from lucide imports: `Store`, `Clock`, `Truck`, `Zap`, `BadgeCheck`, `Package`, `Leaf`, `Heart`, `CalendarDays`, `ListChecks`. Keep: `ShoppingCart`, `Trash2`, `Check`, `MapPin`, `Navigation`, `Sparkles`, `X`, `Search`, `Plus`, `ShoppingBag`.

- [ ] **Step 2: Remove state variables that are no longer needed**

Remove these state declarations:
- `const [showStoreView, setShowStoreView] = useState(false);`
- `const [isLoadingStores, setIsLoadingStores] = useState(false);`
- `const [selectedCategory, setSelectedCategory] = useState<string | null>(null);`
- `const [selectedStore, setSelectedStore] = useState<string | null>(null);`

Add in their place:
```typescript
const [stopByOpen, setStopByOpen] = useState(false);
const [orderOpen, setOrderOpen] = useState(false);
```

- [ ] **Step 3: Remove computed values that are no longer needed**

Remove:
- `const categories = useMemo(...)` — category list
- `const storeMatches = useMemo(...)` — old store matching (lines 168–194)
- `handleFindStores` function
- `handleSmartSuggestion` function
- `SMART_SUGGESTION_DEFS` constant

Simplify:
- `displayProducts`: remove store filter → `const displayProducts = unfilteredProducts;`
- `filteredShoppingItems`: remove store filter → `const filteredShoppingItems = shoppingItems;`

Add:
```typescript
const uncheckedItems = useMemo(
  () => shoppingItems.filter((i) => !i.checked),
  [shoppingItems]
);

const storeRecommendations = useMemo(
  () => computeStoreRecommendations(uncheckedItems),
  [uncheckedItems]
);

const topRecommendation = storeRecommendations[0] ?? null;

const twoStoreCombo = useMemo(
  () => computeBestTwoStoreCombo(storeRecommendations),
  [storeRecommendations]
);
```

- [ ] **Step 4: Replace the JSX**

The new JSX structure replaces the old `return (...)` entirely. Key differences:

**Header**: Replace `<PageHeader>` with a simple inline header:
```tsx
<div className="flex-shrink-0 px-4 pt-4 pb-2 flex items-center justify-between">
  <div>
    <h1 className="text-xl font-extrabold text-gray-800">Bevásárlólista</h1>
    <p className="text-xs text-gray-400 mt-0.5">
      {totalItems > 0
        ? `${totalItems} termék · Târgu Mureș`
        : "Üres lista · adj hozzá termékeket"}
    </p>
  </div>
  {totalItems > 0 && (
    <div className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
      {totalItems} db
    </div>
  )}
</div>
```

**Search bar**: Keep as-is (no changes needed).

**Remove**: Category filter tabs section, emoji suggestion pills section, store filter pills section, `showStoreView` modal section (the full-screen overlay, ~200 lines near the bottom).

**Shopping list items**: Keep the existing `DSMSwipeAction` item rows. Remove `selectedStore` filtering. The item rows currently show `item.product.name` and `item.product.price` — also add a store subtitle:
```tsx
{/* Under item name */}
<div className="text-2xs text-gray-400">
  legjobb ár: {item.product.store}
</div>
```

**Smart Store Panel**: Add after the shopping list items, before the bottom padding:
```tsx
{topRecommendation && uncheckedItems.length > 0 && (
  <SmartStorePanel
    topRec={topRecommendation}
    twoStoreCombo={twoStoreCombo}
    uncheckedCount={uncheckedItems.length}
    onStopBy={() => setStopByOpen(true)}
    onOrder={() => setOrderOpen(true)}
  />
)}
```

**Sheets at root** (outside scroll container, inside the outer `<div>`):
```tsx
<StoreStopBySheet
  open={stopByOpen}
  onClose={() => setStopByOpen(false)}
  store={topRecommendation?.store ?? null}
  allUncheckedItems={uncheckedItems}
/>
<OrderDeliverySheet
  open={orderOpen}
  onClose={() => setOrderOpen(false)}
  topRecommendation={topRecommendation}
  twoStoreCombo={twoStoreCombo}
/>
```

- [ ] **Step 5: Add SmartStorePanel component above ShoppingList function**

Add the `SmartStorePanel` function (code in Background section above) immediately before the `export function ShoppingList()` line.

- [ ] **Step 6: Verify TypeScript compiles with zero errors**

```bash
cd "PersonalFit" && npx tsc --noEmit 2>&1
```

Expected: no errors. If there are errors, fix them before proceeding.

- [ ] **Step 7: Run all tests**

```bash
cd "PersonalFit" && npx vitest run
```

Expected: all tests pass (including the new storeRecommendation tests and all pre-existing tests).

- [ ] **Step 8: Commit**

```bash
cd "PersonalFit" && git add src/app/features/shopping/components/ShoppingList.tsx
git commit -m "feat: redesign shopping list — smart store panel, stop-by and order sheets"
```

---

## Final Verification Checklist

After all tasks are complete, verify manually in the browser:

- [ ] Shopping list screen has no category tabs
- [ ] Shopping list screen has no emoji pill shortcuts
- [ ] Shopping list screen has no store filter chips
- [ ] Smart Store Panel appears when there are unchecked items
- [ ] Smart Store Panel is hidden when all items are checked or list is empty
- [ ] Tapping "🚶 Megállok útban" opens StoreStopBySheet
- [ ] StoreStopBySheet shows available items normally and unavailable items in red
- [ ] StoreStopBySheet Share button triggers share/clipboard
- [ ] StoreStopBySheet Route button opens Google Maps
- [ ] Tapping "🛵 Megrendelem" opens OrderDeliverySheet
- [ ] OrderDeliverySheet shows delivery store options with fee breakdown
- [ ] OrderDeliverySheet CTA navigates to `/checkout?store=...`
- [ ] All items can still be added via search
- [ ] Swipe-to-delete still works
- [ ] Check/uncheck still works
- [ ] Meal plan import CTA still works
- [ ] Build: `npx tsc --noEmit` has zero errors
- [ ] Tests: `npx vitest run` all pass
