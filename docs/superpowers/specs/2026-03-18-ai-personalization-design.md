# AI Personalization — Profile Context & Preference Memory

**Date:** 2026-03-18
**Status:** Approved
**Phase:** A (B = Feedback UI, planned separately)

---

## Overview

PersonalFit's meal plan generator currently sends a stateless prompt to Claude Haiku 4.5 — it knows nothing about the user. This spec adds profile context injection so Claude can generate truly personalized plans, and adds `likedFoods` / `dislikedFoods` fields to the profile as the data foundation for the upcoming feedback UI (Phase B).

---

## Goals

- Claude receives full user context when generating meal plans
- Allergies, dietary preferences, goals, macros, meal model, and food preferences are all respected
- Existing behaviour is unchanged when no profile is available (backward compat)
- Data structure is ready for Phase B (feedback UI auto-populates liked/disliked foods)

---

## Data Model

### `StoredUserProfile` — two new optional fields

```ts
likedFoods?: string[];    // e.g. ["csirke", "quinoa", "brokkoli"]
dislikedFoods?: string[]; // e.g. ["máj", "kelbimbó"]
```

- Both default to `[]` if absent
- Stored in IndexedDB via existing `saveUserProfile()` / `getUserProfile()` flow
- Phase B will write to these arrays via feedback UI; Phase A leaves them empty by default

---

## API: `/api/generate-meal-plan.ts`

### Extended request body

```ts
interface GenerateMealPlanInput {
  ingredients: string;
  dailyCalorieTarget: number;
  days: number;
  language: string;
  userProfile?: {           // optional — backward compat when absent
    allergies?: string;
    dietaryPreferences?: string;
    goal?: string;
    activityLevel?: string;
    age?: number;
    weight?: number;
    gender?: string;
    macroProteinPct?: number;
    macroCarbsPct?: number;
    macroFatPct?: number;
    mealCount?: number;
    mealModel?: string;
    likedFoods?: string[];
    dislikedFoods?: string[];
  };
}
```

### Prompt injection

When `userProfile` is present and has non-empty fields, a `USER CONTEXT` block is prepended to the prompt:

```
USER CONTEXT:
- Goal: fogyás | Activity: mérsékelt | Age: 34 | Weight: 78 kg | Gender: male
- Diet: magas fehérje, alacsony szénhidrát | Allergies: laktóz
- Meals per day: 5 (5meals model) | Macros: 35% protein / 35% carbs / 30% fat
- Liked foods: csirke, quinoa, brokkoli
- Disliked foods: máj, kelbimbó — AVOID these completely
```

- Only non-empty / non-zero fields are included (no noise from blank strings)
- If `userProfile` is absent or all fields are empty, the block is omitted entirely
- The rest of the prompt (JSON schema, cuisine context, strict output rules) is unchanged

---

## Client: `GenerateMealPlanSheet.tsx`

On "Generálás" button press, before the API call:

1. Call `getUserProfile()` (existing service, already imported in nearby components)
2. Build `userProfile` object from relevant profile fields
3. Include `userProfile` in the `fetch` body alongside existing params

No UI changes required for Phase A.

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/backend/services/UserProfileService.ts` | Add `likedFoods?: string[]` and `dislikedFoods?: string[]` to `StoredUserProfile` |
| `api/generate-meal-plan.ts` | Accept `userProfile` in request body; inject context block into prompt |
| `src/app/features/nutrition/components/GenerateMealPlanSheet.tsx` | Load profile before API call; pass `userProfile` param |

---

## Out of Scope (Phase B)

- Feedback UI buttons on meal cards ("Elkészítettem / Nem ízlett")
- Automatic writing to `likedFoods` / `dislikedFoods`
- Weight trend → adaptive calorie target

---

## Non-Goals

- Server-side profile storage (IndexedDB is client-only by design)
- Chat interface for nutrition advice
- LLM fine-tuning or embeddings
