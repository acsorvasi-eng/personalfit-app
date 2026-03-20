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
  return `https://maps.google.com/maps/dir/46.5450,24.5620/${store.coordinates.lat},${store.coordinates.lng}`;
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
