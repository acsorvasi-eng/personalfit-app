# Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current blue splash + 3-slide emoji onboarding with a premium teal-themed dark splash and 3 white onboarding slides with animated SVG illustrations.

**Architecture:** Four independent changes: (1) swap the primary design system color from blue to teal in `theme.css`, (2) rewrite `SplashScreen.tsx` to the dark teal design, (3) rewrite `OnboardingScreen.tsx` to the white slides with animated SVG, (4) update translation keys for the new slide content.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS v4 + Framer Motion + Vite

---

## File Structure

| File | Change |
|------|--------|
| `PersonalFit/src/styles/theme.css` | Swap primary color tokens blue → teal |
| `PersonalFit/src/app/components/SplashScreen.tsx` | Full rewrite — dark teal, fork+leaf logo, minimal lang chip |
| `PersonalFit/src/app/components/onboarding/OnboardingScreen.tsx` | Full rewrite — white bg, animated SVG slides |
| `PersonalFit/src/i18n/locales/hu.ts` | Update onboarding slide keys (flat key system) |
| `PersonalFit/src/i18n/locales/en.ts` | Update onboarding slide keys (flat key system) |
| `PersonalFit/src/i18n/locales/ro.ts` | Update onboarding slide keys (flat key system) |

---

## Task 1: Primary color swap — blue → teal

**Files:**
- Modify: `PersonalFit/src/styles/theme.css:47-90`

The primary brand color changes from blue-600 (`#2563EB`) to teal-600 (`#0d9488`). All components that use `bg-primary`, `text-primary`, `border-primary`, `var(--primary)` will automatically update.

- [ ] **Step 1: Edit theme.css — primary tokens**

In `PersonalFit/src/styles/theme.css`, replace these exact lines:

```css
/* BEFORE */
--primary:            #2563EB;
--primary-hover:      #1D4ED8;
--primary-light:      #EFF6FF;
--primary-foreground: #ffffff;
```

```css
/* AFTER */
--primary:            #0d9488;
--primary-hover:      #0f766e;
--primary-light:      #f0fdfa;
--primary-foreground: #ffffff;
```

- [ ] **Step 2: Edit theme.css — accent, ring, sidebar tokens**

Replace:
```css
/* BEFORE */
--secondary:            #EFF6FF;
--secondary-hover:      #DBEAFE;
--secondary-foreground: #1D4ED8;

--accent:            #2563EB;
--accent-hover:      #1D4ED8;

--ring: #2563EB;
--focus-ring-color:  rgba(37, 99, 235, 0.3);

--sidebar-primary:           #2563EB;
--sidebar-primary-foreground: #ffffff;
--sidebar-ring:              #2563EB;
```

```css
/* AFTER */
--secondary:            #f0fdfa;
--secondary-hover:      #ccfbf1;
--secondary-foreground: #0f766e;

--accent:            #0d9488;
--accent-hover:      #0f766e;

--ring: #0d9488;
--focus-ring-color:  rgba(13, 148, 136, 0.3);

--sidebar-primary:           #0d9488;
--sidebar-primary-foreground: #ffffff;
--sidebar-ring:              #0d9488;
```

- [ ] **Step 3: Edit theme.css — shadow and gradient tokens**

Replace:
```css
/* BEFORE */
--shadow-primary:    0 10px 15px -3px rgba(37, 99, 235, 0.2), 0 4px 6px -4px rgba(37, 99, 235, 0.1);
--shadow-primary-lg: 0 20px 25px -5px rgba(37, 99, 235, 0.3), 0 8px 10px -6px rgba(37, 99, 235, 0.2);

--brand-gradient-primary: linear-gradient(135deg, #2563EB, #10B981);
--brand-gradient-header:  linear-gradient(135deg, #2563EB, #1D4ED8);
--brand-gradient-cta:     linear-gradient(90deg, #2563EB, #1D4ED8);
```

```css
/* AFTER */
--shadow-primary:    0 10px 15px -3px rgba(13, 148, 136, 0.2), 0 4px 6px -4px rgba(13, 148, 136, 0.1);
--shadow-primary-lg: 0 20px 25px -5px rgba(13, 148, 136, 0.3), 0 8px 10px -6px rgba(13, 148, 136, 0.2);

--brand-gradient-primary: linear-gradient(135deg, #0d9488, #14b8a6);
--brand-gradient-header:  linear-gradient(135deg, #0d9488, #0f766e);
--brand-gradient-cta:     linear-gradient(90deg, #0d9488, #0f766e);
```

Also update `--chart-1`:
```css
/* BEFORE */
--chart-1: #2563EB;

/* AFTER */
--chart-1: #0d9488;
```

- [ ] **Step 4: Verify build is clean**

```bash
cd PersonalFit && npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors (pre-existing errors in MealDetail.tsx and Foods.tsx are acceptable).

- [ ] **Step 5: Commit**

```bash
git add PersonalFit/src/styles/theme.css
git commit -m "feat: swap primary design system color from blue to teal (#0d9488)"
```

---

## Task 2: Translation keys — new onboarding slide content

**Files:**
- Modify: `PersonalFit/src/i18n/locales/hu.ts` (flat key system — this is what `t()` actually reads)
- Modify: `PersonalFit/src/i18n/locales/en.ts`
- Modify: `PersonalFit/src/i18n/locales/ro.ts`

> **Note:** The app uses flat-key locale files in `src/i18n/locales/`. The nested `src/app/translations/index.ts` is a legacy fallback — do NOT edit it for onboarding keys.

The new slides are: (1) personalized diet / health, (2) data privacy, (3) full picture / sport+sleep.

- [ ] **Step 1: Update Hungarian (HU) — `src/i18n/locales/hu.ts`**

Find lines starting with `'onboarding.` (around line 107–118). Replace those lines:

```typescript
// BEFORE
'onboarding.skip': 'Kihagyom',
'onboarding.next': 'Tovább',
'onboarding.start': 'Kezdjük el!',
'onboarding.slide1.badge': '100% privát',
'onboarding.slide1.title': 'Semmi nem hagyja el a telefonod',
'onboarding.slide1.desc': 'Adataid kizárólag nálad vannak...',
'onboarding.slide2.badge': 'Személyre szabva',
'onboarding.slide2.title': 'Az étrendjed, az életed alapján',
'onboarding.slide2.desc': 'Megadod a tested, szokásaid...',
'onboarding.slide3.badge': 'AI-generált étrend',
'onboarding.slide3.title': 'Egy heti terv, azonnal',
'onboarding.slide3.desc': 'A megadott alapanyagaid alapján...',
```

```typescript
// AFTER
'onboarding.skip': 'Kihagyás',
'onboarding.next': 'Tovább',
'onboarding.start': 'Kezdjük el',
'onboarding.slide1.title': 'Ne alkalmazkodj az étrendhez.\nAz alkalmazkodjon hozzád.',
'onboarding.slide1.desc': 'Az étrended a helyi ételekre és a szokásaidra épül — így végre működik a valós életben is.',
'onboarding.slide2.title': 'Adataid a telefonodon maradnak',
'onboarding.slide2.desc': 'Teljesen offline működik. Te döntesz arról, mi történik az adataiddal — mindig.',
'onboarding.slide3.title': 'Az egész napod formálja az étrendedet',
'onboarding.slide3.desc': 'Mozgás és alvás is számít. Az étrended ezekhez igazodik — valódi egyensúly, minden nap.',
```

Also find `'splash.appSubtitle'` in hu.ts and update:
```typescript
'splash.appSubtitle': 'Személyre szabott étrend, amit tényleg betartasz.',
```

- [ ] **Step 2: Update English (EN) — `src/i18n/locales/en.ts`**

Find lines starting with `'onboarding.` and replace:

```typescript
// AFTER
'onboarding.skip': 'Skip',
'onboarding.next': 'Next',
'onboarding.start': 'Get started',
'onboarding.slide1.title': "Don't adapt to a diet.\nLet the diet adapt to you.",
'onboarding.slide1.desc': 'Your meal plan is built around local foods and your habits — so it finally works in real life.',
'onboarding.slide2.title': 'Your data stays on your phone',
'onboarding.slide2.desc': 'Works completely offline. You decide what happens with your data — always.',
'onboarding.slide3.title': 'Your whole day shapes your diet',
'onboarding.slide3.desc': 'Movement and sleep matter too. Your plan adapts to them — real balance, every day.',
```

Also update `'splash.appSubtitle'` in en.ts:
```typescript
'splash.appSubtitle': 'Personalized nutrition you actually stick to.',
```

- [ ] **Step 3: Update Romanian (RO) — `src/i18n/locales/ro.ts`**

Find lines starting with `'onboarding.` and replace:

```typescript
// AFTER
'onboarding.skip': 'Sari peste',
'onboarding.next': 'Înainte',
'onboarding.start': 'Intră',
'onboarding.slide1.title': 'Nu te adapta la dietă.\nLasă dieta să se adapteze la tine.',
'onboarding.slide1.desc': 'Dieta ta se construiește pe alimentele locale și obiceiurile tale — așa funcționează în viața reală.',
'onboarding.slide2.title': 'Datele tale rămân pe telefon',
'onboarding.slide2.desc': 'Funcționează complet offline. Tu decizi ce se întâmplă cu datele tale — mereu.',
'onboarding.slide3.title': 'Întreaga ta zi îți modelează dieta',
'onboarding.slide3.desc': 'Mișcarea și somnul contează. Dieta ta se adaptează la acestea — echilibru real, în fiecare zi.',
```

Also update `'splash.appSubtitle'` in ro.ts:
```typescript
'splash.appSubtitle': 'Dietă personalizată, pe care chiar o respecți.',
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd PersonalFit && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add PersonalFit/src/i18n/locales/hu.ts PersonalFit/src/i18n/locales/en.ts PersonalFit/src/i18n/locales/ro.ts
git commit -m "feat: update onboarding + splash translation keys for redesign (hu/en/ro)"
```

---

## Task 3: New SplashScreen

**Files:**
- Modify: `PersonalFit/src/app/components/SplashScreen.tsx`

New design: dark teal background (`#0c1f1e`), ambient blobs, single language chip (active language only, tap expands popover), fork+leaf SVG logo in teal rounded box, brand name, tagline, solid teal CTA button pinned to bottom. Preserve the dev bypass double-click and the `markSplashSeen` + `navigate('/onboarding')` logic exactly.

- [ ] **Step 1: Rewrite SplashScreen.tsx**

Replace the entire file content with:

```typescript
/**
 * SplashScreen — premium dark teal entry point
 * Logo: fork + leaf SVG · Language: single chip, tap to expand · CTA: solid teal
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useLanguage, LanguageCode } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { SUPPORTED_LANGUAGES, LANGUAGE_META } from '../../i18n';

const languages = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  name: LANGUAGE_META[code]?.name ?? code,
  flag: LANGUAGE_META[code]?.flag ?? '',
}));

function ForkLeafLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {/* fork */}
      <path
        d="M9 5 L9 13 M9 13 L9 22 M7 5 L7 10 C7 12.5 11 12.5 11 10 L11 5"
        stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* leaf */}
      <path
        d="M15 22 C15 22 15 14 20.5 10 C23 8 26 8 26 8 C26 8 26 11 23.5 13.5 C19 18 15 22 15 22 Z"
        stroke="white" strokeWidth="1.8" strokeLinejoin="round"
      />
      <path d="M15 22 L20.5 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SplashScreen() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { markSplashSeen } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(language);
  const [ready, setReady] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Auto-detect browser language
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    const matched = languages.find(l => l.code === browserLang);
    if (matched) {
      setSelectedLanguage(matched.code as LanguageCode);
      setLanguage(matched.code as LanguageCode);
    }
    const timer = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(timer);
  }, []);

  // Close picker on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  const handleLanguageChange = (code: LanguageCode) => {
    setSelectedLanguage(code);
    setLanguage(code);
    setLangOpen(false);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleContinue = () => {
    setLanguage(selectedLanguage);
    markSplashSeen();
    if (navigator.vibrate) navigator.vibrate([15, 30, 50]);
    navigate('/onboarding');
  };

  // Dev bypass: double-click logo to skip auth in development
  const handleSecretLogoBypass = async () => {
    if (!(import.meta.env.DEV || window.location.hostname === 'localhost')) return;
    const devUser = {
      id: 'dev_bypass_user', email: 'dev@sixth-halt.local', name: 'Dev Bypass',
      avatar: '', provider: 'demo', createdAt: new Date().toISOString(), isFirstLogin: false,
    };
    try {
      const { setSetting } = await import('../backend/services/SettingsService');
      await Promise.all([
        setSetting('authUser', JSON.stringify(devUser)),
        setSetting('hasAcceptedTerms', 'true'),
        setSetting('hasCompletedOnboarding', 'true'),
        setSetting('hasSeenSplash', 'true'),
        setSetting('hasPlanSetup', 'true'),
        setSetting('hasCompletedFullFlow', 'true'),
      ]);
    } catch { return; }
    window.location.href = '/';
  };

  const selectedLang = languages.find(l => l.code === selectedLanguage) || languages[0];

  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative" style={{ background: '#0c1f1e' }}>

      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute rounded-full blur-3xl"
          style={{ width: 280, height: 280, background: '#14b8a6', top: -80, right: -60, opacity: 0.12 }} />
        <div className="absolute rounded-full blur-3xl"
          style={{ width: 200, height: 200, background: '#134e4a', bottom: -40, left: -50, opacity: 0.5 }} />
      </div>

      {/* Top bar — language chip only */}
      <div className="relative z-20 flex items-center justify-end px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div ref={pickerRef} className="relative">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full cursor-pointer select-none"
            style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.35)', color: 'rgba(20,184,166,0.9)' }}
            type="button"
            aria-label={t('splash.chooseLanguage') || 'Nyelv választás'}
          >
            <span className="text-sm leading-none pointer-events-none">{selectedLang.flag}</span>
            <span className="text-xs font-bold pointer-events-none tracking-wide">{selectedLang.code.toUpperCase()}</span>
            <span className="text-xs opacity-60 pointer-events-none">▾</span>
          </motion.button>

          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-full right-0 mt-2 w-52 rounded-2xl shadow-2xl overflow-hidden z-50"
                style={{ background: 'white', border: '1px solid #e2e8f0' }}
              >
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <span className="text-xs font-semibold text-gray-500">{t('splash.language') || 'Nyelv'}</span>
                  <button onClick={() => setLangOpen(false)} type="button"
                    className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer">
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
                <div className="py-1.5">
                  {languages.map((lang) => {
                    const isActive = selectedLanguage === lang.code;
                    return (
                      <button key={lang.code} onClick={() => handleLanguageChange(lang.code as LanguageCode)}
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer"
                        style={{ background: isActive ? '#f0fdfa' : 'transparent' }}>
                        <span className="text-lg leading-none">{lang.flag}</span>
                        <span className="text-sm flex-1 text-left"
                          style={{ fontWeight: isActive ? 700 : 500, color: isActive ? '#0d9488' : '#374151' }}>
                          {lang.name}
                        </span>
                        {isActive && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: '#0d9488' }}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Center — logo + brand + tagline */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo mark */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: '#0d9488', boxShadow: '0 4px 20px rgba(13,148,136,0.4)' }}
          onDoubleClick={handleSecretLogoBypass}
        >
          <ForkLeafLogo />
        </div>

        {/* Brand name */}
        <h1 className="text-3xl text-white mb-3" style={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
          PersonalFit
        </h1>

        {/* Tagline */}
        <p className="text-base leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {t('splash.appSubtitle') || 'Személyre szabott étrend, amit tényleg betartasz.'}
        </p>
      </motion.div>

      {/* Bottom — CTA */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 max-w-md mx-auto w-full"
      >
        <button
          onClick={handleContinue}
          className="w-full h-14 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] cursor-pointer"
          style={{ background: '#0d9488', boxShadow: '0 4px 20px rgba(13,148,136,0.35)' }}
          type="button"
        >
          {t('onboarding.start') || 'Kezdjük el'}
        </button>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd PersonalFit && npx tsc --noEmit 2>&1 | grep "SplashScreen" | head -10
```
Expected: no errors for SplashScreen.tsx.

- [ ] **Step 3: Commit**

```bash
git add PersonalFit/src/app/components/SplashScreen.tsx
git commit -m "feat: redesign SplashScreen — dark teal, fork+leaf logo, minimal lang chip"
```

---

## Task 4: New OnboardingScreen

**Files:**
- Modify: `PersonalFit/src/app/components/onboarding/OnboardingScreen.tsx`

New design: white background, 3 slides with centered layout, animated SVG illustrations (stroke-dashoffset draw-on via Framer Motion), pagination dots centered above the fixed CTA button, no icons or badges, swipe gesture preserved.

**SVG illustrations:**
- Slide 1: plate (circle + dashed inner ring + fork left + knife right) with animated heart inside
- Slide 2: phone outline with shield + checkmark inside
- Slide 3: balance scale (post + arm + two bowls: sun ↔ moon)

- [ ] **Step 1: Rewrite OnboardingScreen.tsx**

Replace the entire file content with:

```typescript
/**
 * OnboardingScreen — white slides with animated SVG illustrations
 * 3 slides: (1) personalized health, (2) data privacy, (3) sport+sleep balance
 * Swipe gesture + pagination dots + fixed CTA button position
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

// SVG path animation: draws on entry, resets on slide change
const DRAW_DURATION = 1.5; // seconds
const DRAW_EASE = [0.4, 0, 0.2, 1] as const;

function AnimatedPath({ d, stroke = '#0f172a', strokeWidth = 2, delay = 0, dasharray = 600 }: {
  d: string; stroke?: string; strokeWidth?: number; delay?: number; dasharray?: number;
}) {
  return (
    <motion.path
      d={d}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: DRAW_DURATION, delay, ease: DRAW_EASE }}
    />
  );
}

function AnimatedCircle({ cx, cy, r, stroke = '#0f172a', strokeWidth = 2, delay = 0, strokeDasharray }: {
  cx: number; cy: number; r: number; stroke?: string; strokeWidth?: number; delay?: number; strokeDasharray?: string;
}) {
  return (
    <motion.circle
      cx={cx} cy={cy} r={r}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: DRAW_DURATION, delay, ease: DRAW_EASE }}
    />
  );
}

function AnimatedRect({ x, y, width, height, rx, stroke = '#0f172a', strokeWidth = 2, delay = 0 }: {
  x: number; y: number; width: number; height: number; rx: number;
  stroke?: string; strokeWidth?: number; delay?: number;
}) {
  return (
    <motion.rect
      x={x} y={y} width={width} height={height} rx={rx}
      stroke={stroke} strokeWidth={strokeWidth} fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: DRAW_DURATION, delay, ease: DRAW_EASE }}
    />
  );
}

// Slide 1: plate + fork + knife + heart
function Slide1Illustration() {
  const TEAL = '#0d9488';
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <AnimatedCircle cx={60} cy={68} r={36} delay={0} />
      <AnimatedCircle cx={60} cy={68} r={25} stroke="#0f172a" strokeWidth={1.5} strokeDasharray="5 4" delay={0.2} />
      {/* fork */}
      <AnimatedPath d="M22 32 L22 50 M22 50 L22 60 M20 32 L20 41 C20 45 24 45 24 41 L24 32" delay={0.3} />
      {/* knife */}
      <AnimatedPath d="M98 32 L98 60 M98 32 C98 32 102 38 102 46 C102 51 98 53 98 53" delay={0.3} />
      {/* heart — lower inside plate, clearly inside inner ring */}
      <AnimatedPath
        d="M60 74 C60 74 50 67 50 61 C50 56.5 54.5 54 60 58.5 C65.5 54 70 56.5 70 61 C70 67 60 74 60 74 Z"
        stroke={TEAL} strokeWidth={2.2} delay={0.65}
      />
    </svg>
  );
}

// Slide 2: phone + shield + checkmark
function Slide2Illustration() {
  const TEAL = '#0d9488';
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <AnimatedRect x={34} y={14} width={52} height={92} rx={8} delay={0} />
      <AnimatedPath d="M46 22 L74 22" delay={0.2} />
      <AnimatedCircle cx={60} cy={97} r={4} delay={0.2} />
      {/* shield */}
      <AnimatedPath
        d="M60 32 C54 32 46 36 46 36 L46 52 C46 61 60 70 60 70 C60 70 74 61 74 52 L74 36 C74 36 66 32 60 32 Z"
        stroke={TEAL} strokeWidth={2.2} delay={0.4}
      />
      {/* checkmark */}
      <AnimatedPath d="M52 51 L57 57 L69 44" stroke={TEAL} strokeWidth={2.4} delay={0.85} />
    </svg>
  );
}

// Slide 3: balance scale — sun (sport) ↔ moon (sleep)
function Slide3Illustration() {
  const TEAL = '#0d9488';
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      {/* post */}
      <AnimatedPath d="M60 22 L60 96" delay={0} />
      <AnimatedPath d="M44 96 L76 96" delay={0.05} />
      {/* arm */}
      <AnimatedPath d="M26 42 L60 32 L94 42" delay={0.15} />
      {/* left bowl */}
      <AnimatedPath d="M26 42 L22 60 C22 65 32 68 32 68 C32 68 42 65 42 60 L38 42" delay={0.3} />
      {/* sun inside left bowl */}
      <AnimatedCircle cx={32} cy={55} r={7} stroke={TEAL} strokeWidth={2} delay={0.55} />
      <AnimatedPath d="M32 45 L32 43 M32 67 L32 65 M22 55 L20 55 M44 55 L42 55 M25 48 L24 47 M40 63 L39 62 M25 62 L24 63 M40 47 L39 48" stroke={TEAL} strokeWidth={1.6} delay={0.7} />
      {/* right bowl */}
      <AnimatedPath d="M78 42 L82 60 C82 65 92 68 92 68 C92 68 102 65 102 60 L98 42" delay={0.3} />
      {/* moon inside right bowl */}
      <AnimatedPath
        d="M90 48 C87 48 84 51 84 55 C84 60 87 63 91 63 C88 64 84 63 82 61 C79 58 79 52 82 49 C84 46 88 46 90 48 Z"
        stroke={TEAL} strokeWidth={2} delay={0.55}
      />
    </svg>
  );
}

const ILLUSTRATIONS = [Slide1Illustration, Slide2Illustration, Slide3Illustration];

const cardVariants = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 80, scale: 0.95 }),
  animate: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 280, damping: 28 } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -80, scale: 0.97, transition: { duration: 0.2, ease: 'easeIn' as const } }),
};

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { markOnboardingComplete } = useAuth();
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStart = useRef(0);

  const slides = useMemo(() => [
    { title: t('onboarding.slide1.title'), desc: t('onboarding.slide1.desc') },
    { title: t('onboarding.slide2.title'), desc: t('onboarding.slide2.desc') },
    { title: t('onboarding.slide3.title'), desc: t('onboarding.slide3.desc') },
  ], [t]);

  const goNext = useCallback(() => {
    if (current < slides.length - 1) {
      setDirection(1);
      setCurrent(p => p + 1);
    } else {
      markOnboardingComplete();
      navigate('/login');
    }
  }, [current, slides.length, markOnboardingComplete, navigate]);

  const goPrev = useCallback(() => {
    if (current > 0) {
      setDirection(-1);
      setCurrent(p => p - 1);
    }
  }, [current]);

  const skip = useCallback(() => {
    markOnboardingComplete();
    navigate('/login');
  }, [markOnboardingComplete, navigate]);

  const isLast = current === slides.length - 1;
  const slide = slides[current];
  const Illustration = ILLUSTRATIONS[current];

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">

      {/* Top bar: skip right-aligned */}
      <div className="flex items-center justify-end px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 min-h-[48px]">
        {!isLast && (
          <button onClick={skip} type="button"
            className="text-sm text-gray-400 font-medium cursor-pointer px-1 py-1">
            {t('onboarding.skip')}
          </button>
        )}
      </div>

      {/* Swipeable content */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full"
        onTouchStart={e => { touchStart.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(dx) > 60) { if (dx < 0) goNext(); else goPrev(); }
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full flex flex-col items-center text-center"
          >
            {/* SVG illustration */}
            <div className="mb-8 flex items-center justify-center" style={{ minHeight: 120 }}>
              <Illustration />
            </div>

            {/* Title */}
            <h2 className="text-2xl text-gray-900 mb-3 whitespace-pre-line" style={{ fontWeight: 800, lineHeight: 1.3 }}>
              {slide.title}
            </h2>

            {/* Description */}
            <p className="text-gray-500 leading-relaxed text-sm max-w-xs">
              {slide.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom: pagination + CTA */}
      <div className="px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 max-w-md mx-auto w-full">

        {/* Pagination dots — centered, above button */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {slides.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
              animate={{
                width: i === current ? 28 : 8,
                backgroundColor: i === current ? '#0d9488' : '#e2e8f0',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="h-2 rounded-full cursor-pointer"
              type="button"
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* CTA button — same position on every slide */}
        <button
          onClick={goNext}
          type="button"
          className="w-full h-14 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] cursor-pointer"
          style={{ background: '#0d9488' }}
        >
          {isLast ? t('onboarding.start') : t('onboarding.next')} →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd PersonalFit && npx tsc --noEmit 2>&1 | grep "OnboardingScreen" | head -10
```
Expected: no errors for OnboardingScreen.tsx.

- [ ] **Step 3: Run tests**

```bash
cd PersonalFit && npm test 2>&1 | tail -10
```
Expected: 10/10 tests pass (onboarding screen has no unit tests, only the buildIngredientSelection tests).

- [ ] **Step 4: Build verification**

```bash
cd PersonalFit && npm run build 2>&1 | tail -10
```
Expected: build succeeds with no new errors.

- [ ] **Step 5: Commit**

```bash
git add PersonalFit/src/app/components/onboarding/OnboardingScreen.tsx
git commit -m "feat: redesign OnboardingScreen — white slides, animated SVG illustrations, teal CTA"
```

---

## Final verification

- [ ] **Run all tests**

```bash
cd PersonalFit && npm test 2>&1 | tail -5
```
Expected: 10 pass, 0 fail.

- [ ] **Full build**

```bash
cd PersonalFit && npm run build 2>&1 | tail -5
```
Expected: `built in X.XXs` with no errors.

- [ ] **Final commit if anything was left unstaged**

```bash
git status
```
If clean: done. If not: stage and commit remaining changes.
