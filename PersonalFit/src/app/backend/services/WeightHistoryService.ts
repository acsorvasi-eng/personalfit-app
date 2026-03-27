import { getDB, generateId, nowISO } from '../db';
import { getSetting, removeSetting } from './SettingsService';

export interface WeightEntry {
  id: string;
  date: string;        // ISO string: "2026-03-04"
  weight: number;      // kg
  weekNumber?: number; // opcionális heti sorszám
  note?: string;
}

export class WeightHistoryService {
  private static readonly STORE = 'weight_history';

  // ------- OLVASÁS -------

  static async getAll(): Promise<WeightEntry[]> {
    const db = await getDB();
    const entries = await db.getAll<WeightEntry>(this.STORE as any);
    return entries.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  static async getLatest(): Promise<WeightEntry | null> {
    const all = await this.getAll();
    return all.length > 0 ? all[all.length - 1] : null;
  }

  static async getByDateRange(from: string, to: string): Promise<WeightEntry[]> {
    const all = await this.getAll();
    return all.filter(e => e.date >= from && e.date <= to);
  }

  // ------- ÍRÁS -------

  static async addEntry(weight: number, date?: string, note?: string): Promise<WeightEntry> {
    const db = await getDB();
    const entry: WeightEntry = {
      id: generateId(),
      date: date ?? nowISO().split('T')[0],
      weight,
      note,
    };
    await db.put(this.STORE as any, entry);
    return entry;
  }

  static async updateEntry(id: string, updates: Partial<WeightEntry>): Promise<void> {
    const db = await getDB();
    const existing = await db.get<WeightEntry | undefined>(this.STORE as any, id);
    if (!existing) throw new Error(`WeightEntry not found: ${id}`);
    await db.put(this.STORE as any, { ...existing, ...updates });
  }

  static async deleteEntry(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(this.STORE as any, id);
  }

  /** One-time migration from settings store (legacy key) into weight_history store. */
  static async migrateFromLocalStorage(): Promise<void> {
    const raw = await getSetting('weightHistory');
    if (!raw) return;
    try {
      const history = JSON.parse(raw);
      const db = await getDB();
      const existing = await db.getAll<WeightEntry>(this.STORE as any);
      if (existing.length > 0) {
        await removeSetting('weightHistory');
        return;
      }
      const entries = Array.isArray(history) ? history : Object.values(history);
      for (const entry of entries as any[]) {
        await db.put(this.STORE as any, {
          id: entry.id ?? generateId(),
          date: entry.date ?? nowISO().split('T')[0],
          weight: entry.weight ?? entry.kg ?? 0,
          weekNumber: entry.weekNumber ?? entry.week,
          note: entry.note,
        } as WeightEntry);
      }
      await removeSetting('weightHistory');
    } catch (e) {
      console.error('[WeightHistoryService] Migration failed:', e);
    }
  }

  // ------- RESET -------

  static async clearAll(): Promise<void> {
    const db = await getDB();
    await db.clear(this.STORE as any);
    await removeSetting('weightHistory');
  }
}

