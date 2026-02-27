/**
 * ====================================================================
 * Recommendation Engine — Adaptive offline AI + rule-based suggestions
 * ====================================================================
 * Combines rule-based heuristics with optional local AI for generating
 * personalized nutrition, workout, and lifestyle recommendations.
 * Zero network calls — everything runs locally.
 */

import type {
  UserProfile,
  DailyNutritionSummary,
  WorkoutLog,
  ProgressEntry,
  AIRecommendation,
  MacroTargets,
} from '../domain/models';
import { generateId, nowISO, round, avgBy } from '../core/utils';
import { logger } from '../core/config';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface RecommendationContext {
  profile: UserProfile;
  macroTargets: MacroTargets;
  recentNutrition: DailyNutritionSummary[];  // last 7 days
  recentWorkouts: WorkoutLog[];              // last 14 days
  recentProgress: ProgressEntry[];           // last 30 days
  todayNutrition?: DailyNutritionSummary;
  todayWorkouts?: WorkoutLog[];
}

export type RecommendationRule = (ctx: RecommendationContext) => AIRecommendation | null;

// ═══════════════════════════════════════════════════════════════
// Rule-Based Recommendation System
// ═══════════════════════════════════════════════════════════════

/**
 * Generate all applicable recommendations from the rule set.
 */
export function generateRecommendations(ctx: RecommendationContext): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];

  for (const rule of RECOMMENDATION_RULES) {
    try {
      const rec = rule(ctx);
      if (rec) recommendations.push(rec);
    } catch (err) {
      logger.warn('[RecommendationEngine] Rule failed:', err);
    }
  }

  // Sort by priority: high > medium > low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Limit to top 5 recommendations
  return recommendations.slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════
// Individual Rules
// ═══════════════════════════════════════════════════════════════

const RECOMMENDATION_RULES: RecommendationRule[] = [
  // ── Protein Deficit ────────────────────────────────────────
  (ctx) => {
    if (ctx.recentNutrition.length < 3) return null;
    const avgProtein = avgBy(ctx.recentNutrition, (s) => s.totalProtein);
    if (avgProtein < ctx.macroTargets.protein * 0.75) {
      return createRec(
        'macro_tweak',
        'Increase Protein Intake',
        `You're averaging ${round(avgProtein, 0)}g protein/day, but your target is ${ctx.macroTargets.protein}g. Add a protein-rich snack like Greek yogurt, eggs, or a protein shake.`,
        'high'
      );
    }
    return null;
  },

  // ── Calorie Undereating ────────────────────────────────────
  (ctx) => {
    if (ctx.recentNutrition.length < 3) return null;
    const avgCal = avgBy(ctx.recentNutrition, (s) => s.totalCalories);
    if (avgCal < ctx.macroTargets.calories * 0.65) {
      return createRec(
        'macro_tweak',
        'Eating Too Little',
        `Your average intake is ${round(avgCal, 0)} kcal/day — significantly below your ${ctx.macroTargets.calories} kcal target. Severe restriction can slow your metabolism and hinder progress.`,
        'high'
      );
    }
    return null;
  },

  // ── Calorie Overeating ─────────────────────────────────────
  (ctx) => {
    if (ctx.recentNutrition.length < 3) return null;
    const avgCal = avgBy(ctx.recentNutrition, (s) => s.totalCalories);
    if (avgCal > ctx.macroTargets.calories * 1.2 && ctx.profile.goal === 'weight_loss') {
      return createRec(
        'macro_tweak',
        'Calorie Surplus Detected',
        `Averaging ${round(avgCal, 0)} kcal/day while your target is ${ctx.macroTargets.calories} kcal. Consider tracking portions more carefully or swapping high-calorie items.`,
        'medium'
      );
    }
    return null;
  },

  // ── Low Workout Frequency ──────────────────────────────────
  (ctx) => {
    const uniqueDays = new Set(ctx.recentWorkouts.map((w) => w.date)).size;
    const weeksAnalyzed = 2;
    const perWeek = uniqueDays / weeksAnalyzed;
    if (perWeek < 2) {
      return createRec(
        'workout_adjustment',
        'Move More',
        `Only ${uniqueDays} workout sessions in the last 2 weeks. Even 20-minute walks count! Aim for 3-5 sessions per week.`,
        'medium'
      );
    }
    return null;
  },

  // ── No Variety in Workouts ─────────────────────────────────
  (ctx) => {
    if (ctx.recentWorkouts.length < 4) return null;
    const categories = new Set(ctx.recentWorkouts.map((w) => w.category));
    if (categories.size === 1) {
      const only = ctx.recentWorkouts[0].category;
      return createRec(
        'workout_adjustment',
        'Add Workout Variety',
        `All recent workouts are ${only}. Mix in different types (e.g., flexibility, strength) for balanced fitness and injury prevention.`,
        'low'
      );
    }
    return null;
  },

  // ── Weight Plateau ─────────────────────────────────────────
  (ctx) => {
    if (ctx.recentProgress.length < 4 && ctx.profile.goal === 'weight_loss') return null;
    const sorted = [...ctx.recentProgress].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length >= 4) {
      const first = sorted[0].weight;
      const last = sorted[sorted.length - 1].weight;
      if (Math.abs(last - first) < 0.3) {
        return createRec(
          'macro_tweak',
          'Weight Plateau',
          'Your weight has been stable for several weeks. Consider a small calorie adjustment (-100 kcal) or adding one extra workout session per week.',
          'medium'
        );
      }
    }
    return null;
  },

  // ── Recovery Day Suggestion ────────────────────────────────
  (ctx) => {
    if (!ctx.todayWorkouts || ctx.todayWorkouts.length === 0) return null;
    const recentIntense = ctx.recentWorkouts
      .filter((w) => w.intensity === 'intense')
      .sort((a, b) => b.date.localeCompare(a.date));

    if (recentIntense.length >= 3) {
      const lastThreeDates = new Set(recentIntense.slice(0, 3).map((w) => w.date));
      if (lastThreeDates.size <= 3) {
        return createRec(
          'recovery',
          'Rest Day Recommended',
          "You've had several intense sessions recently. A rest or light yoga day helps muscle repair and prevents overtraining.",
          'medium'
        );
      }
    }
    return null;
  },

  // ── Morning Motivation ─────────────────────────────────────
  (ctx) => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 9 && ctx.recentNutrition.length >= 5) {
      const avgAdherence =
        ctx.recentNutrition.filter((s) => s.mealsLogged > 0).length /
        ctx.recentNutrition.length;
      if (avgAdherence >= 0.8) {
        return createRec(
          'motivation',
          'Great Consistency!',
          `You've logged meals on ${round(avgAdherence * 100, 0)}% of recent days. Consistency is the key to lasting results!`,
          'low'
        );
      }
    }
    return null;
  },

  // ── Meal Suggestion (evening, low remaining) ───────────────
  (ctx) => {
    const hour = new Date().getHours();
    if (hour >= 17 && hour <= 20 && ctx.todayNutrition) {
      const remaining = ctx.macroTargets.calories - ctx.todayNutrition.totalCalories;
      const protRemaining = ctx.macroTargets.protein - ctx.todayNutrition.totalProtein;
      if (remaining > 200 && remaining < 600 && protRemaining > 20) {
        return createRec(
          'meal_suggestion',
          'Dinner Idea',
          `You have ~${round(remaining, 0)} kcal and ${round(protRemaining, 0)}g protein left today. A grilled chicken salad or a tofu stir-fry would fit perfectly.`,
          'low'
        );
      }
    }
    return null;
  },
];

// ═══════════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════════

function createRec(
  type: AIRecommendation['type'],
  title: string,
  description: string,
  priority: AIRecommendation['priority']
): AIRecommendation {
  return {
    id: generateId(),
    type,
    title,
    description,
    priority,
    actionable: true,
    createdAt: nowISO(),
  };
}
