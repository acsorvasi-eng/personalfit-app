/**
 * ====================================================================
 * Workout Engine — Offline exercise tracking & calorie burn center
 * ====================================================================
 * Orchestrates workout domain logic for logging, summaries, and
 * training plan management. All offline, all local.
 */

import type { WorkoutLog, WorkoutIntensity, WorkoutCategory, UserProfile } from '../domain/models';
import {
  calculateWorkoutCalories,
  summarizeWorkoutDay,
  summarizeWorkoutWeek,
  getMETValue,
  type WorkoutDaySummary,
  type WorkoutWeekSummary,
} from '../domain/workout';
import { generateId, nowISO, todayDate, groupBy, sumBy, round } from '../core/utils';
import { logger } from '../core/config';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface QuickLogInput {
  type: string;
  category: WorkoutCategory;
  duration: number;          // minutes
  intensity: WorkoutIntensity;
  notes?: string;
}

export interface WorkoutStreak {
  currentStreak: number;     // consecutive days
  longestStreak: number;
  lastWorkoutDate: string | null;
}

export interface WorkoutInsight {
  type: 'frequency' | 'variety' | 'intensity' | 'recovery';
  message: string;
  priority: 'low' | 'medium' | 'high';
}

// ═══════════════════════════════════════════════════════════════
// Quick Log — Create a workout entry from minimal input
// ═══════════════════════════════════════════════════════════════

export function createQuickWorkoutLog(
  input: QuickLogInput,
  userWeight: number
): WorkoutLog {
  const caloriesBurned = calculateWorkoutCalories(
    input.type,
    input.intensity,
    input.duration,
    userWeight
  );

  return {
    id: generateId(),
    timestamp: Date.now(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    date: todayDate(),
    type: input.type,
    category: input.category,
    duration: input.duration,
    intensity: input.intensity,
    caloriesBurned,
    notes: input.notes ?? '',
    exercises: [],
  };
}

// ═══════════════════════════════════════════════════════════════
// Summaries & Stats
// ═══════════════════════════════════════════════════════════════

/**
 * Get daily workout summary for a specific date.
 */
export function getDaySummary(date: string, workouts: WorkoutLog[]): WorkoutDaySummary {
  const dayWorkouts = workouts.filter((w) => w.date === date);
  return summarizeWorkoutDay(date, dayWorkouts);
}

/**
 * Get weekly summary, grouping workouts by week number.
 */
export function getWeekSummary(weekNumber: number, workouts: WorkoutLog[]): WorkoutWeekSummary {
  return summarizeWorkoutWeek(weekNumber, workouts);
}

/**
 * Calculate total calories burned across a date range.
 */
export function totalCaloriesBurnedInRange(
  workouts: WorkoutLog[],
  startDate: string,
  endDate: string
): number {
  return sumBy(
    workouts.filter((w) => w.date >= startDate && w.date <= endDate),
    (w) => w.caloriesBurned
  );
}

// ═══════════════════════════════════════════════════════════════
// Streak Calculation
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate workout streak (consecutive days with at least one workout).
 */
export function calculateWorkoutStreak(workouts: WorkoutLog[]): WorkoutStreak {
  if (workouts.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastWorkoutDate: null };
  }

  const uniqueDates = [...new Set(workouts.map((w) => w.date))].sort();
  const lastWorkoutDate = uniqueDates[uniqueDates.length - 1];

  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = uniqueDates.length - 2; i >= 0; i--) {
    const diff = dayDiff(uniqueDates[i + 1], uniqueDates[i]);
    if (diff === 1) {
      tempStreak++;
    } else {
      if (i === uniqueDates.length - 2) {
        // First gap after last date — current streak set
        currentStreak = tempStreak;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  // Check if the streak is still active (last workout was today or yesterday)
  const today = todayDate();
  const daysSinceLast = dayDiff(today, lastWorkoutDate);
  if (daysSinceLast > 1) {
    currentStreak = 0;
  } else {
    currentStreak = tempStreak;
  }

  return { currentStreak, longestStreak, lastWorkoutDate };
}

function dayDiff(dateA: string, dateB: string): number {
  return Math.round(
    (new Date(dateA).getTime() - new Date(dateB).getTime()) / 86_400_000
  );
}

// ═══════════════════════════════════════════════════════════════
// Workout Insights (rule-based)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate workout insights based on recent activity patterns.
 */
export function generateWorkoutInsights(
  recentWorkouts: WorkoutLog[],
  daysToAnalyze = 14
): WorkoutInsight[] {
  const insights: WorkoutInsight[] = [];

  if (recentWorkouts.length === 0) {
    insights.push({
      type: 'frequency',
      message: 'No workouts logged recently. Start with a short walk or stretch!',
      priority: 'high',
    });
    return insights;
  }

  // Frequency check
  const uniqueDays = new Set(recentWorkouts.map((w) => w.date)).size;
  const avgPerWeek = (uniqueDays / daysToAnalyze) * 7;

  if (avgPerWeek < 3) {
    insights.push({
      type: 'frequency',
      message: `You're averaging ${round(avgPerWeek, 1)} sessions/week. Aim for 3-5 for optimal results.`,
      priority: 'medium',
    });
  }

  // Variety check
  const categories = new Set(recentWorkouts.map((w) => w.category));
  if (categories.size < 2) {
    insights.push({
      type: 'variety',
      message: 'Try mixing in different workout types for balanced fitness.',
      priority: 'low',
    });
  }

  // Intensity check
  const highIntensityCount = recentWorkouts.filter((w) => w.intensity === 'intense').length;
  if (highIntensityCount > recentWorkouts.length * 0.7) {
    insights.push({
      type: 'recovery',
      message: 'Most workouts are high intensity. Consider adding recovery/light days.',
      priority: 'medium',
    });
  }

  // Recovery check — consecutive high-intensity days
  const sorted = [...recentWorkouts].sort((a, b) => a.date.localeCompare(b.date));
  let consecutiveIntense = 0;
  for (const w of sorted) {
    if (w.intensity === 'intense') {
      consecutiveIntense++;
      if (consecutiveIntense >= 3) {
        insights.push({
          type: 'recovery',
          message: '3+ consecutive intense days detected. Rest is crucial for muscle recovery.',
          priority: 'high',
        });
        break;
      }
    } else {
      consecutiveIntense = 0;
    }
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════
// Activity Categories (for UI display)
// ═══════════════════════════════════════════════════════════════

export interface ActivityOption {
  type: string;
  category: WorkoutCategory;
  icon: string;
  metValue: number;
}

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  { type: 'Walking', category: 'cardio', icon: '🚶', metValue: 3.5 },
  { type: 'Jogging', category: 'cardio', icon: '🏃', metValue: 7.0 },
  { type: 'Running', category: 'cardio', icon: '🏃‍♂️', metValue: 9.8 },
  { type: 'Cycling', category: 'cardio', icon: '🚴', metValue: 7.5 },
  { type: 'Swimming', category: 'cardio', icon: '🏊', metValue: 8.0 },
  { type: 'Weight Training', category: 'strength', icon: '🏋️', metValue: 6.0 },
  { type: 'HIIT', category: 'hiit', icon: '⚡', metValue: 10.0 },
  { type: 'Yoga', category: 'flexibility', icon: '🧘', metValue: 3.0 },
  { type: 'Pilates', category: 'flexibility', icon: '🤸', metValue: 3.5 },
  { type: 'Dancing', category: 'cardio', icon: '💃', metValue: 5.5 },
  { type: 'Hiking', category: 'cardio', icon: '🥾', metValue: 6.0 },
  { type: 'Boxing', category: 'hiit', icon: '🥊', metValue: 9.0 },
  { type: 'Jump Rope', category: 'hiit', icon: '⏭️', metValue: 12.3 },
  { type: 'Rowing', category: 'cardio', icon: '🚣', metValue: 7.0 },
  { type: 'Stretching', category: 'flexibility', icon: '🙆', metValue: 2.5 },
];
