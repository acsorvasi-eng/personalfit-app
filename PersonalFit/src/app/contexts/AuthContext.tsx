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
  loginLocal as authLoginLocal,
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
import { getUserProfile, saveUserProfile } from '../backend/services/UserProfileService';
import { getActivePlan } from '../backend/services/NutritionPlanService';
import {
  loadProfileFromCloud,
  loadSettingsFromCloud,
  loadPlanSummaryFromCloud,
  syncProfileToCloud,
  syncSettingsToCloud,
  syncPlanSummaryToCloud,
  type PlanSummary,
} from '../services/userFirestoreService';

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
  loginLocal: (name: string) => Promise<AuthUser>;
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
  loginLocal: () => Promise.reject(new Error('AuthProvider not mounted')),
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
    // Safety valve: fires only if both operations hang completely
    const timeoutId = setTimeout(stopLoading, 5000);

    const initSettings = async () => {
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
    };

    const initGoogleRedirect = async () => {
      const redirectUser = await checkGoogleRedirectResult();
      if (redirectUser) setUser(redirectUser);
    };

    // Both operations run in parallel; stopLoading fires only after both settle
    Promise.allSettled([initSettings(), initGoogleRedirect()]).finally(() => {
      clearTimeout(timeoutId);
      stopLoading();
    });
  }, []);

  // ─── Cross-device sync: pull from cloud on login, push to cloud ───
  useEffect(() => {
    if (!user || isLoading) return;
    // Only sync for real authenticated users (not local/demo)
    if (user.provider === 'local' || user.provider === 'demo') return;

    const uid = user.id;
    let cancelled = false;

    (async () => {
      try {
        // 1. Profile sync
        const localProfile = await getUserProfile();
        const localIsEmpty = !localProfile.name && !localProfile.weight && !localProfile.age;

        if (localIsEmpty) {
          // New device — try importing from cloud
          const cloudProfile = await loadProfileFromCloud(uid);
          if (cloudProfile && !cancelled) {
            // Strip the 'id' field — local always uses 'current'
            const { id: _ignore, ...rest } = cloudProfile;
            await saveUserProfile(rest);
            console.log('[CloudSync] Imported profile from cloud');
          }
        } else {
          // Local has data — push to cloud in background
          syncProfileToCloud(uid, localProfile).catch(() => {});
        }

        // 2. Settings sync
        const SYNC_KEYS = [
          'language', 'theme', 'hasCompletedOnboarding', 'hasCompletedFullFlow',
          'hasPlanSetup', 'userSports',
        ];

        const localSettings: Record<string, string> = {};
        let localSettingsEmpty = true;
        for (const key of SYNC_KEYS) {
          const val = await getSetting(key);
          if (val) {
            localSettings[key] = val;
            localSettingsEmpty = false;
          }
        }

        if (localSettingsEmpty) {
          const cloudSettings = await loadSettingsFromCloud(uid);
          if (cloudSettings && !cancelled) {
            for (const [key, val] of Object.entries(cloudSettings)) {
              if (val) await setSetting(key, val);
            }
            // Update React state from restored settings
            if (cloudSettings.hasCompletedFullFlow === 'true') setHasCompletedFullFlowState(true);
            if (cloudSettings.hasPlanSetup === 'true') setHasPlanSetup(true);
            console.log('[CloudSync] Imported settings from cloud');
          }
        } else {
          syncSettingsToCloud(uid, localSettings).catch(() => {});
        }

        // 3. Plan summary sync
        const activePlan = await getActivePlan();
        if (activePlan) {
          const localProfile2 = await getUserProfile();
          const summary: PlanSummary = {
            planName: activePlan.label,
            createdAt: activePlan.created_at,
            isActive: true,
            calorieTarget: localProfile2.calorieTarget ?? null,
            mealCount: localProfile2.mealSettings?.mealCount ?? null,
          };
          syncPlanSummaryToCloud(uid, summary).catch(() => {});
        } else {
          // No local plan — check if cloud has one (informational)
          const cloudSummary = await loadPlanSummaryFromCloud(uid);
          if (cloudSummary && !cancelled) {
            console.log('[CloudSync] Cloud has plan summary:', cloudSummary.planName, '— re-generate on this device if needed');
          }
        }
      } catch (err) {
        console.warn('[CloudSync] Sync failed (non-fatal):', err);
      }
    })();

    return () => { cancelled = true; };
  }, [user, isLoading]);

  // ─── Cross-device plan sync: restore from cloud on login ─────
  // Runs when user becomes authenticated. If no local plan exists,
  // tries to load one from Firestore and import it locally.
  useEffect(() => {
    if (!user || user.provider === 'local' || user.provider === 'demo') return;
    if (isLoading) return; // wait for init to finish

    let cancelled = false;
    (async () => {
      try {
        const { getActivePlan, importFromAIParse, activatePlan } =
          await import('../backend/services/NutritionPlanService');
        const localPlan = await getActivePlan();
        if (localPlan || cancelled) return; // already have a plan locally

        const { loadPlanFromCloud } = await import('../services/userFirestoreService');
        const cloudData = await loadPlanFromCloud(user.id);
        if (!cloudData?.parsed || cancelled) return;

        console.log('[AuthContext] No local plan found — restoring from cloud');
        const plan = await importFromAIParse(
          cloudData.parsed,
          cloudData.planMeta?.label || 'Cloud sync plan',
        );
        await activatePlan(plan.id);
        setHasPlanSetup(true);
        setSetting('hasPlanSetup', 'true').catch(() => {});
        console.log('[AuthContext] Cloud plan restored, id:', plan.id);
      } catch (err) {
        console.warn('[AuthContext] Cloud plan restore failed (non-fatal):', err);
      }
    })();

    return () => { cancelled = true; };
  }, [user, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const loginLocal = useCallback(async (name: string) => {
    const loggedInUser = await authLoginLocal(name);
    setUser(loggedInUser);
    setTermsAccepted(true); // auto-accepted inside authLoginLocal
    return loggedInUser;
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
   *
   * IMPORTANT: For authenticated users, we never return /splash or /onboarding.
   * Those are pre-auth screens guarded by OnboardingGuard which redirects
   * authenticated users back to /, creating an infinite replaceState loop.
   */
  const getNextRoute = useCallback((): string => {
    // Unauthenticated flow: splash → onboarding → login
    if (!user) {
      if (!hasSeenSplash) return '/splash';
      if (!onboardingCompleted) return '/onboarding';
      return '/login';
    }
    // Authenticated: send to home if setup is done, else wizard
    if (hasCompletedFullFlow && hasPlanSetup) return '/';
    if (!termsAccepted) return '/terms';
    if (!hasPlanSetup) return '/profile-setup';
    if (!hasCompletedFullFlow) setHasCompletedFullFlow(true);
    return '/';
  }, [hasSeenSplash, onboardingCompleted, user, termsAccepted, hasPlanSetup, hasCompletedFullFlow, setHasCompletedFullFlow]);

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
        loginLocal,
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