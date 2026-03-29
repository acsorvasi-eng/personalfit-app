/**
 * OnboardingScreen — white slides with animated SVG illustrations
 * 3 slides: (1) personalized health, (2) data privacy, (3) sport+sleep balance
 * No skip, no top progress bar — discrete dot pagination between text and button.
 * Fixed floating CTA at the bottom.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

// SVG path animation: draws on entry
const DRAW_EASE = [0.4, 0, 0.2, 1] as const;
const DRAW_DURATION = 1.5;

function AnimatedPath({ d, stroke = '#0f172a', strokeWidth = 2, delay = 0 }: {
  d: string; stroke?: string; strokeWidth?: number; delay?: number;
}) {
  return (
    <motion.path
      d={d}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: DRAW_DURATION, delay, ease: DRAW_EASE }}
    />
  );
}

function AnimatedCircle({ cx, cy, r, stroke = '#0f172a', strokeWidth = 2, delay = 0, strokeDasharray }: {
  cx: number; cy: number; r: number; stroke?: string; strokeWidth?: number; delay?: number; strokeDasharray?: string;
}) {
  return (
    <motion.circle
      cx={cx} cy={cy} r={r}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: DRAW_DURATION, delay, ease: DRAW_EASE }}
    />
  );
}

function AnimatedRect({ x, y, width, height, rx, stroke = '#0f172a', strokeWidth = 2, delay = 0 }: {
  x: number; y: number; width: number; height: number; rx: number;
  stroke?: string; strokeWidth?: number; delay?: number;
}) {
  return (
    <motion.rect
      x={x} y={y} width={width} height={height} rx={rx}
      stroke={stroke} strokeWidth={strokeWidth} fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: DRAW_DURATION, delay, ease: DRAW_EASE }}
    />
  );
}

const TEAL = '#0d9488';

function Slide1Illustration() {
  return (
    <svg width="240" height="240" viewBox="0 0 130 130" fill="none" aria-hidden="true">
      <AnimatedCircle cx={65} cy={72} r={36} delay={0} />
      <AnimatedCircle cx={65} cy={72} r={24} stroke="#0f172a" strokeWidth={1.5} strokeDasharray="5 4" delay={0.2} />
      <AnimatedPath d="M14 40 L14 62 M14 62 L14 78 M11 40 L11 52 C11 57 17 57 17 52 L17 40" strokeWidth={2.2} delay={0.3} />
      <AnimatedPath d="M116 40 L116 78 M116 40 C116 40 121 48 121 58 C121 64 116 66 116 66" strokeWidth={2.2} delay={0.3} />
      <AnimatedPath
        d="M65 80 C65 80 54 72 54 65 C54 60 59 58 65 63 C71 58 76 60 76 65 C76 72 65 80 65 80 Z"
        stroke={TEAL} strokeWidth={2.2} delay={0.65}
      />
    </svg>
  );
}

function Slide2Illustration() {
  return (
    <svg width="240" height="240" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <AnimatedRect x={34} y={14} width={52} height={92} rx={8} delay={0} />
      <AnimatedPath d="M46 22 L74 22" delay={0.2} />
      <AnimatedCircle cx={60} cy={97} r={3.5} stroke="#0f172a" strokeWidth={2.5} delay={0.2} />
      <AnimatedPath
        d="M60 34 C54 34 46 38 46 38 L46 54 C46 63 60 72 60 72 C60 72 74 63 74 54 L74 38 C74 38 66 34 60 34 Z"
        stroke={TEAL} strokeWidth={2.2} delay={0.4}
      />
      <AnimatedPath d="M52 53 L57 59 L69 46" stroke={TEAL} strokeWidth={2.4} delay={0.85} />
    </svg>
  );
}

function Slide3Illustration() {
  return (
    <svg width="240" height="240" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <AnimatedPath d="M60 22 L60 96" delay={0} />
      <AnimatedPath d="M44 96 L76 96" delay={0.05} />
      <AnimatedPath d="M26 42 L60 32 L94 42" delay={0.15} />
      <AnimatedPath d="M26 42 L20 62 C20 68 32 72 32 72 C32 72 44 68 44 62 L38 42" delay={0.3} />
      <AnimatedCircle cx={32} cy={56} r={6} stroke={TEAL} strokeWidth={2} delay={0.55} />
      <AnimatedPath d="M32 47 L32 45 M32 67 L32 65 M23 56 L21 56 M43 56 L41 56 M26 50 L24.5 48.5 M39.5 63.5 L38 62 M26 62 L24.5 63.5 M39.5 48.5 L38 50" stroke={TEAL} strokeWidth={1.4} delay={0.7} />
      <AnimatedPath d="M82 42 L76 62 C76 68 88 72 88 72 C88 72 100 68 100 62 L94 42" delay={0.3} />
      <AnimatedPath
        d="M91 49 C88 49 85 52 85 56 C85 61 88 64 92 64 C89 65 85 64 83 62 C80 59 80 53 83 50 C85 47 89 47 91 49 Z"
        stroke={TEAL} strokeWidth={2} delay={0.55}
      />
    </svg>
  );
}

const ILLUSTRATIONS = [Slide1Illustration, Slide2Illustration, Slide3Illustration];
const TOTAL_SLIDES = 3;

/** Converts *word* markers to italic <em> spans */
function renderStyledText(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} style={{ fontStyle: 'italic', fontWeight: 600 }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

const cardVariants = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 80, scale: 0.95 }),
  animate: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 280, damping: 28 } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -80, scale: 0.97, transition: { duration: 0.2, ease: 'easeIn' as const } }),
};

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { markOnboardingComplete } = useAuth();
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStart = useRef(0);

  const slides = useMemo(() => [
    { title: t('onboarding.slide1.title'), desc: t('onboarding.slide1.desc') },
    { title: t('onboarding.slide2.title'), desc: t('onboarding.slide2.desc') },
    { title: t('onboarding.slide3.title'), desc: t('onboarding.slide3.desc') },
  ], [t]);

  const goNext = useCallback(() => {
    if (current < slides.length - 1) {
      setDirection(1);
      setCurrent(p => p + 1);
    } else {
      markOnboardingComplete();
      navigate('/login');
    }
  }, [current, slides.length, markOnboardingComplete, navigate]);

  const goPrev = useCallback(() => {
    if (current > 0) {
      setDirection(-1);
      setCurrent(p => p - 1);
    }
  }, [current]);

  const isLast = current === slides.length - 1;
  const slide = slides[current];
  const Illustration = ILLUSTRATIONS[current];

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">

      {/* Spacer for safe area — no skip, no progress bar */}
      <div className="pt-[max(1rem,env(safe-area-inset-top))]" />

      {/* Swipeable content */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full pb-40"
        onTouchStart={e => { touchStart.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(dx) > 60) { if (dx < 0) goNext(); else goPrev(); }
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full flex flex-col items-center text-center"
          >
            {/* SVG illustration */}
            <div className="mb-10 flex items-center justify-center" style={{ minHeight: 240 }}>
              <Illustration />
            </div>

            {/* Title */}
            <h2 className="text-2xl text-gray-900 mb-4 whitespace-pre-line" style={{ fontWeight: 800, lineHeight: 1.35, letterSpacing: '-0.01em' }}>
              {slide.title.split('\n').map((line, li) => (
                <span key={li}>
                  {li > 0 && <br />}
                  {renderStyledText(line)}
                </span>
              ))}
            </h2>

            {/* Description */}
            <p className="text-gray-500 leading-relaxed text-base max-w-xs">
              {slide.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed bottom: pagination dots + CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4"
        style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.98) 65%, transparent)' }}
      >
        <div className="max-w-md mx-auto w-full">
          {/* Discrete dot pagination — between text and button */}
          <div className="flex items-center justify-center gap-2 mb-5">
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === current ? 24 : 6,
                  backgroundColor: i === current ? TEAL : '#d1d5db',
                  opacity: i === current ? 1 : 0.5,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{
                  height: 6,
                  borderRadius: 3,
                }}
              />
            ))}
          </div>

          {/* CTA button */}
          <button
            onClick={goNext}
            type="button"
            className="w-full h-14 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] cursor-pointer"
            style={{ background: TEAL }}
          >
            {isLast ? t('onboarding.start') : t('onboarding.next')} →
          </button>
        </div>
      </div>
    </div>
  );
}
