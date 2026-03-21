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
- Native: `vite build && npx cap sync` → bundled into app binary

---

## API URL Strategy

### Problem
The native WebView serves files from `capacitor://localhost`, not from `vercel.app`. Relative paths like `/api/lookup-foods` resolve to `capacitor://localhost/api/lookup-foods` — which 404s.

### Solution: `VITE_API_BASE` env var

New file: `src/lib/api.ts`
```ts
/** Base URL for API calls.
 * Web (Vercel): '' → relative paths work natively
 * Native app:  'https://personalfit-app.vercel.app' → full URL
 */
export const apiBase = (import.meta.env.VITE_API_BASE as string) ?? '';
```

Environment files:
- `.env` (web/Vercel): no `VITE_API_BASE` → defaults to `''`
- `.env.native` (native builds): `VITE_API_BASE=https://personalfit-app.vercel.app`

Native build command: `VITE_ENV_FILE=.env.native vite build && npx cap sync`
Or simpler: set in `package.json` script via `--mode native` + `vite.config.ts` mode support.

Usage in code:
```ts
import { apiBase } from '@/lib/api';
fetch(`${apiBase}/api/lookup-foods`, { ... })
```

Currently only `Foods.tsx` makes API calls — this is the only file that needs updating.

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
    androidScheme: 'https',  // avoid mixed-content issues
  },
  plugins: {
    StatusBar: {
      style: 'Dark',                // white icons on status bar
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
      resize: 'body',   // pushes content up when keyboard appears
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
  StatusBar.setStyle({ style: Style.Dark });
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

Existing `navigator.vibrate()` calls are replaced with `hapticFeedback()`.

### 5. `@capacitor/keyboard`
Prevents input fields from being hidden behind the soft keyboard.

Configured via `capacitor.config.ts` (`resize: 'body'`). No extra code needed.

---

## Build Pipeline

New scripts in `package.json`:
```json
"cap:sync":     "npx cap sync",
"cap:build":    "vite build && npx cap sync",
"cap:ios":      "npm run cap:build && npx cap open ios",
"cap:android":  "npm run cap:build && npx cap open android",
"cap:build:native": "cross-env VITE_API_BASE=https://personalfit-app.vercel.app vite build && npx cap sync"
```

`cross-env` needed for Windows compatibility (already common in Node projects).

---

## iOS Platform Setup

### `Info.plist` additions (inside `ios/App/App/Info.plist`)
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
| `package.json` | modified | +5 Capacitor packages, +5 scripts, +`cross-env` |
| `capacitor.config.ts` | **new** | Full Capacitor config |
| `vite.config.ts` | modified | Explicit `build.outDir: 'dist'` |
| `src/lib/api.ts` | **new** | `apiBase` export |
| `src/lib/haptics.ts` | **new** | Haptic feedback wrapper |
| `src/main.tsx` | modified | Capacitor plugin init (StatusBar, App, Keyboard) |
| `src/app/features/nutrition/components/Foods.tsx` | modified | Use `apiBase` |
| `.env.native` | **new** | `VITE_API_BASE=https://personalfit-app.vercel.app` |
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
"@capacitor/splash-screen": "^7.0.0",
"cross-env": "^7.0.3"
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
