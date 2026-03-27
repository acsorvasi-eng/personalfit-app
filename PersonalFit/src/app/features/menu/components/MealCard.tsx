/**
 * MealCard v5 — Swipeable meal card with photo + detail overlay
 *
 * Interactions:
 *   - Tap checkmark → toggle consumed
 *   - Swipe left → "Mást eszek" (meal exception)
 *   - Long press → opens MealDetailOverlay (macros, ingredients, recipe/order tabs)
 *
 * Layout: [Photo] [Title + Time + Meal name] [Checkmark]
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, Clock, X, Flame, ChevronLeft, MapPin, ExternalLink } from 'lucide-react';
import { hapticFeedback } from '@/lib/haptics';
import { useLanguage } from '../../../contexts/LanguageContext';
import { translateFoodName } from '../../../utils/foodTranslations';
import { FoodImage } from '../../../components/FoodImage';
import type { MealOption } from '../../../hooks/usePlanData';
import type { StoredUserProfile } from '../../../backend/services/UserProfileService';

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
  const { t, language } = useLanguage();
  const [showDetail, setShowDetail] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const mealName = selectedMeal?.name || '';
  const totalKcal = parseInt(selectedMeal?.calories?.replace(/[^0-9]/g, '') || '0') || 0;

  // Swipe state
  const x = useMotionValue(0);
  const swipeBg = useTransform(x, [-120, -60, 0], ['#ef4444', '#f87171', '#ffffff']);
  const swipeOpacity = useTransform(x, [-100, -40, 0], [1, 0.5, 0]);

  const handlePanEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.x < -80) {
      hapticFeedback('medium');
      onSwapRequest();
    }
  }, [onSwapRequest]);

  // Long press detection
  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      hapticFeedback('medium');
      setShowDetail(true);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // Card variant styles
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
          onDragEnd={handlePanEnd}
          style={{ x }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className={`relative flex items-center gap-3 p-3 rounded-2xl border ${cardBorder} ${cardBg} transition-colors select-none`}
        >
          {/* Food image (left) */}
          <div className="flex-shrink-0">
            <FoodImage
              foodName={mealName || title}
              size="md"
              fallbackEmoji={icon}
            />
          </div>

          {/* Content (center) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
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
              <Clock className="w-3 h-3 text-gray-400" />
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
              <Check className={`w-4 h-4 ${checked ? 'text-white' : isPassed ? 'text-orange-500' : 'text-primary'}`} />
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* Detail overlay (long press) */}
      <AnimatePresence>
        {showDetail && selectedMeal && (
          <MealDetailOverlay
            meal={selectedMeal}
            title={title}
            time={time}
            icon={icon}
            mealType={mealType}
            onClose={() => setShowDetail(false)}
            onRecipeOpen={onRecipeOpen}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Detail overlay (full screen, opened by long press)
// ═══════════════════════════════════════════════════════════════

function MealDetailOverlay({
  meal, title, time, icon, mealType, onClose, onRecipeOpen,
}: {
  meal: MealOption;
  title: string;
  time: string;
  icon: string;
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
  const canShowRecipe = mealType === 'lunch' || mealType === 'dinner';

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-[200] bg-white overflow-y-auto"
      style={{ paddingTop: 'env(safe-area-inset-top, 20px)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onClose} className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-lg text-foreground">{title}</h2>
          <p className="text-sm text-gray-400">{time}</p>
        </div>
      </div>

      {/* Hero image */}
      <div className="px-6 py-4 flex justify-center">
        <FoodImage foodName={meal.name || title} size="lg" fallbackEmoji={icon} className="shadow-xl rounded-2xl" />
      </div>

      {/* Meal name */}
      <div className="px-6">
        <h3 className="text-xl font-bold text-foreground">{meal.name}</h3>
        {meal.description && (
          <p className="text-sm text-gray-500 mt-1 italic">{meal.description}</p>
        )}
      </div>

      {/* Macro cards row */}
      <div className="px-6 mt-4 grid grid-cols-4 gap-2">
        <MacroCard label={t('menu.kcalLabel') || 'Kalória'} value={`${totalKcal}`} unit="kcal" emoji="🔥" primary />
        <MacroCard label={t('menu.proteinLabel') || 'Fehérje'} value={`${mealProtein}`} unit="g" emoji="🍖" />
        <MacroCard label={t('menu.carbsLabel') || 'Szénhidrát'} value={`${mealCarbs}`} unit="g" emoji="🌾" />
        <MacroCard label={t('menu.fatLabel') || 'Zsír'} value={`${mealFat}`} unit="g" emoji="🫒" />
      </div>

      {/* Ingredients */}
      {details && details.length > 0 && (
        <div className="px-6 mt-5">
          <h4 className="font-semibold text-base text-foreground mb-3">{t('menu.ingredients') || 'Összetevők'}</h4>
          <div className="space-y-2">
            {details.map((ing, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FoodImage foodName={ing.name} size="sm" fallbackEmoji="🥄" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{translateFoodName(ing.name, language)}</p>
                    {ing.quantity && <p className="text-sm text-gray-400">{ing.quantity}</p>}
                  </div>
                </div>
                <span className="text-sm font-bold text-primary flex-shrink-0">{Math.round(ing.calories)} kcal</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback: ingredient list (no structured details) */}
      {(!details || details.length === 0) && meal.ingredients && meal.ingredients.length > 0 && (
        <div className="px-6 mt-5">
          <h4 className="font-semibold text-base text-foreground mb-3">{t('menu.ingredients') || 'Összetevők'}</h4>
          <div className="space-y-2">
            {meal.ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <FoodImage foodName={ing} size="sm" fallbackEmoji="🥄" />
                <p className="text-sm font-medium text-gray-800">{translateFoodName(ing, language)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-6 mt-6 flex gap-3">
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
        {!canShowRecipe && (
          <button
            onClick={onClose}
            className="flex-1 h-14 bg-gray-100 text-gray-700 font-bold rounded-2xl flex items-center justify-center text-base"
          >
            {t('common.close') || 'Bezárás'}
          </button>
        )}
      </div>

      {/* Bottom safe area */}
      <div className="h-[max(2rem,env(safe-area-inset-bottom))]" />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Macro card component
// ═══════════════════════════════════════════════════════════════

function MacroCard({ label, value, unit, emoji, primary }: {
  label: string;
  value: string;
  unit: string;
  emoji: string;
  primary?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 text-center ${primary ? 'bg-primary/10 border border-primary/20' : 'bg-gray-50 border border-gray-100'}`}>
      <span className="text-lg">{emoji}</span>
      <p className={`text-lg font-bold mt-1 ${primary ? 'text-primary' : 'text-foreground'}`}>
        {value}<span className="text-sm font-normal text-gray-400 ml-0.5">{unit}</span>
      </p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
