/**
 * FastingCalendarService — Religious fasting calendar logic.
 *
 * Supports Orthodox, Catholic, Protestant and Custom fasting calendars.
 * Persists settings via SettingsService (IndexedDB).
 */

import { getSetting, setSetting } from './SettingsService';

// ─── Types ──────────────────────────────────────────────────────────

export type Religion = 'orthodox' | 'catholic' | 'protestant' | 'custom';

export interface FastingSettings {
  enabled: boolean;
  religion: Religion;
  /** For 'custom': array of weekday indices (0=Mon … 6=Sun) */
  customDays: number[];
}

export interface FastingDayInfo {
  isFasting: boolean;
  /** What foods to restrict */
  restrictions: ('meat' | 'dairy' | 'eggs')[];
  /** Human-readable reason key for i18n */
  reasonKey: string;
}

const SETTINGS_KEY = 'fastingCalendar';

const DEFAULT_SETTINGS: FastingSettings = {
  enabled: false,
  religion: 'orthodox',
  customDays: [],
};

// ─── Persistence ────────────────────────────────────────────────────

export async function getFastingSettings(): Promise<FastingSettings> {
  const raw = await getSetting(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveFastingSettings(s: FastingSettings): Promise<void> {
  await setSetting(SETTINGS_KEY, JSON.stringify(s));
}

// ─── Orthodox Easter (Julian → Gregorian) ───────────────────────────
// Uses the Meeus Julian algorithm then converts to Gregorian (+13 days
// for dates in the 21st century).

export function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3=March, 4=April (Julian)
  const day = ((d + e + 114) % 31) + 1;

  // Julian date → Gregorian: add 13 days for 2000-2099
  const julian = new Date(year, month - 1, day);
  julian.setDate(julian.getDate() + 13);
  return julian;
}

// ─── Western (Catholic) Easter — Anonymous Gregorian algorithm ──────

export function catholicEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// ─── Helper: date comparison (day-level) ────────────────────────────

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function daysBetween(start: Date, end: Date): number {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

function isInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d >= s && d <= e;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ─── Weekday index (ISO: 0=Mon … 6=Sun) ────────────────────────────

function isoWeekday(d: Date): number {
  return (d.getDay() + 6) % 7; // JS Sunday=0 → ISO Sunday=6
}

// ─── Orthodox fasting check ─────────────────────────────────────────

function checkOrthodox(date: Date): FastingDayInfo {
  const year = date.getFullYear();
  const wd = isoWeekday(date); // 0=Mon…6=Sun
  const noAnimal: ('meat' | 'dairy' | 'eggs')[] = ['meat', 'dairy', 'eggs'];

  const easter = orthodoxEaster(year);

  // Great Lent: 48 days before Easter (Clean Monday) through Holy Saturday
  const cleanMonday = addDays(easter, -48);
  const holySaturday = addDays(easter, -1);
  if (isInRange(date, cleanMonday, holySaturday)) {
    return { isFasting: true, restrictions: noAnimal, reasonKey: 'fasting.reason.greatLent' };
  }

  // Nativity Fast: Nov 15 – Dec 24
  const natStart = new Date(year, 10, 15); // Nov 15
  const natEnd = new Date(year, 11, 24);   // Dec 24
  if (isInRange(date, natStart, natEnd)) {
    return { isFasting: true, restrictions: noAnimal, reasonKey: 'fasting.reason.nativityFast' };
  }

  // Dormition Fast: Aug 1 – Aug 14
  const dormStart = new Date(year, 7, 1);
  const dormEnd = new Date(year, 7, 14);
  if (isInRange(date, dormStart, dormEnd)) {
    return { isFasting: true, restrictions: noAnimal, reasonKey: 'fasting.reason.dormitionFast' };
  }

  // Apostles Fast: Monday after All Saints (8 weeks after Easter) until June 28
  const allSaints = addDays(easter, 57); // 8th Sunday after Easter
  const apostlesStart = addDays(allSaints, 1); // Monday after
  const apostlesEnd = new Date(year, 5, 28); // June 28
  if (isInRange(date, apostlesStart, apostlesEnd)) {
    return { isFasting: true, restrictions: noAnimal, reasonKey: 'fasting.reason.apostlesFast' };
  }

  // Weekly fasting: Wednesday and Friday
  if (wd === 2 || wd === 4) { // Wed=2, Fri=4
    return { isFasting: true, restrictions: noAnimal, reasonKey: 'fasting.reason.wedFri' };
  }

  return { isFasting: false, restrictions: [], reasonKey: '' };
}

// ─── Catholic fasting check ─────────────────────────────────────────

function checkCatholic(date: Date): FastingDayInfo {
  const year = date.getFullYear();
  const wd = isoWeekday(date);
  const easter = catholicEaster(year);

  // Ash Wednesday: 46 days before Easter
  const ashWednesday = addDays(easter, -46);
  if (sameDay(date, ashWednesday)) {
    return { isFasting: true, restrictions: ['meat'], reasonKey: 'fasting.reason.ashWednesday' };
  }

  // Good Friday
  const goodFriday = addDays(easter, -2);
  if (sameDay(date, goodFriday)) {
    return { isFasting: true, restrictions: ['meat'], reasonKey: 'fasting.reason.goodFriday' };
  }

  // Fridays in Lent (Ash Wednesday → Holy Saturday)
  const holySaturday = addDays(easter, -1);
  if (wd === 4 && isInRange(date, ashWednesday, holySaturday)) { // Fri=4
    return { isFasting: true, restrictions: ['meat'], reasonKey: 'fasting.reason.lentenFriday' };
  }

  return { isFasting: false, restrictions: [], reasonKey: '' };
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Check if a given date is a fasting day based on current settings.
 */
export function checkFastingDay(
  date: Date,
  settings: FastingSettings,
): FastingDayInfo {
  if (!settings.enabled) {
    return { isFasting: false, restrictions: [], reasonKey: '' };
  }

  switch (settings.religion) {
    case 'orthodox':
      return checkOrthodox(date);
    case 'catholic':
      return checkCatholic(date);
    case 'protestant':
      // Protestants generally don't have mandatory fasting
      return { isFasting: false, restrictions: [], reasonKey: '' };
    case 'custom': {
      const wd = isoWeekday(date);
      if (settings.customDays.includes(wd)) {
        return { isFasting: true, restrictions: ['meat', 'dairy', 'eggs'], reasonKey: 'fasting.reason.customDay' };
      }
      return { isFasting: false, restrictions: [], reasonKey: '' };
    }
    default:
      return { isFasting: false, restrictions: [], reasonKey: '' };
  }
}

/**
 * Get fasting info for the next N days from a start date.
 */
export function getFastingDays(
  startDate: Date,
  count: number,
  settings: FastingSettings,
): (FastingDayInfo & { date: Date })[] {
  const result: (FastingDayInfo & { date: Date })[] = [];
  for (let i = 0; i < count; i++) {
    const d = addDays(startDate, i);
    const info = checkFastingDay(d, settings);
    result.push({ ...info, date: d });
  }
  return result;
}

/**
 * Build the dietary restriction string to append to the AI prompt
 * when a fasting day is detected.
 */
export function fastingRestrictionPrompt(
  restrictions: ('meat' | 'dairy' | 'eggs')[],
  lang: string,
): string {
  if (restrictions.length === 0) return '';

  const labels: Record<string, Record<string, string>> = {
    hu: { meat: 'hús', dairy: 'tejtermékek', eggs: 'tojás' },
    ro: { meat: 'carne', dairy: 'lactate', eggs: 'ouă' },
    en: { meat: 'meat', dairy: 'dairy', eggs: 'eggs' },
  };

  const l = labels[lang] || labels.en;
  const items = restrictions.map(r => l[r]).join(', ');

  const templates: Record<string, string> = {
    hu: `BÖJTI NAP: Tilos használni a következőket: ${items}. Csak növényi alapú ételeket készíts.`,
    ro: `ZI DE POST: Nu folosi: ${items}. Prepară doar mâncăruri pe bază de plante.`,
    en: `FASTING DAY: Do not use: ${items}. Prepare only plant-based meals.`,
  };

  return templates[lang] || templates.en;
}
