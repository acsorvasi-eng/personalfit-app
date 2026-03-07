import { getDB } from '../db';
import { legacyGetItem, legacySetItem } from '../../../storage/legacyLocalStorage';

/** Single meal window: name + start/end time as "HH:MM" */
export interface MealWindow {
  name: string;
  startTime: string;
  endTime: string;
}

/** User meal interval settings — saved in profile, used by My Menu and rest period card */
export interface MealSettings {
  mealCount: number;
  meals: MealWindow[];
  allowedSnacks: string[]; // food ids
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
 * Core source of truth a felhasználói profilhoz.
 * Jelenleg IndexedDB + (átmenetileg) localStorage szinkronban tartása,
 * hogy a régi komponensek se törjenek el. Később a localStorage réteg
 * eltávolítható lesz.
 */
export async function getUserProfile(): Promise<StoredUserProfile> {
  const db = await getDB();

  // Első lépés: próbáljuk az IndexedDB-t
  const existing = await db.get<StoredUserProfile>('user_profile', PROFILE_ID);
  if (existing) {
    return existing;
  }

  // Ha nincs a DB-ben, de van localStorage-ban, migráljuk át
  try {
    const saved = legacyGetItem('userProfile');
    if (saved) {
      const parsed = JSON.parse(saved);
      const migrated: StoredUserProfile = {
        ...getDefaultProfile(),
        ...parsed,
        id: PROFILE_ID,
      };
      await db.put('user_profile', migrated);
      return migrated;
    }
  } catch {
    // ignore parse errors, fallback to default
  }

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

  // Átmeneti kompatibilitás: tartsuk szinkronban a localStorage-ot is.
  try {
    const legacy = {
      name: updated.name,
      age: updated.age,
      weight: updated.weight,
      height: updated.height,
      bloodPressure: updated.bloodPressure,
      activityLevel: updated.activityLevel,
      goal: updated.goal,
      allergies: updated.allergies,
      dietaryPreferences: updated.dietaryPreferences,
      avatar: updated.avatar,
      calorieTarget: updated.calorieTarget,
    };
    legacySetItem('userProfile', JSON.stringify(legacy));
  } catch {
    // ignore localStorage issues
  }

  return updated;
}

const DEFAULT_MEAL_WINDOWS: Record<number, MealWindow[]> = {
  1: [{ name: 'Főétkezés', startTime: '13:00', endTime: '14:00' }],
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

export function getDefaultMealSettings(): MealSettings {
  return {
    mealCount: 3,
    meals: DEFAULT_MEAL_WINDOWS[3].map(m => ({ ...m })),
    allowedSnacks: [],
  };
}

/** Default meal windows for a given count (1–5). Used by MealIntervalEditor when changing count. */
export function getDefaultMealsForCount(count: number): MealWindow[] {
  const c = Math.max(1, Math.min(5, count));
  return DEFAULT_MEAL_WINDOWS[c].map(m => ({ ...m }));
}

export async function getMealSettings(): Promise<MealSettings> {
  const profile = await getUserProfile();
  if (profile.mealSettings && profile.mealSettings.mealCount >= 1 && profile.mealSettings.mealCount <= 5) {
    return profile.mealSettings;
  }
  return getDefaultMealSettings();
}

export async function saveMealSettings(settings: MealSettings): Promise<void> {
  await saveUserProfile({ mealSettings: settings });
}

