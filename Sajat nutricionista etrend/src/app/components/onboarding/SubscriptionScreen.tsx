/**
 * SubscriptionScreen - Premium Subscription & Trial Management
 *
 * NOT part of the FTI/onboarding flow. Accessed from Profile page.
 * Features:
 * - 10-day free trial with full access
 * - After trial: free tier with restrictions until subscription purchased
 * - Attractive premium-focused UI with floating CTA
 * - Stripe mock payment integration
 * Fully localized via useLanguage hook.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CreditCard,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  Sparkles,
  Star,
  Lock,
  Zap,
  Clock,
  Gift,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../ui/input';
import {
  SUBSCRIPTION_PRICE_USD,
  SUBSCRIPTION_PRICE_HUF,
  formatHuf,
  formatUsd,
} from '../../utils/currencyConverter';

// ─── Trial System ───────────────────────────────────────────────────
const TRIAL_DAYS = 10;
const TRIAL_STORAGE_KEY = 'appFirstUsageDate';

function getTrialInfo() {
  const stored = localStorage.getItem(TRIAL_STORAGE_KEY);
  if (!stored) {
    // First ever usage — start the trial now
    const now = new Date().toISOString();
    localStorage.setItem(TRIAL_STORAGE_KEY, now);
    return { daysUsed: 0, daysRemaining: TRIAL_DAYS, isExpired: false, startDate: now };
  }
  const start = new Date(stored);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const daysUsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, TRIAL_DAYS - daysUsed);
  return {
    daysUsed,
    daysRemaining,
    isExpired: daysUsed >= TRIAL_DAYS,
    startDate: stored,
  };
}

// ─── Feature icon lists (icons are language-independent) ────────────
const PREMIUM_ICONS = ['📋', '🤖', '🥗', '👨‍🍳', '🛒', '🏃', '📈', '💧'];
const PREMIUM_FEAT_KEYS = ['feat1', 'feat2', 'feat3', 'feat4', 'feat5', 'feat6', 'feat7', 'feat8'] as const;

const FREE_FEAT_KEYS: { key: string; available: boolean }[] = [
  { key: 'free1', available: true },
  { key: 'free2', available: true },
  { key: 'free3', available: false },
  { key: 'free4', available: false },
  { key: 'free5', available: false },
  { key: 'free6', available: false },
];

// ─── Component ──────────────────────────────────────────────────────
export function SubscriptionScreen() {
  const navigate = useNavigate();
  const { subscribe, subscriptionActive } = useAuth();
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Card form
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const trial = useMemo(() => getTrialInfo(), []);

  // If already subscribed, redirect
  useEffect(() => {
    if (subscriptionActive && !paymentSuccess) {
      navigate('/profile');
    }
  }, [subscriptionActive, paymentSuccess, navigate]);

  const handleSubscribe = async () => {
    if (!showPaymentForm) {
      setShowPaymentForm(true);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await subscribe();
      setPaymentSuccess(true);
      setTimeout(() => navigate('/'), 2500);
    } catch (err: any) {
      setError(err.message || t("subscription.paymentError"));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const trialProgress = Math.min(100, (trial.daysUsed / TRIAL_DAYS) * 100);

  // ─── Success State ───
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-teal-600 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center text-white"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
          >
            <Check className="w-12 h-12 text-green-500" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-3xl mb-3 text-white"
          >
            {t("subscription.paymentSuccess")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-white/80 text-lg"
          >
            {t("subscription.welcomePremium")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 flex items-center justify-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-white/70 text-sm">{t("subscription.redirecting")}</span>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─── Main View ───
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-[#121212] dark:via-[#1E1E1E] dark:to-[#121212] flex flex-col relative">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-base text-gray-900" style={{ fontWeight: 700 }}>{t("subscription.title")}</h1>
          </div>
          {!trial.isExpired && (
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full">
              <Gift className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">{trial.daysRemaining} {t("subscription.daysRemaining")}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

          {/* ── Trial Status Banner ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-4 border ${
              trial.isExpired
                ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-500/10 dark:to-orange-500/10 border-red-200 dark:border-red-500/30'
                : 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-emerald-200 dark:border-emerald-500/30'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                trial.isExpired
                  ? 'bg-red-100 dark:bg-red-500/20'
                  : 'bg-emerald-100 dark:bg-emerald-500/20'
              }`}>
                {trial.isExpired ? (
                  <Clock className="w-5 h-5 text-red-600" />
                ) : (
                  <Gift className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
                  {trial.isExpired
                    ? t("subscription.trialExpired")
                    : `${t("subscription.trialActive")} · ${trial.daysRemaining} ${t("subscription.daysRemaining")}`
                  }
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {trial.isExpired
                    ? t("subscription.payForFullAccess")
                    : t("subscription.fullAccessTrial")
                  }
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-white dark:bg-[#121212] rounded-full overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${trialProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  trial.isExpired
                    ? 'bg-gradient-to-r from-red-400 to-orange-400'
                    : trialProgress > 70
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                    : 'bg-gradient-to-r from-blue-400 to-teal-400'
                }`}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-gray-400">1. {t("subscription.dayLabel")}</span>
              <span className="text-[10px] text-gray-400">{TRIAL_DAYS}. {t("subscription.dayLabel")}</span>
            </div>
          </motion.div>

          {/* ── PREMIUM CARD (Hero) ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-blue-400 to-teal-400 rounded-3xl blur-lg opacity-20" />

            <div className="relative bg-white dark:bg-[#1E1E1E] rounded-2xl border-2 border-blue-400 dark:border-blue-500/50 shadow-xl overflow-hidden">
              {/* Badge */}
              <div className="absolute top-0 right-0 z-10">
                <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white text-[11px] px-4 py-1.5 rounded-bl-xl flex items-center gap-1 shadow-md">
                  <Star className="w-3 h-3 fill-current" />
                  <span style={{ fontWeight: 700 }}>{t("subscription.recommended")}</span>
                </div>
              </div>

              {/* Header area */}
              <div className="bg-gradient-to-br from-blue-500 via-blue-500 to-teal-500 p-5 pb-6 relative overflow-hidden">
                {/* Decorative */}
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full" />

                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <h3 className="text-xl text-white" style={{ fontWeight: 800 }}>
                        {t("subscription.premiumPackage")}
                      </h3>
                    </div>
                    <p className="text-white/80 text-xs">{t("subscription.fullAccess")}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl text-white" style={{ fontWeight: 900 }}>
                      {formatUsd(SUBSCRIPTION_PRICE_USD)}
                    </div>
                    <div className="text-[11px] text-white/70 mt-0.5">
                      ~{formatHuf(SUBSCRIPTION_PRICE_HUF)} {t("subscription.perMonth")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="p-5 space-y-3">
                {PREMIUM_FEAT_KEYS.map((key, idx) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + idx * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-500/15 rounded-lg flex items-center justify-center text-base flex-shrink-0">
                      {PREMIUM_ICONS[idx]}
                    </div>
                    <span className="text-sm text-gray-800" style={{ fontWeight: 500 }}>
                      {t(`subscription.${key}`)}
                    </span>
                    <Check className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Payment Form (expanded) ── */}
          <AnimatePresence>
            {showPaymentForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-200 shadow-lg p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <h3 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
                      {t("subscription.paymentDetails")}
                    </h3>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">{t("subscription.cardNumber")}</label>
                    <Input
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="h-12 rounded-xl"
                      maxLength={19}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">{t("subscription.expiry")}</label>
                      <Input
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        className="h-12 rounded-xl"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">{t("subscription.cvc")}</label>
                      <Input
                        placeholder="123"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        className="h-12 rounded-xl"
                        maxLength={3}
                        type="password"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-gray-400 pt-1">
                    <Shield className="w-4 h-4" />
                    <span className="text-[11px]">{t("subscription.secureStripe")}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 text-xs mt-1 underline hover:text-red-700"
                >
                  {t("subscription.close")}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── FREE PLAN (secondary, collapsed) ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base text-gray-700" style={{ fontWeight: 700 }}>
                    {t("subscription.freePackage")}
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">{t("subscription.limitedAccess")}</p>
                </div>
                <div className="text-gray-400 text-base" style={{ fontWeight: 600 }}>{t("subscription.free")}</div>
              </div>

              <div className="space-y-2.5">
                {FREE_FEAT_KEYS.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      feat.available ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {feat.available ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Lock className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      feat.available ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      {t(`subscription.${feat.key}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => navigate('/profile')}
                className="w-full py-3 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition-colors dark:hover:bg-[#252525]"
                style={{ fontWeight: 600 }}
              >
                {t("subscription.continueWithLimited")}
              </button>
            </div>
          </motion.div>

          {/* ── Guarantee ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-center pb-4"
          >
            <div className="flex items-center justify-center gap-2 text-gray-400 mb-1">
              <Shield className="w-3.5 h-3.5" />
              <span className="text-[11px]">{t("subscription.moneyBackGuarantee")}</span>
            </div>
            <p className="text-[10px] text-gray-300 dark:text-gray-500">
              {t("subscription.cancellableAnytime")}
            </p>
          </motion.div>
        </div>
      </div>

      {/* ═══ FLOATING BOTTOM CTA ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="bg-gradient-to-t from-white via-white/95 to-white/0 dark:from-[#121212] dark:via-[#121212]/95 dark:to-[#121212]/0 pt-6 pb-4 px-4">
          <div className="max-w-lg mx-auto">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-blue-500 via-blue-500 to-teal-500 text-white py-4.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 active:scale-[0.98] relative overflow-hidden group"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-base" style={{ fontWeight: 700 }}>{t("subscription.paymentProcessing")}</span>
                </>
              ) : showPaymentForm ? (
                <>
                  <Zap className="w-5 h-5" />
                  <span className="text-base" style={{ fontWeight: 700 }}>
                    {t("subscription.payBtn")} {formatUsd(SUBSCRIPTION_PRICE_USD)} {t("subscription.perMonth")}
                  </span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span className="text-base" style={{ fontWeight: 700 }}>{t("subscription.subscribeBtn")}</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Exported utility for other components ──────────────────────────
export { getTrialInfo, TRIAL_DAYS };