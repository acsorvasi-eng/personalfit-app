/**
 * ====================================================================
 * useFavoriteFoods — Favorite Foods Persistence Hook (Firestore)
 * ====================================================================
 * Manages the user's favorite food IDs with Firestore as the
 * primary persistence layer and IndexedDB settings as offline cache.
 *
 * Firestore path: user_favorites/{deviceId}  →  { foodIds: string[] }
 * Settings cache key: "sh-favorite-foods"
 *
 * Features:
 *   - Real-time sync via onSnapshot
 *   - Optimistic local state updates (instant UI)
 *   - Offline-first: settings store provides initial render
 *   - Auth-aware: uses Firebase Auth UID when available, otherwise
 *     a stable anonymous device ID stored in settings
 *   - Haptic feedback pattern: [10, 20] on toggle
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { db, auth } from '../../firebase';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getSetting, setSetting } from '../backend/services/SettingsService';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const FIRESTORE_COLLECTION = 'user_favorites';
const LOCAL_CACHE_KEY = 'sh-favorite-foods';
const DEVICE_ID_KEY = 'sh-device-id';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

async function getDeviceId(): Promise<string> {
  let id = await getSetting(DEVICE_ID_KEY);
  if (!id) {
    id = `anon-${crypto.randomUUID()}`;
    await setSetting(DEVICE_ID_KEY, id);
  }
  return id;
}

async function loadFromCache(): Promise<Set<string>> {
  try {
    const raw = await getSetting(LOCAL_CACHE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed);
    return new Set();
  } catch {
    return new Set();
  }
}

function writeToCache(ids: Set<string>) {
  setSetting(LOCAL_CACHE_KEY, JSON.stringify(Array.from(ids))).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useFavoriteFoods() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const unsubSnapshotRef = useRef<Unsubscribe | null>(null);

  const docId = uid || deviceId || '';

  // Load cache and device ID on mount
  useEffect(() => {
    loadFromCache().then(setFavoriteIds);
    getDeviceId().then(setDeviceId);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore listener
  useEffect(() => {
    if (!docId) return;
    unsubSnapshotRef.current?.();

    const docRef = doc(db, FIRESTORE_COLLECTION, docId);

    const unsub = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const ids = Array.isArray(data?.foodIds) ? new Set<string>(data.foodIds) : new Set<string>();
          setFavoriteIds(ids);
          writeToCache(ids);
        }
      },
      (error) => {
        console.warn('[useFavoriteFoods] Firestore listener error, using cache:', error.message);
      }
    );

    unsubSnapshotRef.current = unsub;

    (async () => {
      try {
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          const cached = await loadFromCache();
          if (cached.size > 0) {
            await setDoc(docRef, { foodIds: Array.from(cached) });
          }
        }
      } catch {
        // Offline or permissions
      }
    })();

    return () => unsub();
  }, [docId]);

  // ── isFavorite ────────────────────────────────────────────
  const isFavorite = useCallback(
    (id: string) => favoriteIds.has(id),
    [favoriteIds]
  );

  // ── toggleFavorite (optimistic + Firestore write) ─────────
  const toggleFavorite = useCallback(
    (id: string) => {
      if (!docId) return;
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        writeToCache(next);
        const docRef = doc(db, FIRESTORE_COLLECTION, docId);
        setDoc(docRef, { foodIds: Array.from(next) }).catch((err) => {
          console.warn('[useFavoriteFoods] Firestore write failed:', err.message);
        });
        return next;
      });
    },
    [docId]
  );

  const favoriteCount = favoriteIds.size;

  return { favoriteIds, isFavorite, toggleFavorite, favoriteCount };
}
