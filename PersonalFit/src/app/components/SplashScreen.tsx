/**
 * SplashScreen — premium dark teal entry point
 * Logo: fork + leaf SVG · Language: single chip, tap to expand · CTA: solid teal
 */

import { hapticFeedback } from '@/lib/haptics';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useLanguage, LanguageCode } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { SUPPORTED_LANGUAGES, LANGUAGE_META } from '../../i18n';
import { useThemeColor } from '../hooks/useThemeColor';
import { APP_VERSION, BUILD_DATE } from '../version';

const languages = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  name: LANGUAGE_META[code]?.name ?? code,
  flag: LANGUAGE_META[code]?.flag ?? '',
}));

function KixLogo() {
  return (
    <svg width="130" height="130" viewBox="0 0 108 108" fill="none" aria-hidden="true">
      {/* Head */}
      <motion.path
        d="M54,38 C38,38 28,46 28,58 C28,70 38,78 54,78 C70,78 80,70 80,58 C80,46 70,38 54,38Z"
        fill="#14b8a6"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: '54px 58px' }}
      />
      {/* Left eye bulge */}
      <motion.path d="M36,42 C36,36 40,32 44,32 C48,32 52,36 52,42 C52,46 48,48 44,48 C40,48 36,46 36,42Z" fill="#14b8a6"
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }} style={{ transformOrigin: '44px 40px' }} />
      {/* Right eye bulge */}
      <motion.path d="M56,42 C56,36 60,32 64,32 C68,32 72,36 72,42 C72,46 68,48 64,48 C60,48 56,46 56,42Z" fill="#14b8a6"
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }} style={{ transformOrigin: '64px 40px' }} />
      {/* Left eye white */}
      <motion.path d="M39,41 C39,37.5 41,35.5 44,35.5 C47,35.5 49,37.5 49,41 C49,44 47,45.5 44,45.5 C41,45.5 39,44 39,41Z" fill="#FFFFFF"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 400 }}
        style={{ transformOrigin: '44px 41px' }} />
      {/* Right eye white */}
      <motion.path d="M59,41 C59,37.5 61,35.5 64,35.5 C67,35.5 69,37.5 69,41 C69,44 67,45.5 64,45.5 C61,45.5 59,44 59,41Z" fill="#FFFFFF"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 400 }}
        style={{ transformOrigin: '64px 41px' }} />
      {/* Left pupil */}
      <motion.path d="M42,40 C42,38.5 43,37.5 44.5,37.5 C46,37.5 47,38.5 47,40 C47,41.5 46,42.5 44.5,42.5 C43,42.5 42,41.5 42,40Z" fill="#0c1f1e"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.55 }} style={{ transformOrigin: '44.5px 40px' }} />
      {/* Right pupil */}
      <motion.path d="M61,40 C61,38.5 62,37.5 63.5,37.5 C65,37.5 66,38.5 66,40 C66,41.5 65,42.5 63.5,42.5 C62,42.5 61,41.5 61,40Z" fill="#0c1f1e"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.55 }} style={{ transformOrigin: '63.5px 40px' }} />
      {/* Eye shines */}
      <motion.circle cx={43.8} cy={38.5} r={0.8} fill="#FFFFFF"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} />
      <motion.circle cx={62.8} cy={38.5} r={0.8} fill="#FFFFFF"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} />
      {/* Belly */}
      <motion.path d="M42,58 C42,54 46,52 54,52 C62,52 66,54 66,58 C66,64 62,70 54,70 C46,70 42,64 42,58Z" fill="#5eead4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} />
      {/* Smile */}
      <motion.path d="M38,62 Q46,70 54,68 Q62,70 70,62" fill="none" stroke="#0c1f1e" strokeWidth={2} strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }} />
      {/* Nostrils */}
      <motion.ellipse cx={49} cy={52} rx={1} ry={1.2} fill="#0f766e"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} />
      <motion.ellipse cx={59} cy={52} rx={1} ry={1.2} fill="#0f766e"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} />
      {/* Cheeks */}
      <motion.path d="M32,58 C32,56 34,54 37,54 C39,54 40,56 40,58 C40,60 39,61 37,61 C34,61 32,60 32,58Z" fill="rgba(255,255,255,0.12)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} />
      <motion.path d="M68,58 C68,56 70,54 71,54 C74,54 76,56 76,58 C76,60 74,61 71,61 C70,61 68,60 68,58Z" fill="rgba(255,255,255,0.12)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} />
    </svg>
  );
}

export function SplashScreen() {
  useThemeColor('#0c1f1e'); // dark teal — matches splash background
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { markSplashSeen } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(language);
  const [ready, setReady] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Auto-detect browser language
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    const matched = languages.find(l => l.code === browserLang);
    if (matched) {
      setSelectedLanguage(matched.code as LanguageCode);
      setLanguage(matched.code as LanguageCode);
    }
    const timer = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(timer);
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

  const handleContinue = () => {
    setLanguage(selectedLanguage);
    markSplashSeen();
    hapticFeedback('light');
    navigate('/onboarding');
  };

  // Dev bypass: double-click logo to skip auth in development
  const handleSecretLogoBypass = async () => {
    if (!(import.meta.env.DEV || window.location.hostname === 'localhost')) return;
    const devUser = {
      id: 'dev_bypass_user', email: 'dev@sixth-halt.local', name: 'Dev Bypass',
      avatar: '', provider: 'demo', createdAt: new Date().toISOString(), isFirstLogin: false,
    };
    try {
      const { setSetting } = await import('../backend/services/SettingsService');
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

  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative" style={{ background: '#0c1f1e' }}>

      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute rounded-full blur-3xl"
          style={{ width: 280, height: 280, background: '#14b8a6', top: -80, right: -60, opacity: 0.12 }} />
        <div className="absolute rounded-full blur-3xl"
          style={{ width: 200, height: 200, background: '#134e4a', bottom: -40, left: -50, opacity: 0.5 }} />
      </div>

      {/* Top bar — language chip only */}
      <div className="relative z-20 flex items-center justify-end px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div ref={pickerRef} className="relative">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full cursor-pointer select-none"
            style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.35)', color: 'rgba(20,184,166,0.9)' }}
            type="button"
            aria-label={t('splash.chooseLanguage') || 'Nyelv választás'}
          >
            <span className="text-sm leading-none pointer-events-none">{selectedLang.flag}</span>
            <span className="text-xs font-bold pointer-events-none tracking-wide">{selectedLang.code.toUpperCase()}</span>
            <span className="text-xs opacity-60 pointer-events-none">▾</span>
          </motion.button>

          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-full right-0 mt-2 w-52 rounded-2xl shadow-2xl overflow-hidden z-50"
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
      </div>

      {/* Center — logo + brand + tagline */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo mark */}
        <div
          className="mb-5 flex items-center justify-center"
          style={{ filter: 'drop-shadow(0 8px 32px rgba(13,148,136,0.45))' }}
          onDoubleClick={handleSecretLogoBypass}
        >
          <KixLogo />
        </div>

        {/* Brand name */}
        <h1 className="text-3xl text-white mb-3" style={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
          kix
        </h1>

        {/* Tagline */}
        <p className="text-base leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {t('splash.appSubtitle') || 'Személyre szabott étrend, amit tényleg betartasz.'}
        </p>

        {/* Version badge */}
        <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          v{APP_VERSION} · {BUILD_DATE}
        </p>
      </motion.div>

      {/* Bottom — CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 max-w-md mx-auto w-full"
      >
        <button
          onClick={handleContinue}
          className="w-full h-14 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] cursor-pointer"
          style={{ background: '#0d9488', boxShadow: '0 4px 20px rgba(13,148,136,0.35)' }}
          type="button"
        >
          {t('onboarding.start') || 'Kezdjük el'}
        </button>
      </motion.div>
    </div>
  );
}
