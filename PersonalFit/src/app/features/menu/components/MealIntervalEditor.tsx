/**
 * MealIntervalEditor — full-page settings for meal count, time windows, and allowed rest-period snacks.
 * Opened from My Menu rest period card long-press → "Szerkesztés".
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { X, Check, UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "../../../contexts/LanguageContext";
import {
  getMealSettings,
  saveMealSettings,
  getDefaultMealsForCount,
  type MealSettings,
  type MealWindow,
} from "../../../backend/services/UserProfileService";
import { getAllFoods } from "../../../backend/services/FoodCatalogService";
import type { FoodEntity } from "../../../backend/models";

/** Only foods with calories_per_100g < this are shown as snack options (strict filter). */
const SNACK_MAX_CALORIES_PER_100G = 100;
const MAX_ALLOWED_SNACKS = 2;

export function MealIntervalEditor() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mealCount, setMealCount] = useState(3);
  const [meals, setMeals] = useState<MealWindow[]>([]);
  const [allowedSnacks, setAllowedSnacks] = useState<string[]>([]);
  const [snackOptions, setSnackOptions] = useState<FoodEntity[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [snackLimitMessage, setSnackLimitMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, allFoods] = await Promise.all([getMealSettings(), getAllFoods()]);
      setMealCount(settings.mealCount);
      setMeals(settings.meals.length ? settings.meals : getDefaultMealsForCount(settings.mealCount));
      const options = allFoods
        .filter((f) => f.calories_per_100g < SNACK_MAX_CALORIES_PER_100G)
        .sort((a, b) => a.calories_per_100g - b.calories_per_100g);
      setSnackOptions(options);
      if (settings.allowedSnacks.length > 0) {
        setAllowedSnacks(settings.allowedSnacks.slice(0, MAX_ALLOWED_SNACKS));
      } else {
        setAllowedSnacks(options.slice(0, MAX_ALLOWED_SNACKS).map((f) => f.id));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMealCountChange = (count: number) => {
    setMealCount(count);
    setMeals(getDefaultMealsForCount(count));
    setValidationError(null);
  };

  const updateMeal = (index: number, field: keyof MealWindow, value: string) => {
    setMeals((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setValidationError(null);
  };

  const toggleSnack = (foodId: string) => {
    setSnackLimitMessage(null);
    setAllowedSnacks((prev) => {
      if (prev.includes(foodId)) return prev.filter((id) => id !== foodId);
      if (prev.length >= MAX_ALLOWED_SNACKS) {
        setSnackLimitMessage(t("mealInterval.maxSnacksMessage") || "Maximum 2 étel engedélyezett pihenési időszakban");
        return prev;
      }
      return [...prev, foodId];
    });
  };

  const timeToMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };

  const validate = (): boolean => {
    for (let i = 0; i < meals.length; i++) {
      const start = timeToMinutes(meals[i].startTime);
      const end = timeToMinutes(meals[i].endTime);
      if (end <= start) {
        setValidationError(
          t("mealInterval.validationEndAfterStart") || `${meals[i].name}: end time must be after start`
        );
        return false;
      }
    }
    setValidationError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await saveMealSettings({
        mealCount,
        meals,
        allowedSnacks,
      });
      window.dispatchEvent(new CustomEvent("mealSettingsUpdated"));
      if (navigator.vibrate) navigator.vibrate([10, 20]);
      navigate(-1);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212]">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#121212]">
      {/* Header — full width, no border radius (edge-to-edge) */}
      <div
        className="flex-shrink-0 w-full rounded-none m-0 bg-gradient-to-br from-blue-500 via-emerald-500 to-teal-500 pt-4 pb-4 shadow-lg"
        style={{
          width: '100%',
          borderRadius: 0,
          margin: 0,
          paddingLeft: '1rem',
          paddingRight: '1rem',
          paddingTop: 'max(1rem, env(safe-area-inset-top, 16px))',
        }}
      >
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-xl font-bold text-white">
              {t("mealInterval.title")}
            </h1>
            <p className="text-sm text-white/80 mt-0.5">
              {t("mealInterval.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
            aria-label={t("mealDetail.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Section 1: Meal count */}
        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-[#2a2a2a] p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">
            {t("mealInterval.mealCountLabel")}
          </h2>
          <select
            value={mealCount}
            onChange={(e) => handleMealCountChange(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 font-medium"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </section>

        {/* Section 2: Meal time inputs */}
        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-[#2a2a2a] p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">
            {t("mealInterval.mealTimesLabel")}
          </h2>
          <div className="space-y-4">
            {meals.map((meal, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a]"
              >
                <input
                  type="text"
                  value={meal.name}
                  onChange={(e) => updateMeal(index, "name", e.target.value)}
                  placeholder={t("mealInterval.mealName")}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 text-sm"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={meal.startTime}
                    onChange={(e) => updateMeal(index, "startTime", e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 text-sm"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="time"
                    value={meal.endTime}
                    onChange={(e) => updateMeal(index, "endTime", e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </motion.div>
            ))}
          </div>
          {validationError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{validationError}</p>
          )}
        </section>

        {/* Section 3: Allowed snacks — max 2, only options with calories_per_100g < 100 */}
        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-[#2a2a2a] p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
            {t("mealInterval.allowedSnacksSection")}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("mealInterval.allowedSnacksHint")}
          </p>
          {snackLimitMessage && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-2" role="alert">
              {snackLimitMessage}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {snackOptions.map((food) => {
              const enabled = allowedSnacks.includes(food.id);
              return (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => toggleSnack(food.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    enabled
                      ? "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                      : "bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {enabled && <Check className="w-3.5 h-3.5 inline-block mr-1.5 align-middle" />}
                  {food.name} ({food.calories_per_100g} kcal)
                </button>
              );
            })}
          </div>
          {snackOptions.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("mealInterval.noLowCalorieFoods")}
            </p>
          )}
        </section>
      </div>

      {/* Footer: Save */}
      <div className="flex-shrink-0 p-4 pt-2" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 16px))" }}>
        <motion.button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-emerald-500 to-teal-500 text-white font-bold text-base shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          whileTap={{ scale: 0.98 }}
        >
          {saving ? (
            <span>{t("mealInterval.saving")}</span>
          ) : (
            <>
              <UtensilsCrossed className="w-5 h-5" />
              {t("mealInterval.save")}
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
