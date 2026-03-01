/**
 * SplashScreen - Frictionless entry point
 * ========================================
 * UX Goal: Get the user INTO the app as fast as possible.
 *
 * Design decisions (2026 UX audit):
 *   - Language selector → small globe circle in top-right corner (non-blocking)
 *   - Auto-detect browser language (zero-tap for most users)
 *   - Hero CTA button → bottom-pinned, matching OnboardingScreen layout
 *   - Uses Button component from ui/button for DSM consistency
 *   - Reduced animation time: 600ms vs previous 1200ms
 *   - Single clear action: one big button → enter app
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, ArrowRight, Sparkles, Check, X, Globe } from 'lucide-react';
import { useLanguage, LanguageCode } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

const languages = [
  { code: 'hu', name: 'Magyar', flag: '\u{1F1ED}\u{1F1FA}', greeting: 'Kezdjük!' },
  { code: 'en', name: 'English', flag: '\u{1F1EC}\u{1F1E7}', greeting: "Let's go!" },
  { code: 'ro', name: 'Română', flag: '\u{1F1F7}\u{1F1F4}', greeting: 'Să începem!' },
];

export function SplashScreen() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { markSplashSeen } = useAuth();
  const [selectedLanguage, setSelectedLanguageState] = useState<LanguageCode>(language);
  const [ready, setReady] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Auto-detect browser language + fast reveal
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    const matched = languages.find(l => l.code === browserLang);
    if (matched) {
      setSelectedLanguageState(matched.code as LanguageCode);
      setLanguage(matched.code as LanguageCode);
    }
    const timer = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Close picker on outside click
  useEffect(() => {
    if (!langPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setLangPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langPickerOpen]);

  const handleLanguageChange = (code: LanguageCode) => {
    setSelectedLanguageState(code);
    setLanguage(code);
    setLangPickerOpen(false);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleContinue = () => {
    setLanguage(selectedLanguage);
    markSplashSeen();
    if (navigator.vibrate) navigator.vibrate([15, 30, 50]);
    navigate('/onboarding');
  };

  const selectedLang = languages.find(l => l.code === selectedLanguage) || languages[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-teal-600 flex flex-col overflow-hidden">
      {/* ── Ambient Background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 left-8 w-72 h-72 bg-white opacity-[0.07] rounded-full blur-3xl" />
        <div className="absolute bottom-24 right-4 w-80 h-80 bg-yellow-300 opacity-[0.08] rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-56 h-56 bg-cyan-200 opacity-[0.06] rounded-full blur-3xl" />
      </div>

      {/* ═══════════════════════════════════════════════════════════
           TOP BAR — Language globe (small, non-blocking)
         ═══════════════════════════════════════════════════════════ */}
      <div className="relative z-20 flex items-center justify-end px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div ref={pickerRef} className="relative">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setLangPickerOpen(!langPickerOpen)}
            className="flex items-center gap-2 h-11 px-3.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-lg transition-colors hover:bg-white/30 cursor-pointer select-none"
            aria-label={t('splash.chooseLanguage') || 'Nyelv választás'}
            type="button"
          >
            <span className="text-lg leading-none pointer-events-none">{selectedLang.flag}</span>
            <span className="text-sm text-white pointer-events-none" style={{ fontWeight: 600 }}>{selectedLang.name}</span>
            <Globe className="w-4 h-4 text-white/70 pointer-events-none" />
          </motion.button>

          {/* Language Picker Popover */}
          <AnimatePresence>
            {langPickerOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-100"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500" style={{ fontWeight: 600 }}>{t('splash.language')}</span>
                  </div>
                  <button
                    onClick={() => setLangPickerOpen(false)}
                    className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
                {/* Language Options */}
                <div className="py-1.5">
                  {languages.map((lang) => {
                    const isActive = selectedLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code as LanguageCode)}
                        type="button"
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${
                          isActive ? 'bg-blue-50' : 'hover:bg-gray-50 active:bg-gray-100'
                        }`}
                      >
                        <span className="text-xl leading-none pointer-events-none">{lang.flag}</span>
                        <span
                          className={`text-sm flex-1 text-left pointer-events-none ${isActive ? 'text-blue-700' : 'text-gray-700'}`}
                          style={{ fontWeight: isActive ? 700 : 500 }}
                        >
                          {lang.name}
                        </span>
                        {isActive && (
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center pointer-events-none">
                            <Check className="w-3.5 h-3.5 text-white" />
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

      {/* ═══════════════════════════════════════════════════════════
           CENTER — Logo + Title (vertically centered in remaining space)
         ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="max-w-md w-full">
          {/* Logo — entrance animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center mb-8"
          >
            <div className="relative">
              <div className="w-28 h-28 bg-white rounded-3xl shadow-2xl flex items-center justify-center transform rotate-6">
                <UtensilsCrossed className="w-16 h-16 text-blue-500" />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 15 }}
                className="absolute -top-2 -right-2 w-9 h-9 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
            </div>
          </motion.div>

          {/* Title Block */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl text-white mb-3 drop-shadow-lg" style={{ fontWeight: 800 }}>
              {t('splash.appTitle') || 'Meal Plan'}
            </h1>
            <p className="text-white/80 text-base sm:text-lg px-4 leading-relaxed">
              {t('splash.appSubtitle') || '4 hetes személyre szabott étrend'}
            </p>
          </motion.div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
           BOTTOM — CTA Button (pinned to bottom, matching OnboardingScreen)
           Same layout: px-6 pb-10 pt-4 max-w-md mx-auto w-full
         ═══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 max-w-md mx-auto w-full"
      >
        {/* CTA — uses Button component from ui/button (same as OnboardingScreen) */}
        <Button
          onClick={handleContinue}
          className="w-full h-14 rounded-2xl bg-white hover:bg-white/95 text-blue-600 border-0 shadow-lg gap-2.5 transition-all active:scale-[0.98]"
          style={{ fontWeight: 700 }}
        >
          <span>{selectedLang.greeting}</span>
          <ArrowRight className="w-5 h-5" />
        </Button>

        {/* Subtle trust text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={ready ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center text-white/60 text-xs mt-4"
        >
          {t('splash.motivational') || 'Az első lépés az egészség felé'}
        </motion.p>
      </motion.div>
    </div>
  );
}