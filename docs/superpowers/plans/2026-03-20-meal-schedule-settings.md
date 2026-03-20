# Meal Schedule Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface meal schedule editing in the Profile → Settings tab, and fix the wizard to save proper meal time windows when the user selects their meal count.

**Architecture:** Two independent fixes. (1) The wizard currently saves `mealCount` but leaves `meals: []` empty, so UnifiedMenu falls back to hardcoded times — fixed by populating meals from the existing `getDefaultMealsForModel`/`getDefaultMealsForCount` helpers. (2) The existing full-page `MealIntervalEditor` at `/meal-intervals` is already complete but unreachable from Settings — fixed by adding a `SettingsCard` row in `Profile.tsx`'s settings tab.

**Tech Stack:** React 18, TypeScript, Vite, existing `UserProfileService`, `translations/index.ts` (nested, not flat locale files), `useNavigate` from react-router.

---

## File Map

| File | Change |
|------|--------|
| `PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx` | Add `getDefaultMealsForModel`, `getDefaultMealsForCount`, `MealModel` to import; populate `mealSettings.meals` before saving |
| `PersonalFit/src/app/translations/index.ts` | Add 3 keys × 3 languages: `sectionMealSchedule`, `mealScheduleTitle`, `mealScheduleLink` |
| `PersonalFit/src/app/features/profile/components/Profile.tsx` | Add `getMealSettings` import, meal state in `SettingsTabContent`, new `SettingsCard` |
| `PersonalFit/src/app/utils/buildIngredientSelection.test.ts` | Add test for `getDefaultMealsForCount` / `getDefaultMealsForModel` correctness |

---

## Task 1: Fix wizard — save default meal windows on completion

**Files:**
- Modify: `PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx:29` (import line)
- Modify: `PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx:668-693` (mealSettings build)
- Test: `PersonalFit/src/app/utils/buildIngredientSelection.test.ts`

### Context

In `ProfileSetupWizard.tsx` line 29 the current import is:
```ts
import { saveUserProfile, getDefaultMealSettings, saveMealSettings } from '../../backend/services/UserProfileService';
```

In `UserProfileService.ts` these helpers already exist (lines 217-225):
```ts
export function getDefaultMealsForCount(count: number): MealWindow[]  // count 1-5
export function getDefaultMealsForModel(model: MealModel): MealWindow[] // '3meals'|'5meals'|'2meals'|'if16_8'|'if18_6'
export type MealModel = '3meals' | '5meals' | '2meals' | 'if16_8' | 'if18_6';
```

The wizard builds `mealSettings` at line 668-693:
```ts
const mealModelMap: Record<number, string> = { 2: '2meals', 4: '4meals', 5: '5meals' };
const effectiveMealModel = mealModel ?? mealModelMap[mealCount];
const mealSettings = getDefaultMealSettings();
mealSettings.mealCount = mealCount;
if (effectiveMealModel) mealSettings.mealModel = effectiveMealModel as any;
// ← meals array stays as 3meals default regardless of selection
await saveMealSettings(mealSettings);
```

Note: `mealModelMap` includes `'4meals'` which is NOT a valid `MealModel`. For count=4, `effectiveMealModel` becomes `'4meals'` and is NOT in VALID_MODELS, so it correctly falls through to `getDefaultMealsForCount(4)`. The `mealSettings.mealModel` assignment also needs to be guarded — otherwise `'4meals'` gets persisted as the model string, corrupting stored data.

The valid `MealModel` values are: `'3meals' | '5meals' | '2meals' | 'if16_8' | 'if18_6'`.

- [ ] **Step 1: Write the failing test**

Add to `PersonalFit/src/app/utils/buildIngredientSelection.test.ts`:
```ts
import {
  getDefaultMealsForCount,
  getDefaultMealsForModel,
} from '../backend/services/UserProfileService';

describe('meal window defaults', () => {
  it('getDefaultMealsForCount returns correct count for each value', () => {
    expect(getDefaultMealsForCount(1)).toHaveLength(1);
    expect(getDefaultMealsForCount(2)).toHaveLength(2);
    expect(getDefaultMealsForCount(3)).toHaveLength(3);
    expect(getDefaultMealsForCount(4)).toHaveLength(4);
    expect(getDefaultMealsForCount(5)).toHaveLength(5);
  });

  it('getDefaultMealsForModel returns windows with startTime and endTime', () => {
    const meals = getDefaultMealsForModel('if16_8');
    expect(meals).toHaveLength(1);
    expect(meals[0].startTime).toBeDefined();
    expect(meals[0].endTime).toBeDefined();
  });

  it('wizard meal settings helper: count=3 gives 3meals windows', () => {
    // Simulate the wizard logic after the fix
    const VALID_MODELS = ['3meals', '5meals', '2meals', 'if16_8', 'if18_6'];
    const mealCount = 3;
    const effectiveMealModel: string | undefined = undefined; // no IF selected
    const resolvedModel = (effectiveMealModel && VALID_MODELS.includes(effectiveMealModel))
      ? effectiveMealModel
      : undefined;
    const meals = resolvedModel
      ? getDefaultMealsForModel(resolvedModel as any)
      : getDefaultMealsForCount(mealCount);
    expect(meals).toHaveLength(3);
  });

  it('wizard meal settings helper: IF 16:8 gives 1 eating window', () => {
    const VALID_MODELS = ['3meals', '5meals', '2meals', 'if16_8', 'if18_6'];
    const mealCount = 1;
    const effectiveMealModel = 'if16_8';
    const resolvedModel = (effectiveMealModel && VALID_MODELS.includes(effectiveMealModel))
      ? effectiveMealModel
      : undefined;
    const meals = resolvedModel
      ? getDefaultMealsForModel(resolvedModel as any)
      : getDefaultMealsForCount(mealCount);
    expect(meals).toHaveLength(1);
    expect(meals[0].startTime).toBe('12:00');
  });
});
```

- [ ] **Step 2: Run tests — all 4 new tests should already PASS**

These tests exercise the service helpers and simulate the fix logic inline, so they pass immediately (no red phase needed — the functions being tested are already in the service). The TDD value here is the regression guard for future changes.

```bash
cd PersonalFit && npx vitest run --reporter=verbose 2>&1 | tail -20
```
Expected: 13 tests PASS (9 existing + 4 new).

- [ ] **Step 3: Update the import in ProfileSetupWizard.tsx (line 29)**

Change:
```ts
import { saveUserProfile, getDefaultMealSettings, saveMealSettings } from '../../backend/services/UserProfileService';
```
To:
```ts
import {
  saveUserProfile,
  getDefaultMealSettings,
  saveMealSettings,
  getDefaultMealsForModel,
  getDefaultMealsForCount,
  type MealModel,
} from '../../backend/services/UserProfileService';
```

- [ ] **Step 4: Fix the mealSettings build in ProfileSetupWizard.tsx (lines ~668-693)**

The existing code (lines ~668-693):
```ts
const mealModelMap: Record<number, string> = { 2: '2meals', 4: '4meals', 5: '5meals' };
const effectiveMealModel = mealModel ?? mealModelMap[mealCount]; // IF model takes priority

// 1. Save profile
const mealSettings = getDefaultMealSettings();
mealSettings.mealCount = mealCount;
if (effectiveMealModel) mealSettings.mealModel = effectiveMealModel as any;

await saveUserProfile({ ... mealSettings, ... });
await saveMealSettings(mealSettings);
```

Replace the `if (effectiveMealModel) mealSettings.mealModel = effectiveMealModel as any;` line AND add the meals population so both assignments use the same VALID_MODELS guard:

```ts
const VALID_MODELS: MealModel[] = ['3meals', '5meals', '2meals', 'if16_8', 'if18_6'];
const resolvedModel = (effectiveMealModel && VALID_MODELS.includes(effectiveMealModel as MealModel))
  ? effectiveMealModel as MealModel
  : undefined;
// Guard mealModel: only persist valid model strings (e.g. '4meals' is not valid)
if (resolvedModel) mealSettings.mealModel = resolvedModel;
mealSettings.meals = resolvedModel
  ? getDefaultMealsForModel(resolvedModel)
  : getDefaultMealsForCount(mealCount);
```

The final block should look like:
```ts
const mealModelMap: Record<number, string> = { 2: '2meals', 4: '4meals', 5: '5meals' };
const effectiveMealModel = mealModel ?? mealModelMap[mealCount];

const mealSettings = getDefaultMealSettings();
mealSettings.mealCount = mealCount;

const VALID_MODELS: MealModel[] = ['3meals', '5meals', '2meals', 'if16_8', 'if18_6'];
const resolvedModel = (effectiveMealModel && VALID_MODELS.includes(effectiveMealModel as MealModel))
  ? effectiveMealModel as MealModel
  : undefined;
if (resolvedModel) mealSettings.mealModel = resolvedModel;
mealSettings.meals = resolvedModel
  ? getDefaultMealsForModel(resolvedModel)
  : getDefaultMealsForCount(mealCount);
```

- [ ] **Step 5: Run tests to verify they still pass**

```bash
cd PersonalFit && npx vitest run --reporter=verbose 2>&1 | tail -20
```
Expected: all 13 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx PersonalFit/src/app/utils/buildIngredientSelection.test.ts
git commit -m "fix: save default meal windows in wizard based on selected meal model/count"
```

---

## Task 2: Add translations for meal schedule settings row

**Files:**
- Modify: `PersonalFit/src/app/translations/index.ts`

### Context

`translations/index.ts` is a large nested object with 3 language sections (HU ~line 507, EN ~line 2032, RO ~line 3483). The profile section uses keys like `t('profile.sectionPlan')`.

The `SettingsCard` section title needs: `sectionMealSchedule`
The `SettingsRow` title needs: `mealScheduleTitle`
The `SettingsRow` right link text needs: `mealScheduleLink`
The `SettingsRow` subtitle (showing meal count) is built in code using `t('profile.mealScheduleSubtitle').replace('{n}', String(mealCount))`.

- [ ] **Step 1: Add HU keys** — find the HU profile block (around line 507). The HU block has `sectionPlan: 'Tervem'` followed by `sectionAppearance` (may be absent in HU) then `sectionLanguage`. Add the new keys after `sectionPlan: 'Tervem',`:

```ts
sectionMealSchedule: 'Étkezési rend',
mealScheduleTitle: 'Étkezési ütemterv',
mealScheduleSubtitle: '{n} étkezés naponta',
mealScheduleLink: 'Szerkesztés ›',
```

- [ ] **Step 2: Add EN keys** — find the EN profile block (around line 2032) and add after `sectionPlan: 'My Plan',`:

```ts
sectionMealSchedule: 'Meal Schedule',
mealScheduleTitle: 'Meal timetable',
mealScheduleSubtitle: '{n} meals per day',
mealScheduleLink: 'Edit ›',
```

- [ ] **Step 3: Add RO keys** — find the RO profile block (around line 3483) and add after `sectionPlan: 'Planul meu',`:

```ts
sectionMealSchedule: 'Program mese',
mealScheduleTitle: 'Orar mese',
mealScheduleSubtitle: '{n} mese pe zi',
mealScheduleLink: 'Editează ›',
```

- [ ] **Step 4: Run build to verify no TS errors**

```bash
cd PersonalFit && npm run build 2>&1 | tail -8
```
Expected: `✓ built in X.Xs` with no errors.

- [ ] **Step 5: Commit**

```bash
git add PersonalFit/src/app/translations/index.ts
git commit -m "feat: add meal schedule translation keys (HU/EN/RO)"
```

---

## Task 3: Add meal schedule card to Profile → Settings tab

**Files:**
- Modify: `PersonalFit/src/app/features/profile/components/Profile.tsx`

### Context

`Profile.tsx` contains a `SettingsTabContent` function component (starting around line 1183). It currently:
- Receives props including `appData`, `onUploadOpen`, `navigate` etc.
- Has local state: `trial` (loaded via `useEffect`)
- Renders several `SettingsCard` blocks: Plan, Language, Subscription, Other, Account

The pattern for loading local data is:
```tsx
const [trial, setTrial] = useState({ daysUsed: 0, ... });
useEffect(() => { getTrialInfo().then(setTrial); }, []);
```

The `SettingsRow` component (defined lower in the file) takes: `title`, `subtitle?`, `rightText?`, `onClick?`.

The `navigate` is already available via `useNavigate()` inside `SettingsTabContent`.

The existing import at line 31:
```ts
import { getUserProfile, saveUserProfile } from "../../../backend/services/UserProfileService";
```

- [ ] **Step 1: Add `getMealSettings` to the UserProfileService import in Profile.tsx**

Find (line ~31):
```ts
import { getUserProfile, saveUserProfile } from "../../../backend/services/UserProfileService";
```
Change to:
```ts
import { getUserProfile, saveUserProfile, getMealSettings } from "../../../backend/services/UserProfileService";
```

- [ ] **Step 2: Add meal count state in `SettingsTabContent`**

In `SettingsTabContent`, right after:
```tsx
const [trial, setTrial] = useState({ daysUsed: 0, daysRemaining: TRIAL_DAYS, isExpired: false, startDate: '' });
useEffect(() => { getTrialInfo().then(setTrial); }, []);
```

Add:
```tsx
const [mealCount, setMealCount] = useState(3);
useEffect(() => { getMealSettings().then(s => setMealCount(s.mealCount ?? 3)); }, []);
```

- [ ] **Step 3: Add the `SettingsCard` for meal schedule**

Insert a new card **between** `sectionPlan` SettingsCard and `sectionLanguage` SettingsCard.

Find:
```tsx
      {/* Section 3: Language */}
      <SettingsCard sectionTitle={t('profile.sectionLanguage')}>
```

Insert before it:
```tsx
      {/* Section 2: Meal Schedule */}
      <SettingsCard sectionTitle={t('profile.sectionMealSchedule')}>
        <SettingsRow
          title={t('profile.mealScheduleTitle')}
          subtitle={t('profile.mealScheduleSubtitle').replace('{n}', String(mealCount))}
          rightText={t('profile.mealScheduleLink')}
          onClick={() => navigate('/meal-intervals')}
        />
      </SettingsCard>
```

- [ ] **Step 4: Run build to verify no TS errors**

```bash
cd PersonalFit && npm run build 2>&1 | tail -8
```
Expected: `✓ built in X.Xs` with no errors.

- [ ] **Step 5: Manual verification**

1. Open `http://localhost:5180`
2. Navigate to Profile → Settings tab
3. Verify "Étkezési rend" section appears between "Tervem" and "Nyelv"
4. Verify the subtitle shows "3 étkezés naponta" (or user's actual count)
5. Tap "Szerkesztés ›" → verify it opens the `MealIntervalEditor` page
6. Change meal count in the editor → save → navigate back → verify subtitle updates

- [ ] **Step 6: Commit**

```bash
git add PersonalFit/src/app/features/profile/components/Profile.tsx
git commit -m "feat: add meal schedule settings row to Profile settings tab"
```

---

## Final

- [ ] Run full test suite: `cd PersonalFit && npx vitest run`
- [ ] Expected: all 13 tests pass
- [ ] Push: `git push`
