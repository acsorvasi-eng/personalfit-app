import { buildIngredientSelection, FoodStyle } from './buildIngredientSelection';
import { SEED_FOODS, ALTERNATIVE_NAMES } from '../data/seedFoods';
import {
  getDefaultMealsForCount,
  getDefaultMealsForModel,
} from '../backend/services/UserProfileService';

describe('buildIngredientSelection', () => {
  it('empty styles still returns at least 6 items (universal categories)', () => {
    const result = buildIngredientSelection([], [], []);
    expect(result.size).toBeGreaterThanOrEqual(6);
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

  it('fallback set contains valid SEED_FOODS names', () => {
    // The fallback fires when result < 6. With real catalog data this rarely triggers,
    // but we verify the fallback names are valid by checking they're known foods.
    // 'Rizs', 'Brokkoli', 'Sárgarépa', 'Alma', 'Burgonya', 'Lencse' should all be in SEED_FOODS
    const allNames = SEED_FOODS.map(f => f.name);
    expect(allNames).toContain('Rizs');
    expect(allNames).toContain('Brokkoli');
    expect(allNames).toContain('Sárgarépa');
    expect(allNames).toContain('Alma');
    expect(allNames).toContain('Burgonya');
    expect(allNames).toContain('Lencse');
  });

  it('sporty style includes protein category items', () => {
    const result = buildIngredientSelection(['sporty'], [], []);
    // Fehérje is a sporty category; Csirkemell and Marhahús are in Fehérje
    expect(result.has('Csirkemell')).toBe(true);
    expect(result.has('Marhahús')).toBe(true);
  });

  it('mediterranean style includes no-category items (fish have no category in catalog)', () => {
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

describe('meal window defaults', () => {
  it('getDefaultMealsForCount returns correct count for each value', () => {
    expect(getDefaultMealsForCount(1)).toHaveLength(1);
    expect(getDefaultMealsForCount(2)).toHaveLength(2);
    expect(getDefaultMealsForCount(3)).toHaveLength(3);
    expect(getDefaultMealsForCount(4)).toHaveLength(4);
    expect(getDefaultMealsForCount(5)).toHaveLength(5);
  });

  it('getDefaultMealsForModel returns windows with startTime and endTime', () => {
    const meals = getDefaultMealsForModel('if16_8');
    expect(meals).toHaveLength(1);
    expect(meals[0].startTime).toBeDefined();
    expect(meals[0].endTime).toBeDefined();
  });

  it('wizard meal settings helper: count=3 gives 3meals windows', () => {
    const VALID_MODELS = ['3meals', '5meals', '2meals', 'if16_8', 'if18_6'];
    const mealCount = 3;
    const effectiveMealModel: string | undefined = undefined;
    const resolvedModel = (effectiveMealModel && VALID_MODELS.includes(effectiveMealModel))
      ? effectiveMealModel
      : undefined;
    const meals = resolvedModel
      ? getDefaultMealsForModel(resolvedModel as any)
      : getDefaultMealsForCount(mealCount);
    expect(meals).toHaveLength(3);
  });

  it('wizard meal settings helper: IF 16:8 gives 1 eating window', () => {
    const VALID_MODELS = ['3meals', '5meals', '2meals', 'if16_8', 'if18_6'];
    const mealCount = 1;
    const effectiveMealModel = 'if16_8';
    const resolvedModel = (effectiveMealModel && VALID_MODELS.includes(effectiveMealModel))
      ? effectiveMealModel
      : undefined;
    const meals = resolvedModel
      ? getDefaultMealsForModel(resolvedModel as any)
      : getDefaultMealsForCount(mealCount);
    expect(meals).toHaveLength(1);
    expect(meals[0].startTime).toBe('12:00');
  });
});
