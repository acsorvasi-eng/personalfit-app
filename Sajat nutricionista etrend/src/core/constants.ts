/**
 * ====================================================================
 * Core Constants — Application-wide immutable values
 * ====================================================================
 * Single source of truth for magic numbers, limits, and config keys.
 * Import from any layer without circular dependency risk.
 */

// ═══════════════════════════════════════════════════════════════
// App Identity
// ═══════════════════════════════════════════════════════════════

export const APP_NAME = 'Sixth-Halt';
export const APP_VERSION = '1.0.0';
export const APP_BUILD = 'offline-first';

// ═══════════════════════════════════════════════════════════════
// Brand Colors (Sixth-Halt Premium)
// ═══════════════════════════════════════════════════════════════

export const BRAND = {
  primary: '#3366FF',
  secondary: '#12CFA6',
  accent: '#FF6B35',
  dark: '#0A0F1E',
  light: '#F8FAFC',
} as const;

// ═══════════════════════════════════════════════════════════════
// Nutrition Defaults
// ═══════════════════════════════════════════════════════════════

/** Caloric values per gram of macronutrient */
export const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
  alcohol: 7,
  fiber: 2,
} as const;

/** Default macro split percentages (balanced) */
export const DEFAULT_MACRO_SPLIT = {
  protein: 0.30,
  carbs: 0.40,
  fat: 0.30,
} as const;

/** Daily micronutrient minimums (approximate) */
export const DAILY_MINIMUMS = {
  water_ml: 2000,
  fiber_g: 25,
  sodium_mg: 500,
  potassium_mg: 2600,
} as const;

/** BMR activity level multipliers (Harris-Benedict) */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

// ═══════════════════════════════════════════════════════════════
// Workout / Activity
// ═══════════════════════════════════════════════════════════════

/** MET values for common activities */
export const MET_VALUES: Record<string, number> = {
  walking: 3.5,
  jogging: 7.0,
  running: 9.8,
  cycling: 7.5,
  swimming: 8.0,
  weight_training: 6.0,
  hiit: 10.0,
  yoga: 3.0,
  pilates: 3.5,
  stretching: 2.5,
  dancing: 5.5,
  hiking: 6.0,
  rowing: 7.0,
  jump_rope: 12.3,
  boxing: 9.0,
  rest: 1.0,
};

/** Maximum workout duration (minutes) for sanity checks */
export const MAX_WORKOUT_DURATION_MIN = 300;

// ═══════════════════════════════════════════════════════════════
// Plan Constraints
// ═══════════════════════════════════════════════════════════════

export const PLAN_WEEKS = 4;
export const DAYS_PER_WEEK = 7;
export const TOTAL_PLAN_DAYS = PLAN_WEEKS * DAYS_PER_WEEK;
export const MEALS_PER_DAY = 5; // breakfast, lunch, dinner, snack, post_workout

// ═══════════════════════════════════════════════════════════════
// Storage Keys (localStorage)
// ═══════════════════════════════════════════════════════════════

export const STORAGE_KEYS = {
  AUTH_USER: 'authUser',
  TERMS_ACCEPTED: 'hasAcceptedTerms',
  ONBOARDING_DONE: 'hasCompletedOnboarding',
  SPLASH_SEEN: 'hasSeenSplash',
  PLAN_SETUP: 'hasPlanSetup',
  FULL_FLOW_DONE: 'hasCompletedFullFlow',
  FIRST_USAGE: 'appFirstUsageDate',
  THEME: 'theme',
  LANGUAGE: 'language',
  SUBSCRIPTION: 'subscriptionData',
  ENCRYPTION_KEY: 'encryptionKeyHash',
  SESSION_TOKEN: 'sessionToken',
  LAST_SYNC: 'lastSyncTimestamp',
} as const;

// ═══════════════════════════════════════════════════════════════
// IndexedDB
// ═══════════════════════════════════════════════════════════════

export const DB_NAME = 'NutriPlanDB';
export const DB_CURRENT_VERSION = 1;

// ═══════════════════════════════════════════════════════════════
// Limits & Thresholds
// ═══════════════════════════════════════════════════════════════

export const LIMITS = {
  /** Maximum calorie intake in a single meal */
  MAX_MEAL_CALORIES: 3000,
  /** Minimum BMR result (sanity check) */
  MIN_BMR: 800,
  /** Maximum BMR result (sanity check) */
  MAX_BMR: 5000,
  /** Max body weight in kg */
  MAX_WEIGHT_KG: 300,
  /** Min body weight in kg */
  MIN_WEIGHT_KG: 30,
  /** Max height in cm */
  MAX_HEIGHT_CM: 250,
  /** Min height in cm */
  MIN_HEIGHT_CM: 100,
  /** Max age */
  MAX_AGE: 120,
  /** Min age */
  MIN_AGE: 12,
  /** Free trial days */
  FREE_TRIAL_DAYS: 10,
} as const;

// ═══════════════════════════════════════════════════════════════
// Localization
// ═══════════════════════════════════════════════════════════════

export const SUPPORTED_LANGUAGES = ['hu', 'en', 'ro'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'hu';

// ═══════════════════════════════════════════════════════════════
// Security
// ═══════════════════════════════════════════════════════════════

export const SECURITY = {
  /** AES key length in bits */
  AES_KEY_LENGTH: 256,
  /** PBKDF2 iterations for key derivation */
  PBKDF2_ITERATIONS: 100_000,
  /** Session timeout in milliseconds (30 minutes) */
  SESSION_TIMEOUT_MS: 30 * 60 * 1000,
  /** Max failed login attempts before lockout */
  MAX_LOGIN_ATTEMPTS: 5,
  /** Lockout duration in milliseconds (15 minutes) */
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,
} as const;
