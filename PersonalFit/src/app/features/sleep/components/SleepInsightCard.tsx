/**
 * SleepInsightCard — Dashboard/My Menu card with today's sleep-based insights.
 * UI only, no service logic.
 */

import { useLanguage } from "../../../contexts/LanguageContext";

export interface SleepInsightCardProps {
  bedtime: string;
  wakeTime: string;
  cycleCount: number;
  firstMealTime: string;
  lastMealTime: string;
  workoutWindow: string;
  circadianScore: number;
  calorieAdjustment: number;
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.375rem 0",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: "0.875rem",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "white",
          fontWeight: 600,
          fontSize: "0.875rem",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function SleepInsightCard({
  bedtime,
  wakeTime,
  cycleCount,
  firstMealTime,
  lastMealTime,
  workoutWindow,
  circadianScore,
  calorieAdjustment,
}: SleepInsightCardProps) {
  const { t } = useLanguage();

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
        color: "white",
        borderRadius: "1.5rem",
        padding: "1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
          }}
        >
          <span aria-hidden>🌙</span>
          {t("sleep.tonightTitle")}
        </h3>
        <span
          style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: 999,
            padding: "2px 10px",
            fontSize: "0.875rem",
            color: "white",
            fontWeight: 500,
          }}
        >
          {t("sleep.score")}: {circadianScore}
        </span>
      </div>

      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "0.25rem" }} />

      <Row label={t("sleep.bedtimeLabel")} value={bedtime} />
      <Row
        label={t("sleep.wakeLabel")}
        value={
          <>
            {wakeTime} ({cycleCount} {t("sleep.cycles")} ✓)
          </>
        }
      />

      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "0.25rem", marginTop: "0.25rem" }} />

      <Row label={`🍽 ${t("sleep.firstMeal")}`} value={firstMealTime} />
      <Row label={`🍽 ${t("sleep.lastMeal")}`} value={lastMealTime} />
      <Row label={`💪 ${t("sleep.workout")}`} value={workoutWindow} />

      {calorieAdjustment > 0 && (
        <div
          style={{
            background: "rgba(251,191,36,0.2)",
            border: "1px solid rgba(251,191,36,0.4)",
            borderRadius: "0.5rem",
            padding: "0.5rem",
            color: "#fbbf24",
            fontSize: "0.8rem",
            marginTop: "0.5rem",
          }}
        >
          ⚠️ {t("sleep.lowSleepWarning").replace("{n}", String(calorieAdjustment))}
        </div>
      )}
    </div>
  );
}
