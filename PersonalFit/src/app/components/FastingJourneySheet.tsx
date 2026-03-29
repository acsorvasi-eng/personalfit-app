// PersonalFit/src/app/components/FastingJourneySheet.tsx
// Full-screen fasting journey overlay — 4-step wizard to configure fasting.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Church, Calendar, Check, X, Loader2 } from 'lucide-react';
import { hapticFeedback } from '@/lib/haptics';
import { apiBase, authFetch } from '@/lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import SharedPremiumLoader from './PremiumLoader';
import {
  type FastingSettings,
  type Religion,
  type RestrictionCategory,
  getFastingSettings,
  saveFastingSettings,
  getFastingPeriods,
  type FastingPeriod,
} from '../backend/services/FastingCalendarService';

// ─── Constants ───────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

type FastingType = 'orthodox' | 'catholic' | 'custom';

interface RestrictionDef {
  id: RestrictionCategory;
  emoji: string;
  labelKey: string;
  presets: Record<FastingType, boolean>;
}

const RESTRICTION_CATEGORIES: RestrictionDef[] = [
  { id: 'meat', emoji: '\u{1F969}', labelKey: 'fasting.journey.restrict.meat', presets: { orthodox: true, catholic: true, custom: false } },
  { id: 'dairy', emoji: '\u{1F9C0}', labelKey: 'fasting.journey.restrict.dairy', presets: { orthodox: true, catholic: false, custom: false } },
  { id: 'eggs', emoji: '\u{1F95A}', labelKey: 'fasting.journey.restrict.eggs', presets: { orthodox: true, catholic: false, custom: false } },
  { id: 'fish', emoji: '\u{1F41F}', labelKey: 'fasting.journey.restrict.fish', presets: { orthodox: false, catholic: false, custom: false } },
  { id: 'alcohol', emoji: '\u{1F377}', labelKey: 'fasting.journey.restrict.alcohol', presets: { orthodox: false, catholic: false, custom: false } },
  { id: 'sweets', emoji: '\u{1F36C}', labelKey: 'fasting.journey.restrict.sweets', presets: { orthodox: false, catholic: false, custom: false } },
];

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const PREVIEW_RECIPES = [
  { nameKey: 'fasting.journey.recipe1Name', kcal: 320, protein: 18 },
  { nameKey: 'fasting.journey.recipe2Name', kcal: 280, protein: 12 },
  { nameKey: 'fasting.journey.recipe3Name', kcal: 350, protein: 14 },
];

// ─── Slide animation variants ────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

// ─── Props ───────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (settings: FastingSettings) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export default function FastingJourneySheet({ open, onClose, onComplete }: Props) {
  const { t, language } = useLanguage();

  // Wizard state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1: fasting type
  const [fastingType, setFastingType] = useState<FastingType>('orthodox');

  // Step 2: restrictions
  const [restrictions, setRestrictions] = useState<RestrictionCategory[]>([]);

  // Step 3: duration
  const [periods, setPeriods] = useState<FastingPeriod[]>([]);
  const [enabledPeriodIds, setEnabledPeriodIds] = useState<string[]>([]);
  const [customRecurring, setCustomRecurring] = useState(true);
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [customRangeStart, setCustomRangeStart] = useState('');
  const [customRangeEnd, setCustomRangeEnd] = useState('');

  // Step 4: recipes
  const [wantRecipes, setWantRecipes] = useState(true);

  // Saving
  const [saving, setSaving] = useState(false);

  // Load existing settings on open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDirection(1);
    setSaving(false);
    getFastingSettings().then((s) => {
      if (s.religion === 'orthodox' || s.religion === 'catholic' || s.religion === 'custom') {
        setFastingType(s.religion);
      } else {
        setFastingType('orthodox');
      }
      setRestrictions(s.restrictions.length > 0 ? s.restrictions : []);
      setCustomDays(s.customDays);
      setCustomRecurring(s.customRecurring);
      setCustomRangeStart(s.customRangeStart ?? '');
      setCustomRangeEnd(s.customRangeEnd ?? '');
      setEnabledPeriodIds(s.enabledPeriods);
      setWantRecipes(s.fastingRecipes);
    });
  }, [open]);

  // When fasting type changes, pre-fill restrictions
  useEffect(() => {
    const preset = RESTRICTION_CATEGORIES
      .filter((c) => c.presets[fastingType])
      .map((c) => c.id);
    setRestrictions(preset);
  }, [fastingType]);

  // Compute periods when type or step changes
  useEffect(() => {
    if (step === 3 && (fastingType === 'orthodox' || fastingType === 'catholic')) {
      const year = new Date().getFullYear();
      const p = getFastingPeriods(fastingType, year);
      setPeriods(p);
      // Enable all by default if none selected
      if (enabledPeriodIds.length === 0) {
        setEnabledPeriodIds(p.map((pp) => pp.id));
      }
    }
  }, [step, fastingType, enabledPeriodIds.length]);

  // Navigation
  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
      hapticFeedback('light');
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
      hapticFeedback('light');
    }
  }, [step]);

  const [genPhase, setGenPhase] = useState<'plan' | 'chef' | 'done' | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleComplete = useCallback(async () => {
    setSaving(true);
    setGenPhase('plan');
    setGenError(null);
    hapticFeedback('medium');

    const religion: Religion = fastingType;
    const newSettings: FastingSettings = {
      enabled: true,
      religion,
      customDays: religion === 'custom' ? customDays : [],
      restrictions,
      fastingRecipes: wantRecipes,
      customRecurring,
      customRangeStart: religion === 'custom' && !customRecurring ? customRangeStart : undefined,
      customRangeEnd: religion === 'custom' && !customRecurring ? customRangeEnd : undefined,
      enabledPeriods: (religion === 'orthodox' || religion === 'catholic') ? enabledPeriodIds : [],
    };

    // 1. Save fasting settings
    await saveFastingSettings(newSettings);
    try { window.dispatchEvent(new Event('profileUpdated')); } catch {}

    // 2. Load user profile + foods for generation
    try {
      const { getUserProfile, getMealSettings } = await import('../backend/services/UserProfileService');
      const { getAllFoods } = await import('../backend/services/FoodCatalogService');
      const { importFromAIParse, activatePlan, exportActivePlan, getActivePlan } = await import('../backend/services/NutritionPlanService');
      const { callChefReview } = await import('./onboarding/callChefReview');

      // Save current active plan ID so we can restore it if fast is broken
      const currentPlan = await getActivePlan();
      if (currentPlan) {
        newSettings.preFastingPlanId = currentPlan.id;
        await saveFastingSettings(newSettings);
      }

      const profile = await getUserProfile();
      const mealSettings = await getMealSettings();
      const allFoods = await getAllFoods();
      const validFoods = allFoods.filter((f: any) => f.calories_per_100g > 0);

      const dailyTarget = profile?.calorieTarget || 2000;
      const lang = language;

      // 3. Call generate API
      const resp = await authFetch(`${apiBase}/api/generate-meal-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          ...(validFoods.length > 0 ? {
            ingredients: validFoods.slice(0, 40).map((f: any) => ({
              name: f.name,
              calories_per_100g: f.calories_per_100g ?? 100,
              protein_per_100g: f.protein_per_100g ?? 5,
              carbs_per_100g: f.carbs_per_100g ?? 10,
              fat_per_100g: f.fat_per_100g ?? 3,
            })),
          } : {}),
          dailyCalorieTarget: dailyTarget,
          days: 7,
          language,
          userProfile: {
            goal: profile?.goal || 'maintain',
            activityLevel: profile?.activityLevel || 'moderate',
            age: profile?.age || 30,
            weight: profile?.weight || 70,
            gender: profile?.gender || 'male',
            allergies: profile?.allergies || '',
            mealCount: mealSettings?.mealCount || 3,
          },
          fasting: { enabled: true, religion: newSettings.religion, customDays: newSettings.customDays },
        }),
      });

      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const data = await resp.json();
      if (!data?.nutritionPlan) throw new Error('No nutrition plan returned');

      // 4. Chef review (15s timeout)
      setGenPhase('chef');
      let improvedPlan = data.nutritionPlan;
      try {
        improvedPlan = await Promise.race([
          callChefReview({
            nutritionPlan: data.nutritionPlan,
            language,
            userName: user?.name ?? '',
            userProfile: {},
          }),
          new Promise<typeof data.nutritionPlan>((_, reject) =>
            setTimeout(() => reject(new Error('chef-timeout')), 15000)
          ),
        ]);
      } catch {}

      // 5. Convert days → weeks + import + activate
      let planToSave = improvedPlan;
      if (improvedPlan.days && !improvedPlan.weeks) {
        const weeksMap = new Map<number, any[]>();
        for (const day of improvedPlan.days) {
          const weekNum = day.week ?? 1;
          if (!weeksMap.has(weekNum)) weeksMap.set(weekNum, []);
          weeksMap.get(weekNum)!.push(day);
        }
        const weeks = Array.from(weeksMap.values());
        planToSave = { weeks, detected_weeks: weeks.length, detected_days_per_week: 7 };
      }

      const label = `Böjti étrend — ${new Date().toLocaleDateString('hu-HU')}`;
      const plan = await importFromAIParse(planToSave as any, label);
      await activatePlan(plan.id);

      // Cloud sync
      if (user?.id && user.provider !== 'local' && user.provider !== 'demo') {
        exportActivePlan().then((exported: any) => {
          if (exported) {
            import('../services/userFirestoreService').then(({ syncPlanToCloud }) => {
              syncPlanToCloud(user.id, exported).catch(() => {});
            });
          }
        }).catch(() => {});
      }

      setGenPhase('done');
      hapticFeedback('heavy');
      await new Promise(r => setTimeout(r, 800));
      onComplete(newSettings);

    } catch (err: any) {
      setGenError(err?.message || 'Hiba történt a generálás közben');
      setGenPhase(null);
      setSaving(false);
    }
  }, [fastingType, customDays, restrictions, wantRecipes, customRecurring, customRangeStart, customRangeEnd, enabledPeriodIds, onComplete, user, language]);

  // Toggle restriction
  const toggleRestriction = (id: RestrictionCategory) => {
    setRestrictions((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
    hapticFeedback('light');
  };

  // Toggle period
  const togglePeriod = (id: string) => {
    setEnabledPeriodIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
    hapticFeedback('light');
  };

  // Toggle custom weekday
  const toggleCustomDay = (idx: number) => {
    setCustomDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
    hapticFeedback('light');
  };

  // Format date for display
  const formatPeriodDate = (d: Date) => {
    const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'szept', 'okt', 'nov', 'dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  // Step title
  const stepTitle = useMemo(() => {
    switch (step) {
      case 1: return t('fasting.journey.step1Title');
      case 2: return t('fasting.journey.step2Title');
      case 3: return t('fasting.journey.step3Title');
      case 4: return t('fasting.journey.step4Title');
      default: return '';
    }
  }, [step, t]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#fff', display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      paddingTop: 'max(0px, env(safe-area-inset-top))',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '16px 16px 8px',
        gap: 12, flexShrink: 0,
      }}>
        {step > 1 ? (
          <button
            onClick={goBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, width: 32 }}
          >
            <ArrowLeft size={24} color="#111827" />
          </button>
        ) : (
          <div style={{ width: 32 }} />
        )}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>
            {stepTitle}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={22} color="#9ca3af" />
        </button>
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: 0,
              overflowY: 'auto', padding: '16px 16px 160px',
            }}
          >
            {step === 1 && <Step1 fastingType={fastingType} setFastingType={setFastingType} t={t} />}
            {step === 2 && <Step2 restrictions={restrictions} toggleRestriction={toggleRestriction} t={t} />}
            {step === 3 && (
              <Step3
                fastingType={fastingType}
                periods={periods}
                enabledPeriodIds={enabledPeriodIds}
                togglePeriod={togglePeriod}
                customRecurring={customRecurring}
                setCustomRecurring={setCustomRecurring}
                customDays={customDays}
                toggleCustomDay={toggleCustomDay}
                customRangeStart={customRangeStart}
                setCustomRangeStart={setCustomRangeStart}
                customRangeEnd={customRangeEnd}
                setCustomRangeEnd={setCustomRangeEnd}
                formatPeriodDate={formatPeriodDate}
                t={t}
              />
            )}
            {step === 4 && <Step4 wantRecipes={wantRecipes} setWantRecipes={setWantRecipes} t={t} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Dot pagination ── */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 8, paddingTop: 8,
        flexShrink: 0,
      }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i + 1 === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i + 1 === step ? '#0d9488' : '#e5e7eb',
              transition: 'all 0.25s',
            }}
          />
        ))}
      </div>

      {/* ── Fixed bottom CTA ── */}
      <div style={{
        flexShrink: 0, padding: '12px 16px 24px',
        background: 'linear-gradient(to top, #fff 60%, transparent)',
      }}>
        {step < TOTAL_STEPS ? (
          <button
            onClick={goNext}
            style={{
              width: '100%', padding: '16px', borderRadius: 16,
              background: '#0d9488', color: '#fff', border: 'none',
              fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {t('fasting.journey.next')}
          </button>
        ) : (
          <>
            {genError && (
              <p style={{ color: '#ef4444', fontSize: 14, textAlign: 'center', marginBottom: 8 }}>{genError}</p>
            )}
            <button
              onClick={handleComplete}
              disabled={saving}
              style={{
                width: '100%', padding: '16px', borderRadius: 16,
                background: saving ? '#99d5d0' : '#0d9488',
                color: '#fff', border: 'none',
                fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {saving ? (
                <><Loader2 size={20} className="animate-spin" /> {genPhase === 'chef' ? t('fasting.journey.chefReview') || 'Séf ellenőrzés...' : t('fasting.journey.generating') || 'Étrend generálás...'}</>
              ) : (
                t('fasting.journey.regenerate')
              )}
            </button>
          </>
        )}
      </div>

      {/* Full-screen loading overlay when generating */}
      {genPhase && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 32,
        }}>
          <SharedPremiumLoader
            progress={genPhase === 'plan' ? 40 : genPhase === 'chef' ? 75 : 100}
            phaseText={genPhase === 'plan'
              ? (t('fasting.journey.generating') || 'Böjti étrend generálása...')
              : genPhase === 'chef'
              ? (t('fasting.journey.chefReview') || 'Séf ellenőrzés...')
              : (t('fasting.journey.done') || 'Kész!')}
          />
        </div>
      )}
    </div>
  );
}

// ─── Step 1: What kind of fast? ──────────────────────────────────────

function Step1({
  fastingType, setFastingType, t,
}: {
  fastingType: FastingType;
  setFastingType: (v: FastingType) => void;
  t: (key: string) => string;
}) {
  const cards: { type: FastingType; iconEl: React.ReactNode; titleKey: string; descKey: string }[] = [
    {
      type: 'orthodox',
      iconEl: <Church size={32} color={fastingType === 'orthodox' ? '#0d9488' : '#6b7280'} />,
      titleKey: 'fasting.religion.orthodox',
      descKey: 'fasting.journey.orthodoxDesc',
    },
    {
      type: 'catholic',
      iconEl: <Church size={32} color={fastingType === 'catholic' ? '#0d9488' : '#6b7280'} />,
      titleKey: 'fasting.religion.catholic',
      descKey: 'fasting.journey.catholicDesc',
    },
    {
      type: 'custom',
      iconEl: <Calendar size={32} color={fastingType === 'custom' ? '#0d9488' : '#6b7280'} />,
      titleKey: 'fasting.religion.custom',
      descKey: 'fasting.journey.customDesc',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {cards.map((c) => {
        const selected = fastingType === c.type;
        return (
          <button
            key={c.type}
            onClick={() => { setFastingType(c.type); hapticFeedback('light'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '20px 16px', borderRadius: 16,
              border: `2px solid ${selected ? '#0d9488' : '#e5e7eb'}`,
              background: selected ? '#f0fdfa' : '#fff',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: selected ? '#ccfbf1' : '#f3f4f6',
              flexShrink: 0,
            }}>
              {c.iconEl}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '1rem', fontWeight: 700,
                color: selected ? '#0d9488' : '#111827',
              }}>
                {t(c.titleKey)}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
                {t(c.descKey)}
              </div>
            </div>
            {selected && (
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Check size={16} color="#fff" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 2: What do you restrict? ───────────────────────────────────

function Step2({
  restrictions, toggleRestriction, t,
}: {
  restrictions: RestrictionCategory[];
  toggleRestriction: (id: RestrictionCategory) => void;
  t: (key: string) => string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 8 }}>
        {t('fasting.journey.step2Hint')}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {RESTRICTION_CATEGORIES.map((cat) => {
          const active = restrictions.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggleRestriction(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 999,
                border: `2px solid ${active ? '#0d9488' : '#e5e7eb'}`,
                background: active ? '#f0fdfa' : '#fff',
                color: active ? '#0d9488' : '#374151',
                fontSize: '0.9375rem', fontWeight: active ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '1.125rem' }}>{cat.emoji}</span>
              {t(cat.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Duration ────────────────────────────────────────────────

function Step3({
  fastingType, periods, enabledPeriodIds, togglePeriod,
  customRecurring, setCustomRecurring,
  customDays, toggleCustomDay,
  customRangeStart, setCustomRangeStart,
  customRangeEnd, setCustomRangeEnd,
  formatPeriodDate, t,
}: {
  fastingType: FastingType;
  periods: FastingPeriod[];
  enabledPeriodIds: string[];
  togglePeriod: (id: string) => void;
  customRecurring: boolean;
  setCustomRecurring: (v: boolean) => void;
  customDays: number[];
  toggleCustomDay: (idx: number) => void;
  customRangeStart: string;
  setCustomRangeStart: (v: string) => void;
  customRangeEnd: string;
  setCustomRangeEnd: (v: string) => void;
  formatPeriodDate: (d: Date) => string;
  t: (key: string) => string;
}) {
  if (fastingType === 'orthodox' || fastingType === 'catholic') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 4 }}>
          {t('fasting.journey.step3HintReligious')}
        </p>
        {periods.map((p) => {
          const enabled = enabledPeriodIds.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => togglePeriod(p.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 14,
                border: `2px solid ${enabled ? '#0d9488' : '#e5e7eb'}`,
                background: enabled ? '#f0fdfa' : '#fff',
                cursor: 'pointer', width: '100%', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: enabled ? '#0d9488' : '#111827' }}>
                  {t(p.nameKey)}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: 2 }}>
                  {formatPeriodDate(p.start)} — {formatPeriodDate(p.end)}
                </div>
              </div>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                border: `2px solid ${enabled ? '#0d9488' : '#d1d5db'}`,
                background: enabled ? '#0d9488' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}>
                {enabled && <Check size={14} color="#fff" />}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Custom mode
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toggle: recurring vs date range */}
      <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <button
          onClick={() => { setCustomRecurring(true); hapticFeedback('light'); }}
          style={{
            flex: 1, padding: '12px 8px', border: 'none',
            background: customRecurring ? '#0d9488' : '#fff',
            color: customRecurring ? '#fff' : '#374151',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {t('fasting.journey.weeklyRecurring')}
        </button>
        <button
          onClick={() => { setCustomRecurring(false); hapticFeedback('light'); }}
          style={{
            flex: 1, padding: '12px 8px', border: 'none',
            background: !customRecurring ? '#0d9488' : '#fff',
            color: !customRecurring ? '#fff' : '#374151',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {t('fasting.journey.customRange')}
        </button>
      </div>

      {customRecurring ? (
        <div>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 12 }}>
            {t('fasting.customDaysHint')}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {WEEKDAY_KEYS.map((key, idx) => {
              const active = customDays.includes(idx);
              return (
                <button
                  key={key}
                  onClick={() => toggleCustomDay(idx)}
                  style={{
                    width: 44, height: 44, borderRadius: '50%', border: 'none',
                    background: active ? '#0d9488' : '#f3f4f6',
                    color: active ? '#fff' : '#374151',
                    fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t(`fasting.dayNames.${key}`)}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {t('fasting.journey.from')}
          </label>
          <input
            type="date"
            value={customRangeStart}
            onChange={(e) => setCustomRangeStart(e.target.value)}
            style={{
              padding: '12px 14px', borderRadius: 12,
              border: '1px solid #e5e7eb', fontSize: '1rem',
              color: '#111827', background: '#fff',
            }}
          />
          <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {t('fasting.journey.to')}
          </label>
          <input
            type="date"
            value={customRangeEnd}
            onChange={(e) => setCustomRangeEnd(e.target.value)}
            style={{
              padding: '12px 14px', borderRadius: 12,
              border: '1px solid #e5e7eb', fontSize: '1rem',
              color: '#111827', background: '#fff',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Fasting recipes ─────────────────────────────────────────

function Step4({
  wantRecipes, setWantRecipes, t,
}: {
  wantRecipes: boolean;
  setWantRecipes: (v: boolean) => void;
  t: (key: string) => string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: '1rem', color: '#111827', textAlign: 'center', fontWeight: 600 }}>
        {t('fasting.journey.step4Question')}
      </p>

      {/* Toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px', borderRadius: 14,
        border: `2px solid ${wantRecipes ? '#0d9488' : '#e5e7eb'}`,
        background: wantRecipes ? '#f0fdfa' : '#fff',
      }}>
        <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#111827' }}>
          {t('fasting.journey.yesRecipes')}
        </span>
        <button
          onClick={() => { setWantRecipes(!wantRecipes); hapticFeedback('light'); }}
          style={{
            background: wantRecipes ? '#0d9488' : '#e5e7eb',
            borderRadius: 999, width: 48, height: 26, border: 'none',
            cursor: 'pointer', transition: 'background 0.2s', position: 'relative',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: wantRecipes ? 25 : 3,
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Preview recipe cards */}
      <AnimatePresence>
        {wantRecipes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {PREVIEW_RECIPES.map((recipe, i) => (
              <div
                key={i}
                style={{
                  padding: '14px 16px', borderRadius: 14,
                  background: '#f9fafb', border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>
                  {t(recipe.nameKey)}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: 4 }}>
                  {recipe.kcal} kcal &middot; {recipe.protein}g {t('fasting.journey.protein')}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
