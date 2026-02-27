/**
 * AuthContext - Global Authentication & Subscription State
 * Manages the entire user lifecycle: login, T&C, subscription, and session.
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  AuthUser,
  getStoredUser,
  loginWithGoogle as authLogin,
  loginWithEmail as authLoginEmail,
  registerWithEmail as authRegisterEmail,
  logout as authLogout,
  hasAcceptedTerms as checkTerms,
  acceptTerms as storeTerms,
  hasCompletedOnboarding as checkOnboarding,
  completeOnboarding as storeOnboarding,
  checkGoogleRedirectResult,
} from '../services/authService';
import {
  SubscriptionData,
  getSubscription,
  isSubscriptionActive as checkSubscription,
  createSubscription,
  cancelSubscription as cancelSub,
} from '../services/paymentService';

interface AuthContextType {
  // User state
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Flow state
  hasSeenSplash: boolean;
  onboardingCompleted: boolean;
  termsAccepted: boolean;
  subscriptionActive: boolean;
  subscription: SubscriptionData | null;

  // Actions
  loginWithGoogle: () => Promise<AuthUser>;
  loginWithEmail: (email: string, password: string) => Promise<AuthUser>;
  registerWithEmail: (email: string, password: string, name?: string) => Promise<AuthUser>;
  logout: () => void;
  markSplashSeen: () => void;
  markOnboardingComplete: () => void;
  markTermsAccepted: () => void;
  subscribe: () => Promise<SubscriptionData>;
  cancelSubscription: () => Promise<void>;

  // Flow helpers
  getNextRoute: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Safe fallback value returned by useAuth when the context is not yet
 * available (e.g. during React Refresh / HMR re-mounts).
 * Every action is a no-op or returns a sensible default so the app
 * doesn't crash — it simply renders in a "loading" state.
 */
const AUTH_FALLBACK: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // pretend we're still loading → UI shows spinner, not crash
  hasSeenSplash: false,
  onboardingCompleted: false,
  termsAccepted: false,
  subscriptionActive: false,
  subscription: null,
  loginWithGoogle: () => Promise.reject(new Error('AuthProvider not mounted')),
  loginWithEmail: () => Promise.reject(new Error('AuthProvider not mounted')),
  registerWithEmail: () => Promise.reject(new Error('AuthProvider not mounted')),
  logout: () => {},
  markSplashSeen: () => {},
  markOnboardingComplete: () => {},
  markTermsAccepted: () => {},
  subscribe: () => Promise.reject(new Error('AuthProvider not mounted')),
  cancelSubscription: () => Promise.reject(new Error('AuthProvider not mounted')),
  getNextRoute: () => '/splash',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenSplash, setHasSeenSplash] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  // Initialize state from localStorage on mount
  useEffect(() => {
    const storedUser = getStoredUser();
    const storedSub = getSubscription();

    setUser(storedUser);
    setHasSeenSplash(localStorage.getItem('hasSeenSplash') === 'true');
    setOnboardingCompleted(checkOnboarding());
    setTermsAccepted(checkTerms());
    setSubscriptionActive(checkSubscription());
    setSubscription(storedSub);

    // ─── Returning user detection ───
    // If appFirstUsageDate exists, this is a returning user.
    // Record first usage date if not set yet.
    if (!localStorage.getItem('appFirstUsageDate')) {
      localStorage.setItem('appFirstUsageDate', new Date().toISOString());
    }

    // ─── Check for Google redirect result ───
    // If user signed in via redirect (popup was blocked), handle the result here
    checkGoogleRedirectResult().then((redirectUser) => {
      if (redirectUser) {
        setUser(redirectUser);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const loggedInUser = await authLogin();
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const loggedInUser = await authLoginEmail(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    const newUser = await authRegisterEmail(email, password, name);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
    setHasSeenSplash(false);
    setOnboardingCompleted(false);
    setTermsAccepted(false);
    setSubscriptionActive(false);
    setSubscription(null);
  }, []);

  const markSplashSeen = useCallback(() => {
    localStorage.setItem('hasSeenSplash', 'true');
    setHasSeenSplash(true);
  }, []);

  const markOnboardingComplete = useCallback(() => {
    storeOnboarding();
    setOnboardingCompleted(true);
  }, []);

  const markTermsAccepted = useCallback(() => {
    storeTerms();
    setTermsAccepted(true);
  }, []);

  const subscribe = useCallback(async () => {
    if (!user) throw new Error('Nincs bejelentkezett felhasználó');
    const sub = await createSubscription(user.id);
    setSubscription(sub);
    setSubscriptionActive(true);
    return sub;
  }, [user]);

  const cancelSubscription = useCallback(async () => {
    await cancelSub();
    setSubscriptionActive(false);
    const updated = getSubscription();
    setSubscription(updated);
  }, []);

  /**
   * Determines the next route in the onboarding flow
   * based on what steps the user has completed.
   * Returning users (who have completed the full flow before)
   * skip the splash screen automatically.
   */
  const getNextRoute = useCallback((): string => {
    // ─── Returning user fast-path ───
    // If user has completed the entire flow before (user exists, terms accepted),
    // skip splash and onboarding entirely on subsequent visits
    const appFirstUsage = localStorage.getItem('appFirstUsageDate');
    const hasCompletedFlowBefore = localStorage.getItem('hasCompletedFullFlow') === 'true';

    if (hasCompletedFlowBefore && appFirstUsage) {
      // Returning user — go straight to main app
      return '/';
    }

    if (!hasSeenSplash) return '/splash';
    if (!onboardingCompleted) return '/onboarding';
    if (!user) return '/login';
    if (!termsAccepted) return '/terms';

    // Check if user has set up a plan yet (before marking flow complete)
    const hasPlanSetup = localStorage.getItem('hasPlanSetup') === 'true';
    if (!hasPlanSetup) return '/plan-setup';

    // Mark that user has completed the full flow (for future returns)
    if (!hasCompletedFlowBefore) {
      localStorage.setItem('hasCompletedFullFlow', 'true');
    }

    // Subscription is no longer part of the onboarding flow.
    // Users get a 10-day free trial, then need to subscribe from Profile.
    return '/';
  }, [hasSeenSplash, onboardingCompleted, user, termsAccepted]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        hasSeenSplash,
        onboardingCompleted,
        termsAccepted,
        subscriptionActive,
        subscription,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        markSplashSeen,
        markOnboardingComplete,
        markTermsAccepted,
        subscribe,
        cancelSubscription,
        getNextRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return AUTH_FALLBACK;
  }
  return context;
}