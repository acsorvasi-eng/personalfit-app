# Shopping List Redesign — Design Spec

## Overview

Replace the current shopping list screen — which has category tabs, emoji shortcut pills, store filter chips, and a separate modal for store matching — with a clean, focused design that surfaces a **smart store recommendation** directly on the main screen and guides users through two clear action paths: "stop by on the way home" or "order delivery."

---

## Problem Statement

The current screen is cluttered:
- Category tabs + emoji shortcuts take up space and add cognitive load
- Store filter pills are redundant with the smart store logic
- The "Find Nearby Stores" modal requires an extra tap and a fake loading delay
- There is no clear distinction between "I'll go myself" and "I'll order it"

---

## Design

### Main Screen

**Header:** "Bevásárlólista" (static title) + item count badge (e.g., "6 termék"). No store subtitle.

**Search bar:** Full-width, ✨ icon, placeholder "Termék hozzáadása...". Below it, search results appear as a flat list with add buttons. When empty, a diet-prioritized browse grid is shown (existing behavior).

**List items:** Each row:
- Left: emoji + product name + "legjobb ár: StoreName" subtext
- Right: price (teal bold) + unit (gray small)
- Checked items: strikethrough + 0.4 opacity, shown at bottom of list

**No tabs. No emoji shortcut pills. No store filter chips.**

**Smart Store Panel** (always visible at bottom when list has ≥ 1 unchecked item):
- Teal gradient card with title "🏪 LEGJOBB BOLT MOST"
- **Best single store row** (highlighted with teal border): store name + "X/Y termék elérhető" + estimated total + missing item count
- **Best 2-store combo row** (shown if it covers more items than single): "Store1 + Store2" + "all items + 2 deliveries" + combined cost + "2 futár" warning in red
- Two buttons: "🚶 Megállok útban" | "🛵 Megrendelem"

Panel is hidden when all items are checked or list is empty.

### Stop-By Sheet (`StoreStopBySheet`)

DSMBottomSheet triggered by "🚶 Megállok útban".

- Header: store emoji (🏪) + "StoreName lista" + item count + estimated total
- Item list:
  - Items assigned to this store: normal row (name + price)
  - Items NOT assigned to this store: red-tinted row with ⚠️ icon + "Nincs StoreName-ban" label
- Footer buttons: "📤 Megosztás" (Web Share API) | "🗺️ Útvonal" (Google Maps link)

### Order Delivery Sheet (`OrderDeliverySheet`)

DSMBottomSheet triggered by "🛵 Megrendelem".

- Header: "Honnan rendeled?" + subtitle "Válassz 1 vagy 2 boltot. 2 bolt = 2 futárdíj."
- **Single-store option** (teal border, shown first):
  - Store name + "X/Y termék · DeliveryPartner · N lei futár"
  - Total = item prices + delivery fee
  - Warning badge if items missing ("⚠️ ItemName nem elérhető")
- **Two-store combo option** (if available and covers more items):
  - "Store1 + Store2" + "all items · 2 futár"
  - Total = item prices + both delivery fees
  - "Every item available, but more expensive shipping"
- **CTA button**: "Megrendelés → StoreName (DeliveryPartner)" — opens external delivery URL

Only delivery-capable stores are shown (Kaufland: Glovo, Carrefour: Bringo, Auchan: Auchan Delivery).

---

## Data Model

No changes to `ShoppingItem` or SettingsService persistence. Existing `storeMatches` logic is extracted to a utility and enhanced.

### Store Recommendation Logic

```typescript
// PersonalFit/src/app/features/shopping/utils/storeRecommendation.ts

export interface StoreRecommendation {
  store: StoreInfo;
  matchCount: number;   // items from this store in list
  totalItems: number;   // total unchecked items
  estimatedTotal: number;  // sum of prices for matched items
  missingItems: ShoppingItem[];  // unchecked items NOT from this store
}

export interface TwoStoreRecommendation {
  stores: [StoreRecommendation, StoreRecommendation];
  combinedMatchCount: number;
  combinedTotal: number;   // item prices only (no delivery)
  combinedDelivery: number; // sum of delivery fees
}

// Groups unchecked items by their product.store, maps to StoreInfo
export function computeStoreRecommendations(
  items: ShoppingItem[]
): StoreRecommendation[]

// Best 2-store combo that covers the most unchecked items
// Only considers pairs where both stores have ≥1 item
export function computeBestTwoStoreCombo(
  recommendations: StoreRecommendation[]
): TwoStoreRecommendation | null

// Build Google Maps routing URL
export function buildMapsUrl(store: StoreInfo): string

// Build delivery URL for a store (Glovo/Bringo/Auchan)
export function buildDeliveryUrl(store: StoreInfo): string | null
```

The existing `storeMatches` in ShoppingList.tsx is replaced by a `useMemo` calling `computeStoreRecommendations`.

---

## Delivery CTA Logic

Existing behavior in ShoppingList.tsx: `navigate('/checkout?store=StoreName')` — routes to the in-app `Checkout.tsx` (multi-step: cart → address → timeslot → payment → confirmation). This is preserved exactly.

The `buildDeliveryUrl(store)` utility is available for future external handoff but is not used for the main CTA in this redesign.

---

## Components

| File | Change |
|------|--------|
| `ShoppingList.tsx` | Remove tabs, pills, shortcuts, old modal. Add SmartStorePanel, wire sheet states. |
| `storeRecommendation.ts` | NEW: pure utility functions for store matching logic |
| `StoreStopBySheet.tsx` | NEW: "stop by" bottom sheet component |
| `OrderDeliverySheet.tsx` | NEW: "order delivery" bottom sheet component |

---

## Out of Scope

- Cross-store product matching (e.g., finding zabpehely at Kaufland when it's currently assigned to Lidl). Items stay assigned to their cheapest store.
- Price comparison across stores for items already in the list.
- Any changes to productDatabase, mealPlanToShoppingList, or SettingsService.

---

## Success Criteria

1. Main screen has no category tabs, no emoji pill shortcuts, no store filter chips
2. Smart Store Panel appears when list has ≥ 1 unchecked item
3. "Megállok útban" opens StoreStopBySheet with correct items and unavailable items highlighted
4. "Megrendelem" opens OrderDeliverySheet with correct delivery options and external link
5. Share button in StopBySheet uses Web Share API
6. Route button opens Google Maps
7. Delivery CTA opens correct external URL
8. Build passes with zero TypeScript errors
9. All existing tests pass
