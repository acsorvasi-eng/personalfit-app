/**
 * WaterService — persist daily water intake in IndexedDB (water_log store) only.
 */

import { getDB } from '../db';

export interface WaterLog {
  date: string; // 'YYYY-MM-DD'
  total: number; // ml
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function dispatchWaterEvents(total: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('waterUpdated', { detail: { total } }));
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new Event('waterTrackerSync'));
}

export class WaterService {
  /** Add ml to TODAY's total only. Key = 'YYYY-MM-DD'; each day starts fresh. */
  static async addWater(ml: number = 250): Promise<number> {
    const today = getTodayStr();
    const db = await getDB();
    const existing = await db.get<WaterLog>('water_log', today).catch(() => undefined);
    const current = existing?.total ?? 0;
    const newTotal = current + ml;
    await db.put('water_log', { date: today, total: newTotal });
    dispatchWaterEvents(newTotal);
    return newTotal;
  }

  /** Return TODAY's total only. Key = 'YYYY-MM-DD'; if no record for today, return 0. */
  static async getTodayTotal(): Promise<number> {
    const today = getTodayStr();
    const db = await getDB();
    const log = await db.get<WaterLog>('water_log', today);
    return log?.total ?? 0;
  }

  /** Reset today's water to 0 ml (e.g. long-press on tracker). */
  static async resetToday(): Promise<void> {
    const today = getTodayStr();
    const db = await getDB();
    await db.put('water_log', { date: today, total: 0 });
    dispatchWaterEvents(0);
  }
}
