/**
 * ====================================================================
 * Prompt Builder — Context-aware prompt construction for local AI
 * ====================================================================
 * Builds structured prompts from user data for the local model adapter.
 * Keeps prompts concise for on-device inference (token-limited).
 */

import type {
  UserProfile,
  DailyNutritionSummary,
  WorkoutLog,
  ProgressEntry,
} from '../domain/models';
import { round, avgBy } from '../core/utils';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface PromptContext {
  userProfile: UserProfile;
  recentNutrition: DailyNutritionSummary[];
  recentWorkouts: WorkoutLog[];
  recentProgress: ProgressEntry[];
  question: string;
  category: 'nutrition' | 'workout' | 'progress' | 'general';
}

// ═══════════════════════════════════════════════════════════════
// Prompt Templates
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PREFIX = `You are an expert offline fitness and nutrition coach. 
Provide concise, actionable advice based on the user's data. 
Be encouraging but honest. Keep responses under 150 words.`;

/**
 * Build a complete prompt string from context.
 */
export function buildPrompt(ctx: PromptContext): string {
  const parts: string[] = [SYSTEM_PREFIX, ''];

  // User profile summary
  parts.push(buildProfileSection(ctx.userProfile));

  // Recent data summary (category-specific)
  switch (ctx.category) {
    case 'nutrition':
      parts.push(buildNutritionSection(ctx.recentNutrition));
      break;
    case 'workout':
      parts.push(buildWorkoutSection(ctx.recentWorkouts));
      break;
    case 'progress':
      parts.push(buildProgressSection(ctx.recentProgress));
      break;
    default:
      // Include brief summary of all
      parts.push(buildNutritionSection(ctx.recentNutrition));
      parts.push(buildWorkoutSection(ctx.recentWorkouts));
      parts.push(buildProgressSection(ctx.recentProgress));
  }

  parts.push(`\nUser question: ${ctx.question}`);
  parts.push('\nProvide a helpful, personalized response:');

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// Section Builders
// ═══════════════════════════════════════════════════════════════

function buildProfileSection(profile: UserProfile): string {
  return [
    '--- User Profile ---',
    `Name: ${profile.name}`,
    `Age: ${profile.age}, Gender: ${profile.gender}`,
    `Weight: ${profile.weight}kg, Height: ${profile.height}cm`,
    `Activity: ${profile.activityLevel.replace('_', ' ')}`,
    `Goal: ${profile.goal.replace('_', ' ')}`,
    profile.calorieTarget ? `Calorie target: ${profile.calorieTarget} kcal/day` : '',
    profile.allergies.length > 0 ? `Allergies: ${profile.allergies.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildNutritionSection(summaries: DailyNutritionSummary[]): string {
  if (summaries.length === 0) return '--- Nutrition: No recent data ---';

  const avgCal = round(avgBy(summaries, (s) => s.totalCalories), 0);
  const avgProt = round(avgBy(summaries, (s) => s.totalProtein), 0);
  const avgCarbs = round(avgBy(summaries, (s) => s.totalCarbs), 0);
  const avgFats = round(avgBy(summaries, (s) => s.totalFats), 0);
  const target = summaries[0]?.calorieTarget ?? 0;
  const daysLogged = summaries.filter((s) => s.mealsLogged > 0).length;

  return [
    `--- Nutrition (last ${summaries.length} days) ---`,
    `Avg intake: ${avgCal} kcal (target: ${target})`,
    `Avg macros: P${avgProt}g / C${avgCarbs}g / F${avgFats}g`,
    `Days logged: ${daysLogged}/${summaries.length}`,
  ].join('\n');
}

function buildWorkoutSection(workouts: WorkoutLog[]): string {
  if (workouts.length === 0) return '--- Workouts: No recent data ---';

  const uniqueDays = new Set(workouts.map((w) => w.date)).size;
  const totalMin = workouts.reduce((s, w) => s + w.duration, 0);
  const totalCal = workouts.reduce((s, w) => s + w.caloriesBurned, 0);
  const types = [...new Set(workouts.map((w) => w.type))];

  return [
    `--- Workouts (recent) ---`,
    `Sessions: ${workouts.length} across ${uniqueDays} days`,
    `Total: ${totalMin} min, ${totalCal} kcal burned`,
    `Types: ${types.slice(0, 5).join(', ')}`,
  ].join('\n');
}

function buildProgressSection(entries: ProgressEntry[]): string {
  if (entries.length === 0) return '--- Progress: No data ---';

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];
  const change = round(latest.weight - first.weight, 1);

  return [
    `--- Progress ---`,
    `Current weight: ${latest.weight}kg`,
    `Weight change: ${change > 0 ? '+' : ''}${change}kg over ${sorted.length} measurements`,
    latest.bodyFat != null ? `Body fat: ${latest.bodyFat}%` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// ═══════════════════════════════════════════════════════════════
// Utility: Build a quick summary prompt (for quick suggestions)
// ═══════════════════════════════════════════════════════════════

export function buildQuickSummaryPrompt(profile: UserProfile): string {
  return [
    'Based on this user profile, suggest 3 quick actionable tips:',
    buildProfileSection(profile),
  ].join('\n');
}
