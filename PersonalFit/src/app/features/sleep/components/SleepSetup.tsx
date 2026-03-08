/**
 * SleepSetup — Alvás section for Profile → Célok / Goals tab.
 * Cycle-based bedtime options; wake time input. UI only, no service logic.
 */

import { useLanguage } from "../../../contexts/LanguageContext";

export interface BedtimeOption {
  cycleCount: number;
  sleepDuration: string;
  bedtime: string;
  quality: "minimum" | "good" | "optimal";
  label: string;
}

export interface SleepSetupProps {
  wakeTime: string;
  bedtimeOptions: BedtimeOption[];
  selectedBedtime: string;
  onWakeTimeChange: (time: string) => void;
  onBedtimeSelect: (bedtime: string, cycles: number) => void;
}

const QUALITY_DOT_COLOR: Record<BedtimeOption["quality"], string> = {
  optimal: "#22c55e",
  good: "#3b82f6",
  minimum: "#9ca3af",
};

function getLabelKey(quality: BedtimeOption["quality"]): string {
  switch (quality) {
    case "optimal":
      return "sleep.label.optimal";
    case "good":
      return "sleep.label.good";
    case "minimum":
      return "sleep.label.minimum";
    default:
      return "sleep.label.good";
  }
}

export function SleepSetup({
  wakeTime,
  bedtimeOptions,
  selectedBedtime,
  onWakeTimeChange,
  onBedtimeSelect,
}: SleepSetupProps) {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="sleep-setup-title">
      <div style={{ marginBottom: "1rem" }}>
        <h2
          id="sleep-setup-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <span aria-hidden>🌙</span>
          {t("sleep.title")}
        </h2>
        <p
          className="text-sm text-gray-500 dark:text-gray-400"
          style={{ marginTop: "0.25rem" }}
        >
          {t("sleep.subtitle")}
        </p>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <label
          htmlFor="sleep-wake-time"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          style={{ marginBottom: "0.5rem" }}
        >
          {t("sleep.wakeTime")}
        </label>
        <input
          id="sleep-wake-time"
          type="time"
          value={wakeTime}
          onChange={(e) => onWakeTimeChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          style={{
            maxWidth: "8rem",
            minHeight: "2.5rem",
          }}
        />
      </div>

      <div>
        <p
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
          style={{ marginBottom: "0.75rem" }}
        >
          {t("sleep.bedtimeOptions")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {bedtimeOptions.map((opt) => {
            const isSelected = opt.bedtime === selectedBedtime;
            const dotColor = QUALITY_DOT_COLOR[opt.quality];
            return (
              <button
                key={`${opt.bedtime}-${opt.cycleCount}`}
                type="button"
                onClick={() => onBedtimeSelect(opt.bedtime, opt.cycleCount)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  width: "100%",
                  textAlign: "left",
                  background: isSelected ? "#eff6ff" : "white",
                  border: isSelected ? "2px solid #3b82f6" : "1.5px solid #e5e7eb",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  marginBottom: 0,
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
                className="dark:bg-opacity-50"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      width: "0.5rem",
                      height: "0.5rem",
                      borderRadius: "50%",
                      backgroundColor: dotColor,
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "#111827",
                      }}
                      className="dark:text-gray-100"
                    >
                      {opt.bedtime}
                    </div>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        marginTop: "0.125rem",
                      }}
                      className="dark:text-gray-400"
                    >
                      {opt.sleepDuration}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      background: "#f3f4f6",
                      padding: "0.125rem 0.5rem",
                      borderRadius: 999,
                    }}
                    className="dark:bg-gray-700 dark:text-gray-300"
                  >
                    {opt.cycleCount} {t("sleep.cycles")}
                  </span>
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      marginTop: "0.25rem",
                      fontWeight: 500,
                      color: dotColor,
                    }}
                  >
                    {t(getLabelKey(opt.quality))}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
