/**
 * callChefReview — shared helper for all 3 meal plan generation entry points.
 *
 * Calls api/chef-review on the generated plan, logs silent changes to chef_log.
 * Returns the improved plan if the review succeeds, or the original plan if anything fails.
 * NEVER throws — designed to be a silent improvement layer.
 */
import { apiBase, authFetch } from '../../../lib/api';
import { logChefChange } from '../../backend/services/ChefService';
import { getRegionContext } from '../../backend/services/ChefContextService';
import { getCurrentSeason } from '../../backend/services/ChefService';
import type { ChefChange } from '../../../lib/chef-types';

export interface CallChefReviewParams {
  nutritionPlan: Record<string, unknown>;
  language: string;
  userName: string;
  userProfile?: Record<string, unknown>;
  onProgress?: (phase: 'chef_review') => void;
  onDone?: () => void;
}

export async function callChefReview(params: CallChefReviewParams): Promise<Record<string, unknown>> {
  try {
    const { nutritionPlan, language, userName, userProfile, onProgress, onDone } = params;

    onProgress?.('chef_review');

    const now = new Date();
    const month = now.getMonth() + 1;
    const season = getCurrentSeason(month);

    // GPS → region (optional; null if denied — chef still runs without it)
    const regionCtx = await getRegionContext(language).catch(() => null);

    const resp = await authFetch(`${apiBase}/api/chef-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mealPlan: nutritionPlan,
        userProfile: userProfile ?? {},
        region: regionCtx?.region ?? '',
        season,
        month,
        cultureWeights: regionCtx?.cultureWeights ?? {},
        language,
        userName,
      }),
    });

    if (!resp.ok) {
      console.warn('[callChefReview] API error', resp.status);
      onDone?.();
      return nutritionPlan;
    }

    const data = await resp.json();
    const improvedPlan = data.mealPlan ?? nutritionPlan;
    const changes: ChefChange[] = data.changes ?? [];

    // Log every silent change to chef_log so they appear in the Monday summary
    const today = new Date().toISOString().split('T')[0];
    for (const c of changes) {
      await logChefChange({
        date: today,
        day: c.day,
        meal: c.meal,
        original: c.original,
        replacement: c.replacement,
        reason: c.reason,
        silent: true,
      }).catch(() => {}); // don't block on IDB errors
    }

    onDone?.();
    return improvedPlan;

  } catch (err) {
    console.warn('[callChefReview] Failed (non-fatal):', err);
    params.onDone?.();
    return params.nutritionPlan;
  }
}
