import { SEED_FOODS, ALTERNATIVE_NAMES } from '../data/seedFoods';

export type FoodStyle = 'sporty' | 'plant' | 'traditional' | 'mediterranean';

const STYLE_CATEGORIES: Record<FoodStyle, string[]> = {
  sporty:        ['Fehérje', 'Tejtermék', 'Tojás', 'Zöldség', 'Gyümölcs'],
  plant:         ['Zöldség', 'Gyümölcs', 'Hüvelyesek', 'Gabona', 'Magvak'],
  traditional:   ['Fehérje', 'Gabona', 'Tejtermék', 'Zöldség', 'Zsír'],
  mediterranean: ['Hal', 'Zöldség', 'Gyümölcs', 'Gabona', 'Olaj'],
};

const UNIVERSAL_CATEGORIES = ['Zöldség', 'Gyümölcs', 'Fűszer'];

export function buildIngredientSelection(
  styles: FoodStyle[],
  allergens: string[],
  alternatives: string[]
): Set<string> {
  // Step 1 — derive effective diet type
  const effectiveDietType =
    styles.includes('plant') && styles.length === 1 ? 'vegetarian' : 'omnivore';

  // Step 2 — build candidate pool
  let candidates = SEED_FOODS.filter(item => {
    if (effectiveDietType === 'vegetarian' && item.vegetarian === false) {
      return false;
    }
    return true;
  });

  // Step 3 — filter by allergens
  const lowerAllergens = allergens.map(a => a.toLowerCase());
  candidates = candidates.filter(item => {
    if (!item.allergens || item.allergens.length === 0) return true;
    return !item.allergens.some(a => lowerAllergens.includes(a.toLowerCase()));
  });

  // Step 4 — apply style-based scoring/filtering
  const styleCategories = new Set<string>();
  for (const style of styles) {
    for (const cat of STYLE_CATEGORIES[style]) {
      styleCategories.add(cat);
    }
  }

  const result = new Set<string>();
  for (const item of candidates) {
    if (!item.category) {
      // No category — include by default
      result.add(item.name);
    } else if (UNIVERSAL_CATEGORIES.includes(item.category)) {
      result.add(item.name);
    } else if (styleCategories.has(item.category)) {
      result.add(item.name);
    }
  }

  // Pre-build for O(1) lookup in Step 5
  const seedNames = new Set(SEED_FOODS.map(f => f.name));

  // Step 5 — add allergen alternatives
  // These are explicit substitutes chosen by the user (e.g. goat dairy instead of cow dairy).
  // They intentionally bypass the allergen filter: the user chose them knowing their own tolerance.
  for (const alt of alternatives) {
    const names = ALTERNATIVE_NAMES[alt];
    if (names) {
      for (const name of names) {
        if (seedNames.has(name)) {
          result.add(name);
        }
      }
    }
  }

  // Step 6 — minimum viable set fallback
  // Fallback items are basic vegetables/grains with no allergens — safe for all profiles.
  if (result.size < 6) {
    return new Set(['Rizs', 'Brokkoli', 'Sárgarépa', 'Alma', 'Burgonya', 'Lencse']);
  }

  // Step 7 — return
  return result;
}
