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

- Single source of truth for colors, typography, spacing in `theme.css` + DSM components
- Remove all dark mode code (`.dark { ... }` blocks, `dark:` Tailwind variants)
- Standardize on Lucide-react only (remove `@mui/icons-material` usage from all components)
- Load Outfit font for headings; keep Inter for body; remove Poppins
- All screens share the same Header height, BottomNav, page padding, and content start position
- Max width constraint for tablet/web (512px centered, applied inside scroll container only)

---

## 1. Color Tokens

All defined as CSS custom properties in `theme.css`.

### Replace in `theme.css`

Remove the entire existing `--color-primary-*` and `--color-secondary-*` palette blocks (50–900). Replace with:

```css
/* ── Brand ───────────────────────────────────────────── */
--primary:        #2563EB;
--primary-hover:  #1D4ED8;
--primary-light:  #EFF6FF;

/* ── Neutrals ────────────────────────────────────────── */
--gray-50:   #F8FAFC;
--gray-100:  #F1F5F9;
--gray-200:  #E2E8F0;
--gray-400:  #94A3B8;
--gray-600:  #475569;
--gray-900:  #0F172A;

/* ── Semantic ────────────────────────────────────────── */
--success:   #10B981;
--warning:   #F59E0B;
--error:     #EF4444;

/* ── Surface ─────────────────────────────────────────── */
--background: #FFFFFF;
--surface:    #F8FAFC;
--border:     #E2E8F0;
--foreground: #0F172A;
```

Remove the existing `.dark { ... }` block entirely from `theme.css`.

Keep `--chart-1` through `--chart-5` (used by chart components — do not touch).

**Remove the old `--color-gray-*` block** (`--color-gray-50` through `--color-gray-900`) from `theme.css`. These are redundant with Tailwind's built-in gray scale and will conflict semantically with the new `--gray-*` tokens. DSM files that use `text-gray-900` etc. resolve those through Tailwind's scale (unaffected), not through these CSS variables.

Also keep the `@custom-variant dark (&:is(.dark *));` line at the top of `theme.css` — do NOT delete it. Removing the `.dark { ... }` block is enough for Phase 1. The `@custom-variant` declaration is harmless without a `.dark` class on `<html>`, and retaining it prevents build errors from any residual `dark:` classes in non-DSM screen components (those are cleaned up in Phase 2).

### `--color-primary-*` migration table

The old numbered palette (`--color-primary-50` through `--color-primary-900`) is deleted. Any DSM file that still references these must substitute as follows:

| Old token | New token | Hex |
|---|---|---|
| `--color-primary-50` | `--primary-light` | `#EFF6FF` |
| `--color-primary-100` | `--primary-light` | `#EFF6FF` |
| `--color-primary-200` | `--primary-light` | `#EFF6FF` |
| `--color-primary-400` | `--primary` | `#2563EB` |
| `--color-primary-500` | `--primary` | `#2563EB` |
| `--color-primary-600` | `--primary-hover` | `#1D4ED8` |
| `--color-primary-700` | `--primary-hover` | `#1D4ED8` |
| `--color-secondary-*` | remove entirely — use `--primary` or `--success` depending on context |

Replace all `var(--color-primary-*)` and `var(--color-secondary-*)` occurrences in DSM files using the table above.

### Update `tailwind.css` — `@theme inline` block

Replace the entire existing `@theme inline { ... }` block with:

```css
@theme inline {
  /* surfaces */
  --color-background:        var(--background);
  --color-foreground:        var(--foreground);
  --color-surface:           var(--surface);
  --color-border:            var(--border);

  /* brand */
  --color-primary:           var(--primary);
  --color-primary-hover:     var(--primary-hover);
  --color-primary-light:     var(--primary-light);

  /* semantic */
  --color-success:           var(--success);
  --color-warning:           var(--warning);
  --color-error:             var(--error);

  /* legacy aliases — keep to avoid breaking shadcn/ui components */
  --color-card:              var(--background);
  --color-card-foreground:   var(--foreground);
  --color-muted:             var(--surface);
  --color-muted-foreground:  var(--gray-600);
  --color-popover:           var(--background);
  --color-popover-foreground: var(--foreground);
  --color-input-bg:          var(--surface);
  --color-ring:              var(--primary);
}
```

Remove `--color-background-shell` mapping (dark mode only, no longer needed).

### Define `pb-safe` utility in `tailwind.css`

Add to the `@utility` block (after the existing `scrollbar-hide` utility):

```css
@utility pb-safe {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

---

## 2. Typography

### `src/styles/fonts.css`

Remove the Poppins `@import` line. Add Outfit:

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
```

Keep the existing Inter import (merge if needed to avoid duplicate requests).

### `theme.css` — add font and scale tokens

```css
/* ── Fonts ───────────────────────────────────────────── */
--font-heading: 'Outfit', sans-serif;
--font-body:    'Inter', sans-serif;
```

### `tailwind.css` — typography scale in `@theme` block

Add to the existing `@theme { ... }` block (alongside `--text-2xs`):

```css
@theme {
  --text-2xs: 0.625rem; /* 10px — existing, keep */

  /* Heading scale (Outfit) */
  --text-h0: 2rem;      /* 32px */
  --text-h1: 1.5rem;    /* 24px */
  --text-h2: 1.125rem;  /* 18px */
  --text-h3: 0.9375rem; /* 15px */

  /* Font families — Tailwind v4 maps --font-{key} → font-{key} utility */
  --font-heading: 'Outfit', sans-serif;
  --font-body:    'Inter', sans-serif;
}
```

This makes `text-h0`, `text-h1`, `text-h2`, `text-h3`, `font-heading`, and `font-body` available as Tailwind utilities.

**Note on Tailwind v4 font naming:** `@theme` key `--font-heading` generates utility class `font-heading` (NOT `font-heading`). The `--font-family-*` keys in `theme.css` are CSS variables for reference only — not used as Tailwind utilities.

### Usage rules

| Class combo | Usage |
|---|---|
| `text-h0 font-heading font-bold tracking-tight` | Hero, splash |
| `text-h1 font-heading font-bold` | Screen title in header |
| `text-h2 font-heading font-semibold` | Section title, card title |
| `text-h3 font-heading font-semibold` | List item title, modal title |
| `text-sm font-body` | Body text (14px Inter) |
| `text-xs font-body` | Small / meta (12px Inter) |
| `text-2xs font-body` | Chip / label (10px Inter) |

### Color rules
- Primary text: `text-gray-900`
- Secondary text: `text-gray-600`
- Disabled / hint: `text-gray-400`
- Active / link: `text-primary`

---

## 3. Spacing & Layout

### Page layout rules

```
Screen background:   bg-background (#FFFFFF)
Horizontal padding:  px-4 on mobile / px-6 on md+
Max width:           max-w-lg mx-auto — applied to the scroll content area, NOT to sticky headers
Content top:         pt-4 below header — every screen
Section gap:         space-y-4 or gap-4
Card padding:        p-4
Bottom clearance:    pb-20 (80px) to clear BottomNav
```

### Sticky Header (shared `AppHeader` component)

The existing per-screen headers will be replaced in Phase 2. For Phase 1, create a new shared `AppHeader` component at `src/app/components/dsm/AppHeader.tsx`:

```tsx
// Props: title, rightActions?: React.ReactNode
// Structure:
<header className="sticky top-0 z-40 w-full bg-background border-b border-border">
  <div className="h-14 flex items-center justify-between px-4">
    <h1 className="text-h1 font-heading font-bold text-gray-900">{title}</h1>
    {rightActions && <div className="flex items-center gap-2">{rightActions}</div>}
  </div>
</header>
```

This header is full-width (not constrained by max-w-lg) — it spans the viewport. The content below it is constrained.

### BottomNav — full rewrite

Replace the current elevated-circle implementation in `dsm/index.tsx`. New flat design:

```tsx
// Structure per tab item:
<button className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full">
  <Icon size={22} className={active ? "text-primary" : "text-gray-400"} />
  <span className={`text-2xs font-medium ${active ? "text-primary" : "text-gray-400"}`}>
    {label}
  </span>
</button>

// Container:
<nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pb-safe">
  <div className="h-16 flex items-stretch max-w-lg mx-auto">
    {tabs}
  </div>
</nav>
```

No elevated circle, no shadow on tab items, no animated translate. Active state is color-only.

---

## 4. Core Components (all in `dsm/index.tsx` and sibling DSM files)

### DSMButton

```tsx
interface DSMButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  fullWidth?: boolean;   // default: true
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// Base: h-11 rounded-xl px-4 text-sm font-semibold transition-all active:scale-95
// primary:   bg-primary text-white hover:bg-primary-hover
// secondary: bg-white border border-border text-gray-900 hover:bg-surface
// ghost:     bg-transparent text-primary hover:bg-primary-light
// danger:    bg-error text-white hover:opacity-90
// disabled:  bg-gray-100 text-gray-400 cursor-not-allowed opacity-60 (no active:scale-95)
// fullWidth: w-full (default) vs w-auto
```

No gradients, no colored box-shadows.

### DSMCard

```tsx
// className: bg-background rounded-2xl border border-border shadow-sm p-4
// NO: colored headers, gradient backgrounds, shadow-xl, colored borders
```

### DSMInput

```tsx
interface DSMInputProps {
  label?: string;       // renders as <label> above input
  error?: string;       // renders as error text below input
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}

// Input: bg-surface border border-border rounded-xl h-11 px-3 text-sm
// focus: border-primary outline-none
// placeholder: text-gray-400
// label: text-xs font-medium text-gray-600 mb-1
// error: text-xs text-error mt-1
```

### DSMModal / Dialog

```tsx
// Backdrop (REQUIRED on all overlays):
// fixed inset-0 bg-black/40 backdrop-blur-sm z-50

// Bottom sheet panel:
// bg-background rounded-t-3xl px-4 pt-4 pb-safe
// Handle: w-8 h-1 rounded-full bg-gray-200 mx-auto mb-4
// Header: flex items-center justify-between mb-4
//   title: text-h2 font-heading font-semibold text-gray-900
//   close: <X size={20} className="text-gray-400" />

// Centered modal:
// bg-background rounded-2xl p-6 mx-4 max-w-sm w-full
```

### DSMIconButton

```tsx
// w-10 h-10 rounded-full flex items-center justify-center
// default: bg-surface text-gray-900 hover:bg-gray-100
// active:  bg-primary-light text-primary
// icon:    Lucide size=20
```

### DSMSubPageHeader (gradient removal)

The existing `DSMSubPageHeader` accepts `gradientFrom` and `gradientTo` props and uses `background: linear-gradient(135deg, ...)`. Replace the gradient implementation with a flat design AND remove the gradient props from the interface entirely:

```tsx
interface DSMSubPageHeaderProps {
  title: string;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  // gradientFrom and gradientTo props are REMOVED — not kept as no-ops
}

// Render:
// bg-background border-b border-border h-14 flex items-center px-4 sticky top-0 z-40
// back button: DSMIconButton with ChevronLeft icon (Lucide)
// title: text-h2 font-heading font-semibold text-gray-900
```

**Prop rename:** `onClose` → `onBack`. The caller in `ux-flows.tsx` must also be updated (see Files Changed table).

### Icon rules (global)

```
Library:  lucide-react ONLY
          Remove all `import ... from '@mui/icons-material'` across DSM files
Size:     size=20 (inline UI), size=22 (BottomNav), size=24 (empty states/hero)
Color:    text-gray-900 (default), text-primary (active/interactive), text-gray-400 (disabled)
NO:       colored background circles, gradient fill, size < 16 or > 32
```

---

## 5. Remove Dark Mode

- Delete `.dark { ... }` block from `theme.css`
- **Phase 1 scope:** Remove `dark:` classes from DSM files only:
  - `src/app/components/dsm/index.tsx`
  - `src/app/components/dsm/atoms.tsx`
  - `src/app/components/dsm/molecules.tsx`
  - `src/app/components/dsm/ux-patterns.tsx`
  - `src/app/components/dsm/ux-flows.tsx`
  - `src/app/components/dsm/QuickLogSheet.tsx`
  - `src/app/components/dsm/WorkoutDayBanner.tsx`
  - `src/app/components/dsm/ProfileTabs.tsx`
  - `src/app/layouts/MainLayout.tsx`
- **Phase 2 (deferred):** `dark:` classes in screen components (`ShoppingList.tsx`, `Profile.tsx`, `Workout.tsx`, `UnifiedMenu.tsx`, `MealDetail.tsx`, `LoginScreen.tsx`, `OnboardingScreen.tsx`, all `ui/` shadcn components, etc.) are intentionally left for Phase 2. They are harmless in Phase 1 because the `.dark` class will never be applied to `<html>`.
- Remove dark mode toggle UI from Profile screen (Phase 2)
- The `<html>` element must never receive the `dark` class — ensure the theme-toggle logic in the app is disabled/removed

---

## Files Changed

| File | Change |
|------|--------|
| `src/styles/fonts.css` | Remove Poppins import; add Outfit import |
| `src/styles/theme.css` | Replace color palette; remove dark block; add font + scale tokens |
| `src/styles/tailwind.css` | Replace `@theme inline` block; add typography to `@theme`; add `pb-safe` utility |
| `src/app/components/dsm/index.tsx` | Rewrite Button, Card, Input, Modal, IconButton, BottomNav, SubPageHeader; remove dark mode; remove MUI icon imports |
| `src/app/components/dsm/atoms.tsx` | Remove dark mode classes; update color references to new tokens |
| `src/app/components/dsm/molecules.tsx` | Remove dark mode classes; update color references |
| `src/app/components/dsm/ux-patterns.tsx` | Remove dark mode classes; update color references |
| `src/app/components/dsm/ux-flows.tsx` | Remove dark mode classes; update color references; rename `onClose` → `onBack` in `DSMSubPageHeader` call site |
| `src/app/components/dsm/QuickLogSheet.tsx` | Remove dark mode classes; update color references |
| `src/app/components/dsm/WorkoutDayBanner.tsx` | Remove dark mode classes; update color references |
| `src/app/components/dsm/ProfileTabs.tsx` | Remove dark mode classes; update color references |
| `src/app/layouts/MainLayout.tsx` | Remove `dark:bg-background-shell`; apply content max-width |
| `src/app/components/dsm/AppHeader.tsx` | **Create new** — shared sticky header component |

---

## Out of Scope (Phase 2)

- Screen-by-screen application of the design system (replacing per-screen headers with AppHeader, etc.)
- Onboarding flow redesign
- Image/illustration assets
- Animation/motion changes
- Dark mode toggle removal from Profile UI

---

## Non-Goals

- Dark mode (removed, not replaced)
- New icon library (Lucide-react is retained)
- Backend / data changes
- Removing `@mui/icons-material` from `package.json` (leave installed, just stop importing it)
