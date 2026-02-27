/**
 * useBackendInit — Initializes the IndexedDB backend on app startup.
 *
 * Responsibilities:
 *   1. Opens/creates the IndexedDB database
 *   2. Seeds predefined foods if not already present
 *   3. Reports initialization status for loading screens
 *
 * Must be called once at the app root level (e.g., in AppInitializer or RootLayout).
 */

import { useState, useEffect, useRef } from 'react';
import { getDB } from '../backend/db';
import { seedDatabase } from '../backend/seed';

export interface BackendInitState {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  foodCount: number;
}

export function useBackendInit(): BackendInitState {
  const [state, setState] = useState<BackendInitState>({
    isReady: false,
    isLoading: true,
    error: null,
    foodCount: 0,
  });

  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      try {
        // Step 1: Open/create database
        const db = await getDB();

        // Step 2: Check food count and seed if needed
        const foodCount = await db.count('foods');
        if (foodCount === 0) {
          await seedDatabase();
          const newCount = await db.count('foods');
          setState({ isReady: true, isLoading: false, error: null, foodCount: newCount });
        } else {
          setState({ isReady: true, isLoading: false, error: null, foodCount });
        }

        console.log(`[Backend] Initialized. Foods in DB: ${await db.count('foods')}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Backend initialization failed';
        console.error('[Backend] Init error:', message);
        setState({ isReady: false, isLoading: false, error: message, foodCount: 0 });
      }
    }

    init();
  }, []);

  return state;
}
