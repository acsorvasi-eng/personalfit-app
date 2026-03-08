/**
 * MealIntervalEditor — full-page settings for meal model, time windows, and rest-period snacks.
 * Opened from My Menu rest period card long-press → "Szerkesztés".
 * UI: 8px grid, max 2 snacks selectable.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "../../../contexts/LanguageContext";
import { showToast } from "../../../shared/components/Toast";
import { PageHeader } from "../../../shared/components/PageHeader";
import { PageFooter, PageFooterPrimaryButton } from "../../../shared/components/PageFooter";
import { SNACKS, snackLabel, type SnackItem } from "../../../../i18n/snacks";
import type { LanguageCode } from "../../../contexts/LanguageContext";
import {
  getMealSettings,
  saveMealSettings,
  getDefaultMealsForModel,
  getMealCountForModel,
  type MealSettings,
  type MealWindow,
  type MealModel,
} from "../../../backend/services/UserProfileService";

const MAX_SNACKS = 2;

const DEFAULT_SNACK_IDS = ["alma", "dio"];
const MEAL_MODELS: MealModel[] = ["3meals", "5meals", "2meals", "if16_8", "if18_6"];

// 8px grid
const PAGE_PX = 24;
const SECTION_GAP = 32;
const CARD_PADDING = 24;
const ROW_GAP = 16;
const CHIP_GAP = 12;
const HEADER_H = 64;
const FOOTER_H = 80;

function isIFModel(model: MealModel): boolean {
  return model === "if16_8" || model === "if18_6";
}

/** Translation key for meal by model and index (so UI shows e.g. "Mic dejun" in Romanian, not "Reggeli"). */
function getMealLabelKey(model: MealModel, index: number): string {
  if (model === "2meals") return ["breakfast", "dinner"][index] ?? "breakfast";
  if (model === "3meals") return ["breakfast", "lunch", "dinner"][index] ?? "breakfast";
  if (model === "5meals") return ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner"][index] ?? "breakfast";
  return "breakfast";
}

export function MealIntervalEditor() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const snackOptions = SNACKS[language as LanguageCode] ?? SNACKS.hu;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mealModel, setMealModel] = useState<MealModel>("3meals");
  const [meals, setMeals] = useState<MealWindow[]>([]);
  const [selectedSnackIds, setSelectedSnackIds] = useState<string[]>(DEFAULT_SNACK_IDS);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [snackLimitMessage, setSnackLimitMessage] = useState<string | null>(null);
  const [sleepSuggestion, setSleepSuggestion] = useState<{
    suggestedFirstMeal: string;
    suggestedLastMeal: string;
    workoutWindow: string;
  } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ suggestedFirstMeal: string; suggestedLastMeal: string; workoutWindow: string }>).detail;
      if (detail?.suggestedFirstMeal != null && detail?.suggestedLastMeal != null) {
        setSleepSuggestion({
          suggestedFirstMeal: detail.suggestedFirstMeal,
          suggestedLastMeal: detail.suggestedLastMeal,
          workoutWindow: detail.workoutWindow ?? "",
        });
      }
    };
    window.addEventListener("sleepSettingsUpdated", handler);
    return () => window.removeEventListener("sleepSettingsUpdated", handler);
  }, []);

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
      const ids = (settings.allowedSnacks ?? []).filter((id: string) =>
        snackOptions.some((s: SnackItem) => s.id === id)
      ).slice(0, MAX_SNACKS);
      setSelectedSnackIds(ids.length > 0 ? ids : DEFAULT_SNACK_IDS);
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
    setSnackLimitMessage(null);
  };

  const updateMeal = (index: number, field: keyof MealWindow, value: string) => {
    setMeals((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setValidationError(null);
  };

  const toggleSnack = (snackId: string) => {
    setSnackLimitMessage(null);
    setSelectedSnackIds((prev) => {
      if (prev.includes(snackId)) return prev.filter((id) => id !== snackId);
      if (prev.length >= MAX_SNACKS) {
        setSnackLimitMessage(t("mealEditor.snackMax"));
        return prev;
      }
      return [...prev, snackId];
    });
  };

  const timeToMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };

  const addMinutesToTime = (hhmm: string, mins: number): string => {
    const total = ((timeToMinutes(hhmm) + mins) % 1440 + 1440) % 1440;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const applySleepSuggestion = async () => {
    if (!sleepSuggestion || meals.length === 0) return;
    const firstEnd = addMinutesToTime(sleepSuggestion.suggestedFirstMeal, 60);
    const lastStart = addMinutesToTime(sleepSuggestion.suggestedLastMeal, -60);
    const updated =
      meals.length === 1
        ? [{ ...meals[0], startTime: sleepSuggestion.suggestedFirstMeal, endTime: sleepSuggestion.suggestedLastMeal }]
        : meals.map((meal, i) => {
            if (i === 0) return { ...meal, startTime: sleepSuggestion.suggestedFirstMeal, endTime: firstEnd };
            if (i === meals.length - 1) return { ...meal, startTime: lastStart, endTime: sleepSuggestion.suggestedLastMeal };
            return meal;
          });
    setMeals(updated);
    setSaving(true);
    try {
      const mealCount = getMealCountForModel(mealModel);
      const allowedSnacks = isIFModel(mealModel) ? [] : selectedSnackIds;
      await saveMealSettings({ mealCount, meals: updated, allowedSnacks, mealModel });
      window.dispatchEvent(new Event("mealSettingsUpdated"));
      showToast(t("toast.mealSettingsSaved"));
      setSleepSuggestion(null);
    } finally {
      setSaving(false);
    }
  };

  const validate = (): boolean => {
    for (let i = 0; i < meals.length; i++) {
      const start = timeToMinutes(meals[i].startTime);
      const end = timeToMinutes(meals[i].endTime);
      if (end <= start) {
        setValidationError(t("mealEditor.validation"));
        return false;
      }
    }
    setValidationError(null);
    return true;
  };

  const handleClose = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/menu");
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const mealCount = getMealCountForModel(mealModel);
      const allowedSnacks = isIFModel(mealModel) ? [] : selectedSnackIds;
      const payload: MealSettings = {
        mealCount,
        meals,
        allowedSnacks,
        mealModel,
      };
      console.log("[MealEditor] saving settings:", {
        mealCount,
        meals,
        allowedSnacks,
        selectedSnackIds,
      });
      await saveMealSettings(payload);
      window.dispatchEvent(new Event("mealSettingsUpdated"));
      if (navigator.vibrate) navigator.vibrate([10, 20]);
      showToast(t("toast.mealSettingsSaved"));
      navigate(-1);
    } finally {
      setSaving(false);
    }
  };

  const modelLabelKey: Record<MealModel, string> = {
    "3meals": "mealModel.3",
    "5meals": "mealModel.5",
    "2meals": "mealModel.2",
    if16_8: "mealModel.168",
    if18_6: "mealModel.186",
  };

  const cardStyle = {
    background: "white",
    borderRadius: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    padding: CARD_PADDING,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212]">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          {t("mealInterval.saving")}
        </div>
      </div>
    );
  }

  const headerHeightPx = 120;
  const footerHeightPx = 88;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--color-gray-50, #f9fafb)",
      }}
      className="bg-gray-50 dark:bg-[#121212]"
    >
      <div className="flex-shrink-0">
        <PageHeader
          title={t("mealEditor.title")}
          subtitle={t("mealEditor.subtitle")}
          onClose={handleClose}
        />
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: footerHeightPx,
          paddingLeft: PAGE_PX,
          paddingRight: PAGE_PX,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: SECTION_GAP }}>
          {sleepSuggestion && (
            <div
              style={{
                background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
                border: "1.5px solid #a5b4fc",
                borderRadius: 16,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
              className="dark:bg-indigo-950/30 dark:border-indigo-700/50"
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#3730a3" }} className="dark:text-indigo-300">
                {t("mealEditor.sleepBanner")}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setSleepSuggestion(null)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "1px solid #a5b4fc",
                    background: "transparent",
                    color: "#4f46e5",
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {t("mealEditor.sleepSkip")}
                </button>
                <button
                  type="button"
                  onClick={applySleepSuggestion}
                  disabled={saving}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: "#4f46e5",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {t("mealEditor.sleepUpdate")}
                </button>
              </div>
            </div>
          )}

          {/* Section 1: Meal model dropdown */}
          <section style={cardStyle} className="dark:bg-[#1E1E1E] dark:shadow-none">
            <h2
              style={{
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#6b7280",
                fontWeight: 600,
                margin: 0,
                marginBottom: ROW_GAP,
              }}
            >
              {t("mealEditor.mealCount")}
            </h2>
            <select
              value={mealModel}
              onChange={(e) => handleModelChange(e.target.value as MealModel)}
              style={{
                width: "100%",
                height: 56,
                borderRadius: 12,
                border: "1.5px solid #e5e7eb",
                padding: "0 16px",
                fontSize: 15,
                fontWeight: 500,
                color: "#111827",
                background: "#fff",
              }}
              className="dark:bg-[#252525] dark:border-[#2a2a2a] dark:text-gray-100"
            >
              {MEAL_MODELS.map((m) => (
                <option key={m} value={m}>
                  {t(modelLabelKey[m])}
                </option>
              ))}
            </select>
          </section>

          {/* Section 2: Meal time inputs */}
          <section style={cardStyle} className="dark:bg-[#1E1E1E] dark:shadow-none">
            <h2
              style={{
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#6b7280",
                fontWeight: 600,
                margin: 0,
                marginBottom: ROW_GAP,
              }}
            >
              {t("mealInterval.mealTimesLabel")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {meals.map((meal, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    paddingTop: index === 0 ? 0 : ROW_GAP,
                    paddingBottom: ROW_GAP,
                    borderBottom: index < meals.length - 1 ? "1px solid #f3f4f6" : "none",
                  }}
                  className="dark:border-[#2a2a2a]"
                >
                  {!isIFModel(mealModel) && (
                    <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: "#111827" }}>
                      {t(`meal.${getMealLabelKey(mealModel, index)}`)}
                    </span>
                  )}
                  {isIFModel(mealModel) && (
                    <span style={{ flex: 1, fontSize: 15, color: "#6b7280" }}>
                      {t(`meal.${getMealLabelKey(mealModel, index)}`)}
                    </span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="time"
                      value={meal.startTime}
                      onChange={(e) => updateMeal(index, "startTime", e.target.value)}
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1.5px solid #e5e7eb",
                        background: "#fff",
                        color: "#111827",
                      }}
                      className="dark:bg-[#121212] dark:border-[#2a2a2a] dark:text-gray-100"
                    />
                    <span style={{ color: "#9ca3af" }}>–</span>
                    <input
                      type="time"
                      value={meal.endTime}
                      onChange={(e) => updateMeal(index, "endTime", e.target.value)}
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1.5px solid #e5e7eb",
                        background: "#fff",
                        color: "#111827",
                      }}
                      className="dark:bg-[#121212] dark:border-[#2a2a2a] dark:text-gray-100"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            {validationError && (
              <p style={{ marginTop: 12, fontSize: 14, color: "#dc2626" }}>
                {validationError}
              </p>
            )}
          </section>

          {/* Section 3: Snacks (max 2) or IF message */}
          <section style={cardStyle} className="dark:bg-[#1E1E1E] dark:shadow-none">
            <h2
              style={{
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#6b7280",
                fontWeight: 600,
                margin: 0,
                marginBottom: 8,
              }}
            >
              {t("mealEditor.snackTitle")}
            </h2>
            {isIFModel(mealModel) ? (
              <p style={{ fontSize: 15, color: "#6b7280", marginTop: 12 }}>
                {t("mealEditor.ifFasting")}
              </p>
            ) : (
              <>
                <p style={{ fontSize: 14, color: "#6b7280", marginBottom: ROW_GAP }}>
                  {t("mealEditor.snackSubtitle")}
                </p>
                {snackLimitMessage && (
                  <p style={{ fontSize: 14, color: "#d97706", marginBottom: 12 }} role="alert">
                    {snackLimitMessage}
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: CHIP_GAP }}>
                  {snackOptions.map((snack: SnackItem) => {
                    const selected = selectedSnackIds.includes(snack.id);
                    return (
                      <button
                        key={snack.id}
                        type="button"
                        onClick={() => toggleSnack(snack.id)}
                        style={{
                          height: 48,
                          padding: "0 16px",
                          borderRadius: 12,
                          border: "1.5px solid",
                          fontSize: 14,
                          fontWeight: 500,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          background: selected
                            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                            : "#f9fafb",
                          borderColor: selected ? "#059669" : "#e5e7eb",
                          color: selected ? "white" : "#374151",
                        }}
                        className="dark:bg-[#252525] dark:border-[#2a2a2a] dark:text-gray-200"
                      >
                        <span>{snack.emoji}</span>
                        <span>{snack.name}</span>
                        <span style={{ opacity: selected ? 0.95 : 0.85 }}>{snackLabel(snack)}</span>
                        {selected && <Check className="w-4 h-4 flex-shrink-0" style={{ marginLeft: "auto" }} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <PageFooter>
        <PageFooterPrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? t("mealInterval.saving") : t("mealEditor.save")}
        </PageFooterPrimaryButton>
      </PageFooter>
    </div>
  );
}
