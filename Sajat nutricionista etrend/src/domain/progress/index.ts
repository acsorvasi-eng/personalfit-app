/**
 * Progress Domain — Body composition trends, goal tracking, analytics.
 * Pure business logic — no storage or UI dependencies.
 */

import type { ProgressEntry, ProgressGoal, ProgressTrend } from '../models';
import { round, avgBy, daysBetween } from '../../core/utils';

// ═══════════════════════════════════════════════════════════════
// Trend Calculations
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate weight change trend over a period.
 * Returns negative for weight loss, positive for gain.
 */
export function calculateWeightTrend(entries: ProgressEntry[]): number {
  if (entries.length < 2) return 0;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return round(sorted[sorted.length - 1].weight - sorted[0].weight, 1);
}

/**
 * Calculate body fat change trend over a period.
 */
export function calculateBodyFatTrend(entries: ProgressEntry[]): number {
  const withFat = entries.filter((e) => e.bodyFat != null);
  if (withFat.length < 2) return 0;
  const sorted = [...withFat].sort((a, b) => a.date.localeCompare(b.date));
  return round((sorted[sorted.length - 1].bodyFat ?? 0) - (sorted[0].bodyFat ?? 0), 1);
}

/**
 * Calculate average weekly weight change (kg/week).
 */
export function weeklyWeightChangeRate(entries: ProgressEntry[]): number {
  if (entries.length < 2) return 0;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const totalDays = daysBetween(sorted[0].date, sorted[sorted.length - 1].date);
  if (totalDays === 0) return 0;
  const totalChange = sorted[sorted.length - 1].weight - sorted[0].weight;
  return round(totalChange / (totalDays / 7), 2);
}

/**
 * Build a comprehensive progress trend summary.
 */
export function buildProgressTrend(
  period: '7d' | '30d' | '90d',
  entries: ProgressEntry[],
  avgCalories: number,
  avgProtein: number,
  workoutSessionsPerWeek: number,
  adherenceScore: number
): ProgressTrend {
  return {
    period,
    weightChange: calculateWeightTrend(entries),
    bodyFatChange: calculateBodyFatTrend(entries),
    avgCalories: round(avgCalories, 0),
    avgProtein: round(avgProtein, 0),
    workoutFrequency: round(workoutSessionsPerWeek, 1),
    adherenceScore: round(adherenceScore, 0),
  };
}

// ═══════════════════════════════════════════════════════════════
// Goal Tracking
// ═══════════════════════════════════════════════════════════════

export interface GoalProgress {
  goal: ProgressGoal;
  currentWeight: number;
  weightRemaining: number;
  percentComplete: number;
  daysRemaining: number | null;
  estimatedCompletionDate: string | null;
  onTrack: boolean;
  weeklyRateNeeded: number | null;
}

/**
 * Calculate progress toward a weight goal.
 */
export function calculateGoalProgress(
  goal: ProgressGoal,
  latestEntry: ProgressEntry | null,
  weeklyRate: number
): GoalProgress {
  const currentWeight = latestEntry?.weight ?? goal.startWeight;
  const targetWeight = goal.targetWeight ?? goal.startWeight;
  const totalChange = Math.abs(targetWeight - goal.startWeight);
  const achieved = Math.abs(currentWeight - goal.startWeight);
  const remaining = Math.abs(targetWeight - currentWeight);
  const percentComplete = totalChange > 0 ? round((achieved / totalChange) * 100, 1) : 100;

  let daysRemaining: number | null = null;
  let estimatedCompletionDate: string | null = null;
  let weeklyRateNeeded: number | null = null;

  if (goal.targetDate) {
    daysRemaining = daysBetween(new Date().toISOString().split('T')[0], goal.targetDate);
    const weeksRemaining = daysRemaining / 7;
    weeklyRateNeeded = weeksRemaining > 0 ? round(remaining / weeksRemaining, 2) : null;
  }

  if (weeklyRate !== 0 && remaining > 0) {
    const weeksNeeded = remaining / Math.abs(weeklyRate);
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + Math.round(weeksNeeded * 7));
    estimatedCompletionDate = estDate.toISOString().split('T')[0];
  }

  // On track if weekly rate is sufficient or already achieved
  const onTrack =
    remaining <= 0.5 ||
    (weeklyRateNeeded != null && Math.abs(weeklyRate) >= weeklyRateNeeded * 0.8);

  return {
    goal,
    currentWeight,
    weightRemaining: round(remaining, 1),
    percentComplete: Math.min(100, percentComplete),
    daysRemaining,
    estimatedCompletionDate,
    onTrack,
    weeklyRateNeeded,
  };
}

// ═══════════════════════════════════════════════════════════════
// Moving Averages (smoothing noisy data)
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate simple moving average for weight data.
 * Window = number of entries to average.
 */
export function weightMovingAverage(entries: ProgressEntry[], window = 7): number[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const weights = sorted.map((e) => e.weight);
  const result: number[] = [];

  for (let i = 0; i < weights.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = weights.slice(start, i + 1);
    result.push(round(slice.reduce((a, b) => a + b, 0) / slice.length, 1));
  }

  return result;
}

/**
 * Calculate exponential moving average (more responsive to recent changes).
 * Alpha = smoothing factor (0.1 = very smooth, 0.3 = responsive).
 */
export function weightEMA(entries: ProgressEntry[], alpha = 0.2): number[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];

  const result: number[] = [sorted[0].weight];
  for (let i = 1; i < sorted.length; i++) {
    const ema = alpha * sorted[i].weight + (1 - alpha) * result[i - 1];
    result.push(round(ema, 1));
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════

export function validateProgressEntry(entry: Partial<ProgressEntry>): string[] {
  const errors: string[] = [];

  if (!entry.date) errors.push('Date is required');
  if (entry.weight != null && (entry.weight < 30 || entry.weight > 300)) {
    errors.push('Weight must be between 30 and 300 kg');
  }
  if (entry.bodyFat != null && (entry.bodyFat < 2 || entry.bodyFat > 60)) {
    errors.push('Body fat must be between 2% and 60%');
  }

  return errors;
}
