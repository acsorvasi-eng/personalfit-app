/**
 * MealIntervalEditor — full-page settings for meal model, time windows, and rest-period snacks.
 * Opened from My Menu rest period card long-press → "Szerkesztés".
 * UI: 8px grid, max 2 snacks selectable.
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

const MAX_SNACKS = 2;

/** Hardcoded snack options — not from food catalog. Max 2 selectable. */
const SNACK_OPTIONS: Array<{ id: string; emoji: string; name: string; label: string; kcal: number }> = [
  { id: "alma", emoji: "🍎", name: "Alma", label: "1 db · 42 kcal", kcal: 42 },
  { id: "dio", emoji: "🫘", name: "Dió", label: "3 szem · 65 kcal", kcal: 65 },
  { id: "mandula", emoji: "🥜", name: "Mandula", label: "5 szem · 58 kcal", kcal: 58 },
  { id: "kivi", emoji: "🥝", name: "Kivi", label: "1 db · 43 kcal", kcal: 43 },
  { id: "sargarepa", emoji: "🥕", name: "Sárgarépa", label: "1 db · 33 kcal", kcal: 33 },
  { id: "afonya", emoji: "🫐", name: "Áfonya", label: "1 marék · 40 kcal", kcal: 40 },
];

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

export function MealIntervalEditor() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mealModel, setMealModel] = useState<MealModel>("3meals");
  const [meals, setMeals] = useState<MealWindow[]>([]);
  const [selectedSnackIds, setSelectedSnackIds] = useState<string[]>(DEFAULT_SNACK_IDS);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [snackLimitMessage, setSnackLimitMessage] = useState<string | null>(null);

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
      const ids = (settings.allowedSnacks ?? []).filter((id) =>
        SNACK_OPTIONS.some((s) => s.id === id)
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
        setSnackLimitMessage(t("mealInterval.maxTwoSnacksMessage") ?? "Maximum 2 nassolnivaló választható");
        return prev;
      }
      return [...prev, snackId];
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
          t("mealInterval.validationEndAfterStart") ??
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
          Betöltés...
        </div>
      </div>
    );
  }

  const headerHeightPx = 80;
  const footerHeightPx = 100;

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
      {/* Fixed header */}
      <div
        style={{
          flexShrink: 0,
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          height: headerHeightPx,
          minHeight: headerHeightPx,
          borderRadius: 0,
          padding: `0 ${PAGE_PX}px`,
          paddingTop: "env(safe-area-inset-top, 0px)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #14b8a6 100%)",
          color: "white",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "white" }}>
            {t("mealInterval.title")}
          </h1>
          <p style={{ margin: 0, fontSize: "0.875rem", marginTop: 2, color: "rgba(255,255,255,0.9)" }}>
            {t("mealInterval.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center text-white/90 hover:text-white bg-white/20 rounded-full"
          aria-label={t("mealDetail.close")}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingTop: headerHeightPx,
          paddingBottom: footerHeightPx,
          paddingLeft: PAGE_PX,
          paddingRight: PAGE_PX,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: SECTION_GAP }}>
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
              {t("mealInterval.mealCountLabel")}
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
                    <input
                      type="text"
                      value={meal.name}
                      onChange={(e) => updateMeal(index, "name", e.target.value)}
                      placeholder={t("mealInterval.mealName")}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 15,
                        fontWeight: 500,
                        color: "#111827",
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1.5px solid #e5e7eb",
                        background: "#fff",
                      }}
                      className="dark:bg-[#121212] dark:border-[#2a2a2a] dark:text-gray-100"
                    />
                  )}
                  {isIFModel(mealModel) && (
                    <span style={{ flex: 1, fontSize: 15, color: "#6b7280" }}>
                      {meal.name}
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
              {t("mealInterval.allowedSnacksSection")}
            </h2>
            {isIFModel(mealModel) ? (
              <p style={{ fontSize: 15, color: "#6b7280", marginTop: 12 }}>
                {t("mealInterval.ifFastingMessage")}
              </p>
            ) : (
              <>
                <p style={{ fontSize: 14, color: "#6b7280", marginBottom: ROW_GAP }}>
                  {t("mealInterval.allowedSnacksHint")}
                </p>
                {snackLimitMessage && (
                  <p style={{ fontSize: 14, color: "#d97706", marginBottom: 12 }} role="alert">
                    {snackLimitMessage}
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: CHIP_GAP }}>
                  {SNACK_OPTIONS.map((snack) => {
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
                        <span style={{ opacity: selected ? 0.95 : 0.85 }}>{snack.label}</span>
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

      {/* Fixed footer */}
      <div
        style={{
          flexShrink: 0,
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          minHeight: footerHeightPx,
          borderRadius: 0,
          padding: 16,
          paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
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
            height: 48,
            padding: "0 1rem",
            borderRadius: 12,
            background: "linear-gradient(135deg, #3b82f6, #14b8a6)",
            color: "white",
            fontSize: 16,
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
