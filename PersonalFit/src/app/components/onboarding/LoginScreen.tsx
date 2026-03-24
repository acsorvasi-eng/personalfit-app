/**
 * LoginScreen - 2-phase authentication
 * Phase 0: "Hogy hívnak?" — name capture (new users only)
 * Phase 1: Google Sign In + Email/Password (all users)
 *
 * Returning users (hasCompletedFullFlow) skip phase 0 and land directly
 * on phase 1 in sign-in mode. After auth, they go home if plan is set up,
 * otherwise they repeat the onboarding wizard.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, ArrowRight, Loader2, Lock, Smartphone,
  Mail, Eye, EyeOff, ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { DSMButton } from '../dsm';

// ─── Google G logo ────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ─── Firebase error → translated message ─────────────────────────
function getAuthErrorMessage(code: string, t: (k: string) => string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-credential': return t('login.errInvalidCredentials');
    case 'auth/wrong-password':     return t('login.errInvalidCredentials');
    case 'auth/email-already-in-use': return t('login.errEmailInUse');
    case 'auth/weak-password':      return t('login.errWeakPassword');
    case 'auth/invalid-email':      return t('login.errInvalidEmail');
    case 'auth/too-many-requests':  return t('login.errTooManyRequests');
    default:                        return t('login.error');
  }
}

// ─── Main component ───────────────────────────────────────────────
export function LoginScreen() {
  const navigate = useNavigate();
  const {
    loginWithGoogle, loginWithEmail, registerWithEmail,
    isAuthenticated, isLoading, getNextRoute,
    hasPlanSetup, hasCompletedFullFlow,
  } = useAuth();
  const { t } = useLanguage();

  // Phase 0 = name, Phase 1 = Google/email auth
  const [phase, setPhase] = useState<0 | 1>(0);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const phaseSetRef = useRef(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Once auth context loads, set starting phase for returning users
  useEffect(() => {
    if (isLoading || phaseSetRef.current) return;
    phaseSetRef.current = true;
    if (hasCompletedFullFlow) {
      setPhase(1);
      setAuthMode('signin');
    }
  }, [isLoading, hasCompletedFullFlow]);

  // Already authenticated → redirect
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const target = getNextRoute();
    if (target && target !== '/login') navigate(target, { replace: true });
  }, [isAuthenticated, isLoading, getNextRoute, navigate]);

  // Auto-focus per phase
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phase === 0) nameInputRef.current?.focus();
      else emailInputRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, [phase]);

  const onAuthSuccess = () => {
    navigate(hasPlanSetup ? '/' : '/profile-setup', { replace: true });
  };

  // ── Phase 0 → Phase 1 ─────────────────────────────────────────
  const handleNameNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setPhase(1);
  };

  // ── Google Sign In ─────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onAuthSuccess();
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(t('login.googleError'));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Email / Password ───────────────────────────────────────────
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      setError(t('login.emailValidationError'));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      if (authMode === 'signup') {
        await registerWithEmail(email, password, name || undefined);
      } else {
        await loginWithEmail(email, password);
      }
      onAuthSuccess();
    } catch (err: any) {
      // DEBUG: show raw error on device — remove after fixing
      const raw = err?.code || err?.message || JSON.stringify(err);
      setError(`[${raw}] ${getAuthErrorMessage(err?.code ?? '', t)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">

          {/* ── Phase 0: Name ─────────────────────────────────── */}
          {phase === 0 && (
            <motion.div
              key="phase0"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full"
            >
              {/* Icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="mb-8"
              >
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
                  <User className="w-10 h-10 text-primary" />
                </div>
              </motion.div>

              {/* Heading */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold text-foreground mb-2">
                  {t('login.heading')}
                </h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {t('login.subheading')}
                </p>
              </div>

              {/* Name form */}
              <form onSubmit={handleNameNext} className="space-y-4 mb-8">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('login.placeholder')}
                    maxLength={40}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-border bg-background text-foreground text-base placeholder:text-gray-400 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <DSMButton
                  type="submit"
                  variant="primary"
                  disabled={!name.trim()}
                  className="w-full h-14 rounded-2xl"
                >
                  <span>{t('login.next')}</span>
                  <ArrowRight className="w-5 h-5" />
                </DSMButton>
              </form>

              {/* Privacy badges */}
              <div className="space-y-2">
                {[
                  { icon: Lock, text: t('login.privacy1') },
                  { icon: Smartphone, text: t('login.privacy2') },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-400">
                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Phase 1: Auth ─────────────────────────────────── */}
          {phase === 1 && (
            <motion.div
              key="phase1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full space-y-5"
            >
              {/* Back (only for new users who came from phase 0) */}
              {!hasCompletedFullFlow && (
                <button
                  onClick={() => setPhase(0)}
                  className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors -ml-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm">{t('login.back')}</span>
                </button>
              )}

              {/* Heading */}
              <div>
                <h1 className="text-2xl font-semibold text-foreground mb-1">
                  {hasCompletedFullFlow ? t('login.welcomeBack') : t('login.welcomeNew').replace('{name}', name)}
                </h1>
                <p className="text-gray-500 text-sm">
                  {authMode === 'signup' ? t('login.createAccountSubtitle') : t('login.signInSubtitle')}
                </p>
              </div>

              {/* Google button */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full h-14 rounded-2xl border-2 border-gray-200 bg-white flex items-center justify-center gap-3 text-gray-700 font-medium text-base hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98] disabled:opacity-60 shadow-sm"
              >
                {googleLoading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <GoogleIcon />}
                {t('login.continueWithGoogle')}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{t('login.or')}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Email / Password form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    placeholder="email@example.com"
                    autoComplete="email"
                    className="w-full h-12 pl-12 pr-4 rounded-2xl border-2 border-border bg-background text-foreground text-sm placeholder:text-gray-400 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    placeholder={t('login.passwordShort')}
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full h-12 pl-12 pr-12 rounded-2xl border-2 border-border bg-background text-foreground text-sm placeholder:text-gray-400 focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}

                <DSMButton
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !email.trim() || password.length < 6}
                  className="w-full h-14 rounded-2xl"
                >
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {authMode === 'signup' ? t('login.createAccountBtn') : t('login.signInBtn')}
                </DSMButton>
              </form>

              {/* Toggle sign-in / sign-up */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setAuthMode(m => m === 'signup' ? 'signin' : 'signup'); setError(null); }}
                  className="text-sm text-gray-500 hover:text-primary transition-colors"
                >
                  {authMode === 'signup' ? t('login.switchToSignIn') : t('login.switchToSignUp')}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
