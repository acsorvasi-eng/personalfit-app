/**
 * FoodImage — displays a real photo for a food name via Unsplash proxy,
 * with localStorage caching (30-day TTL) and emoji fallback.
 */
import { useState, useEffect, useRef } from 'react';
import { apiBase } from '../../lib/api';

interface FoodImageProps {
  foodName: string;
  fallbackEmoji?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = { sm: 48, md: 80, lg: 160 } as const;
const CACHE_PREFIX = 'food-img:';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

interface CacheEntry {
  url: string | null;
  photographer: string | null;
  ts: number;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '') // strip (200g) etc.
    .replace(/[^a-záéíóöőúüűà-ÿ\s]/gi, '')
    .trim();
}

function getCached(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function setCache(key: string, entry: CacheEntry) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full — ignore
  }
}

export function FoodImage({ foodName, fallbackEmoji = '🍽️', className = '', size = 'md' }: FoodImageProps) {
  const px = SIZE_MAP[size];
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const normalized = normalizeName(foodName);

  useEffect(() => {
    if (!normalized) {
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = getCached(normalized);
    if (cached) {
      setImageUrl(cached.url);
      setLoading(false);
      return;
    }

    // Fetch from proxy
    setLoading(true);
    setError(false);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const url = `${apiBase}/api/food-image?q=${encodeURIComponent(normalized)}`;
    fetch(url, { signal: ctrl.signal })
      .then(r => r.json())
      .then((data: { url: string | null; photographer: string | null }) => {
        setCache(normalized, { url: data.url, photographer: data.photographer, ts: Date.now() });
        setImageUrl(data.url);
        setLoading(false);
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          setError(true);
          setLoading(false);
        }
      });

    return () => { ctrl.abort(); };
  }, [normalized]);

  const containerStyle: React.CSSProperties = {
    width: px,
    height: px,
    minWidth: px,
    minHeight: px,
    borderRadius: size === 'lg' ? 16 : size === 'md' ? 12 : 8,
    overflow: 'hidden',
    flexShrink: 0,
  };

  // Loading shimmer
  if (loading) {
    return (
      <div
        className={`animate-pulse bg-gray-200 ${className}`}
        style={containerStyle}
        aria-label="Loading food image..."
      />
    );
  }

  // Image loaded successfully
  if (imageUrl && !error) {
    return (
      <div className={className} style={containerStyle}>
        <img
          src={imageUrl}
          alt={foodName}
          loading="lazy"
          onError={() => setError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    );
  }

  // Fallback emoji circle
  return (
    <div
      className={`flex items-center justify-center bg-primary/10 ${className}`}
      style={{
        ...containerStyle,
        fontSize: size === 'lg' ? 48 : size === 'md' ? 28 : 20,
      }}
      aria-label={foodName}
    >
      {fallbackEmoji}
    </div>
  );
}
