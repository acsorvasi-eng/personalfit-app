# Sport & Meal Calorie Cycling — Design Spec
**Date:** 2026-03-19
**Status:** Approved

---

## Overview

Enhance the PersonalFit wizard and meal plan generator to:
1. Support intermittent fasting (IF) meal options in the wizard
2. Replace the "days per week" slider with a specific weekday picker for sports
3. Calculate calories burned per sport session and add them to that day's calorie target
4. Apply evidence-based carb cycling rules per day (training vs rest, goal-specific)

---

## 1. Wizard — Meal Step (StepMeals)

### Current state
`ProfileSetupWizard.tsx` has a single `mealCount: number` state (line 434) and maps it to a model string at submission via a `mealModelMap` (line 696). `StepMeals` receives only `mealCount` and `setMealCount`.

### New state
Add a second state variable at the wizard level:
```typescript
const [mealModel, setMealModel] = useState<string | undefined>(undefined);
```

Update `StepMeals` signature:
```typescript
function StepMeals({
  mealCount, setMealCount, mealModel, setMealModel
}: {
  mealCount: number;
  setMealCount: (v: number) => void;
  mealModel: string | undefined;
  setMealModel: (v: string | undefined) => void;
})
```

When a **normal** option (2/3/4/5) is selected: call `setMealCount(n)` and `setMealModel(undefined)`.
When an **IF** option is selected: call the appropriate setter pair:
- IF 16:8 → `setMealCount(2)` + `setMealModel('if16_8')`
- IF 18:6 → `setMealCount(1)` + `setMealModel('if18_6')`

Update the `mealModelMap` at submission to:
```typescript
const mealModelMap: Record<number, string> = { 2: '2meals', 4: '4meals', 5: '5meals' };
const effectiveMealModel = mealModel ?? mealModelMap[mealCount]; // IF model takes priority
```

Pass `effectiveMealModel` as `mealModel` when saving the profile and calling the API.

### JSX structure change
The current flat `.map()` over `MEAL_OPTIONS` (lines 1389–1408) must be refactored into two sections with a divider. New structure:

```tsx
{/* Normal meals */}
<div className="text-[0.68rem] font-semibold text-gray-400 tracking-widest mb-2">
  {t('wizard.meals.sectionNormal')}
</div>
{NORMAL_OPTIONS.map(...)}

{/* Section divider */}
<div className="flex items-center gap-2 my-3">
  <div className="flex-1 h-px bg-border" />
  <span className="text-[0.68rem] font-semibold text-gray-400 tracking-widest">
    {t('wizard.meals.sectionIF')}
  </span>
  <div className="flex-1 h-px bg-border" />
</div>

{/* IF options */}
{IF_OPTIONS.map(...)}
```

Where `NORMAL_OPTIONS` has counts 2/3/4/5 and `IF_OPTIONS` has `if16_8` / `if18_6`. Each IF option has its own `data-id` instead of `count`.

### Options

| Option | Model key | mealCount | Description |
|--------|-----------|-----------|-------------|
| 🍽️ 2 étkezés | `2meals` | 2 | Reggeli + Vacsora |
| 🍽️🍽️ 3 étkezés | `3meals` | 3 | Reggeli + Ebéd + Vacsora |
| 🍽️🍽️🍽️ 4 étkezés | `4meals` | 4 | + Tízórai |
| 🌟 5 étkezés | `5meals` | 5 | + Tízórai + Uzsonna |
| ⏱️ IF 16:8 | `if16_8` | 2 | 8 órás evési ablak · pl. 12:00–20:00 |
| 🌙 IF 18:6 | `if18_6` | 1 | 6 órás evési ablak · pl. 13:00–19:00 |

### Translation keys needed
- `wizard.meals.sectionNormal` — "NAPI ÉTKEZÉSEK"
- `wizard.meals.sectionIF` — "IDŐSZAKOS BÖJT"
- `wizard.meals.optIF16label` — "IF 16:8"
- `wizard.meals.optIF16desc` — "8 órás evési ablak · pl. 12:00–20:00"
- `wizard.meals.optIF18label` — "IF 18:6"
- `wizard.meals.optIF18desc` — "6 órás evési ablak · pl. 13:00–19:00"

---

## 2. Wizard — Sport Step (StepSport)

### Two SportEntry types — both must change

There are **two separate `SportEntry` type definitions** in the codebase:

1. **`ProfileSetupWizard.tsx` (onboarding)** — currently `{ id, label, days: number, minutes: number }`
2. **`GenerateMealPlanSheet.tsx` (generate sheet)** — already uses `{ id, type, days: number[], minutesPerSession: string }`

Both must use `days: number[]` after this change. Update the wizard's type:
```typescript
interface SportEntry {
  id: string;
  label: string;
  days: number[];   // weekday indices 0=Mon … 6=Sun (was: number count)
  minutes: number;
}
```

Also update `updateSport` in the wizard — remove the `field: 'days' | 'minutes'` union pattern and replace with a `Partial<SportEntry>` patch:
```typescript
updateSport: (id: string, patch: Partial<SportEntry>) => void;
```

Remove the range slider for days, replace with weekday toggle buttons (H K Sze Cs P Szo V).

### Write path (IndexedDB save)
In `ProfileSetupWizard.tsx`, the `handleFinish` function saves sports (currently serializing `days: number`). After this change it serializes `days: number[]`:
```typescript
await saveSetting('userSports', JSON.stringify(
  sports.map(s => ({ id: s.id, label: s.label, days: s.days, minutes: s.minutes }))
));
```
No other change needed — the shape is already `days: number[]` after the type fix.

### Read path / migration (GenerateMealPlanSheet)
When loading old-format data from IndexedDB (`days` is a number), the existing fallback already handles it:
```typescript
days: Array.from({ length: Math.min(s.days, 7) }, (_, i) => i)
```
**Note:** This migrates e.g. "3 days/week" to `[0, 1, 2]` (Mon/Tue/Wed), which may not match the user's actual schedule. This is an acceptable approximation for migration only — after the wizard update, users will set accurate days. No data loss occurs; the worst case is a slightly wrong calorie distribution for one generation cycle.

### MET burn display in wizard
Each sport card shows an estimate below the day buttons:
```
⚡ ~{N} kcal/edzés  (based on weight from personal step, default 70kg)
```
This is informational only — it does not persist, just helps the user understand the impact.

### Translation keys needed
- `wizard.sport.trainingDays` — "Edzésnapok" (already exists in generate sheet, add to wizard too)
- `wizard.sport.burnEstimate` — "~{n} kcal/edzés"

---

## 3. Calorie Burn Calculation (GenerateMealPlanSheet)

After loading saved sports, compute per-weekday calorie bonus before calling the API:

```typescript
const MET_MAP: Record<string, number> = {
  futas: 10, edzoterm: 6, crossfit: 6,
  kerekparozas: 8, uszas: 7, joga: 3,
  futball: 9, kosarlabda: 8, tenisz: 8, basketball: 8,
  gyaloglas: 3.5,
};

function normAccent(s: string): string {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function getMET(label: string): number {
  const key = normAccent(label);
  return Object.entries(MET_MAP).find(([k]) => key.includes(k))?.[1] ?? 6;
}

const weightKg = parseFloat(personal.weightKg) || 70;

const burnPerDay: Record<number, number> = {};
for (const s of activity.sports) {
  const met = getMET(s.type); // s.type is the field name in GenerateMealPlanSheet
  const kcal = Math.round(met * weightKg * (parseInt(s.minutesPerSession) / 60));
  for (const day of s.days) {
    burnPerDay[day] = (burnPerDay[day] ?? 0) + kcal;
  }
}
```

`s.type` is correct here — in `GenerateMealPlanSheet.tsx` the field is `type` (mapped from `label` when loading from IndexedDB at line 161).

Pass `burnPerDay` to the API as `trainingCaloriesPerDay`:
```typescript
trainingCaloriesPerDay: burnPerDay  // { 0: 512, 2: 512, 4: 782, 5: 270 }
```

---

## 4. API — generate-meal-plan.ts

### New request parameter
```typescript
trainingCaloriesPerDay?: Record<string, number>
```
(Keys are weekday indices as numbers; JSON serializes object keys as strings.)

### Per-day calorie target in prompt
Build a day-specific target map and include it in the prompt per-day:
```typescript
const calForDay = (weekdayIdx: number) =>
  dailyCalorieTarget + ((trainingCaloriesPerDay ?? {})[weekdayIdx] ?? 0);
```

Include in the prompt block the adjusted target per day type (training / rest).

### Updated carb cycling prompt block

```
SZÉNHIDRÁT CIKLUS (${goal === 'loss' ? 'FOGYÁS CÉL' : 'TARTÁS/NÖVELÉS'}):
- Edzésnapok (${trainingDayNames}): emelt kalória-cél (alap + égetés).
  ${goal === 'loss'
    ? 'Ajánlott szénhidrát: rizs, burgonya, tészta, zabpehely — az edzés utáni szénhidrát+fehérje gátolja az izomlebontást és feltölti a glikogénraktárakat.'
    : 'Normál szénhidrát, edzésnapokon kissé több (rizs, zabpehely, burgonya).'}
- Pihenőnapok:
  ${goal === 'loss'
    ? 'Max 150g szénhidrát, KIZÁRÓLAG lassú felszívódású forrásból: rozskenyér, teljes kiőrlésű kenyér, zöldség. TILOS: fehér rizs, fehér tészta, burgonya, fehér kenyér. Pótold fehérjével és zöldséggel.'
    : 'Normál szénhidrát.'}
```

### Updated allDays construction
Add `daily_calorie_target` to each day object:
```typescript
const allDays = Array.from({ length: TOTAL_DAYS }, (_, i) => {
  const base = baseWeek[i % baseWeek.length];
  const weekdayIdx = i % 7;
  const burnBonus = (trainingCaloriesPerDay ?? {})[weekdayIdx] ?? 0;
  return {
    ...base,
    week: Math.floor(i / 7) + 1,
    day: i + 1,
    day_label: dayNames[weekdayIdx],
    weekday_index: weekdayIdx,             // NEW — needed for display lookup
    is_training_day: trainingDaySet.has(weekdayIdx),
    daily_calorie_target: dailyCalorieTarget + burnBonus,  // NEW
  };
});
```

Note: `weekday_index` (0–6) is added to the response so the frontend can look up `burnPerDay[day.weekday_index]` reliably, rather than re-computing `day.day % 7` (which would be off-by-one since `day.day` is 1-based).

---

## 5. Generated Plan Display (GenerateMealPlanSheet)

Use `day.weekday_index` (from API response) to look up `burnPerDay`:

```tsx
const burn = burnPerDay[day.weekday_index ?? ((day.day - 1) % 7)] ?? 0;

{day.is_training_day && burn > 0 && (
  <span className={`text-[0.68rem] font-bold px-[7px] py-[2px] rounded-full ${
    burn > 500
      ? 'bg-orange-100 text-orange-700'
      : 'bg-green-100 text-green-700'
  }`}>
    +{burn} kcal égetés
  </span>
)}
```

The `(day.day - 1) % 7` fallback handles old API responses that lack `weekday_index`.

### Translation key for badge
Add to translations:
- `generatePlan.burnBadge` — "+{n} kcal égetés" (hu) / "+{n} kcal burned" (en) / "+{n} kcal ars" (ro)

---

## 6. Wizard API call — trainingCaloriesPerDay

`ProfileSetupWizard.tsx` also calls `/api/generate-meal-plan` during the summary step (line 718). It must compute and pass `trainingCaloriesPerDay` the same way as `GenerateMealPlanSheet`:

```typescript
// In handleFinish, after building the sport list
const wizardWeight = weight || 70;
const burnPerDay: Record<number, number> = {};
for (const s of sports) {
  const met = getMET(s.label); // wizard uses 'label', not 'type'
  const kcal = Math.round(met * wizardWeight * (s.minutes / 60));
  for (const day of s.days) {
    burnPerDay[day] = (burnPerDay[day] ?? 0) + kcal;
  }
}
// Pass to API: trainingCaloriesPerDay: burnPerDay
```

The `getMET` function (with MET_MAP) should be extracted into a shared utility or duplicated — the spec allows duplication since there are only two call sites.

Also compute `trainingDayIndices`:
```typescript
const trainingDayIndices = [...new Set(sports.flatMap(s => s.days))].sort();
```

---

## 7. Affected Files Summary

| File | Changes |
|------|---------|
| `src/app/components/onboarding/ProfileSetupWizard.tsx` | Add `mealModel` state; refactor StepMeals JSX to two sections with IF options; change SportEntry.days to `number[]`; replace slider with day-picker; add burnPerDay computation; pass `trainingCaloriesPerDay` and `trainingDays` to API call |
| `src/app/features/nutrition/components/GenerateMealPlanSheet.tsx` | Add MET burn calculation; pass `trainingCaloriesPerDay` to API; display burn badge using `day.weekday_index` |
| `api/generate-meal-plan.ts` | Accept `trainingCaloriesPerDay`; add `weekday_index` and `daily_calorie_target` to allDays; update carb cycling prompt |
| `src/app/translations/index.ts` | Add: `wizard.meals.sectionNormal`, `sectionIF`, `optIF16label/desc`, `optIF18label/desc`; `wizard.sport.burnEstimate`; `generatePlan.burnBadge` |

---

## 8. Scientific Basis

Carb cycling principles applied are backed by ISSN (Kerksick et al., 2017) and ACSM/AND/DC (Thomas et al., 2016):
- Training day carbs prevent catabolism, replenish glycogen (even during fat loss)
- Rest day carb restriction (~150g, complex sources only) maintains caloric deficit without muscle loss
- Adequate protein (≥1.6g/kg/day) is prerequisite for carb cycling to preserve muscle

The 150g rest-day carb limit is a practical heuristic; a weight-adjusted formula (1.5–2g/kg) is a future improvement.

---

## Out of Scope
- Per-user protein target enforcement (separate feature)
- FAQ / scientific backing section in settings (tracked separately in memory)
- Adjusting 150g threshold dynamically by body weight (future improvement)
- Changing `GenerateMealPlanSheet`'s existing day-picker UI (already correct — no changes needed there beyond burn calculation)
