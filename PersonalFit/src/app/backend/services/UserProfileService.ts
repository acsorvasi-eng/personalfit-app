import { getDB } from '../db';

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
    const saved = typeof localStorage !== 'undefined'
      ? localStorage.getItem('userProfile')
      : null;
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
    if (typeof localStorage !== 'undefined') {
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
      localStorage.setItem('userProfile', JSON.stringify(legacy));
    }
  } catch {
    // ignore localStorage issues
  }

  return updated;
}

