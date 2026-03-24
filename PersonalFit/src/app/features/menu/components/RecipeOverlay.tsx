// PersonalFit/src/app/features/menu/components/RecipeOverlay.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Clock, ChevronDown, Utensils, Flame, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getTrialInfo } from '../../../components/onboarding/SubscriptionScreen';
import { generateRecipe, computeWeekContext } from '../../../services/ChefAgentService';
import { getDailyMenuMatches } from '../../../services/DailyMenuMatcherService';
import { RecipeGenerationError } from '../../../services/recipeModels';
import { translateFoodName } from '../../../utils/foodTranslations';
import type { MealOption } from '../../../hooks/usePlanData';
import type { ChefAgentOutput, DailyMenuMatch } from '../../../services/recipeModels';
import type { StoredUserProfile } from '../../../backend/services/UserProfileService';

interface RecipeOverlayProps {
  meal: MealOption;
  userProfile: StoredUserProfile | null;
  weekMeals: MealOption[];
  todayMeals: MealOption[];
  onClose: () => void;
}

type LoadState = 'idle' | 'loading' | 'success' | 'error';

export function RecipeOverlay({
  meal, userProfile, weekMeals, todayMeals, onClose,
}: RecipeOverlayProps) {
  const { t, language } = useLanguage();
  const { user, subscriptionActive } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'restaurant'>('home');
  const [recipeState, setRecipeState] = useState<LoadState>('idle');
  const [menuState, setMenuState] = useState<LoadState>('idle');
  const [recipe, setRecipe] = useState<ChefAgentOutput | null>(null);
  const [menuMatches, setMenuMatches] = useState<DailyMenuMatch[]>([]);
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

  // Load recipe once access is confirmed AND user is loaded (avoids 'anonymous' userId race)
  useEffect(() => {
    if (canAccess !== true || !user) return;
    let mounted = true;
    (async () => {
      if (mounted) await loadRecipe();
      if (mounted) await loadMenuMatches();
    })();
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

  const loadMenuMatches = async () => {
    setMenuState('loading');
    try {
      const matches = await getDailyMenuMatches(
        { name: meal.name, calories: meal.calories, mealType: meal.type },
        language as 'hu' | 'ro' | 'en',
        undefined, // city not yet in StoredUserProfile
        user?.id,
      );
      setMenuMatches(matches);
      setMenuState('success');
    } catch {
      setMenuState('error');
    }
  };

  const difficultyLabel = (d?: string) => {
    if (d === 'easy') return t('recipe.difficultyEasy');
    if (d === 'medium') return t('recipe.difficultyMedium');
    if (d === 'hard') return t('recipe.difficultyHard');
    return '';
  };

  // Paywall screen
  if (canAccess === false) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6"
        initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <button onClick={onClose} className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-4 w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="text-4xl mb-4">🔒</div>
        <p className="text-center text-base font-semibold text-foreground mb-2">{t('recipe.premiumRequired')}</p>
      </motion.div>
    );
  }

  // Loading/access check
  if (canAccess === null) {
    return (
      <motion.div className="fixed inset-0 z-50 bg-background flex items-center justify-center"
        initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-border">
        <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="font-bold text-base text-foreground truncate max-w-[200px]">
          {translateFoodName(meal.name, language)}
        </h2>
        <div className="w-9" />
      </div>

      {/* Tab switcher */}
      <div className="flex-shrink-0 flex gap-1 px-4 py-2 border-b border-border">
        {(['home', 'restaurant'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === tab ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {tab === 'home' ? t('recipe.cookAtHome') : t('recipe.findRestaurant')}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">

          {activeTab === 'home' && (
            <>
              {recipeState === 'loading' && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">{t('recipe.chefWorking')}</p>
                </div>
              )}

              {recipeState === 'error' && (
                <div className="flex flex-col items-center gap-3 py-12">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <p className="text-sm text-gray-500 text-center">{errorMsg}</p>
                  <button onClick={loadRecipe} className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-semibold">
                    <RefreshCw className="w-4 h-4" />{t('recipe.retry')}
                  </button>
                </div>
              )}

              {recipeState === 'success' && recipe && (
                <>
                  {/* Meta row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg text-xs text-gray-600">
                      <Clock className="w-3.5 h-3.5" />{recipe.prepTime} {t('recipe.minutesSuffix')}
                    </span>
                    <span className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg text-xs text-gray-600">
                      👨‍🍳 {difficultyLabel(recipe.difficulty)}
                    </span>
                    <span className="flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-lg text-xs text-primary font-semibold">
                      <Flame className="w-3.5 h-3.5" />{meal.calories}
                    </span>
                  </div>

                  {/* Ingredients */}
                  {meal.ingredientDetails && meal.ingredientDetails.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Utensils className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('recipe.ingredients')}</span>
                      </div>
                      <div className="space-y-1">
                        {meal.ingredientDetails.map((ing, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
                            <span className="text-sm text-gray-700">{translateFoodName(ing.name, language)}</span>
                            <span className="text-xs text-gray-400">{ing.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Steps */}
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('recipe.preparation')}</span>
                    <div className="space-y-2 mt-2">
                      {recipe.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="flex gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    {meal.ingredientDetails && meal.ingredientDetails.length > 0 ? (() => {
                      const totP = meal.ingredientDetails.reduce((s, i) => s + (i.protein || 0), 0).toFixed(1);
                      const totC = meal.ingredientDetails.reduce((s, i) => s + (i.carbs || 0), 0).toFixed(1);
                      const totF = meal.ingredientDetails.reduce((s, i) => s + (i.fat || 0), 0).toFixed(1);
                      return (
                        <>
                          <span className="text-sm text-gray-600">🥩 {totP}g</span>
                          <span className="text-sm text-gray-600">🌾 {totC}g</span>
                          <span className="text-sm text-gray-600">🫒 {totF}g</span>
                        </>
                      );
                    })() : null}
                  </div>

                  {/* Chef tip */}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 space-y-1.5">
                    <p className="text-sm text-gray-700">💡 {recipe.chefTip}</p>
                    {recipe.gastroNote && <p className="text-sm text-amber-600 font-medium">⚠ {recipe.gastroNote}</p>}
                  </div>

                  {/* Meal prep guide */}
                  {recipe.mealPrepGuide && (
                    <div>
                      <button
                        onClick={() => setShowMealPrep(!showMealPrep)}
                        className="w-full flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100"
                      >
                        <span className="text-sm font-semibold text-gray-700">🥡 {t('recipe.mealPrepExpand')}</span>
                        <motion.div animate={{ rotate: showMealPrep ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {showMealPrep && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm text-gray-600 leading-relaxed px-4 py-3 bg-gray-50 rounded-b-xl border-x border-b border-gray-100">
                              {recipe.mealPrepGuide}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'restaurant' && (
            <>
              <p className="text-xs text-gray-400 italic">{t('recipe.aiEstimateDisclaimer')}</p>

              {menuState === 'loading' && (
                <div className="flex flex-col items-center py-12 gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">{t('recipe.chefWorking')}</p>
                </div>
              )}

              {(menuState === 'error' || (menuState === 'success' && menuMatches.length === 0)) && (
                <p className="text-sm text-gray-400 text-center py-8">{t('recipe.noMenuFound')}</p>
              )}

              {menuState === 'success' && menuMatches.map((match, i) => (
                <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{match.restaurantName}</p>
                      <p className="text-sm text-gray-600">{match.dishName}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium flex-shrink-0 ${
                      match.confidence === 'high' ? 'bg-green-50 text-green-700'
                      : match.confidence === 'medium' ? 'bg-amber-50 text-amber-700'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                      {match.confidence === 'high' ? t('recipe.accurateLabel') : t('recipe.estimatedLabel')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    {match.estimatedKcal > 0 && <span>🔥 ~{match.estimatedKcal} kcal</span>}
                    {match.price && <span>💰 {match.price}</span>}
                    {match.availableFrom && <span>🕐 {match.availableFrom}</span>}
                  </div>
                  {match.matchScore > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${match.matchScore}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{match.matchScore}% {t('recipe.matchScore')}</span>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          <div className="h-[max(1rem,env(safe-area-inset-bottom))]" />
        </div>
      </div>
    </motion.div>
  );
}
