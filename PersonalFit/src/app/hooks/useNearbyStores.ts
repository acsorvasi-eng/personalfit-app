/**
 * useNearbyStores — finds real grocery stores near the user via Google Places,
 * then matches them against chain catalog profiles to estimate food availability.
 *
 * Flow:
 *   1. Get user lat/lng from useGeolocation
 *   2. Call chef-review API (type: 'find-stores') for Google Places Nearby Search
 *   3. Match results to known chain profiles
 *   4. Cache results in localStorage (6 hours)
 *
 * If no Google Places API key is set, falls back to chain-only mode
 * (shows chain names without distances).
 */

import { useState, useEffect, useCallback } from 'react';
import { apiBase, authFetch } from '@/lib/api';
import {
  CHAIN_PROFILES,
  isFoodAvailableAtChain,
  type ChainProfile,
  type FoodCategoryId,
  type ChainId,
} from '../data/chainCatalog';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface NearbyStore {
  chainId: ChainId;
  chainProfile: ChainProfile;
  name: string;           // e.g. "Kaufland Târgu Mureș"
  address: string;
  distanceKm: number;
  lat: number;
  lng: number;
  placeId?: string;       // Google Place ID for Maps link
  openNow?: boolean;
}

export interface FoodStoreMatch {
  foodId: string;
  stores: NearbyStore[];  // sorted by distance
}

// ─────────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────────

const CACHE_KEY = 'nura_nearby_stores';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

interface CachedStores {
  stores: NearbyStore[];
  timestamp: number;
  lat: number;
  lng: number;
}

function getCachedStores(lat: number, lng: number): NearbyStore[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedStores = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    // Only use cache if location hasn't changed significantly (< 2km)
    const dist = haversine(lat, lng, cached.lat, cached.lng);
    if (dist > 2) return null;
    return cached.stores;
  } catch {
    return null;
  }
}

function setCachedStores(stores: NearbyStore[], lat: number, lng: number) {
  try {
    const data: CachedStores = { stores, timestamp: Date.now(), lat, lng };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────
// Haversine distance (km)
// ─────────────────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────────
// Match Google Places result to known chain
// ─────────────────────────────────────────────────────────────────

function matchChain(placeName: string): ChainProfile | null {
  const lower = placeName.toLowerCase();
  for (const chain of CHAIN_PROFILES) {
    if (lower.includes(chain.id.replace('_', ' ')) || lower.includes(chain.displayName.toLowerCase())) {
      return chain;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useNearbyStores(lat?: number, lng?: number) {
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lng) return;

    const cached = getCachedStores(lat, lng);
    if (cached) {
      setStores(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchNearbyStores(lat, lng)
      .then(result => {
        if (cancelled) return;
        setStores(result);
        setCachedStores(result, lat, lng);
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('[useNearbyStores] API failed, using fallback:', err);
        setError(err.message);
        // Fallback: return all known chains without distance info
        setStores(
          CHAIN_PROFILES.map(chain => ({
            chainId: chain.id,
            chainProfile: chain,
            name: chain.displayName,
            address: '',
            distanceKm: -1, // unknown
            lat: 0,
            lng: 0,
          }))
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [lat, lng]);

  // Utility: get stores that carry a specific food, sorted by distance
  const getStoresForFood = useCallback(
    (foodId: string, foodCategory: FoodCategoryId): NearbyStore[] => {
      return stores
        .filter(s => isFoodAvailableAtChain(foodId, foodCategory, s.chainProfile))
        .sort((a, b) => {
          if (a.distanceKm === -1) return 1;
          if (b.distanceKm === -1) return -1;
          return a.distanceKm - b.distanceKm;
        });
    },
    [stores]
  );

  return { stores, loading, error, getStoresForFood };
}

// ─────────────────────────────────────────────────────────────────
// API call — reuse chef-review endpoint with type: 'find-stores'
// ─────────────────────────────────────────────────────────────────

async function fetchNearbyStores(lat: number, lng: number): Promise<NearbyStore[]> {
  const resp = await authFetch(`${apiBase}/api/chef`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'find-stores', lat, lng, radius: 10000 }),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();

  if (data.fallback) {
    // No Google API key — return all chains without real distance
    return CHAIN_PROFILES.map(chain => ({
      chainId: chain.id,
      chainProfile: chain,
      name: chain.displayName,
      address: '',
      distanceKm: -1,
      lat: 0,
      lng: 0,
    }));
  }

  const nearbyStores: NearbyStore[] = [];
  const seenChains = new Set<string>();

  for (const place of data.stores ?? []) {
    const chain = matchChain(place.name);
    if (!chain) continue;
    // Keep only the closest store per chain
    if (seenChains.has(chain.id)) continue;
    seenChains.add(chain.id);

    nearbyStores.push({
      chainId: chain.id,
      chainProfile: chain,
      name: place.name,
      address: place.address ?? '',
      distanceKm: haversine(lat, lng, place.lat, place.lng),
      lat: place.lat,
      lng: place.lng,
      placeId: place.placeId,
      openNow: place.openNow,
    });
  }

  // Sort by distance
  nearbyStores.sort((a, b) => a.distanceKm - b.distanceKm);
  return nearbyStores;
}

// ─────────────────────────────────────────────────────────────────
// Google Maps URL builder
// ─────────────────────────────────────────────────────────────────

export function buildStoreMapUrl(store: NearbyStore): string {
  if (store.placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${store.placeId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`;
}
