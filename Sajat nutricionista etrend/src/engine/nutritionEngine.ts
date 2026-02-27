/**
 * ====================================================================
 * Nutrition Engine — Offline calorie & macro computation center
 * ====================================================================
 * Orchestrates domain logic + storage for daily nutrition management.
 * All calculations happen locally — zero network calls.
 */

import type {
  UserProfile,
  NutritionLog,
  DailyNutritionSummary,
  MacroTargets,
} from '../domain/models';
import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
} from '../domain/user';
import {
  aggregateDailySummary,
  calculateAdherenceScore,
  remainingMacros,
  caloriesFromMacros,
} from '../domain/nutrition';
import { CALORIES_PER_GRAM } from '../core/constants';
import { round, avgBy, pastNDays } from '../core/utils';
import { logger } from '../core/config';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface NutritionPlanResult {
  bmr: number;
  tdee: number;
  calorieTarget: number;
  macros: MacroTargets;
}

export interface DailyNutritionReport {
  summary: DailyNutritionSummary;
  remaining: MacroTargets;
  adherenceScore: number;
  isOverCalories: boolean;
  isOverProtein: boolean;
  calorieDeficit: number;
}

export interface WeeklyNutritionStats {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  bestDay: string | null;
  worstDay: string | null;
  avgAdherence: number;
  daysLogged: number;
}

// ═══════════════════════════════════════════════════════════════
// Core Engine Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Compute a full nutrition plan from a user profile.
 * This is the primary entry point for setting up targets.
 */
export function computeNutritionPlan(profile: UserProfile): NutritionPlanResult {
  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const calorieTarget = profile.calorieTarget ?? calculateCalorieTarget(tdee, profile.goal);
  const macros = calculateMacroTargets(calorieTarget, profile.goal, profile.weight);

  logger.info('[NutritionEngine] Plan computed:', {
    bmr: round(bmr, 0),
    tdee,
    calorieTarget,
    macros,
  });

  return { bmr: round(bmr, 0), tdee, calorieTarget, macros };
}

/**
 * Generate a daily nutrition report from logged meals.
 */
export function generateDailyReport(
  date: string,
  logs: NutritionLog[],
  targets: MacroTargets
): DailyNutritionReport {
  const summary = aggregateDailySummary(date, logs, targets);
  const remaining = remainingMacros(summary);
  const adherenceScore = calculateAdherenceScore(summary);

  return {
    summary,
    remaining,
    adherenceScore,
    isOverCalories: summary.totalCalories > targets.calories,
    isOverProtein: summary.totalProtein > targets.protein,
    calorieDeficit: targets.calories - summary.totalCalories,
  };
}

/**
 * Compute weekly nutrition statistics from daily summaries.
 */
export function computeWeeklyStats(
  dailySummaries: DailyNutritionSummary[]
): WeeklyNutritionStats {
  if (dailySummaries.length === 0) {
    return {
      avgCalories: 0,
      avgProtein: 0,
      avgCarbs: 0,
      avgFats: 0,
      bestDay: null,
      worstDay: null,
      avgAdherence: 0,
      daysLogged: 0,
    };
  }

  const scores = dailySummaries.map((s) => ({
    date: s.date,
    score: calculateAdherenceScore(s),
  }));

  const best = scores.reduce((a, b) => (b.score > a.score ? b : a));
  const worst = scores.reduce((a, b) => (b.score < a.score ? b : a));

  return {
    avgCalories: round(avgBy(dailySummaries, (s) => s.totalCalories), 0),
    avgProtein: round(avgBy(dailySummaries, (s) => s.totalProtein), 1),
    avgCarbs: round(avgBy(dailySummaries, (s) => s.totalCarbs), 1),
    avgFats: round(avgBy(dailySummaries, (s) => s.totalFats), 1),
    bestDay: best.date,
    worstDay: worst.date,
    avgAdherence: round(avgBy(scores, (s) => s.score), 0),
    daysLogged: dailySummaries.filter((s) => s.mealsLogged > 0).length,
  };
}

/**
 * Adjust calorie target based on recent adherence and progress.
 * Adaptive algorithm: if consistently over/under, adjust targets.
 */
export function adaptiveCalorieAdjustment(
  currentTarget: number,
  recentSummaries: DailyNutritionSummary[],
  weightTrendKgPerWeek: number
): number {
  if (recentSummaries.length < 3) return currentTarget;

  const avgCalories = avgBy(recentSummaries, (s) => s.totalCalories);
  const avgAdherence = avgBy(
    recentSummaries.map((s) => calculateAdherenceScore(s)),
    (s) => s
  );

  // If user consistently eats too little and losing too fast, increase
  if (avgCalories < currentTarget * 0.75 && weightTrendKgPerWeek < -1.0) {
    logger.info('[NutritionEngine] Adaptive: increasing target (too aggressive deficit)');
    return Math.round(currentTarget * 1.05);
  }

  // If user consistently over-eats and not losing, decrease slightly
  if (avgCalories > currentTarget * 1.15 && weightTrendKgPerWeek > 0) {
    logger.info('[NutritionEngine] Adaptive: decreasing target (surplus detected)');
    return Math.round(currentTarget * 0.95);
  }

  return currentTarget;
}

/**
 * Calculate how many extra calories workout activity "earns" for the day.
 */
export function activityCalorieBonus(
  baseTarget: number,
  workoutCaloriesBurned: number,
  goal: 'weight_loss' | 'maintenance' | 'muscle_gain'
): number {
  switch (goal) {
    case 'weight_loss':
      // Only earn back 50% of burned calories during weight loss
      return Math.round(workoutCaloriesBurned * 0.5);
    case 'muscle_gain':
      // Earn back 100% + small bonus for recovery
      return Math.round(workoutCaloriesBurned * 1.1);
    case 'maintenance':
    default:
      return Math.round(workoutCaloriesBurned * 0.75);
  }
}
