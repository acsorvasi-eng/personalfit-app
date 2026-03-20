# Profile Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-tab Profile screen with a single scrollable page — "Profilom" header with a gear icon that opens Settings in a bottom sheet, followed by four vertically stacked cards: Avatar, Weight+Chart, Body Metrics, Daily Goals.

**Architecture:** Extract `SettingsTabContent` (and its helpers) from `Profile.tsx` into a new `SettingsSheet.tsx` file, then rewire `Profile.tsx` to render a simple header + four content cards instead of `ProfileHeader` + `DSMProfileTabs`. All existing data services, chart logic, and edit UIs remain untouched — this is a layout restructure only.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Recharts 2.15.2, Framer Motion, Lucide React, `DSMBottomSheet` (already imported), `DSMCard` / `DSMSectionTitle` / `DSMButton` (from `../../../components/dsm`)

---

## Important: Correct source file

All changes are in:
- **`PersonalFit/src/app/features/profile/components/Profile.tsx`** (2,185 lines)
- **`PersonalFit/src/app/features/profile/components/SettingsSheet.tsx`** (new file)

Run the dev server from the `PersonalFit/` subdirectory:
```bash
cd PersonalFit && npm run dev
```
Build check: `cd PersonalFit && npm run build`

---

## File Structure

| File | Role after redesign |
|---|---|
| `Profile.tsx` | Main component — new header + 4 cards. No more tabs. |
| `SettingsSheet.tsx` | New — `DSMBottomSheet` wrapping all settings content |
| `ProfileTabs.tsx` | Unchanged — no longer imported (leave in place) |

### Key locations in current `Profile.tsx`
- Imports: lines 1–35
- Types + state: lines 38–430
- Render start: line 429
- `ProfileHeader` usage: lines 478–504
- `DSMProfileTabs` + tab content: lines 510–854
- Body metrics card (Me tab): lines 541–574
- Weight chart card (Me tab): lines 592–790
- `ProfileGoalsTab` function: lines 921–1096
- `SettingsRow` helper: lines 1097–1137
- `SettingsCard` helper: lines 1139–1165
- `SettingsTabContent` function: lines 1167–end of settings
- `AccountSettingsCard` function: lines 1499–...
- `mapAccountError` function: lines ~1487–1496
- `InlineEditStat` component: lines ~2016+
- `BMIBar` component: lines 898–918

---

## Task 1: Create SettingsSheet.tsx

**Goal:** Move settings content out of `Profile.tsx` into a standalone bottom sheet component so the Profile render can reference `<SettingsSheet open={...} onClose={...} ... />`.

**Files:**
- Create: `PersonalFit/src/app/features/profile/components/SettingsSheet.tsx`
- Modify: `PersonalFit/src/app/features/profile/components/Profile.tsx` (imports + usage only)

- [ ] **Step 1: Create `SettingsSheet.tsx` with the complete content**

Copy the following into the new file. It contains all the helpers (`SettingsRow`, `SettingsCard`, `mapAccountError`, `AccountSettingsCard`) and the full `SettingsTabContent` body wrapped in `DSMBottomSheet`.

```tsx
// PersonalFit/src/app/features/profile/components/SettingsSheet.tsx
// Settings content extracted from Profile.tsx — opened via gear icon in header.

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Crown, Gift, Clock,
  Sun, Moon, ChevronRight,
  Upload, Trash2, Scan, AlertTriangle, Zap, Layers,
  Eye, EyeOff, KeyRound, Globe, Mail,
} from "lucide-react";
import { DSMBottomSheet } from "../../../components/dsm/ux-patterns";
import { SleepSetup } from "../../sleep/components/SleepSetup";
import { SleepService } from "../../../backend/services/SleepService";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useLanguage, LanguageCode } from "../../../contexts/LanguageContext";
import { useNavigate } from "react-router";
import { useAppData } from "../../../hooks/useAppData";
import { useStagingManager } from "../../../hooks/useStagingManager";
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
  staging: ReturnType<typeof useStagingManager>;
  onUploadOpen: () => void;
  onBodyCompOpen: () => void;
  onPublish: () => Promise<void>;
  showResetConfirm: boolean;
  showResetFinal: boolean;
  isResetting: boolean;
  onShowResetConfirm: (v: boolean) => void;
  onShowResetFinal: (v: boolean) => void;
  onReset: () => Promise<void>;
  onLogout: () => void;
  reReadProfile: () => void;
}

export default function SettingsSheet(props: SettingsSheetProps) {
  const {
    open, onClose,
    appData, staging,
    onUploadOpen, onBodyCompOpen, onPublish,
    showResetConfirm, showResetFinal, isResetting,
    onShowResetConfirm, onShowResetFinal, onReset,
    onLogout, reReadProfile,
  } = props;

  const { t } = useLanguage();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
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
    <DSMBottomSheet open={open} onClose={onClose} title={t('profile.tabSettings')}>
      <div style={{ background: '#f9fafb', minHeight: '100%', paddingBottom: '1rem' }}>

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
    </DSMBottomSheet>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd PersonalFit && npm run build 2>&1 | grep -E "error|warning" | head -20
```
Expected: No TypeScript errors in `SettingsSheet.tsx`. If errors appear, fix import paths.

- [ ] **Step 3: Add `settingsOpen` state + `SettingsSheet` import to `Profile.tsx`**

Add import at the top of `Profile.tsx` (after existing imports):
```tsx
import SettingsSheet from "./SettingsSheet";
```

Add `settingsOpen` state in the `Profile()` function body (near other `useState` declarations, ~line 184):
```tsx
const [settingsOpen, setSettingsOpen] = useState(false);
```

- [ ] **Step 4: Add `<SettingsSheet>` to the `Profile.tsx` render, just before the `<ProfileHeader>` block (after the `<BodyCompositionUploadSheet>` at ~line 462)**

```tsx
{/* SETTINGS BOTTOM SHEET */}
<SettingsSheet
  open={settingsOpen}
  onClose={() => setSettingsOpen(false)}
  appData={appData}
  staging={staging}
  onUploadOpen={() => setIsUploadOpen(true)}
  onBodyCompOpen={() => setIsBodyCompUploadOpen(true)}
  onPublish={handlePublish}
  showResetConfirm={showResetConfirm}
  showResetFinal={showResetFinal}
  isResetting={isResetting}
  onShowResetConfirm={setShowResetConfirm}
  onShowResetFinal={setShowResetFinal}
  onReset={async () => {
    setIsResetting(true);
    const result = await performFullReset({ clearTheme: false, reseed: false });
    setIsResetting(false);
    if (result.success) { setShowResetFinal(false); setShowResetConfirm(false); appData.refresh(); }
  }}
  onLogout={() => { logout(); navigate('/splash'); }}
  reReadProfile={reReadProfile}
/>
```

- [ ] **Step 5: Build check**

```bash
cd PersonalFit && npm run build 2>&1 | grep -E "^.*(error|Error)" | head -20
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add PersonalFit/src/app/features/profile/components/SettingsSheet.tsx PersonalFit/src/app/features/profile/components/Profile.tsx
git commit -m "feat: extract SettingsSheet component from Profile.tsx"
```

---

## Task 2: Replace header and tab layout with single scroll

**Goal:** Remove `ProfileHeader` and `DSMProfileTabs` from the render, replace with a simple "Profilom + ⚙️" header and a single scrollable container.

**Files:**
- Modify: `PersonalFit/src/app/features/profile/components/Profile.tsx`

**What to change in `Profile.tsx` render (lines 477–855):**

The current render structure is:
```
line 477: {/* HEADER */}
line 478: <div className="flex-shrink-0">
line 479:   <ProfileHeader .../>
line 504: </div>
line 507: {/* SCROLLABLE CONTENT */}
line 508: <div className="flex-1 overflow-y-auto ...">
line 510:   <DSMProfileTabs ...>
line 520:     {(activeTab) => (
line 521:       <div>
line 522:         {activeTab === "me" && (...)}    ← Me tab content
line 523:         {activeTab === "goals" && (...)} ← Goals tab content (ProfileGoalsTab)
line 524:         {activeTab === "settings" && (...)} ← Settings tab content
line 854:       </div>
line 855:     </DSMProfileTabs>
line 856: </div>
```

- [ ] **Step 1: Replace the `{/* HEADER */}` block (lines 477–504) with a new simple header**

Delete lines 477–504 and replace with:
```tsx
{/* HEADER */}
<div className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
  <h1 className="text-xl font-bold text-gray-900">{t('profile.title') || 'Profilom'}</h1>
  <button
    onClick={() => setSettingsOpen(true)}
    className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
    aria-label={t('profile.tabSettings')}
  >
    <Settings className="w-5 h-5 text-gray-600" />
  </button>
</div>
```

- [ ] **Step 2: Replace `<DSMProfileTabs>` wrapper + tab rendering with a plain scroll container**

Delete lines 508–856 (the `<div className="flex-1 overflow-y-auto...">` containing `DSMProfileTabs`).

Replace with a plain scroll container that temporarily renders all former "Me" tab content directly (Goals and Settings content will be moved/removed in Task 3):
```tsx
{/* SCROLLABLE CONTENT */}
<div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">

  {/* TODO Task 3: Avatar card replaces personal data card */}
  {/* Personal data (temporary — will be restructured in Task 3) */}
  <DSMCard>
    <DSMSectionTitle icon={User} iconColor="text-gray-500" title={t('profile.personalData')} className="mb-3" />
    <div className="space-y-3">
      <EditableFieldRow label={t('profile.birthDate')} value={profile.birthDate || ''} type="date"
        onSave={(v) => { setProfile((p) => ({ ...p, birthDate: v })); saveUserProfile({ birthDate: v || undefined }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
      <div className="pt-2 pb-1">
        <label className="text-2xs text-gray-500 block mb-1.5">{t('profile.gender')}</label>
        <div className="flex flex-wrap gap-2">
          {(['male', 'female', 'other'] as const).map((g) => (
            <button key={g} type="button"
              onClick={() => { setProfile((p) => ({ ...p, gender: g })); saveUserProfile({ gender: g }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }}
              style={{ padding: '0.4rem 0.75rem', borderRadius: 999, border: 'none', background: profile.gender === g ? '#f3f4f6' : 'transparent', color: profile.gender === g ? '#111827' : '#6b7280', fontWeight: profile.gender === g ? 600 : 400, fontSize: '0.8125rem' }}>
              {t(`profile.gender${g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other'}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  </DSMCard>

  {/* Body metrics card — unchanged from Me tab */}
  <DSMCard>
    <div className="flex items-center gap-2 mb-3">
      <DSMSectionTitle icon={Activity} iconColor="text-gray-500" title={t('profile.bodyMetrics')} className="mb-0" />
      {profile.gmonUploadedAt && (
        <span className="text-2xs text-gray-400 font-normal" style={{ fontWeight: 500 }}>{t('profile.gmonBadge')}</span>
      )}
    </div>
    <div className="space-y-3">
      <InlineEditStat label={t('profile.weight')} value={profile.weight} unit="kg" type="number" prominent onSave={(v) => { const numVal = Number(v); if (numVal > 0) logWeight(numVal); }} />
      <div className="grid grid-cols-2 gap-2">
        <InlineEditStat label={t('profile.height')} value={profile.height} unit="cm" type="number" onSave={(v) => { setProfile((p) => ({ ...p, height: Number(v) })); saveUserProfile({ height: Number(v) }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
        <InlineEditStat label={t('profile.targetWeight')} value={weightGoal.targetKg} unit="kg" type="number" onSave={(v) => { const kg = Number(v); setWeightGoal((g) => ({ ...g, targetKg: kg })); setSetting('weightGoal', JSON.stringify({ ...weightGoal, targetKg: kg })).catch(() => {}); }} />
      </div>
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <span className="text-2xs text-gray-500">BMI</span>
          <span className="text-sm font-semibold text-gray-900">{bmi === '0' ? '–' : bmi}</span>
        </div>
        <BMIBar value={Number(bmi)} t={t} />
        <div className="text-2xs text-gray-500 mt-1">{getBMILabel(Number(bmi), t)}</div>
      </div>
      {/* GMON extras — only when non-null */}
      {[profile.bodyFat, profile.muscleMass, profile.visceralFat, profile.boneMass, profile.waterPercent, profile.metabolicAge].some(v => v != null && v !== 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <InlineEditStat label={t('profile.bodyFat')} value={profile.bodyFat ?? 0} unit="%" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, bodyFat: n })); saveUserProfile({ bodyFat: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
          <InlineEditStat label={t('profile.muscleMass')} value={profile.muscleMass ?? 0} unit="kg" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, muscleMass: n })); saveUserProfile({ muscleMass: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
          <InlineEditStat label={t('profile.metabolicAge')} value={profile.metabolicAge ?? 0} unit={t('profileExtra.yearUnit')} type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, metabolicAge: n })); saveUserProfile({ metabolicAge: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
          <InlineEditStat label={t('profile.bmr')} value={profile.bmr ?? 0} unit="kcal" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, bmr: n })); saveUserProfile({ bmr: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
          <InlineEditStat label={t('profile.visceralFat')} value={profile.visceralFat ?? 0} unit="" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, visceralFat: n })); saveUserProfile({ visceralFat: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
          <InlineEditStat label={t('profile.boneMass')} value={profile.boneMass ?? 0} unit="kg" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, boneMass: n })); saveUserProfile({ boneMass: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
          <InlineEditStat label={t('profile.waterPercent')} value={profile.waterPercent ?? 0} unit="%" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, waterPercent: n })); saveUserProfile({ waterPercent: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
        </div>
      )}
    </div>
  </DSMCard>

  {/* Activity level */}
  <DSMCard>
    <label className="text-xs text-gray-500 block mb-2">{t('profile.activityLevel')}</label>
    <div className="flex flex-wrap gap-2">
      {[
        { key: 'Alacsony', labelKey: 'profile.activitySedentary' },
        { key: 'Konnyu', labelKey: 'profile.activityLight' },
        { key: 'Kozepes', labelKey: 'profile.activityModerate' },
        { key: 'Magas', labelKey: 'profile.activityActive' },
        { key: 'Nagyon magas', labelKey: 'profile.activityVeryActive' },
      ].map(({ key, labelKey }) => (
        <button key={key} type="button"
          onClick={() => { setProfile((p) => ({ ...p, activityLevel: key })); saveUserProfile({ activityLevel: key }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }}
          style={{ padding: '0.4rem 0.75rem', borderRadius: 999, border: 'none', background: profile.activityLevel === key ? '#f3f4f6' : 'transparent', color: profile.activityLevel === key ? '#111827' : '#6b7280', fontWeight: profile.activityLevel === key ? 600 : 400, fontSize: '0.8125rem' }}>
          {t(labelKey)}
        </button>
      ))}
    </div>
  </DSMCard>

  {/* Weight progress chart — KEEP EXACTLY AS IN ORIGINAL Me TAB (copy from lines 592–790) */}
  {/* Copy the entire <DSMCard> weight chart block from the original "me" tab here */}

  <div className="h-4" />
</div>
```

**Important:** For the weight chart card, copy the entire `<DSMCard>` block verbatim from lines 592–790 of the original file. Do not modify the chart logic.

- [ ] **Step 3: Remove `DSMProfileTabs` import since it's no longer used**

In the imports at the top of `Profile.tsx`, remove:
```tsx
import { DSMProfileTabs } from "../../../components/dsm/ProfileTabs";
```

Also remove `ProfileHeader` import if it is no longer used:
```tsx
import { ProfileHeader } from "../../../components/ProfileHeader";
```

- [ ] **Step 4: Build check**

```bash
cd PersonalFit && npm run build 2>&1 | grep -E "^.*(error|Error)" | head -20
```
Expected: No errors.

- [ ] **Step 5: Visual check**

```bash
cd PersonalFit && npm run dev
```
Navigate to Profile tab. Verify:
- "Profilom" title visible, gear icon in top right
- All content scrolls in one page (no tabs)
- Gear icon opens Settings bottom sheet
- Weight chart still renders

- [ ] **Step 6: Commit**

```bash
git add PersonalFit/src/app/features/profile/components/Profile.tsx
git commit -m "feat: replace ProfileHeader + tabs with single-scroll profile layout"
```

---

## Task 3: Build Avatar card + Daily Goals card

**Goal:** Replace the generic personal data card with an Avatar card (avatar circle + name + subtitle row). Add the Daily Goals card at the bottom of the scroll (calories, water, sport, sleep as tappable rows with bottom sheet editors).

**Files:**
- Modify: `PersonalFit/src/app/features/profile/components/Profile.tsx`

### 3a — Avatar card

- [ ] **Step 1: Add `personalExpanded` state + sleep state to `Profile()` function body**

Near the other `useState` declarations:
```tsx
const [personalExpanded, setPersonalExpanded] = useState(false);
// Sleep state for Daily Goals card
const [sleepSheetOpen, setSleepSheetOpen] = useState(false);
const [wakeTime, setWakeTime] = useState("07:00");
const [selectedBedtime, setSelectedBedtime] = useState("");
const [selectedCycles, setSelectedCycles] = useState(6);
const [bedtimeOptions, setBedtimeOptions] = useState<ReturnType<typeof SleepService.getBedtimeOptions>>([]);
```

Add a `useEffect` to load wake time (copy from the existing `SettingsTabContent` sleep state logic):
```tsx
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
```

Also add `SleepService` import if not present (it should already be there from the Settings logic).

- [ ] **Step 2: Add sleep bottom sheet just before the new header in the render**

```tsx
{/* SLEEP BOTTOM SHEET */}
<DSMBottomSheet open={sleepSheetOpen} onClose={() => setSleepSheetOpen(false)} title={t('profile.sectionSleep')}>
  <SleepSetup
    wakeTime={wakeTime}
    bedtimeOptions={bedtimeOptions}
    selectedBedtime={selectedBedtime}
    onWakeTimeChange={handleSleepWakeTime}
    onBedtimeSelect={handleSleepBedtimeSelect}
  />
</DSMBottomSheet>
```

- [ ] **Step 3: Replace the personal data `<DSMCard>` (from Task 2 Step 2) with the Avatar card**

Replace the "Personal data (temporary — will be restructured in Task 3)" DSMCard block with:
```tsx
{/* Card 1: Avatar */}
<DSMCard>
  <div className="flex items-center gap-3">
    {/* Avatar circle */}
    <button
      onClick={() => avatarInputRef.current?.click()}
      className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-bold"
      style={{ background: profile.avatar ? undefined : 'linear-gradient(135deg, #2d8c6e, #4aab8a)' }}
      aria-label={t('profile.editAvatar')}
    >
      {profile.avatar
        ? <img src={profile.avatar} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
        : (profile.name?.[0] ?? '?').toUpperCase()
      }
    </button>

    {/* Name + subtitle */}
    <div className="flex-1 min-w-0">
      {/* Inline-editable name */}
      <EditableFieldRow
        label=""
        value={profile.name}
        type="text"
        onSave={(name) => {
          setProfile((p) => ({ ...p, name }));
          saveUserProfile({ name }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); });
        }}
      />
      {/* Subtitle: age · gender · height */}
      <button
        onClick={() => setPersonalExpanded((v) => !v)}
        className="text-xs text-gray-400 mt-0.5 text-left hover:text-gray-600 transition-colors"
      >
        {[
          profile.age ? `${profile.age} ${t('profile.yearShort') || 'év'}` : null,
          profile.gender ? t(`profile.gender${profile.gender === 'male' ? 'Male' : profile.gender === 'female' ? 'Female' : 'Other'}`) : null,
          profile.height ? `${profile.height} cm` : null,
        ].filter(Boolean).join(' · ') || t('profile.addPersonalData') || 'Személyes adatok hozzáadása'}
        <span className="ml-1 text-gray-300">{personalExpanded ? '▲' : '▼'}</span>
      </button>
    </div>
  </div>

  {/* Expandable personal data fields */}
  {personalExpanded && (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      <EditableFieldRow label={t('profile.birthDate')} value={profile.birthDate || ''} type="date"
        onSave={(v) => { setProfile((p) => ({ ...p, birthDate: v })); saveUserProfile({ birthDate: v || undefined }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
      <div className="pt-1">
        <label className="text-2xs text-gray-500 block mb-1.5">{t('profile.gender')}</label>
        <div className="flex flex-wrap gap-2">
          {(['male', 'female', 'other'] as const).map((g) => (
            <button key={g} type="button"
              onClick={() => { setProfile((p) => ({ ...p, gender: g })); saveUserProfile({ gender: g }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }}
              style={{ padding: '0.4rem 0.75rem', borderRadius: 999, border: 'none', background: profile.gender === g ? '#f3f4f6' : 'transparent', color: profile.gender === g ? '#111827' : '#6b7280', fontWeight: profile.gender === g ? 600 : 400, fontSize: '0.8125rem' }}>
              {t(`profile.gender${g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other'}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )}
</DSMCard>
```

### 3b — Daily Goals card

- [ ] **Step 4: Add calorie/water/sport sheet state**

Add state in `Profile()`:
```tsx
const [calorieSheetOpen, setCalorieSheetOpen] = useState(false);
const [waterSheetOpen, setWaterSheetOpen] = useState(false);
const [sportSheetOpen, setSportSheetOpen] = useState(false);
```

- [ ] **Step 5: Add Daily Goals card at the end of the scroll container (before `<div className="h-4" />`)**

Add this card and the three bottom sheets for its tap actions:
```tsx
{/* Sleep bottom sheet (already added in Step 2) */}

{/* Calorie/Macro bottom sheet */}
<DSMBottomSheet open={calorieSheetOpen} onClose={() => setCalorieSheetOpen(false)} title={t('profile.calorieGoal') || 'Kalória cél'}>
  <ProfileGoalsTab
    profile={profile}
    targetCalories={targetCalories}
    dailyCalories={consumed}
    onProfileUpdate={(partial) => {
      setProfile((p) => ({ ...p, ...partial }));
      saveUserProfile(partial).then(() => { window.dispatchEvent(new Event('profileUpdated')); });
    }}
    t={t}
    onlyCalories
  />
</DSMBottomSheet>

{/* Water bottom sheet */}
<DSMBottomSheet open={waterSheetOpen} onClose={() => setWaterSheetOpen(false)} title={t('profile.waterGoal') || 'Vízfogyasztás'}>
  <ProfileGoalsTab
    profile={profile}
    targetCalories={targetCalories}
    dailyCalories={consumed}
    onProfileUpdate={(partial) => {
      setProfile((p) => ({ ...p, ...partial }));
      saveUserProfile(partial).then(() => { window.dispatchEvent(new Event('profileUpdated')); });
    }}
    t={t}
    onlyWater
  />
</DSMBottomSheet>

{/* Sport / workout bottom sheet */}
<DSMBottomSheet open={sportSheetOpen} onClose={() => setSportSheetOpen(false)} title={t('profile.workoutGoal') || 'Heti edzés'}>
  <ProfileGoalsTab
    profile={profile}
    targetCalories={targetCalories}
    dailyCalories={consumed}
    onProfileUpdate={(partial) => {
      setProfile((p) => ({ ...p, ...partial }));
      saveUserProfile(partial).then(() => { window.dispatchEvent(new Event('profileUpdated')); });
    }}
    t={t}
    onlySport
  />
</DSMBottomSheet>

{/* Card 4: Daily Goals */}
<DSMCard>
  <div className="text-xs font-bold text-gray-400 tracking-wide uppercase mb-3">{t('profile.dailyGoals') || 'NAPI CÉLOK'}</div>
  {[
    {
      icon: '🔥',
      label: t('profile.calorieGoalShort') || 'Kalória',
      value: `${profile.calorieTarget ?? targetCalories} kcal`,
      onTap: () => setCalorieSheetOpen(true),
    },
    {
      icon: '💧',
      label: t('profile.waterGoalShort') || 'Víz',
      value: `${((profile.waterGoalMl ?? Math.round((profile.weight || 70) * 35)) / 1000).toFixed(1)} L`,
      onTap: () => setWaterSheetOpen(true),
    },
    {
      icon: '🏃',
      label: t('profile.workoutGoalShort') || 'Sport / hét',
      value: `${profile.weeklyWorkoutGoal ?? 3}×`,
      onTap: () => setSportSheetOpen(true),
    },
    {
      icon: '🌙',
      label: t('profile.sleepGoalShort') || 'Alvás',
      value: wakeTime ? `${wakeTime} ${t('profile.wakeUpSuffix') || 'ébredés'}` : '—',
      onTap: () => setSleepSheetOpen(true),
    },
  ].map((row, idx, arr) => (
    <React.Fragment key={row.label}>
      <button
        onClick={row.onTap}
        className="w-full flex items-center justify-between py-2.5 hover:bg-gray-50 transition-colors rounded-lg px-1"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ background: idx === 0 ? '#fff8f0' : idx === 1 ? '#f0f8ff' : idx === 2 ? '#f0fff4' : '#f5f0ff' }}>
            {row.icon}
          </div>
          <span className="text-sm text-gray-700">{row.label}</span>
        </div>
        <span className="text-sm font-bold text-gray-900">{row.value}</span>
      </button>
      {idx < arr.length - 1 && <div className="h-px bg-gray-100 mx-1" />}
    </React.Fragment>
  ))}
</DSMCard>
```

**Note on `ProfileGoalsTab` props:** The existing `ProfileGoalsTab` function at line 921 does not have `onlyCalories`, `onlyWater`, or `onlySport` props. You have two options:
1. **Simpler (recommended):** Open the full `ProfileGoalsTab` in each bottom sheet (all goals shown together — the user picks what to edit). Remove the `onlyCalories`/`onlyWater`/`onlySport` props from the JSX above and just pass the base props.
2. **Precise:** Add optional `onlyCalories?: boolean`, `onlyWater?: boolean`, `onlySport?: boolean` props to `ProfileGoalsTab` and conditionally show sections.

Use option 1 for now — each tap opens the full goals editor in a sheet.

- [ ] **Step 6: Build check**

```bash
cd PersonalFit && npm run build 2>&1 | grep -E "^.*(error|Error)" | head -20
```
Expected: No errors.

- [ ] **Step 7: Visual check**

```bash
cd PersonalFit && npm run dev
```
Navigate to Profile. Verify:
- Avatar circle shows initial letter (or photo if set)
- Name is visible and tappable to edit
- Subtitle row shows age · gender · height
- Tapping subtitle expands birth date + gender fields
- Weight + chart card shows correctly
- Body metrics card shows — GMON extras hidden if all null
- Daily Goals card shows all 4 rows
- Tapping each row opens a bottom sheet editor
- Sleep row shows wake time

- [ ] **Step 8: Commit**

```bash
git add PersonalFit/src/app/features/profile/components/Profile.tsx
git commit -m "feat: avatar card + daily goals card in profile redesign"
```

---

## Task 4: Cleanup — remove unused imports and old tab-related state

**Goal:** Remove dead code from `Profile.tsx` that was only used by the old tab layout (ProfileGoalsTab-in-tabs, Settings-in-tabs, ProfileHeader).

**Files:**
- Modify: `PersonalFit/src/app/features/profile/components/Profile.tsx`

- [ ] **Step 1: Remove `ProfileHeader` import (line 18)**

Remove:
```tsx
import { ProfileHeader } from "../../../components/ProfileHeader";
```
(Only remove if ProfileHeader is no longer rendered anywhere in Profile.tsx)

- [ ] **Step 2: Remove `DSMProfileTabs` import (line 21)**

Remove:
```tsx
import { DSMProfileTabs } from "../../../components/dsm/ProfileTabs";
```

- [ ] **Step 3: Remove `ProfileGoalsTab` function body if no longer used directly in tabs**

If `ProfileGoalsTab` is referenced in the Daily Goals bottom sheets (Task 3), keep it. If it is not referenced (because you used option 1 — full goals editor in sheet), check whether it is still needed and remove if not.

- [ ] **Step 4: Remove `SettingsTabContent`, `SettingsRow`, `SettingsCard`, `mapAccountError`, `AccountSettingsCard` functions from `Profile.tsx`**

These are now in `SettingsSheet.tsx`. Delete lines 1097–end-of-file minus `InlineEditStat`, `BMIBar`, `getBMILabel`, `EditableFieldRow`.

**Important:** Only delete these if `SettingsSheet.tsx` is the sole consumer. Verify with:
```bash
cd PersonalFit && grep -n "SettingsTabContent\|SettingsRow\|SettingsCard\|AccountSettingsCard" src/app/features/profile/components/Profile.tsx
```
Expected: no matches (they've been moved).

- [ ] **Step 5: Final build check**

```bash
cd PersonalFit && npm run build 2>&1 | grep -E "error" | head -20
```
Expected: Zero errors.

- [ ] **Step 6: Full visual smoke test**

Run `npm run dev`. Navigate to Profile and verify:
1. "Profilom" title + gear icon visible
2. Avatar card: letter avatar, name editable, subtitle tappable → expands birth date + gender
3. Weight card: big number + chart renders
4. Body metrics: BMI · Zsír · Izom grid (+ GMON extras if present)
5. Daily goals: 🔥💧🏃🌙 rows, each tap opens a bottom sheet
6. Gear icon → opens Settings bottom sheet with all settings
7. All saves (name, weight, calorie target, etc.) still work and dispatch `profileUpdated`
8. No console errors in browser DevTools

- [ ] **Step 7: Commit**

```bash
git add PersonalFit/src/app/features/profile/components/Profile.tsx
git commit -m "chore: remove unused imports and old tab code from Profile.tsx"
```

---

## Done

After Task 4, the Profile screen is a single-scroll page with the new layout. Push to trigger a Vercel deployment:

```bash
git push
```
