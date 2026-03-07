# MASTER PROMPT – PersonalFit AI Development System

**Use this document as the single source of truth when working on PersonalFit.**  
Read it at the start of every session. It defines identity, rules, workflow, and references.

---

## 1. Project identity

- **Name:** PersonalFit  
- **What it is:** Offline-first fitness and nutrition app for **Hungarian (HU)** and **Romanian (RO)** markets.  
- **Principle:** Single-user, no server required for core flows; all data on device. Optional Vercel serverless for LLM only. No multi-tenant, no server session, no GDPR data collection.

---

## 2. Stack (do not deviate)

- **React 18**, **TypeScript**, **Vite**
- **Tailwind v4**, **Radix UI**, **Framer Motion**
- **IndexedDB** via `idb` — primary persistence; see `src/app/backend/db.ts` and `docs/DATA_LAYER.md`
- **No** direct `localStorage` / `sessionStorage` for entity data in backend
- **No** Firebase Auth in backend; auth only at app shell (e.g. AuthContext) for UI gating

---

## 3. Non‑negotiable rules

1. **Services never import UI**  
   Nothing under `src/app/backend/` may import from `src/app/components/`, `src/app/contexts/`, or any React UI. UI imports only in components, pages, or hooks.

2. **IDatabase adapter only**  
   All structured app data goes through the IndexedDB layer (`getDB()` / `db.ts`). No raw IndexedDB or localStorage in backend services.

3. **No localStorage in backend**  
   Backend services must not read or write `localStorage`. Use the DB or a dedicated adapter (e.g. `legacyLocalStorage` where documented), not raw storage.

4. **No Firebase in backend**  
   Backend must not depend on Firebase or cloud auth. Local-first, single-user only.

5. **Foods table = base ingredients only**  
   The Foods store contains only single base ingredients (e.g. tojás, brokkoli). Composite meal names must be split before saving; combinations live in My Menu (meal_items). No composite names in `foods`.

---

## 4. Mandatory workflow (4-agent process)

**Every task MUST go through all four steps before being marked done.**

| Step | Who | Action |
|------|-----|--------|
| **1. ARCHITECT** | Architect | Read `TASKS.md`, pick next unchecked task, define 2–5 testable acceptance criteria. Hand off to Coder. |
| **2. CODER** | Coder | Implement only what satisfies the criteria. Follow MISSION.md and this master prompt. Run `npm run typecheck` (must pass). Hand off to Tester. |
| **3. TESTER** | Tester | Run `npm run build`, verify acceptance criteria (grep, scripts, manual). Report pass/fail per criterion. Hand off to Reviewer. |
| **4. REVIEWER + DEPLOY** | Reviewer | Audit code vs MISSION.md. If all pass: run `npm run typecheck && npm run build`, then from **inner PersonalFit app directory**: `git add -A && git commit -m "..." && git push` and `vercel --prod --force`. Mark task `[x]` in TASKS.md with a short "Done: ..." line. |

**Workflow rules:**

- NEVER commit if typecheck fails.  
- NEVER skip testing on localhost before deploy.  
- ALWAYS run `vercel --prod --force` after git push.  
- ALWAYS verify on **personalfit-app.vercel.app** after deploy.  
- Deploy path: from the **inner** `PersonalFit` directory (the one that contains `package.json`, `src/`, `AGENTS.md`).

---

## 5. Key file locations

- **Workflow & tasks:** `AGENTS.md`, `TASKS.md`  
- **Mission & rules:** `MISSION.md`  
- **Architecture & 5 rules:** `ARCHITECTURE.md`  
- **Data layer (stores, indexes):** `docs/DATA_LAYER.md`  
- **Backend audit / compliance:** `docs/BACKEND_AUDIT.md`  
- **Agent roles (detail):** `agents/architect.md`, `agents/coder.md`, `agents/tester.md`, `agents/reviewer.md`  
- **App entry & routes:** `src/main.tsx`, `src/app/routes.tsx`  
- **Backend:** `src/app/backend/` (db, services, models)  
- **UI:** `src/app/components/`, `src/app/contexts/`, `src/app/hooks/`  
- **Translations:** `src/app/translations/index.ts` (HU / EN / RO)

---

## 6. Pre-commit and pre-deploy checks

Before committing or deploying:

```bash
cd "<inner PersonalFit directory>"
npm run typecheck
npm run build
```

Both must pass. Then:

```bash
git add -A && git commit -m "<descriptive message>" && git push
vercel --prod --force
```

---

## 7. How to use this master prompt

- **At session start:** Read this file (and, if needed, MISSION.md + AGENTS.md).  
- **When implementing:** Enforce Section 3 (rules) and Section 4 (workflow).  
- **When in doubt:** Prefer MISSION.md and ARCHITECTURE.md for data/backend; prefer AGENTS.md and TASKS.md for process and task selection.

---

*PersonalFit AI Development System — single source of truth for AI-assisted development.*
