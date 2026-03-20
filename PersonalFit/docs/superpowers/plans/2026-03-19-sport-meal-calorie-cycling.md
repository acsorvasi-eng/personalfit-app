# Sport & Meal Calorie Cycling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add IF meal options to the onboarding wizard, replace the sport "days per week" slider with a specific weekday picker, compute MET-based calorie burn per sport session, and add the burn bonus to training-day calorie targets in the meal plan generator.

**Architecture:** Changes flow in one direction: wizard → IndexedDB → GenerateMealPlanSheet → API. Task 1 adds translations (foundation for all UI). Tasks 2–3 update the wizard (ProfileSetupWizard.tsx). Task 4 updates the generate sheet (GenerateMealPlanSheet.tsx). Task 5 updates the API (generate-meal-plan.ts).

**Tech Stack:** React + TypeScript + Vite, Tailwind CSS, IndexedDB (via `getSetting`/`saveSetting`), Vercel serverless API, Anthropic Claude Haiku

---

## File Map

| File | What changes |
|------|-------------|
| `src/app/translations/index.ts` | Add IF meal keys + sport burn key + burnBadge key (3 locales each) |
| `src/app/components/onboarding/ProfileSetupWizard.tsx` | `SportEntry.days: number[]`; add `mealModel` state; refactor StepMeals JSX; replace slider with day-picker in StepSport; update `handleGenerate` to pass `trainingCaloriesPerDay` and `trainingDays` |
| `src/app/features/nutrition/components/GenerateMealPlanSheet.tsx` | Add MET burn calculation (`burnPerDay`); pass `trainingCaloriesPerDay` to API; add burn badge to day header |
| `api/generate-meal-plan.ts` | Accept `trainingCaloriesPerDay`; add `weekday_index` + `daily_calorie_target` to `allDays`; update carb cycling prompt |

---

## Task 1: Add translation keys (all 3 locales)

**Files:**
- Modify: `src/app/translations/index.ts`

No test harness exists in this project. After each task: run `npm run build` in `PersonalFit/` and verify TypeScript compiles with 0 errors.

- [ ] **Step 1: Add keys to the `hu` locale**

Find the `meals` block inside the `hu` wizard section (around line 1347 — ends with `hint: 'Az étkezési időpontokat...'`). Add after the `hint` line, still inside the `meals` object — but since we need to add to the section labels, add:

```typescript
// Inside hu > wizard > meals object, after hint:
sectionNormal: 'NAPI ÉTKEZÉSEK',
sectionIF: 'IDŐSZAKOS BÖJT',
optIF16label: 'IF 16:8',
optIF16desc: '8 órás evési ablak · pl. 12:00–20:00',
optIF18label: 'IF 18:6',
optIF18desc: '6 órás evési ablak · pl. 13:00–19:00',
```

Find the `sport` block inside the `hu` wizard section (around line 1356 — contains `daysPerWeek: 'Napok/hét'`). Add after `minutesPer`:

```typescript
// Inside hu > wizard > sport object, after minutesPer:
trainingDays: 'Edzésnapok',
burnEstimate: '~{n} kcal/edzés',
```

Find the `generatePlan` block in `hu` (contains `trainingDayBadge: 'Edzésnap'`). Add after `trainingDayBadge`:

```typescript
// Inside hu > generatePlan object, after trainingDayBadge:
burnBadge: '+{n} kcal égetés',
```

- [ ] **Step 2: Add keys to the `en` locale**

Find `en > wizard > meals` (around line 2787 — ends with `hint: 'Meal times...'`). Add:

```typescript
sectionNormal: 'DAILY MEALS',
sectionIF: 'INTERMITTENT FASTING',
optIF16label: 'IF 16:8',
optIF16desc: '8-hour eating window · e.g. 12:00–20:00',
optIF18label: 'IF 18:6',
optIF18desc: '6-hour eating window · e.g. 13:00–19:00',
```

Find `en > wizard > sport` (around line 2792). Add after `minutesPer: 'Minutes/session'`:

```typescript
trainingDays: 'Training days',
burnEstimate: '~{n} kcal/session',
```

Find `en > generatePlan` (contains `trainingDayBadge: 'Training day'`). Add after it:

```typescript
burnBadge: '+{n} kcal burned',
```

- [ ] **Step 3: Add keys to the `ro` locale**

Find `ro > wizard > meals` (around line 4205 — ends with `hint: 'Orarul meselor...'`). Add:

```typescript
sectionNormal: 'MESE ZILNICE',
sectionIF: 'POST INTERMITENT',
optIF16label: 'IF 16:8',
optIF16desc: 'Fereastră de mâncat 8 ore · ex. 12:00–20:00',
optIF18label: 'IF 18:6',
optIF18desc: 'Fereastră de mâncat 6 ore · ex. 13:00–19:00',
```

Find `ro > wizard > sport` (around line 4210). Add after `minutesPer: 'Minute/sesiune'`:

```typescript
trainingDays: 'Zile antrenament',
burnEstimate: '~{n} kcal/sesiune',
```

Find `ro > generatePlan` (contains `trainingDayBadge: 'Zi antrenament'`). Add after it:

```typescript
burnBadge: '+{n} kcal ars',
```

- [ ] **Step 4: Verify build compiles**

```bash
cd PersonalFit && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors. If there are errors, they will be about missing keys — fix the locale objects so all 3 have matching keys.

- [ ] **Step 5: Commit**

```bash
git add PersonalFit/src/app/translations/index.ts
git commit -m "feat: add IF meal and sport burn translation keys (hu/en/ro)"
```

---

## Task 2: Wizard — Meal Step IF options

**Files:**
- Modify: `src/app/components/onboarding/ProfileSetupWizard.tsx`

**Context:** `StepMeals` is a standalone function component at line 1374. It renders a flat list of 4 options using `MEAL_OPTIONS.map()`. The wizard state at line 434 has only `mealCount: number`. We need to add `mealModel` state and refactor StepMeals.

- [ ] **Step 1: Add `mealModel` wizard state**

In `ProfileSetupWizard` component (find the block starting `// Step 3: Meals` at line 433), add a second state variable directly below `const [mealCount, setMealCount] = useState(3);`:

```typescript
const [mealModel, setMealModel] = useState<string | undefined>(undefined);
```

- [ ] **Step 2: Compute `effectiveMealModel` early and use it in both `mealSettings` and the API call**

`effectiveMealModel` must be declared BEFORE the `mealSettings` block (line 643) because it's used there. Find the top of `handleGenerate` — the very first `try {` block (around line 641). Add these two lines as the first statements inside the `try` block, before anything else:

```typescript
const mealModelMap: Record<number, string> = { 2: '2meals', 4: '4meals', 5: '5meals' };
const effectiveMealModel = mealModel ?? mealModelMap[mealCount]; // IF model takes priority
```

Then find `mealSettings.mealCount = mealCount;` (line 644) — add below it:
```typescript
if (effectiveMealModel) mealSettings.mealModel = effectiveMealModel as any;
```

Then find the original `mealModelMap` block at line ~696 (it now duplicates what we just added above) — **delete it entirely**:
```typescript
// DELETE these two lines (now duplicated):
const mealModelMap: Record<number, string> = { 2: '2meals', 4: '4meals', 5: '5meals' };
const mealModel = mealModelMap[mealCount]; // undefined → default 3 meals
```

Then find `mealModel,` in the `userProfilePayload` object (line ~710) and change it to `mealModel: effectiveMealModel,`.

- [ ] **Step 3: Pass mealModel and setMealModel down to StepMeals**

Find the step render at line 829:
```tsx
{step === 3 && <StepMeals mealCount={mealCount} setMealCount={setMealCount} />}
```

Replace with:
```tsx
{step === 3 && <StepMeals mealCount={mealCount} setMealCount={setMealCount} mealModel={mealModel} setMealModel={setMealModel} />}
```

- [ ] **Step 4: Refactor `StepMeals` function**

Replace the entire `StepMeals` function (lines 1374–1417) with:

```typescript
function StepMeals({
  mealCount, setMealCount, mealModel, setMealModel
}: {
  mealCount: number;
  setMealCount: (v: number) => void;
  mealModel: string | undefined;
  setMealModel: (v: string | undefined) => void;
}) {
  const { t } = useLanguage();

  const NORMAL_OPTIONS = [
    { count: 2, model: undefined, label: t('wizard.meals.opt2label'), desc: t('wizard.meals.opt2desc'), emoji: '🍽️' },
    { count: 3, model: undefined, label: t('wizard.meals.opt3label'), desc: t('wizard.meals.opt3desc'), emoji: '🍽️🍽️' },
    { count: 4, model: undefined, label: t('wizard.meals.opt4label'), desc: t('wizard.meals.opt4desc'), emoji: '🍽️🍽️🍽️' },
    { count: 5, model: undefined, label: t('wizard.meals.opt5label'), desc: t('wizard.meals.opt5desc'), emoji: '🌟' },
  ];

  const IF_OPTIONS = [
    { count: 2, model: 'if16_8', label: t('wizard.meals.optIF16label'), desc: t('wizard.meals.optIF16desc'), emoji: '⏱️' },
    { count: 1, model: 'if18_6', label: t('wizard.meals.optIF18label'), desc: t('wizard.meals.optIF18desc'), emoji: '🌙' },
  ];

  const isSelected = (count: number, model: string | undefined) =>
    mealCount === count && mealModel === model;

  const renderOption = (opt: { count: number; model: string | undefined; label: string; desc: string; emoji: string }) => (
    <button
      key={opt.model ?? opt.count}
      onClick={() => { setMealCount(opt.count); setMealModel(opt.model); }}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all text-left ${
        isSelected(opt.count, opt.model) ? 'border-primary bg-primary/5' : 'border-border'
      }`}
    >
      <span className="text-2xl">{opt.emoji}</span>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${isSelected(opt.count, opt.model) ? 'text-primary' : 'text-gray-800'}`}>
          {opt.label}
        </p>
        <p className="text-xs text-gray-400">{opt.desc}</p>
      </div>
      {isSelected(opt.count, opt.model) && <Check className="w-5 h-5 text-primary shrink-0" />}
    </button>
  );

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('wizard.meals.title')}</h2>
        <p className="text-sm text-gray-500">{t('wizard.meals.subtitle')}</p>
      </div>

      <div className="space-y-2.5">
        {/* Normal meals section */}
        <p className="text-[0.68rem] font-semibold text-gray-400 tracking-widest px-1">
          {t('wizard.meals.sectionNormal')}
        </p>
        {NORMAL_OPTIONS.map(renderOption)}

        {/* IF section divider */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[0.68rem] font-semibold text-gray-400 tracking-widest whitespace-nowrap">
            {t('wizard.meals.sectionIF')}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {IF_OPTIONS.map(renderOption)}
      </div>

      <div className="bg-primary/5 rounded-2xl p-4 flex gap-3">
        <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-primary">{t('wizard.meals.hint')}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Build and verify**

```bash
cd PersonalFit && npm run build 2>&1 | tail -20
```

Expected: 0 TypeScript errors.

Manual test: Open the wizard in the browser (localhost dev server or Vercel preview), navigate to the "Napi étkezések" step. You should see 4 normal options, a separator reading "IDŐSZAKOS BÖJT", then IF 16:8 and IF 18:6. Clicking IF 16:8 should highlight it with the indigo border.

- [ ] **Step 6: Commit**

```bash
git add PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx
git commit -m "feat: add IF 16:8 and IF 18:6 options to wizard meal step"
```

---

## Task 3: Wizard — Sport Step day picker

**Files:**
- Modify: `src/app/components/onboarding/ProfileSetupWizard.tsx`

**Context:** `SportEntry` at line 46 has `days: number` (count). The `addSport` helper at line 618 initialises `days: 3`. The `updateSport` at line 624 uses `field: 'days' | 'minutes'`. `StepSport` renders a range slider for days (lines 1492–1498).

- [ ] **Step 1: Update `SportEntry` type**

Replace lines 46–51:
```typescript
interface SportEntry {
  id: string;
  label: string;
  days: number; // days per week
  minutes: number; // per session
}
```

With:
```typescript
interface SportEntry {
  id: string;
  label: string;
  days: number[];  // weekday indices: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  minutes: number; // per session
}
```

- [ ] **Step 2: Update `addSport` initialiser**

Find line 618:
```typescript
setSports(prev => [...prev, { id: Date.now().toString(), label, days: 3, minutes: 45 }]);
```

Change `days: 3` to `days: []`:
```typescript
setSports(prev => [...prev, { id: Date.now().toString(), label, days: [], minutes: 45 }]);
```

- [ ] **Step 3: Replace `updateSport` with patch-based version**

Replace lines 624–626:
```typescript
const updateSport = (id: string, field: 'days' | 'minutes', value: number) => {
  setSports(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
};
```

With:
```typescript
const updateSport = (id: string, patch: Partial<SportEntry>) => {
  setSports(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
};

const toggleSportDay = (id: string, dayIdx: number) => {
  setSports(prev => prev.map(s =>
    s.id === id
      ? { ...s, days: s.days.includes(dayIdx) ? s.days.filter(d => d !== dayIdx) : [...s.days, dayIdx] }
      : s
  ));
};
```

- [ ] **Step 4: Update `StepSport` props interface**

Find line 1423–1427:
```typescript
function StepSport({ activity, setActivity, sports, addSport, removeSport, updateSport, showSportPicker, setShowSportPicker }: {
  activity: ActivityLevel; setActivity: (v: ActivityLevel) => void;
  sports: SportEntry[]; addSport: (label: string) => void; removeSport: (id: string) => void;
  updateSport: (id: string, field: 'days' | 'minutes', value: number) => void;
  showSportPicker: boolean; setShowSportPicker: (v: boolean) => void;
```

Replace with:
```typescript
function StepSport({ activity, setActivity, sports, addSport, removeSport, updateSport, toggleSportDay, showSportPicker, setShowSportPicker, weightKg }: {
  activity: ActivityLevel; setActivity: (v: ActivityLevel) => void;
  sports: SportEntry[]; addSport: (label: string) => void; removeSport: (id: string) => void;
  updateSport: (id: string, patch: Partial<SportEntry>) => void;
  toggleSportDay: (id: string, dayIdx: number) => void;
  showSportPicker: boolean; setShowSportPicker: (v: boolean) => void;
  weightKg: number;
```

- [ ] **Step 5: Pass new props to StepSport in the step render**

Find line 830:
```tsx
{step === 4 && <StepSport activity={activity} setActivity={setActivity} sports={sports} addSport={addSport} removeSport={removeSport} updateSport={updateSport} showSportPicker={showSportPicker} setShowSportPicker={setShowSportPicker} />}
```

Replace with:
```tsx
{step === 4 && <StepSport activity={activity} setActivity={setActivity} sports={sports} addSport={addSport} removeSport={removeSport} updateSport={updateSport} toggleSportDay={toggleSportDay} showSportPicker={showSportPicker} setShowSportPicker={setShowSportPicker} weightKg={weight || 70} />}
```

- [ ] **Step 6: Replace the sport card body in `StepSport`**

Inside `StepSport`, find the sport card content (lines 1491–1506) — the two-column grid with the range sliders. Replace the entire `<div className="grid grid-cols-2 gap-3 ...">` block with:

```tsx
{/* Day picker */}
<div className="mb-2">
  <p className="text-xs text-gray-500 mb-1.5">{t('wizard.sport.trainingDays')}</p>
  <div className="flex gap-1.5 flex-wrap">
    {['H','K','Sze','Cs','P','Szo','V'].map((label, idx) => (
      <button
        key={idx}
        type="button"
        onClick={() => toggleSportDay(s.id, idx)}
        className={`text-[0.72rem] font-bold px-2.5 py-1.5 rounded-lg transition-all ${
          s.days.includes(idx)
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
</div>

{/* Minutes slider */}
<div className="mb-1">
  <div className="flex justify-between text-xs text-gray-500 mb-1">
    <span>{t('wizard.sport.minutesPer')}</span>
    <span className="font-semibold text-gray-700">{s.minutes}p</span>
  </div>
  <input
    type="range" min={15} max={180} step={15} value={s.minutes}
    onChange={e => updateSport(s.id, { minutes: +e.target.value })}
    className="w-full accent-primary"
  />
</div>

{/* Calorie burn estimate */}
{s.days.length > 0 && (
  <p className="text-[0.72rem] text-primary mt-1">
    ⚡ {t('wizard.sport.burnEstimate').replace('{n}', String(
      Math.round(getMET(s.label) * weightKg * (s.minutes / 60))
    ))}
  </p>
)}
```

- [ ] **Step 7: Add `getMET` helper near the top of the wizard file**

Place just before the `ProfileSetupWizard` function definition (around line 400):

```typescript
// MET values for calorie burn estimation
const MET_MAP: Record<string, number> = {
  futas: 10, edzoterm: 6, crossfit: 6,
  kerekparozas: 8, uszas: 7, joga: 3,
  futball: 9, kosarlabda: 8, tenisz: 8,
  gyaloglas: 3.5,
};

function normAccent(s: string): string {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function getMET(label: string): number {
  const key = normAccent(label);
  return Object.entries(MET_MAP).find(([k]) => key.includes(k))?.[1] ?? 6;
}
```

- [ ] **Step 8: Update `handleGenerate` to compute and pass training data**

Sports are **already saved** to IndexedDB at line 764 via `setSetting('userSports', JSON.stringify(sports))`. After the `SportEntry.days` type change to `number[]`, this save will automatically serialize the new format — **no additional save needed**.

Add the burn computation and new API params. Before the `JSON.stringify` block in the API call (around line 722), add:

```typescript
const trainingDayIndices = [...new Set(sports.flatMap(s => s.days))].sort();
const wizardWeight = weight || 70;
const wizardBurnPerDay: Record<number, number> = {};
for (const s of sports) {
  const met = getMET(s.label);
  const kcal = Math.round(met * wizardWeight * (s.minutes / 60));
  for (const day of s.days) {
    wizardBurnPerDay[day] = (wizardBurnPerDay[day] ?? 0) + kcal;
  }
}
```

Inside the `JSON.stringify({...})` body, add alongside the existing keys:
```typescript
trainingDays: trainingDayIndices,
trainingCaloriesPerDay: wizardBurnPerDay,
```

- [ ] **Step 9: Build and verify**

```bash
cd PersonalFit && npm run build 2>&1 | tail -20
```

Expected: 0 TypeScript errors.

Manual test: In the wizard sport step, add a sport. You should see 7 day buttons (H K Sze Cs P Szo V) instead of the old slider. Click some days — they should toggle indigo. The calorie burn estimate should appear once at least one day is selected.

- [ ] **Step 10: Commit**

```bash
git add PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx
git commit -m "feat: replace sport days slider with weekday picker in wizard, add MET burn estimate"
```

---

## Task 4: GenerateMealPlanSheet — burn calculation and badge

**Files:**
- Modify: `src/app/features/nutrition/components/GenerateMealPlanSheet.tsx`

**Context:** `GenerateMealPlanSheet.tsx` already has the day-picker sport UI and loads sports from IndexedDB. The `handleGenerate` function already computes `trainingDayIndices` and passes `trainingDays` to the API. We need to add `burnPerDay` computation, pass it to the API, and add the burn badge in the preview.

- [ ] **Step 1: Add `getMET` helper to GenerateMealPlanSheet**

Add the `MET_MAP`, `normAccent` normalization helper, and `getMET` function near the top of the file:

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
```

- [ ] **Step 2: Add `burnPerDay` state**

Find the `useState` declarations in the component (around line 123). Add:

```typescript
const [burnPerDay, setBurnPerDay] = useState<Record<number, number>>({});
```

- [ ] **Step 3: Compute `burnPerDay` inside `handleGenerate`, before the API call**

Find in `handleGenerate` (around line 224) the existing line:
```typescript
const trainingDayIndices = [...new Set(activity.sports.flatMap(s => s.days))].sort();
```

Add directly below it:

```typescript
const weightKg = parseFloat(personal.weightKg) || 70;
const computedBurnPerDay: Record<number, number> = {};
for (const s of activity.sports) {
  const met = getMET(s.type); // s.type is the field name in GenerateMealPlanSheet (mapped from label on load)
  const kcal = Math.round(met * weightKg * (parseInt(s.minutesPerSession) / 60));
  for (const day of s.days) {
    computedBurnPerDay[day] = (computedBurnPerDay[day] ?? 0) + kcal;
  }
}
setBurnPerDay(computedBurnPerDay);
```

- [ ] **Step 4: Pass `trainingCaloriesPerDay` to the API**

Find the `JSON.stringify` body of the fetch call (around line 230). Add `trainingCaloriesPerDay` alongside the existing `trainingDays`:

```typescript
trainingCaloriesPerDay: computedBurnPerDay,
```

- [ ] **Step 5: Add burn badge in the day header**

Find the day header section in the preview render (around line 728):
```tsx
{day.is_training_day && (
  <span className="bg-indigo-500 text-white text-[0.65rem] font-bold px-[7px] py-[2px] rounded-full">
    {t('generatePlan.trainingDayBadge')}
  </span>
)}
```

Replace with:

```tsx
{day.is_training_day && (
  <span className="bg-indigo-500 text-white text-[0.65rem] font-bold px-[7px] py-[2px] rounded-full">
    {t('generatePlan.trainingDayBadge')}
  </span>
)}
{day.is_training_day && (() => {
  const burn = burnPerDay[day.weekday_index ?? ((day.day - 1) % 7)] ?? 0;
  return burn > 0 ? (
    <span className={`text-[0.65rem] font-bold px-[7px] py-[2px] rounded-full ${
      burn > 500 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
    }`}>
      {t('generatePlan.burnBadge').replace('{n}', String(burn))}
    </span>
  ) : null;
})()}
```

- [ ] **Step 6: Build and verify**

```bash
cd PersonalFit && npm run build 2>&1 | tail -20
```

Expected: 0 TypeScript errors.

Manual test: In GenerateMealPlanSheet, set up sports with specific days, generate a plan. Training day headers should show a green badge like "+512 kcal égetés". Days with 2 sports summed above 500 kcal should show an orange badge.

- [ ] **Step 7: Commit**

```bash
git add PersonalFit/src/app/features/nutrition/components/GenerateMealPlanSheet.tsx
git commit -m "feat: compute MET calorie burn per training day, pass to API, show burn badge"
```

---

## Task 5: API — per-day calorie targets and updated carb cycling prompt

**Files:**
- Modify: `api/generate-meal-plan.ts`

**Context:** The handler at line 129 currently accepts `trainingDays` and produces a flat 30-day response. `allDays` is built at line 294. The carb cycling prompt block is at line 198. We add `trainingCaloriesPerDay`, compute per-day targets, add `weekday_index` and `daily_calorie_target` to every day, and update the carb cycling prompt.

- [ ] **Step 1: Add `trainingCaloriesPerDay` to the request destructuring**

Find the destructuring block starting at line 137. Add `trainingCaloriesPerDay` alongside `trainingDays`:

```typescript
trainingCaloriesPerDay = {},
```

Add to the type annotation:

```typescript
trainingCaloriesPerDay?: Record<string, number>;
```

- [ ] **Step 2: Update the carb cycling prompt block**

Find the `carbCycleBlock` constant (around line 198). Replace the entire block with:

```typescript
const carbCycleBlock = hasTrainingDays
  ? `\nSZÉNHIDRÁT CIKLUS (${goal === 'loss' ? 'FOGYÁS CÉL' : 'TARTÁS/NÖVELÉS'}):
- Edzésnapok (${trainingDayNames}): emelt kalória-cél (alap + sport égetés).
  ${goal === 'loss'
    ? 'Ajánlott szénhidrát: rizs, burgonya, tészta, zabpehely — az edzés utáni szénhidrát+fehérje gátolja az izomlebontást és feltölti a glikogénraktárakat.'
    : 'Normál szénhidrát, edzésnapokon kissé több (rizs, zabpehely, burgonya).'}
- Pihenőnapok:
  ${goal === 'loss'
    ? 'Max 150g szénhidrát, KIZÁRÓLAG lassú felszívódású forrásból: rozskenyér, teljes kiőrlésű kenyér, zöldség. TILOS: fehér rizs, fehér tészta, burgonya, fehér kenyér. Pótold fehérjével és zöldséggel.'
    : 'Normál szénhidrát.'}\n`
  : '';
```

- [ ] **Step 3: Add per-day calorie info to the prompt**

In the prompt template (around line 223), find the line that starts with `Napi célkalória:`:
```typescript
Napi célkalória: ${dailyCalorieTarget} kcal. Étkezések: ${mealTypes.join(', ')} (${calBlock})
```

Replace with:
```typescript
Napi alapkalória: ${dailyCalorieTarget} kcal${hasTrainingDays ? ` (edzésnapokon magasabb a sport égetéssel)` : ''}. Étkezések: ${mealTypes.join(', ')} (${calBlock})
```

- [ ] **Step 4: Update `allDays` construction to add `weekday_index` and `daily_calorie_target`**

Find the `allDays` block (around line 294):
```typescript
const allDays = Array.from({ length: TOTAL_DAYS }, (_, i) => {
  const base = baseWeek[i % baseWeek.length];
  const weekdayIdx = i % 7; // 0=Mon … 6=Sun
  return {
    ...base,
    week: Math.floor(i / 7) + 1,
    day: i + 1,
    day_label: dayNames[weekdayIdx],
    is_training_day: trainingDaySet.has(weekdayIdx),
  };
});
```

Replace with:
```typescript
const allDays = Array.from({ length: TOTAL_DAYS }, (_, i) => {
  const base = baseWeek[i % baseWeek.length];
  const weekdayIdx = i % 7; // 0=Mon … 6=Sun
  const burnBonus = (trainingCaloriesPerDay as Record<string, number>)[String(weekdayIdx)] ?? 0;
  return {
    ...base,
    week: Math.floor(i / 7) + 1,
    day: i + 1,
    day_label: dayNames[weekdayIdx],
    weekday_index: weekdayIdx,
    is_training_day: trainingDaySet.has(weekdayIdx),
    daily_calorie_target: dailyCalorieTarget + burnBonus,
  };
});
```

Note: `trainingCaloriesPerDay` keys are strings when deserialized from JSON (e.g. `"0"`, `"2"`), so we use `String(weekdayIdx)` to look up.

- [ ] **Step 5: Build and verify**

```bash
cd PersonalFit && npm run build 2>&1 | tail -20
```

Expected: 0 TypeScript errors.

- [ ] **Step 6: Deploy and end-to-end test**

```bash
cd PersonalFit && git add ../api/generate-meal-plan.ts && git commit -m "feat: add trainingCaloriesPerDay support, weekday_index, daily_calorie_target to API"
git push
vercel --prod --force
```

Wait for deployment, then test end-to-end:
1. Open the app → Generate meal plan
2. Add a sport (e.g. Kerékpározás, Mon/Wed/Fri, 60 min)
3. Click Generate
4. In the 30-day preview: Mon/Wed/Fri should show the indigo "Edzésnap" badge AND a green "+X kcal égetés" badge
5. The kcal total on training days should be higher than on rest days

---

## Task 6: Final integration commit

- [ ] **Step 1: Run a full build one more time**

```bash
cd PersonalFit && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 2: Force-deploy to Vercel**

```bash
cd PersonalFit && git push && vercel --prod --force
```

- [ ] **Step 3: Smoke test all 3 locales**

Switch the app language to EN and RO, go through the wizard meals step — verify "INTERMITTENT FASTING" / "POST INTERMITENT" sections appear with correct descriptions.

- [ ] **Step 4: Done** ✅
