/**
 * useDailyReset Hook
 * 
 * Detects midnight boundary crossing and:
 * 1. Archives the completed day's data to dailyHistory
 * 2. Resets all daily counters (calories, checked meals, etc.)
 * 3. Keeps historical data intact for Profile/History view
 * 
 * Runs on mount + checks every 30 seconds for day change.
 */

import { useEffect, useRef, useCallback } from 'react';

export interface DailyHistoryEntry {
  date: string; // YYYY-MM-DD
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
  waterIntake: number; // ml
}

// Get all history
export function getDailyHistory(): DailyHistoryEntry[] {
  try {
    const raw = localStorage.getItem('dailyHistory');
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return [];
}

// Get history for a specific date
export function getDailyHistoryForDate(date: string): DailyHistoryEntry | null {
  const history = getDailyHistory();
  return history.find(h => h.date === date) || null;
}

// Get history summary for last N days
export function getHistorySummary(days: number = 30) {
  const history = getDailyHistory();
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
    adherenceRate: Math.round((totals.mealsChecked / (n * 3)) * 100), // 3 meals per day
    entries: recent,
  };
}

function archiveDay(dateStr: string) {
  // Collect data for the given date
  const loggedMealsRaw = localStorage.getItem(`loggedMeals_${dateStr}`);
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

  // Workout data
  let workoutCalories = 0, workoutDuration = 0;
  let workoutEntries: DailyHistoryEntry['workoutEntries'] = [];
  try {
    const workoutRaw = localStorage.getItem('workoutTracking');
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

  // Checked meals count
  let scheduledMealsChecked = 0;
  try {
    const checkedRaw = localStorage.getItem('menuCheckedMeals');
    if (checkedRaw) {
      const checked = JSON.parse(checkedRaw);
      scheduledMealsChecked = Array.isArray(checked) ? checked.length : 0;
    }
  } catch { /* empty */ }

  // Water intake
  let waterIntake = 0;
  try {
    const waterRaw = localStorage.getItem('waterTracking');
    if (waterRaw) {
      const waterData = JSON.parse(waterRaw);
      waterIntake = waterData[dateStr] || 0;
    }
  } catch { /* empty */ }

  // Only archive if there's meaningful data
  if (totalCal === 0 && workoutCalories === 0 && scheduledMealsChecked === 0 && waterIntake === 0 && meals.length === 0) {
    return; // Nothing to archive
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

  // Save to history (append, deduplicate by date)
  const history = getDailyHistory();
  const existingIdx = history.findIndex(h => h.date === dateStr);
  if (existingIdx >= 0) {
    history[existingIdx] = entry; // Update existing
  } else {
    history.push(entry);
  }
  // Keep last 90 days max
  const trimmed = history.slice(-90);
  localStorage.setItem('dailyHistory', JSON.stringify(trimmed));
}

function resetDailyValues() {
  // Reset consumed calories counter
  localStorage.setItem('totalConsumedCalories', '0');
  
  // Reset checked meals (scheduled meals eaten)
  localStorage.removeItem('menuCheckedMeals');
}

export function useDailyReset() {
  const lastDateRef = useRef<string>(new Date().toISOString().split('T')[0]);

  const checkAndReset = useCallback(() => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const previousDate = lastDateRef.current;

    if (currentDate !== previousDate) {
      // Day has changed! Archive the previous day, then reset.
      console.log(`[DailyReset] Day changed: ${previousDate} → ${currentDate}. Archiving & resetting.`);
      
      // Archive the completed day
      archiveDay(previousDate);
      
      // Reset daily values
      resetDailyValues();
      
      // Update reference
      lastDateRef.current = currentDate;

      // Force reload calorie displays by dispatching storage event
      window.dispatchEvent(new Event('storage'));
    }
  }, []);

  useEffect(() => {
    // Check immediately on mount
    // If the app was closed yesterday and opened today, we need to archive
    const today = new Date().toISOString().split('T')[0];
    const lastActiveDate = localStorage.getItem('lastActiveDate');
    
    if (lastActiveDate && lastActiveDate !== today) {
      // App was last used on a different day - archive that day
      archiveDay(lastActiveDate);
      resetDailyValues();
    }
    
    // Save today as last active date
    localStorage.setItem('lastActiveDate', today);
    lastDateRef.current = today;

    // Check every 30 seconds for midnight crossing
    const interval = setInterval(checkAndReset, 30000);
    return () => clearInterval(interval);
  }, [checkAndReset]);
}
