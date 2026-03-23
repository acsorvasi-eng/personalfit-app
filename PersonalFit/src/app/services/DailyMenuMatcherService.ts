// PersonalFit/src/app/services/DailyMenuMatcherService.ts
import { getDB } from '../backend/db';
import type { DailyMenuMatch, DailyMenuCacheEntry } from './recipeModels';
import { apiBase } from '../../lib/api';

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

export async function getDailyMenuMatches(
  targetMeal: { name: string; calories: string; mealType: string },
  language: 'hu' | 'ro' | 'en',
  userCity?: string,
  userId?: string,
): Promise<DailyMenuMatch[]> {
  const city = userCity || CITY_DEFAULTS[language] || 'Budapest';
  const country = COUNTRY_DEFAULTS[language] || 'Hungary';
  const db = await getDB();
  // Include meal name in cache key so different meals get different results
  const cacheKey = `daily_menu_${city}_${todayString()}_${targetMeal.name.slice(0, 50).replace(/\s+/g, '_')}`;

  // Cache hit (valid for today)
  const cached = await db.get<DailyMenuCacheEntry>('daily_menu_cache', cacheKey);
  if (cached?.matches) {
    return cached.matches;
  }

  // API call
  const response = await fetch(`${apiBase}/api/chef`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'menu',
      userId: userId ?? 'anonymous',
      targetMeal,
      city,
      country,
      language,
    }),
  });

  if (!response.ok) {
    throw new Error(`Menu estimation failed for ${city}: HTTP ${response.status}`);
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
