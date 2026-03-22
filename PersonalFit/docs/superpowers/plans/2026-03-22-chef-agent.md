# Chef Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-phase Chef agent: a post-generation quality gate (`api/chef-review.ts`) that improves meal plans for seasonality and local availability, and a daily curator (`ChefService.ts`) that detects monotony and surfaces warm personal suggestions via `ChefMessage.tsx`.

**Architecture:** Phase 1 — after `generate-meal-plan` returns, the client calls `api/chef-review.ts` (Vercel serverless, Claude Sonnet) which de-duplicates unique meals, reviews them for out-of-season/exotic ingredients, and returns an improved plan with a change log. Phase 2 — `ChefService.runDaily()` runs once per day on app open: checks monotony, builds weekly summaries from local `chef_log`, calls `api/chef-suggest.ts` for new dish proposals, queues suggestions when offline. `ChefMessage.tsx` renders the result as a dismissible card at the top of the Menu tab.

**Tech Stack:** TypeScript, Anthropic SDK (claude-sonnet-4-6 for review, claude-haiku-4-5-20251001 for suggest), IndexedDB (chef_log / chef_decisions / chef_queue stores), Nominatim reverse geocoding, React, Vercel serverless functions.

---

## Spec Reference

`PersonalFit/docs/superpowers/specs/2026-03-22-chef-agent-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/chef-types.ts` | **create** | All shared Chef types — ChefChange, ChefUserProfile, ChefLogEntry, etc. |
| `src/app/backend/db.ts` | **modify** | DB_VERSION 5→6, add `chef_log`, `chef_decisions`, `chef_queue` stores |
| `src/app/backend/services/ChefContextService.ts` | **create** | GPS → county-level region string + culture weights; wraps Nominatim |
| `src/app/backend/services/ChefContextService.test.ts` | **create** | Unit tests for `regionToCultureWeights` (pure fn) |
| `api/chef-review.ts` | **create** | Post-generation quality gate: reviews unique meals for seasonality + locality |
| `api/chef-suggest.ts` | **create** | Lightweight ongoing suggestion: new dish / weekly summary / season refresh |
| `src/app/backend/services/ChefService.ts` | **create** | Daily runner, monotony detection, log/queue operations, offline handling |
| `src/app/backend/services/ChefService.test.ts` | **create** | Unit tests for pure functions: getCurrentSeason, detectMonotony, isSilentSwapEligible |
| `src/app/components/ChefMessage.tsx` | **create** | Dismissible card UI: warm message + optional Accept/Reject buttons |
| `src/app/features/nutrition/components/GenerateMealPlanSheet.tsx` | **modify** | Call chef-review after generate-meal-plan, show "A Chef átnézi..." indicator |
| `src/app/components/onboarding/ProfileSetupWizard.tsx` | **modify** | Same: call chef-review before saving the plan |
| `src/app/components/onboarding/ProfileSetupWizardLegacy.tsx` | **modify** | Same |
| `src/app/features/menu/components/UnifiedMenu.tsx` | **modify** | Import ChefMessage + ChefService; run daily on mount; render message card |

---

## Task 1: Shared Types (`src/lib/chef-types.ts`)

**Files:**
- Create: `PersonalFit/src/lib/chef-types.ts`

No tests needed — pure type declarations.

- [ ] **Step 1: Create the types file**

Create `PersonalFit/src/lib/chef-types.ts`:

```ts
// ─── Meal plan structure (matches generate-meal-plan.ts output) ───────────────

export type ChefMealIngredient = {
  name: string;
  quantity_grams: number;
  unit: string;
  estimated_calories_per_100g: number;
  estimated_protein_per_100g: number;
  estimated_carbs_per_100g: number;
  estimated_fat_per_100g: number;
};

export type ChefMeal = {
  meal_type: string;          // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string;               // e.g., "Csirkepaprikás galuskával"
  total_calories: number;
  ingredients: ChefMealIngredient[];
};

export type ChefDay = {
  day: number;                // 1-30
  week: number;
  day_label: string;
  is_training_day: boolean;
  meals: ChefMeal[];
};

export type ChefMealPlan = {
  days: ChefDay[];
  meal_model?: string;
};

// ─── Chef metadata ────────────────────────────────────────────────────────────

export type ChefUserProfile = {
  allergies?: string;
  dietaryPreferences?: string;
  goal?: string;
  activityLevel?: string;
  age?: number;
  weight?: number;
  gender?: string;
  mealModel?: string;
  likedFoods?: string[];
  dislikedFoods?: string[];
};

export type ChefChange = {
  day: number;
  meal: string;               // meal_type
  original: string;           // original dish name
  replacement: string;        // replacement dish name
  reason: string;             // human-readable, in user's language
  silent: boolean;
};

// ─── IndexedDB record shapes ──────────────────────────────────────────────────

export type ChefLogEntry = {
  id: string;
  date: string;               // YYYY-MM-DD
  day: number;
  meal: string;
  original: string;
  replacement: string;
  reason: string;
  silent: boolean;
};

export type ChefDecision = {
  id: string;
  dish_name: string;
  decision: 'accept' | 'reject';
  date: string;               // YYYY-MM-DD
};

export type ChefQueueEntry = {
  id: string;
  queued_at: string;          // ISO datetime
  type: 'new_dish' | 'weekly_summary' | 'season_refresh';
  context: Record<string, unknown>;
};

// ─── Chef pending message (runtime, not stored) ───────────────────────────────

export type ChefPendingMessage = {
  message: string;
  proposal?: {
    day: number;
    meal: string;
    replacement: string;
    calories: number;
    macros: { protein: number; carbs: number; fat: number };
  };
  requiresApproval: boolean;
  type: 'new_dish' | 'weekly_summary' | 'season_refresh';
};

// ─── Region context (passed to API calls) ────────────────────────────────────

export type CultureWeights = Record<string, number>; // { hu: 50, ro: 50 }

export type RegionContext = {
  region: string;             // e.g., "Maros megye, Erdély"
  cultureWeights: CultureWeights;
};
```

- [ ] **Step 2: Typecheck**

```bash
cd PersonalFit && npm run typecheck 2>&1 | grep "chef-types"
```

Expected: no errors related to `chef-types.ts`.

- [ ] **Step 3: Commit**

```bash
git add PersonalFit/src/lib/chef-types.ts
git commit -m "feat: add chef-types shared type definitions"
```

---

## Task 2: DB Schema Migration

**Files:**
- Modify: `PersonalFit/src/app/backend/db.ts`

**What to change:**
1. `DB_VERSION`: `5` → `6`
2. Add three entries to `STORE_SCHEMAS`

- [ ] **Step 1: Bump DB_VERSION**

In `PersonalFit/src/app/backend/db.ts`, change line:

```ts
// Before:
export const DB_VERSION = 5;

// After:
export const DB_VERSION = 6;
```

- [ ] **Step 2: Add the three new stores to STORE_SCHEMAS**

In `PersonalFit/src/app/backend/db.ts`, inside the `STORE_SCHEMAS` object (after the `settings` entry), add:

```ts
  /** Chef agent: silent swap and change audit log */
  chef_log: {
    keyPath: 'id',
    indexes: [
      { name: 'by-date', keyPath: 'date' },
    ],
  },
  /** Chef agent: user accept/reject decisions per dish (prevent re-suggesting) */
  chef_decisions: {
    keyPath: 'id',
    indexes: [
      { name: 'by-dish', keyPath: 'dish_name' },
      { name: 'by-date', keyPath: 'date' },
    ],
  },
  /** Chef agent: suggestions queued while offline, processed on next online open */
  chef_queue: {
    keyPath: 'id',
    indexes: [
      { name: 'by-queued-at', keyPath: 'queued_at' },
    ],
  },
```

> **Important:** The `StoreName` type is derived as `keyof typeof STORE_SCHEMAS` so these stores are automatically type-safe once added. The upgrade path in `openDatabase` already handles creating missing stores for `oldVersion >= 1` — no additional migration code needed.

- [ ] **Step 3: Verify StoreName inference**

```bash
cd PersonalFit && npm run typecheck 2>&1 | grep "db\.ts"
```

Expected: no errors. The three new store names (`chef_log`, `chef_decisions`, `chef_queue`) are now valid `StoreName` values.

- [ ] **Step 4: Commit**

```bash
git add PersonalFit/src/app/backend/db.ts
git commit -m "feat: bump DB to v6, add chef_log, chef_decisions, chef_queue stores"
```

---

## Task 3: ChefContextService (GPS → Region, with tests)

**Files:**
- Create: `PersonalFit/src/app/backend/services/ChefContextService.ts`
- Create: `PersonalFit/src/app/backend/services/ChefContextService.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `PersonalFit/src/app/backend/services/ChefContextService.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { regionToCultureWeights } from './ChefContextService';

describe('regionToCultureWeights', () => {
  it('returns 50/50 for Maros megye', () => {
    const w = regionToCultureWeights('Maros megye, Erdély', 'hu');
    expect(w.hu).toBe(50);
    expect(w.ro).toBe(50);
  });

  it('returns 60/40 ro/hu for Cluj', () => {
    const w = regionToCultureWeights('Cluj, Romania', 'ro');
    expect(w.ro).toBe(60);
    expect(w.hu).toBe(40);
  });

  it('returns 85/15 hu/ro for Harghita', () => {
    const w = regionToCultureWeights('Harghita, Romania', 'hu');
    expect(w.hu).toBe(85);
    expect(w.ro).toBe(15);
  });

  it('falls back to language-based weights for unknown region', () => {
    const w = regionToCultureWeights('Some Unknown Place', 'hu');
    expect(w.hu).toBeGreaterThan(w.ro ?? 0);
  });

  it('falls back to ro-dominant for unknown region with ro language', () => {
    const w = regionToCultureWeights('Some Unknown Place', 'ro');
    expect(w.ro).toBeGreaterThan(w.hu ?? 0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd PersonalFit && npm test -- src/app/backend/services/ChefContextService.test.ts
```

Expected: FAIL — "Cannot find module './ChefContextService'"

- [ ] **Step 3: Create the implementation**

Create `PersonalFit/src/app/backend/services/ChefContextService.ts`:

```ts
import type { RegionContext, CultureWeights } from '../../../lib/chef-types';

/** Map a region string + app language to cuisine culture weights.
 *  Exported for testing. Used by getRegionContext(). */
export function regionToCultureWeights(region: string, language: string): CultureWeights {
  const r = region.toLowerCase();

  if (r.includes('maros') || r.includes('târgu mureș') || r.includes('targu mures')) {
    return { hu: 50, ro: 50 };
  }
  if (r.includes('cluj') || r.includes('kolozsvár') || r.includes('kolozs')) {
    return { ro: 60, hu: 40 };
  }
  if (r.includes('harghita') || r.includes('hargita') || r.includes('covasna') || r.includes('kovászna')) {
    return { hu: 85, ro: 15 };
  }
  if (r.includes('brasov') || r.includes('brassó') || r.includes('sibiu') || r.includes('szeben')) {
    return { ro: 70, hu: 20, en: 10 };
  }
  if (r.includes('budapest') || r.includes('pest') || r.includes('buda')) {
    return { hu: 85, ro: 10, en: 5 };
  }
  if (r.includes('bucharest') || r.includes('bucurești') || r.includes('ilfov')) {
    return { ro: 90, en: 10 };
  }

  // Unknown region: fall back to language
  if (language === 'hu') return { hu: 85, ro: 10, en: 5 };
  if (language === 'ro') return { ro: 80, hu: 15, en: 5 };
  return { ro: 50, hu: 40, en: 10 };
}

/** Read the user's position via browser geolocation, reverse-geocode it with
 *  Nominatim to get a county-level string, then derive culture weights.
 *
 *  Privacy guarantee: raw GPS coordinates are never stored and never sent to
 *  our API. Only the county-level string (e.g. "Maros megye") is transmitted.
 *
 *  Returns null if geolocation is denied, unavailable, or Nominatim fails. */
export async function getRegionContext(language: string): Promise<RegionContext | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': language }, signal: AbortSignal.timeout(5000) }
          );
          if (!resp.ok) { resolve(null); return; }
          const data = await resp.json();
          const county =
            data.address?.county ||
            data.address?.state_district ||
            data.address?.state ||
            '';
          const isRomania = data.address?.country_code === 'ro';
          const region = [county, isRomania ? 'Erdély' : ''].filter(Boolean).join(', ');
          if (!region) { resolve(null); return; }
          const cultureWeights = regionToCultureWeights(region, language);
          resolve({ region, cultureWeights });
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 6000, maximumAge: 300_000 } // 5-min cache
    );
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd PersonalFit && npm test -- src/app/backend/services/ChefContextService.test.ts
```

Expected: PASS — 5 tests pass.

- [ ] **Step 5: Run all tests**

```bash
cd PersonalFit && npm test
```

Expected: all tests pass (no regressions).

- [ ] **Step 6: Commit**

```bash
git add PersonalFit/src/app/backend/services/ChefContextService.ts PersonalFit/src/app/backend/services/ChefContextService.test.ts
git commit -m "feat: add ChefContextService — GPS to region + culture weights"
```

---

## Task 4: `api/chef-review.ts`

**Files:**
- Create: `PersonalFit/api/chef-review.ts`

This is a Vercel serverless function. It follows the exact pattern of `api/generate-meal-plan.ts`. No unit tests (no other api/*.ts files have tests).

- [ ] **Step 1: Create the file**

Create `PersonalFit/api/chef-review.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

function resolveApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    return content.match(/^ANTHROPIC_API_KEY=["']?([^"'\r\n]+)["']?/m)?.[1];
  } catch { return undefined; }
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: resolveApiKey() });
  return _client;
}

function extractJSON(text: string): unknown {
  const s = text.trim()
    .replace(/^```json\s*/i, '').replace(/```\s*$/i, '')
    .replace(/^```\s*/i, '').trim();
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch {}
  let obj = m[0];
  for (let i = obj.length - 1; i > obj.length / 2; i--) {
    const sub = obj.slice(0, i);
    const opens  = (sub.match(/\[/g) || []).length - (sub.match(/\]/g) || []).length;
    const braces = (sub.match(/\{/g) || []).length - (sub.match(/\}/g) || []).length;
    if (opens >= 0 && braces >= 0) {
      try { return JSON.parse(sub + ']'.repeat(opens) + '}'.repeat(braces)); } catch {}
    }
  }
  return null;
}

// Month ranges for seasonal ingredient guidance (Transylvania/Hungary)
const SEASONAL: Record<string, { available: string[]; avoid: string[] }> = {
  spring: {
    available: ['medvehagyma', 'sóska', 'retek', 'zöldhagyma', 'rebarbara', 'eper', 'spárga', 'borsó', 'saláta'],
    avoid: ['savanyúkáposzta', 'görögdinnye', 'őszibarack'],
  },
  summer: {
    available: ['paradicsom', 'paprika', 'uborka', 'kukorica', 'cseresznye', 'meggy', 'barack', 'szilva', 'málna', 'eper'],
    avoid: ['savanyúkáposzta', 'kelkáposzta', 'pasztinák', 'rebarbara'],
  },
  autumn: {
    available: ['tök', 'szőlő', 'gomba', 'körte', 'alma', 'cékla', 'szilva', 'kelkáposzta'],
    avoid: ['eper', 'cseresznye', 'meggy', 'barack', 'spárga'],
  },
  winter: {
    available: ['savanyúkáposzta', 'répa', 'pasztinák', 'fehérrépa', 'alma', 'körte', 'cékla', 'gyökérzöldségek', 'dió'],
    avoid: ['eper', 'paradicsom', 'paprika', 'uborka', 'spárga', 'cseresznye', 'görögdinnye'],
  },
};

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      mealPlan,
      region = '',
      season = 'winter',
      month = 1,
      cultureWeights = {},
      language = 'hu',
      userName = '',
    } = req.body || {};

    if (!mealPlan?.days?.length) {
      return res.status(400).json({ error: 'mealPlan.days is required' });
    }

    // De-duplicate unique meals across the 30-day plan (avoid sending repetitive data to LLM)
    const uniqueMeals = new Map<string, { meal_type: string; name: string; total_calories: number }>();
    for (const day of mealPlan.days) {
      for (const meal of (day.meals ?? [])) {
        if (!uniqueMeals.has(meal.name)) {
          uniqueMeals.set(meal.name, {
            meal_type: meal.meal_type,
            name: meal.name,
            total_calories: meal.total_calories ?? 0,
          });
        }
      }
    }

    // Group unique meals by meal_type for the prompt
    const byType: Record<string, string[]> = {};
    for (const m of uniqueMeals.values()) {
      (byType[m.meal_type] ??= []).push(`${m.name}(${m.total_calories}kcal)`);
    }
    const mealSummary = Object.entries(byType)
      .map(([type, names]) => `${type}: ${names.join(' | ')}`)
      .join('\n');

    const cultureParts = Object.entries(cultureWeights)
      .map(([k, v]) => `${k}:${v}%`)
      .join(', ') || 'hu:60, ro:40';

    const seasonData = SEASONAL[season] ?? SEASONAL.winter;

    const prompt = `Te "A Séf" vagy — egy ${region || 'erdélyi'} konyhában jártas kulináris szakértő.
Konyhakultúra arány: ${cultureParts}
Felhasználó: ${userName || 'ismeretlen'}
Évszak: ${season}, hónap: ${month}. Régió: ${region || 'Erdély, Románia'}

SZEZONÁLIS ÚTMUTATÓ (${season}):
Most kapható helyi piacon: ${seasonData.available.join(', ')}
Kerülendő (nem szezonális): ${seasonData.avoid.join(', ')}
SOHA NEM KAPHATÓ helyi boltokban: mango, avokádó, papaya, maracuja, és más trópusi gyümölcs

EGYEDI ÉTELEK AZ ÉTLAPBÓL:
${mealSummary}

FELADAT: Azonosítsd azokat az ételeket amelyek:
1. Nem szezonális vagy helyi alapanyagot tartalmaznak (pl. eper januárban)
2. Nem kapható egzotikus alapanyagot használnak (pl. mangó)
3. Nem illenek a régió konyhakultúrájához

Minden problémás ételnél adj hiteles, szezonális, helyi pótlást amely KÖZEL AZONOS KALÓRIASZÁMOT tart.

Válaszolj KIZÁRÓLAG JSON-ben, semmi más szöveg:
{"changes":[{"original":"<eredeti_étel_neve>","replacement":"<javasolt_étel_neve>","reason":"<rövid indok ${language === 'ro' ? 'románul' : language === 'en' ? 'in English' : 'magyarul'}>"}]}
Ha nincs szükség változtatásra: {"changes":[]}`;

    console.log(`[chef-review] season=${season} month=${month} region="${region}" uniqueMeals=${uniqueMeals.size}`);

    const msg = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    const parsed = extractJSON(raw) as { changes?: Array<{ original: string; replacement: string; reason: string }> } | null;
    const llmChanges = parsed?.changes ?? [];
    console.log(`[chef-review] LLM suggested ${llmChanges.length} changes`);

    // Apply changes to the plan by renaming matching meals (preserves ingredients/calories)
    const improvedPlan = JSON.parse(JSON.stringify(mealPlan)) as typeof mealPlan;
    const appliedChanges: Array<{
      day: number; meal: string; original: string; replacement: string; reason: string; silent: boolean;
    }> = [];

    for (const change of llmChanges) {
      const seen = new Set<string>(); // track meal_type+day to avoid duplicate change log entries
      for (const day of improvedPlan.days) {
        for (const meal of (day.meals ?? [])) {
          if (meal.name === change.original) {
            meal.name = change.replacement;
            const key = `${day.day}|${meal.meal_type}`;
            if (!seen.has(key)) {
              seen.add(key);
              appliedChanges.push({
                day: day.day,
                meal: meal.meal_type,
                original: change.original,
                replacement: change.replacement,
                reason: change.reason,
                silent: true,
              });
            }
          }
        }
      }
    }

    console.log(`[chef-review] Applied ${appliedChanges.length} change entries`);
    return res.status(200).json({ mealPlan: improvedPlan, changes: appliedChanges });

  } catch (err: any) {
    console.error('[chef-review] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd PersonalFit && npm run typecheck 2>&1 | grep "chef-review"
```

Expected: no errors. If you see `Cannot find module '@anthropic-ai/sdk'`, run `npm install @anthropic-ai/sdk` first (should already be installed from `generate-meal-plan.ts`).

- [ ] **Step 3: Commit**

```bash
git add PersonalFit/api/chef-review.ts
git commit -m "feat: add api/chef-review.ts — post-generation quality gate"
```

---

## Task 5: `api/chef-suggest.ts`

**Files:**
- Create: `PersonalFit/api/chef-suggest.ts`

- [ ] **Step 1: Create the file**

Create `PersonalFit/api/chef-suggest.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

function resolveApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    return content.match(/^ANTHROPIC_API_KEY=["']?([^"'\r\n]+)["']?/m)?.[1];
  } catch { return undefined; }
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: resolveApiKey() });
  return _client;
}

function extractJSON(text: string): unknown {
  const s = text.trim()
    .replace(/^```json\s*/i, '').replace(/```\s*$/i, '')
    .replace(/^```\s*/i, '').trim();
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch {}
  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, context = {} } = req.body || {};
    const {
      userName = '',
      recentMeals = [],
      region = '',
      season = 'winter',
      month = 1,
      cultureWeights = {},
      language = 'hu',
      pendingChanges = [],
      rejectedDishes = [],
    } = context;

    if (!['new_dish', 'weekly_summary', 'season_refresh'].includes(type)) {
      return res.status(400).json({ error: 'type must be new_dish | weekly_summary | season_refresh' });
    }

    const cultureParts = Object.entries(cultureWeights).map(([k, v]) => `${k}:${v}%`).join(', ') || 'hu:60, ro:40';
    const langNote = language === 'ro' ? 'Válaszolj románul.' : language === 'en' ? 'Reply in English.' : 'Válaszolj magyarul.';
    const nameStart = userName ? `Kezdd a nevével: ${userName}.` : '';

    let prompt: string;
    let requiresApproval = false;

    if (type === 'weekly_summary') {
      const changeList = (pendingChanges as Array<{ original: string; replacement: string; reason: string }>)
        .map(c => `• ${c.original} → ${c.replacement}: ${c.reason}`)
        .join('\n') || '(Nem volt változtatás ezen a héten.)';

      prompt = `Te "A Séf" vagy. Küldj barátságos heti összefoglalót ${userName || 'a felhasználónak'} az ezen a héten tett csendes változtatásokról.
${nameStart} ${langNote} Max 2–3 mondat. Meleg, személyes, nem robotszerű.

Változtatások:
${changeList}

Válaszolj JSON-ben: {"message":"<szöveg>"}`;

    } else if (type === 'new_dish') {
      const recentStr = (recentMeals as string[]).slice(0, 14).join(', ') || '(nincs adat)';
      const avoidStr = (rejectedDishes as string[]).join(', ');

      prompt = `Te "A Séf" vagy — ${region || 'erdélyi'} konyha szakértője. Konyhakultúra: ${cultureParts}.
Évszak: ${season}, hónap: ${month}.
${userName} az utóbbi 2 hétben ezeket ette: ${recentStr}.
${avoidStr ? `Ezeket már visszautasította — NE ajánld: ${avoidStr}.` : ''}

Javasolj egy EGYEDI, helyi szezonális ételt ebéd vagy vacsora kategóriában amelyet eddig nem evett.
${nameStart} ${langNote} Max 2 mondat. Magyarázd el miért éppen ez az étel és miért most van szezonja.

Válaszolj JSON-ben:
{"message":"<személyes javaslat>","proposal":{"meal":"lunch","replacement":"<étel neve>","calories":550,"macros":{"protein":35,"carbs":60,"fat":18}}}`;
      requiresApproval = true;

    } else { // season_refresh
      prompt = `Te "A Séf" vagy. Üdvözöld ${userName || 'a felhasználót'} az új évszakban (${season}) és ajánlj egy ízletes menüváltást. ${nameStart} ${langNote} Max 2 mondat.
Válaszolj JSON-ben: {"message":"<üdvözlő szöveg + javaslat>"}`;
    }

    const msg = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    const parsed = extractJSON(raw) as Record<string, unknown> | null;

    return res.status(200).json({
      message: (parsed?.message as string) || raw.slice(0, 300),
      proposal: parsed?.proposal ?? undefined,
      requiresApproval,
    });

  } catch (err: any) {
    console.error('[chef-suggest] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd PersonalFit && npm run typecheck 2>&1 | grep "chef-suggest"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add PersonalFit/api/chef-suggest.ts
git commit -m "feat: add api/chef-suggest.ts — new_dish, weekly_summary, season_refresh"
```

---

## Task 6: `ChefService.ts` (with tests)

**Files:**
- Create: `PersonalFit/src/app/backend/services/ChefService.ts`
- Create: `PersonalFit/src/app/backend/services/ChefService.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `PersonalFit/src/app/backend/services/ChefService.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  getCurrentSeason,
  detectMonotony,
  buildMealFrequency,
  isSilentSwapEligible,
} from './ChefService';

describe('getCurrentSeason', () => {
  it('returns spring for months 3-6', () => {
    expect(getCurrentSeason(3)).toBe('spring');
    expect(getCurrentSeason(6)).toBe('spring');
  });

  it('returns summer for months 7-8', () => {
    expect(getCurrentSeason(7)).toBe('summer');
    expect(getCurrentSeason(8)).toBe('summer');
  });

  it('returns autumn for months 9-11', () => {
    expect(getCurrentSeason(9)).toBe('autumn');
    expect(getCurrentSeason(11)).toBe('autumn');
  });

  it('returns winter for months 12, 1, 2', () => {
    expect(getCurrentSeason(12)).toBe('winter');
    expect(getCurrentSeason(1)).toBe('winter');
    expect(getCurrentSeason(2)).toBe('winter');
  });
});

describe('buildMealFrequency', () => {
  it('counts occurrences of each meal name', () => {
    const freq = buildMealFrequency(['Csirkepaprikás', 'Csirkepaprikás', 'Gulyás']);
    expect(freq.get('Csirkepaprikás')).toBe(2);
    expect(freq.get('Gulyás')).toBe(1);
  });

  it('returns empty map for empty input', () => {
    expect(buildMealFrequency([]).size).toBe(0);
  });
});

describe('detectMonotony', () => {
  it('returns true when a meal appears 3+ times', () => {
    const meals = ['Csirkepaprikás', 'Csirkepaprikás', 'Csirkepaprikás', 'Gulyás'];
    expect(detectMonotony(meals)).toBe(true);
  });

  it('returns false when no meal appears 3+ times', () => {
    const meals = ['Csirkepaprikás', 'Gulyás', 'Rántott csirke', 'Pörkölt', 'Csirkepaprikás'];
    expect(detectMonotony(meals)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(detectMonotony([])).toBe(false);
  });
});

describe('isSilentSwapEligible', () => {
  it('returns true when calorie delta is exactly at threshold', () => {
    expect(isSilentSwapEligible(500, 510, 10)).toBe(true);
  });

  it('returns true when calorie delta is within threshold', () => {
    expect(isSilentSwapEligible(500, 505, 10)).toBe(true);
  });

  it('returns false when calorie delta exceeds threshold', () => {
    expect(isSilentSwapEligible(500, 515, 10)).toBe(false);
  });

  it('defaults to 10 kcal threshold', () => {
    expect(isSilentSwapEligible(500, 509)).toBe(true);
    expect(isSilentSwapEligible(500, 511)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd PersonalFit && npm test -- src/app/backend/services/ChefService.test.ts
```

Expected: FAIL — "Cannot find module './ChefService'"

- [ ] **Step 3: Create the implementation**

Create `PersonalFit/src/app/backend/services/ChefService.ts`:

```ts
import type {
  ChefLogEntry,
  ChefDecision,
  ChefQueueEntry,
  ChefPendingMessage,
} from '../../../lib/chef-types';
import { getDB, generateId, todayDate } from '../db';
import { getSetting, setSetting } from './SettingsService';
import { apiBase } from '../../../lib/api';

// ─── Pure helper functions (exported for testing) ─────────────────────────────

export function getCurrentSeason(month: number): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (month >= 3 && month <= 6) return 'spring';
  if (month >= 7 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function buildMealFrequency(mealNames: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const name of mealNames) freq.set(name, (freq.get(name) ?? 0) + 1);
  return freq;
}

/** Returns true if any meal name appears 3+ times in the list */
export function detectMonotony(mealNames: string[]): boolean {
  for (const count of buildMealFrequency(mealNames).values()) {
    if (count >= 3) return true;
  }
  return false;
}

/** Returns true if a swap qualifies as silent (calorie delta within threshold) */
export function isSilentSwapEligible(
  originalCalories: number,
  replacementCalories: number,
  thresholdKcal = 10
): boolean {
  return Math.abs(originalCalories - replacementCalories) <= thresholdKcal;
}

// ─── Tracking helpers ─────────────────────────────────────────────────────────

const LAST_MESSAGE_KEY = 'chef_last_message_date';
const LAST_RUN_KEY = 'chef_last_run_date';
const LAST_SUMMARY_KEY = 'chef_last_summary_date';

export async function hasMessagedToday(): Promise<boolean> {
  const d = await getSetting(LAST_MESSAGE_KEY).catch(() => null);
  return d === todayDate();
}

async function markMessagedToday(): Promise<void> {
  await setSetting(LAST_MESSAGE_KEY, todayDate());
}

// ─── IndexedDB operations ─────────────────────────────────────────────────────

export async function logChefChange(entry: Omit<ChefLogEntry, 'id'>): Promise<void> {
  const db = await getDB();
  await db.put('chef_log', { id: generateId(), ...entry });
}

export async function getRecentChefLog(days = 7): Promise<ChefLogEntry[]> {
  const db = await getDB();
  const all = await db.getAll<ChefLogEntry>('chef_log');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return all.filter(e => new Date(e.date) >= cutoff);
}

export async function recordChefDecision(dishName: string, decision: 'accept' | 'reject'): Promise<void> {
  const db = await getDB();
  await db.put('chef_decisions', {
    id: generateId(),
    dish_name: dishName,
    decision,
    date: todayDate(),
  } as ChefDecision);
}

export async function getRejectedDishes(withinDays = 14): Promise<string[]> {
  const db = await getDB();
  const all = await db.getAll<ChefDecision>('chef_decisions');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - withinDays);
  return all
    .filter(d => d.decision === 'reject' && new Date(d.date) >= cutoff)
    .map(d => d.dish_name);
}

async function enqueueChefSuggestion(entry: Omit<ChefQueueEntry, 'id'>): Promise<void> {
  const db = await getDB();
  await db.put('chef_queue', { id: generateId(), ...entry } as ChefQueueEntry);
}

async function dequeueNextChefSuggestion(): Promise<ChefQueueEntry | null> {
  const db = await getDB();
  const all = await db.getAll<ChefQueueEntry>('chef_queue');
  if (!all.length) return null;
  const [first] = all.sort((a, b) => a.queued_at.localeCompare(b.queued_at));
  await db.delete('chef_queue', first.id);
  return first;
}

// ─── Daily runner ─────────────────────────────────────────────────────────────

export interface RunDailyParams {
  recentMealNames: string[];   // last 14–21 meal names from active plan
  userName: string;
  language: string;
  region: string | null;
  cultureWeights: Record<string, number>;
}

/** Run once per day on app open. Returns a ChefPendingMessage if there is
 *  something to show the user, or null if nothing to show today. */
export async function runDaily(params: RunDailyParams): Promise<ChefPendingMessage | null> {
  // Only run once per day
  const lastRun = await getSetting(LAST_RUN_KEY).catch(() => null);
  if (lastRun === todayDate()) return null;
  await setSetting(LAST_RUN_KEY, todayDate());

  // Already messaged today (shouldn't happen on first run, but guard anyway)
  if (await hasMessagedToday()) return null;

  const today = new Date();
  const month = today.getMonth() + 1; // 1-12
  const season = getCurrentSeason(month);
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon

  const context = {
    userName: params.userName,
    recentMeals: params.recentMealNames.slice(0, 14),
    region: params.region ?? '',
    season,
    month,
    cultureWeights: params.cultureWeights,
    language: params.language,
  };

  // ── 1. Monday: weekly summary (no API call needed — built from local log) ──
  if (dayOfWeek === 1) {
    const lastSummary = await getSetting(LAST_SUMMARY_KEY).catch(() => null);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const summaryOverdue = !lastSummary || new Date(lastSummary) < cutoff;

    if (summaryOverdue) {
      await setSetting(LAST_SUMMARY_KEY, todayDate());
      const changes = await getRecentChefLog(7);
      if (changes.length > 0) {
        const list = changes.map(c => `${c.original} → ${c.replacement}`).join(', ');
        const msg = params.language === 'ro'
          ? `${params.userName}, săptămâna aceasta am făcut ${changes.length} mici modificări: ${list}. Toate caloriile sunt corecte.`
          : params.language === 'en'
          ? `${params.userName}, this week I made ${changes.length} small changes: ${list}. All calories are correct.`
          : `${params.userName}, ezen a héten ${changes.length} apró cserét csináltam csendben: ${list}. A kalóriák mind stimmelnek.`;
        await markMessagedToday();
        return { message: msg, requiresApproval: false, type: 'weekly_summary' };
      }
    }
  }

  // ── 2. Process queued suggestions (from previous offline opens) ────────────
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    const queued = await dequeueNextChefSuggestion();
    if (queued) {
      try {
        const resp = await fetch(`${apiBase}/api/chef-suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: queued.type, context: queued.context }),
        });
        if (resp.ok) {
          const data = await resp.json();
          await markMessagedToday();
          return {
            message: data.message,
            proposal: data.proposal,
            requiresApproval: data.requiresApproval ?? false,
            type: queued.type,
          };
        }
      } catch {
        // Re-queue on failure
        await enqueueChefSuggestion({ queued_at: queued.queued_at, type: queued.type, context: queued.context });
      }
    }
  }

  // ── 3. Monotony check: suggest new dish if 3+ repeated meals in last 7 days ─
  const hasMonotony = detectMonotony(params.recentMealNames.slice(0, 21));
  if (!hasMonotony) return null;

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    const rejected = await getRejectedDishes(14);
    try {
      const resp = await fetch(`${apiBase}/api/chef-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_dish',
          context: { ...context, rejectedDishes: rejected },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        await markMessagedToday();
        return {
          message: data.message,
          proposal: data.proposal,
          requiresApproval: data.requiresApproval ?? true,
          type: 'new_dish',
        };
      }
    } catch { /* fall through to queue */ }
  }

  // Offline: queue for next online open
  await enqueueChefSuggestion({
    queued_at: new Date().toISOString(),
    type: 'new_dish',
    context: { ...context, rejectedDishes: await getRejectedDishes(14).catch(() => []) },
  });

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd PersonalFit && npm test -- src/app/backend/services/ChefService.test.ts
```

Expected: PASS — all tests pass.

- [ ] **Step 5: Run all tests**

```bash
cd PersonalFit && npm test
```

Expected: all tests pass.

- [ ] **Step 6: Typecheck**

```bash
cd PersonalFit && npm run typecheck 2>&1 | grep "ChefService\|chef-types"
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add PersonalFit/src/app/backend/services/ChefService.ts PersonalFit/src/app/backend/services/ChefService.test.ts
git commit -m "feat: add ChefService — daily runner, monotony detection, log/queue"
```

---

## Task 7: `ChefMessage.tsx` UI Component

**Files:**
- Create: `PersonalFit/src/app/components/ChefMessage.tsx`

- [ ] **Step 1: Create the component**

Create `PersonalFit/src/app/components/ChefMessage.tsx`:

```tsx
import { ChefHat, X, Check } from 'lucide-react';
import type { ChefPendingMessage } from '../../lib/chef-types';

interface ChefMessageProps {
  pending: ChefPendingMessage;
  onAccept?: () => void;    // called when user clicks "Elfogadom"
  onReject?: () => void;    // called when user clicks "Nem most"
  onDismiss: () => void;    // always available — closes card
}

export function ChefMessage({ pending, onAccept, onReject, onDismiss }: ChefMessageProps) {
  return (
    <div
      role="region"
      aria-label="Chef üzenet"
      style={{
        background: 'linear-gradient(135deg, rgba(15,118,110,0.08) 0%, rgba(20,184,166,0.04) 100%)',
        border: '1px solid rgba(15,118,110,0.18)',
        borderRadius: '1rem',
        padding: '0.875rem 1rem',
        margin: '0.75rem 0.75rem 0',
        position: 'relative',
      }}
    >
      {/* Dismiss (×) — always visible */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Bezár"
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#9ca3af', padding: 4, lineHeight: 1,
        }}
      >
        <X size={14} />
      </button>

      {/* Header: avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div
          aria-hidden
          style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChefHat size={14} color="white" />
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#0f766e', letterSpacing: '0.01em' }}>
          A Séf
        </span>
      </div>

      {/* Chef's message text */}
      <p style={{
        margin: 0,
        fontSize: '0.875rem',
        lineHeight: 1.55,
        color: '#1f2937',
        paddingRight: '1.25rem', // don't overlap with dismiss button
      }}>
        {pending.message}
      </p>

      {/* Accept / Reject — only when proposal requires approval */}
      {pending.requiresApproval && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button
            type="button"
            onClick={onAccept}
            style={{
              flex: 1, padding: '0.45rem 0', borderRadius: '0.5rem',
              background: '#0f766e', color: 'white', border: 'none',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            <Check size={12} /> Elfogadom
          </button>
          <button
            type="button"
            onClick={onReject}
            style={{
              flex: 1, padding: '0.45rem 0', borderRadius: '0.5rem',
              background: 'rgba(15,118,110,0.08)', color: '#0f766e',
              border: '1px solid rgba(15,118,110,0.2)',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Nem most
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd PersonalFit && npm run typecheck 2>&1 | grep "ChefMessage"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add PersonalFit/src/app/components/ChefMessage.tsx
git commit -m "feat: add ChefMessage UI component — chef card with accept/reject"
```

---

## Task 8: Wire Chef-Review into the 3 Generation Entry Points

**Files:**
- Modify: `PersonalFit/src/app/features/nutrition/components/GenerateMealPlanSheet.tsx`
- Modify: `PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx`
- Modify: `PersonalFit/src/app/components/onboarding/ProfileSetupWizardLegacy.tsx`

The same pattern applies to all three:
1. After `generate-meal-plan` succeeds and returns `nutritionPlan`
2. Build context (region from `ChefContextService.getRegionContext`, season from current month)
3. Call `api/chef-review` with the plan
4. If successful: use improved plan + log silent changes to `chef_log`
5. If fails: silently fall back to original plan (never block the user flow)

A shared helper function reduces duplication.

- [ ] **Step 1: Create a shared chef-review helper**

Create `PersonalFit/src/app/components/onboarding/callChefReview.ts`:

```ts
/**
 * callChefReview — shared helper for all 3 meal plan generation entry points.
 *
 * Calls api/chef-review on the generated plan, logs silent changes to chef_log.
 * Returns the improved plan if the review succeeds, or the original plan if anything fails.
 * NEVER throws — designed to be a silent improvement layer.
 */
import { apiBase } from '../../../lib/api';
import { logChefChange } from '../../backend/services/ChefService';
import { getRegionContext } from '../../backend/services/ChefContextService';
import { getCurrentSeason } from '../../backend/services/ChefService';
import type { ChefChange } from '../../../lib/chef-types';

export interface CallChefReviewParams {
  nutritionPlan: Record<string, unknown>;
  language: string;
  userName: string;
  userProfile?: Record<string, unknown>;
  onProgress?: (phase: 'chef_review') => void;
  onDone?: () => void;
}

export async function callChefReview(params: CallChefReviewParams): Promise<Record<string, unknown>> {
  try {
    const { nutritionPlan, language, userName, userProfile, onProgress, onDone } = params;

    onProgress?.('chef_review');

    const now = new Date();
    const month = now.getMonth() + 1;
    const season = getCurrentSeason(month);

    // GPS → region (optional; null if denied — chef still runs without it)
    const regionCtx = await getRegionContext(language).catch(() => null);

    const resp = await fetch(`${apiBase}/api/chef-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mealPlan: nutritionPlan,
        userProfile: userProfile ?? {},
        region: regionCtx?.region ?? '',
        season,
        month,
        cultureWeights: regionCtx?.cultureWeights ?? {},
        language,
        userName,
      }),
    });

    onDone?.();

    if (!resp.ok) {
      console.warn('[callChefReview] API error', resp.status);
      return nutritionPlan;
    }

    const data = await resp.json();
    const improvedPlan = data.mealPlan ?? nutritionPlan;
    const changes: ChefChange[] = data.changes ?? [];

    // Log every silent change to chef_log so they appear in the Monday summary
    const today = new Date().toISOString().split('T')[0];
    for (const c of changes) {
      await logChefChange({
        date: today,
        day: c.day,
        meal: c.meal,
        original: c.original,
        replacement: c.replacement,
        reason: c.reason,
        silent: true,
      }).catch(() => {}); // don't block on IDB errors
    }

    console.log(`[callChefReview] Applied ${changes.length} improvements`);
    return improvedPlan;

  } catch (err) {
    console.warn('[callChefReview] Failed (non-fatal):', err);
    return params.nutritionPlan;
  }
}
```

> **Why a separate file:** All three generation components are large. Extracting the helper keeps each component change minimal (1-2 lines) and the logic testable in isolation.

- [ ] **Step 2: Wire into GenerateMealPlanSheet.tsx**

In `PersonalFit/src/app/features/nutrition/components/GenerateMealPlanSheet.tsx`:

**2a.** Add import near the top (with other imports):
```ts
import { callChefReview } from '../../components/onboarding/callChefReview';
```

**2b.** Add a state variable for the generating phase label (find where step state is defined, add next to it):
```ts
const [generatingPhase, setGeneratingPhase] = useState<'plan' | 'chef'>('plan');
```

**2c.** In `handleGenerate()`, after this block:
```ts
      const data = responseBody;
      setGeneratedPlan(data.nutritionPlan);
      setStats(data.stats);
```
Change it to:
```ts
      const data = responseBody;

      // ── Chef review (silent improvement layer) ──────────────────────────────
      const improvedPlan = await callChefReview({
        nutritionPlan: data.nutritionPlan,
        language,
        userName: user?.name ?? '',
        onProgress: () => setGeneratingPhase('chef'),
        onDone: () => setGeneratingPhase('plan'),
      });

      setGeneratedPlan(improvedPlan);
      setStats(data.stats);
```

**2d.** In the JSX, find the "generating" step render — it shows a loading spinner with text. Update the text to be dynamic:

Find the text that says something like `"Étlap generálása..."` or `t('generate.generating')` in the generating step UI and change it to reference `generatingPhase`:

```tsx
{/* Where the generating text appears — replace the static text: */}
{generatingPhase === 'chef' ? 'A Chef átnézi az étlapodat...' : (/* original text */)}
```

> **Note:** The exact line number for the generating step text will vary. Search for `step === "generating"` in the file to find the relevant JSX block.

- [ ] **Step 3: Wire into ProfileSetupWizard.tsx**

In `PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx`:

**3a.** Add import:
```ts
import { callChefReview } from './callChefReview';
```

**3b.** Find the block around line 849-854:
```ts
          if (data.nutritionPlan) {
            console.log('[ProfileSetup] Importing nutrition plan...');
            const { importFromAIParse, activatePlan } = await import('../../backend/services/NutritionPlanService');
            const label = `AI étrend — ${new Date().toLocaleDateString('hu-HU')}`;
            const plan = await importFromAIParse(data.nutritionPlan, label);
            await activatePlan(plan.id);
```

Change it to:
```ts
          if (data.nutritionPlan) {
            console.log('[ProfileSetup] Importing nutrition plan...');

            // Chef review — improves plan for seasonality/locality before saving
            const improvedPlan = await callChefReview({
              nutritionPlan: data.nutritionPlan,
              language,
              userName: profileData?.name ?? '',
            });

            const { importFromAIParse, activatePlan } = await import('../../backend/services/NutritionPlanService');
            const label = `AI étrend — ${new Date().toLocaleDateString('hu-HU')}`;
            const plan = await importFromAIParse(improvedPlan, label);
            await activatePlan(plan.id);
```

> `language` is already in scope in the wizard (it comes from the `useLanguage` hook or context). `profileData?.name` is the user's name from the wizard state — check the exact variable name in that file.

- [ ] **Step 4: Wire into ProfileSetupWizardLegacy.tsx**

In `PersonalFit/src/app/components/onboarding/ProfileSetupWizardLegacy.tsx`, apply the same pattern as Step 3. Find the `importFromAIParse` call and insert `callChefReview` before it.

- [ ] **Step 5: Verify no `/api/chef-review` bare paths**

```bash
cd PersonalFit && grep -rn '"\/api\/chef' src/ --include="*.ts" --include="*.tsx"
grep -rn "'\/api\/chef" src/ --include="*.ts" --include="*.tsx"
```

Expected: 0 results (all calls go through `callChefReview` which uses `apiBase`).

- [ ] **Step 6: Typecheck**

```bash
cd PersonalFit && npm run typecheck 2>&1 | grep -E "callChef|GenerateMealPlan|ProfileSetup"
```

Expected: no errors.

- [ ] **Step 7: Run all tests**

```bash
cd PersonalFit && npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add PersonalFit/src/app/components/onboarding/callChefReview.ts
git add PersonalFit/src/app/features/nutrition/components/GenerateMealPlanSheet.tsx
git add PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx
git add PersonalFit/src/app/components/onboarding/ProfileSetupWizardLegacy.tsx
git commit -m "feat: wire chef-review into all 3 meal plan generation entry points"
```

---

## Task 9: Wire ChefMessage + Daily Runner into UnifiedMenu

**Files:**
- Modify: `PersonalFit/src/app/features/menu/components/UnifiedMenu.tsx`

The Menu tab already has the active plan data loaded. We add:
1. A `useState` for the pending chef message
2. A `useEffect` that calls `ChefService.runDaily()` on mount (once per day)
3. `<ChefMessage>` rendered at the top of the menu content when there's a pending message
4. `recordChefDecision` called on Accept/Reject

- [ ] **Step 1: Add imports to UnifiedMenu.tsx**

At the top of `PersonalFit/src/app/features/menu/components/UnifiedMenu.tsx`, add:

```ts
import { useState, useEffect } from 'react'; // (already imported — add to existing import)
import { ChefMessage } from '../../../components/ChefMessage';
import {
  runDaily,
  recordChefDecision,
} from '../../../backend/services/ChefService';
import { getRegionContext } from '../../../backend/services/ChefContextService';
import { getCurrentSeason } from '../../../backend/services/ChefService';
import type { ChefPendingMessage } from '../../../../lib/chef-types';
```

> Check if `useState`/`useEffect` are already imported. If so, just add to the existing import.

- [ ] **Step 2: Add state for the pending message**

Inside the `UnifiedMenu` function component, near other `useState` declarations:

```ts
const [chefMessage, setChefMessage] = useState<ChefPendingMessage | null>(null);
```

- [ ] **Step 3: Add useEffect for daily run**

Inside the `UnifiedMenu` function component, add after the existing useEffects:

```ts
  // Run Chef daily check on mount (once per calendar day, guarded inside runDaily)
  useEffect(() => {
    const runChef = async () => {
      try {
        // Get recent meal names from the loaded menu data (use what's already in scope)
        // allDays is the loaded plan days array — collect meal names from it
        const recentMealNames: string[] = [];
        for (const day of (allDays ?? []).slice(0, 21)) {
          for (const meal of (day.meals ?? [])) {
            if (meal.name) recentMealNames.push(meal.name);
          }
        }

        const regionCtx = await getRegionContext(language).catch(() => null);
        const pending = await runDaily({
          recentMealNames,
          userName: userName ?? '',
          language: language ?? 'hu',
          region: regionCtx?.region ?? null,
          cultureWeights: regionCtx?.cultureWeights ?? {},
        });

        if (pending) setChefMessage(pending);
      } catch {
        // Chef errors are never user-visible
      }
    };

    runChef();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally no deps — run only on mount
```

> `allDays`, `language`, and `userName` are already available inside `UnifiedMenu`. Check the exact variable names in that file.

- [ ] **Step 4: Render ChefMessage at the top of the menu content**

In the JSX of `UnifiedMenu`, find the main content scroll area (the div containing the day cards). Add `<ChefMessage>` as the first child, conditionally:

```tsx
{/* Chef message — appears at top of menu, dismissible */}
{chefMessage && (
  <ChefMessage
    pending={chefMessage}
    onAccept={async () => {
      if (chefMessage.proposal) {
        await recordChefDecision(chefMessage.proposal.replacement, 'accept').catch(() => {});
      }
      setChefMessage(null);
    }}
    onReject={async () => {
      if (chefMessage.proposal) {
        await recordChefDecision(chefMessage.proposal.replacement, 'reject').catch(() => {});
      }
      setChefMessage(null);
    }}
    onDismiss={() => setChefMessage(null)}
  />
)}
```

- [ ] **Step 5: Typecheck**

```bash
cd PersonalFit && npm run typecheck 2>&1 | grep "UnifiedMenu\|ChefMessage\|ChefService"
```

Expected: no errors.

- [ ] **Step 6: Run all tests**

```bash
cd PersonalFit && npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add PersonalFit/src/app/features/menu/components/UnifiedMenu.tsx
git commit -m "feat: wire ChefMessage and ChefService daily runner into UnifiedMenu"
```

---

## Success Criteria Checklist

After all tasks complete, verify:

- [ ] `npm test` — all tests pass (including 5 ChefContextService + 9 ChefService tests)
- [ ] `npm run typecheck` — 0 errors in Chef-related files
- [ ] `api/chef-review.ts` exists and follows generate-meal-plan.ts pattern
- [ ] `api/chef-suggest.ts` exists and supports `new_dish`, `weekly_summary`, `season_refresh`
- [ ] `src/lib/chef-types.ts` — all types from spec are present
- [ ] `src/app/backend/db.ts` — DB_VERSION is 6, `chef_log`/`chef_decisions`/`chef_queue` in STORE_SCHEMAS
- [ ] `callChefReview.ts` — helper called in GenerateMealPlanSheet, ProfileSetupWizard, ProfileSetupWizardLegacy
- [ ] `ChefMessage.tsx` — renders with Accept/Reject when `requiresApproval: true`, dismiss always visible
- [ ] `UnifiedMenu.tsx` — imports ChefMessage, calls runDaily on mount
- [ ] **Manual QA:** Generate a test plan in winter → verify no summer ingredients (eper, cseresznye, paprika) survive in the final plan
- [ ] **Manual QA:** Generate a test plan in spring → verify no exotic ingredients (mango, avocado) are present
- [ ] **Manual QA:** Open the Menu tab → Chef message appears only once per day
- [ ] **Manual QA:** Chef message is dismissible without blocking the app
