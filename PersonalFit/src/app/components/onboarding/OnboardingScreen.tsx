/**
 * OnboardingScreen — white slides with animated SVG illustrations
 * 3 slides: (1) personalized health, (2) data privacy, (3) sport+sleep balance
 * Swipe gesture + pagination dots + fixed CTA button position
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

// Slide 1: plate + fork + knife + heart (inside plate, clearly visible)
function Slide1Illustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <AnimatedCircle cx={60} cy={68} r={36} delay={0} />
      <AnimatedCircle cx={60} cy={68} r={25} stroke="#0f172a" strokeWidth={1.5} strokeDasharray="5 4" delay={0.2} />
      {/* fork left */}
      <AnimatedPath d="M22 32 L22 50 M22 50 L22 60 M20 32 L20 41 C20 45 24 45 24 41 L24 32" delay={0.3} />
      {/* knife right */}
      <AnimatedPath d="M98 32 L98 60 M98 32 C98 32 102 38 102 46 C102 51 98 53 98 53" delay={0.3} />
      {/* heart — lower inside plate */}
      <AnimatedPath
        d="M60 74 C60 74 50 67 50 61 C50 56.5 54.5 54 60 58.5 C65.5 54 70 56.5 70 61 C70 67 60 74 60 74 Z"
        stroke={TEAL} strokeWidth={2.2} delay={0.65}
      />
    </svg>
  );
}

// Slide 2: phone + shield + checkmark
function Slide2Illustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <AnimatedRect x={34} y={14} width={52} height={92} rx={8} delay={0} />
      <AnimatedPath d="M46 22 L74 22" delay={0.2} />
      <AnimatedCircle cx={60} cy={97} r={4} delay={0.2} />
      {/* shield */}
      <AnimatedPath
        d="M60 32 C54 32 46 36 46 36 L46 52 C46 61 60 70 60 70 C60 70 74 61 74 52 L74 36 C74 36 66 32 60 32 Z"
        stroke={TEAL} strokeWidth={2.2} delay={0.4}
      />
      {/* checkmark */}
      <AnimatedPath d="M52 51 L57 57 L69 44" stroke={TEAL} strokeWidth={2.4} delay={0.85} />
    </svg>
  );
}

// Slide 3: balance scale — sun (sport) ↔ moon (sleep)
function Slide3Illustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      {/* post */}
      <AnimatedPath d="M60 22 L60 96" delay={0} />
      <AnimatedPath d="M44 96 L76 96" delay={0.05} />
      {/* arm */}
      <AnimatedPath d="M26 42 L60 32 L94 42" delay={0.15} />
      {/* left bowl */}
      <AnimatedPath d="M26 42 L22 60 C22 65 32 68 32 68 C32 68 42 65 42 60 L38 42" delay={0.3} />
      {/* sun inside left bowl */}
      <AnimatedCircle cx={32} cy={55} r={7} stroke={TEAL} strokeWidth={2} delay={0.55} />
      <AnimatedPath d="M32 45 L32 43 M32 67 L32 65 M22 55 L20 55 M44 55 L42 55 M25 48 L24 47 M40 63 L39 62 M25 62 L24 63 M40 47 L39 48" stroke={TEAL} strokeWidth={1.6} delay={0.7} />
      {/* right bowl */}
      <AnimatedPath d="M78 42 L82 60 C82 65 92 68 92 68 C92 68 102 65 102 60 L98 42" delay={0.3} />
      {/* moon inside right bowl */}
      <AnimatedPath
        d="M90 48 C87 48 84 51 84 55 C84 60 87 63 91 63 C88 64 84 63 82 61 C79 58 79 52 82 49 C84 46 88 46 90 48 Z"
        stroke={TEAL} strokeWidth={2} delay={0.55}
      />
    </svg>
  );
}

const ILLUSTRATIONS = [Slide1Illustration, Slide2Illustration, Slide3Illustration];

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

  const skip = useCallback(() => {
    markOnboardingComplete();
    navigate('/login');
  }, [markOnboardingComplete, navigate]);

  const isLast = current === slides.length - 1;
  const slide = slides[current];
  const Illustration = ILLUSTRATIONS[current];

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">

      {/* Top bar: skip right-aligned */}
      <div className="flex items-center justify-end px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 min-h-[48px]">
        {!isLast && (
          <button onClick={skip} type="button"
            className="text-sm text-gray-400 font-medium cursor-pointer px-1 py-1">
            {t('onboarding.skip')}
          </button>
        )}
      </div>

      {/* Swipeable content */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full"
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
            <div className="mb-8 flex items-center justify-center" style={{ minHeight: 120 }}>
              <Illustration />
            </div>

            {/* Title */}
            <h2 className="text-2xl text-gray-900 mb-3 whitespace-pre-line" style={{ fontWeight: 800, lineHeight: 1.3 }}>
              {slide.title}
            </h2>

            {/* Description */}
            <p className="text-gray-500 leading-relaxed text-sm max-w-xs">
              {slide.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom: pagination + CTA */}
      <div className="px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 max-w-md mx-auto w-full">

        {/* Pagination dots — centered, above button */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {slides.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
              animate={{
                width: i === current ? 28 : 8,
                backgroundColor: i === current ? '#0d9488' : '#e2e8f0',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="h-2 rounded-full cursor-pointer"
              type="button"
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* CTA button — same position on every slide */}
        <button
          onClick={goNext}
          type="button"
          className="w-full h-14 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] cursor-pointer"
          style={{ background: '#0d9488' }}
        >
          {isLast ? t('onboarding.start') : t('onboarding.next')} →
        </button>
      </div>
    </div>
  );
}
