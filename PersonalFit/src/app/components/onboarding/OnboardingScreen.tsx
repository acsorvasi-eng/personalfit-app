/**
 * OnboardingScreen - 3-slide privacy-first introduction
 * Swipeable slides focusing on local-only, personal, and AI-powered benefits.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, ChevronRight, Brain, Apple } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { DSMButton } from '../dsm';

interface Slide {
  bgEmojis: { emoji: string; x: number; y: number; size: number; delay: number; dur: number; amp: number }[];
  icon: React.ElementType;
  badge: string;
  title: string;
  desc: string;
}

const getPrimaryColor = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2563EB';

const SLIDE_TEMPLATES: Omit<Slide, 'badge' | 'title' | 'desc'>[] = [
  {
    icon: Lock,
    bgEmojis: [
      { emoji: '🔒', x: 10, y: 12, size: 28, delay: 0,   dur: 3.2, amp: 12 },
      { emoji: '🛡️', x: 80, y: 18, size: 24, delay: 0.5, dur: 2.8, amp: 10 },
      { emoji: '📱', x: 86, y: 64, size: 22, delay: 0.9, dur: 3.6, amp: 14 },
      { emoji: '🔐', x:  7, y: 70, size: 20, delay: 1.3, dur: 2.6, amp:  8 },
      { emoji: '✅', x: 20, y: 46, size: 18, delay: 0.6, dur: 4.0, amp: 16 },
      { emoji: '💚', x: 74, y: 48, size: 20, delay: 1.1, dur: 3.0, amp: 11 },
    ],
  },
  {
    icon: Brain,
    bgEmojis: [
      { emoji: '🧠', x: 10, y: 12, size: 28, delay: 0,   dur: 3.0, amp: 12 },
      { emoji: '🥗', x: 80, y: 16, size: 24, delay: 0.4, dur: 3.4, amp: 10 },
      { emoji: '⚖️', x: 84, y: 64, size: 22, delay: 0.8, dur: 2.9, amp: 14 },
      { emoji: '🎯', x:  6, y: 68, size: 24, delay: 1.2, dur: 3.6, amp:  9 },
      { emoji: '💪', x: 22, y: 44, size: 20, delay: 0.5, dur: 2.7, amp: 13 },
      { emoji: '✨', x: 76, y: 46, size: 18, delay: 1.0, dur: 3.2, amp: 11 },
    ],
  },
  {
    icon: Apple,
    bgEmojis: [
      { emoji: '🍎', x: 10, y: 13, size: 26, delay: 0,   dur: 3.4, amp: 12 },
      { emoji: '🥦', x: 80, y: 15, size: 22, delay: 0.3, dur: 2.8, amp: 10 },
      { emoji: '🫐', x: 85, y: 63, size: 24, delay: 0.7, dur: 3.2, amp: 14 },
      { emoji: '🥑', x:  8, y: 65, size: 22, delay: 1.1, dur: 2.6, amp:  9 },
      { emoji: '🍋', x: 22, y: 43, size: 20, delay: 0.5, dur: 4.0, amp: 16 },
      { emoji: '🌽', x: 74, y: 46, size: 20, delay: 0.9, dur: 3.6, amp: 11 },
    ],
  },
];

const cardVariants = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 80, scale: 0.93 }),
  animate: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 280, damping: 28 } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -80, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' as const } }),
};

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { markOnboardingComplete } = useAuth();
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStart = useRef(0);

  const slides = useMemo(() => [
    { ...SLIDE_TEMPLATES[0], badge: t('onboarding.slide1.badge'), title: t('onboarding.slide1.title'), desc: t('onboarding.slide1.desc') },
    { ...SLIDE_TEMPLATES[1], badge: t('onboarding.slide2.badge'), title: t('onboarding.slide2.title'), desc: t('onboarding.slide2.desc') },
    { ...SLIDE_TEMPLATES[2], badge: t('onboarding.slide3.badge'), title: t('onboarding.slide3.title'), desc: t('onboarding.slide3.desc') },
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

  const slide = slides[current];
  const isLast = current === slides.length - 1;
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        <span className="text-xs text-gray-400 font-medium tabular-nums">
          {current + 1} / {slides.length}
        </span>
        {!isLast && (
          <DSMButton variant="ghost" onClick={skip} className="text-sm px-2 py-1">
            {t('onboarding.skip')}
          </DSMButton>
        )}
      </div>

      {/* Main swipeable area */}
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
            {/* Visual card */}
            <div className="w-full aspect-[4/3] rounded-3xl bg-gray-100 mb-8 overflow-hidden relative flex items-center justify-center shadow-xl">
              {/* Floating emojis */}
              {slide.bgEmojis.map((p, i) => (
                <motion.span
                  key={i}
                  className="absolute select-none pointer-events-none leading-none"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 0.8, scale: 1, y: [0, -p.amp, 0] }}
                  transition={{
                    opacity: { delay: p.delay + 0.3, duration: 0.5 },
                    scale:   { delay: p.delay + 0.3, duration: 0.45, type: 'spring', stiffness: 320, damping: 18 },
                    y:       { delay: p.delay + 0.6, duration: p.dur, repeat: Infinity, ease: 'easeInOut' },
                  }}
                />
              ))}

              {/* Center icon */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  className="absolute w-24 h-24 rounded-2xl border-2 border-primary/20"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                />
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Icon className="w-10 h-10 text-primary" />
                </div>
              </div>
            </div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 400, damping: 32 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 mb-3"
            >
              <Sparkles className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-600 font-medium">{slide.badge}</span>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, type: 'spring', stiffness: 400, damping: 32 }}
              className="text-2xl font-semibold text-foreground mb-3"
            >
              {slide.title}
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, type: 'spring', stiffness: 400, damping: 32 }}
              className="text-gray-500 leading-relaxed max-w-sm text-sm"
            >
              {slide.desc}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div className="px-6 pb-10 pt-4 max-w-md mx-auto w-full">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
              animate={{ width: i === current ? 32 : 8, backgroundColor: i === current ? getPrimaryColor() : '#e5e7eb' }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="h-2 rounded-full"
            />
          ))}
        </div>

        {/* CTA button */}
        <motion.div
          key={`btn-${current}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, type: 'spring', stiffness: 400, damping: 30 }}
        >
          <DSMButton onClick={goNext} variant="primary" className="w-full h-14 rounded-2xl">
            {isLast ? (
              <>{t('onboarding.start')} <Sparkles className="w-5 h-5" /></>
            ) : (
              <>{t('onboarding.next')} <ChevronRight className="w-5 h-5" /></>
            )}
          </DSMButton>
        </motion.div>
      </div>
    </div>
  );
}
