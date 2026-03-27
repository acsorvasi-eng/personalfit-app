/**
 * Application Routes
 * Defines the complete routing structure including:
 * - Onboarding flow: splash → onboarding → login → terms → subscription
 * - Main app with bottom navigation: menu, foods, shopping, workout, profile
 * - Special routes: log-meal, body-vision
 *
 * Heavy route components are lazy-loaded to reduce the initial bundle size.
 */

import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { Layout } from "./shared/layouts/Layout";
import { SplashScreen } from "./components/SplashScreen";
import { NotFound } from "./components/NotFound";

// Onboarding flow screens (small — kept eagerly loaded)
import { OnboardingScreen } from "./components/onboarding/OnboardingScreen";
import { LoginScreen } from "./components/onboarding/LoginScreen";
import { TermsScreen } from "./components/onboarding/TermsScreen";
import { SubscriptionScreen } from "./components/onboarding/SubscriptionScreen";

import { ProtectedRoute, OnboardingGuard } from "./components/ProtectedRoute";

// ── Lazy-loaded route components ─────────────────────────────────────
// Helper: wraps a named-export module for React.lazy (which needs default)
function lazyNamed<T extends Record<string, unknown>>(
  factory: () => Promise<T>,
  name: keyof T,
) {
  return lazy(() =>
    factory().then((mod) => ({ default: mod[name] as ComponentType<unknown> })),
  );
}

const UnifiedMenu = lazyNamed(
  () => import("./features/menu/components/UnifiedMenu"),
  "UnifiedMenu",
);
const MealIntervalEditor = lazyNamed(
  () => import("./features/menu/components/MealIntervalEditor"),
  "MealIntervalEditor",
);
const Foods = lazyNamed(
  () => import("./features/nutrition/components/Foods"),
  "Foods",
);
const MealDetail = lazyNamed(
  () => import("./features/menu/components/MealDetail"),
  "MealDetail",
);
const ShoppingList = lazyNamed(
  () => import("./features/shopping/components/ShoppingList"),
  "ShoppingList",
);
const Profile = lazyNamed(
  () => import("./features/profile/components/Profile"),
  "Profile",
);
const Workout = lazyNamed(
  () => import("./features/workout/components/Workout"),
  "Workout",
);
const BodyVision3D = lazyNamed(
  () => import("./components/body-vision/BodyVision3D"),
  "BodyVision3D",
);
const LogMeal = lazyNamed(
  () => import("./components/LogMeal"),
  "LogMeal",
);
const Checkout = lazyNamed(
  () => import("./components/Checkout"),
  "Checkout",
);
const ManualMealInput = lazyNamed(
  () => import("./components/ManualMealInput"),
  "ManualMealInput",
);
const ProfileSetupWizard = lazyNamed(
  () => import("./components/onboarding/ProfileSetupWizard"),
  "ProfileSetupWizard",
);
const PlanSetupScreen = lazyNamed(
  () => import("./components/onboarding/PlanSetupScreen"),
  "PlanSetupScreen",
);
const FAQPage = lazyNamed(
  () => import("./components/FAQPage"),
  "FAQPage",
);
const AboutPage = lazyNamed(
  () => import("./components/AboutPage"),
  "AboutPage",
);
const ContactPage = lazyNamed(
  () => import("./components/ContactPage"),
  "ContactPage",
);

// Minimal loading fallback (matches the app's dark background)
const Loading = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 28, height: 28, border: "3px solid rgba(0,0,0,0.1)", borderTopColor: "#14b8a6", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
);

/** Wrap a lazy component in Suspense */
function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      // === Onboarding Flow Routes ===
      {
        path: "splash",
        element: (
          <OnboardingGuard>
            <SplashScreen />
          </OnboardingGuard>
        ),
      },
      {
        path: "onboarding",
        element: (
          <OnboardingGuard>
            <OnboardingScreen />
          </OnboardingGuard>
        ),
      },
      {
        path: "login",
        element: (
          <OnboardingGuard>
            <LoginScreen />
          </OnboardingGuard>
        ),
      },
      {
        path: "terms",
        element: (
          <ProtectedRoute>
            <TermsScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: "subscription",
        element: (
          <ProtectedRoute>
            <SubscriptionScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: "plan-setup",
        element: (
          <ProtectedRoute>
            <S><PlanSetupScreen /></S>
          </ProtectedRoute>
        ),
      },
      {
        path: "profile-setup",
        element: (
          <ProtectedRoute>
            <S><ProfileSetupWizard /></S>
          </ProtectedRoute>
        ),
      },

      // === Special Full-Screen Routes ===
      {
        path: "body-vision",
        element: (
          <ProtectedRoute>
            <S><BodyVision3D /></S>
          </ProtectedRoute>
        ),
      },
      {
        path: "log-meal",
        element: (
          <ProtectedRoute>
            <S><LogMeal /></S>
          </ProtectedRoute>
        ),
      },
      {
        path: "checkout",
        element: (
          <ProtectedRoute>
            <S><Checkout /></S>
          </ProtectedRoute>
        ),
      },
      {
        path: "manual-meal-input",
        element: (
          <ProtectedRoute>
            <S><ManualMealInput /></S>
          </ProtectedRoute>
        ),
      },

      // === Main App Routes (with bottom navigation) ===
      {
        path: "/",
        element: (
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <S><UnifiedMenu /></S> },
          { path: "meal-intervals", element: <S><MealIntervalEditor /></S> },
          { path: "foods", element: <S><Foods /></S> },
          { path: "meals/:mealType", element: <S><MealDetail /></S> },
          { path: "shopping", element: <S><ShoppingList /></S> },
          { path: "profile", element: <S><Profile /></S> },
          { path: "workout", element: <S><Workout /></S> },
          { path: "faq", element: <S><FAQPage /></S> },
          { path: "about", element: <S><AboutPage /></S> },
          { path: "contact", element: <S><ContactPage /></S> },
          { path: "*", Component: NotFound },
        ],
      },
    ],
  },
]);