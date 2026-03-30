// PersonalFit/src/app/features/menu/components/RecipeOverlay.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getTrialInfo } from '../../../components/onboarding/SubscriptionScreen';
import { generateRecipe, computeWeekContext } from '../../../services/ChefAgentService';
import { RecipeGenerationError } from '../../../services/recipeModels';
import { translateFoodName } from '../../../utils/foodTranslations';
import type { MealOption } from '../../../hooks/usePlanData';
import type { ChefAgentOutput } from '../../../services/recipeModels';
import type { StoredUserProfile } from '../../../backend/services/UserProfileService';

interface RecipeOverlayProps {
  meal: MealOption;
  userProfile: StoredUserProfile | null;
  weekMeals: MealOption[];
  todayMeals: MealOption[];
  onClose: () => void;
  initialTab?: 'recipe' | 'steps' | 'video';
}

type LoadState = 'idle' | 'loading' | 'success' | 'error';

// Tab config
const TABS = [
  { key: 'recipe' as const, icon: '🍳', labelKey: 'recipe.tabRecipe' },
  { key: 'steps' as const, icon: '📋', labelKey: 'recipe.tabSteps' },
  { key: 'video' as const, icon: '🎬', labelKey: 'recipe.tabVideo' },
];

export function RecipeOverlay({
  meal, userProfile, weekMeals, todayMeals, onClose, initialTab,
}: RecipeOverlayProps) {
  const { t, language } = useLanguage();
  const { user, subscriptionActive } = useAuth();
  const [activeTab, setActiveTab] = useState<'recipe' | 'steps' | 'video'>(initialTab ?? 'recipe');
  const [recipeState, setRecipeState] = useState<LoadState>('idle');
  const [recipe, setRecipe] = useState<ChefAgentOutput | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showMealPrep, setShowMealPrep] = useState(false);
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const recipeLoadingRef = useRef(false);

  // Subscription check
  useEffect(() => {
    (async () => {
      if (subscriptionActive) { setCanAccess(true); return; }
      try {
        const trial = await getTrialInfo();
        setCanAccess(!trial.isExpired);
      } catch {
        setCanAccess(false);
      }
    })();
  }, [subscriptionActive]);

  // Load recipe once access confirmed
  useEffect(() => {
    if (canAccess !== true || !user) return;
    let mounted = true;
    (async () => { if (mounted) await loadRecipe(); })();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess, user]);

  const loadRecipe = async () => {
    if (recipeLoadingRef.current) return;
    recipeLoadingRef.current = true;
    setRecipeState('loading');
    setErrorMsg('');
    try {
      const weekContext = computeWeekContext(weekMeals, todayMeals, meal.id);
      const result = await generateRecipe({
        userProfile: {
          age: userProfile?.age ?? 30,
          gender: (userProfile?.gender as 'male' | 'female' | 'other') ?? 'other',
          weight: userProfile?.weight ?? 70,
          goal: userProfile?.goal ?? 'maintenance',
          allergies: userProfile?.allergies ?? '',
        },
        meal: {
          name: meal.name,
          ingredients: meal.ingredients,
          ingredientDetails: meal.ingredientDetails,
          calories: meal.calories,
          mealType: meal.type as 'lunch' | 'dinner',
        },
        weekContext,
        language: language as 'hu' | 'ro' | 'en',
        userId: user?.id ?? 'anonymous',
      });
      setRecipe(result);
      setRecipeState('success');
    } catch (err) {
      setRecipeState('error');
      setErrorMsg(err instanceof RecipeGenerationError ? err.message : t('recipe.errorMessage'));
    } finally {
      recipeLoadingRef.current = false;
    }
  };

  const tabLabels: Record<string, string> = {
    'recipe.tabRecipe': t('recipe.tabRecipe') || 'Recept',
    'recipe.tabSteps': t('recipe.tabSteps') || 'Elkészítés',
    'recipe.tabVideo': t('recipe.tabVideo') || 'Videó',
  };

  // ─── Paywall ───
  if (canAccess === false) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6"
        initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <button onClick={onClose} className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-4 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer">
          <span className="text-gray-600 text-lg">✕</span>
        </button>
        <div className="text-4xl mb-4">🔒</div>
        <p className="text-center text-base text-foreground" style={{ fontWeight: 600 }}>{t('recipe.premiumRequired')}</p>
      </motion.div>
    );
  }

  // ─── Loading access ───
  if (canAccess === null) {
    return (
      <motion.div className="fixed inset-0 z-50 bg-background flex items-center justify-center"
        initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
    >
      {/* Dimmed backdrop — tap to close */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Bottom sheet */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-background flex flex-col"
        style={{
          maxHeight: '85vh',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Meal name */}
        <div className="px-5 pb-3">
          <h2 className="text-[20px] text-foreground leading-tight" style={{ fontWeight: 700 }}>
            {translateFoodName(meal.name, language)}
          </h2>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 px-5 pb-3">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
              style={{ fontWeight: 600 }}
            >
              <span>{tab.icon}</span>
              {tabLabels[tab.labelKey]}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-5" />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4">

            {/* ══════════════════════════ */}
            {/* TAB: RECEPT (ingredients) */}
            {/* ══════════════════════════ */}
            {activeTab === 'recipe' && (
              <div>
                <h3 className="text-[17px] text-foreground mb-4" style={{ fontWeight: 700 }}>
                  {t('foods.ingredients') || 'Összetevők'}
                </h3>

                <div className="space-y-2.5">
                  {(meal.ingredientDetails && meal.ingredientDetails.length > 0)
                    ? meal.ingredientDetails.map((ing, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.2 }}
                        className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-gray-50"
                      >
                        <div>
                          <p className="text-[15px] text-foreground" style={{ fontWeight: 600 }}>
                            {translateFoodName(ing.name, language)}
                          </p>
                          <p className="text-[13px] text-gray-400 mt-0.5">{ing.quantity}</p>
                        </div>
                        <span className="text-[15px] text-primary" style={{ fontWeight: 600 }}>
                          {Math.round(ing.calories)} kcal
                        </span>
                      </motion.div>
                    ))
                    : meal.ingredients.map((ingredient, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.2 }}
                        className="flex items-center px-4 py-3.5 rounded-xl bg-gray-50"
                      >
                        <p className="text-[15px] text-foreground" style={{ fontWeight: 500 }}>
                          {translateFoodName(ingredient, language)}
                        </p>
                      </motion.div>
                    ))
                  }
                </div>

                {/* Chef tip */}
                {recipeState === 'success' && recipe?.chefTip && (
                  <div className="mt-5 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3.5">
                    <p className="text-[14px] text-gray-700 leading-relaxed">
                      💡 <span style={{ fontWeight: 700 }}>{t('recipe.chefTipLabel') || 'Szakács tipp:'}</span> {recipe.chefTip}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════ */}
            {/* TAB: ELKÉSZÍTÉS (steps)   */}
            {/* ══════════════════════════ */}
            {activeTab === 'steps' && (
              <div>
                {/* Loading */}
                {recipeState === 'loading' && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">{t('recipe.chefWorking')}</p>
                  </div>
                )}

                {/* Error */}
                {recipeState === 'error' && (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <p className="text-sm text-gray-500 text-center">{errorMsg}</p>
                    <button onClick={loadRecipe} className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm cursor-pointer" style={{ fontWeight: 600 }}>
                      <RefreshCw className="w-4 h-4" />{t('recipe.retry')}
                    </button>
                  </div>
                )}

                {/* Steps */}
                {recipeState === 'success' && recipe && (
                  <>
                    <h3 className="text-[17px] text-foreground mb-4" style={{ fontWeight: 700 }}>
                      {t('recipe.preparation') || 'Elkészítés lépései'}
                    </h3>

                    <div className="space-y-5">
                      {recipe.steps.map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.25 }}
                          className="flex items-start gap-4"
                        >
                          <span
                            className="w-8 h-8 rounded-full bg-primary text-white text-[14px] flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ fontWeight: 700 }}
                          >
                            {i + 1}
                          </span>
                          <p className="text-[15px] text-gray-700 leading-relaxed">{step}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Macros summary */}
                    {meal.ingredientDetails && meal.ingredientDetails.length > 0 && (() => {
                      const totP = meal.ingredientDetails.reduce((s, i) => s + (i.protein || 0), 0).toFixed(1);
                      const totC = meal.ingredientDetails.reduce((s, i) => s + (i.carbs || 0), 0).toFixed(1);
                      const totF = meal.ingredientDetails.reduce((s, i) => s + (i.fat || 0), 0).toFixed(1);
                      return (
                        <div className="flex gap-4 bg-gray-50 rounded-xl px-4 py-3 mt-5">
                          <span className="text-[13px] text-gray-600">🥩 {totP}g</span>
                          <span className="text-[13px] text-gray-600">🌾 {totC}g</span>
                          <span className="text-[13px] text-gray-600">🫒 {totF}g</span>
                        </div>
                      );
                    })()}

                    {/* Gastro note */}
                    {recipe.gastroNote && (
                      <div className="mt-4 bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3">
                        <p className="text-[13px] text-amber-700" style={{ fontWeight: 500 }}>⚠ {recipe.gastroNote}</p>
                      </div>
                    )}

                    {/* Meal prep */}
                    {recipe.mealPrepGuide && (
                      <div className="mt-4">
                        <button
                          onClick={() => setShowMealPrep(!showMealPrep)}
                          className="w-full flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3.5 border border-gray-100 cursor-pointer"
                        >
                          <span className="text-[14px] text-gray-700" style={{ fontWeight: 600 }}>🥡 {t('recipe.mealPrepExpand') || 'Meal prep tipp'}</span>
                          <motion.div animate={{ rotate: showMealPrep ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {showMealPrep && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <p className="text-[13px] text-gray-600 leading-relaxed px-4 py-3 bg-gray-50 rounded-b-xl border-x border-b border-gray-100">
                                {recipe.mealPrepGuide}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ══════════════════════════ */}
            {/* TAB: VIDEÓ (YouTube)      */}
            {/* ══════════════════════════ */}
            {activeTab === 'video' && (
              <div>
                <h3 className="text-[17px] text-foreground mb-4" style={{ fontWeight: 700 }}>
                  {t('recipe.videoRecipe') || 'Videó recept'}
                </h3>

                {/* YouTube embed placeholder */}
                <div className="w-full rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl">🎬</span>
                    </div>
                    <p className="text-[14px] text-gray-500" style={{ fontWeight: 500 }}>
                      {t('recipe.videoComingSoon') || 'YouTube integráció hamarosan'}
                    </p>
                  </div>
                </div>

                <p className="text-[13px] text-gray-400 text-center mt-3">
                  {t('recipe.videoHint') || 'Kattints a videóra a teljes képernyős lejátszáshoz'}
                </p>
              </div>
            )}

            <div className="h-6" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
