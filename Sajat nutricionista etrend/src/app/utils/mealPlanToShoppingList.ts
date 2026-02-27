/**
 * mealPlanToShoppingList
 * ══════════════════════════════════════════════════════════════
 * Cross-module data flow: extracts ingredients from the current
 * week's meal plan and maps them to real products in the
 * productDatabase. Supports selectedMeals overrides (user-chosen
 * alternatives).
 *
 * v2: Uses dynamic plan data passed as parameter instead of
 * hardcoded mealPlan import. All data from user uploads only.
 *
 * Returns a deduplicated list of { product, quantity } for the
 * shopping list, prioritizing cheapest store per ingredient.
 */

import type { WeekData, MealOption } from '../hooks/usePlanData';
import { Product, productDatabase, searchProducts } from '../data/productDatabase';

// ─── Ingredient keyword → product search term mapping ───
// Maps Hungarian ingredient names (from mealPlan) to search keywords
const INGREDIENT_KEYWORD_MAP: Record<string, string[]> = {
  // Proteins
  'tojás': ['tojás'],
  'csirkemell': ['csirkemell'],
  'pulykamell': ['pulykamell'],
  'lazac': ['lazac'],
  'tőkehal': ['tőkehal'],
  'marhahús': ['marhahús', 'marha'],
  'sertés': ['sertés'],
  'tonhal': ['tonhal'],
  'garnéla': ['garnéla'],
  // Dairy
  'kecske joghurt': ['kecske joghurt', 'joghurt'],
  'kecske túró': ['kecske túró', 'túró'],
  'kecskesajt': ['kecskesajt', 'sajt'],
  'mozzarella': ['mozzarella'],
  'túró': ['túró'],
  'joghurt': ['joghurt'],
  // Grains
  'zab': ['zabpehely', 'zab'],
  'teljes kiőrlésű kenyér': ['kenyér', 'teljes kiőrlésű'],
  'quinoa': ['quinoa'],
  'rizs': ['rizs', 'barna rizs'],
  'édesburgonya': ['édesburgonya'],
  'burgonya': ['burgonya'],
  // Vegetables
  'brokkoli': ['brokkoli'],
  'spenót': ['spenót'],
  'saláta': ['saláta'],
  'cukkini': ['cukkini'],
  'káposzta': ['káposzta'],
  'padlizsán': ['padlizsán'],
  'uborka': ['uborka'],
  'paradicsom': ['paradicsom'],
  'avokádó': ['avokádó'],
  'spárga': ['spárga'],
  // Fruits & Nuts
  'dió': ['dió'],
  'mandula': ['mandula'],
  'kiwi': ['kiwi'],
  'alma': ['alma'],
  'banán': ['banán'],
  'áfonya': ['áfonya'],
  // Oils & extras
  'olívaolaj': ['olívaolaj'],
  'tökmagolaj': ['tökmagolaj'],
  'mandulatej': ['mandulatej'],
  'fehérjepor': ['fehérjepor'],
  'kendermag': ['kendermag'],
};

interface ShoppingSuggestion {
  product: Product;
  ingredient: string;
  mealName: string;
  mealType: string;
}

/**
 * Get the current week index (0-3) for the meal plan
 */
export function getCurrentWeekIndex(date: Date = new Date()): number {
  const jsDay = date.getDay();
  const dayOfMonth = date.getDate();
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayJS = firstOfMonth.getDay();
  const firstMonday = firstDayJS <= 1 ? (2 - firstDayJS) : (9 - firstDayJS);

  let week: number;
  if (dayOfMonth < firstMonday) {
    week = 0;
  } else {
    week = Math.floor((dayOfMonth - firstMonday) / 7);
  }
  return week % 4;
}

/**
 * Get the current day index (0=Mon, ..., 6=Sun)
 */
export function getCurrentDayIndex(date: Date = new Date()): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Extract all ingredients from a set of meals for a given day
 */
function extractIngredients(
  meals: MealOption[],
  mealType: string,
  selectedMeals: Record<string, string>,
  dayKey: string,
  weekIdx: number,
  dayIdx: number,
  isTraining: boolean
): { ingredient: string; mealName: string; mealType: string }[] {
  const key = `${dayKey}-${mealType}`;
  const selectedId = selectedMeals[key];

  // Get the selected meal or default to first — alternatives come from uploaded plan
  let meal: MealOption | undefined;
  if (selectedId) {
    meal = meals.find(m => m.id === selectedId);
  }
  if (!meal) meal = meals[0];
  if (!meal) return [];

  return (meal.ingredients || []).map(ing => ({
    ingredient: ing,
    mealName: meal!.name,
    mealType,
  }));
}

/**
 * Parse ingredient string like "Csirkemell (220g)" into a search keyword
 */
function parseIngredientToKeyword(ingredient: string): string | null {
  // Remove quantity info in parentheses
  const cleaned = ingredient.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();

  // Try direct match from keyword map
  for (const [key, _] of Object.entries(INGREDIENT_KEYWORD_MAP)) {
    if (cleaned.includes(key.toLowerCase())) {
      return key;
    }
  }

  // Fallback: use first word(s) as search term
  const words = cleaned.split(/\s+/);
  if (words.length > 0) return words[0];
  return null;
}

/**
 * Find the best product match for an ingredient keyword.
 * Prefers cheapest across all stores.
 */
function findBestProduct(keyword: string): Product | null {
  const searchTerms = INGREDIENT_KEYWORD_MAP[keyword] || [keyword];

  for (const term of searchTerms) {
    const results = searchProducts(term);
    if (results.length > 0) {
      // Return cheapest option
      return results.sort((a, b) => a.price - b.price)[0];
    }
  }
  return null;
}

/**
 * Generate shopping list from the current week's meal plan.
 * Returns deduplicated product suggestions.
 * planData: dynamic plan data from usePlanData hook
 */
export function generateWeeklyShoppingList(
  planData: WeekData[],
  selectedMeals: Record<string, string> = {},
  weekOverride?: number,
  startDay: number = 0,
): ShoppingSuggestion[] {
  const now = new Date();
  const weekIdx = weekOverride ?? getCurrentWeekIndex(now);
  const weekData = planData[weekIdx];
  if (!weekData) return [];

  const allIngredients: { ingredient: string; mealName: string; mealType: string }[] = [];

  // Collect ingredients for remaining days of the week
  for (let dayIdx = startDay; dayIdx < 7; dayIdx++) {
    const dayMeals = weekData.days[dayIdx];
    if (!dayMeals) continue;

    const dayDate = new Date(now);
    // Adjust to the correct day
    const currentDayIdx = getCurrentDayIndex(now);
    dayDate.setDate(dayDate.getDate() + (dayIdx - currentDayIdx));

    const dayKey = `day-${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`;

    const mealTypes: Array<{ type: string; meals: MealOption[] }> = [
      { type: 'breakfast', meals: dayMeals.breakfast },
      { type: 'lunch', meals: dayMeals.lunch },
      { type: 'dinner', meals: dayMeals.dinner },
    ];

    for (const { type, meals } of mealTypes) {
      const ings = extractIngredients(
        meals, type, selectedMeals, dayKey,
        weekIdx, dayIdx, dayMeals.isTrainingDay
      );
      allIngredients.push(...ings);
    }
  }

  // Deduplicate by keyword → find best product per unique ingredient
  const seen = new Map<string, ShoppingSuggestion>();

  for (const { ingredient, mealName, mealType } of allIngredients) {
    const keyword = parseIngredientToKeyword(ingredient);
    if (!keyword || seen.has(keyword)) continue;

    const product = findBestProduct(keyword);
    if (product) {
      seen.set(keyword, { product, ingredient, mealName, mealType });
    }
  }

  return Array.from(seen.values());
}

/**
 * Get count of how many meal plan items are already in the shopping list.
 */
export function getMealPlanShoppingOverlap(
  planData: WeekData[],
  shoppingProductIds: string[],
  selectedMeals: Record<string, string> = {}
): { total: number; inList: number } {
  const suggestions = generateWeeklyShoppingList(planData, selectedMeals);
  const idSet = new Set(shoppingProductIds);
  const inList = suggestions.filter(s => idSet.has(s.product.id)).length;
  return { total: suggestions.length, inList };
}