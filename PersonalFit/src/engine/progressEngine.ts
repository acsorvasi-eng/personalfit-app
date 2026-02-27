/**
 * ====================================================================
 * Progress Engine — Offline trend tracking & goal management
 * ====================================================================
 * Analyzes body composition data, calculates trends, and manages
 * weight/body-fat goals. Fully offline.
 */

import type {
  ProgressEntry,
  ProgressGoal,
  ProgressTrend,
  DailyNutritionSummary,
  WorkoutLog,
  WeeklyReport,
} from '../domain/models';
import {
  calculateWeightTrend,
  calculateBodyFatTrend,
  weeklyWeightChangeRate,
  buildProgressTrend,
  calculateGoalProgress,
  weightMovingAverage,
  weightEMA,
  type GoalProgress,
} from '../domain/progress';
import { round, avgBy, pastNDays, getWeekNumber } from '../core/utils';
import { logger } from '../core/config';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface ProgressDashboard {
  currentWeight: number | null;
  currentBodyFat: number | null;
  weightTrend7d: number;
  weightTrend30d: number;
  bodyFatTrend30d: number;
  weeklyRate: number;
  movingAverage: number[];
  goalProgress: GoalProgress | null;
  insights: ProgressInsight[];
}

export interface ProgressInsight {
  type: 'positive' | 'neutral' | 'warning';
  category: 'weight' | 'body_fat' | 'consistency' | 'plateau';
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// Dashboard Builder
// ═══════════════════════════════════════════════════════════════

/**
 * Build a comprehensive progress dashboard from all available data.
 */
export function buildProgressDashboard(
  allEntries: ProgressEntry[],
  activeGoal: ProgressGoal | null
): ProgressDashboard {
  const sorted = [...allEntries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1] ?? null;

  // Filter entries by period
  const last7 = filterByPeriod(sorted, 7);
  const last30 = filterByPeriod(sorted, 30);

  const weeklyRate = weeklyWeightChangeRate(last30);
  const movingAvg = weightMovingAverage(sorted, 7);

  let goalProgress: GoalProgress | null = null;
  if (activeGoal && latest) {
    goalProgress = calculateGoalProgress(activeGoal, latest, weeklyRate);
  }

  const insights = generateProgressInsights(sorted, last7, last30, weeklyRate);

  return {
    currentWeight: latest?.weight ?? null,
    currentBodyFat: latest?.bodyFat ?? null,
    weightTrend7d: calculateWeightTrend(last7),
    weightTrend30d: calculateWeightTrend(last30),
    bodyFatTrend30d: calculateBodyFatTrend(last30),
    weeklyRate,
    movingAverage: movingAvg,
    goalProgress,
    insights,
  };
}

// ═══════════════════════════════════════════════════════════════
// Weekly Report Generation
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a weekly report combining nutrition, workout, and progress data.
 */
export function generateWeeklyReport(
  weekNumber: number,
  startDate: string,
  endDate: string,
  nutritionSummaries: DailyNutritionSummary[],
  workouts: WorkoutLog[],
  progressEntries: ProgressEntry[]
): WeeklyReport {
  const avgCalories = avgBy(nutritionSummaries, (s) => s.totalCalories);
  const avgProtein = avgBy(nutritionSummaries, (s) => s.totalProtein);
  const totalWorkoutMin = workouts.reduce((sum, w) => sum + w.duration, 0);
  const weightDelta = calculateWeightTrend(progressEntries);

  const highlights: string[] = [];
  const suggestions: string[] = [];

  // Generate highlights
  if (nutritionSummaries.length >= 5) {
    highlights.push(`Logged meals on ${nutritionSummaries.length} of 7 days`);
  }
  if (workouts.length >= 3) {
    highlights.push(`Completed ${workouts.length} workout sessions`);
  }
  if (weightDelta < 0) {
    highlights.push(`Lost ${Math.abs(weightDelta)} kg this week`);
  }

  // Generate suggestions
  if (nutritionSummaries.length < 5) {
    suggestions.push('Try to log meals consistently every day');
  }
  if (workouts.length < 3) {
    suggestions.push('Aim for at least 3 workout sessions per week');
  }
  if (avgProtein < 100) {
    suggestions.push('Consider increasing protein intake for better recovery');
  }

  const adherenceScore = nutritionSummaries.length > 0
    ? round((nutritionSummaries.length / 7) * 100, 0)
    : 0;

  return {
    weekNumber,
    startDate,
    endDate,
    avgCalories: round(avgCalories, 0),
    avgProtein: round(avgProtein, 0),
    totalWorkoutMinutes: totalWorkoutMin,
    weightDelta: round(weightDelta, 1),
    adherenceScore,
    highlights,
    suggestions,
  };
}

// ═══════════════════════════════════════════════════════════════
// Trend Analysis (for multiple periods)
// ═══════════════════════════════════════════════════════════════

/**
 * Build progress trends for 7d, 30d, and 90d periods.
 */
export function buildAllTrends(
  entries: ProgressEntry[],
  nutritionSummaries: DailyNutritionSummary[],
  workouts: WorkoutLog[]
): ProgressTrend[] {
  const periods: Array<{ period: '7d' | '30d' | '90d'; days: number }> = [
    { period: '7d', days: 7 },
    { period: '30d', days: 30 },
    { period: '90d', days: 90 },
  ];

  return periods.map(({ period, days }) => {
    const periodEntries = filterByPeriod(entries, days);
    const periodNutrition = filterByPeriod(nutritionSummaries, days, (s) => s.date);
    const periodWorkouts = filterByPeriod(workouts, days, (w) => w.date);

    const avgCal = avgBy(periodNutrition, (s) => s.totalCalories);
    const avgProt = avgBy(periodNutrition, (s) => s.totalProtein);
    const uniqueWorkoutDays = new Set(periodWorkouts.map((w) => w.date)).size;
    const workoutsPerWeek = (uniqueWorkoutDays / days) * 7;
    const adherence = periodNutrition.length > 0
      ? round((periodNutrition.length / days) * 100, 0)
      : 0;

    return buildProgressTrend(period, periodEntries, avgCal, avgProt, workoutsPerWeek, adherence);
  });
}

// ═══════════════════════════════════════════════════════════════
// Insight Generation
// ═══════════════════════════════════════════════════════════════

function generateProgressInsights(
  allEntries: ProgressEntry[],
  last7: ProgressEntry[],
  last30: ProgressEntry[],
  weeklyRate: number
): ProgressInsight[] {
  const insights: ProgressInsight[] = [];

  // Plateau detection (less than 0.2kg change in 2+ weeks)
  if (last30.length >= 4 && Math.abs(calculateWeightTrend(last30)) < 0.3) {
    insights.push({
      type: 'warning',
      category: 'plateau',
      message: 'Weight has been stable for 30+ days. Consider adjusting your calorie target or workout routine.',
    });
  }

  // Rapid loss warning (>1kg/week)
  if (weeklyRate < -1.0) {
    insights.push({
      type: 'warning',
      category: 'weight',
      message: `Losing ${Math.abs(round(weeklyRate, 1))} kg/week — this is faster than recommended (0.5-1 kg/week). Consider eating more.`,
    });
  }

  // Positive trend
  if (weeklyRate >= -0.8 && weeklyRate <= -0.3) {
    insights.push({
      type: 'positive',
      category: 'weight',
      message: 'Great pace! You are losing weight at a healthy, sustainable rate.',
    });
  }

  // Consistency check
  if (last7.length < 2) {
    insights.push({
      type: 'neutral',
      category: 'consistency',
      message: 'Log your weight more frequently for better trend analysis. 2-3 times per week is ideal.',
    });
  }

  // Body fat improvement
  const fatTrend = calculateBodyFatTrend(last30);
  if (fatTrend < -0.5) {
    insights.push({
      type: 'positive',
      category: 'body_fat',
      message: `Body fat decreased by ${Math.abs(fatTrend)}% this month. Keep up the good work!`,
    });
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function filterByPeriod<T extends { date: string }>(items: T[], days: number): T[];
function filterByPeriod<T>(items: T[], days: number, dateFn: (item: T) => string): T[];
function filterByPeriod<T>(items: T[], days: number, dateFn?: (item: T) => string): T[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return items.filter((item) => {
    const date = dateFn ? dateFn(item) : (item as any).date;
    return date >= cutoffStr;
  });
}
