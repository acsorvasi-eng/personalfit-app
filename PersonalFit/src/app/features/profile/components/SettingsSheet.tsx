// PersonalFit/src/app/features/profile/components/SettingsSheet.tsx
// Settings content extracted from Profile.tsx — opened via gear icon in header.

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ChevronDown, X } from "lucide-react";
import { SUPPORTED_LANGUAGES, LANGUAGE_META } from "../../../../i18n";
import { DSMBottomSheet } from "../../../components/dsm/ux-patterns"; // used for nested SleepSetup sheet
import { SleepSetup } from "../../sleep/components/SleepSetup";
import { SleepService } from "../../../backend/services/SleepService";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useLanguage, LanguageCode } from "../../../contexts/LanguageContext";
import { useNavigate } from "react-router";
import { useAppData } from "../../../hooks/useAppData";
import { getTrialInfo, TRIAL_DAYS } from "../../../components/onboarding/SubscriptionScreen";
import { getMealSettings, getUserProfile } from "../../../backend/services/UserProfileService";
import { changeEmail, changePassword, sendPasswordResetEmail } from "../../../services/authService";
import { formatHuf, formatUsd, SUBSCRIPTION_PRICE_USD, SUBSCRIPTION_PRICE_HUF } from "../../../utils/currencyConverter";
import { showToast } from "../../../shared/components/Toast";

// ─── Helpers ────────────────────────────────────────────────────────

function SettingsRow({
  title, subtitle, rightText, rightElement, onClick, color,
}: {
  title: string; subtitle?: string; rightText?: string;
  rightElement?: React.ReactNode; onClick?: () => void; color?: string;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem', borderBottom: '1px solid #f3f4f6',
        cursor: onClick ? 'pointer' : 'default', background: 'white',
      }}
    >
      <div>
        <div style={{ fontSize: '1rem', fontWeight: 500, color: color ?? '#111827' }}>{title}</div>
        {subtitle != null && subtitle !== '' && (
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {rightElement != null ? rightElement : (rightText != null && rightText !== '' && (
        <span style={{ color: '#0d9488', fontSize: '0.875rem' }}>{rightText}</span>
      ))}
    </div>
  );
}

function SettingsCard({ sectionTitle, children }: { sectionTitle: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'white', borderRadius: '1rem', overflow: 'hidden',
      marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '0.75rem 1rem 0.25rem',
      }}>
        {sectionTitle}
      </div>
      {children}
    </div>
  );
}

function mapAccountError(code: string): string {
  switch (code) {
    case 'auth/wrong-password': return 'profile.account.errWrongPassword';
    case 'auth/email-already-in-use': return 'profile.account.errEmailInUse';
    case 'auth/invalid-email': return 'profile.account.errInvalidEmail';
    case 'auth/weak-password': return 'profile.account.errWeakPassword';
    case 'auth/requires-recent-login': return 'profile.account.errRecentLogin';
    case 'auth/too-many-requests': return 'profile.account.errTooMany';
    default: return 'profile.account.errGeneric';
  }
}

function AccountSettingsCard({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  type EditMode = null | 'email' | 'password';
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPw, setEmailCurrentPw] = useState('');
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isEmailProvider = user?.provider === 'email';

  const resetForm = () => {
    setEditMode(null); setNewEmail(''); setEmailCurrentPw('');
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setShowEmailPw(false); setShowCurrentPw(false); setShowNewPw(false); setError(null);
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !emailCurrentPw) return;
    setIsSubmitting(true); setError(null); setSuccess(null);
    try {
      await changeEmail(newEmail.trim(), emailCurrentPw);
      if (navigator.vibrate) navigator.vibrate([10, 20]);
      setSuccess(t('profile.account.emailChanged'));
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(t(mapAccountError(err?.code || '')));
    } finally { setIsSubmitting(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw) return;
    if (newPw.length < 6) { setError(t('profile.account.errWeakPassword')); return; }
    if (newPw !== confirmPw) { setError(t('profile.account.errPasswordMismatch')); return; }
    setIsSubmitting(true); setError(null); setSuccess(null);
    try {
      await changePassword(currentPw, newPw);
      if (navigator.vibrate) navigator.vibrate([10, 20]);
      setSuccess(t('profile.account.passwordChanged'));
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(t(mapAccountError(err?.code || '')));
    } finally { setIsSubmitting(false); }
  };

  const handleSendReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(user.email);
      setSuccess(t('profile.account.resetSent'));
      setTimeout(() => setSuccess(null), 4000);
    } catch { setError(t('profile.account.errGeneric')); }
  };

  if (!user || user.provider === 'demo') return null;

  return (
    <SettingsCard sectionTitle={t('profile.account.accountSection')}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{user.email}</div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>
          {user.provider === 'email' ? t('profile.account.emailAccount') : t('profile.googleAccount')}
        </div>
      </div>
      {success && (
        <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', color: '#16a34a', fontSize: '0.875rem' }}>{success}</div>
      )}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', color: '#dc2626', fontSize: '0.875rem' }}>{error}</div>
      )}
      {isEmailProvider && editMode === null && (
        <>
          <SettingsRow title={t('profile.account.changeEmail')} rightText="›" onClick={() => { resetForm(); setEditMode('email'); }} />
          <SettingsRow title={t('profile.account.changePassword')} rightText="›" onClick={() => { resetForm(); setEditMode('password'); }} />
          <SettingsRow title={t('profile.account.resetPasswordByEmail')} rightText="›" onClick={handleSendReset} />
        </>
      )}
      {editMode === 'email' && (
        <form onSubmit={handleChangeEmail} style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: 4 }}>{t('profile.account.newEmail')}</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} autoFocus
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem' }} />
          </div>
          <div style={{ marginBottom: 8, position: 'relative' }}>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: 4 }}>{t('profile.account.currentPassword')}</label>
            <input type={showEmailPw ? 'text' : 'password'} value={emailCurrentPw} onChange={e => setEmailCurrentPw(e.target.value)}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 36px 8px 12px', fontSize: '0.9rem' }} />
            <button type="button" onClick={() => setShowEmailPw(v => !v)}
              style={{ position: 'absolute', right: 8, top: 28, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              {showEmailPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={isSubmitting}
              style={{ flex: 1, padding: '8px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
              {isSubmitting ? '...' : t('profile.account.save')}
            </button>
            <button type="button" onClick={resetForm}
              style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              {t('profile.account.cancel')}
            </button>
          </div>
        </form>
      )}
      {editMode === 'password' && (
        <form onSubmit={handleChangePassword} style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          {[
            { label: t('profile.account.currentPassword'), value: currentPw, set: setCurrentPw, show: showCurrentPw, toggle: () => setShowCurrentPw(v => !v) },
            { label: t('profile.account.newPassword'), value: newPw, set: setNewPw, show: showNewPw, toggle: () => setShowNewPw(v => !v) },
            { label: t('profile.account.confirmPassword'), value: confirmPw, set: setConfirmPw, show: false, toggle: () => {} },
          ].map(({ label, value, set, show, toggle }, i) => (
            <div key={i} style={{ marginBottom: 8, position: 'relative' }}>
              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
              <input type={show ? 'text' : 'password'} value={value} onChange={e => set(e.target.value)} autoFocus={i === 0}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 36px 8px 12px', fontSize: '0.9rem' }} />
              {i < 2 && (
                <button type="button" onClick={toggle}
                  style={{ position: 'absolute', right: 8, top: 28, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={isSubmitting}
              style={{ flex: 1, padding: '8px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
              {isSubmitting ? '...' : t('profile.account.save')}
            </button>
            <button type="button" onClick={resetForm}
              style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              {t('profile.account.cancel')}
            </button>
          </div>
        </form>
      )}
      <SettingsRow title={t('profile.signOut')} color="#ef4444" onClick={onLogout} />
    </SettingsCard>
  );
}

// ─── Main export ────────────────────────────────────────────────────

export interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  appData: ReturnType<typeof useAppData>;
  onUploadOpen: () => void;
  onBodyCompOpen: () => void;
  showResetConfirm: boolean;
  showResetFinal: boolean;
  isResetting: boolean;
  onShowResetConfirm: (v: boolean) => void;
  onShowResetFinal: (v: boolean) => void;
  onReset: () => Promise<void>;
  onLogout: () => void;
}

export default function SettingsSheet(props: SettingsSheetProps) {
  const {
    open, onClose,
    appData,
    onUploadOpen, onBodyCompOpen,
    showResetConfirm, showResetFinal, isResetting,
    onShowResetConfirm, onShowResetFinal, onReset,
    onLogout,
  } = props;

  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [langOpen, setLangOpen] = useState(false);
  const { user, subscriptionActive } = useAuth();
  const [trial, setTrial] = useState({ daysUsed: 0, daysRemaining: TRIAL_DAYS, isExpired: false, startDate: '' });
  useEffect(() => { getTrialInfo().then(setTrial); }, []);
  const [mealCount, setMealCount] = useState(3);
  useEffect(() => { getMealSettings().then(s => setMealCount(s.mealCount || 3)); }, []);

  const [sleepSheetOpen, setSleepSheetOpen] = useState(false);
  const [wakeTime, setWakeTime] = useState("07:00");
  const [selectedBedtime, setSelectedBedtime] = useState("");
  const [selectedCycles, setSelectedCycles] = useState(6);
  const [bedtimeOptions, setBedtimeOptions] = useState<ReturnType<typeof SleepService.getBedtimeOptions>>([]);
  useEffect(() => {
    getUserProfile().then((p) => {
      if (p?.wakeTime) {
        setWakeTime(p.wakeTime);
        const options = SleepService.getBedtimeOptions(p.wakeTime);
        setBedtimeOptions(options);
        setSelectedBedtime(p.bedtime ?? options.find((o) => o.cycleCount === 6)?.bedtime ?? "");
        setSelectedCycles(p.sleepCycles ?? 6);
      } else {
        setBedtimeOptions(SleepService.getBedtimeOptions("07:00"));
      }
    });
  }, []);
  const handleSleepWakeTime = async (time: string) => {
    setWakeTime(time);
    const options = SleepService.getBedtimeOptions(time);
    setBedtimeOptions(options);
    const preferred = options.find((o) => o.cycleCount === 6);
    if (preferred) { setSelectedBedtime(preferred.bedtime); setSelectedCycles(preferred.cycleCount); }
    await SleepService.saveSleepSettings({ wakeTime: time, selectedBedtime: preferred?.bedtime ?? selectedBedtime, selectedCycles: preferred?.cycleCount ?? selectedCycles });
    showToast(t('toast.sleepSaved'));
    try { window.dispatchEvent(new Event('profileUpdated')); } catch { /* ignore */ }
  };
  const handleSleepBedtimeSelect = async (bedtime: string, cycles: number) => {
    setSelectedBedtime(bedtime); setSelectedCycles(cycles);
    await SleepService.saveSleepSettings({ wakeTime, selectedBedtime: bedtime, selectedCycles: cycles });
    showToast(t('toast.sleepSaved'));
    try { window.dispatchEvent(new Event('profileUpdated')); } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: '#f9fafb', overflowY: 'auto', overflowX: 'hidden',
          }}
        >
          {/* X close button — sits inside the status bar safe area */}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top, 44px) + 0.5rem)',
              right: '1rem',
              width: '2rem', height: '2rem',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.08)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 201,
            }}
            aria-label="Close"
          >
            <X size={18} color="#374151" />
          </button>

          <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 44px) + 3rem)', paddingBottom: '2rem' }}>

        {/* Section 1: My Plan */}
        <SettingsCard sectionTitle={t('profile.sectionPlan')}>
          <SettingsRow
            title={t('profile.uploadPlan')}
            subtitle={appData.hasData ? (appData.activePlanLabel || t('profile.activePlanLoaded')) + ' · v' + appData.planCount : t('profile.noUploadYet')}
            rightText={t('profile.uploadLink')}
            onClick={onUploadOpen}
          />
          <SettingsRow
            title={t('profile.bodyComposition')}
            subtitle={t('profile.optionalUpload')}
            rightText={t('profile.loadLink')}
            onClick={onBodyCompOpen}
          />
        </SettingsCard>

        {/* Section 2: Meal Schedule */}
        <SettingsCard sectionTitle={t('profile.sectionMealSchedule')}>
          <SettingsRow
            title={t('profile.mealScheduleTitle')}
            subtitle={t('profile.mealScheduleSubtitle').replace('{n}', String(mealCount))}
            rightText={t('profile.mealScheduleLink')}
            onClick={() => { onClose(); navigate('/meal-intervals'); }}
          />
        </SettingsCard>

        {/* Section 3: Sleep */}
        <SettingsCard sectionTitle={t('profile.sectionSleep')}>
          <SettingsRow
            title={t('profile.sleepRowTitle')}
            subtitle={wakeTime ? `${wakeTime}${selectedBedtime ? ` → ${selectedBedtime}` : ''}` : undefined}
            rightText={t('profile.sleepRowLink')}
            onClick={() => setSleepSheetOpen(true)}
          />
        </SettingsCard>
        <DSMBottomSheet open={sleepSheetOpen} onClose={() => setSleepSheetOpen(false)} title={t('profile.sectionSleep')}>
          <SleepSetup
            wakeTime={wakeTime}
            bedtimeOptions={bedtimeOptions}
            selectedBedtime={selectedBedtime}
            onWakeTimeChange={handleSleepWakeTime}
            onBedtimeSelect={handleSleepBedtimeSelect}
          />
        </DSMBottomSheet>

        {/* Section 4: Subscription */}
        <SettingsCard sectionTitle={t('profile.sectionSubscription')}>
          <SettingsRow
            title={t('profile.sectionSubscription')}
            subtitle={
              subscriptionActive
                ? t('profile.subscriptionActiveLabel')
                : !trial.isExpired
                ? t('profile.trialDaysRemaining').replace('{n}', String(trial.daysRemaining))
                : t('profile.trialExpired')
            }
            rightText={!subscriptionActive && !trial.isExpired ? t('profile.upgradeLink') : undefined}
            onClick={!subscriptionActive && !trial.isExpired ? () => { onClose(); navigate('/subscription'); } : undefined}
          />
        </SettingsCard>

        {/* Section 5: Appearance */}
        <SettingsCard sectionTitle={t('profile.sectionAppearance') || 'Megjelenés'}>
          <SettingsRow
            title={t('profile.darkMode') || 'Sötét mód'}
            rightElement={
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                style={{ background: theme === 'dark' ? '#0d9488' : '#e5e7eb', borderRadius: 999, width: 44, height: 24, border: 'none', cursor: 'pointer', transition: 'background 0.2s', position: 'relative' }}
              >
                <span style={{ position: 'absolute', top: 2, left: theme === 'dark' ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
            }
          />
        </SettingsCard>

        {/* Section 5b: Language */}
        <SettingsCard sectionTitle={t('profile.sectionLanguage') || 'Nyelv'}>
          <div
            role="button"
            onClick={() => setLangOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem', cursor: 'pointer', background: 'white',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.25rem' }}>{LANGUAGE_META[language]?.flag ?? '🌐'}</span>
              <span style={{ fontSize: '1rem', fontWeight: 500, color: '#111827' }}>
                {LANGUAGE_META[language]?.name ?? language.toUpperCase()}
              </span>
            </div>
            <ChevronDown
              style={{ width: 18, height: 18, color: '#9ca3af', transition: 'transform 0.2s', transform: langOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </div>
          <AnimatePresence initial={false}>
            {langOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                {SUPPORTED_LANGUAGES.map((code) => {
                  const meta = LANGUAGE_META[code];
                  const isActive = language === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => { setLanguage(code as LanguageCode); setLangOpen(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '0.75rem 1rem', borderTop: '1px solid #f3f4f6',
                        background: isActive ? '#f0fdfa' : 'transparent',
                        cursor: 'pointer', border: 'none',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{meta?.flag ?? '🌐'}</span>
                      <span style={{ flex: 1, textAlign: 'left', fontSize: '0.9rem', fontWeight: isActive ? 700 : 400, color: isActive ? '#0d9488' : '#374151' }}>
                        {meta?.name ?? code.toUpperCase()}
                      </span>
                      {isActive && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0d9488', display: 'inline-block' }} />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </SettingsCard>

        {/* Section 6: Other */}
        <SettingsCard sectionTitle={t('profile.sectionOther')}>
          <SettingsRow title={t('profile.faq')} rightText="›" onClick={() => { onClose(); navigate('/faq'); }} />
          <SettingsRow title={t('profile.aboutUs')} rightText="›" onClick={() => { onClose(); navigate('/about'); }} />
          <SettingsRow title={t('profile.contact')} rightText="›" onClick={() => { onClose(); navigate('/contact'); }} />
        </SettingsCard>

        {/* Section 7: Account */}
        <AccountSettingsCard onLogout={onLogout} />

        {/* Delete data */}
        <SettingsCard sectionTitle={t('profile.sectionDanger') || 'Adatok'}>
          <SettingsRow
            title={t('profile.deleteAllData')}
            color="#9ca3af"
            onClick={() => onShowResetConfirm(true)}
          />
        </SettingsCard>

        {/* Reset confirm overlay */}
        <AnimatePresence>
          {(showResetConfirm || showResetFinal) && (
            <motion.div
              key="delete-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { onShowResetFinal(false); onShowResetConfirm(false); }}
              style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
              }}
            >
              <motion.div
                key={showResetFinal ? 'final' : 'first'}
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 16 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, padding: 28 }}
              >
                {!showResetFinal ? (
                  <>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>{t('profile.deleteConfirmTitle')}</div>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 20 }}>{t('profile.deleteConfirmText')}</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => onShowResetConfirm(false)}
                        style={{ flex: 1, padding: '10px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                        {t('profile.cancel')}
                      </button>
                      <button onClick={() => { onShowResetConfirm(false); onShowResetFinal(true); }}
                        style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                        {t('profile.deleteConfirmYes')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>{t('profile.deleteFinalTitle')}</div>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 20 }}>{t('profile.deleteFinalText')}</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => onShowResetFinal(false)}
                        style={{ flex: 1, padding: '10px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                        {t('profile.cancel')}
                      </button>
                      <button onClick={onReset} disabled={isResetting}
                        style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                        {isResetting ? '...' : t('profile.deleteFinalYes')}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
