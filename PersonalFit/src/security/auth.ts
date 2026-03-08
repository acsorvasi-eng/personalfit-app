/**
 * ====================================================================
 * Security Auth — Offline authentication state management
 * ====================================================================
 * Manages local auth state independently of Firebase.
 * Provides offline-first auth checks, rate limiting, and lockout.
 *
 * NOTE: This does NOT replace Firebase Auth (app/services/authService.ts).
 * It provides an additional local security layer for offline scenarios.
 */

import { SECURITY, STORAGE_KEYS } from '../core/constants';
import { logger } from '../core/config';
import { getSetting, setSetting } from '../app/backend/services/SettingsService';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface LocalAuthState {
  isAuthenticated: boolean;
  userId: string | null;
  lastActivity: number;
  sessionExpiry: number;
  failedAttempts: number;
  lockoutUntil: number | null;
}

// ═══════════════════════════════════════════════════════════════
// State Management
// ═══════════════════════════════════════════════════════════════

const AUTH_STATE_KEY = '__local_auth_state';

const DEFAULT_AUTH_STATE: LocalAuthState = {
  isAuthenticated: false,
  userId: null,
  lastActivity: 0,
  sessionExpiry: 0,
  failedAttempts: 0,
  lockoutUntil: null,
};

async function getAuthState(): Promise<LocalAuthState> {
  try {
    const raw = await getSetting(AUTH_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupted state — reset
  }
  return { ...DEFAULT_AUTH_STATE };
}

async function saveAuthState(state: LocalAuthState): Promise<void> {
  try {
    await setSetting(AUTH_STATE_KEY, JSON.stringify(state));
  } catch {
    logger.error('[Security] Failed to save auth state');
  }
}

// ═══════════════════════════════════════════════════════════════
// Session Management
// ═══════════════════════════════════════════════════════════════

/**
 * Start a local session after successful authentication.
 */
export async function startSession(userId: string): Promise<void> {
  const now = Date.now();
  await saveAuthState({
    isAuthenticated: true,
    userId,
    lastActivity: now,
    sessionExpiry: now + SECURITY.SESSION_TIMEOUT_MS,
    failedAttempts: 0,
    lockoutUntil: null,
  });
  logger.info('[Security] Session started for', userId);
}

/**
 * Check if the current session is still valid.
 */
export async function isSessionValid(): Promise<boolean> {
  const state = await getAuthState();
  if (!state.isAuthenticated) return false;

  const now = Date.now();

  if (now > state.sessionExpiry) {
    logger.info('[Security] Session expired');
    await endSession();
    return false;
  }

  return true;
}

/**
 * Refresh the session activity timestamp.
 */
export async function refreshSession(): Promise<void> {
  const state = await getAuthState();
  if (state.isAuthenticated) {
    state.lastActivity = Date.now();
    state.sessionExpiry = Date.now() + SECURITY.SESSION_TIMEOUT_MS;
    await saveAuthState(state);
  }
}

/**
 * End the current session.
 */
export async function endSession(): Promise<void> {
  await saveAuthState({ ...DEFAULT_AUTH_STATE });
  logger.info('[Security] Session ended');
}

// ═══════════════════════════════════════════════════════════════
// Rate Limiting / Lockout
// ═══════════════════════════════════════════════════════════════

/**
 * Record a failed login attempt.
 * Returns true if the account is now locked out.
 */
export async function recordFailedAttempt(): Promise<boolean> {
  const state = await getAuthState();
  state.failedAttempts += 1;

  if (state.failedAttempts >= SECURITY.MAX_LOGIN_ATTEMPTS) {
    state.lockoutUntil = Date.now() + SECURITY.LOCKOUT_DURATION_MS;
    await saveAuthState(state);
    logger.warn(`[Security] Account locked after ${state.failedAttempts} failed attempts`);
    return true;
  }

  await saveAuthState(state);
  return false;
}

/**
 * Check if the account is currently locked out.
 */
export async function isLockedOut(): Promise<boolean> {
  const state = await getAuthState();
  if (!state.lockoutUntil) return false;

  if (Date.now() > state.lockoutUntil) {
    state.failedAttempts = 0;
    state.lockoutUntil = null;
    await saveAuthState(state);
    return false;
  }

  return true;
}

/**
 * Get remaining lockout time in milliseconds.
 */
export async function getRemainingLockoutMs(): Promise<number> {
  const state = await getAuthState();
  if (!state.lockoutUntil) return 0;
  return Math.max(0, state.lockoutUntil - Date.now());
}

/**
 * Reset failed attempts (call after successful login).
 */
export async function resetFailedAttempts(): Promise<void> {
  const state = await getAuthState();
  state.failedAttempts = 0;
  state.lockoutUntil = null;
  await saveAuthState(state);
}

// ═══════════════════════════════════════════════════════════════
// Inactivity Detection
// ═══════════════════════════════════════════════════════════════

/**
 * Get milliseconds since last user activity.
 */
export async function getInactivityMs(): Promise<number> {
  const state = await getAuthState();
  return Date.now() - state.lastActivity;
}

/**
 * Check if the user has been inactive for longer than the session timeout.
 */
export async function isInactive(): Promise<boolean> {
  return (await getInactivityMs()) > SECURITY.SESSION_TIMEOUT_MS;
}
