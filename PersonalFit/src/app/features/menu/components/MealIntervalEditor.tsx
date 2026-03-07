/**
 * MealIntervalEditor — full-page settings for meal model, time windows, and rest-period snack.
 * Opened from My Menu rest period card long-press → "Szerkesztés".
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "../../../contexts/LanguageContext";
import {
  getMealSettings,
  saveMealSettings,
  getDefaultMealsForModel,
  getMealCountForModel,
  type MealSettings,
  type MealWindow,
  type MealModel,
} from "../../../backend/services/UserProfileService";

/** Hardcoded snack options — not from food catalog. Exactly one selectable. */
const SNACK_OPTIONS: Array<{ id: string; name: string; portion: string; kcal: number }> = [
  { id: "alma", name: "Alma", portion: "1 db ~ 80g", kcal: 42 },
  { id: "dio", name: "Dió", portion: "3 szem ~ 10g", kcal: 65 },
  { id: "mandula", name: "Mandula", portion: "5 szem ~ 10g", kcal: 58 },
  { id: "kivi", name: "Kivi", portion: "1 db ~ 70g", kcal: 43 },
  { id: "sargarepa", name: "Sárgarépa", portion: "1 közepes ~ 80g", kcal: 33 },
];

const DEFAULT_SNACK_ID = "alma";
const MEAL_MODELS: MealModel[] = ["3meals", "5meals", "2meals", "if16_8", "if18_6"];

function isIFModel(model: MealModel): boolean {
  return model === "if16_8" || model === "if18_6";
}

export function MealIntervalEditor() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mealModel, setMealModel] = useState<MealModel>("3meals");
  const [meals, setMeals] = useState<MealWindow[]>([]);
  const [selectedSnackId, setSelectedSnackId] = useState<string>(DEFAULT_SNACK_ID);
  const [validationError, setValidationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await getMealSettings();
      const model = settings.mealModel ?? "3meals";
      setMealModel(model);
      setMeals(
        settings.meals?.length
          ? settings.meals
          : getDefaultMealsForModel(model)
      );
      const snackId =
        settings.allowedSnacks?.[0] && SNACK_OPTIONS.some((s) => s.id === settings.allowedSnacks![0])
          ? settings.allowedSnacks[0]
          : DEFAULT_SNACK_ID;
      setSelectedSnackId(snackId);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleModelChange = (model: MealModel) => {
    setMealModel(model);
    setMeals(getDefaultMealsForModel(model));
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
          t("mealInterval.validationEndAfterStart") ||
            `${meals[i].name}: end time must be after start`
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
      const mealCount = getMealCountForModel(mealModel);
      const payload: MealSettings = {
        mealCount,
        meals,
        allowedSnacks: isIFModel(mealModel) ? [] : [selectedSnackId],
        mealModel,
      };
      await saveMealSettings(payload);
      window.dispatchEvent(new Event("mealSettingsUpdated"));
      if (navigator.vibrate) navigator.vibrate([10, 20]);
      toast.success("Beállítások mentve ✓");
      navigate(-1);
    } finally {
      setSaving(false);
    }
  };

  const modelLabelKey: Record<MealModel, string> = {
    "3meals": "mealInterval.mealModel3",
    "5meals": "mealInterval.mealModel5",
    "2meals": "mealInterval.mealModel2",
    if16_8: "mealInterval.mealModelIf16_8",
    if18_6: "mealInterval.mealModelIf18_6",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212]">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          Betöltés...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#121212]">
      {/* Header — fixed, full width, no border radius */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          borderRadius: 0,
          padding: "1rem",
          paddingTop: "max(1rem, env(safe-area-inset-top, 16px))",
          borderBottom: "1px solid #e5e7eb",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
        className="bg-white dark:bg-[#1E1E1E] dark:border-[#2a2a2a]"
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }} className="text-gray-900 dark:text-gray-100">
            {t("mealInterval.title")}
          </h1>
          <p style={{ margin: 0, fontSize: "0.875rem", marginTop: "0.25rem" }} className="text-gray-500 dark:text-gray-400">
            {t("mealInterval.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label={t("mealDetail.close")}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body — padding so content is not hidden behind fixed header and footer */}
      <div
        className="flex-1 overflow-y-auto px-4 space-y-6"
        style={{
          paddingTop: "calc(5rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Section 1: Meal model dropdown */}
        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-[#2a2a2a] p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">
            {t("mealInterval.mealCountLabel")}
          </h2>
          <select
            value={mealModel}
            onChange={(e) => handleModelChange(e.target.value as MealModel)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 font-medium"
          >
            {MEAL_MODELS.map((m) => (
              <option key={m} value={m}>
                {t(modelLabelKey[m])}
              </option>
            ))}
          </select>
        </section>

        {/* Section 2: Meal time inputs (or single eating window for IF) */}
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
                {!isIFModel(mealModel) && (
                  <input
                    type="text"
                    value={meal.name}
                    onChange={(e) =>
                      updateMeal(index, "name", e.target.value)
                    }
                    placeholder={t("mealInterval.mealName")}
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 text-sm"
                  />
                )}
                {isIFModel(mealModel) && (
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                    {meal.name}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={meal.startTime}
                    onChange={(e) =>
                      updateMeal(index, "startTime", e.target.value)
                    }
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 text-sm"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="time"
                    value={meal.endTime}
                    onChange={(e) =>
                      updateMeal(index, "endTime", e.target.value)
                    }
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </motion.div>
            ))}
          </div>
          {validationError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {validationError}
            </p>
          )}
        </section>

        {/* Section 3: Snack (single selection) or IF message */}
        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-[#2a2a2a] p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
            {t("mealInterval.allowedSnacksSection")}
          </h2>
          {isIFModel(mealModel) ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {t("mealInterval.ifFastingMessage")}
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t("mealInterval.allowedSnacksHint")}
              </p>
              <div className="flex flex-wrap gap-2">
                {SNACK_OPTIONS.map((snack) => {
                  const selected = selectedSnackId === snack.id;
                  return (
                    <button
                      key={snack.id}
                      type="button"
                      onClick={() => setSelectedSnackId(snack.id)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        selected
                          ? "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                          : "bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {selected && (
                        <Check className="w-3.5 h-3.5 inline-block mr-1.5 align-middle" />
                      )}
                      {snack.name} ({snack.portion}, {snack.kcal} kcal)
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Footer — fixed, full width, no border radius */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          borderRadius: 0,
          padding: "1rem",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom, 16px))",
          background: "white",
          borderTop: "1px solid #e5e7eb",
          zIndex: 50,
        }}
        className="dark:bg-[#1E1E1E] dark:border-[#2a2a2a]"
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            padding: "1rem",
            borderRadius: "0.75rem",
            background: "linear-gradient(135deg, #3b82f6, #14b8a6)",
            color: "white",
            fontSize: "1rem",
            fontWeight: 600,
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? t("mealInterval.saving") : t("mealInterval.save")}
        </button>
      </div>
    </div>
  );
}
