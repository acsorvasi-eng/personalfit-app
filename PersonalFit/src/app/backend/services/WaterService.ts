/**
 * WaterService — persist daily water intake in IndexedDB (water_log store).
 * Used by floating water button and rest card water button.
 */

import { getDB } from '../db';

export interface WaterLog {
  date: string; // 'YYYY-MM-DD'
  total: number; // ml
}

export class WaterService {
  static async addWater(ml: number = 250): Promise<number> {
    console.log('[WaterService] addWater called:', ml);
    const db = await getDB();
    const today = new Date().toISOString().split('T')[0];

    let existing: WaterLog | undefined;
    try {
      existing = await db.get<WaterLog>('water_log', today);
    } catch (e) {
      existing = undefined;
    }

    const current = existing?.total ?? 0;
    console.log('[Water] current total before:', current);
    const newTotal = current + ml;
    console.log('[Water] saving new total:', newTotal);

    await db.put('water_log', { date: today, total: newTotal });
    console.log('[WaterService] saved total:', newTotal, 'ml');

    window.dispatchEvent(
      new CustomEvent('waterUpdated', {
        detail: { total: newTotal },
      })
    );
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('waterTrackerSync'));

    return newTotal;
  }

  static async getTodayTotal(): Promise<number> {
    const db = await getDB();
    const today = new Date().toISOString().split('T')[0];
    try {
      const log = await db.get<WaterLog>('water_log', today);
      return log?.total ?? 0;
    } catch {
      return 0;
    }
  }

  /** Reset today's water to 0 ml (e.g. long-press on tracker). */
  static async resetToday(): Promise<void> {
    const db = await getDB();
    const today = new Date().toISOString().split('T')[0];
    await db.put('water_log', { date: today, total: 0 });
    window.dispatchEvent(new CustomEvent('waterUpdated', { detail: { total: 0 } }));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('waterTrackerSync'));
  }
}
