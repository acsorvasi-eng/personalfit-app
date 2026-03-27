import { hapticFeedback } from '@/lib/haptics';
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { usePlanData, type MealOption } from "../../../hooks/usePlanData";
import { ChevronDown, Check, Clock, ChevronRight, ChevronLeft, UtensilsCrossed, Utensils, Trash2, Dumbbell, Moon, Waves, X, Flame, Zap, ArrowRightLeft, Sparkles, Settings } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
// DSMCoachMark removed — hints no longer used on this screen
import { DSMQuickLogSheet } from "../../../components/dsm/QuickLogSheet";
import { useLanguage, getLocaleDayNarrow, getLocaleMonth, getLocale } from "../../../contexts/LanguageContext";
import { translateFoodName } from "../../../utils/foodTranslations";
import { FoodImage } from "../../../components/FoodImage";
import { useCalorieTracker } from "../../../hooks/useCalorieTracker";
// getMealAlternatives removed — all data comes from uploaded plans only
import { motion, AnimatePresence } from "framer-motion";
import { WaterButton } from "../../../components/dsm";
import { useAppData } from "../../../hooks/useAppData";
import { EmptyState } from "../../../components/EmptyState";
import { DataUploadSheet } from "../../../components/DataUploadSheet";
import { GenerateMealPlanSheet } from "../../nutrition/components/GenerateMealPlanSheet";
import type { WorkoutScheduleMap } from "../../workout/components/WorkoutCalendar";
import { getMealSettings, getUserProfile, type MealSettings, type StoredUserProfile } from "../../../backend/services/UserProfileService";
import { RecipeOverlay } from './RecipeOverlay';
import { MealCard } from './MealCard';
import { getSetting, setSetting } from "../../../backend/services/SettingsService";
import { SleepService } from "../../../backend/services/SleepService";
import { WaterService } from "../../../backend/services/WaterService";
import { SNACKS, type SnackItem } from "../../../../i18n/snacks";
import type { LanguageCode } from "../../../contexts/LanguageContext";
import { ChefMessage } from "../../../components/ChefMessage";
import {
  runDaily,
  recordChefDecision,
} from "../../../backend/services/ChefService";
import { getRegionContext } from "../../../backend/services/ChefContextService";
import type { ChefPendingMessage } from "../../../../lib/chef-types";

interface LoggedMeal {
  id: string;
  name: string;
  type: 'product' | 'recipe';
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
  image: string;
}

// Day/month names are now locale-aware via getLocaleDayNarrow / getLocaleMonth from LanguageContext

// Default meal time windows (in minutes from midnight) — used when no meal settings
const DEFAULT_BREAKFAST_START = 6 * 60;
const DEFAULT_BREAKFAST_END = 8 * 60;
const DEFAULT_LUNCH_START = 12 * 60 + 30;
const DEFAULT_LUNCH_END = 13 * 60 + 30;
const DEFAULT_DINNER_START = 17 * 60 + 30;
const DEFAULT_DINNER_END = 18 * 60 + 30;

const BREAKFAST_START = DEFAULT_BREAKFAST_START;
const BREAKFAST_END = DEFAULT_BREAKFAST_END;
const LUNCH_START = DEFAULT_LUNCH_START;
const LUNCH_END = DEFAULT_LUNCH_END;
const DINNER_START = DEFAULT_DINNER_START;
const DINNER_END = DEFAULT_DINNER_END;

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function getCardSkin(
  now: Date,
  wakeTime: string,
  bedtime: string,
  isRestPeriod: boolean
): "rest" | "evening" | "morning" {
  const h = now.getHours();
  const m = now.getMinutes();
  const total = h * 60 + m;

  const [wH, wM] = (wakeTime || "07:00").split(":").map(Number);
  const wake = wH * 60 + wM;

  const [bH, bM] = (bedtime || "23:00").split(":").map(Number);
  const bed = bH * 60 + bM;

  if (total >= wake && total < wake + 45) return "morning";
  const eveningStart = bed - 120;
  if (total >= eveningStart && total < bed) return "evening";
  return "rest";
}

// ═══════════════════════════════════════════════════════════
// CalendarStrip: Compact elegant 7-day centered view
// ═══════════════════════════════════════════════════════════

async function loadWorkoutSchedule(): Promise<WorkoutScheduleMap> {
  try {
    const raw = await getSetting('workoutSchedule');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function getWeekdayType(
  date: Date,
  scheduleMap: WorkoutScheduleMap | undefined,
  hasPlanData: boolean
): 'training' | 'swim' | 'rest' | 'active' {
  // First check the workout schedule from the calendar planner
  if (scheduleMap) {
    const key = date.toISOString().split('T')[0];
    const planned = scheduleMap[key];
    if (planned && planned.length > 0) {
      const hasSwim = planned.some(w => w.sportCategory === 'Kardió' && w.sportId.startsWith('swimming'));
      if (hasSwim && planned.length === 1) return 'swim';
      return 'training';
    }
  }
  // If there is no active plan data at all (fresh app or after full reset),
  // treat every day as rest — no colored dots.
  if (!hasPlanData) return 'rest';

  // Fallback to static schedule from meal plan
  const jsDay = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const planDay = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon, ..., 6=Sun
  // Mon(0), Wed(2), Thu(3) = training | Fri(4) = swim | Sun(6) = active rest | rest otherwise
  if (planDay === 0 || planDay === 2 || planDay === 3) return 'training';
  if (planDay === 4) return 'swim';
  if (planDay === 6) return 'active';
  return 'rest';
}

function CalendarStrip({
  selectedDate,
  calendarMonth,
  calendarYear,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  scheduleMap = {},
  hasPlanData,
}: {
  selectedDate: Date;
  calendarMonth: number;
  calendarYear: number;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  scheduleMap?: WorkoutScheduleMap;
  hasPlanData: boolean;
}) {
  const { language, t } = useLanguage();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const todayLabel = t("calendar.today");

  // Generate 7 days centered on selected date
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + offset);
      result.push(d);
    }
    return result;
  }, [selectedDate]);

  const displayMonth = getLocaleMonth(selectedDate, language);
  const displayYear = selectedDate.getFullYear();

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const handleTodayClick = () => {
    onSelectDate(today);
  };

  const handleMonthHeaderClick = () => {
    setMonthPickerOpen(prev => !prev);
  };

  const handleMonthChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const [y, m] = e.target.value.split('-').map(Number);
    if (!Number.isNaN(y) && !Number.isNaN(m)) {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(y, m, Math.min(selectedDate.getDate(), 28));
      onSelectDate(newDate);
      setMonthPickerOpen(false);
    }
  };

  const monthOptions = useMemo(() => {
    const baseYear = today.getFullYear();
    const years = [baseYear - 1, baseYear, baseYear + 1];
    const months = Array.from({ length: 12 }, (_, i) => i);
    return years.flatMap(year =>
      months.map(month => ({
        value: `${year}-${month}`,
        label: `${getLocaleMonth(new Date(year, month, 1), language)} ${year}`,
      })),
    );
  }, [language, today]);

  const listRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="bg-background backdrop-blur-sm border-b border-border" role="region" aria-label={t("calendar.calendarView")}>
      {/* Month nav — subtle & elegant */}
      <div className="relative flex items-center justify-between px-5 py-2">
        <button onClick={onPrevMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors" aria-label={t("calendar.prevMonth")}>
          <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button
          type="button"
          onClick={handleMonthHeaderClick}
          className="min-w-[140px] flex items-center justify-center gap-1.5 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-live="polite"
          aria-atomic="true"
          aria-haspopup="listbox"
          aria-expanded={monthPickerOpen}
        >
          <span className="text-sm font-semibold text-gray-700 tracking-wide">
            {displayMonth} {displayYear}
          </span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          {!isSameDay(selectedDate, today) && (
            <button
              type="button"
              onClick={handleTodayClick}
              className="px-[12px] py-[4px] rounded-[20px] text-sm font-medium bg-[#f0f0f0] text-[#333333]"
            >
              {todayLabel}
            </button>
          )}
          <button onClick={onNextMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors" aria-label={t("calendar.nextMonth")}>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>

        {monthPickerOpen && (
          <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-20">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-lg px-3 py-2">
              <select
                className="bg-transparent text-sm text-gray-800 outline-none"
                value={`${calendarYear}-${calendarMonth}`}
                onChange={handleMonthChange}
              >
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Compact 7-day strip */}
      <div
        ref={listRef}
        className="flex items-center justify-around gap-2 px-3 pb-3"
        role="listbox"
        aria-label={t("calendar.weekDays")}
      >
        {days.map((date, idx) => {
          const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const isToday = dateStr === todayStr;
          const isSelected = isSameDay(date, selectedDate);
          const dayType = getWeekdayType(date, scheduleMap, hasPlanData);
          const dayNum = date.getDate();
          const dayShort = getLocaleDayNarrow(date, language);
          const isPast =
            date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isFuture =
            date > new Date(today.getFullYear(), today.getMonth(), today.getDate());

          return (
            <motion.button
              key={dateStr}
              onClick={() => onSelectDate(date)}
              role="option"
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${dayShort}, ${getLocaleMonth(date, language)} ${dayNum}${isToday ? ` (${t("calendar.today")})` : ''}${dayType === 'training' ? ` - ${t("calendar.trainingDay")}` : dayType === 'swim' ? ` - ${t("calendar.swimDay")}` : dayType === 'active' ? ` - ${t("calendar.activeRest")}` : ''}`}
              className={`flex-1 min-w-[52px] max-w-[60px] flex flex-col items-center py-2 px-2 rounded-full transition-all relative ${
                isSelected
                  ? 'bg-primary shadow-lg'
                  : isToday
                  ? 'bg-primary/10'
                  : 'hover:bg-gray-50'
              } ${isPast && !isSelected ? 'opacity-50' : ''} ${isFuture && !isSelected ? 'opacity-100' : ''}`}
              whileTap={{ scale: 0.93 }}
              layout
            >
              <span className={`text-sm font-medium mb-0.5 ${
                isSelected ? 'text-white/80' : 'text-gray-500'
              }`}>
                {dayShort}
              </span>
              <span className={`text-[15px] font-bold ${
                isSelected ? 'text-white' : isToday ? 'text-primary' : 'text-gray-800'
              }`}>
                {dayNum}
              </span>
              {/* Today dot */}
              {isToday && (
                <span className="w-1.5 h-1.5 rounded-full mt-1 bg-primary" />
              )}
              {/* Day type dot — only show for typed days */}
              {(dayType === 'training' || dayType === 'swim' || dayType === 'active') && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                  isSelected ? 'bg-white/70'
                    : dayType === 'training' ? 'bg-orange-400'
                    : dayType === 'swim' ? 'bg-cyan-400'
                    : 'bg-purple-400'
                }`} />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// UnifiedMenu: Main Component
// ═══════════════════════════════════════════════════════════

export function UnifiedMenu() {
  const { t, language, locale } = useLanguage();
  const navigate = useNavigate();
  const { target: calorieTarget } = useCalorieTracker();
  const appData = useAppData();
  const { planData, hasData: hasPlanData } = usePlanData();
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
  const [workoutScheduleMap, setWorkoutScheduleMap] = useState<WorkoutScheduleMap>({});
  const [chefMessage, setChefMessage] = useState<ChefPendingMessage | null>(null);

  useEffect(() => {
    loadWorkoutSchedule().then(setWorkoutScheduleMap);
    const sync = () => loadWorkoutSchedule().then(setWorkoutScheduleMap);
    window.addEventListener('storage', sync);
    window.addEventListener('workoutScheduleSync', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('workoutScheduleSync', sync);
    };
  }, []);

  // Listen for openUploadSheet event (from PlanSetupScreen PDF choice)
  useEffect(() => {
    const handleOpenUpload = () => setUploadSheetOpen(true);
    window.addEventListener('openUploadSheet', handleOpenUpload);
    return () => window.removeEventListener('openUploadSheet', handleOpenUpload);
  }, []);

  const now = new Date();
  const [currentTime, setCurrentTime] = useState(now);
  const [selectedDate, setSelectedDate] = useState(now);
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());

  const [selectedMeals, setSelectedMeals] = useState<Record<string, string>>({});
  const [checkedMeals, setCheckedMeals] = useState<Set<string>>(new Set());
  // expandedMealInDay removed — dialog replaces inline expansion
  const [loggedCalories, setLoggedCalories] = useState(0);
  const [loggedMealsForDay, setLoggedMealsForDay] = useState<LoggedMeal[]>([]);
  // selectionModeKey removed — dialog-based alt selection replaces long press
  const [windowFeedback, setWindowFeedback] = useState<string | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const currentMealRef = useRef<HTMLDivElement>(null);
  const restTimerRef = useRef<HTMLDivElement>(null);

  // ─── Snack consumption state (keyed by saved snack id: alma, dio, mandula, kivi, sargarepa) ──
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [consumedSnacks, setConsumedSnacks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getSetting('menuSelectedMeals').then((saved) => {
      if (saved) { try { setSelectedMeals(JSON.parse(saved)); } catch { /* ignore */ } }
    });
    getSetting('menuCheckedMeals').then((saved) => {
      if (saved) { try { setCheckedMeals(new Set(JSON.parse(saved))); } catch { /* ignore */ } }
    });
    getSetting(`snacks_${todayDateStr}`).then((saved) => {
      if (saved) { try { setConsumedSnacks(JSON.parse(saved)); } catch { /* ignore */ } }
    });
  }, [todayDateStr]);

  // Rest-period snacks by current language (from i18n/snacks)
  const snackList = useMemo(
    () => SNACKS[language as LanguageCode] ?? SNACKS.hu,
    [language]
  );
  const REST_SNACK_LABELS = useMemo(
    () => Object.fromEntries(snackList.map((s: SnackItem) => [s.id, s.name])),
    [snackList]
  );
  const REST_SNACK_KCAL = useMemo(
    () => Object.fromEntries(snackList.map((s: SnackItem) => [s.id, s.kcal])),
    [snackList]
  );
  const REST_SNACK_EMOJI = useMemo(
    () => Object.fromEntries(snackList.map((s: SnackItem) => [s.id, s.emoji])),
    [snackList]
  );

  const snackCalories = useMemo(() => {
    let total = 0;
    for (const [id, consumed] of Object.entries(consumedSnacks)) {
      if (consumed && REST_SNACK_KCAL[id] != null) total += REST_SNACK_KCAL[id];
    }
    return total;
  }, [consumedSnacks]);

  const handleSnackConsume = useCallback((snackId: string) => {
    setConsumedSnacks(prev => {
      const updated = { ...prev, [snackId]: !prev[snackId] };
      void setSetting(`snacks_${todayDateStr}`, JSON.stringify(updated));
      hapticFeedback('light');
      return updated;
    });
  }, [todayDateStr]);

  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      setAiPanelOpen(detail.open);
    };
    window.addEventListener('aiPanelStateChange', handler);
    return () => window.removeEventListener('aiPanelStateChange', handler);
  }, []);

  // Run Chef daily check on mount (once per calendar day, guarded inside runDaily)
  useEffect(() => {
    const runChef = async () => {
      try {
        // Collect recent meal names from loaded plan days
        const recentMealNames: string[] = [];
        for (const week of (planData ?? [])) {
          for (const day of (week.days ?? [])) {
            const allMeals = [...(day.breakfast ?? []), ...(day.lunch ?? []), ...(day.dinner ?? []), ...(day.snack ?? [])];
            for (const meal of allMeals) {
              if (meal.name) recentMealNames.push(meal.name);
            }
          }
          if (recentMealNames.length >= 21) break;
        }

        const profile = await getUserProfile().catch(() => null);
        const regionCtx = await getRegionContext(language).catch(() => null);
        const pending = await runDaily({
          recentMealNames: recentMealNames.slice(0, 21),
          userName: profile?.name ?? '',
          language: language ?? 'hu',
          region: regionCtx?.region ?? null,
          cultureWeights: regionCtx?.cultureWeights ?? {},
        });

        if (pending) setChefMessage(pending);
      } catch {
        // Chef errors are never user-visible
      }
    };

    runChef();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally no deps — run only on mount

  const [userProfile, setUserProfile] = useState<StoredUserProfile | null>(null);
  useEffect(() => {
    getUserProfile().then(setUserProfile).catch(() => {});
  }, []);

  const [mealSettings, setMealSettings] = useState<MealSettings | null>(null);
  useEffect(() => {
    getMealSettings().then((settings) => {
      setMealSettings(settings);
    });
    const onUpdated = () =>
      getMealSettings().then((settings) => {
        setMealSettings(settings);
      });
    window.addEventListener("mealSettingsUpdated", onUpdated);
    return () => window.removeEventListener("mealSettingsUpdated", onUpdated);
  }, []);

  const [sleepData, setSleepData] = useState<{
    wakeTime: string;
    bedtime: string;
    cycles: number;
    firstMeal: string;
    lastMeal: string;
    workoutWindow: string;
    score: number;
    calorieAdj: number;
  } | null>(null);
  useEffect(() => {
    SleepService.analyzeSleep().then((a) => {
      if (!a) return;
      const bt =
        a.recommendedBedtimes.find((o) => o.cycleCount === a.selectedCycles)?.bedtime ?? "23:00";
      setSleepData({
        wakeTime: a.recommendedBedtimes[0]?.wakeTime ?? "07:00",
        bedtime: bt,
        cycles: a.selectedCycles,
        firstMeal: a.firstMealTime,
        lastMeal: a.lastMealTime,
        workoutWindow: a.optimalWorkoutWindow,
        score: a.circadianScore,
        calorieAdj: a.dailyCalorieAdjustment,
      });
    });
  }, []);

  const [cardSkin, setCardSkin] = useState<"rest" | "evening" | "morning">("rest");
  useEffect(() => {
    const update = () => {
      if (sleepData) {
        setCardSkin(
          getCardSkin(new Date(), sleepData.wakeTime, sleepData.bedtime, true)
        );
      }
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [sleepData]);

  const skinStyles = useMemo(
    () => ({
      rest: {
        background: "rgba(219,234,254,0.8)",
        color: "#1e3a5f",
      },
      evening: {
        background: "linear-gradient(135deg, #0f172a, #1e1b4b)",
        color: "white",
      },
      morning: {
        background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
        color: "#92400e",
      },
    }),
    []
  );

  const [waterTotal, setWaterTotal] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2500);
  useEffect(() => {
    WaterService.getTodayTotal().then(setWaterTotal);
    getUserProfile().then((p) => {
      if (p?.weight && p.weight > 0) setWaterGoal(Math.round(p.weight * 35));
    });
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ total: number }>).detail;
      if (detail?.total != null) setWaterTotal(detail.total);
    };
    window.addEventListener("waterUpdated", handler);
    return () => window.removeEventListener("waterUpdated", handler);
  }, []);
  const handleWaterPress = useCallback(async () => {
    const next = waterTotal + 250;
    setWaterTotal(next);
    try {
      const saved = await WaterService.addWater(250);
      setWaterTotal(saved);
      window.dispatchEvent(new CustomEvent("waterUpdated", { detail: { total: saved } }));
    } catch {
      setWaterTotal(waterTotal);
    }
  }, [waterTotal]);

  // Swipe state
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Load logged calories
  useEffect(() => {
    const update = async () => {
      const stored = await getSetting("totalConsumedCalories");
      setLoggedCalories(stored ? parseInt(stored) : 0);
    };
    update();
    window.addEventListener("storage", update);
    const interval = setInterval(update, 2000);
    return () => { window.removeEventListener("storage", update); clearInterval(interval); };
  }, []);

  // Load logged meals for selected date
  useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const load = async () => {
      const stored = await getSetting(`loggedMeals_${dateStr}`);
      if (stored) { try { setLoggedMealsForDay(JSON.parse(stored)); } catch { setLoggedMealsForDay([]); } }
      else setLoggedMealsForDay([]);
    };
    load();
    window.addEventListener("storage", load);
    const interval = setInterval(load, 2000);
    return () => { window.removeEventListener("storage", load); clearInterval(interval); };
  }, [selectedDate]);

  // ─── Day navigation helpers ────────────────────────────────
  const goToDay = useCallback((date: Date) => {
    setSelectedDate(date);
    setCalendarMonth(date.getMonth());
    setCalendarYear(date.getFullYear());
  }, []);

  const goToPrevDay = useCallback(() => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSwipeDir('right');
    goToDay(prev);
  }, [selectedDate, goToDay]);

  const goToNextDay = useCallback(() => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSwipeDir('left');
    goToDay(next);
  }, [selectedDate, goToDay]);

  // Reset animation direction after transition
  useEffect(() => {
    if (swipeDir) {
      const t = setTimeout(() => setSwipeDir(null), 350);
      return () => clearTimeout(t);
    }
  }, [swipeDir]);

  // ─── Swipe handling ────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger if horizontal swipe is dominant and > 60px
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goToNextDay();
      else goToPrevDay();
    }
  }, [goToNextDay, goToPrevDay]);

  // ─── Month navigation — jumps selectedDate by ±1 month ───
  const goToPrevMonth = useCallback(() => {
    const prev = new Date(selectedDate);
    prev.setMonth(prev.getMonth() - 1);
    goToDay(prev);
  }, [selectedDate, goToDay]);
  const goToNextMonth = useCallback(() => {
    const next = new Date(selectedDate);
    next.setMonth(next.getMonth() + 1);
    goToDay(next);
  }, [selectedDate, goToDay]);

  // ─── Meal logic ────────────────────────────────────────────
  const calculateWeekAndDay = (date: Date) => {
    // Map actual weekday: 0=Mon, 1=Tue, ..., 6=Sun
    const jsDay = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const day = jsDay === 0 ? 6 : jsDay - 1;

    // Calculate plan week based on Monday-aligned weeks within month
    const dayOfMonth = date.getDate();
    const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstDayJS = firstOfMonth.getDay();
    const firstMonday = firstDayJS <= 1 ? (2 - firstDayJS) : (9 - firstDayJS);

    let week: number;
    if (dayOfMonth < firstMonday) {
      week = 0; // Days before first Monday use week 0
    } else {
      week = Math.floor((dayOfMonth - firstMonday) / 7);
    }
    week = week % 4;

    return { week, day };
  };

  const getMealStatus = (date: Date) => {
    const todayDate = new Date();
    const isToday = date.getDate() === todayDate.getDate() &&
      date.getMonth() === todayDate.getMonth() &&
      date.getFullYear() === todayDate.getFullYear();

    if (!isToday) {
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const todayOnly = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
      const isPast = dateOnly < todayOnly;
      return {
        currentMeal: null, canCheckBreakfast: false, canCheckLunch: false, canCheckDinner: false,
        breakfastPassed: isPast, lunchPassed: isPast, dinnerPassed: isPast,
        isInEatingWindow: false, nextMealTime: null, restingTimeMinutes: 0, nextMealLabel: null, totalRestMinutes: 0,
        isToday: false, isPast, isFuture: !isPast
      };
    }

    const currentHour = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinutes;

    const count = mealSettings?.mealCount ?? 3;
    const isIF = mealSettings?.mealModel === 'if16_8' || mealSettings?.mealModel === 'if18_6';
    const mealsList = mealSettings?.meals?.length ? mealSettings.meals : [
      { name: 'Reggeli', startTime: '06:00', endTime: '08:00' },
      { name: 'Ebéd', startTime: '12:30', endTime: '13:30' },
      { name: 'Vacsora', startTime: '17:30', endTime: '18:30' },
    ];
    let BREAKFAST_START: number, BREAKFAST_END: number, LUNCH_START: number, LUNCH_END: number, DINNER_START: number, DINNER_END: number;
    if (isIF && count <= 1 && mealsList.length >= 1) {
      // IF mode: single eating window split into lunch + dinner halves
      const w = mealsList[0];
      const wStart = parseTimeToMinutes(w.startTime);
      const wEnd = parseTimeToMinutes(w.endTime);
      const mid = wStart + Math.floor((wEnd - wStart) / 2);
      BREAKFAST_START = wStart; BREAKFAST_END = wStart; // no breakfast in IF
      LUNCH_START = wStart; LUNCH_END = mid;
      DINNER_START = mid; DINNER_END = wEnd;
    } else if (count === 1 && mealsList.length >= 1) {
      const m = mealsList[0];
      BREAKFAST_START = parseTimeToMinutes(m.startTime);
      BREAKFAST_END = parseTimeToMinutes(m.endTime);
      LUNCH_START = BREAKFAST_END; LUNCH_END = BREAKFAST_END;
      DINNER_START = BREAKFAST_END; DINNER_END = BREAKFAST_END;
    } else if (count === 2 && mealsList.length >= 2) {
      BREAKFAST_START = parseTimeToMinutes(mealsList[0].startTime);
      BREAKFAST_END = parseTimeToMinutes(mealsList[0].endTime);
      LUNCH_START = BREAKFAST_END; LUNCH_END = BREAKFAST_END;
      DINNER_START = parseTimeToMinutes(mealsList[1].startTime);
      DINNER_END = parseTimeToMinutes(mealsList[1].endTime);
    } else if (count === 5 && mealsList.length >= 5) {
      BREAKFAST_START = parseTimeToMinutes(mealsList[0].startTime);
      BREAKFAST_END = parseTimeToMinutes(mealsList[0].endTime);
      LUNCH_START = parseTimeToMinutes(mealsList[2].startTime);
      LUNCH_END = parseTimeToMinutes(mealsList[2].endTime);
      DINNER_START = parseTimeToMinutes(mealsList[4].startTime);
      DINNER_END = parseTimeToMinutes(mealsList[4].endTime);
    } else if (count >= 3 && mealsList.length >= 3) {
      BREAKFAST_START = parseTimeToMinutes(mealsList[0].startTime);
      BREAKFAST_END = parseTimeToMinutes(mealsList[0].endTime);
      LUNCH_START = parseTimeToMinutes(mealsList[1].startTime);
      LUNCH_END = parseTimeToMinutes(mealsList[1].endTime);
      DINNER_START = parseTimeToMinutes(mealsList[2].startTime);
      DINNER_END = parseTimeToMinutes(mealsList[2].endTime);
    } else {
      BREAKFAST_START = DEFAULT_BREAKFAST_START; BREAKFAST_END = DEFAULT_BREAKFAST_END;
      LUNCH_START = DEFAULT_LUNCH_START; LUNCH_END = DEFAULT_LUNCH_END;
      DINNER_START = DEFAULT_DINNER_START; DINNER_END = DEFAULT_DINNER_END;
    }

    const breakfastPassed = currentTimeInMinutes > BREAKFAST_END;
    const lunchPassed = currentTimeInMinutes > LUNCH_END;
    const dinnerPassed = currentTimeInMinutes > DINNER_END;

    const hasBreakfast = !isIF || count > 1; // IF mode has no breakfast slot
    const inBreakfastWindow = hasBreakfast && currentTimeInMinutes >= BREAKFAST_START && currentTimeInMinutes <= BREAKFAST_END;
    const inLunchWindow = (isIF || (count !== 1 && count !== 2)) && currentTimeInMinutes >= LUNCH_START && currentTimeInMinutes <= LUNCH_END;
    const inDinnerWindow = (isIF || count !== 1) && currentTimeInMinutes >= DINNER_START && currentTimeInMinutes <= DINNER_END;
    const isInEatingWindow = inBreakfastWindow || inLunchWindow || inDinnerWindow;

    let currentMeal: string | null = null;
    let nextMealTime: number | null = null;
    let restingTimeMinutes = 0;

    if (inBreakfastWindow) currentMeal = "breakfast";
    else if (inLunchWindow) currentMeal = "lunch";
    else if (inDinnerWindow) currentMeal = "dinner";
    else if (hasBreakfast && !breakfastPassed) { currentMeal = "breakfast"; nextMealTime = BREAKFAST_START; restingTimeMinutes = BREAKFAST_START - currentTimeInMinutes; }
    else if ((isIF || (count !== 1 && count !== 2)) && !lunchPassed) { currentMeal = "lunch"; nextMealTime = LUNCH_START; restingTimeMinutes = LUNCH_START - currentTimeInMinutes; }
    else if (!dinnerPassed) { currentMeal = "dinner"; nextMealTime = DINNER_START; restingTimeMinutes = DINNER_START - currentTimeInMinutes; }
    else { restingTimeMinutes = (24 * 60 - currentTimeInMinutes) + LUNCH_START; currentMeal = isIF ? "lunch" : "breakfast"; nextMealTime = isIF ? LUNCH_START : BREAKFAST_START; }

    const totalRestMinutes =
      currentMeal === "breakfast" ? (count === 1 && !isIF ? 24 * 60 - (BREAKFAST_END - BREAKFAST_START) : LUNCH_START - BREAKFAST_END)
      : currentMeal === "lunch" ? DINNER_START - LUNCH_END
      : currentMeal === "dinner" ? (isIF ? 24 * 60 - DINNER_END + LUNCH_START : 24 * 60 - DINNER_END + BREAKFAST_START)
      : 0;
    const nextMealLabel =
      currentMeal === "breakfast" ? "lunch"
      : currentMeal === "lunch" ? "dinner"
      : currentMeal === "dinner" ? (isIF ? "lunch" : "breakfast")
      : null;

    return {
      currentMeal, canCheckBreakfast: inBreakfastWindow, canCheckLunch: inLunchWindow, canCheckDinner: inDinnerWindow,
      breakfastPassed, lunchPassed, dinnerPassed, isInEatingWindow, nextMealTime, restingTimeMinutes, nextMealLabel, totalRestMinutes,
      isToday: true, isPast: false, isFuture: false
    };
  };

  const removeLoggedMeal = (mealId: string) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const updated = loggedMealsForDay.filter(m => m.id !== mealId);
    setLoggedMealsForDay(updated);
    void setSetting(`loggedMeals_${dateStr}`, JSON.stringify(updated));
    const newTotal = updated.reduce((sum, m) => sum + m.calories, 0);
    void setSetting('totalConsumedCalories', newTotal.toString());
    setLoggedCalories(newTotal);
  };

  const getLoggedMealsForSlot = (slot: 'after-breakfast' | 'after-lunch' | 'after-dinner') => {
    return loggedMealsForDay.filter(meal => {
      const mealDate = new Date(meal.timestamp);
      const mealMinutes = mealDate.getHours() * 60 + mealDate.getMinutes();
      switch (slot) {
        case 'after-breakfast': return mealMinutes >= 0 && mealMinutes < LUNCH_START;
        case 'after-lunch': return mealMinutes >= LUNCH_START && mealMinutes < DINNER_START;
        case 'after-dinner': return mealMinutes >= DINNER_START;
        default: return false;
      }
    });
  };

  const handleMealSelect = (mealId: string, mealType: string, dayKey: string) => {
    const key = `${dayKey}-${mealType}`;
    const updated = { ...selectedMeals, [key]: mealId };
    setSelectedMeals(updated);
    void setSetting('menuSelectedMeals', JSON.stringify(updated));
  };

  const handleMealCheck = (mealId: string, date: Date, mealType: string) => {
    const status = getMealStatus(date);
    if (!status.isToday) return;

    hapticFeedback('light');
    setCheckedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) newSet.delete(mealId); else newSet.add(mealId);
      void setSetting('menuCheckedMeals', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  // toggleMealExpansion removed — dialog replaces inline expansion

  // enterSelectionMode removed — dialog replaces long press selection

  // ─── Calories ──────────────────────────────────────────────
  const totalCalories = useMemo(() => {
    return Array.from(checkedMeals).reduce((sum, mealId) => {
      // Search all uploaded plan data for the checked meal (no hardcoded alternatives)
      for (const week of planData) {
        for (const day of week.days) {
          const allMeals = [...day.breakfast, ...day.lunch, ...day.dinner, ...(day.snack || [])];
          const meal = allMeals.find(m => m.id === mealId);
          if (meal) return sum + (parseInt(meal.calories.replace(/[^0-9]/g, "")) || 0);
        }
      }
      return sum;
    }, 0);
  }, [checkedMeals, planData]);

  // ─── Sport Calories for Today ─────────────────────────────
  const [sportCaloriesToday, setSportCaloriesToday] = useState(0);
  const todayIsTrainingDay = useMemo(() => {
    const jsDay = new Date().getDay();
    const planDay = jsDay === 0 ? 6 : jsDay - 1;
    return planData[0]?.days[planDay]?.isTrainingDay ?? false;
  }, [planData]);

  useEffect(() => {
    const loadSportCal = async () => {
      try {
        const wd = await getSetting('workoutTracking');
        if (wd) {
          const data = JSON.parse(wd);
          const todayStr = new Date().toISOString().split('T')[0];
          setSportCaloriesToday(data[todayStr]?.totalCalories || 0);
        } else {
          setSportCaloriesToday(0);
        }
      } catch { setSportCaloriesToday(0); }
    };
    loadSportCal();
    window.addEventListener('storage', loadSportCal);
    const iv = setInterval(loadSportCal, 3000);
    return () => { window.removeEventListener('storage', loadSportCal); clearInterval(iv); };
  }, []);

  // ─── Dynamic Calorie Card ─────────────────────────────────
  const consumedToday = totalCalories + loggedCalories + snackCalories;
  const sportBonus = todayIsTrainingDay ? sportCaloriesToday : 0;
  const effectiveBudget = calorieTarget + sportBonus;
  const calorieRatio = effectiveBudget > 0 ? consumedToday / effectiveBudget : 0;
  const calorieRemaining = effectiveBudget - consumedToday;

  const calorieCardBgClass = useMemo(() => {
    if (calorieRatio >= 1) return 'bg-red-500/40 border-red-300/50';
    if (calorieRatio >= 0.9) return 'bg-orange-500/35 border-orange-300/40';
    if (calorieRatio >= 0.75) return 'bg-amber-500/30 border-amber-300/35';
    return '';
  }, [calorieRatio]);

  const calorieCardLabel = useMemo(() => {
    if (todayIsTrainingDay && sportBonus > 0) {
      return `${calorieTarget} + ${sportBonus} 🏋️ kcal`;
    }
    return `${effectiveBudget} kcal`;
  }, [calorieTarget, todayIsTrainingDay, sportBonus, effectiveBudget]);

  // ─── Selected Day Data ─────────────────────────────────────
  const dayOfMonth = selectedDate.getDate();
  const mealData = calculateWeekAndDay(selectedDate);
  const dayMeals = planData[mealData.week]?.days[mealData.day];
  const status = getMealStatus(selectedDate);
  const dayKey = `day-${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${dayOfMonth}`;

  // Auto-scroll to active zone: rest timer (if resting) or current meal card (if eating)
  const currentMealType = status.isToday ? status.currentMeal : null;
  const isEating = status.isToday && status.isInEatingWindow;
  const isResting = status.isToday && !status.isInEatingWindow;
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isResting && restTimerRef.current) {
        // During rest period, scroll so the timer card is visible without manual scrolling
        restTimerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (currentMealRef.current) {
        currentMealRef.current.scrollIntoView({ behavior: 'smooth', block: isEating ? 'start' : 'center' });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [selectedDate, currentMealType, isEating, isResting]);

  // Check workout schedule from calendar planner for overrides
  const menuScheduleMap = workoutScheduleMap;
  const selectedDateKey = selectedDate.toISOString().split('T')[0];
  const scheduledWorkouts = menuScheduleMap[selectedDateKey] || [];
  const hasScheduledWorkout = scheduledWorkouts.length > 0;

  const isTrainingDay = hasScheduledWorkout ? true : (dayMeals?.isTrainingDay ?? false);
  const dayLabel = hasScheduledWorkout
    ? scheduledWorkouts.map(w => w.sportName).join(' + ')
    : (dayMeals?.dayLabel ?? (isTrainingDay ? t("menu.trainingDay") : t("menu.restDay")));
  const isSwimDay = hasScheduledWorkout
    ? scheduledWorkouts.some(w => w.sportId.startsWith('swimming'))
    : dayLabel.includes('Úszás') || dayLabel.toLowerCase().includes('swim') || dayLabel.toLowerCase().includes('înot');

  // Alternatives come from the uploaded plan (non-primary meals) — no hardcoded data
  const breakfastAlternatives: MealOption[] = (dayMeals?.breakfast || []).slice(1);
  const lunchAlternatives: MealOption[] = (dayMeals?.lunch || []).slice(1);
  const dinnerAlternatives: MealOption[] = (dayMeals?.dinner || []).slice(1);

  const findSelectedMeal = (key: string, primaryMeals: any[], alternatives: MealOption[]) => {
    const selectedId = selectedMeals[key];
    if (!selectedId) return primaryMeals?.[0];
    const allPool = [...(primaryMeals || []), ...alternatives];
    return allPool.find(m => m.id === selectedId) || primaryMeals?.[0];
  };

  const selectedBreakfast = findSelectedMeal(`${dayKey}-breakfast`, dayMeals?.breakfast || [], breakfastAlternatives);
  const selectedLunch = findSelectedMeal(`${dayKey}-lunch`, dayMeals?.lunch || [], lunchAlternatives);
  const selectedDinner = findSelectedMeal(`${dayKey}-dinner`, dayMeals?.dinner || [], dinnerAlternatives);

  const canEditBreakfast = status.isFuture || (status.isToday && !status.breakfastPassed);
  const canEditLunch = status.isFuture || (status.isToday && !status.lunchPassed);
  const canEditDinner = status.isFuture || (status.isToday && !status.dinnerPassed);

  const breakfastConsumed = selectedBreakfast && checkedMeals.has(selectedBreakfast.id);
  const lunchConsumed = selectedLunch && checkedMeals.has(selectedLunch.id);
  const dinnerConsumed = selectedDinner && checkedMeals.has(selectedDinner.id);

  const mc = mealSettings?.mealCount ?? 3;
  const ms = mealSettings?.meals ?? [];
  const isIFModel = mealSettings?.mealModel === 'if16_8' || mealSettings?.mealModel === 'if18_6';

  // Build meal slot list dynamically from settings.
  // IF mode: even though settings has a single "Eating window", the plan
  // generates lunch + dinner within that window. We split the single window
  // into two visible slots so both meals are displayed.
  // Standard mode: first meal → breakfast, last → dinner, middle → lunch.
  // For 3+ meals: the middle meal (floor(count/2)) → lunch plan data.
  // All others → snack info rows (time only, no plan meal data).
  let mealSlots: Array<{
    type: string;
    title: string;
    time: string;
    icon: string;
    meals: MealOption[];
    selected: MealOption | undefined;
    alternatives: MealOption[];
    primary: MealOption | undefined;
    consumed: boolean | undefined;
    canEdit: boolean;
    canCheck: boolean;
    isPassed: boolean;
    isSnack: boolean;
  }>;

  if (isIFModel && mc <= 1) {
    // IF mode: show two slots (lunch + dinner) within the eating window.
    // Handles both new plans (lunch+dinner) and legacy plans (breakfast+lunch+dinner)
    // by checking which plan data arrays actually have meals.
    const window = ms[0] || { name: 'Eating window', startTime: '12:00', endTime: '20:00' };
    const windowStart = parseTimeToMinutes(window.startTime);
    const windowEnd = parseTimeToMinutes(window.endTime);
    const midpoint = windowStart + Math.floor((windowEnd - windowStart) / 2);
    const midHH = String(Math.floor(midpoint / 60)).padStart(2, '0');
    const midMM = String(midpoint % 60).padStart(2, '0');
    const midTime = `${midHH}:${midMM}`;

    // Determine first slot data: prefer lunch (new IF plans), fall back to breakfast (legacy plans)
    const firstSlotMeals = (dayMeals?.lunch?.length ? dayMeals.lunch : dayMeals?.breakfast) || [];
    const firstSlotSelected = dayMeals?.lunch?.length ? selectedLunch : selectedBreakfast;
    const firstSlotAlts = dayMeals?.lunch?.length ? lunchAlternatives : breakfastAlternatives;
    const firstSlotConsumed = dayMeals?.lunch?.length ? lunchConsumed : breakfastConsumed;
    const firstSlotCanEdit = dayMeals?.lunch?.length ? canEditLunch : canEditBreakfast;
    const firstSlotCanCheck = dayMeals?.lunch?.length ? status.canCheckLunch : status.canCheckBreakfast;
    const firstSlotPassed = dayMeals?.lunch?.length ? status.lunchPassed : status.breakfastPassed;
    const firstSlotType = dayMeals?.lunch?.length ? 'lunch' : 'breakfast';

    mealSlots = [
      {
        type: firstSlotType,
        title: t("menu.lunch"),
        time: `${window.startTime} - ${midTime}`,
        icon: '☀️',
        meals: firstSlotMeals,
        selected: firstSlotSelected,
        alternatives: firstSlotAlts,
        primary: firstSlotMeals[0],
        consumed: firstSlotConsumed,
        canEdit: firstSlotCanEdit,
        canCheck: firstSlotCanCheck,
        isPassed: firstSlotPassed,
        isSnack: false,
      },
      {
        type: 'dinner',
        title: t("menu.dinner"),
        time: `${midTime} - ${window.endTime}`,
        icon: '🌙',
        meals: dayMeals?.dinner || [],
        selected: selectedDinner,
        alternatives: dinnerAlternatives,
        primary: dayMeals?.dinner?.[0],
        consumed: dinnerConsumed,
        canEdit: canEditDinner,
        canCheck: status.canCheckDinner,
        isPassed: status.dinnerPassed,
        isSnack: false,
      },
    ];
  } else {
    const lunchIdx = mc >= 3 ? Math.floor(mc / 2) : -1;
    const rawSlots = ms.length > 0 ? ms : [
      { name: t("menu.breakfast"), startTime: '06:00', endTime: '08:00' },
      { name: t("menu.lunch"),     startTime: '12:30', endTime: '13:30' },
      { name: t("menu.dinner"),    startTime: '17:30', endTime: '18:30' },
    ];
    mealSlots = rawSlots.map((m, i) => {
      const isFirst = i === 0;
      const isLast  = i === rawSlots.length - 1;
      const isLunch = i === lunchIdx && !isFirst && !isLast;
      const timeStr = `${m.startTime} - ${m.endTime}`;
      const icon    = isFirst ? '🌅' : isLast ? '🌙' : '☀️';
      if (isFirst) return { type: 'breakfast' as const, title: m.name, time: timeStr, icon, meals: dayMeals?.breakfast || [], selected: selectedBreakfast, alternatives: breakfastAlternatives, primary: dayMeals?.breakfast?.[0], consumed: breakfastConsumed, canEdit: canEditBreakfast, canCheck: status.canCheckBreakfast, isPassed: status.breakfastPassed, isSnack: false };
      if (isLast)  return { type: 'dinner'    as const, title: m.name, time: timeStr, icon, meals: dayMeals?.dinner    || [], selected: selectedDinner,    alternatives: dinnerAlternatives,    primary: dayMeals?.dinner?.[0],    consumed: dinnerConsumed,    canEdit: canEditDinner,    canCheck: status.canCheckDinner,    isPassed: status.dinnerPassed,    isSnack: false };
      if (isLunch) return { type: 'lunch'     as const, title: m.name, time: timeStr, icon, meals: dayMeals?.lunch     || [], selected: selectedLunch,     alternatives: lunchAlternatives,     primary: dayMeals?.lunch?.[0],     consumed: lunchConsumed,     canEdit: canEditLunch,     canCheck: status.canCheckLunch,     isPassed: status.lunchPassed,     isSnack: false };
      return { type: `snack_${i}` as any, title: m.name, time: timeStr, icon, meals: [], selected: undefined, alternatives: [], primary: undefined, consumed: false, canEdit: false, canCheck: false, isPassed: false, isSnack: true };
    });
  }

  const loggedSlotMap = { breakfast: 'after-breakfast' as const, lunch: 'after-lunch' as const, dinner: 'after-dinner' as const };

  // All meals across the entire week plan (for gastro rules in RecipeOverlay)
  const weekMeals: MealOption[] = useMemo(() => {
    const meals: MealOption[] = [];
    for (const week of planData) {
      for (const day of week.days) {
        meals.push(...day.breakfast, ...day.lunch, ...day.dinner, ...(day.snack || []));
      }
    }
    return meals;
  }, [planData]);

  // All meals for the currently selected day
  const todayMeals: MealOption[] = useMemo(() => {
    if (!dayMeals) return [];
    return [...dayMeals.breakfast, ...dayMeals.lunch, ...dayMeals.dinner, ...(dayMeals.snack || [])];
  }, [dayMeals]);

  // ─── Render ────────────────────────────────────────────────
 
  // Speciális „üres menü” layout: aktív naptár + víz + három étkezés-kártya
  if (!appData.isLoading && !appData.hasActivePlan && !hasPlanData) {
    return (
      <div className="h-full flex flex-col overflow-hidden relative" role="main" aria-label={t("calendar.dailyMealPlan")}>
        <div className="flex-shrink-0">
          <PageHeader
            icon={UtensilsCrossed}
            title={t("menu.title")}
            subtitle={`28 ${t("menu.dayPlan")} - ${currentTime.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`}
            stats={[
              {
                label: t("menu.restDay"),
                value: 0,
                suffix: "kcal",
              },
              {
                label: t("menu.mealException"),
                value: "+",
                isAction: true,
                onClick: () => navigate("/log-meal"),
              },
            ]}
          />
        </div>

        <div className="flex-shrink-0">
          <CalendarStrip
            selectedDate={selectedDate}
            calendarMonth={calendarMonth}
            calendarYear={calendarYear}
            onSelectDate={goToDay}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
            scheduleMap={workoutScheduleMap}
            hasPlanData={hasPlanData}
          />
        </div>

        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-live="polite"
          aria-atomic="false"
        >
          <div className="px-3 sm:px-4 lg:px-6 py-3 space-y-3">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`-mx-3 sm:-mx-4 lg:-mx-6 px-4 sm:px-5 lg:px-7 py-3 ${
                isTrainingDay
                  ? 'bg-orange-50/80'
                  : isSwimDay
                  ? 'bg-cyan-50/80'
                  : 'bg-blue-50/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
                  isTrainingDay ? 'bg-orange-100' : isSwimDay ? 'bg-cyan-100' : 'bg-blue-100'
                }`}>
                  {isTrainingDay ? <Dumbbell className="w-5 h-5 text-orange-600" /> : isSwimDay ? <Waves className="w-5 h-5 text-cyan-600" /> : <Moon className="w-5 h-5 text-blue-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[15px] font-bold ${isTrainingDay ? 'text-orange-800' : isSwimDay ? 'text-cyan-800' : 'text-blue-800'}`}>
                      {dayLabel}
                    </span>
                    <span className={`text-sm font-medium ${isTrainingDay ? 'text-gray-600' : isSwimDay ? 'text-gray-600' : 'text-gray-600'}`}>
                      • {isTrainingDay ? t("menu.higherCarbs") : t("menu.lowerCarbs")}
                    </span>
                  </div>
                  <p className={`text-sm mt-0.5 ${isTrainingDay ? 'text-gray-500' : isSwimDay ? 'text-gray-500' : 'text-gray-500'}`}>
                    {t("menu.day")} {((dayOfMonth - 1) % 28) + 1}
                  </p>
                </div>
              </div>
            </motion.div>

            {status.isToday && !status.isInEatingWindow && (
              <div ref={restTimerRef}>
                <RestTimerCard
                  restingTimeMinutes={status.restingTimeMinutes}
                  currentMeal={status.currentMeal}
                  nextMealTime={status.nextMealTime}
                  nextMealLabel={status.nextMealLabel}
                  totalRestMinutes={status.totalRestMinutes}
                  t={t}
                  allowedSnackIds={mealSettings?.allowedSnacks ?? ["alma"]}
                  snackLabels={REST_SNACK_LABELS}
                  snackKcal={REST_SNACK_KCAL}
                  snackEmoji={REST_SNACK_EMOJI}
                  consumedSnacks={consumedSnacks}
                  onSnackConsume={handleSnackConsume}
                  onOpenEditor={() => navigate("/meal-intervals")}
                />
              </div>
            )}

            {/* ── Empty State CTA ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-primary/5 rounded-2xl p-5 border border-primary/20 text-center"
            >
              <div className="text-3xl mb-2">🥗</div>
              <h3 className="text-base font-bold text-foreground mb-1">
                {t("empty.emptyMenuTitle")}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {t("empty.emptyMenuDesc")}
              </p>
              <button
                onClick={() => setGenerateSheetOpen(true)}
                className="w-full bg-primary hover:bg-primary/90 active:bg-primary/80 text-white font-semibold rounded-xl py-3 text-sm transition-colors mb-3"
              >
                {t("empty.generateBtn")}
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-sm text-gray-500">{t("empty.orDivider")}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button
                onClick={() => setUploadSheetOpen(true)}
                className="w-full border border-gray-200 text-gray-600 font-medium rounded-xl py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                {t("empty.uploadBtn")}
              </button>
            </motion.div>

            <div className="space-y-3 opacity-40 pointer-events-none">
              {(() => {
                const isIFEmpty = mealSettings?.mealModel === 'if16_8' || mealSettings?.mealModel === 'if18_6';
                if (isIFEmpty && mealSettings?.meals?.length === 1) {
                  // IF mode: show two placeholder slots within the eating window
                  const w = mealSettings.meals[0];
                  const wStart = parseTimeToMinutes(w.startTime);
                  const wEnd = parseTimeToMinutes(w.endTime);
                  const mid = wStart + Math.floor((wEnd - wStart) / 2);
                  const midHH = String(Math.floor(mid / 60)).padStart(2, '0');
                  const midMM = String(mid % 60).padStart(2, '0');
                  const midTime = `${midHH}:${midMM}`;
                  return [
                    <EmptyMealCard key="lunch" title={t("menu.lunch")} time={`${w.startTime} - ${midTime}`} icon="☀️" />,
                    <EmptyMealCard key="dinner" title={t("menu.dinner")} time={`${midTime} - ${w.endTime}`} icon="🌙" />,
                  ];
                }
                return (mealSettings?.meals?.length ? mealSettings.meals : [
                  { name: t("menu.breakfast"), startTime: '06:00', endTime: '08:00' },
                  { name: t("menu.lunch"),     startTime: '12:30', endTime: '13:30' },
                  { name: t("menu.dinner"),    startTime: '17:30', endTime: '18:30' },
                ]).map((meal, i, arr) => (
                  <EmptyMealCard
                    key={i}
                    title={meal.name}
                    time={`${meal.startTime} - ${meal.endTime}`}
                    icon={i === 0 ? '🌅' : i === arr.length - 1 ? '🌙' : '☀️'}
                  />
                ));
              })()}
            </div>

            <div className="h-4" />
          </div>
        </div>

        <DataUploadSheet
          open={uploadSheetOpen}
          onClose={() => setUploadSheetOpen(false)}
          onComplete={() => appData.refresh()}
        />
        <GenerateMealPlanSheet
          open={generateSheetOpen}
          onClose={() => setGenerateSheetOpen(false)}
          foods={[]}
          dailyCalorieTarget={calorieTarget}
          onSaved={() => { setGenerateSheetOpen(false); appData.refresh(); }}
        />
      </div>
    );
  }
 
  return (
    <div className="h-full flex flex-col overflow-hidden relative" role="main" aria-label={t("calendar.dailyMealPlan")}>
      {/* ══ TIME WINDOW FEEDBACK TOAST ══ */}
      <AnimatePresence>
        {windowFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-2 left-4 right-4 z-50 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg"
          >
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-gray-700 font-medium">{windowFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ HEADER — full-bleed gradient edge-to-edge ══ */}
      <div className="flex-shrink-0">
        <PageHeader
          icon={UtensilsCrossed}
          title={t("menu.title")}
          subtitle={`28 ${t("menu.dayPlan")} - ${currentTime.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`}
          stats={[
            {
              label: calorieRemaining < 0
                ? `${calorieCardLabel} (${calorieRemaining} kcal)`
                : calorieCardLabel,
              value: consumedToday,
              suffix: "kcal",
              bgClass: calorieCardBgClass,
            },
            {
              label: t("menu.mealException"),
              value: "+",
              isAction: true,
              onClick: () => navigate("/log-meal")
            }
          ]}
        />
      </div>

      {/* ══ CALENDAR STRIP ══ */}
      <div className="flex-shrink-0">
        <CalendarStrip
          selectedDate={selectedDate}
          calendarMonth={calendarMonth}
          calendarYear={calendarYear}
          onSelectDate={goToDay}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          scheduleMap={workoutScheduleMap}
          hasPlanData={hasPlanData}
        />
      </div>

      {/* ══ SWIPEABLE DAY CONTENT ══ */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-live="polite"
        aria-atomic="false"
      >
        {/* Chef message — persists across day swipes, dismissible */}
        {chefMessage && (
          <div className="px-3 sm:px-4 lg:px-6 pt-3">
            <ChefMessage
              pending={chefMessage}
              onAccept={async () => {
                if (chefMessage.proposal) {
                  await recordChefDecision(chefMessage.proposal.replacement, 'accept').catch(() => {});
                }
                setChefMessage(null);
              }}
              onReject={async () => {
                if (chefMessage.proposal) {
                  await recordChefDecision(chefMessage.proposal.replacement, 'reject').catch(() => {});
                }
                setChefMessage(null);
              }}
              onDismiss={() => setChefMessage(null)}
            />
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={dayKey}
            initial={{ opacity: 0, x: swipeDir === 'left' ? 80 : swipeDir === 'right' ? -80 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: swipeDir === 'left' ? -80 : swipeDir === 'right' ? 80 : 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="px-3 sm:px-4 lg:px-6 py-3 space-y-3"
          >

            {/* ── 1. Sports Day Badge — Full-width, blended into background ── */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`-mx-3 sm:-mx-4 lg:-mx-6 px-4 sm:px-5 lg:px-7 py-3 ${
                isTrainingDay
                  ? 'bg-orange-50/80'
                  : isSwimDay
                  ? 'bg-cyan-50/80'
                  : 'bg-blue-50/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
                  isTrainingDay ? 'bg-orange-100' : isSwimDay ? 'bg-cyan-100' : 'bg-blue-100'
                }`}>
                  {isTrainingDay ? <Dumbbell className="w-5 h-5 text-orange-600" /> : isSwimDay ? <Waves className="w-5 h-5 text-cyan-600" /> : <Moon className="w-5 h-5 text-blue-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[15px] font-bold ${isTrainingDay ? 'text-orange-800' : isSwimDay ? 'text-cyan-800' : 'text-blue-800'}`}>
                      {dayLabel}
                    </span>
                    <span className={`text-sm font-medium ${isTrainingDay ? 'text-gray-600' : isSwimDay ? 'text-gray-600' : 'text-gray-600'}`}>
                      • {isTrainingDay ? t("menu.higherCarbs") : t("menu.lowerCarbs")}
                    </span>
                  </div>
                  <p className={`text-sm mt-0.5 ${isTrainingDay ? 'text-gray-500' : isSwimDay ? 'text-gray-500' : 'text-gray-500'}`}>
                    {t("menu.day")} {((dayOfMonth - 1) % 28) + 1} • {mealData.week + 1}. {t("menu.week")}
                    {hasScheduledWorkout && scheduledWorkouts.some(w => w.plannedDuration) && (
                      <span className="ml-1">
                        • {scheduledWorkouts.reduce((s, w) => s + (w.plannedDuration || 0), 0)} {t("calendar.minPlanned")}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ── 2. Rest / Evening / Morning contextual card ── */}
            {status.isToday && !status.isInEatingWindow && (
              <div
                ref={restTimerRef}
                style={{
                  ...skinStyles[cardSkin],
                  borderRadius: "1.5rem",
                  padding: "1.25rem",
                  margin: "0 1rem 1rem",
                  transition: "background 0.6s ease, color 0.6s ease",
                }}
              >
                {cardSkin === "evening" && sleepData && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                      <span style={{ fontSize: "1rem", fontWeight: 700 }}>
                        🌙 {t("sleep.tonightTitle")}
                      </span>
                      <span
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          borderRadius: 999,
                          padding: "2px 10px",
                          fontSize: "0.875rem",
                        }}
                      >
                        {t("sleep.score")}: {sleepData.score}
                      </span>
                    </div>
                    {(() => {
                      const now = new Date();
                      const [bH, bM] = sleepData.bedtime.split(":").map(Number);
                      const bedTotal = bH * 60 + bM;
                      const nowTotal = now.getHours() * 60 + now.getMinutes();
                      const diff = bedTotal - nowTotal;
                      const hh = Math.floor(diff / 60);
                      const mm = diff % 60;
                      return diff > 0 ? (
                        <div style={{ textAlign: "center", margin: "1rem 0" }}>
                          <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "white" }}>
                            {hh}:{String(mm).padStart(2, "0")}
                          </div>
                          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>
                            {t("card.toBedtime")}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        marginBottom: "1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "0.375rem 0",
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>
                          {t("sleep.bedtimeLabel")}
                        </span>
                        <span style={{ color: "white", fontWeight: 600 }}>{sleepData.bedtime}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "0.375rem 0",
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>
                          {t("sleep.firstMeal")}
                        </span>
                        <span style={{ color: "white", fontWeight: 600 }}>
                          {sleepData.firstMeal}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "0.375rem 0",
                        }}
                      >
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>
                          {t("sleep.workout")}
                        </span>
                        <span style={{ color: "white", fontWeight: 600 }}>
                          {sleepData.workoutWindow}
                        </span>
                      </div>
                    </div>
                    {sleepData.calorieAdj > 0 && (
                      <div
                        style={{
                          background: "rgba(251,191,36,0.2)",
                          border: "1px solid rgba(251,191,36,0.4)",
                          borderRadius: "0.5rem",
                          padding: "0.5rem",
                          color: "#fbbf24",
                          fontSize: "0.875rem",
                          marginBottom: "1rem",
                        }}
                      >
                        ⚠️ {t("sleep.lowSleepWarning").replace("{n}", String(sleepData.calorieAdj))}
                      </div>
                    )}
                    <WaterButton
                      skin="evening"
                      totalMl={waterTotal}
                      goalMl={waterGoal}
                      onPress={handleWaterPress}
                      className="w-full max-w-[200px]"
                    />
                  </div>
                )}
                {cardSkin === "morning" && sleepData && (
                  <div>
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        marginBottom: "0.5rem",
                        color: "#92400e",
                      }}
                    >
                      🌅 {t("card.goodMorning")}
                    </div>
                    <div
                      style={{
                        color: sleepData.cycles >= 6 ? "#22c55e" : "#f59e0b",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        marginBottom: "1rem",
                      }}
                    >
                      {sleepData.cycles >= 6
                        ? `😴 ${sleepData.cycles} ${t("sleep.cycles")} · ${t("card.optimalSleep")}`
                        : `⚠️ ${t("card.lowSleep")} · +${sleepData.calorieAdj} kcal`}
                    </div>
                    {(() => {
                      const now = new Date();
                      const [fH, fM] = sleepData.firstMeal.split(":").map(Number);
                      const firstTotal = fH * 60 + fM;
                      const nowTotal = now.getHours() * 60 + now.getMinutes();
                      const diff = firstTotal - nowTotal;
                      if (diff <= 0) return null;
                      const hh = Math.floor(diff / 60);
                      const mm = diff % 60;
                      return (
                        <div style={{ textAlign: "center", margin: "1rem 0" }}>
                          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#92400e" }}>
                            {hh}:{String(mm).padStart(2, "0")}
                          </div>
                          <div style={{ fontSize: "0.875rem", opacity: 0.7, color: "#92400e" }}>
                            {t("card.toBreakfast")}
                          </div>
                        </div>
                      );
                    })()}
                    <div
                      style={{
                        fontSize: "0.875rem",
                        opacity: 0.7,
                        marginBottom: "1rem",
                        color: "#92400e",
                      }}
                    >
                      💪 {t("sleep.workout")}: {sleepData.workoutWindow}
                    </div>
                    <WaterButton
                      skin="morning"
                      totalMl={waterTotal}
                      goalMl={waterGoal}
                      onPress={handleWaterPress}
                      className="w-full max-w-[200px]"
                    />
                  </div>
                )}
                {cardSkin === "rest" && (
                  <RestTimerCard
                    restingTimeMinutes={status.restingTimeMinutes}
                    currentMeal={status.currentMeal}
                    nextMealTime={status.nextMealTime}
                    nextMealLabel={status.nextMealLabel}
                    totalRestMinutes={status.totalRestMinutes}
                    t={t}
                    allowedSnackIds={mealSettings?.allowedSnacks ?? ["alma"]}
                    snackLabels={REST_SNACK_LABELS}
                    snackKcal={REST_SNACK_KCAL}
                    snackEmoji={REST_SNACK_EMOJI}
                    consumedSnacks={consumedSnacks}
                    onSnackConsume={handleSnackConsume}
                    onOpenEditor={() => navigate("/meal-intervals")}
                  />
                )}
              </div>
            )}

            {/* For non-today days, show a simple info banner */}
            {!status.isToday && (
              <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border ${
                status.isPast
                  ? 'bg-gray-50 border-gray-200 text-gray-500'
                  : 'bg-primary/5 border-primary/20 text-primary'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {status.isPast ? t("menu.pastDay") : t("menu.upcomingDay")}
                </span>
              </div>
            )}

            {/* ── 3. Meal Cards ── */}
            <div className="space-y-3">
              {mealSlots.map((slot, slotIdx) => {
                const isFocusMeal = status.isToday && status.isInEatingWindow && status.currentMeal === slot.type;
                const isConsumedToday = status.isToday && slot.consumed;

                // Snack slots: time-only info row (no plan meal data expected)
                if (slot.isSnack) {
                  return (
                    <motion.div
                      key={slot.type}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * slotIdx, duration: 0.3 }}
                    >
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-amber-50 flex items-center justify-center text-lg shrink-0">
                          <span>{slot.icon}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-slate-800 truncate">{slot.title}</span>
                          <span className="text-sm text-slate-400">{slot.time}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                // Placeholder for missing dinner on days without a planned vacsora
                if (slot.type === 'dinner' && (!slot.primary && slot.meals.length === 0)) {
                  return (
                    <motion.div
                      key={slot.type}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * slotIdx, duration: 0.3 }}
                    >
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center text-lg">
                            <span>🌙</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800">
                              Vacsora még nincs hozzáadva
                            </span>
                            <span className="text-sm text-slate-500">
                              Adj hozzá egy vacsorát ehhez a naphoz.
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary text-white text-lg shadow-md"
                          onClick={() => navigate("/log-meal")}
                        >
                          +
                        </button>
                      </div>
                    </motion.div>
                  );
                }

                if (isConsumedToday && !isFocusMeal) {
                  return (
                    <motion.div key={slot.type}>
                      <ConsumedMealCompact title={slot.title} icon={slot.icon} time={slot.time} meal={slot.selected} />
                      {status.isToday && getLoggedMealsForSlot(loggedSlotMap[slot.type as keyof typeof loggedSlotMap]).map(meal => (
                        <LoggedMealAsCard key={meal.id} meal={meal} onRemove={() => removeLoggedMeal(meal.id)} />
                      ))}
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={slot.type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * slotIdx, duration: 0.3 }}
                  >
                    <div className="relative">
                      <MealCardV5Wrapper
                        slot={slot}
                        dayKey={dayKey}
                        isFocusMeal={isFocusMeal}
                        isToday={status.isToday}
                        isPassed={slot.isPassed}
                        checkedMeals={checkedMeals}
                        onMealSelect={(mealId) => handleMealSelect(mealId, slot.type, dayKey)}
                        onMealCheck={() => slot.selected && handleMealCheck(slot.selected.id, selectedDate, slot.type)}
                        onLogMeal={() => navigate('/log-meal')}
                        userProfile={userProfile}
                        weekMeals={weekMeals}
                        todayMeals={todayMeals}
                      />
                    </div>
                    {status.isToday && getLoggedMealsForSlot(loggedSlotMap[slot.type as keyof typeof loggedSlotMap]).map(meal => (
                      <LoggedMealAsCard key={meal.id} meal={meal} onRemove={() => removeLoggedMeal(meal.id)} />
                    ))}
                  </motion.div>
                );
              })}
            </div>

            <div className="h-4" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ══ QUICK LOG BOTTOM SHEET ══ */}
      <DSMQuickLogSheet
        open={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        onLogMeal={async (item) => {
          const today = new Date().toISOString().split('T')[0];
          const stored = await getSetting(`loggedMeals_${today}`);
          const meals = stored ? JSON.parse(stored) : [];
          meals.push({
            id: `quick-${Date.now()}`,
            name: item.name,
            type: item.type,
            quantity: item.quantity,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            timestamp: Date.now(),
            image: '',
          });
          await setSetting(`loggedMeals_${today}`, JSON.stringify(meals));
        }}
      />

      {/* Exactly ONE water button: rest = inside rest card; meal = floating. Never both. */}
      <AnimatePresence>
        {!aiPanelOpen && status.isInEatingWindow && (
          <div style={{ position: 'fixed', bottom: '5rem', right: '1rem', zIndex: 40 }}>
            <WaterButton className="max-w-[200px]" />
          </div>
        )}
      </AnimatePresence>

      <DataUploadSheet
        open={uploadSheetOpen}
        onClose={() => setUploadSheetOpen(false)}
        onComplete={() => appData.refresh()}
      />
      <GenerateMealPlanSheet
        open={generateSheetOpen}
        onClose={() => setGenerateSheetOpen(false)}
        foods={[]}
        dailyCalorieTarget={calorieTarget}
        onSaved={() => { setGenerateSheetOpen(false); appData.refresh(); }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// RestTimerCard — rest period: countdown, rest bar, snacks, water tracking, next meal
// Long-press: pulsing border + hint; at 300ms scale 1.01 + solid blue; at 500ms dialog.
// ══════════════════════════════════════════════════════════════

const BORDER_PULSE_CSS = `
@keyframes restCardBorderPulse {
  0%, 100% { border-color: rgba(59,130,246,0.3); }
  50% { border-color: rgba(59,130,246,0.7); }
}
`;

function RestTimerCard({
  restingTimeMinutes,
  currentMeal,
  nextMealTime,
  nextMealLabel,
  totalRestMinutes,
  t,
  allowedSnackIds,
  snackLabels,
  snackKcal,
  snackEmoji,
  consumedSnacks,
  onSnackConsume,
  onOpenEditor,
  dayInfoLabel,
}: {
  restingTimeMinutes: number;
  currentMeal: string | null;
  nextMealTime: number | null;
  nextMealLabel: string | null;
  totalRestMinutes: number;
  t: (key: string) => string;
  allowedSnackIds: string[];
  snackLabels: Record<string, string>;
  snackKcal: Record<string, number>;
  snackEmoji: Record<string, string>;
  consumedSnacks: Record<string, boolean>;
  onSnackConsume: (snackId: string) => void;
  onOpenEditor?: () => void;
  dayInfoLabel?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [borderHighlight, setBorderHighlight] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const borderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPressTimers = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (borderTimerRef.current) {
      clearTimeout(borderTimerRef.current);
      borderTimerRef.current = null;
    }
    setBorderHighlight(false);
  }, []);

  const handleTouchStart = useCallback(() => {
    borderTimerRef.current = setTimeout(() => setBorderHighlight(true), 300);
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      if (borderTimerRef.current) {
        clearTimeout(borderTimerRef.current);
        borderTimerRef.current = null;
      }
      hapticFeedback('light');
      setConfirmOpen(true);
      setBorderHighlight(false);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    clearLongPressTimers();
  }, [clearLongPressTimers]);

  const handleMouseDown = useCallback(() => {
    borderTimerRef.current = setTimeout(() => setBorderHighlight(true), 300);
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      if (borderTimerRef.current) {
        clearTimeout(borderTimerRef.current);
        borderTimerRef.current = null;
      }
      setConfirmOpen(true);
      setBorderHighlight(false);
    }, 500);
  }, []);

  const handleMouseUp = useCallback(() => {
    clearLongPressTimers();
  }, [clearLongPressTimers]);

  const handleEdit = useCallback(() => {
    setConfirmOpen(false);
    onOpenEditor?.();
  }, [onOpenEditor]);

  const hours = Math.floor(restingTimeMinutes / 60);
  const minutes = restingTimeMinutes % 60;
  const percentRemaining = totalRestMinutes > 0 ? Math.max(0, Math.min(100, (restingTimeMinutes / totalRestMinutes) * 100)) : 0;
  const nextMealTimeStr = nextMealTime != null
    ? `${String(Math.floor(nextMealTime / 60) % 24).padStart(2, "0")}:${String(nextMealTime % 60).padStart(2, "0")}`
    : "--:--";
  const nextMealTitle = nextMealLabel ? t(`meal.${nextMealLabel}`) : "";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BORDER_PULSE_CSS }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: borderHighlight ? 1.01 : 1,
        }}
        transition={{ duration: 0.2 }}
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(20,184,166,0.12))",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: borderHighlight ? "2px solid rgba(59,130,246,0.9)" : "1px solid rgba(59,130,246,0.3)",
          borderRadius: "1.25rem",
          padding: "1rem",
          boxShadow: "0 8px 32px rgba(31, 38, 135, 0.15)",
          animation: borderHighlight ? "none" : "restCardBorderPulse 3s infinite",
        }}
        className="relative overflow-visible"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="relative z-10 flex flex-col gap-2">
          {/* 1. Day info (optional) */}
          {dayInfoLabel && (
            <p className="text-center text-sm font-medium" style={{ color: "rgba(30,58,95,0.7)" }}>
              {dayInfoLabel}
            </p>
          )}

          {/* 2. Countdown + label */}
          <p
            className="text-center uppercase font-bold"
            style={{ fontSize: "0.875rem", letterSpacing: "0.12em", color: "rgba(30,58,95,0.6)" }}
          >
            {t("menu.timeRemaining")}
          </p>
          <div className="flex justify-center">
            <motion.div
              className="font-extrabold tracking-tight"
              style={{ fontSize: "3rem", fontWeight: 800, color: "#1e3a5f" }}
              key={`${hours}:${minutes}`}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {hours}:{String(minutes).padStart(2, "0")}
            </motion.div>
          </div>

          {/* 3. Rest progress bar + % remaining (4px height) */}
          <div className="space-y-0.5">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(13,148,136,0.15)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #0f766e, #14b8a6)", borderRadius: 9999 }}
                initial={{ width: 0 }}
                animate={{ width: `${percentRemaining}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <p className="text-center text-sm font-medium" style={{ color: "rgba(30,58,95,0.6)" }}>
              {t("menu.percentRemaining").replace("{n}", String(Math.round(percentRemaining)))}
            </p>
          </div>

          {/* 4. Snacks — compact chips */}
          {allowedSnackIds.length > 0 && (
            <>
              <p className="text-center uppercase text-sm font-bold" style={{ letterSpacing: "0.08em", color: "rgba(30,58,95,0.5)" }}>
                {t("menu.allowed")}
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {allowedSnackIds.map((snackId) => {
                  const consumed = !!consumedSnacks[snackId];
                  const label = snackLabels[snackId] ?? snackId;
                  const kcal = snackKcal[snackId] ?? 0;
                  const emoji = snackEmoji[snackId] ?? "•";
                  return (
                    <button
                      key={snackId}
                      type="button"
                      onClick={() => onSnackConsume(snackId)}
                      className="flex items-center gap-1 rounded-full border border-white/30 text-sm font-medium transition-colors py-1 px-3"
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                      }}
                    >
                      {consumed && <Check className="w-3 h-3 text-[#1e3a5f]" />}
                      <span style={{ color: "#1e3a5f" }}>{emoji} {label} · {kcal} kcal</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* 5. Water: simple pill — icon + current ml, tap = +250ml */}
          <div className="pt-1.5 border-t border-white/20 flex justify-center">
            <WaterButton className="w-full max-w-[200px]" />
          </div>

          {/* 7. Next meal */}
          <div className="flex items-center justify-center gap-1.5 py-1">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1e3a5f" }} />
            <span className="font-bold text-sm" style={{ color: "#1e3a5f" }}>
              {t("menu.nextMeal")}: {nextMealTimeStr} {nextMealTitle ? `(${nextMealTitle})` : ""}
            </span>
          </div>

          {/* 8. Long press hint — smallest text */}
          <p
            style={{
              textAlign: "center",
              fontSize: "0.875rem",
              color: "rgba(30,58,95,0.4)",
              marginTop: "0.25rem",
              letterSpacing: "0.05em",
            }}
          >
            {t("menu.longPressHint")}
          </p>
        </div>
      </motion.div>

      {/* Long-press confirmation: Étkezési intervallumok → Szerkesztés / Mégsem */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-2xl shadow-xl border border-border p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-bold text-foreground mb-2">
                {t("mealEditor.dialogTitle")}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {t("mealEditor.dialogMessage")}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium"
                >
                  {t("mealEditor.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold"
                >
                  {t("mealEditor.edit")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ══════════════════════════════════════════════════���═══════════
// ConsumedMealCompact
// ══════════════════════════════════════════════════════════════

function ConsumedMealCompact({ title, icon, time }: {
  title: string; icon: string; time: string; meal: any;
}) {
  // v3: Conforms to MEAL_CARD_DESIGN_CONTRACT — consumed variant
  // Compact row: green check icon + title (strikethrough) + time
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-background rounded-2xl border border-green-200/60 shadow-sm overflow-hidden opacity-70"
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[15px] text-green-700 line-through">{title}</h4>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-sm text-gray-500">{time}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// MealCardV5Wrapper — bridges new MealCard to UnifiedMenu's data/callbacks
// ══════════════════════════════════════════════════════════════

function MealCardV5Wrapper({ slot, dayKey, isFocusMeal, isToday, isPassed, checkedMeals, onMealSelect, onMealCheck, onLogMeal, userProfile, weekMeals, todayMeals }: {
  slot: any;
  dayKey: string;
  isFocusMeal: boolean;
  isToday: boolean;
  isPassed: boolean;
  checkedMeals: Set<string>;
  onMealSelect: (mealId: string) => void;
  onMealCheck: () => void;
  onLogMeal: () => void;
  userProfile: StoredUserProfile | null;
  weekMeals: MealOption[];
  todayMeals: MealOption[];
}) {
  const [showRecipe, setShowRecipe] = useState(false);
  const [recipeTab, setRecipeTab] = useState<'home' | 'restaurant'>('home');

  const checked = slot.selected ? checkedMeals.has(slot.selected.id) : false;

  return (
    <>
      <MealCard
        title={slot.title}
        time={slot.time}
        icon={slot.icon}
        selectedMeal={slot.selected}
        mealType={slot.type}
        checked={checked}
        onCheck={onMealCheck}
        isFocus={isFocusMeal}
        isPassed={isPassed}
        isToday={isToday}
        onSwapRequest={onLogMeal}
        onRecipeOpen={(tab) => { setRecipeTab(tab); setShowRecipe(true); }}
        userProfile={userProfile}
      />

      {/* Recipe overlay (opened from MealCard detail page) */}
      <AnimatePresence>
        {showRecipe && slot.selected && (
          <RecipeOverlay
            meal={slot.selected}
            userProfile={userProfile}
            weekMeals={weekMeals}
            todayMeals={todayMeals}
            onClose={() => setShowRecipe(false)}
            initialTab={recipeTab}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// MealCardWithAlternatives — v4 (LEGACY — kept for reference)
// ══════════════════════════════════════════════════════════════

interface MealCardWithAlternativesProps {
  title: string; time: string; icon: string;
  meals: any[]; selectedMeal: any; alternatives: MealOption[];
  primaryMeal: any; mealType: string; dayKey: string;
  onSelect: (mealId: string) => void;
  checked: boolean; onCheck: () => void;
  isCurrent: boolean; isFocus: boolean; isPassed: boolean;
  canCheck: boolean; isToday: boolean; canEdit: boolean;
  isTrainingDay: boolean; dayLabel: string; calorieTarget: number;
  mealRef?: React.RefObject<HTMLDivElement | null>;
  userProfile: StoredUserProfile | null;
  weekMeals: MealOption[];
  todayMeals: MealOption[];
}

function MealCardWithAlternatives(props: MealCardWithAlternativesProps) {
  const {
    title, time, icon, selectedMeal, alternatives, primaryMeal,
    mealType,
    onSelect,
    checked, onCheck, isFocus, isPassed, canCheck, isToday,
    canEdit, isTrainingDay, dayLabel, calorieTarget,
    mealRef,
    userProfile, weekMeals, todayMeals,
  } = props;

  const { t, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);
  const [recipeInitialTab, setRecipeInitialTab] = useState<'home' | 'restaurant'>('home');
  const allOptions = primaryMeal ? [primaryMeal, ...alternatives] : alternatives;
  const canShowRecipe = mealType === 'lunch' || mealType === 'dinner';

  const handleCardTap = useCallback(() => {
    setExpanded(prev => !prev);
    hapticFeedback('light');
  }, []);

  const handleAlternativeSelect = useCallback((mealId: string) => {
    onSelect(mealId);
    hapticFeedback('light');
    setSwapOpen(false);
  }, [onSelect]);

  const parseKcal = (s: string) => parseInt(s?.replace(/[^0-9]/g, '') || '0') || 0;
  const totalKcal = selectedMeal ? parseKcal(selectedMeal.calories) : 0;

  // Per-ingredient details from plan data (structured)
  const details = selectedMeal?.ingredientDetails as Array<{ name: string; quantity: string; calories: number; protein: number; carbs: number; fat: number }> | undefined;
  // Fallback: estimate from total calories if no structured details
  const mealProtein = selectedMeal?.totalProtein ?? Math.round((totalKcal * 0.30) / 4);
  const mealCarbs = selectedMeal?.totalCarbs ?? Math.round((totalKcal * 0.40) / 4);
  const mealFat = selectedMeal?.totalFat ?? Math.round((totalKcal * 0.30) / 9);

  // Extract the ingredient name from a string like "Csirkemell (220g)" → ["Csirkemell", "220g"]
  const parseIngredientString = (ing: string): { foodName: string; qty: string } => {
    let cleaned = ing;
    // Strip leading "nap N" or "day N" prefixes from OCR
    cleaned = cleaned.replace(/^(nap|Nap)\s+\d+\s+/u, '');
    cleaned = cleaned.replace(/^(day|Day)\s+\d+\s+/u, '');

    const match = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (match) return { foodName: match[1].trim(), qty: match[2].trim() };
    return { foodName: cleaned, qty: '' };
  };

  // Meal name (e.g. "Lazac salátával") from plan data
  const mealName = selectedMeal?.name || '';
  // Description (e.g. "180g lazac + 250g saláta + 1 ek olívaolaj")
  const mealDesc = selectedMeal?.description || '';

  // ── Variant ──
  const variant: 'active' | 'consumed' | 'compact' =
    isFocus ? 'active'
    : checked ? 'consumed'
    : 'compact';

  const cardClass =
    variant === 'active'
      ? 'bg-primary/5 ring-2 ring-primary/30 shadow-lg'
    : variant === 'consumed'
      ? 'bg-background border border-green-200/60 shadow-sm opacity-70'
    : 'bg-background border border-gray-100/60 shadow-sm';

  const iconBgClass =
    variant === 'active'
      ? 'bg-primary/10'
    : variant === 'consumed'
      ? 'bg-green-500'
    : isPassed && isToday
      ? 'bg-gray-100'
    : 'bg-amber-50';

  const titleClass =
    variant === 'active'
      ? 'text-primary'
    : variant === 'consumed'
      ? 'text-green-700 line-through'
    : isPassed && isToday
      ? 'text-gray-400'
    : 'text-foreground';

  return (
    <>
      <motion.div
        role="article"
        aria-label={`${title} étkezés${checked ? ' — kipipálva' : ''}${isFocus ? ' — most aktuális' : ''}`}
        className={`rounded-2xl overflow-hidden transition-shadow ${cardClass}`}
        ref={mealRef as any}
      >
        {/* Eating window banner */}
        {isFocus && canCheck && (
          <motion.div
            className="bg-primary px-4 py-1.5 flex items-center gap-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
              <Clock className="w-3.5 h-3.5 text-white" />
            </motion.div>
            <span className="text-sm font-semibold text-white">{t("menu.eatingWindow")}</span>
          </motion.div>
        )}

        {/* ─── Header: tap to expand ─── */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleCardTap}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardTap(); } }}
          className="w-full text-left px-4 py-3 active:bg-gray-50/50 transition-colors cursor-pointer"
        >
          {/* Row 1: Icon + meal type + calorie badge + chevron */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 ${iconBgClass}`}>
              {checked ? <Check className="w-5 h-5 text-white" /> : icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={`font-bold text-[15px] ${titleClass}`}>{title}</h4>
                {totalKcal > 0 && (
                  <span className="text-sm font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                    {totalKcal} kcal
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-sm text-gray-400">{time}</span>
              </div>
            </div>
            {/* Eat check button */}
            {isToday && (
              <motion.button
                onClick={(e) => { e.stopPropagation(); onCheck(); }}
                className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  checked
                    ? 'bg-green-500 active:bg-green-600'
                    : isPassed
                    ? 'bg-orange-100 border border-orange-300 active:bg-orange-200'
                    : 'bg-primary/10 border border-primary/30 active:bg-primary/20'
                }`}
                whileTap={{ scale: 0.88 }}
                aria-label={checked ? 'Visszavonom' : 'Megettem'}
              >
                <Check className={`w-4 h-4 ${
                  checked
                    ? 'text-white'
                    : isPassed
                    ? 'text-orange-500'
                    : 'text-primary'
                }`} />
              </motion.button>
            )}
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.div>
          </div>

          {/* Row 2: Meal name + "1 adag" (always visible when meal data exists) */}
          {mealName && (
            <div className="mt-2 ml-[52px] flex items-center gap-2">
              <UtensilsCrossed className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">{mealName}</span>
              <span className="text-sm font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-md flex-shrink-0 ml-auto">
                1 {t("mealDetail.serving") || 'adag'}
              </span>
            </div>
          )}

          {/* Recipe + Restaurant badges — lunch/dinner only */}
          {canShowRecipe && (
            <div className="mt-1.5 ml-[52px] flex items-center gap-2">
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  hapticFeedback('light');
                  setRecipeInitialTab('home');
                  setShowRecipe(true);
                }}
                className="flex items-center gap-1 bg-amber-50 border border-amber-200/70 rounded-full px-2.5 py-1 active:bg-amber-100 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-sm leading-none">🍳</span>
                <span className="text-sm font-semibold text-teal-700">Recept</span>
              </motion.button>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  hapticFeedback('light');
                  setRecipeInitialTab('restaurant');
                  setShowRecipe(true);
                }}
                className="flex items-center gap-1 bg-teal-50 border border-teal-200/70 rounded-full px-2.5 py-1 active:bg-teal-100 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-sm leading-none">🏪</span>
                <span className="text-sm font-semibold text-teal-700">Éttermek</span>
              </motion.button>
            </div>
          )}
        </div>

        {/* ─── Inline expanded: ingredients with per-item macros ─── */}
        <AnimatePresence>
          {expanded && selectedMeal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2">
                {/* Food photo hero */}
                {mealName && (
                  <div className="flex justify-center mb-2">
                    <FoodImage foodName={mealName} size="lg" fallbackEmoji={icon} className="shadow-md" />
                  </div>
                )}
                {/* Description line */}
                {mealDesc && (
                  <p className="text-sm text-gray-400 ml-1 mb-1 italic">{mealDesc}</p>
                )}

                {/* ── Structured ingredient rows (from IndexedDB upload) ── */}
                {details && details.length > 0 ? (
                  details.map((ing, idx) => (
                    <div key={idx} className="bg-gray-50/80 rounded-xl px-3 py-2.5 border border-gray-100/60">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm font-medium text-gray-800 truncate">{translateFoodName(ing.name, language)}</span>
                          <span className="text-sm text-gray-400 flex-shrink-0">({ing.quantity})</span>
                        </div>
                        <span className="text-sm font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                          {Math.round(ing.calories)} kcal
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span className="text-sm text-gray-500">{t("menu.proteinG")}</span>
                          <span className="text-sm font-medium text-red-600">{ing.protein.toFixed(1)}g</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="text-sm text-gray-500">{t("menu.carbsG")}</span>
                          <span className="text-sm font-medium text-amber-600">{ing.carbs.toFixed(1)}g</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-sm text-gray-500">{t("menu.fatG")}</span>
                          <span className="text-sm font-medium text-primary">{ing.fat.toFixed(1)}g</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : selectedMeal?.ingredients && selectedMeal.ingredients.length > 0 ? (
                  /* ── Fallback: parse string ingredients from hardcoded plan ── */
                  selectedMeal.ingredients.map((ingStr: string, idx: number) => {
                    const { foodName, qty } = parseIngredientString(ingStr);
                    const count = selectedMeal.ingredients.length;
                    const perKcal = Math.round(totalKcal / count);
                    const perP = +(mealProtein / count).toFixed(1);
                    const perC = +(mealCarbs / count).toFixed(1);
                    const perF = +(mealFat / count).toFixed(1);
                    return (
                      <div key={idx} className="bg-gray-50/80 rounded-xl px-3 py-2.5 border border-gray-100/60">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-sm font-medium text-gray-800 truncate">{translateFoodName(foodName, language)}</span>
                            {qty && <span className="text-sm text-gray-400 flex-shrink-0">({qty})</span>}
                          </div>
                          <span className="text-sm font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                            ~{perKcal} kcal
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span className="text-sm text-gray-500">{t("menu.proteinG")}</span>
                            <span className="text-sm font-medium text-red-600">{perP}g</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="text-sm text-gray-500">{t("menu.carbsG")}</span>
                            <span className="text-sm font-medium text-amber-600">{perC}g</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="text-sm text-gray-500">{t("menu.fatG")}</span>
                            <span className="text-sm font-medium text-primary">{perF}g</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-400 text-center py-2">
                    {t("mealDetail.ingredients") || t('menu.noIngredientData')}
                  </div>
                )}

                {/* ── Total summary bar ── */}
                {totalKcal > 0 && (
                  <div className="flex items-center justify-between bg-primary/5 rounded-xl px-3 py-2.5 border border-primary/15">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-bold text-primary">{totalKcal} kcal</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-red-600">{typeof mealProtein === 'number' ? mealProtein.toFixed(1) : mealProtein}g F</span>
                      <span className="text-sm font-medium text-amber-600">{typeof mealCarbs === 'number' ? mealCarbs.toFixed(1) : mealCarbs}g Sz</span>
                      <span className="text-sm font-medium text-primary">{typeof mealFat === 'number' ? mealFat.toFixed(1) : mealFat}g Zs</span>
                    </div>
                  </div>
                )}

                {/* ── Swap meal button ── */}
                {canEdit && !checked && allOptions.length > 1 && (
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); setSwapOpen(true); }}
                    className="w-full flex items-center justify-center gap-2 bg-primary/5 rounded-xl px-4 py-2.5 border border-primary/20 active:bg-primary/10 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowRightLeft className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-primary">{t("mealDetail.swapMeal") || 'Étkezés cseréje'}</span>
                  </motion.button>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── SWAP SHEET (Full-screen overlay) — opens via swap button ─── */}
      <AnimatePresence>
        {swapOpen && (
          <MealDetailSheet
            title={title}
            time={time}
            icon={icon}
            selectedMeal={selectedMeal}
            allOptions={allOptions}
            isTrainingDay={isTrainingDay}
            dayLabel={dayLabel}
            calorieTarget={calorieTarget}
            canEdit={canEdit}
            checked={checked}
            onSelect={handleAlternativeSelect}
            onClose={() => setSwapOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── RECIPE OVERLAY ─── */}
      <AnimatePresence>
        {showRecipe && selectedMeal && (
          <RecipeOverlay
            meal={selectedMeal}
            userProfile={userProfile}
            weekMeals={weekMeals}
            todayMeals={todayMeals}
            onClose={() => setShowRecipe(false)}
            initialTab={recipeInitialTab}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// MealDetailSheet — Full-screen overlay for meal details + alt selection
// Opens when tapping a compact MealCard. Shows:
//   - Meal name + total calories
//   - Ingredient breakdown with per-item macros (P/C/F)
//   - Swap meal button with alternatives list
// ══════════════════════════════════════════════════════════════

interface MealDetailSheetProps {
  title: string; time: string; icon: string;
  selectedMeal: any; allOptions: MealOption[];
  isTrainingDay: boolean; dayLabel: string; calorieTarget: number;
  canEdit: boolean; checked: boolean;
  onSelect: (mealId: string) => void;
  onClose: () => void;
}

function MealDetailSheet({
  title, time, icon, selectedMeal, allOptions,
  isTrainingDay, dayLabel, calorieTarget,
  canEdit, checked, onSelect, onClose,
}: MealDetailSheetProps) {
  const { t, language } = useLanguage();
  const [showAlternatives, setShowAlternatives] = useState(false);

  const parseKcal = (s: string) => parseInt(s.replace(/[^0-9]/g, '')) || 0;

  const mealPctMap: Record<string, number> = { 'breakfast': 0.3, 'lunch': 0.4, 'dinner': 0.3 };
  const titleLower = title.toLowerCase();
  const mealTypeKey = (titleLower === t("menu.breakfast").toLowerCase() || titleLower === 'reggeli' || titleLower === 'breakfast' || titleLower === 'mic dejun')
    ? 'breakfast'
    : (titleLower === t("menu.lunch").toLowerCase() || titleLower === 'ebéd' || titleLower === 'lunch' || titleLower === 'prânz')
    ? 'lunch' : 'dinner';
  const mealAllowance = Math.round(calorieTarget * (mealPctMap[mealTypeKey] || 0.33));

  // Estimate macros from ingredients (heuristic: parse "Xg" patterns from ingredient strings)
  const estimateMacros = (meal: any) => {
    const kcal = parseKcal(meal?.calories || '0');
    // Simple estimation: 30% protein, 40% carbs, 30% fat by calorie split
    const protein = Math.round((kcal * 0.30) / 4); // 4 cal/g
    const carbs = Math.round((kcal * 0.40) / 4);   // 4 cal/g
    const fat = Math.round((kcal * 0.30) / 9);     // 9 cal/g
    return { protein, carbs, fat };
  };

  const macros = selectedMeal ? estimateMacros(selectedMeal) : { protein: 0, carbs: 0, fat: 0 };
  const totalKcal = selectedMeal ? parseKcal(selectedMeal.calories) : 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-border">
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label={t("mealDetail.close")}
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="text-center">
          <h2 className="font-bold text-base text-foreground">{title}</h2>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-sm text-gray-400">{time}</span>
          </div>
        </div>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">

          {/* ── Day type + Calorie budget ── */}
          <div className="flex gap-2">
            <div className={`flex-1 rounded-xl p-3 border ${
              isTrainingDay
                ? 'bg-orange-50 border-orange-200/60'
                : 'bg-primary/5 border-primary/20'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {isTrainingDay
                  ? <Dumbbell className="w-4 h-4 text-orange-600" />
                  : <Moon className="w-4 h-4 text-primary" />
                }
                <span className={`text-sm font-bold ${
                  isTrainingDay ? 'text-orange-700' : 'text-primary'
                }`}>
                  {dayLabel}
                </span>
              </div>
              <p className={`text-sm ${
                isTrainingDay ? 'text-orange-500' : 'text-primary/70'
              }`}>
                {isTrainingDay ? t("mealDetail.higherCarbs") : t("mealDetail.lowerCarbs")}
              </p>
            </div>
            <div className="flex-1 rounded-xl p-3 bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">{t("mealDetail.calorieBudget")}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[17px] font-bold text-primary">~{mealAllowance}</span>
                <span className="text-sm text-primary/70">kcal</span>
              </div>
            </div>
          </div>

          {/* ── Current meal: name + total calories ── */}
          {selectedMeal && (
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl flex-shrink-0">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-foreground mb-1">{selectedMeal.name}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{selectedMeal.description}</p>
                </div>
              </div>

              {/* Total calories + macro ring */}
              <div className="flex items-center justify-between bg-white/70 rounded-xl p-3 border border-primary/10">
                <div>
                  <span className="text-2xl font-black text-primary">{totalKcal}</span>
                  <span className="text-sm text-primary/70 ml-1">kcal</span>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-sm font-bold text-red-600">{macros.protein}g</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">🥩 {t("menu.proteinG")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-amber-600">{macros.carbs}g</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">🌾 {t("menu.carbsG")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-primary">{macros.fat}g</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">🫒 {t("menu.fatG")}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Ingredients breakdown ── */}
          {selectedMeal?.ingredients && selectedMeal.ingredients.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Utensils className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t("mealDetail.ingredients") || 'Összetevők'}</span>
              </div>
              <div className="space-y-2">
                {selectedMeal.ingredients.map((ing: string, idx: number) => {
                  // Estimate per-ingredient calories/macros (evenly split as heuristic)
                  const perIngKcal = Math.round(totalKcal / selectedMeal.ingredients.length);
                  const perIngProtein = Math.round(macros.protein / selectedMeal.ingredients.length);
                  const perIngCarbs = Math.round(macros.carbs / selectedMeal.ingredients.length);
                  const perIngFat = Math.round(macros.fat / selectedMeal.ingredients.length);

                  return (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm border border-gray-100">
                        🍽️
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800">{translateFoodName(ing, language)}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-gray-400">~{perIngKcal} kcal</span>
                          <span className="text-sm text-red-400">P {perIngProtein}g</span>
                          <span className="text-sm text-amber-400">C {perIngCarbs}g</span>
                          <span className="text-sm text-primary">F {perIngFat}g</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Swap meal button ── */}
          {canEdit && !checked && allOptions.length > 1 && (
            <div>
              <motion.button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="w-full flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3 border border-primary/20 active:bg-primary/10 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-primary">{t("mealDetail.swapMeal") || 'Étkezés cseréje'}</span>
                </div>
                <motion.div animate={{ rotate: showAlternatives ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 text-primary" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {showAlternatives && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-3">
                      <span className="text-sm text-gray-400">{t("mealDetail.tapToChoose")}</span>
                      {allOptions.map((meal, idx) => {
                        const isSelected = selectedMeal?.id === meal.id;
                        const kcal = parseKcal(meal.calories);
                        const isOverBudget = kcal > mealAllowance * 1.15;

                        return (
                          <motion.button
                            key={meal.id}
                            onClick={() => onSelect(meal.id)}
                            className={`w-full text-left rounded-xl p-3.5 transition-all ${
                              isSelected
                                ? 'bg-primary/5 border-2 border-primary'
                                : 'bg-white border border-gray-100 hover:border-primary/30 active:bg-gray-50'
                            }`}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                                <span className={`text-sm font-bold uppercase tracking-wider ${
                                  idx === 0 ? 'text-primary' : 'text-gray-600'
                                }`}>
                                  {idx === 0 ? `🥗 ${t("mealDetail.dietPlanLabel")}` : t("mealDetail.alternativeN").replace('{n}', String(idx))}
                                </span>
                              </div>
                              <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
                                isSelected
                                  ? 'bg-primary/10 text-primary'
                                  : isOverBudget
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {meal.calories}
                              </span>
                            </div>

                            <h5 className="font-semibold text-sm text-foreground mb-0.5">{translateFoodName(meal.name, language)}</h5>
                            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{meal.description}</p>

                            {meal.ingredients && meal.ingredients.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {meal.ingredients.slice(0, 4).map((ing: string, i: number) => (
                                  <span key={i} className="text-sm bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md">{translateFoodName(ing, language)}</span>
                                ))}
                                {meal.ingredients.length > 4 && (
                                  <span className="text-sm bg-gray-50 text-gray-400 px-2 py-0.5 rounded-md">+{meal.ingredients.length - 4}</span>
                                )}
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Info when no edit possible */}
          {(!canEdit || checked) && allOptions.length > 1 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-400">
                {checked ? t("mealDetail.mealConsumed") : t("mealDetail.altWindowExpired")}
              </span>
            </div>
          )}

          <div className="h-[max(1rem,env(safe-area-inset-bottom))]" />
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// LoggedMealAsCard
// ══════════════════════════════════════════════════════════════
 
interface LoggedMealAsCardProps { meal: LoggedMeal; onRemove: () => void; }
 
function LoggedMealAsCard({ meal, onRemove }: LoggedMealAsCardProps) {
  const { t, language, locale: cardLocale } = useLanguage();
  const mealTime = new Date(meal.timestamp);
  const timeStr = mealTime.toLocaleTimeString(cardLocale, { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      className="bg-background rounded-lg overflow-hidden shadow-sm border-l-4 border-l-primary mt-2"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.25 }}
    >
      <div className="bg-primary/10 px-3 py-1.5 flex items-center gap-2">
        <span className="text-sm">✅</span>
        <span className="text-sm font-bold text-primary uppercase tracking-wider">{t("menu.alsoConsumed")}</span>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FoodImage foodName={meal.name} fallbackEmoji={meal.image || '🍽️'} size="sm" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">{translateFoodName(meal.name, language)}</h4>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="w-3 h-3" /><span>{timeStr}</span>
              </div>
            </div>
          </div>
          <button onClick={onRemove} aria-label={`${meal.name} ${t("mealDetail.remove")}`} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="rounded-lg p-2 bg-primary/5 border border-primary/20">
          <div className="flex justify-between items-start mb-1">
            <span className="font-medium text-foreground text-sm">{meal.quantity} {t("menu.serving")}</span>
            <span className="text-sm font-semibold px-2 py-0.5 rounded text-primary bg-primary/10">{meal.calories} kcal</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className="text-sm bg-white px-2 py-0.5 rounded-full text-gray-600 border border-gray-100">🥩 {meal.protein}g {t("menu.proteinG")}</span>
            <span className="text-sm bg-white px-2 py-0.5 rounded-full text-gray-600 border border-gray-100">🌾 {meal.carbs}g {t("menu.carbsG")}</span>
            <span className="text-sm bg-white px-2 py-0.5 rounded-full text-gray-600 border border-gray-100">🫒 {meal.fat}g {t("menu.fatG")}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// EmptyMealCard – neutral meal slot without plan data
// ══════════════════════════════════════════════════════════════

function EmptyMealCard({ title, time, icon }: { title: string; time: string; icon: string }) {
  return (
    <div className="w-full bg-background rounded-2xl border border-dashed border-gray-200 px-4 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-lg">
          <span aria-hidden="true">{icon}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-800">
            {title}
          </span>
          <span className="text-sm text-gray-500">
            {time}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-sm font-semibold text-gray-500">
          –
        </span>
        <span className="text-sm text-gray-500">
          kcal
        </span>
      </div>
    </div>
  );
}
