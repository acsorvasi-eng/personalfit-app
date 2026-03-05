# PersonalFit Mission

Goal: Build the best offline-first fitness and nutrition app for Hungarian and Romanian markets.

Architecture rules (NEVER break these):
- Services NEVER import UI components
- Services use IDatabase adapter only — never dirccess
- Models are pure TypeScript interfaces
- UI accesses data ONLY through hooks
- localStorage is FORBIDDEN — use DB adapter
- No Firebase Auth

Stack: React 18, TypeScript, Vite, Tailwind v4, Radix UI, IndexedDB (idb), Framer Motion

Always maintain: offline-first, privacy-focused, no server costs.
