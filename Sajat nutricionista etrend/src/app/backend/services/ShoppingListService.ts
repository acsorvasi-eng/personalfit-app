/**
 * ====================================================================
 * Shopping List Service
 * ====================================================================
 * Auto-generates shopping lists from the active NutritionPlan.
 *
 * Rules:
 *   - Aggregates duplicate ingredients across meals for a week
 *   - Updates when plan version changes
 *   - Reflects only the active plan
 *   - Supports check/uncheck per item
 */

import { getDB, generateId, nowISO, notifyDBChange } from '../db';
import type {
  ShoppingListItemEntity,
  MealDayEntity,
  MealEntity,
  MealItemEntity,
} from '../models';
import * as NutritionPlanService from './NutritionPlanService';

// ═══════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════

export async function getShoppingListForWeek(week: number): Promise<ShoppingListItemEntity[]> {
  const db = await getDB();
  return db.getAllFromIndex<ShoppingListItemEntity>('shopping_list', 'by-week', week);
}

export async function getShoppingListForPlan(planId: string): Promise<ShoppingListItemEntity[]> {
  const db = await getDB();
  return db.getAllFromIndex<ShoppingListItemEntity>('shopping_list', 'by-plan', planId);
}

export async function getFullShoppingList(): Promise<ShoppingListItemEntity[]> {
  const db = await getDB();
  return db.getAll<ShoppingListItemEntity>('shopping_list');
}

export async function getCheckedCount(week: number): Promise<{ checked: number; total: number }> {
  const items = await getShoppingListForWeek(week);
  return {
    checked: items.filter(i => i.is_checked).length,
    total: items.length,
  };
}

// ═══════════════════════════════════════════════════════════════
// GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Regenerate the shopping list for a specific week from the active plan.
 */
export async function regenerateForWeek(week: number): Promise<ShoppingListItemEntity[]> {
  const activePlan = await NutritionPlanService.getActivePlan();
  if (!activePlan) return [];

  const db = await getDB();

  // Clear existing items for this week and plan
  const existing = await db.getAllFromIndex<ShoppingListItemEntity>('shopping_list', 'by-week', week);
  for (const item of existing) {
    if (item.nutrition_plan_id === activePlan.id) {
      await db.delete('shopping_list', item.id);
    }
  }

  // Get all meal days for this week
  const mealDays = await db.getAllFromIndex<MealDayEntity>(
    'meal_days', 'by-plan-week', [activePlan.id, week]
  );

  // Aggregate ingredients by food_id
  const aggregated = new Map<string, {
    food_id: string;
    food_name: string;
    total_grams: number;
    unit: 'g' | 'ml' | 'db';
  }>();

  for (const day of mealDays) {
    const meals = await db.getAllFromIndex<MealEntity>('meals', 'by-meal-day', day.id);
    const primaryMeals = meals.filter(m => m.is_primary);

    for (const meal of primaryMeals) {
      const items = await db.getAllFromIndex<MealItemEntity>('meal_items', 'by-meal', meal.id);

      for (const item of items) {
        const existing = aggregated.get(item.food_id);
        if (existing) {
          existing.total_grams += item.quantity_grams;
        } else {
          aggregated.set(item.food_id, {
            food_id: item.food_id,
            food_name: item.food_name,
            total_grams: item.quantity_grams,
            unit: item.unit,
          });
        }
      }
    }
  }

  // Create shopping list items
  const now = nowISO();
  const newItems: ShoppingListItemEntity[] = [];

  for (const [, agg] of aggregated) {
    const item: ShoppingListItemEntity = {
      id: generateId(),
      food_id: agg.food_id,
      food_name: agg.food_name,
      nutrition_plan_id: activePlan.id,
      total_quantity_grams: Math.round(agg.total_grams),
      week,
      unit: agg.unit,
      is_checked: false,
      created_at: now,
      updated_at: now,
    };

    await db.put('shopping_list', item);
    newItems.push(item);
  }

  notifyDBChange({ store: 'shopping_list', action: 'put' });
  return newItems;
}

/**
 * Regenerate shopping list for all weeks in the active plan.
 */
export async function regenerateAll(): Promise<void> {
  const activePlan = await NutritionPlanService.getActivePlan();
  if (!activePlan) return;

  for (let week = 1; week <= activePlan.total_weeks; week++) {
    await regenerateForWeek(week);
  }
}

// ═══════════════════════════════════════════════════════════════
// CHECK/UNCHECK
// ═══════════════════════════════════════════════════════════════

export async function toggleItemChecked(itemId: string): Promise<boolean> {
  const db = await getDB();
  const item = await db.get<ShoppingListItemEntity>('shopping_list', itemId);
  if (!item) throw new Error(`Bevásárlólista elem nem található: ${itemId}`);

  item.is_checked = !item.is_checked;
  item.updated_at = nowISO();
  await db.put('shopping_list', item);
  notifyDBChange({ store: 'shopping_list', action: 'put', key: itemId });
  return item.is_checked;
}

export async function checkAllForWeek(week: number): Promise<void> {
  const items = await getShoppingListForWeek(week);
  const db = await getDB();
  const now = nowISO();

  for (const item of items) {
    item.is_checked = true;
    item.updated_at = now;
    await db.put('shopping_list', item);
  }

  notifyDBChange({ store: 'shopping_list', action: 'put' });
}

export async function uncheckAllForWeek(week: number): Promise<void> {
  const items = await getShoppingListForWeek(week);
  const db = await getDB();
  const now = nowISO();

  for (const item of items) {
    item.is_checked = false;
    item.updated_at = now;
    await db.put('shopping_list', item);
  }

  notifyDBChange({ store: 'shopping_list', action: 'put' });
}

// ═══════════════════════════════════════════════════════════════
// MANUAL ADD/REMOVE
// ═══════════════════════════════════════════════════════════════

export async function addManualItem(input: {
  food_id: string;
  food_name: string;
  quantity_grams: number;
  week: number;
  unit?: 'g' | 'ml' | 'db';
}): Promise<ShoppingListItemEntity> {
  const db = await getDB();
  const activePlan = await NutritionPlanService.getActivePlan();
  const now = nowISO();

  const item: ShoppingListItemEntity = {
    id: generateId(),
    food_id: input.food_id,
    food_name: input.food_name,
    nutrition_plan_id: activePlan?.id || 'manual',
    total_quantity_grams: input.quantity_grams,
    week: input.week,
    unit: input.unit || 'g',
    is_checked: false,
    created_at: now,
    updated_at: now,
  };

  await db.put('shopping_list', item);
  notifyDBChange({ store: 'shopping_list', action: 'put', key: item.id });
  return item;
}

export async function removeItem(itemId: string): Promise<void> {
  const db = await getDB();
  await db.delete('shopping_list', itemId);
  notifyDBChange({ store: 'shopping_list', action: 'delete', key: itemId });
}
