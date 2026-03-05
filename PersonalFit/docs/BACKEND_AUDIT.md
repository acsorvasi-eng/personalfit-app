# Backend audit log

Audits related to MISSION.md rules (no UI in backend, IDatabase only, no localStorage/Firebase in backend). Backend data access uses the IDatabase adapter (`getDB()`) only; no service uses raw IndexedDB.

---

## TASK-001 — Backend must not import UI (2026-03-05)

**Scope:** All files under `src/app/backend/` (including `db.ts`, `index.ts`, `models.ts`, `seed.ts`, and everything under `services/`).

**Check:** No import from `src/app/components/`, `src/app/contexts/`, or any `.tsx` UI module.

**Result:** No violations found. All backend imports are from:
- `../db`, `./db`, `../models`, `./models`
- Other backend services (e.g. `./FoodCatalogService`, `./AIParserService`)
- Data modules under `src/app/data/` (e.g. `aiFoodKnowledge`, `mealData`)

**Conclusion:** Backend is clean; no UI imports. Task closed.

---

## TASK-003 — Backend must not use localStorage (2026-03-05)

**Scope:** All files under `src/app/backend/` (including `services/`).

**Check:** No direct `localStorage` or `sessionStorage` usage; config/legacy reads and writes must go through a dedicated adapter.

**Result:** All former `localStorage` usage in backend services was replaced with the legacy adapter at `src/storage/legacyLocalStorage.ts` (`legacyGetItem`, `legacySetItem`, `legacyRemoveItem`, `legacyListKeys`). Services touched:
- `CalorieEngineService.ts` — fallback consumed calories
- `WeightHistoryService.ts` — migration and cleanup
- `UserProfileService.ts` — profile migration and legacy sync
- `SecurityService.ts` — encryption salt, GDPR export snapshot
- `NutritionPlanService.ts` — forceNoActivePlan flag
- `ResetService.ts` — full reset and selective clear

**Conclusion:** Backend no longer calls `localStorage` directly; all access is via the adapter. Task closed.

---

## TASK-019 — TypeScript typecheck clean (2026-03-05)

**Scope:** Whole codebase.

**Check:** `npm run typecheck` (`tsc --noEmit`) must pass with no errors.

**Result:** All type errors were fixed (VersionControlService, BodyVision components, dsm/atoms, QuickLogSheet, UnifiedMenu, react-dom types, biometric.ts, encryption.ts). `@types/react` and `@types/react-dom` added. Typecheck and build both pass.

**Conclusion:** Codebase is typecheck-clean. Run `npm run typecheck` before committing.
