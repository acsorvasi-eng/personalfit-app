/**
 * ====================================================================
 * useCalorieTracker — Dynamic Calorie Tracking Hook
 * ====================================================================
 * Powered by CalorieEngineService (Mifflin-St Jeor + activity).
 * Falls back to IndexedDB settings for consumed/target when needed.
 */

import { useState, useEffect, useCallback } from 'react';
import * as CalorieEngine from '../backend/services/CalorieEngineService';
import type { DailyCalorieBudget } from '../backend/models';
import { getSetting } from '../backend/services/SettingsService';

const DEFAULT_DAILY_TARGET = 2000;

export function useCalorieTracker() {
  const [consumed, setConsumed] = useState(0);
  const [budget, setBudget] = useState<DailyCalorieBudget | null>(null);
  const [fallbackTarget, setFallbackTarget] = useState(DEFAULT_DAILY_TARGET);

  useEffect(() => {
    CalorieEngine.getBaseCalorieTarget()
      .then(setFallbackTarget)
      .catch(() => {
        getSetting('userProfile').then((profile) => {
          if (!profile) return;
          try {
            const data = JSON.parse(profile);
            if (data.calorieTarget) setFallbackTarget(data.calorieTarget);
            else if (data.weight) setFallbackTarget(Math.round((data.weight * 28) / 50) * 50);
          } catch { /* ignore */ }
        });
      });
  }, []);

  const target = budget ? budget.target_calories : fallbackTarget;

  const loadBudget = useCallback(async () => {
    try {
      const b = await CalorieEngine.computeDailyBudget();
      setBudget(b);
      setConsumed(b.calories_consumed);
    } catch {
      const stored = await getSetting('totalConsumedCalories');
      setConsumed(stored ? parseInt(stored) || 0 : 0);
    }
  }, []);

  useEffect(() => {
    loadBudget();
    const updateConsumed = () => {
      getSetting('totalConsumedCalories').then((stored) => {
        setConsumed(stored ? parseInt(stored) || 0 : 0);
      });
    };
    window.addEventListener('storage', updateConsumed);
    const interval = setInterval(() => loadBudget(), 5000);
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
