/**
 * NotificationService — Local push notifications for daily meal reminders.
 *
 * Uses @capacitor/local-notifications (no server, no FCM).
 * Schedules notifications based on the active meal plan, user profile,
 * and meal window settings.
 *
 * Notification types per day:
 *   1. Morning greeting at wake time
 *   2. Pre-lunch reminder (1h before lunch window)
 *   3. Pre-dinner reminder (1h before dinner window)
 *   4. Evening summary at bedtime
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { LocalNotificationSchema, ScheduleOn } from '@capacitor/local-notifications';
import { getUserProfile, getMealSettings } from '../backend/services/UserProfileService';
import type { StoredUserProfile, MealSettings } from '../backend/services/UserProfileService';
import { getSetting, setSetting } from '../backend/services/SettingsService';
import { getActivePlan } from '../backend/services/NutritionPlanService';
import { getDB } from '../backend/db';
import type { MealEntity, MealDayEntity, MealItemEntity } from '../backend/models';
import { getStoredUser } from './authService';

// ─── Constants ──────────────────────────────────────────────────────

const SETTINGS_KEY = 'notificationsEnabled';
const SCHEDULE_DAYS = 7; // schedule for the next 7 days

/** Notification type offsets (day * 10 + offset = unique ID) */
const TYPE_MORNING = 1;
const TYPE_LUNCH = 2;
const TYPE_DINNER = 3;
const TYPE_EVENING = 4;

// ─── Translation strings ────────────────────────────────────────────

interface NotificationStrings {
  morningTitle: string;
  morningBody: (name: string, meal: string, kcal: number, target: number) => string;
  lunchTitle: string;
  dinnerTitle: string;
  mealBody: (mealName: string, kcal: number) => string;
  eveningTitle: string;
  eveningBody: (name: string, tomorrowMeal: string) => string;
}

const STRINGS: Record<string, NotificationStrings> = {
  hu: {
    morningTitle: 'Jo reggelt! \u{1F305}',
    morningBody: (name, meal, kcal, target) =>
      `Jo reggelt ${name}! Mai reggeli: ${meal} (${kcal} kcal). Napi celod: ${target} kcal.`,
    lunchTitle: 'Ebed 1 ora mulva \u{1F37D}\u{FE0F}',
    dinnerTitle: 'Vacsora 1 ora mulva \u{1F319}',
    mealBody: (mealName, kcal) => `${mealName} (${kcal} kcal)`,
    eveningTitle: 'Jo ejszakat! \u{1F31B}',
    eveningBody: (name, tomorrowMeal) =>
      `Jo ejszakat ${name}! Holnap reggelire: ${tomorrowMeal}. Aludj jol! \u{1F438}`,
  },
  en: {
    morningTitle: 'Good morning! \u{1F305}',
    morningBody: (name, meal, kcal, target) =>
      `Good morning ${name}! Today's breakfast: ${meal} (${kcal} kcal). Daily goal: ${target} kcal.`,
    lunchTitle: 'Lunch in 1 hour \u{1F37D}\u{FE0F}',
    dinnerTitle: 'Dinner in 1 hour \u{1F319}',
    mealBody: (mealName, kcal) => `${mealName} (${kcal} kcal)`,
    eveningTitle: 'Good night! \u{1F31B}',
    eveningBody: (name, tomorrowMeal) =>
      `Good night ${name}! Tomorrow's breakfast: ${tomorrowMeal}. Sleep well! \u{1F438}`,
  },
  ro: {
    morningTitle: 'Buna dimineata! \u{1F305}',
    morningBody: (name, meal, kcal, target) =>
      `Buna dimineata ${name}! Micul dejun: ${meal} (${kcal} kcal). Tinta zilnica: ${target} kcal.`,
    lunchTitle: 'Pranz in 1 ora \u{1F37D}\u{FE0F}',
    dinnerTitle: 'Cina in 1 ora \u{1F319}',
    mealBody: (mealName, kcal) => `${mealName} (${kcal} kcal)`,
    eveningTitle: 'Noapte buna! \u{1F31B}',
    eveningBody: (name, tomorrowMeal) =>
      `Noapte buna ${name}! Maine la micul dejun: ${tomorrowMeal}. Somn usor! \u{1F438}`,
  },
};

function getStrings(lang: string): NotificationStrings {
  return STRINGS[lang] || STRINGS['hu'];
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Parse "HH:MM" string to { hour, minute } */
function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
}

/** Subtract N minutes from a time string, return { hour, minute } */
function subtractMinutes(time: string, minutes: number): { hour: number; minute: number } {
  const { hour, minute } = parseTime(time);
  const totalMinutes = hour * 60 + minute - minutes;
  const adjusted = totalMinutes < 0 ? totalMinutes + 1440 : totalMinutes;
  return { hour: Math.floor(adjusted / 60), minute: adjusted % 60 };
}

/** Create a Date for a given day offset + hour/minute */
function makeDateForDay(dayOffset: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Generate a unique numeric ID for a notification: dayOffset * 10 + typeOffset */
function makeId(dayOffset: number, typeOffset: number): number {
  // Use a base from today's day-of-year to avoid collisions across weeks
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return ((dayOfYear + dayOffset) % 365) * 10 + typeOffset;
}

// ─── Meal data from IndexedDB ───────────────────────────────────────

interface DayMealInfo {
  breakfastName: string;
  breakfastKcal: number;
  lunchName: string;
  lunchKcal: number;
  dinnerName: string;
  dinnerKcal: number;
}

/**
 * Load meal names and kcal for a specific day number from the active plan.
 * dayNumber is 1-based, wraps around plan total days.
 */
async function getMealInfoForDay(planId: string, dayNumber: number): Promise<DayMealInfo | null> {
  try {
    const db = await getDB();
    const allDays = await db.getAllFromIndex<MealDayEntity>('meal_days', 'by-plan', planId);
    if (allDays.length === 0) return null;

    // Wrap dayNumber within available days
    const wrappedDay = ((dayNumber - 1) % allDays.length) + 1;
    const targetDay = allDays.find(d => d.day === wrappedDay);
    if (!targetDay) return null;

    const meals = await db.getAllFromIndex<MealEntity>('meals', 'by-plan', planId);
    const dayMeals = meals.filter(m => m.meal_day_id === targetDay.id);

    const getMealData = (type: string) => {
      const meal = dayMeals.find(m => m.meal_type === type);
      if (!meal) return { name: '', kcal: 0 };
      return {
        name: meal.name,
        kcal: meal.total_calories || 0,
      };
    };

    const breakfast = getMealData('breakfast');
    const lunch = getMealData('lunch');
    const dinner = getMealData('dinner');

    return {
      breakfastName: breakfast.name,
      breakfastKcal: breakfast.kcal,
      lunchName: lunch.name,
      lunchKcal: lunch.kcal,
      dinnerName: dinner.name,
      dinnerKcal: dinner.kcal,
    };
  } catch (e) {
    console.warn('[NotificationService] getMealInfoForDay error:', e);
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Request notification permission and set up listeners.
 * Safe to call on every app start; no-op on web.
 */
export async function initNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const result = await LocalNotifications.requestPermissions();
    if (result.display === 'granted') {
      console.log('[NotificationService] Permission granted');
    } else {
      console.log('[NotificationService] Permission denied:', result.display);
    }

    // Listen for notification actions (tap)
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      console.log('[NotificationService] Tapped:', notification.notification.id);
    });
  } catch (e) {
    console.warn('[NotificationService] initNotifications error:', e);
  }
}

/**
 * Check if notifications are enabled in user settings.
 */
export async function isNotificationsEnabled(): Promise<boolean> {
  const val = await getSetting(SETTINGS_KEY);
  // Default to true for first-time users
  return val !== '0';
}

/**
 * Enable or disable notifications. When disabling, cancels all scheduled.
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await setSetting(SETTINGS_KEY, enabled ? '1' : '0');
  if (!enabled) {
    await cancelAllNotifications();
  } else {
    await rescheduleNotifications();
  }
}

/**
 * Cancel all scheduled local notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map(n => ({ id: n.id })),
      });
    }
    console.log('[NotificationService] Cancelled all notifications');
  } catch (e) {
    console.warn('[NotificationService] cancelAll error:', e);
  }
}

/**
 * Schedule all daily notifications for the next SCHEDULE_DAYS days.
 * Reads user profile, meal settings, and active plan from IndexedDB.
 */
export async function scheduleAllDailyNotifications(language?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const enabled = await isNotificationsEnabled();
  if (!enabled) return;

  try {
    // Check permission
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      console.log('[NotificationService] No permission, skipping schedule');
      return;
    }

    const profile = await getUserProfile();
    const mealSettings = await getMealSettings();
    const plan = await getActivePlan();
    const lang = language || (await getSetting('language')) || 'hu';
    const strings = getStrings(lang);

    if (!plan) {
      console.log('[NotificationService] No active plan, skipping schedule');
      return;
    }

    // Resolve user name: prefer profile name, fall back to auth user name.
    // Filter out generic "Demo User" placeholder.
    const authUser = await getStoredUser();
    const rawName = profile.name || authUser?.name || '';
    const userName = rawName === 'Demo User' ? '' : rawName;
    const calorieTarget = profile.calorieTarget || 2000;
    const wakeTime = profile.wakeTime || '07:00';
    const bedtime = profile.bedtime || '23:00';

    // Find lunch and dinner windows from meal settings
    const lunchWindow = mealSettings.meals.find(
      m => m.name.toLowerCase().includes('ebed') ||
           m.name.toLowerCase().includes('ebed') ||
           m.name.toLowerCase().includes('lunch') ||
           m.name.toLowerCase().includes('pranz')
    );
    const dinnerWindow = mealSettings.meals.find(
      m => m.name.toLowerCase().includes('vacsora') ||
           m.name.toLowerCase().includes('dinner') ||
           m.name.toLowerCase().includes('cina')
    );

    const isAndroid = Capacitor.getPlatform() === 'android';
    // Android: show Kix frog logo as the large icon (left side of notification)
    const largeIconProp = isAndroid ? { largeIcon: 'ic_launcher' } : {};
    const notifications: LocalNotificationSchema[] = [];

    // Calculate the current plan day
    const planCreatedAt = new Date(plan.created_at);
    const now = new Date();
    const daysSincePlanStart = Math.floor(
      (now.getTime() - planCreatedAt.getTime()) / 86400000
    );

    for (let dayOffset = 0; dayOffset < SCHEDULE_DAYS; dayOffset++) {
      const planDay = daysSincePlanStart + dayOffset + 1; // 1-based
      const mealInfo = await getMealInfoForDay(plan.id, planDay);
      if (!mealInfo) continue;

      // Tomorrow's meal info for evening notification
      const tomorrowInfo = await getMealInfoForDay(plan.id, planDay + 1);

      // 1. Morning greeting at wake time
      const wakeTimeParsed = parseTime(wakeTime);
      const morningDate = makeDateForDay(dayOffset, wakeTimeParsed.hour, wakeTimeParsed.minute);
      if (morningDate > now) {
        notifications.push({
          id: makeId(dayOffset, TYPE_MORNING),
          title: strings.morningTitle,
          body: strings.morningBody(
            userName,
            mealInfo.breakfastName || 'Reggeli',
            mealInfo.breakfastKcal,
            calorieTarget,
          ),
          schedule: { at: morningDate },
          sound: 'default',
          extra: { type: 'morning' },
          ...largeIconProp,
          ...(Capacitor.getPlatform() === 'ios' ? { threadIdentifier: 'kix-meals' } : {}),
        });
      }

      // 2. Pre-lunch reminder (1 hour before lunch window)
      if (lunchWindow) {
        const lunchReminder = subtractMinutes(lunchWindow.startTime, 60);
        const lunchDate = makeDateForDay(dayOffset, lunchReminder.hour, lunchReminder.minute);
        if (lunchDate > now) {
          notifications.push({
            id: makeId(dayOffset, TYPE_LUNCH),
            title: strings.lunchTitle,
            body: strings.mealBody(mealInfo.lunchName || 'Ebed', mealInfo.lunchKcal),
            schedule: { at: lunchDate },
            sound: 'default',
            extra: { type: 'lunch' },
            ...largeIconProp,
            ...(Capacitor.getPlatform() === 'ios' ? { threadIdentifier: 'kix-meals' } : {}),
          });
        }
      }

      // 3. Pre-dinner reminder (1 hour before dinner window)
      if (dinnerWindow) {
        const dinnerReminder = subtractMinutes(dinnerWindow.startTime, 60);
        const dinnerDate = makeDateForDay(dayOffset, dinnerReminder.hour, dinnerReminder.minute);
        if (dinnerDate > now) {
          notifications.push({
            id: makeId(dayOffset, TYPE_DINNER),
            title: strings.dinnerTitle,
            body: strings.mealBody(mealInfo.dinnerName || 'Vacsora', mealInfo.dinnerKcal),
            schedule: { at: dinnerDate },
            sound: 'default',
            extra: { type: 'dinner' },
            ...largeIconProp,
            ...(Capacitor.getPlatform() === 'ios' ? { threadIdentifier: 'kix-meals' } : {}),
          });
        }
      }

      // 4. Evening summary at bedtime
      const bedtimeParsed = parseTime(bedtime);
      const eveningDate = makeDateForDay(dayOffset, bedtimeParsed.hour, bedtimeParsed.minute);
      if (eveningDate > now && tomorrowInfo) {
        notifications.push({
          id: makeId(dayOffset, TYPE_EVENING),
          title: strings.eveningTitle,
          body: strings.eveningBody(
            userName,
            tomorrowInfo.breakfastName || 'Reggeli',
          ),
          schedule: { at: eveningDate },
          sound: 'default',
          extra: { type: 'evening' },
          ...largeIconProp,
          ...(Capacitor.getPlatform() === 'ios' ? { threadIdentifier: 'kix-meals' } : {}),
        });
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log(`[NotificationService] Scheduled ${notifications.length} notifications for ${SCHEDULE_DAYS} days`);
    }
  } catch (e) {
    console.warn('[NotificationService] scheduleAllDailyNotifications error:', e);
  }
}

/**
 * Cancel all existing notifications and reschedule fresh ones.
 * Call this when the plan changes, profile updates, or on daily refresh.
 */
export async function rescheduleNotifications(language?: string): Promise<void> {
  await cancelAllNotifications();
  await scheduleAllDailyNotifications(language);
}
