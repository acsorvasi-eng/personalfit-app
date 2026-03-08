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

Navigation rules:
- Main pages (bottom nav tabs: menu, foods, list, sport, profile): NO close button in header.
- Subpages / modal-like pages: ONLY X (close) button, top RIGHT corner.
- Never use back arrows (←) anywhere in the app.
- Close always uses navigate(-1) with /menu fallback when history is empty (e.g. direct URL or deep link).
