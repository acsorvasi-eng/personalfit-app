/**
 * ====================================================================
 * PlanSetupScreen — "First Decision" after login/onboarding
 * ====================================================================
 * Two paths:
 *   1. Manual Input → user builds meals day-by-day
 *   2. PDF Upload → nutritionist-approved plan parsed by AI
 *
 * After choosing, redirects to:
 *   - ManualMealInput screen (manual)
 *   - DataUploadSheet opens inline (PDF)
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileUp,
  PenLine,
  Sparkles,
  ChevronRight,
  UtensilsCrossed,
  Brain,
  Shield,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export function PlanSetupScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selected, setSelected] = useState<'manual' | 'pdf' | null>(null);
  const [hoveredCard, setHoveredCard] = useState<'manual' | 'pdf' | null>(null);

  const handleContinue = useCallback(() => {
    if (!selected) return;
    if (navigator.vibrate) navigator.vibrate(10);
    localStorage.setItem('planSetupChoice', selected);
    localStorage.setItem('hasPlanSetup', 'true');

    if (selected === 'manual') {
      navigate('/manual-meal-input');
    } else {
      navigate('/');
      // After navigating, open upload sheet via custom event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openUploadSheet'));
      }, 500);
    }
  }, [selected, navigate]);

  const userName = user?.name?.split(' ')[0] || t('planSetup.user');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-primary-50)] to-white dark:from-[#0f0f0f] dark:to-[#121212] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 pt-12 pb-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3366FF] to-[#12CFA6] flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <span className="text-[11px] text-[#3366FF] dark:text-blue-400 tracking-wider" style={{ fontWeight: 600 }}>
            SIXTH-HALT
          </span>
        </div>

        <h1 className="text-gray-900 dark:text-white mb-1" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {t('planSetup.greeting').replace('{name}', userName)}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {t('planSetup.subtitle')}
        </p>
      </motion.div>

      {/* Option Cards */}
      <div className="flex-1 px-6 space-y-4 pb-6">
        {/* PDF Upload Option */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          onClick={() => { setSelected('pdf'); if (navigator.vibrate) navigator.vibrate(10); }}
          onMouseEnter={() => setHoveredCard('pdf')}
          onMouseLeave={() => setHoveredCard(null)}
          className={`w-full text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
            selected === 'pdf'
              ? 'border-[#3366FF] bg-blue-50/50 dark:bg-blue-950/30 shadow-lg'
              : 'border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] hover:border-blue-300 dark:hover:border-blue-800'
          }`}
        >
          {/* Card Image */}
          <div className="relative h-36 overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1693045181676-57199422ee66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxudXRyaXRpb24lMjBwbGFuJTIwZG9jdW1lbnQlMjBwYXBlcnxlbnwxfHx8fDE3NzE4ODMwOTN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="PDF Upload"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-4 flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3366FF] to-[#12CFA6] flex items-center justify-center shadow-lg">
                <FileUp className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span className="text-white text-sm block" style={{ fontWeight: 600 }}>{t('planSetup.pdfTitle')}</span>
                <span className="text-white/70 text-[10px]">{t('planSetup.pdfBadge')}</span>
              </div>
            </div>
            {selected === 'pdf' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#3366FF] flex items-center justify-center shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </div>

          {/* Card Content */}
          <div className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
              {t('planSetup.pdfDesc')}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Brain, label: t('planSetup.aiParse') },
                { icon: Sparkles, label: t('planSetup.auto30days') },
                { icon: Shield, label: t('planSetup.validated') },
              ].map((feat, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-[10px] text-blue-600 dark:text-blue-400" style={{ fontWeight: 500 }}>
                  <feat.icon className="w-3 h-3" />
                  {feat.label}
                </span>
              ))}
            </div>
          </div>
        </motion.button>

        {/* Manual Input Option */}
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          onClick={() => { setSelected('manual'); if (navigator.vibrate) navigator.vibrate(10); }}
          onMouseEnter={() => setHoveredCard('manual')}
          onMouseLeave={() => setHoveredCard(null)}
          className={`w-full text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
            selected === 'manual'
              ? 'border-[#12CFA6] bg-teal-50/50 dark:bg-teal-950/30 shadow-lg'
              : 'border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] hover:border-teal-300 dark:hover:border-teal-800'
          }`}
        >
          {/* Card Image */}
          <div className="relative h-36 overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1760445529781-a0d640e96e44?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwbWVhbCUyMHByZXBhcmF0aW9uJTIwY29va2luZ3xlbnwxfHx8fDE3NzE4MjI5MTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Manual Input"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-4 flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#12CFA6] to-teal-600 flex items-center justify-center shadow-lg">
                <PenLine className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span className="text-white text-sm block" style={{ fontWeight: 600 }}>{t('planSetup.manualTitle')}</span>
                <span className="text-white/70 text-[10px]">{t('planSetup.manualBadge')}</span>
              </div>
            </div>
            {selected === 'manual' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#12CFA6] flex items-center justify-center shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </div>

          {/* Card Content */}
          <div className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
              {t('planSetup.manualDesc')}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: PenLine, label: t('planSetup.customMeals') },
                { icon: Clock, label: t('planSetup.flexSchedule') },
                { icon: UtensilsCrossed, label: t('planSetup.dailyInput') },
              ].map((feat, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 dark:bg-teal-900/20 text-[10px] text-teal-600 dark:text-teal-400" style={{ fontWeight: 500 }}>
                  <feat.icon className="w-3 h-3" />
                  {feat.label}
                </span>
              ))}
            </div>
          </div>
        </motion.button>
      </div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="px-6 pb-8"
      >
        <button
          onClick={handleContinue}
          disabled={!selected}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 ${
            selected
              ? 'bg-gradient-to-r from-[#3366FF] to-[#12CFA6] text-white shadow-lg hover:shadow-xl active:scale-[0.98]'
              : 'bg-gray-100 dark:bg-[#252525] text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
          style={{ fontWeight: 600 }}
        >
          {t('planSetup.continue')}
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-3">
          {t('planSetup.changeLater')}
        </p>
      </motion.div>
    </div>
  );
}