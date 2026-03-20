/**
 * AIProgressImage
 * Claude-powered SVG body silhouette infographic (replaces Replicate image).
 * Card with generate button, loading skeleton, inline SVG result and regenerate link.
 */

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export interface AIProgressImageProps {
  currentWeight: number;
  targetWeight: number;
  weightLoss: number;
  bodyFat?: number;
  gender: "male" | "female";
  timeframeDays: number;
}

export function AIProgressImage({
  currentWeight,
  targetWeight,
  weightLoss,
  bodyFat,
  gender,
  timeframeDays,
}: AIProgressImageProps) {
  const { t } = useLanguage();

  const [generating, setGenerating] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(false);
    try {
      const res = await fetch("/api/generate-body-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentWeight,
          targetWeight,
          weightLoss,
          bodyFat,
          gender,
          timeframeDays,
        }),
      });
      const data = await res.json();
      if (data.svg) {
        setSvgContent(data.svg);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "1.5rem",
        padding: "1.5rem",
        margin: "0 1rem 1rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            {t("bodyVision.aiTitle")}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{t("bodyVision.aiSubtitle")}</p>
        </div>

        {!svgContent && !generating && (
          <>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              style={{
                background: "linear-gradient(135deg, #0f766e, #14b8a6)",
                color: "white",
                borderRadius: "1rem",
                padding: "1rem 2rem",
                width: "100%",
                fontSize: "1rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              {t("bodyVision.aiGenerate")}
            </button>
            <p className="text-center text-xs text-gray-500">{t("bodyVision.aiFree")}</p>
          </>
        )}

        {generating && (
          <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: 320 }}>
            <div
              className="w-full rounded-xl animate-pulse"
              style={{ aspectRatio: "320/480", maxWidth: 320, margin: "0 auto", backgroundColor: "#f3f4f6" }}
            />
            <span className="text-sm text-gray-500">{t("bodyVision.aiGenerating")}</span>
          </div>
        )}

        {!generating && svgContent && (
          <>
            <div
              className="w-full overflow-hidden rounded-xl"
              style={{ maxWidth: 320, margin: "0 auto" }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
            <p className="text-center">
              <button
                type="button"
                onClick={handleGenerate}
                className="text-sm text-indigo-600 hover:underline"
              >
                {t("bodyVision.aiRegenerate")}
              </button>
            </p>
          </>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center">{t("bodyVision.aiError")}</p>
        )}
      </div>
    </div>
  );
}
