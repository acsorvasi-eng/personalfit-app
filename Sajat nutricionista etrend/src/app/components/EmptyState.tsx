/**
 * ====================================================================
 * EmptyState — Universal Empty State Component
 * ====================================================================
 * Shown across all tabs when no data has been uploaded yet.
 * Points user to Profile → Settings → "Tervem feltöltése".
 *
 * Variants:
 *   - foods: Empty food catalog
 *   - menu: Empty daily menu
 *   - shopping: Empty shopping list
 *   - workout: Empty workout/sports
 *   - measurements: Empty measurements
 *   - generic: General empty state
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Upload, Apple, UtensilsCrossed, ShoppingCart,
  Dumbbell, Ruler, FileUp, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { DSMButton } from './dsm';
import { useLanguage } from '../contexts/LanguageContext';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type EmptyStateVariant = 'foods' | 'menu' | 'shopping' | 'workout' | 'measurements' | 'generic';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onUpload?: () => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// VARIANT CONFIG (only icons and colors — text comes from translations)
// ═══════════════════════════════════════════════════════════════

const VARIANT_STYLE: Record<EmptyStateVariant, {
  icon: React.ElementType;
  iconBg: string;
}> = {
  foods: { icon: Apple, iconBg: 'from-blue-400 to-teal-500' },
  menu: { icon: UtensilsCrossed, iconBg: 'from-emerald-400 to-teal-500' },
  shopping: { icon: ShoppingCart, iconBg: 'from-blue-400 to-indigo-500' },
  workout: { icon: Dumbbell, iconBg: 'from-orange-400 to-red-500' },
  measurements: { icon: Ruler, iconBg: 'from-purple-400 to-pink-500' },
  generic: { icon: FileUp, iconBg: 'from-gray-400 to-gray-500' },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function EmptyState({ variant, onUpload, className = '' }: EmptyStateProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const style = VARIANT_STYLE[variant];

  const handleUpload = () => {
    if (onUpload) {
      onUpload();
    } else {
      navigate('/profile');
    }
  };

  // Get translated text for this variant
  const title = t(`empty.${variant}.title`);
  const desc = t(`empty.${variant}.desc`);
  const features = [
    t(`empty.${variant}.f1`),
    t(`empty.${variant}.f2`),
    t(`empty.${variant}.f3`),
  ].filter(f => f && !f.startsWith('empty.'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center text-center px-6 py-8 ${className}`}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, delay: 0.1 }}
        className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${style.iconBg} flex items-center justify-center shadow-lg mb-5`}
      >
        <style.icon className="w-10 h-10 text-white" />
      </motion.div>

      {/* Title */}
      <h3 className="text-gray-900 dark:text-gray-100 mb-2" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-5">
        {desc}
      </p>

      {/* Features list */}
      {features.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {features.map((feature, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 dark:bg-[#252525] rounded-lg text-[11px] text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-[#2a2a2a]"
              style={{ fontWeight: 500 }}
            >
              <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" />
              {feature}
            </motion.span>
          ))}
        </div>
      )}

      {/* Upload CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-xs"
      >
        <DSMButton
          variant="gradient"
          size="lg"
          fullWidth
          icon={Upload}
          onClick={handleUpload}
        >
          {t('empty.uploadBtn')}
        </DSMButton>

        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2.5">
          {t('empty.uploadHint')}
        </p>
      </motion.div>

      {/* Decorative dots */}
      <div className="flex items-center gap-1.5 mt-6">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            className="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500"
          />
        ))}
      </div>
    </motion.div>
  );
}