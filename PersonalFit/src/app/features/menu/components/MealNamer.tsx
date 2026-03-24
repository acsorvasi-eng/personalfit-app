import React, { useState, useMemo } from "react";
import { apiBase } from '@/lib/api';
import { AnimatePresence, motion } from "framer-motion";
import { X, MapPin, Sparkles, RefreshCw } from "lucide-react";
import { useLanguage, type LanguageCode } from "../../../contexts/LanguageContext";
import { showToast } from "../../../shared/components/Toast";

type MealGeo = "transylvania" | "budapest" | "mediterranean";

interface MealNamerProps {
  ingredients: string[];
  language: LanguageCode;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  onClose: () => void;
  onNameSelected?: (name: string, subtitle: string) => void;
}

interface MealNameResult {
  name: string;
  subtitle: string;
  emoji: string;
}

const GEO_OPTIONS: Array<{ id: MealGeo; labelKey: string; descKey: string }> = [
  {
    id: "transylvania",
    labelKey: "mealNamer.geoTransylvania",
    descKey: "mealNamer.geoTransylvaniaDesc",
  },
  {
    id: "budapest",
    labelKey: "mealNamer.geoBudapest",
    descKey: "mealNamer.geoBudapestDesc",
  },
  {
    id: "mediterranean",
    labelKey: "mealNamer.geoMediterranean",
    descKey: "mealNamer.geoMediterraneanDesc",
  },
];

const LANG_LABEL: Record<LanguageCode, string> = {
  hu: "Magyar",
  ro: "Română",
  en: "English",
};

const FLAG: Record<LanguageCode, string> = {
  hu: "🇭🇺",
  ro: "🇷🇴",
  en: "🇬🇧",
};

export function MealNamer({
  ingredients,
  language: initialLanguage,
  mealType,
  onClose,
  onNameSelected,
}: MealNamerProps) {
  const { t } = useLanguage();
  const [geo, setGeo] = useState<MealGeo>("transylvania");
  const [language, setLanguage] = useState<LanguageCode>(initialLanguage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MealNameResult | null>(null);
  const [cache, setCache] = useState<Record<string, MealNameResult>>({});

  const key = useMemo(
    () =>
      `${[...ingredients].sort().join(",")}-${geo}-${language}-${mealType}`,
    [ingredients, geo, language, mealType]
  );

  const handleGenerate = async () => {
    if (ingredients.length === 0) {
      showToast(t("mealNamer.noIngredients"));
      return;
    }

    setError(null);

    // Cache hit → no API call
    if (cache[key]) {
      setResult(cache[key]);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${apiBase}/api/meal-name`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ingredients,
          geo,
          language,
          mealType,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `API error: ${resp.status}`);
      }

      const data = (await resp.json()) as MealNameResult;
      const final: MealNameResult = {
        name: data.name || "",
        subtitle: data.subtitle || "",
        emoji: data.emoji || "✨",
      };

      setResult(final);
      setCache((prev) => ({ ...prev, [key]: final }));
    } catch (err: any) {
      console.error("[MealNamer] Failed to generate name", err);
      setError(
        err?.message ||
          t("mealNamer.generateFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result && onNameSelected) {
      onNameSelected(result.name, result.subtitle);
      showToast(t("toast.mealSettingsSaved") || "Név alkalmazva ✓");
    }
    onClose();
  };

  const primaryEmoji = result?.emoji || "✨";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="relative w-full max-w-md mx-auto bg-[#1a1916] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-amber-500/30 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle + close */}
          <div className="pt-3 pb-2 px-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="w-10 h-1 bg-amber-500/70 rounded-full mx-auto sm:mx-0" />
              <div className="flex items-center gap-2">
                <span className="text-xl">{primaryEmoji}</span>
                <div>
                  <h2 className="text-sm font-semibold tracking-wide text-amber-50 uppercase">
                    {t("menu.mealNameAI") || "AI ételnév generátor"}
                  </h2>
                  <p className="text-[11px] text-amber-200/70">
                    {t("menu.mealNameSubtitle") ||
                      "Kreatív, geo-aware éttermi nevek a mai menühöz."}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-amber-50/80 hover:bg-black/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 pb-4 space-y-4">
            {/* Geo selector */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-medium text-amber-200/80 uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5 text-amber-300" />
                <span>{t('mealNamer.geoStyle')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {GEO_OPTIONS.map((opt) => {
                  const active = geo === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setGeo(opt.id)}
                      className={[
                        "px-2.5 py-2 rounded-2xl text-left border text-[11px] transition-all",
                        active
                          ? "border-amber-400 bg-amber-500/15 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]"
                          : "border-amber-900/60 bg-black/20 text-amber-200/80 hover:border-amber-500/80",
                      ].join(" ")}
                    >
                      <div className="font-semibold text-[11px]">
                        {t(opt.labelKey)}
                      </div>
                      <div className="text-2xs opacity-80 mt-0.5 line-clamp-2">
                        {t(opt.descKey)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language selector */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-medium text-amber-200/80 uppercase tracking-wide">
                <span>{t('mealNamer.language')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["hu", "ro", "en"] as LanguageCode[]).map((code) => {
                  const active = language === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLanguage(code)}
                      className={[
                        "px-2.5 py-1.5 rounded-2xl border text-[11px] flex items-center justify-center gap-1 transition-all",
                        active
                          ? "border-amber-400 bg-amber-500/20 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.5)]"
                          : "border-amber-900/60 bg-black/30 text-amber-200/80 hover:border-amber-500/80",
                      ].join(" ")}
                    >
                      <span>{FLAG[code]}</span>
                      <span>{LANG_LABEL[code]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ingredients chips */}
            <div className="space-y-1">
              <p className="text-[11px] text-amber-100/80 uppercase tracking-wide">
                {t('mealNamer.ingredients')}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                {ingredients.map((ing) => (
                  <span
                    key={ing}
                    className="px-2 py-0.5 rounded-full bg-black/40 border border-amber-900/60 text-[11px] text-amber-50"
                  >
                    {ing}
                  </span>
                ))}
                {ingredients.length === 0 && (
                  <span className="text-[11px] text-amber-300/70 italic">
                    {t('mealNamer.noIngredientsHint')}
                  </span>
                )}
              </div>
            </div>

            {/* Result panel */}
            <div className="rounded-3xl border border-amber-500/40 bg-[#17140f] px-4 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-3xl">{primaryEmoji}</div>
                {result && (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-2xl bg-black/40 border border-amber-500/50 text-amber-100 hover:bg-black/60 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {t('mealNamer.regenerate')}
                  </button>
                )}
              </div>
              <div className="space-y-1 mt-1">
                <p
                  className="text-[17px] font-semibold text-[#c9a96e]"
                  style={{ fontFamily: '"Playfair Display", system-ui, serif' }}
                >
                  {result?.name || t('mealNamer.waiting')}
                </p>
                {result?.subtitle && (
                  <p className="text-xs text-amber-100/80 italic">
                    {result.subtitle}
                  </p>
                )}
              </div>
              {error && (
                <p className="text-[11px] text-red-300 mt-1">{error}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1 pb-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold text-white bg-primary shadow-sm disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? t('mealNamer.generating') : `✨ ${t('mealNamer.generate')}`}
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!result}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-medium border border-amber-500/60 text-amber-50 bg-black/30 disabled:opacity-40"
              >
                {t('mealNamer.apply')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

