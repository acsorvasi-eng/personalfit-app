/**
 * ====================================================================
 * useAppData — Global App Data State Hook
 * ====================================================================
 * Detects whether user has uploaded data (active NutritionPlan exists).
 * Used across all tabs to show empty state vs populated content.
 *
 * Data flow:
 *   hasData = true  → show populated app
 *   hasData = false → show empty state + upload CTA
 */

import { useState, useEffect, useCallback } from 'react';
import { getDB, onDBChange } from '../backend/db';
import type { NutritionPlanEntity, TrainingPlanEntity, MeasurementEntity } from '../backend/models';

export interface AppDataState {
  /** Whether any nutrition plan exists (uploaded or created) */
  hasData: boolean;
  /** Whether there's an active nutrition plan */
  hasActivePlan: boolean;
  /** Whether there's an active training plan */
  hasTrainingPlan: boolean;
  /** Whether measurements have been recorded */
  hasMeasurements: boolean;
  /** Total number of nutrition plans */
  planCount: number;
  /** Active plan label */
  activePlanLabel: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Force refresh */
  refresh: () => void;
}

export function useAppData(): AppDataState {
  const [state, setState] = useState<Omit<AppDataState, 'refresh'>>({
    hasData: false,
    hasActivePlan: false,
    hasTrainingPlan: false,
    hasMeasurements: false,
    planCount: 0,
    activePlanLabel: null,
    isLoading: true,
  });

  const checkData = useCallback(async () => {
    try {
      const db = await getDB();

      const plans = await db.getAll<NutritionPlanEntity>('nutrition_plans');
      const activePlan = plans.find(p => p.is_active);

      const trainingPlans = await db.getAll<TrainingPlanEntity>('training_plans');
      const activeTrainingPlan = trainingPlans.find(p => p.is_active);

      const measurementCount = await db.count('measurements');

      setState({
        hasData: plans.length > 0,
        hasActivePlan: !!activePlan,
        hasTrainingPlan: !!activeTrainingPlan,
        hasMeasurements: measurementCount > 0,
        planCount: plans.length,
        activePlanLabel: activePlan?.label || null,
        isLoading: false,
      });
    } catch (error) {
      console.warn('[useAppData] Failed to check data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    checkData();

    // Listen for cross-tab DB changes
    const unsubscribe = onDBChange((event) => {
      if (['nutrition_plans', 'training_plans', 'measurements'].includes(event.store) || event.store === '*') {
        checkData();
      }
    });

    // Listen for same-tab storage events (for reset)
    const handleStorage = () => checkData();
    window.addEventListener('storage', handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, [checkData]);

  return { ...state, refresh: checkData };
}
