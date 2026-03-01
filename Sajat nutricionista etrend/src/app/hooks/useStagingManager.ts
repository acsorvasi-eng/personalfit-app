/**
 * ====================================================================
 * useStagingManager — Upload Staging & Publish Manager
 * ====================================================================
 * Manages the staged → active lifecycle for uploaded plans.
 *
 * FLOW:
 *   1. Upload → AI processes → data created in DB → staging metadata saved
 *   2. User sees "Staged" card in Profile → Settings
 *   3. User clicks "Publish" → state becomes 'active'
 *   4. New upload → replaces staged data → new staging created
 *
 * STATES:
 *   - null:    No staged data
 *   - staged:  Data processed, waiting for user to publish
 *   - active:  Data published and live in the app
 */

import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type StagingState = 'staged' | 'active' | null;

export interface StagingInfo {
  state: StagingState;
  planId: string;
  trainingPlanId: string | null;
  label: string;
  sourceFileName: string;
  totalWeeks: number;
  totalDays: number;
  totalMeals: number;
  shoppingItems: number;
  measurementsRecorded: boolean;
  trainingPlanCreated: boolean;
  confidence: number;
  extractedFields: string[];
  stagedAt: string;
  publishedAt: string | null;
}

const STAGING_KEY = 'uploadStaging';

// ═══════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════

function readStaging(): StagingInfo | null {
  try {
    const raw = localStorage.getItem(STAGING_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStaging(info: StagingInfo): void {
  localStorage.setItem(STAGING_KEY, JSON.stringify(info));
  window.dispatchEvent(new Event('stagingUpdated'));
}

function clearStagingStorage(): void {
  localStorage.removeItem(STAGING_KEY);
  window.dispatchEvent(new Event('stagingUpdated'));
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC: stagePlan() — Called by useDataUpload after processing
// ═══════════════════════════════════════════════════════════════

export function stagePlan(params: {
  planId: string;
  trainingPlanId?: string | null;
  label: string;
  sourceFileName: string;
  totalWeeks: number;
  totalDays: number;
  totalMeals: number;
  shoppingItems: number;
  measurementsRecorded: boolean;
  trainingPlanCreated: boolean;
  confidence: number;
  extractedFields: string[];
}): void {
  const staging: StagingInfo = {
    state: 'staged',
    planId: params.planId,
    trainingPlanId: params.trainingPlanId || null,
    label: params.label,
    sourceFileName: params.sourceFileName,
    totalWeeks: params.totalWeeks,
    totalDays: params.totalDays,
    totalMeals: params.totalMeals,
    shoppingItems: params.shoppingItems,
    measurementsRecorded: params.measurementsRecorded,
    trainingPlanCreated: params.trainingPlanCreated,
    confidence: params.confidence,
    extractedFields: params.extractedFields,
    stagedAt: new Date().toISOString(),
    publishedAt: null,
  };
  writeStaging(staging);
  console.log('[StagingManager] Plan staged:', staging.label);
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useStagingManager() {
  const [info, setInfo] = useState<StagingInfo | null>(readStaging);
  const [isPublishing, setIsPublishing] = useState(false);

  // Re-read on storage/custom events
  useEffect(() => {
    const reload = () => setInfo(readStaging());
    window.addEventListener('storage', reload);
    window.addEventListener('stagingUpdated', reload);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('stagingUpdated', reload);
    };
  }, []);

  const hasStagedPlan = info?.state === 'staged';
  const hasPublishedPlan = info?.state === 'active';

  /**
   * Publish staged plan → mark as active, notify all listeners.
   *
   * Note: Data is already in the DB (created during upload).
   * Publishing is the user-facing confirmation step that:
   *   - Transitions staging state to 'active'
   *   - Triggers UI refresh across all tabs
   *   - Shows data in Személyes adatok, menük, sport, etc.
   */
  const publish = useCallback(async () => {
    if (!info || info.state !== 'staged') return false;

    setIsPublishing(true);
    try {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate([10, 20]);

      // Small delay for animation
      await new Promise(r => setTimeout(r, 800));

      // Update staging state to active
      const updated: StagingInfo = {
        ...info,
        state: 'active',
        publishedAt: new Date().toISOString(),
      };
      writeStaging(updated);

      // Notify all listeners to refresh
      window.dispatchEvent(new Event('profileUpdated'));
      window.dispatchEvent(new Event('storage'));

      setIsPublishing(false);
      return true;
    } catch (error) {
      console.error('[StagingManager] Publish failed:', error);
      setIsPublishing(false);
      return false;
    }
  }, [info]);

  /**
   * Discard staged data without publishing.
   * Clears the staging marker — DB entities remain inactive.
   */
  const discard = useCallback(() => {
    clearStagingStorage();
  }, []);

  return {
    info,
    hasStagedPlan,
    hasPublishedPlan,
    isPublishing,
    publish,
    discard,
  };
}
