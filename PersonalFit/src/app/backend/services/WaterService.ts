/**
 * WaterService — persist daily water intake in IndexedDB (water_log store).
 * Falls back to localStorage if IndexedDB is unavailable (e.g. store not yet created).
 */

import { getDB } from '../db';

export interface WaterLog {
  date: string; // 'YYYY-MM-DD'
  total: number; // ml
}

const WATER_LOCALSTORAGE_KEY = 'waterTracking';

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function readFromLocalStorage(): number {
  try {
    const raw = localStorage.getItem(WATER_LOCALSTORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data[getTodayStr()] ?? 0;
  } catch {
    return 0;
  }
}

function writeToLocalStorage(total: number): void {
  try {
    const today = getTodayStr();
    const raw = localStorage.getItem(WATER_LOCALSTORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[today] = total;
    localStorage.setItem(WATER_LOCALSTORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[WaterService] localStorage fallback write failed:', e);
  }
}

function dispatchWaterEvents(total: number): void {
  window.dispatchEvent(new CustomEvent('waterUpdated', { detail: { total } }));
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new Event('waterTrackerSync'));
}

export class WaterService {
  /** Add ml to TODAY's total only. Key = 'YYYY-MM-DD'; each day starts fresh. */
  static async addWater(ml: number = 250): Promise<number> {
    const today = getTodayStr();
    try {
      const db = await getDB();
      let existing: WaterLog | undefined;
      try {
        existing = await db.get<WaterLog>('water_log', today);
      } catch {
        existing = undefined;
      }
      const current = existing?.total ?? 0;
      const newTotal = current + ml;
      await db.put('water_log', { date: today, total: newTotal });
      dispatchWaterEvents(newTotal);
      return newTotal;
    } catch (e) {
      console.warn('[WaterService] IndexedDB failed, using localStorage:', e);
      const current = readFromLocalStorage();
      const newTotal = current + ml;
      writeToLocalStorage(newTotal);
      dispatchWaterEvents(newTotal);
      return newTotal;
    }
  }

  /** Return TODAY's total only. Key = 'YYYY-MM-DD'; if no record for today, return 0. Old days' data is not shown. */
  static async getTodayTotal(): Promise<number> {
    const today = getTodayStr();
    try {
      const db = await getDB();
      const log = await db.get<WaterLog>('water_log', today);
      return log?.total ?? 0;
    } catch {
      return readFromLocalStorage();
    }
  }

  /** Reset today's water to 0 ml (e.g. long-press on tracker). */
  static async resetToday(): Promise<void> {
    const today = getTodayStr();
    try {
      const db = await getDB();
      await db.put('water_log', { date: today, total: 0 });
    } catch {
      writeToLocalStorage(0);
    }
    dispatchWaterEvents(0);
  }
}
