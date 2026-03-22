/**
 * ====================================================================
 * WorkoutCalendar — Sport Naptár / Tervező
 * ====================================================================
 * A tappable banner + calendar sheet system that replaces the static
 * DSMWorkoutDayBanner. Lets users:
 *   1. See today's planned workout at a glance
 *   2. Open a 7-day (week) or 30-day (month) calendar
 *   3. Assign sport types to any day
 *   4. Data persists in IndexedDB settings `workoutSchedule`
 *   5. Auto-syncs with daily menu & calorie tracker
 *
 * Data model:
 *   workoutSchedule: { [date: string]: ScheduledWorkout[] }
 * ====================================================================
 */

import { hapticFeedback } from '@/lib/haptics';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, ChevronLeft, ChevronRight, X, Plus, Trash2,
  Dumbbell, Moon, Sparkles, Clock, Flame,
  CalendarDays, CalendarRange, Check
} from 'lucide-react';
import { useLanguage, getLocaleDayNarrow, getLocaleMonth } from '../../../contexts/LanguageContext';
import { getSetting, setSetting } from '../../../backend/services/SettingsService';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ScheduledWorkout {
  id: string;
  sportId: string;
  sportName: string;
  sportIcon: string;
  sportCategory: string;
  caloriesPerMinute: number;
  intensity: 'light' | 'moderate' | 'intense';
  plannedDuration?: number;
}

export type WorkoutScheduleMap = Record<string, ScheduledWorkout[]>;

// ═══════════════════════════════════════════════════════════════
// SPORT DATABASE (reused from Workout.tsx for consistency)
// ═══════════════════════════════════════════════════════════════

interface SportItem {
  id: string;
  name: string;
  icon: string;
  caloriesPerMinute: number;
  category: string;
  intensity: 'light' | 'moderate' | 'intense';
}

const PLANNER_SPORTS: SportItem[] = [
  { id: 'running-outdoor', name: 'Futás', icon: '🏃', caloriesPerMinute: 10, category: 'catCardio', intensity: 'moderate' },
  { id: 'swimming-pool', name: 'Úszás', icon: '🏊', caloriesPerMinute: 8, category: 'catCardio', intensity: 'moderate' },
  { id: 'cycling-road', name: 'Kerékpár', icon: '🚴', caloriesPerMinute: 8, category: 'catCardio', intensity: 'moderate' },
  { id: 'gym-weights', name: 'Súlyzós', icon: '🏋️', caloriesPerMinute: 6, category: 'catStrength', intensity: 'moderate' },
  { id: 'gym-hiit', name: 'HIIT', icon: '🔥', caloriesPerMinute: 13, category: 'catStrength', intensity: 'intense' },
  { id: 'gym-crossfit', name: 'CrossFit', icon: '⚡', caloriesPerMinute: 11, category: 'catStrength', intensity: 'intense' },
  { id: 'gym-bodyweight', name: 'Testsúly', icon: '💪', caloriesPerMinute: 5, category: 'catStrength', intensity: 'light' },
  { id: 'yoga-hatha', name: 'Jóga', icon: '🧘', caloriesPerMinute: 3, category: 'catFlex', intensity: 'light' },
  { id: 'pilates', name: 'Pilates', icon: '🤸', caloriesPerMinute: 4, category: 'catFlex', intensity: 'light' },
  { id: 'walking', name: 'Séta', icon: '🚶', caloriesPerMinute: 4, category: 'catCardio', intensity: 'light' },
  { id: 'hiking', name: 'Túrázás', icon: '🥾', caloriesPerMinute: 6, category: 'catCardio', intensity: 'moderate' },
  { id: 'soccer', name: 'Foci', icon: '⚽', caloriesPerMinute: 9, category: 'catTeam', intensity: 'moderate' },
  { id: 'basketball', name: 'Kosár', icon: '🏀', caloriesPerMinute: 8, category: 'catTeam', intensity: 'moderate' },
  { id: 'tennis', name: 'Tenisz', icon: '🎾', caloriesPerMinute: 7, category: 'catRacket', intensity: 'moderate' },
  { id: 'boxing', name: 'Boksz', icon: '🥊', caloriesPerMinute: 10, category: 'catCombat', intensity: 'intense' },
  { id: 'dancing', name: 'Tánc', icon: '💃', caloriesPerMinute: 7, category: 'catCardio', intensity: 'moderate' },
  { id: 'jump-rope', name: 'Kötélugr.', icon: '🪢', caloriesPerMinute: 12, category: 'catCardio', intensity: 'intense' },
  { id: 'gym-stretching', name: 'Nyújtás', icon: '🧘‍♀️', caloriesPerMinute: 2, category: 'catFlex', intensity: 'light' },
];

const REST_DAY_ITEM: SportItem = {
  id: 'rest-day', name: 'rest-day', icon: '😴', caloriesPerMinute: 0, category: 'rest', intensity: 'light'
};

// Legacy category mapping for persisted data that used Hungarian names
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  'Kardió': 'catCardio', 'Erőnléti': 'catStrength', 'Flex': 'catFlex',
  'Csapat': 'catTeam', 'Ütős': 'catRacket', 'Küzdő': 'catCombat',
};

function resolveCategoryKey(cat: string): string {
  return LEGACY_CATEGORY_MAP[cat] || cat;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function dateToKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function getWeekDays(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Start from Monday of the first week
  const startDay = firstDay.getDay();
  const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() + mondayOffset);

  const days: Date[] = [];
  const current = new Date(start);
  // Generate enough days to fill up to the last day of month + remaining week
  while (days.length < 42) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
    if (days.length > 28 && current > lastDay && current.getDay() === 1) break;
  }
  return days;
}

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'workoutSchedule';

async function loadSchedule(): Promise<WorkoutScheduleMap> {
  try {
    const raw = await getSetting(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function persistSchedule(data: WorkoutScheduleMap): Promise<void> {
  return setSetting(STORAGE_KEY, JSON.stringify(data));
}

// ═══════════════════════════════════════════════════════════════
// HOOK: useWorkoutSchedule
// ═══════════════════════════════════════════════════════════════

// A version counter shared across all hook instances in the same tab.
// When any instance mutates the schedule it bumps the counter and
// dispatches a custom event so sibling instances can re-read settings
// WITHOUT triggering the "setState during render" warning (the notification
// is deferred to a microtask so it lands outside React's commit phase).
let _scheduleVersion = 0;
const SYNC_EVENT = 'workoutScheduleSync';

function notifyPeers() {
  _scheduleVersion++;
  // Deferred so the dispatching component finishes its render first
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: _scheduleVersion }));
    // Also fire generic 'storage' for cross-tab & other listeners (e.g. UnifiedMenu)
    window.dispatchEvent(new Event('storage'));
  });
}

export function useWorkoutSchedule() {
  const [schedule, setSchedule] = useState<WorkoutScheduleMap>({});

  useEffect(() => {
    loadSchedule().then(setSchedule);
  }, []);

  useEffect(() => {
    const syncHandler = () => loadSchedule().then(setSchedule);
    window.addEventListener(SYNC_EVENT, syncHandler);
    window.addEventListener('storage', syncHandler);
    return () => {
      window.removeEventListener(SYNC_EVENT, syncHandler);
      window.removeEventListener('storage', syncHandler);
    };
  }, []);

  const addWorkout = useCallback((date: string, sport: SportItem, duration?: number) => {
    setSchedule(prev => {
      const updated = { ...prev };
      const existing = updated[date] || [];
      const entry: ScheduledWorkout = {
        id: generateId(),
        sportId: sport.id,
        sportName: sport.name,
        sportIcon: sport.icon,
        sportCategory: resolveCategoryKey(sport.category),
        caloriesPerMinute: sport.caloriesPerMinute,
        intensity: sport.intensity,
        plannedDuration: duration,
      };
      updated[date] = [...existing, entry];
      void persistSchedule(updated);
      return updated;
    });
    notifyPeers();
  }, []);

  const removeWorkout = useCallback((date: string, workoutId: string) => {
    setSchedule(prev => {
      const updated = { ...prev };
      if (updated[date]) {
        updated[date] = updated[date].filter(w => w.id !== workoutId);
        if (updated[date].length === 0) delete updated[date];
      }
      void persistSchedule(updated);
      return updated;
    });
    notifyPeers();
  }, []);

  const clearDay = useCallback((date: string) => {
    setSchedule(prev => {
      const updated = { ...prev };
      delete updated[date];
      void persistSchedule(updated);
      return updated;
    });
    notifyPeers();
  }, []);

  const getDay = useCallback((date: string): ScheduledWorkout[] => {
    return schedule[date] || [];
  }, [schedule]);

  return { schedule, addWorkout, removeWorkout, clearDay, getDay };
}

// ═══════════════════════════════════════════════════════════════
// BANNER COMPONENT (replaces DSMWorkoutDayBanner)
// ═══════════════════════════════════════════════════════════════

interface WorkoutPlannerBannerProps {
  onOpenCalendar: () => void;
  className?: string;
}

export function WorkoutPlannerBanner({ onOpenCalendar, className = '' }: WorkoutPlannerBannerProps) {
  const { getDay } = useWorkoutSchedule();
  const { t, language } = useLanguage();
  const todayKey = dateToKey(new Date());
  const todayPlan = getDay(todayKey);
  const dayName = new Intl.DateTimeFormat(language, { weekday: 'long' }).format(new Date());

  const hasPlan = todayPlan.length > 0;
  const isRest = !hasPlan;
  const primarySport = todayPlan[0];

  const Icon = hasPlan ? Dumbbell : Moon;

  return (
    <motion.button
      onClick={() => {
        hapticFeedback('light');
        onOpenCalendar();
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`w-full bg-primary rounded-2xl p-4 relative overflow-hidden text-left active:scale-[0.98] transition-transform ${className}`}
    >
      {/* Decorative circles */}
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
      <div className="absolute -bottom-3 -left-3 w-14 h-14 bg-white/10 rounded-full" />

      <div className="relative flex items-center gap-3">
        <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
          {hasPlan ? (
            <span className="text-2xl">{primarySport.sportIcon}</span>
          ) : (
            <Icon className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-[11px] font-medium">{dayName}</span>
            <span className="text-white/40">·</span>
            {hasPlan ? (
              <span className="text-white/70 text-[11px]">
                {todayPlan.length} {t("calendar.workoutPlanned")}
              </span>
            ) : (
              <span className="text-white/70 text-[11px]">😴</span>
            )}
          </div>
          <div className="text-white text-sm mt-0.5" style={{ fontWeight: 700 }}>
            {hasPlan
              ? todayPlan.map(w => t('sportNames.' + w.sportId) as string || w.sportName).join(' + ')
              : t("menu.restDay")
            }
          </div>
          <div className="text-white/70 text-[11px] mt-0.5">
            {hasPlan
              ? todayPlan.some(w => w.plannedDuration)
                ? `${todayPlan.reduce((s, w) => s + (w.plannedDuration || 0), 0)} ${t("calendar.minPlanned")}`
                : t("calendar.tapCalendar")
              : t("calendar.tapCalendarPlan")
            }
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-1.5">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          {hasPlan && (
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════
// CALENDAR SHEET COMPONENT
// ═══════════════════════════════════════════════════════════════

interface WorkoutCalendarSheetProps {
  open: boolean;
  onClose: () => void;
}

export function WorkoutCalendarSheet({ open, onClose }: WorkoutCalendarSheetProps) {
  const { schedule, addWorkout, removeWorkout, clearDay, getDay } = useWorkoutSchedule();
  const { t, language } = useLanguage();
  const [view, setView] = useState<'week' | 'month'>('week');
  const [weekBase, setWeekBase] = useState(new Date());
  const [monthYear, setMonthYear] = useState(new Date().getFullYear());
  const [monthMonth, setMonthMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(dateToKey(new Date()));
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [durationInput, setDurationInput] = useState('');
  const [selectedSport, setSelectedSport] = useState<SportItem | null>(null);

  const todayKey = dateToKey(new Date());

  const weekDays = useMemo(() => getWeekDays(weekBase), [weekBase]);
  const monthDays = useMemo(() => getMonthDays(monthYear, monthMonth), [monthYear, monthMonth]);

  // Navigate week
  const prevWeek = () => {
    const d = new Date(weekBase);
    d.setDate(d.getDate() - 7);
    setWeekBase(d);
  };
  const nextWeek = () => {
    const d = new Date(weekBase);
    d.setDate(d.getDate() + 7);
    setWeekBase(d);
  };

  // Navigate month
  const prevMonth = () => {
    if (monthMonth === 0) { setMonthMonth(11); setMonthYear(y => y - 1); }
    else setMonthMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (monthMonth === 11) { setMonthMonth(0); setMonthYear(y => y + 1); }
    else setMonthMonth(m => m + 1);
  };

  const handleDayTap = (date: Date) => {
    hapticFeedback('light');
    setSelectedDate(dateToKey(date));
    setShowSportPicker(false);
    setSelectedSport(null);
    setDurationInput('');
  };

  const handleAddSport = (sport: SportItem) => {
    setSelectedSport(sport);
    setDurationInput('');
  };

  const handleConfirmAdd = () => {
    if (!selectedDate || !selectedSport) return;
    const dur = parseInt(durationInput) || undefined;
    addWorkout(selectedDate, selectedSport, dur);
    hapticFeedback('light');
    setSelectedSport(null);
    setDurationInput('');
    setShowSportPicker(false);
  };

  const handleQuickAdd = (sport: SportItem) => {
    if (!selectedDate) return;
    addWorkout(selectedDate, sport);
    hapticFeedback('light');
  };

  const selectedDayPlan = selectedDate ? getDay(selectedDate) : [];

  // Week range label
  const weekLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    if (first.getMonth() === last.getMonth()) {
      return `${getLocaleMonth(first, language)} ${first.getDate()}–${last.getDate()}.`;
    }
    return `${getLocaleMonth(first, language)} ${first.getDate()}. – ${getLocaleMonth(last, language)} ${last.getDate()}.`;
  }, [weekDays, language]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg text-gray-900" style={{ fontWeight: 700 }}>
                    {t("calendar.workoutCalendar")}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t("calendar.planWorkoutsDesc")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* View toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setView('week')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        view === 'week'
                          ? 'bg-white text-orange-600 shadow-sm'
                          : 'text-gray-500'
                      }`}
                    >
                      <CalendarDays className="w-3 h-3" />
                      {t("calendar.days7")}
                    </button>
                    <button
                      onClick={() => setView('month')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        view === 'month'
                          ? 'bg-white text-orange-600 shadow-sm'
                          : 'text-gray-500'
                      }`}
                    >
                      <CalendarRange className="w-3 h-3" />
                      {t("calendar.days30")}
                    </button>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center touch-manipulation cursor-pointer"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar content */}
            <div className="flex-1 overflow-y-auto">
              {view === 'week' ? (
                <WeekView
                  weekDays={weekDays}
                  schedule={schedule}
                  todayKey={todayKey}
                  selectedDate={selectedDate}
                  weekLabel={weekLabel}
                  onPrev={prevWeek}
                  onNext={nextWeek}
                  onDayTap={handleDayTap}
                />
              ) : (
                <MonthView
                  monthDays={monthDays}
                  monthMonth={monthMonth}
                  monthYear={monthYear}
                  schedule={schedule}
                  todayKey={todayKey}
                  selectedDate={selectedDate}
                  onPrev={prevMonth}
                  onNext={nextMonth}
                  onDayTap={handleDayTap}
                />
              )}

              {/* Selected day detail */}
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 pb-4"
                >
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Day header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                          {(() => {
                            const d = new Date(selectedDate + 'T00:00:00');
                            return `${getLocaleMonth(d, language)} ${d.getDate()}. (${new Intl.DateTimeFormat(language, { weekday: 'long' }).format(d)})`;
                          })()}
                        </span>
                        {selectedDate === todayKey && (
                          <span className="text-2xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full font-medium">{t("calendar.today")}</span>
                        )}
                      </div>
                      {selectedDayPlan.length > 0 && (
                        <button
                          onClick={() => clearDay(selectedDate)}
                          className="text-2xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> {t("calendar.deleteAll")}
                        </button>
                      )}
                    </div>

                    {/* Planned workouts */}
                    {selectedDayPlan.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {selectedDayPlan.map(w => (
                          <div key={w.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="text-xl">{w.sportIcon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                                {t('sportNames.' + w.sportId) || w.sportName}
                              </div>
                              <div className="flex items-center gap-2 text-2xs text-gray-500">
                                <span>{t('sportNames.' + resolveCategoryKey(w.sportCategory)) || w.sportCategory}</span>
                                {w.plannedDuration && (
                                  <>
                                    <span>·</span>
                                    <span className="flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" />
                                      {w.plannedDuration}{t("calendar.minShort")}
                                    </span>
                                    <span>·</span>
                                    <span className="flex items-center gap-0.5 text-orange-500">
                                      <Flame className="w-2.5 h-2.5" />
                                      ~{Math.round(w.caloriesPerMinute * w.plannedDuration)} kcal
                                    </span>
                                  </>
                                )}
                                <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                                  w.intensity === 'light' ? 'bg-green-100 text-green-600' :
                                  w.intensity === 'moderate' ? 'bg-amber-100 text-amber-600' :
                                  'bg-red-100 text-red-600'
                                }`}>
                                  {w.intensity === 'light' ? t("calendar.light") : w.intensity === 'moderate' ? t("calendar.moderate") : t("calendar.intense")}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => removeWorkout(selectedDate, w.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-4 text-center">
                        <Moon className="w-6 h-6 text-indigo-300 mx-auto mb-1.5" />
                        <p className="text-xs text-gray-400">{t("calendar.restDayAdd")}</p>
                      </div>
                    )}

                    {/* Add sport section */}
                    {!showSportPicker && !selectedSport && (
                      <div className="px-4 py-3 border-t border-gray-100">
                        <button
                          onClick={() => setShowSportPicker(true)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-sm font-medium transition-colors border border-orange-200"
                        >
                          <Plus className="w-4 h-4" />
                          {t("calendar.addWorkout")}
                        </button>
                      </div>
                    )}

                    {/* Sport picker inline */}
                    {showSportPicker && !selectedSport && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="border-t border-gray-100 overflow-hidden"
                      >
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>
                              {t("calendar.chooseSport")}
                            </span>
                            <button
                              onClick={() => setShowSportPicker(false)}
                              className="text-2xs text-gray-400 hover:text-gray-600"
                            >
                              {t("calendar.cancel")}
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {PLANNER_SPORTS.map(sport => (
                              <button
                                key={sport.id}
                                onClick={() => handleAddSport(sport)}
                                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all active:scale-95"
                              >
                                <span className="text-xl">{sport.icon}</span>
                                <span className="text-[9px] text-gray-600 font-medium leading-tight text-center">{t('sportNames.' + sport.id) || sport.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Duration input for selected sport */}
                    {selectedSport && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="border-t border-gray-100 overflow-hidden"
                      >
                        <div className="px-4 py-3 space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{selectedSport.icon}</span>
                            <div className="flex-1">
                              <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{t('sportNames.' + selectedSport.id) || selectedSport.name}</div>
                              <div className="text-2xs text-gray-500">{selectedSport.caloriesPerMinute} {t("calendar.kcalPerMinLabel")}</div>
                            </div>
                            <button
                              onClick={() => { setSelectedSport(null); setShowSportPicker(true); }}
                              className="text-2xs text-gray-400"
                            >
                              {t("calendar.other")}
                            </button>
                          </div>
                          <div>
                            <label className="text-2xs text-gray-500 mb-1 block font-medium">
                              {t("calendar.plannedDuration")}
                            </label>
                            <input
                              type="number"
                              value={durationInput}
                              onChange={(e) => setDurationInput(e.target.value)}
                              placeholder={t("calendar.exampleDuration")}
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-center bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200"
                              min="1"
                            />
                          </div>
                          {durationInput && parseInt(durationInput) > 0 && (
                            <div className="flex items-center justify-center gap-2 text-xs text-orange-600">
                              <Flame className="w-3.5 h-3.5" />
                              ~{Math.round(selectedSport.caloriesPerMinute * parseInt(durationInput))} kcal
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setSelectedSport(null); setShowSportPicker(false); }}
                              className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium"
                            >
                              {t("calendar.cancel")}
                            </button>
                            <button
                              onClick={handleConfirmAdd}
                              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.98]"
                            >
                              <Check className="w-4 h-4" />
                              {t("calendar.add")}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════
// WEEK VIEW
// ═══════════════════════════════════════════════════════════════

interface WeekViewProps {
  weekDays: Date[];
  schedule: WorkoutScheduleMap;
  todayKey: string;
  selectedDate: string | null;
  weekLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onDayTap: (date: Date) => void;
}

function WeekView({ weekDays, schedule, todayKey, selectedDate, weekLabel, onPrev, onNext, onDayTap }: WeekViewProps) {
  const { language, t } = useLanguage();
  return (
    <div className="px-4 py-4">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{weekLabel}</span>
        <button onClick={onNext} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map(date => {
          const key = dateToKey(date);
          const dayPlan = schedule[key] || [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          const hasPlan = dayPlan.length > 0;
          const isPast = date < new Date(todayKey + 'T00:00:00');

          return (
            <button
              key={key}
              onClick={() => onDayTap(date)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all active:scale-95 ${
                isSelected
                  ? 'bg-orange-500 shadow-md shadow-orange-200'
                  : isToday
                  ? 'bg-orange-50 border-2 border-orange-300'
                  : hasPlan
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-gray-50 border border-gray-100'
              }`}
            >
              <span className={`text-2xs font-medium ${
                isSelected ? 'text-white' : isPast ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {getLocaleDayNarrow(date, language)}
              </span>
              <span className={`text-sm ${
                isSelected ? 'text-white' : isToday ? 'text-orange-600' : 'text-gray-900'
              }`} style={{ fontWeight: isToday || isSelected ? 700 : 500 }}>
                {date.getDate()}
              </span>
              <div className="h-5 flex items-center justify-center">
                {hasPlan ? (
                  <span className="text-base leading-none">{dayPlan[0].sportIcon}</span>
                ) : (
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-white/40' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Week summary */}
      {(() => {
        const weekWorkouts = weekDays.reduce((acc, d) => {
          const plan = schedule[dateToKey(d)] || [];
          return acc + plan.length;
        }, 0);
        const weekDuration = weekDays.reduce((acc, d) => {
          const plan = schedule[dateToKey(d)] || [];
          return acc + plan.reduce((s, w) => s + (w.plannedDuration || 0), 0);
        }, 0);
        return (
          <div className="flex items-center justify-center gap-4 mt-3 px-2 py-2 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <Dumbbell className="w-3 h-3 text-orange-500" />
              <span>{weekWorkouts} {t("calendar.workoutN")}</span>
            </div>
            {weekDuration > 0 && (
              <>
                <div className="w-px h-3 bg-gray-200" />
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span>{weekDuration} {t("calendar.minUnit")}</span>
                </div>
              </>
            )}
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <Moon className="w-3 h-3 text-indigo-400" />
              <span>{7 - weekDays.filter(d => (schedule[dateToKey(d)] || []).length > 0).length} {t("calendar.restN")}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MONTH VIEW
// ═══════════════════════════════════════════════════════════════

interface MonthViewProps {
  monthDays: Date[];
  monthMonth: number;
  monthYear: number;
  schedule: WorkoutScheduleMap;
  todayKey: string;
  selectedDate: string | null;
  onPrev: () => void;
  onNext: () => void;
  onDayTap: (date: Date) => void;
}

function MonthView({ monthDays, monthMonth, monthYear, schedule, todayKey, selectedDate, onPrev, onNext, onDayTap }: MonthViewProps) {
  const { language, t } = useLanguage();
  // Generate localized day-of-week headers (Mon–Sun)
  const dayHeaders = useMemo(() => {
    // Get a Monday date to start from
    const refDate = new Date(2024, 0, 1); // Jan 1, 2024 is a Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() + i);
      return getLocaleDayNarrow(d, language);
    });
  }, [language]);

  const monthLabel = getLocaleMonth(new Date(monthYear, monthMonth, 1), language);

  return (
    <div className="px-4 py-4">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
          {monthYear}. {monthLabel}
        </span>
        <button onClick={onNext} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayHeaders.map(d => (
          <div key={d} className="text-center text-2xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map(date => {
          const key = dateToKey(date);
          const dayPlan = schedule[key] || [];
          const isCurrentMonth = date.getMonth() === monthMonth;
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          const hasPlan = dayPlan.length > 0;

          return (
            <button
              key={key}
              onClick={() => onDayTap(date)}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-lg transition-all active:scale-95 min-h-[40px] ${
                !isCurrentMonth
                  ? 'opacity-30'
                  : isSelected
                  ? 'bg-orange-500 shadow-sm'
                  : isToday
                  ? 'bg-orange-50 ring-1 ring-orange-300'
                  : hasPlan
                  ? 'bg-green-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className={`text-xs ${
                isSelected ? 'text-white' : isToday ? 'text-orange-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`} style={{ fontWeight: isToday || isSelected ? 700 : 400 }}>
                {date.getDate()}
              </span>
              {hasPlan && (
                <span className="text-2xs leading-none mt-0.5">{dayPlan[0].sportIcon}</span>
              )}
              {hasPlan && dayPlan.length > 1 && (
                <div className={`absolute top-0.5 right-0.5 w-3 h-3 rounded-full text-[7px] flex items-center justify-center ${
                  isSelected ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-600'
                }`} style={{ fontWeight: 700 }}>
                  {dayPlan.length}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Month summary */}
      {(() => {
        const monthWorkouts = monthDays.filter(d => d.getMonth() === monthMonth).reduce((acc, d) => {
          return acc + (schedule[dateToKey(d)] || []).length;
        }, 0);
        const trainingDays = monthDays.filter(d => d.getMonth() === monthMonth && (schedule[dateToKey(d)] || []).length > 0).length;
        return (
          <div className="flex items-center justify-center gap-4 mt-3 px-2 py-2 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <Dumbbell className="w-3 h-3 text-orange-500" />
              <span>{monthWorkouts} {t("calendar.workoutN")}</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <Calendar className="w-3 h-3 text-blue-500" />
              <span>{trainingDays} {t("calendar.trainingDayN")}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}