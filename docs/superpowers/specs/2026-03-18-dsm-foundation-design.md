# DSM Foundation — Unified Design System

**Date:** 2026-03-18
**Status:** Approved
**Scope:** Phase 1 — Foundation only (tokens, typography, core components). Screen-by-screen application is Phase 2.

---

## Overview

PersonalFit's UI is visually inconsistent: mixed color schemes, two icon libraries, random font sizes, inconsistent button styles, missing backdrop on dialogs, and dark mode cluttering the codebase. This spec defines a clean, professional, light-only design system to replace it.

**Guiding principle:** Professionalism and clean forms/colors define the app. The UI is a neutral, trustworthy container — energy comes from content (photos, data), not from UI decorations.

---

## Goals

- Single source of truth for colors, typography, spacing in `theme.css` + `dsm/index.tsx`
- Remove all dark mode code (`:root.dark`, `dark:` Tailwind variants)
- Standardize on Lucide-react (remove `@mui/icons-material` usage from components)
- Load Outfit font for headings; keep Inter for body
- All screens share the same Header height, BottomNav, page padding, and content start position
- Max width constraint for tablet/web (512px centered)

---

## 1. Color Tokens

All defined as CSS custom properties in `theme.css`, mapped to Tailwind via `@theme inline` in `tailwind.css`.

```css
/* ── Brand ───────────────────────────────────────────── */
--primary:        #2563EB;   /* blue-600 — buttons, active icons, links */
--primary-hover:  #1D4ED8;   /* blue-700 */
--primary-light:  #EFF6FF;   /* blue-50 — selected state background */

/* ── Neutrals ────────────────────────────────────────── */
--gray-50:   #F8FAFC;   /* page background, card surface */
--gray-100:  #F1F5F9;   /* input background, disabled */
--gray-200:  #E2E8F0;   /* border, divider */
--gray-400:  #94A3B8;   /* placeholder, hint, inactive icon */
--gray-600:  #475569;   /* secondary text */
--gray-900:  #0F172A;   /* primary text, icons */

/* ── Semantic ────────────────────────────────────────── */
--success:   #10B981;
--warning:   #F59E0B;
--error:     #EF4444;

/* ── Surface ─────────────────────────────────────────── */
--background: #FFFFFF;   /* screen background */
--surface:    #F8FAFC;   /* card, sheet, secondary surface */
--border:     #E2E8F0;   /* all borders and dividers */
```

**Remove:** all `--color-secondary-*` teal variables, all dark-mode overrides (`.dark { ... }` blocks).

**Tailwind mapping** (add to `@theme inline` block in `tailwind.css`):
```css
--color-primary:       var(--primary);
--color-primary-hover: var(--primary-hover);
--color-primary-light: var(--primary-light);
--color-surface:       var(--surface);
--color-success:       var(--success);
--color-warning:       var(--warning);
--color-error:         var(--error);
```

---

## 2. Typography

### Font loading (`fonts.css` or `index.css`)

Add Outfit from Google Fonts:
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
```

Remove: Poppins import (replaced by Outfit).

### CSS tokens (`theme.css`)

```css
--font-heading: 'Outfit', sans-serif;
--font-body:    'Inter', sans-serif;
```

### Scale

| Token     | Font    | Weight | Size  | Line-height | Letter-spacing | Usage                        |
|-----------|---------|--------|-------|-------------|----------------|------------------------------|
| `--text-h0` | Outfit  | 700    | 32px  | 1.2         | -0.5px         | Hero, splash, onboarding     |
| `--text-h1` | Outfit  | 700    | 24px  | 1.3         | -0.3px         | Screen title in header       |
| `--text-h2` | Outfit  | 600    | 18px  | 1.4         | 0              | Section title, card title    |
| `--text-h3` | Outfit  | 600    | 15px  | 1.4         | 0              | List item title, modal title |
| `body`    | Inter   | 400    | 14px  | 1.6         | 0              | General text                 |
| `small`   | Inter   | 400    | 12px  | 1.5         | 0              | Meta, badge, hint            |
| `2xs`     | Inter   | 400    | 10px  | 1.4         | 0              | Chip, label                  |

### Color rules
- Primary text: `var(--gray-900)`
- Secondary text: `var(--gray-600)`
- Disabled / hint: `var(--gray-400)`
- Active / link: `var(--primary)`

---

## 3. Spacing & Layout

### Page layout

```
Page background:     var(--background) = #FFFFFF
Horizontal padding:  px-4 (16px) on mobile / px-6 (24px) on md+
Max width:           max-w-lg (512px), mx-auto — applies to all route containers
Content top:         pt-4 (16px) below header — consistent on every screen
Section gap:         gap-4 (16px) between sections
Card padding:        p-4 (16px) inside cards
```

### Header (every main screen)

```
Height:       56px (h-14)
Background:   #FFFFFF
Border:       border-b border-[var(--border)]  (1px #E2E8F0)
Left:         Screen title — Outfit 700 24px Gray-900
Right:        max 2 Lucide icons — size=20, text-gray-900
Padding:      px-4
Position:     sticky top-0 z-40
```

### BottomNav (5 tabs)

```
Height:         64px + safe-area-inset-bottom (pb-safe)
Background:     #FFFFFF
Border:         border-t border-[var(--border)]
Icon:           Lucide size=22
  inactive:     text-gray-400
  active:       text-[var(--primary)] (#2563EB)
Label:          Inter 500 10px
  inactive:     text-gray-400
  active:       text-[var(--primary)]
Active indicator: color only — NO elevated circle, NO shadow, NO background pill
Tabs (in order): Foods / Shopping / Menu (center) / Workout / Profile
```

### Safe area / scroll

```
Main content area:   overflow-y-auto
Bottom padding:      pb-20 (80px) to clear BottomNav
```

---

## 4. Core Components

### DSMButton

```tsx
variants:
  primary:   bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] active:scale-95
  secondary: border border-[var(--border)] bg-white text-gray-900 hover:bg-[var(--surface)]
  ghost:     bg-transparent text-[var(--primary)] hover:bg-[var(--primary-light)]
  danger:    bg-[var(--error)] text-white hover:opacity-90

size:        h-11 (44px) rounded-xl px-4 — all variants
font:        Inter 600 14px
full-width:  w-full by default; auto via size="auto" prop
disabled:    bg-gray-100 text-gray-400 cursor-not-allowed opacity-60
```

No gradients on buttons. No colored shadows.

### DSMCard

```tsx
bg-white rounded-2xl border border-[var(--border)]
shadow: shadow-sm  (0 1px 3px rgba(0,0,0,0.06))
padding: p-4
NO: colored headers, gradient backgrounds, shadow-xl, colored borders
```

### DSMInput

```tsx
bg-[var(--surface)] border border-[var(--border)] rounded-xl h-11 px-3
focus: border-[var(--primary)] outline-none ring-0
placeholder: text-gray-400 font-inter text-sm
label: Inter 500 12px Gray-600 above input (mb-1)
error state: border-[var(--error)] + error message text-[var(--error)] text-xs below
```

### DSMModal / Dialog

```tsx
Backdrop:   fixed inset-0 bg-black/40 backdrop-blur-sm z-50
  — REQUIRED on all dialogs, sheets, and modals (currently missing on many)

Bottom sheet:
  panel:    bg-white rounded-t-3xl px-4 pt-4 pb-safe
  handle:   4px × 32px rounded-full bg-gray-200 mx-auto mb-4
  header:   H2 (Outfit 600 18px) + X button (Lucide X size=20) right-aligned

Centered modal:
  panel:    bg-white rounded-2xl p-6 mx-4 max-w-sm w-full
  header:   H2 + X button
```

### DSMIconButton

```tsx
Circular icon-only button:
  size:     w-10 h-10 (40px) rounded-full
  default:  bg-[var(--surface)] text-gray-900
  active:   bg-[var(--primary-light)] text-[var(--primary)]
  icon:     Lucide size=20
NO colored backgrounds except primary-light for active state
```

### Icon rules (global)

```
Library:    lucide-react ONLY — remove all @mui/icons-material imports
Size:       20px inline / 22px navigation / 24px hero/empty-state
Color:      text-gray-900 (default) / text-[var(--primary)] (active/interactive)
NO:         colored background circles, gradient fills, mixed libraries
```

---

## 5. Remove Dark Mode

- Delete all `.dark { ... }` blocks from `theme.css`
- Remove `dark:` prefix classes from ALL components (`dsm/index.tsx` and all feature components)
- Remove dark mode toggle from Profile screen
- The `<html>` element should never receive the `dark` class

---

## Files Changed

| File | Change |
|------|--------|
| `src/styles/theme.css` | Replace color variables with new palette; remove dark blocks; add Outfit font vars; add typography scale vars |
| `src/styles/index.css` (or `fonts.css`) | Add Outfit Google Fonts import; remove Poppins |
| `src/styles/tailwind.css` | Add new color tokens to `@theme inline`; remove dark-mode color mappings |
| `src/app/components/dsm/index.tsx` | Rewrite all component styles to use new tokens; remove dark mode; standardize icons to Lucide; apply new Button/Card/Input/Modal specs |
| `src/app/shared/layouts/Layout.tsx` | Apply max-w-lg + mx-auto container; unified BottomNav |

---

## Out of Scope (Phase 2)

- Screen-by-screen application of the design system
- Onboarding flow redesign
- Image/illustration assets
- Animation/motion changes

---

## Non-Goals

- Dark mode (removed, not replaced)
- New icon library (Lucide-react is retained)
- Backend / data changes
