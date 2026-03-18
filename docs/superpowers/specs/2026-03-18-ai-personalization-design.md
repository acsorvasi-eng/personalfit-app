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

**Defaulting — must happen in two places:**

1. `getDefaultProfile()` — add `likedFoods: []` and `dislikedFoods: []` to the returned object.
2. `getUserProfile()` — the current code returns the raw stored object directly if it exists (`if (existing) return existing`). Existing IndexedDB records will not have these fields. Apply nullish coalescing on the return path:

```ts
if (existing) return {
  ...existing,
  likedFoods: existing.likedFoods ?? [],
  dislikedFoods: existing.dislikedFoods ?? [],
};
```

This ensures all consumers always receive `string[]`, never `undefined`, without a full migration.

---

## API: `/api/generate-meal-plan.ts`

### Extended request body

Add `userProfile` to the existing destructure:

```ts
const {
  ingredients,
  dailyCalorieTarget = 2000,
  days = 7,
  language = 'hu',
  userProfile,           // NEW — optional
}: {
  ingredients: IngredientInput[];
  dailyCalorieTarget?: number;
  days?: number;
  language?: string;
  userProfile?: {
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
    mealCount?: number;         // from profile.mealSettings?.mealCount
    mealModel?: string;         // from profile.mealSettings?.mealModel
    likedFoods?: string[];
    dislikedFoods?: string[];
  };
} = req.body || {};
```

**`dailyCalorieTarget` precedence:** the wizard computes this locally. `profile.calorieTarget` is not passed and is ignored.

### Meal model config — dynamic prompt sections

The current prompt hardcodes 3-meal behaviour in three places:
1. Per-meal calorie lines (lines 124–126)
2. Rule #2: `3 étkezés/nap: breakfast, lunch, dinner`
3. JSON schema example (line 136)

All three must be derived from `mealModel` / `mealCount`. Build a helper function `buildMealConfig`:

```ts
type MealConfig = {
  caloriesBlock: string;  // replaces lines 124-126
  mealCountRule: string;  // replaces rule #2
  schemaExample: string;  // replaces the hardcoded JSON template in line 136
};

function buildMealConfig(
  mealModel: string | undefined,
  mealCount: number | undefined,
  dailyCalorieTarget: number,
  dayLabel: string,
  breakfastTarget: number,
  lunchTarget: number,
  dinnerTarget: number,
): MealConfig {
  switch (mealModel) {
    case '5meals': {
      const t = Math.round(dailyCalorieTarget / 5);
      return {
        caloriesBlock: `- Reggeli/Breakfast: ${t} kcal\n- Tízórai/Snack: ${Math.round(dailyCalorieTarget * 0.1)} kcal\n- Ebéd/Lunch: ${Math.round(dailyCalorieTarget * 0.3)} kcal\n- Uzsonna/Snack: ${Math.round(dailyCalorieTarget * 0.1)} kcal\n- Vacsora/Dinner: ${Math.round(dailyCalorieTarget * 0.25)} kcal`,
        mealCountRule: '2. 5 étkezés/nap: breakfast, snack, lunch, snack, dinner',
        schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"breakfast","name":"Zabkása","total_calories":${Math.round(dailyCalorieTarget * 0.25)},"ingredients":[{"name":"zab","g":80}]},{"meal_type":"snack","name":"Alma","total_calories":${Math.round(dailyCalorieTarget * 0.1)},"ingredients":[{"name":"alma","g":120}]},{"meal_type":"lunch","name":"Csirkepaprikás","total_calories":${Math.round(dailyCalorieTarget * 0.3)},"ingredients":[{"name":"csirkemell","g":150}]},{"meal_type":"snack","name":"Joghurt","total_calories":${Math.round(dailyCalorieTarget * 0.1)},"ingredients":[{"name":"joghurt","g":150}]},{"meal_type":"dinner","name":"Spenótos tojás","total_calories":${Math.round(dailyCalorieTarget * 0.25)},"ingredients":[{"name":"tojás","g":120}]}]}]}`,
      };
    }
    case '2meals': {
      const b = Math.round(dailyCalorieTarget * 0.35);
      const d = dailyCalorieTarget - b;
      return {
        caloriesBlock: `- Reggeli/Breakfast: ${b} kcal\n- Vacsora/Dinner: ${d} kcal`,
        mealCountRule: '2. 2 étkezés/nap: breakfast, dinner',
        schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"breakfast","name":"Zabkása","total_calories":${b},"ingredients":[{"name":"zab","g":80}]},{"meal_type":"dinner","name":"Csirkepaprikás","total_calories":${d},"ingredients":[{"name":"csirkemell","g":150}]}]}]}`,
      };
    }
    case 'if16_8': {
      return {
        caloriesBlock: `- Étkezési ablak 12:00–20:00: ${dailyCalorieTarget} kcal`,
        mealCountRule: '2. 1 étkezési ablak/nap (16:8 szakaszos böjt) — meal_type: "eating_window"',
        schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"eating_window","name":"Napi étkezési ablak","total_calories":${dailyCalorieTarget},"ingredients":[{"name":"csirkemell","g":150},{"name":"zöldség","g":200}]}]}]}`,
      };
    }
    case 'if18_6': {
      return {
        caloriesBlock: `- Étkezési ablak 13:00–19:00: ${dailyCalorieTarget} kcal`,
        mealCountRule: '2. 1 étkezési ablak/nap (18:6 szakaszos böjt) — meal_type: "eating_window"',
        schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"eating_window","name":"Napi étkezési ablak","total_calories":${dailyCalorieTarget},"ingredients":[{"name":"csirkemell","g":150},{"name":"zöldség","g":200}]}]}]}`,
      };
    }
    default: // '3meals' or absent — keep existing behavior
      return {
        caloriesBlock: `- Reggeli/Breakfast: ${breakfastTarget} kcal\n- Ebéd/Lunch: ${lunchTarget} kcal\n- Vacsora/Dinner: ${dinnerTarget} kcal`,
        mealCountRule: '2. 3 étkezés/nap: breakfast, lunch, dinner',
        schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"breakfast","name":"Zabkása pirított dióval","total_calories":${breakfastTarget},"ingredients":[{"name":"zab","g":80},{"name":"dió","g":20}]},{"meal_type":"lunch","name":"Csirkepaprikás galuskával","total_calories":${lunchTarget},"ingredients":[{"name":"csirkemell","g":150}]},{"meal_type":"dinner","name":"Spenótos tükörtojás pirítóssal","total_calories":${dinnerTarget},"ingredients":[{"name":"tojás","g":120}]}]}]}`,
      };
  }
}
```

### USER CONTEXT block — placement and format

Insert at the very top of the prompt string, **before `${intro}`**. If no profile or all fields are empty/zero/blank, `userContextBlock` is `''`.

```ts
function buildUserContextBlock(p: typeof userProfile): string {
  if (!p) return '';
  const lines: string[] = [];

  const goalLine = [p.goal, p.activityLevel, p.age ? `${p.age} év` : '', p.weight ? `${p.weight} kg` : '', p.gender]
    .filter(Boolean).join(' | ');
  if (goalLine) lines.push(`- Goal: ${goalLine}`);

  const dietLine = [p.dietaryPreferences, p.allergies ? `Allergia: ${p.allergies}` : '']
    .filter(Boolean).join(' | ');
  if (dietLine) lines.push(`- Diet: ${dietLine}`);

  const mealLine = [
    p.mealCount ? `${p.mealCount} étkezés/nap` : '',
    p.mealModel ? `(${p.mealModel})` : '',
    (p.macroProteinPct && p.macroCarbsPct && p.macroFatPct)
      ? `Makró: ${p.macroProteinPct}% fehérje / ${p.macroCarbsPct}% szénhidrát / ${p.macroFatPct}% zsír`
      : '',
  ].filter(Boolean).join(' ');
  if (mealLine) lines.push(`- Étkezés: ${mealLine}`);

  if (p.likedFoods?.length) lines.push(`- Kedvelt ételek: ${p.likedFoods.join(', ')}`);
  if (p.dislikedFoods?.length) lines.push(`- Kerülendő ételek: ${p.dislikedFoods.join(', ')} — EZEKET TELJESEN KERÜLD`);

  if (!lines.length) return '';
  return `FELHASZNÁLÓI KONTEXTUS:\n${lines.join('\n')}\n\n`;
}
```

Updated prompt template (only showing changed lines — rest of prompt unchanged):

```ts
const { caloriesBlock, mealCountRule, schemaExample } = buildMealConfig(
  userProfile?.mealModel,
  userProfile?.mealCount,
  dailyCalorieTarget,
  dayNames[0],
  breakfastTarget,
  lunchTarget,
  dinnerTarget,
);

const userContextBlock = buildUserContextBlock(userProfile);

const prompt = `${userContextBlock}${intro}

ALAPANYAGOK / INGREDIENTS: ${ingredientList}

NAPI KALÓRIA / DAILY CALORIES: ${dailyCalorieTarget} kcal
${caloriesBlock}
${style}

SZABÁLYOK / RULES:
1. CSAK a megadott alapanyagokat használd / Use ONLY the listed ingredients
${mealCountRule}
3. Ne ismételd egymás után ugyanazt az ételt
4. is_training_day: true/false minden naphoz

Válaszolj CSAK JSON-nel (no markdown, no text):
${schemaExample}

Generálj ${clampedDays} napot (day 1..${clampedDays}), minden naphoz más ételnevekkel, ${dayNames.slice(0, clampedDays).map((d, i) => `day ${i + 1}="${d}"`).join(', ')}.`;
```

---

## Client: `GenerateMealPlanSheet.tsx`

`getUserProfile()` is not currently called in this component. Add inside `handleGenerate` (both call sites go through this function — the welcome-step shortcut and the calc-step button both call `handleGenerate`, so one change covers both).

Wrap the profile call in the existing try/catch. On IDB failure, fall back to sending no `userProfile`:

```ts
async function handleGenerate() {
  // ... existing state resets ...

  let userProfile: Record<string, unknown> | undefined;
  try {
    const profile = await getUserProfile();
    userProfile = {
      allergies: profile.allergies || undefined,
      dietaryPreferences: profile.dietaryPreferences || undefined,
      goal: profile.goal || undefined,
      activityLevel: profile.activityLevel || undefined,
      age: profile.age || undefined,
      weight: profile.weight || undefined,
      gender: profile.gender || undefined,
      macroProteinPct: profile.macroProteinPct || undefined,
      macroCarbsPct: profile.macroCarbsPct || undefined,
      macroFatPct: profile.macroFatPct || undefined,
      mealCount: profile.mealSettings?.mealCount || undefined,
      mealModel: profile.mealSettings?.mealModel || undefined,
      likedFoods: profile.likedFoods?.length ? profile.likedFoods : undefined,
      dislikedFoods: profile.dislikedFoods?.length ? profile.dislikedFoods : undefined,
    };
  } catch {
    // IDB unavailable — generate without personalization
    userProfile = undefined;
  }

  const res = await fetch('/api/generate-meal-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredients: selectedIngredients,
      dailyCalorieTarget: dailyTarget,
      days: selectedDays,
      language: currentLanguage,
      userProfile,
    }),
  });
  // ... rest unchanged
}
```

Note: `undefined` values in the userProfile object are stripped by `JSON.stringify`, so the API only receives fields that have real values.

No UI changes required for Phase A.

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/backend/services/UserProfileService.ts` | Add `likedFoods?: string[]` and `dislikedFoods?: string[]` to `StoredUserProfile`; add in `getDefaultProfile()`; add nullish coalescing in `getUserProfile()` return path |
| `api/generate-meal-plan.ts` | Add `userProfile` to destructure; add `buildUserContextBlock()` and `buildMealConfig()` helpers; update prompt template |
| `src/app/features/nutrition/components/GenerateMealPlanSheet.tsx` | Add `getUserProfile()` call with try/catch inside `handleGenerate`; pass `userProfile` in fetch body |

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
