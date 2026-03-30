/**
 * ====================================================================
 * MealDetail — Meal Detail & Alternatives Page
 * ====================================================================
 * Shows full detail for a specific meal type (breakfast/lunch/dinner)
 * including hero image, macros, ingredients with calories, and action buttons.
 *
 * Navigation: /meals/:mealType
 * Receives planData and context via route state from Foods.tsx
 */

import { hapticFeedback } from '@/lib/haptics';
import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import {
  ChevronDown,
  ChevronUp,
  Flame,
  RefreshCw,
  Sparkles,
  X,
  ShoppingCart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanData, type MealOption, type WeekData } from "../../../hooks/usePlanData";
import { mealPlan } from "../../../data/mealData";
import { useLanguage } from "../../../contexts/LanguageContext";
import { translateFoodName } from "../../../utils/foodTranslations";
import { FoodImage } from "../../../components/FoodImage";
import { getUserProfile, type StoredUserProfile } from "../../../backend/services/UserProfileService";
import { RecipeOverlay } from "./RecipeOverlay";

// ══════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

interface AlternativeMeal extends MealOption {
  weekNum: number;
  dayNum: number;
  dayLabel: string;
  isTrainingDay: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function calculateWeekAndDay(date: Date) {
  const jsDay = date.getDay();
  const day = jsDay === 0 ? 6 : jsDay - 1;
  const dayOfMonth = date.getDate();
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayJS = firstOfMonth.getDay();
  const firstMonday = firstDayJS <= 1 ? 2 - firstDayJS : 9 - firstDayJS;

  let week: number;
  if (dayOfMonth < firstMonday) {
    week = 0;
  } else {
    week = Math.floor((dayOfMonth - firstMonday) / 7);
  }
  week = week % 4;

  return { week, day };
}

/** Collect all meals of a given type from the plan, tagged with context */
function collectAlternatives(
  planData: WeekData[],
  mealType: string,
  excludeMealId: string
): AlternativeMeal[] {
  const alternatives: AlternativeMeal[] = [];
  const seenNames = new Set<string>();

  for (const weekData of planData) {
    for (const dayData of weekData.days) {
      const meals =
        mealType === "breakfast"
          ? dayData.breakfast
          : mealType === "lunch"
          ? dayData.lunch
          : mealType === "dinner"
          ? dayData.dinner
          : [];

      for (const meal of meals) {
        if (meal.id === excludeMealId || seenNames.has(meal.name)) continue;
        seenNames.add(meal.name);

        alternatives.push({
          ...meal,
          weekNum: weekData.week,
          dayNum: dayData.day,
          dayLabel: dayData.dayLabel,
          isTrainingDay: dayData.isTrainingDay,
        });
      }
    }
  }

  return alternatives;
}

// Time slot keys per meal type
const TIME_KEYS: Record<string, string> = {
  breakfast: 'menu.timeBreakfast',
  lunch: 'menu.timeLunch',
  dinner: 'menu.timeDinner',
  snack: 'menu.timeSnack',
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MealDetail() {
  const { mealType } = useParams<{ mealType: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { planData: hookPlanData } = usePlanData();
  const { t, language } = useLanguage();
  const [selectedAlternative, setSelectedAlternative] = useState<AlternativeMeal | null>(null);
  const [showAllAlternatives, setShowAllAlternatives] = useState(false);
  const [filterDayType, setFilterDayType] = useState<"all" | "training" | "rest">("all");
  const [showRecipe, setShowRecipe] = useState(false);
  const [userProfile, setUserProfile] = useState<StoredUserProfile | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUserProfile().then(setUserProfile).catch(() => {});
  }, []);

  // Get plan data from route state or hook
  const routeState = location.state as {
    planData?: WeekData[];
    isTrainingDay?: boolean;
  } | null;

  const effectivePlan: WeekData[] = useMemo(() => {
    if (routeState?.planData && routeState.planData.length > 0)
      return routeState.planData;
    if (hookPlanData.length > 0) return hookPlanData;
    return mealPlan as unknown as WeekData[];
  }, [routeState, hookPlanData]);

  // All meals across the week (for gastro rules in RecipeOverlay)
  const weekMeals = useMemo<MealOption[]>(() => {
    const meals: MealOption[] = [];
    for (const weekData of effectivePlan) {
      for (const dayData of weekData.days) {
        meals.push(...dayData.breakfast, ...dayData.lunch, ...dayData.dinner);
      }
    }
    return meals;
  }, [effectivePlan]);

  // Today's meals (for gastro rules in RecipeOverlay)
  const todayMeals = useMemo<MealOption[]>(() => {
    const { week, day } = calculateWeekAndDay(new Date());
    const weekData = effectivePlan[week];
    if (!weekData || !weekData.days[day]) return [];
    const dayData = weekData.days[day];
    return [...dayData.breakfast, ...dayData.lunch, ...dayData.dinner];
  }, [effectivePlan]);

  const mealTitle = useMemo(() => {
    const titles: Record<string, string> = {
      breakfast: t('menu.breakfast'),
      lunch: t('menu.lunch'),
      dinner: t('menu.dinner'),
    };
    return titles[mealType || 'lunch'] || titles.lunch;
  }, [mealType, t]);

  const mealTimeSlot = useMemo(() => {
    const key = TIME_KEYS[mealType || 'lunch'] || TIME_KEYS.lunch;
    return t(key);
  }, [mealType, t]);

  const isTrainingDay = routeState?.isTrainingDay ?? false;

  const handleClose = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/foods");
  };

  // Today's meal for this type
  const todayMeal = useMemo(() => {
    const { week, day } = calculateWeekAndDay(new Date());
    const weekData = effectivePlan[week];
    if (!weekData || !weekData.days[day]) return null;
    const dm = weekData.days[day];
    const meals =
      mealType === "breakfast"
        ? dm.breakfast
        : mealType === "lunch"
        ? dm.lunch
        : dm.dinner;
    return meals[0] || null;
  }, [effectivePlan, mealType]);

  // The actively displayed meal (today's or a selected alternative)
  const displayedMeal = selectedAlternative || todayMeal;

  // Alternatives (excluding current meal)
  const allAlternatives = useMemo(() => {
    if (!displayedMeal) return [];
    const currentId = selectedAlternative ? todayMeal?.id || "" : displayedMeal.id;
    return collectAlternatives(effectivePlan, mealType || "lunch", currentId);
  }, [effectivePlan, mealType, displayedMeal, todayMeal, selectedAlternative]);

  // Filter alternatives by day type
  const filteredAlternatives = useMemo(() => {
    if (filterDayType === "all") return allAlternatives;
    if (filterDayType === "training")
      return allAlternatives.filter((a) => a.isTrainingDay);
    return allAlternatives.filter((a) => !a.isTrainingDay);
  }, [allAlternatives, filterDayType]);

  const visibleAlternatives = showAllAlternatives
    ? filteredAlternatives
    : filteredAlternatives.slice(0, 5);

  if (!displayedMeal) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <p className="text-gray-500">
          {t('foods.noDataForMeal')}
        </p>
        <button
          onClick={() => navigate("/foods")}
          className="mt-3 text-primary text-sm cursor-pointer"
          style={{ fontWeight: 600 }}
        >
          {t('foods.back')}
        </button>
      </div>
    );
  }

  const calories =
    parseInt(displayedMeal.calories.replace(/[^0-9]/g, "")) || 0;
  const protein = displayedMeal.totalProtein || 0;
  const carbs = displayedMeal.totalCarbs || 0;
  const fiber = displayedMeal.ingredientDetails
    ? Math.round(calories * 0.02) // estimate fiber as ~2% of calories if no field
    : 0;

  const macros = [
    { icon: '🔥', value: `${calories}`, unit: 'kcal', color: '#f97316' },
    { icon: '🥩', value: `${protein.toFixed(1)}g`, unit: t('foods.protein') || 'Fehérje', color: '#ef4444' },
    { icon: '🌾', value: `${carbs.toFixed(0)}g`, unit: t('foods.carbs') || 'Szénhidrát', color: '#eab308' },
    { icon: '💚', value: `${fiber}g`, unit: t('foods.fiber') || 'Rost', color: '#22c55e' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* ─── Scrollable content ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        {/* ── Hero image — full bleed, no border radius ── */}
        <div className="relative w-full overflow-hidden" style={{ height: 260 }}>
          <div className="w-full h-full [&_div]:!rounded-none [&_img]:!rounded-none">
            <FoodImage
              foodName={displayedMeal.name}
              mealType={mealType}
              size="lg"
              className="w-full h-full"
            />
          </div>
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md cursor-pointer active:scale-95 transition-transform"
            style={{ top: 'calc(env(safe-area-inset-top, 12px) + 12px)' }}
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* ── Meal info ── */}
        <div className="px-5 pt-5 pb-4">
          {/* Meal type + time */}
          <p className="text-sm text-gray-400 mb-1">
            {mealTitle} · {mealTimeSlot}
          </p>

          {/* Meal name */}
          <h1
            className="text-[22px] text-foreground leading-tight mb-4"
            style={{ fontWeight: 700 }}
          >
            {translateFoodName(displayedMeal.name, language)}
          </h1>

          {/* Selected alternative indicator */}
          {selectedAlternative && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setSelectedAlternative(null)}
              className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full cursor-pointer mb-4"
            >
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm text-primary" style={{ fontWeight: 500 }}>
                {t('foods.backToOriginal')}
              </span>
            </motion.button>
          )}

          {/* ── Macro cards row ── */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {macros.map((m, i) => (
              <div
                key={i}
                className="flex flex-col items-center py-3 rounded-xl bg-gray-50"
              >
                <span style={{ color: m.color }}>{m.icon}</span>
                <span
                  className="text-[17px] text-foreground mt-1"
                  style={{ fontWeight: 700 }}
                >
                  {m.value}
                </span>
                <span className="text-[11px] text-gray-400 mt-0.5">
                  {m.unit}
                </span>
              </div>
            ))}
          </div>

          {/* ── Ingredients ── */}
          <h2
            className="text-[17px] text-foreground mb-4"
            style={{ fontWeight: 700 }}
          >
            {t('foods.ingredients')}
          </h2>

          <div className="space-y-0">
            {(displayedMeal.ingredientDetails && displayedMeal.ingredientDetails.length > 0)
              ? displayedMeal.ingredientDetails.map((ing, i) => (
                <motion.div
                  key={`${displayedMeal.id}-ing-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0"
                >
                  <div>
                    <p className="text-[15px] text-foreground" style={{ fontWeight: 600 }}>
                      {translateFoodName(ing.name, language)}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">{ing.quantity}</p>
                  </div>
                  <span className="text-[15px] text-primary" style={{ fontWeight: 600 }}>
                    {Math.round(ing.calories)} kcal
                  </span>
                </motion.div>
              ))
              : displayedMeal.ingredients.map((ingredient, i) => (
                <motion.div
                  key={`${displayedMeal.id}-ing-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0"
                >
                  <p className="text-[15px] text-foreground" style={{ fontWeight: 500 }}>
                    {translateFoodName(ingredient, language)}
                  </p>
                </motion.div>
              ))
            }
          </div>

          {/* ── Alternatives section ── */}
          {allAlternatives.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3
                    className="text-sm text-gray-700"
                    style={{ fontWeight: 600 }}
                  >
                    {t('foods.alternativeMeals')} {mealTitle.toLowerCase()}
                  </h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {filteredAlternatives.length}
                  </span>
                </div>
              </div>

              {/* Day type filter */}
              <div className="flex items-center gap-2 mb-3">
                {(
                  [
                    { key: "all", label: t('foods.allFilter') },
                    { key: "training", label: t('menu.trainingDay') },
                    { key: "rest", label: t('menu.restDay') },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilterDayType(f.key)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                      filterDayType === f.key
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}
                    style={{ fontWeight: 500 }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Alternative list */}
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {visibleAlternatives.map((alt, idx) => (
                    <motion.button
                      key={alt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      onClick={() => {
                        hapticFeedback('light');
                        setSelectedAlternative(alt);
                        contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        selectedAlternative?.id === alt.id
                          ? "bg-primary/5 border-primary/40"
                          : "bg-background border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4
                            className="text-sm text-foreground truncate"
                            style={{ fontWeight: 600 }}
                          >
                            {translateFoodName(alt.name, language)}
                          </h4>
                          <p className="text-sm text-gray-500 mt-0.5 truncate">
                            {alt.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="text-sm text-primary bg-primary/10 px-2 py-0.5 rounded-md"
                              style={{ fontWeight: 700 }}
                            >
                              {alt.calories}
                            </span>
                            <span
                              className={`text-sm px-1.5 py-0.5 rounded ${
                                alt.isTrainingDay
                                  ? "bg-primary/10 text-primary"
                                  : "bg-primary/5 text-primary"
                              }`}
                              style={{ fontWeight: 500 }}
                            >
                              {alt.dayLabel}
                            </span>
                            <span className="text-sm text-gray-500">
                              {alt.weekNum}. {t('common.week')} / {alt.dayNum}. {t('common.day')}
                            </span>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 -rotate-90" />
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>

              {/* Show more / less */}
              {filteredAlternatives.length > 5 && (
                <button
                  onClick={() => setShowAllAlternatives(!showAllAlternatives)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 mt-2 text-sm text-primary cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  {showAllAlternatives ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      {t('foods.showLess')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      {t('foods.showAll').replace('{n}', String(filteredAlternatives.length))}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* No alternatives message */}
          {allAlternatives.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">
                {t('foods.noAlternatives')}
              </p>
            </div>
          )}

          {/* Bottom spacer for fixed buttons */}
          <div className="h-24" />
        </div>
      </div>

      {/* ─── Fixed bottom action buttons ──────────────────── */}
      <div
        className="flex-shrink-0 bg-background border-t border-gray-100 px-5 py-3 flex gap-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {/* Recipe button */}
        <motion.button
          onClick={() => { hapticFeedback('light'); setShowRecipe(true); }}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background: '#0d9488', color: '#ffffff' }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-base">👨‍🍳</span>
          <span className="text-[15px]" style={{ fontWeight: 700 }}>
            {t("recipe.openRecipe") || 'Recept'}
          </span>
        </motion.button>

        {/* Order button */}
        <motion.button
          onClick={() => { hapticFeedback('light'); }}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 border-2 border-gray-200 bg-background cursor-pointer active:scale-[0.98] transition-transform"
          whileTap={{ scale: 0.98 }}
        >
          <ShoppingCart className="w-5 h-5 text-gray-600" />
          <span className="text-[15px] text-gray-700" style={{ fontWeight: 600 }}>
            {t('foods.order') || 'Megrendelés'}
          </span>
        </motion.button>
      </div>

      {/* ─── RECIPE OVERLAY ─── */}
      <AnimatePresence>
        {showRecipe && displayedMeal && (
          <RecipeOverlay
            meal={displayedMeal}
            userProfile={userProfile}
            weekMeals={weekMeals}
            todayMeals={todayMeals}
            onClose={() => setShowRecipe(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
