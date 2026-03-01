/**
 * Workout Repository — CRUD operations for workout logs.
 */

import type { WorkoutLog } from '../../domain/models';
import { DOMAIN_STORES, dbGet, dbPut, dbDelete, dbGetAll, dbGetByIndex } from '../database';
import { generateId, nowISO } from '../../core/utils';

const STORE = DOMAIN_STORES.WORKOUT_LOGS;

export async function getWorkoutLog(id: string): Promise<WorkoutLog | undefined> {
  return dbGet<WorkoutLog>(STORE, id);
}

export async function getAllWorkoutLogs(): Promise<WorkoutLog[]> {
  return dbGetAll<WorkoutLog>(STORE);
}

export async function getWorkoutLogsByDate(date: string): Promise<WorkoutLog[]> {
  return dbGetByIndex<WorkoutLog>(STORE, 'by-date', date);
}

export async function getWorkoutLogsInRange(startDate: string, endDate: string): Promise<WorkoutLog[]> {
  const all = await dbGetAll<WorkoutLog>(STORE);
  return all.filter((log) => log.date >= startDate && log.date <= endDate);
}

export async function getWorkoutLogsByCategory(category: string): Promise<WorkoutLog[]> {
  return dbGetByIndex<WorkoutLog>(STORE, 'by-category', category);
}

export async function saveWorkoutLog(log: Partial<WorkoutLog> & { date: string; type: string }): Promise<WorkoutLog> {
  const now = nowISO();
  const entry: WorkoutLog = {
    id: log.id ?? generateId(),
    timestamp: log.timestamp ?? Date.now(),
    createdAt: log.createdAt ?? now,
    updatedAt: now,
    date: log.date,
    type: log.type,
    category: log.category ?? 'other',
    duration: log.duration ?? 0,
    intensity: log.intensity ?? 'moderate',
    caloriesBurned: log.caloriesBurned ?? 0,
    heartRateAvg: log.heartRateAvg,
    heartRateMax: log.heartRateMax,
    steps: log.steps,
    distance: log.distance,
    notes: log.notes ?? '',
    exercises: log.exercises ?? [],
  };

  await dbPut(STORE, entry);
  return entry;
}

export async function deleteWorkoutLog(id: string): Promise<void> {
  await dbDelete(STORE, id);
}

export async function getRecentWorkouts(days: number): Promise<WorkoutLog[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const all = await dbGetAll<WorkoutLog>(STORE);
  return all.filter((log) => log.date >= cutoffStr);
}
