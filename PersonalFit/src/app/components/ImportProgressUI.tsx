import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

interface ImportStats {
  days_count: number;
  meals_count: number;
  foods_count: number;
  training_days: number;
  rest_days: number;
}

interface ImportProgressUIProps {
  isLoading: boolean;
  stats?: ImportStats;
  onContinue: () => void;
}

const STEP_TIMINGS = [0, 1500, 3000]; // ms for 3 visible steps

export function ImportProgressUI({ isLoading, stats, onContinue }: ImportProgressUIProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const [animatedStats, setAnimatedStats] = useState<ImportStats>({
    days_count: 0,
    meals_count: 0,
    foods_count: 0,
    training_days: 0,
    rest_days: 0,
  });

  // Reset timers when we enter loading
  useEffect(() => {
    if (isLoading) {
      setStartTime(Date.now());
      setStepIndex(0);
    } else if (!isLoading) {
      // Immediately mark all visible steps complete when backend finishes
      setStepIndex(3);
    }
  }, [isLoading, stats]);

  // Drive step progression while loading
  useEffect(() => {
    if (!isLoading || startTime == null) return;
    let frame: number;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      let idx = 0;
      for (let i = 0; i < STEP_TIMINGS.length; i++) {
        if (elapsed >= STEP_TIMINGS[i]) idx = i;
      }
      setStepIndex(idx);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [isLoading, startTime]);

  // Animate stats count-up when we first get stats and loading is finished
  useEffect(() => {
    if (!stats || isLoading) return;
    const duration = 300;
    const start = performance.now();
    const from = { ...animatedStats };
    const to = { ...stats };
    let frame: number;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = t * (2 - t); // easeOutQuad
      setAnimatedStats({
        days_count: Math.round(from.days_count + (to.days_count - from.days_count) * ease),
        meals_count: Math.round(from.meals_count + (to.meals_count - from.meals_count) * ease),
        foods_count: Math.round(from.foods_count + (to.foods_count - from.foods_count) * ease),
        training_days: Math.round(
          from.training_days + (to.training_days - from.training_days) * ease
        ),
        rest_days: Math.round(from.rest_days + (to.rest_days - from.rest_days) * ease),
      });
      if (t < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, isLoading]);

  const steps = useMemo(
    () => [
      { label: "PDF elemzése folyamatban...", icon: "📄" },
      { label: "Ételek felismerése...", icon: "🥗" },
      { label: "Menük összeállítása...", icon: "📋" },
    ],
    []
  );

  // Phase 2 summary appears as soon as loading finishes,
  // even if stats haven't arrived yet (they can update live).
  const showSummary = !isLoading;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-[380px] rounded-3xl bg-white dark:bg-[#050816] border border-slate-800/60 shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-blue-500 via-sky-400 to-teal-400">
            <p className="text-xs font-semibold text-sky-50/90 tracking-wide uppercase">
              {showSummary ? "✅ Étrend elemezve" : "AI étrend-feldolgozás"}
            </p>
            <h2 className="text-[17px] font-bold text-white mt-0.5">
              {showSummary
                ? "Az étrended készen áll"
                : "Kérlek várj, feldolgozzuk a PDF-et..."}
            </h2>
          </div>

          {/* Body */}
          <div className="px-5 pt-4 pb-4 space-y-4">
            {/* Steps */}
            <div className="space-y-2">
              {steps.map((step, idx) => {
                const done = stepIndex > idx || showSummary;
                const active = stepIndex === idx && isLoading;
                return (
                  <motion.div
                    key={idx}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/70"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">
                      <span>{step.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {done && idx === 0
                          ? "PDF elemzése kész"
                          : step.label}
                      </p>
                    </div>
                    <div className="w-6 h-6 flex items-center justify-center">
                      {done ? (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </motion.div>
                      ) : (
                        <Loader2
                          className={`w-4 h-4 text-slate-400 ${
                            active ? "animate-spin" : ""
                          }`}
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Summary card */}
            <AnimatePresence>
              {showSummary && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 overflow-hidden"
                >
                  <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-700/70 bg-gradient-to-r from-blue-500 via-sky-400 to-teal-400">
                    <p className="text-xs font-semibold text-white/90 uppercase tracking-wide">
                      ✅ Étrend összefoglaló
                    </p>
                  </div>
                  <div className="px-4 py-3 space-y-1.5">
                    <SummaryRow
                      label="Napok"
                      icon="📅"
                      value={animatedStats.days_count}
                    />
                    <SummaryRow
                      label="Étkezések"
                      icon="🍽️"
                      value={animatedStats.meals_count}
                    />
                    <SummaryRow
                      label="Ételek"
                      icon="🥗"
                      value={animatedStats.foods_count}
                    />
                    <SummaryRow
                      label={
                        stats && stats.training_days > 0
                          ? "Edzésnapok"
                          : "Edzésnapok: elemzés folyamatban..."
                      }
                      icon="🟢"
                      value={stats && stats.training_days > 0 ? animatedStats.training_days : 0}
                    />
                    <SummaryRow
                      label={
                        stats && stats.rest_days > 0
                          ? "Pihenőnapok"
                          : "Pihenőnapok: elemzés folyamatban..."
                      }
                      icon="🔵"
                      value={stats && stats.rest_days > 0 ? animatedStats.rest_days : 0}
                    />
                  </div>
                  <div className="px-4 pb-4 pt-1">
                    <button
                      type="button"
                      onClick={onContinue}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500 shadow-md shadow-emerald-500/30"
                    >
                      <span>📤 Publikálás</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SummaryRow({ label, icon, value }: { label: string; icon: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-slate-700 dark:text-slate-200">{label}</span>
      </div>
      <span className="font-semibold text-slate-900 dark:text-slate-50">{value}</span>
    </div>
  );
}

