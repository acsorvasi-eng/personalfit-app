# Capacitor Native App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing PersonalFit Vite + React SPA in a Capacitor shell to produce native iOS and Android apps, with full API URL fix, haptic feedback migration, and native platform configuration.

**Architecture:** Capacitor reads the `dist/` output of `vite build --mode native` and copies it into native iOS/Android WebView projects. A `VITE_API_BASE` env var (loaded from `.env.native` during native builds) prefixes all `/api/` fetch calls with the full Vercel URL, since `capacitor://localhost/api/...` would 404 otherwise. A `hapticFeedback()` wrapper replaces all `navigator.vibrate()` calls with native Haptics on-device and falls back to vibrate on web.

**Tech Stack:** Capacitor 7, @capacitor/core, @capacitor/cli, @capacitor/ios, @capacitor/android, @capacitor/status-bar, @capacitor/splash-screen, @capacitor/app, @capacitor/haptics, @capacitor/keyboard, Vite build modes

---

## Prerequisites

> Read before starting. These are environment requirements — if any are missing, the relevant task will fail.

- **macOS** required for Task 9 (iOS). Xcode 15+ must be installed: `xcode-select --print-path`
- **Android Studio Hedgehog+** required for Task 10. Java JDK 17+ must be on PATH: `java -version`
- **Node 18+**: `node --version`
- All commands run from `PersonalFit/` directory (where `package.json` lives)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | modify | Add Capacitor deps + 4 build scripts |
| `capacitor.config.ts` | **create** | App ID, WebView config, plugin config |
| `src/lib/api.ts` | **create** | `apiBase` export — empty string on web, full URL on native |
| `src/lib/api.test.ts` | **create** | Verify apiBase is a string |
| `src/lib/haptics.ts` | **create** | `hapticFeedback()` — native Haptics or `navigator.vibrate` |
| `src/lib/haptics.test.ts` | **create** | Verify hapticFeedback calls correct backend per platform |
| `src/main.tsx` | modify | Init StatusBar style + App back-button listener on native |
| 10 API call files | modify | Prefix fetch calls with `${apiBase}` |
| 21 vibrate files | modify | Replace `navigator.vibrate()` with `hapticFeedback()` |
| `.env.native` | **create** | `VITE_API_BASE=https://personalfit-app.vercel.app` |
| `.gitignore` (root) | modify | Ignore Capacitor build artifacts |
| `ios/` | **generate** | Created by `npx cap add ios` |
| `ios/App/App/Info.plist` | modify | Mic permission + portrait-only orientation |
| `android/` | **generate** | Created by `npx cap add android` |
| `android/app/build.gradle` | modify | minSdkVersion 24, targetSdkVersion 34 |

---

## Task 1: Install Capacitor Packages + Add Build Scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Capacitor core + platform + plugin packages**

```bash
cd PersonalFit
npm install @capacitor/core @capacitor/ios @capacitor/android @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar @capacitor/splash-screen
npm install --save-dev @capacitor/cli
```

Expected: packages added to `package.json`, `package-lock.json` updated. No errors.

- [ ] **Step 2: Add build scripts to package.json**

Open `package.json` and add these 4 scripts inside the `"scripts"` block:

```json
"cap:build":         "vite build && npx cap sync",
"cap:build:native":  "vite build --mode native && npx cap sync",
"cap:ios":           "npm run cap:build:native && npx cap open ios",
"cap:android":       "npm run cap:build:native && npx cap open android"
```

The full `"scripts"` block should look like:
```json
"scripts": {
  "build": "vite build",
  "dev": "concurrently -k -n \"API,UI\" -c \"cyan,green\" \"cd .. && vercel dev --listen 3001\" \"vite\"",
  "dev:ui": "vite",
  "dev:api": "cd .. && vercel dev --listen 3001",
  "test": "vitest run",
  "typecheck": "tsc --noEmit",
  "cap:build":         "vite build && npx cap sync",
  "cap:build:native":  "vite build --mode native && npx cap sync",
  "cap:ios":           "npm run cap:build:native && npx cap open ios",
  "cap:android":       "npm run cap:build:native && npx cap open android"
}
```

- [ ] **Step 3: Typecheck to verify TypeScript resolves the new packages**

```bash
npm run typecheck
```

Expected: no errors related to Capacitor packages. (Capacitor types resolve from `node_modules/@capacitor/core/dist/types/`.)

- [ ] **Step 4: Commit**

```bash
git add PersonalFit/package.json PersonalFit/package-lock.json
git commit -m "feat: install Capacitor 7 packages and add build scripts"
```

---

## Task 2: Create capacitor.config.ts

**Files:**
- Create: `capacitor.config.ts` (at `PersonalFit/` root, next to `package.json`)

- [ ] **Step 1: Create the config file**

Create `PersonalFit/capacitor.config.ts` with this exact content:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.personalfit.app',
  appName: 'PersonalFit',
  webDir: 'dist',
  server: {
    // REQUIRED for IndexedDB and secure-context APIs on Android.
    // Without this, Android WebView uses http://localhost which blocks
    // storage APIs in newer Android versions.
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      // 'Light' = white icons/text on dark background (our teal header).
      // 'Dark' would produce black icons — wrong for teal.
      style: 'Light',
      backgroundColor: '#0f766e',  // matches PageHeader gradient start
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0c1f1e',  // matches SplashScreen dark teal bg
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    Keyboard: {
      // 'native' is safer than 'body' for viewport-fit:cover layouts.
      // 'body' can cause jank with safe-area-inset handling.
      resize: 'native',
      style: 'dark',
    },
  },
};

export default config;
```

> **Critical:** `appId: 'com.personalfit.app'` is permanent. It cannot be changed after App Store or Google Play submission.

- [ ] **Step 2: Verify the config file is importable**

`capacitor.config.ts` is intentionally excluded from `tsconfig.json`'s `include: ["src", "api"]` — it does not need to be in scope for the app build. Validation is done by running Capacitor itself:

```bash
npx cap doctor
```

Expected: output includes `✔ @capacitor/core` and `✔ @capacitor/cli` — confirms Capacitor can read the config. If you see "Invalid capacitor.config.ts", fix the TypeScript syntax error reported.

- [ ] **Step 3: Commit**

```bash
git add PersonalFit/capacitor.config.ts
git commit -m "feat: add capacitor.config.ts with StatusBar, SplashScreen, Keyboard config"
```

---

## Task 3: Create src/lib/api.ts (TDD)

**Files:**
- Create: `src/lib/api.ts`
- Create: `src/lib/api.test.ts`

`src/lib/` does not exist yet — it will be created when you create the first file.

- [ ] **Step 1: Write the failing test**

> **Note:** Vitest inherits the `@` path alias from `vite.config.ts` automatically (Vitest uses Vite's config under the hood). You do not need to configure aliases separately for tests.

Create `PersonalFit/src/lib/api.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('apiBase', () => {
  it('exports a string value', async () => {
    const { apiBase } = await import('./api');
    expect(typeof apiBase).toBe('string');
  });

  it('defaults to empty string when VITE_API_BASE is not set', async () => {
    // In test/web environment, import.meta.env.VITE_API_BASE is undefined.
    // apiBase should coerce to ''.
    const { apiBase } = await import('./api');
    expect(apiBase).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/api.test.ts
```

Expected: FAIL — "Cannot find module './api'"

- [ ] **Step 3: Create the implementation**

Create `PersonalFit/src/lib/api.ts`:

```ts
/**
 * Base URL for API calls.
 *
 * Web (Vercel deploy): '' → relative paths work natively, e.g. fetch('/api/foo')
 * Native app (vite build --mode native): 'https://personalfit-app.vercel.app'
 *   → produces fetch('https://personalfit-app.vercel.app/api/foo')
 *   → required because capacitor://localhost/api/foo would 404
 *
 * The value is baked in at build time by Vite from .env.native
 * (loaded automatically when --mode native is passed).
 */
export const apiBase = (import.meta.env.VITE_API_BASE as string) || '';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/api.test.ts
```

Expected: PASS — 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add PersonalFit/src/lib/api.ts PersonalFit/src/lib/api.test.ts
git commit -m "feat: add apiBase utility for native/web API URL strategy"
```

---

## Task 4: Create src/lib/haptics.ts (TDD)

**Files:**
- Create: `src/lib/haptics.ts`
- Create: `src/lib/haptics.test.ts`

- [ ] **Step 1: Write the failing test**

> **Why `// @vitest-environment jsdom`:** The global vitest config sets `environment: 'node'`. Node has no `navigator`, so `navigator.vibrate` would throw. The per-file override gives us a real `navigator` to mock. This annotation is valid in Vitest 4.x.

> **Test isolation:** `vi.clearAllMocks()` clears call counts but NOT the module cache. All three tests share the same `Capacitor` and `Haptics` mock instances — correct behavior since each test re-configures them via `mockReturnValue`.

Create `PersonalFit/src/lib/haptics.test.ts`:

```ts
// @vitest-environment jsdom
// jsdom environment gives us a real `navigator` object to mock against.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock both Capacitor packages before importing haptics
vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn() },
}));

describe('hapticFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls navigator.vibrate on web', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    const vibrateSpy = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrateSpy, configurable: true, writable: true });

    const { hapticFeedback } = await import('./haptics');
    await hapticFeedback('light');

    expect(vibrateSpy).toHaveBeenCalledWith(10);
  });

  it('calls Haptics.impact on native with correct style', async () => {
    const { Capacitor } = await import('@capacitor/core');
    const { Haptics } = await import('@capacitor/haptics');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    const { hapticFeedback } = await import('./haptics');
    await hapticFeedback('medium');

    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'Medium' });
  });

  it('defaults to light style', async () => {
    const { Capacitor } = await import('@capacitor/core');
    const { Haptics } = await import('@capacitor/haptics');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    const { hapticFeedback } = await import('./haptics');
    await hapticFeedback();

    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'Light' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/haptics.test.ts
```

Expected: FAIL — "Cannot find module './haptics'"

- [ ] **Step 3: Create the implementation**

Create `PersonalFit/src/lib/haptics.ts`:

```ts
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Cross-platform haptic feedback.
 * - Native (iOS/Android): uses @capacitor/haptics for true haptic motor
 * - Web: falls back to navigator.vibrate (10ms pulse)
 *
 * Usage: replace all navigator.vibrate() calls with hapticFeedback()
 */
export async function hapticFeedback(
  style: 'light' | 'medium' | 'heavy' = 'light'
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const styleKey = (style.charAt(0).toUpperCase() + style.slice(1)) as keyof typeof ImpactStyle;
    await Haptics.impact({ style: ImpactStyle[styleKey] });
  } else {
    navigator?.vibrate?.(10);
  }
}
```

Note: `navigator?.vibrate?.(10)` uses optional chaining on `navigator` itself (for Node/test environments) AND on `vibrate` (for browsers that don't support it).

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/haptics.test.ts
```

Expected: PASS — 3 tests pass

- [ ] **Step 5: Run all tests to make sure nothing is broken**

```bash
npm test
```

Expected: all tests pass (no regressions)

- [ ] **Step 6: Commit**

```bash
git add PersonalFit/src/lib/haptics.ts PersonalFit/src/lib/haptics.test.ts
git commit -m "feat: add hapticFeedback utility wrapping Capacitor Haptics with navigator.vibrate fallback"
```

---

## Task 5: Update src/main.tsx with Capacitor Plugin Init

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Add Capacitor imports and init code**

Open `PersonalFit/src/main.tsx`. Add the following imports and init code **after** the existing imports, right before `async function initApp()`:

```ts
// ---- Capacitor native plugin init ----
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';

if (Capacitor.isNativePlatform()) {
  // Set status bar to teal background with white icons.
  // Style.Light = white icons (counter-intuitive naming: "Light" = light-colored icons).
  StatusBar.setStyle({ style: Style.Light });
  StatusBar.setBackgroundColor({ color: '#0f766e' }); // PageHeader gradient start

  // Android hardware back button: navigate back if possible, otherwise exit app.
  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      CapacitorApp.exitApp();
    }
  });
}
// ---- end Capacitor init ----
```

The file should look like this after the edit (showing full content):

```ts
// Clear all localStorage on startup — we use IndexedDB only (prevents quota exceeded crash)
try {
  localStorage.clear();
} catch {
  // ignore
}

import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { cleanupCorruptedAIFoods } from "./app/backend/services/FoodCatalogService";
import { seedSystemFoods } from "./app/backend/seedFoods";
import { getDatabase } from "./app/backend/DatabaseService";

// ---- Capacitor native plugin init ----
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Light });
  StatusBar.setBackgroundColor({ color: '#0f766e' });

  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      CapacitorApp.exitApp();
    }
  });
}
// ---- end Capacitor init ----

// Expose one-off debug helper on window so it can be triggered from DevTools.
// Usage in browser console:  await window.cleanupCorruptedAIFoods()
// This keeps the cleanup logic in TypeScript and avoids wiring any UI.
(window as any).cleanupCorruptedAIFoods = cleanupCorruptedAIFoods;

async function initApp() {
  try {
    const db = getDatabase();
    await seedSystemFoods(db);
  } catch (e) {
    console.warn('seedSystemFoods failed:', e);
  }
  createRoot(document.getElementById("root")!).render(<App />);
}

initApp();
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. If you see errors about `@capacitor/status-bar` or `@capacitor/app` types, verify Task 1 completed successfully.

- [ ] **Step 3: Commit**

```bash
git add PersonalFit/src/main.tsx
git commit -m "feat: init Capacitor StatusBar and back-button handler in main.tsx"
```

---

## Task 6: Apply apiBase to All 10 API Call Files

**Files to modify** (13 call sites across 10 files):

```
src/app/features/nutrition/components/Foods.tsx                    (lines 219, 280)
src/app/features/nutrition/components/GenerateMealPlanSheet.tsx    (lines 217, 297)
src/app/features/menu/components/MealNamer.tsx                     (line 90)
src/app/backend/services/FoodCatalogService.ts                     (line 768)
src/app/backend/services/LLMParserService.ts                       (line 97)
src/app/hooks/useDataUpload.ts                                     (lines 297, 945)
src/app/hooks/useBodyCompositionUpload.ts                          (line 366)
src/app/components/body-vision/AIProgressImage.tsx                 (line 38)
src/app/components/onboarding/ProfileSetupWizard.tsx               (line 825)
src/app/components/onboarding/ProfileSetupWizardLegacy.tsx         (line 739)
```

> Line numbers are from the time this spec was written and may have shifted slightly. Use the grep command in Step 1 to find exact locations.

- [ ] **Step 1: Find all fetch call sites (confirm none were added)**

```bash
grep -rn '"\/api\/' src/ --include="*.ts" --include="*.tsx"
grep -rn "'\/api\/" src/ --include="*.ts" --include="*.tsx"
grep -rn '`/api/' src/ --include="*.ts" --include="*.tsx"
```

Expected: 13 results across 10 files (as listed above). If there are additional files, add `apiBase` to those too.

- [ ] **Step 2: Add `apiBase` import to each file and prefix fetch calls**

For each file, apply two changes:
1. Add import at the top of the file (with the other imports)
2. Prefix each `/api/` string with `${apiBase}`

**Pattern:**

```ts
// Add import (add this line with the other imports at the top of each file):
import { apiBase } from '@/lib/api';

// Change each fetch call:
// Before:
fetch('/api/endpoint', ...)
fetch("/api/endpoint", ...)
fetch(`/api/endpoint?param=${value}`, ...)

// After:
fetch(`${apiBase}/api/endpoint`, ...)
fetch(`${apiBase}/api/endpoint`, ...)
fetch(`${apiBase}/api/endpoint?param=${value}`, ...)
```

**File-by-file changes:**

**`src/app/features/nutrition/components/Foods.tsx`** — 2 fetch calls
- Add: `import { apiBase } from '@/lib/api';`
- Change: `fetch("/api/lookup-foods",` → `fetch(`${apiBase}/api/lookup-foods`,` (both occurrences)

**`src/app/features/nutrition/components/GenerateMealPlanSheet.tsx`** — 2 fetch calls
- Add: `import { apiBase } from '@/lib/api';`
- Change: `fetch(\`/api/usage?userId=${...}` → `fetch(\`${apiBase}/api/usage?userId=${...}`
- Change: `fetch("/api/generate-meal-plan",` → `fetch(`${apiBase}/api/generate-meal-plan`,`

**`src/app/features/menu/components/MealNamer.tsx`** — 1 fetch call
- Add: `import { apiBase } from '@/lib/api';`
- Change: `fetch("/api/meal-name",` → `fetch(`${apiBase}/api/meal-name`,`

**`src/app/backend/services/FoodCatalogService.ts`** — 1 fetch call
- Add: `import { apiBase } from '@/lib/api';`
- Change: `fetch('/api/split-food-name',` → `fetch(`${apiBase}/api/split-food-name`,`

**`src/app/backend/services/LLMParserService.ts`** — 1 fetch call
- Add: `import { apiBase } from '@/lib/api';`
- Change: `fetch('/api/parse-document',` → `fetch(`${apiBase}/api/parse-document`,`

**`src/app/hooks/useDataUpload.ts`** — 2 fetch calls
- Add: `import { apiBase } from '@/lib/api';`
- Change both: `fetch('/api/parse-document',` → `fetch(`${apiBase}/api/parse-document`,`

**`src/app/hooks/useBodyCompositionUpload.ts`** — 1 fetch call
- Add: `import { apiBase } from '@/lib/api';`
- Change: `fetch('/api/parse-gmon',` → `fetch(`${apiBase}/api/parse-gmon`,`

**`src/app/components/body-vision/AIProgressImage.tsx`** — 1 fetch call
- Add: `import { apiBase } from '@/lib/api';`
- Change: `fetch("/api/generate-body-visual",` → `fetch(`${apiBase}/api/generate-body-visual`,`

**`src/app/components/onboarding/ProfileSetupWizard.tsx`** — 1 fetch call
- Add: `import { apiBase } from '@/lib/api';`
- Change: `fetch('/api/generate-meal-plan',` → `fetch(`${apiBase}/api/generate-meal-plan`,`

**`src/app/components/onboarding/ProfileSetupWizardLegacy.tsx`** — 1 fetch call
- Add: `import { apiBase } from '@/lib/api';`
- Change: `fetch('/api/generate-meal-plan',` → `fetch(`${apiBase}/api/generate-meal-plan`,`

- [ ] **Step 3: Verify all call sites are updated**

```bash
grep -rn '"\/api\/' src/ --include="*.ts" --include="*.tsx"
grep -rn "'\/api\/" src/ --include="*.ts" --include="*.tsx"
grep -rn '`/api/' src/ --include="*.ts" --include="*.tsx"
```

Expected: 0 results across all three greps. The backtick grep is critical — `GenerateMealPlanSheet.tsx` uses a template literal that must also be updated.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. If you see "Property 'apiBase' does not exist", ensure the import was added to each file.

- [ ] **Step 5: Commit**

```bash
git add PersonalFit/src/
git commit -m "feat: prefix all /api/ fetch calls with apiBase for native app compatibility"
```

---

## Task 7: Replace navigator.vibrate() with hapticFeedback() in 21 Files

There are **46 occurrences** across 21 files. All are simple short-pulse vibrations (feedback-on-tap). Replace all with `hapticFeedback('light')`.

**Files to update:**
```
src/app/features/nutrition/components/Foods.tsx               (3 calls)
src/app/features/profile/components/SettingsSheet.tsx         (2 calls)
src/app/features/profile/components/Profile.tsx               (5 calls)
src/app/features/shopping/components/ShoppingList.tsx         (1 call)
src/app/components/SplashScreen.tsx                           (2 calls)
src/app/features/menu/components/UnifiedMenu.tsx              (6 calls)
src/app/components/dsm/index.tsx                              (2 calls)
src/app/components/DataUploadSheet.tsx                        (2 calls)
src/app/components/BodyCompositionUploadSheet.tsx             (2 calls)
src/app/features/workout/components/WorkoutCalendar.tsx       (4 calls)
src/app/features/workout/components/Workout.tsx               (1 call)
src/app/components/ProfileHeader.tsx                          (1 call)
src/app/components/ManualMealInput.tsx                        (3 calls)
src/app/features/menu/components/MealIntervalEditor.tsx       (1 call)
src/app/features/menu/components/MealDetail.tsx               (1 call)
src/app/components/onboarding/PlanSetupScreen.tsx             (3 calls)
src/app/components/dsm/QuickLogSheet.tsx                      (1 call)
src/app/hooks/useStagingManager.ts                            (1 call)
src/app/hooks/useBodyCompositionUpload.ts                     (2 calls)
src/app/components/body-vision/BodyVisionThumbnailCard.tsx    (1 call)
src/app/components/FuturisticDashboard.tsx                    (2 calls)
```

- [ ] **Step 1: Find all navigator.vibrate call sites**

```bash
grep -rn "navigator\.vibrate" src/ --include="*.ts" --include="*.tsx"
```

Expected: 46 results across 21 files.

- [ ] **Step 2: Add hapticFeedback import + replace calls in every file**

For each file in the list:

1. Add import at the top of the file:
```ts
import { hapticFeedback } from '@/lib/haptics';
```

2. Replace every `navigator.vibrate(...)` call:
```ts
// Before (any of these patterns):
navigator.vibrate(10);
navigator.vibrate(100);
navigator.vibrate([100]);
navigator.vibrate?.(10);
navigator?.vibrate?.(10);

// After (all become):
hapticFeedback('light');
```

Since `hapticFeedback` is async, you need to add `void` prefix (or `await` if already in an async context) to avoid floating promises:
```ts
// If in a synchronous event handler (like onClick):
void hapticFeedback('light');

// If already in an async function:
await hapticFeedback('light');
```

Most vibrate calls are in event handlers. Check each call site: if it's inside `onClick={() => { ... }}` or similar sync handler, use `void hapticFeedback('light')`. If it's inside `async function`, use `await hapticFeedback('light')`.

- [ ] **Step 3: Verify all navigator.vibrate calls are gone**

```bash
grep -rn "navigator\.vibrate" src/ --include="*.ts" --include="*.tsx"
```

Expected: 0 results.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. Common errors and fixes:
- "Expected 1 arguments, but got 0": `hapticFeedback` has a default parameter, this shouldn't happen
- "Property 'vibrate' does not exist": you didn't remove a call, check the file again
- "Promise returned from hapticFeedback is ignored": add `void` prefix

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add PersonalFit/src/
git commit -m "feat: replace navigator.vibrate() with hapticFeedback() across 21 files (46 call sites)"
```

---

## Task 8: Create .env.native + Update .gitignore

**Files:**
- Create: `.env.native` (at `PersonalFit/` root)
- Modify: `.gitignore` (at repository root, one level above `PersonalFit/`)

- [ ] **Step 1: Create .env.native**

Create `PersonalFit/.env.native` with this content:

```
# Loaded by Vite when: vite build --mode native
# Sets the base URL for all /api/ calls in the native WebView.
# The Vercel serverless functions stay cloud-hosted — they are never bundled into the app.
VITE_API_BASE=https://personalfit-app.vercel.app
```

Verify it's NOT ignored by git:
```bash
git check-ignore -v PersonalFit/.env.native
```

Expected: no output (meaning git will track it). If it IS ignored, check the root `.gitignore` — the pattern `.env*.local` should NOT match `.env.native`.

- [ ] **Step 2: Update root .gitignore with Capacitor build artifacts**

Open the `.gitignore` at the **repository root** (one directory above `PersonalFit/`).

> **Important:** Paths use the `PersonalFit/` prefix because the root `.gitignore` is one level above the app. The spec shows these paths without the prefix — the plan's prefixed versions are correct for the actual repo structure.

Add:

```
# Capacitor native build artifacts (ios/ and android/ source dirs are committed;
# only the generated build artifacts and CocoaPods are excluded)
PersonalFit/ios/App/Pods/
PersonalFit/ios/App/App.xcworkspace/
PersonalFit/android/.gradle/
PersonalFit/android/app/build/
PersonalFit/android/build/
```

- [ ] **Step 3: Commit**

```bash
git add PersonalFit/.env.native
git add .gitignore
git commit -m "feat: add .env.native for native API base URL + gitignore Capacitor build artifacts"
```

---

## Task 9: Add iOS Platform + Configure Info.plist

> **Requires macOS with Xcode 15+ installed.** Verify: `xcode-select --print-path`
> This task generates the `ios/` directory (~50MB) and configures microphone permission.

- [ ] **Step 1: Add the iOS platform**

```bash
cd PersonalFit
npx cap add ios
```

Expected output (may vary slightly by Capacitor version):
```
✔ Adding native Xcode project in ios in Xs
[success] ios platform added!
```

If you get "Cannot find module '@capacitor/ios'", Task 1 was not completed. Run `npm install @capacitor/ios` first.

- [ ] **Step 2: Verify the ios/ directory was created**

```bash
ls PersonalFit/ios/App/App/
```

Expected: `AppDelegate.swift  Assets.xcassets  Base.lproj  Info.plist  capacitor.config.json  config.xml  public/`

- [ ] **Step 2b: Verify Pods/ is gitignored (in case pod install ran automatically)**

`npx cap add ios` sometimes triggers `pod install`. If it did, the `Pods/` directory was created before the `git add`. Verify it is ignored:

```bash
git status PersonalFit/ios/App/Pods/ 2>/dev/null | head -5
```

Expected: either "not a git repository" error (path doesn't exist yet) or the path is NOT listed under "Untracked files". If `Pods/` appears as untracked, Task 8 (gitignore update) was not done — complete it now before the commit in Step 4.

- [ ] **Step 3: Set iOS minimum deployment target to 14.0**

Open `PersonalFit/ios/App/Podfile`. Find the line near the top:

```ruby
platform :ios, '13.0'
```

Change it to:

```ruby
platform :ios, '14.0'
```

If the Podfile has already been installed (a `Pods/` directory exists), run:

```bash
cd PersonalFit/ios/App && pod install
```

Expected: CocoaPods resolves deps with `iOS 14.0` as the target. (If CocoaPods is not installed: `sudo gem install cocoapods`)

- [ ] **Step 4: Open Info.plist and add mic permission + portrait orientation lock**

Open `PersonalFit/ios/App/App/Info.plist`. Find the `</dict>` near the end of the file and add these keys **before** the closing `</dict>`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Hangos ételbevitelhez szükséges a mikrofon hozzáférés.</string>
<key>UISupportedInterfaceOrientations</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
</array>
<key>UISupportedInterfaceOrientations~ipad</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
  <string>UIInterfaceOrientationPortraitUpsideDown</string>
</array>
```

The `NSMicrophoneUsageDescription` string is Hungarian: "Microphone access is required for voice food entry." This is required because:
- `Foods.tsx` uses `SpeechRecognition` for voice food search
- `LogMeal.tsx` uses `SpeechRecognition` for voice meal logging
- `FuturisticDashboard.tsx` uses `SpeechRecognition` for voice commands

Apple will reject the app if a mic permission key is present without a valid use case.

- [ ] **Step 5: Commit the iOS platform**

```bash
git add PersonalFit/ios/
git commit -m "feat: add iOS platform with iOS 14.0 target, mic permission, portrait-only orientation"
```

---

## Task 10: Add Android Platform + Configure build.gradle

> **Requires Android Studio Hedgehog+ and Java JDK 17+.**
> This task generates the `android/` directory (~50MB).

- [ ] **Step 1: Add the Android platform**

```bash
cd PersonalFit
npx cap add android
```

Expected output:
```
✔ Adding native Android project in android in Xs
[success] android platform added!
```

- [ ] **Step 2: Verify the android/ directory was created**

```bash
ls PersonalFit/android/app/src/main/
```

Expected: `AndroidManifest.xml  assets/  java/  res/`

- [ ] **Step 3: Set minSdkVersion and targetSdkVersion in build.gradle**

Open `PersonalFit/android/app/build.gradle`. Find the `android { defaultConfig { ... } }` block. It will look something like:

```gradle
android {
    defaultConfig {
        applicationId "com.personalfit.app"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
    }
}
```

If `minSdkVersion` uses `rootProject.ext.minSdkVersion`, open `PersonalFit/android/variables.gradle` instead and set:

```gradle
ext {
    minSdkVersion = 24       // Android 7.0 — 95%+ device coverage
    compileSdkVersion = 34
    targetSdkVersion = 34
    androidxActivityVersion = '1.8.0'
    // ... leave other variables unchanged
}
```

If `build.gradle` uses hardcoded values, edit them directly:

```gradle
minSdkVersion 24
targetSdkVersion 34
```

> `minSdkVersion 24` = Android 7.0+ (API 24). This covers 95%+ of active Android devices as of 2026.

- [ ] **Step 4: Verify and add required permissions in AndroidManifest.xml**

```bash
grep -E "INTERNET|RECORD_AUDIO" PersonalFit/android/app/src/main/AndroidManifest.xml
```

Expected output (both lines should be present):
```
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

If `INTERNET` is missing, add it. If `RECORD_AUDIO` is missing, add it. Both must be inside `<manifest>` before `<application>`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />

    <application ...>
```

> **Why RECORD_AUDIO is required:** The Web Speech API (`SpeechRecognition`) inside a WebView on Android requires `RECORD_AUDIO` declared in the manifest AND granted at runtime. Without it, the microphone permission dialog will never appear and voice input will silently fail on all three components that use it (Foods.tsx, LogMeal.tsx, FuturisticDashboard.tsx). `INTERNET` is auto-added by Capacitor; `RECORD_AUDIO` must be added manually.

- [ ] **Step 5: Commit the Android platform**

```bash
git add PersonalFit/android/
git commit -m "feat: add Android platform with minSdkVersion 24 and targetSdkVersion 34"
```

---

## Task 11: First Full Native Build + Verification

This is the integration task. Everything comes together: build the web app, sync to native platforms, and verify the IDE opens correctly.

- [ ] **Step 1: Run the native build**

```bash
cd PersonalFit
npm run cap:build:native
```

This runs: `vite build --mode native && npx cap sync`

Expected output:
```
vite v6.x.x building for native...
✓ N modules transformed.
dist/index.html     x.xx kB
dist/assets/...     ...
✓ built in Xs

[Capacitor] Syncing web assets from dist to native platforms...
✔ Copying web assets from dist to ios/App/App/public
✔ Copying web assets from dist to android/app/src/main/assets/public
✔ Updating native plugins
✔ Done!
```

If you see "The 'webDir' directory does not exist", it means `vite build` failed before `cap sync`. Check the build output for TypeScript errors.

- [ ] **Step 2: Verify VITE_API_BASE is baked into the build**

```bash
grep -r "personalfit-app.vercel.app" PersonalFit/dist/
```

Expected: at least one match in `dist/assets/*.js` (the bundled JS contains the inlined URL string).

If no match: verify `.env.native` exists at `PersonalFit/.env.native` and contains `VITE_API_BASE=https://personalfit-app.vercel.app`. Also verify you ran `cap:build:native` (not `cap:build`).

- [ ] **Step 3: Verify web content was synced to iOS**

```bash
ls PersonalFit/ios/App/App/public/
```

Expected: `index.html` and `assets/` directory (contents of `dist/`).

- [ ] **Step 4: Verify web content was synced to Android**

```bash
ls PersonalFit/android/app/src/main/assets/public/
```

Expected: `index.html` and `assets/` directory.

- [ ] **Step 5: (macOS only) Verify iOS opens in Xcode**

```bash
npx cap open ios
```

Expected: Xcode opens with the `App.xcworkspace` project. You should see `App > App > AppDelegate.swift` in the file tree.

> If you get "Unable to open workspace file", run `cd PersonalFit/ios/App && pod install` first (requires CocoaPods: `sudo gem install cocoapods`).

- [ ] **Step 6: (Android) Verify Android opens in Android Studio**

```bash
npx cap open android
```

Expected: Android Studio opens with the `android/` project. Build the project (`Build > Make Project`) — should complete without errors.

- [ ] **Step 7: Final commit**

First verify what will be staged:
```bash
git status PersonalFit/
```

Review the output. Expected staged files: none (all changes were committed in prior tasks). Untracked should be only gitignored build artifacts (Pods/, .gradle/, etc.). If you see unexpected untracked files, investigate before committing.

If there are any remaining unstaged changes:
```bash
git add PersonalFit/ios/
git add PersonalFit/android/
git commit -m "feat: first successful native build — Capacitor iOS + Android ready"
```

---

## Success Criteria Checklist

After completing all tasks, verify these success criteria from the spec:

- [ ] `npm run cap:ios` opens Xcode with the app ready to run on simulator
- [ ] `npm run cap:android` opens Android Studio with the app ready to run on emulator
- [ ] `grep -r "personalfit-app.vercel.app" dist/` returns results (VITE_API_BASE baked in)
- [ ] `grep -rn "navigator\.vibrate" src/` returns 0 results (all vibrate calls migrated)
- [ ] `grep -rn '"\/api\/' src/ --include="*.ts" --include="*.tsx"` returns 0 results (all API calls prefixed)
- [ ] `npm run typecheck` exits 0 (no TypeScript errors)
- [ ] `npm test` all pass (no regressions)
- [ ] `ios/App/App/Info.plist` contains `NSMicrophoneUsageDescription`
- [ ] `android/app/build.gradle` or `android/variables.gradle` has `minSdkVersion = 24`

---

## Troubleshooting

**`npx cap add ios` fails with "xcode-select: error"**
→ Install Xcode from Mac App Store, then run `xcode-select --install`

**`npx cap add android` fails with "JAVA_HOME not set"**
→ Install JDK 17: `brew install openjdk@17` and set `JAVA_HOME` in your shell profile

**`cap sync` fails with "webDir 'dist' does not exist"**
→ Run `vite build --mode native` first (the `cap:build:native` script does both)

**App launches but API calls fail (network error)**
→ Check that `vite build --mode native` was used (not plain `vite build`)
→ Verify `.env.native` exists and contains `VITE_API_BASE`
→ Run `grep -r "personalfit-app.vercel.app" dist/` to confirm it's baked in

**Status bar icons are black instead of white on iOS**
→ In `capacitor.config.ts`, `StatusBar.style` must be `'Light'` (not `'Dark'`)
→ `'Light'` = light-colored (white) icons; `'Dark'` = dark (black) icons — Capacitor naming is counter-intuitive

**`pod install` fails on iOS**
→ Update CocoaPods: `sudo gem update cocoapods`
→ Or use Homebrew: `brew install cocoapods`
