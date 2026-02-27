/**
 * ====================================================================
 * UX FLOW DEFINITIONS - Optimized User Flows (2026 Best Practices)
 * ====================================================================
 * This file documents all optimized user flows and serves as the
 * single source of truth for interaction patterns across the app.
 * 
 * Each flow defines: entry points, key steps, conversions, exit points,
 * friction reducers, and links to DSM components.
 * ====================================================================
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  TARGET PERSONA                                            │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Name: "Márton" / "Anna"                                   │
 * │  Age: 25–45                                                │
 * │  Location: Marosvásárhely (Târgu Mureș), Romania           │
 * │  Language: Hungarian                                       │
 * │  Device: Android 70% / iOS 30%, mid-range smartphones     │
 * │  Goal: Lose weight / get fit via 4-week meal plan          │
 * │  Tech level: Medium (uses banking apps, social media)     │
 * │  Frustration: Complex diet apps, English-only content     │
 * │  Motivation: Visual progress, social accountability       │
 * └─────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  PRIMARY GOALS & CONVERSIONS                               │
 * ├─────────────────────────────────────────────────────────────┤
 * │  1. Follow daily meal plan (3 meals/day × 28 days = 84)   │
 * │  2. Log calorie intake accurately                         │
 * │  3. Build shopping list from plan                         │
 * │  4. Track workout activity                                │
 * │  5. Monitor weight/body progress                          │
 * │  6. Maintain water intake                                 │
 * │  7. Subscribe to premium (trial → paid conversion)        │
 * └─────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  MOST USED FEATURES (by frequency)                        │
 * ├─────────────────────────────────────────────────────────────┤
 * │  1. View today's meals (UnifiedMenu) — daily              │
 * │  2. Check off completed meals — 3×/day                    │
 * │  3. Water tracking — 6-12×/day                            │
 * │  4. Log exception meals (LogMeal) — 1-2×/day             │
 * │  5. Browse food database — 2-3×/week                      │
 * │  6. Shopping list — 1-2×/week                             │
 * │  7. Workout logging — 3×/week                             │
 * │  8. Profile/weight check — 1-2×/week                      │
 * └─────────────────────────────────────────────────────────────┘
 *
 * ====================================================================
 * FLOW 1: FIRST TIME USER (FTI)
 * ====================================================================
 * 
 * CURRENT (4 friction screens):
 * ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌──────────┐  ┌──────┐
 * │ Splash  │→ │ Onboarding│→ │  Login  │→ │  Terms   │→ │ App  │
 * │  (2s)   │  │ (4 slides)│  │ (Google)│  │ (scroll) │  │      │
 * └─────────┘  └───────────┘  └─────────┘  └──────────┘  └──────┘
 *   ↑ forced     ↑ no swipe     ↑ ok        ↑ long       Total: 5 taps min
 *     wait         support                    scroll
 *
 * OPTIMIZED (reduced friction):
 * ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌──────────┐  ┌──────┐
 * │ Splash  │→ │ Onboarding│→ │  Login  │→ │  Terms   │→ │ App  │
 * │ (1.2s)  │  │ (4, swipe)│  │ (Google)│  │(condensed)│  │+coach│
 * └─────────┘  └───────────┘  └─────────┘  └──────────┘  └──────┘
 *   ↑ faster     ↑ swipe +      ↑ same      ↑ trust     ↑ coach marks
 *   auto-lang      step count                 badges       for discovery
 *
 * Changes implemented:
 * ✅ Splash: 2s → 1.2s animation delay
 * ✅ Onboarding: Added swipe gesture support + step counter "1/4"
 * ✅ App entry: Added DSMCoachMark for long-press/swipe discovery
 * 
 * Remaining suggestions:
 * - Add "peek preview" of meal plan on last onboarding slide
 * - Combine Terms checkbox with accept button (single tap)
 * - Add skip-to-app for returning users who cleared cache
 * 
 * ====================================================================
 * FLOW 2: DAILY MEAL TRACKING (Primary — highest frequency)
 * ====================================================================
 * 
 * CURRENT:
 * ┌──────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐
 * │ Open │→ │ Calendar at  │→ │ Scroll to    │→ │  Tap   │
 * │ app  │  │ today (auto) │  │ current meal │  │ check  │
 * └──────┘  └──────────────┘  └──────────────┘  └────────┘
 *             ↑ good           ↑ auto-scroll     ↑ only in
 *                                works, but        time window
 *                                delayed 350ms     (strict)
 * 
 * OPTIMIZED (already mostly good — improvements):
 * ✅ Auto-scroll to current meal on load (already implemented)
 * ✅ Haptic feedback on check [10, 20] (already implemented)
 * ✅ Coach mark explains long-press for alternatives
 * ✅ Consumed meals collapse to save scroll space
 * 
 * Suggestions for further optimization:
 * - Add "undo" toast after checking a meal (5s window)
 * - Show estimated calories gained from current meal inline
 * - Add gentle pulse animation on the "checkable" meal
 *
 * ====================================================================
 * FLOW 3: LOG EXCEPTION MEAL
 * ====================================================================
 * 
 * CURRENT:
 * ┌──────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐  ┌──────┐
 * │ Menu │→ │ Tap "+" in   │→ │ /log-meal    │→ │ Search │→ │ Add  │
 * │ page │  │ header stat  │  │ full page    │  │ + qty  │  │ meal │
 * └──────┘  └──────────────┘  └──────────────┘  └────────┘  └──────┘
 *             ↑ small target    ↑ full nav       ↑ good     ↑ navigate
 *               in stat card     context loss      UX         back needed
 *
 * SUGGESTED (DSMBottomSheet instead of full navigation):
 * ┌──────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐
 * │ Menu │→ │ Tap "+" FAB  │→ │ Bottom sheet │→ │ Added! │
 * │ page │  │ or stat card │  │ search + add │  │ toast  │
 * └──────┘  └──────────────┘  └──────────────┘  └────────┘
 *             ↑ larger target    ↑ stays on page   ↑ auto-dismiss
 *                                  preserves ctx     success toast
 *
 * DSMBottomSheet component created for this pattern.
 * 
 * ====================================================================
 * FLOW 4: SHOPPING LIST
 * ====================================================================
 * 
 * CURRENT:
 * ┌──────────┐  ┌──────────────┐  ┌────────┐  ┌──────────┐
 * │ Shopping │→ │ Manual search │→ │ Add    │→ │ Checkout │
 * │ tab      │  │ each item    │  │ items  │  │ /delivery│
 * └──────────┘  └──────────────┘  └────────┘  └──────────┘
 *                ↑ repetitive      ↑ good     ↑ good flow
 *                  no auto-suggest
 *
 * SUGGESTED:
 * - Auto-populate from current week's unchecked meals
 * - "Quick fill from this week" button
 * - Smart suggestions based on meal plan
 * - DSMSwipeAction for quick remove from list
 *
 * ====================================================================
 * FLOW 5: WORKOUT LOGGING
 * ====================================================================
 * 
 * CURRENT:
 * ┌──────────┐  ┌──────────────┐  ┌────────┐  ┌──────────┐
 * │ Workout  │→ │ Search 100+  │→ │ Select │→ │ Set time │
 * │ tab      │  │ sports       │  │ sport  │  │ + save   │
 * └──────────┘  └──────────────┘  └────────┘  └──────────┘
 *                ↑ overwhelming    ↑ ok       ↑ ok
 *                  includes AI
 *                  food recommender
 *                  (wrong context)
 *
 * ISSUES:
 * - AI Food Recommender is on Workout tab (mental model mismatch)
 * - 100+ sports in flat list without category pre-filter
 * - No connection between planned workout days (Mon/Wed/Thu) and UI
 *
 * SUGGESTED:
 * - Show today's planned workout type at top
 * - Pre-filter sports by "frequently used" on first load
 * - Move AI Food Recommender to Foods tab or LogMeal
 * - Add "Quick log" for recurring workouts
 *
 * ====================================================================
 * FLOW 6: SUBSCRIPTION CONVERSION
 * ====================================================================
 * 
 * CURRENT (optimized — already good):
 * ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌────────┐
 * │ 10-day   │→ │ Trial ends   │→ │ Premium    │→ │ Stripe │
 * │ free     │  │ banner shows │  │ screen     │  │ pay    │
 * │ trial    │  │ in Profile   │  │ /subscribe │  │        │
 * └──────────┘  └──────────────┘  └────────────┘  └────────┘
 *  ↑ no gate     ↑ subtle push    ↑ premium UI    ↑ standard
 *    full access   not aggressive   glow + anim     Stripe form
 *
 * This flow is well-designed. The 10-day trial with full access
 * reduces sign-up friction while the Profile-based subscription
 * management avoids aggressive paywalls.
 *
 * ====================================================================
 * CRITICAL PAIN POINTS ADDRESSED
 * ====================================================================
 *
 * 1. ❌ DISCOVERY: Users don't know about long-press alternatives
 *    ✅ FIX: DSMCoachMark shown once on first menu visit
 *
 * 2. ❌ ONBOARDING: 2s mandatory wait + no swipe support
 *    ✅ FIX: Reduced to 1.2s + added touch swipe gestures
 *
 * 3. ❌ CONTEXT LOSS: Logging meals navigates away from menu
 *    ✅ FIX: DSMBottomSheet component created for in-context actions
 *
 * 4. ❌ COGNITIVE LOAD: All info on one scroll in UnifiedMenu
 *    ✅ FIX: Consumed meals collapse, clear visual hierarchy
 *
 * 5. ❌ NO FEEDBACK: Trying to check meal outside window = nothing
 *    ✅ FIX: DSMNotification system with "warning" variant for feedback
 *
 * ====================================================================
 * ACCESSIBILITY RECOMMENDATIONS (WCAG 2.2 / 2026 standards)
 * ====================================================================
 * 
 * ✅ Already implemented:
 * - aria-label on icon buttons (DSMIconButton, WaterTracker)
 * - Semantic HTML (h1-h6, nav, button, label)
 * - Touch targets ≥ 44px (bottom nav, buttons)
 * - Color contrast: Green-600 on white = 4.5:1 (AA pass)
 * 
 * ⚠️ Suggested improvements:
 * - Add role="alert" to DSMNotification for screen readers
 * - Add prefers-reduced-motion media query to disable animations
 * - Add skip-to-content link for keyboard navigation
 * - Ensure all custom gestures (long-press, swipe) have
 *   alternative button-based equivalents
 * - Add focus-visible styles to all interactive elements
 * 
 * ====================================================================
 * MICRO-INTERACTION PATTERNS
 * ====================================================================
 * 
 * Pattern           | Trigger        | Feedback          | Component
 * ──────────────────|────────────────|───────────────────|──────────────
 * Meal check        | Tap checkbox   | Vibrate [10,20]   | MealCard
 * Long-press alt    | 500ms hold     | Vibrate [15,30,50]| MealCard
 * Alt select        | Tap alt card   | Vibrate 10ms      | AltSheet
 * Water add         | Tap glass      | Vibrate 10ms      | WaterTracker
 * Snack toggle      | Tap icon       | Vibrate [10,20]   | RestTimer
 * Day swipe         | Horizontal     | Motion spring     | UnifiedMenu
 * Pull to refresh   | Pull down      | Bounce spring     | (suggested)
 * Success toast     | Action done    | Spring slide-in   | DSMNotification
 * Coach mark show   | First visit    | Scale spring      | DSMCoachMark
 * Bottom sheet open | Tap trigger    | Spring from bottom| DSMBottomSheet
 * Button press      | Tap/hold       | scale(0.98)       | DSMButton
 * Card press        | Tap            | scale(0.99)       | DSMCard
 * Nav item active   | Tap tab        | translateY(-2px)  | BottomNav
 * 
 * ====================================================================
 * DSM COMPONENT MAP (Atoms → Molecules → Components → Pages)
 * ====================================================================
 *
 * ATOMS (/dsm/atoms.tsx):
 * ├── DSMText          → Used in: all screens
 * ├── DSMChip          → Used in: Foods, ShoppingList, CalendarStrip
 * ├── DSMAvatar        → Used in: Profile, ProfileHeader
 * ├── DSMDivider       → Used in: Profile, Foods detail modal
 * ├── DSMTag           → Used in: Profile (subscription status)
 * ├── DSMIcon          → Used in: all list items, feature rows
 * ├── DSMDot           → Used in: CalendarStrip, Foods benefits
 * ├── DSMEmptyState    → Used in: Foods (no results), Shopping (empty)
 * ├── DSMGradientText  → Used in: SubscriptionScreen hero
 * └── DSMSkeleton      → Used in: loading states
 *
 * MOLECULES (/dsm/molecules.tsx):
 * ├── DSMFeatureRow    → Used in: SubscriptionScreen features
 * ├── DSMStatRow       → Used in: Profile stats, Workout summary
 * ├── DSMListItem      → Used in: Foods list, Shopping items, Sports
 * ├── DSMNutritionBar  → Used in: Foods detail, LogMeal results
 * ├── DSMMetricCard    → Used in: Profile, Workout totals
 * ├── DSMInfoBanner    → Used in: Menu past/future day, Trial warning
 * ├── DSMActionCard    → Used in: Profile sections
 * ├── DSMFormField     → Used in: Profile edit, LogMeal
 * ├── DSMFeatureGrid   → Used in: OnboardingScreen, SubscriptionScreen
 * └── DSMPriceDisplay  → Used in: Subscription, Checkout
 *
 * COMPONENTS (/dsm/index.tsx):
 * ├── DSMCard          → Universal card container
 * ├── DSMButton        → All CTAs and actions
 * ├── DSMIconButton    → Circular icon actions
 * ├── DSMInput         → Text input fields
 * ├── DSMBadge         → Status indicators
 * ├── DSMProgressBar   → Linear progress
 * ├── DSMSectionTitle  → Section headers
 * ├── DSMHint          → Inline hints
 * ├── DSMModal         → Centered modal
 * ├── DSMConfirmDialog → Confirmation modal
 * ├── DSMGlassPanel    → Dark glass overlay
 * ├── DSMNotification  → Toast / confirm banner
 * └── DSMSubPageHeader → Sub-page navigation header
 *
 * UX PATTERNS (/dsm/ux-patterns.tsx):
 * ├── DSMBottomSheet   → Quick action panels
 * ├── DSMCoachMark     → First-use discovery
 * ├── DSMProgressSteps → Multi-step flows
 * ├── DSMFeedbackPulse → Action confirmation
 * ├── DSMSwipeAction   → Swipe-to-reveal
 * └── DSMEmptyFlow     → Guided empty states
 *
 * LAYOUT (/dsm/index.tsx):
 * ├── PageHeader       → All main screen headers
 * ├── SearchBar        → Search inputs
 * ├── TabFilter        → Category filters
 * ├── BottomNav        → 5-tab navigation
 * └── WaterTracker     → Water intake widget
 *
 * ====================================================================
 */

// This file is documentation-only. Export a type for reference.
export type UXFlowId =
  | "fti-onboarding"
  | "daily-meal-tracking"
  | "log-exception-meal"
  | "shopping-list"
  | "workout-logging"
  | "subscription-conversion"
  | "body-vision"
  | "profile-management";