import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Clock, ChevronDown, Check } from "lucide-react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { showToast } from "../../../shared/components/Toast";
import {
  getMealSettings,
  saveMealSettings,
  getDefaultMealsForCount,
  type MealSettings,
  type MealWindow,
} from "../../../backend/services/UserProfileService";

export interface MealSlot {
  label: string;
  time: string; // "HH:MM"
  emoji: string;
}

interface MealIntervalsProps {
  initialCount?: number;
  initialMeals?: MealSlot[];
  onSave: (count: number, meals: MealSlot[]) => void;
  onClose: () => void;
}

const PRESET_SLOTS: Record<number, MealSlot[]> = {
  1: [{ label: "Ebéd", time: "13:00", emoji: "🍽️" }],
  2: [
    { label: "Reggeli", time: "09:00", emoji: "☀️" },
    { label: "Vacsora", time: "19:00", emoji: "🌙" },
  ],
  3: [
    { label: "Reggeli", time: "08:00", emoji: "☀️" },
    { label: "Ebéd", time: "13:00", emoji: "🍽️" },
    { label: "Vacsora", time: "19:00", emoji: "🌙" },
  ],
  4: [
    { label: "Reggeli", time: "07:30", emoji: "☀️" },
    { label: "Tízórai", time: "10:30", emoji: "🥐" },
    { label: "Ebéd", time: "13:30", emoji: "🍽️" },
    { label: "Vacsora", time: "19:00", emoji: "🌙" },
  ],
  5: [
    { label: "Reggeli", time: "07:00", emoji: "☀️" },
    { label: "Tízórai", time: "10:00", emoji: "🥐" },
    { label: "Ebéd", time: "13:00", emoji: "🍽️" },
    { label: "Uzsonna", time: "16:00", emoji: "🍏" },
    { label: "Vacsora", time: "19:30", emoji: "🌙" },
  ],
};

const COUNT_LABELS: Record<number, string> = {
  1: "OMAD (1 étkezés)",
  2: "Időszakos (2 étkezés)",
  3: "Klasszikus (3 étkezés)",
  4: "Aktív napok (4 étkezés)",
  5: "Sport napok (5 étkezés)",
};

function addMinutes(hhmm: string, delta: number): string {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10) || 0);
  const total = h * 60 + m + delta;
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(wrapped / 60)
    .toString()
    .padStart(2, "0");
  const mm = (wrapped % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function slotToWindow(slot: MealSlot): MealWindow {
  const start = addMinutes(slot.time, -45);
  const end = addMinutes(slot.time, 45);
  return {
    name: slot.label,
    startTime: start,
    endTime: end,
  };
}

function settingsToSlots(settings: MealSettings): [number, MealSlot[]] {
  const count = settings.mealCount ?? settings.meals.length ?? 3;
  if (!settings.meals || settings.meals.length === 0) {
    const preset = PRESET_SLOTS[count] ?? PRESET_SLOTS[3];
    return [count, preset];
  }
  const slots: MealSlot[] = settings.meals.map((mw, idx) => {
    const centerTime = mw.startTime || "08:00";
    const presetEmoji =
      PRESET_SLOTS[count]?.[idx]?.emoji ??
      (idx === 0 ? "☀️" : idx === settings.meals.length - 1 ? "🌙" : "🍽️");
    return {
      label: mw.name,
      time: centerTime,
      emoji: presetEmoji,
    };
  });
  return [count, slots];
}

export function MealIntervals({
  initialCount,
  initialMeals,
  onSave,
  onClose,
}: MealIntervalsProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState<number>(initialCount ?? 3);
  const [slots, setSlots] = useState<MealSlot[]>(() => initialMeals ?? PRESET_SLOTS[3]);
  const [settingsSnapshot, setSettingsSnapshot] = useState<MealSettings | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const settings = await getMealSettings();
        if (!mounted) return;
        const [c, s] = settingsToSlots(settings);
        setCount(initialCount ?? c);
        setSlots(initialMeals ?? s);
        setSettingsSnapshot(settings);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [initialCount, initialMeals]);

  const handleCountChange = (newCount: number) => {
    setCount(newCount);
    setValidationError(null);
    const preset = PRESET_SLOTS[newCount] ?? PRESET_SLOTS[3];
    setSlots(preset);
  };

  const handleSlotChange = (index: number, field: keyof MealSlot, value: string) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const validate = () => {
    if (!slots.every((s) => s.time && /^\d{2}:\d{2}$/.test(s.time))) {
      setValidationError("Kérlek add meg az összes étkezés időpontját (HH:MM).");
      return false;
    }
    return true;
  };

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const base = settingsSnapshot ?? (await getMealSettings());
      const mealWindows: MealWindow[] = slots.map(slotToWindow);
      const model: MealSettings["mealModel"] =
        count === 1 ? "if16_8" : count === 2 ? "2meals" : count === 3 ? "3meals" : "5meals";

      const newSettings: MealSettings = {
        ...base,
        mealCount: count,
        meals: mealWindows,
        mealModel: model,
      };

      await saveMealSettings(newSettings);
      showToast(t("toast.mealSettingsSaved"));
      onSave(count, slots);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [count, slots, onSave, onClose, settingsSnapshot, t]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="relative w-full max-w-lg mx-auto mt-6 mb-4 bg-background rounded-3xl shadow-2xl border border-border overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border bg-primary">
            <div>
              <p className="text-[11px] font-semibold text-white/80 uppercase tracking-wide">
                {t("menu.mealIntervalsTitle") || "Étkezési intervallumok"}
              </p>
              <h2 className="text-base font-bold text-white mt-0.5">
                {t("menu.mealIntervalsSubtitle") ||
                  "Állítsd be, mikor szeretnél enni a nap folyamán."}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 pt-4 pb-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Count selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {t("menu.mealCountLabel") || "Napi étkezések száma"}
                </span>
              </label>
              <div className="relative">
                <select
                  value={count}
                  onChange={(e) => handleCountChange(Number(e.target.value) || 3)}
                  className="w-full appearance-none rounded-2xl border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground"
                >
                  {[1, 2, 3, 4, 5].map((c) => (
                    <option key={c} value={c}>
                      {COUNT_LABELS[c]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Slots */}
            <div className="space-y-3">
              {slots.map((slot, idx) => {
                const isError = !!validationError && !slot.time;
                const color =
                  idx === 0
                    ? "from-yellow-400 to-amber-300"
                    : idx === slots.length - 1
                    ? "from-violet-400 to-fuchsia-400"
                    : "";
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border ${
                      isError
                        ? "border-red-400 bg-red-50/40"
                        : "border-border bg-surface"
                    } px-3 py-3 flex items-center gap-3`}
                  >
                    <div
                      className={`w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-lg`}
                    >
                      <span>{slot.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        value={slot.label}
                        onChange={(e) =>
                          handleSlotChange(idx, "label", e.target.value)
                        }
                        className="w-full bg-transparent border-none outline-none text-sm font-semibold text-foreground"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.time}
                          onChange={(e) =>
                            handleSlotChange(idx, "time", e.target.value)
                          }
                          className="px-2 py-1 rounded-xl border border-border bg-background text-xs text-foreground"
                        />
                        <span className="text-[11px] text-gray-500">
                          {idx + 1}/{slots.length}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Validation */}
            {validationError && (
              <div className="flex items-center gap-2 text-[11px] text-red-500">
                <Check className="w-3 h-3" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white bg-primary shadow-lg disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              {saving
                ? t("menu.saving") || "Mentés..."
                : (t("menu.saveIntervals") || "✓ Mentés")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

