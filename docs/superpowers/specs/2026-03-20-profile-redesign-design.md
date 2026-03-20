# Profile Page Redesign Design

## Goal

Replace the current three-tab Profile screen (Me / Goals / Settings) with a single scrollable page. Settings moves to a gear icon in the top-right header. All content is arranged vertically in white cards.

## Context

- Current: `Profile.tsx` (2,185 lines) with `DSMProfileTabs` switching between Me, Goals, Settings tabs
- Chart library already in use: Recharts 2.15.2 (LineChart with dual measured/predicted lines)
- Weight history stored in IndexedDB via `WeightHistoryService`
- All existing data, services, and chart logic are kept — this is a layout/structure change

## Layout (top to bottom)

### Header bar
- Left: "Profilom" title (bold, large)
- Right: ⚙️ gear icon button (tappable, opens Settings as a bottom sheet or navigates to a Settings screen)
- No tab bar below the header

### 1. Avatar card
- Avatar circle (initial letter, gradient teal background, tappable to edit)
- Name (bold, editable inline on tap)
- Age · Gender · Height (subtitle row)

### 2. Weight + chart card
- Large weight number (e.g. **95.5 kg**) top-left, target weight top-right ("Cél: 88 kg · −7.5 kg")
- Recharts LineChart below: gradient fill under measured line, dashed predicted line, dot markers, pulsing "now" dot
- Month labels below chart (Jan / Feb / Már / Ápr)
- Tap card → opens existing weight goal editor modal (set target kg + months)

### 3. Body metrics card
- Section label: "TESTMÉRETEK"
- Three-column grid: BMI · Zsír% · Izom kg (large bold numbers)
- BMI colour bar below (blue → green → yellow → red gradient, white dot at current BMI)

### 4. Daily goals card
- Section label: "NAPI CÉLOK"
- Row list with icon badge + label + value:
  - 🔥 Kalória — 2051 kcal (editable)
  - 💧 Víz — 3.3 L (editable)
  - 🏃 Sport / hét — 3× (editable)
  - 🌙 Alvás — 07:30 ébredés (editable)
- Horizontal dividers between rows
- Tapping any row opens the existing edit UI (calorie target, water goal, workout frequency, sleep setup)

### Settings (moved out of tabs)
- Gear icon → slides up a bottom sheet (or navigates to `/settings`) containing everything from the current Settings tab:
  - Plan upload, GMON body composition, subscription, meal schedule, appearance, data management, logout

## What does NOT change

- All data models, services, IndexedDB stores — untouched
- Chart logic (`getChartData`, weight goal editor, dual-line rendering) — untouched
- Goals edit UIs (calorie calculator, water goal, sleep setup, workout frequency) — untouched
- Bottom navigation bar (Foods / List / My Menu / Sport / Profile)
- Personal data fields (birth date, gender) — moved into the Avatar card subtitle or a separate tappable row

## Files to change

| File | Change |
|---|---|
| `PersonalFit/src/app/features/profile/components/Profile.tsx` | Replace tab layout with single-scroll layout; extract Settings content into `SettingsSheet.tsx` |
| `PersonalFit/src/app/features/profile/components/SettingsSheet.tsx` | New file — bottom sheet wrapping existing `SettingsTabContent` |
| `PersonalFit/src/app/components/dsm/ProfileTabs.tsx` | No longer used — can be left or removed |

## Out of scope

- New data fields or metrics not already in the app
- Macro distribution editor (stays accessible via Goals edit)
- Any backend / API changes
