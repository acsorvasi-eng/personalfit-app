import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, X, ArrowRight, ArrowLeft, Check,
  Dumbbell, Plus, Trash2, Droplets,
} from "lucide-react";
import type { PlanFood } from "../../../hooks/usePlanData";
import * as NutritionPlanSvc from "../../../backend/services/NutritionPlanService";
import { toast } from "sonner";
import { useLanguage } from "../../../contexts/LanguageContext";
import { getUserProfile } from "../../../backend/services/UserProfileService";
import { getSetting } from "../../../backend/services/SettingsService";
import { getMET } from "../../../utils/metHelpers";

// ─── Types ────────────────────────────────────────────────────
type WizardStep = "welcome" | "personal" | "activity" | "calc" | "generating" | "preview" | "saving" | "done";
type Gender = "male" | "female";
type Goal = "loss" | "maintain" | "gain";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

interface SportEntry {
  id: string;
  type: string;
  days: number[]; // 0=Mon … 6=Sun
  minutesPerSession: string;
}

interface PersonalData {
  gender: Gender;
  age: string;
  heightCm: string;
  weightKg: string;
  goal: Goal;
}

interface ActivityData {
  level: ActivityLevel;
  sports: SportEntry[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  foods: PlanFood[];
  dailyCalorieTarget: number;
  onSaved: () => void;
}

// ─── Constants ────────────────────────────────────────────────
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725,
};
const GOAL_ADJUSTMENTS: Record<Goal, number> = { loss: -300, maintain: 0, gain: 300 };
const MEAL_EMOJI: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };
// MEAL_HU replaced by t('generatePlan.mealBreakfast') etc. at render time

// ─── Calorie / water helpers ──────────────────────────────────
function calcBMR(p: PersonalData): number {
  const age = parseInt(p.age) || 30;
  const h = parseInt(p.heightCm) || 170;
  const w = parseInt(p.weightKg) || 70;
  const base = 10 * w + 6.25 * h - 5 * age;
  return Math.round(p.gender === "male" ? base + 5 : base - 161);
}
function calcTDEE(bmr: number, level: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[level]);
}
function calcTarget(tdee: number, goal: Goal): number {
  return Math.round(tdee + GOAL_ADJUSTMENTS[goal]);
}
function calcWater(p: PersonalData, sports: SportEntry[]): number {
  const w = parseFloat(p.weightKg) || 70;
  const base = w * 0.033;
  const extra = sports.reduce((sum, s) => {
    const hrs = (parseInt(s.minutesPerSession) || 60) / 60;
    return sum + (s.days.length / 7) * hrs * 0.5;
  }, 0);
  return Math.round((base + extra) * 10) / 10;
}

// ─── Loader ───────────────────────────────────────────────────
const LOADER_ICONS = ["🥗", "🍳", "🥩", "🥦", "🍚", "🐟"];
function LoaderAnimation({ t }: { t: (key: string) => string }) {
  return (
    <div className="text-center pt-16 pb-10">
      <div className="relative w-24 h-24 mx-auto mb-7">
        {LOADER_ICONS.map((e, i) => (
          <motion.div key={e}
            className="absolute top-1/2 left-1/2 text-2xl"
            animate={{
              x: Math.cos((i / LOADER_ICONS.length) * Math.PI * 2) * 40 - 12,
              y: Math.sin((i / LOADER_ICONS.length) * Math.PI * 2) * 40 - 12,
              opacity: [0.3, 1, 0.3], scale: [0.7, 1.2, 0.7],
            }}
            transition={{ duration: 2.4, repeat: Infinity, delay: (i / LOADER_ICONS.length) * 2.4, ease: "easeInOut" }}
          >{e}</motion.div>
        ))}
      </div>
      <motion.p className="font-bold text-[1.1rem] text-foreground mb-2"
        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }}>
        {t('generatePlan.loaderText')}
      </motion.p>
      <p className="text-[0.82rem] text-gray-400">{t('generatePlan.loaderSubtext')}</p>
    </div>
  );
}

// ─── Shared class strings ─────────────────────────────────────
const inp = "w-full px-[13px] py-[11px] rounded-[11px] border-[1.5px] border-border text-[0.92rem] text-foreground bg-gray-50 outline-none";
const btnPrimary = "h-[52px] rounded-[15px] bg-primary text-white font-bold text-[0.95rem] cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_18px_rgba(99,102,241,0.35)]";
const btnBack = "w-12 h-[52px] rounded-[15px] border-[1.5px] border-border bg-gray-50 cursor-pointer flex items-center justify-center shrink-0";

function newSport(): SportEntry {
  return {
    id: typeof crypto !== "undefined" ? (crypto as any).randomUUID() : `${Date.now()}`,
    type: "", days: [], minutesPerSession: "",
  };
}

// ─── Main component ───────────────────────────────────────────
export function GenerateMealPlanSheet({ open, onClose, foods, onSaved }: Props) {
  const { language, t } = useLanguage();
  const [step, setStep] = useState<WizardStep>("welcome");
  const [personal, setPersonal] = useState<PersonalData>({
    gender: "male", age: "", heightCm: "", weightKg: "", goal: "maintain",
  });
  const [activity, setActivity] = useState<ActivityData>({
    level: "moderate", sports: [],
  });
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [stats, setStats] = useState<{ days: number; meals_per_day: number; meals: number; avg_calories_per_day: number } | null>(null);
  const [loadedMealCount, setLoadedMealCount] = useState<number>(3);
  const [error, setError] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [burnPerDay, setBurnPerDay] = useState<Record<number, number>>({});

  // ── Auto-load saved profile when sheet opens ─────────────────
  useEffect(() => {
    if (!open) { setProfileLoaded(false); return; }
    Promise.all([getUserProfile(), getSetting('userSports')]).then(([profile, sportsJson]) => {
      if (profile.age > 0 && profile.height > 0 && profile.weight > 0) {
        const goalMap: Record<string, Goal> = { lose: 'loss', loss: 'loss', maintain: 'maintain', gain: 'gain' };
        const actMap: Record<string, ActivityLevel> = { sedentary: 'sedentary', light: 'light', moderate: 'moderate', active: 'active' };
        setPersonal({
          gender: (profile.gender as Gender) ?? 'male',
          age: String(profile.age),
          heightCm: String(profile.height),
          weightKg: String(profile.weight),
          goal: goalMap[profile.goal] ?? 'maintain',
        });
        setActivity(prev => ({ ...prev, level: actMap[profile.activityLevel] ?? 'moderate' }));
        setLoadedMealCount((profile as any).mealSettings?.mealCount ?? 3);
        setProfileLoaded(true);
      }
      if (sportsJson) {
        try {
          const saved: Array<{ id: string; label?: string; type?: string; days: number; minutes: number }> = JSON.parse(sportsJson);
          if (Array.isArray(saved) && saved.length > 0) {
            setActivity(prev => ({
              ...prev,
              sports: saved.map(s => ({
                id: s.id,
                type: s.label ?? s.type ?? '',
                days: Array.isArray(s.days)
                  ? s.days
                  : Array.from({ length: Math.min(s.days as number, 7) }, (_, i) => i),
                minutesPerSession: String(s.minutes ?? 60),
              })),
            }));
          }
        } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, [open]);

  const bmr = calcBMR(personal);
  const tdee = calcTDEE(bmr, activity.level);
  const dailyTarget = calcTarget(tdee, personal.goal);
  const waterL = calcWater(personal, activity.sports);

  const personalValid = parseInt(personal.age) > 0 && parseInt(personal.heightCm) > 0 && parseInt(personal.weightKg) > 0;

  // ── Sport helpers ────────────────────────────────────────────
  const addSport = () => setActivity(a => ({ ...a, sports: [...a.sports, newSport()] }));
  const removeSport = (id: string) => setActivity(a => ({ ...a, sports: a.sports.filter(s => s.id !== id) }));
  const updateSport = useCallback((id: string, patch: Partial<SportEntry>) =>
    setActivity(a => ({ ...a, sports: a.sports.map(s => s.id === id ? { ...s, ...patch } : s) })), []);
  const toggleDay = (sportId: string, day: number) =>
    setActivity(a => ({
      ...a,
      sports: a.sports.map(s => s.id === sportId
        ? { ...s, days: s.days.includes(day) ? s.days.filter(d => d !== day) : [...s.days, day] }
        : s),
    }));

  // ── Generate + save ──────────────────────────────────────────
  async function handleGenerate() {
    setBurnPerDay({});
    setStep("generating");
    setError(null);
    try {
      // Load profile for personalization — fall back gracefully on IDB failure
      let userProfile: Record<string, unknown> | undefined;
      try {
        const profile = await getUserProfile();
        userProfile = {
          allergies: profile.allergies || undefined,
          dietaryPreferences: profile.dietaryPreferences || undefined,
          goal: profile.goal || undefined,
          activityLevel: profile.activityLevel || undefined,
          age: profile.age || undefined,
          weight: profile.weight || undefined,
          gender: profile.gender || undefined,
          macroProteinPct: profile.macroProteinPct || undefined,
          macroCarbsPct: profile.macroCarbsPct || undefined,
          macroFatPct: profile.macroFatPct || undefined,
          mealCount: profile.mealSettings?.mealCount || undefined,
          mealModel: profile.mealSettings?.mealModel || undefined,
          likedFoods: profile.likedFoods?.length ? profile.likedFoods : undefined,
          dislikedFoods: profile.dislikedFoods?.length ? profile.dislikedFoods : undefined,
        };
      } catch {
        userProfile = undefined;
      }

      // Only send foods with actual calorie data — filter out 0-kcal unresolved ones
      const validFoods = foods.filter(f => (f.calories ?? 0) > 0);

      // Collect which weekday indices (0=Mon … 6=Sun) are training days
      const trainingDayIndices = [...new Set(activity.sports.flatMap(s => s.days))].sort();

      const weightKg = parseFloat(personal.weightKg) || 70;
      const computedBurnPerDay: Record<number, number> = {};
      for (const s of activity.sports) {
        const met = getMET(s.type); // s.type is the sport name in GenerateMealPlanSheet
        const minutes = parseInt(s.minutesPerSession) || 0;
        if (minutes === 0) continue;
        const kcal = Math.round(met * weightKg * (minutes / 60));
        for (const day of s.days) {
          computedBurnPerDay[day] = (computedBurnPerDay[day] ?? 0) + kcal;
        }
      }
      setBurnPerDay(computedBurnPerDay);

      const resp = await fetch("/api/generate-meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: validFoods.map(f => ({
            name: f.name,
            calories_per_100g: f.calories ?? 100,
            protein_per_100g: f.protein ?? 5,
            carbs_per_100g: f.carbs ?? 10,
            fat_per_100g: f.fat ?? 3,
          })),
          dailyCalorieTarget: dailyTarget,
          days: 7,
          language,
          userProfile,
          mealCount: loadedMealCount,
          trainingDays: trainingDayIndices,
          trainingCaloriesPerDay: computedBurnPerDay,
          goal: personal.goal,
        }),
      });
      const responseBody = await resp.json().catch(() => null);
      if (!resp.ok) {
        const raw = responseBody?.error || responseBody?.message || `Server error ${resp.status}`;
        // Detect Anthropic billing error and show a friendly message
        const isBillingError = raw.includes('credit balance') || raw.includes('billing') || raw.includes('Plans & Billing');
        throw new Error(isBillingError
          ? 'Az Anthropic API kredit elfogyott. Töltsd fel a krediteket a console.anthropic.com > Billing oldalon, majd próbáld újra.'
          : raw);
      }
      const data = responseBody;
      setGeneratedPlan(data.nutritionPlan);
      setStats(data.stats);
      setStep("preview");
    } catch (e: any) {
      setError(e.message || t('generatePlan.unknownError'));
      setStep("calc");
    }
  }

  async function handleSave() {
    if (!generatedPlan) return;
    setStep("saving");
    try {
      const label = `AI diet — ${new Date().toLocaleDateString()}`;
      // Convert flat days array → weeks format expected by importFromAIParse
      let planToSave = generatedPlan;
      if (generatedPlan.days && !generatedPlan.weeks) {
        const weeksMap = new Map<number, any[]>();
        for (const day of generatedPlan.days) {
          const weekNum = day.week ?? 1;
          if (!weeksMap.has(weekNum)) weeksMap.set(weekNum, []);
          weeksMap.get(weekNum)!.push(day);
        }
        const weeks = Array.from(weeksMap.values());
        planToSave = { weeks, detected_weeks: weeks.length };
      }
      const plan = await NutritionPlanSvc.importFromAIParse(planToSave, label);
      await NutritionPlanSvc.activatePlan(plan.id);
      setStep("done");
      toast.success(t('generatePlan.dietSaved'));
      setTimeout(() => { onSaved(); handleClose(); }, 1400);
    } catch (e: any) {
      toast.error(t('generatePlan.saveFailed') + e.message);
      setStep("preview");
    }
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      setStep("welcome"); setGeneratedPlan(null); setStats(null); setError(null); setBurnPerDay({});
      setPersonal({ gender: "male", age: "", heightCm: "", weightKg: "", goal: "maintain" });
      setActivity({ level: "moderate", sports: [] });
    }, 400);
  }

  const WIZARD_STEPS: WizardStep[] = ["welcome", "personal", "activity", "calc"];
  const wizardIndex = WIZARD_STEPS.indexOf(step as any);
  // Flat 30-day array from API — falls back to old weeks[0] for backwards compatibility
  const allDays: any[] = generatedPlan?.days ?? generatedPlan?.weeks?.[0] ?? [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="fullpage"
          initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 32 }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          className="fixed inset-0 z-[9000] bg-background flex flex-col overflow-y-auto"
        >
          {/* ── Top bar ── */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border shrink-0 sticky top-0 bg-background z-10">
            <div className="flex items-center gap-[10px]">
              <div className="w-[38px] h-[38px] rounded-[11px] bg-primary flex items-center justify-center shrink-0">
                <Sparkles size={18} color="#fff" />
              </div>
              <div>
                <div className="font-bold text-base text-foreground leading-tight">{t('generatePlan.title')}</div>
                <div className="text-[0.72rem] text-gray-400">{t('generatePlan.ingredientsAvailable').replace('{n}', String(foods.length))}</div>
              </div>
            </div>
            {step !== "generating" && step !== "saving" && (
              <button onClick={handleClose} className="w-[34px] h-[34px] rounded-full border-none bg-gray-100 cursor-pointer flex items-center justify-center">
                <X size={16} color="#6b7280" />
              </button>
            )}
          </div>

          {/* ── Progress bar ── */}
          {wizardIndex >= 0 && (
            <div className="px-5 pt-[10px] shrink-0 bg-background">
              <div className="flex gap-[5px]">
                {WIZARD_STEPS.map((s, i) => (
                  <div key={s} className={`flex-1 h-[3px] rounded-sm transition-colors duration-300 ${i <= wizardIndex ? "bg-indigo-500" : "bg-gray-200"}`} />
                ))}
              </div>
            </div>
          )}

          {/* ── Body ── */}
          <div className="flex-1 px-5 pt-6 pb-10 max-w-[560px] mx-auto w-full box-border">
            <AnimatePresence mode="wait">

              {/* ══ WELCOME ══ */}
              {step === "welcome" && (
                <motion.div key="welcome" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  <div className="bg-primary/5 rounded-[20px] px-6 py-7 mb-5 text-center">
                    <div className="text-5xl mb-3">🥗</div>
                    <h2 className="m-0 mb-[10px] font-extrabold text-[1.35rem] text-primary">{t('generatePlan.welcomeTitle')}</h2>
                    <p className="m-0 text-[0.9rem] text-primary leading-relaxed">{t('generatePlan.welcomeSubtitle')}</p>
                  </div>

                  {/* Profile summary — shown when data was loaded from onboarding */}
                  {profileLoaded && personalValid && (
                    <div className="bg-green-50 border border-green-300 rounded-[14px] px-4 py-[14px] mb-4">
                      <div className="text-xs font-semibold text-green-800 mb-[10px] uppercase tracking-[0.04em]">
                        ✓ {t('generatePlan.profileSummaryTitle')}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-[1.15rem] font-bold text-green-800">{personal.age}</div>
                          <div className="text-[0.7rem] text-green-400">{t('generatePlan.age')}</div>
                        </div>
                        <div>
                          <div className="text-[1.15rem] font-bold text-green-800">{personal.heightCm} cm</div>
                          <div className="text-[0.7rem] text-green-400">{t('generatePlan.height')}</div>
                        </div>
                        <div>
                          <div className="text-[1.15rem] font-bold text-green-800">{personal.weightKg} kg</div>
                          <div className="text-[0.7rem] text-green-400">{t('generatePlan.weight')}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-yellow-50 border border-yellow-300 rounded-[14px] px-4 py-[14px] mb-5">
                    <div className="flex gap-[10px] items-start">
                      <span className="text-lg shrink-0">ℹ️</span>
                      <div>
                        <div className="font-bold text-[0.85rem] text-amber-800 mb-[6px]">{t('generatePlan.importantTitle')}</div>
                        <p className="m-0 text-[0.82rem] text-amber-900 leading-[1.65]">
                          {t('generatePlan.importantText')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {profileLoaded && personalValid ? (
                    <>
                      <button onClick={handleGenerate} className={`${btnPrimary} w-full mb-[10px]`}>
                        {t('generatePlan.generateDirect')} <ArrowRight size={18} />
                      </button>
                      <button onClick={() => setStep("personal")} className="w-full py-[11px] rounded-[13px] border-[1.5px] border-border bg-gray-50 cursor-pointer text-[0.85rem] text-foreground/60 font-medium">
                        {t('generatePlan.editProfile')}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setStep("personal")} className={`${btnPrimary} w-full`}>
                      {t('generatePlan.start')} <ArrowRight size={18} />
                    </button>
                  )}
                </motion.div>
              )}

              {/* ══ PERSONAL ══ */}
              {step === "personal" && (
                <motion.div key="personal" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  <h2 className="m-0 mb-1 font-extrabold text-[1.2rem] text-foreground">{t('generatePlan.personalTitle')}</h2>
                  <p className="m-0 mb-5 text-[0.83rem] text-gray-400">{t('generatePlan.personalSubtitle')}</p>

                  {/* Gender */}
                  <div className="mb-4">
                    <label className="text-[0.79rem] font-semibold text-foreground block mb-[7px]">{t('generatePlan.genderLabel')}</label>
                    <div className="flex gap-[10px]">
                      {([{ v: "male", l: t('generatePlan.male'), e: "👨" }, { v: "female", l: t('generatePlan.female'), e: "👩" }] as any[]).map(g => (
                        <button key={g.v} onClick={() => setPersonal(p => ({ ...p, gender: g.v }))}
                          className={`flex-1 py-[11px] px-2 rounded-[11px] border-2 ${personal.gender === g.v ? "border-indigo-500 bg-primary/10 text-primary" : "border-border bg-gray-50 text-foreground"} font-semibold text-[0.9rem] cursor-pointer flex items-center justify-center gap-[6px]`}
                        >{g.e} {g.l}</button>
                      ))}
                    </div>
                  </div>

                  {/* Age / Height / Weight */}
                  <div className="grid grid-cols-3 gap-[10px] mb-4">
                    {([
                      { f: "age", l: t('generatePlan.age'), u: t('generatePlan.yearUnit'), p: "30" },
                      { f: "heightCm", l: t('generatePlan.height'), u: "cm", p: "172" },
                      { f: "weightKg", l: t('generatePlan.weight'), u: "kg", p: "75" },
                    ] as any[]).map(({ f, l, u, p }) => (
                      <div key={f}>
                        <label className="text-[0.76rem] font-semibold text-foreground block mb-[5px]">{l}</label>
                        <div className="relative">
                          <input type="number" inputMode="numeric" value={(personal as any)[f]}
                            onChange={e => setPersonal(prev => ({ ...prev, [f]: e.target.value }))}
                            placeholder={p} className={`${inp} pr-[26px]`} />
                          <span className="absolute right-[9px] top-1/2 -translate-y-1/2 text-[0.7rem] text-gray-400">{u}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Goal */}
                  <div className="mb-6">
                    <label className="text-[0.79rem] font-semibold text-foreground block mb-2">{t('generatePlan.goalLabel')}</label>
                    <div className="flex flex-col gap-[7px]">
                      {([
                        { v: "loss", l: t('generatePlan.goalLoss'), d: t('generatePlan.goalLossDesc'), e: "📉" },
                        { v: "maintain", l: t('generatePlan.goalMaintain'), d: t('generatePlan.goalMaintainDesc'), e: "⚖️" },
                        { v: "gain", l: t('generatePlan.goalGain'), d: t('generatePlan.goalGainDesc'), e: "💪" },
                      ] as any[]).map(g => (
                        <button key={g.v} onClick={() => setPersonal(p => ({ ...p, goal: g.v }))}
                          className={`px-[13px] py-[11px] rounded-[11px] text-left border-2 ${personal.goal === g.v ? "border-indigo-500 bg-primary/10" : "border-border bg-gray-50"} cursor-pointer flex items-center gap-[11px]`}
                        >
                          <span className="text-xl">{g.e}</span>
                          <div>
                            <div className={`font-bold text-[0.88rem] ${personal.goal === g.v ? "text-primary" : "text-foreground"}`}>{g.l}</div>
                            <div className="text-[0.73rem] text-gray-400">{g.d}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setStep("welcome")} className={btnBack}><ArrowLeft size={17} color="#6b7280" /></button>
                    <button onClick={() => setStep("activity")} disabled={!personalValid}
                      className={`${btnPrimary} flex-1 ${!personalValid ? "opacity-50 cursor-not-allowed" : ""}`}>
                      {t('generatePlan.next')} <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ══ ACTIVITY ══ */}
              {step === "activity" && (
                <motion.div key="activity" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  <h2 className="m-0 mb-1 font-extrabold text-[1.2rem] text-foreground">{t('generatePlan.activityTitle')}</h2>
                  <p className="m-0 mb-[18px] text-[0.83rem] text-gray-400">{t('generatePlan.activitySubtitle')}</p>

                  {/* Activity level */}
                  <div className="mb-5">
                    <label className="text-[0.79rem] font-semibold text-foreground block mb-[9px]">{t('generatePlan.activityLevelLabel')}</label>
                    <div className="flex flex-col gap-[7px]">
                      {([
                        { v: "sedentary", l: t('generatePlan.actSedentary'), d: t('generatePlan.actSedentaryDesc'), e: "🪑" },
                        { v: "light", l: t('generatePlan.actLight'), d: t('generatePlan.actLightDesc'), e: "🚶" },
                        { v: "moderate", l: t('generatePlan.actModerate'), d: t('generatePlan.actModerateDesc'), e: "🏃" },
                        { v: "active", l: t('generatePlan.actActive'), d: t('generatePlan.actActiveDesc'), e: "⚡" },
                      ] as any[]).map(a => (
                        <button key={a.v} onClick={() => setActivity(p => ({ ...p, level: a.v }))}
                          className={`px-[13px] py-[10px] rounded-[11px] text-left border-2 ${activity.level === a.v ? "border-indigo-500 bg-primary/10" : "border-border bg-gray-50"} cursor-pointer flex items-center gap-[11px]`}
                        >
                          <span className="text-[19px]">{a.e}</span>
                          <div className="flex-1">
                            <div className={`font-bold text-[0.87rem] ${activity.level === a.v ? "text-primary" : "text-foreground"}`}>{a.l}</div>
                            <div className="text-[0.72rem] text-gray-400">{a.d}</div>
                          </div>
                          <span className={`text-[0.72rem] font-bold ${activity.level === a.v ? "text-indigo-500" : "text-gray-300"}`}>
                            ×{ACTIVITY_MULTIPLIERS[a.v as ActivityLevel]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sports section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-[10px]">
                      <div className="flex items-center gap-[7px]">
                        <Dumbbell size={15} color="#6366f1" />
                        <span className="font-bold text-[0.88rem] text-foreground">{t('generatePlan.sportSection')}</span>
                        <span className="text-[0.71rem] text-gray-400">{t('generatePlan.sportOptional')}</span>
                      </div>
                      <button onClick={addSport} className="flex items-center gap-[5px] py-[5px] px-[11px] rounded-full border-[1.5px] border-indigo-500 bg-primary/10 text-indigo-500 font-semibold text-[0.77rem] cursor-pointer">
                        <Plus size={13} /> {t('generatePlan.addSport')}
                      </button>
                    </div>

                    {activity.sports.length === 0 && (
                      <div className="text-center py-[14px] bg-gray-50 rounded-[11px] text-[0.8rem] text-gray-400">
                        {t('generatePlan.noSport')}
                      </div>
                    )}

                    <div className="flex flex-col gap-[10px]">
                      {activity.sports.map(sport => (
                        <div key={sport.id} className="border-[1.5px] border-border rounded-[13px] px-[14px] py-[13px]">
                          <div className="flex items-center gap-2 mb-[10px]">
                            <input
                              type="text"
                              value={sport.type}
                              onChange={e => updateSport(sport.id, { type: e.target.value })}
                              placeholder={t('generatePlan.sportPlaceholder')}
                              className={`${inp} flex-1`}
                            />
                            <button onClick={() => removeSport(sport.id)} className="w-8 h-8 rounded-lg border-[1.5px] border-red-200 bg-red-50 cursor-pointer flex items-center justify-center shrink-0">
                              <Trash2 size={14} color="#ef4444" />
                            </button>
                          </div>

                          {/* Day picker */}
                          <div className="mb-[10px]">
                            <div className="text-[0.73rem] font-semibold text-gray-500 mb-[6px]">{t('generatePlan.trainingDays')}</div>
                            <div className="flex gap-[5px]">
                              {(t('generatePlan.calDays') as unknown as string[]).map((label: string, idx: number) => {
                                const active = sport.days.includes(idx);
                                return (
                                  <button key={idx} onClick={() => toggleDay(sport.id, idx)}
                                    className={`flex-1 py-[5px] rounded-lg text-[0.73rem] font-bold border-[1.5px] ${active ? "border-indigo-500 bg-indigo-500 text-white" : "border-border bg-gray-50 text-gray-400"} cursor-pointer`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Duration */}
                          <div className="flex items-center gap-2">
                            <div className="text-[0.73rem] font-semibold text-gray-500 shrink-0">{t('generatePlan.trainingDuration')}</div>
                            <div className="relative w-[100px]">
                              <input
                                type="number" inputMode="numeric"
                                value={sport.minutesPerSession}
                                onChange={e => updateSport(sport.id, { minutesPerSession: e.target.value })}
                                placeholder="60"
                                className={`${inp} pr-[34px] w-full`}
                              />
                              <span className="absolute right-[9px] top-1/2 -translate-y-1/2 text-[0.7rem] text-gray-400">{t('generatePlan.minuteUnit')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setStep("personal")} className={btnBack}><ArrowLeft size={17} color="#6b7280" /></button>
                    <button onClick={() => setStep("calc")} className={`${btnPrimary} flex-1`}>
                      {t('generatePlan.calcButton')} <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ══ CALC ══ */}
              {step === "calc" && (
                <motion.div key="calc" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  <h2 className="m-0 mb-1 font-extrabold text-[1.2rem] text-foreground">{t('generatePlan.calorieCalcTitle')}</h2>
                  <p className="m-0 mb-[18px] text-[0.83rem] text-gray-400">{t('generatePlan.calorieCalcSubtitle')}</p>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-[10px] px-[14px] py-[10px] mb-[14px] text-[0.82rem] text-red-600">
                      ⚠️ {error}
                    </div>
                  )}

                  {/* Calorie cards */}
                  <div className="bg-primary/5 rounded-[18px] p-[18px] mb-3">
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { l: "BMR", v: bmr, d: t('generatePlan.bmrLabel') },
                        { l: "TDEE", v: tdee, d: t('generatePlan.tdeeLabel') },
                        { l: t('generatePlan.dailyGoal'), v: dailyTarget, d: { loss: t('generatePlan.goalLoss300'), maintain: t('generatePlan.goalMaintain0'), gain: t('generatePlan.goalGain300') }[personal.goal] },
                      ].map(({ l, v, d }) => (
                        <div key={l} className="bg-white/60 rounded-[11px] px-[6px] py-[9px] text-center">
                          <div className="text-[0.68rem] text-primary font-semibold mb-[2px]">{l}</div>
                          <div className="font-extrabold text-[1.15rem] text-primary">{v}</div>
                          <div className="text-[0.63rem] text-primary">{d}</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[0.7rem] text-primary font-semibold mb-[7px]">{t('generatePlan.mealDistribution')}</div>
                    {[{ l: t('generatePlan.mealBreakfast'), p: 25, c: "#f59e0b" }, { l: t('generatePlan.mealLunch'), p: 40, c: "#10b981" }, { l: t('generatePlan.mealDinner'), p: 35, c: "#6366f1" }].map(({ l, p, c }) => (
                      <div key={l} className="flex items-center gap-2 mb-[5px]">
                        <div className="w-[52px] text-[0.74rem] text-foreground font-medium">{l}</div>
                        <div className="flex-1 h-[6px] bg-white/50 rounded-[3px] overflow-hidden">
                          <div style={{ width: `${p}%`, background: c }} className="h-full rounded-[3px]" />
                        </div>
                        <div className="text-[0.74rem] text-foreground font-bold w-[54px] text-right">{Math.round(dailyTarget * p / 100)} kcal</div>
                      </div>
                    ))}
                  </div>

                  {/* Water intake */}
                  <div className="flex items-center gap-3 bg-primary/5 border-[1.5px] border-primary/30 rounded-[13px] px-[15px] py-3 mb-3">
                    <Droplets size={22} color="#0d9488" className="shrink-0" />
                    <div>
                      <div className="font-bold text-[0.88rem] text-primary">
                        {t('generatePlan.waterRecommendation').replace('{n}', String(waterL))}
                      </div>
                      <div className="text-xs text-blue-500 mt-[2px]">
                        {t('generatePlan.waterDetail').replace('{n}', personal.weightKg || "?")}
                        {activity.sports.some(s => s.days.length > 0) && ` ${t('generatePlan.waterExercise')}`}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-[11px] px-[13px] py-[11px] mb-4 text-[0.8rem] text-gray-400 leading-[1.7]">
                    {personal.gender === "male" ? t('generatePlan.genderSumMale') : t('generatePlan.genderSumFemale')} · {personal.age} {t('generatePlan.yearUnit')} · {personal.heightCm} cm · {personal.weightKg} kg
                    {" · "}{{ sedentary: t('generatePlan.actSumSedentary'), light: t('generatePlan.actSumLight'), moderate: t('generatePlan.actSumModerate'), active: t('generatePlan.actSumActive') }[activity.level]}
                    {activity.sports.filter(s => s.days.length > 0).map(s => {
                      const calDays = t('generatePlan.calDays') as unknown as string[];
                      return <span key={s.id}> · {s.type || "Sport"} {s.days.map(d => calDays[d]).join("/")} ({s.minutesPerSession || "?"}{t('generatePlan.minuteUnit')})</span>;
                    })}
                  </div>

                  {/* Ingredient chips */}
                  <div className="mb-[18px]">
                    <div className="text-[0.73rem] text-gray-400 font-semibold mb-[7px]">{t('generatePlan.ingredientsSection').replace('{n}', String(foods.length))}</div>
                    <div className="flex flex-wrap gap-[5px]">
                      {foods.slice(0, 24).map(f => (
                        <span key={f.id} className="bg-gray-100 rounded-full px-[9px] py-[3px] text-[0.76rem] text-foreground font-medium">{f.name}</span>
                      ))}
                      {foods.length > 24 && <span className="bg-gray-100 rounded-full px-[9px] py-[3px] text-[0.76rem] text-gray-400">{t('generatePlan.moreIngredients').replace('{n}', String(foods.length - 24))}</span>}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setStep("activity")} className={btnBack}><ArrowLeft size={17} color="#6b7280" /></button>
                    <button onClick={handleGenerate} disabled={foods.length === 0}
                      className={`${btnPrimary} flex-1 ${foods.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}>
                      <Sparkles size={17} /> {t('generatePlan.generateButton')}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ══ GENERATING ══ */}
              {step === "generating" && (
                <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <LoaderAnimation t={t} />
                </motion.div>
              )}

              {/* ══ PREVIEW — 30 days ══ */}
              {step === "preview" && allDays.length > 0 && (
                <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <h2 className="m-0 mb-[6px] font-extrabold text-[1.15rem] text-foreground">{t('generatePlan.previewTitle')}</h2>

                  {/* Stats */}
                  {stats && (
                    <div className="flex gap-2 mb-[18px]">
                      {[
                        { l: t('generatePlan.statsDays'), v: stats.days },
                        { l: t('generatePlan.statsMealsPerDay'), v: stats.meals_per_day },
                        { l: t('generatePlan.statsAvgCalories'), v: stats.avg_calories_per_day },
                      ].map(({ l, v }) => (
                        <div key={l} className="flex-1 bg-gray-50 rounded-[11px] px-[7px] py-[9px] text-center">
                          <div className="font-bold text-[1.1rem] text-foreground">{v}</div>
                          <div className="text-[0.68rem] text-gray-400">{l}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* All 30 days with week separators */}
                  <div className="flex flex-col gap-3 mb-6">
                    {allDays.map((day: any, di: number) => {
                      const dayTotal = (day.meals ?? []).reduce((s: number, m: any) => s + (m.total_calories ?? 0), 0);
                      const weekNum = day.week ?? Math.floor(di / 7) + 1;
                      const showWeekHeader = di % 7 === 0;
                      return (
                        <div key={di}>
                          {showWeekHeader && (
                            <div className="flex items-center gap-2 mt-2 mb-1">
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider px-2">
                                {weekNum}. {t('generatePlan.weekLabel') || 'hét'}
                              </span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                          )}
                          <div className="border-[1.5px] border-border rounded-[14px] overflow-hidden">
                            {/* Day header */}
                            <div className={`px-[14px] py-[10px] flex items-center justify-between border-b border-border ${day.is_training_day ? "bg-primary/10" : "bg-gray-50"}`}>
                              <div className="flex items-center gap-[7px]">
                                <span className="text-[0.68rem] font-semibold text-gray-400 shrink-0">{di + 1}.</span>
                                <span className={`font-extrabold text-[0.92rem] ${day.is_training_day ? "text-primary" : "text-foreground"}`}>
                                  {day.day_label ?? `${di + 1}. nap`}
                                </span>
                                {day.is_training_day && (
                                  <span className="bg-indigo-500 text-white text-[0.65rem] font-bold px-[7px] py-[2px] rounded-full">
                                    {t('generatePlan.trainingDayBadge')}
                                  </span>
                                )}
                                {day.is_training_day && (() => {
                                  const burn = burnPerDay[day.weekday_index ?? ((day.day - 1) % 7)] ?? 0;
                                  return burn > 0 ? (
                                    <span className={`text-[0.65rem] font-bold px-[7px] py-[2px] rounded-full ${
                                      burn > 500 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                      {t('generatePlan.burnBadge').replace('{n}', String(burn))}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                              <span className="text-[0.78rem] font-bold text-indigo-500">{dayTotal} kcal</span>
                            </div>
                            {/* Macro summary row */}
                            {(day.daily_protein != null) && (
                              <div className="flex gap-3 px-[14px] py-[6px] border-b border-gray-100 bg-gray-50/60 text-[0.68rem] text-gray-500">
                                <span>🥩 <strong className="text-gray-700">{day.daily_protein}g</strong> {t('generatePlan.macroProtein')}</span>
                                <span>🌾 <strong className="text-gray-700">{day.daily_carbs}g</strong> {t('generatePlan.macroCarbs')}</span>
                                <span>🥑 <strong className="text-gray-700">{day.daily_fat}g</strong> {t('generatePlan.macroFat')}</span>
                              </div>
                            )}
                            {/* Meals */}
                            <div>
                              {(day.meals ?? []).map((meal: any, mi: number) => (
                                <div key={mi} className={`px-[14px] py-[9px] flex items-center gap-[10px] ${mi < day.meals.length - 1 ? "border-b border-gray-100" : ""}`}>
                                  <span className="text-lg shrink-0">{MEAL_EMOJI[meal.meal_type] ?? "🍽️"}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[0.7rem] text-gray-400 font-semibold">{{ breakfast: t('generatePlan.mealBreakfast'), lunch: t('generatePlan.mealLunch'), dinner: t('generatePlan.mealDinner'), snack: t('generatePlan.mealSnack') }[meal.meal_type as string] ?? meal.meal_type}</div>
                                    <div className="text-[0.88rem] text-foreground font-bold truncate">{meal.name}</div>
                                  </div>
                                  <span className="bg-gray-100 rounded-lg px-[9px] py-[3px] text-[0.77rem] text-foreground font-bold shrink-0">
                                    {meal.total_calories} kcal
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 sticky bottom-0 pt-3 bg-background">
                    <button onClick={() => setStep("calc")}
                      className="flex-1 h-[50px] rounded-[14px] border-[1.5px] border-border bg-gray-50 cursor-pointer font-semibold text-[0.88rem] text-foreground flex items-center justify-center">
                      {t('generatePlan.regenerate')}
                    </button>
                    <button onClick={handleSave} className={`${btnPrimary} [flex:2]`}>
                      <Check size={16} /> {t('generatePlan.applyPlan')}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ══ SAVING ══ */}
              {step === "saving" && (
                <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
                  <motion.svg animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} width="48" height="48" className="block mx-auto mb-5">
                    <circle cx="24" cy="24" r="20" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                    <path d="M24 4 A20 20 0 0 1 44 24" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" fill="none" />
                  </motion.svg>
                  <p className="font-semibold text-foreground">{t('generatePlan.saving')}</p>
                </motion.div>
              )}

              {/* ══ DONE ══ */}
              {step === "done" && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="w-[72px] h-[72px] rounded-full bg-primary flex items-center justify-center mx-auto mb-5">
                    <Check size={32} color="#fff" strokeWidth={3} />
                  </motion.div>
                  <div className="font-extrabold text-[1.2rem] text-foreground mb-2">{t('generatePlan.saved')}</div>
                  <div className="text-[0.85rem] text-gray-400">{t('generatePlan.savedSubtext')}</div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
