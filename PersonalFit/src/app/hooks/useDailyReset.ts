/**
 * useDailyReset Hook
 *
 * Detects midnight boundary crossing and:
 * 1. Archives the completed day's data to dailyHistory (IndexedDB settings)
 * 2. Resets all daily counters (calories, checked meals, etc.)
 * 3. Keeps historical data intact for Profile/History view
 *
 * All persistence via SettingsService (IndexedDB).
 */

import { useEffect, useRef, useCallback } from 'react';
import { getSetting, setSetting, removeSetting } from '../backend/services/SettingsService';

export interface DailyHistoryEntry {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealsLogged: number;
  meals: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    image: string;
    timestamp: number;
  }>;
  workoutCalories: number;
  workoutDuration: number;
  workoutEntries: Array<{
    name: string;
    calories: number;
    duration: number;
    icon: string;
  }>;
  scheduledMealsChecked: number;
  waterIntake: number;
}

export async function getDailyHistory(): Promise<DailyHistoryEntry[]> {
  try {
    const raw = await getSetting('dailyHistory');
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return [];
}

export async function getDailyHistoryForDate(date: string): Promise<DailyHistoryEntry | null> {
  const history = await getDailyHistory();
  return history.find(h => h.date === date) || null;
}

export async function getHistorySummary(days: number = 30) {
  const history = await getDailyHistory();
  const recent = history.slice(-days);

  if (recent.length === 0) {
    return {
      avgCalories: 0,
      avgProtein: 0,
      avgCarbs: 0,
      avgFat: 0,
      totalWorkoutCalories: 0,
      totalWorkoutMinutes: 0,
      daysTracked: 0,
      adherenceRate: 0,
      entries: [],
    };
  }

  const totals = recent.reduce((acc, day) => ({
    calories: acc.calories + day.calories,
    protein: acc.protein + day.protein,
    carbs: acc.carbs + day.carbs,
    fat: acc.fat + day.fat,
    workoutCal: acc.workoutCal + day.workoutCalories,
    workoutMin: acc.workoutMin + day.workoutDuration,
    mealsChecked: acc.mealsChecked + day.scheduledMealsChecked,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, workoutCal: 0, workoutMin: 0, mealsChecked: 0 });

  const n = recent.length;
  return {
    avgCalories: Math.round(totals.calories / n),
    avgProtein: Math.round(totals.protein / n * 10) / 10,
    avgCarbs: Math.round(totals.carbs / n * 10) / 10,
    avgFat: Math.round(totals.fat / n * 10) / 10,
    totalWorkoutCalories: totals.workoutCal,
    totalWorkoutMinutes: totals.workoutMin,
    daysTracked: n,
    adherenceRate: Math.round((totals.mealsChecked / (n * 3)) * 100),
    entries: recent,
  };
}

async function archiveDay(dateStr: string) {
  const loggedMealsRaw = await getSetting(`loggedMeals_${dateStr}`);
  let meals: DailyHistoryEntry['meals'] = [];
  let totalCal = 0, totalPro = 0, totalCarbs = 0, totalFat = 0;

  if (loggedMealsRaw) {
    try {
      const parsed = JSON.parse(loggedMealsRaw);
      meals = parsed.map((m: any) => ({
        name: m.name,
        calories: m.calories || 0,
        protein: m.protein || 0,
        carbs: m.carbs || 0,
        fat: m.fat || 0,
        image: m.image || '🍽️',
        timestamp: m.timestamp || 0,
      }));
      meals.forEach(m => {
        totalCal += m.calories;
        totalPro += m.protein;
        totalCarbs += m.carbs;
        totalFat += m.fat;
      });
    } catch { /* empty */ }
  }

  let workoutCalories = 0, workoutDuration = 0;
  let workoutEntries: DailyHistoryEntry['workoutEntries'] = [];
  try {
    const workoutRaw = await getSetting('workoutTracking');
    if (workoutRaw) {
      const workoutData = JSON.parse(workoutRaw);
      if (workoutData[dateStr]) {
        workoutCalories = workoutData[dateStr].totalCalories || 0;
        workoutDuration = workoutData[dateStr].totalDuration || 0;
        workoutEntries = (workoutData[dateStr].entries || []).map((e: any) => ({
          name: e.activityName,
          calories: e.calories || 0,
          duration: e.duration || 0,
          icon: e.categoryIcon || '🏃',
        }));
      }
    }
  } catch { /* empty */ }

  let scheduledMealsChecked = 0;
  try {
    const checkedRaw = await getSetting('menuCheckedMeals');
    if (checkedRaw) {
      const checked = JSON.parse(checkedRaw);
      scheduledMealsChecked = Array.isArray(checked) ? checked.length : 0;
    }
  } catch { /* empty */ }

  let waterIntake = 0;
  try {
    const waterRaw = await getSetting('waterTracking');
    if (waterRaw) {
      const waterData = JSON.parse(waterRaw);
      waterIntake = waterData[dateStr] || 0;
    }
  } catch { /* empty */ }

  if (totalCal === 0 && workoutCalories === 0 && scheduledMealsChecked === 0 && waterIntake === 0 && meals.length === 0) {
    return;
  }

  const entry: DailyHistoryEntry = {
    date: dateStr,
    calories: totalCal,
    protein: Math.round(totalPro * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    mealsLogged: meals.length,
    meals,
    workoutCalories,
    workoutDuration,
    workoutEntries,
    scheduledMealsChecked,
    waterIntake,
  };

  const history = await getDailyHistory();
  const existingIdx = history.findIndex(h => h.date === dateStr);
  if (existingIdx >= 0) {
    history[existingIdx] = entry;
  } else {
    history.push(entry);
  }
  const trimmed = history.slice(-90);
  await setSetting('dailyHistory', JSON.stringify(trimmed));
}

async function resetDailyValues() {
  await setSetting('totalConsumedCalories', '0');
  await removeSetting('menuCheckedMeals');
}

export function useDailyReset() {
  const lastDateRef = useRef<string>(new Date().toISOString().split('T')[0]);

  const checkAndReset = useCallback(() => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const previousDate = lastDateRef.current;

    if (currentDate !== previousDate) {
      console.log(`[DailyReset] Day changed: ${previousDate} → ${currentDate}. Archiving & resetting.`);
      archiveDay(previousDate).then(() => {
        resetDailyValues().then(() => {
          lastDateRef.current = currentDate;
          window.dispatchEvent(new Event('storage'));
        });
      });
    }
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    getSetting('lastActiveDate').then((lastActiveDate) => {
      if (lastActiveDate && lastActiveDate !== today) {
        archiveDay(lastActiveDate).then(() => resetDailyValues());
      }
    });

    setSetting('lastActiveDate', today).catch(() => {});
    lastDateRef.current = today;

    const interval = setInterval(checkAndReset, 30000);
    return () => clearInterval(interval);
  }, [checkAndReset]);
}
