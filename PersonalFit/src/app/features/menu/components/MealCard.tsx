/**
 * MealCard v5.1 — Swipeable meal card with photo + detail page
 *
 * Fixes from v5.0:
 *   - FoodImage uses meal name (not title) for better Unsplash results
 *   - Meal type icons: 🌅 Reggeli, 🍽️ Ebéd, 🌙 Vacsora with colored backgrounds
 *   - Detail overlay: z-[999] portal-level, full body lock, proper safe-area
 *   - Long press timer cleared on drag to prevent false triggers
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, Clock, X, ChevronLeft } from 'lucide-react';
import { createPortal } from 'react-dom';
import { hapticFeedback } from '@/lib/haptics';
import { useLanguage } from '../../../contexts/LanguageContext';
import { translateFoodName } from '../../../utils/foodTranslations';
import { FoodImage } from '../../../components/FoodImage';
import type { MealOption } from '../../../hooks/usePlanData';
import type { StoredUserProfile } from '../../../backend/services/UserProfileService';

// ═══════════════════════════════════════════════════════════════
// Meal type visual config
// ═══════════════════════════════════════════════════════════════

const MEAL_VISUALS: Record<string, { emoji: string; bg: string; label: string }> = {
  breakfast: { emoji: '🌅', bg: 'bg-amber-50',  label: 'Reggeli' },
  lunch:     { emoji: '🍽️', bg: 'bg-primary/10', label: 'Ebéd' },
  dinner:    { emoji: '🌙', bg: 'bg-indigo-50',  label: 'Vacsora' },
  snack:     { emoji: '🍎', bg: 'bg-green-50',   label: 'Snack' },
};

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface MealCardProps {
  title: string;
  time: string;
  icon: string;
  selectedMeal: MealOption | null;
  mealType: string;
  checked: boolean;
  onCheck: () => void;
  isFocus: boolean;
  isPassed: boolean;
  isToday: boolean;
  onSwapRequest: () => void;
  onRecipeOpen: (tab: 'home' | 'restaurant') => void;
  userProfile: StoredUserProfile | null;
}

// ═══════════════════════════════════════════════════════════════
// Main card
// ═══════════════════════════════════════════════════════════════

export function MealCard({
  title, time, icon, selectedMeal, mealType,
  checked, onCheck, isFocus, isPassed, isToday,
  onSwapRequest, onRecipeOpen,
}: MealCardProps) {
  const { t } = useLanguage();
  const [showDetail, setShowDetail] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);

  const mealName = selectedMeal?.name || '';
  const totalKcal = parseInt(selectedMeal?.calories?.replace(/[^0-9]/g, '') || '0') || 0;
  const vis = MEAL_VISUALS[mealType] || MEAL_VISUALS.lunch;

  // Swipe state
  const x = useMotionValue(0);
  const swipeBg = useTransform(x, [-120, -60, 0], ['#ef4444', '#f87171', '#ffffff']);
  const swipeOpacity = useTransform(x, [-100, -40, 0], [1, 0.5, 0]);

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  const handlePanEnd = useCallback((_: any, info: PanInfo) => {
    isDragging.current = false;
    if (info.offset.x < -80) {
      hapticFeedback('medium');
      onSwapRequest();
    }
  }, [onSwapRequest]);

  // Long press detection (cancelled if drag starts)
  const handlePointerDown = useCallback(() => {
    isDragging.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!isDragging.current) {
        hapticFeedback('medium');
        setShowDetail(true);
      }
    }, 500);
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  // Lock body scroll when detail is open
  useEffect(() => {
    if (showDetail) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showDetail]);

  // Card styles
  const cardBorder = isFocus ? 'border-primary/40' : checked ? 'border-green-200' : 'border-gray-100';
  const cardBg = isFocus ? 'bg-primary/5' : checked ? 'bg-green-50/50' : 'bg-white';

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl">
        {/* Swipe-behind layer */}
        <motion.div
          className="absolute inset-0 flex items-center justify-end pr-6 rounded-2xl"
          style={{ backgroundColor: swipeBg }}
        >
          <motion.div style={{ opacity: swipeOpacity }} className="flex items-center gap-2 text-white font-semibold text-sm">
            <X className="w-5 h-5" />
            {t('menu.swapMeal') || 'Mást eszek'}
          </motion.div>
        </motion.div>

        {/* Swipeable card */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragStart={handleDragStart}
          onDragEnd={handlePanEnd}
          style={{ x }}
          onPointerDown={handlePointerDown}
          onPointerUp={clearLongPress}
          onPointerCancel={clearLongPress}
          className={`relative flex items-center gap-3 p-3 rounded-2xl border ${cardBorder} ${cardBg} transition-colors select-none touch-pan-y`}
        >
          {/* Food image (left) */}
          <div className="flex-shrink-0">
            <FoodImage
              foodName={mealName || title}
              size="md"
              fallbackEmoji={vis.emoji}
            />
          </div>

          {/* Content (center) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base">{vis.emoji}</span>
              <span className={`font-bold text-[15px] ${checked ? 'text-green-700 line-through' : isFocus ? 'text-primary' : 'text-foreground'}`}>
                {title}
              </span>
              {totalKcal > 0 && (
                <span className="text-sm font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                  {totalKcal} kcal
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm text-gray-400">{time}</span>
            </div>
            {mealName && (
              <p className="text-sm text-gray-600 truncate mt-0.5">{mealName}</p>
            )}
          </div>

          {/* Checkmark (right) */}
          {isToday && (
            <motion.button
              onClick={(e) => { e.stopPropagation(); onCheck(); hapticFeedback('light'); }}
              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                checked
                  ? 'bg-green-500'
                  : isPassed
                  ? 'bg-orange-100 border border-orange-300'
                  : 'bg-primary/10 border border-primary/30'
              }`}
              whileTap={{ scale: 0.88 }}
            >
              <Check className={`w-5 h-5 ${checked ? 'text-white' : isPassed ? 'text-orange-500' : 'text-primary'}`} />
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* Detail overlay via portal (ensures it's above everything) */}
      {showDetail && selectedMeal && createPortal(
        <AnimatePresence>
          <MealDetailOverlay
            meal={selectedMeal}
            title={title}
            time={time}
            mealType={mealType}
            onClose={() => setShowDetail(false)}
            onRecipeOpen={onRecipeOpen}
          />
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Detail overlay (full screen via portal, z-[999])
// ═══════════════════════════════════════════════════════════════

function MealDetailOverlay({
  meal, title, time, mealType, onClose, onRecipeOpen,
}: {
  meal: MealOption;
  title: string;
  time: string;
  mealType: string;
  onClose: () => void;
  onRecipeOpen: (tab: 'home' | 'restaurant') => void;
}) {
  const { t, language } = useLanguage();
  const totalKcal = parseInt(meal.calories?.replace(/[^0-9]/g, '') || '0') || 0;
  const details = meal.ingredientDetails as Array<{ name: string; quantity: string; calories: number; protein: number; carbs: number; fat: number }> | undefined;
  const mealProtein = meal.totalProtein ?? Math.round((totalKcal * 0.30) / 4);
  const mealCarbs = meal.totalCarbs ?? Math.round((totalKcal * 0.40) / 4);
  const mealFat = meal.totalFat ?? Math.round((totalKcal * 0.30) / 9);
  const canShowRecipe = mealType === 'lunch' || mealType === 'dinner' || mealType === 'breakfast';
  const vis = MEAL_VISUALS[mealType] || MEAL_VISUALS.lunch;

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 bg-white overflow-y-auto"
      style={{ zIndex: 9999, paddingTop: 'env(safe-area-inset-top, 20px)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3">
        <button onClick={onClose} className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-lg text-foreground">{title}</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-400">{time}</span>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-xl ${vis.bg} flex items-center justify-center text-xl`}>
          {vis.emoji}
        </div>
      </div>

      {/* Hero image — large */}
      <div className="px-5 py-3">
        <div className="rounded-2xl overflow-hidden shadow-lg" style={{ height: 200 }}>
          <FoodImage foodName={meal.name || title} size="lg" fallbackEmoji={vis.emoji} className="w-full h-full" />
        </div>
      </div>

      {/* Meal name */}
      <div className="px-5 mt-2">
        <h3 className="text-xl font-bold text-foreground">{meal.name}</h3>
      </div>

      {/* Macro cards row — kalória first (biggest) */}
      <div className="px-5 mt-4">
        <div className="grid grid-cols-4 gap-2">
          <MacroCard value={`${totalKcal}`} unit="kcal" emoji="🔥" primary />
          <MacroCard value={`${mealProtein}`} unit="g" emoji="🍖" />
          <MacroCard value={`${mealCarbs}`} unit="g" emoji="🌾" />
          <MacroCard value={`${mealFat}`} unit="g" emoji="🫒" />
        </div>
      </div>

      {/* Ingredients */}
      {details && details.length > 0 && (
        <div className="px-5 mt-5">
          <h4 className="font-semibold text-base text-foreground mb-3">{t('menu.ingredients') || 'Összetevők'}</h4>
          <div className="space-y-2">
            {details.map((ing, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-gray-800">{translateFoodName(ing.name, language)}</p>
                  {ing.quantity && <p className="text-sm text-gray-400">{ing.quantity}</p>}
                </div>
                <span className="text-sm font-bold text-primary flex-shrink-0 ml-2">{Math.round(ing.calories)} kcal</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback: plain ingredient list */}
      {(!details || details.length === 0) && meal.ingredients && meal.ingredients.length > 0 && (
        <div className="px-5 mt-5">
          <h4 className="font-semibold text-base text-foreground mb-3">{t('menu.ingredients') || 'Összetevők'}</h4>
          <div className="space-y-2">
            {meal.ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[15px] font-medium text-gray-800">{translateFoodName(ing, language)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons — fixed at bottom */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 0.75rem)' }}>
        <div className="flex gap-3">
          {canShowRecipe && (
            <>
              <button
                onClick={() => { onClose(); setTimeout(() => onRecipeOpen('home'), 200); }}
                className="flex-1 h-14 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-base active:bg-primary/90 transition-colors"
              >
                🍳 {t('menu.recipeBtn') || 'Recept'}
              </button>
              <button
                onClick={() => { onClose(); setTimeout(() => onRecipeOpen('restaurant'), 200); }}
                className="flex-1 h-14 bg-primary/10 text-primary font-bold rounded-2xl flex items-center justify-center gap-2 text-base border border-primary/20 active:bg-primary/20 transition-colors"
              >
                🛵 {t('menu.orderBtn') || 'Rendelés'}
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Macro card
// ═══════════════════════════════════════════════════════════════

function MacroCard({ value, unit, emoji, primary }: {
  value: string; unit: string; emoji: string; primary?: boolean;
}) {
  return (
    <div className={`rounded-xl p-2.5 text-center ${primary ? 'bg-primary/10 border border-primary/20' : 'bg-gray-50 border border-gray-100'}`}>
      <span className="text-base">{emoji}</span>
      <p className={`text-base font-bold mt-0.5 ${primary ? 'text-primary' : 'text-foreground'}`}>
        {value}<span className="text-sm font-normal text-gray-400 ml-0.5">{unit}</span>
      </p>
    </div>
  );
}
