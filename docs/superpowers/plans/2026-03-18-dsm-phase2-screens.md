# DSM Phase 2 — Screen Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the DSM foundation to all screen components — eliminate gradient buttons/headers, dark: classes, hardcoded colors, and non-DSM patterns; any new repeated element gets added to DSM before use.

**Architecture:** DSM-first rule: new reusable components go into DSM files (index.tsx / atoms.tsx / molecules.tsx) BEFORE they appear in screens. Screens import only from DSM + feature-specific logic. Each task is atomic: touches one file group, produces a clean build.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS v4, Lucide icons, Framer Motion (existing)

**DSM files:**
- `PersonalFit/src/app/components/dsm/index.tsx` — tokens + primitives + layout + composite
- `PersonalFit/src/app/components/dsm/atoms.tsx` — DSMText, DSMChip, DSMAvatar, DSMEmptyState, etc.
- `PersonalFit/src/app/components/dsm/molecules.tsx` — DSMListItem, DSMMetricCard, DSMNutritionBar, etc.
- `PersonalFit/src/app/components/dsm/ux-patterns.tsx` — DSMBottomSheet, DSMProgressSteps, etc.

**Build verification:** `cd PersonalFit && npx vite build --mode development 2>&1 | tail -5`

---

## Task 1: New DSM components — DSMTabList, DSMMealCard, DSMPremiumCard

> These three patterns appear in multiple screens. Add to DSM BEFORE touching any screen.

**Files:**
- Modify: `PersonalFit/src/app/components/dsm/molecules.tsx`

### What to add

#### DSMTabList
Replaces `TabFilter`, custom food category tabs, meal type selectors.

```tsx
interface DSMTabListProps {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}

export function DSMTabList({ tabs, value, onChange, variant = 'pill', className }: DSMTabListProps) {
  if (variant === 'underline') {
    return (
      <div className={`flex border-b border-border ${className ?? ''}`}>
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
              ${value === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={`flex gap-2 flex-wrap ${className ?? ''}`}>
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${value === tab.value
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

#### DSMMealCard
Replaces per-screen food/meal card patterns in Foods, UnifiedMenu, LogMeal.

```tsx
interface DSMMealCardProps {
  title: string;
  subtitle?: string;
  calories?: number;
  macros?: { protein?: number; carbs?: number; fat?: number };
  imageUrl?: string;
  emoji?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  className?: string;
}

export function DSMMealCard({ title, subtitle, calories, macros, imageUrl, emoji, onPress, trailing, className }: DSMMealCardProps) {
  return (
    <div
      onClick={onPress}
      className={`flex items-center gap-3 p-3 bg-background rounded-xl border border-border ${onPress ? 'active:bg-gray-50 cursor-pointer' : ''} ${className ?? ''}`}
    >
      {(imageUrl || emoji) && (
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {imageUrl
            ? <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            : <span className="text-2xl">{emoji}</span>
          }
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        {(calories != null || macros) && (
          <div className="flex items-center gap-2 mt-1">
            {calories != null && <span className="text-xs text-gray-500">{calories} kcal</span>}
            {macros?.protein != null && <span className="text-xs text-blue-600">P {macros.protein}g</span>}
            {macros?.carbs != null && <span className="text-xs text-amber-600">C {macros.carbs}g</span>}
            {macros?.fat != null && <span className="text-xs text-rose-500">F {macros.fat}g</span>}
          </div>
        )}
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </div>
  );
}
```

#### DSMPremiumCard
Replaces subscription plan cards in SubscriptionScreen, Checkout, PlanSetupScreen.

```tsx
interface DSMPremiumCardProps {
  title: string;
  description?: string;
  price?: string;
  period?: string;
  badge?: string;
  features?: string[];
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

export function DSMPremiumCard({ title, description, price, period, badge, features, selected, onPress, className }: DSMPremiumCardProps) {
  return (
    <div
      onClick={onPress}
      className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer
        ${selected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-gray-300'}
        ${className ?? ''}`}
    >
      {badge && (
        <span className="absolute -top-2.5 left-4 bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading font-semibold text-foreground">{title}</h3>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
        {price && (
          <div className="text-right flex-shrink-0">
            <span className="text-lg font-bold text-foreground">{price}</span>
            {period && <span className="text-xs text-gray-500 block">{period}</span>}
          </div>
        )}
      </div>
      {features && features.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">✓</span>
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 1: Add DSMTabList, DSMMealCard, DSMPremiumCard to molecules.tsx**
  (Note: `molecules.tsx` is re-exported by `index.tsx` via `export * from "./molecules"` — no change to index.tsx needed for these three components.)

  Open `PersonalFit/src/app/components/dsm/molecules.tsx`, append the three components above at the end of the file (before the closing, after the last export).

- [ ] **Step 1b: Add `export * from "./ux-patterns"` to index.tsx**

  Open `PersonalFit/src/app/components/dsm/index.tsx`. Find the section at the bottom where atoms and molecules are re-exported (look for `export * from "./atoms"` and/or `export * from "./molecules"`). Add:
  ```ts
  export * from "./ux-patterns";
  ```
  This makes `DSMProgressSteps`, `DSMBottomSheet`, etc. importable via `../dsm` without a direct path.

- [ ] **Step 2: Verify build**

  ```bash
  cd PersonalFit && npx vite build --mode development 2>&1 | tail -5
  ```
  Expected: `✓ built in` — zero TypeScript errors.

- [ ] **Step 3: Commit**

  ```bash
  git add PersonalFit/src/app/components/dsm/molecules.tsx \
           PersonalFit/src/app/components/dsm/index.tsx
  git commit -m "feat(dsm): add DSMTabList, DSMMealCard, DSMPremiumCard; re-export ux-patterns from index"
  ```

---

## Task 2: Onboarding screens — LoginScreen, OnboardingScreen, TermsScreen

**Files:**
- Modify: `PersonalFit/src/app/components/onboarding/LoginScreen.tsx`
- Modify: `PersonalFit/src/app/components/onboarding/OnboardingScreen.tsx`
- Modify: `PersonalFit/src/app/components/onboarding/TermsScreen.tsx`

**Rules:**
- Replace all gradient buttons (`from-emerald-*`, `from-teal-*`, etc.) → `<DSMButton variant="primary">`
- Replace gradient backgrounds on containers → `bg-background` or `bg-surface`
- Replace hardcoded `border-emerald-500` focus rings → `border-primary`
- Replace custom title/icon gradient → flat `text-primary` with Lucide icon
- Remove all `dark:` classes
- Import from `../dsm` (which re-exports everything)

**LoginScreen specifics:**
- Logo: remove gradient ring, use plain `bg-primary/10 text-primary` container
- "Sign in" button: `<DSMButton variant="primary" className="w-full">`
- Input fields: `<DSMInput>` with `label` prop
- Social login buttons: `<DSMButton variant="secondary" className="w-full">`

**OnboardingScreen specifics:**
- Each slide: white background, large emoji centered, `text-h1 font-heading` title, `text-gray-500` subtitle
- Progress dots: keep custom, but use `bg-primary` for active dot, `bg-gray-200` for inactive
- "Next" button: `<DSMButton variant="primary" className="w-full">`
- "Skip" link: `<DSMButton variant="ghost">`
- Remove slide gradient backgrounds entirely → `bg-background`

**TermsScreen specifics:**
- Remove gradient header → flat `bg-background border-b border-border`
- "Accept" button → `<DSMButton variant="primary" className="w-full">`
- "Decline" link → `<DSMButton variant="ghost">`

- [ ] **Step 1: Migrate LoginScreen.tsx** — remove gradient, use DSMButton + DSMInput
- [ ] **Step 2: Migrate OnboardingScreen.tsx** — remove slide gradients, use DSMButton
- [ ] **Step 3: Migrate TermsScreen.tsx** — remove gradient header, use DSMButton
- [ ] **Step 4: Verify build** — `cd PersonalFit && npx vite build --mode development 2>&1 | tail -5`
- [ ] **Step 5: Commit**

  ```bash
  git add PersonalFit/src/app/components/onboarding/LoginScreen.tsx \
           PersonalFit/src/app/components/onboarding/OnboardingScreen.tsx \
           PersonalFit/src/app/components/onboarding/TermsScreen.tsx
  git commit -m "feat(screens): migrate onboarding screens to DSM — remove gradients"
  ```

---

## Task 3: Onboarding screens — PlanSetupScreen, SubscriptionScreen, ProfileSetupWizard

**Files:**
- Modify: `PersonalFit/src/app/components/onboarding/PlanSetupScreen.tsx`
- Modify: `PersonalFit/src/app/components/onboarding/SubscriptionScreen.tsx`
- Modify: `PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx`

**Rules:**
- Use `<DSMPremiumCard>` (added in Task 1) for all plan/option cards
- Replace gradient badges → `<DSMTag>` from atoms.tsx
- Replace custom feature lists → `<DSMFeatureRow>` from molecules.tsx
- Replace gradient header area → `<AppHeader title="..." />` or plain page title
- Progress indicators → `<DSMProgressSteps>` from ux-patterns.tsx
- "Next" / "Continue" buttons → `<DSMButton variant="primary" className="w-full">`
- Remove `from-[var(--color-primary-50)]` gradient backgrounds → `bg-background`
- Remove `bg-gradient-to-r from-[#3366FF] to-[#12CFA6]` badges → `bg-primary text-white rounded-full`
- Remove all `dark:` classes

**PlanSetupScreen specifics:**
- "Upload plan" card + "Manual" card → two `<DSMPremiumCard>` with `selected` state
- Feature chips on each card → `<DSMChip>` from atoms.tsx

**SubscriptionScreen specifics:**
- Free / Premium / Annual plans → `<DSMPremiumCard>` per plan, `selected` on active
- Feature rows → `<DSMFeatureRow icon={<Check />}>`
- Price display → `<DSMPriceDisplay>` from molecules.tsx

**ProfileSetupWizard specifics:**
> Note: `ProfileSetupWizard.tsx` is a **new file** (untracked `??` in git status). Write it DSM-first from scratch — no gradients or dark: classes should ever appear in it.
- Multi-step form → `<DSMProgressSteps>` at top
- Each step uses `<DSMInput>` + `<DSMCard>` wrappers
- Gender/goal selector pills → `<DSMTabList variant="pill">`
- "Next" → `<DSMButton variant="primary" className="w-full">`

- [ ] **Step 1: Migrate PlanSetupScreen.tsx** — DSMPremiumCard, remove gradients
- [ ] **Step 2: Migrate SubscriptionScreen.tsx** — DSMPremiumCard, DSMFeatureRow, DSMPriceDisplay
- [ ] **Step 3: Write ProfileSetupWizard.tsx DSM-first** — DSMProgressSteps, DSMInput, DSMTabList (new file, no existing code to migrate)
- [ ] **Step 4: Verify build**
- [ ] **Step 5: Commit**

  ```bash
  git add PersonalFit/src/app/components/onboarding/PlanSetupScreen.tsx \
           PersonalFit/src/app/components/onboarding/SubscriptionScreen.tsx \
           PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx
  git commit -m "feat(screens): migrate plan setup + subscription + profile wizard to DSM"
  ```

---

## Task 4: UnifiedMenu screen

**Files:**
- Modify: `PersonalFit/src/app/features/menu/components/UnifiedMenu.tsx`
- Modify: `PersonalFit/src/app/features/menu/components/MealDetail.tsx`
- Modify: `PersonalFit/src/app/features/menu/components/MealIntervals.tsx`
- Modify: `PersonalFit/src/app/features/menu/components/MealIntervalEditor.tsx`
- Modify: `PersonalFit/src/app/features/menu/components/MealNamer.tsx`

**Rules:**
- Remove ALL `dark:` classes (highest count: 166)
- Replace custom date strip / calendar header → keep logic but replace styling: `bg-background border-b border-border`
- Active date pill: `bg-primary text-white rounded-full`
- Meal type tabs (Breakfast/Lunch/Dinner/Snack) → `<DSMTabList variant="underline">`
- Each meal item in list → `<DSMMealCard>` (added in Task 1)
- Replace custom "generate plan" CTA button → `<DSMButton variant="primary">`
- Empty state → `<DSMEmptyState>` from atoms.tsx
- MealDetail: replace gradient header → `<DSMSubPageHeader title="..." onBack={...} />`
- MealNamer + MealIntervalEditor: use `<DSMInput>`, `<DSMButton>`
- Replace `text-[#12CFA6]` / `text-emerald-*` with `text-primary` or `text-success`
- No gradient anywhere

- [ ] **Step 1: Migrate UnifiedMenu.tsx** — remove dark:, use DSMTabList + DSMMealCard
- [ ] **Step 2: Migrate MealDetail.tsx** — DSMSubPageHeader, remove dark:
- [ ] **Step 3: Migrate MealIntervals.tsx + MealIntervalEditor.tsx + MealNamer.tsx** — DSMInput, DSMButton
- [ ] **Step 4: Verify build**
- [ ] **Step 5: Commit**

  ```bash
  git add PersonalFit/src/app/features/menu/components/
  git commit -m "feat(screens): migrate UnifiedMenu + meal components to DSM"
  ```

---

## Task 5: Foods & Nutrition screen

**Files:**
- Modify: `PersonalFit/src/app/features/nutrition/components/Foods.tsx`
- Modify: `PersonalFit/src/app/components/LogMeal.tsx`
- Modify: `PersonalFit/src/app/components/ManualMealInput.tsx`
- Modify: `PersonalFit/src/app/components/MonthlyMenu.tsx`

**Rules:**
- Foods category tabs → `<DSMTabList variant="pill">`
- Food list items → `<DSMMealCard>` with `trailing` for add/bookmark button as `<DSMIconButton>`
- Search bar → `<DSMInput>` with leading search icon (or existing `<SearchBar>` if already DSM)
- Macro totals strip → `<DSMNutritionBar>` from molecules.tsx
- Empty state → `<DSMEmptyState>`
- Remove all `dark:` classes
- LogMeal: form fields → `<DSMInput label="...">`, submit → `<DSMButton variant="primary">`
- ManualMealInput: form fields → `<DSMInput label="...">`, submit → `<DSMButton variant="primary">`
- MonthlyMenu: replace custom month header → flat `bg-background` with month label in `text-h2 font-heading`

- [ ] **Step 1: Migrate Foods.tsx** — DSMTabList, DSMMealCard, remove dark:
- [ ] **Step 2: Migrate LogMeal.tsx** — DSMInput, DSMButton, remove dark:
- [ ] **Step 3: Migrate ManualMealInput.tsx** — DSMInput, DSMButton, remove dark:
- [ ] **Step 4: Migrate MonthlyMenu.tsx** — remove gradient header, remove dark:
- [ ] **Step 5: Verify build**
- [ ] **Step 6: Commit**

  ```bash
  git add PersonalFit/src/app/features/nutrition/components/Foods.tsx \
           PersonalFit/src/app/components/LogMeal.tsx \
           PersonalFit/src/app/components/ManualMealInput.tsx \
           PersonalFit/src/app/components/MonthlyMenu.tsx
  git commit -m "feat(screens): migrate Foods + LogMeal + ManualMealInput + MonthlyMenu to DSM"
  ```

---

## Task 6: Profile screen

**Files:**
- Modify: `PersonalFit/src/app/features/profile/components/Profile.tsx`
- Modify: `PersonalFit/src/app/components/ProfileHeader.tsx` (if exists)

**Rules (highest priority — 138 dark: classes):**
- Profile header: remove gradient background → `bg-background`, avatar stays, name in `text-h1 font-heading`
- Remove dark mode toggle UI entirely (it is now a no-op; no need to show it)
- Section headers (Adatok / Haladás / Fiókok) → `<DSMSectionTitle>` from index.tsx
- Setting rows → `<DSMListItem>` from molecules.tsx with trailing `<ChevronRight>` icon
- Stats (weight, height, goal, calories) → `<DSMStatCard>` or `<DSMMetricCard>` from index.tsx / molecules.tsx
- Language selector: keep logic, style with `<DSMCard>` + `<DSMTabList variant="pill">`
- Subscription badge → `<DSMTag variant="trial">` or `<DSMTag variant="active">`
- "Log out" → `<DSMButton variant="danger">`
- Remove ALL `dark:` classes (138 occurrences)
- Remove all hardcoded colors

- [ ] **Step 1: Migrate Profile.tsx** — remove dark:, DSMSectionTitle, DSMListItem, DSMStatCard, remove dark mode toggle, DSMButton
- [ ] **Step 2: Verify build**
- [ ] **Step 3: Commit**

  ```bash
  git add PersonalFit/src/app/features/profile/components/Profile.tsx
  git commit -m "feat(screens): migrate Profile to DSM — remove dark mode toggle + gradients"
  ```

---

## Task 7: Workout screens

**Files:**
- Modify: `PersonalFit/src/app/features/workout/components/Workout.tsx`
- Modify: `PersonalFit/src/app/features/workout/components/WorkoutCalendar.tsx`

**Rules:**
- Replace custom workout card (exercise name + sets + reps) → `<DSMMealCard>` adapted or `<DSMListItem>` with trailing
- Metric cards (duration, calories, distance) → `<DSMMetricCard>`
- Category filter (Chest, Back, etc.) → `<DSMTabList variant="pill">`
- "Start workout" / "Add exercise" CTA → `<DSMButton variant="primary">`
- Empty state → `<DSMEmptyState>`
- WorkoutCalendar: week strip → same pattern as UnifiedMenu date strip, `bg-background border-b`
- Active day → `bg-primary text-white rounded-full`
- Remove ALL `dark:` classes (76 in Workout, additional in WorkoutCalendar)

- [ ] **Step 1: Migrate Workout.tsx** — DSMTabList, DSMMetricCard, DSMListItem, remove dark:
- [ ] **Step 2: Migrate WorkoutCalendar.tsx** — remove dark:, flat date strip
- [ ] **Step 3: Verify build**
- [ ] **Step 4: Commit**

  ```bash
  git add PersonalFit/src/app/features/workout/components/Workout.tsx \
           PersonalFit/src/app/features/workout/components/WorkoutCalendar.tsx
  git commit -m "feat(screens): migrate Workout + WorkoutCalendar to DSM"
  ```

---

## Task 8: Body Vision screens

**Files:**
- Modify: `PersonalFit/src/app/components/body-vision/BodyVision3D.tsx`
- Modify: `PersonalFit/src/app/components/body-vision/BodyVisionARViewer.tsx`
- Modify: `PersonalFit/src/app/components/body-vision/BodyVisionArchive.tsx`
- Modify: `PersonalFit/src/app/components/body-vision/BodyVisionArchiveViewer.tsx`
- Modify: `PersonalFit/src/app/components/body-vision/BodyVisionCompare.tsx`
- Modify: `PersonalFit/src/app/components/body-vision/BodyVisionControls.tsx`
- Modify: `PersonalFit/src/app/components/body-vision/BodyVisionFullscreen.tsx`
- Modify: `PersonalFit/src/app/components/body-vision/BodyVisionStatsPanel.tsx`

**Rules:**
- Remove ALL `dark:` classes from all 8 files
- Sub-page headers → `<DSMSubPageHeader title="..." onBack={...} />` (replace any custom back-button header)
- Control buttons (zoom, rotate, etc.) → `<DSMIconButton>`
- Stats panels → `<DSMStatCard>` or `<DSMMetricCard>`
- Compare view: use `<DSMCard>` wrappers, `border-primary` for selected state
- Archive list items → `<DSMListItem>` with date trailing
- Gradient buttons → `<DSMButton variant="primary">` or `<DSMButton variant="ghost">`
- No hardcoded hex colors — map all to DSM token classes

- [ ] **Step 1: Migrate BodyVision3D.tsx + BodyVisionARViewer.tsx + BodyVisionFullscreen.tsx** — remove dark:, use DSMSubPageHeader, DSMIconButton
- [ ] **Step 2: Migrate BodyVisionArchive.tsx + BodyVisionArchiveViewer.tsx + BodyVisionCompare.tsx** — remove dark:, use DSMListItem, DSMCard, DSMSubPageHeader
- [ ] **Step 3: Migrate BodyVisionControls.tsx + BodyVisionStatsPanel.tsx** — remove dark:, use DSMIconButton, DSMStatCard
- [ ] **Step 4: Verify build**
- [ ] **Step 5: Commit**

  ```bash
  git add PersonalFit/src/app/components/body-vision/
  git commit -m "feat(screens): migrate all BodyVision screens to DSM — remove dark: classes"
  ```

---

## Task 9: Shopping, Upload sheets, Support screens

**Files:**
- Modify: `PersonalFit/src/app/features/shopping/components/ShoppingList.tsx`
- Modify: `PersonalFit/src/app/components/DataUploadSheet.tsx`
- Modify: `PersonalFit/src/app/components/BodyCompositionUploadSheet.tsx`
- Modify: `PersonalFit/src/app/components/ImportProgressUI.tsx`
- Modify: `PersonalFit/src/app/components/AboutPage.tsx`
- Modify: `PersonalFit/src/app/components/ContactPage.tsx`
- Modify: `PersonalFit/src/app/components/FAQPage.tsx`
- Modify: `PersonalFit/src/app/components/Checkout.tsx`
- Modify: `PersonalFit/src/app/components/EmptyState.tsx`
- Modify: `PersonalFit/src/app/components/MergeConflictDialog.tsx`
- Modify: `PersonalFit/src/app/components/PipelineDiagnostics.tsx`

**Rules:**
- ShoppingList: list items → `<DSMListItem>` with checkbox trailing; section headers → `<DSMSectionTitle>`;
  empty state → `<DSMEmptyState>`; remove dark:
- DataUploadSheet + BodyCompositionUploadSheet: already use DSMBottomSheet, just remove remaining dark:
  and gradient buttons → `<DSMButton variant="primary">`
- ImportProgressUI: progress bar → `<DSMProgressBar>`; status text → DSM color tokens
- AboutPage / ContactPage / FAQPage: `<AppHeader title="...">`, `<DSMCard>` wrappers,
  links → `text-primary`, remove dark:
- Checkout: plan cards → `<DSMPremiumCard>`; pay button → `<DSMButton variant="primary" className="w-full">`
- EmptyState: replace any hardcoded colors → map to `<DSMEmptyState>` pattern
- MergeConflictDialog: already uses DSMModal, ensure buttons use `<DSMButton>` variants
- PipelineDiagnostics: developer tool screen — remove dark: classes, use `<DSMCard>` wrappers, `<DSMSectionTitle>` for sections, no gradient

- [ ] **Step 1: Migrate ShoppingList.tsx** — DSMListItem, DSMSectionTitle, DSMEmptyState, remove dark:
- [ ] **Step 2: Migrate DataUploadSheet.tsx + BodyCompositionUploadSheet.tsx** — remove dark: + gradient buttons
- [ ] **Step 3: Migrate ImportProgressUI.tsx + EmptyState.tsx + MergeConflictDialog.tsx + PipelineDiagnostics.tsx**
- [ ] **Step 4: Migrate AboutPage.tsx + ContactPage.tsx + FAQPage.tsx + Checkout.tsx**
- [ ] **Step 5: Verify build**
- [ ] **Step 6: Commit**

  ```bash
  git add PersonalFit/src/app/features/shopping/components/ShoppingList.tsx \
           PersonalFit/src/app/components/DataUploadSheet.tsx \
           PersonalFit/src/app/components/BodyCompositionUploadSheet.tsx \
           PersonalFit/src/app/components/ImportProgressUI.tsx \
           PersonalFit/src/app/components/AboutPage.tsx \
           PersonalFit/src/app/components/ContactPage.tsx \
           PersonalFit/src/app/components/FAQPage.tsx \
           PersonalFit/src/app/components/Checkout.tsx \
           PersonalFit/src/app/components/EmptyState.tsx \
           PersonalFit/src/app/components/MergeConflictDialog.tsx \
           PersonalFit/src/app/components/PipelineDiagnostics.tsx
  git commit -m "feat(screens): migrate shopping, sheets, support pages to DSM"
  ```

---

## Task 10: Final cleanup — remove PageHeader gradient props, TabFilter, residual dark:

**Files:**
- Modify: all files that still pass `gradientFrom`/`gradientTo` to `<PageHeader>` (9 callers — find with grep)
- Modify: `PersonalFit/src/app/components/PageHeader.tsx` — remove gradient props from interface, simplify to flat header
- Modify: `PersonalFit/src/app/components/TabFilter.tsx` — replace internals with `<DSMTabList variant="underline">`, keep same external API for backward compat (or redirect to DSMTabList)
- Modify: `PersonalFit/src/app/shared/components/PageFooter.tsx` — remove `dark:bg-card dark:border-border` → use `bg-background border-border`
- Verify: `grep -r "dark:" PersonalFit/src/app --include="*.tsx" | wc -l` → must be 0
- Verify: `grep -r "from-emerald\|from-teal\|from-violet\|from-orange\|from-purple\|bg-gradient" PersonalFit/src/app --include="*.tsx" | wc -l` → must be 0

- [ ] **Step 1: Find all gradient prop callers**

  ```bash
  grep -r "gradientFrom\|gradientTo\|gradient" PersonalFit/src/app --include="*.tsx" -l
  ```

- [ ] **Step 2: Remove gradient props from those callers** (just delete the props — they're already no-ops)

- [ ] **Step 3: Simplify PageHeader.tsx** — remove gradient interface props entirely

- [ ] **Step 4: Update TabFilter.tsx** to wrap DSMTabList internally

- [ ] **Step 5: Verify zero dark: classes remain**

  ```bash
  grep -r "dark:" PersonalFit/src/app --include="*.tsx" | wc -l
  ```
  Expected: `0`

- [ ] **Step 6: Verify zero gradient classes remain**

  ```bash
  grep -r "from-emerald\|from-teal\|from-violet\|from-orange\|bg-gradient-to" PersonalFit/src/app --include="*.tsx" | wc -l
  ```
  Expected: `0`

- [ ] **Step 7: Final build**

  ```bash
  cd PersonalFit && npx vite build --mode development 2>&1 | tail -5
  ```
  Expected: `✓ built in` — zero errors.

- [ ] **Step 8: Commit**

  ```bash
  # Stage PageHeader, TabFilter, plus all caller files modified in Step 2
  git add PersonalFit/src/app/components/PageHeader.tsx \
           PersonalFit/src/app/components/TabFilter.tsx \
           PersonalFit/src/app/shared/components/PageFooter.tsx
  git add -u  # stages all remaining tracked modified files (the gradient prop callers)
  git commit -m "feat(cleanup): remove PageHeader gradient props, update TabFilter → DSMTabList, zero dark: classes"
  ```

---

## Completion Checklist

- [ ] DSM: 3 new components + ux-patterns re-export (Task 1)
- [ ] Onboarding: LoginScreen, OnboardingScreen, TermsScreen (Task 2)
- [ ] Onboarding: PlanSetupScreen, SubscriptionScreen, ProfileSetupWizard (Task 3)
- [ ] Menu: UnifiedMenu + 4 meal sub-components (Task 4)
- [ ] Nutrition: Foods, LogMeal, ManualMealInput, MonthlyMenu (Task 5)
- [ ] Profile screen (Task 6)
- [ ] Workout + WorkoutCalendar (Task 7)
- [ ] All 8 BodyVision screens (Task 8)
- [ ] Shopping, sheets, support, PipelineDiagnostics (Task 9)
- [ ] Zero `dark:` classes in `src/app/` (Task 10)
- [ ] Zero gradient classes in `src/app/` (Task 10)
- [ ] Build passes with zero TS errors
- [ ] `@custom-variant dark` can now be removed from `theme.css` (optional final step)
