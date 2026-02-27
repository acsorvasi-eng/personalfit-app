/**
 * Application Routes
 * Defines the complete routing structure including:
 * - Onboarding flow: splash → onboarding → login → terms → subscription
 * - Main app with bottom navigation: menu, foods, shopping, workout, profile
 * - Special routes: log-meal, body-vision
 */

import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { Layout } from "./components/Layout";
import { UnifiedMenu } from "./components/UnifiedMenu";
import { Foods } from "./components/Foods";
import { MealDetail } from "./components/MealDetail";
import { ShoppingList } from "./components/ShoppingList";
import { Profile } from "./components/Profile";
import { BodyVision3D } from "./components/body-vision/BodyVision3D";
import { SplashScreen } from "./components/SplashScreen";
import { Workout } from "./components/Workout";
import { LogMeal } from "./components/LogMeal";
import { Checkout } from "./components/Checkout";
import { NotFound } from "./components/NotFound";
import { FAQPage } from "./components/FAQPage";
import { AboutPage } from "./components/AboutPage";
import { ContactPage } from "./components/ContactPage";

// Onboarding flow screens
import { OnboardingScreen } from "./components/onboarding/OnboardingScreen";
import { LoginScreen } from "./components/onboarding/LoginScreen";
import { TermsScreen } from "./components/onboarding/TermsScreen";
import { SubscriptionScreen } from "./components/onboarding/SubscriptionScreen";

// Plan Setup & Manual Input
import { PlanSetupScreen } from "./components/onboarding/PlanSetupScreen";
import { ManualMealInput } from "./components/ManualMealInput";
import { ProtectedRoute, OnboardingGuard } from "./components/ProtectedRoute";

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
            <PlanSetupScreen />
          </ProtectedRoute>
        ),
      },

      // === Special Full-Screen Routes ===
      {
        path: "body-vision",
        element: (
          <ProtectedRoute>
            <BodyVision3D />
          </ProtectedRoute>
        ),
      },
      {
        path: "log-meal",
        element: (
          <ProtectedRoute>
            <LogMeal />
          </ProtectedRoute>
        ),
      },
      {
        path: "checkout",
        element: (
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        ),
      },
      {
        path: "manual-meal-input",
        element: (
          <ProtectedRoute>
            <ManualMealInput />
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
          { index: true, Component: UnifiedMenu },
          { path: "foods", Component: Foods },
          { path: "meals/:mealType", Component: MealDetail },
          { path: "shopping", Component: ShoppingList },
          { path: "profile", Component: Profile },
          { path: "workout", Component: Workout },
          { path: "faq", Component: FAQPage },
          { path: "about", Component: AboutPage },
          { path: "contact", Component: ContactPage },
          { path: "*", Component: NotFound },
        ],
      },
    ],
  },
]);