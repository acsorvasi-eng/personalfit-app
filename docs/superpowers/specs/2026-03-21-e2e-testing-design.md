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
│   ├── smoke.spec.ts             # App loads, no white screen, no console errors
│   └── navigation.spec.ts        # Login flow + all main tabs
└── package.json                  # + "test:e2e": "playwright test" script

.git/hooks/
└── pre-commit                    # Runs TypeScript check + Playwright before every commit

setup-hooks.sh                    # One-time script to install the git hook
```

## Test Scenarios

### `smoke.spec.ts` — App basics (4 tests)
- App loads at `/` without white screen
- Splash screen renders (title/logo visible)
- Onboarding slides are navigable (next button works)
- Login screen renders (form visible)

### `navigation.spec.ts` — Auth + all tabs (8 tests)
- Local login succeeds (enter name → redirected to home)
- Home tab (`/`) loads without crash
- Foods/Menu tab (`/foods`) loads without crash
- Shopping tab (`/shopping`) loads without crash
- Profile tab (`/profile`) loads without crash
- Workout tab (`/workout`) loads without crash
- No unhandled JS errors across any tab
- App survives tab switching (back and forth)

**Total: ~12 tests, ~35-40 seconds**

## Auth Strategy

Tests use the **local login** option (`loginLocal`) — enter a display name, no Firebase required. This makes tests:
- Offline-capable (no Firebase dependency)
- Fast (no network round trips)
- Reliable (no flakiness from Firebase auth)

## Playwright Config

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev:ui',
    port: 5174,
    reuseExistingServer: true,   // reuse if already running (faster in dev)
    timeout: 30_000,
  },
  use: {
    baseURL: 'http://localhost:5174',
    headless: true,
  },
  timeout: 10_000,
});
```

## Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash
set -e
cd PersonalFit/

echo "🔍 TypeScript check..."
npx tsc --noEmit 2>&1 | grep -v "buildIngredientSelection.test"

echo "🎭 Playwright E2E tests..."
npx playwright test

echo "✅ All checks passed — committing"
```

Bypass with `git commit --no-verify` (emergency only).

## Setup

One-time install:
```bash
chmod +x setup-hooks.sh
./setup-hooks.sh
```

## Success Criteria

- `git commit` is blocked if any TypeScript error or E2E test fails
- All 12 tests pass on a clean checkout
- Tests complete in under 60 seconds
- No Firebase credentials required to run tests
