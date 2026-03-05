/**
 * Legacy localStorage adapter
 * ===========================
 *
 * Backend services must not access `localStorage` directly.
 * This module provides small, defensive helpers for places where
 * we still need to read/write legacy browser state (for migration,
 * export, or hard reset flows).
 *
 * All functions are safe on the server (SSR) and in environments
 * where `window` / `localStorage` are not available.
 */

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    if (!('localStorage' in window)) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function legacyGetItem(key: string): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function legacySetItem(key: string, value: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // ignore quota / privacy errors
  }
}

export function legacyRemoveItem(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

export function legacyListKeys(): string[] {
  const storage = getStorage();
  if (!storage) return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) keys.push(key);
    }
  } catch {
    // ignore
  }
  return keys;
}

