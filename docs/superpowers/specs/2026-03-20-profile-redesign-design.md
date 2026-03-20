# Profile Page Redesign Design

## Goal

Replace the current three-tab Profile screen (Me / Goals / Settings) with a single scrollable page. Settings moves to a gear icon in the top-right header. All content is arranged vertically in white cards.

## Context

- Current: `Profile.tsx` (2,185 lines) with `DSMProfileTabs` switching between Me, Goals, Settings tabs
- `DSMProfileTabs` is used as a structural wrapper (not just a tab bar) — replacing it means wrapping content in a plain `<div className="flex flex-col gap-3 px-4 py-4 overflow-y-auto">` scroll container
- Chart library already in use: Recharts 2.15.2 (LineChart with dual measured/predicted lines)
- Weight history stored in IndexedDB via `WeightHistoryService`
- All existing data, services, and chart logic are kept — this is a layout/structure change

## Layout (top to bottom)

### Header bar
- Left: "Profilom" title (bold, large)
- Right: ⚙️ gear icon button (tappable) → **opens Settings as a bottom sheet** (no new route; `useState` boolean controls open/close)
- No tab bar below the header

### 1. Avatar card
- Avatar circle (initial letter, gradient teal background, tappable to edit)
- Name (bold, editable inline on tap)
- Age · Gender · Height (subtitle row, values from existing profile fields)
- Birth date and gender remain editable — tapping the subtitle row opens an inline edit form within the card (same fields as current Me tab)

### 2. Weight + chart card
- Large weight number (e.g. **95.5 kg**) top-left, target weight top-right ("Cél: 88 kg · −7.5 kg")
- Recharts LineChart below: gradient fill under measured line, dashed predicted line, dot markers, pulsing "now" dot — all from existing `getChartData()` logic, unchanged
- Month labels below chart
- Tap card → opens existing weight goal editor modal (set target kg + months)

### 3. Body metrics card
- Section label: "TESTMÉRETEK"
- Primary three-column grid (always shown): **BMI · Zsír% · Izom kg** (large bold numbers)
- BMI colour bar below (blue → green → yellow → red gradient, white dot at current BMI)
- GMON-only fields (`visceralFat`, `boneMass`, `waterPercent`, `metabolicAge`) are shown as additional rows **only when they have a non-null value** (i.e. after a GMON upload). They appear below the BMI bar in a two-column grid. When all are null, this section is hidden entirely — no empty placeholders.

### 4. Daily goals card
- Section label: "NAPI CÉLOK"
- Row list with icon badge + label + value, separated by horizontal dividers:
  - 🔥 Kalória — `{dailyCalorieTarget} kcal` → tap opens the existing calorie target editor **plus the macro distribution editor** (both are in the same edit UI)
  - 💧 Víz — `{waterGoalMl / 1000} L` → tap opens existing water goal editor
  - 🏃 Sport / hét — `{weeklyWorkoutGoal}×` → tap opens existing workout frequency selector
  - 🌙 Alvás — display value is **wake time** (e.g. `07:30 ébredés`) from `profile.wakeTime` → tap opens the existing `SleepSetup` component in a bottom sheet

### Settings bottom sheet
- Opened by the ⚙️ gear icon in the header
- Implementation: `SettingsSheet.tsx` renders a bottom sheet (`DSMBottomSheet` or equivalent) containing the settings content
- `SettingsTabContent` is currently a private function inside `Profile.tsx`. It must be **moved to `SettingsSheet.tsx` as the default export**, accepting the same props it currently receives (`profile`, `onLogout`, and the relevant callbacks). These props are passed down from the parent `Profile` component.
- Contains everything from the current Settings tab: plan upload, GMON body composition, subscription, meal schedule, appearance, data management, logout

## What does NOT change

- All data models, services, IndexedDB stores — untouched
- Chart logic (`getChartData`, weight goal editor, dual-line rendering) — untouched
- Goals edit UIs (calorie + macro editor, water goal, sleep setup `SleepSetup`, workout frequency) — untouched
- Bottom navigation bar (Foods / List / My Menu / Sport / Profile)

## Files to change

| File | Change |
|---|---|
| `PersonalFit/src/app/features/profile/components/Profile.tsx` | Remove `DSMProfileTabs` wrapper + tab rendering; replace with single scroll container + 4 cards; add `settingsOpen` state; pass props to `SettingsSheet` |
| `PersonalFit/src/app/features/profile/components/SettingsSheet.tsx` | **New file** — move `SettingsTabContent` here as default export; wrap in bottom sheet |
| `PersonalFit/src/app/components/dsm/ProfileTabs.tsx` | No longer used — leave as-is (do not delete, just stop importing) |
| `PersonalFit/src/app/features/profile/components/ProfileGoalsTab.tsx` (or inline in `Profile.tsx`) | If `SleepSetup` is not already an independently importable component, extract it so it can be opened in a bottom sheet from the Daily goals card |

## Out of scope

- New data fields or metrics not already in the app
- Any backend / API changes
- Routing changes (no new `/settings` route)
