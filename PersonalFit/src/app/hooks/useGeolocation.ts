import { useState, useEffect } from 'react';

interface GeolocationData {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

interface GeolocationResult extends Partial<GeolocationData> {
  loading: boolean;
  error: string | null;
}

const CACHE_KEY = 'nura_geolocation_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CachedGeo extends GeolocationData {
  timestamp: number;
}

function getCached(): GeolocationData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedGeo = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return {
      latitude: cached.latitude,
      longitude: cached.longitude,
      city: cached.city,
      country: cached.country,
    };
  } catch {
    return null;
  }
}

function setCache(data: GeolocationData): void {
  try {
    const entry: CachedGeo = { ...data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable — ignore
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; country: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'NuraApp/1.0 (personal-fitness-app)' },
  });
  if (!resp.ok) throw new Error(`Nominatim HTTP ${resp.status}`);
  const data = await resp.json();
  const addr = data.address ?? {};
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
  const country = addr.country || '';
  return { city, country };
}

export function useGeolocation(): GeolocationResult {
  const [result, setResult] = useState<GeolocationResult>(() => {
    const cached = getCached();
    if (cached) return { ...cached, loading: false, error: null };
    return { loading: true, error: null };
  });

  useEffect(() => {
    // If we already have cached data, no need to fetch again
    if (getCached()) return;

    if (!navigator.geolocation) {
      setResult({ loading: false, error: 'Geolocation not supported' });
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (cancelled) return;
        const { latitude, longitude } = position.coords;
        try {
          const { city, country } = await reverseGeocode(latitude, longitude);
          const data: GeolocationData = { latitude, longitude, city, country };
          setCache(data);
          if (!cancelled) {
            setResult({ ...data, loading: false, error: null });
          }
        } catch {
          // Got coordinates but reverse geocoding failed — still usable
          const data: GeolocationData = { latitude, longitude, city: '', country: '' };
          if (!cancelled) {
            setResult({ ...data, loading: false, error: null });
          }
        }
      },
      (err) => {
        if (cancelled) return;
        let errorMsg = 'Location unavailable';
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'Location request timed out';
        }
        setResult({ loading: false, error: errorMsg });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );

    return () => { cancelled = true; };
  }, []);

  return result;
}
