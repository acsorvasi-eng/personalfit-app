import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { AvatarEditor } from './AvatarEditor';
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { formatHuf, formatUsd, SUBSCRIPTION_PRICE_USD, SUBSCRIPTION_PRICE_HUF } from "../utils/currencyConverter";
import { ProfileHeader } from "./ProfileHeader";
import { DSMCard, DSMSectionTitle, DSMButton } from "./dsm";
import { DSMProfileTabs } from "./dsm/ProfileTabs";
import { useCalorieTracker } from "../hooks/useCalorieTracker";
import { getTrialInfo, TRIAL_DAYS } from "./onboarding/SubscriptionScreen";
import { DataUploadSheet } from "./DataUploadSheet";
import { BodyCompositionUploadSheet } from "./BodyCompositionUploadSheet";
import { useAppData } from "../hooks/useAppData";
import { performFullReset } from "../backend/services/ResetService";
import { useStagingManager } from "../hooks/useStagingManager";
import { useLanguage, LanguageCode } from "../contexts/LanguageContext";
import { changeEmail, changePassword, sendPasswordResetEmail } from "../services/authService";

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
  const [profile, setProfile] = useState<ProfileData>(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) return JSON.parse(saved);
    return {
      name: "", age: 0, metabolicAge: 0, weight: 0, height: 0,
      bloodPressure: "", activityLevel: "", goal: "",
      allergies: "", dietaryPreferences: "", avatar: ""
    };
  });

  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(() => {
    const saved = localStorage.getItem('weightHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // ─── Weight Goal ────────────────────────────────────────────────
  const [weightGoal, setWeightGoal] = useState<WeightGoal>(() => {
    const saved = localStorage.getItem('weightGoal');
    return saved ? JSON.parse(saved) : { targetKg: 0, months: 0, startDate: '', startWeight: 0 };
  });
  const [isGoalEditing, setIsGoalEditing] = useState(false);
  const [goalDraftKg, setGoalDraftKg] = useState('');
  const [goalDraftMonths, setGoalDraftMonths] = useState('');

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
    localStorage.setItem('weightHistory', JSON.stringify(newHistory));

    // Also update profile.weight
    const updatedProfile = { ...profile, weight: kg };
    setProfile(updatedProfile);
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    window.dispatchEvent(new Event('profileUpdated'));

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
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
      } catch { /* ignore parse errors */ }
    }
    const wh = localStorage.getItem('weightHistory');
    if (wh) {
      try { setWeightHistory(JSON.parse(wh)); } catch { /* ignore */ }
    }
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
  const bmi = profile.height > 0 ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1) : '0';

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
  const workoutData = localStorage.getItem('workoutTracking');
  let workoutCalories = 0;
  if (workoutData) {
    const data = JSON.parse(workoutData);
    if (data[today]) workoutCalories = data[today].totalCalories || 0;
  }

  const targetCalories = profile.goal === "Fogyás" ? dailyCalories - 500 :
    profile.goal === "Súlygyarapodás" ? dailyCalories + 500 : dailyCalories;

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
    localStorage.setItem('userProfile', JSON.stringify(updated));
    window.dispatchEvent(new Event('profileUpdated'));
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
          // Re-read profile from localStorage after upload
          const saved = localStorage.getItem('userProfile');
          if (saved) {
            const parsed = JSON.parse(saved);
            setProfile(parsed);
          }
          const wh = localStorage.getItem('weightHistory');
          if (wh) setWeightHistory(JSON.parse(wh));
        }}
      />

      {/* BODY COMPOSITION UPLOAD SHEET */}
      <BodyCompositionUploadSheet
        open={isBodyCompUploadOpen}
        onClose={() => setIsBodyCompUploadOpen(false)}
        onComplete={() => {
          appData.refresh();
          // Re-read profile from localStorage after body comp upload
          const saved = localStorage.getItem('userProfile');
          if (saved) {
            const parsed = JSON.parse(saved);
            setProfile(parsed);
          }
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
          onNavigateBodyVision={() => navigate('/body-vision')}
          onNameSave={(name) => {
            const updated = { ...profile, name };
            setProfile(updated);
            localStorage.setItem('userProfile', JSON.stringify(updated));
            window.dispatchEvent(new Event('profileUpdated'));
          }}
          onAgeSave={(age) => {
            const updated = { ...profile, age };
            setProfile(updated);
            localStorage.setItem('userProfile', JSON.stringify(updated));
            window.dispatchEvent(new Event('profileUpdated'));
          }}
          onAvatarClick={() => avatarInputRef.current?.click()}
        />
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-6 py-4 space-y-4">

        <DSMProfileTabs tabs={[
          { id: "data", label: t('profile.personalData'), icon: "📊" },
          { id: "settings", label: t('profile.dailyGoals'), icon: "⚙️" },
        ]} defaultTab="data" ariaLabel={t('ui.profileSections')}>
          {(activeTab) => (
            <div className="space-y-4">
              {/* DATA TAB */}
              {activeTab === "data" && (
                <>
        {/* Személyes adatok */}
        <DSMCard>
          <DSMSectionTitle icon={User} iconColor="text-blue-600" title={t('profile.personalData')} className="mb-3" />

            <div className="space-y-3">
              {/* Weight — prominent, on top */}
              <InlineEditStat
                label={t('profile.weight')}
                value={profile.weight}
                unit="kg"
                type="number"
                prominent
                onSave={(v) => {
                  const numVal = Number(v);
                  if (numVal !== profile.weight && numVal > 0) {
                    logWeight(numVal);
                  }
                }}
              />

              {/* 4 smaller stats in a 2x2 grid */}
              <div className="grid grid-cols-2 gap-2">
                <InlineEditStat
                  label={t('profile.height')}
                  value={profile.height}
                  unit="cm"
                  type="number"
                  onSave={(v) => {
                    const updated = { ...profile, height: Number(v) };
                    setProfile(updated);
                    localStorage.setItem('userProfile', JSON.stringify(updated));
                    window.dispatchEvent(new Event('profileUpdated'));
                  }}
                />
                <div className="bg-gray-50 dark:bg-[#252525] rounded-xl px-2 py-3 text-center border border-gray-100 dark:border-[#2a2a2a]">
                  <div className="text-lg text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>
                    {bmi === '0' ? '–' : bmi}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">BMI</div>
                </div>
                <InlineEditStat
                  label={t('profile.realAge')}
                  value={profile.age}
                  unit={t('profileExtra.yearUnit')}
                  type="number"
                  onSave={(v) => {
                    const updated = { ...profile, age: Number(v) };
                    setProfile(updated);
                    localStorage.setItem('userProfile', JSON.stringify(updated));
                    window.dispatchEvent(new Event('profileUpdated'));
                  }}
                />
                <MetabolicAgeTile
                  realAge={profile.age}
                  metabolicAge={profile.metabolicAge || 0}
                  onSave={(v) => {
                    const updated = { ...profile, metabolicAge: Number(v) };
                    setProfile(updated);
                    localStorage.setItem('userProfile', JSON.stringify(updated));
                    window.dispatchEvent(new Event('profileUpdated'));
                  }}
                />
              </div>
            </div>

          {/* ── Súly haladás ── */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-gray-700 dark:text-gray-300" style={{ fontWeight: 600 }}>{t('profile.weightProgress')}</span>
            </div>
            <button
              onClick={() => {
                if (!isGoalEditing) {
                  setGoalDraftKg(weightGoal.targetKg > 0 ? String(weightGoal.targetKg) : '');
                  setGoalDraftMonths(weightGoal.months > 0 ? String(weightGoal.months) : '');
                }
                setIsGoalEditing(!isGoalEditing);
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
              aria-label={t('profile.editGoal')}
            >
              <Pencil className={`w-3.5 h-3.5 ${isGoalEditing ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} />
            </button>
          </div>

          {/* Chart */}
          <div className="bg-gray-50 dark:bg-[#252525] rounded-xl p-2.5 border border-gray-100 dark:border-[#2a2a2a]" role="img" aria-label={t('profile.weightChartAria').replace('{weight}', String(profile.weight))}>
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
                <span className="text-[9px] text-gray-500 dark:text-gray-400" style={{ fontWeight: 500 }}>{t('profile.measured')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-[2px] rounded-full" style={{ background: 'repeating-linear-gradient(90deg, #9ca3af 0px, #9ca3af 3px, transparent 3px, transparent 5.5px)' }} />
                <span className="text-[9px] text-gray-500 dark:text-gray-400" style={{ fontWeight: 500 }}>{t('profile.predicted')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
                <span className="text-[9px] text-gray-500 dark:text-gray-400" style={{ fontWeight: 500 }}>{t('profile.now')}</span>
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
                  ? 'bg-green-50/60 dark:bg-green-500/5 border-green-200/60 dark:border-green-500/15'
                  : deviation > 0
                    ? 'bg-amber-50/60 dark:bg-amber-500/5 border-amber-200/60 dark:border-amber-500/15'
                    : 'bg-blue-50/60 dark:bg-blue-500/5 border-blue-200/60 dark:border-blue-500/15'
              }`}>
                <div className="flex items-center gap-2">
                  {Math.abs(deviation) <= 0.5 ? (
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  ) : deviation > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                  <span className="text-[11px] text-gray-700 dark:text-gray-300" style={{ fontWeight: 500 }}>
                    {Math.abs(deviation) <= 0.5
                      ? t('profile.onPlan')
                      : deviation > 0
                        ? `+${deviation} ${t('profile.abovePlan')}`
                        : `${deviation} ${t('profile.belowPlan')}`
                    }
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  {t('profile.planLabel')}: {expectedNow?.toFixed(1)} kg
                </div>
              </div>
            );
          })()}

          {/* Goal editing fields — only visible when pencil is active */}
          {isGoalEditing && (
            <div className="mt-3 p-3 bg-blue-50/50 dark:bg-blue-500/5 rounded-xl border border-blue-200/50 dark:border-blue-500/20">
              <div className="flex items-center gap-2 mb-2.5">
                <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[11px] text-gray-700 dark:text-gray-300" style={{ fontWeight: 600 }}>{t('profile.goal')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block">{t('profile.targetWeight')}</label>
                  <div className="flex items-center gap-1 bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-[#2a2a2a] px-2 py-1.5">
                    <Target className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={`${t('common.eg')} 84`}
                      value={goalDraftKg}
                      onChange={(e) => setGoalDraftKg(e.target.value)}
                      className="w-full bg-transparent outline-none text-xs text-gray-900 dark:text-gray-100"
                    />
                    <span className="text-[10px] text-gray-400 flex-shrink-0">kg</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block">{t('profile.timeframe')}</label>
                  <div className="flex items-center gap-1 bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-[#2a2a2a] px-2 py-1.5">
                    <Calendar className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder={`${t('common.eg')} 12`}
                      value={goalDraftMonths}
                      onChange={(e) => setGoalDraftMonths(e.target.value)}
                      className="w-full bg-transparent outline-none text-xs text-gray-900 dark:text-gray-100"
                    />
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{t('profile.month')}</span>
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
                  localStorage.setItem('weightGoal', JSON.stringify(newGoal));
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
            <div className="mt-2.5 flex items-center justify-between px-2 py-1.5 bg-blue-50/50 dark:bg-blue-500/5 rounded-lg">
              <div className="flex items-center gap-1.5">
                <Target className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] text-gray-600 dark:text-gray-400">
                  {t('profile.goalLabel')}: <span style={{ fontWeight: 600 }}>{weightGoal.targetKg} kg</span>
                </span>
              </div>
              {weightGoal.months > 0 && (
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {weightGoal.months} {t('profile.monthsIn')}
                </span>
              )}
            </div>
          )}
        </div>
        </DSMCard>
                </>
              )}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <>
        {/* ★ UPLOAD MY PLAN — Primary entry point ★ */}
        <DSMCard className={`border-2 ${appData.hasData ? 'border-blue-200 dark:border-blue-500/20' : 'border-dashed border-blue-300 dark:border-blue-500/30'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              appData.hasData
                ? 'bg-blue-100 dark:bg-blue-500/20'
                : 'bg-gradient-to-br from-blue-400 to-teal-500 shadow-md'
            }`}>
              {appData.hasData
                ? <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                : <Upload className="w-5 h-5 text-white" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>
                {t('profile.uploadPlan')}
              </div>
              {appData.hasData ? (
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                  {appData.activePlanLabel || t('profile.activePlanLoaded')} · v{appData.planCount}
                </p>
              ) : (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('profile.uploadFormats')}
                </p>
              )}
            </div>
            <DSMButton
              variant={appData.hasData ? "secondary" : "gradient"}
              size="sm"
              icon={Upload}
              onClick={() => setIsUploadOpen(true)}
            >
              {appData.hasData ? t('profile.newPlan') : t('profile.upload')}
            </DSMButton>
          </div>
          {!appData.hasData && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200/50 dark:border-amber-500/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                {t('profile.uploadAiHint')}
              </p>
            </div>
          )}
        </DSMCard>

        {/* ★ STAGING / PUBLISH — Shown when staged data exists ★ */}
        {staging.hasStagedPlan && staging.info && (
          <DSMCard className="border-2 border-amber-300 dark:border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-500/5 dark:to-[#1E1E1E]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>
                  {t('profile.publishData')}
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                  {t('profile.stagingState')} · {staging.info.label}
                </p>
              </div>
              <DSMButton
                variant="gradient"
                size="sm"
                icon={Zap}
                loading={staging.isPublishing}
                onClick={async () => {
                  const success = await staging.publish();
                  if (success) {
                    appData.refresh();
                    reReadProfile();
                  }
                }}
              >
                {t('profile.publish')}
              </DSMButton>
            </div>
            <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200/50 dark:border-amber-500/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                {t('profile.publishHint')}
              </p>
            </div>
          </DSMCard>
        )}

        {/* Published success indicator */}
        {staging.hasPublishedPlan && staging.info && (
          <DSMCard className="border border-blue-200 dark:border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>
                  {t('profile.planPublished')}
                </div>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                  {staging.info.label} · {t('profile.active')}
                </p>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full font-medium">
                {t('profile.active')}
              </span>
            </div>
          </DSMCard>
        )}

        {/* ★ BODY COMPOSITION / GMON — Optional upload ★ */}
        <DSMCard className="border border-purple-200/50 dark:border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              appData.hasMeasurements
                ? 'bg-purple-100 dark:bg-purple-500/20'
                : 'bg-gradient-to-br from-purple-400 to-indigo-500 shadow-md'
            }`}>
              {appData.hasMeasurements
                ? <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                : <Scan className="w-5 h-5 text-white" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>
                {t('profile.bodyComposition')}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {appData.hasMeasurements
                  ? t('profile.measurementsImported')
                  : t('profile.optionalUpload')
                }
              </p>
            </div>
            <DSMButton
              variant={appData.hasMeasurements ? "secondary" : "outline"}
              size="sm"
              icon={Scan}
              onClick={() => setIsBodyCompUploadOpen(true)}
            >
              {appData.hasMeasurements ? t('profile.newReport') : t('profile.upload')}
            </DSMButton>
          </div>
          <div className="mt-2.5 flex items-start gap-2 px-3 py-2 bg-purple-50/50 dark:bg-purple-500/5 rounded-xl">
            <Info className="w-3.5 h-3.5 text-purple-400 dark:text-purple-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-purple-600 dark:text-purple-400 leading-relaxed">
              {t('profile.bodyCompHint')}
            </p>
          </div>
        </DSMCard>

        {/* ★ DATA RESET ★ */}
        <DSMCard>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>
                {t('profile.deleteData')}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {t('profile.deleteDataDesc')}
              </p>
            </div>
            <DSMButton
              variant="destructive"
              size="sm"
              icon={Trash2}
              onClick={() => setShowResetConfirm(true)}
            >
              {t('profile.deleteBtn')}
            </DSMButton>
          </div>
          {showResetConfirm && !showResetFinal && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-800 dark:text-red-300" style={{ fontWeight: 600 }}>{t('ui.confirm')}?</span>
              </div>
              <p className="text-[11px] text-red-600 dark:text-red-400 mb-3">
                {t('profile.deleteWarning')}
              </p>
              <div className="flex gap-2">
                <DSMButton variant="outline" size="sm" fullWidth onClick={() => setShowResetConfirm(false)}>{t('ui.cancel')}</DSMButton>
                <DSMButton variant="destructive" size="sm" fullWidth icon={AlertTriangle} onClick={() => setShowResetFinal(true)}>{t('ui.confirm')}</DSMButton>
              </div>
            </div>
          )}
          {showResetFinal && (
            <div className="mt-3 p-3 bg-red-100 dark:bg-red-500/20 border-2 border-red-300 dark:border-red-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-900 dark:text-red-200" style={{ fontWeight: 700 }}>{t('profile.finalConfirmation')}</span>
              </div>
              <p className="text-[11px] text-red-700 dark:text-red-300 mb-3">
                {t('profile.finalDeleteWarning')}
              </p>
              <div className="flex gap-2">
                <DSMButton variant="outline" size="sm" fullWidth onClick={() => { setShowResetFinal(false); setShowResetConfirm(false); }}>{t('ui.cancel')}</DSMButton>
                <DSMButton
                  variant="destructive"
                  size="sm"
                  fullWidth
                  icon={Trash2}
                  loading={isResetting}
                  onClick={async () => {
                    setIsResetting(true);
                    if (navigator.vibrate) navigator.vibrate([15, 30, 50]);
                    const result = await performFullReset({ clearTheme: false, reseed: true });
                    setIsResetting(false);
                    if (result.success) {
                      setShowResetFinal(false);
                      setShowResetConfirm(false);
                      appData.refresh();
                    }
                  }}
                >
                  {t('profile.irreversibleDelete')}
                </DSMButton>
              </div>
            </div>
          )}
        </DSMCard>

        {/* Subscription */}
        <SubscriptionManagement />

        {/* Theme Toggle */}
        <ThemeToggleCard />

        {/* Language Selector */}
        <LanguageSelectorCard />

        {/* Navigation Links */}
        <DSMCard>
          <DSMSectionTitle icon={Settings} iconColor="text-gray-500 dark:text-gray-400" title={t('profile.others')} className="mb-3" />
          <div className="space-y-0.5">
            <SettingsLink icon={HelpCircle} iconColor="text-emerald-500" label={t('profile.faq')} onClick={() => navigate('/faq')} />
            <SettingsLink icon={Info} iconColor="text-blue-500" label={t('profile.aboutUs')} onClick={() => navigate('/about')} />
            <SettingsLink icon={Mail} iconColor="text-purple-500" label={t('profile.contact')} onClick={() => navigate('/contact')} />
          </div>
        </DSMCard>

        {/* Account & Logout */}
        <AccountSettingsCard onLogout={() => { logout(); navigate('/splash'); }} />
                </>
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
        <div className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-[#252525] rounded-xl mb-3">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-900 dark:text-gray-100 truncate">{user.email}</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500">
              {user.provider === 'email' ? t('profile.account.emailAccount') : user.provider === 'demo' ? 'Demo (offline)' : t('profile.googleAccount')}
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 p-2.5 mb-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
          <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <span className="text-xs text-green-700 dark:text-green-300">{success}</span>
        </div>
      )}

      {/* Action buttons — only for email provider */}
      {isEmailProvider && editMode === null && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setEditMode('email'); setError(null); setSuccess(null); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/15 border border-blue-200/60 dark:border-blue-500/20 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-blue-700 dark:text-blue-300" style={{ fontWeight: 600 }}>
              {t('profile.account.changeEmail')}
            </span>
          </button>
          <button
            onClick={() => { setEditMode('password'); setError(null); setSuccess(null); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/15 border border-purple-200/60 dark:border-purple-500/20 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs text-purple-700 dark:text-purple-300" style={{ fontWeight: 600 }}>
              {t('profile.account.changePassword')}
            </span>
          </button>
        </div>
      )}

      {/* ── Email Change Form ───────────────────────── */}
      {editMode === 'email' && (
        <form onSubmit={handleChangeEmail} className="mb-3 p-3 bg-blue-50/50 dark:bg-blue-500/5 rounded-xl border border-blue-200/50 dark:border-blue-500/20 space-y-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-gray-700 dark:text-gray-300" style={{ fontWeight: 600 }}>
              {t('profile.account.changeEmail')}
            </span>
          </div>

          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder={t('profile.account.newEmailPlaceholder')}
            required
            className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />

          <div className="relative">
            <input
              type={showEmailPw ? 'text' : 'password'}
              value={emailCurrentPw}
              onChange={(e) => setEmailCurrentPw(e.target.value)}
              placeholder={t('profile.account.currentPasswordPlaceholder')}
              required
              className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
            <button type="button" onClick={() => setShowEmailPw(!showEmailPw)} tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {showEmailPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
              <span className="text-[11px] text-red-600 dark:text-red-400">{error}</span>
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
        <form onSubmit={handleChangePassword} className="mb-3 p-3 bg-purple-50/50 dark:bg-purple-500/5 rounded-xl border border-purple-200/50 dark:border-purple-500/20 space-y-2.5">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs text-gray-700 dark:text-gray-300" style={{ fontWeight: 600 }}>
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
              className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
            />
            <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
              className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
            />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
            className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
          />

          <p className="text-[10px] text-gray-400 dark:text-gray-500 pl-0.5">
            {t('profile.account.passwordHint')}
          </p>

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
              <span className="text-[11px] text-red-600 dark:text-red-400">{error}</span>
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
      <DSMButton variant="destructive" size="sm" fullWidth icon={LogOut} onClick={onLogout}>
        {t('profile.logout')}
      </DSMButton>
    </DSMCard>
  );
}

/** Theme toggle card */
function ThemeToggleCard() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

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
            <div className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>
              {isDark ? t('profile.darkMode') : t('profile.lightMode')}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              {isDark ? t('profile.darkModeDesc') : t('profile.lightModeDesc')}
            </p>
          </div>
        </div>
        <div
          className={`relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0 pointer-events-none ${
            isDark ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
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
        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
          <Globe className="w-4.5 h-4.5 text-blue-500 dark:text-blue-400" />
        </div>
        <div>
          <div className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>
            {t('profile.appLanguage')}
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
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
                if (navigator.vibrate) navigator.vibrate(10);
              }}
              className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-400 shadow-sm'
                  : 'border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#252525] hover:border-gray-200 dark:hover:border-[#3a3a3a] active:bg-gray-100 dark:active:bg-[#2a2a2a]'
              }`}
            >
              <span className="text-2xl leading-none pointer-events-none">{lang.flag}</span>
              <span
                className={`text-xs pointer-events-none ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}
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
      className="w-full flex items-center justify-between py-3 px-1 border-b border-gray-50 dark:border-[#2a2a2a] last:border-b-0 hover:bg-gray-50 dark:hover:bg-[#252525] rounded-lg transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
        <span className="text-sm text-gray-700 dark:text-gray-300" style={{ fontWeight: 500 }}>{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
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

  const trial = getTrialInfo();

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try { await cancelSubscription(); setShowCancelConfirm(false); } finally { setIsCancelling(false); }
  };

  return (
    <>
      <DSMCard padding="none">
        {/* Header */}
        <div className={`p-3.5 ${
          subscriptionActive
            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
            : !trial.isExpired
            ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
            : 'bg-gradient-to-r from-gray-400 to-gray-500'
        } rounded-t-2xl`}>
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
                <span className="text-[10px] font-bold text-white">{trial.daysRemaining} {t('common.day')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 space-y-2.5">
          {subscriptionActive && subscription ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('profile.status')}</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full font-medium">{t('profile.active')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('profile.nextPayment')}</span>
                <span className="text-xs text-gray-800 dark:text-gray-200">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('profile.fee')}</span>
                <span className="text-xs text-gray-800 dark:text-gray-200">{formatUsd(SUBSCRIPTION_PRICE_USD)}{t('common.perMonth')} (~{formatHuf(SUBSCRIPTION_PRICE_HUF)})</span>
              </div>
              {showCancelConfirm ? (
                <div className="p-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl mt-1">
                  <p className="text-xs text-red-800 dark:text-red-300 mb-2">{t('profile.confirmCancel')}</p>
                  <div className="flex gap-2">
                    <DSMButton variant="outline" size="sm" fullWidth onClick={() => setShowCancelConfirm(false)}>{t('ui.cancel')}</DSMButton>
                    <DSMButton variant="destructive" size="sm" fullWidth onClick={handleCancelSubscription} loading={isCancelling}>{t('ui.confirm')}</DSMButton>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCancelConfirm(true)} className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a2a2a] text-gray-400 rounded-xl text-xs hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors mt-1">
                  {t('profile.cancelSubscription')}
                </button>
              )}
            </>
          ) : !trial.isExpired ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('profile.status')}</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Gift className="w-3 h-3" /> {t('profile.trialActive')}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-[#252525] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    trial.daysRemaining <= 3 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, (trial.daysUsed / TRIAL_DAYS) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                {t('profile.trialRemaining').replace('{n}', String(trial.daysRemaining))}
              </p>
              <DSMButton variant="gradientAmber" size="sm" fullWidth icon={Crown} onClick={() => navigate('/subscription')}>
                {t('profile.premiumUpgrade')}
              </DSMButton>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('profile.status')}</span>
                <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {t('profile.trialExpired')}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.limitedAccessDesc')}</p>
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
      <div className={`bg-white dark:bg-[#1E1E1E] rounded-xl text-center border-2 border-blue-400 dark:border-blue-500 shadow-sm ${
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
            className={`text-center bg-transparent outline-none text-gray-900 dark:text-gray-100 ${
              prominent ? 'w-24' : 'w-16'
            }`}
            style={{ fontSize: prominent ? '1.75rem' : '1.125rem', fontWeight: 700 }}
          />
          {unit && (
            <span className={`text-gray-400 dark:text-gray-500 ${prominent ? 'text-sm' : 'text-[10px]'}`} style={{ fontWeight: 500 }}>
              {unit}
            </span>
          )}
        </div>
        <div className={`text-gray-500 dark:text-gray-400 mt-0.5 ${prominent ? 'text-xs' : 'text-[10px]'}`}>{label}</div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`w-full bg-gray-50 dark:bg-[#252525] rounded-xl text-center border border-gray-100 dark:border-[#2a2a2a] transition-all hover:border-blue-300 dark:hover:border-blue-500/30 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 active:scale-[0.97] cursor-pointer ${
        prominent ? 'px-4 py-4' : 'px-2 py-3'
      }`}
      aria-label={`${label}: ${displayValue} ${unit || ''}`}
    >
      <div className={`text-gray-900 dark:text-gray-100 ${prominent ? '' : ''}`}
        style={{ fontSize: prominent ? '1.75rem' : '1.125rem', fontWeight: 700 }}
      >
        {displayValue}
        {displayValue !== '–' && unit && (
          <span className={`text-gray-500 dark:text-gray-400 ml-1 ${prominent ? 'text-sm' : 'text-[10px]'}`} style={{ fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>
      <div className={`text-gray-500 dark:text-gray-400 mt-0.5 ${prominent ? 'text-xs' : 'text-[10px]'}`}>{label}</div>
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
    if (metabolicAge === 0 || realAge === 0) return { bg: 'bg-gray-50 dark:bg-[#252525]', border: 'border-gray-100 dark:border-[#2a2a2a]', text: 'text-gray-900 dark:text-gray-100', label: 'text-gray-500 dark:text-gray-400', indicator: '' };
    if (diff <= 0) return { bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-500/20', text: 'text-green-700 dark:text-green-400', label: 'text-green-600 dark:text-green-400', indicator: diff < 0 ? t('profileExtra.metabolicYounger').replace('{n}', String(Math.abs(diff))) : t('profileExtra.metabolicMatch') };
    if (diff <= 5) return { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20', text: 'text-amber-700 dark:text-amber-400', label: 'text-amber-600 dark:text-amber-400', indicator: t('profileExtra.metabolicOlder').replace('{n}', String(diff)) };
    return { bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20', text: 'text-red-700 dark:text-red-400', label: 'text-red-600 dark:text-red-400', indicator: t('profileExtra.metabolicOlder').replace('{n}', String(diff)) + '!' };
  };

  const color = getColor();
  const displayValue = metabolicAge === 0 ? '–' : String(metabolicAge);

  if (editing) {
    return (
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl text-center border-2 border-blue-400 dark:border-blue-500 shadow-sm px-2 py-2.5">
        <div className="flex items-center justify-center gap-1.5">
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
            onBlur={commit}
            className="w-16 text-center bg-transparent outline-none text-gray-900 dark:text-gray-100"
            style={{ fontSize: '1.125rem', fontWeight: 700 }}
          />
          <span className="text-[10px] text-gray-400 dark:text-gray-500" style={{ fontWeight: 500 }}>{t('profileExtra.yearUnit')}</span>
        </div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{t('profileExtra.metabolicAgeLabel')}</div>
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
          <span className={`${color.label} ml-1 text-[10px]`} style={{ fontWeight: 500 }}>{t('profileExtra.yearUnit')}</span>
        )}
      </div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{t('profileExtra.metabolicAgeLabel')}</div>
      {color.indicator && metabolicAge > 0 && (
        <div className={`text-[9px] ${color.label} mt-0.5`} style={{ fontWeight: 600 }}>{color.indicator}</div>
      )}
    </button>
  );
}