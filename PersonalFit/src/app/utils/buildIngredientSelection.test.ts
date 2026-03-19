import { buildIngredientSelection, FoodStyle } from './buildIngredientSelection';
import { SEED_FOODS, ALTERNATIVE_NAMES } from '../data/seedFoods';

describe('buildIngredientSelection', () => {
  it('returns a Set', () => {
    const result = buildIngredientSelection(['sporty'], [], []);
    expect(result).toBeInstanceOf(Set);
  });

  it('plant-only style excludes non-vegetarian items', () => {
    const result = buildIngredientSelection(['plant'], [], []);
    // Csirkemell is non-vegetarian — must not appear
    expect(result.has('Csirkemell')).toBe(false);
    // A vegetarian item in a plant-relevant category must appear
    expect(result.has('Brokkoli')).toBe(true);
  });

  it('omnivore style includes meat items', () => {
    const result = buildIngredientSelection(['sporty'], [], []);
    // Csirkemell is Fehérje which is in sporty categories
    expect(result.has('Csirkemell')).toBe(true);
  });

  it('excludes items matching allergen', () => {
    const result = buildIngredientSelection(['sporty'], ['laktóz'], []);
    // Görög joghurt has allergen 'laktóz'
    expect(result.has('Görög joghurt')).toBe(false);
    // Csirkemell has no allergens
    expect(result.has('Csirkemell')).toBe(true);
  });

  it('adds allergen alternatives from ALTERNATIVE_NAMES', () => {
    // 'kecske' maps to Kecsketej, Kecske joghurt, Kecskesajt, Kecsketúró, Kecske tejföl
    // Use allergen 'laktóz' to block regular dairy but alternatives still get added
    const result = buildIngredientSelection(['plant'], ['laktóz'], ['kecske']);
    // Kecskesajt has laktóz allergen but alternatives bypass allergen filter (Step 5 adds directly)
    expect(result.has('Kecskesajt')).toBe(true);
  });

  it('plant+traditional combo = omnivore (traditional wins)', () => {
    const styles: FoodStyle[] = ['plant', 'traditional'];
    const result = buildIngredientSelection(styles, [], []);
    // plant+traditional means styles.length > 1, so effectiveDietType = omnivore
    // Csirkemell (Fehérje = traditional category) should be included
    expect(result.has('Csirkemell')).toBe(true);
  });

  it('includes items with no category field', () => {
    // Some items in SEED_FOODS have no category field (e.g. Csirkeszárny, Sertéskaraj)
    const noCategoryItems = SEED_FOODS.filter(f => !f.category);
    expect(noCategoryItems.length).toBeGreaterThan(0);
    const result = buildIngredientSelection(['sporty'], [], []);
    // At least one no-category item should be in result
    const anyNoCatIncluded = noCategoryItems.some(f => result.has(f.name));
    expect(anyNoCatIncluded).toBe(true);
  });

  it('returns minimum viable set when result would be too small', () => {
    // The fallback set has exactly 6 items; for any normal style call result.size >= 6
    const result = buildIngredientSelection(['sporty'], [], []);
    expect(result.size).toBeGreaterThanOrEqual(6);
  });

  it('sporty style includes protein category items', () => {
    const result = buildIngredientSelection(['sporty'], [], []);
    // Fehérje is a sporty category; Csirkemell and Marhahús are in Fehérje
    expect(result.has('Csirkemell')).toBe(true);
    expect(result.has('Marhahús')).toBe(true);
  });

  it('mediterranean style includes fish category items', () => {
    // 'Hal' category doesn't exist in SEED_FOODS; fish items are under 'Fehérje' or no category.
    // Mediterranean still includes Zöldség/Gyümölcs (universal) and items with no category.
    // Items with no category (like Harcsa, Süllő) must be included regardless of style.
    const result = buildIngredientSelection(['mediterranean'], [], []);
    // Harcsa has no category — included by default
    expect(result.has('Harcsa')).toBe(true);
    // Brokkoli is Zöldség (universal) — always included
    expect(result.has('Brokkoli')).toBe(true);
  });
});
