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

function getAuthState(): LocalAuthState {
  try {
    const raw = localStorage.getItem(AUTH_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupted state — reset
  }
  return {
    isAuthenticated: false,
    userId: null,
    lastActivity: 0,
    sessionExpiry: 0,
    failedAttempts: 0,
    lockoutUntil: null,
  };
}

function saveAuthState(state: LocalAuthState): void {
  try {
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
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
export function startSession(userId: string): void {
  const now = Date.now();
  saveAuthState({
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
export function isSessionValid(): boolean {
  const state = getAuthState();
  if (!state.isAuthenticated) return false;

  const now = Date.now();

  // Check session timeout
  if (now > state.sessionExpiry) {
    logger.info('[Security] Session expired');
    endSession();
    return false;
  }

  return true;
}

/**
 * Refresh the session activity timestamp.
 * Call this on user interactions to extend the session.
 */
export function refreshSession(): void {
  const state = getAuthState();
  if (state.isAuthenticated) {
    state.lastActivity = Date.now();
    state.sessionExpiry = Date.now() + SECURITY.SESSION_TIMEOUT_MS;
    saveAuthState(state);
  }
}

/**
 * End the current session.
 */
export function endSession(): void {
  saveAuthState({
    isAuthenticated: false,
    userId: null,
    lastActivity: 0,
    sessionExpiry: 0,
    failedAttempts: 0,
    lockoutUntil: null,
  });
  logger.info('[Security] Session ended');
}

// ═══════════════════════════════════════════════════════════════
// Rate Limiting / Lockout
// ═══════════════════════════════════════════════════════════════

/**
 * Record a failed login attempt.
 * Returns true if the account is now locked out.
 */
export function recordFailedAttempt(): boolean {
  const state = getAuthState();
  state.failedAttempts += 1;

  if (state.failedAttempts >= SECURITY.MAX_LOGIN_ATTEMPTS) {
    state.lockoutUntil = Date.now() + SECURITY.LOCKOUT_DURATION_MS;
    saveAuthState(state);
    logger.warn(`[Security] Account locked after ${state.failedAttempts} failed attempts`);
    return true;
  }

  saveAuthState(state);
  return false;
}

/**
 * Check if the account is currently locked out.
 */
export function isLockedOut(): boolean {
  const state = getAuthState();
  if (!state.lockoutUntil) return false;

  if (Date.now() > state.lockoutUntil) {
    // Lockout expired — reset
    state.failedAttempts = 0;
    state.lockoutUntil = null;
    saveAuthState(state);
    return false;
  }

  return true;
}

/**
 * Get remaining lockout time in milliseconds.
 */
export function getRemainingLockoutMs(): number {
  const state = getAuthState();
  if (!state.lockoutUntil) return 0;
  return Math.max(0, state.lockoutUntil - Date.now());
}

/**
 * Reset failed attempts (call after successful login).
 */
export function resetFailedAttempts(): void {
  const state = getAuthState();
  state.failedAttempts = 0;
  state.lockoutUntil = null;
  saveAuthState(state);
}

// ═══════════════════════════════════════════════════════════════
// Inactivity Detection
// ═══════════════════════════════════════════════════════════════

/**
 * Get milliseconds since last user activity.
 */
export function getInactivityMs(): number {
  const state = getAuthState();
  return Date.now() - state.lastActivity;
}

/**
 * Check if the user has been inactive for longer than the session timeout.
 */
export function isInactive(): boolean {
  return getInactivityMs() > SECURITY.SESSION_TIMEOUT_MS;
}
