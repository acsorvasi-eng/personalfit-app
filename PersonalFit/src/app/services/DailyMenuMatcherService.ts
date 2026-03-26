// PersonalFit/src/app/services/DailyMenuMatcherService.ts
import { getDB } from '../backend/db';
import type { DailyMenuMatch, DailyMenuCacheEntry, GooglePlaceRestaurant } from './recipeModels';
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
  userCountry?: string,
): Promise<DailyMenuMatch[]> {
  const city = userCity || CITY_DEFAULTS[language] || 'Budapest';
  const country = userCountry || COUNTRY_DEFAULTS[language] || 'Hungary';
  const db = await getDB();
  // Include meal name in cache key so different meals get different results
  const cacheKey = `daily_menu_${city}_${todayString()}_${targetMeal.name.slice(0, 50).replace(/\s+/g, '_')}`;

  // Cache hit (valid for today)
  const cached = await db.get<DailyMenuCacheEntry>('daily_menu_cache', cacheKey);
  if (cached?.matches) {
    return cached.matches;
  }

  // API call
  const response = await fetch(`${apiBase}/api/chef-review`, {
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

/**
 * Search for real nearby restaurants using Google Places API via the chef-review endpoint.
 * Returns an empty array (with fallback=true) if no GOOGLE_PLACES_API_KEY is configured.
 */
export async function findNearbyRestaurants(
  mealName: string,
  lat: number,
  lng: number,
  radius?: number,
): Promise<{ restaurants: GooglePlaceRestaurant[]; fallback: boolean }> {
  try {
    const response = await fetch(`${apiBase}/api/chef-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'find-restaurants',
        mealName,
        lat,
        lng,
        radius: radius ?? 5000,
      }),
    });

    if (!response.ok) {
      return { restaurants: [], fallback: true };
    }

    const data = await response.json();
    return {
      restaurants: Array.isArray(data.restaurants) ? data.restaurants : [],
      fallback: data.fallback ?? true,
    };
  } catch {
    return { restaurants: [], fallback: true };
  }
}

/**
 * Generate food delivery deep links based on country.
 * RO: Bolt Food + Glovo
 * HU: Bolt Food + Wolt
 * Other: Bolt Food + Wolt
 */
export function getDeliveryLinks(
  restaurantName: string,
  city: string,
  country: string,
): Array<{ name: string; url: string; color: string }> {
  const q = encodeURIComponent(`${restaurantName} ${city}`);
  const citySlug = encodeURIComponent(city.toLowerCase().replace(/\s+/g, '-'));
  const countryLower = country.toLowerCase();

  const bolt = {
    name: 'Bolt Food',
    url: `https://food.bolt.eu/en-US/search?q=${q}`,
    color: '#34D186',
  };
  const glovo = {
    name: 'Glovo',
    url: `https://glovoapp.com/${countryLower.startsWith('ro') ? 'ro' : 'hu'}/ro/${citySlug}/?search=${q}`,
    color: '#FFC244',
  };
  const wolt = {
    name: 'Wolt',
    url: `https://wolt.com/${countryLower.startsWith('hu') ? 'hu' : 'en'}/hun/${citySlug}/search?q=${q}`,
    color: '#009DE0',
  };

  if (countryLower.startsWith('ro') || countryLower === 'romania' || countryLower === 'románia') {
    return [bolt, glovo];
  }
  // Hungary or default
  return [bolt, wolt];
}
