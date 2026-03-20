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
