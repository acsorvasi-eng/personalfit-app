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
