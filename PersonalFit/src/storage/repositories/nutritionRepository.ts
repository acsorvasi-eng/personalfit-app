/**
 * Nutrition Repository — CRUD operations for nutrition logs.
 */

import type { NutritionLog } from '../../domain/models';
import { DOMAIN_STORES, dbGet, dbPut, dbDelete, dbGetAll, dbGetByIndex } from '../database';
import { generateId, nowISO } from '../../core/utils';

const STORE = DOMAIN_STORES.NUTRITION_LOGS;

export async function getNutritionLog(id: string): Promise<NutritionLog | undefined> {
  return dbGet<NutritionLog>(STORE, id);
}

export async function getAllNutritionLogs(): Promise<NutritionLog[]> {
  return dbGetAll<NutritionLog>(STORE);
}

export async function getNutritionLogsByDate(date: string): Promise<NutritionLog[]> {
  return dbGetByIndex<NutritionLog>(STORE, 'by-date', date);
}

export async function getNutritionLogsInRange(startDate: string, endDate: string): Promise<NutritionLog[]> {
  const all = await dbGetAll<NutritionLog>(STORE);
  return all.filter((log) => log.date >= startDate && log.date <= endDate);
}

export async function saveNutritionLog(log: Partial<NutritionLog> & { date: string }): Promise<NutritionLog> {
  const now = nowISO();
  const entry: NutritionLog = {
    id: log.id ?? generateId(),
    timestamp: log.timestamp ?? Date.now(),
    createdAt: log.createdAt ?? now,
    updatedAt: now,
    date: log.date,
    calories: log.calories ?? 0,
    protein: log.protein ?? 0,
    carbs: log.carbs ?? 0,
    fats: log.fats ?? 0,
    fiber: log.fiber,
    water: log.water,
    mealType: log.mealType ?? 'lunch',
    mealName: log.mealName ?? '',
    items: log.items ?? [],
  };

  await dbPut(STORE, entry);
  return entry;
}

export async function deleteNutritionLog(id: string): Promise<void> {
  await dbDelete(STORE, id);
}

export async function deleteNutritionLogsByDate(date: string): Promise<void> {
  const logs = await getNutritionLogsByDate(date);
  for (const log of logs) {
    await dbDelete(STORE, log.id);
  }
}
