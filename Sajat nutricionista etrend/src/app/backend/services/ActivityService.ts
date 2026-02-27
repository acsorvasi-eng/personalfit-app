/**
 * ====================================================================
 * Activity & Sports Service
 * ====================================================================
 * Manages workout logging, training plan CRUD, and activity queries.
 */

import { getDB, generateId, nowISO, todayDate, notifyDBChange } from '../db';
import type {
  ActivityLogEntity,
  ActivityIntensity,
  TrainingPlanEntity,
  TrainingPlanDayEntity,
} from '../models';

// ═══════════════════════════════════════════════════════════════
// ACTIVITY LOG OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function logActivity(input: {
  activity_type: string;
  activity_name: string;
  activity_icon: string;
  category: string;
  duration_minutes: number;
  intensity: ActivityIntensity;
  calories_burned: number;
  steps?: number;
  source?: 'manual' | 'synced';
  synced_from?: string;
  date?: string;
}): Promise<ActivityLogEntity> {
  const db = await getDB();
  const entity: ActivityLogEntity = {
    id: generateId(),
    date: input.date || todayDate(),
    activity_type: input.activity_type,
    activity_name: input.activity_name,
    activity_icon: input.activity_icon,
    category: input.category,
    duration_minutes: input.duration_minutes,
    intensity: input.intensity,
    calories_burned: input.calories_burned,
    steps: input.steps,
    source: input.source || 'manual',
    synced_from: input.synced_from,
    created_at: nowISO(),
  };

  await db.put('activity_logs', entity);
  notifyDBChange({ store: 'activity_logs', action: 'put', key: entity.id });
  return entity;
}

export async function getActivitiesForDate(date: string): Promise<ActivityLogEntity[]> {
  const db = await getDB();
  return db.getAllFromIndex<ActivityLogEntity>('activity_logs', 'by-date', date);
}

export async function getTodayActivities(): Promise<ActivityLogEntity[]> {
  return getActivitiesForDate(todayDate());
}

export async function getActivitiesForDateRange(
  startDate: string, endDate: string
): Promise<ActivityLogEntity[]> {
  const db = await getDB();
  const all = await db.getAll<ActivityLogEntity>('activity_logs');
  return all.filter(a => a.date >= startDate && a.date <= endDate);
}

export async function deleteActivity(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('activity_logs', id);
  notifyDBChange({ store: 'activity_logs', action: 'delete', key: id });
}

// ═══════════════════════════════════════════════════════════════
// DAILY AGGREGATION
// ═══════════════════════════════════════════════════════════════

export interface DailyActivitySummary {
  date: string;
  total_duration_minutes: number;
  total_calories_burned: number;
  total_steps: number;
  activity_count: number;
  entries: ActivityLogEntity[];
}

export async function getDailySummary(date: string): Promise<DailyActivitySummary> {
  const activities = await getActivitiesForDate(date);
  return {
    date,
    total_duration_minutes: activities.reduce((s, a) => s + a.duration_minutes, 0),
    total_calories_burned: activities.reduce((s, a) => s + a.calories_burned, 0),
    total_steps: activities.reduce((s, a) => s + (a.steps || 0), 0),
    activity_count: activities.length,
    entries: activities,
  };
}

export async function getTodaySummary(): Promise<DailyActivitySummary> {
  return getDailySummary(todayDate());
}

export async function getWeeklySummary(weekStartDate: string): Promise<DailyActivitySummary[]> {
  const summaries: DailyActivitySummary[] = [];
  const start = new Date(weekStartDate);
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    summaries.push(await getDailySummary(dateStr));
  }
  return summaries;
}

// ═══════════════════════════════════════════════════════════════
// TRAINING PLAN OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function getActiveTrainingPlan(): Promise<TrainingPlanEntity | undefined> {
  const db = await getDB();
  const all = await db.getAll<TrainingPlanEntity>('training_plans');
  return all.find(p => p.is_active);
}

export async function getAllTrainingPlans(): Promise<TrainingPlanEntity[]> {
  const db = await getDB();
  return db.getAll<TrainingPlanEntity>('training_plans');
}

export async function createTrainingPlan(input: {
  label: string;
  source: 'predefined' | 'user_upload' | 'ai_generated';
}): Promise<TrainingPlanEntity> {
  const db = await getDB();
  const all = await db.getAll<TrainingPlanEntity>('training_plans');
  const maxVersion = all.reduce((max, p) => Math.max(max, p.version), 0);
  const now = nowISO();

  const plan: TrainingPlanEntity = {
    id: generateId(),
    version: maxVersion + 1,
    is_active: false,
    label: input.label,
    source: input.source,
    created_at: now,
    updated_at: now,
  };

  await db.put('training_plans', plan);
  notifyDBChange({ store: 'training_plans', action: 'put', key: plan.id });
  return plan;
}

export async function activateTrainingPlan(planId: string): Promise<void> {
  const db = await getDB();
  const all = await db.getAll<TrainingPlanEntity>('training_plans');
  const now = nowISO();

  for (const plan of all) {
    const wasActive = plan.is_active;
    plan.is_active = plan.id === planId;
    if (plan.is_active !== wasActive) {
      plan.updated_at = now;
      await db.put('training_plans', plan);
    }
  }

  notifyDBChange({ store: 'training_plans', action: 'put', key: planId });
}

export async function deleteTrainingPlan(planId: string): Promise<void> {
  const db = await getDB();
  const days = await db.getAllFromIndex<TrainingPlanDayEntity>('training_plan_days', 'by-plan', planId);
  for (const day of days) {
    await db.delete('training_plan_days', day.id);
  }
  await db.delete('training_plans', planId);
  notifyDBChange({ store: 'training_plans', action: 'delete', key: planId });
}

// ═══════════════════════════════════════════════════════════════
// TRAINING PLAN DAY OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function getTrainingDaysForPlan(planId: string): Promise<TrainingPlanDayEntity[]> {
  const db = await getDB();
  return db.getAllFromIndex<TrainingPlanDayEntity>('training_plan_days', 'by-plan', planId);
}

export async function getTrainingDayForWeekDay(
  planId: string, week: number, day: number
): Promise<TrainingPlanDayEntity | undefined> {
  const db = await getDB();
  const results = await db.getAllFromIndex<TrainingPlanDayEntity>(
    'training_plan_days', 'by-plan-week-day', [planId, week, day]
  );
  return results[0];
}

export async function addTrainingPlanDay(input: {
  training_plan_id: string;
  week: number;
  day: number;
  planned_activity: string;
  planned_duration_minutes: number;
  estimated_calories: number;
  intensity: ActivityIntensity;
  notes?: string;
}): Promise<TrainingPlanDayEntity> {
  const db = await getDB();
  const entity: TrainingPlanDayEntity = {
    id: generateId(),
    training_plan_id: input.training_plan_id,
    week: input.week,
    day: input.day,
    planned_activity: input.planned_activity,
    planned_duration_minutes: input.planned_duration_minutes,
    estimated_calories: input.estimated_calories,
    intensity: input.intensity,
    notes: input.notes || '',
    created_at: nowISO(),
  };
  await db.put('training_plan_days', entity);
  return entity;
}

// ═══════════════════════════════════════════════════════════════
// CALORIE BURN FOR CALORIE ENGINE
// ═══════════════════════════════════════════════════════════════

export async function getTodayCaloriesBurned(): Promise<number> {
  const activities = await getTodayActivities();
  return activities.reduce((sum, a) => sum + a.calories_burned, 0);
}

export async function getScheduledCaloriesBurn(
  week: number, dayOfWeek: number
): Promise<number> {
  const plan = await getActiveTrainingPlan();
  if (!plan) return 0;

  const day = await getTrainingDayForWeekDay(plan.id, week, dayOfWeek);
  return day?.estimated_calories || 0;
}
