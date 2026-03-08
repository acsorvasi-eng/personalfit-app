/**
 * ====================================================================
 * Dynamic Calorie Engine Service (NON-NEGOTIABLE CORE)
 * ====================================================================
 *
 * FORMULA LOGIC:
 *
 *   1. BMR (Basal Metabolic Rate) — Mifflin-St Jeor Equation:
 *      Male:   BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
 *      Female: BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
 *
 *   2. TDEE (Total Daily Energy Expenditure):
 *      TDEE = BMR * Activity_Multiplier
 *
 *      Activity Multipliers:
 *        Sedentary:        1.2
 *        Lightly active:   1.375
 *        Moderately active: 1.55
 *        Very active:      1.725
 *        Extremely active: 1.9
 *
 *   3. Goal Adjustment:
 *      Weight loss:   TDEE - 500 kcal (0.5 kg/week target)
 *      Maintenance:   TDEE
 *      Muscle gain:   TDEE + 300 kcal (lean bulk)
 *
 *   4. Daily Budget:
 *      Base_Need = Goal_Adjusted_TDEE
 *      Calories_Burned = Activity_Log_Today + Scheduled_Training_Estimate
 *      Budget = Base_Need + Calories_Burned (can eat more if you burn more)
 *      Remaining = Budget - Consumed
 *
 *   5. Energy Balance:
 *      Net = Consumed - Burned
 *      Balance = Consumed - Base_Need
 *      (Negative = deficit = weight loss direction)
 *
 * REAL-TIME UPDATES:
 *   The calorie engine reads from IndexedDB (profile + settings) and
 *   recomputes on every call. Components poll or subscribe via
 *   BroadcastChannel for cross-tab sync.
 */

import type {
  DailyCalorieBudget,
  EnergyBalanceSnapshot,
  UserProfileEntity,
  ActivityLevel,
  Gender,
  GoalType,
} from '../models';
import { todayDate, nowISO, getDB } from '../db';
import { getUserProfile } from './UserProfileService';
import * as ActivityService from './ActivityService';
import { getSetting } from './SettingsService';

// ═══════════════════════════════════════════════════════════════
// BMR & TDEE CALCULATIONS
// ═══════════════════════════════════════════════════════════════

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

const GOAL_ADJUSTMENTS: Record<GoalType, number> = {
  weight_loss: -500,
  maintenance: 0,
  muscle_gain: 300,
};

export function calculateBMR(
  weight: number, height: number, age: number, gender: Gender
): number {
  if (gender === 'male') {
    return (10 * weight) + (6.25 * height) - (5 * age) + 5;
  }
  return (10 * weight) + (6.25 * height) - (5 * age) - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calculateGoalTarget(
  tdee: number, goal: GoalType
): number {
  return Math.round(tdee + GOAL_ADJUSTMENTS[goal]);
}

// ═══════════════════════════════════════════════════════════════
// PROFILE READER (IndexedDB user_profile + settings fallback)
// ═══════════════════════════════════════════════════════════════

function mapActivityLevel(level: string): ActivityLevel {
  const MAP: Record<string, ActivityLevel> = {
    'Alacsony': 'sedentary',
    'Kozepes': 'moderately_active',
    'Magas': 'very_active',
    'Nagyon magas': 'extremely_active',
    'Konnyu': 'lightly_active',
  };
  return MAP[level] || 'moderately_active';
}

function mapGoal(goal: string): GoalType {
  const MAP: Record<string, GoalType> = {
    'Fogyas': 'weight_loss',
    'Szinttartas': 'maintenance',
    'Izomepites': 'muscle_gain',
    'Tomegepit': 'muscle_gain',
  };
  return MAP[goal] || 'weight_loss';
}

async function readProfile(): Promise<{
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: GoalType;
  calorieTarget?: number;
}> {
  try {
    const stored = await getUserProfile();
    return {
      weight: stored.weight || 80,
      height: stored.height || 175,
      age: stored.age || 30,
      gender: (stored as any).gender === 'female' ? 'female' : 'male',
      activityLevel: mapActivityLevel(stored.activityLevel || 'Kozepes'),
      goal: mapGoal(stored.goal || 'Fogyas'),
      calorieTarget: stored.calorieTarget,
    };
  } catch {
    return {
      weight: 80,
      height: 175,
      age: 30,
      gender: 'male',
      activityLevel: 'moderately_active',
      goal: 'weight_loss',
    };
  }
}

async function readConsumedToday(): Promise<number> {
  try {
    const db = await getDB();
    const today = todayDate();
    const allMealDays = await db.getAll('meal_days');
    const todayMealDayIds = allMealDays
      .filter((md: any) => md.date === today)
      .map((md: any) => md.id);
    if (todayMealDayIds.length === 0) {
      const raw = await getSetting('totalConsumedCalories');
      return raw ? parseInt(raw) || 0 : 0;
    }
    let total = 0;
    for (const mealDayId of todayMealDayIds) {
      const meals = await db.getAllFromIndex('meals', 'by-meal-day', mealDayId);
      for (const meal of meals as any[]) {
        const items = await db.getAllFromIndex('meal_items', 'by-meal', meal.id);
        for (const item of items as any[]) {
          if (item.calories) total += item.calories;
        }
      }
    }
    return total;
  } catch {
    const raw = await getSetting('totalConsumedCalories');
    return raw ? parseInt(raw) || 0 : 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Compute the full daily calorie budget for today.
 * This is the core function that other modules depend on.
 */
export async function computeDailyBudget(): Promise<DailyCalorieBudget> {
  const profile = await readProfile();

  // Step 1: BMR
  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);

  // Step 2: TDEE
  const tdee = calculateTDEE(bmr, profile.activityLevel);

  // Step 3: Goal-adjusted target
  const baseNeed = profile.calorieTarget || calculateGoalTarget(tdee, profile.goal);

  // Step 4: Calories burned from activity logs
  const burnedActivity = await ActivityService.getTodayCaloriesBurned();

  // Step 5: Estimated burn from scheduled training
  // Determine current week/day of the plan
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon ... 7=Sun
  const dayOfMonth = now.getDate();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);
  const burnedScheduled = await ActivityService.getScheduledCaloriesBurn(weekOfMonth, dayOfWeek);

  // Step 6: Read consumed
  const consumed = await readConsumedToday();

  // Step 7: Calculate budget and balance
  const totalBurn = burnedActivity + burnedScheduled;
  const adjustedTarget = baseNeed + totalBurn; // Can eat more if you burn
  const remaining = Math.max(0, adjustedTarget - consumed);
  const percentage = Math.min(100, Math.round((consumed / adjustedTarget) * 100));
  const netBalance = consumed - totalBurn;
  const energyBalance = consumed - baseNeed;

  return {
    date: todayDate(),
    base_calorie_need: baseNeed,
    calories_consumed: consumed,
    calories_burned_activity: burnedActivity,
    calories_burned_scheduled: burnedScheduled,
    net_balance: netBalance,
    energy_balance: energyBalance,
    target_calories: adjustedTarget,
    remaining,
    percentage,
    updated_at: nowISO(),
  };
}

/**
 * Get a simplified energy balance snapshot for dashboard display.
 */
export async function getEnergyBalance(): Promise<EnergyBalanceSnapshot> {
  const budget = await computeDailyBudget();
  return {
    date: budget.date,
    consumed: budget.calories_consumed,
    burned: budget.calories_burned_activity + budget.calories_burned_scheduled,
    net: budget.net_balance,
    deficit_surplus: budget.energy_balance,
  };
}

/**
 * Get the user's base calorie target (without activity adjustments).
 * For display in profile/settings.
 */
export async function getBaseCalorieTarget(): Promise<number> {
  const profile = await readProfile();
  if (profile.calorieTarget) return profile.calorieTarget;
  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  return calculateGoalTarget(tdee, profile.goal);
}

/**
 * Detailed breakdown for debugging / profile display.
 */
export async function getCalorieBreakdown(): Promise<{
  bmr: number;
  tdee: number;
  goalAdjustment: number;
  target: number;
  profile: any;
}> {
  const profile = await readProfile();
  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const target = calculateGoalTarget(tdee, profile.goal);
  return {
    bmr: Math.round(bmr),
    tdee,
    goalAdjustment: GOAL_ADJUSTMENTS[profile.goal],
    target,
    profile,
  };
}
