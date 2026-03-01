/**
 * useBodyPrediction - Scientifically-grounded body composition prediction engine
 *
 * Reads real user data from the app (profile, calorie tracker, workout history,
 * daily history) and calculates predicted body changes based on:
 *
 * SCIENTIFIC PRINCIPLES:
 *   - BMR via Mifflin-St Jeor equation
 *   - TDEE = BMR × Activity Multiplier
 *   - 1 kg body fat ≈ 7,700 kcal deficit
 *   - Muscle protein synthesis rates from resistance training research
 *   - Diminishing returns on both fat loss and muscle gain over time
 *   - Adaptive thermogenesis (~5-10% TDEE reduction per 10% weight loss)
 *
 * INPUTS (all from localStorage / existing hooks):
 *   - Profile: weight, height, age, gender, activityLevel, goal
 *   - Calorie target (daily allowed intake)
 *   - Actual average calorie consumption (from dailyHistory)
 *   - Workout data: frequency, duration, type, intensity, calories burned
 *
 * OUTPUTS (for a given forecast month count):
 *   - Predicted fat loss (kg)
 *   - Predicted muscle gain (kg)
 *   - Net weight change (kg)
 *   - Predicted body fat % change
 *   - Estimated waist reduction (cm)
 *   - Weekly calorie deficit/surplus
 *   - Weekly stats breakdown
 *   - AR warp progress factor (0-1)
 *   - Confidence level
 *
 * DISCLAIMER: All values are predictions based on metabolic models,
 *   not guarantees. Individual results vary.
 */

import { useMemo } from 'react';
import { getDailyHistory, type DailyHistoryEntry } from './useDailyReset';

// ============================================================
// TYPES
// ============================================================

export interface BodyPredictionInput {
  forecastMonths: number; // How many months into the future
}

export interface WeeklyStats {
  weekNumber: number;
  caloriesConsumed: number;
  caloriesBurned: number; // exercise only
  tdee: number;           // base + exercise
  deficit: number;        // positive = deficit, negative = surplus
  projectedFatLossKg: number;
  projectedMuscleGainKg: number;
  projectedWeightKg: number;
}

export interface BodyPrediction {
  // Current user baseline
  currentWeight: number;       // kg
  currentHeight: number;       // cm
  currentAge: number;
  currentBMR: number;          // kcal/day
  currentTDEE: number;         // kcal/day (without exercise)
  estimatedBodyFatPct: number; // rough estimate

  // Behavioral averages (from tracked data or plan defaults)
  avgDailyIntake: number;      // kcal
  avgDailyExerciseBurn: number;// kcal
  avgWorkoutDaysPerWeek: number;
  avgWorkoutMinutesPerDay: number;
  hasResistanceTraining: boolean;
  dailyTarget: number;         // kcal (allowed intake)

  // Energy balance
  dailyNetDeficit: number;     // kcal (positive = losing weight)
  weeklyNetDeficit: number;    // kcal
  monthlyNetDeficit: number;   // kcal

  // Predicted changes over forecastMonths
  predictedFatLossKg: number;
  predictedMuscleGainKg: number;
  predictedNetWeightChangeKg: number; // negative = loss
  predictedBodyFatPctChange: number;  // negative = loss
  predictedWaistReductionCm: number;
  predictedNewWeight: number;         // kg

  // AR warp factor (0-1 range for visual deformation)
  warpProgress: number;

  // Weekly projection breakdown
  weeklyProjections: WeeklyStats[];

  // Metadata
  dataPointsUsed: number;     // how many daily entries were available
  confidenceLevel: 'low' | 'medium' | 'high';
  isDeficit: boolean;          // true = losing weight
  disclaimer: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const KCAL_PER_KG_FAT = 7700;
const MAX_SAFE_WEEKLY_LOSS_KG = 1.0;     // Max safe loss per week
const MAX_MONTHLY_MUSCLE_GAIN_BEGINNER = 0.9; // kg/month with optimal training
const MAX_MONTHLY_MUSCLE_GAIN_INTERMEDIATE = 0.45;
const ADAPTIVE_THERMOGENESIS_FACTOR = 0.05; // 5% TDEE reduction per 10% bodyweight lost

// Activity multipliers for TDEE
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  'Alacsony': 1.2,
  'Könnyű': 1.375,
  'Közepes': 1.55,
  'Aktív': 1.725,
  'Nagyon aktív': 1.9,
  // Fallback
  'low': 1.2,
  'light': 1.375,
  'moderate': 1.55,
  'active': 1.725,
  'very_active': 1.9,
};

// Resistance training activity IDs from Workout.tsx
const RESISTANCE_ACTIVITY_IDS = new Set([
  'gym-weights', 'gym-bodyweight', 'gym-crossfit', 'gym-circuit', 'gym-hiit',
  'boxing',
]);

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/** BMR using Mifflin-St Jeor equation */
function calculateBMR(weight: number, height: number, age: number, isMale = true): number {
  // Men:   (10 × weight) + (6.25 × height) - (5 × age) + 5
  // Women: (10 × weight) + (6.25 × height) - (5 × age) - 161
  const base = (10 * weight) + (6.25 * height) - (5 * age);
  return Math.round(isMale ? base + 5 : base - 161);
}

/** Rough body fat % estimate based on BMI (Navy method simplified) */
function estimateBodyFatPercent(weight: number, height: number, age: number, isMale = true): number {
  const bmi = weight / ((height / 100) ** 2);
  // Deurenberg formula: BF% = (1.20 × BMI) + (0.23 × Age) - (10.8 × sex) - 5.4
  // sex = 1 for male, 0 for female
  const bf = (1.20 * bmi) + (0.23 * age) - (10.8 * (isMale ? 1 : 0)) - 5.4;
  return Math.max(5, Math.min(50, Math.round(bf * 10) / 10));
}

/** Load profile data from localStorage */
function loadProfile() {
  try {
    const raw = localStorage.getItem('userProfile');
    if (raw) {
      const p = JSON.parse(raw);
      return {
        weight: p.weight || 90,
        height: p.height || 175,
        age: p.age || 30,
        gender: p.gender || 'male',
        activityLevel: p.activityLevel || 'Közepes',
        goal: p.goal || 'Fogyás',
        calorieTarget: p.calorieTarget || 0,
      };
    }
  } catch { /* fallback */ }
  return { weight: 90, height: 175, age: 30, gender: 'male', activityLevel: 'Közepes', goal: 'Fogyás', calorieTarget: 0 };
}

/** Load calorie target */
function loadCalorieTarget(): number {
  const profile = loadProfile();
  if (profile.calorieTarget > 0) return profile.calorieTarget;
  // Estimate from weight
  if (profile.weight) return Math.round(profile.weight * 28 / 50) * 50;
  return 2000;
}

/** Analyze workout history for averages */
function analyzeWorkouts(history: DailyHistoryEntry[]) {
  if (history.length === 0) {
    // Use defaults from meal plan: assume moderate training 4-5 days/week
    return {
      avgDailyExerciseBurn: 350,      // moderate workout ~350 kcal/day average
      avgWorkoutDaysPerWeek: 4,
      avgWorkoutMinutesPerDay: 45,
      hasResistanceTraining: true,
      totalDays: 0,
    };
  }

  const daysWithWorkout = history.filter(d => d.workoutCalories > 0);
  const totalDays = history.length;

  // Check for resistance training
  const hasResistance = history.some(d =>
    d.workoutEntries?.some(e => {
      const nameL = (e.name || '').toLowerCase();
      return nameL.includes('súlyzó') || nameL.includes('crossfit') || nameL.includes('hiit') ||
             nameL.includes('saját testsúly') || nameL.includes('boksz') || nameL.includes('köredzés') ||
             nameL.includes('weight') || nameL.includes('gym');
    })
  );

  const totalExerciseCal = history.reduce((sum, d) => sum + d.workoutCalories, 0);
  const totalExerciseMin = history.reduce((sum, d) => sum + d.workoutDuration, 0);

  // Weekly frequency: (workout days / total days) * 7
  const workoutFreq = totalDays > 0 ? (daysWithWorkout.length / totalDays) * 7 : 4;

  return {
    avgDailyExerciseBurn: totalDays > 0 ? Math.round(totalExerciseCal / totalDays) : 350,
    avgWorkoutDaysPerWeek: Math.round(workoutFreq * 10) / 10,
    avgWorkoutMinutesPerDay: totalDays > 0 ? Math.round(totalExerciseMin / totalDays) : 45,
    hasResistanceTraining: hasResistance || true, // default true (meal plan includes training days)
    totalDays,
  };
}

/** Analyze calorie intake history */
function analyzeIntake(history: DailyHistoryEntry[], target: number) {
  if (history.length === 0) {
    // No history: assume user follows the plan = daily target
    return { avgDailyIntake: target, dataPoints: 0 };
  }

  // Only consider days where they actually logged food
  const daysWithFood = history.filter(d => d.calories > 0);
  if (daysWithFood.length === 0) return { avgDailyIntake: target, dataPoints: 0 };

  const totalIntake = daysWithFood.reduce((sum, d) => sum + d.calories, 0);
  return {
    avgDailyIntake: Math.round(totalIntake / daysWithFood.length),
    dataPoints: daysWithFood.length,
  };
}

/** Calculate muscle gain rate based on training experience and months */
function monthlyMuscleGain(
  month: number,
  hasResistanceTraining: boolean,
  workoutDaysPerWeek: number,
  avgMinutesPerDay: number
): number {
  if (!hasResistanceTraining) return 0;
  if (workoutDaysPerWeek < 1) return 0;

  // Training volume factor (0-1): peaks at 5 days/week, 60+ min
  const freqFactor = Math.min(1, workoutDaysPerWeek / 5);
  const durationFactor = Math.min(1, avgMinutesPerDay / 60);
  const volumeFactor = freqFactor * durationFactor;

  // Diminishing returns: first 6 months are "beginner gains"
  let baseRate: number;
  if (month <= 6) {
    // Beginner: up to ~0.9 kg/month
    baseRate = MAX_MONTHLY_MUSCLE_GAIN_BEGINNER;
  } else if (month <= 18) {
    // Intermediate: ~0.45 kg/month
    baseRate = MAX_MONTHLY_MUSCLE_GAIN_INTERMEDIATE;
  } else {
    // Advanced: ~0.2 kg/month
    baseRate = 0.2;
  }

  // Apply volume factor and slight monthly decline
  const monthDecay = Math.max(0.3, 1 - (month - 1) * 0.02);
  return Math.round(baseRate * volumeFactor * monthDecay * 100) / 100;
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useBodyPrediction({ forecastMonths }: BodyPredictionInput): BodyPrediction {
  return useMemo(() => {
    // === LOAD DATA ===
    const profile = loadProfile();
    const isMale = profile.gender !== 'female';
    const dailyTarget = loadCalorieTarget();
    const history = getDailyHistory();

    // Calculate baseline metabolic values
    const bmr = calculateBMR(profile.weight, profile.height, profile.age, isMale);
    const activityMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel] || 1.55;
    const tdee = Math.round(bmr * activityMultiplier);
    const bodyFatPct = estimateBodyFatPercent(profile.weight, profile.height, profile.age, isMale);

    // Analyze tracked data
    const workoutStats = analyzeWorkouts(history);
    const intakeStats = analyzeIntake(history, dailyTarget);

    // === ENERGY BALANCE ===
    // Total daily expenditure including exercise
    const totalDailyBurn = tdee + workoutStats.avgDailyExerciseBurn;
    const dailyNetDeficit = totalDailyBurn - intakeStats.avgDailyIntake;
    const weeklyNetDeficit = dailyNetDeficit * 7;
    const monthlyNetDeficit = weeklyNetDeficit * 4.33;

    const isDeficit = dailyNetDeficit > 0;

    // === MONTHLY PROJECTIONS ===
    let cumulativeFatLossKg = 0;
    let cumulativeMuscleGainKg = 0;
    let runningWeight = profile.weight;
    const weeklyProjections: WeeklyStats[] = [];

    for (let month = 1; month <= forecastMonths; month++) {
      // Adaptive thermogenesis: as you lose weight, TDEE decreases
      const weightLostSoFar = cumulativeFatLossKg - cumulativeMuscleGainKg;
      const pctWeightLost = Math.max(0, weightLostSoFar) / profile.weight;
      const adaptiveFactor = 1 - (pctWeightLost * ADAPTIVE_THERMOGENESIS_FACTOR * 10);

      // Adjusted TDEE for this month
      // Also recalculate BMR for new weight
      const monthWeight = Math.max(40, runningWeight);
      const monthBMR = calculateBMR(monthWeight, profile.height, profile.age, isMale);
      const monthTDEE = Math.round(monthBMR * activityMultiplier * adaptiveFactor);
      const monthTotalBurn = monthTDEE + workoutStats.avgDailyExerciseBurn;
      const monthDailyDeficit = monthTotalBurn - intakeStats.avgDailyIntake;
      const monthDeficit = monthDailyDeficit * 30.44; // avg days per month

      // Fat loss from caloric deficit
      let monthFatLossKg = 0;
      if (monthDeficit > 0) {
        monthFatLossKg = monthDeficit / KCAL_PER_KG_FAT;
        // Cap at safe weekly rate × 4.33 weeks
        const maxMonthlyLoss = MAX_SAFE_WEEKLY_LOSS_KG * 4.33;
        monthFatLossKg = Math.min(monthFatLossKg, maxMonthlyLoss);
      }

      // If surplus, some goes to fat (reduced if resistance training)
      let monthFatGainKg = 0;
      if (monthDeficit < 0) {
        const surplus = Math.abs(monthDeficit);
        // With resistance training, ~60% surplus → muscle, 40% → fat
        // Without: ~80% → fat
        const fatPortion = workoutStats.hasResistanceTraining ? 0.4 : 0.8;
        monthFatGainKg = (surplus * fatPortion) / KCAL_PER_KG_FAT;
      }

      // Muscle gain
      const monthMuscle = monthlyMuscleGain(
        month,
        workoutStats.hasResistanceTraining,
        workoutStats.avgWorkoutDaysPerWeek,
        workoutStats.avgWorkoutMinutesPerDay
      );

      // In caloric deficit, muscle gain is reduced (but not zero with adequate protein + training)
      const deficitMuscleReduction = isDeficit ? 0.6 : 1.0; // 40% reduction in deficit
      const adjustedMuscleGain = monthMuscle * deficitMuscleReduction;

      cumulativeFatLossKg += monthFatLossKg - monthFatGainKg;
      cumulativeMuscleGainKg += adjustedMuscleGain;
      runningWeight = profile.weight - cumulativeFatLossKg + cumulativeMuscleGainKg;

      // Generate 4 weekly entries per month
      for (let w = 0; w < 4; w++) {
        const weekNum = (month - 1) * 4 + w + 1;
        const weeklyFatLoss = monthFatLossKg / 4;
        const weeklyMuscleGain = adjustedMuscleGain / 4;
        const weeklyFatGain = monthFatGainKg / 4;

        weeklyProjections.push({
          weekNumber: weekNum,
          caloriesConsumed: intakeStats.avgDailyIntake * 7,
          caloriesBurned: workoutStats.avgDailyExerciseBurn * 7,
          tdee: monthTotalBurn * 7,
          deficit: monthDailyDeficit * 7,
          projectedFatLossKg: weeklyFatLoss - weeklyFatGain,
          projectedMuscleGainKg: weeklyMuscleGain,
          projectedWeightKg: Math.round(
            (profile.weight - (cumulativeFatLossKg - monthFatLossKg + monthFatGainKg + (weeklyFatLoss - weeklyFatGain) * (w + 1))
              + (cumulativeMuscleGainKg - adjustedMuscleGain + weeklyMuscleGain * (w + 1)))
            * 10) / 10,
        });
      }
    }

    // === FINAL RESULTS ===
    const netFatLossKg = Math.round(cumulativeFatLossKg * 10) / 10;
    const netMuscleGainKg = Math.round(cumulativeMuscleGainKg * 10) / 10;
    const netWeightChange = Math.round((-netFatLossKg + netMuscleGainKg) * 10) / 10;
    const newWeight = Math.round((profile.weight + netWeightChange) * 10) / 10;

    // Body fat % change
    // Current fat mass = weight × bodyFat%
    const currentFatMass = profile.weight * (bodyFatPct / 100);
    const newFatMass = Math.max(0, currentFatMass - netFatLossKg);
    const newBodyFatPct = (newFatMass / Math.max(40, newWeight)) * 100;
    const bodyFatPctChange = Math.round((newBodyFatPct - bodyFatPct) * 10) / 10;

    // Waist reduction: ~1 cm per 1 kg of fat lost (empirical estimate)
    const waistReduction = Math.round(netFatLossKg * 1.0 * 10) / 10;

    // AR warp progress: normalized 0-1 based on realistic max deformation
    // Max deformation = ~20kg fat loss + ~5kg muscle gain over 12 months
    const fatNorm = Math.min(1, netFatLossKg / 20);
    const muscleNorm = Math.min(1, netMuscleGainKg / 5);
    const warpProgress = Math.min(1, fatNorm * 0.7 + muscleNorm * 0.3);

    // Confidence level
    let confidenceLevel: 'low' | 'medium' | 'high' = 'low';
    if (intakeStats.dataPoints >= 14 && workoutStats.totalDays >= 7) {
      confidenceLevel = 'high';
    } else if (intakeStats.dataPoints >= 5 || workoutStats.totalDays >= 3) {
      confidenceLevel = 'medium';
    }

    return {
      currentWeight: profile.weight,
      currentHeight: profile.height,
      currentAge: profile.age,
      currentBMR: bmr,
      currentTDEE: tdee,
      estimatedBodyFatPct: bodyFatPct,

      avgDailyIntake: intakeStats.avgDailyIntake,
      avgDailyExerciseBurn: workoutStats.avgDailyExerciseBurn,
      avgWorkoutDaysPerWeek: workoutStats.avgWorkoutDaysPerWeek,
      avgWorkoutMinutesPerDay: workoutStats.avgWorkoutMinutesPerDay,
      hasResistanceTraining: workoutStats.hasResistanceTraining,
      dailyTarget,

      dailyNetDeficit: Math.round(dailyNetDeficit),
      weeklyNetDeficit: Math.round(weeklyNetDeficit),
      monthlyNetDeficit: Math.round(monthlyNetDeficit),

      predictedFatLossKg: netFatLossKg,
      predictedMuscleGainKg: netMuscleGainKg,
      predictedNetWeightChangeKg: netWeightChange,
      predictedBodyFatPctChange: bodyFatPctChange,
      predictedWaistReductionCm: waistReduction,
      predictedNewWeight: newWeight,

      warpProgress,
      weeklyProjections,

      dataPointsUsed: intakeStats.dataPoints,
      confidenceLevel,
      isDeficit,
      disclaimer: 'Az eredmenyek kaloria-deficit modellre epulo elorejelzesek. Az egyeni eredmenyek elterhetnek a genetika, anyagcsere, stressz es alvas fuggvenyeben.',
    };
  }, [forecastMonths]);
}
