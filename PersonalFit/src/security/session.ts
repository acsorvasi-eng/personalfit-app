/**
 * ====================================================================
 * Security Session — Cross-tab session management & inactivity guard
 * ====================================================================
 * Manages session tokens, cross-tab synchronization, and automatic
 * logout on inactivity. Uses BroadcastChannel for multi-tab coordination.
 *
 * Architecture:
 * - Session token stored in IndexedDB via SettingsService (shared across tabs)
 * - BroadcastChannel for real-time cross-tab events
 * - Inactivity timer with configurable timeout
 */

import { SECURITY, STORAGE_KEYS } from '../core/constants';
import { generateId } from '../core/utils';
import { logger } from '../core/config';
import { getSetting, setSetting, removeSetting } from '../app/backend/services/SettingsService';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface SessionInfo {
  token: string;
  userId: string;
  startedAt: number;
  lastActivity: number;
  expiresAt: number;
  tabId: string;
}

type SessionEvent =
  | { type: 'SESSION_STARTED'; session: SessionInfo }
  | { type: 'SESSION_REFRESHED'; lastActivity: number }
  | { type: 'SESSION_ENDED'; reason: 'logout' | 'timeout' | 'forced' }
  | { type: 'ACTIVITY_PING' };

// ═══════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════

let _channel: BroadcastChannel | null = null;
let _inactivityTimer: ReturnType<typeof setTimeout> | null = null;
let _onSessionEnd: (() => void) | null = null;
const _tabId = generateId().slice(0, 8);

function getChannel(): BroadcastChannel | null {
  if (_channel) return _channel;
  try {
    _channel = new BroadcastChannel('sixth-halt-session');
    return _channel;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Session Token Management
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new session after successful authentication.
 */
export async function createSession(userId: string): Promise<SessionInfo> {
  const now = Date.now();
  const session: SessionInfo = {
    token: generateId(),
    userId,
    startedAt: now,
    lastActivity: now,
    expiresAt: now + SECURITY.SESSION_TIMEOUT_MS,
    tabId: _tabId,
  };

  await setSetting(STORAGE_KEYS.SESSION_TOKEN, JSON.stringify(session));
  broadcast({ type: 'SESSION_STARTED', session });
  startInactivityTimer();

  logger.info('[Session] Created:', session.token.slice(0, 8));
  return session;
}

/**
 * Get the current session info, or null if no active session.
 */
export async function getCurrentSession(): Promise<SessionInfo | null> {
  try {
    const raw = await getSetting(STORAGE_KEYS.SESSION_TOKEN);
    if (!raw) return null;

    const session: SessionInfo = JSON.parse(raw);

    if (Date.now() > session.expiresAt) {
      await destroySession('timeout');
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Refresh session activity (call on user interaction).
 */
export async function touchSession(): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;

  session.lastActivity = Date.now();
  session.expiresAt = Date.now() + SECURITY.SESSION_TIMEOUT_MS;
  await setSetting(STORAGE_KEYS.SESSION_TOKEN, JSON.stringify(session));
  broadcast({ type: 'SESSION_REFRESHED', lastActivity: session.lastActivity });
  resetInactivityTimer();
}

/**
 * Destroy the current session.
 */
export async function destroySession(reason: 'logout' | 'timeout' | 'forced' = 'logout'): Promise<void> {
  await removeSetting(STORAGE_KEYS.SESSION_TOKEN);
  broadcast({ type: 'SESSION_ENDED', reason });
  stopInactivityTimer();

  if (_onSessionEnd) {
    _onSessionEnd();
  }

  logger.info(`[Session] Destroyed (${reason})`);
}

// ═══════════════════════════════════════════════════════════════
// Inactivity Timer
// ═══════════════════════════════════════════════════════════════

function startInactivityTimer(): void {
  stopInactivityTimer();
  _inactivityTimer = setTimeout(() => {
    logger.info('[Session] Inactivity timeout reached');
    destroySession('timeout').catch(() => {});
  }, SECURITY.SESSION_TIMEOUT_MS);
}

function resetInactivityTimer(): void {
  startInactivityTimer();
}

function stopInactivityTimer(): void {
  if (_inactivityTimer) {
    clearTimeout(_inactivityTimer);
    _inactivityTimer = null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Cross-Tab Communication
// ═══════════════════════════════════════════════════════════════

function broadcast(event: SessionEvent): void {
  try {
    getChannel()?.postMessage(event);
  } catch {
    // BroadcastChannel not supported
  }
}

/**
 * Listen for session events from other tabs.
 */
export function onSessionEvent(callback: (event: SessionEvent) => void): () => void {
  const channel = getChannel();
  if (!channel) return () => {};

  const handler = (e: MessageEvent<SessionEvent>) => callback(e.data);
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}

/**
 * Register a callback for when the session ends (any reason).
 */
export function onSessionEnd(callback: () => void): void {
  _onSessionEnd = callback;
}

// ═══════════════════════════════════════════════════════════════
// Activity Tracking (auto-touch on user events)
// ═══════════════════════════════════════════════════════════════

let _activityListenersAttached = false;

/**
 * Attach event listeners that automatically refresh the session on user activity.
 * Call once on app initialization.
 */
export function attachActivityListeners(): () => void {
  if (_activityListenersAttached) return () => {};
  _activityListenersAttached = true;

  const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
  let lastTouch = 0;

  const handler = () => {
    const now = Date.now();
    if (now - lastTouch > 30_000) {
      lastTouch = now;
      touchSession().catch(() => {});
    }
  };

  for (const event of events) {
    document.addEventListener(event, handler, { passive: true });
  }

  return () => {
    for (const event of events) {
      document.removeEventListener(event, handler);
    }
    _activityListenersAttached = false;
  };
}

// ═══════════════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════════════

export function cleanup(): void {
  stopInactivityTimer();
  _channel?.close();
  _channel = null;
  _onSessionEnd = null;
}
