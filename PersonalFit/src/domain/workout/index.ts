/**
 * Workout Domain — Exercise logging and calorie burn calculations.
 * Pure business logic — no storage or UI dependencies.
 */

import type { WorkoutLog, WorkoutIntensity, WorkoutCategory } from '../models';
import { MET_VALUES, MAX_WORKOUT_DURATION_MIN } from '../../core/constants';
import { round, sumBy } from '../../core/utils';

// ═══════════════════════════════════════════════════════════════
// Calorie Burn Calculations
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate calories burned using MET formula:
 * Calories = MET * weight(kg) * duration(hours)
 */
export function calculateCaloriesBurned(
  met: number,
  weightKg: number,
  durationMinutes: number
): number {
  return Math.round(met * weightKg * (durationMinutes / 60));
}

/**
 * Look up MET value for an activity type.
 * Falls back to moderate walking (3.5) if unknown.
 */
export function getMETValue(activityType: string): number {
  const key = activityType.toLowerCase().replace(/\s+/g, '_');
  return MET_VALUES[key] ?? 3.5;
}

/**
 * Adjust MET value based on intensity.
 */
export function adjustMETForIntensity(baseMET: number, intensity: WorkoutIntensity): number {
  switch (intensity) {
    case 'light':
      return baseMET * 0.75;
    case 'intense':
      return baseMET * 1.25;
    case 'moderate':
    default:
      return baseMET;
  }
}

/**
 * Full calorie burn calculation for a workout.
 */
export function calculateWorkoutCalories(
  activityType: string,
  intensity: WorkoutIntensity,
  durationMinutes: number,
  weightKg: number
): number {
  const baseMET = getMETValue(activityType);
  const adjustedMET = adjustMETForIntensity(baseMET, intensity);
  return calculateCaloriesBurned(adjustedMET, weightKg, durationMinutes);
}

// ═══════════════════════════════════════════════════════════════
// Workout Summaries
// ═══════════════════════════════════════════════════════════════

export interface WorkoutDaySummary {
  date: string;
  totalDuration: number;
  totalCaloriesBurned: number;
  workoutCount: number;
  categories: WorkoutCategory[];
}

export function summarizeWorkoutDay(date: string, workouts: WorkoutLog[]): WorkoutDaySummary {
  const categories = [...new Set(workouts.map((w) => w.category))];
  return {
    date,
    totalDuration: sumBy(workouts, (w) => w.duration),
    totalCaloriesBurned: sumBy(workouts, (w) => w.caloriesBurned),
    workoutCount: workouts.length,
    categories,
  };
}

export interface WorkoutWeekSummary {
  weekNumber: number;
  totalDuration: number;
  totalCaloriesBurned: number;
  sessionsCount: number;
  avgDurationPerSession: number;
  mostFrequentCategory: WorkoutCategory | null;
}

export function summarizeWorkoutWeek(
  weekNumber: number,
  workouts: WorkoutLog[]
): WorkoutWeekSummary {
  if (workouts.length === 0) {
    return {
      weekNumber,
      totalDuration: 0,
      totalCaloriesBurned: 0,
      sessionsCount: 0,
      avgDurationPerSession: 0,
      mostFrequentCategory: null,
    };
  }

  const totalDuration = sumBy(workouts, (w) => w.duration);
  const categoryCounts: Record<string, number> = {};
  for (const w of workouts) {
    categoryCounts[w.category] = (categoryCounts[w.category] || 0) + 1;
  }
  const mostFrequent = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    weekNumber,
    totalDuration,
    totalCaloriesBurned: sumBy(workouts, (w) => w.caloriesBurned),
    sessionsCount: workouts.length,
    avgDurationPerSession: round(totalDuration / workouts.length, 0),
    mostFrequentCategory: (mostFrequent?.[0] as WorkoutCategory) ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════

export function validateWorkoutLog(log: Partial<WorkoutLog>): string[] {
  const errors: string[] = [];

  if (!log.date) errors.push('Date is required');
  if (!log.type?.trim()) errors.push('Workout type is required');
  if (log.duration != null && log.duration <= 0) errors.push('Duration must be positive');
  if (log.duration != null && log.duration > MAX_WORKOUT_DURATION_MIN) {
    errors.push(`Duration cannot exceed ${MAX_WORKOUT_DURATION_MIN} minutes`);
  }
  if (log.caloriesBurned != null && log.caloriesBurned < 0) {
    errors.push('Calories burned cannot be negative');
  }

  return errors;
}
