import { useState } from "react";
import { usePlanData } from "../hooks/usePlanData";
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export function WeeklyMenu() {
  const [expandedWeek, setExpandedWeek] = useState(0);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const { planData } = usePlanData();
  const { t } = useLanguage();

  const toggleWeek = (weekIndex: number) => {
    if (expandedWeek === weekIndex) {
      setExpandedWeek(-1);
      setExpandedDay(null);
    } else {
      setExpandedWeek(weekIndex);
      setExpandedDay(0);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setExpandedDay(expandedDay === dayIndex ? null : dayIndex);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('weeklyMenu.title')}</h2>
        </div>
        <p className="text-sm text-gray-600">
          {t('weeklyMenu.scrollHint')}
        </p>
      </div>

      {planData.map((week, weekIndex) => (
        <div key={weekIndex} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => toggleWeek(weekIndex)}
            className="w-full px-4 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-teal-50 hover:from-blue-100 hover:to-teal-100 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                {weekIndex + 1}
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">{week.week}. {t('weeklyMenu.weekLabel')}</h3>
                <p className="text-xs text-gray-500">{week.summary.avgCalories}</p>
              </div>
            </div>
            {expandedWeek === weekIndex ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {expandedWeek === weekIndex && (
            <div className="p-4 space-y-4">
              {/* Week Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">{t('weeklyMenu.weeklySummary')}</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-600">{t('weeklyMenu.avgCalories')}:</span>
                    <p className="font-medium text-gray-900">{week.summary.avgCalories}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('weeklyMenu.protein')}:</span>
                    <p className="font-medium text-gray-900">{week.summary.protein}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">{t('weeklyMenu.carbs')}:</span>
                    <p className="font-medium text-gray-900">{week.summary.carbs}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('weeklyMenu.fat')}:</span>
                    <p className="font-medium text-gray-900">{week.summary.fat}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('weeklyMenu.expectedLoss')}:</span>
                    <p className="font-semibold text-green-600">{week.summary.expectedWeightLoss}</p>
                  </div>
                </div>
              </div>

              {/* Days */}
              <div className="space-y-2">
                {week.days.map((day, dayIndex) => (
                  <div key={dayIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleDay(dayIndex)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-700">
                          {dayIndex + 1}
                        </div>
                        <span className="font-medium text-gray-900">
                          {dayIndex + 1}. {t('weeklyMenu.dayLabel')}
                        </span>
                      </div>
                      {expandedDay === dayIndex ? (
                        <ChevronUp className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      )}
                    </button>

                    {expandedDay === dayIndex && (
                      <div className="px-4 pb-4 space-y-3 bg-gray-50">
                        {/* Breakfast */}
                        <MealSection
                          title={`🌅 ${t('weeklyMenu.breakfast')}`}
                          meals={day.breakfast}
                          optionLabel={t('weeklyMenu.option')}
                          moreLabel={t('weeklyMenu.more')}
                        />
                        {/* Lunch */}
                        <MealSection
                          title={`☀️ ${t('weeklyMenu.lunch')}`}
                          meals={day.lunch}
                          optionLabel={t('weeklyMenu.option')}
                          moreLabel={t('weeklyMenu.more')}
                        />
                        {/* Dinner */}
                        <MealSection
                          title={`🌙 ${t('weeklyMenu.dinner')}`}
                          meals={day.dinner}
                          optionLabel={t('weeklyMenu.option')}
                          moreLabel={t('weeklyMenu.more')}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface MealSectionProps {
  title: string;
  meals: any[];
  optionLabel: string;
  moreLabel: string;
}

function MealSection({ title, meals, optionLabel, moreLabel }: MealSectionProps) {
  return (
    <div className="bg-white rounded-lg p-3">
      <h5 className="font-semibold text-sm text-gray-900 mb-2">{title}</h5>
      <div className="space-y-2">
        {meals.map((meal, index) => (
          <div key={meal.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-sm text-gray-900">
                {meals.length > 1 ? `${optionLabel} ${index + 1}: ` : ""}{meal.name}
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
                  +{meal.ingredients.length - 4} {moreLabel}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
