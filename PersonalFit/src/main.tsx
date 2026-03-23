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

function showDebugError(step: string, e: unknown) {
  const msg = e instanceof Error ? (e.stack || e.message) : String(e);
  try {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#1a0000;color:#ff9999;padding:24px;font-size:13px;font-family:monospace;white-space:pre-wrap;word-break:break-all;overflow:auto';
    div.textContent = 'STEP: ' + step + '\n\n' + msg;
    (document.body || document.documentElement).appendChild(div);
  } catch { /* ignore */ }
}

async function initApp() {
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({ style: Style.Light });
    } catch (e) { showDebugError('StatusBar.setStyle', e); return; }
    try {
      await StatusBar.setBackgroundColor({ color: "#0f766e" });
    } catch (e) { showDebugError('StatusBar.setBackgroundColor', e); return; }
    try {
      CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          CapacitorApp.exitApp();
        }
      });
    } catch (e) { showDebugError('CapacitorApp.addListener', e); return; }
  }
  try {
    const db = getDatabase();
    await seedSystemFoods(db);
  } catch (e) {
    console.warn('seedSystemFoods failed:', e);
  }
  try {
    createRoot(document.getElementById("root")!).render(<App />);
  } catch (e) { showDebugError('createRoot.render', e); return; }
}

initApp().catch((e) => showDebugError('initApp (async)', e));
  