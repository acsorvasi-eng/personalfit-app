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
import { setSetting } from '../../backend/services/SettingsService';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { DSMButton } from '../dsm';

export function PlanSetupScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, setHasPlanSetup } = useAuth();
  const [selected, setSelected] = useState<'manual' | 'pdf' | null>(null);
  const [hoveredCard, setHoveredCard] = useState<'manual' | 'pdf' | null>(null);

  const handleContinue = useCallback(() => {
    if (!selected) return;
    if (navigator.vibrate) navigator.vibrate(10);
    setSetting('planSetupChoice', selected).catch(() => {});
    setHasPlanSetup(true);

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 pt-12 pb-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <span className="text-[11px] text-primary tracking-wider" style={{ fontWeight: 600 }}>
            SIXTH-HALT
          </span>
        </div>

        <h1 className="text-foreground mb-1" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {t('planSetup.greeting').replace('{name}', userName)}
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
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
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border bg-background hover:border-primary/50'
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
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                <FileUp className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span className="text-white text-sm block" style={{ fontWeight: 600 }}>{t('planSetup.pdfTitle')}</span>
                <span className="text-white/70 text-2xs">{t('planSetup.pdfBadge')}</span>
              </div>
            </div>
            {selected === 'pdf' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </div>

          {/* Card Content */}
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              {t('planSetup.pdfDesc')}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Brain, label: t('planSetup.aiParse') },
                { icon: Sparkles, label: t('planSetup.auto30days') },
                { icon: Shield, label: t('planSetup.validated') },
              ].map((feat, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/5 text-2xs text-primary" style={{ fontWeight: 500 }}>
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
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border bg-background hover:border-primary/50'
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
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                <PenLine className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span className="text-white text-sm block" style={{ fontWeight: 600 }}>{t('planSetup.manualTitle')}</span>
                <span className="text-white/70 text-2xs">{t('planSetup.manualBadge')}</span>
              </div>
            </div>
            {selected === 'manual' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </div>

          {/* Card Content */}
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              {t('planSetup.manualDesc')}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: PenLine, label: t('planSetup.customMeals') },
                { icon: Clock, label: t('planSetup.flexSchedule') },
                { icon: UtensilsCrossed, label: t('planSetup.dailyInput') },
              ].map((feat, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/5 text-2xs text-primary" style={{ fontWeight: 500 }}>
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
        <DSMButton
          onClick={handleContinue}
          disabled={!selected}
          variant="primary"
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
        >
          {t('planSetup.continue')}
          <ArrowRight className="w-4 h-4" />
        </DSMButton>

        <p className="text-center text-2xs text-gray-400 mt-3">
          {t('planSetup.changeLater')}
        </p>
      </motion.div>
    </div>
  );
}