/**
 * ====================================================================
 * useFavoriteFoods — Favorite Foods Persistence Hook (Firestore)
 * ====================================================================
 * Manages the user's favorite food IDs with Firestore as the
 * primary persistence layer and localStorage as offline cache.
 *
 * Firestore path: user_favorites/{deviceId}  →  { foodIds: string[] }
 * LocalStorage cache key: "sh-favorite-foods"
 *
 * Features:
 *   - Real-time sync via onSnapshot
 *   - Optimistic local state updates (instant UI)
 *   - Offline-first: localStorage provides instant initial render
 *   - Auth-aware: uses Firebase Auth UID when available, otherwise
 *     a stable anonymous device ID stored in localStorage
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

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const FIRESTORE_COLLECTION = 'user_favorites';
const LOCAL_CACHE_KEY = 'sh-favorite-foods';
const DEVICE_ID_KEY = 'sh-device-id';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Get or create a stable device ID for anonymous users */
function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Resolve the Firestore document ID: auth UID if signed in, else device ID */
function resolveDocId(uid: string | null): string {
  return uid || getDeviceId();
}

/** Load favorites from localStorage (offline cache / instant initial render) */
function loadFromCache(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed);
    return new Set();
  } catch {
    return new Set();
  }
}

/** Write favorites to localStorage cache */
function writeToCache(ids: Set<string>) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Storage full or unavailable
  }
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useFavoriteFoods() {
  // Instant initial render from localStorage cache
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => loadFromCache());
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const unsubSnapshotRef = useRef<Unsubscribe | null>(null);

  // ── Track auth state ──────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  // ── Real-time Firestore listener ──────────────────────────
  useEffect(() => {
    // Clean up previous listener
    unsubSnapshotRef.current?.();

    const docId = resolveDocId(uid);
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
        // If doc doesn't exist yet, keep current local state
      },
      (error) => {
        console.warn('[useFavoriteFoods] Firestore listener error, using cache:', error.message);
        // On error, fall back to cached data (already in state)
      }
    );

    unsubSnapshotRef.current = unsub;

    // On first mount with a new docId, ensure the Firestore doc exists
    // by merging the local cache into it (handles offline→online migration)
    (async () => {
      try {
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          const cached = loadFromCache();
          if (cached.size > 0) {
            await setDoc(docRef, { foodIds: Array.from(cached) });
          }
        }
      } catch {
        // Offline or permissions — will sync when snapshot reconnects
      }
    })();

    return () => unsub();
  }, [uid]);

  // ── isFavorite ────────────────────────────────────────────
  const isFavorite = useCallback(
    (id: string) => favoriteIds.has(id),
    [favoriteIds]
  );

  // ── toggleFavorite (optimistic + Firestore write) ─────────
  const toggleFavorite = useCallback(
    (id: string) => {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        // Optimistic cache update
        writeToCache(next);

        // Persist to Firestore (fire-and-forget)
        const docId = resolveDocId(uid);
        const docRef = doc(db, FIRESTORE_COLLECTION, docId);
        setDoc(docRef, { foodIds: Array.from(next) }).catch((err) => {
          console.warn('[useFavoriteFoods] Firestore write failed:', err.message);
        });

        return next;
      });
    },
    [uid]
  );

  const favoriteCount = favoriteIds.size;

  return { favoriteIds, isFavorite, toggleFavorite, favoriteCount };
}
