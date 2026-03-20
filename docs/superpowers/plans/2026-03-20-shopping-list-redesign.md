# Shopping List Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cluttered category-tab shopping screen with a clean list + smart store recommendation panel that learns from GPS proximity and the user's actual shopping habits.

**Architecture:** Extract store-matching logic to a pure utility (`storeRecommendation.ts`) with a composite score (coverage 70% + proximity 20% + learned preference 10%). Build two new bottom-sheet components. Rewrite `ShoppingList.tsx` to remove tabs/pills/modal, request geolocation on mount, persist store preferences via SettingsService, and wire up the smart store panel. Data layer (ShoppingItem, SettingsService, productDatabase) is otherwise unchanged.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, DSMBottomSheet (existing), lucide-react, Vitest, Web Geolocation API

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `PersonalFit/src/app/features/shopping/types.ts` | Create | Shared `ShoppingItem` interface |
| `PersonalFit/src/app/utils/storeRecommendation.ts` | Create | Scoring: coverage + GPS distance + learned preference |
| `PersonalFit/src/app/utils/storeRecommendation.test.ts` | Create | Vitest unit tests |
| `PersonalFit/src/app/features/shopping/components/StoreStopBySheet.tsx` | Create | "Stop by on the way" bottom sheet |
| `PersonalFit/src/app/features/shopping/components/OrderDeliverySheet.tsx` | Create | "Order delivery" bottom sheet |
| `PersonalFit/src/app/features/shopping/components/ShoppingList.tsx` | Modify | Remove tabs/pills/modal, add geolocation, preference tracking, Smart Store Panel |

---

## Task 1: Shared Types + Store Recommendation Utility

**Files:**
- Create: `PersonalFit/src/app/features/shopping/types.ts`
- Create: `PersonalFit/src/app/utils/storeRecommendation.ts`
- Create: `PersonalFit/src/app/utils/storeRecommendation.test.ts`

### Background

`ShoppingItem` is currently defined locally in `ShoppingList.tsx` — extract it so the utility can import it without circular deps.

`localStores` from `productDatabase.ts` is an array of `StoreInfo`. Each has: `name`, `logo`, `hasDelivery`, `deliveryPartner?`, `deliveryFee?`, `coordinates: { lat, lng }`, `distanceKm` (static fallback).

**Scoring formula** — three factors, primary sort is always matchCount, tiebreaking and ranking uses composite score:
```
score = matchCount * 10                         // coverage (dominant)
      + max(0, 10 - distanceKm) * 2             // proximity bonus: max +20 for <0.1km, 0 at ≥10km
      + min(preferenceCount, 10) * 1            // preference bonus: max +10 after 10+ visits
```

This means: a store covering 3 items always beats one covering 2, but among equal-coverage stores the closest + most-used wins.

**Preference persistence key:** `"storePreferences"` in SettingsService — stored as JSON: `{ "Kaufland": 7, "Lidl": 2 }`. Incremented every time user taps "Megállok útban" or "Megrendelem" for a store.

**Preferred store threshold:** `preferenceCount >= 3` → show "⭐ Megszokott" badge.

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
  computeDistanceKm,
  buildMapsUrl,
  buildDeliveryUrl,
} from "./storeRecommendation";
import { ShoppingItem } from "../features/shopping/types";
import { Product, StoreInfo } from "../data/productDatabase";

function makeProduct(id: string, store: string, price: number): Product {
  return {
    id, name: id, brand: "", category: "test",
    store: store as any, image: "", unit: "db", defaultQuantity: 1,
    caloriesPer100: 100, price, protein: 10, carbs: 10, fat: 5, tags: [],
  };
}

function makeItem(id: string, store: string, price: number): ShoppingItem {
  return { product: makeProduct(id, store, price), quantity: 1, checked: false };
}

const kauflandStore: StoreInfo = {
  name: "Kaufland", logo: "🏪", hasDelivery: true, deliveryPartner: "Glovo",
  address: "Test", city: "Târgu Mureș", openHours: "8-22",
  coordinates: { lat: 46.545, lng: 24.562 },
  deliveryFee: 14.99, minOrder: 100, distanceKm: 1.2,
};

const lidlStore: StoreInfo = {
  name: "Lidl", logo: "🟡", hasDelivery: false,
  address: "Test", city: "Târgu Mureș", openHours: "7-22",
  coordinates: { lat: 46.550, lng: 24.570 },
  distanceKm: 1.5,
};

describe("computeDistanceKm", () => {
  it("returns ~0 for identical coordinates", () => {
    expect(computeDistanceKm(46.545, 24.562, 46.545, 24.562)).toBeLessThan(0.01);
  });

  it("returns a positive number for different coordinates", () => {
    expect(computeDistanceKm(46.545, 24.562, 46.550, 24.570)).toBeGreaterThan(0);
  });
});

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
  });

  it("sorts by score descending (higher matchCount wins)", () => {
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

  it("preferred store badge threshold: preferenceCount >= 3", () => {
    const items = [makeItem("a", "Kaufland", 10), makeItem("b", "Lidl", 5)];
    const recs = computeStoreRecommendations(items, undefined, { Kaufland: 5 });
    const kaufRec = recs.find((r) => r.store.name === "Kaufland");
    expect(kaufRec!.isPreferred).toBe(true);
  });

  it("isPreferred is false below threshold", () => {
    const items = [makeItem("a", "Kaufland", 10)];
    const recs = computeStoreRecommendations(items, undefined, { Kaufland: 2 });
    expect(recs[0].isPreferred).toBe(false);
  });
});

describe("computeBestTwoStoreCombo", () => {
  it("returns null when fewer than 2 recommendations", () => {
    const items = [makeItem("a", "Kaufland", 10)];
    const recs = computeStoreRecommendations(items);
    expect(computeBestTwoStoreCombo(recs)).toBeNull();
  });

  it("returns null when secondary adds zero new items", () => {
    const items = [makeItem("a", "Kaufland", 10)];
    expect(computeBestTwoStoreCombo(computeStoreRecommendations(items))).toBeNull();
  });

  it("computes combined match count and totals", () => {
    const items = [
      makeItem("a", "Kaufland", 10),
      makeItem("b", "Kaufland", 20),
      makeItem("c", "Lidl", 5),
    ];
    const combo = computeBestTwoStoreCombo(computeStoreRecommendations(items));
    expect(combo).not.toBeNull();
    expect(combo!.combinedMatchCount).toBe(3);
    expect(combo!.combinedTotal).toBe(35);
  });
});

describe("buildMapsUrl", () => {
  it("returns a Google Maps URL with store coordinates", () => {
    const url = buildMapsUrl(kauflandStore);
    expect(url).toContain("maps.google.com");
    expect(url).toContain("46.545");
  });
});

describe("buildDeliveryUrl", () => {
  it("returns null for non-delivery stores", () => {
    expect(buildDeliveryUrl(lidlStore)).toBeNull();
  });

  it("returns a string for delivery stores", () => {
    expect(typeof buildDeliveryUrl(kauflandStore)).toBe("string");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd "PersonalFit" && npx vitest run src/app/utils/storeRecommendation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Create the utility**

Create `PersonalFit/src/app/utils/storeRecommendation.ts`:

```typescript
import { ShoppingItem } from "../features/shopping/types";
import { StoreInfo, localStores } from "../data/productDatabase";

export interface UserLocation {
  lat: number;
  lng: number;
}

export type StorePreferences = Record<string, number>; // storeName → visit count

export interface StoreRecommendation {
  store: StoreInfo;
  matchCount: number;
  totalItems: number;
  estimatedTotal: number;
  availableItems: ShoppingItem[];
  missingItems: ShoppingItem[];
  score: number;
  distanceKm: number;
  preferenceCount: number;
  isPreferred: boolean; // preferenceCount >= 3
}

export interface TwoStoreRecommendation {
  primary: StoreRecommendation;
  secondary: StoreRecommendation;
  combinedMatchCount: number;
  combinedTotal: number;
  combinedDeliveryFee: number;
}

/** Haversine distance in km between two lat/lng points. */
export function computeDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Computes ranked store recommendations from unchecked shopping items.
 *
 * Scoring: coverage (dominant) + proximity bonus + preference bonus.
 * score = matchCount * 10 + max(0, 10 - distanceKm) * 2 + min(prefCount, 10) * 1
 *
 * @param uncheckedItems  Items not yet checked off
 * @param userLocation    Optional GPS fix; falls back to store's static distanceKm
 * @param preferences     Optional visit counts from SettingsService ("storePreferences")
 */
export function computeStoreRecommendations(
  uncheckedItems: ShoppingItem[],
  userLocation?: UserLocation,
  preferences?: StorePreferences
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

      const distanceKm = userLocation
        ? computeDistanceKm(
            userLocation.lat, userLocation.lng,
            store.coordinates.lat, store.coordinates.lng
          )
        : store.distanceKm;

      const preferenceCount = preferences?.[store.name] ?? 0;

      const score =
        availableItems.length * 10 +
        Math.max(0, 10 - distanceKm) * 2 +
        Math.min(preferenceCount, 10) * 1;

      return {
        store,
        matchCount: availableItems.length,
        totalItems: uncheckedItems.length,
        estimatedTotal: Math.round(data.total * 100) / 100,
        availableItems,
        missingItems,
        score,
        distanceKm: Math.round(distanceKm * 10) / 10,
        preferenceCount,
        isPreferred: preferenceCount >= 3,
      };
    })
    .filter((r) => r.matchCount > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Best 2-store combo that maximises total item coverage.
 * Returns null if no secondary store adds new items beyond the primary.
 */
export function computeBestTwoStoreCombo(
  recommendations: StoreRecommendation[]
): TwoStoreRecommendation | null {
  if (recommendations.length < 2) return null;

  const primary = recommendations[0];
  const primaryIds = new Set(primary.availableItems.map((i) => i.product.id));

  const candidates = recommendations.slice(1).map((rec) => ({
    rec,
    additionalCoverage: rec.availableItems.filter(
      (i) => !primaryIds.has(i.product.id)
    ).length,
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

/** External delivery URL for a store, or null if no delivery. */
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

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
cd "PersonalFit" && git add src/app/features/shopping/types.ts src/app/utils/storeRecommendation.ts src/app/utils/storeRecommendation.test.ts
git commit -m "feat: add storeRecommendation utility with GPS + preference scoring"
```

---

## Task 2: StoreStopBySheet Component

**Files:**
- Create: `PersonalFit/src/app/features/shopping/components/StoreStopBySheet.tsx`

### Background

Opens when user taps "🚶 Megállok útban". Splits unchecked items into available (product.store === storeName) and missing (everything else). Missing items shown in a red-tinted row with ⚠️.

Share button uses `navigator.share` (Web Share API) with clipboard fallback.
Route button calls `buildMapsUrl(store)` → opens in `_blank`.

DSMBottomSheet props: `open`, `onClose`, `title?`, `children`, `snapPoint?`. Use `snapPoint="full"`.

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
      } catch { /* user cancelled */ }
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

Expected: no errors.

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

Opens when user taps "🛵 Megrendelem". Shows delivery-capable stores only (`store.hasDelivery === true`). CTA navigates to `/checkout?store=StoreName` (existing in-app Checkout.tsx flow — multi-step cart/address/timeslot/payment).

If the top recommendation has no delivery, `deliveryRec` will be null → show "nem elérhető kiszállítás" message.

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

export function OrderDeliverySheet({ open, onClose, topRecommendation, twoStoreCombo }: Props) {
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
          {deliveryRec && (
            <div className="bg-teal-50 rounded-2xl p-3 border-2 border-teal-600">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-bold text-gray-800">
                    {deliveryRec.store.name}
                    {deliveryRec.isPreferred && (
                      <span className="ml-1.5 text-2xs text-amber-500 font-semibold">⭐ Megszokott</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {deliveryRec.matchCount}/{deliveryRec.totalItems} termék ·{" "}
                    {deliveryRec.store.deliveryPartner} · {deliveryRec.store.deliveryFee} lei futár
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-teal-600">
                    ~{(deliveryRec.estimatedTotal + (deliveryRec.store.deliveryFee ?? 0)).toFixed(0)} lei
                  </div>
                  <div className="text-2xs text-gray-400">termék + futár</div>
                </div>
              </div>
              {deliveryRec.missingItems.length > 0 && (
                <div className="text-xs text-red-500 bg-red-50 rounded-lg px-2 py-1 inline-block">
                  ⚠️ {deliveryRec.missingItems.map((i) => i.product.name).join(", ")} nem elérhető
                </div>
              )}
            </div>
          )}

          {comboAvailable && (
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    {twoStoreCombo!.primary.store.name} + {twoStoreCombo!.secondary.store.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {twoStoreCombo!.combinedMatchCount}/{twoStoreCombo!.primary.totalItems} termék · 2 futár
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-gray-700">
                    ~{(twoStoreCombo!.combinedTotal + twoStoreCombo!.combinedDeliveryFee).toFixed(0)} lei
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

The current file is 853 lines. We are making the following changes:

**Remove** (state variables):
- `showStoreView`, `isLoadingStores`, `selectedCategory`, `selectedStore`

**Remove** (functions/constants):
- `SMART_SUGGESTION_DEFS`, `handleSmartSuggestion`, `handleFindStores`
- `categories` useMemo
- `storeMatches` useMemo (replaced by utility)

**Remove** (JSX sections):
- Category filter tabs
- Emoji suggestion pills
- Store filter chips
- The entire `showStoreView` full-screen modal (~lines 620–851)
- The `handleFindStores` fixed bottom CTA button

**Remove** (lucide imports no longer needed after JSX removal):
`Store`, `Clock`, `ChevronRight`, `Truck`, `Zap`, `BadgeCheck`, `Package`, `Leaf`, `Heart`, `CalendarDays`, `ListChecks`

**Keep** (all data/logic):
- SettingsService persistence for `shoppingItems`
- `searchQuery`, search results, `browseProducts`, `displayProducts`
- `addProduct`, `removeItem`, `toggleItemCheck`, `isInList`
- Meal plan import CTA and `handleAutoPopulateFromMealPlan`
- `totalPrice`, `totalItems`

**Add** (imports):
```typescript
import { ShoppingItem } from "../types";  // replaces local interface
import {
  computeStoreRecommendations,
  computeBestTwoStoreCombo,
  StoreRecommendation,
  TwoStoreRecommendation,
  UserLocation,
  StorePreferences,
} from "../../../utils/storeRecommendation";
import { StoreStopBySheet } from "./StoreStopBySheet";
import { OrderDeliverySheet } from "./OrderDeliverySheet";
```

**Add** (state):
```typescript
const [stopByOpen, setStopByOpen] = useState(false);
const [orderOpen, setOrderOpen] = useState(false);
const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
const [storePreferences, setStorePreferences] = useState<StorePreferences>({});
```

**Add** (effects — load geolocation + preferences on mount):
```typescript
// Load saved store preferences
useEffect(() => {
  getSetting("storePreferences").then((saved) => {
    if (!saved) return;
    try { setStorePreferences(JSON.parse(saved)); } catch { /* ignore */ }
  });
}, []);

// Request GPS location
useEffect(() => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => { /* permission denied or unavailable — silently use static distances */ }
  );
}, []);
```

**Add** (preference recording helper):
```typescript
const recordStoreVisit = (storeName: string) => {
  setStorePreferences((prev) => {
    const next = { ...prev, [storeName]: (prev[storeName] ?? 0) + 1 };
    setSetting("storePreferences", JSON.stringify(next)).catch(() => {});
    return next;
  });
};
```

**Add** (computed values):
```typescript
const uncheckedItems = useMemo(
  () => shoppingItems.filter((i) => !i.checked),
  [shoppingItems]
);

const storeRecommendations = useMemo(
  () => computeStoreRecommendations(
    uncheckedItems,
    userLocation ?? undefined,
    storePreferences
  ),
  [uncheckedItems, userLocation, storePreferences]
);

const topRecommendation = storeRecommendations[0] ?? null;

const twoStoreCombo = useMemo(
  () => computeBestTwoStoreCombo(storeRecommendations),
  [storeRecommendations]
);
```

**Simplify** (no store filter):
```typescript
// displayProducts: remove selectedStore filter
const displayProducts = unfilteredProducts;

// filteredShoppingItems: always all items
const filteredShoppingItems = shoppingItems;
```

### SmartStorePanel component (add before `export function ShoppingList`)

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
          <div className="text-sm font-bold text-gray-800">
            {topRec.store.name}
            {topRec.isPreferred && (
              <span className="ml-1.5 text-2xs text-amber-500 font-semibold">⭐ Megszokott</span>
            )}
          </div>
          <div className="text-2xs text-gray-500">
            {topRec.matchCount}/{uncheckedCount} termék elérhető
            {" · "}{topRec.distanceKm} km
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-extrabold text-teal-600">
            ~{topRec.estimatedTotal.toFixed(0)} lei
          </div>
          {topRec.missingItems.length > 0 && (
            <div className="text-2xs text-gray-400">
              {topRec.missingItems.length} hiányzó
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

### New JSX return structure

```tsx
return (
  <div className="h-full flex flex-col overflow-hidden">
    {/* Header */}
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

    {/* Scrollable body */}
    <div className="flex-1 overflow-y-auto">
      {/* Search bar — keep exactly as-is */}
      ...

      {/* Search results — keep exactly as-is */}
      <AnimatePresence>
        ...search results grid...
      </AnimatePresence>

      {/* Meal plan import CTA — keep exactly as-is */}
      ...

      {/* Shopping list items — keep DSMSwipeAction rows, add store subtitle */}
      <div className="flex flex-col gap-2 px-4 py-2">
        {shoppingItems.map((item) => (
          <DSMSwipeAction key={item.product.id} ...existing props...>
            {/* Inside the item row, under the product name add: */}
            <div className="text-2xs text-gray-400">legjobb ár: {item.product.store}</div>
          </DSMSwipeAction>
        ))}
      </div>

      {/* Smart Store Panel */}
      {topRecommendation && uncheckedItems.length > 0 && (
        <SmartStorePanel
          topRec={topRecommendation}
          twoStoreCombo={twoStoreCombo}
          uncheckedCount={uncheckedItems.length}
          onStopBy={() => {
            recordStoreVisit(topRecommendation.store.name);
            setStopByOpen(true);
          }}
          onOrder={() => {
            recordStoreVisit(topRecommendation.store.name);
            setOrderOpen(true);
          }}
        />
      )}

      <div className="pb-24" />
    </div>

    {/* Sheets — outside scroll container */}
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
  </div>
);
```

### Implementation Steps

- [ ] **Step 1: Update imports** — replace local `ShoppingItem` interface with import from `../types`; add imports for utility, new components; remove unused lucide icons listed above.

- [ ] **Step 2: Remove state variables** — delete `showStoreView`, `isLoadingStores`, `selectedCategory`, `selectedStore`. Add `stopByOpen`, `orderOpen`, `userLocation`, `storePreferences`.

- [ ] **Step 3: Add geolocation + preference effects** — add the two `useEffect` blocks and `recordStoreVisit` helper (code in Background above).

- [ ] **Step 4: Replace computed values** — remove `categories`, `storeMatches`. Simplify `displayProducts` and `filteredShoppingItems` (no store filter). Add `uncheckedItems`, `storeRecommendations`, `topRecommendation`, `twoStoreCombo`.

- [ ] **Step 5: Remove functions** — delete `handleFindStores`, `handleSmartSuggestion`, `SMART_SUGGESTION_DEFS`.

- [ ] **Step 6: Add SmartStorePanel component** — paste the function above immediately before `export function ShoppingList()`.

- [ ] **Step 7: Rewrite JSX** — replace `return (...)` using the new structure. Keep search bar, search results, and meal plan CTA code verbatim. Replace item rows to add the store subtitle. Remove category tabs, emoji pills, store filter chips, and the full `showStoreView` modal. Add `SmartStorePanel` and mount both sheets at the root.

- [ ] **Step 8: Verify TypeScript compiles with zero errors**

```bash
cd "PersonalFit" && npx tsc --noEmit 2>&1
```

- [ ] **Step 9: Run all tests**

```bash
cd "PersonalFit" && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
cd "PersonalFit" && git add src/app/features/shopping/components/ShoppingList.tsx
git commit -m "feat: redesign shopping list — GPS + preference scoring, smart store panel, stop-by and order sheets"
```

---

## Final Verification Checklist

- [ ] No category tabs on main screen
- [ ] No emoji pill shortcuts on main screen
- [ ] No store filter chips on main screen
- [ ] Smart Store Panel visible when unchecked items exist
- [ ] Smart Store Panel hidden when list is empty or all items checked
- [ ] "⭐ Megszokott" badge appears after 3+ visits to a store
- [ ] Distance shown in panel (km, GPS if permitted, static fallback if not)
- [ ] "🚶 Megállok útban" opens StoreStopBySheet
- [ ] StoreStopBySheet: available items normal, unavailable items in red
- [ ] StoreStopBySheet: Share button triggers share/clipboard
- [ ] StoreStopBySheet: Route button opens Google Maps
- [ ] "🛵 Megrendelem" opens OrderDeliverySheet
- [ ] OrderDeliverySheet: shows delivery options with fee breakdown
- [ ] OrderDeliverySheet: CTA navigates to `/checkout?store=...`
- [ ] Item rows show "legjobb ár: StoreName" subtitle
- [ ] Search, add, swipe-to-delete, check/uncheck all work
- [ ] Meal plan import CTA works
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx vitest run` — all tests pass
