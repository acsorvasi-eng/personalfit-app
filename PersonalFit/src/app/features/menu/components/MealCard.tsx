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
import { Check, Clock, X, Flame, Beef, Wheat, Apple } from 'lucide-react';
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
              mealType={mealType}
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
              <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{mealName}</p>
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
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const totalKcal = parseInt(meal.calories?.replace(/[^0-9]/g, '') || '0') || 0;
  const details = meal.ingredientDetails as Array<{ name: string; quantity: string; calories: number; protein: number; carbs: number; fat: number }> | undefined;
  const mealProtein = Math.round((meal.totalProtein ?? (totalKcal * 0.30) / 4) * 10) / 10;
  const mealCarbs = Math.round((meal.totalCarbs ?? (totalKcal * 0.40) / 4) * 10) / 10;
  const mealFat = Math.round((meal.totalFat ?? (totalKcal * 0.30) / 9) * 10) / 10;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-white"
      style={{ zIndex: 9999 }}
    >
      {/* Close Button — Fixed Position (matches design zip exactly) */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-50 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
        style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
        aria-label="Bezárás"
      >
        <X className="w-5 h-5 text-gray-700" />
      </button>

      {/* Scrollable content — pb-24 for bottom buttons */}
      <div className="h-full overflow-y-auto pb-24">
        {/* Full Width Image — No rounded corners */}
        <div className="w-full">
          <div className="[&_div]:!rounded-none [&_img]:!rounded-none" style={{ height: 256 }}>
            <FoodImage foodName={meal.name || title} size="lg" fallbackEmoji="🍽️" className="w-full h-full" mealType={mealType} />
          </div>
        </div>

        {/* Meal Type Label Below Image */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-sm text-gray-500">{title} · {time}</p>
        </div>

        {/* Dish Name */}
        <div className="px-4 pb-4">
          <h1 className="text-xl text-gray-900" style={{ fontWeight: 600 }}>
            {translateFoodName(meal.name, language)}
          </h1>
        </div>

        {/* Nutrition Info — Clean Grid (matches design zip) */}
        <div className="px-4 pb-6">
          <div className="grid grid-cols-4 gap-3">
            {/* Calories */}
            <div className="flex flex-col items-center p-3 bg-gray-50 rounded-xl">
              <Flame className="w-5 h-5 text-orange-500 mb-1" />
              <p className="text-lg text-gray-900" style={{ fontWeight: 600 }}>{totalKcal}</p>
              <p className="text-xs text-gray-500">kcal</p>
            </div>
            {/* Protein */}
            <div className="flex flex-col items-center p-3 bg-gray-50 rounded-xl">
              <Beef className="w-5 h-5 text-red-500 mb-1" />
              <p className="text-lg text-gray-900" style={{ fontWeight: 600 }}>{typeof mealProtein === 'number' && mealProtein % 1 !== 0 ? mealProtein.toFixed(1) : mealProtein}g</p>
              <p className="text-xs text-gray-500">Fehérje</p>
            </div>
            {/* Carbs */}
            <div className="flex flex-col items-center p-3 bg-gray-50 rounded-xl">
              <Wheat className="w-5 h-5 text-amber-600 mb-1" />
              <p className="text-lg text-gray-900" style={{ fontWeight: 600 }}>{mealCarbs}g</p>
              <p className="text-xs text-gray-500">Szénhidrát</p>
            </div>
            {/* Fiber / Fat */}
            <div className="flex flex-col items-center p-3 bg-gray-50 rounded-xl">
              <Apple className="w-5 h-5 text-green-600 mb-1" />
              <p className="text-lg text-gray-900" style={{ fontWeight: 600 }}>{mealFat}g</p>
              <p className="text-xs text-gray-500">Rost</p>
            </div>
          </div>
        </div>

        {/* Ingredients Section */}
        <div className="px-4">
          <h2 className="text-lg text-gray-900 mb-3" style={{ fontWeight: 600 }}>
            {t('foods.ingredients') || 'Összetevők'}
          </h2>

          {details && details.length > 0 && (
            <div className="space-y-2">
              {details.map((ing, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <p className="text-base text-gray-900">{translateFoodName(ing.name, language)}</p>
                    {ing.quantity && <p className="text-sm text-gray-500">{ing.quantity}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-base text-emerald-600" style={{ fontWeight: 500 }}>{Math.round(ing.calories)} kcal</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(!details || details.length === 0) && meal.ingredients && meal.ingredients.length > 0 && (
            <div className="space-y-2">
              {meal.ingredients.map((ing, idx) => (
                <div key={idx} className="py-3 border-b border-gray-100 last:border-0">
                  <p className="text-base text-gray-900">{translateFoodName(ing, language)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Buttons (matches design zip exactly) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-3">
          <button
            onClick={() => setIsRecipeOpen(true)}
            className="flex-1 bg-emerald-600 text-white py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
            style={{ fontWeight: 500 }}
          >
            <span className="text-lg">👨‍🍳</span>
            <span>{t('menu.recipeBtn') || 'Recept'}</span>
          </button>
          <button
            onClick={() => setIsOrderOpen(true)}
            className="flex-1 bg-gray-100 text-gray-900 py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{ fontWeight: 500 }}
          >
            <span className="text-lg">🍽️</span>
            <span>{t('menu.orderBtn') || 'Megrendelés'}</span>
          </button>
        </div>
      </div>

      {/* Recipe Drawer */}
      {isRecipeOpen && createPortal(
        <RecipeDrawerInline
          isOpen={isRecipeOpen}
          onClose={() => setIsRecipeOpen(false)}
          meal={meal}
          onFullRecipe={() => {
            setIsRecipeOpen(false);
            onClose();
            setTimeout(() => onRecipeOpen('home'), 150);
          }}
        />,
        document.body
      )}

      {/* Order Drawer */}
      {isOrderOpen && createPortal(
        <OrderDrawerInline
          isOpen={isOrderOpen}
          onClose={() => setIsOrderOpen(false)}
          meal={meal}
        />,
        document.body
      )}
    </motion.div>
  );
}


// ═══════════════════════════════════════════════════════════════
// Recipe Drawer — 3 tabs: Recept / Elkészítés / Videó
// ═══════════════════════════════════════════════════════════════

function RecipeDrawerInline({ isOpen, onClose, meal, onFullRecipe }: {
  isOpen: boolean;
  onClose: () => void;
  meal: MealOption;
  onFullRecipe: () => void;
}) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps' | 'video'>('ingredients');
  const details = meal.ingredientDetails as Array<{ name: string; quantity: string; calories: number }> | undefined;

  // Mock steps — in production these come from ChefAgentService
  const placeholderSteps = [
    t('recipe.step1Placeholder') || 'Az összetevőket előkészítjük, megmossuk és felszeleteljük.',
    t('recipe.step2Placeholder') || 'A húst fűszerezzük sóval, borssal és fokhagymával.',
    t('recipe.step3Placeholder') || 'Előmelegített sütőben vagy serpenyőben elkészítjük.',
    t('recipe.step4Placeholder') || 'A köreteket párhuzamosan készítjük el.',
    t('recipe.step5Placeholder') || 'Tányérra rendezzük és melegen tálaljuk.',
  ];

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black"
        style={{ zIndex: 19999 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-white flex flex-col rounded-t-[24px]"
        style={{ zIndex: 20000, maxHeight: '90vh' }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-4">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-gray-900" style={{ fontWeight: 600 }}>
              {translateFoodName(meal.name, language)}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              aria-label="Bezárás"
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {([
              { key: 'ingredients' as const, icon: '🍳', label: t('recipe.tabRecipe') || 'Recept' },
              { key: 'steps' as const, icon: '📋', label: t('recipe.tabSteps') || 'Elkészítés' },
              { key: 'video' as const, icon: '🎬', label: t('recipe.tabVideo') || 'Videó' },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
                style={{ fontWeight: 500 }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content — Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Ingredients Tab */}
          {activeTab === 'ingredients' && (
            <div className="space-y-3">
              <h3 className="text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
                {t('foods.ingredients') || 'Összetevők'}
              </h3>
              {details && details.length > 0 ? details.map((ing, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <p className="text-base text-gray-900" style={{ fontWeight: 500 }}>{translateFoodName(ing.name, language)}</p>
                    <p className="text-sm text-gray-500">{ing.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base text-emerald-600" style={{ fontWeight: 600 }}>
                      {Math.round(ing.calories)} kcal
                    </p>
                  </div>
                </div>
              )) : meal.ingredients?.map((ing, i) => (
                <div key={i} className="py-3 px-4 bg-gray-50 rounded-xl">
                  <p className="text-base text-gray-900" style={{ fontWeight: 500 }}>{translateFoodName(ing, language)}</p>
                </div>
              ))}

              {/* Open full recipe button */}
              <button
                onClick={onFullRecipe}
                className="w-full mt-4 bg-emerald-600 text-white py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                style={{ fontWeight: 500 }}
              >
                🍳 {t('recipe.showFullRecipe') || 'Teljes recept megnyitása'}
              </button>
            </div>
          )}

          {/* Steps Tab */}
          {activeTab === 'steps' && (
            <div className="space-y-4">
              <h3 className="text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
                {t('recipe.preparation') || 'Elkészítés lépései'}
              </h3>
              {placeholderSteps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm" style={{ fontWeight: 600 }}>
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-base text-gray-800 leading-relaxed">{step}</p>
                  </div>
                </div>
              ))}

              {/* Open full recipe for real AI-generated steps */}
              <button
                onClick={onFullRecipe}
                className="w-full mt-2 bg-emerald-600 text-white py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                style={{ fontWeight: 500 }}
              >
                🍳 {t('recipe.showFullRecipe') || 'AI recept generálása'}
              </button>
            </div>
          )}

          {/* Video Tab */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              <h3 className="text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
                {t('recipe.videoRecipe') || 'Videó recept'}
              </h3>
              <div className="relative aspect-video rounded-xl overflow-hidden cursor-pointer bg-gray-900">
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  title="Recept videó"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                    <span className="text-2xl text-emerald-600">🎬</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 text-center">
                {t('recipe.videoHint') || 'Kattints a videóra a teljes képernyős lejátszáshoz'}
              </p>
            </div>
          )}
        </div>

        {/* Safe area bottom */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </motion.div>
    </>
  );
}


// ═══════════════════════════════════════════════════════════════
// Order Drawer — Restaurant cards with delivery providers
// ═══════════════════════════════════════════════════════════════

function OrderDrawerInline({ isOpen, onClose, meal }: {
  isOpen: boolean;
  onClose: () => void;
  meal: MealOption;
}) {
  const { t, language } = useLanguage();
  const [selectedProvider, setSelectedProvider] = useState<'all' | 'glovo' | 'wolt' | 'bolt'>('all');
  const totalKcal = parseInt(meal.calories?.replace(/[^0-9]/g, '') || '0') || 0;

  const restaurants = [
    { id: '1', name: 'Rustic Kitchen', address: 'Calea Victoriei 45', distance: '1.2 km', deliveryTime: '25-35 perc', rating: 4.7, reviewCount: 324, provider: 'glovo' as const, price: 45, kcal: Math.round(totalKcal * 0.99), match: 99 },
    { id: '2', name: 'Bistro Romana', address: 'Strada Lipscani 12', distance: '2.3 km', deliveryTime: '30-40 perc', rating: 4.5, reviewCount: 189, provider: 'wolt' as const, price: 52, kcal: Math.round(totalKcal * 0.98), match: 98 },
    { id: '3', name: 'Traditional Flavors', address: 'Bulevardul Unirii 78', distance: '3.1 km', deliveryTime: '35-45 perc', rating: 4.8, reviewCount: 456, provider: 'glovo' as const, price: 48, kcal: Math.round(totalKcal * 0.98), match: 98 },
    { id: '4', name: 'Casa Bucatarului', address: 'Strada Dorobanți 23', distance: '1.8 km', deliveryTime: '20-30 perc', rating: 4.6, reviewCount: 267, provider: 'bolt' as const, price: 42, kcal: Math.round(totalKcal * 0.97), match: 97 },
  ];

  const filtered = selectedProvider === 'all' ? restaurants : restaurants.filter(r => r.provider === selectedProvider);

  const providerEmoji: Record<string, string> = { glovo: '🛵', wolt: '🚴', bolt: '⚡' };
  const providerColor: Record<string, string> = { glovo: 'bg-yellow-100 text-yellow-700', wolt: 'bg-blue-100 text-blue-700', bolt: 'bg-green-100 text-green-700' };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black"
        style={{ zIndex: 19999 }}
        onClick={onClose}
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-white flex flex-col rounded-t-[24px]"
        style={{ zIndex: 20000, maxHeight: '90vh' }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-4">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl text-gray-900" style={{ fontWeight: 600 }}>
                {t('menu.orderBtn') || 'Megrendelés'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {filtered.length} étterem · {translateFoodName(meal.name, language)}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center" aria-label="Bezárás">
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Provider Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { key: 'all' as const, label: 'Összes', emoji: '', activeClass: 'bg-emerald-600 text-white' },
              { key: 'glovo' as const, label: 'Glovo', emoji: '🛵', activeClass: 'bg-yellow-500 text-white' },
              { key: 'wolt' as const, label: 'Wolt', emoji: '🚴', activeClass: 'bg-blue-500 text-white' },
              { key: 'bolt' as const, label: 'Bolt', emoji: '⚡', activeClass: 'bg-green-500 text-white' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setSelectedProvider(f.key)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedProvider === f.key ? f.activeClass : 'bg-gray-100 text-gray-600'
                }`}
                style={{ fontWeight: 500 }}
              >
                {f.emoji && <span>{f.emoji}</span>}
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Restaurant List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Restaurant Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-base text-gray-900" style={{ fontWeight: 600 }}>{r.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-yellow-400 text-sm">★</span>
                        <span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{r.rating}</span>
                        <span className="text-sm text-gray-500">({r.reviewCount})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg text-emerald-600" style={{ fontWeight: 700 }}>{r.price} Lei</p>
                      <p className="text-xs text-gray-500">{r.kcal} kcal</p>
                    </div>
                  </div>

                  {/* Location & Time & Provider */}
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">📍 {r.distance}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">🕐 {r.deliveryTime}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1 ${providerColor[r.provider]}`} style={{ fontWeight: 600 }}>
                      {providerEmoji[r.provider]} {r.provider}
                    </span>
                    <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-1" style={{ fontWeight: 600 }}>
                      <Flame className="w-3 h-3" />{r.match}%
                    </span>
                  </div>

                  {/* Order Button */}
                  <button
                    onClick={() => { hapticFeedback('light'); window.open('#', '_blank'); }}
                    className="w-full bg-emerald-600 text-white py-2.5 px-4 rounded-xl text-sm active:scale-95 transition-transform"
                    style={{ fontWeight: 500 }}
                  >
                    {t('menu.orderBtn') || 'Megrendelés'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">🍽️</span>
              </div>
              <p className="text-gray-500 text-base">Nincs elérhető étterem ennél a szállítónál</p>
            </div>
          )}
        </div>

        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </motion.div>
    </>
  );
}
