// PersonalFit/src/app/services/DailyMenuMatcherService.ts
import { getDB } from '../backend/db';
import type { DailyMenuMatch, DailyMenuCacheEntry } from './recipeModels';

const CITY_DEFAULTS: Record<string, string> = {
  hu: 'Budapest',
  ro: 'Cluj-Napoca',
  en: 'Budapest',
};

const COUNTRY_DEFAULTS: Record<string, string> = {
  hu: 'Hungary',
  ro: 'Romania',
  en: 'Hungary',
};

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function makeCacheKey(city: string): string {
  return `daily_menu_${city}_${todayString()}`;
}

export async function getDailyMenuMatches(
  targetMeal: { name: string; calories: string; mealType: string },
  language: 'hu' | 'ro' | 'en',
  userCity?: string,
): Promise<DailyMenuMatch[]> {
  const city = userCity || CITY_DEFAULTS[language] || 'Budapest';
  const country = COUNTRY_DEFAULTS[language] || 'Hungary';
  const db = await getDB();
  const cacheKey = makeCacheKey(city);

  // Cache hit (valid for today)
  const cached = await db.get<DailyMenuCacheEntry>('daily_menu_cache', cacheKey);
  if (cached?.matches) {
    return cached.matches;
  }

  // API call
  const response = await fetch('/api/estimate-menu-nutrition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetMeal, city, country, language }),
  });

  if (!response.ok) {
    throw new Error(`Menu estimation failed: HTTP ${response.status}`);
  }

  const result = await response.json();
  const matches: DailyMenuMatch[] = Array.isArray(result) ? result : [];

  // Cache write
  const entry: DailyMenuCacheEntry = {
    cacheKey,
    city,
    date: todayString(),
    matches,
    generatedAt: Date.now(),
  };
  await db.put('daily_menu_cache', entry);

  return matches;
}
