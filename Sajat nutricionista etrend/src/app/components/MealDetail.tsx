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

import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Flame,
  UtensilsCrossed,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanData, type MealOption, type WeekData } from "../hooks/usePlanData";
import { mealPlan } from "../data/mealData";
import { useLanguage } from "../contexts/LanguageContext";

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
  const { t } = useLanguage();
  const [selectedAlternative, setSelectedAlternative] = useState<AlternativeMeal | null>(null);
  const [showAllAlternatives, setShowAllAlternatives] = useState(false);
  const [filterDayType, setFilterDayType] = useState<"all" | "training" | "rest">("all");
  const contentRef = useRef<HTMLDivElement>(null);

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
        <p className="text-gray-500 dark:text-gray-400">
          {t('foods.noDataForMeal')}
        </p>
        <button
          onClick={() => navigate("/foods")}
          className="mt-3 text-blue-600 dark:text-blue-400 text-sm cursor-pointer"
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
        <div
          className={`bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} px-4 pt-4 pb-6 relative overflow-hidden`}
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl" />
          <div className="absolute bottom-0 -left-6 w-28 h-28 bg-white/5 rounded-full blur-lg" />

          <div className="relative z-10">
            {/* Back button */}
            <button
              onClick={() => navigate("/foods")}
              className="flex items-center gap-1.5 text-white/80 hover:text-white mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-[13px]" style={{ fontWeight: 500 }}>
                {t('foods.back')}
              </span>
            </button>

            {/* Meal type badge */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl">
                {config.icon}
              </div>
              <div>
                <h1
                  className="text-xl text-white"
                  style={{ fontWeight: 700 }}
                >
                  {config.title}
                </h1>
                <p className="text-[13px] text-white/70">
                  {isTrainingDay ? t('menu.trainingDay') : t('menu.restDay')} •{" "}
                  {calories} kcal
                </p>
              </div>
            </div>

            {/* Selected alternative indicator */}
            {selectedAlternative && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedAlternative(null)}
                className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white/80" />
                <span
                  className="text-[12px] text-white/90"
                  style={{ fontWeight: 500 }}
                >
                  {t('foods.backToOriginal')}
                </span>
              </motion.button>
            )}
          </div>
        </div>
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
            className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-[#2a2a2a]/60 p-5 shadow-sm"
          >
            <h2
              className="text-[17px] text-gray-800 dark:text-gray-100 mb-1"
              style={{ fontWeight: 700 }}
            >
              {displayedMeal.name}
            </h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">
              {displayedMeal.description}
            </p>

            {/* Calorie badge */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-lg">
                <Flame className="w-4 h-4" />
                <span className="text-[14px]" style={{ fontWeight: 700 }}>
                  {calories} kcal
                </span>
              </div>
            </div>

            {/* Ingredients */}
            <div className="border-t border-gray-100 dark:border-[#2a2a2a]/60 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <UtensilsCrossed className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <h3
                  className="text-[13px] text-gray-500 dark:text-gray-400 uppercase tracking-wider"
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
                    className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50 dark:bg-[#252525]/50"
                  >
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center text-[11px] text-blue-600 dark:text-blue-400 shrink-0" style={{ fontWeight: 700 }}>
                      {i + 1}
                    </span>
                    <span
                      className="text-[14px] text-gray-700 dark:text-gray-300"
                      style={{ fontWeight: 500 }}
                    >
                      {ingredient}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Alternatives section ── */}
          {allAlternatives.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  <h3
                    className="text-[14px] text-gray-700 dark:text-gray-300"
                    style={{ fontWeight: 600 }}
                  >
                    {t('foods.alternativeMeals')} {config.title.toLowerCase()}
                  </h3>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-[#252525] px-2 py-0.5 rounded-full">
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
                    className={`text-[12px] px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                      filterDayType === f.key
                        ? "bg-blue-100 dark:bg-blue-500/15 border-blue-300 dark:border-blue-600/40 text-blue-700 dark:text-blue-400"
                        : "bg-gray-50 dark:bg-[#252525] border-gray-200 dark:border-[#2a2a2a]/60 text-gray-500 dark:text-gray-400"
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
                        if (navigator.vibrate) navigator.vibrate(10);
                        setSelectedAlternative(alt);
                        // Scroll to top
                        contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        selectedAlternative?.id === alt.id
                          ? "bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-600/40"
                          : "bg-white dark:bg-card border-gray-100 dark:border-[#2a2a2a]/60 hover:border-gray-200 dark:hover:border-[#333]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4
                            className="text-[14px] text-gray-800 dark:text-gray-100 truncate"
                            style={{ fontWeight: 600 }}
                          >
                            {alt.name}
                          </h4>
                          <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                            {alt.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md"
                              style={{ fontWeight: 700 }}
                            >
                              {alt.calories}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                alt.isTrainingDay
                                  ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                  : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              }`}
                              style={{ fontWeight: 500 }}
                            >
                              {alt.dayLabel}
                            </span>
                            <span className="text-[10px] text-gray-300 dark:text-gray-600">
                              {alt.weekNum}. {t('common.week')} / {alt.dayNum}. {t('common.day')}
                            </span>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 -rotate-90" />
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>

              {/* Show more / less */}
              {filteredAlternatives.length > 5 && (
                <button
                  onClick={() => setShowAllAlternatives(!showAllAlternatives)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 mt-2 text-[13px] text-blue-600 dark:text-blue-400 cursor-pointer"
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
              <p className="text-[13px] text-gray-400 dark:text-gray-500">
                {t('foods.noAlternatives')}
              </p>
            </div>
          )}

          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}