# AI Personalization — Profile Context & Preference Memory Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inject full user profile context into the meal plan generation prompt so Claude produces personalized plans that respect allergies, dietary preferences, meal model, macros, and food preferences.

**Architecture:** Three targeted file changes — add two optional fields to `StoredUserProfile`, add two helper functions (`buildMealConfig`, `buildUserContextBlock`) to the API handler and update the prompt template, then load the profile inside `handleGenerate` and pass it to the API.

**Tech Stack:** React 18 + Vite + TypeScript, IndexedDB (idb), Anthropic Claude Haiku 4.5 via Vercel serverless function, no test framework (TypeScript type-checking + manual browser verification).

**Spec:** `docs/superpowers/specs/2026-03-18-ai-personalization-design.md`

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `PersonalFit/src/app/backend/services/UserProfileService.ts` | Modify | Add `likedFoods`/`dislikedFoods` to `StoredUserProfile`; update `getDefaultProfile()` and `getUserProfile()` |
| `PersonalFit/api/generate-meal-plan.ts` | Modify | Add `userProfile` to destructure; add `buildMealConfig` and `buildUserContextBlock` helpers; replace hardcoded prompt sections |
| `PersonalFit/src/app/features/nutrition/components/GenerateMealPlanSheet.tsx` | Modify | Load profile in `handleGenerate`; pass `userProfile` in fetch body |

---

## Task 1: Add `likedFoods` / `dislikedFoods` to UserProfileService

**Files:**
- Modify: `PersonalFit/src/app/backend/services/UserProfileService.ts`

- [ ] **Step 1: Add fields to `StoredUserProfile` interface**

  In `UserProfileService.ts`, find the `StoredUserProfile` interface (around line 27). Add after `sleepCycles?: number;`:

  ```ts
  /** Foods the user enjoys — used to bias meal plan generation */
  likedFoods?: string[];
  /** Foods the user dislikes or avoids — LLM is told to exclude them */
  dislikedFoods?: string[];
  ```

- [ ] **Step 2: Add defaults to `getDefaultProfile()`**

  Find `getDefaultProfile()` (around line 88). Add to the returned object:

  ```ts
  likedFoods: [],
  dislikedFoods: [],
  ```

- [ ] **Step 3: Add nullish coalescing in `getUserProfile()` return path**

  Find the `if (existing) return existing;` line in `getUserProfile()` (around line 110). Replace it:

  ```ts
  if (existing) return {
    ...existing,
    likedFoods: existing.likedFoods ?? [],
    dislikedFoods: existing.dislikedFoods ?? [],
  };
  ```

- [ ] **Step 4: Type-check**

  ```bash
  cd PersonalFit && npx tsc --noEmit
  ```

  Expected: no errors related to `likedFoods` / `dislikedFoods`.

- [ ] **Step 5: Commit**

  ```bash
  git add PersonalFit/src/app/backend/services/UserProfileService.ts
  git commit -m "feat: add likedFoods/dislikedFoods to StoredUserProfile"
  ```

---

## Task 2: Add user context injection to the meal plan API

**Files:**
- Modify: `PersonalFit/api/generate-meal-plan.ts`

- [ ] **Step 1: Add `userProfile` to the request destructure**

  Find the destructure block at line 85–95. Replace:

  ```ts
  const {
    ingredients,
    dailyCalorieTarget = 2000,
    days = 7,
    language = 'hu',
  }: {
    ingredients: IngredientInput[];
    dailyCalorieTarget?: number;
    days?: number;
    language?: string;
  } = req.body || {};
  ```

  With:

  ```ts
  type UserProfileContext = {
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

  const {
    ingredients,
    dailyCalorieTarget = 2000,
    days = 7,
    language = 'hu',
    userProfile,
  }: {
    ingredients: IngredientInput[];
    dailyCalorieTarget?: number;
    days?: number;
    language?: string;
    userProfile?: UserProfileContext;
  } = req.body || {};
  ```

- [ ] **Step 2: Add `buildMealConfig` helper**

  Add this function after the `getCuisineContext` function (before the `handler` export), replacing the existing type definition block or adding after it:

  ```ts
  type MealConfig = {
    caloriesBlock: string;
    mealCountRule: string;
    schemaExample: string;
  };

  function buildMealConfig(
    mealModel: string | undefined,
    dailyCalorieTarget: number,
    breakfastTarget: number,
    lunchTarget: number,
    dinnerTarget: number,
    dayLabel: string,
  ): MealConfig {
    switch (mealModel) {
      case '5meals': {
        const b = Math.round(dailyCalorieTarget * 0.25);
        const s1 = Math.round(dailyCalorieTarget * 0.1);
        const l = Math.round(dailyCalorieTarget * 0.3);
        const s2 = Math.round(dailyCalorieTarget * 0.1);
        const d = dailyCalorieTarget - b - s1 - l - s2;
        return {
          caloriesBlock: `- Reggeli/Breakfast: ${b} kcal\n- Tízórai/Snack: ${s1} kcal\n- Ebéd/Lunch: ${l} kcal\n- Uzsonna/Snack: ${s2} kcal\n- Vacsora/Dinner: ${d} kcal`,
          mealCountRule: '2. 5 étkezés/nap: breakfast, snack, lunch, snack, dinner',
          schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"breakfast","name":"Zabkása","total_calories":${b},"ingredients":[{"name":"zab","g":80}]},{"meal_type":"snack","name":"Alma","total_calories":${s1},"ingredients":[{"name":"alma","g":120}]},{"meal_type":"lunch","name":"Csirkepaprikás","total_calories":${l},"ingredients":[{"name":"csirkemell","g":150}]},{"meal_type":"snack","name":"Joghurt","total_calories":${s2},"ingredients":[{"name":"joghurt","g":150}]},{"meal_type":"dinner","name":"Spenótos tojás","total_calories":${d},"ingredients":[{"name":"tojás","g":120}]}]}]}`,
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
      case 'if16_8':
        return {
          caloriesBlock: `- Étkezési ablak 12:00–20:00: ${dailyCalorieTarget} kcal`,
          mealCountRule: '2. 1 étkezési ablak/nap (16:8 szakaszos böjt) — meal_type: "eating_window"',
          schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"eating_window","name":"Napi étkezési ablak","total_calories":${dailyCalorieTarget},"ingredients":[{"name":"csirkemell","g":150},{"name":"zöldség","g":200}]}]}]}`,
        };
      case 'if18_6':
        return {
          caloriesBlock: `- Étkezési ablak 13:00–19:00: ${dailyCalorieTarget} kcal`,
          mealCountRule: '2. 1 étkezési ablak/nap (18:6 szakaszos böjt) — meal_type: "eating_window"',
          schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"eating_window","name":"Napi étkezési ablak","total_calories":${dailyCalorieTarget},"ingredients":[{"name":"csirkemell","g":150},{"name":"zöldség","g":200}]}]}]}`,
        };
      default: // '3meals' or absent
        return {
          caloriesBlock: `- Reggeli/Breakfast: ${breakfastTarget} kcal\n- Ebéd/Lunch: ${lunchTarget} kcal\n- Vacsora/Dinner: ${dinnerTarget} kcal`,
          mealCountRule: '2. 3 étkezés/nap: breakfast, lunch, dinner',
          schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"breakfast","name":"Zabkása pirított dióval","total_calories":${breakfastTarget},"ingredients":[{"name":"zab","g":80},{"name":"dió","g":20}]},{"meal_type":"lunch","name":"Csirkepaprikás galuskával","total_calories":${lunchTarget},"ingredients":[{"name":"csirkemell","g":150}]},{"meal_type":"dinner","name":"Spenótos tükörtojás pirítóssal","total_calories":${dinnerTarget},"ingredients":[{"name":"tojás","g":120}]}]}]}`,
        };
    }
  }
  ```

- [ ] **Step 3: Add `buildUserContextBlock` helper**

  Add immediately after `buildMealConfig`:

  ```ts
  function buildUserContextBlock(p: UserProfileContext | undefined): string {
    if (!p) return '';
    const lines: string[] = [];

    const goalParts = [p.goal, p.activityLevel, p.age ? `${p.age} év` : '', p.weight ? `${p.weight} kg` : '', p.gender].filter(Boolean);
    if (goalParts.length) lines.push(`- Goal: ${goalParts.join(' | ')}`);

    const dietParts = [p.dietaryPreferences, p.allergies ? `Allergia: ${p.allergies}` : ''].filter(Boolean);
    if (dietParts.length) lines.push(`- Diet: ${dietParts.join(' | ')}`);

    const mealParts = [
      p.mealCount ? `${p.mealCount} étkezés/nap` : '',
      p.mealModel ? `(${p.mealModel})` : '',
      (p.macroProteinPct && p.macroCarbsPct && p.macroFatPct)
        ? `Makró: ${p.macroProteinPct}% fehérje / ${p.macroCarbsPct}% szénhidrát / ${p.macroFatPct}% zsír`
        : '',
    ].filter(Boolean);
    if (mealParts.length) lines.push(`- Étkezés: ${mealParts.join(' ')}`);

    if (p.likedFoods?.length) lines.push(`- Kedvelt ételek: ${p.likedFoods.join(', ')}`);
    if (p.dislikedFoods?.length) lines.push(`- Kerülendő ételek: ${p.dislikedFoods.join(', ')} — EZEKET TELJESEN KERÜLD`);

    if (!lines.length) return '';
    return `FELHASZNÁLÓI KONTEXTUS:\n${lines.join('\n')}\n\n`;
  }
  ```

- [ ] **Step 4: Update the prompt template**

  Find the `const prompt = \`${intro}` block (around line 119). Replace the entire prompt string with:

  ```ts
  const { caloriesBlock, mealCountRule, schemaExample } = buildMealConfig(
    userProfile?.mealModel,
    dailyCalorieTarget,
    breakfastTarget,
    lunchTarget,
    dinnerTarget,
    dayNames[0],
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

  Also remove the now-unused variables from lines 102–104 (the three calorie targets are still used — they are passed to `buildMealConfig` — so keep them).

- [ ] **Step 5: Type-check**

  ```bash
  cd PersonalFit && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add PersonalFit/api/generate-meal-plan.ts
  git commit -m "feat: inject user profile context into meal plan prompt"
  ```

---

## Task 3: Pass user profile from client to API

**Files:**
- Modify: `PersonalFit/src/app/features/nutrition/components/GenerateMealPlanSheet.tsx`

- [ ] **Step 1: Update `handleGenerate` to load profile and pass it**

  Find `async function handleGenerate()` at line 191. Replace the existing function body with:

  ```ts
  async function handleGenerate() {
    setStep("generating");
    setError(null);
    try {
      // Load profile for personalization — fall back gracefully on IDB failure
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
        userProfile = undefined;
      }

      const resp = await fetch("/api/generate-meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: foods.map(f => ({
            name: f.name,
            calories_per_100g: f.calories ?? 100,
            protein_per_100g: f.protein ?? 5,
            carbs_per_100g: f.carbs ?? 10,
            fat_per_100g: f.fat ?? 3,
          })),
          dailyCalorieTarget: dailyTarget,
          days: 7,
          language,
          userProfile,
        }),
      });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || `Error: ${resp.status}`);
      const data = await resp.json();
      setGeneratedPlan(data.nutritionPlan);
      setStats(data.stats);
      setStep("preview");
    } catch (e: any) {
      setError(e.message || t('generatePlan.unknownError'));
      setStep("calc");
    }
  }
  ```

  Note: `getUserProfile` is already imported at line 11 — no new import needed.

- [ ] **Step 2: Type-check**

  ```bash
  cd PersonalFit && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Manual verification**

  1. Run `npm run dev` (from `PersonalFit/`)
  2. Open the app → go to Nutrition → open "Étrendgenerátor"
  3. Open DevTools → Network tab
  4. Fill in profile data in Profile (set goal, allergies, meal model)
  5. Trigger a plan generation
  6. In DevTools → find the `/api/generate-meal-plan` POST request → inspect Request Payload
  7. Verify `userProfile` object is present with the correct fields
  8. Verify the response contains a meal plan that respects the meal model (e.g., if profile has `5meals`, check that 5 meals appear per day)

- [ ] **Step 4: Commit**

  ```bash
  git add PersonalFit/src/app/features/nutrition/components/GenerateMealPlanSheet.tsx
  git commit -m "feat: pass user profile context to meal plan API"
  ```

---

## Final verification

- [ ] Run full TypeScript check: `cd PersonalFit && npx tsc --noEmit`
- [ ] Generate a plan with a fully filled profile — confirm personalization in the generated output (meal model matches, allergies avoided, preferences respected)
- [ ] Generate a plan with an empty profile (new user) — confirm backward compat (no errors, plan generates normally)
