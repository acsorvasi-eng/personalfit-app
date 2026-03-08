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
- Primary pages (bottom nav: Menu, Foods, List, Sport, Profile): NO close button in header.
- ALL other pages: X close button, top RIGHT corner, inside PageHeader.
- Never use back arrows (←) anywhere in the app.
- Close always uses navigate(-1) with /menu fallback when history is empty (e.g. direct URL or deep link).

PageHeader X button (subpages only):
- Position: absolute, top: 48px, right: 1rem
- Circle: 2rem × 2rem, borderRadius: 50%
- Background: rgba(255,255,255,0.25)
- Backdrop-filter: blur(4px)
- Icon: <X size={18} color="white" /> (lucide-react)
- No border, cursor: pointer, zIndex: 10
