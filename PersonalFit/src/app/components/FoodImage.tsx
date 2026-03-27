/**
 * FoodImage — displays a food photo via Unsplash Source URL (no API key needed)
 * or Pexels-style direct URL. Falls back to colorful emoji circle.
 *
 * Uses Unsplash source redirect: https://source.unsplash.com/featured/?{query},food
 * Caches resolved URLs in localStorage for 7 days.
 */
import { useState, useEffect } from 'react';

interface FoodImageProps {
  foodName: string;
  fallbackEmoji?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = { sm: 48, md: 80, lg: 200 } as const;
const CACHE_PREFIX = 'food-img-v2:';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-záéíóöőúüűà-ÿ\s]/gi, '')
    .trim();
}

function getCached(key: string): string | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { url: string; ts: number };
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.url;
  } catch {
    return null;
  }
}

function setCache(key: string, url: string) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ url, ts: Date.now() }));
  } catch {}
}

// Translate common HU/RO food names to English for better Unsplash results
const FOOD_TRANSLATIONS: Record<string, string> = {
  'csirkemell': 'chicken breast', 'pulykamell': 'turkey breast', 'tojás': 'eggs',
  'lazac': 'salmon', 'tonhal': 'tuna', 'marhahús': 'beef steak',
  'sertéshús': 'pork', 'bárány': 'lamb', 'tofu': 'tofu',
  'rizs': 'rice bowl', 'tészta': 'pasta', 'burgonya': 'potato',
  'brokkoli': 'broccoli', 'spenót': 'spinach', 'paradicsom': 'tomato',
  'saláta': 'salad', 'leves': 'soup', 'joghurt': 'yogurt',
  'sajt': 'cheese', 'kenyér': 'bread', 'zabpehely': 'oatmeal',
  'avokádó': 'avocado', 'banán': 'banana', 'alma': 'apple',
  'eper': 'strawberry', 'narancs': 'orange', 'görögdinnye': 'watermelon',
  'kása': 'porridge', 'fasírt': 'meatballs', 'rántotta': 'scrambled eggs',
  'töltött káposzta': 'stuffed cabbage', 'gulyás': 'goulash',
  'pörkölt': 'stew', 'paprikás': 'chicken paprikash',
  'rétes': 'strudel', 'palacsinta': 'pancakes',
  // RO
  'piept de pui': 'chicken breast', 'ciorba': 'soup', 'sarmale': 'stuffed cabbage rolls',
  'mici': 'grilled sausages', 'mamaliga': 'polenta', 'branza': 'cheese',
  'orez': 'rice', 'cartofi': 'potatoes', 'salata': 'salad',
};

function translateToEnglish(name: string): string {
  const lower = name.toLowerCase();
  // Direct match
  for (const [key, val] of Object.entries(FOOD_TRANSLATIONS)) {
    if (lower.includes(key)) return val;
  }
  return name;
}

export function FoodImage({ foodName, fallbackEmoji = '🍽️', className = '', size = 'md' }: FoodImageProps) {
  const px = SIZE_MAP[size];
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const normalized = normalizeName(foodName);
  const searchQuery = translateToEnglish(normalized);

  useEffect(() => {
    if (!normalized) return;

    // Check cache
    const cached = getCached(normalized);
    if (cached) {
      setImageUrl(cached);
      return;
    }

    // Use Unsplash source URL (redirects to actual image, no API key needed)
    const w = size === 'lg' ? 400 : size === 'md' ? 200 : 100;
    const unsplashUrl = `https://source.unsplash.com/featured/${w}x${w}/?${encodeURIComponent(searchQuery + ',food')}`;

    // Resolve the redirect to get the final image URL for caching
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // img.src may have been redirected to the actual Unsplash CDN URL
      const finalUrl = img.src;
      setCache(normalized, finalUrl);
      setImageUrl(finalUrl);
    };
    img.onerror = () => {
      setError(true);
    };
    img.src = unsplashUrl;
  }, [normalized, searchQuery, size]);

  const borderRadius = size === 'lg' ? 16 : size === 'md' ? 12 : 8;

  const containerStyle: React.CSSProperties = {
    width: size === 'lg' ? '100%' : px,
    height: px,
    minWidth: size === 'lg' ? undefined : px,
    minHeight: px,
    borderRadius,
    overflow: 'hidden',
    flexShrink: 0,
  };

  // Image available
  if (imageUrl && !error) {
    return (
      <div className={className} style={containerStyle}>
        <img
          src={imageUrl}
          alt={foodName}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
        {/* Shimmer while loading */}
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" style={{ borderRadius }} />
        )}
      </div>
    );
  }

  // Loading or no image → emoji fallback with colored background
  if (!imageUrl && !error) {
    return (
      <div
        className={`animate-pulse bg-gray-100 ${className}`}
        style={containerStyle}
      />
    );
  }

  // Error fallback — colorful emoji
  return (
    <div
      className={`flex items-center justify-center bg-primary/10 ${className}`}
      style={{
        ...containerStyle,
        fontSize: size === 'lg' ? 56 : size === 'md' ? 32 : 22,
      }}
    >
      {fallbackEmoji}
    </div>
  );
}
