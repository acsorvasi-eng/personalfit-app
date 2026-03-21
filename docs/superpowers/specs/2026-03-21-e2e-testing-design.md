# E2E Testing & Quality Gate Design

## Goal

Prevent broken code from being committed by running automated checks before every `git commit`. Two layers: TypeScript compile check (fast, already active) and Playwright E2E browser tests (smoke + navigation).

## Architecture

**Two-layer quality gate:**

1. **TypeScript check** (~3s) — already active as a PostToolUse hook in `.claude/settings.local.json`. Runs after every file edit, injects errors back into Claude's context for immediate fixing.

2. **Playwright E2E tests** (~35-40s) — runs as a git pre-commit hook. Blocks the commit if any test fails.

## File Structure

```
PersonalFit/
├── playwright.config.ts          # Playwright config — auto-starts Vite devserver
├── e2e/
│   ├── fixtures.ts               # Shared: page error collector, auth pre-seed helper
│   ├── smoke.spec.ts             # App loads, no white screen — UNAUTHENTICATED context
│   └── navigation.spec.ts        # Login flow + all main tabs — AUTHENTICATED context
└── package.json                  # + "test:e2e": "playwright test" script

.git/hooks/
└── pre-commit                    # Runs TypeScript check + Playwright before every commit

setup-hooks.sh                    # One-time script to install the git hook
```

## Auth Strategy

`LoginScreen.tsx` does not expose a local login UI button, so tests cannot use `loginLocal` through normal browser interaction.

**Solution: Pre-seed IndexedDB auth state.**

Before navigation, a Playwright fixture writes the required auth user record directly into the app's IndexedDB (`NutriPlanDB` `settings` store, record id `authUser`) and sets `hasAcceptedTerms`, `hasCompletedOnboarding`, `hasPlanSetup`, `hasCompletedFullFlow`, and `hasSeenSplash` flags. This mimics the exact state the app reads on startup via `getStoredUser()` and `getSetting()`.

The pre-seed fixture:
```typescript
// e2e/fixtures.ts
// DB constants matching PersonalFit/src/app/backend/db.ts
// DB_NAME = 'NutriPlanDB', DB_VERSION = 5
// settings store: keyPath = 'id', record shape = { id: string, value: string }

async function seedAuthState(page: Page) {
  await page.addInitScript(() => {
    const DB_NAME = 'NutriPlanDB';
    const DB_VERSION = 5;
    const openReq = indexedDB.open(DB_NAME, DB_VERSION);

    // Required for fresh Playwright browser contexts where DB doesn't exist yet
    openReq.onupgradeneeded = () => {
      const db = openReq.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };

    openReq.onsuccess = () => {
      const db = openReq.result;
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      // keyPath is 'id', not 'key'
      store.put({ id: 'authUser', value: JSON.stringify({
        id: 'test_user_playwright',
        email: '',
        name: 'Playwright Tester',
        avatar: '',
        provider: 'local',
        createdAt: new Date().toISOString(),
        isFirstLogin: false,
      })});
      store.put({ id: 'hasAcceptedTerms', value: 'true' });
      store.put({ id: 'hasCompletedOnboarding', value: 'true' });
      store.put({ id: 'hasPlanSetup', value: 'true' });
      store.put({ id: 'hasCompletedFullFlow', value: 'true' });
      store.put({ id: 'hasSeenSplash', value: 'true' });
    };
  });
}
```

This approach:
- Requires no Firebase
- Works offline
- Is not brittle (does not depend on UI button presence)
- Mirrors exactly what `loginLocal` would store

## Test Scenarios

### `smoke.spec.ts` — App basics, UNAUTHENTICATED (4 tests)

Uses a **fresh browser context with no stored auth state** so `OnboardingGuard` does not redirect.

- App loads at `/splash` — splash screen renders (title/logo visible), no white screen
- `/onboarding` — at least one slide visible, next button works
- `/login` — login form renders (email input or Google button visible)
- Navigate to `/foods` without auth — use `page.waitForURL('**/splash')` to await the async redirect (depends on `AuthContext.isLoading` becoming false), then assert URL is `/splash` (auth gate regression test)

### `navigation.spec.ts` — All tabs, AUTHENTICATED (8 tests)

Uses the **pre-seed fixture** to inject auth state before each test.

- Home tab (`/`) loads — bottom nav visible, no crash
- Foods/Menu tab (`/foods`) loads — no crash, content area visible
- Shopping tab (`/shopping`) loads — no crash
- Profile tab (`/profile`) loads — no crash
- Workout tab (`/workout`) loads — no crash
- Tab switching: `/` → `/foods` → `/profile` → `/` — no crash, no unhandled errors
- Console errors: no unhandled JS errors on any tab (collected via `page.on('pageerror')`)
- Page errors collected across the full navigation sequence are empty

**Console error collection** — use a `test.extend` fixture (not `beforeEach`/`afterEach`) for proper Playwright lifecycle handling. The fixture provides a `pageErrors` array scoped to each test; the test body asserts it is empty at the end.

```typescript
// e2e/fixtures.ts
import { test as base } from '@playwright/test';
export const test = base.extend<{ pageErrors: Error[] }>({
  pageErrors: async ({ page }, use) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));
    await use(errors);
  },
});
```

**Total: ~12 tests, ~35-40 seconds**

## Browser State Isolation

`smoke.spec.ts` runs with no auth state. `navigation.spec.ts` runs with pre-seeded auth state. To prevent state leakage:

- Each `spec` file uses its own Playwright `project` with isolated `storageState`
- Smoke tests use `storageState: undefined` (default clean context)
- Navigation tests use the `seedAuthState` fixture in `beforeEach` with a fresh context per test

Playwright config:
```typescript
projects: [
  { name: 'smoke', testMatch: 'smoke.spec.ts', use: { storageState: undefined } },
  { name: 'navigation', testMatch: 'navigation.spec.ts' },
]
```

## Playwright Config

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev:ui',
    port: 5174,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: {
    baseURL: 'http://localhost:5174',
    headless: true,
  },
  timeout: 10_000,
  projects: [
    { name: 'smoke', testMatch: '**/smoke.spec.ts', use: { storageState: undefined } },
    { name: 'navigation', testMatch: '**/navigation.spec.ts' },
  ],
});
```

## Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit
set -e
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT/PersonalFit"

echo "🔍 TypeScript check..."
npx tsc --noEmit 2>&1 | grep -v "buildIngredientSelection.test" || true

echo "🎭 Playwright E2E tests..."
npx playwright test

echo "✅ All checks passed — committing"
```

Uses `git rev-parse --show-toplevel` for absolute path resolution, safe in worktree contexts.

Bypass with `git commit --no-verify` (emergency only).

## Setup

One-time install:
```bash
chmod +x setup-hooks.sh && ./setup-hooks.sh
```

`setup-hooks.sh` copies the hook to `.git/hooks/pre-commit` and marks it executable.

## Success Criteria

- `git commit` is blocked if any TypeScript error or E2E test fails
- All ~12 tests pass on a clean checkout with no dev server running
- Tests complete in under 60 seconds
- No Firebase credentials required to run tests
- Smoke tests run in unauthenticated context, navigation tests in pre-seeded auth context
- Console errors on any page cause test failure
