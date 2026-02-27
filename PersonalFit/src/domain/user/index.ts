/**
 * User Domain — User profile business logic
 * Validation, BMR calculation, and profile management.
 */

import type { UserProfile, ActivityLevel, Gender, GoalType, MacroTargets } from '../models';
import { ACTIVITY_MULTIPLIERS, CALORIES_PER_GRAM, DEFAULT_MACRO_SPLIT, LIMITS } from '../../core/constants';

// ═══════════════════════════════════════════════════════════════
// BMR Calculation (Mifflin-St Jeor)
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation.
 * More accurate than Harris-Benedict for most populations.
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: Gender
): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE).
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Calculate daily calorie target based on goal.
 */
export function calculateCalorieTarget(
  tdee: number,
  goal: GoalType
): number {
  switch (goal) {
    case 'weight_loss':
      return Math.round(tdee * 0.80); // 20% deficit
    case 'muscle_gain':
      return Math.round(tdee * 1.15); // 15% surplus
    case 'maintenance':
    default:
      return tdee;
  }
}

/**
 * Calculate macro targets from calorie target.
 */
export function calculateMacroTargets(
  calorieTarget: number,
  goal: GoalType,
  weightKg: number
): MacroTargets {
  let proteinRatio: number;
  let fatRatio: number;

  switch (goal) {
    case 'weight_loss':
      // Higher protein to preserve muscle during deficit
      proteinRatio = 0.35;
      fatRatio = 0.25;
      break;
    case 'muscle_gain':
      proteinRatio = 0.30;
      fatRatio = 0.25;
      break;
    default:
      proteinRatio = DEFAULT_MACRO_SPLIT.protein;
      fatRatio = DEFAULT_MACRO_SPLIT.fat;
  }

  const carbsRatio = 1 - proteinRatio - fatRatio;

  // Ensure minimum protein: at least 1.6g/kg for active individuals
  const proteinFromRatio = Math.round((calorieTarget * proteinRatio) / CALORIES_PER_GRAM.protein);
  const minProtein = Math.round(weightKg * 1.6);
  const protein = Math.max(proteinFromRatio, minProtein);

  const fats = Math.round((calorieTarget * fatRatio) / CALORIES_PER_GRAM.fat);
  // Remaining calories go to carbs
  const carbCalories = calorieTarget - protein * CALORIES_PER_GRAM.protein - fats * CALORIES_PER_GRAM.fat;
  const carbs = Math.max(0, Math.round(carbCalories / CALORIES_PER_GRAM.carbs));

  return { calories: calorieTarget, protein, carbs, fats };
}

/**
 * Calculate BMI from weight and height.
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Get BMI category label.
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

// ═══════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateUserProfile(profile: Partial<UserProfile>): ValidationResult {
  const errors: string[] = [];

  if (!profile.name?.trim()) {
    errors.push('Name is required');
  }
  if (profile.age != null && (profile.age < LIMITS.MIN_AGE || profile.age > LIMITS.MAX_AGE)) {
    errors.push(`Age must be between ${LIMITS.MIN_AGE} and ${LIMITS.MAX_AGE}`);
  }
  if (profile.weight != null && (profile.weight < LIMITS.MIN_WEIGHT_KG || profile.weight > LIMITS.MAX_WEIGHT_KG)) {
    errors.push(`Weight must be between ${LIMITS.MIN_WEIGHT_KG} and ${LIMITS.MAX_WEIGHT_KG} kg`);
  }
  if (profile.height != null && (profile.height < LIMITS.MIN_HEIGHT_CM || profile.height > LIMITS.MAX_HEIGHT_CM)) {
    errors.push(`Height must be between ${LIMITS.MIN_HEIGHT_CM} and ${LIMITS.MAX_HEIGHT_CM} cm`);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Build a complete calorie & macro plan from a user profile.
 */
export function buildNutritionPlan(profile: UserProfile): MacroTargets {
  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const calorieTarget = profile.calorieTarget ?? calculateCalorieTarget(tdee, profile.goal);
  return calculateMacroTargets(calorieTarget, profile.goal, profile.weight);
}
