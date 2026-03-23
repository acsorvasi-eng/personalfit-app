/**
 * ====================================================================
 * MealDetail — Meal Detail & Alternatives Page
 * ====================================================================
 * Shows full detail for a specific meal type (breakfast/lunch/dinner)
 * including ingredients and alternative meals from the same type
 * across the entire uploaded plan.
 *
 * Navigation: /meals/:mealType
 * Receives planData and context via route state from Foods.tsx
 *
 * Features:
 *   - Full ingredient list for today's selected meal
 *   - Calorie & macro summary
 *   - Alternative meals from same type + same day type (training/rest)
 *   - Tap alternative to view its details
 *   - Back navigation
 */

import { hapticFeedback } from '@/lib/haptics';
import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import {
  ChevronDown,
  ChevronUp,
  Flame,
  UtensilsCrossed,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanData, type MealOption, type WeekData } from "../../../hooks/usePlanData";
import { mealPlan } from "../../../data/mealData";
import { useLanguage } from "../../../contexts/LanguageContext";
import { translateFoodName } from "../../../utils/foodTranslations";
import { DSMSubPageHeader } from "../../../components/dsm";
import { getUserProfile, type StoredUserProfile } from "../../../backend/services/UserProfileService";
import { RecipeOverlay } from "./RecipeOverlay";

// ══════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Meal config is now built dynamically using t()
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
        // Skip the current/primary meal and duplicates by name
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

  const config = useMemo(() => {
    const gradients: Record<string, { gradientFrom: string; gradientTo: string; icon: string }> = {
      breakfast: { icon: "🌅", gradientFrom: "from-amber-400", gradientTo: "to-orange-500" },
      lunch: { icon: "☀️", gradientFrom: "from-yellow-400", gradientTo: "to-amber-500" },
      dinner: { icon: "🌙", gradientFrom: "from-indigo-400", gradientTo: "to-purple-500" },
    };
    const mealTitles: Record<string, string> = {
      breakfast: t('menu.breakfast'),
      lunch: t('menu.lunch'),
      dinner: t('menu.dinner'),
    };
    const key = mealType || "lunch";
    const g = gradients[key] || gradients.lunch;
    return { title: mealTitles[key] || mealTitles.lunch, ...g };
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex-shrink-0">
        <DSMSubPageHeader
          title={config.title}
          subtitle={`${isTrainingDay ? t('menu.trainingDay') : t('menu.restDay')} • ${calories} kcal`}
          onBack={handleClose}
        />
        {/* Selected alternative indicator */}
        {selectedAlternative && (
          <div className="px-4 pb-2">
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setSelectedAlternative(null)}
              className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              <span
                className="text-xs text-primary"
                style={{ fontWeight: 500 }}
              >
                {t('foods.backToOriginal')}
              </span>
            </motion.button>
          </div>
        )}
      </div>

      {/* ─── Content ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className="px-4 py-4 space-y-4">
          {/* ── Current meal details ── */}
          <motion.div
            key={displayedMeal.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-background rounded-2xl border border-gray-100 p-5 shadow-sm"
          >
            <h2
              className="text-[17px] text-foreground mb-1"
              style={{ fontWeight: 700 }}
            >
              {translateFoodName(displayedMeal.name, language)}
            </h2>
            <p className="text-[13px] text-gray-500 mb-4">
              {displayedMeal.description}
            </p>

            {/* Calorie badge */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg">
                <Flame className="w-4 h-4" />
                <span className="text-sm" style={{ fontWeight: 700 }}>
                  {calories} kcal
                </span>
              </div>
            </div>

            {/* Ingredients */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <UtensilsCrossed className="w-4 h-4 text-gray-400" />
                <h3
                  className="text-[13px] text-gray-500 uppercase tracking-wider"
                  style={{ fontWeight: 600 }}
                >
                  {t('foods.ingredients')}
                </h3>
              </div>

              <div className="space-y-2">
                {displayedMeal.ingredients.map((ingredient, i) => (
                  <motion.div
                    key={`${displayedMeal.id}-ing-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                    className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[11px] text-primary shrink-0" style={{ fontWeight: 700 }}>
                      {i + 1}
                    </span>
                    <span
                      className="text-sm text-gray-700"
                      style={{ fontWeight: 500 }}
                    >
                      {translateFoodName(ingredient, language)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ── Recipe button (lunch/dinner only) ── */}
            {(mealType === 'lunch' || mealType === 'dinner') && (
              <motion.button
                onClick={() => { hapticFeedback('light'); setShowRecipe(true); }}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-200/60 active:bg-amber-100 transition-colors cursor-pointer"
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-base leading-none">🍳</span>
                <span className="text-xs text-amber-700" style={{ fontWeight: 700 }}>
                  {t("recipe.openRecipe") || 'Recept'}
                </span>
              </motion.button>
            )}
          </motion.div>

          {/* ── Alternatives section ── */}
          {allAlternatives.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3
                    className="text-sm text-gray-700"
                    style={{ fontWeight: 600 }}
                  >
                    {t('foods.alternativeMeals')} {config.title.toLowerCase()}
                  </h3>
                  <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
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
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
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
                        // Scroll to top
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
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {alt.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-md"
                              style={{ fontWeight: 700 }}
                            >
                              {alt.calories}
                            </span>
                            <span
                              className={`text-2xs px-1.5 py-0.5 rounded ${
                                alt.isTrainingDay
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-primary/5 text-primary"
                              }`}
                              style={{ fontWeight: 500 }}
                            >
                              {alt.dayLabel}
                            </span>
                            <span className="text-2xs text-gray-300">
                              {alt.weekNum}. {t('common.week')} / {alt.dayNum}. {t('common.day')}
                            </span>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-300 shrink-0 -rotate-90" />
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>

              {/* Show more / less */}
              {filteredAlternatives.length > 5 && (
                <button
                  onClick={() => setShowAllAlternatives(!showAllAlternatives)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 mt-2 text-[13px] text-primary cursor-pointer"
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
              <p className="text-[13px] text-gray-400">
                {t('foods.noAlternatives')}
              </p>
            </div>
          )}

          <div className="h-8" />
        </div>
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