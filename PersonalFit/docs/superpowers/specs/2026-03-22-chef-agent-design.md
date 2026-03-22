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
When a new 28-day plan is generated:
```
generate-meal-plan.ts → [28-day plan] → api/chef-review.ts → [improved plan + change log] → saved to DB
```

**Phase 2 — Continuous Curator**
On the running plan (daily check, client-side):
```
ChefService.ts (daily) → monotony/seasonality check
  → small swap: silent, logged to IndexedDB
  → new dish: api/chef-suggest.ts → ChefMessage.tsx (user approves/rejects)
  → Monday: weekly summary via ChefMessage.tsx
```

### New Files

| File | Type | Responsibility |
|------|------|----------------|
| `api/chef-review.ts` | New | Post-generation quality gate. Receives plan + user profile + region + season. Returns improved plan + change log. |
| `api/chef-suggest.ts` | New | Lightweight ongoing suggestions. Called for new dish proposals and weekly summaries. |
| `src/app/backend/services/ChefService.ts` | New | Client-side daily runner. Monotony detection, silent swaps, triggers chef-suggest when needed. |
| `src/app/components/ChefMessage.tsx` | New | Chef communication UI. Card-style, warm tone, accept/reject buttons where applicable. |

### Modified Files

| File | Change |
|------|--------|
| `src/app/components/onboarding/ProfileSetupWizard.tsx` | Trigger `chef-review.ts` after meal plan generation |
| `src/app/components/onboarding/ProfileSetupWizardLegacy.tsx` | Same |
| `src/app/features/nutrition/components/GenerateMealPlanSheet.tsx` | Same |
| `src/app/backend/DatabaseService.ts` | Add ChefLog table (IndexedDB) for storing silent swaps and chef decisions |

---

## Chef Context (Per API Call)

### Location (Local Processing Only — GDPR Compliant)
- GPS coordinates → derived region string (e.g., `"Maros megye, Erdély"`)
- Coordinates are **never stored, never logged, never sent beyond this derivation**
- Region derivation happens client-side before the API call
- Date → current season → seasonal ingredient list

### Cultural Weighting
- Derived from: GPS region + user's chosen app language
- Example — Marosvásárhely/Târgu Mureș: `{ hu: 50, ro: 50 }`
- Example — Budapest: `{ hu: 85, ro: 10, en: 5 }`
- Example — Cluj/Kolozsvár: `{ ro: 60, hu: 40 }`
- This % controls recipe tradition mix in the Chef's suggestions

### User Context (Existing Data)
- Allergies, dietary preferences, liked/disliked foods
- Calorie target and macro split (never modified by Chef)
- Last 14 days of meal history (for monotony detection)

### Local Ingredient Knowledge Base (Static)
- Not real-time store inventory — Chef has built-in knowledge of what is typically available in Transylvanian/Romanian/Hungarian supermarkets and markets
- Seasonal calendar: what grows and is sold when, per region
- Chef never suggests ingredients that require specialty import stores (no mango in winter, no truffle as a staple)

### Chef Memory (IndexedDB, Local)
- Log of every silent swap: date, original item, replacement, reason
- Log of every user decision: accepted/rejected proposals
- Used for: weekly summary generation, learning user preferences over time

---

## Behavior Rules

### What the Chef Changes Silently (No User Prompt)
- Same-category ingredient swap where seasonal alternative exists (strawberry → wild strawberry)
- Protein source variation within same calorie range (chicken breast → turkey breast)
- Side dish rotation when the same side has appeared 3+ times in the past 7 days
- Minor preparation method variation (grilled → baked) for variety

### What the Chef Always Asks First
- Introducing a dish the user has never had before
- Changing the primary dish (not just a component)
- Any swap that changes flavor profile significantly (e.g., light soup → hearty stew)
- Seasonal menu refresh (e.g., spring/summer transition)

### Hard Rules (Never Violated)
- Calorie target and macro split are sacred — Chef never changes the numbers
- Chef never suggests ingredients not available in local stores
- Maximum 1 user-facing message per day
- Chef never removes a dish the user explicitly liked/rated positively without asking

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
  mealPlan: MealPlan;          // generated 28-day plan
  userProfile: UserProfile;    // existing profile shape
  region: string;              // e.g., "Maros megye, Erdély"
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  cultureWeights: { [locale: string]: number }; // e.g., { hu: 50, ro: 50 }
  language: string;            // 'hu' | 'ro' | 'en'
  userName: string;
}
```

**Output:**
```ts
{
  mealPlan: MealPlan;          // improved plan (same structure)
  changes: ChefChange[];       // log of what was changed and why
}

type ChefChange = {
  day: number;
  meal: string;
  original: string;
  replacement: string;
  reason: string;              // human-readable, in user's language
  silent: boolean;             // true = logged only, false = shown to user
}
```

### `api/chef-suggest.ts`

**Input:**
```ts
{
  type: 'new_dish' | 'weekly_summary' | 'season_refresh';
  context: {
    userName: string;
    recentMeals: string[];     // last 14 days
    currentPlan: MealPlan;
    region: string;
    season: string;
    cultureWeights: { [locale: string]: number };
    language: string;
    pendingChanges?: ChefChange[]; // for weekly_summary
  }
}
```

**Output:**
```ts
{
  message: string;             // Chef's personal message to the user
  proposal?: {
    day: number;
    meal: string;
    replacement: string;
    calories: number;
    macros: Macros;
  };
  requiresApproval: boolean;
}
```

---

## ChefService.ts — Daily Logic

```
On app open (once per day):
  1. Check last 14 days for monotony (same dish 3+ times → flag)
  2. Check current season vs. plan ingredients (stale season items → silent swap candidate)
  3. If Monday AND last summary > 6 days ago → trigger weekly summary
  4. If silent swap candidates exist → apply, log to ChefLog
  5. If new dish candidate exists AND no message sent today → call chef-suggest → show ChefMessage
```

---

## ChefMessage.tsx — UI Component

- Card style, appears at top of Menu tab or as a notification card
- Chef avatar / icon (teal, chef hat motif)
- Personal message text
- Optional: "Elfogadom" (Accept) / "Nem most" (Not now) buttons
- Weekly summary: expandable list of silent changes
- Dismissible — never blocks app usage

---

## Seasonal Ingredient Calendar (Sample)

| Season | Available locally (Transylvania/Hungary) |
|--------|------------------------------------------|
| Spring | medvehagyma, zöldhagyma, sóska, retek, spárga, eper, rebarbara |
| Summer | paradicsom, paprika, uborka, kukorica, cseresznye, meggy, barack, szilva |
| Autumn | tök, cékla, kelkáposzta, alma, körte, szőlő, gomba, dió |
| Winter | savanyúkáposzta, gyökérzöldségek, alma, körte, tárolt zöldségek |

---

## Success Criteria

1. After meal plan generation, Chef review completes in < 3 seconds
2. Generated plan contains no out-of-season ingredients for current month
3. No ingredient appears that is unavailable in Romanian/Hungarian supermarkets
4. User receives max 1 Chef message per day
5. Silent swaps are logged and visible in weekly summary
6. Calorie and macro totals are identical before and after Chef review
7. Chef messages feel personal — use user's name, explain reasoning, feel warm not robotic

---

## Out of Scope (Phase 2)

- Real-time supermarket inventory integration
- Chef learning from long-term taste preferences (beyond 14-day window)
- Multi-user household planning
- Recipe step-by-step instructions from the Chef
