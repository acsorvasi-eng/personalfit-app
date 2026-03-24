import { Product, StoreName } from '../../../data/productDatabase';
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
 * Pick the lowest-fat product per category, preferring Kaufland.
 * Used as fallback for new users (no favorites and no purchase history).
 */
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

// ─── Smart recommendation engine ─────────────────────────────────────────────

/**
 * STUB — implemented in Task 4.
 */
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
