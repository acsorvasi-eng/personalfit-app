import { useState } from "react";
import { usePlanData } from "../hooks/usePlanData";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { useLanguage } from "../contexts/LanguageContext";
import { getLocaleMonth, getLocaleDayShort } from "../contexts/LanguageContext";

export function MonthlyMenu() {
  const today = new Date();
  const { planData } = usePlanData();
  const { t, language, locale } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // ── Locale helpers ───
  const getMonthName = (monthIndex: number) => {
    const d = new Date(selectedYear, monthIndex, 1);
    return getLocaleMonth(d, language);
  };

  const getMonthShort = (monthIndex: number) => {
    const d = new Date(selectedYear, monthIndex, 1);
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
  };

  const getDayName = (date: Date) => {
    return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
    setExpandedDay(null);
  };

  const getMealForDay = (dayOfMonth: number) => {
    const planDay = ((dayOfMonth - 1) % 28);
    const weekIndex = Math.floor(planDay / 7);
    const dayIndex = planDay % 7;
    
    const week = planData[weekIndex];
    const day = week?.days[dayIndex];
    
    return {
      week: week || { week: weekIndex + 1, summary: { avgCalories: '-', protein: '-', carbs: '-', fat: '-', expectedWeightLoss: '-' }, days: [] },
      day: day || { day: dayIndex + 1, isTrainingDay: false, dayLabel: '', breakfast: [], lunch: [], dinner: [] },
      weekNumber: weekIndex + 1,
      dayInPlan: planDay + 1
    };
  };

  const toggleDay = (dateKey: string) => {
    setExpandedDay(expandedDay === dateKey ? null : dateKey);
  };

  const isTodayCheck = (day: number) => {
    return day === today.getDate() && 
           selectedMonth === today.getMonth() && 
           selectedYear === today.getFullYear();
  };

  const isPast = (day: number) => {
    const dateToCheck = new Date(selectedYear, selectedMonth, day);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dateToCheck < todayMidnight;
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={CalendarIcon}
        title={t('monthly.title')}
        subtitle={`${getMonthName(selectedMonth)} ${selectedYear} - 28 ${t('menu.dayPlan')}`}
        gradientFrom="from-blue-400"
        gradientTo="to-indigo-500"
        stats={[
          {
            label: t('monthly.daysCount'),
            value: daysInMonth
          },
          {
            label: t('menu.currentDay'),
            value: today.getDate()
          }
        ]}
      />

      <div className="px-4 space-y-6">
        {/* Month Navigation Header */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900">
                {getMonthName(selectedMonth)} {selectedYear}
              </h2>
              <p className="text-xs text-gray-600">
                28 {t('menu.planRepeats')}
              </p>
            </div>

            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Days List */}
        <div className="space-y-2">
          {days.map((day) => {
            const date = new Date(selectedYear, selectedMonth, day);
            const dayName = getDayName(date);
            const monthShort = getMonthShort(selectedMonth);
            const dateKey = `${selectedYear}-${selectedMonth}-${day}`;
            const mealData = getMealForDay(day);
            const todayFlag = isTodayCheck(day);
            const pastFlag = isPast(day);

            return (
              <div 
                key={dateKey} 
                className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${
                  todayFlag ? 'border-blue-500' : 'border-transparent'
                }`}
              >
                <button
                  onClick={() => toggleDay(dateKey)}
                  className={`w-full px-4 py-4 flex items-center justify-between transition-all ${
                    todayFlag 
                      ? 'bg-gradient-to-r from-blue-50 to-teal-50' 
                      : pastFlag 
                      ? 'bg-gray-50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center font-bold ${
                      todayFlag 
                        ? 'bg-blue-500 text-white' 
                        : pastFlag
                        ? 'bg-gray-300 text-gray-600'
                        : 'bg-blue-500 text-white'
                    }`}>
                      <span className="text-lg leading-tight">{day}</span>
                      <span className="text-[10px] leading-tight opacity-80">{monthShort}</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">
                        {day} {monthShort} - {dayName}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {t('menu.day')} {mealData.dayInPlan} • {mealData.week.week}. {t('common.week')}
                        {todayFlag && <span className="ml-2 text-blue-600 font-semibold">• {t('menu.today').toUpperCase()}</span>}
                      </p>
                    </div>
                  </div>
                  {expandedDay === dateKey ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>

                {expandedDay === dateKey && (
                  <div className="px-4 pb-4 space-y-3 bg-gray-50">
                    {/* Breakfast */}
                    <MealSection
                      title={`🌅 ${t('menu.breakfast')} (06:00-08:00)`}
                      meals={mealData.day.breakfast}
                    />
                    {/* Lunch */}
                    <MealSection
                      title={`☀️ ${t('menu.lunch')} (12:30-13:30)`}
                      meals={mealData.day.lunch}
                    />
                    {/* Dinner */}
                    <MealSection
                      title={`🌙 ${t('menu.dinner')} (17:30-18:30)`}
                      meals={mealData.day.dinner}
                    />
                    
                    {/* Week Summary for this day */}
                    <div className="bg-white rounded-lg p-3 mt-3">
                      <h5 className="font-semibold text-xs text-gray-700 mb-2">
                        {t('monthly.weeklyAvg')} ({mealData.week.week}. {t('common.week')})
                      </h5>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">{t('monthly.calories')}:</span>
                          <p className="font-medium text-gray-900">{mealData.week.summary.avgCalories}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('menu.protein')}:</span>
                          <p className="font-medium text-gray-900">{mealData.week.summary.protein}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('monthly.loss')}:</span>
                          <p className="font-medium text-green-600">{mealData.week.summary.expectedWeightLoss}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface MealSectionProps {
  title: string;
  meals: any[];
}

function MealSection({ title, meals }: MealSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-lg p-3">
      <h5 className="font-semibold text-sm text-gray-900 mb-2">{title}</h5>
      <div className="space-y-2">
        {meals.map((meal, index) => (
          <div key={meal.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-sm text-gray-900">
                {meals.length > 1 ? `${t('monthly.option')} ${index + 1}: ` : ""}{meal.name}
              </span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {meal.calories}
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-2">{meal.description}</p>
            <div className="flex flex-wrap gap-1">
              {meal.ingredients.slice(0, 4).map((ingredient: string, idx: number) => (
                <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                  {ingredient}
                </span>
              ))}
              {meal.ingredients.length > 4 && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                  +{meal.ingredients.length - 4} {t('menu.more')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
