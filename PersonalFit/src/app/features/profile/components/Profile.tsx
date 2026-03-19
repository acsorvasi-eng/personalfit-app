import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Activity,
  LogOut, Crown, Gift, Clock,
  Pencil, Target, Calendar,
  HelpCircle, Info, Mail, Sun, Moon, ChevronRight, Settings,
  Upload, Sparkles, Trash2, Scan, AlertTriangle, Zap, Layers,
  TrendingDown, TrendingUp, Check,
  Eye, EyeOff, KeyRound, Globe
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AvatarEditor } from "../../../components/AvatarEditor";
import { useNavigate } from "react-router";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { formatHuf, formatUsd, SUBSCRIPTION_PRICE_USD, SUBSCRIPTION_PRICE_HUF } from "../../../utils/currencyConverter";
import { ProfileHeader } from "../../../components/ProfileHeader";
import { DSMCard, DSMSectionTitle, DSMButton } from "../../../components/dsm";
import { DSMProfileTabs } from "../../../components/dsm/ProfileTabs";
import { useCalorieTracker } from "../../../hooks/useCalorieTracker";
import { getTrialInfo, TRIAL_DAYS } from "../../../components/onboarding/SubscriptionScreen";
import { DataUploadSheet } from "../../../components/DataUploadSheet";
import { BodyCompositionUploadSheet } from "../../../components/BodyCompositionUploadSheet";
import { useAppData } from "../../../hooks/useAppData";
import { performFullReset } from "../../../backend/services/ResetService";
import { useStagingManager } from "../../../hooks/useStagingManager";
import { useLanguage, LanguageCode } from "../../../contexts/LanguageContext";
import { SUPPORTED_LANGUAGES, LANGUAGE_META } from "../../../../i18n";
import { changeEmail, changePassword, sendPasswordResetEmail } from "../../../services/authService";
import { getUserProfile, saveUserProfile } from "../../../backend/services/UserProfileService";
import { getSetting, setSetting } from "../../../backend/services/SettingsService";
import { SleepSetup } from "../../sleep/components/SleepSetup";
import { SleepService } from "../../../backend/services/SleepService";
import { showToast } from "../../../shared/components/Toast";

// ─── Types ──────────────────────────────────────────────────────────
interface ProfileData {
  name: string;
  age: number;
  metabolicAge: number;
  weight: number;
  height: number;
  bloodPressure: string;
  activityLevel: string;
  goal: string;
  allergies: string;
  dietaryPreferences: string;
  avatar: string;
  birthDate?: string;
  gender?: string;
  calorieTarget?: number;
  waterGoalMl?: number;
  weeklyWorkoutGoal?: number;
  macroProteinPct?: number;
  macroCarbsPct?: number;
  macroFatPct?: number;
  bodyFat?: number;
  muscleMass?: number;
  visceralFat?: number;
  boneMass?: number;
  waterPercent?: number;
  bmi?: number;
  bmr?: number;
  gmonUploadedAt?: string;
}

interface WeightEntry {
  date: string;
  weight: number;
  week: number;
}

interface WeightGoal {
  targetKg: number;
  months: number;
  startDate: string;
  startWeight: number;
}

// ─── Main Component ─────────────────────────────────────────────────
export function Profile() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { consumed } = useCalorieTracker();
  const { t } = useLanguage();
  const defaultProfile: ProfileData = {
    name: "", age: 0, metabolicAge: 0, weight: 0, height: 0,
    bloodPressure: "", activityLevel: "", goal: "",
    allergies: "", dietaryPreferences: "", avatar: ""
  };
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const defaultWeightGoal: WeightGoal = { targetKg: 0, months: 0, startDate: '', startWeight: 0 };
  const [weightGoal, setWeightGoal] = useState<WeightGoal>(defaultWeightGoal);
  const [workoutDataRaw, setWorkoutDataRaw] = useState<string | null>(null);
  const [isGoalEditing, setIsGoalEditing] = useState(false);
  const [goalDraftKg, setGoalDraftKg] = useState('');
  const [goalDraftMonths, setGoalDraftMonths] = useState('');

  useEffect(() => {
    getSetting('weightHistory').then((saved) => {
      if (saved) try { setWeightHistory(JSON.parse(saved)); } catch { /* ignore */ }
    });
    getSetting('weightGoal').then((saved) => {
      if (saved) try { setWeightGoal(JSON.parse(saved)); } catch { /* ignore */ }
    });
    getSetting('workoutTracking').then(setWorkoutDataRaw);
  }, []);

  // Első betöltéskor frissítsük a profilt az IndexedDB-ből is.
  useEffect(() => {
    (async () => {
      try {
        const stored = await getUserProfile();
        setProfile(prev => ({
          ...prev,
          name: stored.name,
          age: stored.age,
          weight: stored.weight,
          height: stored.height,
          bloodPressure: stored.bloodPressure,
          activityLevel: stored.activityLevel,
          goal: stored.goal,
          allergies: stored.allergies,
          dietaryPreferences: stored.dietaryPreferences,
          avatar: stored.avatar,
          birthDate: stored.birthDate,
          gender: stored.gender,
          calorieTarget: stored.calorieTarget,
          waterGoalMl: stored.waterGoalMl,
          weeklyWorkoutGoal: stored.weeklyWorkoutGoal,
          macroProteinPct: stored.macroProteinPct,
          macroCarbsPct: stored.macroCarbsPct,
          macroFatPct: stored.macroFatPct,
          bodyFat: stored.bodyFat,
          muscleMass: stored.muscleMass,
          visceralFat: stored.visceralFat,
          boneMass: stored.boneMass,
          waterPercent: stored.waterPercent,
          bmi: stored.bmi,
          bmr: stored.bmr,
          gmonUploadedAt: stored.gmonUploadedAt,
          metabolicAge: stored.metabolicAge ?? (stored as any).metabolicAge ?? 0,
        }));
      } catch {
        // ignore
      }
    })();
  }, []);

  // ─── Weight Logger ──────────────────────────────────────────
  const logWeight = useCallback((kg: number) => {
    if (kg <= 0 || kg > 500) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const goalStart = weightGoal.startDate || todayStr;
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekNum = Math.max(0, Math.ceil((Date.now() - new Date(goalStart).getTime()) / msPerWeek));

    // Replace same-day entry or add new
    const filtered = weightHistory.filter(e => e.date !== todayStr);
    const newEntry: WeightEntry = { date: todayStr, weight: kg, week: weekNum };
    const newHistory = [...filtered, newEntry].sort((a, b) => a.date.localeCompare(b.date));
    setWeightHistory(newHistory);
    setSetting('weightHistory', JSON.stringify(newHistory)).catch(() => {});

    const updatedProfile = { ...profile, weight: kg, waterGoalMl: Math.round(kg * 35) };
    setProfile(updatedProfile);
    saveUserProfile({ weight: kg, waterGoalMl: Math.round(kg * 35) }).then(() => {
      try {
        window.dispatchEvent(new Event('profileUpdated'));
      } catch {
        /* ignore */
      }
      showToast(t('toast.saved'));
    });

    // Haptic feedback — meal check pattern
    if (navigator.vibrate) navigator.vibrate([10, 20]);
  }, [weightHistory, weightGoal.startDate, profile]);

  // ─── Data Upload ────────────────────────────────────────────────
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBodyCompUploadOpen, setIsBodyCompUploadOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetFinal, setShowResetFinal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const appData = useAppData();

  // ─── Staging Manager ────────────────────────────────────────────
  const staging = useStagingManager();

  // ─── Re-read profile when storage changes (e.g. after upload) ───
  const reReadProfile = useCallback(() => {
    (async () => {
      try {
        const stored = await getUserProfile();
        setProfile(prev => ({
          ...prev,
          name: stored.name,
          age: stored.age,
          metabolicAge: stored.metabolicAge ?? (stored as any).metabolicAge ?? 0,
          weight: stored.weight,
          height: stored.height,
          bloodPressure: stored.bloodPressure,
          activityLevel: stored.activityLevel,
          goal: stored.goal,
          allergies: stored.allergies,
          dietaryPreferences: stored.dietaryPreferences,
          avatar: stored.avatar,
          birthDate: stored.birthDate,
          gender: stored.gender,
          calorieTarget: stored.calorieTarget,
          waterGoalMl: stored.waterGoalMl,
          weeklyWorkoutGoal: stored.weeklyWorkoutGoal,
          macroProteinPct: stored.macroProteinPct,
          macroCarbsPct: stored.macroCarbsPct,
          macroFatPct: stored.macroFatPct,
          bodyFat: stored.bodyFat,
          muscleMass: stored.muscleMass,
          visceralFat: stored.visceralFat,
          boneMass: stored.boneMass,
          waterPercent: stored.waterPercent,
          bmi: stored.bmi,
          bmr: stored.bmr,
          gmonUploadedAt: stored.gmonUploadedAt,
        }));
      } catch {
        getSetting('userProfile').then((saved) => {
          if (saved) try { setProfile(JSON.parse(saved)); } catch { /* ignore */ }
        });
      }
    })();
    getSetting('weightHistory').then((wh) => {
      if (wh) try { setWeightHistory(JSON.parse(wh)); } catch { /* ignore */ }
    });
  }, []);

  useEffect(() => {
    // Listen for both native 'storage' (cross-tab) and custom 'profileUpdated' (same-tab)
    window.addEventListener('storage', reReadProfile);
    window.addEventListener('profileUpdated', reReadProfile);
    return () => {
      window.removeEventListener('storage', reReadProfile);
      window.removeEventListener('profileUpdated', reReadProfile);
    };
  }, [reReadProfile]);

  // ─── Re-read when appData changes (new upload detected) ───
  useEffect(() => {
    if (!appData.isLoading) {
      reReadProfile();
    }
  }, [appData.hasData, appData.hasMeasurements, appData.planCount, appData.isLoading, reReadProfile]);

  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
  const [tempAvatarImage, setTempAvatarImage] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ─── Calculations ───
  const bmi = profile.bmi != null ? String(profile.bmi) : (profile.height > 0 ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1) : '0');

  const bmr = profile.weight > 0 && profile.height > 0 && profile.age > 0
    ? (profile.age < 40
      ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5
      : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161)
    : 0;

  const activityMultiplier = profile.activityLevel === "Alacsony" ? 1.2 :
    profile.activityLevel === "Közepes" ? 1.55 :
      profile.activityLevel === "Magas" ? 1.725 : 1.55;

  const dailyCalories = Math.round(bmr * activityMultiplier);

  const today = new Date().toISOString().split('T')[0];
  let workoutCalories = 0;
  if (workoutDataRaw) {
    try {
      const data = JSON.parse(workoutDataRaw);
      if (data[today]) workoutCalories = data[today].totalCalories || 0;
    } catch { /* ignore */ }
  }

  const targetCalories = profile.calorieTarget ?? (
    profile.goal === "Fogyás" ? dailyCalories - 500 :
    profile.goal === "Súlygyarapodás" ? dailyCalories + 500 : dailyCalories
  );

  // Chart data
  const getChartData = () => {
    // Determine start parameters
    const startWeight = weightGoal.startWeight > 0 ? weightGoal.startWeight : profile.weight;
    const targetWeight = weightGoal.targetKg > 0 ? weightGoal.targetKg : profile.weight;
    const goalMonths = weightGoal.months > 0 ? weightGoal.months : 1;
    const startDateStr = weightGoal.startDate || new Date().toISOString().split('T')[0];
    const startDate = new Date(startDateStr);

    // Calculate total days for the timeframe
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + goalMonths);
    const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Decide granularity: 1 month → daily, 2+ months → weekly
    const useWeeks = goalMonths >= 2;
    const totalSteps = useWeeks ? Math.ceil(totalDays / 7) : totalDays;
    const stepDays = useWeeks ? 7 : 1;

    // Build predicted line (linear interpolation from start to target)
    const dailyWeightChange = totalDays > 0 ? (targetWeight - startWeight) / totalDays : 0;

    // Current "now" position in days from start
    const now = new Date();
    const nowDaysFromStart = Math.max(0, Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const nowStep = useWeeks ? Math.round(nowDaysFromStart / 7) : nowDaysFromStart;

    type ChartPoint = {
      label: string;
      dayOffset: number;
      weight?: number;
      predictedWeight?: number;
      isNow?: boolean;
    };

    const data: ChartPoint[] = [];

    // Add start point
    const startActual = weightHistory.find(e => e.date === startDateStr);
    data.push({
      label: useWeeks ? `0. ${t('profile.weekLabel')}` : '1',
      dayOffset: 0,
      weight: startActual ? startActual.weight : startWeight,
      predictedWeight: startWeight,
      isNow: nowStep === 0,
    });

    // Build data points along the timeline
    for (let step = 1; step <= totalSteps; step++) {
      const daysFromStart = step * stepDays;
      if (daysFromStart > totalDays) break;

      const pointDate = new Date(startDate);
      pointDate.setDate(pointDate.getDate() + daysFromStart);
      const pointDateStr = pointDate.toISOString().split('T')[0];

      // Find actual weight entry closest to this date (within ±3 days for weekly, exact for daily)
      let actualWeight: number | undefined;
      if (useWeeks) {
        const weekEntries = weightHistory.filter(e => {
          const entryDate = new Date(e.date);
          const diffDays = Math.abs((entryDate.getTime() - pointDate.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 3.5;
        });
        if (weekEntries.length > 0) {
          weekEntries.sort((a, b) => {
            const da = Math.abs(new Date(a.date).getTime() - pointDate.getTime());
            const db = Math.abs(new Date(b.date).getTime() - pointDate.getTime());
            return da - db;
          });
          actualWeight = weekEntries[0].weight;
        }
      } else {
        const exactEntry = weightHistory.find(e => e.date === pointDateStr);
        if (exactEntry) actualWeight = exactEntry.weight;
      }

      // If this is the "now" step and no weightHistory entry exists here,
      // use the current profile weight so the Mért line always reaches "now"
      const isNowStep = step === nowStep && nowDaysFromStart <= totalDays;
      if (isNowStep && actualWeight === undefined && profile.weight > 0) {
        actualWeight = profile.weight;
      }

      const predictedWeight = Number((startWeight + dailyWeightChange * daysFromStart).toFixed(1));
      const label = useWeeks ? `${step}. ${t('profile.weekLabel')}` : String(pointDate.getDate());

      data.push({
        label,
        dayOffset: daysFromStart,
        weight: actualWeight,
        predictedWeight,
        isNow: isNowStep,
      });
    }

    return data;
  };

  // Chart axis config — includes current weight in domain calculation
  const chartConfig = (() => {
    const goalMonths = weightGoal.months > 0 ? weightGoal.months : 1;
    const useWeeks = goalMonths >= 2;
    const startWeight = weightGoal.startWeight > 0 ? weightGoal.startWeight : profile.weight;
    const targetWeight = weightGoal.targetKg > 0 ? weightGoal.targetKg : profile.weight;
    const currentWeight = profile.weight > 0 ? profile.weight : startWeight;
    // Also consider actual weight history extremes
    const historyWeights = weightHistory.map(e => e.weight);
    const allWeights = [startWeight, targetWeight, currentWeight, ...historyWeights].filter(w => w > 0);
    const yMin = Math.min(...allWeights);
    const yMax = Math.max(...allWeights);
    const yPadding = Math.max(1, (yMax - yMin) * 0.1);
    return {
      yDomain: [Math.floor(yMin - yPadding), Math.ceil(yMax + yPadding)] as [number, number],
      tooltipLabel: useWeeks ? (v: any) => String(v) : (v: any) => `${v}. ${t('common.day')}`,
    };
  })();

  // ─── Handlers ───────────────────────────────────────────────────
  const handleAvatarUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => { setTempAvatarImage(reader.result as string); setIsAvatarEditorOpen(true); };
    reader.readAsDataURL(file);
  };

  const handleAvatarSave = (croppedImage: string) => {
    const updated = { ...profile, avatar: croppedImage };
    setProfile(updated);
    saveUserProfile({ avatar: croppedImage }).then(() => {
      try {
        window.dispatchEvent(new Event('profileUpdated'));
      } catch {
        // ignore
      }
      showToast(t('toast.saved'));
    });
  };

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AvatarEditor
        isOpen={isAvatarEditorOpen}
        onClose={() => setIsAvatarEditorOpen(false)}
        imageUrl={tempAvatarImage}
        onSave={handleAvatarSave}
      />

      {/* DATA UPLOAD SHEET */}
      <DataUploadSheet
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onComplete={() => {
          appData.refresh();
          getUserProfile().then((stored) => {
            setProfile(prev => ({ ...prev, name: stored.name, age: stored.age, weight: stored.weight, height: stored.height, bloodPressure: stored.bloodPressure, activityLevel: stored.activityLevel, goal: stored.goal, allergies: stored.allergies, dietaryPreferences: stored.dietaryPreferences, avatar: stored.avatar, birthDate: stored.birthDate, gender: stored.gender, calorieTarget: stored.calorieTarget, waterGoalMl: stored.waterGoalMl, weeklyWorkoutGoal: stored.weeklyWorkoutGoal, macroProteinPct: stored.macroProteinPct, macroCarbsPct: stored.macroCarbsPct, macroFatPct: stored.macroFatPct, bodyFat: stored.bodyFat, muscleMass: stored.muscleMass, visceralFat: stored.visceralFat, boneMass: stored.boneMass, waterPercent: stored.waterPercent, bmi: stored.bmi, bmr: stored.bmr, gmonUploadedAt: stored.gmonUploadedAt, metabolicAge: stored.metabolicAge ?? (stored as any).metabolicAge ?? 0 }));
          });
          getSetting('weightHistory').then((wh) => {
            if (wh) try { setWeightHistory(JSON.parse(wh)); } catch { /* ignore */ }
          });
        }}
      />

      {/* BODY COMPOSITION UPLOAD SHEET */}
      <BodyCompositionUploadSheet
        open={isBodyCompUploadOpen}
        onClose={() => setIsBodyCompUploadOpen(false)}
        onComplete={() => {
          appData.refresh();
          reReadProfile();
          showToast(t('toast.gmonLoaded'));
        }}
      />

      {/* Hidden file input for avatar upload from header */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleAvatarUpload(file);
          e.target.value = '';
        }}
      />

      {/* HEADER */}
      <div className="flex-shrink-0">
        <ProfileHeader
          name={profile.name}
          age={profile.age}
          consumed={consumed}
          dailyTarget={targetCalories}
          workoutCalories={workoutCalories}
          avatar={profile.avatar}
          subtitle={`${t('profile.appVersion')} 0.0.1`}
          onNavigateBodyVision={() => navigate('/body-vision')}
          onNameSave={(name) => {
            const updated = { ...profile, name };
            setProfile(updated);
            saveUserProfile({ name }).then(() => {
              try { window.dispatchEvent(new Event('profileUpdated')); } catch { /* ignore */ }
              showToast(t('toast.saved'));
            });
          }}
          onAgeSave={(age) => {
            const updated = { ...profile, age };
            setProfile(updated);
            saveUserProfile({ age }).then(() => {
              try { window.dispatchEvent(new Event('profileUpdated')); } catch { /* ignore */ }
              showToast(t('toast.saved'));
            });
          }}
          onAvatarClick={() => avatarInputRef.current?.click()}
        />
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-6 py-4 space-y-4">

        <DSMProfileTabs
          tabs={[
            { id: "me", label: t('profile.tabMe') },
            { id: "goals", label: t('profile.tabGoals') },
            { id: "settings", label: t('profile.tabSettings') },
          ]}
          defaultTab="me"
          variant="pill"
          ariaLabel={t('ui.profileSections')}
        >
          {(activeTab) => (
            <div className="space-y-4">
              {/* TAB 1 — Én / Me */}
              {activeTab === "me" && (
                <>
        {/* Tab 1 — Personal data */}
        <DSMCard>
          <DSMSectionTitle icon={User} iconColor="text-gray-500" title={t('profile.personalData')} className="mb-3" />
          <div className="space-y-3">
            <EditableFieldRow label={t('profile.birthDate')} value={profile.birthDate || ''} type="date" onSave={(v) => { setProfile((p) => ({ ...p, birthDate: v })); saveUserProfile({ birthDate: v || undefined }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
            <div className="pt-2 pb-1">
              <label className="text-2xs text-gray-500 block mb-1.5">{t('profile.gender')}</label>
              <div className="flex flex-wrap gap-2">
                {(['male', 'female', 'other'] as const).map((g) => (
                  <button key={g} type="button" onClick={() => { setProfile((p) => ({ ...p, gender: g })); saveUserProfile({ gender: g }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} style={{ padding: '0.4rem 0.75rem', borderRadius: 999, border: 'none', background: profile.gender === g ? '#f3f4f6' : 'transparent', color: profile.gender === g ? '#111827' : '#6b7280', fontWeight: profile.gender === g ? 600 : 400, fontSize: '0.8125rem' }}>{t(`profile.gender${g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other'}`)}</button>
                ))}
              </div>
            </div>
          </div>
        </DSMCard>

        {/* Body metrics + BMI bar + GMON fields */}
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
              {/* BMI: from GMON or calculated */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xs text-gray-500">BMI</span>
                  <span className="text-sm font-semibold text-gray-900">{bmi === '0' ? '–' : bmi}</span>
                </div>
                <BMIBar value={Number(bmi)} t={t} />
                <div className="text-2xs text-gray-500 mt-1">{getBMILabel(Number(bmi), t)}</div>
              </div>
              <InlineEditStat label={t('profile.bodyFat')} value={profile.bodyFat ?? 0} unit="%" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, bodyFat: n })); saveUserProfile({ bodyFat: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
              <InlineEditStat label={t('profile.muscleMass')} value={profile.muscleMass ?? 0} unit="kg" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, muscleMass: n })); saveUserProfile({ muscleMass: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
              <InlineEditStat label={t('profile.metabolicAge')} value={profile.metabolicAge ?? 0} unit={t('profileExtra.yearUnit')} type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, metabolicAge: n })); saveUserProfile({ metabolicAge: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
              <InlineEditStat label={t('profile.bmr')} value={profile.bmr ?? 0} unit="kcal" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, bmr: n })); saveUserProfile({ bmr: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
            </div>
        </DSMCard>

        {/* Activity level — 5 pills */}
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
              <button key={key} type="button" onClick={() => { setProfile((p) => ({ ...p, activityLevel: key })); saveUserProfile({ activityLevel: key }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} style={{ padding: '0.4rem 0.75rem', borderRadius: 999, border: 'none', background: profile.activityLevel === key ? '#f3f4f6' : 'transparent', color: profile.activityLevel === key ? '#111827' : '#6b7280', fontWeight: profile.activityLevel === key ? 600 : 400, fontSize: '0.8125rem' }}>{t(labelKey)}</button>
            ))}
          </div>
        </DSMCard>

        {/* Weight progress chart */}
        <DSMCard>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>{t('profile.weightProgress')}</span>
            </div>
            <button
              onClick={() => {
                if (!isGoalEditing) {
                  setGoalDraftKg(weightGoal.targetKg > 0 ? String(weightGoal.targetKg) : '');
                  setGoalDraftMonths(weightGoal.months > 0 ? String(weightGoal.months) : '');
                }
                setIsGoalEditing(!isGoalEditing);
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={t('profile.editGoal')}
            >
              <Pencil className={`w-3.5 h-3.5 ${isGoalEditing ? 'text-blue-500' : 'text-gray-400'}`} />
            </button>
          </div>

          {/* Chart */}
          <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100" role="img" aria-label={t('profile.weightChartAria').replace('{weight}', String(profile.weight))}>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={getChartData()} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} domain={chartConfig.yDomain} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '11px', padding: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', color: 'var(--foreground)' }}
                  labelFormatter={(v) => chartConfig.tooltipLabel(v)}
                  formatter={(value: any, name: any) => {
                    if (name === 'weight') return [`${value} kg`, t('profile.measured')];
                    if (name === 'predictedWeight') return [`${Number(value).toFixed(1)} kg`, t('profile.predicted')];
                    return [value, name];
                  }}
                />
                {/* Várható (predicted) — szaggatott szürke vonal */}
                <Line type="monotone" dataKey="predictedWeight" stroke="#9ca3af" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls />
                {/* Mért (actual) — folytonos kék vonal */}
                <Line type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy, index, payload } = props;
                    if (payload.weight == null) return <circle key={`dot-${index}`} r={0} cx={cx} cy={cy} />;
                    // "Most" = the isNow point (current position on timeline)
                    if (payload.isNow) {
                      return (
                        <g key={`dot-${index}`}>
                          {/* Outer pulse ring */}
                          <circle cx={cx} cy={cy} r={10} fill="#2563eb" opacity={0.12} />
                          {/* White border ring */}
                          <circle cx={cx} cy={cy} r={6.5} fill="#2563eb" stroke="#fff" strokeWidth={3} />
                        </g>
                      );
                    }
                    return (
                      <circle
                        key={`dot-${index}`}
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill="#2563eb"
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                  activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                  connectNulls />
              </LineChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-2 pb-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-[2.5px] bg-blue-600 rounded-full" />
                <span className="text-[9px] text-gray-500" style={{ fontWeight: 500 }}>{t('profile.measured')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-[2px] rounded-full" style={{ background: 'repeating-linear-gradient(90deg, #9ca3af 0px, #9ca3af 3px, transparent 3px, transparent 5.5px)' }} />
                <span className="text-[9px] text-gray-500" style={{ fontWeight: 500 }}>{t('profile.predicted')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
                <span className="text-[9px] text-gray-500" style={{ fontWeight: 500 }}>{t('profile.now')}</span>
              </div>
            </div>
          </div>

          {/* ── Deviation indicator ── */}
          {(() => {
            const chartData = getChartData();
            const nowPoint = chartData.find(p => p.isNow);
            const currentMeasured = profile.weight;
            const expectedNow = nowPoint?.predictedWeight;
            const deviation = expectedNow && currentMeasured > 0
              ? Number((currentMeasured - expectedNow).toFixed(1))
              : null;

            if (deviation === null || weightGoal.targetKg <= 0) return null;

            return (
              <div className={`mt-3 flex items-center justify-between px-3 py-2 rounded-lg border ${
                Math.abs(deviation) <= 0.5
                  ? 'bg-green-50/60 border-green-200/60'
                  : deviation > 0
                    ? 'bg-amber-50/60 border-amber-200/60'
                    : 'bg-blue-50/60 border-blue-200/60'
              }`}>
                <div className="flex items-center gap-2">
                  {Math.abs(deviation) <= 0.5 ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : deviation > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span className="text-[11px] text-gray-700" style={{ fontWeight: 500 }}>
                    {Math.abs(deviation) <= 0.5
                      ? t('profile.onPlan')
                      : deviation > 0
                        ? `+${deviation} ${t('profile.abovePlan')}`
                        : `${deviation} ${t('profile.belowPlan')}`
                    }
                  </span>
                </div>
                <div className="text-2xs text-gray-500">
                  {t('profile.planLabel')}: {expectedNow?.toFixed(1)} kg
                </div>
              </div>
            );
          })()}

          {/* Goal editing fields — only visible when pencil is active */}
          {isGoalEditing && (
            <div className="mt-3 p-3 bg-blue-50/50 rounded-xl border border-blue-200/50">
              <div className="flex items-center gap-2 mb-2.5">
                <Target className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] text-gray-700" style={{ fontWeight: 600 }}>{t('profile.goal')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-2xs text-gray-500 mb-1 block">{t('profile.targetWeight')}</label>
                  <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-2 py-1.5">
                    <Target className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={`${t('common.eg')} 84`}
                      value={goalDraftKg}
                      onChange={(e) => setGoalDraftKg(e.target.value)}
                      className="w-full bg-transparent outline-none text-xs text-gray-900"
                    />
                    <span className="text-2xs text-gray-400 flex-shrink-0">kg</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-2xs text-gray-500 mb-1 block">{t('profile.timeframe')}</label>
                  <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-2 py-1.5">
                    <Calendar className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder={`${t('common.eg')} 12`}
                      value={goalDraftMonths}
                      onChange={(e) => setGoalDraftMonths(e.target.value)}
                      className="w-full bg-transparent outline-none text-xs text-gray-900"
                    />
                    <span className="text-2xs text-gray-400 flex-shrink-0">{t('profile.month')}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  const newGoal: WeightGoal = {
                    targetKg: Number(goalDraftKg) || 0,
                    months: Number(goalDraftMonths) || 0,
                    startDate: new Date().toISOString().split('T')[0],
                    startWeight: profile.weight
                  };
                  setWeightGoal(newGoal);
                  setSetting('weightGoal', JSON.stringify(newGoal)).catch(() => {});
                  setIsGoalEditing(false);
                  if (navigator.vibrate) navigator.vibrate(10);
                }}
                className="mt-2.5 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors"
                style={{ fontWeight: 600 }}
              >
                {t('profile.save')}
              </button>
            </div>
          )}

          {/* Saved goal summary — shown when not editing and goal exists */}
          {!isGoalEditing && weightGoal.targetKg > 0 && (
            <div className="mt-2.5 flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <Target className="w-3 h-3 text-gray-500" />
                <span className="text-2xs text-gray-600">
                  {t('profile.goalLabel')}: <span style={{ fontWeight: 600 }}>{weightGoal.targetKg} kg</span>
                </span>
              </div>
              {weightGoal.months > 0 && (
                <span className="text-2xs text-gray-500">
                  {weightGoal.months} {t('profile.monthsIn')}
                </span>
              )}
            </div>
          )}
        </DSMCard>
                </>
              )}

              {/* TAB 2 — Célok / Goals */}
              {activeTab === "goals" && (
                <ProfileGoalsTab
                  profile={profile}
                  targetCalories={targetCalories}
                  dailyCalories={dailyCalories}
                  onProfileUpdate={(partial) => {
                    setProfile((p) => ({ ...p, ...partial }));
                    saveUserProfile(partial as any).then(() => {
                      try { window.dispatchEvent(new Event('profileUpdated')); } catch { /* ignore */ }
                      showToast(t('toast.saved'));
                    });
                  }}
                  t={t}
                />
              )}

              {/* TAB 3 — Beállítások / Settings (clean minimal, black & white) */}
              {activeTab === "settings" && (
                <SettingsTabContent
                  appData={appData}
                  staging={staging}
                  onUploadOpen={() => setIsUploadOpen(true)}
                  onBodyCompOpen={() => setIsBodyCompUploadOpen(true)}
                  onPublish={async () => {
                    const success = await staging.publish();
                    if (success) { appData.refresh(); reReadProfile(); }
                  }}
                  showResetConfirm={showResetConfirm}
                  showResetFinal={showResetFinal}
                  isResetting={isResetting}
                  onShowResetConfirm={setShowResetConfirm}
                  onShowResetFinal={setShowResetFinal}
                  onReset={async () => {
                    setIsResetting(true);
                    if (navigator.vibrate) navigator.vibrate([15, 30, 50]);
                    const result = await performFullReset({ clearTheme: false, reseed: false });
                    setIsResetting(false);
                    if (result.success) {
                      setShowResetFinal(false);
                      setShowResetConfirm(false);
                      appData.refresh();
                    }
                  }}
                  onLogout={() => { logout(); navigate('/splash'); }}
                  reReadProfile={reReadProfile}
                />
              )}
            </div>
          )}
        </DSMProfileTabs>

        <div className="h-4" />
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

/** Inline editable row: label on top, value or input below. */
function EditableFieldRow({ label, value, type = 'text', onSave }: { label: string; value: string; type?: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  const save = () => { onSave(draft); setEditing(false); };
  return (
    <div style={{ padding: '0.75rem 0', borderBottom: '1px solid #f3f4f6' }}>
      <label className="block text-xs text-gray-500">{label}</label>
      {editing ? (
        <input
          autoFocus
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
          className="mt-0.5 w-full text-base font-semibold border-none border-b-2 border-blue-500 outline-none bg-transparent py-0.5 text-gray-900"
        />
      ) : (
        <div onClick={() => setEditing(true)} className="mt-0.5 text-base font-semibold py-0.5 cursor-pointer text-gray-900" style={{ color: value ? undefined : '#9ca3af' }}>{value || '—'}</div>
      )}
    </div>
  );
}

function getBMILabel(bmi: number, t: (k: string) => string): string {
  if (bmi <= 0) return '';
  if (bmi < 18.5) return t('profile.bmiUnderweight');
  if (bmi < 25) return t('profile.bmiNormal');
  if (bmi < 30) return t('profile.bmiOverweight');
  return t('profile.bmiObese');
}

/** Visual BMI bar: colored zones &lt;18.5 blue, 18.5-24.9 green, 25-29.9 yellow, 30+ red; marker at value */
function BMIBar({ value }: { value: number; t: (k: string) => string }) {
  const maxBmi = 40;
  const pct = value <= 0 ? 0 : Math.min(100, (value / maxBmi) * 100);
  const zones = [
    { end: 18.5 / maxBmi * 100, color: '#3b82f6' },
    { end: 25 / maxBmi * 100, color: '#22c55e' },
    { end: 30 / maxBmi * 100, color: '#eab308' },
    { end: 100, color: '#ef4444' },
  ];
  return (
    <div className="relative h-3 rounded-full overflow-hidden bg-gray-100" style={{ width: '100%' }}>
      <div className="absolute inset-0 flex">
        {zones.map((z, i) => (
          <div key={i} style={{ width: `${z.end - (zones[i - 1]?.end ?? 0)}%`, background: z.color }} />
        ))}
      </div>
      <div className="absolute top-0 bottom-0 w-1 bg-gray-900 rounded-full shadow" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }} />
    </div>
  );
}

/** Tab 2 — Goals: calorie target, macros, water, weekly workouts */
function ProfileGoalsTab({
  profile,
  targetCalories,
  dailyCalories,
  onProfileUpdate,
  t,
}: {
  profile: ProfileData;
  targetCalories: number;
  dailyCalories: number;
  onProfileUpdate: (partial: Partial<ProfileData>) => void;
  t: (key: string) => string;
}) {
  const kcal = profile.calorieTarget ?? targetCalories;
  const proteinPct = profile.macroProteinPct ?? 30;
  const carbsPct = profile.macroCarbsPct ?? 40;
  const fatPct = profile.macroFatPct ?? 30;
  const waterGoal = profile.waterGoalMl ?? Math.round((profile.weight || 70) * 35);
  const workoutGoal = profile.weeklyWorkoutGoal ?? 3;

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

  const handleWakeTimeChange = async (time: string) => {
    setWakeTime(time);
    const options = SleepService.getBedtimeOptions(time);
    setBedtimeOptions(options);
    const preferred = options.find((o) => o.cycleCount === 6);
    const newBedtime = preferred?.bedtime ?? selectedBedtime;
    const newCycles = preferred?.cycleCount ?? selectedCycles;
    if (preferred) {
      setSelectedBedtime(preferred.bedtime);
      setSelectedCycles(preferred.cycleCount);
    }
    console.log('Saving sleep settings:', { wakeTime: time, selectedBedtime: newBedtime, selectedCycles: newCycles });
    await SleepService.saveSleepSettings({
      wakeTime: time,
      selectedBedtime: newBedtime,
      selectedCycles: newCycles,
    });
    console.log('Sleep saved, showing toast');
    showToast(t('toast.sleepSaved'));
    try { window.dispatchEvent(new Event('profileUpdated')); } catch { /* ignore */ }
  };

  const handleBedtimeSelect = async (bedtime: string, cycles: number) => {
    setSelectedBedtime(bedtime);
    setSelectedCycles(cycles);
    console.log('Saving sleep settings:', { wakeTime, selectedBedtime: bedtime, selectedCycles: cycles });
    await SleepService.saveSleepSettings({
      wakeTime,
      selectedBedtime: bedtime,
      selectedCycles: cycles,
    });
    console.log('Sleep saved, showing toast');
    showToast(t('toast.sleepSaved'));
    try { window.dispatchEvent(new Event('profileUpdated')); } catch { /* ignore */ }
  };

  const proteinG = Math.round((kcal * (proteinPct / 100)) / 4);
  const carbsG = Math.round((kcal * (carbsPct / 100)) / 4);
  const fatG = Math.round((kcal * (fatPct / 100)) / 9);

  const updateMacros = (p: number, c: number, f: number) => {
    onProfileUpdate({ macroProteinPct: p, macroCarbsPct: c, macroFatPct: f });
  };

  return (
    <div className="space-y-6">
      <DSMCard>
        <DSMSectionTitle icon={Target} iconColor="text-gray-500" title={t('profile.dailyGoals')} className="mb-3" />
        <div className="flex flex-col items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={kcal || ''}
            onChange={(e) => onProfileUpdate({ calorieTarget: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="w-32 text-center text-2xl font-semibold text-gray-900 bg-transparent border-b-2 border-gray-200 focus:outline-none focus:border-blue-500 py-1"
          />
          <span className="text-sm text-gray-500">{t('profile.kcalPerDay')}</span>
          <p className="text-xs text-gray-400">{t('profile.recommendedKcal').replace('{kcal}', String(dailyCalories))}</p>
        </div>
      </DSMCard>

      <DSMCard>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('profile.macroProtein')}</span>
            <span><input type="number" min={0} max={100} className="w-12 text-right bg-transparent border-b border-gray-200 focus:outline-none" value={proteinPct} onChange={(e) => { const v = Number(e.target.value); updateMacros(v, carbsPct, 100 - v - carbsPct); }} />% = {proteinG}g</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('profile.macroCarbs')}</span>
            <span><input type="number" min={0} max={100} className="w-12 text-right bg-transparent border-b border-gray-200 focus:outline-none" value={carbsPct} onChange={(e) => { const v = Number(e.target.value); updateMacros(proteinPct, v, 100 - proteinPct - v); }} />% = {carbsG}g</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('profile.macroFat')}</span>
            <span><input type="number" min={0} max={100} className="w-12 text-right bg-transparent border-b border-gray-200 focus:outline-none" value={fatPct} onChange={(e) => { const v = Number(e.target.value); updateMacros(proteinPct, carbsPct, v); }} />% = {fatG}g</span>
          </div>
          <div className="text-xs text-gray-500 pt-1">{t('profile.total100')} {proteinPct + carbsPct + fatPct === 100 ? '✓' : ''}</div>
        </div>
      </DSMCard>

      <DSMCard>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">{t('water.goal')}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={waterGoal || ''}
              onChange={(e) => onProfileUpdate({ waterGoalMl: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="flex-1 text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-gray-200 focus:outline-none focus:border-blue-500 py-1"
            />
            <span className="text-sm text-gray-500">{t('profile.waterGoalMlPerDay')}</span>
          </div>
        </div>
      </DSMCard>

      <DSMCard>
        <SleepSetup
          wakeTime={wakeTime}
          bedtimeOptions={bedtimeOptions}
          selectedBedtime={selectedBedtime}
          onWakeTimeChange={handleWakeTimeChange}
          onBedtimeSelect={handleBedtimeSelect}
        />
      </DSMCard>

      <DSMCard>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">{t('profile.workoutsPerWeek')}</label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onProfileUpdate({ weeklyWorkoutGoal: n })}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 999,
                  border: 'none',
                  background: workoutGoal === n ? '#f3f4f6' : 'transparent',
                  boxShadow: workoutGoal === n ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  color: workoutGoal === n ? '#111827' : '#6b7280',
                  fontWeight: workoutGoal === n ? 600 : 400,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </DSMCard>
    </div>
  );
}

// ─── Settings tab: minimal row + card ─────────────────────────────────
function SettingsRow({
  title,
  subtitle,
  rightText,
  rightElement,
  onClick,
  color,
}: {
  title: string;
  subtitle?: string;
  rightText?: string;
  rightElement?: React.ReactNode;
  onClick?: () => void;
  color?: string;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        borderBottom: '1px solid #f3f4f6',
        cursor: onClick ? 'pointer' : 'default',
        background: 'white',
      }}
    >
      <div>
        <div style={{ fontSize: '1rem', fontWeight: 500, color: color ?? '#111827' }}>{title}</div>
        {subtitle != null && subtitle !== '' && (
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {rightElement != null ? rightElement : (rightText != null && rightText !== '' && (
        <span style={{ color: '#3b82f6', fontSize: '0.875rem' }}>{rightText}</span>
      ))}
    </div>
  );
}

function SettingsCard({ sectionTitle, children }: { sectionTitle: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '1rem',
        overflow: 'hidden',
        marginBottom: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#9ca3af',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '0.75rem 1rem 0.25rem',
        }}
      >
        {sectionTitle}
      </div>
      {children}
    </div>
  );
}

function getLanguagesSettings(): { code: LanguageCode; name: string; flag: string }[] {
  const meta = LANGUAGE_META;
  return SUPPORTED_LANGUAGES.map((code) => ({
    code,
    name: meta[code]?.name ?? code,
    flag: meta[code]?.flag ?? '',
  }));
}
const LANGUAGES_SETTINGS = getLanguagesSettings();

function SettingsTabContent(props: {
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
}) {
  const {
    appData,
    staging,
    onUploadOpen,
    onBodyCompOpen,
    onPublish,
    showResetConfirm,
    showResetFinal,
    isResetting,
    onShowResetConfirm,
    onShowResetFinal,
    onReset,
    onLogout,
  } = props;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, subscriptionActive } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [trial, setTrial] = useState({ daysUsed: 0, daysRemaining: TRIAL_DAYS, isExpired: false, startDate: '' });
  useEffect(() => { getTrialInfo().then(setTrial); }, []);

  return (
    <div style={{ background: '#f9fafb', minHeight: '100%', paddingBottom: '1rem' }}>
      {/* Section 1: Tervem / My Plan */}
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

      {/* Section 3: Language */}
      <SettingsCard sectionTitle={t('profile.sectionLanguage')}>
        <div style={{ padding: '0.75rem 1rem 1rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: 500, color: '#111827' }}>{t('profile.appLanguage')}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {LANGUAGES_SETTINGS.map((lang) => {
              const isActive = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => { setLanguage(lang.code); showToast(t('toast.languageChanged')); if (navigator.vibrate) navigator.vibrate(10); }}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 999,
                    border: isActive ? '1px solid #d1d5db' : 'none',
                    background: isActive ? 'white' : '#f3f4f6',
                    color: isActive ? '#111827' : '#6b7280',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  {lang.flag} {lang.name}
                </button>
              );
            })}
          </div>
        </div>
      </SettingsCard>

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
          onClick={!subscriptionActive && !trial.isExpired ? () => navigate('/subscription') : undefined}
        />
      </SettingsCard>

      {/* Section 5: Other */}
      <SettingsCard sectionTitle={t('profile.sectionOther')}>
        <SettingsRow title={t('profile.faq')} rightText="›" onClick={() => navigate('/faq')} />
        <SettingsRow title={t('profile.aboutUs')} rightText="›" onClick={() => navigate('/about')} />
        <SettingsRow title={t('profile.contact')} rightText="›" onClick={() => navigate('/contact')} />
      </SettingsCard>

      {/* Section 6: Account */}
      <SettingsCard sectionTitle={t('profile.account.accountSection')}>
        {user && (
          <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{user.email}</div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>
              {user.provider === 'demo' ? 'Demo (offline)' : user.provider === 'email' ? t('profile.account.emailAccount') : t('profile.googleAccount')}
            </div>
          </div>
        )}
        <SettingsRow title={t('profile.signOut')} color="#ef4444" onClick={onLogout} />
        <SettingsRow
          title={t('profile.deleteAllData')}
          color="#9ca3af"
          onClick={() => onShowResetConfirm(true)}
        />
      </SettingsCard>

      {/* Reset confirm — full-screen overlay modal */}
      <AnimatePresence>
        {(showResetConfirm || showResetFinal) && (
          <motion.div
            key="delete-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => { onShowResetFinal(false); onShowResetConfirm(false); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            <motion.div
              key={showResetFinal ? 'final' : 'first'}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 420,
                background: '#fff',
                borderRadius: '20px',
                padding: '32px 28px 28px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
                border: '1.5px solid rgba(0,0,0,0.07)',
                position: 'relative',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => { onShowResetFinal(false); onShowResetConfirm(false); }}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  width: 32, height: 32, borderRadius: '50%',
                  border: 'none', cursor: 'pointer',
                  background: 'rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: 18, lineHeight: 1,
                }}
              >×</button>

              {/* Icon */}
              <div style={{
                width: 64, height: 64, borderRadius: '18px',
                background: 'rgba(239,68,68,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                border: '1.5px solid rgba(239,68,68,0.15)',
              }}>
                <Trash2 size={28} color={showResetFinal ? '#ef4444' : '#ef4444'} strokeWidth={1.8} />
              </div>

              {/* Title */}
              <div style={{
                fontSize: '1.25rem', fontWeight: 700, marginBottom: 8,
                color: '#111827',
                letterSpacing: '-0.02em',
              }}>
                {showResetFinal ? t('profile.finalConfirmation') : t('ui.confirm') + '?'}
              </div>

              {/* Body */}
              <p style={{
                fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 28,
                color: '#6b7280',
              }}>
                {showResetFinal ? t('profile.finalDeleteWarning') : t('profile.deleteWarning')}
              </p>

              {/* Divider */}
              <div style={{
                height: 1,
                background: 'rgba(0,0,0,0.07)',
                marginBottom: 20,
              }} />

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { onShowResetFinal(false); onShowResetConfirm(false); }}
                  style={{
                    flex: 1, height: 44, borderRadius: 12, cursor: 'pointer',
                    border: '1.5px solid #e5e7eb',
                    background: 'transparent',
                    color: '#374151',
                    fontWeight: 600, fontSize: '0.9rem',
                  }}
                >
                  {t('ui.cancel')}
                </button>
                {!showResetFinal ? (
                  <button
                    onClick={() => onShowResetFinal(true)}
                    style={{
                      flex: 1, height: 44, borderRadius: 12, cursor: 'pointer',
                      border: 'none',
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      color: '#fff',
                      fontWeight: 700, fontSize: '0.9rem',
                      boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
                    }}
                  >
                    {t('ui.confirm')}
                  </button>
                ) : (
                  <button
                    onClick={onReset}
                    disabled={isResetting}
                    style={{
                      flex: 1, height: 44, borderRadius: 12, cursor: isResetting ? 'not-allowed' : 'pointer',
                      border: 'none',
                      background: isResetting
                        ? 'rgba(239,68,68,0.4)'
                        : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                      color: '#fff',
                      fontWeight: 700, fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: isResetting ? 'none' : '0 4px 18px rgba(185,28,28,0.5)',
                    }}
                  >
                    {isResetting ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                          <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                          <path d="M8 2 A6 6 0 0 1 14 8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        {t('profile.irreversibleDelete')}
                      </>
                    ) : (
                      <>{t('profile.irreversibleDelete')}</>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Map Firebase error codes to i18n keys for account operations */
function mapAccountError(code: string): string {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'profile.account.errWrongPassword';
    case 'auth/email-already-in-use':
      return 'profile.account.errEmailInUse';
    case 'auth/invalid-email':
      return 'profile.account.errInvalidEmail';
    case 'auth/weak-password':
      return 'profile.account.errWeakPassword';
    case 'auth/requires-recent-login':
      return 'profile.account.errRecentLogin';
    case 'auth/too-many-requests':
      return 'profile.account.errTooMany';
    default:
      return 'profile.account.errGeneric';
  }
}

/** Account settings card — email/password change + logout */
function AccountSettingsCard({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  type EditMode = null | 'email' | 'password';
  const [editMode, setEditMode] = useState<EditMode>(null);

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPw, setEmailCurrentPw] = useState('');
  const [showEmailPw, setShowEmailPw] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Shared state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isEmailProvider = user?.provider === 'email';

  const resetForm = () => {
    setEditMode(null);
    setNewEmail('');
    setEmailCurrentPw('');
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setShowEmailPw(false);
    setShowCurrentPw(false);
    setShowNewPw(false);
    setError(null);
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !emailCurrentPw) return;
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await changeEmail(newEmail.trim(), emailCurrentPw);
      if (navigator.vibrate) navigator.vibrate([10, 20]);
      setSuccess(t('profile.account.emailChanged'));
      resetForm();
      // Force re-read — user object is updated in authService
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const key = mapAccountError(err?.code || '');
      setError(t(key));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw) return;
    if (newPw.length < 6) {
      setError(t('profile.account.errWeakPassword'));
      return;
    }
    if (newPw !== confirmPw) {
      setError(t('profile.account.errPasswordMismatch'));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await changePassword(currentPw, newPw);
      if (navigator.vibrate) navigator.vibrate([10, 20]);
      setSuccess(t('profile.account.passwordChanged'));
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const key = mapAccountError(err?.code || '');
      setError(t(key));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DSMCard>
      {/* User info header */}
      {user && (
        <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl mb-3">
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-900 truncate">{user.email}</div>
            <div className="text-2xs text-gray-400">
              {user.provider === 'email' ? t('profile.account.emailAccount') : user.provider === 'demo' ? 'Demo (offline)' : t('profile.googleAccount')}
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 p-2.5 mb-3 bg-green-50 border border-green-200 rounded-xl">
          <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
          <span className="text-xs text-green-700">{success}</span>
        </div>
      )}

      {/* Action buttons — only for email provider */}
      {isEmailProvider && editMode === null && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setEditMode('email'); setError(null); setSuccess(null); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/60 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-blue-700" style={{ fontWeight: 600 }}>
              {t('profile.account.changeEmail')}
            </span>
          </button>
          <button
            onClick={() => { setEditMode('password'); setError(null); setSuccess(null); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary" style={{ fontWeight: 600 }}>
              {t('profile.account.changePassword')}
            </span>
          </button>
        </div>
      )}

      {/* ── Email Change Form ───────────────────────── */}
      {editMode === 'email' && (
        <form onSubmit={handleChangeEmail} className="mb-3 p-3 bg-blue-50/50 rounded-xl border border-blue-200/50 space-y-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>
              {t('profile.account.changeEmail')}
            </span>
          </div>

          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder={t('profile.account.newEmailPlaceholder')}
            required
            className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />

          <div className="relative">
            <input
              type={showEmailPw ? 'text' : 'password'}
              value={emailCurrentPw}
              onChange={(e) => setEmailCurrentPw(e.target.value)}
              placeholder={t('profile.account.currentPasswordPlaceholder')}
              required
              className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
            <button type="button" onClick={() => setShowEmailPw(!showEmailPw)} tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
              {showEmailPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
              <span className="text-[11px] text-red-600">{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <DSMButton variant="outline" size="sm" fullWidth onClick={resetForm} type="button">
              {t('ui.cancel')}
            </DSMButton>
            <DSMButton variant="gradient" size="sm" fullWidth loading={isSubmitting} type="submit">
              {t('profile.account.save')}
            </DSMButton>
          </div>
        </form>
      )}

      {/* ── Password Change Form ────────────────────── */}
      {editMode === 'password' && (
        <form onSubmit={handleChangePassword} className="mb-3 p-3 bg-primary/5 rounded-xl border border-primary/20 space-y-2.5">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>
              {t('profile.account.changePassword')}
            </span>
          </div>

          <div className="relative">
            <input
              type={showCurrentPw ? 'text' : 'password'}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder={t('profile.account.currentPasswordPlaceholder')}
              required
              className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
              {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showNewPw ? 'text' : 'password'}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder={t('profile.account.newPasswordPlaceholder')}
              required
              minLength={6}
              className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
              {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder={t('profile.account.confirmPasswordPlaceholder')}
            required
            minLength={6}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />

          <p className="text-2xs text-gray-400 pl-0.5">
            {t('profile.account.passwordHint')}
          </p>

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
              <span className="text-[11px] text-red-600">{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <DSMButton variant="outline" size="sm" fullWidth onClick={resetForm} type="button">
              {t('ui.cancel')}
            </DSMButton>
            <DSMButton variant="gradient" size="sm" fullWidth loading={isSubmitting} type="submit">
              {t('profile.account.save')}
            </DSMButton>
          </div>
        </form>
      )}

      {/* Logout button */}
      <button
        type="button"
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium transition-colors hover:bg-red-50 bg-white border-2 border-red-500 text-red-500"
      >
        <LogOut className="w-4 h-4" />
        {t('profile.logout')}
      </button>
    </DSMCard>
  );
}

/** Theme toggle card */
function ThemeToggleCard() {
  const { t } = useLanguage();

  return (
    <DSMCard>
      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={isDark}
        aria-label={isDark ? t('profile.switchToLight') : t('profile.switchToDark')}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-3 pointer-events-none">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-indigo-500/10' : 'bg-amber-50'}`}>
            {isDark ? <Moon className="w-4.5 h-4.5 text-indigo-400" /> : <Sun className="w-4.5 h-4.5 text-amber-500" />}
          </div>
          <div className="text-left">
            <div className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
              {isDark ? t('profile.darkMode') : t('profile.lightMode')}
            </div>
            <p className="text-2xs text-gray-500 mt-0.5">
              {isDark ? t('profile.darkModeDesc') : t('profile.lightModeDesc')}
            </p>
          </div>
        </div>
        <div
          className={`relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0 pointer-events-none ${
            isDark ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${
              isDark ? 'left-[22px]' : 'left-0.5'
            }`}
          >
            {isDark ? <Moon className="w-3 h-3 text-indigo-500" /> : <Sun className="w-3 h-3 text-amber-500" />}
          </div>
        </div>
      </button>
    </DSMCard>
  );
}

/** Language selector card for settings */
const LANGUAGES = [
  { code: 'hu' as LanguageCode, name: 'Magyar', flag: '\u{1F1ED}\u{1F1FA}' },
  { code: 'en' as LanguageCode, name: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'ro' as LanguageCode, name: 'Română', flag: '\u{1F1F7}\u{1F1F4}' },
];

function LanguageSelectorCard() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DSMCard>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <Globe className="w-4.5 h-4.5 text-blue-500" />
        </div>
        <div>
          <div className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
            {t('profile.appLanguage')}
          </div>
          <p className="text-2xs text-gray-500 mt-0.5">
            {t('profile.appLanguageDesc')}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {LANGUAGES.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLanguage(lang.code);
                showToast(t('toast.languageChanged'));
                if (navigator.vibrate) navigator.vibrate(10);
              }}
              className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200 active:bg-gray-100'
              }`}
            >
              <span className="text-2xl leading-none pointer-events-none">{lang.flag}</span>
              <span
                className={`text-xs pointer-events-none ${isActive ? 'text-blue-700' : 'text-gray-600'}`}
                style={{ fontWeight: isActive ? 700 : 500 }}
              >
                {lang.name}
              </span>
              {isActive && (
                <div className="absolute top-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-blue-500 flex items-center justify-center pointer-events-none">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </DSMCard>
  );
}

/** Settings navigation link */
function SettingsLink({ icon: Icon, iconColor, label, onClick }: {
  icon: React.ElementType; iconColor: string; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 px-1 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
        <span className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  );
}



// ─── Subscription ───────────────────────────────────────────────────
function SubscriptionManagement() {
  const navigate = useNavigate();
  const { user, subscription, subscriptionActive, cancelSubscription, logout } = useAuth();
  const { t } = useLanguage();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [trial, setTrial] = useState({ daysUsed: 0, daysRemaining: TRIAL_DAYS, isExpired: false, startDate: '' });
  useEffect(() => { getTrialInfo().then(setTrial); }, []);

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try { await cancelSubscription(); setShowCancelConfirm(false); } finally { setIsCancelling(false); }
  };

  return (
    <>
      <DSMCard padding="none">
        {/* Header */}
        <div className="p-3.5 bg-primary rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-bold text-white">
                {subscriptionActive
                  ? t('profile.premiumSubscription')
                  : !trial.isExpired
                  ? t('profile.freeTrial')
                  : t('profile.freePackage')
                }
              </span>
            </div>
            {!subscriptionActive && !trial.isExpired && (
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-white" />
                <span className="text-2xs font-bold text-white">{trial.daysRemaining} {t('common.day')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 space-y-2.5">
          {subscriptionActive && subscription ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('profile.status')}</span>
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">{t('profile.active')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('profile.nextPayment')}</span>
                <span className="text-xs text-gray-800">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('profile.fee')}</span>
                <span className="text-xs text-gray-800">{formatUsd(SUBSCRIPTION_PRICE_USD)}{t('common.perMonth')} (~{formatHuf(SUBSCRIPTION_PRICE_HUF)})</span>
              </div>
              {showCancelConfirm ? (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl mt-1">
                  <p className="text-xs text-red-800 mb-2">{t('profile.confirmCancel')}</p>
                  <div className="flex gap-2">
                    <DSMButton variant="outline" size="sm" fullWidth onClick={() => setShowCancelConfirm(false)}>{t('ui.cancel')}</DSMButton>
                    <DSMButton variant="destructive" size="sm" fullWidth onClick={handleCancelSubscription} loading={isCancelling}>{t('ui.confirm')}</DSMButton>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCancelConfirm(true)} className="w-full px-3 py-2 border border-gray-200 text-gray-400 rounded-xl text-xs hover:bg-gray-50 transition-colors mt-1">
                  {t('profile.cancelSubscription')}
                </button>
              )}
            </>
          ) : !trial.isExpired ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('profile.status')}</span>
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Gift className="w-3 h-3" /> {t('profile.trialActive')}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    trial.daysRemaining <= 3 ? 'bg-amber-400' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(100, (trial.daysUsed / TRIAL_DAYS) * 100)}%` }}
                />
              </div>
              <p className="text-2xs text-gray-400">
                {t('profile.trialRemaining').replace('{n}', String(trial.daysRemaining))}
              </p>
              <DSMButton variant="gradientAmber" size="sm" fullWidth icon={Crown} onClick={() => navigate('/subscription')}>
                {t('profile.premiumUpgrade')}
              </DSMButton>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('profile.status')}</span>
                <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {t('profile.trialExpired')}
                </span>
              </div>
              <p className="text-xs text-gray-500">{t('profile.limitedAccessDesc')}</p>
              <DSMButton variant="gradientAmber" size="sm" fullWidth icon={Crown} onClick={() => navigate('/subscription')}>
                {t('profile.premiumUpgrade')}
              </DSMButton>
            </>
          )}
        </div>
      </DSMCard>
    </>
  );
}

// ─── Inline Edit Stat ───────────────────────────────────────────────
/** Tap-to-edit stat tile. `prominent` renders a larger tile for weight. */
function InlineEditStat({ label, value, unit, type = "text", prominent, onSave }: {
  label: string; value: number; unit?: string; type?: string; prominent?: boolean;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync draft when value changes externally
  React.useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);

  // Auto-focus input on edit start
  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== String(value)) {
      onSave(trimmed);
      if (navigator.vibrate) navigator.vibrate(10);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(String(value));
    setEditing(false);
  };

  const displayValue = value === 0 ? '–' : String(value);

  if (editing) {
    return (
      <div className={`bg-white rounded-xl text-center border-2 border-blue-400 shadow-sm ${
        prominent ? 'px-4 py-4' : 'px-2 py-2.5'
      }`}>
        <div className="flex items-center justify-center gap-1.5">
          <input
            ref={inputRef}
            type={type}
            inputMode={type === "number" ? "decimal" : "text"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') cancel();
            }}
            onBlur={commit}
            className={`text-center bg-transparent outline-none text-gray-900 ${
              prominent ? 'w-24' : 'w-16'
            }`}
            style={{ fontSize: prominent ? '1.75rem' : '1.125rem', fontWeight: 700 }}
          />
          {unit && (
            <span className={`text-gray-400 ${prominent ? 'text-sm' : 'text-2xs'}`} style={{ fontWeight: 500 }}>
              {unit}
            </span>
          )}
        </div>
        <div className={`text-gray-500 mt-0.5 ${prominent ? 'text-xs' : 'text-2xs'}`}>{label}</div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`w-full bg-gray-50 rounded-xl text-center border border-gray-100 transition-all hover:border-blue-300 hover:bg-blue-50/30 active:scale-[0.97] cursor-pointer ${
        prominent ? 'px-4 py-4' : 'px-2 py-3'
      }`}
      aria-label={`${label}: ${displayValue} ${unit || ''}`}
    >
      <div className={`text-gray-900 ${prominent ? '' : ''}`}
        style={{ fontSize: prominent ? '1.75rem' : '1.125rem', fontWeight: 700 }}
      >
        {displayValue}
        {displayValue !== '–' && unit && (
          <span className={`text-gray-500 ml-1 ${prominent ? 'text-sm' : 'text-2xs'}`} style={{ fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>
      <div className={`text-gray-500 mt-0.5 ${prominent ? 'text-xs' : 'text-2xs'}`}>{label}</div>
    </button>
  );
}

// ─── Metabolic Age Tile ─────────────────────────────────────────────
/** Shows metabolic age with color-coded comparison to real age.
 *  Green = metabolic ≤ real (good), Orange = metabolic > real by ≤5, Red = metabolic > real by >5 */
function MetabolicAgeTile({ realAge, metabolicAge, onSave }: {
  realAge: number; metabolicAge: number; onSave: (v: string) => void;
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(metabolicAge));
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { if (!editing) setDraft(String(metabolicAge)); }, [metabolicAge, editing]);
  React.useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== String(metabolicAge)) {
      onSave(trimmed);
      if (navigator.vibrate) navigator.vibrate(10);
    }
    setEditing(false);
  };

  const cancel = () => { setDraft(String(metabolicAge)); setEditing(false); };

  // Color logic
  const diff = metabolicAge - realAge;
  const getColor = () => {
    if (metabolicAge === 0 || realAge === 0) return { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-900', label: 'text-gray-500', indicator: '' };
    if (diff <= 0) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'text-green-600', indicator: diff < 0 ? t('profileExtra.metabolicYounger').replace('{n}', String(Math.abs(diff))) : t('profileExtra.metabolicMatch') };
    if (diff <= 5) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'text-amber-600', indicator: t('profileExtra.metabolicOlder').replace('{n}', String(diff)) };
    return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'text-red-600', indicator: t('profileExtra.metabolicOlder').replace('{n}', String(diff)) + '!' };
  };

  const color = getColor();
  const displayValue = metabolicAge === 0 ? '–' : String(metabolicAge);

  if (editing) {
    return (
      <div className="bg-white rounded-xl text-center border-2 border-blue-400 shadow-sm px-2 py-2.5">
        <div className="flex items-center justify-center gap-1.5">
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
            onBlur={commit}
            className="w-16 text-center bg-transparent outline-none text-gray-900"
            style={{ fontSize: '1.125rem', fontWeight: 700 }}
          />
          <span className="text-2xs text-gray-400" style={{ fontWeight: 500 }}>{t('profileExtra.yearUnit')}</span>
        </div>
        <div className="text-2xs text-gray-500 mt-0.5">{t('profileExtra.metabolicAgeLabel')}</div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`w-full ${color.bg} rounded-xl text-center border ${color.border} transition-all hover:opacity-90 active:scale-[0.97] cursor-pointer px-2 py-3`}
      aria-label={t('profileExtra.editStat').replace('{label}', t('profileExtra.metabolicAgeLabel')).replace('{value}', displayValue).replace('{unit}', t('profileExtra.yearUnit'))}
    >
      <div className={`${color.text}`} style={{ fontSize: '1.125rem', fontWeight: 700 }}>
        {displayValue}
        {displayValue !== '–' && (
          <span className={`${color.label} ml-1 text-2xs`} style={{ fontWeight: 500 }}>{t('profileExtra.yearUnit')}</span>
        )}
      </div>
      <div className="text-2xs text-gray-500 mt-0.5">{t('profileExtra.metabolicAgeLabel')}</div>
      {color.indicator && metabolicAge > 0 && (
        <div className={`text-[9px] ${color.label} mt-0.5`} style={{ fontWeight: 600 }}>{color.indicator}</div>
      )}
    </button>
  );
}