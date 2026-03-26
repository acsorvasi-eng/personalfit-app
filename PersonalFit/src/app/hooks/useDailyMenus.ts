/**
 * useDailyMenus — fetches real daily menus from nearby restaurants.
 *
 * Flow:
 *   1. Get user lat/lng from geolocation
 *   2. Find nearest city source(s) from dailyMenuSources
 *   3. Call /api/chef (type: 'daily-menus') to scrape real data
 *   4. Cache in localStorage (1 hour)
 *
 * Zone logic:
 *   0-10 km  → real data only
 *   10-15 km → real + AI estimation
 *   15+ km   → AI fallback
 */

import { useState, useEffect, useCallback } from 'react';
import { apiBase } from '@/lib/api';
import { findNearestSources, type DailyMenuSource } from '../data/dailyMenuSources';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface DailyMenuItem {
  name: string;
  type?: 'soup' | 'main' | 'dessert' | 'side' | 'other';
}

export interface DailyMenuVariant {
  name?: string;
  items: DailyMenuItem[];
  price?: string;
}

export interface DailyMenuRestaurant {
  name: string;
  address?: string;
  slug: string;
  platform: string;
  menuDate?: string;
  variants: DailyMenuVariant[];
  detailUrl?: string;
  /** Distance from user in km (calculated client-side if source has coords) */
  distanceFromSourceKm?: number;
}

// ─────────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────────

const CACHE_KEY = 'nura_daily_menus';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CachedMenus {
  restaurants: DailyMenuRestaurant[];
  sourceCity: string;
  timestamp: number;
}

function getCached(city: string): DailyMenuRestaurant[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedMenus = JSON.parse(raw);
    if (cached.sourceCity !== city) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached.restaurants;
  } catch {
    return null;
  }
}

function setCache(restaurants: DailyMenuRestaurant[], city: string) {
  try {
    const data: CachedMenus = { restaurants, sourceCity: city, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useDailyMenus(lat?: number, lng?: number) {
  const [restaurants, setRestaurants] = useState<DailyMenuRestaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DailyMenuSource | null>(null);
  const [zone, setZone] = useState<'real' | 'mixed' | 'ai' | null>(null);

  useEffect(() => {
    if (!lat || !lng) return;

    // Find nearest source
    const sources = findNearestSources(lat, lng, 50);
    if (sources.length === 0) {
      setZone('ai');
      setError('Nincs napi menü forrás a közeledben');
      return;
    }

    const nearest = sources[0];
    setSource(nearest);

    // Determine zone
    if (nearest.distanceKm <= 10) setZone('real');
    else if (nearest.distanceKm <= 15) setZone('mixed');
    else setZone('ai');

    // Check cache
    const cached = getCached(nearest.city);
    if (cached) {
      setRestaurants(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchDailyMenus(nearest)
      .then(result => {
        if (cancelled) return;
        setRestaurants(result);
        setCache(result, nearest.city);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [lat, lng]);

  return { restaurants, loading, error, source, zone };
}

// ─────────────────────────────────────────────────────────────────
// API call
// ─────────────────────────────────────────────────────────────────

async function fetchDailyMenus(source: DailyMenuSource & { distanceKm: number }): Promise<DailyMenuRestaurant[]> {
  const resp = await fetch(`${apiBase}/api/chef`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'daily-menus',
      platform: source.platform,
      url: source.url,
      city: source.city,
    }),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();

  if (data.error && (!data.restaurants || data.restaurants.length === 0)) {
    throw new Error(data.error);
  }

  return data.restaurants ?? [];
}
