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
import { getSetting, setSetting } from '../backend/services/SettingsService';

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
  appFirstUsageDate: string | null;
  hasCompletedFullFlow: boolean;
  hasPlanSetup: boolean;
  setHasPlanSetup: (v: boolean) => void;
  setHasCompletedFullFlow: (v: boolean) => void;
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
  appFirstUsageDate: null,
  hasCompletedFullFlow: false,
  hasPlanSetup: false,
  setHasPlanSetup: () => {},
  setHasCompletedFullFlow: () => {},
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenSplash, setHasSeenSplash] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [appFirstUsageDate, setAppFirstUsageDate] = useState<string | null>(null);
  const [hasCompletedFullFlow, setHasCompletedFullFlowState] = useState(false);
  const [hasPlanSetup, setHasPlanSetup] = useState(false);

  // Initialize state from IndexedDB on mount
  useEffect(() => {
    let settled = false;
    const stopLoading = () => {
      if (!settled) {
        settled = true;
        setIsLoading(false);
      }
    };
    const timeoutId = setTimeout(stopLoading, 3000);

    (async () => {
      const [storedUser, storedSub, seenSplash, onboarding, terms, subActive, firstUsage, fullFlow, planSetup] = await Promise.all([
        getStoredUser(),
        getSubscription(),
        getSetting('hasSeenSplash'),
        checkOnboarding(),
        checkTerms(),
        checkSubscription(),
        getSetting('appFirstUsageDate'),
        getSetting('hasCompletedFullFlow'),
        getSetting('hasPlanSetup'),
      ]);
      setUser(storedUser);
      setHasSeenSplash(seenSplash === 'true');
      setOnboardingCompleted(onboarding);
      setTermsAccepted(terms);
      setSubscriptionActive(subActive);
      setSubscription(storedSub);
      setAppFirstUsageDate(firstUsage);
      setHasCompletedFullFlowState(fullFlow === 'true');
      setHasPlanSetup(planSetup === 'true');
      if (!firstUsage) {
        const now = new Date().toISOString();
        await setSetting('appFirstUsageDate', now);
        setAppFirstUsageDate(now);
      }
    })()
      .then(() => stopLoading())
      .catch(() => stopLoading());

    console.log('[Auth] checkGoogleRedirectResult starting');
    checkGoogleRedirectResult()
      .then((redirectUser) => {
        if (redirectUser) setUser(redirectUser);
        stopLoading();
      })
      .catch(() => stopLoading())
      .finally(() => {
        console.log('[Auth] checkGoogleRedirectResult done');
        clearTimeout(timeoutId);
      });
  }, []);

  const setHasCompletedFullFlow = useCallback((v: boolean) => {
    setHasCompletedFullFlowState(v);
    setSetting('hasCompletedFullFlow', v ? 'true' : 'false').catch(() => {});
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
    setSetting('hasSeenSplash', 'true').catch(() => {});
    setHasSeenSplash(true);
  }, []);

  const markOnboardingComplete = useCallback(async () => {
    await storeOnboarding();
    setOnboardingCompleted(true);
  }, []);

  const markTermsAccepted = useCallback(async () => {
    await storeTerms();
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
    const updated = await getSubscription();
    setSubscription(updated);
  }, []);

  /**
   * Determines the next route in the onboarding flow
   * based on what steps the user has completed.
   * Returning users (who have completed the full flow before)
   * skip the splash screen automatically.
   */
  const getNextRoute = useCallback((): string => {
    if (hasCompletedFullFlow && appFirstUsageDate) return '/';
    if (!hasSeenSplash) return '/splash';
    if (!onboardingCompleted) return '/onboarding';
    if (!user) return '/login';
    if (!termsAccepted) return '/terms';
    if (!hasCompletedFullFlow) setHasCompletedFullFlow(true);
    return '/';
  }, [hasSeenSplash, onboardingCompleted, user, termsAccepted, hasCompletedFullFlow, appFirstUsageDate, setHasCompletedFullFlow]);

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
        appFirstUsageDate,
        hasCompletedFullFlow,
        hasPlanSetup,
        setHasPlanSetup: (v) => {
          setHasPlanSetup(v);
          setSetting('hasPlanSetup', v ? 'true' : 'false').catch(() => {});
        },
        setHasCompletedFullFlow,
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