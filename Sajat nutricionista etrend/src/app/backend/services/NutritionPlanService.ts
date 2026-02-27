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
  FoodCategory,
} from '../models';
import * as FoodCatalogService from './FoodCatalogService';

// ═══════════════════════════════════════════════════════════════
// PLAN LIFECYCLE
// ═══════════════════════════════════════════════════════════════

export async function getActivePlan(): Promise<NutritionPlanEntity | undefined> {
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

export async function addMealItem(input: {
  meal_id: string;
  food_id: string;
  food_name: string;
  quantity_grams: number;
  unit: 'g' | 'ml' | 'db';
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}): Promise<MealItemEntity> {
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

function mapAICategoryToFoodCategory(aiCategory?: string): FoodCategory {
  if (!aiCategory) return 'Feherje';
  return AI_CATEGORY_MAP[aiCategory] || 'Feherje';
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

  // ─── Step 2: Collect all unique ingredients & resolve/create foods ─────
  const foodIdCache = new Map<string, string>(); // ingredientName → food_id
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
          const normName = ingData.name.toLowerCase().trim();
          if (!normName || normName.length < 2 || !isValidIngredientName(normName)) continue;
          if (foodIdCache.has(normName)) continue;

          stats.totalIngredients++;

          // Try matched_food_id first
          if (ingData.matched_food_id) {
            const existingFood = await db.get<any>('foods', ingData.matched_food_id);
            if (existingFood) {
              foodIdCache.set(normName, existingFood.id);
              foodDataCache.set(normName, {
                calories_per_100g: existingFood.calories_per_100g,
                protein_per_100g: existingFood.protein_per_100g,
                carbs_per_100g: existingFood.carbs_per_100g,
                fat_per_100g: existingFood.fat_per_100g,
              });
              stats.matchedExisting++;
              continue;
            }
          }

          // Search IndexedDB by name (fuzzy)
          const searchResults = await FoodCatalogService.searchFoods(ingData.name);
          if (searchResults.length > 0) {
            const found = searchResults[0];
            foodIdCache.set(normName, found.id);
            foodDataCache.set(normName, {
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
          const cat = mapAICategoryToFoodCategory(ingData.estimated_category);

          try {
            const newFood = await FoodCatalogService.createFood({
              name: ingData.name.charAt(0).toUpperCase() + ingData.name.slice(1),
              description: `AI parser által kinyert összetevő`,
              category: cat,
              calories_per_100g: cal,
              protein_per_100g: pro,
              carbs_per_100g: carb,
              fat_per_100g: fat,
              source: 'ai_generated',
            });
            foodIdCache.set(normName, newFood.id);
            foodDataCache.set(normName, {
              calories_per_100g: cal,
              protein_per_100g: pro,
              carbs_per_100g: carb,
              fat_per_100g: fat,
            });
            stats.createdNew++;
            console.log(`[NutritionPlanSvc] Created food: "${ingData.name}" (${cal} kcal, ${pro}g P, ${carb}g C, ${fat}g F)`);
          } catch (err: any) {
            // Duplicate name error — try to find by name again
            if (err?.message?.includes('Duplikált')) {
              const retrySearch = await FoodCatalogService.searchFoods(ingData.name);
              if (retrySearch.length > 0) {
                foodIdCache.set(normName, retrySearch[0].id);
                foodDataCache.set(normName, {
                  calories_per_100g: retrySearch[0].calories_per_100g,
                  protein_per_100g: retrySearch[0].protein_per_100g,
                  carbs_per_100g: retrySearch[0].carbs_per_100g,
                  fat_per_100g: retrySearch[0].fat_per_100g,
                });
                stats.matchedExisting++;
              }
            } else {
              stats.errors.push(`Hiba "${ingData.name}" létrehozásakor: ${err?.message || err}`);
              console.warn(`[NutritionPlanSvc] Error creating food "${ingData.name}":`, err);
            }
          }
        }
      }
    }
  }

  console.log(`[NutritionPlanSvc] Food resolution complete: ${stats.matchedExisting} matched, ${stats.createdNew} created, ${stats.totalIngredients} total`);

  // ─── Step 3: Create meal days, meals, and meal items ──────
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

        for (const ingData of mealData.ingredients) {
          const normName = ingData.name.toLowerCase().trim();

          // Skip invalid ingredient names (symbols, punctuation, too short)
          if (!normName || normName.length < 2 || !isValidIngredientName(normName)) {
            continue;
          }

          const foodId = foodIdCache.get(normName);
          const foodData = foodDataCache.get(normName);

          if (!foodId || !foodData) {
            // This shouldn't happen after Step 2, but log if it does
            stats.skippedEmpty++;
            console.warn(`[NutritionPlanSvc] No food resolved for ingredient: "${ingData.name}"`);
            continue;
          }

          await addMealItem({
            meal_id: meal.id,
            food_id: foodId,
            food_name: ingData.name,
            quantity_grams: ingData.quantity_grams,
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

  console.log(`[NutritionPlanSvc] Import complete: ${stats.totalDays} days, ${stats.totalMeals} meals, ${stats.totalMealItems} meal items`);

  notifyDBChange({ store: 'foods', action: 'put' });
  notifyDBChange({ store: 'meals', action: 'put' });
  notifyDBChange({ store: 'meal_items', action: 'put' });
  notifyDBChange({ store: 'meal_days', action: 'put' });

  return { ...plan, stats };
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
 * Rejects pure punctuation, bullet chars, numbers-only, and other parser artifacts.
 */
function isValidIngredientName(name: string): boolean {
  // Must contain at least one letter (any script)
  if (!/\p{L}/u.test(name)) return false;
  // Reject if it's ONLY symbols / punctuation / whitespace (no real word content)
  // Strip all non-letter chars; if fewer than 2 letters remain, reject
  const lettersOnly = name.replace(/[^\p{L}]/gu, '');
  return lettersOnly.length >= 2;
}