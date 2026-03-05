# PersonalFit

Offline-first fitness and nutrition app for Hungarian and Romanian markets.

## Stack

See [MISSION.md](./MISSION.md) for full stack (React 18, TypeScript, Vite, Tailwind v4, Radix UI, Framer Motion, IndexedDB via idb) and architecture rules. Development follows the 4-agent cycle; see MISSION.md (Workflow section) and [TASKS.md](./TASKS.md).

## Scripts

- **`npm run dev`** — Start the Vite dev server.
- **`npm run build`** — Production build.
- **`npm run typecheck`** — Run TypeScript type check (`tsc --noEmit`).

Before deploying or committing, run `npm run typecheck` and `npm run build` to verify the project.

## Project structure

- **`src/app/backend/`** — Data layer (db, models) and backend services (no UI).
- **`src/app/components/`** — React UI components and pages.
- **`api/`** — Vercel serverless routes (e.g. LLM proxy, parse endpoints).
- **`docs/`** — Architecture and audit docs (MISSION, DATA_LAYER, BACKEND_AUDIT). See [TASKS.md](./TASKS.md) for current work.

## Development

When running the app (e.g. `npm run dev` and opening the app in the browser), you can run the foods cleanup from the browser console:

```js
await window.cleanupCorruptedAIFoods()
```

This removes corrupted or composite food names from the Foods store and, when available, uses the LLM-assisted splitter to replace composite meals with base ingredients. See MISSION.md → "Data hygiene & cleanup". For IndexedDB store schemas see [docs/DATA_LAYER.md](docs/DATA_LAYER.md).
