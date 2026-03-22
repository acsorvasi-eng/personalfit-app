import type {
  ChefLogEntry,
  ChefDecision,
  ChefQueueEntry,
  ChefPendingMessage,
} from '../../../lib/chef-types';
import { getDB, generateId, todayDate } from '../db';
import { getSetting, setSetting } from './SettingsService';
import { apiBase } from '../../../lib/api';

// ─── Pure helper functions (exported for testing) ─────────────────────────────

export function getCurrentSeason(month: number): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (month >= 3 && month <= 6) return 'spring';
  if (month >= 7 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function buildMealFrequency(mealNames: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const name of mealNames) freq.set(name, (freq.get(name) ?? 0) + 1);
  return freq;
}

/** Returns true if any meal name appears 3+ times in the list */
export function detectMonotony(mealNames: string[]): boolean {
  for (const count of buildMealFrequency(mealNames).values()) {
    if (count >= 3) return true;
  }
  return false;
}

/** Returns true if a swap qualifies as silent (calorie delta within threshold) */
export function isSilentSwapEligible(
  originalCalories: number,
  replacementCalories: number,
  thresholdKcal = 10
): boolean {
  return Math.abs(originalCalories - replacementCalories) <= thresholdKcal;
}

// ─── Tracking helpers ─────────────────────────────────────────────────────────

const LAST_MESSAGE_KEY = 'chef_last_message_date';
const LAST_RUN_KEY = 'chef_last_run_date';
const LAST_SUMMARY_KEY = 'chef_last_summary_date';

export async function hasMessagedToday(): Promise<boolean> {
  const d = await getSetting(LAST_MESSAGE_KEY).catch(() => null);
  return d === todayDate();
}

async function markMessagedToday(): Promise<void> {
  await setSetting(LAST_MESSAGE_KEY, todayDate());
}

// ─── IndexedDB operations ─────────────────────────────────────────────────────

export async function logChefChange(entry: Omit<ChefLogEntry, 'id'>): Promise<void> {
  const db = await getDB();
  await db.put('chef_log', { id: generateId(), ...entry });
}

export async function getRecentChefLog(days = 7): Promise<ChefLogEntry[]> {
  const db = await getDB();
  const all = await db.getAll<ChefLogEntry>('chef_log');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return all.filter(e => new Date(e.date) >= cutoff);
}

export async function recordChefDecision(dishName: string, decision: 'accept' | 'reject'): Promise<void> {
  const db = await getDB();
  await db.put('chef_decisions', {
    id: generateId(),
    dish_name: dishName,
    decision,
    date: todayDate(),
  } as ChefDecision);
}

export async function getRejectedDishes(withinDays = 14): Promise<string[]> {
  const db = await getDB();
  const all = await db.getAll<ChefDecision>('chef_decisions');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - withinDays);
  return all
    .filter(d => d.decision === 'reject' && new Date(d.date) >= cutoff)
    .map(d => d.dish_name);
}

async function enqueueChefSuggestion(entry: Omit<ChefQueueEntry, 'id'>): Promise<void> {
  const db = await getDB();
  await db.put('chef_queue', { id: generateId(), ...entry } as ChefQueueEntry);
}

async function dequeueNextChefSuggestion(): Promise<ChefQueueEntry | null> {
  const db = await getDB();
  const all = await db.getAll<ChefQueueEntry>('chef_queue');
  if (!all.length) return null;
  const [first] = all.sort((a, b) => a.queued_at.localeCompare(b.queued_at));
  await db.delete('chef_queue', first.id);
  return first;
}

// ─── Daily runner ─────────────────────────────────────────────────────────────

export interface RunDailyParams {
  recentMealNames: string[];   // last 14–21 meal names from active plan
  userName: string;
  language: string;
  region: string | null;
  cultureWeights: Record<string, number>;
}

/** Run once per day on app open. Returns a ChefPendingMessage if there is
 *  something to show the user, or null if nothing to show today. */
export async function runDaily(params: RunDailyParams): Promise<ChefPendingMessage | null> {
  // Only run once per day
  const lastRun = await getSetting(LAST_RUN_KEY).catch(() => null);
  if (lastRun === todayDate()) return null;
  await setSetting(LAST_RUN_KEY, todayDate());

  // Already messaged today (shouldn't happen on first run, but guard anyway)
  if (await hasMessagedToday()) return null;

  const today = new Date();
  const month = today.getMonth() + 1; // 1-12
  const season = getCurrentSeason(month);
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon

  const context = {
    userName: params.userName,
    recentMeals: params.recentMealNames.slice(0, 14),
    region: params.region ?? '',
    season,
    month,
    cultureWeights: params.cultureWeights,
    language: params.language,
  };

  // ── 1. Monday: weekly summary (no API call needed — built from local log) ──
  if (dayOfWeek === 1) {
    const lastSummary = await getSetting(LAST_SUMMARY_KEY).catch(() => null);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const summaryOverdue = !lastSummary || new Date(lastSummary) < cutoff;

    if (summaryOverdue) {
      await setSetting(LAST_SUMMARY_KEY, todayDate());
      const changes = await getRecentChefLog(7);
      if (changes.length > 0) {
        const list = changes.map(c => `${c.original} → ${c.replacement}`).join(', ');
        const msg = params.language === 'ro'
          ? `${params.userName}, săptămâna aceasta am făcut ${changes.length} mici modificări: ${list}. Toate caloriile sunt corecte.`
          : params.language === 'en'
          ? `${params.userName}, this week I made ${changes.length} small changes: ${list}. All calories are correct.`
          : `${params.userName}, ezen a héten ${changes.length} apró cserét csináltam csendben: ${list}. A kalóriák mind stimmelnek.`;
        await markMessagedToday();
        return { message: msg, requiresApproval: false, type: 'weekly_summary' };
      }
    }
  }

  // ── 2. Process queued suggestions (from previous offline opens) ────────────
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    const queued = await dequeueNextChefSuggestion();
    if (queued) {
      try {
        const resp = await fetch(`${apiBase}/api/chef-suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: queued.type, context: queued.context }),
        });
        if (resp.ok) {
          const data = await resp.json();
          await markMessagedToday();
          return {
            message: data.message,
            proposal: data.proposal,
            requiresApproval: data.requiresApproval ?? false,
            type: queued.type,
          };
        }
      } catch {
        // Re-queue on failure
        await enqueueChefSuggestion({ queued_at: queued.queued_at, type: queued.type, context: queued.context });
      }
    }
  }

  // ── 3. Monotony check: suggest new dish if 3+ repeated meals in last 7 days ─
  const hasMonotony = detectMonotony(params.recentMealNames.slice(0, 21));
  if (!hasMonotony) return null;

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    const rejected = await getRejectedDishes(14);
    try {
      const resp = await fetch(`${apiBase}/api/chef-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_dish',
          context: { ...context, rejectedDishes: rejected },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        await markMessagedToday();
        return {
          message: data.message,
          proposal: data.proposal,
          requiresApproval: data.requiresApproval ?? true,
          type: 'new_dish',
        };
      }
    } catch { /* fall through to queue */ }
  }

  // Offline: queue for next online open
  await enqueueChefSuggestion({
    queued_at: new Date().toISOString(),
    type: 'new_dish',
    context: { ...context, rejectedDishes: await getRejectedDishes(14).catch(() => []) },
  });

  return null;
}
