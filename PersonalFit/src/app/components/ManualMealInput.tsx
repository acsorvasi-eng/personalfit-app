/**
 * ====================================================================
 * ManualMealInput — Day-by-Day Meal Builder
 * ====================================================================
 * Allows users to manually create their 30-day meal plan.
 * Each day has breakfast, lunch, dinner, and optional snack slots.
 * Foods are selected from the food catalog or typed freely.
 * Data is saved to IndexedDB via NutritionPlanService.
 *
 * Features:
 *   - Day selector (1-30)
 *   - Meal type tabs (breakfast, lunch, dinner, snack)
 *   - Food search with auto-suggest from food database
 *   - Quantity input (grams)
 *   - Auto calorie/macro calculation
 *   - Save progress per day
 *   - Finish → creates NutritionPlan in IndexedDB
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Search, ChevronLeft, ChevronRight,
  UtensilsCrossed, Coffee, Sandwich, Moon, Cookie,
  Trash2, ArrowLeft, AlertCircle, Flame,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { foodDatabase, type Food } from '../data/mealData';
import { foodKnowledge } from '../data/aiFoodKnowledge';
import type { FoodItem as AIFoodItem } from '../data/aiFoodKnowledge';
import * as NutritionPlanSvc from '../backend/services/NutritionPlanService';
import { getDB, generateId, nowISO } from '../backend/db';
import type { MealType } from '../backend/models';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface MealItem {
  id: string;
  name: string;
  quantityGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

interface DayMealData {
  breakfast: MealItem[];
  lunch: MealItem[];
  dinner: MealItem[];
  snack: MealItem[];
  isTrainingDay: boolean;
}

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_SLOTS: { key: MealSlot; icon: React.ElementType; colorClass: string }[] = [
  { key: 'breakfast', icon: Coffee, colorClass: 'text-amber-500' },
  { key: 'lunch', icon: Sandwich, colorClass: 'text-blue-500' },
  { key: 'dinner', icon: Moon, colorClass: 'text-purple-500' },
  { key: 'snack', icon: Cookie, colorClass: 'text-teal-500' },
];

const TOTAL_DAYS = 30;

// ═══════════════════════════════════════════════════════════════
// FOOD SEARCH KNOWLEDGE
// ═══════════════════════════════════════════════════════════════

interface FoodSuggestion {
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  category: string;
}

function buildSuggestionDB(): FoodSuggestion[] {
  const suggestions: FoodSuggestion[] = [];

  // From aiFoodKnowledge (uses names[] and per100 object)
  if (foodKnowledge && Array.isArray(foodKnowledge)) {
    for (const item of foodKnowledge as AIFoodItem[]) {
      const primaryName = item.names?.[0] || '';
      if (!primaryName) continue;
      suggestions.push({
        name: primaryName,
        caloriesPer100g: item.per100?.calories || 0,
        proteinPer100g: item.per100?.protein || 0,
        carbsPer100g: item.per100?.carbs || 0,
        fatPer100g: item.per100?.fat || 0,
        category: item.category || '',
      });
    }
  }

  // From foodDatabase (Food type: name=string, calories=string, protein/carbs/fat=number per 100g)
  if (foodDatabase && Array.isArray(foodDatabase)) {
    for (const item of foodDatabase) {
      if (!item.name || suggestions.find(s => s.name.toLowerCase() === item.name.toLowerCase())) continue;
      suggestions.push({
        name: item.name,
        caloriesPer100g: parseInt(item.calories) || 0,
        proteinPer100g: item.protein || 0,
        carbsPer100g: item.carbs || 0,
        fatPer100g: item.fat || 0,
        category: item.category || '',
      });
    }
  }

  return suggestions.filter(s => s.name);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ManualMealInput() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const searchRef = useRef<HTMLInputElement>(null);

  // State
  const [currentDay, setCurrentDay] = useState(1);
  const [activeSlot, setActiveSlot] = useState<MealSlot>('breakfast');
  const [allDays, setAllDays] = useState<Record<number, DayMealData>>(() => {
    // Load from localStorage if exists
    const saved = localStorage.getItem('manualMealPlan');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return {};
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [addingItem, setAddingItem] = useState<FoodSuggestion | null>(null);
  const [addQuantity, setAddQuantity] = useState('100');
  const [isSaving, setIsSaving] = useState(false);
  const [savedDays, setSavedDays] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('manualSavedDays');
    if (saved) try { return new Set(JSON.parse(saved)); } catch { /* ignore */ }
    return new Set();
  });

  // Build suggestion database
  const suggestionDB = useMemo(() => buildSuggestionDB(), []);

  // Current day data
  const dayData = useMemo((): DayMealData => {
    return allDays[currentDay] || {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
      isTrainingDay: false,
    };
  }, [allDays, currentDay]);

  // Search results
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return suggestionDB
      .filter(s => s.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, suggestionDB]);

  // Save current day data
  const saveDay = useCallback((day: number, data: DayMealData) => {
    const updated = { ...allDays, [day]: data };
    setAllDays(updated);
    localStorage.setItem('manualMealPlan', JSON.stringify(updated));
  }, [allDays]);

  // Add food item to current slot
  const addFoodItem = useCallback(() => {
    if (!addingItem) return;
    const qty = parseInt(addQuantity) || 100;
    const newItem: MealItem = {
      id: generateId(),
      name: addingItem.name,
      quantityGrams: qty,
      caloriesPer100g: addingItem.caloriesPer100g,
      proteinPer100g: addingItem.proteinPer100g,
      carbsPer100g: addingItem.carbsPer100g,
      fatPer100g: addingItem.fatPer100g,
    };

    const updated: DayMealData = {
      ...dayData,
      [activeSlot]: [...dayData[activeSlot], newItem],
    };

    saveDay(currentDay, updated);
    setAddingItem(null);
    setAddQuantity('100');
    setSearchQuery('');
    setShowSearch(false);
    if (navigator.vibrate) navigator.vibrate([10, 20]);
  }, [addingItem, addQuantity, activeSlot, dayData, currentDay, saveDay]);

  // Remove food item
  const removeItem = useCallback((itemId: string) => {
    const updated: DayMealData = {
      ...dayData,
      [activeSlot]: dayData[activeSlot].filter(i => i.id !== itemId),
    };
    saveDay(currentDay, updated);
    if (navigator.vibrate) navigator.vibrate(10);
  }, [dayData, activeSlot, currentDay, saveDay]);

  // Toggle training day
  const toggleTrainingDay = useCallback(() => {
    const updated: DayMealData = { ...dayData, isTrainingDay: !dayData.isTrainingDay };
    saveDay(currentDay, updated);
  }, [dayData, currentDay, saveDay]);

  // Calculate day totals
  const dayTotals = useMemo(() => {
    let cal = 0, pro = 0, carb = 0, fat = 0;
    for (const slot of MEAL_SLOTS) {
      for (const item of dayData[slot.key]) {
        const mult = item.quantityGrams / 100;
        cal += item.caloriesPer100g * mult;
        pro += item.proteinPer100g * mult;
        carb += item.carbsPer100g * mult;
        fat += item.fatPer100g * mult;
      }
    }
    return { calories: Math.round(cal), protein: Math.round(pro), carbs: Math.round(carb), fat: Math.round(fat) };
  }, [dayData]);

  // Calculate slot calories
  const slotCalories = useCallback((slot: MealSlot) => {
    return Math.round(dayData[slot].reduce((sum, item) => sum + (item.caloriesPer100g * item.quantityGrams / 100), 0));
  }, [dayData]);

  // Navigation
  const prevDay = () => setCurrentDay(d => Math.max(1, d - 1));
  const nextDay = () => setCurrentDay(d => Math.min(TOTAL_DAYS, d + 1));

  // Completed days count
  const completedDaysCount = useMemo(() => {
    return Object.keys(allDays).filter(d => {
      const day = allDays[parseInt(d)];
      return day && (day.breakfast.length > 0 || day.lunch.length > 0 || day.dinner.length > 0);
    }).length;
  }, [allDays]);

  // Final save to IndexedDB
  const handleFinishPlan = useCallback(async () => {
    setIsSaving(true);
    try {
      // Create nutrition plan
      const plan = await NutritionPlanSvc.createPlan({
        label: `${t('planSetup.manualTitle')} — ${new Date().toLocaleDateString()}`,
        source: 'user_upload',
        total_weeks: Math.ceil(TOTAL_DAYS / 7),
      });

      const db = await getDB();
      const now = nowISO();

      // Create meal days and meals for each day with data
      for (const [dayStr, data] of Object.entries(allDays)) {
        const dayNum = parseInt(dayStr);
        const week = Math.ceil(dayNum / 7);
        const dayInWeek = ((dayNum - 1) % 7) + 1;

        // Calculate day totals
        let totalCal = 0, totalPro = 0, totalCarbs = 0, totalFat = 0;
        for (const slot of MEAL_SLOTS) {
          for (const item of data[slot.key]) {
            const mult = item.quantityGrams / 100;
            totalCal += item.caloriesPer100g * mult;
            totalPro += item.proteinPer100g * mult;
            totalCarbs += item.carbsPer100g * mult;
            totalFat += item.fatPer100g * mult;
          }
        }

        const mealDayId = generateId();
        await db.put('meal_days', {
          id: mealDayId,
          nutrition_plan_id: plan.id,
          week,
          day: dayInWeek,
          day_label: data.isTrainingDay ? 'Edzesnap' : 'Pihenonap',
          is_training_day: data.isTrainingDay,
          total_calories: Math.round(totalCal),
          total_protein: Math.round(totalPro),
          total_carbs: Math.round(totalCarbs),
          total_fat: Math.round(totalFat),
          created_at: now,
        });

        // Create meals for each slot
        for (const slot of MEAL_SLOTS) {
          if (data[slot.key].length === 0) continue;

          let mealCal = 0, mealPro = 0, mealCarbs = 0, mealFat = 0;
          const items = data[slot.key];
          for (const item of items) {
            const mult = item.quantityGrams / 100;
            mealCal += item.caloriesPer100g * mult;
            mealPro += item.proteinPer100g * mult;
            mealCarbs += item.carbsPer100g * mult;
            mealFat += item.fatPer100g * mult;
          }

          const mealName = items.map(i => i.name).join(' + ');
          const mealId = generateId();

          await db.put('meals', {
            id: mealId,
            meal_day_id: mealDayId,
            nutrition_plan_id: plan.id,
            meal_type: slot.key as MealType,
            name: mealName,
            description: items.map(i => `${i.quantityGrams}g ${i.name}`).join(', '),
            total_calories: Math.round(mealCal),
            total_protein: Math.round(mealPro),
            total_carbs: Math.round(mealCarbs),
            total_fat: Math.round(mealFat),
            is_primary: true,
            sort_order: 0,
            created_at: now,
          });

          // Create meal items
          for (const item of items) {
            const mult = item.quantityGrams / 100;
            await db.put('meal_items', {
              id: generateId(),
              meal_id: mealId,
              food_id: item.id,
              food_name: item.name,
              quantity_grams: item.quantityGrams,
              unit: 'g',
              calculated_calories: Math.round(item.caloriesPer100g * mult),
              calculated_protein: Math.round(item.proteinPer100g * mult),
              calculated_carbs: Math.round(item.carbsPer100g * mult),
              calculated_fat: Math.round(item.fatPer100g * mult),
              created_at: now,
            });
          }
        }
      }

      // Activate the plan
      await NutritionPlanSvc.activatePlan(plan.id);

      // Cleanup localStorage
      localStorage.removeItem('manualMealPlan');
      localStorage.removeItem('manualSavedDays');

      navigate('/');
    } catch (err) {
      console.error('[ManualMealInput] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [allDays, navigate, t]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-primary-50)] to-white dark:from-[#0f0f0f] dark:to-[#121212] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-b border-gray-100 dark:border-[#2a2a2a]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-gray-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-sm text-gray-900 dark:text-white" style={{ fontWeight: 600 }}>
              {t('manualInput.title')}
            </h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {completedDaysCount}/{TOTAL_DAYS} {t('manualInput.daysCompleted')}
            </p>
          </div>
          <button
            onClick={handleFinishPlan}
            disabled={completedDaysCount === 0 || isSaving}
            className={`px-3 py-1.5 rounded-lg text-[11px] transition-all ${
              completedDaysCount > 0
                ? 'bg-gradient-to-r from-[#3366FF] to-[#12CFA6] text-white shadow-md'
                : 'bg-gray-100 dark:bg-[#252525] text-gray-400'
            }`}
            style={{ fontWeight: 600 }}
          >
            {isSaving ? '...' : t('manualInput.finish')}
          </button>
        </div>

        {/* Day Selector */}
        <div className="flex items-center justify-between px-4 py-2">
          <button onClick={prevDay} disabled={currentDay === 1} className="p-1.5 text-gray-400 disabled:opacity-30">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 justify-center">
              {Array.from({ length: Math.min(7, TOTAL_DAYS) }, (_, i) => {
                const startDay = Math.max(1, Math.min(currentDay - 3, TOTAL_DAYS - 6));
                const day = startDay + i;
                const hasData = allDays[day] && (allDays[day].breakfast.length > 0 || allDays[day].lunch.length > 0 || allDays[day].dinner.length > 0);
                return (
                  <button
                    key={day}
                    onClick={() => setCurrentDay(day)}
                    className={`w-9 h-9 rounded-full text-[11px] transition-all flex flex-col items-center justify-center ${
                      day === currentDay
                        ? 'bg-gradient-to-br from-[#3366FF] to-[#12CFA6] text-white shadow-md'
                        : hasData
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-50 dark:bg-[#1e1e1e] text-gray-500 dark:text-gray-400'
                    }`}
                    style={{ fontWeight: day === currentDay ? 700 : 500, minWidth: '36px' }}
                  >
                    {day}
                    {hasData && day !== currentDay && (
                      <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={nextDay} disabled={currentDay === TOTAL_DAYS} className="p-1.5 text-gray-400 disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Meal Type Tabs */}
        <div className="flex gap-1 px-4 pb-3">
          {MEAL_SLOTS.map(slot => {
            const cal = slotCalories(slot.key);
            const count = dayData[slot.key].length;
            return (
              <button
                key={slot.key}
                onClick={() => setActiveSlot(slot.key)}
                className={`flex-1 py-2 rounded-xl text-[10px] transition-all ${
                  activeSlot === slot.key
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'bg-gray-50 dark:bg-[#1e1e1e] text-gray-500 dark:text-gray-400'
                }`}
                style={{ fontWeight: activeSlot === slot.key ? 600 : 500 }}
              >
                <slot.icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${activeSlot === slot.key ? slot.colorClass : 'text-gray-400'}`} />
                {t(`menu.${slot.key}`)}
                {count > 0 && (
                  <span className="block text-[9px] opacity-70">{cal} kcal</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Info Bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <span className="text-lg text-gray-900 dark:text-white" style={{ fontWeight: 700 }}>{dayTotals.calories}</span>
            <span className="text-[10px] text-gray-400 block">kcal</span>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'F', value: dayTotals.protein, color: 'text-blue-500' },
              { label: 'Sz', value: dayTotals.carbs, color: 'text-amber-500' },
              { label: 'Zs', value: dayTotals.fat, color: 'text-red-400' },
            ].map(m => (
              <span key={m.label} className={`text-[10px] ${m.color}`} style={{ fontWeight: 500 }}>
                {m.label}: {m.value}g
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={toggleTrainingDay}
          className={`px-3 py-1.5 rounded-lg text-[10px] transition-all ${
            dayData.isTrainingDay
              ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
              : 'bg-gray-100 dark:bg-[#252525] text-gray-500 dark:text-gray-400'
          }`}
          style={{ fontWeight: 500 }}
        >
          {dayData.isTrainingDay ? t('menu.trainingDay') : t('menu.restDay')}
        </button>
      </div>

      {/* Meal Items List */}
      <div className="flex-1 px-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentDay}-${activeSlot}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {dayData[activeSlot].length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 dark:bg-[#1e1e1e] flex items-center justify-center mb-3">
                  {MEAL_SLOTS.find(s => s.key === activeSlot)?.icon && (
                    (() => {
                      const Icon = MEAL_SLOTS.find(s => s.key === activeSlot)!.icon;
                      return <Icon className="w-6 h-6 text-gray-300 dark:text-gray-600" />;
                    })()
                  )}
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-1" style={{ fontWeight: 500 }}>
                  {t('manualInput.emptySlot')}
                </p>
                <p className="text-[11px] text-gray-300 dark:text-gray-600">
                  {t('manualInput.tapAdd')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {dayData[activeSlot].map((item, index) => {
                  const mult = item.quantityGrams / 100;
                  const itemCal = Math.round(item.caloriesPer100g * mult);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm"
                    >
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 flex items-center justify-center">
                        <Flame className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate" style={{ fontWeight: 500 }}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {item.quantityGrams}g · {itemCal} kcal ·{' '}
                          F:{Math.round(item.proteinPer100g * mult)}g{' '}
                          Sz:{Math.round(item.carbsPer100g * mult)}g{' '}
                          Zs:{Math.round(item.fatPer100g * mult)}g
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Add Food Button */}
        <button
          onClick={() => setShowSearch(true)}
          className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-[#333] text-sm text-gray-400 dark:text-gray-500 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
          style={{ fontWeight: 500 }}
        >
          <Plus className="w-4 h-4" />
          {t('manualInput.addFood')}
        </button>
      </div>

      {/* Search Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowSearch(false); setAddingItem(null); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] rounded-t-3xl max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Sheet Header */}
              <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-[#2a2a2a]">
                <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-3" />
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={t('manualInput.searchPlaceholder')}
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-gray-50 dark:bg-[#252525] text-sm text-gray-900 dark:text-white placeholder-gray-400 border border-gray-100 dark:border-[#333] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      autoFocus
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                  <button onClick={() => { setShowSearch(false); setAddingItem(null); }} className="text-sm text-gray-500" style={{ fontWeight: 500 }}>
                    {t('ui.cancel')}
                  </button>
                </div>
              </div>

              {/* Adding Item Detail */}
              {addingItem ? (
                <div className="px-5 py-4 flex-1">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                    <h3 className="text-sm text-gray-900 dark:text-white mb-1" style={{ fontWeight: 600 }}>{addingItem.name}</h3>
                    <div className="flex gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                      <span>{addingItem.caloriesPer100g} kcal/100g</span>
                      <span>F: {addingItem.proteinPer100g}g</span>
                      <span>Sz: {addingItem.carbsPer100g}g</span>
                      <span>Zs: {addingItem.fatPer100g}g</span>
                    </div>
                  </div>

                  <label className="block text-[11px] text-gray-500 mb-1.5" style={{ fontWeight: 500 }}>
                    {t('manualInput.quantity')} (g)
                  </label>
                  <input
                    type="number"
                    value={addQuantity}
                    onChange={e => setAddQuantity(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#252525] text-gray-900 dark:text-white border border-gray-100 dark:border-[#333] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    min="1"
                    max="5000"
                  />

                  {/* Calculated values */}
                  {addQuantity && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-[#1e1e1e] rounded-xl">
                      <p className="text-[10px] text-gray-400 mb-1">{t('manualInput.calculated')}:</p>
                      <div className="flex gap-4 text-sm">
                        <span className="text-orange-500" style={{ fontWeight: 600 }}>
                          {Math.round(addingItem.caloriesPer100g * (parseInt(addQuantity) || 0) / 100)} kcal
                        </span>
                        <span className="text-blue-500 text-[11px]">F: {Math.round(addingItem.proteinPer100g * (parseInt(addQuantity) || 0) / 100)}g</span>
                        <span className="text-amber-500 text-[11px]">Sz: {Math.round(addingItem.carbsPer100g * (parseInt(addQuantity) || 0) / 100)}g</span>
                        <span className="text-red-400 text-[11px]">Zs: {Math.round(addingItem.fatPer100g * (parseInt(addQuantity) || 0) / 100)}g</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={addFoodItem}
                    className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#3366FF] to-[#12CFA6] text-white text-sm shadow-lg active:scale-[0.98] transition-transform"
                    style={{ fontWeight: 600 }}
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    {t('manualInput.addToMeal')}
                  </button>
                </div>
              ) : (
                /* Search Results */
                <div className="flex-1 overflow-y-auto px-5 py-3">
                  {searchQuery.length >= 2 ? (
                    searchResults.length > 0 ? (
                      <div className="space-y-1.5">
                        {searchResults.map((food, i) => (
                          <button
                            key={`${food.name}-${i}`}
                            onClick={() => {
                              setAddingItem(food);
                              if (navigator.vibrate) navigator.vibrate(10);
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-teal-100 dark:from-blue-900/30 dark:to-teal-900/30 flex items-center justify-center">
                              <UtensilsCrossed className="w-3.5 h-3.5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-white truncate" style={{ fontWeight: 500 }}>{food.name}</p>
                              <p className="text-[10px] text-gray-400">{food.caloriesPer100g} kcal/100g · {food.category}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">{t('foods.noResults')}</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8">
                      <Search className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 dark:text-gray-500">{t('manualInput.typeToSearch')}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar (fixed bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl border-t border-gray-100 dark:border-[#2a2a2a] px-4 py-3 z-30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-gray-400" style={{ fontWeight: 500 }}>
            {t('manualInput.progress')}
          </span>
          <span className="text-[10px] text-blue-500" style={{ fontWeight: 600 }}>
            {Math.round((completedDaysCount / TOTAL_DAYS) * 100)}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-[#252525] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#3366FF] to-[#12CFA6] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(completedDaysCount / TOTAL_DAYS) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}