/**
 * AnimatedIntro — single animated intro screen replacing splash + onboarding
 * Combines logo reveal, 3 auto-scrolling feature panels, language picker, and CTA.
 * Uses framer-motion for all animations. Teal gradient background, white text/icons.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, Sparkles, Heart, Check, X } from 'lucide-react';
import { hapticFeedback } from '@/lib/haptics';
import { useLanguage, LanguageCode } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { SUPPORTED_LANGUAGES, LANGUAGE_META } from '../../../i18n';
import { useThemeColor } from '../../hooks/useThemeColor';
import { APP_VERSION, BUILD_DATE } from '../../version';

const languages = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  name: LANGUAGE_META[code]?.name ?? code,
  flag: LANGUAGE_META[code]?.flag ?? '',
}));

// ── Nura Logo (reused from SplashScreen) ────────────────────────────
function NuraLogo() {
  return (
    <svg width="100" height="100" viewBox="0 0 130 130" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="nGrad" x1="10" y1="130" x2="120" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id="nFill" x1="20" y1="110" x2="110" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
        </linearGradient>
        <linearGradient id="hbGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.8)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <motion.circle
        cx={65} cy={65} r={58}
        stroke="url(#nGrad)" strokeWidth="2.5" fill="none" opacity={0.3}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.3 }}
        transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
      />
      <motion.path
        d="M 34 95 L 34 55 C 34 38 50 30 65 42 C 80 30 96 38 96 55 L 96 95"
        stroke="url(#nGrad)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
        fill="url(#nFill)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
      />
      <motion.path
        d="M 18 92 L 34 92 L 40 80 L 48 104 L 54 88 L 65 92 L 76 88 L 82 104 L 90 80 L 96 92 L 112 92"
        stroke="url(#hbGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        fill="none" filter="url(#glow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.8 }}
        transition={{ delay: 1.4, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      />
    </svg>
  );
}

// ── Panel icon components with entrance animations ──────────────────
function PanelIcon({ icon: Icon, delay }: { icon: typeof UtensilsCrossed; delay: number }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay }}
      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
    >
      <Icon className="w-8 h-8 text-white" strokeWidth={1.8} />
    </motion.div>
  );
}

// ── Panel data ──────────────────────────────────────────────────────
const PANELS = [
  { icon: UtensilsCrossed, titleKey: 'intro.panel1.title', subtitleKey: 'intro.panel1.subtitle' },
  { icon: Sparkles,        titleKey: 'intro.panel2.title', subtitleKey: 'intro.panel2.subtitle' },
  { icon: Heart,           titleKey: 'intro.panel3.title', subtitleKey: 'intro.panel3.subtitle' },
] as const;

const AUTO_PLAY_INTERVAL = 3000; // ms per panel

// ── Slide variants ──────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -60 }),
};

// ── Main Component ──────────────────────────────────────────────────
export function AnimatedIntro() {
  useThemeColor('#0a3d3a');

  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { markSplashSeen, markOnboardingComplete } = useAuth();

  const [activePanel, setActivePanel] = useState(0);
  const [direction, setDirection] = useState(1);
  const [logoVisible, setLogoVisible] = useState(true);
  const [panelsReady, setPanelsReady] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(language);

  const touchStartX = useRef(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Auto-detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    const matched = languages.find(l => l.code === browserLang);
    if (matched) {
      setSelectedLanguage(matched.code as LanguageCode);
      setLanguage(matched.code as LanguageCode);
    }
  }, []);

  // Logo phase -> panels phase
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoVisible(false);
      setTimeout(() => setPanelsReady(true), 400);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  // Auto-play panels
  useEffect(() => {
    if (!panelsReady) return;
    autoPlayRef.current = setInterval(() => {
      setDirection(1);
      setActivePanel((prev) => (prev + 1) % PANELS.length);
    }, AUTO_PLAY_INTERVAL);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [panelsReady]);

  // Reset auto-play on manual interaction
  const resetAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setDirection(1);
      setActivePanel((prev) => (prev + 1) % PANELS.length);
    }, AUTO_PLAY_INTERVAL);
  }, []);

  // Close picker on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  const handleLanguageChange = (code: LanguageCode) => {
    setSelectedLanguage(code);
    setLanguage(code);
    setLangOpen(false);
    hapticFeedback('light');
  };

  const handleStart = () => {
    markSplashSeen();
    markOnboardingComplete();
    hapticFeedback('light');
    navigate('/login');
  };

  const handleSkip = () => {
    markSplashSeen();
    markOnboardingComplete();
    hapticFeedback('light');
    navigate('/login');
  };

  const goToPanel = (index: number) => {
    setDirection(index > activePanel ? 1 : -1);
    setActivePanel(index);
    resetAutoPlay();
  };

  // Dev bypass: double-click logo to skip auth in development
  const handleSecretLogoBypass = async () => {
    if (!(import.meta.env.DEV || window.location.hostname === 'localhost')) return;
    const devUser = {
      id: 'dev_bypass_user', email: 'dev@sixth-halt.local', name: 'Dev Bypass',
      avatar: '', provider: 'demo', createdAt: new Date().toISOString(), isFirstLogin: false,
    };
    try {
      const { setSetting } = await import('../../backend/services/SettingsService');
      await Promise.all([
        setSetting('authUser', JSON.stringify(devUser)),
        setSetting('hasAcceptedTerms', 'true'),
        setSetting('hasCompletedOnboarding', 'true'),
        setSetting('hasSeenSplash', 'true'),
        setSetting('hasPlanSetup', 'true'),
        setSetting('hasCompletedFullFlow', 'true'),
      ]);
    } catch { return; }
    window.location.href = '/';
  };

  const selectedLang = languages.find(l => l.code === selectedLanguage) || languages[0];
  const panel = PANELS[activePanel];

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden relative"
      style={{
        background: 'linear-gradient(160deg, #0a3d3a 0%, #0d9488 50%, #0f766e 100%)',
      }}
    >
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute rounded-full blur-3xl"
          style={{ width: 300, height: 300, background: '#14b8a6', top: -100, right: -80, opacity: 0.15 }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{ width: 250, height: 250, background: '#134e4a', bottom: -60, left: -60, opacity: 0.3 }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{ width: 200, height: 200, background: '#2dd4bf', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.08 }}
        />
      </div>

      {/* Top bar: language chip + skip button */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        {/* Language picker */}
        <div ref={pickerRef} className="relative">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full cursor-pointer select-none"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}
            type="button"
            aria-label={t('splash.chooseLanguage') || 'Language'}
          >
            <span className="text-sm leading-none pointer-events-none">{selectedLang.flag}</span>
            <span className="text-xs font-bold pointer-events-none tracking-wide">{selectedLang.code.toUpperCase()}</span>
            <span className="text-xs opacity-60 pointer-events-none">&#9662;</span>
          </motion.button>

          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-full left-0 mt-2 w-52 rounded-2xl shadow-2xl overflow-hidden z-50"
                style={{ background: 'white', border: '1px solid #e2e8f0' }}
              >
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <span className="text-xs font-semibold text-gray-500">{t('splash.language') || 'Nyelv'}</span>
                  <button onClick={() => setLangOpen(false)} type="button"
                    className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer">
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
                <div className="py-1.5">
                  {languages.map((lang) => {
                    const isActive = selectedLanguage === lang.code;
                    return (
                      <button key={lang.code} onClick={() => handleLanguageChange(lang.code as LanguageCode)}
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer"
                        style={{ background: isActive ? '#f0fdfa' : 'transparent' }}>
                        <span className="text-lg leading-none">{lang.flag}</span>
                        <span className="text-sm flex-1 text-left"
                          style={{ fontWeight: isActive ? 700 : 500, color: isActive ? '#0d9488' : '#374151' }}>
                          {lang.name}
                        </span>
                        {isActive && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: '#0d9488' }}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Skip button */}
        <AnimatePresence>
          {panelsReady && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleSkip}
              type="button"
              className="text-sm font-medium cursor-pointer px-2 py-1"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              {t('onboarding.skip')}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Phase 1: Logo reveal */}
        <AnimatePresence>
          {logoVisible && (
            <motion.div
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="mb-5 flex items-center justify-center"
                style={{ filter: 'drop-shadow(0 8px 32px rgba(255,255,255,0.15))' }}
                onDoubleClick={handleSecretLogoBypass}
              >
                <NuraLogo />
              </div>
              <motion.h1
                className="text-4xl text-white mb-3"
                style={{ fontWeight: 800, letterSpacing: '-0.02em' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                nura
              </motion.h1>
              <motion.p
                className="text-base leading-relaxed max-w-xs"
                style={{ color: 'rgba(255,255,255,0.55)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.5 }}
              >
                {t('splash.appSubtitle')}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 2: Feature panels */}
        <AnimatePresence>
          {panelsReady && (
            <motion.div
              className="w-full max-w-sm flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Small nura brand above panels */}
              <motion.div
                className="mb-8 flex flex-col items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <span className="text-xl text-white font-bold" style={{ letterSpacing: '-0.01em' }}>nura</span>
              </motion.div>

              {/* Panel carousel */}
              <div
                className="w-full overflow-hidden"
                style={{ minHeight: 200 }}
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                  const dx = e.changedTouches[0].clientX - touchStartX.current;
                  if (Math.abs(dx) > 60) {
                    if (dx < 0 && activePanel < PANELS.length - 1) {
                      goToPanel(activePanel + 1);
                    } else if (dx > 0 && activePanel > 0) {
                      goToPanel(activePanel - 1);
                    }
                  }
                }}
              >
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={activePanel}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="flex flex-col items-center"
                  >
                    <PanelIcon icon={panel.icon} delay={0.1} />
                    <h2
                      className="text-xl text-white mb-2"
                      style={{ fontWeight: 700, lineHeight: 1.3 }}
                    >
                      {t(panel.titleKey)}
                    </h2>
                    <p
                      className="text-sm leading-relaxed max-w-[260px]"
                      style={{ color: 'rgba(255,255,255,0.6)' }}
                    >
                      {t(panel.subtitleKey)}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Dot indicators */}
              <div className="flex items-center gap-2 mt-8">
                {PANELS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToPanel(i)}
                    className="cursor-pointer p-1"
                    aria-label={`Panel ${i + 1}`}
                  >
                    <motion.div
                      className="rounded-full"
                      animate={{
                        width: i === activePanel ? 24 : 8,
                        height: 8,
                        background: i === activePanel ? '#ffffff' : 'rgba(255,255,255,0.3)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Version badge */}
      <AnimatePresence>
        {logoVisible && (
          <motion.p
            className="text-center text-xs relative z-10 pb-2"
            style={{ color: 'rgba(255,255,255,0.2)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.2, duration: 0.4 }}
          >
            v{APP_VERSION} &middot; {BUILD_DATE}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Bottom CTA */}
      <AnimatePresence>
        {panelsReady && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 max-w-md mx-auto w-full"
          >
            <button
              onClick={handleStart}
              type="button"
              className="w-full h-14 rounded-2xl font-bold text-base transition-all active:scale-[0.98] cursor-pointer"
              style={{
                background: '#ffffff',
                color: '#0d9488',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              }}
            >
              {t('intro.startButton')} &rarr;
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
