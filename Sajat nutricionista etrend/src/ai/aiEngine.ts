/**
 * ====================================================================
 * AI Engine — Offline intelligence coordinator
 * ====================================================================
 * Orchestrates the local AI pipeline:
 * 1. Build context-aware prompts (promptBuilder)
 * 2. Run through local model adapter (or rule fallback)
 * 3. Parse and validate responses
 * 4. Store interaction history
 *
 * Fully offline — no API calls. Uses local heuristics and
 * optional on-device model inference (future: ONNX/TFLite).
 */

import type {
  UserProfile,
  DailyNutritionSummary,
  WorkoutLog,
  ProgressEntry,
  AIHistory,
  AIRecommendation,
} from '../domain/models';
import { buildPrompt, type PromptContext } from './promptBuilder';
import { runLocalInference, isModelAvailable } from './localModelAdapter';
import { generateRecommendations, type RecommendationContext } from '../engine/recommendationEngine';
import { generateId, nowISO } from '../core/utils';
import { logger } from '../core/config';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface AIQuery {
  question: string;
  category: 'nutrition' | 'workout' | 'progress' | 'general';
  context?: Partial<PromptContext>;
}

export interface AIResponse {
  answer: string;
  confidence: number;
  source: 'local_model' | 'rule_engine' | 'fallback';
  recommendations: AIRecommendation[];
  historyEntry: AIHistory;
}

// ═══════════════════════════════════════════════════════════════
// Main AI Pipeline
// ═══════════════════════════════════════════════════════════════

/**
 * Process an AI query through the local intelligence pipeline.
 * Falls back gracefully: local model → rule engine → static response.
 */
export async function processQuery(
  query: AIQuery,
  profile: UserProfile,
  recentNutrition: DailyNutritionSummary[],
  recentWorkouts: WorkoutLog[],
  recentProgress: ProgressEntry[]
): Promise<AIResponse> {
  const startTime = Date.now();

  // Build context for the prompt
  const promptContext: PromptContext = {
    userProfile: profile,
    recentNutrition,
    recentWorkouts,
    recentProgress,
    question: query.question,
    category: query.category,
    ...query.context,
  };

  let answer: string;
  let confidence: number;
  let source: AIResponse['source'];

  // Try local model first
  if (await isModelAvailable()) {
    try {
      const prompt = buildPrompt(promptContext);
      const result = await runLocalInference(prompt);
      answer = result.text;
      confidence = result.confidence;
      source = 'local_model';
      logger.info('[AIEngine] Local model responded', { confidence });
    } catch (err) {
      logger.warn('[AIEngine] Local model failed, falling back to rules:', err);
      const fallback = generateRuleBasedResponse(query, promptContext);
      answer = fallback.answer;
      confidence = fallback.confidence;
      source = 'rule_engine';
    }
  } else {
    // No model available — use rule engine
    const fallback = generateRuleBasedResponse(query, promptContext);
    answer = fallback.answer;
    confidence = fallback.confidence;
    source = 'rule_engine';
  }

  // Generate recommendations from the engine
  const recContext: RecommendationContext = {
    profile,
    macroTargets: {
      calories: profile.calorieTarget ?? 2000,
      protein: 150,
      carbs: 250,
      fats: 70,
    },
    recentNutrition,
    recentWorkouts,
    recentProgress,
  };
  const recommendations = generateRecommendations(recContext);

  // Create history entry
  const historyEntry: AIHistory = {
    id: generateId(),
    timestamp: Date.now(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    prompt: query.question,
    response: answer,
    category: query.category,
    confidence,
    modelId: source,
    isOffline: true,
  };

  const duration = Date.now() - startTime;
  logger.info(`[AIEngine] Query processed in ${duration}ms (source: ${source})`);

  return { answer, confidence, source, recommendations, historyEntry };
}

// ═══════════════════════════════════════════════════════════════
// Rule-Based Fallback
// ═══════════════════════════════════════════════════════════════

function generateRuleBasedResponse(
  query: AIQuery,
  ctx: PromptContext
): { answer: string; confidence: number } {
  const { category } = query;
  const q = query.question.toLowerCase();

  // Nutrition questions
  if (category === 'nutrition' || q.includes('calorie') || q.includes('protein') || q.includes('eat')) {
    if (ctx.recentNutrition.length > 0) {
      const avgCal = Math.round(
        ctx.recentNutrition.reduce((s, n) => s + n.totalCalories, 0) / ctx.recentNutrition.length
      );
      return {
        answer: `Based on your recent intake (avg ${avgCal} kcal/day), I recommend focusing on consistent meal logging and ensuring adequate protein. Your target is ${ctx.userProfile.calorieTarget ?? 2000} kcal/day.`,
        confidence: 0.7,
      };
    }
    return {
      answer: 'Start logging your meals to get personalized nutrition advice. Track at least 3 days for meaningful insights.',
      confidence: 0.5,
    };
  }

  // Workout questions
  if (category === 'workout' || q.includes('exercise') || q.includes('workout') || q.includes('train')) {
    const sessions = ctx.recentWorkouts.length;
    if (sessions > 0) {
      return {
        answer: `You've completed ${sessions} workout sessions recently. For your ${ctx.userProfile.goal.replace('_', ' ')} goal, aim for 3-5 sessions per week with a mix of cardio and strength training.`,
        confidence: 0.7,
      };
    }
    return {
      answer: 'No recent workouts found. Start with something you enjoy — even a 20-minute walk counts! Consistency matters more than intensity.',
      confidence: 0.5,
    };
  }

  // Progress questions
  if (category === 'progress' || q.includes('weight') || q.includes('progress') || q.includes('body')) {
    if (ctx.recentProgress.length >= 2) {
      const latest = ctx.recentProgress[ctx.recentProgress.length - 1];
      const first = ctx.recentProgress[0];
      const change = (latest.weight - first.weight).toFixed(1);
      return {
        answer: `Your weight changed by ${change} kg over the tracked period. ${Number(change) < 0 ? 'Great progress!' : 'Consider reviewing your calorie target.'} Keep logging consistently for better trend analysis.`,
        confidence: 0.7,
      };
    }
    return {
      answer: 'Log your weight at least 2-3 times per week for meaningful progress tracking. First thing in the morning works best.',
      confidence: 0.5,
    };
  }

  // General fallback
  return {
    answer: "I'm your offline fitness coach. I can help with nutrition tracking, workout planning, and progress analysis. What would you like to know?",
    confidence: 0.3,
  };
}

// ═══════════════════════════════════════════════════════════════
// Quick Suggestions (no full pipeline)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate quick suggestions based on time of day and recent data.
 * Lightweight alternative to full processQuery.
 */
export function getQuickSuggestions(
  profile: UserProfile,
  todayNutrition?: DailyNutritionSummary,
  todayWorkouts?: WorkoutLog[]
): string[] {
  const suggestions: string[] = [];
  const hour = new Date().getHours();

  // Morning
  if (hour >= 6 && hour <= 9) {
    suggestions.push('Good morning! Start your day with a protein-rich breakfast.');
    if (!todayNutrition || todayNutrition.mealsLogged === 0) {
      suggestions.push('Log your breakfast to stay on track.');
    }
  }

  // Midday
  if (hour >= 11 && hour <= 13) {
    if (todayNutrition && todayNutrition.totalProtein < (profile.calorieTarget ?? 2000) * 0.15 / 4) {
      suggestions.push('Consider a high-protein lunch to meet your daily target.');
    }
  }

  // Evening
  if (hour >= 17 && hour <= 20) {
    if (todayNutrition) {
      const remaining = (profile.calorieTarget ?? 2000) - todayNutrition.totalCalories;
      if (remaining > 0 && remaining < 800) {
        suggestions.push(`You have ~${Math.round(remaining)} kcal left for dinner.`);
      }
    }
  }

  // Workout reminder
  if (hour >= 14 && hour <= 18 && (!todayWorkouts || todayWorkouts.length === 0)) {
    suggestions.push('No workout logged today. Even a short session helps!');
  }

  return suggestions.slice(0, 3);
}
