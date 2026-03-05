
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { cleanupCorruptedAIFoods } from "./app/backend/services/FoodCatalogService";

// Expose one-off debug helper on window so it can be triggered from DevTools.
// Usage in browser console:  await window.cleanupCorruptedAIFoods()
// This keeps the cleanup logic in TypeScript and avoids wiring any UI.
(window as any).cleanupCorruptedAIFoods = cleanupCorruptedAIFoods;

createRoot(document.getElementById("root")!).render(<App />);
  