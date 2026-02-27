/**
 * ====================================================================
 * Domain Models — Offline-ready typed entities
 * ====================================================================
 * Core domain types for the personal fitness coach app.
 * Every entity extends BaseEntity for IndexedDB compatibility
 * and optional encryption-at-rest support.
 *
 * These models are storage-agnostic — they work with IndexedDB,
 * SQLite (via Capacitor), or any future offline store.
 *
 * NOTE: The existing app/backend/models.ts contains the detailed
 * nutrition-plan-specific entities (FoodEntity, MealEntity, etc.).
 * This file defines the higher-level domain abstractions that
 * engines and repositories operate on.
 */

// ═══════════════════════════════════════════════════════════════
// Base Entity
// ═══════════════════════════════════════════════════════════════

export interface BaseEntity {
  /** UUID v4 primary key */
  id: string;
  /** Unix timestamp (ms) of creation */
  timestamp: number;
  /** Optional encrypted JSON payload for sensitive fields */
  encryptedPayload?: string;
  /** ISO 8601 creation date */
  createdAt: string;
  /** ISO 8601 last update date */
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// User Domain
// ═══════════════════════════════════════════════════════════════

export type Gender = 'male' | 'female';
export type GoalType = 'weight_loss' | 'maintenance' | 'muscle_gain';
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

export interface UserProfile extends BaseEntity {
  name: string;
  age: number;
  weight: number;           // kg
  height: number;           // cm
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: GoalType;
  allergies: string[];
  dietaryPreferences: string[];
  calorieTarget?: number;
  avatar: string;
  bloodPressure?: string;
}

export interface UserPreferences {
  language: 'hu' | 'en' | 'ro';
  theme: 'light' | 'dark' | 'system';
  measurementUnit: 'metric' | 'imperial';
  notificationsEnabled: boolean;
  mealReminders: boolean;
  workoutReminders: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Nutrition Domain
// ═══════════════════════════════════════════════════════════════

export interface NutritionLog extends BaseEntity {
  date: string;             // YYYY-MM-DD
  calories: number;
  protein: number;          // grams
  carbs: number;            // grams
  fats: number;             // grams
  fiber?: number;           // grams
  water?: number;           // ml
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'post_workout';
  mealName: string;
  items: NutritionLogItem[];
}

export interface NutritionLogItem {
  foodName: string;
  quantityGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  totalFiber: number;
  totalWater: number;
  mealsLogged: number;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatsTarget: number;
}

export interface MacroTargets {
  calories: number;
  protein: number;          // grams
  carbs: number;            // grams
  fats: number;             // grams
}

// ═══════════════════════════════════════════════════════════════
// Workout Domain
// ═══════════════════════════════════════════════════════════════

export type WorkoutIntensity = 'light' | 'moderate' | 'intense';
export type WorkoutCategory =
  | 'cardio'
  | 'strength'
  | 'flexibility'
  | 'hiit'
  | 'sports'
  | 'other';

export interface WorkoutLog extends BaseEntity {
  date: string;             // YYYY-MM-DD
  type: string;             // e.g., "Running", "Weight Training"
  category: WorkoutCategory;
  duration: number;         // minutes
  intensity: WorkoutIntensity;
  caloriesBurned: number;
  heartRateAvg?: number;
  heartRateMax?: number;
  steps?: number;
  distance?: number;        // km
  notes: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;          // kg
  duration?: number;        // seconds
  restPeriod?: number;      // seconds
}

// ═══════════════════════════════════════════════════════════════
// Progress / Body Composition Domain
// ═══════════════════════════════════════════════════════════════

export interface ProgressEntry extends BaseEntity {
  date: string;             // YYYY-MM-DD
  weight: number;           // kg
  bodyFat?: number;         // percentage
  muscleMass?: number;      // kg
  bmi?: number;
  visceralFat?: number;
  waist?: number;           // cm
  chest?: number;           // cm
  arm?: number;             // cm
  hip?: number;             // cm
  thigh?: number;           // cm
  neck?: number;            // cm
  notes: string;
  source: 'manual' | 'upload' | 'ai_extracted';
}

export interface ProgressGoal {
  id: string;
  type: GoalType;
  targetWeight?: number;
  targetBodyFat?: number;
  targetDate?: string;
  startWeight: number;
  startDate: string;
  isActive: boolean;
}

export interface ProgressTrend {
  period: '7d' | '30d' | '90d';
  weightChange: number;
  bodyFatChange: number;
  avgCalories: number;
  avgProtein: number;
  workoutFrequency: number;   // sessions per week
  adherenceScore: number;     // 0-100
}

// ═══════════════════════════════════════════════════════════════
// AI Interaction Domain
// ═══════════════════════════════════════════════════════════════

export interface AIHistory extends BaseEntity {
  prompt: string;
  response: string;
  category: 'nutrition' | 'workout' | 'progress' | 'general';
  confidence: number;       // 0-1
  tokensUsed?: number;
  modelId: string;
  isOffline: boolean;
}

export interface AIRecommendation {
  id: string;
  type: 'meal_suggestion' | 'workout_adjustment' | 'macro_tweak' | 'recovery' | 'motivation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  expiresAt?: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// Aggregated Types (for engines)
// ═══════════════════════════════════════════════════════════════

export interface DailySnapshot {
  date: string;
  nutrition: DailyNutritionSummary;
  workouts: WorkoutLog[];
  progress?: ProgressEntry;
  recommendations: AIRecommendation[];
}

export interface WeeklyReport {
  weekNumber: number;
  startDate: string;
  endDate: string;
  avgCalories: number;
  avgProtein: number;
  totalWorkoutMinutes: number;
  weightDelta: number;
  adherenceScore: number;
  highlights: string[];
  suggestions: string[];
}
