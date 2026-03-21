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
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { formatHuf, formatUsd, SUBSCRIPTION_PRICE_USD, SUBSCRIPTION_PRICE_HUF } from "../../../utils/currencyConverter";
import { DSMCard, DSMSectionTitle, DSMButton } from "../../../components/dsm";
import { PageHeader } from "../../../components/PageHeader";
import { DSMBottomSheet } from "../../../components/dsm/ux-patterns";
import { useCalorieTracker } from "../../../hooks/useCalorieTracker";
import { getTrialInfo, TRIAL_DAYS } from "../../../components/onboarding/SubscriptionScreen";
import { DataUploadSheet } from "../../../components/DataUploadSheet";
import { BodyCompositionUploadSheet } from "../../../components/BodyCompositionUploadSheet";
import { useAppData } from "../../../hooks/useAppData";
import { performFullReset } from "../../../backend/services/ResetService";
import { useStagingManager } from "../../../hooks/useStagingManager";
import { useLanguage, LanguageCode } from "../../../contexts/LanguageContext";
import { changeEmail, changePassword, sendPasswordResetEmail } from "../../../services/authService";
import { getUserProfile, saveUserProfile, getMealSettings } from "../../../backend/services/UserProfileService";
import { getSetting, setSetting } from "../../../backend/services/SettingsService";
import { SleepSetup } from "../../sleep/components/SleepSetup";
import { SleepService } from "../../../backend/services/SleepService";
import { showToast } from "../../../shared/components/Toast";
import SettingsSheet from "./SettingsSheet";

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
  const location = useLocation();
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBodyCompUploadOpen, setIsBodyCompUploadOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetFinal, setShowResetFinal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const appData = useAppData();

  // ─── Avatar card + Daily Goals card state ───────────────────
  const [personalExpanded, setPersonalExpanded] = useState(false);
  // Sleep state for Daily Goals card
  const [sleepSheetOpen, setSleepSheetOpen] = useState(false);
  const [wakeTime, setWakeTime] = useState("07:00");
  const [selectedBedtime, setSelectedBedtime] = useState("");
  const [selectedCycles, setSelectedCycles] = useState(6);
  const [bedtimeOptions, setBedtimeOptions] = useState<ReturnType<typeof SleepService.getBedtimeOptions>>([]);
  // Goals sheet state
  const [calorieSheetOpen, setCalorieSheetOpen] = useState(false);
  const [waterSheetOpen, setWaterSheetOpen] = useState(false);
  const [sportSheetOpen, setSportSheetOpen] = useState(false);

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

  // ─── Sleep state loader for Daily Goals card ─────────────────
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

      {/* SETTINGS BOTTOM SHEET */}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        appData={appData}
        onUploadOpen={() => setIsUploadOpen(true)}
        onBodyCompOpen={() => setIsBodyCompUploadOpen(true)}
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

      {/* CALORIE BOTTOM SHEET */}
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
        />
      </DSMBottomSheet>

      {/* WATER BOTTOM SHEET */}
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
        />
      </DSMBottomSheet>

      {/* SPORT BOTTOM SHEET */}
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
        />
      </DSMBottomSheet>

      {/* HEADER */}
      <PageHeader
        title={t('nav.profile') || 'Profilom'}
        subtitle={profile.name ? `Üdv, ${profile.name}!` : undefined}
        stats={[
          {
            label: t('menu.remaining') || 'Maradék kcal',
            value: Math.max(0, targetCalories - consumed + workoutCalories),
            suffix: 'kcal',
          },
          {
            label: t('profile.tabSettings') || 'Beállítások',
            value: <Settings className="w-4 h-4 text-white" />,
            isAction: true,
            onClick: () => setSettingsOpen(true),
          },
        ]}
      />

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
        {/* Me tab content — Personal data, Body metrics, Weight chart, Activity */}
        {/* Card 1: Avatar */}
        <DSMCard>
          <div className="flex items-center gap-3">
            {/* Avatar circle */}
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-bold"
              style={{ background: profile.avatar ? undefined : 'linear-gradient(135deg, #2d8c6e, #4aab8a)' }}
              aria-label={t('profile.editAvatar') || 'Avatar'}
            >
              {profile.avatar
                ? <img src={profile.avatar} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
                : (profile.name?.[0] ?? '?').toUpperCase()
              }
            </button>

            {/* Name + subtitle */}
            <div className="flex-1 min-w-0">
              <EditableFieldRow
                label=""
                value={profile.name}
                type="text"
                onSave={(name) => {
                  setProfile((p) => ({ ...p, name }));
                  saveUserProfile({ name }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); });
                }}
              />
              <button
                onClick={() => setPersonalExpanded((v) => !v)}
                className="text-xs text-gray-400 mt-0.5 text-left hover:text-gray-600 transition-colors"
              >
                {[
                  profile.age ? `${profile.age} ${t('profile.yearShort') || 'év'}` : null,
                  profile.gender ? t(`profile.gender${profile.gender === 'male' ? 'Male' : profile.gender === 'female' ? 'Female' : 'Other'}`) : null,
                  profile.height ? `${profile.height} cm` : null,
                ].filter(Boolean).join(' · ') || t('profile.addPersonalData') || 'Személyes adatok'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <InlineEditStat label={t('profile.bodyFat')} value={profile.bodyFat ?? 0} unit="%" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, bodyFat: n })); saveUserProfile({ bodyFat: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
                <InlineEditStat label={t('profile.muscleMass')} value={profile.muscleMass ?? 0} unit="kg" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, muscleMass: n })); saveUserProfile({ muscleMass: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
                <InlineEditStat label={t('profile.metabolicAge')} value={profile.metabolicAge ?? 0} unit={t('profileExtra.yearUnit')} type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, metabolicAge: n })); saveUserProfile({ metabolicAge: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
                <InlineEditStat label={t('profile.bmr')} value={profile.bmr ?? 0} unit="kcal" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, bmr: n })); saveUserProfile({ bmr: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
                <InlineEditStat label={t('profile.visceralFat')} value={profile.visceralFat ?? 0} unit="" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, visceralFat: n })); saveUserProfile({ visceralFat: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
                <InlineEditStat label={t('profile.boneMass')} value={profile.boneMass ?? 0} unit="kg" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, boneMass: n })); saveUserProfile({ boneMass: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
                <InlineEditStat label={t('profile.waterPercent')} value={profile.waterPercent ?? 0} unit="%" type="number" onSave={(v) => { const n = Number(v); setProfile((p) => ({ ...p, waterPercent: n })); saveUserProfile({ waterPercent: n }).then(() => { window.dispatchEvent(new Event('profileUpdated')); showToast(t('toast.saved')); }); }} />
              </div>
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
              <Activity className="w-4 h-4 text-teal-600" />
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
              <Pencil className={`w-3.5 h-3.5 ${isGoalEditing ? 'text-teal-500' : 'text-gray-400'}`} />
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
                <Line type="monotone" dataKey="weight" stroke="#0d9488" strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy, index, payload } = props;
                    if (payload.weight == null) return <circle key={`dot-${index}`} r={0} cx={cx} cy={cy} />;
                    // "Most" = the isNow point (current position on timeline)
                    if (payload.isNow) {
                      return (
                        <g key={`dot-${index}`}>
                          {/* Outer pulse ring */}
                          <circle cx={cx} cy={cy} r={10} fill="#0d9488" opacity={0.12} />
                          {/* White border ring */}
                          <circle cx={cx} cy={cy} r={6.5} fill="#0d9488" stroke="#fff" strokeWidth={3} />
                        </g>
                      );
                    }
                    return (
                      <circle
                        key={`dot-${index}`}
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill="#0d9488"
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                  activeDot={{ r: 5, fill: '#0d9488', stroke: '#fff', strokeWidth: 2 }}
                  connectNulls />
              </LineChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-2 pb-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-[2.5px] bg-teal-600 rounded-full" />
                <span className="text-[9px] text-gray-500" style={{ fontWeight: 500 }}>{t('profile.measured')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-[2px] rounded-full" style={{ background: 'repeating-linear-gradient(90deg, #9ca3af 0px, #9ca3af 3px, transparent 3px, transparent 5.5px)' }} />
                <span className="text-[9px] text-gray-500" style={{ fontWeight: 500 }}>{t('profile.predicted')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-teal-600 border-2 border-white shadow-sm" />
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
                    : 'bg-teal-50/60 border-teal-200/60'
              }`}>
                <div className="flex items-center gap-2">
                  {Math.abs(deviation) <= 0.5 ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : deviation > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-teal-600" />
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
            <div className="mt-3 p-3 bg-teal-50/50 rounded-xl border border-teal-200/50">
              <div className="flex items-center gap-2 mb-2.5">
                <Target className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-[11px] text-gray-700" style={{ fontWeight: 600 }}>{t('profile.goal')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-2xs text-gray-500 mb-1 block">{t('profile.targetWeight')}</label>
                  <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-2 py-1.5">
                    <Target className="w-3 h-3 text-teal-400 flex-shrink-0" />
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
                    <Calendar className="w-3 h-3 text-teal-400 flex-shrink-0" />
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
                className="mt-2.5 w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs transition-colors"
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
          className="mt-0.5 w-full text-base font-semibold border-none border-b-2 border-teal-500 outline-none bg-transparent py-0.5 text-gray-900"
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
    { end: 18.5 / maxBmi * 100, color: '#0d9488' },
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
            className="w-32 text-center text-2xl font-semibold text-gray-900 bg-transparent border-b-2 border-gray-200 focus:outline-none focus:border-teal-500 py-1"
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
              className="flex-1 text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-gray-200 focus:outline-none focus:border-teal-500 py-1"
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

/** Theme toggle card */
function ThemeToggleCard() {
  const { t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

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
            isDark ? 'bg-teal-500' : 'bg-gray-300'
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
        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
          <Globe className="w-4.5 h-4.5 text-teal-500" />
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
                  ? 'border-teal-500 bg-teal-50 shadow-sm'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200 active:bg-gray-100'
              }`}
            >
              <span className="text-2xl leading-none pointer-events-none">{lang.flag}</span>
              <span
                className={`text-xs pointer-events-none ${isActive ? 'text-teal-700' : 'text-gray-600'}`}
                style={{ fontWeight: isActive ? 700 : 500 }}
              >
                {lang.name}
              </span>
              {isActive && (
                <div className="absolute top-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-teal-500 flex items-center justify-center pointer-events-none">
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