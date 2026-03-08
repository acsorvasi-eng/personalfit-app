import { getDB } from '../db';

/** Single meal window: name + start/end time as "HH:MM" */
export interface MealWindow {
  name: string;
  startTime: string;
  endTime: string;
}

/** Named meal model — editor dropdown and My Menu rest period logic */
export type MealModel =
  | '3meals'   // Reggeli / Ebéd / Vacsora (default)
  | '5meals'   // Reggeli / Tízórai / Ebéd / Uzsonna / Vacsora
  | '2meals'   // Reggeli / Vacsora
  | 'if16_8'   // 12:00 - 20:00 eating window
  | 'if18_6';  // 13:00 - 19:00 eating window

/** User meal interval settings — saved in profile, used by My Menu and rest period card */
export interface MealSettings {
  mealCount: number;
  meals: MealWindow[];
  allowedSnacks: string[]; // snack ids (single for non-IF: one selected snack)
  /** When set, editor and getMealStatus use this; otherwise derived from mealCount for backward compat */
  mealModel?: MealModel;
}

export interface StoredUserProfile {
  id: string;
  name: string;
  age: number;
  weight: number;
  height: number;
  bloodPressure: string;
  activityLevel: string;
  goal: string;
  allergies: string;
  dietaryPreferences: string;
  avatar: string;
  calorieTarget?: number;
  mealSettings?: MealSettings;
  /** Optional YYYY-MM-DD */
  birthDate?: string;
  /** Optional: male | female | other */
  gender?: string;
  /** Daily water goal in ml (default weight * 35) */
  waterGoalMl?: number;
  /** Weekly workout goal (1-7) */
  weeklyWorkoutGoal?: number;
  /** Macro percentages: protein, carbs, fat (default 30/40/30) */
  macroProteinPct?: number;
  macroCarbsPct?: number;
  macroFatPct?: number;
  /** From GMON / body composition */
  bodyFat?: number;
  muscleMass?: number;
  visceralFat?: number;
  boneMass?: number;
  waterPercent?: number;
  bmi?: number;
  metabolicAge?: number;
  bmr?: number;
  /** ISO date of last GMON upload (for "GMON" badge) */
  gmonUploadedAt?: string;
  /** Wake time "HH:MM" (e.g. "07:00") */
  wakeTime?: string;
  /** Bedtime "HH:MM" (e.g. "23:16") */
  bedtime?: string;
  /** Sleep cycles 4–7 */
  sleepCycles?: number;
}

/** Parsed GMON/body composition from API */
export interface GmonParsedData {
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_percent: number | null;
  muscle_mass_kg: number | null;
  visceral_fat: number | null;
  bone_mass_kg: number | null;
  water_percent: number | null;
  bmi: number | null;
  metabolic_age: number | null;
  basal_metabolic_rate: number | null;
}

const PROFILE_ID = 'current';

function getDefaultProfile(): StoredUserProfile {
  return {
    id: PROFILE_ID,
    name: '',
    age: 0,
    weight: 0,
    height: 0,
    bloodPressure: '',
    activityLevel: '',
    goal: '',
    allergies: '',
    dietaryPreferences: '',
    avatar: '',
  };
}

/**
 * Core source of truth for user profile. IndexedDB only.
 */
export async function getUserProfile(): Promise<StoredUserProfile> {
  const db = await getDB();
  const existing = await db.get<StoredUserProfile>('user_profile', PROFILE_ID);
  if (existing) return existing;
  const fresh = getDefaultProfile();
  await db.put('user_profile', fresh);
  return fresh;
}

export async function saveUserProfile(partial: Partial<StoredUserProfile>): Promise<StoredUserProfile> {
  const db = await getDB();
  const current = await getUserProfile();
  const updated: StoredUserProfile = {
    ...current,
    ...partial,
    id: PROFILE_ID,
  };

  await db.put('user_profile', updated);
  return updated;
}

/**
 * Merge GMON/body composition parsed data into profile.
 * Non-null values overwrite; sets gmonUploadedAt; updates water goal when weight changes.
 */
export async function updateFromGmon(data: GmonParsedData): Promise<StoredUserProfile> {
  const current = await getUserProfile();
  const partial: Partial<StoredUserProfile> = {
    gmonUploadedAt: new Date().toISOString(),
  };
  if (data.weight_kg != null && data.weight_kg > 0) {
    partial.weight = data.weight_kg;
    partial.waterGoalMl = Math.round(data.weight_kg * 35);
  }
  if (data.height_cm != null && data.height_cm > 0) partial.height = data.height_cm;
  if (data.body_fat_percent != null) partial.bodyFat = data.body_fat_percent;
  if (data.muscle_mass_kg != null) partial.muscleMass = data.muscle_mass_kg;
  if (data.visceral_fat != null) partial.visceralFat = data.visceral_fat;
  if (data.bone_mass_kg != null) partial.boneMass = data.bone_mass_kg;
  if (data.water_percent != null) partial.waterPercent = data.water_percent;
  if (data.bmi != null) partial.bmi = data.bmi;
  if (data.metabolic_age != null) partial.metabolicAge = data.metabolic_age;
  if (data.basal_metabolic_rate != null) partial.bmr = data.basal_metabolic_rate;

  const updated = await saveUserProfile({ ...current, ...partial });
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('profileUpdated'));
    } catch {
      // ignore
    }
  }
  return updated;
}

const DEFAULT_MEAL_WINDOWS: Record<number, MealWindow[]> = {
  1: [{ name: 'Eating window', startTime: '12:00', endTime: '20:00' }],
  2: [
    { name: 'Reggeli', startTime: '08:00', endTime: '09:00' },
    { name: 'Vacsora', startTime: '18:00', endTime: '19:00' },
  ],
  3: [
    { name: 'Reggeli', startTime: '06:00', endTime: '08:00' },
    { name: 'Ebéd', startTime: '12:30', endTime: '13:30' },
    { name: 'Vacsora', startTime: '17:30', endTime: '18:30' },
  ],
  4: [
    { name: 'Reggeli', startTime: '07:00', endTime: '08:00' },
    { name: 'Tízórai', startTime: '10:00', endTime: '10:30' },
    { name: 'Ebéd', startTime: '13:00', endTime: '14:00' },
    { name: 'Vacsora', startTime: '18:00', endTime: '19:00' },
  ],
  5: [
    { name: 'Reggeli', startTime: '07:00', endTime: '08:00' },
    { name: 'Tízórai', startTime: '10:00', endTime: '10:30' },
    { name: 'Ebéd', startTime: '12:30', endTime: '13:30' },
    { name: 'Uzsonna', startTime: '15:30', endTime: '16:00' },
    { name: 'Vacsora', startTime: '18:00', endTime: '19:00' },
  ],
};

const DEFAULT_MEALS_BY_MODEL: Record<MealModel, MealWindow[]> = {
  '3meals': DEFAULT_MEAL_WINDOWS[3].map(m => ({ ...m })),
  '5meals': DEFAULT_MEAL_WINDOWS[5].map(m => ({ ...m })),
  '2meals': DEFAULT_MEAL_WINDOWS[2].map(m => ({ ...m })),
  'if16_8': [{ name: 'Eating window', startTime: '12:00', endTime: '20:00' }],
  'if18_6': [{ name: 'Eating window', startTime: '13:00', endTime: '19:00' }],
};

export function getDefaultMealSettings(): MealSettings {
  return {
    mealCount: 3,
    meals: DEFAULT_MEAL_WINDOWS[3].map(m => ({ ...m })),
    allowedSnacks: ['alma'],
    mealModel: '3meals',
  };
}

/** Default meal windows for a given count (1–5). Used for backward compat. */
export function getDefaultMealsForCount(count: number): MealWindow[] {
  const c = Math.max(1, Math.min(5, count));
  return DEFAULT_MEAL_WINDOWS[c].map(m => ({ ...m }));
}

/** Default meal windows for a named model. Used by MealIntervalEditor. */
export function getDefaultMealsForModel(model: MealModel): MealWindow[] {
  return DEFAULT_MEALS_BY_MODEL[model].map(m => ({ ...m }));
}

/** Returns mealCount for a model (1 for IF, 2/3/5 for others). */
export function getMealCountForModel(model: MealModel): number {
  if (model === 'if16_8' || model === 'if18_6') return 1;
  if (model === '2meals') return 2;
  if (model === '3meals') return 3;
  return 5;
}

export async function getMealSettings(): Promise<MealSettings> {
  const profile = await getUserProfile();
  if (profile.mealSettings && profile.mealSettings.meals && profile.mealSettings.meals.length >= 1) {
    return profile.mealSettings;
  }
  return getDefaultMealSettings();
}

export async function saveMealSettings(settings: MealSettings): Promise<void> {
  console.log("[UserProfileService] saveMealSettings called with:", settings);
  const result = await saveUserProfile({ mealSettings: settings });
  console.log("[UserProfileService] saved result (profile):", result?.mealSettings);
}

