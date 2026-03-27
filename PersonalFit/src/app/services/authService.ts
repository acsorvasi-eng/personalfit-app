/**
 * Authentication Service
 * Handles Firebase Email/Password auth, Google OAuth (signInWithPopup),
 * and user session management.
 *
 * Firebase Auth is the source of truth for both email/password and Google sign-in.
 */

import { auth } from '../../firebase';
import { getSetting, setSetting, removeSetting } from '../backend/services/SettingsService';
import { createOrUpdateUser } from './userFirestoreService';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  updateEmail as fbUpdateEmail,
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  type User as FirebaseUser,
} from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  provider: 'google' | 'email' | 'demo' | 'local';
  createdAt: string;
  isFirstLogin: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Demo / Offline fallback
// ═══════════════════════════════════════════════════════════════

/**
 * Firebase error codes that indicate the project's Auth providers
 * haven't been configured yet.  When we hit one of these we fall
 * back to a local-only "demo" session so the app stays usable.
 */
const FIREBASE_CONFIG_ERRORS = new Set([
  'auth/configuration-not-found',
  'auth/operation-not-allowed',
  'auth/admin-restricted-operation',
]);

function isFirebaseConfigError(err: any): boolean {
  return FIREBASE_CONFIG_ERRORS.has(err?.code);
}

/**
 * Create a local-only demo user.  No Firebase interaction.
 * The user object is stored in app settings (IndexedDB) like a real session.
 */
async function createDemoUser(
  email: string,
  displayName?: string,
  isFirstLogin = true
): Promise<AuthUser> {
  // Deterministic ID so the same email always yields the same user
  const id = 'demo_' + email.replace(/[^a-zA-Z0-9]/g, '_');
  const user: AuthUser = {
    id,
    email,
    name: displayName || email.split('@')[0],
    avatar: '',
    provider: 'demo',
    createdAt: new Date().toISOString(),
    isFirstLogin,
  };
  console.warn(
    '[Auth] Firebase Auth providers are not configured. Running in DEMO mode (local-only session). ' +
    'To enable real auth, go to Firebase Console → Authentication → Sign-in method and enable Email/Password and/or Google, ' +
    'then add your app domain to the Authorized domains list.'
  );
  await storeUser(user);
  return user;
}

const AUTH_STORAGE_KEY = 'authUser';
const TERMS_STORAGE_KEY = 'hasAcceptedTerms';
const ONBOARDING_STORAGE_KEY = 'hasCompletedOnboarding';

// ═══════════════════════════════════════════════════════════════
// Firebase → AuthUser mapper
// ═══════════════════════════════════════════════════════════════

function firebaseUserToAuthUser(
  fbUser: FirebaseUser,
  isFirstLogin: boolean
): AuthUser {
  return {
    id: fbUser.uid,
    email: fbUser.email || '',
    name: fbUser.displayName || fbUser.email?.split('@')[0] || '',
    avatar: fbUser.photoURL || '',
    provider: 'email',
    createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
    isFirstLogin,
  };
}

// ═══════════════════════════════════════════════════════════════
// Email / Password — Firebase Auth
// ═══════════════════════════════════════════════════════════════

/**
 * Register a new user with email & password via Firebase Auth.
 * Optionally sets displayName via updateProfile.
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthUser> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = credential.user;

    if (displayName) {
      await updateProfile(fbUser, { displayName });
    }

    // Send verification email — 5s timeout so a slow Firebase email
    // service never blocks the registration flow.
    try {
      await Promise.race([
        sendEmailVerification(fbUser),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('verification-timeout')), 5000)
        ),
      ]);
    } catch (verifyErr) {
      console.warn('[Auth] Failed to send verification email:', verifyErr);
    }

    const appUser = firebaseUserToAuthUser(fbUser, true);
    await storeUser(appUser);
    createOrUpdateUser(appUser.id, appUser.name, appUser.email).catch(() => {});
    return appUser;
  } catch (err: any) {
    // Firebase Auth not configured → fall back to demo mode
    if (isFirebaseConfigError(err)) {
      return createDemoUser(email, displayName, true);
    }
    throw err;
  }
}

/**
 * Sign in an existing user with email & password via Firebase Auth.
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthUser> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = credential.user;

    // Returning user
    const appUser = firebaseUserToAuthUser(fbUser, false);
    await storeUser(appUser);
    createOrUpdateUser(appUser.id, appUser.name, appUser.email).catch(() => {});
    return appUser;
  } catch (err: any) {
    // Firebase Auth not configured → fall back to demo mode
    if (isFirebaseConfigError(err)) {
      const existing = await getStoredUser();
      const isFirst = !existing || existing.email !== email;
      return createDemoUser(email, undefined, isFirst);
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
// Google OAuth — Real Firebase signInWithPopup
// ═══════════════════════════════════════════════════════════════

const googleProvider = new GoogleAuthProvider();
// Request email scope so we always get the user's email
googleProvider.addScope('email');
googleProvider.addScope('profile');

/**
 * Detect if we're running inside a Capacitor native shell.
 * Uses window.location checks instead of Capacitor.isNativePlatform()
 * to avoid import issues that caused black screen in firebase.ts / api.ts.
 */
function isNativePlatform(): boolean {
  const proto = window.location.protocol;
  const host = window.location.hostname;
  // Capacitor iOS uses capacitor:// or serves from localhost
  return proto === 'capacitor:' || host === 'localhost';
}

/**
 * Native Google Sign-In via @capacitor-firebase/authentication.
 * Uses the native Google Sign-In SDK, then exchanges the idToken
 * for a Firebase Auth credential so the web SDK session stays in sync.
 */
async function loginWithGoogleNative(): Promise<AuthUser> {
  const result = await FirebaseAuthentication.signInWithGoogle();
  const idToken = result.credential?.idToken;
  if (!idToken) {
    throw new Error('Google Sign-In did not return an idToken');
  }

  // Exchange native idToken for a Firebase web-SDK credential
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  const fbUser = userCredential.user;

  const creationTime = fbUser.metadata.creationTime
    ? new Date(fbUser.metadata.creationTime).getTime()
    : 0;
  const lastSignIn = fbUser.metadata.lastSignInTime
    ? new Date(fbUser.metadata.lastSignInTime).getTime()
    : 0;
  const isFirstLogin = Math.abs(lastSignIn - creationTime) < 10_000;

  const appUser: AuthUser = {
    id: fbUser.uid,
    email: fbUser.email || '',
    name: fbUser.displayName || fbUser.email?.split('@')[0] || '',
    avatar: fbUser.photoURL || '',
    provider: 'google',
    createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
    isFirstLogin,
  };

  await storeUser(appUser);
  createOrUpdateUser(appUser.id, appUser.name, appUser.email).catch(() => {});
  return appUser;
}

export async function loginWithGoogle(): Promise<AuthUser> {
  // ─── Native path (iOS / Android) ───
  if (isNativePlatform()) {
    try {
      return await loginWithGoogleNative();
    } catch (nativeError: any) {
      // User cancelled the native sign-in sheet
      if (
        nativeError?.message?.includes('canceled') ||
        nativeError?.message?.includes('cancelled') ||
        nativeError?.code === 'auth/popup-closed-by-user'
      ) {
        throw nativeError;
      }
      console.warn('[Auth] Native Google sign-in error:', nativeError);
      return createDemoUser('demo@sixth-halt.app', 'Demo User', true);
    }
  }

  // ─── Web path: Popup (preferred) ───
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    const creationTime = fbUser.metadata.creationTime
      ? new Date(fbUser.metadata.creationTime).getTime()
      : 0;
    const lastSignIn = fbUser.metadata.lastSignInTime
      ? new Date(fbUser.metadata.lastSignInTime).getTime()
      : 0;
    const isFirstLogin = Math.abs(lastSignIn - creationTime) < 10_000;

    const appUser: AuthUser = {
      id: fbUser.uid,
      email: fbUser.email || '',
      name: fbUser.displayName || fbUser.email?.split('@')[0] || '',
      avatar: fbUser.photoURL || '',
      provider: 'google',
      createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
      isFirstLogin,
    };

    await storeUser(appUser);
    createOrUpdateUser(appUser.id, appUser.name, appUser.email).catch(() => {});
    return appUser;
  } catch (popupError: any) {
    // Firebase Auth not configured → fall back to demo mode immediately
    if (isFirebaseConfigError(popupError)) {
      return await createDemoUser('demo@sixth-halt.app', 'Demo User', true);
    }

    // Popup blocked by browser/sandbox → try redirect, then demo fallback
    if (popupError?.code === 'auth/popup-blocked') {
      console.warn('[Auth] Popup blocked — attempting redirect fallback');
      try {
        await signInWithRedirect(auth, googleProvider);
        // If redirect initiates successfully, the page will reload.
        // This line is only reached if the redirect didn't navigate away.
        // Return a pending promise that never resolves (page is redirecting).
        return new Promise(() => {});
      } catch (redirectError: any) {
        // Redirect also failed (sandbox, config error, etc.) → demo mode
        console.warn('[Auth] Redirect also failed — entering demo mode:', redirectError?.code);
        return createDemoUser('demo@sixth-halt.app', 'Demo User', true);
      }
    }

    // User closed popup — don't fall back, re-throw so UI shows nothing
    if (popupError?.code === 'auth/popup-closed-by-user' || popupError?.code === 'auth/cancelled-popup-request') {
      throw popupError;
    }

    // Any other Firebase/network error → demo fallback for resilience
    console.warn('[Auth] Google sign-in error — entering demo mode:', popupError?.code);
    return createDemoUser('demo@sixth-halt.app', 'Demo User', true);
  }
}

/**
 * Check for a pending redirect result (called once on app init).
 * Returns the AuthUser if a Google redirect sign-in just completed, or null.
 */
export async function checkGoogleRedirectResult(): Promise<AuthUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const fbUser = result.user;
    const creationTime = fbUser.metadata.creationTime
      ? new Date(fbUser.metadata.creationTime).getTime()
      : 0;
    const lastSignIn = fbUser.metadata.lastSignInTime
      ? new Date(fbUser.metadata.lastSignInTime).getTime()
      : 0;
    const isFirstLogin = Math.abs(lastSignIn - creationTime) < 10_000;

    const appUser: AuthUser = {
      id: fbUser.uid,
      email: fbUser.email || '',
      name: fbUser.displayName || fbUser.email?.split('@')[0] || '',
      avatar: fbUser.photoURL || '',
      provider: 'google',
      createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
      isFirstLogin,
    };

    await storeUser(appUser);
    return appUser;
  } catch (err) {
    console.error('[Auth] getRedirectResult error:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Account management — change email / password
// ═══════════════════════════════════════════════════════════════

/**
 * Re-authenticate the current Firebase user with their current password.
 * Required before sensitive operations (email/password change).
 */
async function reauthenticate(currentPassword: string): Promise<FirebaseUser> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.email) {
    throw { code: 'auth/requires-recent-login' };
  }
  const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
  await reauthenticateWithCredential(fbUser, credential);
  return fbUser;
}

/**
 * Change the current user's email address.
 * Requires the current password for re-authentication.
 */
export async function changeEmail(
  newEmail: string,
  currentPassword: string
): Promise<AuthUser> {
  const fbUser = await reauthenticate(currentPassword);
  await fbUpdateEmail(fbUser, newEmail);

  // Update local session
  const updatedUser = firebaseUserToAuthUser(fbUser, false);
  // Email may not reflect immediately on the fbUser object, force it:
  updatedUser.email = newEmail;
  await storeUser(updatedUser);
  return updatedUser;
}

/**
 * Change the current user's password.
 * Requires the current password for re-authentication.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const fbUser = await reauthenticate(currentPassword);
  await fbUpdatePassword(fbUser, newPassword);
}

/**
 * Send a password reset email via Firebase Auth.
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  try {
    await fbSendPasswordResetEmail(auth, email);
  } catch (err: any) {
    // In demo mode, just pretend the email was sent
    if (isFirebaseConfigError(err)) {
      console.warn('[Auth] Demo mode — password reset email simulated for:', email);
      return;
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
// Local-only auth (no Firebase, no cloud — MVP offline flow)
// ═══════════════════════════════════════════════════════════════

/**
 * Create a local-only session identified by display name only.
 * No email, no password, no Firebase. Everything stays on device.
 * Terms are auto-accepted for local users.
 */
export async function loginLocal(name: string): Promise<AuthUser> {
  const trimmedName = name.trim() || 'User';
  const id = 'local_' + Date.now();
  const user: AuthUser = {
    id,
    email: '',
    name: trimmedName,
    avatar: '',
    provider: 'local',
    createdAt: new Date().toISOString(),
    isFirstLogin: true,
  };
  // Store session and auto-accept terms (local = privacy-first, no T&C needed)
  await Promise.all([
    storeUser(user),
    setSetting(TERMS_STORAGE_KEY, 'true'),
  ]);
  return user;
}

// ═══════════════════════════════════════════════════════════════
// Session helpers
// ═══════════════════════════════════════════════════════════════

async function storeUser(user: AuthUser): Promise<void> {
  await setSetting(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<AuthUser | null> {
  try {
    const data = await getSetting(AUTH_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Ignore — may not have active Firebase session (e.g. Google sim)
  }
  await Promise.all([
    removeSetting(AUTH_STORAGE_KEY),
    removeSetting(TERMS_STORAGE_KEY),
    removeSetting(ONBOARDING_STORAGE_KEY),
    removeSetting('hasSeenSplash'),
    removeSetting('subscriptionData'),
  ]);
}

export async function hasAcceptedTerms(): Promise<boolean> {
  return (await getSetting(TERMS_STORAGE_KEY)) === 'true';
}

export async function acceptTerms(): Promise<void> {
  await setSetting(TERMS_STORAGE_KEY, 'true');
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  return (await getSetting(ONBOARDING_STORAGE_KEY)) === 'true';
}

export async function completeOnboarding(): Promise<void> {
  await setSetting(ONBOARDING_STORAGE_KEY, 'true');
}