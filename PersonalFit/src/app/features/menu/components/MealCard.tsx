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
  const [showRecipeSheet, setShowRecipeSheet] = useState(false);
  const [recipeSheetTab, setRecipeSheetTab] = useState<'home' | 'restaurant'>('home');
  const totalKcal = parseInt(meal.calories?.replace(/[^0-9]/g, '') || '0') || 0;
  const details = meal.ingredientDetails as Array<{ name: string; quantity: string; calories: number; protein: number; carbs: number; fat: number }> | undefined;
  const mealProtein = meal.totalProtein ?? Math.round((totalKcal * 0.30) / 4);
  const mealCarbs = meal.totalCarbs ?? Math.round((totalKcal * 0.40) / 4);
  const mealFat = meal.totalFat ?? Math.round((totalKcal * 0.30) / 9);
  const canShowRecipe = mealType === 'lunch' || mealType === 'dinner' || mealType === 'breakfast';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-white overflow-y-auto"
      style={{ zIndex: 9999, paddingTop: 'env(safe-area-inset-top, 20px)' }}
    >
      {/* Header with X close button */}
      <div className="flex items-center justify-between px-5 py-3">
        <h2 className="font-bold text-lg text-foreground">{title} · {time}</h2>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Hero image */}
      <div className="px-5 pb-3">
        <div className="rounded-2xl overflow-hidden shadow-lg" style={{ height: 200 }}>
          <FoodImage foodName={meal.name || title} size="lg" fallbackEmoji="🍽️" className="w-full h-full" />
        </div>
      </div>

      {/* Meal name */}
      <div className="px-5 mt-1">
        <h3 className="text-xl font-bold text-foreground">{meal.name}</h3>
      </div>

      {/* Macro cards */}
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
          <h4 className="font-semibold text-base text-foreground mb-3">{t('menu.ingredients')}</h4>
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

      {/* Fallback ingredient list */}
      {(!details || details.length === 0) && meal.ingredients && meal.ingredients.length > 0 && (
        <div className="px-5 mt-5">
          <h4 className="font-semibold text-base text-foreground mb-3">{t('menu.ingredients')}</h4>
          <div className="space-y-2">
            {meal.ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[15px] font-medium text-gray-800">{translateFoodName(ing, language)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {canShowRecipe && (
        <div className="px-5 mt-5 flex gap-3 pb-6">
          <button
            onClick={() => { setRecipeSheetTab('home'); setShowRecipeSheet(true); }}
            className="flex-1 h-14 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-base active:bg-primary/90 transition-colors"
          >
            🍳 {t('menu.recipeBtn')}
          </button>
          <button
            onClick={() => { setRecipeSheetTab('restaurant'); setShowRecipeSheet(true); }}
            className="flex-1 h-14 bg-primary/10 text-primary font-bold rounded-2xl flex items-center justify-center gap-2 text-base border border-primary/20 active:bg-primary/20 transition-colors"
          >
            🛵 {t('menu.orderBtn')}
          </button>
        </div>
      )}

      <div className="h-[max(1rem,env(safe-area-inset-bottom))]" />

      {/* Recipe bottom sheet — slides up OVER the detail page */}
      <AnimatePresence>
        {showRecipeSheet && (
          <RecipeBottomSheet
            onClose={() => setShowRecipeSheet(false)}
            onFullOpen={() => {
              setShowRecipeSheet(false);
              onRecipeOpen(recipeSheetTab);
            }}
            tab={recipeSheetTab}
            mealName={meal.name}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Recipe bottom sheet (slides up over detail page, drag to dismiss)
// ═══════════════════════════════════════════════════════════════

function RecipeBottomSheet({ onClose, onFullOpen, tab, mealName }: {
  onClose: () => void;
  onFullOpen: () => void;
  tab: 'home' | 'restaurant';
  mealName: string;
}) {
  const { t } = useLanguage();
  const sheetY = useMotionValue(0);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 400) {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black"
        style={{ zIndex: 10000 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ y: sheetY, zIndex: 10001 }}
        className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl"
      >
        <div className="max-h-[75vh] overflow-y-auto">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-white rounded-t-3xl z-10">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          <div className="px-5 pb-3">
            <h3 className="font-bold text-lg text-foreground">
              {tab === 'home' ? `🍳 ${t('menu.recipeBtn')}` : `🛵 ${t('menu.orderBtn')}`}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{mealName}</p>
          </div>

          {/* Placeholder — this will open the full RecipeOverlay */}
          <div className="px-5 pb-6">
            <button
              onClick={onFullOpen}
              className="w-full h-14 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-base active:bg-primary/90 transition-colors"
            >
              {tab === 'home'
                ? `🍳 ${t('recipe.showFullRecipe') || 'Teljes recept megnyitása'}`
                : `🛵 ${t('recipe.showRestaurants') || 'Éttermek és napi menük'}`
              }
            </button>
          </div>

          <div className="h-[max(1rem,env(safe-area-inset-bottom))]" />
        </div>
      </motion.div>
    </>
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
