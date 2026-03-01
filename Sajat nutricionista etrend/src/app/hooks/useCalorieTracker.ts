/**
 * ====================================================================
 * useCalorieTracker — Dynamic Calorie Tracking Hook
 * ====================================================================
 * Now powered by CalorieEngineService (Mifflin-St Jeor + activity).
 * Falls back to localStorage-based calculation for compatibility.
 *
 * Returns: consumed, target, remaining, percentage, budget details.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import * as CalorieEngine from '../backend/services/CalorieEngineService';
import type { DailyCalorieBudget } from '../backend/models';

const DEFAULT_DAILY_TARGET = 2000;

export function useCalorieTracker() {
  const [consumed, setConsumed] = useState(0);
  const [budget, setBudget] = useState<DailyCalorieBudget | null>(null);

  // Compute target from CalorieEngine or fallback to profile
  const target = useMemo(() => {
    if (budget) return budget.target_calories;
    try {
      return CalorieEngine.getBaseCalorieTarget();
    } catch {
      // Fallback to old localStorage approach
      try {
        const profile = localStorage.getItem('userProfile');
        if (profile) {
          const data = JSON.parse(profile);
          if (data.calorieTarget) return data.calorieTarget;
          if (data.weight) {
            const base = data.weight * 28;
            return Math.round(base / 50) * 50;
          }
        }
      } catch { /* fallback */ }
      return DEFAULT_DAILY_TARGET;
    }
  }, [budget]);

  const loadBudget = useCallback(async () => {
    try {
      const b = await CalorieEngine.computeDailyBudget();
      setBudget(b);
      setConsumed(b.calories_consumed);
    } catch {
      // Fallback: read consumed from localStorage
      const stored = localStorage.getItem('totalConsumedCalories');
      setConsumed(stored ? parseInt(stored) || 0 : 0);
    }
  }, []);

  useEffect(() => {
    // Initial load
    loadBudget();

    // Listen for localStorage changes (cross-tab + same-tab)
    const updateConsumed = () => {
      const stored = localStorage.getItem('totalConsumedCalories');
      setConsumed(stored ? parseInt(stored) || 0 : 0);
    };

    window.addEventListener('storage', updateConsumed);

    // Poll every 5 seconds (less aggressive, engine does the heavy lifting)
    const interval = setInterval(() => {
      loadBudget();
    }, 5000);

    return () => {
      window.removeEventListener('storage', updateConsumed);
      clearInterval(interval);
    };
  }, [loadBudget]);

  const remaining = Math.max(0, target - consumed);
  const percentage = Math.min(100, Math.round((consumed / target) * 100));

  return {
    consumed,
    target,
    remaining,
    percentage,
    /** Full budget breakdown (null until first async load) */
    budget,
    /** Force recalculate */
    refresh: loadBudget,
  };
}
