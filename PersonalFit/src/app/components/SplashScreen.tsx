/**
 * SplashScreen — premium dark teal entry point
 * Logo: fork + leaf SVG · Language: single chip, tap to expand · CTA: solid teal
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useLanguage, LanguageCode } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { SUPPORTED_LANGUAGES, LANGUAGE_META } from '../../i18n';

const languages = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  name: LANGUAGE_META[code]?.name ?? code,
  flag: LANGUAGE_META[code]?.flag ?? '',
}));

function ForkLeafLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {/* fork */}
      <path
        d="M9 5 L9 13 M9 13 L9 22 M7 5 L7 10 C7 12.5 11 12.5 11 10 L11 5"
        stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* leaf */}
      <path
        d="M15 22 C15 22 15 14 20.5 10 C23 8 26 8 26 8 C26 8 26 11 23.5 13.5 C19 18 15 22 15 22 Z"
        stroke="white" strokeWidth="1.8" strokeLinejoin="round"
      />
      <path d="M15 22 L20.5 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SplashScreen() {
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
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleContinue = () => {
    setLanguage(selectedLanguage);
    markSplashSeen();
    if (navigator.vibrate) navigator.vibrate([15, 30, 50]);
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
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: '#0d9488', boxShadow: '0 4px 20px rgba(13,148,136,0.4)' }}
          onDoubleClick={handleSecretLogoBypass}
        >
          <ForkLeafLogo />
        </div>

        {/* Brand name */}
        <h1 className="text-3xl text-white mb-3" style={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
          PersonalFit
        </h1>

        {/* Tagline */}
        <p className="text-base leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {t('splash.appSubtitle') || 'Személyre szabott étrend, amit tényleg betartasz.'}
        </p>
      </motion.div>

      {/* Bottom — CTA */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
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
