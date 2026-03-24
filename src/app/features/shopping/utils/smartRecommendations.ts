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
