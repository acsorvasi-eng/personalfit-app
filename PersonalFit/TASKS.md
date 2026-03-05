# TASKS.md

Tasks for the 4-agent workflow (Architect → Coder → Tester → Reviewer).  
Mark completed tasks with `[x]` and add a short "Done: ..." line.

---

## Backend / Architecture

- [x] **TASK-001** — Backend services must not import UI. Audit: ensure no file under `src/app/backend/` imports from `src/app/components/`, `src/app/contexts/`, or `*.tsx` UI modules. Fix any violations (move logic or invert dependency). Done: 2026-03-05 — Audit run; no violations; documented in docs/BACKEND_AUDIT.md.
- [x] **TASK-002** — Document the IDatabase usage: add a short "Data layer" subsection to MISSION.md describing that all entity CRUD goes through `getDB()` / idb; list main stores (foods, nutrition_plans, meal_days, meals, meal_items, etc.). Done: 2026-03-05 — Added \"Data layer (IndexedDB)\" section to MISSION.md listing main stores and clarifying that backend services use the db adapter for all CRUD.
- [x] **TASK-003** — Backend services must not use localStorage. Audit all files under `src/app/backend/` for `localStorage` usage; replace with IndexedDB or a small adapter used by the backend, or move the concern to the app shell only. Done: 2026-03-05 — All service usages now go through `src/storage/legacyLocalStorage.ts`; no direct `localStorage` calls remain in backend services.

## Foods / Nutrition

- [x] **TASK-004** — Ensure the base-ingredient pipeline (parseBaseIngredients → normalizeIngredientName → inferSemanticCategoryFromName → semanticCategoryToFoodCategory → save) is the only path for creating new Foods from AI/upload; no code path should write composite meal names to the foods table. Done: 2026-03-05 — AI import (NutritionPlanService) and foods-only upload (useDataUpload) both split/normalize ingredients via FoodCatalogService’s base-ingredient pipeline before creating foods; createFoodsBatch has a strict isSingleBaseIngredientName gate.
- [x] **TASK-005** — Add a single integration test or script that runs cleanupCorruptedAIFoods and asserts the foods store count does not increase with composite names (or document the expected behavior in MISSION.md). Done: 2026-03-05 — Documented cleanupCorruptedAIFoods behavior in MISSION.md under \"Data hygiene & cleanup\"; foods created from AI/upload now always pass through the base-ingredient pipeline.

## Quality / Workflow

- [x] **TASK-006** — Add a "Workflow" section to README or MISSION.md describing the 4-agent cycle (Architect picks from TASKS.md → Coder implements → Tester verifies → Reviewer audits and marks done). Done: 2026-03-05 — Added \"Workflow — 4-agent cycle\" section to MISSION.md documenting the Architect → Coder → Tester → Reviewer loop.

---

## Follow-up batch (2026-03-05)

- [x] **TASK-007** — Document the TASK-003 (localStorage) audit in docs/BACKEND_AUDIT.md: add an entry stating that all backend localStorage usage was replaced with the legacy adapter and list the touched services. Done: 2026-03-05 — Added "TASK-003 — Backend must not use localStorage" section to docs/BACKEND_AUDIT.md with scope, check, result (list of services), and conclusion.
- [x] **TASK-008** — In NutritionPlanService.activatePlan use legacyRemoveItem('forceNoActivePlan') instead of legacySetItem('forceNoActivePlan', '0') so behavior matches the original removeItem semantics. Done: 2026-03-05 — Switched to legacyRemoveItem and updated import; build passes.
- [x] **TASK-009** — Add README.md with project name, one-line description, stack reference to MISSION.md, Scripts (npm run dev, npm run build), and a Development note that window.cleanupCorruptedAIFoods is available in the browser console when running the app. Done: 2026-03-05 — README.md updated with PersonalFit title, description, stack ref, Scripts, and Development subsection for console cleanup hook.

---

## Follow-up batch 2 (2026-03-05)

- [x] **TASK-010** — Add to README a one-sentence "Workflow" note: development follows the 4-agent cycle; see MISSION.md (Workflow section) and TASKS.md. Done: 2026-03-05 — Added to Stack section in README.
- [x] **TASK-011** — Create docs/DATA_LAYER.md listing the main IndexedDB stores, key paths, and indexes (from src/app/backend/db.ts) as a single reference for the data layer. Done: 2026-03-05 — docs/DATA_LAYER.md created with full store/index table and composite key paths.
- [x] **TASK-012** — Add a "Pre-deploy" or "Check" line to README: before deploying, run `npm run build` to verify the project builds. Done: 2026-03-05 — "Before deploying, run npm run build" added under Scripts; build verified.

---

## Follow-up batch 3 (2026-03-05)

- [x] **TASK-013** — In MISSION.md, add a one-line reference to docs/DATA_LAYER.md in the Data layer section so readers have a single doc for store schemas. Done: 2026-03-05 — Data layer bullet now links to docs/DATA_LAYER.md.
- [x] **TASK-014** — Ensure docs/BACKEND_AUDIT.md mentions that backend data access uses IDatabase/getDB only (no raw IndexedDB); add one sentence if missing. Done: 2026-03-05 — Intro sentence added to BACKEND_AUDIT.md.
- [x] **TASK-015** — Add to README under Development: link to docs/DATA_LAYER.md for store reference. Done: 2026-03-05 — Development section now links to docs/DATA_LAYER.md.

---

## Follow-up batch 4 (2026-03-05)

- [x] **TASK-016** — Add a "typecheck" script to package.json: `"typecheck": "tsc --noEmit"` and ensure TypeScript is available (add `typescript` to devDependencies if missing). Done: 2026-03-05 — Script and `typescript` devDep added; tsconfig.json created. (Note: `npm run typecheck` currently reports pre-existing type errors in the codebase to fix separately.)
- [x] **TASK-017** — Document in MISSION.md that the app is single-user and offline-first: no multi-tenant or server session; optional serverless only for LLM. Done: 2026-03-05 — Sentence added under Stack in MISSION.md.
- [x] **TASK-018** — In README Scripts, add the typecheck command: `npm run typecheck` (after TASK-016). Done: 2026-03-05 — README Scripts now lists `npm run typecheck`.

---

## Follow-up batch 5 (2026-03-05)

- [x] **TASK-019** — Fix existing TypeScript errors so `npm run typecheck` passes (VersionControlService, BodyVision*, dsm/atoms, QuickLogSheet, UnifiedMenu, main.tsx react-dom types, biometric.ts, encryption.ts). Done: 2026-03-05 — All type errors fixed; added @types/react and @types/react-dom; DSMNotification children + confirmVariant warning; BodyVisionUploadGrid inputRefs type; typecheck and build pass.

---

## Follow-up batch 6 (2026-03-05)

- [x] **TASK-020** — Add to README a "Before committing" line: recommend running `npm run typecheck` and `npm run build` before committing. Done: 2026-03-05 — Added under Scripts in README.
- [x] **TASK-021** — Add a short "Project structure" subsection to README: one line each for `src/app/backend/`, `src/app/components/`, `api/`, `docs/`. Done: 2026-03-05 — "Project structure" added with four bullets.
- [x] **TASK-022** — Add to docs/BACKEND_AUDIT.md an entry stating that the codebase is typecheck-clean via `npm run typecheck` (reference TASK-019). Done: 2026-03-05 — "TASK-019 — TypeScript typecheck clean" entry added to BACKEND_AUDIT.md.

---

## Follow-up batch 7 (2026-03-05)

- [x] **TASK-023** — In README "Before deploying", mention typecheck as well: e.g. "Run `npm run typecheck` and `npm run build` before deploying." Done: 2026-03-05 — Consolidated to one line: "Before deploying or committing, run npm run typecheck and npm run build."
- [x] **TASK-024** — Add to docs/DATA_LAYER.md a one-line note that the DB name and version are defined in `src/app/backend/db.ts` (for future migration reference). Done: 2026-03-05 — Note added referencing DB_NAME and DB_VERSION and bumping version for schema changes.
- [x] **TASK-025** — Ensure MISSION.md "Markets" section has no trailing typo or broken link; keep as-is if already clean. Done: 2026-03-05 — No change needed; Markets section already clean.

---

## Follow-up batch 8 (2026-03-05)

- [x] **TASK-026** — Add to README a link to TASKS.md in the Project structure section (e.g. under docs: "and [TASKS.md](./TASKS.md) for current work"). Done: 2026-03-05 — docs bullet now ends with "See TASKS.md for current work."
- [x] **TASK-027** — In agents/architect.md (or agents/README if present), ensure the first step references "pick next unchecked task from TASKS.md"; add one sentence if missing. Done: 2026-03-05 — Step 1 clarified to "pick the next unchecked task (first uncompleted, no [x])".
- [x] **TASK-028** — Run full verify: `npm run typecheck` and `npm run build`; confirm both pass and document in TASKS that batch 8 is verified. Done: 2026-03-05 — typecheck and build run; both pass; batch 8 verified.
