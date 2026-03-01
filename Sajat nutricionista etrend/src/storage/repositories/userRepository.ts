/**
 * User Repository — CRUD operations for UserProfile and preferences.
 */

import type { UserProfile, UserPreferences } from '../../domain/models';
import { DOMAIN_STORES, dbGet, dbPut, dbGetAll } from '../database';
import { generateId, nowISO } from '../../core/utils';

const STORE = DOMAIN_STORES.USER_PROFILE;
const PREF_STORE = DOMAIN_STORES.PREFERENCES;
const SINGLETON_PREF_KEY = 'user-preferences';

// ═══════════════════════════════════════════════════════════════
// User Profile
// ═══════════════════════════════════════════════════════════════

export async function getUserProfile(): Promise<UserProfile | undefined> {
  const all = await dbGetAll<UserProfile>(STORE);
  // There should be at most one user profile
  return all[0];
}

export async function saveUserProfile(profile: Partial<UserProfile> & { id?: string }): Promise<UserProfile> {
  const existing = await getUserProfile();
  const now = nowISO();

  const merged: UserProfile = {
    id: existing?.id ?? profile.id ?? generateId(),
    timestamp: Date.now(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    name: profile.name ?? existing?.name ?? '',
    age: profile.age ?? existing?.age ?? 25,
    weight: profile.weight ?? existing?.weight ?? 70,
    height: profile.height ?? existing?.height ?? 170,
    gender: profile.gender ?? existing?.gender ?? 'male',
    activityLevel: profile.activityLevel ?? existing?.activityLevel ?? 'moderately_active',
    goal: profile.goal ?? existing?.goal ?? 'maintenance',
    allergies: profile.allergies ?? existing?.allergies ?? [],
    dietaryPreferences: profile.dietaryPreferences ?? existing?.dietaryPreferences ?? [],
    calorieTarget: profile.calorieTarget ?? existing?.calorieTarget,
    avatar: profile.avatar ?? existing?.avatar ?? '',
    bloodPressure: profile.bloodPressure ?? existing?.bloodPressure,
  };

  await dbPut(STORE, merged);
  return merged;
}

export async function deleteUserProfile(): Promise<void> {
  const { dbClear } = await import('../database');
  await dbClear(STORE);
}

// ═══════════════════════════════════════════════════════════════
// User Preferences
// ═══════════════════════════════════════════════════════════════

const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'hu',
  theme: 'system',
  measurementUnit: 'metric',
  notificationsEnabled: true,
  mealReminders: true,
  workoutReminders: false,
};

export async function getUserPreferences(): Promise<UserPreferences> {
  const prefs = await dbGet<UserPreferences & { id: string }>(PREF_STORE, SINGLETON_PREF_KEY);
  return prefs ?? { ...DEFAULT_PREFERENCES };
}

export async function saveUserPreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  const existing = await getUserPreferences();
  const merged = { ...existing, ...prefs, id: SINGLETON_PREF_KEY };
  await dbPut(PREF_STORE, merged);
  return merged;
}
