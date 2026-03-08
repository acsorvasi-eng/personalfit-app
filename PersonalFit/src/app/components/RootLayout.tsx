/**
 * RootLayout - Root wrapper for all routes.
 * Providers (Theme, Language, Auth) live here so every route component
 * rendered by React Router has access to them.
 */

import { Outlet } from "react-router";
import { ThemeProvider } from "../contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "../contexts/LanguageContext";
import { AuthProvider } from "../contexts/AuthContext";
import { useDailyReset } from "../hooks/useDailyReset";
import { useBackendInit } from "../hooks/useBackendInit";
import { PipelineDiagnostics } from "./PipelineDiagnostics";
import { ToastContainer } from "../shared/components/Toast";
// TEMP DEBUG - remove after testing
import { useEffect } from "react";

function RootLayoutInner() {
  // Monitor midnight crossing, archive daily data & reset counters
  useDailyReset();

  useEffect(() => {
    console.log("[Toast] ToastContainer mounted, firing test toast in 3s");
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("showToast", {
          detail: {
            id: "test-123",
            message: "Toast működik! ✓",
            type: "success",
            duration: 3000,
          },
        })
      );
    }, 3000);
  }, []);

  // Initialize IndexedDB backend & seed default data
  const backend = useBackendInit();
  const { t } = useLanguage();

  // Log backend status (non-blocking — app renders immediately)
  if (backend.error) {
    console.warn('[RootLayout] Backend init error:', backend.error);
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        margin: 0,
        padding: 0,
        overflowX: "hidden",
      }}
    >
      <PipelineDiagnostics />
      {/* Skip-to-content link for keyboard/screen reader accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-[var(--primary)] focus:text-white focus:px-4 focus:py-2.5 focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]"
        style={{ fontSize: '0.875rem', fontWeight: 600 }}
      >
        {t('ui.skipToContent')}
      </a>
      <div id="main-content">
        <Outlet />
      </div>
      <ToastContainer />
    </div>
  );
}

export function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
