/**
 * Progress Repository — CRUD operations for body composition & goals.
 */

import type { ProgressEntry, ProgressGoal } from '../../domain/models';
import { DOMAIN_STORES, dbGet, dbPut, dbDelete, dbGetAll, dbGetByIndex } from '../database';
import { generateId, nowISO } from '../../core/utils';

const STORE = DOMAIN_STORES.PROGRESS_ENTRIES;
const GOALS_STORE = DOMAIN_STORES.GOALS;

// ═══════════════════════════════════════════════════════════════
// Progress Entries
// ═══════════════════════════════════════════════════════════════

export async function getProgressEntry(id: string): Promise<ProgressEntry | undefined> {
  return dbGet<ProgressEntry>(STORE, id);
}

export async function getAllProgressEntries(): Promise<ProgressEntry[]> {
  return dbGetAll<ProgressEntry>(STORE);
}

export async function getProgressByDate(date: string): Promise<ProgressEntry[]> {
  return dbGetByIndex<ProgressEntry>(STORE, 'by-date', date);
}

export async function getProgressInRange(startDate: string, endDate: string): Promise<ProgressEntry[]> {
  const all = await dbGetAll<ProgressEntry>(STORE);
  return all
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getLatestProgressEntry(): Promise<ProgressEntry | undefined> {
  const all = await dbGetAll<ProgressEntry>(STORE);
  if (all.length === 0) return undefined;
  return all.sort((a, b) => b.date.localeCompare(a.date))[0];
}

export async function saveProgressEntry(entry: Partial<ProgressEntry> & { date: string; weight: number }): Promise<ProgressEntry> {
  const now = nowISO();
  const record: ProgressEntry = {
    id: entry.id ?? generateId(),
    timestamp: entry.timestamp ?? Date.now(),
    createdAt: entry.createdAt ?? now,
    updatedAt: now,
    date: entry.date,
    weight: entry.weight,
    bodyFat: entry.bodyFat,
    muscleMass: entry.muscleMass,
    bmi: entry.bmi,
    visceralFat: entry.visceralFat,
    waist: entry.waist,
    chest: entry.chest,
    arm: entry.arm,
    hip: entry.hip,
    thigh: entry.thigh,
    neck: entry.neck,
    notes: entry.notes ?? '',
    source: entry.source ?? 'manual',
  };

  await dbPut(STORE, record);
  return record;
}

export async function deleteProgressEntry(id: string): Promise<void> {
  await dbDelete(STORE, id);
}

// ═══════════════════════════════════════════════════════════════
// Goals
// ═══════════════════════════════════════════════════════════════

export async function getActiveGoal(): Promise<ProgressGoal | undefined> {
  const all = await dbGetAll<ProgressGoal>(GOALS_STORE);
  return all.find((g) => g.isActive);
}

export async function getAllGoals(): Promise<ProgressGoal[]> {
  return dbGetAll<ProgressGoal>(GOALS_STORE);
}

export async function saveGoal(goal: Partial<ProgressGoal> & { type: string; startWeight: number; startDate: string }): Promise<ProgressGoal> {
  const record: ProgressGoal = {
    id: goal.id ?? generateId(),
    type: goal.type as ProgressGoal['type'],
    targetWeight: goal.targetWeight,
    targetBodyFat: goal.targetBodyFat,
    targetDate: goal.targetDate,
    startWeight: goal.startWeight,
    startDate: goal.startDate,
    isActive: goal.isActive ?? true,
  };

  // Deactivate other goals if this one is active
  if (record.isActive) {
    const existing = await dbGetAll<ProgressGoal>(GOALS_STORE);
    for (const g of existing) {
      if (g.id !== record.id && g.isActive) {
        await dbPut(GOALS_STORE, { ...g, isActive: false });
      }
    }
  }

  await dbPut(GOALS_STORE, record);
  return record;
}

export async function deleteGoal(id: string): Promise<void> {
  await dbDelete(GOALS_STORE, id);
}
