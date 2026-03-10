/**
 * ====================================================================
 * Nutrition Plan Service
 * ====================================================================
 * Manages the 4-week nutrition plan lifecycle:
 *   - CRUD for NutritionPlan, MealDay, Meal, MealItem
 *   - Version control integration
 *   - Active plan management
 *   - Macro aggregation per day/week
 *   - Import from AI parser results
 *
 * All MealItems reference the FoodCatalog (food_id FK).
 * Single source of truth for all meal data.
 */

import { getDB, generateId, nowISO, notifyDBChange } from '../db';
import type {
  NutritionPlanEntity,
  MealDayEntity,
  MealEntity,
  MealItemEntity,
  MealType,
  AIParsedNutritionPlan,
  AIParsedDay,
  AIParsedMeal,
  FoodCategory,
} from '../models';
import * as FoodCatalogService from './FoodCatalogService';
import { isCleanFoodName } from './AIParserService';
import { getSetting, removeSetting } from './SettingsService';

// ═══════════════════════════════════════════════════════════════
// NORMALIZE TO 4 WEEKS (for import from 1–3 week documents)
// ═══════════════════════════════════════════════════════════════

/**
 * Always produce a 4-week plan from the parsed document:
 * - 1 week in doc → repeat 4× (weeks 1–4 same)
 * - 2 weeks in doc → repeat 2× (weeks 3–4 = copy of weeks 1–2)
 * - 3 weeks in doc → week 4 = copy of week 1
 * - 4+ weeks in doc → use first 4 weeks as-is
 */
function normalizePlanToFourWeeks(parsed: AIParsedNutritionPlan): AIParsedNutritionPlan {
  const src = parsed.weeks;
  if (src.length === 0) return parsed;

  function cloneWeek(weekDays: AIParsedDay[], newWeekNum: number): AIParsedDay[] {
    return weekDays.map(d => ({
      ...d,
      week: newWeekNum,
      meals: d.meals.map(m => ({
        ...m,
        ingredients: m.ingredients.map(ing => ({ ...ing })),
      })),
    }));
  }

  let weeks: AIParsedDay[][];
  if (src.length === 1) {
    weeks = [cloneWeek(src[0], 1), cloneWeek(src[0], 2), cloneWeek(src[0], 3), cloneWeek(src[0], 4)];
  } else if (src.length === 2) {
    weeks = [cloneWeek(src[0], 1), cloneWeek(src[1], 2), cloneWeek(src[0], 3), cloneWeek(src[1], 4)];
  } else if (src.length === 3) {
    weeks = [cloneWeek(src[0], 1), cloneWeek(src[1], 2), cloneWeek(src[2], 3), cloneWeek(src[0], 4)];
  } else {
    weeks = src.slice(0, 4).map((w, i) => cloneWeek(w, i + 1));
  }

  return {
    weeks,
    detected_weeks: 4,
    detected_days_per_week: Math.max(...weeks.map(w => w.length), parsed.detected_days_per_week ?? 0),
  };
}

// ═══════════════════════════════════════════════════════════════
// PLAN LIFECYCLE
// ═══════════════════════════════════════════════════════════════

export async function getActivePlan(): Promise<NutritionPlanEntity | undefined> {
  // After a full reset we may want to "mask out" any stale plans that
  // somehow survived in IndexedDB. The flag is cleared whenever a new
  // plan is explicitly activated.
  try {
    const forceNoPlan = await getSetting('forceNoActivePlan');
    if (forceNoPlan === '1') return undefined;
  } catch {
    // ignore and fall back to DB
  }

  const db = await getDB();
  const all = await db.getAll<NutritionPlanEntity>('nutrition_plans');
  return all.find(p => p.is_active);
}

export async function getAllPlans(): Promise<NutritionPlanEntity[]> {
  const db = await getDB();
  return db.getAll<NutritionPlanEntity>('nutrition_plans');
}

export async function getPlanById(id: string): Promise<NutritionPlanEntity | undefined> {
  const db = await getDB();
  return db.get<NutritionPlanEntity>('nutrition_plans', id);
}

export interface CreatePlanInput {
  label: string;
  source: 'predefined' | 'user_upload' | 'ai_generated';
  total_weeks: number;
}

export async function createPlan(input: CreatePlanInput): Promise<NutritionPlanEntity> {
  const db = await getDB();
  const all = await db.getAll<NutritionPlanEntity>('nutrition_plans');
  const maxVersion = all.reduce((max, p) => Math.max(max, p.version), 0);

  const now = nowISO();
  const plan: NutritionPlanEntity = {
    id: generateId(),
    version: maxVersion + 1,
    is_active: false,
    upload_date: now,
    source: input.source,
    label: input.label,
    total_weeks: input.total_weeks,
    created_at: now,
    updated_at: now,
  };

  await db.put('nutrition_plans', plan);
  notifyDBChange({ store: 'nutrition_plans', action: 'put', key: plan.id });
  return plan;
}

export async function activatePlan(planId: string): Promise<void> {
  const db = await getDB();
  const all = await db.getAll<NutritionPlanEntity>('nutrition_plans');
  const now = nowISO();

  for (const plan of all) {
    const wasActive = plan.is_active;
    plan.is_active = plan.id === planId;
    if (plan.is_active !== wasActive) {
      plan.updated_at = now;
      await db.put('nutrition_plans', plan);
    }
  }

  notifyDBChange({ store: 'nutrition_plans', action: 'put', key: planId });

  try {
    await removeSetting('forceNoActivePlan');
  } catch {
    // ignore
  }
}

export async function deletePlan(planId: string): Promise<void> {
  const db = await getDB();

  // Delete related meal items
  const meals = await db.getAllFromIndex<MealEntity>('meals', 'by-plan', planId);
  for (const meal of meals) {
    const items = await db.getAllFromIndex<MealItemEntity>('meal_items', 'by-meal', meal.id);
    for (const item of items) {
      await db.delete('meal_items', item.id);
    }
    await db.delete('meals', meal.id);
  }

  // Delete meal days
  const days = await db.getAllFromIndex<MealDayEntity>('meal_days', 'by-plan', planId);
  for (const day of days) {
    await db.delete('meal_days', day.id);
  }

  // Delete shopping list items for this plan
  const shoppingItems = await db.getAllFromIndex('shopping_list', 'by-plan', planId);
  for (const item of shoppingItems) {
    await db.delete('shopping_list', (item as any).id);
  }

  // Delete the plan itself
  await db.delete('nutrition_plans', planId);
  notifyDBChange({ store: 'nutrition_plans', action: 'delete', key: planId });
}

/**
 * Clear all meal data (days, meals, meal items, shopping list) for an
 * existing plan, but keep the plan entity itself.
 */
export async function clearPlan(planId: string): Promise<void> {
  const db = await getDB();

  // Delete related meal items
  const meals = await db.getAllFromIndex<MealEntity>('meals', 'by-plan', planId);
  for (const meal of meals) {
    const items = await db.getAllFromIndex<MealItemEntity>('meal_items', 'by-meal', meal.id);
    for (const item of items) {
      await db.delete('meal_items', item.id);
    }
    await db.delete('meals', meal.id);
  }

  // Delete meal days
  const days = await db.getAllFromIndex<MealDayEntity>('meal_days', 'by-plan', planId);
  for (const day of days) {
    await db.delete('meal_days', day.id);
  }

  // Delete shopping list items for this plan
  const shoppingItems = await db.getAllFromIndex('shopping_list', 'by-plan', planId);
  for (const item of shoppingItems) {
    await db.delete('shopping_list', (item as any).id);
  }

  notifyDBChange({ store: 'meal_days', action: 'delete', key: planId });
  notifyDBChange({ store: 'meals', action: 'delete', key: planId });
  notifyDBChange({ store: 'meal_items', action: 'delete', key: planId });
  notifyDBChange({ store: 'shopping_list', action: 'delete', key: planId });
}

// ═══════════════════════════════════════════════════════════════
// MEAL DAY OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function getMealDaysForPlan(planId: string): Promise<MealDayEntity[]> {
  const db = await getDB();
  return db.getAllFromIndex<MealDayEntity>('meal_days', 'by-plan', planId);
}

export async function getMealDayForPlanWeekDay(
  planId: string, week: number, day: number
): Promise<MealDayEntity | undefined> {
  const db = await getDB();
  const results = await db.getAllFromIndex<MealDayEntity>(
    'meal_days', 'by-plan-week-day', [planId, week, day]
  );
  return results[0];
}

export async function createMealDay(input: {
  nutrition_plan_id: string;
  week: number;
  day: number;
  day_label: string;
  is_training_day: boolean;
}): Promise<MealDayEntity> {
  const db = await getDB();
  const entity: MealDayEntity = {
    id: generateId(),
    nutrition_plan_id: input.nutrition_plan_id,
    week: input.week,
    day: input.day,
    day_label: input.day_label,
    is_training_day: input.is_training_day,
    total_calories: 0,
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
    created_at: nowISO(),
  };
  await db.put('meal_days', entity);
  return entity;
}

// ═══════════════════════════════════════════════════════════════
// MEAL OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function getMealsForDay(mealDayId: string): Promise<MealEntity[]> {
  const db = await getDB();
  return db.getAllFromIndex<MealEntity>('meals', 'by-meal-day', mealDayId);
}

export async function getMealsForPlan(planId: string): Promise<MealEntity[]> {
  const db = await getDB();
  return db.getAllFromIndex<MealEntity>('meals', 'by-plan', planId);
}

export async function createMeal(input: {
  meal_day_id: string;
  nutrition_plan_id: string;
  meal_type: MealType;
  name: string;
  description: string;
  is_primary: boolean;
  sort_order: number;
}): Promise<MealEntity> {
  const db = await getDB();
  const entity: MealEntity = {
    id: generateId(),
    meal_day_id: input.meal_day_id,
    nutrition_plan_id: input.nutrition_plan_id,
    meal_type: input.meal_type,
    name: input.name,
    description: input.description,
    total_calories: 0,
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
    is_primary: input.is_primary,
    sort_order: input.sort_order,
    created_at: nowISO(),
  };
  await db.put('meals', entity);
  return entity;
}

// ═══════════════════════════════════════════════════════════════
// MEAL ITEM OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function getMealItems(mealId: string): Promise<MealItemEntity[]> {
  const db = await getDB();
  return db.getAllFromIndex<MealItemEntity>('meal_items', 'by-meal', mealId);
}

type AddMealItemInput = {
  meal_id: string;
  food_id: string;
  food_name: string;
  quantity_grams: number;
  unit: 'g' | 'ml' | 'db';
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
};

// Internal helper: insert meal item WITHOUT recalculating totals.
// Used by bulk import to avoid O(N^2) aggregation work.
async function addMealItemBare(input: AddMealItemInput): Promise<MealItemEntity> {
  const db = await getDB();
  const factor = input.quantity_grams / 100;

  const entity: MealItemEntity = {
    id: generateId(),
    meal_id: input.meal_id,
    food_id: input.food_id,
    food_name: input.food_name,
    quantity_grams: input.quantity_grams,
    unit: input.unit,
    calculated_calories: Math.round(input.calories_per_100g * factor),
    calculated_protein: Math.round(input.protein_per_100g * factor * 10) / 10,
    calculated_carbs: Math.round(input.carbs_per_100g * factor * 10) / 10,
    calculated_fat: Math.round(input.fat_per_100g * factor * 10) / 10,
    created_at: nowISO(),
  };

  await db.put('meal_items', entity);
  return entity;
}

export async function addMealItem(input: AddMealItemInput): Promise<MealItemEntity> {
  const entity = await addMealItemBare(input);
  // Standard path: recalc+notify immediately (used by UI actions).
  await recalculateMealTotals(input.meal_id);
  notifyDBChange({ store: 'meal_items', action: 'put', key: entity.id });
  return entity;
}

export async function removeMealItem(itemId: string): Promise<void> {
  const db = await getDB();
  const item = await db.get<MealItemEntity>('meal_items', itemId);
  if (!item) return;

  await db.delete('meal_items', itemId);
  await recalculateMealTotals(item.meal_id);
  notifyDBChange({ store: 'meal_items', action: 'delete', key: itemId });
}

// ═══════════════════════════════════════════════════════════════
// MACRO AGGREGATION
// ═══════════════════════════════════════════════════════════════

async function recalculateMealTotals(mealId: string): Promise<void> {
  const db = await getDB();
  const items = await db.getAllFromIndex<MealItemEntity>('meal_items', 'by-meal', mealId);
  const meal = await db.get<MealEntity>('meals', mealId);
  if (!meal) return;

  meal.total_calories = items.reduce((sum, i) => sum + i.calculated_calories, 0);
  meal.total_protein = items.reduce((sum, i) => sum + i.calculated_protein, 0);
  meal.total_carbs = items.reduce((sum, i) => sum + i.calculated_carbs, 0);
  meal.total_fat = items.reduce((sum, i) => sum + i.calculated_fat, 0);

  await db.put('meals', meal);
  await recalculateDayTotals(meal.meal_day_id);
}

async function recalculateDayTotals(mealDayId: string): Promise<void> {
  const db = await getDB();
  const meals = await db.getAllFromIndex<MealEntity>('meals', 'by-meal-day', mealDayId);
  const day = await db.get<MealDayEntity>('meal_days', mealDayId);
  if (!day) return;

  const primaryMeals = meals.filter(m => m.is_primary);
  day.total_calories = primaryMeals.reduce((sum, m) => sum + m.total_calories, 0);
  day.total_protein = primaryMeals.reduce((sum, m) => sum + m.total_protein, 0);
  day.total_carbs = primaryMeals.reduce((sum, m) => sum + m.total_carbs, 0);
  day.total_fat = primaryMeals.reduce((sum, m) => sum + m.total_fat, 0);

  await db.put('meal_days', day);
}

export async function getWeekMacroSummary(
  planId: string, week: number
): Promise<{ totalCalories: number; avgCalories: number; totalProtein: number; totalCarbs: number; totalFat: number }> {
  const db = await getDB();
  const days = await db.getAllFromIndex<MealDayEntity>('meal_days', 'by-plan-week', [planId, week]);
  const n = days.length || 1;
  return {
    totalCalories: days.reduce((s, d) => s + d.total_calories, 0),
    avgCalories: Math.round(days.reduce((s, d) => s + d.total_calories, 0) / n),
    totalProtein: Math.round(days.reduce((s, d) => s + d.total_protein, 0) * 10) / 10,
    totalCarbs: Math.round(days.reduce((s, d) => s + d.total_carbs, 0) * 10) / 10,
    totalFat: Math.round(days.reduce((s, d) => s + d.total_fat, 0) * 10) / 10,
  };
}

// ═══════════════════════════════════════════════════════════════
// AI IMPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Category mapping from AI knowledge categories to FoodCategory enum.
 */
const AI_CATEGORY_MAP: Record<string, FoodCategory> = {
  // AI knowledge categories (from aiFoodKnowledge.ts)
  'Hús & Hal': 'Feherje',
  'Tojás': 'Tojas',
  'Tej & Tejtermék': 'Tejtermek',
  'Kávé & Tea': 'Tejtermek',
  'Gyümölcs': 'Zoldseg',
  'Zöldség': 'Zoldseg',
  'Pékáru & Gabona': 'Komplex_szenhidrat',
  'Édesség & Snack': 'Komplex_szenhidrat',
  'Ital': 'Tejtermek',
  'Olaj & Zsír': 'Egeszseges_zsir',
  'Fűszer & Szósz': 'Zoldseg',
  'Hüvelyes & Mag': 'Huvelyes',
  'Egyéb': 'Feherje',
  // Direct DB category pass-through (from mealData.ts foodDatabase)
  'Fehérje': 'Feherje',
  'Tejtermék': 'Tejtermek',
  'Komplex szénhidrát': 'Komplex_szenhidrat',
  'Egészséges zsír': 'Egeszseges_zsir',
  'Hüvelyes': 'Huvelyes',
  'Mag': 'Mag',
};

export function mapAICategoryToFoodCategory(aiCategory?: string): FoodCategory {
  if (!aiCategory) return 'Feherje';
  return AI_CATEGORY_MAP[aiCategory] || 'Feherje';
}

/**
 * Normalize a raw ingredient/meal name into one or more canonical base
 * ingredient names, enforcing the strict "single base ingredient" rule.
 *
 * Pipeline:
 *   1. FoodCatalogService.parseBaseIngredients (split by connectors)
 *   2. FoodCatalogService.normalizeIngredientName (strip cooking verbs, endings)
 *   3. isValidIngredientName (reject PDF garbage)
 *   4. isCleanFoodName (deep corruption check)
 *   5. FoodCatalogService.isSingleBaseIngredientName (reject meal names)
 */
function getAtomicIngredientNames(rawName: string): string[] {
  // First try Hungarian compound-dish splitting (e.g. "Petrezsejmes krumpli" → ["krumpli", "petrezselyem"])
  const compoundSplit = FoodCatalogService.splitHungarianCompoundDish(rawName);
  const bases =
    compoundSplit.length > 1
      ? compoundSplit
      : FoodCatalogService.parseBaseIngredients(compoundSplit[0] ?? rawName);

  const unique = new Set<string>();
  const result: string[] = [];

  for (const part of bases) {
    const normalized = FoodCatalogService.normalizeIngredientName(part);
    if (!normalized) continue;

    const lower = normalized.toLowerCase();
    if (!isValidIngredientName(lower)) continue;
    if (!isCleanFoodName(normalized)) continue;
    if (!FoodCatalogService.isSingleBaseIngredientName(normalized)) continue;

    if (!unique.has(lower)) {
      unique.add(lower);
      result.push(normalized);
    }
  }

  return result;
}

/**
 * Import from AI parse results — v2 (robust).
 *
 * CRITICAL FIX: Creates food entries for ALL ingredients, not just matched ones.
 * Pipeline:
 *   1. Collect all unique ingredients across all meals
 *   2. For each ingredient: resolve or create a food entry in IndexedDB
 *   3. Create meal days, meals, and meal items with correct food_id references
 *
 * This ensures no ingredients are silently dropped.
 */
export async function importFromAIParse(
  parsed: AIParsedNutritionPlan,
  label: string
): Promise<NutritionPlanEntity & { stats: ImportStats }> {
  // Normalize to 4 weeks: 1→4×, 2→2×, 3→+week1, 4→as-is
  parsed = normalizePlanToFourWeeks(parsed);

  const db = await getDB();
  const stats: ImportStats = {
    totalIngredients: 0,
    matchedExisting: 0,
    createdNew: 0,
    skippedEmpty: 0,
    totalMeals: 0,
    totalDays: 0,
    totalMealItems: 0,
    errors: [],
  };

  // ─── Step 1: Create the plan ──────────────────────────────
  const plan = await createPlan({
    label,
    source: 'ai_generated',
    total_weeks: parsed.detected_weeks,
  });

  console.log(`[NutritionPlanSvc] Importing plan: "${label}", ${parsed.detected_weeks} weeks, ${parsed.weeks.length} week groups`);

  // ─── Step 2: Collect all unique base ingredients & resolve/create foods ─────
  const foodIdCache = new Map<string, string>(); // canonicalIngredientName → food_id
  const foodDataCache = new Map<string, {
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
  }>();

  for (const weekDays of parsed.weeks) {
    for (const dayData of weekDays) {
      for (const mealData of dayData.meals) {
        for (const ingData of mealData.ingredients) {
          const atomicNames = getAtomicIngredientNames(ingData.name);
          if (atomicNames.length === 0) continue;

          for (const displayName of atomicNames) {
            const key = displayName.toLowerCase();
            if (foodIdCache.has(key)) continue;

            stats.totalIngredients++;

            // Search IndexedDB by normalized base name
            const searchResults = await FoodCatalogService.searchFoods(displayName);
            if (searchResults.length > 0) {
              const found = searchResults[0];
              foodIdCache.set(key, found.id);
              foodDataCache.set(key, {
                calories_per_100g: found.calories_per_100g,
                protein_per_100g: found.protein_per_100g,
                carbs_per_100g: found.carbs_per_100g,
                fat_per_100g: found.fat_per_100g,
              });
              stats.matchedExisting++;
              continue;
            }

            // ─── CREATE NEW FOOD from estimated data ─────
            const cal = ingData.estimated_calories_per_100g ?? 100;
            const pro = ingData.estimated_protein_per_100g ?? 5;
            const carb = ingData.estimated_carbs_per_100g ?? 15;
            const fat = ingData.estimated_fat_per_100g ?? 3;

            // Pipeline step 3+4: name → semantic → FoodCategory
            const semanticCat = FoodCatalogService.inferSemanticCategoryFromName(displayName);
            const cat = FoodCatalogService.semanticCategoryToFoodCategory(semanticCat);

            try {
              const newFood = await FoodCatalogService.createFood({
                name: displayName,
                description: `AI parser által kinyert összetevő`,
                category: cat,
                calories_per_100g: cal,
                protein_per_100g: pro,
                carbs_per_100g: carb,
                fat_per_100g: fat,
                source: 'ai_generated',
              });
              foodIdCache.set(key, newFood.id);
              foodDataCache.set(key, {
                calories_per_100g: cal,
                protein_per_100g: pro,
                carbs_per_100g: carb,
                fat_per_100g: fat,
              });
              stats.createdNew++;
              console.log(`[NutritionPlanSvc] Created food: "${displayName}" (${cal} kcal, ${pro}g P, ${carb}g C, ${fat}g F)`);
            } catch (err: any) {
              // Duplicate name error — try to find by name again
              if (err?.message?.includes('Duplikált')) {
                const retrySearch = await FoodCatalogService.searchFoods(displayName);
                if (retrySearch.length > 0) {
                  foodIdCache.set(key, retrySearch[0].id);
                  foodDataCache.set(key, {
                    calories_per_100g: retrySearch[0].calories_per_100g,
                    protein_per_100g: retrySearch[0].protein_per_100g,
                    carbs_per_100g: retrySearch[0].carbs_per_100g,
                    fat_per_100g: retrySearch[0].fat_per_100g,
                  });
                  stats.matchedExisting++;
                }
              } else {
                stats.errors.push(`Hiba "${displayName}" létrehozásakor: ${err?.message || err}`);
                console.warn(`[NutritionPlanSvc] Error creating food "${displayName}":`, err);
              }
            }
          }
        }
      }
    }
  }

  console.log(`[NutritionPlanSvc] Food resolution complete: ${stats.matchedExisting} matched, ${stats.createdNew} created, ${stats.totalIngredients} total`);

  // ─── Step 3: Create meal days, meals, and meal items ──────
  // Performance optimization: insert all items first, then recalc macros per meal once.
  const mealsToRecalc = new Set<string>();

  for (const weekDays of parsed.weeks) {
    for (const dayData of weekDays) {
      const mealDay = await createMealDay({
        nutrition_plan_id: plan.id,
        week: dayData.week,
        day: dayData.day,
        day_label: dayData.day_label,
        is_training_day: dayData.is_training_day,
      });
      stats.totalDays++;

      for (let mealIdx = 0; mealIdx < dayData.meals.length; mealIdx++) {
        const mealData = dayData.meals[mealIdx];
        const meal = await createMeal({
          meal_day_id: mealDay.id,
          nutrition_plan_id: plan.id,
          meal_type: mealData.meal_type,
          name: mealData.name,
          description: '',
          is_primary: true,
          sort_order: mealIdx,
        });
        stats.totalMeals++;
        mealsToRecalc.add(meal.id);

        for (const ingData of mealData.ingredients) {
          const atomicNames = getAtomicIngredientNames(ingData.name);
          if (atomicNames.length === 0) continue;

          // If one original ingredient name contains multiple foods,
          // split the quantity evenly between them.
          const perQuantity =
            atomicNames.length > 1 && ingData.quantity_grams > 0
              ? Math.max(Math.round(ingData.quantity_grams / atomicNames.length), 1)
              : ingData.quantity_grams;

          for (const displayName of atomicNames) {
            const key = displayName.toLowerCase();
            const foodId = foodIdCache.get(key);
            const foodData = foodDataCache.get(key);

            if (!foodId || !foodData) {
              // This shouldn't happen after Step 2, but log if it does
              stats.skippedEmpty++;
              console.warn(`[NutritionPlanSvc] No food resolved for ingredient: "${displayName}" (from "${ingData.name}")`);
              continue;
            }

            await addMealItemBare({
              meal_id: meal.id,
              food_id: foodId,
              food_name: displayName,
              quantity_grams: perQuantity,
              unit: ingData.unit,
              calories_per_100g: foodData.calories_per_100g,
              protein_per_100g: foodData.protein_per_100g,
              carbs_per_100g: foodData.carbs_per_100g,
              fat_per_100g: foodData.fat_per_100g,
            });
            stats.totalMealItems++;
          }
        }
      }
    }
  }

  // ─── Step 4: Recalculate macros once per meal (not per item) ─────
  for (const mealId of mealsToRecalc) {
    await recalculateMealTotals(mealId);
  }

  console.log(`[NutritionPlanSvc] Import complete: ${stats.totalDays} days, ${stats.totalMeals} meals, ${stats.totalMealItems} meal items`);

  notifyDBChange({ store: 'foods', action: 'put' });
  notifyDBChange({ store: 'meals', action: 'put' });
  notifyDBChange({ store: 'meal_items', action: 'put' });
  notifyDBChange({ store: 'meal_days', action: 'put' });

  return { ...plan, stats };
}

/**
 * Append new days and their meals/items to an existing plan. Foods are
 * resolved/created in the same way as in importFromAIParse, but no new
 * NutritionPlan entity is created.
 */
async function appendToPlanInternal(
  plan: NutritionPlanEntity,
  parsed: AIParsedNutritionPlan
): Promise<ImportStats> {
  const db = await getDB();
  const stats: ImportStats = {
    totalIngredients: 0,
    matchedExisting: 0,
    createdNew: 0,
    skippedEmpty: 0,
    totalMeals: 0,
    totalDays: 0,
    totalMealItems: 0,
    errors: [],
  };

  // Existing day keys to avoid duplicates (week-day combination)
  const existingDays = await getMealDaysForPlan(plan.id);
  const existingDayKeys = new Set(existingDays.map(d => `${d.week}-${d.day}`));

  const foodIdCache = new Map<string, string>();
  const foodDataCache = new Map<string, {
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
  }>();

  // Seed caches from existing foods used by this plan to avoid re-resolving.
  const planMeals = await getMealsForPlan(plan.id);
  for (const meal of planMeals) {
    const items = await db.getAllFromIndex<MealItemEntity>('meal_items', 'by-meal', meal.id);
    for (const item of items) {
      const key = String(item.food_name || '').toLowerCase();
      if (!key || foodIdCache.has(key)) continue;
      const food = await db.get<any>('foods', item.food_id);
      if (!food) continue;
      foodIdCache.set(key, item.food_id);
      foodDataCache.set(key, {
        calories_per_100g: food.calories_per_100g,
        protein_per_100g: food.protein_per_100g,
        carbs_per_100g: food.carbs_per_100g,
        fat_per_100g: food.fat_per_100g,
      });
    }
  }

  const mealsToRecalc = new Set<string>();

  for (const weekDays of parsed.weeks) {
    for (const dayData of weekDays) {
      const dayKey = `${dayData.week}-${dayData.day}`;
      if (existingDayKeys.has(dayKey)) {
        continue;
      }

      const mealDay = await createMealDay({
        nutrition_plan_id: plan.id,
        week: dayData.week,
        day: dayData.day,
        day_label: dayData.day_label,
        is_training_day: dayData.is_training_day,
      });
      stats.totalDays++;

      for (let mealIdx = 0; mealIdx < dayData.meals.length; mealIdx++) {
        const mealData = dayData.meals[mealIdx];
        const meal = await createMeal({
          meal_day_id: mealDay.id,
          nutrition_plan_id: plan.id,
          meal_type: mealData.meal_type,
          name: mealData.name,
          description: '',
          is_primary: true,
          sort_order: mealIdx,
        });
        stats.totalMeals++;
        mealsToRecalc.add(meal.id);

        for (const ingData of mealData.ingredients) {
          const atomicNames = getAtomicIngredientNames(ingData.name);
          if (atomicNames.length === 0) continue;

          const perQuantity =
            atomicNames.length > 1 && ingData.quantity_grams > 0
              ? Math.max(Math.round(ingData.quantity_grams / atomicNames.length), 1)
              : ingData.quantity_grams;

          for (const displayName of atomicNames) {
            const key = displayName.toLowerCase();
            let foodId = foodIdCache.get(key);
            let foodData = foodDataCache.get(key);

            if (!foodId || !foodData) {
              stats.totalIngredients++;

              const searchResults = await FoodCatalogService.searchFoods(displayName);
              if (searchResults.length > 0) {
                const found = searchResults[0];
                foodId = found.id;
                foodData = {
                  calories_per_100g: found.calories_per_100g,
                  protein_per_100g: found.protein_per_100g,
                  carbs_per_100g: found.carbs_per_100g,
                  fat_per_100g: found.fat_per_100g,
                };
                foodIdCache.set(key, foodId);
                foodDataCache.set(key, foodData);
                stats.matchedExisting++;
              } else {
                const cal = ingData.estimated_calories_per_100g ?? 100;
                const pro = ingData.estimated_protein_per_100g ?? 5;
                const carb = ingData.estimated_carbs_per_100g ?? 15;
                const fat = ingData.estimated_fat_per_100g ?? 3;
                const semanticCat = FoodCatalogService.inferSemanticCategoryFromName(displayName);
                const cat = FoodCatalogService.semanticCategoryToFoodCategory(semanticCat);

                try {
                  const newFood = await FoodCatalogService.createFood({
                    name: displayName,
                    description: `AI parser által kinyert összetevő (merge)`,
                    category: cat,
                    calories_per_100g: cal,
                    protein_per_100g: pro,
                    carbs_per_100g: carb,
                    fat_per_100g: fat,
                    source: 'ai_generated',
                  });
                  foodId = newFood.id;
                  foodData = {
                    calories_per_100g: cal,
                    protein_per_100g: pro,
                    carbs_per_100g: carb,
                    fat_per_100g: fat,
                  };
                  foodIdCache.set(key, foodId);
                  foodDataCache.set(key, foodData);
                  stats.createdNew++;
                  console.log(`[NutritionPlanSvc] Created food (merge): "${displayName}" (${cal} kcal, ${pro}g P, ${carb}g C, ${fat}g F)`);
                } catch (err: any) {
                  if (err?.message?.includes('Duplikált')) {
                    const retrySearch = await FoodCatalogService.searchFoods(displayName);
                    if (retrySearch.length > 0) {
                      const found = retrySearch[0];
                      foodId = found.id;
                      foodData = {
                        calories_per_100g: found.calories_per_100g,
                        protein_per_100g: found.protein_per_100g,
                        carbs_per_100g: found.carbs_per_100g,
                        fat_per_100g: found.fat_per_100g,
                      };
                      foodIdCache.set(key, foodId);
                      foodDataCache.set(key, foodData);
                      stats.matchedExisting++;
                    }
                  } else {
                    stats.errors.push(`Hiba "${displayName}" létrehozásakor (merge): ${err?.message || err}`);
                    console.warn(`[NutritionPlanSvc] Error creating food (merge) "${displayName}":`, err);
                  }
                }
              }
            }

            if (!foodId || !foodData) {
              stats.skippedEmpty++;
              continue;
            }

            await addMealItemBare({
              meal_id: meal.id,
              food_id: foodId,
              food_name: displayName,
              quantity_grams: perQuantity,
              unit: ingData.unit,
              calories_per_100g: foodData.calories_per_100g,
              protein_per_100g: foodData.protein_per_100g,
              carbs_per_100g: foodData.carbs_per_100g,
              fat_per_100g: foodData.fat_per_100g,
            });
            stats.totalMealItems++;
          }
        }
      }
    }
  }

  for (const mealId of mealsToRecalc) {
    await recalculateMealTotals(mealId);
  }

  notifyDBChange({ store: 'foods', action: 'put' });
  notifyDBChange({ store: 'meals', action: 'put' });
  notifyDBChange({ store: 'meal_items', action: 'put' });
  notifyDBChange({ store: 'meal_days', action: 'put' });

  return stats;
}

/**
 * Import into an existing plan with merge / overwrite semantics.
 */
export async function importIntoExistingPlan(
  planId: string,
  parsed: AIParsedNutritionPlan,
  mode: 'merge' | 'overwrite',
  label: string
): Promise<NutritionPlanEntity & { stats: ImportStats }> {
  const db = await getDB();
  const existing = await db.get<NutritionPlanEntity>('nutrition_plans', planId);
  if (!existing) {
    return importFromAIParse(parsed, label);
  }

  if (mode === 'overwrite') {
    await clearPlan(planId);
    const normalized = normalizePlanToFourWeeks(parsed);
    const stats = await appendToPlanInternal(existing, normalized);
    const updated = await db.get<NutritionPlanEntity>('nutrition_plans', planId) ?? existing;
    return { ...updated, stats };
  }

  // merge mode: append only new days/foods
  const normalized = normalizePlanToFourWeeks(parsed);
  const stats = await appendToPlanInternal(existing, normalized);
  const updated = await db.get<NutritionPlanEntity>('nutrition_plans', planId) ?? existing;
  return { ...updated, stats };
}

export interface ImportStats {
  totalIngredients: number;
  matchedExisting: number;
  createdNew: number;
  skippedEmpty: number;
  totalMeals: number;
  totalDays: number;
  totalMealItems: number;
  errors: string[];
}

/**
 * Validates if a string is a plausible ingredient name.
 * Strictly rejects PDF artifacts, binary data, XML metadata, and other parser garbage.
 */
function isValidIngredientName(name: string): boolean {
  if (!name) return false;
  const original = name.trim();

  // Strip leading numbers and surrounding spaces (e.g. "3 tojás" → "tojás")
  let n = original.replace(/^[0-9\s]+/, '').trim();
  if (!n) return false;

  // Fogadjuk el a 2–25 karakter közötti, "normális" szavakat; a cél az,
  // hogy ne dobjunk ki valódi alapanyagokat.
  if (n.length < 2 || n.length > 25) return false;

  // ── PDF / binary token blacklist ──────────────────────────────
  const PDF_TOKENS = [
    'endobj', 'endstream', 'startxref', 'xref', '%%eof',
    'obj endobj', '0 obj', '1 0 obj', '2 0 obj', '3 0 obj',
    '<</', '>>', '/type', '/page', '/font', '/width', '/height',
    '/filter', '/length', '/subtype', '/basefont', '/encoding',
    'stream', 'endstream', '/producer', '/creator', '/creationdate',
    '/modifydate', '/title', '/author', '/subject', '/keywords',
    'xmp:', 'rdf:', 'dc:', 'pdf:', 'xmpmm:', 'xaptk',
    '</xmp', '</rdf', '<rdf:', '<xmp', 'x:xmpmeta',
    'xmlns', 'uuid:', 'w3.org', 'adobe.com',
    'microsoft word', 'microsoft office', 'acrobat',
    'itext', 'fpdf', 'reportlab', 'ghostscript',
  ];

  const lower = n.toLowerCase();
  for (const token of PDF_TOKENS) {
    if (lower.includes(token)) return false;
  }

  // Legalább egy latin/HU betű
  if (!/[a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ]/u.test(n)) return false;

  // Durva szimbólum-szűrés: nyers PDF zaj ne menjen át
  if (/[<>{}[\]\\|@#$%^*~`]/.test(n)) return false;

  // Csak szám / dátum / kód → nem alapanyag
  if (/^\d[\d\s:./-]*$/.test(n)) return false;
  if (/^\d{2}:\d{2}/.test(n)) return false;

  // Reject names where a number is glued to a word (e.g. "zsír3")
  if (/[a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ]\d/u.test(n)) return false;

  // Reject "word number word" pattern (likely composite / noisy)
  if (/\b[ a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ]+\b\s+\d+\s+\b[ a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ]+\b/u.test(n)) return false;

  return true;
}