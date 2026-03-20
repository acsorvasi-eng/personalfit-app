// api/_shared/limits.ts
// Single source of truth for generation limits and admin configuration.
// Both generate-meal-plan.ts and usage.ts import from here.

export const FREE_MONTHLY_LIMIT = 13;

// Add the developer/admin email(s) here. Email is read from Firestore server-side,
// so client-side spoofing is not possible.
export const ADMIN_EMAILS: string[] = [
  'attila.csorvasi@gmail.com',  // ← replace with actual admin email if different
];

/** Returns current month as "YYYY-MM" string (UTC). */
export function currentMonthStr(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Returns the first day of next calendar month as "YYYY-MM-DD" (UTC).
 *  Correctly handles December → January year rollover.
 */
export function nextMonthFirstDay(): string {
  const now = new Date();
  const firstOfNext = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return firstOfNext.toISOString().slice(0, 10); // "YYYY-MM-01"
}
