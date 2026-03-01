/**
 * ====================================================================
 * Core Config — Runtime configuration for the offline-first app
 * ====================================================================
 * Environment-aware settings. All values have sensible offline defaults.
 * No cloud dependencies — everything runs locally.
 */

import { APP_NAME, APP_VERSION, DEFAULT_LANGUAGE, type SupportedLanguage } from './constants';

// ═══════════════════════════════════════════════════════════════
// Environment Detection
// ═══════════════════════════════════════════════════════════════

export const ENV = {
  isDev: import.meta.env?.DEV ?? false,
  isProd: import.meta.env?.PROD ?? true,
  mode: (import.meta.env?.MODE as string) ?? 'production',
} as const;

// ═══════════════════════════════════════════════════════════════
// Feature Flags
// ═══════════════════════════════════════════════════════════════

export interface FeatureFlags {
  /** Enable local AI engine for recommendations */
  enableLocalAI: boolean;
  /** Enable biometric authentication (WebAuthn) */
  enableBiometric: boolean;
  /** Enable data encryption at rest */
  enableEncryption: boolean;
  /** Enable workout tracking */
  enableWorkouts: boolean;
  /** Enable body composition tracking */
  enableBodyComposition: boolean;
  /** Enable shopping list generation */
  enableShoppingList: boolean;
  /** Enable offline-first caching */
  enableOfflineCache: boolean;
  /** Enable cross-tab sync via BroadcastChannel */
  enableCrossTabSync: boolean;
  /** Enable debug/diagnostics panel */
  enableDiagnostics: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  enableLocalAI: true,
  enableBiometric: false,
  enableEncryption: true,
  enableWorkouts: true,
  enableBodyComposition: true,
  enableShoppingList: true,
  enableOfflineCache: true,
  enableCrossTabSync: true,
  enableDiagnostics: ENV.isDev,
};

let _flags: FeatureFlags = { ...DEFAULT_FLAGS };

export function getFeatureFlags(): Readonly<FeatureFlags> {
  return _flags;
}

export function setFeatureFlags(overrides: Partial<FeatureFlags>): void {
  _flags = { ..._flags, ...overrides };
}

// ═══════════════════════════════════════════════════════════════
// App Configuration
// ═══════════════════════════════════════════════════════════════

export interface AppConfig {
  appName: string;
  appVersion: string;
  defaultLanguage: SupportedLanguage;
  /** IndexedDB database name */
  dbName: string;
  /** Number of days to retain daily history */
  historyRetentionDays: number;
  /** Auto-save interval for forms (ms) */
  autoSaveIntervalMs: number;
  /** Max image upload size in bytes (5MB) */
  maxImageSizeBytes: number;
  /** Supported PDF upload size in bytes (20MB) */
  maxPdfSizeBytes: number;
}

const APP_CONFIG: AppConfig = {
  appName: APP_NAME,
  appVersion: APP_VERSION,
  defaultLanguage: DEFAULT_LANGUAGE,
  dbName: 'NutriPlanDB',
  historyRetentionDays: 365,
  autoSaveIntervalMs: 5000,
  maxImageSizeBytes: 5 * 1024 * 1024,
  maxPdfSizeBytes: 20 * 1024 * 1024,
};

export function getAppConfig(): Readonly<AppConfig> {
  return APP_CONFIG;
}

// ═══════════════════════════════════════════════════════════════
// Logging
// ═══════════════════════════════════════════════════════════════

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

let currentLogLevel: LogLevel = ENV.isDev ? 'debug' : 'warn';

export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 99,
};

export const logger = {
  debug: (...args: any[]) => {
    if (LOG_PRIORITY[currentLogLevel] <= LOG_PRIORITY.debug) {
      console.debug(`[${APP_NAME}]`, ...args);
    }
  },
  info: (...args: any[]) => {
    if (LOG_PRIORITY[currentLogLevel] <= LOG_PRIORITY.info) {
      console.info(`[${APP_NAME}]`, ...args);
    }
  },
  warn: (...args: any[]) => {
    if (LOG_PRIORITY[currentLogLevel] <= LOG_PRIORITY.warn) {
      console.warn(`[${APP_NAME}]`, ...args);
    }
  },
  error: (...args: any[]) => {
    if (LOG_PRIORITY[currentLogLevel] <= LOG_PRIORITY.error) {
      console.error(`[${APP_NAME}]`, ...args);
    }
  },
};
