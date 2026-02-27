/**
 * ====================================================================
 * Foods — Food Catalog (Full-Screen)
 * ====================================================================
 * The "Étkezés" tab: shows ALL foods the user can eat, extracted from
 * the 4-week diet plan PDF uploaded in the Profile section.
 *
 * Data sources:
 *   1. usePlanFoods() — real food data from IndexedDB (plan-linked or all DB foods)
 *   2. foodDatabase fallback — hardcoded 68 foods from mealData.ts
 *
 * Features:
 *   - Branded gradient header with food count
 *   - Search bar for filtering by name/description
 *   - Category tabs: Összes / Fehérje / Tejtermék / Szénhidrát / Zsír / Hüvelyes / Magvak / Zöldség / Tojás
 *   - Compact food cards with macro breakdown
 *   - Tap card → full-screen food detail with benefits & nutrition
 *   - Haptic feedback on interactions
 *   - Localized (HU/EN/RO) via t() calls
 */

import { useState, useMemo, useRef } from "react";
import {
  Search,
  X,
  Heart,
  ChevronRight,
  Sparkles,
  Info,
  Flame,
  UtensilsCrossed,
  Apple,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanFoods, type PlanFood } from "../hooks/usePlanData";
import { useAppData } from "../hooks/useAppData";
import { EmptyState } from "./EmptyState";
import { DataUploadSheet } from "./DataUploadSheet";
import { useLanguage } from "../contexts/LanguageContext";
import { foodDatabase, type Food } from "../data/mealData";
import { useFavoriteFoods } from "../hooks/useFavoriteFoods";
import { PageHeader } from "./PageHeader";
import { TabFilter } from "./TabFilter";

// ═══════════════════════════════════════════════════════════════
// CATEGORY MAPPING
// ═══════════════════════════════════════════════════════════════

/** Map raw category labels from usePlanFoods to translation keys */
const CATEGORY_I18N_MAP: Record<string, string> = {
  Osszes: "foods.all",
  Feherje: "foods.catProtein",
  Tejtermek: "foods.catDairy",
  "Komplex szenhidrat": "foods.catComplexCarbs",
  "Egeszseges zsir": "foods.catHealthyFat",
  Huvelyes: "foods.catLegumes",
  Mag: "foods.catSeeds",
  Zoldseg: "foods.catVegetables",
  Tojas: "foods.catEgg",
};

/** Category icons — only used in detail sheet header */

/** Category accent colors */
const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; darkBg: string; darkText: string }
> = {
  Feherje: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
    darkBg: "dark:bg-red-500/10",
    darkText: "dark:text-red-400",
  },
  Tejtermek: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
    darkBg: "dark:bg-blue-500/10",
    darkText: "dark:text-blue-400",
  },
  "Komplex szenhidrat": {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
    darkBg: "dark:bg-amber-500/10",
    darkText: "dark:text-amber-400",
  },
  "Egeszseges zsir": {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-200",
    darkBg: "dark:bg-emerald-500/10",
    darkText: "dark:text-emerald-400",
  },
  Huvelyes: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-200",
    darkBg: "dark:bg-orange-500/10",
    darkText: "dark:text-orange-400",
  },
  Mag: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    darkBg: "dark:bg-yellow-500/10",
    darkText: "dark:text-yellow-400",
  },
  Zoldseg: {
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-200",
    darkBg: "dark:bg-green-500/10",
    darkText: "dark:text-green-400",
  },
  Tojas: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    border: "border-purple-200",
    darkBg: "dark:bg-purple-500/10",
    darkText: "dark:text-purple-400",
  },
};

const DEFAULT_COLORS = {
  bg: "bg-gray-50",
  text: "text-gray-600",
  border: "border-gray-200",
  darkBg: "dark:bg-gray-500/10",
  darkText: "dark:text-gray-400",
};

// ═══════════════════════════════════════════════════════════════
// FALLBACK: Convert foodDatabase to PlanFood[]
// ═══════════════════════════════════════════════════════════════

/** Map display category → raw category key (same as usePlanFoods uses) */
const DISPLAY_TO_RAW_MAP: Record<string, string> = {
  "Fehérje": "Feherje",
  "Tejtermék": "Tejtermek",
  "Komplex szénhidrát": "Komplex szenhidrat",
  "Egészséges zsír": "Egeszseges zsir",
  "Hüvelyes": "Huvelyes",
  "Mag": "Mag",
  "Zöldség": "Zoldseg",
  "Tojás": "Tojas",
};

function convertFoodDBtoPlainFoods(db: Food[]): {
  foods: PlanFood[];
  categories: string[];
} {
  const categorySet = new Set<string>();
  const foods: PlanFood[] = db.map((f) => {
    const rawCat = DISPLAY_TO_RAW_MAP[f.category] || f.category;
    categorySet.add(rawCat);
    return {
      id: f.id,
      name: f.name,
      description: f.description,
      category: rawCat,
      calories: parseInt(f.calories) || 0,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      benefits: f.benefits || [],
      suitableFor: f.suitableFor || [],
      source: "system",
    };
  });
  return {
    foods,
    categories: ["Osszes", ...Array.from(categorySet).sort()],
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Get macro bar widths as percentages */
function getMacroPercentages(food: PlanFood) {
  const total = food.protein + food.carbs + food.fat;
  if (total === 0) return { protein: 33, carbs: 33, fat: 34 };
  return {
    protein: Math.round((food.protein / total) * 100),
    carbs: Math.round((food.carbs / total) * 100),
    fat: Math.round((food.fat / total) * 100),
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function Foods() {
  const appData = useAppData();
  const {
    foods: planFoods,
    categories: planCategories,
    isLoading: planLoading,
  } = usePlanFoods();
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite, favoriteCount } = useFavoriteFoods();

  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Osszes");
  const [selectedFood, setSelectedFood] = useState<PlanFood | null>(null);

  // Decide data source: planFoods from IndexedDB, or fallback to hardcoded
  const { foods, categories } = useMemo(() => {
    if (planFoods.length > 0) {
      return { foods: planFoods, categories: planCategories };
    }
    // Fallback: convert the hardcoded foodDatabase
    return convertFoodDBtoPlainFoods(foodDatabase);
  }, [planFoods, planCategories]);

  // Build localized tabs — inject Kedvencek after Összes
  const tabs = useMemo(() => {
    const baseTabs = categories.map((cat) => ({
      key: cat,
      label: t(CATEGORY_I18N_MAP[cat] || cat),
    }));
    // Insert favorites tab right after "Osszes"
    const favTab = { key: "__favorites__", label: t("foods.favorites") };
    const osszesIdx = baseTabs.findIndex((t) => t.key === "Osszes");
    if (osszesIdx >= 0) {
      baseTabs.splice(osszesIdx + 1, 0, favTab);
    } else {
      baseTabs.unshift(favTab);
    }
    return baseTabs;
  }, [categories, t]);

  // Filter by tab and search
  const filteredFoods = useMemo(() => {
    let result = foods;

    // Category filter
    if (activeTab === "__favorites__") {
      result = result.filter((f) => isFavorite(f.id));
    } else if (activeTab !== "Osszes") {
      result = result.filter((f) => f.category === activeTab);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.benefits.some((b) => b.toLowerCase().includes(q))
      );
    }

    return result;
  }, [foods, activeTab, searchQuery, isFavorite]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Osszes: foods.length, "__favorites__": favoriteCount };
    for (const f of foods) {
      counts[f.category] = (counts[f.category] || 0) + 1;
    }
    return counts;
  }, [foods, favoriteCount]);

  // ─── Empty state guard ──────────────────────────────────────
  if (
    !appData.isLoading &&
    !appData.hasActivePlan &&
    foods.length === 0 &&
    !planLoading
  ) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <DataUploadSheet
          open={uploadSheetOpen}
          onClose={() => setUploadSheetOpen(false)}
          onComplete={() => appData.refresh()}
        />
        <EmptyState
          variant="foods"
          onUpload={() => setUploadSheetOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <DataUploadSheet
        open={uploadSheetOpen}
        onClose={() => setUploadSheetOpen(false)}
        onComplete={() => appData.refresh()}
      />

      {/* ═══ Header — uses shared PageHeader DSM component ═══ */}
      <div className="flex-shrink-0">
        <PageHeader
          title={t("foods.title")}
          subtitle={t("foods.foodCount").replace("{n}", String(foods.length))}
          stats={[
            { label: t("foods.all"), value: foods.length },
            { label: t("foods.favorites"), value: favoriteCount },
          ]}
        />
      </div>

      {/* ═══ Category Tabs — uses shared TabFilter DSM component ═══ */}
      <div className="flex-shrink-0 px-3 sm:px-4 pt-3 pb-1">
        <TabFilter
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== "Osszes") setSearchQuery("");
          }}
          size="md"
        />
      </div>

      {/* ═══ Search — visible only on Összes tab ═══ */}
      {activeTab === "Osszes" && (
        <div className="flex-shrink-0 px-3 sm:px-4 pt-2 pb-1">
          <div className="relative flex items-center bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-xl transition-all focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]/20">
            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-3 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("foods.search")}
              className="w-full bg-transparent py-2.5 pl-2.5 pr-3 text-[13px] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              style={{ fontWeight: 500 }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-200/60 dark:hover:bg-[#333] rounded-full mr-1.5 shrink-0"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ Food List ═══ */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-3">
        {planLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-gray-100 dark:bg-[#252525] h-[88px] animate-pulse"
              />
            ))}
          </div>
        ) : filteredFoods.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-[#252525] flex items-center justify-center">
              <Search className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <p
              className="text-sm text-gray-500 dark:text-gray-400"
              style={{ fontWeight: 600 }}
            >
              {t("foods.noResults")}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-[13px] text-[var(--color-primary-500)]"
                style={{ fontWeight: 600 }}
              >
                {t("foods.all")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {filteredFoods.map((food, idx) => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(idx * 0.03, 0.3),
                  duration: 0.25,
                  ease: "easeOut",
                }}
              >
                <FoodCard
                  food={food}
                  t={t}
                  isFavorite={isFavorite(food.id)}
                  onToggleFavorite={() => {
                    if (navigator.vibrate) navigator.vibrate([10, 20]);
                    toggleFavorite(food.id);
                  }}
                  onTap={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    setSelectedFood(food);
                  }}
                />
              </motion.div>
            ))}
            <div className="h-4" />
          </div>
        )}
      </div>

      {/* ═══ Food Detail Bottom Sheet ═══ */}
      <AnimatePresence>
        {selectedFood && (
          <FoodDetailSheet
            food={selectedFood}
            t={t}
            isFavorite={isFavorite(selectedFood.id)}
            onToggleFavorite={() => {
              if (navigator.vibrate) navigator.vibrate([10, 20]);
              toggleFavorite(selectedFood.id);
            }}
            onClose={() => setSelectedFood(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FOOD CARD (compact, in list)
// ═══════════════════════════════════════════════════════════════

function FoodCard({
  food,
  t,
  isFavorite,
  onToggleFavorite,
  onTap,
}: {
  food: PlanFood;
  t: (key: string) => string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onTap: () => void;
}) {
  const colors = CATEGORY_COLORS[food.category] || DEFAULT_COLORS;
  const catLabel = t(CATEGORY_I18N_MAP[food.category] || food.category);

  return (
    <button
      onClick={onTap}
      className="w-full bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-[#2a2a2a]/60 p-4 text-left active:scale-[0.98] transition-all group hover:shadow-md hover:border-gray-200 dark:hover:border-[#333]"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Name + category label */}
        <div className="flex-1 min-w-0">
          <h3
            className="text-[var(--text-base)] text-gray-800 dark:text-gray-100 truncate"
            style={{ fontWeight: 600, fontFamily: "var(--font-family-base)" }}
          >
            {food.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`text-[var(--text-xs)] ${colors.text} ${colors.darkText}`}
              style={{ fontWeight: 600 }}
            >
              {catLabel}
            </span>
          </div>
        </div>

        {/* Right: Favorite + calories + chevron */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Favorite button */}
          <motion.div
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite
                  ? "text-rose-500 fill-rose-500"
                  : "text-gray-300 dark:text-gray-600"
              }`}
            />
          </motion.div>
          {/* Calories badge */}
          <div className="text-right">
            <span
              className="text-[var(--text-sm)] text-gray-700 dark:text-gray-200"
              style={{ fontWeight: 700 }}
            >
              {food.calories}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-0.5">
              kcal
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400" />
        </div>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// FOOD DETAIL BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════

function FoodDetailSheet({
  food,
  t,
  isFavorite,
  onToggleFavorite,
  onClose,
}: {
  food: PlanFood;
  t: (key: string) => string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const catLabel = t(CATEGORY_I18N_MAP[food.category] || food.category);
  const macros = getMacroPercentages(food);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-50 bg-white dark:bg-[var(--background)] flex flex-col"
      >
        {/* ─── Header ─── */}
        <div className="flex-shrink-0 bg-gradient-to-br from-[var(--color-primary-500)] via-[var(--color-primary-600)] to-[var(--color-secondary-500)] px-5 pt-5 pb-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/8 rounded-full blur-2xl" />
          <div className="absolute bottom-0 -left-6 w-28 h-28 bg-white/5 rounded-full blur-lg" />

          <div className="relative z-10">
            {/* Close button */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white"
                >
                  <Apple className="w-5 h-5" />
                </div>
                <div>
                  <h1
                    className="text-[20px] text-white"
                    style={{
                      fontWeight: 700,
                      fontFamily: "var(--font-family-display)",
                    }}
                  >
                    {food.name}
                  </h1>
                  <span className="text-[12px] text-white/70 bg-white/15 px-2 py-0.5 rounded">
                    {catLabel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={onToggleFavorite}
                  className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  aria-label={t("foods.favorites")}
                >
                  <Heart
                    className={`w-4.5 h-4.5 transition-colors ${
                      isFavorite
                        ? "text-rose-400 fill-rose-400"
                        : "text-white/70"
                    }`}
                  />
                </motion.button>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  aria-label={t("foods.close")}
                >
                  <X className="w-4.5 h-4.5 text-white" />
                </button>
              </div>
            </div>

            {/* Calorie + macro chips */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 border border-white/10">
                <Flame className="w-3.5 h-3.5 text-white/80" />
                <div>
                  <span
                    className="text-[10px] text-white/60 block"
                    style={{ fontWeight: 500 }}
                  >
                    {t("foods.calories")}
                  </span>
                  <span
                    className="text-[14px] text-white"
                    style={{ fontWeight: 700 }}
                  >
                    {food.calories} kcal
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 border border-white/10">
                <Info className="w-3.5 h-3.5 text-white/80" />
                <span
                  className="text-[10px] text-white/60"
                  style={{ fontWeight: 500 }}
                >
                  {t("foods.nutritionPer100g")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 overflow-y-auto" ref={contentRef}>
          <div className="px-4 py-4 space-y-4">
            {/* Description */}
            {food.description && (
              <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-xl p-3">
                <p
                  className="text-[13px] text-gray-600 dark:text-gray-400"
                  style={{ fontWeight: 500 }}
                >
                  {food.description}
                </p>
              </div>
            )}

            {/* ── Macro Breakdown ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[var(--color-primary-500)]" />
                <span
                  className="text-[12px] text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  style={{ fontWeight: 700 }}
                >
                  {t("foods.macroRatio")}
                </span>
              </div>

              {/* Macro bar (large) */}
              <div className="h-3 rounded-full bg-gray-100 dark:bg-[#252525] overflow-hidden flex mb-4">
                <motion.div
                  className="h-full bg-red-400 dark:bg-red-500 rounded-l-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${macros.protein}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <motion.div
                  className="h-full bg-amber-400 dark:bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${macros.carbs}%` }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
                />
                <motion.div
                  className="h-full bg-blue-400 dark:bg-blue-500 rounded-r-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${macros.fat}%` }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                />
              </div>

              {/* Macro cards */}
              <div className="grid grid-cols-3 gap-2">
                {/* Protein */}
                <div className="rounded-xl border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-red-400 dark:bg-red-500" />
                    <span
                      className="text-[10px] text-red-500 dark:text-red-400 uppercase"
                      style={{ fontWeight: 700 }}
                    >
                      {t("foods.protein")}
                    </span>
                  </div>
                  <span
                    className="text-[18px] text-red-600 dark:text-red-400"
                    style={{ fontWeight: 700 }}
                  >
                    {food.protein}
                    <span className="text-[11px]">g</span>
                  </span>
                  <p className="text-[9px] text-red-400 dark:text-red-500/70 mt-0.5">
                    {macros.protein}%
                  </p>
                </div>

                {/* Carbs */}
                <div className="rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500" />
                    <span
                      className="text-[10px] text-amber-600 dark:text-amber-400 uppercase"
                      style={{ fontWeight: 700 }}
                    >
                      {t("foods.carbs")}
                    </span>
                  </div>
                  <span
                    className="text-[18px] text-amber-600 dark:text-amber-400"
                    style={{ fontWeight: 700 }}
                  >
                    {food.carbs}
                    <span className="text-[11px]">g</span>
                  </span>
                  <p className="text-[9px] text-amber-400 dark:text-amber-500/70 mt-0.5">
                    {macros.carbs}%
                  </p>
                </div>

                {/* Fat */}
                <div className="rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500" />
                    <span
                      className="text-[10px] text-blue-600 dark:text-blue-400 uppercase"
                      style={{ fontWeight: 700 }}
                    >
                      {t("foods.fat")}
                    </span>
                  </div>
                  <span
                    className="text-[18px] text-blue-600 dark:text-blue-400"
                    style={{ fontWeight: 700 }}
                  >
                    {food.fat}
                    <span className="text-[11px]">g</span>
                  </span>
                  <p className="text-[9px] text-blue-400 dark:text-blue-500/70 mt-0.5">
                    {macros.fat}%
                  </p>
                </div>
              </div>
            </div>

            {/* ── Benefits ── */}
            {food.benefits.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4 text-[var(--color-secondary-500)]" />
                  <span
                    className="text-[12px] text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    style={{ fontWeight: 700 }}
                  >
                    {t("foods.benefitsLabel")}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {food.benefits.map((benefit, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                      className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl bg-[var(--color-secondary-50)] dark:bg-[var(--color-secondary-500)]/5 border border-[var(--color-secondary-100)] dark:border-[var(--color-secondary-500)]/15"
                    >
                      <span
                        className="w-6 h-6 rounded-full bg-[var(--color-secondary-100)] dark:bg-[var(--color-secondary-500)]/15 flex items-center justify-center text-[11px] text-[var(--color-secondary-600)] dark:text-[var(--color-secondary-400)] shrink-0"
                        style={{ fontWeight: 700 }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="text-[13px] text-gray-700 dark:text-gray-300"
                        style={{ fontWeight: 500 }}
                      >
                        {benefit}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Suitable For ── */}
            {food.suitableFor.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UtensilsCrossed className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span
                    className="text-[12px] text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    style={{ fontWeight: 700 }}
                  >
                    {t("foods.suitableForLabel")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {food.suitableFor.map((meal, i) => (
                    <span
                      key={i}
                      className="text-[12px] text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-500)]/10 border border-[var(--color-primary-100)] dark:border-[var(--color-primary-500)]/20 px-3 py-1.5 rounded-lg"
                      style={{ fontWeight: 600 }}
                    >
                      {meal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Footer note ── */}
            <div className="rounded-xl bg-gray-50 dark:bg-[#1a1a1a] p-3 mt-2">
              <p
                className="text-[11px] text-gray-400 dark:text-gray-500 text-center"
                style={{ fontWeight: 500 }}
              >
                {t("foods.fromMealPlan")}
              </p>
            </div>

            <div className="h-6" />
          </div>
        </div>

        {/* Safe area bottom */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </motion.div>
    </>
  );
}