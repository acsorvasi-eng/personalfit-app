# Chef Agent — Design Spec

**Date:** 2026-03-22
**Status:** Approved (verbal, brainstorming session)
**Author:** Claude Sonnet 4.6

---

## Goal

Introduce a Chef agent that acts as a culinary quality gate and proactive menu curator. The Chef ensures that every meal on the user's plan is locally sourced, seasonally appropriate, culturally authentic, and genuinely varied — while strictly maintaining calorie and macro targets. The Chef has a warm, personal personality and knows the user by name.

---

## Problem Statement

The current meal plan generator (`api/generate-meal-plan.ts`) produces nutritionally correct plans but has no mechanism to:
- Verify that ingredients are actually available in local stores
- Rotate seasonal produce as the year progresses
- Detect and fix monotony in the running plan
- Surprise the user with culturally authentic new dishes
- Balance regional cuisine percentages based on the user's actual location

---

## Architecture

### Two-Phase Model

**Phase 1 — Generation Gate**
When a new 28-day plan is generated, the client calls both endpoints sequentially:
```
generate-meal-plan.ts → [28-day plan] → client calls api/chef-review.ts → [improved plan + change log] → saved to DB
```
`chef-review.ts` is called **client-side** (from the wizard components), not chained server-side inside `generate-meal-plan.ts`. This keeps the two concerns independent and allows the UI to show a progress indicator during the review step.

**Phase 2 — Continuous Curator**
On the running plan (daily check, client-side):
```
ChefService.ts (daily) → monotony/seasonality check
  → small swap: silent, logged to IndexedDB
  → new dish (online): api/chef-suggest.ts → ChefMessage.tsx (user approves/rejects)
  → new dish (offline): queued in IndexedDB, triggered on next app open with network
  → Monday: weekly summary via ChefMessage.tsx (offline: shown from local ChefLog)
```

### New Files

| File | Type | Responsibility |
|------|------|----------------|
| `api/chef-review.ts` | New | Post-generation quality gate. Receives plan + user profile + region + season. Returns improved plan + change log. |
| `api/chef-suggest.ts` | New | Lightweight ongoing suggestions. Called for new dish proposals and weekly summaries. |
| `src/app/backend/services/ChefService.ts` | New | Client-side daily runner. Monotony detection, silent swaps, triggers chef-suggest when online. Queues suggestions when offline. |
| `src/app/components/ChefMessage.tsx` | New | Chef communication UI. Card-style, warm tone, accept/reject buttons where applicable. |

### Modified Files

| File | Change |
|------|--------|
| `src/app/components/onboarding/ProfileSetupWizard.tsx` | After receiving meal plan from `generate-meal-plan.ts`, call `chef-review.ts` client-side, show progress indicator, save improved plan |
| `src/app/components/onboarding/ProfileSetupWizardLegacy.tsx` | Same |
| `src/app/features/nutrition/components/GenerateMealPlanSheet.tsx` | Same |
| `src/app/backend/DatabaseService.ts` | Add `chef_log` table (IndexedDB) for silent swaps, chef decisions, and queued offline suggestions |

---

## Shared Types

These types are used across both API endpoints and the client service:

```ts
// Matches the JSON structure returned by generate-meal-plan.ts
type MealPlanIngredient = {
  name: string;
  g: number;
};

type MealPlanMeal = {
  meal_type: string;          // 'breakfast' | 'lunch' | 'dinner' | 'snack' etc.
  name: string;               // e.g., "Csirkepaprikás galuskával"
  total_calories: number;
  ingredients: MealPlanIngredient[];
};

type MealPlanDay = {
  day: number;                // 1-28
  day_label: string;          // e.g., "Hétfő"
  is_training_day: boolean;
  meals: MealPlanMeal[];
};

type MealPlan = {
  days: MealPlanDay[];
};

// Macro breakdown (matches existing field names in codebase)
type Macros = {
  protein: number;            // grams
  carbs: number;              // grams
  fat: number;                // grams
};

// Matches the UserProfile type in api/generate-meal-plan.ts (not UserProfileEntity)
type ChefUserProfile = {
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

type ChefChange = {
  day: number;
  meal: string;               // meal_type
  original: string;           // original dish or ingredient name
  replacement: string;        // replacement dish or ingredient name
  reason: string;             // human-readable, in user's language
  silent: boolean;            // true = logged only, false = shown to user
};
```

---

## Chef Context (Per API Call)

### Location & Privacy

GPS coordinates are read on the client, used to derive a county-level region string (e.g., `"Maros megye, Erdély"`), and then **discarded**. The raw coordinates are never stored in IndexedDB, never sent to any API.

The derived region string (county level) **is sent to `api/chef-review.ts` and `api/chef-suggest.ts`**, which means it reaches Anthropic's Claude API as part of the system prompt. A county-level string (e.g., "Maros megye") is not personally identifying on its own — it describes an area of ~500,000 people. This is consistent with GDPR proportionality principles (data minimisation: only the coarseness needed for ingredient localisation). No finer granularity (city, street, coordinates) is ever transmitted.

- Date → current season → seasonal ingredient list (month-aware, see calendar below)

### Cultural Weighting

Derived from: GPS region + user's chosen app language:
- Marosvásárhely/Târgu Mureș: `{ hu: 50, ro: 50 }`
- Budapest: `{ hu: 85, ro: 10, en: 5 }`
- Cluj/Kolozsvár: `{ ro: 60, hu: 40 }`

This % controls recipe tradition mix in Chef suggestions.

### User Context (Existing Data)

- Allergies, dietary preferences, liked/disliked foods (from `ChefUserProfile`)
- Calorie target and macro split (never modified by Chef)
- Last 14 days of meal history (for monotony detection)

### Local Ingredient Knowledge Base (Static, LLM-implicit)

Chef uses Claude's built-in knowledge of Romanian/Hungarian/Transylvanian market availability. Not real-time. Chef never suggests ingredients requiring specialty import (no mango in winter, no truffle as a staple). This knowledge is validated at QA via manual spot-check (see Success Criteria).

### Chef Memory (IndexedDB, Local)

- `chef_log` table: every silent swap (date, original, replacement, reason)
- `chef_decisions` table: user accept/reject history per dish
- `chef_queue` table: pending suggestions queued while offline
- Used for: weekly summary, avoiding re-suggesting rejected dishes

---

## Behavior Rules

### What the Chef Changes Silently (No User Prompt)

All silent swaps must keep calorie delta within **±10 kcal per meal** (±30 kcal per day max). If a candidate swap exceeds this threshold it is promoted to "ask first".

- Same-category ingredient swap where seasonal alternative exists (strawberry → wild strawberry) — if calorie delta ≤ ±10 kcal
- Protein source variation in the same family (chicken breast → turkey breast) — if calorie delta ≤ ±10 kcal
- Side dish rotation when the same side has appeared 3+ times in the past 7 days — if calorie delta ≤ ±10 kcal

**Preparation method changes are excluded from silent swaps.** Changing cooking method (grilled → baked) affects fat content when oil is used and cannot be silently verified as calorie-neutral. The Chef does not change preparation methods — only ingredients and dish selections.

### What the Chef Always Asks First

- Introducing a dish the user has never had before
- Changing the primary dish (not just a component)
- Any swap that exceeds ±10 kcal per meal
- Any swap of a previously rejected dish type
- Seasonal menu refresh (e.g., spring/summer transition)

### Hard Rules (Never Violated)

- Calorie target and macro split are sacred — Chef never changes the numbers
- Chef never suggests ingredients not available in local stores
- Maximum 1 user-facing message per day
- Chef never removes a dish the user explicitly liked/rated positively without asking
- Chef never re-suggests a dish the user rejected in the past 14 days

### Offline Behaviour

- Silent swaps: always applied locally (no network needed)
- New dish proposals: queued in `chef_queue` (IndexedDB), shown on next app open with network
- Weekly summary: always shown from local `chef_log` (no network needed)

---

## Communication Style

**Personality:** Warm, direct, personal. Knows the user by name. Explains the *why* behind every suggestion. Talks like a trusted friend who happens to be a great cook — not like a system notification.

**Language:** Same as the user's chosen app language.

**Tone examples:**

> *"Attila, észrevettem hogy már 5 napja nem volt leves az étlapodon. Van itt egy tavaszi medvehagymás krémlevesem — most van a szezonja, minden piacon kapod, és az összes makród stimmel. Kipróbálod?"*

> *"Ezen a héten 3 kis cserét csináltam csendben: az epret szamócára váltottam (most ez van szezonban), a csirkemellhez kukoricát adtam burgonya helyett (olcsóbb és frissebb most), és szombaton egy új köret kerül terítékre. A kalóriák mind stimmelnek."*

> *"Megérkezett a tavasz — frissítsük egy kicsit a menüt? Van néhány szezonális fogásom amit szerintem imádni fogsz."*

---

## API Specifications

### `api/chef-review.ts`

**Input:**
```ts
{
  mealPlan: MealPlan;
  userProfile: ChefUserProfile;
  region: string;              // e.g., "Maros megye, Erdély" — county level only
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  month: number;               // 1-12, for intra-season precision
  cultureWeights: { [locale: string]: number }; // e.g., { hu: 50, ro: 50 }
  language: string;            // 'hu' | 'ro' | 'en'
  userName: string;
}
```

**Output:**
```ts
{
  mealPlan: MealPlan;
  changes: ChefChange[];
}
```

**Latency:** Expected 10–20 seconds (single Claude call reviewing a 28-day plan). The calling UI must show a progress indicator: *"A Chef átnézi az étlapodat..."*

### `api/chef-suggest.ts`

**Input:**
```ts
{
  type: 'new_dish' | 'weekly_summary' | 'season_refresh';
  context: {
    userName: string;
    recentMeals: string[];     // last 14 days, dish names only
    region: string;            // county level only
    season: string;
    month: number;
    cultureWeights: { [locale: string]: number };
    language: string;
    pendingChanges?: ChefChange[]; // for weekly_summary type
    rejectedDishes?: string[];    // never re-suggest these
  }
}
```

**Output:**
```ts
{
  message: string;             // Chef's personal message to the user
  proposal?: {
    day: number;
    meal: string;              // meal_type to replace
    replacement: string;       // new dish name
    calories: number;          // must match original ±10 kcal
    macros: Macros;
  };
  requiresApproval: boolean;
}
```

---

## ChefService.ts — Daily Logic

```
On app open (once per day):
  1. Check last 14 days for monotony (same dish 3+ times in 7 days → flag)
  2. Check current month vs. plan ingredients (out-of-season items → silent swap candidate if ≤ ±10 kcal)
  3. If Monday AND last summary > 6 days ago → show weekly summary from local chef_log (no API needed)
  4. Apply all silent swap candidates → log each to chef_log
  5. If new dish candidate AND no message sent today:
       - Online: call chef-suggest → show ChefMessage
       - Offline: add to chef_queue, show on next online open
  6. If chef_queue has pending items AND online → process one item → show ChefMessage
```

---

## ChefMessage.tsx — UI Component

- Card style, appears at top of Menu tab or as a notification card
- Chef avatar / icon (teal, chef hat motif)
- Personal message text (from API response)
- Optional: "Elfogadom" / "Nem most" buttons (when `requiresApproval: true`)
- Weekly summary: expandable list of silent changes from `chef_log`
- Dismissible — never blocks app usage

---

## Seasonal Ingredient Calendar

Month-aware (not just season) to avoid edge cases at season boundaries:

| Months | Season | Available locally (Transylvania/Hungary) |
|--------|--------|------------------------------------------|
| Mar–Apr | Spring early | medvehagyma, sóska, retek, zöldhagyma, rebarbara |
| May–Jun | Spring late | eper (May+), spárga, borsó, saláta |
| Jul–Aug | Summer | paradicsom, paprika, uborka, kukorica, cseresznye, meggy, barack, szilva, málna |
| Sep–Oct | Autumn early | tök, szőlő, gomba, körte, alma, cékla, szilva |
| Nov | Autumn late | kelkáposzta, cékla, gyökérzöldségek, dió, alma, körte |
| Dec–Feb | Winter | savanyúkáposzta, gyökérzöldségek (répa, pasztinák, fehérrépa), alma, körte, tárolt zöldségek |

---

## Success Criteria

1. Chef review UI shows progress indicator and completes within 20 seconds on average
2. **QA spot-check:** After generating 3 test plans in different months, manually verify no out-of-season ingredients appear (e.g., no eper in December, no savanyúkáposzta in July)
3. **QA spot-check:** After generating 3 test plans, manually verify no exotic/import-only ingredients appear that are unavailable in Romanian/Hungarian supermarkets
4. User receives max 1 Chef message per day (enforced by `chef_log` date check in `ChefService.ts`)
5. Silent swaps are logged to `chef_log` and visible in Monday weekly summary
6. Calorie totals per day are identical (±0 kcal) before and after Chef review — verified by automated test comparing input vs. output plan totals
7. Every Chef message includes: (a) user's first name, (b) a stated reason for the change or suggestion

---

## Out of Scope (Phase 2)

- Real-time supermarket inventory integration
- Chef learning from long-term taste preferences (beyond 14-day window)
- Multi-user household planning
- Recipe step-by-step instructions from the Chef
