/**
 * FoodImage v3 — curated food photo library + emoji fallback.
 *
 * Uses a pre-built keyword → Unsplash CDN URL map (no API key, instant load).
 * Falls back to colorful emoji circle if no keyword matches.
 */
import { useState } from 'react';
import { findFoodImage } from '../data/foodImages';

interface FoodImageProps {
  foodName: string;
  fallbackEmoji?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Optional meal type for better fallback images (breakfast, lunch, dinner, snack) */
  mealType?: string;
}

const SIZE_MAP = { sm: 48, md: 80, lg: 200 } as const;

export function FoodImage({ foodName, fallbackEmoji, className = '', size = 'md', mealType }: FoodImageProps) {
  const px = SIZE_MAP[size];
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const match = findFoodImage(foodName, mealType);
  const imageUrl = match.url;
  const emoji = fallbackEmoji || match.emoji;

  const borderRadius = size === 'lg' ? 16 : size === 'md' ? 12 : 8;

  const containerStyle: React.CSSProperties = {
    width: size === 'lg' ? '100%' : px,
    height: px,
    minWidth: size === 'lg' ? undefined : px,
    minHeight: px,
    borderRadius,
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
  };

  // Image available and not errored
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
        {/* Shimmer while image loads */}
        {!loaded && (
          <div
            className="absolute inset-0 animate-pulse bg-gray-200"
            style={{ borderRadius }}
          />
        )}
      </div>
    );
  }

  // Emoji fallback with colored background
  return (
    <div
      className={`flex items-center justify-center bg-primary/10 ${className}`}
      style={{
        ...containerStyle,
        fontSize: size === 'lg' ? 56 : size === 'md' ? 32 : 22,
      }}
    >
      {emoji}
    </div>
  );
}
