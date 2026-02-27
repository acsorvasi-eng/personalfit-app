import { useState, useEffect } from "react";
import { usePlanData } from "../hooks/usePlanData";
import { ChevronRight, Check, Clock, AlertCircle, Droplet, ChevronDown, Utensils, Calendar } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { useLanguage } from "../contexts/LanguageContext";
import { getLocaleDayNarrow } from "../contexts/LanguageContext";

export function DailyMenu() {
  const { t, language, locale } = useLanguage();
  const { planData } = usePlanData();
  // Get real current date
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMeals, setSelectedMeals] = useState<Record<string, string>>({});
  const [checkedMeals, setCheckedMeals] = useState<Set<string>>(new Set());
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Calculate which day of month (1-28 for Feb 2026)
  const dayOfMonth = selectedDate.getDate();
  const currentDayOfMonth = currentTime.getDate();
  const currentMonth = currentTime.getMonth();
  const selectedMonth = selectedDate.getMonth();
  
  // Calculate week and day indices for meal plan - cycles through 28-day plan
  const calculateWeekAndDay = (date: Date) => {
    const day = date.getDate();
    // Use modulo to cycle through the 28-day plan
    const planDay = ((day - 1) % 28);
    const weekIndex = Math.floor(planDay / 7); // 0-3 for weeks 1-4
    const dayIndex = planDay % 7; // 0-6 for days within week
    return { week: weekIndex, day: dayIndex };
  };

  const { week: currentWeek, day: currentDay } = calculateWeekAndDay(selectedDate);
  const today = planData[currentWeek]?.days[currentDay];

  // Check if selected date is today
  const isToday = dayOfMonth === currentDayOfMonth && 
                  selectedMonth === currentMonth && 
                  selectedDate.getFullYear() === currentTime.getFullYear();

  // Check if selected date is in the future
  const isFutureDate = selectedDate > currentTime;

  // Check if selected date is in the past
  const isPastDate = !isToday && !isFutureDate;

  // Get current time details
  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinutes;

  // Meal time windows (in minutes from midnight)
  const BREAKFAST_START = 6 * 60; // 06:00
  const BREAKFAST_END = 8 * 60; // 08:00
  const LUNCH_START = 12 * 60 + 30; // 12:30
  const LUNCH_END = 13 * 60 + 30; // 13:30
  const DINNER_START = 17 * 60 + 30; // 17:30
  const DINNER_END = 18 * 60 + 30; // 18:30

  // Determine current meal phase and what can be checked
  const getMealStatus = () => {
    if (!isToday) {
      return {
        currentMeal: null,
        canCheckBreakfast: false,
        canCheckLunch: false,
        canCheckDinner: false,
        breakfastPassed: isPastDate,
        lunchPassed: isPastDate,
        dinnerPassed: isPastDate,
        isInEatingWindow: false,
        nextMealTime: null,
        restingTimeMinutes: 0,
      };
    }

    const breakfastPassed = currentTimeInMinutes > BREAKFAST_END;
    const lunchPassed = currentTimeInMinutes > LUNCH_END;
    const dinnerPassed = currentTimeInMinutes > DINNER_END;

    const inBreakfastWindow = currentTimeInMinutes >= BREAKFAST_START && currentTimeInMinutes <= BREAKFAST_END;
    const inLunchWindow = currentTimeInMinutes >= LUNCH_START && currentTimeInMinutes <= LUNCH_END;
    const inDinnerWindow = currentTimeInMinutes >= DINNER_START && currentTimeInMinutes <= DINNER_END;

    const isInEatingWindow = inBreakfastWindow || inLunchWindow || inDinnerWindow;

    let currentMeal = null;
    let nextMealTime = null;
    let restingTimeMinutes = 0;
    
    if (inBreakfastWindow) {
      currentMeal = "breakfast";
      nextMealTime = null; // Currently eating
    } else if (inLunchWindow) {
      currentMeal = "lunch";
      nextMealTime = null; // Currently eating
    } else if (inDinnerWindow) {
      currentMeal = "dinner";
      nextMealTime = null; // Currently eating
    } else if (!breakfastPassed) {
      currentMeal = "breakfast"; // upcoming
      nextMealTime = BREAKFAST_START;
      restingTimeMinutes = BREAKFAST_START - currentTimeInMinutes;
    } else if (!lunchPassed) {
      currentMeal = "lunch"; // upcoming
      nextMealTime = LUNCH_START;
      restingTimeMinutes = LUNCH_START - currentTimeInMinutes;
    } else if (!dinnerPassed) {
      currentMeal = "dinner"; // upcoming
      nextMealTime = DINNER_START;
      restingTimeMinutes = DINNER_START - currentTimeInMinutes;
    } else {
      // After dinner - calculate time until tomorrow's breakfast
      const minutesUntilMidnight = (24 * 60) - currentTimeInMinutes;
      restingTimeMinutes = minutesUntilMidnight + BREAKFAST_START;
      currentMeal = "breakfast";
      nextMealTime = BREAKFAST_START;
    }

    return {
      currentMeal,
      canCheckBreakfast: inBreakfastWindow,
      canCheckLunch: inLunchWindow,
      canCheckDinner: inDinnerWindow,
      breakfastPassed,
      lunchPassed,
      dinnerPassed,
      isInEatingWindow,
      nextMealTime,
      restingTimeMinutes,
    };
  };

  const mealStatus = getMealStatus();

  const totalCalories = Array.from(checkedMeals).reduce((sum, mealId) => {
    const meal = findMealById(mealId);
    if (meal) {
      const calories = parseInt(meal.calories.replace(/[^0-9]/g, "")) || 0;
      return sum + calories;
    }
    return sum;
  }, 0);

  function findMealById(id: string) {
    for (const week of planData) {
      for (const day of week.days) {
        const allMeals = [...day.breakfast, ...day.lunch, ...day.dinner];
        const meal = allMeals.find(m => m.id === id);
        if (meal) return meal;
      }
    }
    return null;
  }

  const handleMealSelect = (mealId: string, mealType: string) => {
    setSelectedMeals(prev => ({
      ...prev,
      [mealType]: mealId
    }));
    setExpandedMeal(null);
  };

  const handleMealCheck = (mealId: string, mealType: string) => {
    // Only allow checking if it's today and within the meal window
    if (!isToday) return;
    
    if (mealType === "breakfast" && !mealStatus.canCheckBreakfast) return;
    if (mealType === "lunch" && !mealStatus.canCheckLunch) return;
    if (mealType === "dinner" && !mealStatus.canCheckDinner) return;

    setCheckedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  };

  const selectedBreakfast = selectedMeals.breakfast 
    ? today?.breakfast.find(m => m.id === selectedMeals.breakfast) 
    : today?.breakfast[0];
  
  const selectedLunch = selectedMeals.lunch 
    ? today?.lunch.find(m => m.id === selectedMeals.lunch) 
    : today?.lunch[0];
  
  const selectedDinner = selectedMeals.dinner 
    ? today?.dinner.find(m => m.id === selectedMeals.dinner) 
    : today?.dinner[0];

  // Generate 7-day calendar view centered on selected date
  const generateCalendarDays = () => {
    const days = [];
    const centerDate = new Date(selectedDate);
    
    for (let i = -3; i <= 3; i++) {
      const date = new Date(centerDate);
      date.setDate(centerDate.getDate() + i);
      
      // Only show dates within February 2026 (1-28)
      const dateDay = date.getDate();
      const dateMonth = date.getMonth();
      const dateYear = date.getFullYear();
      
      if (dateYear === 2026 && dateMonth === 1 && dateDay >= 1 && dateDay <= 28) {
        const isCurrentDay = dateDay === currentDayOfMonth && 
                             dateMonth === currentMonth && 
                             dateYear === currentTime.getFullYear();
        
        days.push({
          date: dateDay,
          fullDate: new Date(date),
          isSelected: dateDay === dayOfMonth,
          isToday: isCurrentDay,
          dayOfWeek: getLocaleDayNarrow(date, language),
        });
      } else {
        days.push(null); // Invalid date (out of February range)
      }
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  const handleDateSelect = (date: Date | null) => {
    if (!date) return;
    const day = date.getDate();
    // Only allow dates 1-28 in February 2026
    if (day >= 1 && day <= 28 && date.getMonth() === 1 && date.getFullYear() === 2026) {
      setSelectedDate(new Date(date));
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        icon={Utensils}
        title={t("daily.title")}
        subtitle={selectedDate.toLocaleDateString(locale, { 
          month: 'long', 
          day: 'numeric' 
        })}
        gradientFrom="from-blue-400"
        gradientTo="to-emerald-500"
        stats={[
          {
            label: t("daily.consumed"),
            value: totalCalories,
            suffix: "kcal"
          },
          {
            label: t("daily.week"),
            value: currentWeek + 1,
            suffix: "/4"
          }
        ]}
      />

      <div className="px-6 space-y-8">
        {/* Calendar Day Selector */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h3 className="font-bold text-gray-900">{t("menu.calendar")}</h3>
            {isToday && <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">{t("menu.today")}</span>}
            {isFutureDate && <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">{t("menu.future")}</span>}
            {isPastDate && <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-semibold">{t("menu.past")}</span>}
          </div>

          {/* 7-Day Calendar View */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={index} className="aspect-square" />;
              }
              return (
                <button
                  key={index}
                  onClick={() => handleDateSelect(day.fullDate)}
                  className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all ${
                    day.isSelected
                      ? "bg-blue-500 text-white shadow-lg scale-110 ring-2 ring-blue-300"
                      : day.isToday
                      ? "bg-blue-100 text-blue-700 font-semibold ring-2 ring-blue-400"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-xs font-medium mb-1">{day.dayOfWeek}</span>
                  <span className={`text-lg font-bold ${
                    day.isSelected ? "text-white" : day.isToday ? "text-blue-700" : "text-gray-900"
                  }`}>
                    {day.date}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Time Display */}
          {isToday && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                {t('common.currentTime')}: {currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Warning for past/future dates */}
        {!isToday && (
          <div className={`rounded-xl p-4 flex items-start gap-3 ${
            isPastDate ? "bg-gray-50 border border-gray-200" : "bg-blue-50 border border-blue-200"
          }`}>
            <AlertCircle className={`w-5 h-5 mt-0.5 ${isPastDate ? "text-gray-500" : "text-blue-500"}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${isPastDate ? "text-gray-700" : "text-blue-700"}`}>
                {isPastDate ? t("menu.pastDate") : t("menu.futureDate")}
              </p>
              <p className={`text-xs ${isPastDate ? "text-gray-600" : "text-blue-600"}`}>
                {isPastDate 
                  ? t("menu.pastDateMsg")
                  : t("menu.futureDateMsg")}
              </p>
            </div>
          </div>
        )}

        {/* Fasting Period Overlay - Only show on today outside eating windows */}
        {isToday && !mealStatus.isInEatingWindow && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-2 border-indigo-200/50 p-8 shadow-lg">
            {/* Soft decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/20 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-200/20 to-transparent rounded-full blur-3xl" />
            
            <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
              {/* Relaxing droplet icon */}
              <div className="relative">
                <Droplet className="w-20 h-20 text-indigo-400 animate-pulse" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-0 w-20 h-20 bg-indigo-300/20 rounded-full blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
              </div>
              
              <div className="text-center space-y-3">
                {/* Resting Time Display */}
                <div className="space-y-1">
                  <div className="text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {Math.floor(mealStatus.restingTimeMinutes / 60)}:{String(mealStatus.restingTimeMinutes % 60).padStart(2, '0')}
                  </div>
                  <p className="text-sm text-indigo-500 font-medium">{t("menu.restingTime")}</p>
                </div>
                
                <p className="text-lg font-semibold text-indigo-700">{t("menu.fastingPeriod")}</p>
                <p className="text-sm text-indigo-600 max-w-md leading-relaxed">
                  {t("menu.hydrate")}
                </p>
                <p className="text-xs text-purple-500 italic bg-purple-50/50 px-4 py-2 rounded-full inline-block">
                  {t("menu.allowed")}
                </p>
              </div>
              
              {/* Next meal indicator */}
              <div className="flex items-center gap-3 text-sm text-indigo-700 bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm border border-indigo-100">
                <Droplet className="w-4 h-4 text-indigo-500" />
                <span className="font-medium">{t("menu.nextMeal")}:</span>
                <span className="font-bold">
                  {mealStatus.currentMeal === "breakfast" && `06:00 (${t("menu.breakfast")})`}
                  {mealStatus.currentMeal === "lunch" && `12:30 (${t("menu.lunch")})`}
                  {mealStatus.currentMeal === "dinner" && `17:30 (${t("menu.dinner")})`}
                </span>
              </div>
              
              {/* Relaxing message */}
              <p className="text-xs text-center text-indigo-400 italic max-w-sm">
                {t("menu.relax")}
              </p>
            </div>
          </div>
        )}

        {/* Meals - fixed order: Breakfast, Lunch, Dinner */}
        <div className="space-y-4">
          <MealCard
            title={t("menu.breakfast")}
            time="06:00 - 08:00"
            icon="🌅"
            meals={today?.breakfast || []}
            selectedMeal={selectedBreakfast}
            mealType="breakfast"
            expanded={expandedMeal === "breakfast"}
            onExpand={() => setExpandedMeal(expandedMeal === "breakfast" ? null : "breakfast")}
            onSelect={handleMealSelect}
            checked={selectedBreakfast ? checkedMeals.has(selectedBreakfast.id) : false}
            onCheck={() => selectedBreakfast && handleMealCheck(selectedBreakfast.id, "breakfast")}
            isCurrent={mealStatus.currentMeal === "breakfast"}
            isPassed={mealStatus.breakfastPassed}
            canCheck={mealStatus.canCheckBreakfast}
            isToday={isToday}
          />
          
          <MealCard
            title={t("menu.lunch")}
            time="12:30 - 13:30"
            icon="☀️"
            meals={today?.lunch || []}
            selectedMeal={selectedLunch}
            mealType="lunch"
            expanded={expandedMeal === "lunch"}
            onExpand={() => setExpandedMeal(expandedMeal === "lunch" ? null : "lunch")}
            onSelect={handleMealSelect}
            checked={selectedLunch ? checkedMeals.has(selectedLunch.id) : false}
            onCheck={() => selectedLunch && handleMealCheck(selectedLunch.id, "lunch")}
            isCurrent={mealStatus.currentMeal === "lunch"}
            isPassed={mealStatus.lunchPassed}
            canCheck={mealStatus.canCheckLunch}
            isToday={isToday}
          />
          
          <MealCard
            title={t("menu.dinner")}
            time="17:30 - 18:30"
            icon="🌙"
            meals={today?.dinner || []}
            selectedMeal={selectedDinner}
            mealType="dinner"
            expanded={expandedMeal === "dinner"}
            onExpand={() => setExpandedMeal(expandedMeal === "dinner" ? null : "dinner")}
            onSelect={handleMealSelect}
            checked={selectedDinner ? checkedMeals.has(selectedDinner.id) : false}
            onCheck={() => selectedDinner && handleMealCheck(selectedDinner.id, "dinner")}
            isCurrent={mealStatus.currentMeal === "dinner"}
            isPassed={mealStatus.dinnerPassed}
            canCheck={mealStatus.canCheckDinner}
            isToday={isToday}
          />
        </div>

        {/* Weekly Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">
            {currentWeek + 1}. {t("menu.weeklySummary")}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t("menu.avgCalories")}:</span>
              <span className="font-medium">{planData[currentWeek]?.summary.avgCalories}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t("menu.protein")}:</span>
              <span className="font-medium">{planData[currentWeek]?.summary.protein}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t("menu.carbs")}:</span>
              <span className="font-medium text-xs">{planData[currentWeek]?.summary.carbs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t("menu.fat")}:</span>
              <span className="font-medium">{planData[currentWeek]?.summary.fat}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-blue-200">
              <span className="text-gray-600">{t("menu.expectedLoss")}:</span>
              <span className="font-semibold text-green-600">{planData[currentWeek]?.summary.expectedWeightLoss}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MealCardProps {
  title: string;
  time: string;
  icon: string;
  meals: any[];
  selectedMeal: any;
  mealType: string;
  expanded: boolean;
  onExpand: () => void;
  onSelect: (mealId: string, mealType: string) => void;
  checked: boolean;
  onCheck: () => void;
  isCurrent: boolean;
  isPassed: boolean;
  canCheck: boolean;
  isToday: boolean;
}

function MealCard({ 
  title, 
  time, 
  icon, 
  meals, 
  selectedMeal, 
  mealType, 
  expanded, 
  onExpand, 
  onSelect,
  checked,
  onCheck,
  isCurrent,
  isPassed,
  canCheck,
  isToday
}: MealCardProps) {
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse when checked or past
  useEffect(() => {
    if (checked || (isPassed && isToday)) {
      setIsCollapsed(true);
    }
  }, [checked, isPassed, isToday]);

  // Collapsed view (one line)
  if (isCollapsed) {
    return (
      <div className={`bg-white rounded-xl overflow-hidden transition-all border-2 ${
        checked ? "border-green-400 bg-green-50/30" : "border-gray-200"
      }`}>
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
              checked ? "bg-green-500" : "bg-gray-200"
            }`}>
              {checked ? <Check className="w-6 h-6 text-white" /> : icon}
            </div>
            <div className="text-left">
              <h3 className={`font-semibold ${checked ? "text-green-700 line-through" : "text-gray-500"}`}>
                {title}
              </h3>
              <span className="text-xs text-gray-400">{time}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedMeal && (
              <span className="text-sm text-gray-600 font-medium">
                {selectedMeal.calories}
              </span>
            )}
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </div>
        </button>
      </div>
    );
  }

  // Expanded view (normal)
  return (
    <div className={`bg-white rounded-xl overflow-hidden transition-all ${
      isCurrent && isToday
        ? "shadow-xl ring-4 ring-blue-400 ring-opacity-50 scale-[1.02]" 
        : isPassed && isToday
        ? "opacity-60"
        : "shadow-sm"
    }`}>
      {isCurrent && isToday && (
        <div className="bg-gradient-to-r from-blue-400 to-teal-400 px-4 py-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-white animate-pulse" />
          <span className="text-sm font-semibold text-white">
            {canCheck ? t("menu.eatingWindow") : t("menu.nextMeal")}
          </span>
        </div>
      )}
      {isPassed && isToday && !checked && (
        <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600">{t("menu.closed")}</span>
        </div>
      )}
      {checked && (
        <div className="bg-green-500 px-4 py-2 flex items-center gap-2">
          <Check className="w-4 h-4 text-white" />
          <span className="text-sm font-semibold text-white">{t("menu.consumed_check")} ✓</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
              isCurrent && isToday
                ? "bg-gradient-to-br from-blue-400 to-blue-500 shadow-lg" 
                : checked
                ? "bg-green-500"
                : isPassed && isToday
                ? "bg-gray-200"
                : "bg-gradient-to-br from-amber-100 to-amber-200"
            }`}>
              {checked ? <Check className="w-6 h-6 text-white" /> : icon}
            </div>
            <div>
              <h3 className={`font-semibold ${
                isCurrent && isToday ? "text-blue-700" : checked ? "text-green-700" : isPassed && isToday ? "text-gray-500" : "text-gray-900"
              }`}>
                {title}
              </h3>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{time}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onCheck}
            disabled={!canCheck}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
              checked
                ? "bg-green-500 border-green-500"
                : canCheck
                ? "border-gray-300 hover:border-blue-400 cursor-pointer"
                : "border-gray-200 cursor-not-allowed opacity-50"
            }`}
          >
            {checked && <Check className="w-5 h-5 text-white" />}
          </button>
        </div>

        {selectedMeal && (
          <div className={`rounded-lg p-3 mb-3 ${
            isCurrent && isToday ? "bg-blue-50 border border-blue-200" : checked ? "bg-green-50/50" : "bg-gray-50"
          }`}>
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-gray-900 text-sm">{selectedMeal.name}</h4>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                isCurrent && isToday
                  ? "text-blue-700 bg-blue-100" 
                  : checked
                  ? "text-green-700 bg-green-100"
                  : "text-blue-600 bg-blue-50"
              }`}>
                {selectedMeal.calories}
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-2">{selectedMeal.description}</p>
            <div className="flex flex-wrap gap-1">
              {selectedMeal.ingredients.slice(0, 3).map((ingredient: string, idx: number) => (
                <span key={idx} className="text-xs bg-white px-2 py-1 rounded-full text-gray-600">
                  {ingredient}
                </span>
              ))}
              {selectedMeal.ingredients.length > 3 && (
                <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-500">
                  +{selectedMeal.ingredients.length - 3} {t("menu.more")}
                </span>
              )}
            </div>
          </div>
        )}

        {meals.length > 1 && !checked && (
          <button
            onClick={onExpand}
            className="w-full flex items-center justify-between text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <span>{meals.length} {t("menu.options")}</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>

      {expanded && meals.length > 1 && !checked && (
        <div className="border-t border-gray-100 p-4 space-y-2 bg-gray-50">
          {meals.map((meal) => (
            <button
              key={meal.id}
              onClick={() => onSelect(meal.id, mealType)}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                selectedMeal?.id === meal.id
                  ? "bg-blue-100 border-2 border-blue-400"
                  : "bg-white border border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm text-gray-900">{meal.name}</span>
                <span className="text-xs font-semibold text-blue-600">{meal.calories}</span>
              </div>
              <p className="text-xs text-gray-600">{meal.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}