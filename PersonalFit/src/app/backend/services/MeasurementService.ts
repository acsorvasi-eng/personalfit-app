/**
 * ====================================================================
 * Measurement Service (Time Series)
 * ====================================================================
 * Manages body measurements as an append-only time series.
 *
 * Rules:
 *   - Stored as time-series: NEVER overwritten
 *   - New upload creates new version
 *   - Progress is calculable from historical data
 *   - Historical comparison enabled
 */

import { getDB, generateId, nowISO, notifyDBChange } from '../db';
import type { MeasurementEntity } from '../models';

// ═══════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════

export async function getAllMeasurements(): Promise<MeasurementEntity[]> {
  const db = await getDB();
  const all = await db.getAll<MeasurementEntity>('measurements');
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getLatestMeasurement(): Promise<MeasurementEntity | undefined> {
  const all = await getAllMeasurements();
  return all[all.length - 1];
}

export async function getMeasurementsForDateRange(
  startDate: string, endDate: string
): Promise<MeasurementEntity[]> {
  const all = await getAllMeasurements();
  return all.filter(m => m.date >= startDate && m.date <= endDate);
}

export async function getMeasurementsByVersion(version: number): Promise<MeasurementEntity[]> {
  const db = await getDB();
  return db.getAllFromIndex<MeasurementEntity>('measurements', 'by-version', version);
}

export async function getNextVersion(): Promise<number> {
  const all = await getAllMeasurements();
  if (all.length === 0) return 1;
  return Math.max(...all.map(m => m.version)) + 1;
}

// ═══════════════════════════════════════════════════════════════
// CREATE (APPEND-ONLY)
// ═══════════════════════════════════════════════════════════════

export interface MeasurementInput {
  date?: string;
  weight?: number;
  body_fat?: number;
  waist?: number;
  chest?: number;
  arm?: number;
  hip?: number;
  thigh?: number;
  neck?: number;
  notes?: string;
  source?: 'manual' | 'user_upload' | 'ai_extracted';
}

export async function recordMeasurement(input: MeasurementInput): Promise<MeasurementEntity> {
  const db = await getDB();
  const version = await getNextVersion();
  const now = nowISO();

  const entity: MeasurementEntity = {
    id: generateId(),
    date: input.date || now.split('T')[0],
    weight: input.weight,
    body_fat: input.body_fat,
    waist: input.waist,
    chest: input.chest,
    arm: input.arm,
    hip: input.hip,
    thigh: input.thigh,
    neck: input.neck,
    notes: input.notes || '',
    version,
    source: input.source || 'manual',
    created_at: now,
  };

  await db.put('measurements', entity);
  notifyDBChange({ store: 'measurements', action: 'put', key: entity.id });
  return entity;
}

export async function recordMeasurementsBatch(
  inputs: MeasurementInput[]
): Promise<MeasurementEntity[]> {
  const db = await getDB();
  const version = await getNextVersion();
  const now = nowISO();
  const results: MeasurementEntity[] = [];

  for (const input of inputs) {
    const entity: MeasurementEntity = {
      id: generateId(),
      date: input.date || now.split('T')[0],
      weight: input.weight,
      body_fat: input.body_fat,
      waist: input.waist,
      chest: input.chest,
      arm: input.arm,
      hip: input.hip,
      thigh: input.thigh,
      neck: input.neck,
      notes: input.notes || '',
      version,
      source: input.source || 'user_upload',
      created_at: now,
    };
    await db.put('measurements', entity);
    results.push(entity);
  }

  notifyDBChange({ store: 'measurements', action: 'put' });
  return results;
}

// ═══════════════════════════════════════════════════════════════
// PROGRESS CALCULATIONS
// ═══════════════════════════════════════════════════════════════

export interface ProgressReport {
  period_start: string;
  period_end: string;
  weight_change: number | null;
  body_fat_change: number | null;
  waist_change: number | null;
  chest_change: number | null;
  arm_change: number | null;
  data_points: number;
  measurements: MeasurementEntity[];
}

export async function calculateProgress(
  startDate: string, endDate: string
): Promise<ProgressReport> {
  const measurements = await getMeasurementsForDateRange(startDate, endDate);

  if (measurements.length < 2) {
    return {
      period_start: startDate,
      period_end: endDate,
      weight_change: null,
      body_fat_change: null,
      waist_change: null,
      chest_change: null,
      arm_change: null,
      data_points: measurements.length,
      measurements,
    };
  }

  const first = measurements[0];
  const last = measurements[measurements.length - 1];

  const diff = (a?: number, b?: number) => {
    if (a != null && b != null) return Math.round((b - a) * 10) / 10;
    return null;
  };

  return {
    period_start: first.date,
    period_end: last.date,
    weight_change: diff(first.weight, last.weight),
    body_fat_change: diff(first.body_fat, last.body_fat),
    waist_change: diff(first.waist, last.waist),
    chest_change: diff(first.chest, last.chest),
    arm_change: diff(first.arm, last.arm),
    data_points: measurements.length,
    measurements,
  };
}

export async function getWeightHistory(): Promise<Array<{ date: string; weight: number }>> {
  const all = await getAllMeasurements();
  return all
    .filter(m => m.weight != null)
    .map(m => ({ date: m.date, weight: m.weight! }));
}

export async function getCurrentStats(): Promise<{
  weight: number | null;
  body_fat: number | null;
  waist: number | null;
  chest: number | null;
  arm: number | null;
  lastDate: string | null;
}> {
  const latest = await getLatestMeasurement();
  if (!latest) {
    return { weight: null, body_fat: null, waist: null, chest: null, arm: null, lastDate: null };
  }
  return {
    weight: latest.weight ?? null,
    body_fat: latest.body_fat ?? null,
    waist: latest.waist ?? null,
    chest: latest.chest ?? null,
    arm: latest.arm ?? null,
    lastDate: latest.date,
  };
}
