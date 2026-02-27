/**
 * ====================================================================
 * usePlanData — Active Nutrition Plan Data Hook
 * ====================================================================
 * Loads the active nutrition plan from IndexedDB and converts it to
 * the WeekData[] format used by the UI components.
 *
 * FALLBACK STRATEGY:
 *   1. If an active plan exists with meal data → use IndexedDB data
 *   2. If an active plan exists but has NO meal data → fallback to mealData.ts
 *   3. If NO active plan exists → fallback to mealData.ts
 *   4. On error → fallback to mealData.ts
 *
 * This ensures the app always shows the predefined 4-week meal plan
 * from the backend-uploaded étrend, even if IndexedDB is empty or
 * the AI parser import didn't complete.
 *
 * Data flow:
 *   IndexedDB → NutritionPlanService → WeekData[] → UI
 *   (fallback) mealData.ts → mealPlan → WeekData[] → UI
 */

import { useState, useEffect, useCallback } from 'react';
import * as NutritionPlanSvc from '../backend/services/NutritionPlanService';
import { getDB, onDBChange } from '../backend/db';
import type {
  NutritionPlanEntity,
  MealDayEntity,
  MealEntity,
  MealItemEntity,
} from '../backend/models';
import { mealPlan as hardcodedMealPlan } from '../data/mealData';

// ═══════════════════════════════════════════════════════════════
// TYPES (compatible with old mealData.ts format)
// ═══════════════════════════════════════════════════════════════

export interface IngredientDetail {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealOption {
  id: string;
  name: string;
  type: string;
  calories: string;
  /** Total macros for the whole meal */
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  description: string;
  ingredients: string[];
  ingredientDetails: IngredientDetail[];
}

export interface DayMeals {
  day: number;
  isTrainingDay: boolean;
  dayLabel: string;
  breakfast: MealOption[];
  lunch: MealOption[];
  dinner: MealOption[];
  snack?: MealOption[];
}

export interface WeekData {
  week: number;
  summary: {
    avgCalories: string;
    protein: string;
    carbs: string;
    fat: string;
    expectedWeightLoss: string;
  };
  days: DayMeals[];
}

export interface PlanDataState {
  /** Plan data in WeekData[] format (empty if no plan) */
  planData: WeekData[];
  /** Whether data is still loading */
  isLoading: boolean;
  /** Active plan entity (null if none) */
  activePlan: NutritionPlanEntity | null;
  /** Whether there's any plan data at all */
  hasData: boolean;
  /** Force refresh */
  refresh: () => void;
}

// ═══════════════════════════════════════════════════════════════
// CONVERSION: IndexedDB entities → WeekData[]
// ═══════════════════════════════════════════════════════════════

function mealEntityToOption(
  meal: MealEntity,
  items: MealItemEntity[]
): MealOption {
  const totalCalories = meal.total_calories || items.reduce((s, i) => s + i.calculated_calories, 0);
  const ingredients = items.map(item => {
    const unitLabel = item.unit === 'db' ? 'db' : item.unit;
    return `${item.food_name} (${item.quantity_grams}${unitLabel})`;
  });

  const totalProtein = items.reduce((s, i) => s + i.calculated_protein, 0);
  const totalCarbs = items.reduce((s, i) => s + i.calculated_carbs, 0);
  const totalFat = items.reduce((s, i) => s + i.calculated_fat, 0);

  return {
    id: meal.id,
    name: meal.name,
    type: meal.meal_type,
    calories: `${totalCalories} kcal`,
    totalProtein,
    totalCarbs,
    totalFat,
    description: meal.description || ingredients.join(', '),
    ingredients,
    ingredientDetails: items.map(item => ({
      name: item.food_name,
      quantity: `${item.quantity_grams}${item.unit}`,
      calories: item.calculated_calories,
      protein: item.calculated_protein,
      carbs: item.calculated_carbs,
      fat: item.calculated_fat,
    })),
  };
}

async function buildWeekData(
  plan: NutritionPlanEntity
): Promise<WeekData[]> {
  const db = await getDB();
  const allDays = await db.getAllFromIndex<MealDayEntity>('meal_days', 'by-plan', plan.id);
  const allMeals = await db.getAllFromIndex<MealEntity>('meals', 'by-plan', plan.id);

  // Pre-load all meal items for this plan's meals in bulk
  const mealItemsMap = new Map<string, MealItemEntity[]>();
  for (const meal of allMeals) {
    const items = await db.getAllFromIndex<MealItemEntity>('meal_items', 'by-meal', meal.id);
    mealItemsMap.set(meal.id, items);
  }

  // Group days by week
  const weekMap = new Map<number, MealDayEntity[]>();
  for (const day of allDays) {
    const existing = weekMap.get(day.week) || [];
    existing.push(day);
    weekMap.set(day.week, existing);
  }

  // Group meals by meal_day_id
  const mealsByDay = new Map<string, MealEntity[]>();
  for (const meal of allMeals) {
    const existing = mealsByDay.get(meal.meal_day_id) || [];
    existing.push(meal);
    mealsByDay.set(meal.meal_day_id, existing);
  }

  const weeks: WeekData[] = [];

  for (let w = 1; w <= plan.total_weeks; w++) {
    const weekDays = weekMap.get(w) || [];
    // Sort days by day number
    weekDays.sort((a, b) => a.day - b.day);

    const dayMealsArr: DayMeals[] = [];

    for (const dayEntity of weekDays) {
      const dayMealEntities = mealsByDay.get(dayEntity.id) || [];

      const breakfastMeals = dayMealEntities.filter(m => m.meal_type === 'breakfast');
      const lunchMeals = dayMealEntities.filter(m => m.meal_type === 'lunch');
      const dinnerMeals = dayMealEntities.filter(m => m.meal_type === 'dinner');
      const snackMeals = dayMealEntities.filter(m => m.meal_type === 'snack');

      const toOptions = (meals: MealEntity[]) =>
        meals
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(m => mealEntityToOption(m, mealItemsMap.get(m.id) || []));

      dayMealsArr.push({
        day: dayEntity.day,
        isTrainingDay: dayEntity.is_training_day,
        dayLabel: dayEntity.day_label,
        breakfast: toOptions(breakfastMeals),
        lunch: toOptions(lunchMeals),
        dinner: toOptions(dinnerMeals),
        snack: toOptions(snackMeals),
      });
    }

    // Calculate week summary from actual data
    const totalCals = weekDays.reduce((s, d) => s + d.total_calories, 0);
    const totalProt = weekDays.reduce((s, d) => s + d.total_protein, 0);
    const totalCarbs = weekDays.reduce((s, d) => s + d.total_carbs, 0);
    const totalFat = weekDays.reduce((s, d) => s + d.total_fat, 0);
    const nDays = weekDays.length || 1;

    weeks.push({
      week: w,
      summary: {
        avgCalories: `~${Math.round(totalCals / nDays)} kcal/nap`,
        protein: `~${Math.round(totalProt / nDays)}g/nap`,
        carbs: `~${Math.round(totalCarbs / nDays)}g/nap`,
        fat: `~${Math.round(totalFat / nDays)}g/nap`,
        expectedWeightLoss: '',
      },
      days: dayMealsArr,
    });
  }

  return weeks;
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Check if the loaded week data has any actual meal content.
 * A plan can exist in IndexedDB but have empty days if the import
 * failed or data was wiped. In that case we should fall back.
 */
function hasActualMealData(weeks: WeekData[]): boolean {
  if (weeks.length === 0) return false;
  for (const week of weeks) {
    for (const day of week.days) {
      if (day.breakfast.length > 0 || day.lunch.length > 0 || day.dinner.length > 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Convert the hardcoded mealPlan from mealData.ts to WeekData[] format.
 * The format is already compatible, just needs a type assertion.
 */
function getFallbackPlanData(): WeekData[] {
  return hardcodedMealPlan as unknown as WeekData[];
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function usePlanData(): PlanDataState {
  const [planData, setPlanData] = useState<WeekData[]>([]);
  const [activePlan, setActivePlan] = useState<NutritionPlanEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const plan = await NutritionPlanSvc.getActivePlan();
      if (!plan) {
        // No active plan — fall back to hardcoded meal plan so the app
        // always shows meal content even before the user uploads a plan.
        console.log('[usePlanData] No active plan, using hardcoded fallback');
        setPlanData(getFallbackPlanData());
        setActivePlan(null);
        setIsLoading(false);
        return;
      }

      setActivePlan(plan);
      const weeks = await buildWeekData(plan);
      if (!hasActualMealData(weeks)) {
        // Active plan exists but has no meal content (e.g. empty shell from
        // a document upload that contained only personal data). Treat it the
        // same as "no plan" and fall back silently to the hardcoded plan.
        console.log('[usePlanData] Active plan has no meal data, using hardcoded fallback');
        setPlanData(getFallbackPlanData());
        setActivePlan(null);
      } else {
        setPlanData(weeks);
      }
      setIsLoading(false);
    } catch (error) {
      console.warn('[usePlanData] Failed to load:', error);
      // Even on error, provide the hardcoded fallback
      setPlanData(getFallbackPlanData());
      setActivePlan(null);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen for DB changes
    const unsubscribe = onDBChange((event) => {
      if (['nutrition_plans', 'meal_days', 'meals', 'meal_items'].includes(event.store) || event.store === '*') {
        loadData();
      }
    });

    // Listen for storage events (e.g. after publish)
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('stagingUpdated', handleStorage);
    window.addEventListener('profileUpdated', handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('stagingUpdated', handleStorage);
      window.removeEventListener('profileUpdated', handleStorage);
    };
  }, [loadData]);

  return {
    planData,
    isLoading,
    activePlan,
    hasData: planData.length > 0,
    refresh: loadData,
  };
}

// ═══════════════════════════════════════════════════════════════
// STANDALONE: Get plan foods (for Foods tab)
// ═══════════════════════════════════════════════════════════════

export interface PlanFood {
  id: string;
  name: string;
  description: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  benefits: string[];
  suitableFor: string[];
  source: string;
}

/**
 * Load all foods that are used in the active nutrition plan.
 * Falls back to showing ALL foods in DB if plan has no meal-linked foods.
 */
export function usePlanFoods() {
  const [foods, setFoods] = useState<PlanFood[]>([]);
  const [categories, setCategories] = useState<string[]>(['Osszes']);
  const [isLoading, setIsLoading] = useState(true);

  const loadFoods = useCallback(async () => {
    try {
      const plan = await NutritionPlanSvc.getActivePlan();
      if (!plan) {
        setFoods([]);
        setCategories(['Osszes']);
        setIsLoading(false);
        return;
      }

      const db = await getDB();

      const CATEGORY_LABELS: Record<string, string> = {
        'Feherje': 'Feherje',
        'Tejtermek': 'Tejtermek',
        'Komplex_szenhidrat': 'Komplex szenhidrat',
        'Egeszseges_zsir': 'Egeszseges zsir',
        'Huvelyes': 'Huvelyes',
        'Mag': 'Mag',
        'Zoldseg': 'Zoldseg',
        'Tojas': 'Tojas',
      };

      // Try to get foods from active plan's meals first
      const allMeals = await db.getAllFromIndex<MealEntity>('meals', 'by-plan', plan.id);

      const foodIdSet = new Set<string>();
      for (const meal of allMeals) {
        const items = await db.getAllFromIndex<MealItemEntity>('meal_items', 'by-meal', meal.id);
        for (const item of items) {
          foodIdSet.add(item.food_id);
        }
      }

      // Load food entities from plan meals
      const planFoods: PlanFood[] = [];
      const categorySet = new Set<string>();

      if (foodIdSet.size > 0) {
        // Plan has linked foods → show only plan-linked foods
        for (const foodId of foodIdSet) {
          const food = await db.get<any>('foods', foodId);
          if (food) {
            const catLabel = CATEGORY_LABELS[food.category] || food.category;
            categorySet.add(catLabel);
            planFoods.push({
              id: food.id,
              name: food.name,
              description: food.description || '',
              category: catLabel,
              calories: food.calories_per_100g,
              protein: food.protein_per_100g,
              carbs: food.carbs_per_100g,
              fat: food.fat_per_100g,
              benefits: food.benefits || [],
              suitableFor: food.suitable_for || [],
              source: food.source,
            });
          }
        }
      } else {
        // FALLBACK: Plan has no meal items yet → show ALL foods in DB
        // This ensures the Food Catalog isn't empty even if the parser
        // didn't produce meal items (e.g., PDF extraction edge cases)
        console.log('[usePlanFoods] No meal-linked foods found, falling back to all DB foods');
        const allFoods = await db.getAll<any>('foods');
        for (const food of allFoods) {
          const catLabel = CATEGORY_LABELS[food.category] || food.category;
          categorySet.add(catLabel);
          planFoods.push({
            id: food.id,
            name: food.name,
            description: food.description || '',
            category: catLabel,
            calories: food.calories_per_100g,
            protein: food.protein_per_100g,
            carbs: food.carbs_per_100g,
            fat: food.fat_per_100g,
            benefits: food.benefits || [],
            suitableFor: food.suitable_for || [],
            source: food.source,
          });
        }
      }

      // Sort foods alphabetically
      planFoods.sort((a, b) => a.name.localeCompare(b.name, 'hu'));

      setFoods(planFoods);
      setCategories(['Osszes', ...Array.from(categorySet).sort()]);
      setIsLoading(false);
    } catch (error) {
      console.warn('[usePlanFoods] Failed to load:', error);
      setFoods([]);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFoods();

    const unsubscribe = onDBChange((event) => {
      if (['foods', 'nutrition_plans', 'meals', 'meal_items'].includes(event.store) || event.store === '*') {
        loadFoods();
      }
    });

    window.addEventListener('storage', loadFoods);
    window.addEventListener('stagingUpdated', loadFoods);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', loadFoods);
      window.removeEventListener('stagingUpdated', loadFoods);
    };
  }, [loadFoods]);

  return { foods, categories, isLoading, refresh: loadFoods };
}