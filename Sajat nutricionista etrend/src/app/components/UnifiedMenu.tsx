import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { usePlanData, type MealOption } from "../hooks/usePlanData";
import { ChevronDown, Check, Clock, ChevronRight, ChevronLeft, UtensilsCrossed, Utensils, Trash2, Dumbbell, Moon, Waves, X, Flame, Zap, ArrowRightLeft } from "lucide-react";
import { PageHeader } from "./PageHeader";
// DSMCoachMark removed — hints no longer used on this screen
import { DSMQuickLogSheet } from "./dsm/QuickLogSheet";
import { useLanguage, getLocaleDayNarrow, getLocaleMonth, getLocale } from "../contexts/LanguageContext";
import { useCalorieTracker } from "../hooks/useCalorieTracker";
// getMealAlternatives removed — all data comes from uploaded plans only
import { motion, AnimatePresence } from "framer-motion";
import { FuturisticDashboard } from "./FuturisticDashboard";
import { useAppData } from "../hooks/useAppData";
import { EmptyState } from "./EmptyState";
import { DataUploadSheet } from "./DataUploadSheet";
import type { WorkoutScheduleMap } from "./WorkoutCalendar";

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

// Meal time windows (in minutes from midnight)
const BREAKFAST_START = 6 * 60;
const BREAKFAST_END = 8 * 60;
const LUNCH_START = 12 * 60 + 30;
const LUNCH_END = 13 * 60 + 30;
const DINNER_START = 17 * 60 + 30;
const DINNER_END = 18 * 60 + 30;

// ═══════════════════════════════════════════════════════════
// CalendarStrip: Compact elegant 7-day centered view
// ═══════════════════════════════════════════════════════════

function getWorkoutSchedule(): WorkoutScheduleMap {
  try {
    const raw = localStorage.getItem('workoutSchedule');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function getWeekdayType(date: Date, scheduleMap?: WorkoutScheduleMap): 'training' | 'swim' | 'rest' | 'active' {
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
}: {
  selectedDate: Date;
  calendarMonth: number;
  calendarYear: number;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const { language, t } = useLanguage();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const scheduleMap = useMemo(() => getWorkoutSchedule(), []);

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

  return (
    <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm border-b border-gray-100/60 dark:border-[#2a2a2a]/60" role="region" aria-label={t("calendar.calendarView")}>
      {/* Month nav — subtle & elegant */}
      <div className="flex items-center justify-between px-5 py-2">
        <button onClick={onPrevMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#252525] active:bg-gray-200 dark:active:bg-[#2a2a2a] transition-colors" aria-label={t("calendar.prevMonth")}>
          <ChevronLeft className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
        </button>
        <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 tracking-wide" aria-live="polite" aria-atomic="true">
          {displayMonth} {displayYear}
        </span>
        <button onClick={onNextMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#252525] active:bg-gray-200 dark:active:bg-[#2a2a2a] transition-colors" aria-label={t("calendar.nextMonth")}>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
        </button>
      </div>

      {/* Compact 7-day strip */}
      <div className="flex items-center justify-center gap-1 px-3 pb-3" role="listbox" aria-label={t("calendar.weekDays")}>
        {days.map((date, idx) => {
          const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const isToday = dateStr === todayStr;
          const isSelected = idx === 3;
          const dayType = getWeekdayType(date, scheduleMap);
          const dayNum = date.getDate();
          const dayShort = getLocaleDayNarrow(date, language);

          return (
            <motion.button
              key={dateStr}
              onClick={() => onSelectDate(date)}
              role="option"
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${dayShort}, ${getLocaleMonth(date, language)} ${dayNum}${isToday ? ` (${t("calendar.today")})` : ''}${dayType === 'training' ? ` - ${t("calendar.trainingDay")}` : dayType === 'swim' ? ` - ${t("calendar.swimDay")}` : dayType === 'active' ? ` - ${t("calendar.activeRest")}` : ''}`}
              className={`flex-1 max-w-[52px] flex flex-col items-center py-2 rounded-2xl transition-all relative ${
                isSelected
                  ? 'bg-blue-500 shadow-lg shadow-blue-200/60 dark:shadow-blue-500/20'
                  : isToday
                  ? 'bg-blue-50 dark:bg-blue-500/10'
                  : 'hover:bg-gray-50 dark:hover:bg-[#252525]'
              }`}
              whileTap={{ scale: 0.93 }}
              layout
            >
              <span className={`text-[11px] font-medium mb-0.5 ${
                isSelected ? 'text-white/80' : 'text-gray-400'
              }`}>
                {dayShort}
              </span>
              <span className={`text-[15px] font-bold ${
                isSelected ? 'text-white' : isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'
              }`}>
                {dayNum}
              </span>
              {/* Day type dot — only show for typed days */}
              {(dayType === 'training' || dayType === 'swim' || dayType === 'active') && (
                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
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

  const [selectedMeals, setSelectedMeals] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('menuSelectedMeals');
    if (saved) { try { return JSON.parse(saved); } catch { return {}; } }
    return {};
  });
  const [checkedMeals, setCheckedMeals] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('menuCheckedMeals');
    if (saved) { try { return new Set(JSON.parse(saved)); } catch { return new Set(); } }
    return new Set();
  });
  // expandedMealInDay removed — dialog replaces inline expansion
  const [loggedCalories, setLoggedCalories] = useState(0);
  const [loggedMealsForDay, setLoggedMealsForDay] = useState<LoggedMeal[]>([]);
  // selectionModeKey removed — dialog-based alt selection replaces long press
  const [windowFeedback, setWindowFeedback] = useState<string | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const currentMealRef = useRef<HTMLDivElement>(null);
  const restTimerRef = useRef<HTMLDivElement>(null);

  // ─── Snack consumption state (1 apple/day, 1 walnut/day) ──
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [consumedSnacks, setConsumedSnacks] = useState<{ apple: boolean; walnut: boolean }>(() => {
    const saved = localStorage.getItem(`snacks_${todayDateStr}`);
    if (saved) { try { return JSON.parse(saved); } catch { return { apple: false, walnut: false }; } }
    return { apple: false, walnut: false };
  });

  // ─── Water intake state (synced with Layout's floating tracker) ──
  const [waterIntakeMl, setWaterIntakeMl] = useState(0);

  useEffect(() => {
    const loadWater = () => {
      const wd = localStorage.getItem('waterTracking');
      if (wd) { try { setWaterIntakeMl(JSON.parse(wd)[todayDateStr] || 0); } catch {} }
    };
    loadWater();
    window.addEventListener('storage', loadWater);
    const iv = setInterval(loadWater, 1500);
    return () => { window.removeEventListener('storage', loadWater); clearInterval(iv); };
  }, [todayDateStr]);

  const APPLE_KCAL = 95;
  const WALNUT_KCAL = 185;

  const snackCalories = useMemo(() => {
    let total = 0;
    if (consumedSnacks.apple) total += APPLE_KCAL;
    if (consumedSnacks.walnut) total += WALNUT_KCAL;
    return total;
  }, [consumedSnacks]);

  const handleSnackConsume = useCallback((type: 'apple' | 'walnut') => {
    setConsumedSnacks(prev => {
      const updated = { ...prev, [type]: !prev[type] };
      localStorage.setItem(`snacks_${todayDateStr}`, JSON.stringify(updated));
      if (navigator.vibrate) navigator.vibrate(updated[type] ? [10, 20] : 8);
      return updated;
    });
  }, [todayDateStr]);

  const handleWaterTap = useCallback(() => {
    const waterData = localStorage.getItem('waterTracking');
    const data = waterData ? JSON.parse(waterData) : {};
    const current = data[todayDateStr] || 0;
    const newAmount = current < 3000 ? Math.min(current + 250, 3000) : 0;
    data[todayDateStr] = newAmount;
    localStorage.setItem('waterTracking', JSON.stringify(data));
    if (navigator.vibrate) navigator.vibrate(10);
    window.dispatchEvent(new Event('storage'));
  }, [todayDateStr]);

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
    const update = () => {
      const stored = localStorage.getItem("totalConsumedCalories");
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
    const load = () => {
      const stored = localStorage.getItem(`loggedMeals_${dateStr}`);
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
        isInEatingWindow: false, nextMealTime: null, restingTimeMinutes: 0,
        isToday: false, isPast, isFuture: !isPast
      };
    }

    const currentHour = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinutes;

    const breakfastPassed = currentTimeInMinutes > BREAKFAST_END;
    const lunchPassed = currentTimeInMinutes > LUNCH_END;
    const dinnerPassed = currentTimeInMinutes > DINNER_END;

    const inBreakfastWindow = currentTimeInMinutes >= BREAKFAST_START && currentTimeInMinutes <= BREAKFAST_END;
    const inLunchWindow = currentTimeInMinutes >= LUNCH_START && currentTimeInMinutes <= LUNCH_END;
    const inDinnerWindow = currentTimeInMinutes >= DINNER_START && currentTimeInMinutes <= DINNER_END;
    const isInEatingWindow = inBreakfastWindow || inLunchWindow || inDinnerWindow;

    let currentMeal: string | null = null;
    let nextMealTime: number | null = null;
    let restingTimeMinutes = 0;

    if (inBreakfastWindow) currentMeal = "breakfast";
    else if (inLunchWindow) currentMeal = "lunch";
    else if (inDinnerWindow) currentMeal = "dinner";
    else if (!breakfastPassed) { currentMeal = "breakfast"; nextMealTime = BREAKFAST_START; restingTimeMinutes = BREAKFAST_START - currentTimeInMinutes; }
    else if (!lunchPassed) { currentMeal = "lunch"; nextMealTime = LUNCH_START; restingTimeMinutes = LUNCH_START - currentTimeInMinutes; }
    else if (!dinnerPassed) { currentMeal = "dinner"; nextMealTime = DINNER_START; restingTimeMinutes = DINNER_START - currentTimeInMinutes; }
    else { restingTimeMinutes = (24 * 60 - currentTimeInMinutes) + BREAKFAST_START; currentMeal = "breakfast"; nextMealTime = BREAKFAST_START; }

    return {
      currentMeal, canCheckBreakfast: inBreakfastWindow, canCheckLunch: inLunchWindow, canCheckDinner: inDinnerWindow,
      breakfastPassed, lunchPassed, dinnerPassed, isInEatingWindow, nextMealTime, restingTimeMinutes,
      isToday: true, isPast: false, isFuture: false
    };
  };

  const removeLoggedMeal = (mealId: string) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const updated = loggedMealsForDay.filter(m => m.id !== mealId);
    setLoggedMealsForDay(updated);
    localStorage.setItem(`loggedMeals_${dateStr}`, JSON.stringify(updated));
    const newTotal = updated.reduce((sum, m) => sum + m.calories, 0);
    localStorage.setItem('totalConsumedCalories', newTotal.toString());
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
    localStorage.setItem('menuSelectedMeals', JSON.stringify(updated));
  };

  const handleMealCheck = (mealId: string, date: Date, mealType: string) => {
    const status = getMealStatus(date);
    if (!status.isToday) return;
    
    // ─── Feedback when outside time window (UX improvement) ───
    const canCheck = (mealType === "breakfast" && status.canCheckBreakfast) ||
      (mealType === "lunch" && status.canCheckLunch) ||
      (mealType === "dinner" && status.canCheckDinner);
    
    if (!canCheck) {
      const windowMap: Record<string, string> = {
        breakfast: "06:00 - 08:00",
        lunch: "12:30 - 13:30",
        dinner: "17:30 - 18:30",
      };
      setWindowFeedback(t("mealDetail.mealWindowMsg").replace('{time}', windowMap[mealType] || ""));
      if (navigator.vibrate) navigator.vibrate(30);
      setTimeout(() => setWindowFeedback(null), 3000);
      return;
    }
    
    if (navigator.vibrate) navigator.vibrate([10, 20]);
    setCheckedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) newSet.delete(mealId); else newSet.add(mealId);
      localStorage.setItem('menuCheckedMeals', JSON.stringify([...newSet]));
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
    const loadSportCal = () => {
      try {
        const wd = localStorage.getItem('workoutTracking');
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
  const menuScheduleMap = useMemo(() => getWorkoutSchedule(), []);
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

  const mealSlots = [
    { type: 'breakfast' as const, title: t("menu.breakfast"), time: "06:00 - 08:00", icon: "🌅", meals: dayMeals?.breakfast || [], selected: selectedBreakfast, alternatives: breakfastAlternatives, primary: dayMeals?.breakfast[0], consumed: breakfastConsumed, canEdit: canEditBreakfast, canCheck: status.canCheckBreakfast, isPassed: status.breakfastPassed },
    { type: 'lunch' as const, title: t("menu.lunch"), time: "12:30 - 13:30", icon: "☀️", meals: dayMeals?.lunch || [], selected: selectedLunch, alternatives: lunchAlternatives, primary: dayMeals?.lunch[0], consumed: lunchConsumed, canEdit: canEditLunch, canCheck: status.canCheckLunch, isPassed: status.lunchPassed },
    { type: 'dinner' as const, title: t("menu.dinner"), time: "17:30 - 18:30", icon: "🌙", meals: dayMeals?.dinner || [], selected: selectedDinner, alternatives: dinnerAlternatives, primary: dayMeals?.dinner[0], consumed: dinnerConsumed, canEdit: canEditDinner, canCheck: status.canCheckDinner, isPassed: status.dinnerPassed },
  ];

  const loggedSlotMap = { breakfast: 'after-breakfast' as const, lunch: 'after-lunch' as const, dinner: 'after-dinner' as const };

  // ─── Render ────────────────────────────────────────────────

  // Show EmptyState only if no nutrition plan AND no fallback data available
  if (!appData.isLoading && !appData.hasActivePlan && !hasPlanData) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <DataUploadSheet open={uploadSheetOpen} onClose={() => setUploadSheetOpen(false)} onComplete={() => appData.refresh()} />
        <EmptyState variant="menu" onUpload={() => setUploadSheetOpen(true)} />
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
            className="absolute top-2 left-4 right-4 z-50 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg"
          >
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-[13px] text-amber-800 dark:text-amber-200 font-medium">{windowFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ HEADER ══ */}
      <div className="flex-shrink-0">
        <PageHeader
          icon={UtensilsCrossed}
          title={t("menu.title")}
          subtitle={`28 ${t("menu.dayPlan")} - ${currentTime.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`}
          gradientFrom="from-blue-400"
          gradientTo="to-emerald-500"
          action={<FuturisticDashboard />}
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
        <AnimatePresence mode="wait">
          <motion.div
            key={dayKey}
            initial={{ opacity: 0, x: swipeDir === 'left' ? 80 : swipeDir === 'right' ? -80 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: swipeDir === 'left' ? -80 : swipeDir === 'right' ? 80 : 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="px-3 sm:px-4 lg:px-6 py-3 space-y-3"
          >
            {/* ── 1. Sports Day Badge — Full-width, blended into background ── */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`-mx-3 sm:-mx-4 lg:-mx-6 px-4 sm:px-5 lg:px-7 py-3 ${
                isTrainingDay
                  ? 'bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-orange-50/80 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-orange-950/30'
                  : isSwimDay
                  ? 'bg-gradient-to-r from-cyan-50/80 via-teal-50/60 to-cyan-50/80 dark:from-cyan-950/30 dark:via-teal-950/20 dark:to-cyan-950/30'
                  : 'bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-blue-50/80 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-blue-950/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
                  isTrainingDay ? 'bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-500/20 dark:to-amber-500/20' : isSwimDay ? 'bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-500/20 dark:to-teal-500/20' : 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-500/20 dark:to-indigo-500/20'
                }`}>
                  {isTrainingDay ? <Dumbbell className="w-5 h-5 text-orange-600 dark:text-orange-400" /> : isSwimDay ? <Waves className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> : <Moon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[15px] font-bold ${isTrainingDay ? 'text-orange-800 dark:text-orange-300' : isSwimDay ? 'text-cyan-800 dark:text-cyan-300' : 'text-blue-800 dark:text-blue-300'}`}>
                      {dayLabel}
                    </span>
                    <span className={`text-[12px] font-medium ${isTrainingDay ? 'text-orange-500 dark:text-orange-400' : isSwimDay ? 'text-cyan-500 dark:text-cyan-400' : 'text-blue-500 dark:text-blue-400'}`}>
                      • {isTrainingDay ? t("menu.higherCarbs") : t("menu.lowerCarbs")}
                    </span>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isTrainingDay ? 'text-orange-400 dark:text-orange-500/70' : isSwimDay ? 'text-cyan-400 dark:text-cyan-500/70' : 'text-blue-400 dark:text-blue-500/70'}`}>
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

            {/* ── 2. Rest Timer (INACTIVE state only) — auto-scrolled to on load ── */}
            {status.isToday && !status.isInEatingWindow && (
              <div ref={restTimerRef}>
              <RestTimerCard
                restingTimeMinutes={status.restingTimeMinutes}
                currentMeal={status.currentMeal}
                t={t}
                consumedSnacks={consumedSnacks}
                onSnackConsume={handleSnackConsume}
                onWaterTap={handleWaterTap}
                waterIntakeMl={waterIntakeMl}
              />
              </div>
            )}

            {/* For non-today days, show a simple info banner */}
            {!status.isToday && (
              <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border ${
                status.isPast
                  ? 'bg-gray-50 dark:bg-gray-50/50 border-gray-200 text-gray-500'
                  : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="text-[14px] font-medium">
                  {status.isPast ? t("menu.pastDay") : t("menu.upcomingDay")}
                </span>
              </div>
            )}

            {/* ── 3. Meal Cards ── */}
            <div className="space-y-3">
              {mealSlots.map((slot, slotIdx) => {
                const isFocusMeal = status.isToday && status.isInEatingWindow && status.currentMeal === slot.type;
                const isConsumedToday = status.isToday && slot.consumed;

                if (isConsumedToday && !isFocusMeal) {
                  return (
                    <motion.div key={slot.type}>
                      <ConsumedMealCompact title={slot.title} icon={slot.icon} time={slot.time} meal={slot.selected} />
                      {status.isToday && getLoggedMealsForSlot(loggedSlotMap[slot.type]).map(meal => (
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
                      <MealCardWithAlternatives
                        title={slot.title} time={slot.time} icon={slot.icon}
                        meals={slot.meals} selectedMeal={slot.selected} alternatives={slot.alternatives}
                        primaryMeal={slot.primary} mealType={slot.type} dayKey={dayKey}
                        onSelect={(mealId) => handleMealSelect(mealId, slot.type, dayKey)}
                        checked={slot.selected ? checkedMeals.has(slot.selected.id) : false}
                        onCheck={() => slot.selected && handleMealCheck(slot.selected.id, selectedDate, slot.type)}
                        isCurrent={status.currentMeal === slot.type}
                        isFocus={isFocusMeal}
                        isPassed={slot.isPassed}
                        canCheck={slot.canCheck}
                        isToday={status.isToday}
                        canEdit={slot.canEdit && !checkedMeals.has(slot.selected?.id || '')}
                        isTrainingDay={isTrainingDay}
                        dayLabel={dayLabel}
                        calorieTarget={calorieTarget}
                        mealRef={isFocusMeal ? currentMealRef : (status.isToday && status.currentMeal === slot.type ? currentMealRef : undefined)}
                      />
                      {/* Water badge on dinner card */}
                      {slot.type === 'dinner' && status.isToday && (
                        <motion.button
                          onClick={handleWaterTap}
                          whileTap={{ scale: 0.9 }}
                          className="absolute -bottom-2 -right-1 flex items-center gap-1 px-2 py-1 bg-white dark:bg-card rounded-lg border border-blue-200 dark:border-blue-500/30 shadow-sm"
                        >
                          <div className="relative w-4 h-5 flex-shrink-0">
                            <svg viewBox="0 0 24 30" className="w-full h-full">
                              <defs><clipPath id="dinnerWaterClip"><path d="M 5 2 L 19 2 L 20 28 L 4 28 Z" /></clipPath></defs>
                              <g clipPath="url(#dinnerWaterClip)">
                                <rect x="4" y={30 - Math.min(100, (waterIntakeMl / 3000) * 100) * 0.26} width="16" height={Math.min(100, (waterIntakeMl / 3000) * 100) * 0.26} fill="#60A5FA" className="transition-all duration-500" />
                              </g>
                              <path d="M 5 2 L 19 2 L 20 28 L 4 28 Z" fill="none" stroke="#60A5FA" strokeWidth="1.5" opacity="0.7" />
                            </svg>
                          </div>
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            {t("menu.waterLabel")}{waterIntakeMl > 0 ? ` ${(waterIntakeMl / 1000).toFixed(1)}L` : ' 0.5L'}
                          </span>
                        </motion.button>
                      )}
                    </div>
                    {status.isToday && getLoggedMealsForSlot(loggedSlotMap[slot.type]).map(meal => (
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
        onLogMeal={(item) => {
          const today = new Date().toISOString().split('T')[0];
          const stored = localStorage.getItem(`loggedMeals_${today}`);
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
          localStorage.setItem(`loggedMeals_${today}`, JSON.stringify(meals));
        }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// RestTimerCard
// ══════════════════════════════════════════════════════════════

function RestTimerCard({ restingTimeMinutes, currentMeal, t, consumedSnacks, onSnackConsume, onWaterTap, waterIntakeMl }: {
  restingTimeMinutes: number;
  currentMeal: string | null;
  t: (key: string) => string;
  consumedSnacks: { apple: boolean; walnut: boolean };
  onSnackConsume: (type: 'apple' | 'walnut') => void;
  onWaterTap: () => void;
  waterIntakeMl: number;
}) {
  const hours = Math.floor(restingTimeMinutes / 60);
  const minutes = restingTimeMinutes % 60;
  const maxRestMinutes = 720;
  const elapsedFraction = Math.max(0, Math.min(1, (maxRestMinutes - restingTimeMinutes) / maxRestMinutes));
  const remainingPercent = Math.round((restingTimeMinutes / maxRestMinutes) * 100);
  const waterLiters = (waterIntakeMl / 1000).toFixed(1);
  const waterFillPct = Math.min(100, (waterIntakeMl / 3000) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 via-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:via-teal-950/20 dark:to-sky-950/30 border-2 border-cyan-200/70 dark:border-cyan-700/40 p-5 shadow-xl"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-200/30 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-teal-200/30 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10 space-y-4">
        {/* Countdown — no background box, clean floating text */}
        <div className="flex items-center justify-center">
          <motion.div className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 250 }}
          >
            <div className="flex flex-col items-center gap-1 py-4">
              <motion.div
                className="text-5xl font-black bg-gradient-to-r from-cyan-600 via-teal-600 to-sky-600 dark:from-cyan-400 dark:via-teal-400 dark:to-sky-400 bg-clip-text text-transparent tracking-tight"
                key={`${hours}:${minutes}`}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {hours}:{String(minutes).padStart(2, '0')}
              </motion.div>
              <div className="text-[13px] uppercase tracking-widest font-bold text-cyan-600/80 dark:text-cyan-400/80">
                {t("menu.restingTime").toUpperCase()}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-2.5 bg-white/60 dark:bg-white/10 rounded-full overflow-hidden border border-cyan-200/50 dark:border-cyan-700/30 shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-sky-400 rounded-full shadow-lg"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, elapsedFraction * 100))}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between items-center text-[13px] text-cyan-700/70 dark:text-cyan-400/70 font-medium">
            <span>{t("menu.restPeriodLabel")}</span>
            <span>{remainingPercent}% {t("menu.percentRemaining")}</span>
          </div>
        </div>

        {/* Tappable snack buttons */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-cyan-700/60 dark:text-cyan-400/60 uppercase tracking-wider">{t("menu.allowedSnacks")}:</span>
          <div className="flex items-center gap-2">
            {/* Apple button */}
            <motion.button
              onClick={() => onSnackConsume('apple')}
              whileTap={{ scale: 0.92 }}
              aria-pressed={consumedSnacks.apple}
              aria-label={`${t("menu.apple")} snack (95 kcal)${consumedSnacks.apple ? ` — ${t("mealDetail.consumed")}` : ''}`}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                consumedSnacks.apple
                  ? 'bg-green-100 dark:bg-green-500/15 border-green-400 dark:border-green-500/40 shadow-sm'
                  : 'bg-white/70 dark:bg-card/70 border-emerald-200/70 dark:border-emerald-500/30 hover:border-emerald-400 shadow-sm'
              }`}
            >
              <span className="text-lg">🍎</span>
              <div className="flex-1 text-left">
                <span className={`text-[13px] font-semibold ${consumedSnacks.apple ? 'text-green-700 dark:text-green-400 line-through' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {t("menu.apple")}
                </span>
                <span className="text-[11px] text-gray-400 block">95 kcal</span>
              </div>
              {consumedSnacks.apple && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                  className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </motion.button>

            {/* Walnut button */}
            <motion.button
              onClick={() => onSnackConsume('walnut')}
              whileTap={{ scale: 0.92 }}
              aria-pressed={consumedSnacks.walnut}
              aria-label={`${t("menu.walnut")} snack (185 kcal)${consumedSnacks.walnut ? ` — ${t("mealDetail.consumed")}` : ''}`}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                consumedSnacks.walnut
                  ? 'bg-green-100 dark:bg-green-500/15 border-green-400 dark:border-green-500/40 shadow-sm'
                  : 'bg-white/70 dark:bg-card/70 border-emerald-200/70 dark:border-emerald-500/30 hover:border-emerald-400 shadow-sm'
              }`}
            >
              <span className="text-lg">🥜</span>
              <div className="flex-1 text-left">
                <span className={`text-[13px] font-semibold ${consumedSnacks.walnut ? 'text-green-700 dark:text-green-400 line-through' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {t("menu.walnut")}
                </span>
                <span className="text-[11px] text-gray-400 block">185 kcal</span>
              </div>
              {consumedSnacks.walnut && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                  className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </motion.button>

            {/* Water button — synced with floating tracker */}
            <motion.button
              onClick={onWaterTap}
              whileTap={{ scale: 0.92 }}
              aria-label={`${t("mealDetail.addWater")} (+250ml). ${t("mealDetail.current")}: ${waterIntakeMl > 0 ? `${(waterIntakeMl / 1000).toFixed(1)}L` : '0L'} / 3L`}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all ${
                waterIntakeMl > 0
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700/40 shadow-sm'
                  : 'bg-white/70 dark:bg-card/70 border-cyan-200/70 dark:border-cyan-500/30 hover:border-cyan-400 shadow-sm'
              }`}
            >
              {/* Mini water glass SVG — mirrors the floating tracker */}
              <div className="relative w-6 h-7 flex-shrink-0">
                <svg viewBox="0 0 24 30" className="w-full h-full">
                  <defs>
                    <linearGradient id="miniWaterG" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "#60A5FA", stopOpacity: 0.9 }} />
                      <stop offset="100%" style={{ stopColor: "#3B82F6", stopOpacity: 1 }} />
                    </linearGradient>
                    <clipPath id="miniGlassClip"><path d="M 5 2 L 19 2 L 20 28 L 4 28 Z" /></clipPath>
                  </defs>
                  <g clipPath="url(#miniGlassClip)">
                    <rect x="4" y={30 - waterFillPct * 0.26} width="16" height={waterFillPct * 0.26} fill="url(#miniWaterG)" className="transition-all duration-500" />
                  </g>
                  <path d="M 5 2 L 19 2 L 20 28 L 4 28 Z" fill="none" stroke="#60A5FA" strokeWidth="1.5" opacity="0.7" />
                </svg>
              </div>
              <div className="text-left">
                <span className="text-[13px] font-semibold text-cyan-700 dark:text-cyan-400">{t("menu.waterLabel")}</span>
                <span className="text-[11px] text-blue-500 block font-bold">
                  {waterIntakeMl > 0 ? `${waterLiters}L` : '+250ml'}
                </span>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Next meal — transparent, no background */}
        <motion.div
          className="flex items-center justify-center gap-3 px-5 py-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
            <Utensils className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <div className="text-[12px] text-cyan-600/70 dark:text-cyan-400/70 font-medium uppercase tracking-wide">{t("menu.nextMeal").toUpperCase()}</div>
            <div className="text-[16px] font-bold text-cyan-900 dark:text-cyan-200">
              {currentMeal === "breakfast" && `06:00 (${t("menu.breakfast")})`}
              {currentMeal === "lunch" && `12:30 (${t("menu.lunch")})`}
              {currentMeal === "dinner" && `17:30 (${t("menu.dinner")})`}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
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
      className="bg-white dark:bg-card rounded-2xl border border-green-200/60 dark:border-green-500/20 shadow-sm overflow-hidden opacity-70"
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[15px] text-green-700 dark:text-green-400 line-through">{title}</h4>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            <span className="text-[12px] text-gray-400 dark:text-gray-500">{time}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// MealCardWithAlternatives — v4 (Inline expand with ingredient details)
// Tap → expand inline (food items + macros). Swap button → full-screen.
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
  mealRef?: React.RefObject<HTMLDivElement>;
}

function MealCardWithAlternatives(props: MealCardWithAlternativesProps) {
  const {
    title, time, icon, selectedMeal, alternatives, primaryMeal,
    onSelect,
    checked, onCheck, isFocus, isPassed, canCheck, isToday,
    canEdit, isTrainingDay, dayLabel, calorieTarget,
    mealRef
  } = props;

  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const allOptions = primaryMeal ? [primaryMeal, ...alternatives] : alternatives;

  const handleCardTap = useCallback(() => {
    setExpanded(prev => !prev);
    if (navigator.vibrate) navigator.vibrate(10);
  }, []);

  const handleAlternativeSelect = useCallback((mealId: string) => {
    onSelect(mealId);
    if (navigator.vibrate) navigator.vibrate(10);
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
    const match = ing.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (match) return { foodName: match[1].trim(), qty: match[2].trim() };
    return { foodName: ing, qty: '' };
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
      ? 'bg-blue-50/60 dark:bg-blue-500/10 ring-2 ring-blue-300/50 dark:ring-blue-500/30 shadow-lg'
    : variant === 'consumed'
      ? 'bg-white dark:bg-card border border-green-200/60 dark:border-green-500/20 shadow-sm opacity-70'
    : 'bg-white dark:bg-card border border-gray-100/60 dark:border-[#2a2a2a] shadow-sm';

  const iconBgClass =
    variant === 'active'
      ? 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-500/20 dark:to-blue-500/30'
    : variant === 'consumed'
      ? 'bg-green-500'
    : isPassed && isToday
      ? 'bg-gray-100 dark:bg-gray-800'
    : 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-500/10 dark:to-amber-500/20';

  const titleClass =
    variant === 'active'
      ? 'text-blue-700 dark:text-blue-400'
    : variant === 'consumed'
      ? 'text-green-700 dark:text-green-400 line-through'
    : isPassed && isToday
      ? 'text-gray-400 dark:text-gray-500'
    : 'text-gray-900 dark:text-gray-100';

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
            className="bg-gradient-to-r from-blue-400 to-teal-400 dark:from-blue-500 dark:to-teal-500 px-4 py-1.5 flex items-center gap-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
              <Clock className="w-3.5 h-3.5 text-white" />
            </motion.div>
            <span className="text-[13px] font-semibold text-white">{t("menu.eatingWindow")}</span>
          </motion.div>
        )}

        {/* ─── Header: tap to expand ─── */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleCardTap}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardTap(); } }}
          className="w-full text-left px-4 py-3 active:bg-gray-50/50 dark:active:bg-white/5 transition-colors cursor-pointer"
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
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                    {totalKcal} kcal
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                <span className="text-[12px] text-gray-400 dark:text-gray-500">{time}</span>
              </div>
            </div>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.div>
          </div>

          {/* Row 2: Meal name + "1 adag" (always visible when meal data exists) */}
          {mealName && (
            <div className="mt-2 ml-[52px] flex items-center gap-2">
              <UtensilsCrossed className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-[13px] text-gray-700 dark:text-gray-300 truncate">{mealName}</span>
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-md flex-shrink-0 ml-auto">
                1 {t("mealDetail.serving") || 'adag'}
              </span>
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
                {/* Description line */}
                {mealDesc && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 ml-1 mb-1 italic">{mealDesc}</p>
                )}

                {/* ── Structured ingredient rows (from IndexedDB upload) ── */}
                {details && details.length > 0 ? (
                  details.map((ing, idx) => (
                    <div key={idx} className="bg-gray-50/80 dark:bg-[#1E1E1E] rounded-xl px-3 py-2.5 border border-gray-100/60 dark:border-[#2a2a2a]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{ing.name}</span>
                          <span className="text-[11px] text-gray-400 flex-shrink-0">({ing.quantity})</span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                          {Math.round(ing.calories)} kcal
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">{t("menu.proteinG")}</span>
                          <span className="text-[10px] font-medium text-red-600 dark:text-red-400">{ing.protein.toFixed(1)}g</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">{t("menu.carbsG")}</span>
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">{ing.carbs.toFixed(1)}g</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">{t("menu.fatG")}</span>
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{ing.fat.toFixed(1)}g</span>
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
                      <div key={idx} className="bg-gray-50/80 dark:bg-[#1E1E1E] rounded-xl px-3 py-2.5 border border-gray-100/60 dark:border-[#2a2a2a]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{foodName}</span>
                            {qty && <span className="text-[11px] text-gray-400 flex-shrink-0">({qty})</span>}
                          </div>
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                            ~{perKcal} kcal
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{t("menu.proteinG")}</span>
                            <span className="text-[10px] font-medium text-red-600 dark:text-red-400">{perP}g</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{t("menu.carbsG")}</span>
                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">{perC}g</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{t("menu.fatG")}</span>
                            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{perF}g</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[12px] text-gray-400 dark:text-gray-500 text-center py-2">
                    {t("mealDetail.ingredients") || 'Nincs összetevő adat'}
                  </div>
                )}

                {/* ── Total summary bar ── */}
                {totalKcal > 0 && (
                  <div className="flex items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-500/8 dark:to-indigo-500/8 rounded-xl px-3 py-2.5 border border-blue-100/50 dark:border-blue-500/15">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-[12px] font-bold text-blue-700 dark:text-blue-400">{totalKcal} kcal</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-medium text-red-600 dark:text-red-400">{typeof mealProtein === 'number' ? mealProtein.toFixed(1) : mealProtein}g F</span>
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">{typeof mealCarbs === 'number' ? mealCarbs.toFixed(1) : mealCarbs}g Sz</span>
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{typeof mealFat === 'number' ? mealFat.toFixed(1) : mealFat}g Zs</span>
                    </div>
                  </div>
                )}

                {/* ── Swap meal button ── */}
                {canEdit && !checked && allOptions.length > 1 && (
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); setSwapOpen(true); }}
                    className="w-full flex items-center justify-center gap-2 bg-purple-50 dark:bg-purple-500/10 rounded-xl px-4 py-2.5 border border-purple-200/60 dark:border-purple-500/20 active:bg-purple-100 dark:active:bg-purple-500/15 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowRightLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-[12px] font-bold text-purple-700 dark:text-purple-400">{t("mealDetail.swapMeal") || 'Étkezés cseréje'}</span>
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
  const { t } = useLanguage();
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
      className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#121212]"
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-gray-100 dark:border-[#2a2a2a]">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#252525] flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
          aria-label={t("mealDetail.close")}
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="text-center">
          <h2 className="font-bold text-[16px] text-gray-900 dark:text-gray-100">{title}</h2>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-[11px] text-gray-400">{time}</span>
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
                ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200/60 dark:border-orange-500/20'
                : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {isTrainingDay
                  ? <Dumbbell className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  : <Moon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                }
                <span className={`text-[12px] font-bold ${
                  isTrainingDay ? 'text-orange-700 dark:text-orange-400' : 'text-blue-700 dark:text-blue-400'
                }`}>
                  {dayLabel}
                </span>
              </div>
              <p className={`text-[11px] ${
                isTrainingDay ? 'text-orange-500 dark:text-orange-500/70' : 'text-blue-500 dark:text-blue-500/70'
              }`}>
                {isTrainingDay ? t("mealDetail.higherCarbs") : t("mealDetail.lowerCarbs")}
              </p>
            </div>
            <div className="flex-1 rounded-xl p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-[12px] font-bold text-blue-700 dark:text-blue-400">{t("mealDetail.calorieBudget")}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[17px] font-bold text-blue-800 dark:text-blue-300">~{mealAllowance}</span>
                <span className="text-[11px] text-blue-500 dark:text-blue-500/70">kcal</span>
              </div>
            </div>
          </div>

          {/* ── Current meal: name + total calories ── */}
          {selectedMeal && (
            <div className="rounded-2xl bg-gradient-to-br from-blue-50/80 to-cyan-50/60 dark:from-blue-500/10 dark:to-cyan-500/5 border border-blue-200/50 dark:border-blue-500/20 p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-500/10 dark:to-amber-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[16px] text-gray-900 dark:text-gray-100 mb-1">{selectedMeal.name}</h3>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{selectedMeal.description}</p>
                </div>
              </div>

              {/* Total calories + macro ring */}
              <div className="flex items-center justify-between bg-white/70 dark:bg-[#1E1E1E]/70 rounded-xl p-3 border border-blue-100/60 dark:border-blue-500/15">
                <div>
                  <span className="text-[24px] font-black text-blue-700 dark:text-blue-400">{totalKcal}</span>
                  <span className="text-[13px] text-blue-500 dark:text-blue-500/70 ml-1">kcal</span>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-[14px] font-bold text-red-600 dark:text-red-400">{macros.protein}g</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">🥩 {t("menu.proteinG")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[14px] font-bold text-amber-600 dark:text-amber-400">{macros.carbs}g</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">🌾 {t("menu.carbsG")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[14px] font-bold text-emerald-600 dark:text-emerald-400">{macros.fat}g</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">🫒 {t("menu.fatG")}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Ingredients breakdown ── */}
          {selectedMeal?.ingredients && selectedMeal.ingredients.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Utensils className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("mealDetail.ingredients") || 'Összetevők'}</span>
              </div>
              <div className="space-y-2">
                {selectedMeal.ingredients.map((ing: string, idx: number) => {
                  // Estimate per-ingredient calories/macros (evenly split as heuristic)
                  const perIngKcal = Math.round(totalKcal / selectedMeal.ingredients.length);
                  const perIngProtein = Math.round(macros.protein / selectedMeal.ingredients.length);
                  const perIngCarbs = Math.round(macros.carbs / selectedMeal.ingredients.length);
                  const perIngFat = Math.round(macros.fat / selectedMeal.ingredients.length);

                  return (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-[#1E1E1E] rounded-xl px-3 py-2.5 border border-gray-100 dark:border-[#2a2a2a]">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#252525] flex items-center justify-center text-sm border border-gray-100 dark:border-[#2a2a2a]">
                        🍽️
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{ing}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400">~{perIngKcal} kcal</span>
                          <span className="text-[10px] text-red-400">P {perIngProtein}g</span>
                          <span className="text-[10px] text-amber-400">C {perIngCarbs}g</span>
                          <span className="text-[10px] text-emerald-400">F {perIngFat}g</span>
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
                className="w-full flex items-center justify-between bg-purple-50 dark:bg-purple-500/10 rounded-xl px-4 py-3 border border-purple-200/60 dark:border-purple-500/20 active:bg-purple-100 dark:active:bg-purple-500/15 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-[13px] font-bold text-purple-700 dark:text-purple-400">{t("mealDetail.swapMeal") || 'Étkezés cseréje'}</span>
                </div>
                <motion.div animate={{ rotate: showAlternatives ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 text-purple-500 dark:text-purple-400" />
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
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{t("mealDetail.tapToChoose")}</span>
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
                                ? 'bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-400 dark:border-blue-500/40'
                                : 'bg-white dark:bg-[#252525] border border-gray-100 dark:border-[#2a2a2a] hover:border-blue-200 dark:hover:border-blue-500/30 active:bg-gray-50 dark:active:bg-[#2a2a2a]'
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
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                                  idx === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
                                }`}>
                                  {idx === 0 ? `🥗 ${t("mealDetail.dietPlanLabel")}` : t("mealDetail.alternativeN").replace('{n}', String(idx))}
                                </span>
                              </div>
                              <span className={`text-[12px] font-bold px-2 py-0.5 rounded-lg ${
                                isSelected
                                  ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400'
                                  : isOverBudget
                                  ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                                  : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400'
                              }`}>
                                {meal.calories}
                              </span>
                            </div>

                            <h5 className="font-semibold text-[13px] text-gray-900 dark:text-gray-100 mb-0.5">{meal.name}</h5>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{meal.description}</p>

                            {meal.ingredients && meal.ingredients.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {meal.ingredients.slice(0, 4).map((ing: string, i: number) => (
                                  <span key={i} className="text-[10px] bg-gray-50 dark:bg-[#1E1E1E] text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md">{ing}</span>
                                ))}
                                {meal.ingredients.length > 4 && (
                                  <span className="text-[10px] bg-gray-50 dark:bg-[#1E1E1E] text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-md">+{meal.ingredients.length - 4}</span>
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
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-[#2a2a2a]">
              <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
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
  const { t, locale: cardLocale } = useLanguage();
  const mealTime = new Date(meal.timestamp);
  const timeStr = mealTime.toLocaleTimeString(cardLocale, { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      className="bg-white dark:bg-card rounded-lg overflow-hidden shadow-sm border-l-4 border-l-emerald-400 dark:border-l-emerald-500 mt-2"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.25 }}
    >
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 px-3 py-1.5 flex items-center gap-2">
        <span className="text-sm">✅</span>
        <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{t("menu.alsoConsumed")}</span>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-500/20 dark:to-teal-500/20">
              {meal.image || '🍽️'}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{meal.name}</h4>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" /><span>{timeStr}</span>
              </div>
            </div>
          </div>
          <button onClick={onRemove} aria-label={`${meal.name} ${t("mealDetail.remove")}`} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="rounded-lg p-2 bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/15">
          <div className="flex justify-between items-start mb-1">
            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{meal.quantity} {t("menu.serving")}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15">{meal.calories} kcal</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className="text-xs bg-white dark:bg-[#252525] px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-[#2a2a2a]">🥩 {meal.protein}g {t("menu.proteinG")}</span>
            <span className="text-xs bg-white dark:bg-[#252525] px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-[#2a2a2a]">🌾 {meal.carbs}g {t("menu.carbsG")}</span>
            <span className="text-xs bg-white dark:bg-[#252525] px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-[#2a2a2a]">🫒 {meal.fat}g {t("menu.fatG")}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
