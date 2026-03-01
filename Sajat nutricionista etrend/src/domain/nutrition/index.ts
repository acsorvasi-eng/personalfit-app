/**
 * Nutrition Domain — Meal logging, macro calculations, daily summaries.
 * Pure business logic — no storage or UI dependencies.
 */

import type {
  NutritionLog,
  NutritionLogItem,
  DailyNutritionSummary,
  MacroTargets,
} from '../models';
import { CALORIES_PER_GRAM } from '../../core/constants';
import { round, sumBy } from '../../core/utils';

// ═══════════════════════════════════════════════════════════════
// Macro Calculations
// ═══════════════════════════════════════════════════════════════

/** Calculate total calories from macros */
export function caloriesFromMacros(protein: number, carbs: number, fats: number): number {
  return round(
    protein * CALORIES_PER_GRAM.protein +
    carbs * CALORIES_PER_GRAM.carbs +
    fats * CALORIES_PER_GRAM.fat,
    0
  );
}

/** Calculate calories for a food item given quantity and per-100g values */
export function calculateItemNutrition(
  quantityGrams: number,
  caloriesPer100g: number,
  proteinPer100g: number,
  carbsPer100g: number,
  fatPer100g: number
): NutritionLogItem {
  const factor = quantityGrams / 100;
  return {
    foodName: '',
    quantityGrams,
    calories: round(caloriesPer100g * factor, 0),
    protein: round(proteinPer100g * factor, 1),
    carbs: round(carbsPer100g * factor, 1),
    fats: round(fatPer100g * factor, 1),
  };
}

// ═══════════════════════════════════════════════════════════════
// Daily Aggregation
// ═══════════════════════════════════════════════════════════════

/** Aggregate multiple nutrition logs into a daily summary */
export function aggregateDailySummary(
  date: string,
  logs: NutritionLog[],
  targets: MacroTargets
): DailyNutritionSummary {
  return {
    date,
    totalCalories: sumBy(logs, (l) => l.calories),
    totalProtein: round(sumBy(logs, (l) => l.protein), 1),
    totalCarbs: round(sumBy(logs, (l) => l.carbs), 1),
    totalFats: round(sumBy(logs, (l) => l.fats), 1),
    totalFiber: round(sumBy(logs, (l) => l.fiber ?? 0), 1),
    totalWater: sumBy(logs, (l) => l.water ?? 0),
    mealsLogged: logs.length,
    calorieTarget: targets.calories,
    proteinTarget: targets.protein,
    carbsTarget: targets.carbs,
    fatsTarget: targets.fats,
  };
}

// ═══════════════════════════════════════════════════════════════
// Adherence Scoring
// ═══════════════════════════════════════════════════════════════

/** Calculate how closely actual intake matches target (0-100) */
export function calculateAdherenceScore(summary: DailyNutritionSummary): number {
  if (summary.calorieTarget === 0) return 0;

  const calorieAccuracy = 1 - Math.abs(summary.totalCalories - summary.calorieTarget) / summary.calorieTarget;
  const proteinAccuracy = summary.proteinTarget > 0
    ? 1 - Math.abs(summary.totalProtein - summary.proteinTarget) / summary.proteinTarget
    : 1;
  const carbsAccuracy = summary.carbsTarget > 0
    ? 1 - Math.abs(summary.totalCarbs - summary.carbsTarget) / summary.carbsTarget
    : 1;
  const fatsAccuracy = summary.fatsTarget > 0
    ? 1 - Math.abs(summary.totalFats - summary.fatsTarget) / summary.fatsTarget
    : 1;

  // Weighted: calories 40%, protein 30%, carbs 15%, fats 15%
  const score =
    Math.max(0, calorieAccuracy) * 40 +
    Math.max(0, proteinAccuracy) * 30 +
    Math.max(0, carbsAccuracy) * 15 +
    Math.max(0, fatsAccuracy) * 15;

  return Math.min(100, Math.round(score));
}

/** Remaining macros for the day */
export function remainingMacros(summary: DailyNutritionSummary): MacroTargets {
  return {
    calories: Math.max(0, summary.calorieTarget - summary.totalCalories),
    protein: Math.max(0, summary.proteinTarget - summary.totalProtein),
    carbs: Math.max(0, summary.carbsTarget - summary.totalCarbs),
    fats: Math.max(0, summary.fatsTarget - summary.totalFats),
  };
}

// ═══════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════

export function validateNutritionLog(log: Partial<NutritionLog>): string[] {
  const errors: string[] = [];

  if (!log.date) errors.push('Date is required');
  if (log.calories != null && log.calories < 0) errors.push('Calories cannot be negative');
  if (log.protein != null && log.protein < 0) errors.push('Protein cannot be negative');
  if (log.carbs != null && log.carbs < 0) errors.push('Carbs cannot be negative');
  if (log.fats != null && log.fats < 0) errors.push('Fats cannot be negative');
  if (log.calories != null && log.calories > 5000) errors.push('Unusually high calorie value');

  return errors;
}
