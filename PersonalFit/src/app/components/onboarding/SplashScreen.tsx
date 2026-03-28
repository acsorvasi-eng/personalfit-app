/**
 * SplashScreen — the kix-branded first screen users see.
 * Animated Kix (frog mascot) with spring entrance, idle float, and blink.
 * Language selector, brand gradient background, ambient glow blobs.
 * Navigates to /onboarding (the white slides) on CTA tap.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { hapticFeedback } from '@/lib/haptics';
import { useLanguage, LanguageCode } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { SUPPORTED_LANGUAGES, LANGUAGE_META } from '../../../i18n';
import { useThemeColor } from '../../hooks/useThemeColor';
import { APP_VERSION } from '../../version';

const languages = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  name: LANGUAGE_META[code]?.name ?? code,
  flag: LANGUAGE_META[code]?.flag ?? '',
}));

// ── Animated Frog Face ───────────────────────────────────────────────
function AnimatedFrog() {
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const leftPupilRef = useRef<SVGEllipseElement>(null);
  const rightPupilRef = useRef<SVGEllipseElement>(null);

  useEffect(() => {
    const blink = () => {
      const pupils = [leftPupilRef.current, rightPupilRef.current];
      pupils.forEach((p) => {
        if (!p) return;
        p.setAttribute('ry', '2');
      });
      setTimeout(() => {
        pupils.forEach((p) => {
          if (!p) return;
          p.setAttribute('ry', '20');
        });
      }, 150);
    };

    blinkRef.current = setInterval(blink, 4000);
    return () => {
      if (blinkRef.current) clearInterval(blinkRef.current);
    };
  }, []);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.25))' }}
      >
        <svg
          width="160"
          height="160"
          viewBox="0 0 400 400"
          fill="none"
          aria-hidden="true"
        >
          {/* Head shape */}
          <ellipse cx="200" cy="220" rx="110" ry="90" fill="#f0fdfa" />

          {/* Left eye bump */}
          <circle cx="145" cy="155" r="45" fill="#f0fdfa" />
          {/* Right eye bump */}
          <circle cx="255" cy="155" r="45" fill="#f0fdfa" />

          {/* Left pupil (animated via ref) */}
          <ellipse
            ref={leftPupilRef}
            cx="145"
            cy="155"
            rx="20"
            ry="20"
            fill="#134e4a"
          />
          {/* Left eye shine */}
          <circle cx="152" cy="148" r="6" fill="#f0fdfa" />

          {/* Right pupil (animated via ref) */}
          <ellipse
            ref={rightPupilRef}
            cx="255"
            cy="155"
            rx="20"
            ry="20"
            fill="#134e4a"
          />
          {/* Right eye shine */}
          <circle cx="262" cy="148" r="6" fill="#f0fdfa" />

          {/* Smile */}
          <path
            d="M 155 240 Q 200 280 245 240"
            fill="none"
            stroke="#134e4a"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Cheek blush */}
          <circle cx="140" cy="235" r="14" fill="#99f6e4" opacity="0.5" />
          <circle cx="260" cy="235" r="14" fill="#99f6e4" opacity="0.5" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────────
export function SplashScreen() {
  useThemeColor('#0a3d3a');

  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { markSplashSeen } = useAuth();

  // Auto-detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    const matched = languages.find((l) => l.code === browserLang);
    if (matched) {
      setLanguage(matched.code as LanguageCode);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = useCallback(() => {
    markSplashSeen();
    hapticFeedback('light');
    navigate('/onboarding');
  }, [markSplashSeen, navigate]);

  const handleSkip = useCallback(() => {
    markSplashSeen();
    hapticFeedback('light');
    navigate('/onboarding');
  }, [markSplashSeen, navigate]);

  const handleLanguageChange = useCallback(
    (code: LanguageCode) => {
      setLanguage(code);
      hapticFeedback('light');
    },
    [setLanguage],
  );

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden relative"
      style={{
        background: 'linear-gradient(160deg, #0d9488, #0f766e, #134e4a)',
      }}
    >
      {/* Ambient glow blobs */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <motion.div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 320,
            height: 320,
            background: '#14b8a6',
            top: -120,
            right: -100,
            opacity: 0.12,
          }}
          animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 260,
            height: 260,
            background: '#134e4a',
            bottom: -80,
            left: -80,
            opacity: 0.25,
          }}
          animate={{ x: [0, -15, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 200,
            height: 200,
            background: '#2dd4bf',
            top: '45%',
            left: '55%',
            transform: 'translate(-50%, -50%)',
            opacity: 0.06,
          }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Top bar: language flags + skip */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        {/* Language flag buttons */}
        <div className="flex items-center gap-1.5">
          {languages.map((lang) => {
            const isActive = language === lang.code;
            return (
              <motion.button
                key={lang.code}
                whileTap={{ scale: 0.88 }}
                onClick={() =>
                  handleLanguageChange(lang.code as LanguageCode)
                }
                type="button"
                className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer select-none transition-all"
                style={{
                  background: isActive
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(255,255,255,0.08)',
                  border: isActive
                    ? '2px solid rgba(255,255,255,0.5)'
                    : '2px solid transparent',
                }}
                aria-label={lang.name}
              >
                <span className="text-base leading-none">{lang.flag}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Skip button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          onClick={handleSkip}
          type="button"
          className="text-sm font-medium cursor-pointer px-2 py-1"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          {t('onboarding.skip')}
        </motion.button>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Frog logo */}
        <div className="mb-6">
          <AnimatedFrog />
        </div>

        {/* Brand name */}
        <motion.h1
          className="text-white mb-3"
          style={{
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          kix
        </motion.h1>

        {/* Tagline */}
        <motion.p
          style={{
            fontSize: 11,
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: 4,
            color: '#5eead4',
            lineHeight: 1.6,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {t('splash.tagline')}
        </motion.p>
      </div>

      {/* Bottom: CTA + version */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 max-w-md mx-auto w-full"
      >
        <button
          onClick={handleStart}
          type="button"
          className="w-full rounded-2xl font-bold text-base transition-all active:scale-[0.98] cursor-pointer"
          style={{
            height: 56,
            background: 'rgba(255,255,255,0.2)',
            color: '#ffffff',
            borderRadius: 16,
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {t('splash.startButton')}
        </button>

        {/* Version badge */}
        <p
          className="text-center mt-4"
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          v{APP_VERSION}
        </p>
      </motion.div>
    </div>
  );
}
