// Clear all localStorage on startup — we use IndexedDB only (prevents quota exceeded crash)
try {
  localStorage.clear();
} catch {
  // ignore
}

import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { cleanupCorruptedAIFoods } from "./app/backend/services/FoodCatalogService";
import { seedSystemFoods } from "./app/backend/seedFoods";
import { getDatabase } from "./app/backend/DatabaseService";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapacitorApp } from "@capacitor/app";

// Expose one-off debug helper on window so it can be triggered from DevTools.
// Usage in browser console:  await window.cleanupCorruptedAIFoods()
// This keeps the cleanup logic in TypeScript and avoids wiring any UI.
(window as any).cleanupCorruptedAIFoods = cleanupCorruptedAIFoods;

// Initialize Capacitor plugins on native platforms
if (Capacitor.isNativePlatform()) {
  // Style.Light = white icons on dark/teal background
  StatusBar.setStyle({ style: Style.Light });
  StatusBar.setBackgroundColor({ color: "#0f766e" });
  CapacitorApp.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      CapacitorApp.exitApp();
    }
  });
}

async function initApp() {
  try {
    const db = getDatabase();
    await seedSystemFoods(db);
  } catch (e) {
    console.warn('seedSystemFoods failed:', e);
  }
  createRoot(document.getElementById("root")!).render(<App />);
}

initApp();
  