import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Orbit icons ─────────────────────────────────────────── */
const ORBIT_ICONS = [
  { emoji: '🥗', color: '#22c55e' },
  { emoji: '⚡', color: '#eab308' },
  { emoji: '🧠', color: '#a855f7' },
  { emoji: '❤️', color: '#ef4444' },
  { emoji: '🔧', color: '#3b82f6' },
];

/* ── Phase configs for different contexts ────────────────── */
export const MEAL_GEN_PHASES = [
  { threshold: 0,  key: 'loaderPhase1' },
  { threshold: 12, key: 'loaderPhase2' },
  { threshold: 30, key: 'loaderPhase3' },
  { threshold: 55, key: 'loaderPhase4' },
  { threshold: 80, key: 'loaderPhase5' },
];

export const DOC_PARSE_PHASES = [
  { threshold: 0,  key: 'loaderDocPhase1' },
  { threshold: 30, key: 'loaderDocPhase2' },
  { threshold: 60, key: 'loaderDocPhase3' },
  { threshold: 85, key: 'loaderDocPhase4' },
];

/* ── Props ───────────────────────────────────────────────── */
interface PremiumLoaderProps {
  progress: number;
  phaseText: string;
  subtext?: string;
  fullScreen?: boolean;
}

export default function PremiumLoader({ progress, phaseText, subtext, fullScreen = true }: PremiumLoaderProps) {
  const radius = 70;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (progress / 100) * circumference;
  const center = radius + stroke + 20;
  const svgSize = center * 2;
  const orbitRadius = radius + 28;

  const Wrapper = fullScreen ? FullScreenWrapper : InlineWrapper;

  return (
    <Wrapper>
      {/* SVG ring + orbiting icons */}
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="block">
          {/* Background ring */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke="#e5e7eb" strokeWidth={stroke}
            opacity={0.4}
          />
          {/* Progress ring */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="#0d9488"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            style={{
              transition: 'stroke-dashoffset 0.3s ease-out',
              transform: 'rotate(-90deg)',
              transformOrigin: `${center}px ${center}px`,
            }}
          />
          {/* Glow filter */}
          <defs>
            <filter id="loader-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Glowing dot at progress tip */}
          <circle
            cx={center + radius * Math.cos(((progress / 100) * 360 - 90) * Math.PI / 180)}
            cy={center + radius * Math.sin(((progress / 100) * 360 - 90) * Math.PI / 180)}
            r={4}
            fill="#0d9488"
            filter="url(#loader-glow)"
            style={{ transition: 'cx 0.3s, cy 0.3s' }}
          />
        </svg>

        {/* Percentage in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={Math.round(progress)}
            className="text-[2rem] font-extrabold"
            style={{ color: '#0d9488' }}
            initial={{ scale: 1.1, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {Math.round(progress)}%
          </motion.span>
        </div>

        {/* Orbiting icons */}
        {ORBIT_ICONS.map((icon, i) => {
          const angle = (i / ORBIT_ICONS.length) * 360;
          return (
            <motion.div
              key={icon.emoji}
              className="absolute flex items-center justify-center"
              style={{
                width: 36, height: 36,
                top: center - 18,
                left: center - 18,
                fontSize: '1.1rem',
              }}
              animate={{
                x: Math.cos(((angle + progress * 2) - 90) * Math.PI / 180) * orbitRadius,
                y: Math.sin(((angle + progress * 2) - 90) * Math.PI / 180) * orbitRadius,
                scale: [0.85, 1.15, 0.85],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                x: { duration: 0.3, ease: 'easeOut' },
                y: { duration: 0.3, ease: 'easeOut' },
                scale: { duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' },
                opacity: { duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' },
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shadow-md"
                style={{ background: `${icon.color}18`, border: `1.5px solid ${icon.color}40` }}
              >
                {icon.emoji}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Phase text */}
      <div className="mt-5 text-center min-h-[48px] px-6 max-w-sm">
        <AnimatePresence mode="wait">
          <motion.p
            key={phaseText}
            className="font-semibold text-base text-gray-900 mb-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {phaseText}
          </motion.p>
        </AnimatePresence>
        {subtext && <p className="text-sm text-gray-500">{subtext}</p>}
      </div>
    </Wrapper>
  );
}

/* ── Wrappers ────────────────────────────────────────────── */

function FullScreenWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-center px-6"
      style={{ paddingTop: 'env(safe-area-inset-top, 20px)', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
    >
      {children}
    </div>
  );
}

function InlineWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center pt-10 pb-8">
      {children}
    </div>
  );
}

/* ── Helper: get phase text from progress + phase config ── */
export function getPhaseText(
  progress: number,
  phases: Array<{ threshold: number; key: string }>,
  t: (key: string) => string,
): string {
  let phaseKey = phases[0].key;
  for (const p of phases) {
    if (progress >= p.threshold) phaseKey = p.key;
  }
  return t(phaseKey);
}
