/**
 * LoginScreen - Email/Password + Google OAuth Login
 * Three views: Sign In, Register (with confirm password), and Forgot Password modal.
 * Handles first-time login (→ Terms) and returning users (→ main app).
 * Google Sign-In uses real Firebase signInWithPopup.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed,
  Sparkles,
  AlertCircle,
  Loader2,
  Shield,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { sendPasswordResetEmail } from '../../services/authService';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

type AuthMode = 'signin' | 'register';
type ScreenView = 'auth' | 'forgotPassword';

/** Map Firebase error codes → user-friendly i18n keys */
function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'login.errEmailInUse';
    case 'auth/invalid-email':
      return 'login.errInvalidEmail';
    case 'auth/weak-password':
      return 'login.errWeakPassword';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'login.errInvalidCredentials';
    case 'auth/too-many-requests':
      return 'login.errTooManyRequests';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'login.errPopupClosed';
    case 'auth/popup-blocked':
      return 'login.errPopupBlocked';
    case 'auth/operation-not-allowed':
      return 'login.errOperationNotAllowed';
    case 'auth/configuration-not-found':
      return 'login.errConfigNotFound';
    case 'auth/network-request-failed':
      return 'login.errNetwork';
    case 'auth/unauthorized-domain':
      return 'login.errUnauthorizedDomain';
    default:
      return '';
  }
}

export function LoginScreen() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithEmail, registerWithEmail, termsAccepted } = useAuth();

  const [mode, setMode] = useState<AuthMode>('register');
  const [view, setView] = useState<ScreenView>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Prefer Sign Up view for first-time users, Sign In for returning users
  useEffect(() => {
    try {
      const hasCompletedFlowBefore = localStorage.getItem('hasCompletedFullFlow') === 'true';
      if (hasCompletedFlowBefore) {
        setMode('signin');
      }
    } catch {
      // localStorage might be unavailable in some environments; ignore and keep default mode
    }
  }, []);

  // ── Navigate after successful auth ────────────────────────
  const navigateAfterAuth = useCallback(
    (isFirstLogin: boolean) => {
      if (isFirstLogin || !termsAccepted) {
        navigate('/terms');
      } else {
        navigate('/');
      }
    },
    [navigate, termsAccepted]
  );

  // ── Email/Password submit ─────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    if (mode === 'register') {
      if (password.length < 6) {
        setError(t('login.errWeakPassword'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('login.errPasswordMismatch'));
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'register') {
        const user = await registerWithEmail(email.trim(), password, name.trim() || undefined);
        if (navigator.vibrate) navigator.vibrate([10, 20]);
        navigateAfterAuth(user.isFirstLogin);
      } else {
        const user = await loginWithEmail(email.trim(), password);
        if (navigator.vibrate) navigator.vibrate([10, 20]);
        navigateAfterAuth(user.isFirstLogin);
      }
    } catch (err: any) {
      console.error('[Auth] Registration/login error:', err?.code, err?.message, err);
      const code = err?.code || '';
      const key = mapFirebaseError(code);
      // Show translated message if we have a mapping, otherwise show the raw Firebase message
      const translatedMsg = key ? t(key) : '';
      setError(translatedMsg || err?.message || t('login.error'));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Google login ──────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      const user = await loginWithGoogle();
      if (navigator.vibrate) navigator.vibrate([10, 20]);
      navigateAfterAuth(user.isFirstLogin);
    } catch (err: any) {
      console.error('[Auth] Google login error:', err?.code, err?.message, err);
      const code = err?.code || '';
      const key = mapFirebaseError(code);
      // Don't show error if user just closed the popup
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        const translatedMsg = key ? t(key) : '';
        setError(translatedMsg || err?.message || t('login.error'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // ── Forgot Password submit ────────────────────────────────
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError(t('login.enterEmailForReset'));
      return;
    }
    setIsResetting(true);
    setResetError(null);
    try {
      await sendPasswordResetEmail(resetEmail.trim());
      setResetEmailSent(true);
      if (navigator.vibrate) navigator.vibrate([10, 20]);
    } catch (err: any) {
      console.error('[Auth] Password reset error:', err?.code, err?.message, err);
      const code = err?.code || '';
      const key = mapFirebaseError(code);
      const translatedMsg = key ? t(key) : '';
      setResetError(translatedMsg || err?.message || t('login.error'));
    } finally {
      setIsResetting(false);
    }
  };

  // ── Toggle mode ──────────────────────────────────────────
  const toggleMode = () => {
    setMode((m) => (m === 'signin' ? 'register' : 'signin'));
    setError(null);
    setConfirmPassword('');
  };

  // ── Open/close forgot password ────────────────────────────
  const openForgotPassword = () => {
    setResetEmail(email); // Pre-fill with current email
    setResetEmailSent(false);
    setResetError(null);
    setView('forgotPassword');
  };

  const closeForgotPassword = () => {
    setView('auth');
    setResetEmailSent(false);
    setResetError(null);
  };

  const anyLoading = isLoading || isGoogleLoading;

  // ═══════════════════════════════════════════════════════════
  // Forgot Password View
  // ═══════════════════════════════════════════════════════════
  if (view === 'forgotPassword') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-[#121212] dark:via-[#121212] dark:to-[#121212] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl shadow-xl mb-5">
              <KeyRound className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-2">
              {t('login.forgotPasswordTitle')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t('login.forgotPasswordDesc')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Card className="border-0 shadow-xl">
              <CardContent className="p-6 pt-6 space-y-4">
                <AnimatePresence mode="wait">
                  {!resetEmailSent ? (
                    <motion.div
                      key="reset-form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Error */}
                      <AnimatePresence>
                        {resetError && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl overflow-hidden mb-4"
                          >
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-red-800 dark:text-red-300 text-sm flex-1">{resetError}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder={t('login.emailPlaceholder')}
                            autoComplete="email"
                            autoFocus
                            required
                            className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={isResetting}
                          className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20 gap-2 transition-all"
                        >
                          {isResetting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                          <span>{isResetting ? t('login.sending') : t('login.sendResetEmail')}</span>
                        </Button>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="reset-success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-4 space-y-4"
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-500/10 rounded-2xl mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-lg text-gray-900 dark:text-gray-100 mb-1">
                          {t('login.resetSuccessTitle')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                          {t('login.resetSuccessDesc')}
                        </p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl px-4 py-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {resetEmail}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Back to login */}
                <button
                  onClick={closeForgotPassword}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors pt-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('login.backToLogin')}
                </button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Main Auth View (Sign In / Register)
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-[#121212] dark:via-[#121212] dark:to-[#121212] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* ── Logo Section ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-400 to-teal-500 rounded-3xl shadow-xl mb-5 rotate-6">
            <UtensilsCrossed className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-2">
            {mode === 'signin' ? t('login.title') : t('login.registerTitle')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {mode === 'signin' ? t('login.subtitle') : t('login.registerSubtitle')}
          </p>
        </motion.div>

        {/* ── Auth Card ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 pt-6 space-y-4">
              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl overflow-hidden"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
                      <button
                        onClick={() => setError(null)}
                        className="text-red-500 text-xs mt-1 hover:text-red-700 underline"
                      >
                        {t('shopping.close')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Email / Password Form ─────────────────── */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {/* Name (register only) */}
                <AnimatePresence>
                  {mode === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t('login.namePlaceholder')}
                          autoComplete="name"
                          className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('login.emailPlaceholder')}
                    autoComplete="email"
                    required
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('login.passwordPlaceholder')}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                    className="w-full h-12 pl-10 pr-11 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Confirm Password (register only) */}
                <AnimatePresence>
                  {mode === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t('login.confirmPasswordPlaceholder')}
                          autoComplete="new-password"
                          required
                          minLength={6}
                          className={`w-full h-12 pl-10 pr-11 rounded-xl border bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                            confirmPassword && password !== confirmPassword
                              ? 'border-red-300 dark:border-red-500/50 focus:ring-red-500/30 focus:border-red-500'
                              : confirmPassword && password === confirmPassword
                                ? 'border-green-300 dark:border-green-500/50 focus:ring-green-500/30 focus:border-green-500'
                                : 'border-gray-200 dark:border-[#333] focus:ring-blue-500/30 focus:border-blue-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Password hint for register */}
                {mode === 'register' && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 pl-1">
                    {t('login.passwordHint')}
                  </p>
                )}

                {/* Forgot password link (sign in only) */}
                {mode === 'signin' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-[11px] text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      style={{ fontWeight: 500 }}
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={anyLoading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white border-0 shadow-lg shadow-blue-500/20 gap-2 transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>
                    {isLoading
                      ? t('login.loggingIn')
                      : mode === 'signin'
                        ? t('login.emailSignIn')
                        : t('login.emailRegister')}
                  </span>
                </Button>
              </form>

              {/* ── Divider ──────────────────────────────── */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-[#333]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white dark:bg-[#1E1E1E] px-4 text-xs text-gray-400">
                    {t('login.orContinueWith')}
                  </span>
                </div>
              </div>

              {/* ── Google Login ──────────────────────────── */}
              <Button
                onClick={handleGoogleLogin}
                disabled={anyLoading}
                className="w-full h-12 rounded-xl bg-white dark:bg-[#252525] hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#333] shadow-sm gap-3 transition-all"
                variant="outline"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span className="text-sm">{t('login.googleLogin')}</span>
              </Button>

              {/* ── Security badges ───────────────────────── */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-[#333]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white dark:bg-[#1E1E1E] px-4 text-xs text-gray-400">
                    {t('login.secureLogin')}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  { icon: Shield, text: t('login.secureAuth') },
                  { icon: Sparkles, text: t('login.personalizedAi') },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Mode toggle ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-5"
        >
          <button
            onClick={toggleMode}
            disabled={anyLoading}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {mode === 'signin' ? t('login.noAccountYet') : t('login.alreadyHaveAccount')}
            <span className="text-blue-600 dark:text-blue-400 ml-1" style={{ fontWeight: 600 }}>
              {mode === 'signin' ? t('login.createAccount') : t('login.signInInstead')}
            </span>
          </button>
        </motion.div>

        {/* ── Footer ───────────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4 px-6"
        >
          {t('login.footer')}
        </motion.p>
      </div>
    </div>
  );
}