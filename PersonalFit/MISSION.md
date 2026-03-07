# PersonalFit — Mission

**Offline-first fitness and nutrition app for Hungarian and Romanian markets.**

*Single reference for AI/dev sessions: **[MASTER_PROMPT.md](./MASTER_PROMPT.md)** — read it at session start.*

## Stack

- **React 18**, **TypeScript**, **Vite**
- **Tailwind v4**, **Radix UI**, **Framer Motion**
- **IndexedDB** via `idb` — primary persistence
- No server required for core flows; optional Vercel serverless for LLM proxy
- The app is single-user and offline-first: no multi-tenant or server session; optional serverless only for LLM.

## Rules

1. **Services never import UI** — Backend and service code under `src/app/backend/` must not import from `src/app/components/`, `src/app/contexts/`, or any React UI. UI imports only in components, pages, or hooks that orchestrate them.

2. **IDatabase adapter only** — All structured app data goes through the IndexedDB layer (`src/app/backend/db.ts`). No direct `localStorage` or `sessionStorage` for entity data in backend services.

3. **No localStorage in backend** — Backend services must not read or write `localStorage`. Config/preferences that need persistence use the DB or a dedicated adapter, not raw `localStorage`.

4. **No Firebase Auth in backend** — Backend services must not depend on Firebase or any cloud auth. Auth state may be consumed at the app shell (e.g. AuthContext) for gating UI only; services assume a local-first, single-user model.

5. **Foods table = base ingredients only** — The Foods store contains only single base ingredients (e.g. tojás, brokkoli, quinoa). Composite meal names must be split before saving; meal combinations exist only in My Menu (meal_items).

## Data layer (IndexedDB)

- All structured entity data goes through the **IndexedDB adapter** in `src/app/backend/db.ts` via the `getDB()` helper.
- Main stores:
  - `foods` — base ingredients only
  - `nutrition_plans`, `meal_days`, `meals`, `meal_items` — 4-week plan structure and My Menu
  - `shopping_list` — generated shopping items
  - `activity_logs`, `training_plans`, `training_plan_days`
  - `measurements`, `user_profile`, `daily_history`, `versions`
- Backend services use this adapter for all CRUD; no service writes directly to `indexedDB` or `localStorage`. Store schemas (key paths and indexes) are in [docs/DATA_LAYER.md](docs/DATA_LAYER.md).

### Data hygiene & cleanup

- The `FoodCatalogService.cleanupCorruptedAIFoods()` routine removes corrupted or composite food names and, when needed, uses the LLM-assisted splitter to replace composite meals with individual base-ingredient rows (e.g. \"Sült csirkemell quinoa\" → csirkemell, quinoa).
- New foods created from AI/upload go through the base-ingredient pipeline before being written to the `foods` store; composite names are rejected or split, never stored as-is.

## Markets

- **Hungarian (HU)** and **Romanian (RO)** as first-class locales.
- Copy and UX patterns should support both; parser and LLM prompts handle both languages where relevant.

## Workflow — 4-agent process

All work on this project follows the 4-agent process defined in `AGENTS.md`.

1. **Architect** — Chooses the next task from `TASKS.md` and defines acceptance criteria aligned with this mission.
2. **Coder** — Implements changes strictly following the stack and rules above.
3. **Tester** — Verifies behavior against the acceptance criteria on a local build.
4. **Reviewer + Deploy** — Audits changes against this mission and performs the deployment workflow in `AGENTS.md`.
