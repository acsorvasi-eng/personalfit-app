/**
 * AIProgressImage
 * AI-generated "future body" progress image via Replicate (SDXL).
 * Card with generate button, loading skeleton, result image and regenerate.
 */

import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { DSMCard } from "../dsm";
import { useLanguage } from "../../contexts/LanguageContext";

interface Props {
  weightLoss: number;
  currentWeight: number;
  targetWeight: number;
  timeframeDays: number;
  /** When provided, used for AI image; otherwise falls back to profile/localStorage */
  gender?: "male" | "female";
}

function getProfileGender(): "male" | "female" {
  try {
    const raw = localStorage.getItem("userProfile");
    if (raw) {
      const p = JSON.parse(raw);
      return p.gender === "female" ? "female" : "male";
    }
  } catch {
    /* ignore */
  }
  return "male";
}

const TITLES: Record<string, string> = {
  hu: "Így nézhetsz ki",
  ro: "Cum vei arăta",
  en: "How you'll look",
};

const SUBTITLES: Record<string, (w: number) => string> = {
  hu: (w) => `AI-generált előrevetítés ${w}kg-nál`,
  ro: (w) => `Previzualizare generată de AI la ${w}kg`,
  en: (w) => `AI-generated preview at ${w}kg`,
};

const BTN_GENERATE: Record<string, string> = {
  hu: "✨ Kép generálása",
  ro: "✨ Generează imaginea",
  en: "✨ Generate image",
};

const BTN_REGENERATE: Record<string, string> = {
  hu: "Újragenerálás",
  ro: "Regenerează",
  en: "Regenerate",
};

const DISCLAIMER: Record<string, string> = {
  hu: "AI generált kép, csak szemléltetés",
  ro: "Imagine generată de AI, doar ilustrativ",
  en: "AI-generated image, for illustration only",
};

export function AIProgressImage({
  weightLoss,
  currentWeight,
  targetWeight,
  timeframeDays,
  gender: genderProp,
}: Props) {
  const { locale } = useLanguage();
  const lang = locale?.startsWith("ro") ? "ro" : locale?.startsWith("hu") ? "hu" : "en";
  const gender = genderProp ?? getProfileGender();

  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-progress-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightLoss,
          currentWeight,
          targetWeight,
          gender,
          timeframeDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Request failed");
        return;
      }
      setImageUrl(data.imageUrl ?? null);
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setGenerating(false);
    }
  };

  const title = TITLES[lang] ?? TITLES.en;
  const subtitle = (SUBTITLES[lang] ?? SUBTITLES.en)(targetWeight);
  const btnLabel = imageUrl ? (BTN_REGENERATE[lang] ?? BTN_REGENERATE.en) : (BTN_GENERATE[lang] ?? BTN_GENERATE.en);
  const disclaimer = DISCLAIMER[lang] ?? DISCLAIMER.en;

  return (
    <DSMCard className="overflow-hidden">
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>

        {generating && (
          <div className="w-full aspect-[512/768] max-h-[320px] rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-400" />
              <span className="text-xs text-gray-500">Generálás…</span>
            </div>
          </div>
        )}

        {!generating && imageUrl && (
          <>
            <img
              src={imageUrl}
              alt="AI progress preview"
              className="w-full rounded-xl object-cover max-h-[320px] object-top"
            />
            <p className="text-[10px] text-gray-400">{disclaimer}</p>
          </>
        )}

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
        >
          {generating ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Generálás…</span>
            </>
          ) : (
            <>
              {imageUrl ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {btnLabel}
            </>
          )}
        </button>
      </div>
    </DSMCard>
  );
}
