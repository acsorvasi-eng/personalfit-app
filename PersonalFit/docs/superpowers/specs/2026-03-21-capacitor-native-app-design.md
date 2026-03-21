# Capacitor Native App — Design Spec

**Date:** 2026-03-21
**Status:** Approved (verbal, async session)
**Author:** Claude Sonnet 4.6 (autonomous overnight session)

---

## Goal

Wrap the existing PersonalFit React SPA (Vite) into a Capacitor shell to produce native iOS and Android apps, ready for App Store and Google Play submission. The web app on Vercel stays unchanged — same codebase, different build target.

## Scope

- Capacitor core setup (iOS + Android simultaneously)
- 5 native plugins: StatusBar, SplashScreen, App, Haptics, Keyboard
- `VITE_API_BASE` env var pattern to fix API calls in native context
- Build pipeline scripts (`cap:build`, `cap:ios`, `cap:android`)
- iOS `Info.plist` permission declarations
- Android `minSdkVersion` and back-button handling
- `.gitignore` updates for native build artifacts

**Out of scope:** Live updates (Capgo/Capawesome) — Phase 2 decision.

---

## Architecture

The existing Vite + React SPA is untouched. Capacitor wraps it as a native WebView shell.

```
Source (src/)
    ↓  vite build
dist/                    ← Vite output, Capacitor reads this
    ↓  npx cap sync
ios/App/public/          ← iOS WebView content
android/app/src/main/assets/public/  ← Android WebView content
```

Vercel deployment and native app builds share **the same source code**. The only difference is:
- Vercel: `vite build` → deploys to CDN
- Native: `vite build --mode native && npx cap sync` → bundled into app binary

Note: `vite.config.ts` has a dev server `proxy` block (routes `/api/*` → `localhost:3001`). This only applies during `vite dev` — it has no effect on `vite build` output and does not conflict with the `VITE_API_BASE` native strategy.

---

## API URL Strategy

### Problem
The native WebView serves files from `capacitor://localhost`, not from `vercel.app`. Relative paths like `/api/lookup-foods` resolve to `capacitor://localhost/api/lookup-foods` — which 404s.

### Solution: `VITE_API_BASE` via Vite build mode

New file: `src/lib/api.ts`
```ts
/** Base URL for API calls.
 * Web (Vercel): '' → relative paths work natively
 * Native app:  'https://personalfit-app.vercel.app' → full URL
 */
export const apiBase = (import.meta.env.VITE_API_BASE as string) ?? '';
```

Vite mode files (Vite loads `.env.[mode]` when `vite build --mode [mode]`):
- `.env` (default web build): no `VITE_API_BASE` → defaults to `''`
- `.env.native` (native build, `vite build --mode native`): `VITE_API_BASE=https://personalfit-app.vercel.app`

**Important:** `.env.native` is loaded by Vite only when `--mode native` is passed. Do NOT rely on it being auto-loaded — it must be referenced in the build script explicitly.

Usage in code:
```ts
import { apiBase } from '@/lib/api';
fetch(`${apiBase}/api/lookup-foods`, { ... })
```

**10 files make `/api/` calls — all need `apiBase` applied:**

```
src/app/features/nutrition/components/Foods.tsx              → /api/lookup-foods
src/app/features/nutrition/components/GenerateMealPlanSheet.tsx → /api/generate-meal-plan, /api/usage
src/app/features/menu/components/MealNamer.tsx               → /api/meal-name
src/app/backend/services/FoodCatalogService.ts               → /api/split-food-name
src/app/backend/services/LLMParserService.ts                 → /api/parse-document
src/app/hooks/useDataUpload.ts                               → /api/parse-document
src/app/hooks/useBodyCompositionUpload.ts                    → /api/parse-gmon
src/app/components/body-vision/AIProgressImage.tsx           → /api/generate-body-visual
src/app/components/onboarding/ProfileSetupWizard.tsx         → /api/generate-meal-plan
src/app/components/onboarding/ProfileSetupWizardLegacy.tsx   → /api/generate-meal-plan
```

**Pattern replacement** (same in every file):
```ts
// Before:
const response = await fetch("/api/lookup-foods", {
const response = await fetch(`/api/usage?userId=${...}`,

// After:
import { apiBase } from '@/lib/api';
const response = await fetch(`${apiBase}/api/lookup-foods`, {
const response = await fetch(`${apiBase}/api/usage?userId=${...}`,
```

Before implementing, run `grep -r '"\/api\/' src/ --include="*.ts" --include="*.tsx"` and `grep -r '`/api/' src/ --include="*.ts" --include="*.tsx"` to catch any new call sites added since this spec was written.

---

## Capacitor Configuration

**File: `capacitor.config.ts`** (new, at project root beside `package.json`)

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
      // 'Light' = white icons/text on dark background (teal).
      // 'Dark' = black icons — wrong for our teal header.
      style: 'Light',
      backgroundColor: '#0f766e',  // matches PageHeader gradient start
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0c1f1e',  // matches SplashScreen dark teal
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

**App ID:** `com.personalfit.app` — permanent, cannot change after store submission.

---

## Plugins

### 1. `@capacitor/status-bar`
Controls the native status bar (colour, icon style).

Init in `src/main.tsx`:
```ts
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // Style.Light = white icons on dark/teal background
  StatusBar.setStyle({ style: Style.Light });
  StatusBar.setBackgroundColor({ color: '#0f766e' });
}
```

### 2. `@capacitor/splash-screen`
Native splash screen shown during app startup. Configured via `capacitor.config.ts`. Auto-hides after 1.5s.

No code needed beyond config — Capacitor handles it automatically.

### 3. `@capacitor/app`
Handles Android hardware back button and app lifecycle (foreground/background).

Init in `src/main.tsx`:
```ts
import { App } from '@capacitor/app';

if (Capacitor.isNativePlatform()) {
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });
}
```

### 4. `@capacitor/haptics`
Replaces `navigator.vibrate()` calls with native haptic feedback.

Utility wrapper in `src/lib/haptics.ts`:
```ts
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export async function hapticFeedback(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (Capacitor.isNativePlatform()) {
    await Haptics.impact({ style: ImpactStyle[style.charAt(0).toUpperCase() + style.slice(1) as keyof typeof ImpactStyle] });
  } else {
    navigator.vibrate?.(10);
  }
}
```

### Haptics Migration Scope

All `navigator.vibrate()` call sites must be replaced with `hapticFeedback()`. There are **21 files** containing vibrate calls:

```
src/app/features/nutrition/components/Foods.tsx
src/app/features/profile/components/SettingsSheet.tsx
src/app/features/profile/components/Profile.tsx
src/app/features/shopping/components/ShoppingList.tsx
src/app/components/SplashScreen.tsx
src/app/features/menu/components/UnifiedMenu.tsx
src/app/components/dsm/index.tsx
src/app/components/DataUploadSheet.tsx
src/app/components/BodyCompositionUploadSheet.tsx
src/app/features/workout/components/WorkoutCalendar.tsx
src/app/features/workout/components/Workout.tsx
src/app/components/ProfileHeader.tsx
src/app/components/ManualMealInput.tsx
src/app/features/menu/components/MealIntervalEditor.tsx
src/app/features/menu/components/MealDetail.tsx
src/app/components/onboarding/PlanSetupScreen.tsx
src/app/components/dsm/QuickLogSheet.tsx
src/app/hooks/useStagingManager.ts
src/app/hooks/useBodyCompositionUpload.ts
src/app/components/body-vision/BodyVisionThumbnailCard.tsx
src/app/components/FuturisticDashboard.tsx
```

**Pattern replacement** (same in every file):
```ts
// Before:
navigator.vibrate(10);           // or any duration
navigator.vibrate?.([100]);      // with optional chaining

// After:
import { hapticFeedback } from '@/lib/haptics';
hapticFeedback('light');         // or 'medium'/'heavy' for stronger feedback
```

All existing call sites use short single-pulse vibration (feedback-on-tap). Replace all with `hapticFeedback('light')` — no need to differentiate by duration.

### 5. `@capacitor/keyboard`
Prevents input fields from being hidden behind the soft keyboard.

Configured via `capacitor.config.ts` (`resize: 'native'`). No extra code needed.

---

## Build Pipeline

New scripts in `package.json`:
```json
"cap:build":         "vite build && npx cap sync",
"cap:build:native":  "vite build --mode native && npx cap sync",
"cap:ios":           "npm run cap:build:native && npx cap open ios",
"cap:android":       "npm run cap:build:native && npx cap open android"
```

- `cap:build` — web-compatible build + sync (no API base override, uses relative paths)
- `cap:build:native` — native build with `--mode native` → loads `.env.native` → sets `VITE_API_BASE`
- `cap:ios` / `cap:android` — full native build + opens IDE

> **Warning:** Do not use `cap:build` for deploying to a device — it produces a build without `VITE_API_BASE`, causing all `/api/` calls to 404 silently in the native WebView. Always use `cap:build:native` (or the `cap:ios` / `cap:android` scripts) when building for a physical device or simulator.

---

## iOS Platform Setup

### `Info.plist` additions (inside `ios/App/App/Info.plist`)

Note: `NSMicrophoneUsageDescription` is required because the app uses the Web Speech API
(`SpeechRecognition`) in three components for voice-based food entry:
- `Foods.tsx` — voice food search
- `LogMeal.tsx` — voice meal logging
- `FuturisticDashboard.tsx` — voice commands

Apple will reject the app if a mic permission string is present without a demonstrable use
case — all three provide justified, user-initiated voice input flows.

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Hangos ételbevitelhez szükséges a mikrofon hozzáférés.</string>
<key>UISupportedInterfaceOrientations</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
</array>
```

### `Podfile` (auto-generated, no manual changes needed)

### Minimum deployment target: iOS 14.0+

---

## Android Platform Setup

### `android/app/build.gradle`
```gradle
android {
  defaultConfig {
    minSdkVersion 24    // Android 7.0 — 95%+ device coverage
    targetSdkVersion 34
  }
}
```

### Permissions (auto-added by Capacitor — no manual edit needed)
- `INTERNET` — for API calls
- `RECORD_AUDIO` — for Web Speech API (SpeechRecognition)

---

## `.gitignore` Updates

Add to root `.gitignore`:
```
# Capacitor native build artifacts
ios/App/Pods/
ios/App/App.xcworkspace/
android/.gradle/
android/app/build/
android/build/
```

The `ios/` and `android/` source directories **are** committed (native project structure, `Info.plist`, `build.gradle` etc.) — only build artifacts are ignored.

---

## Files Changed / Created

| File | Type | Change |
|------|------|--------|
| `package.json` | modified | +5 Capacitor packages (deps) + @capacitor/cli (devDep) + 4 scripts |
| `capacitor.config.ts` | **new** | Full Capacitor config |
| `src/lib/api.ts` | **new** | `apiBase` export |
| `src/lib/haptics.ts` | **new** | Haptic feedback wrapper |
| `src/main.tsx` | modified | Capacitor plugin init (StatusBar, App) |
| `src/app/features/nutrition/components/Foods.tsx` | modified | Use `apiBase` for `/api/lookup-foods` |
| `src/app/features/nutrition/components/GenerateMealPlanSheet.tsx` | modified | Use `apiBase` |
| `src/app/features/menu/components/MealNamer.tsx` | modified | Use `apiBase` |
| `src/app/backend/services/FoodCatalogService.ts` | modified | Use `apiBase` |
| `src/app/backend/services/LLMParserService.ts` | modified | Use `apiBase` |
| `src/app/hooks/useDataUpload.ts` | modified | Use `apiBase` |
| `src/app/hooks/useBodyCompositionUpload.ts` | modified | Use `apiBase` |
| `src/app/components/body-vision/AIProgressImage.tsx` | modified | Use `apiBase` |
| `src/app/components/onboarding/ProfileSetupWizard.tsx` | modified | Use `apiBase` |
| `src/app/components/onboarding/ProfileSetupWizardLegacy.tsx` | modified | Use `apiBase` |
| *(21 vibrate files — see Haptics Migration Scope)* | modified | Replace `navigator.vibrate()` with `hapticFeedback()` |
| `.env.native` | **new** | `VITE_API_BASE=https://personalfit-app.vercel.app` (loaded via `vite build --mode native`) |
| `.gitignore` | modified | Native build artifact exclusions |
| `ios/` | **new** | Generated by `npx cap add ios` |
| `android/` | **new** | Generated by `npx cap add android` |

---

## Success Criteria

1. `npm run cap:ios` opens Xcode with the app ready to run on simulator
2. `npm run cap:android` opens Android Studio with the app ready to run on emulator
3. Status bar is teal (#0f766e) with white icons on both platforms
4. Splash screen shows dark teal for 1.5s then transitions to app
5. Android back button navigates back or prompts app exit
6. Voice food input works in the native app (mic permission granted)
7. `/api/lookup-foods` calls succeed in native context (VITE_API_BASE resolves to full URL)
8. Pinch zoom disabled (already set in index.html viewport meta)
9. Safe area insets respected (already set in PageHeader + SettingsSheet)

---

## Dependencies

```json
"@capacitor/core": "^7.0.0",
"@capacitor/app": "^7.0.0",
"@capacitor/haptics": "^7.0.0",
"@capacitor/keyboard": "^7.0.0",
"@capacitor/status-bar": "^7.0.0",
"@capacitor/splash-screen": "^7.0.0"
```
```json
"devDependencies": {
  "@capacitor/cli": "^7.0.0"
}
```

---

## Notes

- Capacitor 7 requires Node 18+, Xcode 15+, Android Studio Hedgehog+
- The `ios/` and `android/` directories will be large (~50MB each). Consider adding to `.gitignore` entirely if the team only builds locally — but for CI/CD it's better to commit them.
- Web Speech API (`SpeechRecognition`) works in Capacitor iOS/Android WebView **only** if the user grants microphone permission. On Android, this requires `RECORD_AUDIO` permission which Capacitor adds automatically.
- IndexedDB works natively in Capacitor's WebView — no migration needed.
- Vercel serverless functions (`/api/`) are never bundled into the native app — they remain cloud-hosted. This is intentional and correct.
