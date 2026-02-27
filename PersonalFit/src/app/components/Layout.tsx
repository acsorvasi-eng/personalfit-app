/**
 * Layout - Main app shell with bottom navigation and floating water tracker.
 * Uses DSM components: BottomNav, WaterTracker.
 * The WaterTracker and BottomNav are hidden when the AI assistant panel is open
 * via aiPanelStateChange custom event from FuturisticDashboard.
 */

import { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router";
import { AppInitializer } from "./AppInitializer";
import { useLanguage } from "../contexts/LanguageContext";
import { BottomNav, WaterTracker } from "./dsm";
import { AnimatePresence, motion } from "framer-motion";

const WATER_KEY = "waterTracking";
const MAX_WATER = 3000; // ml

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

export function Layout() {
  const { t } = useLanguage();
  const [waterIntake, setWaterIntake] = useState(0);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Load water data from localStorage
  useEffect(() => {
    const loadWater = () => {
      const today = getTodayStr();
      const raw = localStorage.getItem(WATER_KEY);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          setWaterIntake(data[today] || 0);
        } catch {
          setWaterIntake(0);
        }
      }
    };
    loadWater();
    // Listen for cross-component sync (UnifiedMenu also writes to this key)
    window.addEventListener("storage", loadWater);
    // Custom event for same-tab sync
    const handleCustomSync = () => loadWater();
    window.addEventListener("waterTrackerSync", handleCustomSync);
    return () => {
      window.removeEventListener("storage", loadWater);
      window.removeEventListener("waterTrackerSync", handleCustomSync);
    };
  }, []);

  // Listen for AI panel open/close events
  useEffect(() => {
    const handleAiPanel = (e: Event) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      setAiPanelOpen(detail.open);
    };
    window.addEventListener("aiPanelStateChange", handleAiPanel);
    return () => window.removeEventListener("aiPanelStateChange", handleAiPanel);
  }, []);

  const handleAddWater = useCallback((amount: number) => {
    const today = getTodayStr();
    const raw = localStorage.getItem(WATER_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const current = data[today] || 0;
    const newAmount = current < MAX_WATER ? Math.min(current + amount, MAX_WATER) : 0;
    data[today] = newAmount;
    localStorage.setItem(WATER_KEY, JSON.stringify(data));
    setWaterIntake(newAmount);
    if (navigator.vibrate) navigator.vibrate(10);
    // Notify other components in the same tab
    window.dispatchEvent(new Event("storage"));
  }, []);

  const handleResetWater = useCallback(() => {
    const today = getTodayStr();
    const raw = localStorage.getItem(WATER_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[today] = 0;
    localStorage.setItem(WATER_KEY, JSON.stringify(data));
    setWaterIntake(0);
    window.dispatchEvent(new Event("storage"));
  }, []);

  return (
    <AppInitializer>
      <div className="min-h-screen h-svh flex flex-col bg-gradient-to-b from-[var(--color-primary-50)] to-white dark:from-[#121212] dark:to-[#121212] overflow-hidden">
        {/* Main Content */}
        <main
          className="flex-1 overflow-hidden w-full pb-20 px-4 sm:px-6 md:px-8 lg:px-10 max-w-5xl mx-auto"
          role="main"
          aria-label={t('nav.menu')}
        >
          <Outlet />
        </main>

        {/* Floating Water Tracker — hidden when AI panel is open */}
        <AnimatePresence>
          {!aiPanelOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="fixed z-50 bottom-24 right-4 sm:right-6 md:right-8 lg:right-10"
            >
              <WaterTracker
                current={waterIntake}
                goal={MAX_WATER}
                onAdd={handleAddWater}
                onReset={handleResetWater}
                waterLabel={t('ui.water')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation — hidden when AI panel is open */}
        <AnimatePresence>
          {!aiPanelOpen && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ duration: 0.25 }}
            >
              <BottomNav t={t} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppInitializer>
  );
}