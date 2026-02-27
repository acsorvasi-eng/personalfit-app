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

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      // === Onboarding Flow Routes ===
      {
        path: "splash",
        Component: SplashScreen,
      },
      {
        path: "onboarding",
        Component: OnboardingScreen,
      },
      {
        path: "login",
        Component: LoginScreen,
      },
      {
        path: "terms",
        Component: TermsScreen,
      },
      {
        path: "subscription",
        Component: SubscriptionScreen,
      },
      {
        path: "plan-setup",
        Component: PlanSetupScreen,
      },

      // === Special Full-Screen Routes ===
      {
        path: "body-vision",
        Component: BodyVision3D,
      },
      {
        path: "log-meal",
        Component: LogMeal,
      },
      {
        path: "checkout",
        Component: Checkout,
      },
      {
        path: "manual-meal-input",
        Component: ManualMealInput,
      },

      // === Main App Routes (with bottom navigation) ===
      {
        path: "/",
        Component: Layout,
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