/**
 * SplashScreen — the kix-branded first screen users see.
 * Animated Kix mascot (artistic frog) with spring entrance, idle float, and blink.
 * Single language flag (top-right, tap to cycle), brand gradient, ambient glow.
 * Navigates to /onboarding on CTA tap.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
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

// ── Artistic Kix Mascot ─────────────────────────────────────────────
// More expressive frog: bigger eyes, leaf crown, wider smile, subtle gradient
function KixMascot() {
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
          p.setAttribute('ry', '22');
        });
      }, 150);
    };
    blinkRef.current = setInterval(blink, 3500);
    return () => { if (blinkRef.current) clearInterval(blinkRef.current); };
  }, []);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.1 }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: 'drop-shadow(0 16px 48px rgba(0,0,0,0.3))' }}
      >
        <svg width="180" height="180" viewBox="0 0 400 400" fill="none" aria-hidden="true">
          <defs>
            {/* Body gradient — adds depth */}
            <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#f0fdfa" />
              <stop offset="100%" stopColor="#ccfbf1" />
            </radialGradient>
            {/* Eye glow */}
            <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Head shape — rounder, friendlier */}
          <ellipse cx="200" cy="215" rx="120" ry="100" fill="url(#bodyGrad)" />

          {/* Left eye bump — bigger */}
          <circle cx="140" cy="145" r="52" fill="url(#bodyGrad)" />
          {/* Right eye bump */}
          <circle cx="260" cy="145" r="52" fill="url(#bodyGrad)" />

          {/* Eye glow rings */}
          <circle cx="140" cy="145" r="38" fill="url(#eyeGlow)" />
          <circle cx="260" cy="145" r="38" fill="url(#eyeGlow)" />

          {/* Left pupil */}
          <ellipse ref={leftPupilRef} cx="140" cy="148" rx="22" ry="22" fill="#134e4a" />
          {/* Left eye shine — double highlight */}
          <circle cx="149" cy="139" r="7" fill="#f0fdfa" />
          <circle cx="155" cy="150" r="3.5" fill="#f0fdfa" opacity="0.6" />

          {/* Right pupil */}
          <ellipse ref={rightPupilRef} cx="260" cy="148" rx="22" ry="22" fill="#134e4a" />
          {/* Right eye shine */}
          <circle cx="269" cy="139" r="7" fill="#f0fdfa" />
          <circle cx="275" cy="150" r="3.5" fill="#f0fdfa" opacity="0.6" />

          {/* Wider, friendlier smile */}
          <path
            d="M 145 240 Q 172 280 200 282 Q 228 280 255 240"
            fill="none"
            stroke="#0f766e"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Subtle tongue peek */}
          <ellipse cx="200" cy="275" rx="12" ry="8" fill="#f87171" opacity="0.6" />

          {/* Cheek blush — larger, softer */}
          <circle cx="120" cy="230" r="18" fill="#99f6e4" opacity="0.4" />
          <circle cx="280" cy="230" r="18" fill="#99f6e4" opacity="0.4" />

          {/* Leaf crown — 3 small leaves on top of head */}
          <g transform="translate(200, 118)">
            {/* Center leaf */}
            <path d="M0 -8 Q-6 -28 0 -38 Q6 -28 0 -8Z" fill="#0d9488" opacity="0.8" />
            <path d="M0 -12 L0 -35" stroke="#134e4a" strokeWidth="1" opacity="0.4" />
            {/* Left leaf */}
            <path d="M-18 -2 Q-30 -18 -22 -28 Q-14 -20 -18 -2Z" fill="#14b8a6" opacity="0.6" />
            {/* Right leaf */}
            <path d="M18 -2 Q30 -18 22 -28 Q14 -20 18 -2Z" fill="#14b8a6" opacity="0.6" />
          </g>
        </svg>
      </motion.div>
    </motion.div>
  );
}

// ── Mock Notification (swipe up to dismiss, tap to open app) ─────────
function MockNotification({ language, t, onTap }: { language: string; t: (k: string) => string; onTap: () => void }) {
  const [visible, setVisible] = useState(true);
  const [appeared, setAppeared] = useState(false);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-80, -40, 0], [0, 0.5, 1]);
  const controls = useAnimation();

  // Show after 2.2s, auto-dismiss after 8s
  useEffect(() => {
    const showTimer = setTimeout(() => setAppeared(true), 2200);
    const hideTimer = setTimeout(() => setVisible(false), 10200);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, []);

  const handleDragEnd = useCallback((_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y < -30 || info.velocity.y < -200) {
      controls.start({ y: -150, opacity: 0, transition: { duration: 0.2 } }).then(() => setVisible(false));
    } else {
      controls.start({ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } });
    }
  }, [controls]);

  const bodyText = language === 'en'
    ? "Good morning! Today's breakfast: Oatmeal with nuts (420 kcal). Daily goal: 2100 kcal."
    : language === 'ro'
    ? 'Bună dimineața! Micul dejun: Terci cu nuci (420 kcal). Ținta zilnică: 2100 kcal.'
    : 'Jó reggelt! Mai reggeli: Zabkása dióval (420 kcal). Napi célod: 2100 kcal.';

  if (!visible || !appeared) return null;

  return (
    <motion.div
      className="absolute left-4 right-4 z-30 cursor-pointer"
      style={{ top: 'max(3.5rem, calc(env(safe-area-inset-top) + 0.5rem))', y, opacity }}
      initial={{ y: -120, opacity: 0 }}
      animate={controls}
      drag="y"
      dragConstraints={{ top: -100, bottom: 10 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
      onClick={onTap}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
    >
      {/* Swipe indicator pill */}
      <div className="flex justify-center mb-1.5">
        <div className="w-8 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
      </div>
      <motion.div
        className="rounded-2xl px-4 py-3 flex items-start gap-3"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}
        initial={{ y: -120 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}>
          <span className="text-lg">🐸</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>kix</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>most</span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>
            {t('notification.morningTitle')}
          </p>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.35, marginTop: 2 }}>
            {bodyText}
          </p>
        </div>
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
  const [langOpen, setLangOpen] = useState(false);

  // Auto-detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    const matched = languages.find((l) => l.code === browserLang);
    if (matched) setLanguage(matched.code as LanguageCode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = useCallback(() => {
    markSplashSeen();
    hapticFeedback('light');
    navigate('/onboarding');
  }, [markSplashSeen, navigate]);

  const cycleLang = useCallback(() => {
    if (langOpen) {
      setLangOpen(false);
      return;
    }
    setLangOpen(true);
  }, [langOpen]);

  const selectLang = useCallback((code: LanguageCode) => {
    setLanguage(code);
    hapticFeedback('light');
    setLangOpen(false);
  }, [setLanguage]);

  const currentLang = languages.find((l) => l.code === language) ?? languages[0];

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden relative"
      style={{ background: 'linear-gradient(160deg, #0d9488, #0f766e, #134e4a)' }}
    >
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute rounded-full blur-3xl"
          style={{ width: 320, height: 320, background: '#14b8a6', top: -120, right: -100, opacity: 0.12 }}
          animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full blur-3xl"
          style={{ width: 260, height: 260, background: '#134e4a', bottom: -80, left: -80, opacity: 0.25 }}
          animate={{ x: [0, -15, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full blur-3xl"
          style={{ width: 200, height: 200, background: '#2dd4bf', top: '45%', left: '55%', transform: 'translate(-50%, -50%)', opacity: 0.06 }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Top bar: language flag (right side only, no skip) */}
      <div className="relative z-20 flex items-center justify-end px-5 pt-[max(1rem,env(safe-area-inset-top))] min-h-[48px]">
        <div className="relative">
          {/* Current language flag */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={cycleLang}
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer select-none"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.3)',
            }}
            aria-label={t('splash.chooseLanguage')}
          >
            <span className="text-lg leading-none">{currentLang.flag}</span>
          </motion.button>

          {/* Dropdown with other languages */}
          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="absolute top-12 right-0 flex flex-col gap-1.5 p-1.5 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {languages.filter(l => l.code !== language).map((lang) => (
                  <motion.button
                    key={lang.code}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => selectLang(lang.code as LanguageCode)}
                    type="button"
                    className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer select-none"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                    aria-label={lang.name}
                  >
                    <span className="text-lg leading-none">{lang.flag}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mock notification — slides in from top, swipe up to dismiss, tap to proceed */}
      <MockNotification
        language={language}
        t={t}
        onTap={handleStart}
      />

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Kix mascot */}
        <div className="mb-8">
          <KixMascot />
        </div>

        {/* Brand name — large, white, bold */}
        <motion.h1
          className="text-white mb-3"
          style={{
            fontSize: 48,
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

        {/* Subtitle — bigger, white, readable (like onboarding style) */}
        <motion.p
          className="text-center mb-2"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#ffffff',
            lineHeight: 1.4,
            maxWidth: 280,
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
        >
          {t('splash.appSubtitle')}
        </motion.p>

        {/* Tagline — glow teal */}
        <motion.p
          style={{
            fontSize: 12,
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: 3,
            color: '#5eead4',
            lineHeight: 1.6,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          {t('splash.tagline')}
        </motion.p>
      </div>

      {/* Fixed bottom: CTA + version — always visible, floating */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 left-0 right-0 z-20 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3"
        style={{ background: 'linear-gradient(to top, rgba(19,78,74,0.95) 60%, transparent)' }}
      >
        <div className="max-w-md mx-auto w-full">
          <button
            onClick={handleStart}
            type="button"
            className="w-full font-bold text-base transition-all active:scale-[0.98] cursor-pointer"
            style={{
              height: 56,
              background: 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              borderRadius: 16,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              fontSize: 16,
            }}
          >
            {t('splash.startButton')}
          </button>

          {/* Version badge */}
          <p className="text-center mt-3" style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            v{APP_VERSION}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
