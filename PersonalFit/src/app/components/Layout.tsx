/**
 * Layout - Main app shell with bottom navigation.
 * Water tracker is shown ONLY on My Menu (UnifiedMenu), not here.
 * BottomNav is hidden when the AI assistant panel is open
 * via aiPanelStateChange custom event from FuturisticDashboard.
 */

import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { AppInitializer } from "./AppInitializer";
import { useLanguage } from "../contexts/LanguageContext";
import { BottomNav } from "./dsm";
import { AnimatePresence, motion } from "framer-motion";

export function Layout() {
  const { t } = useLanguage();
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Listen for AI panel open/close events
  useEffect(() => {
    const handleAiPanel = (e: Event) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      setAiPanelOpen(detail.open);
    };
    window.addEventListener("aiPanelStateChange", handleAiPanel);
    return () => window.removeEventListener("aiPanelStateChange", handleAiPanel);
  }, []);

  return (
    <AppInitializer>
      <div className="min-h-screen h-svh flex flex-col bg-gradient-to-b from-[var(--color-primary-50)] to-white dark:from-[#121212] dark:to-[#121212] overflow-hidden">
        {/* Main Content */}
        <main
          className="flex-1 overflow-hidden w-full pb-20 px-0 sm:px-4 md:px-6 lg:px-8"
          role="main"
          aria-label={t('nav.menu')}
        >
          <Outlet />
        </main>

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