# DSM Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PersonalFit's inconsistent multi-color, dark-mode-cluttered design system with a clean, professional light-only foundation: new color tokens, Outfit headings, unified BottomNav, rewritten core components.

**Architecture:** Three layers changed in order — (1) CSS tokens in `theme.css`/`tailwind.css`/`fonts.css`, (2) new `AppHeader` component + `MainLayout` update, (3) DSM component rewrites in `index.tsx` and sibling files. Each task is independently verifiable with `npx tsc --noEmit`.

**Tech Stack:** React 18 + Vite + TypeScript, Tailwind CSS v4, Lucide-react, no test framework (TypeScript + `npm run build` verification).

**Spec:** `docs/superpowers/specs/2026-03-18-dsm-foundation-design.md`

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `PersonalFit/src/styles/fonts.css` | Modify | Add Outfit, remove Poppins |
| `PersonalFit/src/styles/theme.css` | Modify | New color tokens, remove dark block, add font tokens |
| `PersonalFit/src/styles/tailwind.css` | Modify | New `@theme`/`@theme inline`, add `pb-safe` utility |
| `PersonalFit/src/app/components/dsm/AppHeader.tsx` | **Create** | Shared sticky header component |
| `PersonalFit/src/app/layouts/MainLayout.tsx` | Modify | Remove dark class, apply bg-background |
| `PersonalFit/src/app/components/dsm/index.tsx` | Modify | Update DSM_TOKENS, rewrite core components, remove dark mode |
| `PersonalFit/src/app/components/dsm/atoms.tsx` | Modify | Remove dark: classes, update color refs |
| `PersonalFit/src/app/components/dsm/molecules.tsx` | Modify | Remove dark: classes, update color refs |
| `PersonalFit/src/app/components/dsm/ux-patterns.tsx` | Modify | Remove dark: classes, update color refs |
| `PersonalFit/src/app/components/dsm/ux-flows.tsx` | Modify | Remove dark: classes, update color refs |
| `PersonalFit/src/app/components/dsm/QuickLogSheet.tsx` | Modify | Remove dark: classes, update color refs |
| `PersonalFit/src/app/components/dsm/WorkoutDayBanner.tsx` | Modify | Remove dark: classes, update color refs |
| `PersonalFit/src/app/components/dsm/ProfileTabs.tsx` | Modify | Remove dark: classes, update color refs |

---

## Task 1: CSS Foundation — fonts, theme tokens, Tailwind config

**Files:**
- Modify: `PersonalFit/src/styles/fonts.css`
- Modify: `PersonalFit/src/styles/theme.css`
- Modify: `PersonalFit/src/styles/tailwind.css`

- [ ] **Step 1: Update `fonts.css` — add Outfit, remove Poppins**

  Replace the entire file content:

  ```css
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
  ```

- [ ] **Step 2: Replace `theme.css` with new token system**

  Replace the entire file with:

  ```css
  @custom-variant dark (&:is(.dark *));

  :root {
    /* ============================================
       TYPOGRAPHY
       ============================================ */
    --font-family-base:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-family-display: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-heading: 'Outfit', sans-serif;
    --font-body:    'Inter', sans-serif;

    --font-size: 16px;
    --font-weight-light:     300;
    --font-weight-normal:    400;
    --font-weight-medium:    500;
    --font-weight-semibold:  600;
    --font-weight-bold:      700;
    --font-weight-extrabold: 800;

    --text-xs:   0.8125rem;
    --text-sm:   0.9375rem;
    --text-base: 1rem;
    --text-lg:   1.125rem;
    --text-xl:   1.25rem;
    --text-2xl:  1.5rem;
    --text-3xl:  1.875rem;
    --text-4xl:  2.25rem;
    --text-5xl:  3rem;

    --line-height-tight:   1.25;
    --line-height-normal:  1.5;
    --line-height-relaxed: 1.75;

    /* ============================================
       NEUTRAL PALETTE
       ============================================ */
    --gray-50:  #F8FAFC;
    --gray-100: #F1F5F9;
    --gray-200: #E2E8F0;
    --gray-400: #94A3B8;
    --gray-600: #475569;
    --gray-900: #0F172A;

    /* ============================================
       BRAND COLORS
       ============================================ */
    --primary:            #2563EB;
    --primary-hover:      #1D4ED8;
    --primary-light:      #EFF6FF;
    --primary-foreground: #ffffff;

    /* ============================================
       SEMANTIC COLORS
       ============================================ */
    --success: #10B981;
    --warning: #F59E0B;
    --error:   #EF4444;

    /* ============================================
       SURFACE COLORS
       ============================================ */
    --background:  #FFFFFF;
    --foreground:  #0F172A;
    --surface:     #F8FAFC;
    --border:      #E2E8F0;

    --card:               #FFFFFF;
    --card-foreground:    #0F172A;
    --popover:            #FFFFFF;
    --popover-foreground: #0F172A;

    --secondary:            #EFF6FF;
    --secondary-hover:      #DBEAFE;
    --secondary-foreground: #1D4ED8;

    --muted:            #F8FAFC;
    --muted-foreground: #475569;

    --accent:            #2563EB;
    --accent-hover:      #1D4ED8;
    --accent-foreground: #ffffff;

    --destructive:            #EF4444;
    --destructive-hover:      #DC2626;
    --destructive-foreground: #ffffff;

    --input:            #E2E8F0;
    --input-background: #F8FAFC;
    --switch-background: #CBD5E1;
    --ring: #2563EB;

    /* ============================================
       LEGACY COLOR TOKENS (compatibility)
       ============================================ */
    --color-green-50:  #f0fdf4;
    --color-green-100: #dcfce7;
    --color-green-200: #bbf7d0;
    --color-green-300: #86efac;
    --color-green-400: #4ade80;
    --color-green-500: #22c55e;
    --color-green-600: #16a34a;
    --color-green-700: #15803d;
    --color-green-800: #166534;
    --color-green-900: #14532d;

    --color-emerald-400: #34d399;
    --color-emerald-500: #10b981;
    --color-emerald-600: #059669;

    --color-teal-400: #2dd4bf;
    --color-teal-500: #14b8a6;
    --color-teal-600: #0d9488;

    --color-blue-50:  #eff6ff;
    --color-blue-100: #dbeafe;
    --color-blue-300: #93c5fd;
    --color-blue-400: #60a5fa;
    --color-blue-500: #3b82f6;
    --color-blue-600: #2563eb;
    --color-blue-700: #1d4ed8;

    --color-yellow-300: #fde047;
    --color-yellow-400: #facc15;
    --color-yellow-500: #eab308;

    --color-red-500: #ef4444;
    --color-red-600: #dc2626;

    /* ============================================
       CHART COLORS
       ============================================ */
    --chart-1: #2563EB;
    --chart-2: #10B981;
    --chart-3: #14b8a6;
    --chart-4: #3b82f6;
    --chart-5: #eab308;

    /* ============================================
       SPACING
       ============================================ */
    --spacing-1:  0.25rem;
    --spacing-2:  0.5rem;
    --spacing-3:  0.75rem;
    --spacing-4:  1rem;
    --spacing-5:  1.25rem;
    --spacing-6:  1.5rem;
    --spacing-8:  2rem;
    --spacing-10: 2.5rem;
    --spacing-12: 3rem;
    --spacing-16: 4rem;
    --spacing-20: 5rem;

    /* ============================================
       BORDER RADIUS
       ============================================ */
    --radius:      0.625rem;
    --radius-sm:   0.375rem;
    --radius-md:   0.5rem;
    --radius-lg:   0.75rem;
    --radius-xl:   1rem;
    --radius-2xl:  1.25rem;
    --radius-3xl:  1.5rem;
    --radius-full: 9999px;

    /* ============================================
       SHADOWS
       ============================================ */
    --shadow-sm:    0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow:       0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
    --shadow-md:    0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    --shadow-lg:    0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    --shadow-xl:    0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    --shadow-2xl:   0 25px 50px -12px rgba(0, 0, 0, 0.25);
    --shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);

    --shadow-primary:    0 10px 15px -3px rgba(37, 99, 235, 0.2), 0 4px 6px -4px rgba(37, 99, 235, 0.1);
    --shadow-primary-lg: 0 20px 25px -5px rgba(37, 99, 235, 0.3), 0 8px 10px -6px rgba(37, 99, 235, 0.2);
    --shadow-green:      0 10px 15px -3px rgba(34, 197, 94, 0.2), 0 4px 6px -4px rgba(34, 197, 94, 0.1);
    --shadow-green-lg:   0 20px 25px -5px rgba(34, 197, 94, 0.3), 0 8px 10px -6px rgba(34, 197, 94, 0.2);

    /* ============================================
       BRAND
       ============================================ */
    --brand-gradient-primary: linear-gradient(135deg, #2563EB, #10B981);
    --brand-gradient-header:  linear-gradient(135deg, #2563EB, #1D4ED8);
    --brand-gradient-premium: linear-gradient(135deg, #f59e0b, #ea580c);
    --brand-gradient-cta:     linear-gradient(90deg, #2563EB, #1D4ED8);

    --card-border-radius: var(--radius-xl);
    --card-shadow:  0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    --card-border:  1px solid #E2E8F0;

    --hover-overlay:     rgba(0, 0, 0, 0.04);
    --active-scale:      0.98;
    --focus-ring-width:  2px;
    --focus-ring-color:  rgba(37, 99, 235, 0.3);
    --focus-ring-offset: 2px;

    /* ============================================
       MOTION
       ============================================ */
    --motion-duration-fast:  150ms;
    --motion-duration-base:  200ms;
    --motion-duration-slow:  300ms;
    --motion-easing:         cubic-bezier(0.4, 0, 0.2, 1);
    --motion-easing-bounce:  cubic-bezier(0.34, 1.56, 0.64, 1);
    --motion-press-scale:    0.97;
    --motion-press-duration: 120ms;

    --transition-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-base:   200ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow:   300ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slower: 500ms cubic-bezier(0.4, 0, 0.2, 1);

    /* ============================================
       Z-INDEX LAYERS
       ============================================ */
    --z-base:            0;
    --z-dropdown:       10;
    --z-sticky:         20;
    --z-fixed:          30;
    --z-modal-backdrop: 40;
    --z-modal:          50;
    --z-popover:        60;
    --z-tooltip:        70;

    /* Sidebar */
    --sidebar:                   #F8FAFC;
    --sidebar-foreground:        #0F172A;
    --sidebar-primary:           #2563EB;
    --sidebar-primary-foreground: #ffffff;
    --sidebar-accent:            #F1F5F9;
    --sidebar-accent-foreground: #475569;
    --sidebar-border:            #E2E8F0;
    --sidebar-ring:              #2563EB;
  }

  /* Water button pulse — prominent CTA */
  @keyframes water-button-pulse {
    0%, 100% { box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); }
    50% { box-shadow: 0 4px 25px rgba(59, 130, 246, 0.7), 0 0 0 6px rgba(59, 130, 246, 0.1); }
  }
  ```

- [ ] **Step 3: Replace `tailwind.css` with updated token mappings**

  Replace the entire file:

  ```css
  @import 'tailwindcss' source(none);
  @source '../**/*.{js,ts,jsx,tsx}';

  @import 'tw-animate-css';

  @theme {
    --text-2xs: 0.625rem; /* 10px */

    /* Heading scale — generates text-h0, text-h1, text-h2, text-h3 */
    --text-h0: 2rem;       /* 32px */
    --text-h1: 1.5rem;     /* 24px */
    --text-h2: 1.125rem;   /* 18px */
    --text-h3: 0.9375rem;  /* 15px */

    /* Font families — generates font-heading and font-body */
    --font-heading: 'Outfit', sans-serif;
    --font-body:    'Inter', sans-serif;
  }

  @theme inline {
    /* surfaces */
    --color-background:          var(--background);
    --color-foreground:          var(--foreground);
    --color-surface:             var(--surface);
    --color-border:              var(--border);

    /* brand */
    --color-primary:             var(--primary);
    --color-primary-hover:       var(--primary-hover);
    --color-primary-light:       var(--primary-light);

    /* semantic */
    --color-success:             var(--success);
    --color-warning:             var(--warning);
    --color-error:               var(--error);

    /* legacy aliases — keep to avoid breaking shadcn/ui components */
    --color-card:                var(--background);
    --color-card-foreground:     var(--foreground);
    --color-muted:               var(--surface);
    --color-muted-foreground:    var(--gray-600);
    --color-popover:             var(--background);
    --color-popover-foreground:  var(--foreground);
    --color-input-bg:            var(--surface);
    --color-ring:                var(--primary);
  }

  @utility scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  @utility pb-safe {
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }
  ```

- [ ] **Step 4: Type-check**

  ```bash
  cd PersonalFit && npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: no errors (CSS changes don't affect TS).

- [ ] **Step 5: Build check**

  ```bash
  cd PersonalFit && npm run build 2>&1 | tail -20
  ```

  Expected: build succeeds. If you see Tailwind warnings about unknown utilities, they are from screen components with old `dark:` classes — harmless in Phase 1 since `.dark` is never applied.

- [ ] **Step 6: Commit**

  ```bash
  git add PersonalFit/src/styles/fonts.css PersonalFit/src/styles/theme.css PersonalFit/src/styles/tailwind.css
  git commit -m "feat: replace design tokens — new blue palette, Outfit font, remove dark mode vars"
  ```

---

## Task 2: Create `AppHeader` component + update `MainLayout`

**Files:**
- Create: `PersonalFit/src/app/components/dsm/AppHeader.tsx`
- Modify: `PersonalFit/src/app/layouts/MainLayout.tsx`

- [ ] **Step 1: Create `AppHeader.tsx`**

  ```tsx
  import type { ReactNode } from 'react';

  interface AppHeaderProps {
    title: string;
    rightActions?: ReactNode;
  }

  export function AppHeader({ title, rightActions }: AppHeaderProps) {
    return (
      <header className="sticky top-0 z-40 w-full bg-background border-b border-border">
        <div className="h-14 flex items-center justify-between px-4">
          <h1 className="text-h1 font-heading font-bold text-gray-900">{title}</h1>
          {rightActions && (
            <div className="flex items-center gap-2">{rightActions}</div>
          )}
        </div>
      </header>
    );
  }

  export default AppHeader;
  ```

- [ ] **Step 2: Update `MainLayout.tsx`**

  Replace entire file:

  ```tsx
  import { Outlet } from 'react-router';

  export function MainLayout() {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 pb-20">
          <div className="max-w-lg mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  export default MainLayout;
  ```

- [ ] **Step 3: Export `AppHeader` from DSM index**

  In `PersonalFit/src/app/components/dsm/index.tsx`, add at the bottom of the file:

  ```tsx
  export { AppHeader } from './AppHeader';
  ```

- [ ] **Step 4: Type-check**

  ```bash
  cd PersonalFit && npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add PersonalFit/src/app/components/dsm/AppHeader.tsx PersonalFit/src/app/layouts/MainLayout.tsx PersonalFit/src/app/components/dsm/index.tsx
  git commit -m "feat: add AppHeader component, update MainLayout to light-only"
  ```

---

## Task 3: Rewrite DSM core components in `index.tsx`

**Files:**
- Modify: `PersonalFit/src/app/components/dsm/index.tsx`

This is the largest task. Work through each component in order.

- [ ] **Step 1: Update `DSM_TOKENS` object**

  Find the `DSM_TOKENS` object (near the top of the file, after imports). Replace the entire object:

  ```ts
  const DSM_TOKENS = {
    colors: {
      primary:      '#2563EB',
      primaryHover: '#1D4ED8',
      primaryLight: '#EFF6FF',
      success:      '#10B981',
      warning:      '#F59E0B',
      error:        '#EF4444',
      gray900:      '#0F172A',
      gray600:      '#475569',
      gray400:      '#94A3B8',
      gray200:      '#E2E8F0',
      gray100:      '#F1F5F9',
      gray50:       '#F8FAFC',
      white:        '#FFFFFF',
    },
    fonts: {
      heading: "'Outfit', sans-serif",
      body:    "'Inter', sans-serif",
    },
    spacing: {
      xs: '4px', sm: '8px', md: '12px', lg: '16px',
      xl: '20px', '2xl': '24px', '3xl': '32px', '4xl': '48px',
    },
    radius: {
      sm: '8px', md: '12px', lg: '16px', xl: '20px',
      '2xl': '24px', full: '9999px',
    },
    shadows: {
      sm:      '0 1px 3px rgba(0,0,0,0.06)',
      md:      '0 4px 6px rgba(0,0,0,0.08)',
      primary: '0 4px 14px rgba(37,99,235,0.25)',
    },
  } as const;
  ```

- [ ] **Step 2: Rewrite `DSMButton`**

  Find the `DSMButton` component and replace with:

  ```tsx
  interface DSMButtonProps {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    fullWidth?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    children: React.ReactNode;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
  }

  export function DSMButton({
    variant = 'primary',
    fullWidth = true,
    disabled = false,
    onClick,
    children,
    type = 'button',
    className = '',
  }: DSMButtonProps) {
    const base = 'h-11 rounded-xl px-4 text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2';
    const width = fullWidth ? 'w-full' : 'w-auto';
    const variants = {
      primary:   'bg-primary text-white hover:bg-primary-hover active:scale-95',
      secondary: 'bg-white border border-border text-gray-900 hover:bg-surface active:scale-95',
      ghost:     'bg-transparent text-primary hover:bg-primary-light active:scale-95',
      danger:    'bg-error text-white hover:opacity-90 active:scale-95',
    };
    const disabledCls = 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60';

    return (
      <button
        type={type}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={`${base} ${width} ${disabled ? disabledCls : variants[variant]} ${className}`}
      >
        {children}
      </button>
    );
  }
  ```

- [ ] **Step 3: Rewrite `DSMCard`**

  Find `DSMCard` and replace with:

  ```tsx
  interface DSMCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }

  export function DSMCard({ children, className = '', onClick }: DSMCardProps) {
    return (
      <div
        onClick={onClick}
        className={`bg-background rounded-2xl border border-border shadow-sm p-4 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {children}
      </div>
    );
  }
  ```

- [ ] **Step 4: Rewrite `DSMInput`**

  Find `DSMInput` and replace with:

  ```tsx
  interface DSMInputProps {
    label?: string;
    error?: string;
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    className?: string;
  }

  export function DSMInput({
    label,
    error,
    placeholder,
    value,
    onChange,
    type = 'text',
    className = '',
  }: DSMInputProps) {
    return (
      <div className={`flex flex-col ${className}`}>
        {label && (
          <label className="text-xs font-medium text-gray-600 mb-1">{label}</label>
        )}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className={`bg-surface border rounded-xl h-11 px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors duration-150 ${
            error ? 'border-error focus:border-error' : 'border-border focus:border-primary'
          }`}
        />
        {error && (
          <span className="text-xs text-error mt-1">{error}</span>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 5: Rewrite `DSMIconButton`**

  Find `DSMIconButton` and replace with:

  ```tsx
  interface DSMIconButtonProps {
    onClick?: () => void;
    active?: boolean;
    children: React.ReactNode;
    className?: string;
  }

  export function DSMIconButton({ onClick, active = false, children, className = '' }: DSMIconButtonProps) {
    return (
      <button
        onClick={onClick}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-150 ${
          active
            ? 'bg-primary-light text-primary'
            : 'bg-surface text-gray-900 hover:bg-gray-100'
        } ${className}`}
      >
        {children}
      </button>
    );
  }
  ```

- [ ] **Step 6: Rewrite `BottomNav`**

  Find the `BottomNav` component and replace its entire implementation. Keep the same props interface (it reads `location.pathname`). Replace the render:

  ```tsx
  // Keep all existing imports and the tabs array definition unchanged.
  // Replace ONLY the return JSX:

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pb-safe">
      <div className="h-16 flex items-stretch max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path ||
            (tab.path !== '/' && location.pathname.startsWith(tab.path));
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors duration-150"
            >
              <Icon
                size={22}
                className={active ? 'text-primary' : 'text-gray-400'}
              />
              <span className={`text-2xs font-medium ${active ? 'text-primary' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
  ```

- [ ] **Step 7: Rewrite `DSMModal` — replace class strings, remove dark mode**

  Find `DSMModal`. Do the following targeted replacements inside the component:

  1. **Backdrop `className`** — find the fixed-overlay `div` and replace its className with:
     ```
     "fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center"
     ```
  2. **Bottom-sheet panel `className`** — find the sliding panel `div` and replace its className with:
     ```
     "bg-background rounded-t-3xl px-4 pt-4 pb-safe w-full max-w-lg"
     ```
  3. **Handle bar `className`** — replace the drag-handle element className with:
     ```
     "w-8 h-1 rounded-full bg-gray-200 mx-auto mb-4"
     ```
  4. **Header row** — replace with:
     ```tsx
     <div className="flex items-center justify-between mb-4">
       <h2 className="text-h2 font-heading font-semibold text-gray-900">{title}</h2>
       <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
         <X size={20} />
       </button>
     </div>
     ```
  5. Remove every remaining `dark:` class token from `DSMModal` and `DSMConfirmDialog`.

- [ ] **Step 8: Rewrite `DSMSubPageHeader`**

  Find `DSMSubPageHeader`. Replace with flat design and rename `onClose` → `onBack`:

  ```tsx
  interface DSMSubPageHeaderProps {
    title: string;
    onBack?: () => void;
    rightActions?: React.ReactNode;
  }

  export function DSMSubPageHeader({ title, onBack, rightActions }: DSMSubPageHeaderProps) {
    return (
      <header className="sticky top-0 z-40 w-full bg-background border-b border-border">
        <div className="h-14 flex items-center gap-3 px-4">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-surface text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <h2 className="flex-1 text-h2 font-heading font-semibold text-gray-900 truncate">{title}</h2>
          {rightActions && <div className="flex items-center gap-2">{rightActions}</div>}
        </div>
      </header>
    );
  }
  ```

  Make sure `ChevronLeft` is imported from `lucide-react`. Remove any `gradientFrom`, `gradientTo` props.

- [ ] **Step 9: Remove all `dark:` classes from `index.tsx`**

  Search for all occurrences of `dark:` in `dsm/index.tsx` and delete the entire `dark:*` class token (the word starting with `dark:` up to the next space or quote). Do this systematically — there are dozens of them.

  Verification command (should return 0 after cleanup):
  ```bash
  grep -c "dark:" PersonalFit/src/app/components/dsm/index.tsx
  ```

- [ ] **Step 10: Replace old color token references in `index.tsx`**

  Find and replace these patterns throughout `index.tsx`:

  | Find | Replace with |
  |------|-------------|
  | `var(--color-primary-50)` | `var(--primary-light)` |
  | `var(--color-primary-100)` | `var(--primary-light)` |
  | `var(--color-primary-200)` | `var(--primary-light)` |
  | `var(--color-primary-400)` | `var(--primary)` |
  | `var(--color-primary-500)` | `var(--primary)` |
  | `var(--color-primary-600)` | `var(--primary-hover)` |
  | `var(--color-primary-700)` | `var(--primary-hover)` |
  | `var(--color-secondary-500)` | `var(--success)` |
  | `var(--color-secondary-600)` | `var(--success)` |
  | `#3366FF` | `#2563EB` |
  | `#2952cc` | `#1D4ED8` |
  | `rgba(51, 102, 255,` | `rgba(37, 99, 235,` |

- [ ] **Step 11: Remove MUI icon imports from `index.tsx`**

  Find all `import ... from '@mui/icons-material'` lines in `index.tsx` and delete them. Replace any MUI icon usage inside the file with the equivalent Lucide-react icon (Lucide is already imported). Verify:

  ```bash
  grep -c "@mui/icons-material" PersonalFit/src/app/components/dsm/index.tsx
  ```

  Expected: 0

- [ ] **Step 12: Type-check**

  ```bash
  cd PersonalFit && npx tsc --noEmit 2>&1 | head -40
  ```

  Fix any TypeScript errors before committing.

- [ ] **Step 13: Commit**

  ```bash
  git add PersonalFit/src/app/components/dsm/index.tsx
  git commit -m "feat: rewrite DSM core components — new tokens, flat BottomNav, remove dark mode, remove MUI icons"
  ```

---

## Task 4: Clean DSM sibling files — dark mode removal + token updates

**Files:**
- Modify: `PersonalFit/src/app/components/dsm/atoms.tsx`
- Modify: `PersonalFit/src/app/components/dsm/molecules.tsx`
- Modify: `PersonalFit/src/app/components/dsm/ux-patterns.tsx`
- Modify: `PersonalFit/src/app/components/dsm/ux-flows.tsx`
- Modify: `PersonalFit/src/app/components/dsm/QuickLogSheet.tsx`
- Modify: `PersonalFit/src/app/components/dsm/WorkoutDayBanner.tsx`
- Modify: `PersonalFit/src/app/components/dsm/ProfileTabs.tsx`

For each file, apply the same three operations:

**Operation A — Remove `dark:` classes**

In each file, remove every `dark:*` class token. These appear inside template strings and JSX className strings. A `dark:` token is the word `dark:` followed by a Tailwind class name up to the next space, quote, or backtick.

After each file: verify with:
```bash
grep -c "dark:" PersonalFit/src/app/components/dsm/<filename>
```
Expected: 0

**Operation B — Replace old color token references + remove removed props**

Apply the same replacement table from Task 3 Step 10 to each file. Also remove any `gradientFrom=`, `gradientTo=`, or `onClose=` props passed to `DSMSubPageHeader` (these props no longer exist after Task 3 Step 8).

**Operation C — Remove MUI icon imports**

Find and delete any `import ... from '@mui/icons-material'` line. Replace the icon usages with the Lucide-react equivalent. Verify:
```bash
grep -c "@mui/icons-material" PersonalFit/src/app/components/dsm/<filename>
```
Expected: 0

- [ ] **Step 1: Clean `atoms.tsx`** (Operations A + B + C)
- [ ] **Step 2: Clean `molecules.tsx`** (Operations A + B + C)
- [ ] **Step 3: Clean `ux-patterns.tsx`** (Operations A + B + C)
- [ ] **Step 4: Clean `ux-flows.tsx`** (Operations A + B + C)

  Also: search for all `DSMSubPageHeader` call sites that still pass `onClose=`:

  ```bash
  grep -rn "onClose=" PersonalFit/src/app/components/dsm/ PersonalFit/src/app/features/ PersonalFit/src/app/components/ --include="*.tsx"
  ```

  For every match that references `DSMSubPageHeader`, rename `onClose=` → `onBack=`. The interface after Task 3 Step 8 no longer accepts `onClose` — TypeScript will error if any caller still uses the old prop name. Also remove any `gradientFrom=` or `gradientTo=` props passed to `DSMSubPageHeader`.
- [ ] **Step 5: Clean `QuickLogSheet.tsx`** (Operations A + B + C)
- [ ] **Step 6: Clean `WorkoutDayBanner.tsx`** (Operations A + B + C)
- [ ] **Step 7: Clean `ProfileTabs.tsx`** (Operations A + B + C)

- [ ] **Step 8: Type-check all**

  ```bash
  cd PersonalFit && npx tsc --noEmit 2>&1 | head -40
  ```

  Fix any errors.

- [ ] **Step 9: Commit**

  ```bash
  git add PersonalFit/src/app/components/dsm/atoms.tsx \
          PersonalFit/src/app/components/dsm/molecules.tsx \
          PersonalFit/src/app/components/dsm/ux-patterns.tsx \
          PersonalFit/src/app/components/dsm/ux-flows.tsx \
          PersonalFit/src/app/components/dsm/QuickLogSheet.tsx \
          PersonalFit/src/app/components/dsm/WorkoutDayBanner.tsx \
          PersonalFit/src/app/components/dsm/ProfileTabs.tsx
  git commit -m "feat: remove dark mode from all DSM components, update color refs"
  ```

---

## Task 5: Disable dark mode toggle

**Files:**
- Find and modify the file that applies the `dark` class to `<html>`

- [ ] **Step 1: Find the dark mode toggle**

  ```bash
  grep -r "classList.*dark\|dark.*classList\|document.documentElement\|html.*dark\|setTheme\|darkMode\|useDark" \
    PersonalFit/src/app --include="*.tsx" --include="*.ts" -l
  ```

- [ ] **Step 2: Disable the toggle**

  In the file(s) found: remove or comment out the line that adds `'dark'` to `document.documentElement.classList`. If there is a `useEffect` that reads a stored theme preference and applies it, remove the `dark` branch entirely so `dark` is never set.

  Example — if you find something like:
  ```ts
  document.documentElement.classList.toggle('dark', isDark);
  // or
  document.documentElement.classList.add('dark');
  ```
  Delete it or replace with a no-op.

- [ ] **Step 3: Type-check**

  ```bash
  cd PersonalFit && npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Step 4: Full build**

  ```bash
  cd PersonalFit && npm run build 2>&1 | tail -20
  ```

  Expected: build succeeds.

- [ ] **Step 5: Commit**

  ```bash
  git add -u
  git commit -m "feat: disable dark mode toggle — light-only UI"
  ```

---

## Final Verification

- [ ] Run `npm run build` — must succeed with no errors
- [ ] Open app in browser at `http://localhost:5200`
- [ ] Verify: Outfit font on screen titles, Inter on body text
- [ ] Verify: BottomNav is flat — no elevated circle on active tab, active tab shows blue `#2563EB`
- [ ] Verify: Primary buttons are solid blue `#2563EB`, no gradients
- [ ] Verify: Cards are white with light gray border, no colored headers
- [ ] Verify: No dark mode activates when inspecting in DevTools (toggling OS dark mode changes nothing)
- [ ] Verify: App works correctly on mobile viewport (390px wide) — BottomNav stays fixed at bottom
