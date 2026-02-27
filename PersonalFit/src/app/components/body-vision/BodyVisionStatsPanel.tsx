/**
 * BodyVisionStatsPanel
 * Displays the scientifically-computed prediction data:
 *  - Energy balance (TDEE, intake, exercise, deficit)
 *  - Predicted body composition changes
 *  - Weekly projection breakdown
 *  - Confidence indicator & disclaimer
 */

import { useState } from "react";
import { Activity, Flame, TrendingDown, TrendingUp, Dumbbell, Scale, AlertTriangle, ChevronDown, ChevronUp, Info, Zap } from "lucide-react";
import { DSMCard, DSMSectionTitle } from "../dsm";
import type { BodyPrediction } from "../../hooks/useBodyPrediction";

interface Props {
  prediction: BodyPrediction;
  monthsInvested: number;
}

export function BodyVisionStatsPanel({ prediction, monthsInvested }: Props) {
  const [showWeekly, setShowWeekly] = useState(false);

  const confidenceColor = {
    low: 'text-amber-500',
    medium: 'text-blue-500',
    high: 'text-green-500',
  }[prediction.confidenceLevel];

  const confidenceLabel = {
    low: 'Alacsony (kevés adat)',
    medium: 'Közepes',
    high: 'Magas',
  }[prediction.confidenceLevel];

  return (
    <div className="space-y-3">
      {/* Energy Balance Card */}
      <DSMCard>
        <DSMSectionTitle icon={Zap} iconColor="text-amber-500" title="Energia merleg" className="mb-3" />

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-orange-50 rounded-xl p-2.5 border border-orange-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[10px] text-orange-600 font-medium">Napi bevitel</span>
            </div>
            <div className="text-orange-700 font-bold" style={{ fontSize: '1.1rem' }}>
              {prediction.avgDailyIntake} <span className="text-xs font-medium">kcal</span>
            </div>
            <div className="text-[9px] text-orange-400 mt-0.5">Cel: {prediction.dailyTarget} kcal</div>
          </div>

          <div className="bg-blue-50 rounded-xl p-2.5 border border-blue-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] text-blue-600 font-medium">Napi TDEE + sport</span>
            </div>
            <div className="text-blue-700 font-bold" style={{ fontSize: '1.1rem' }}>
              {prediction.currentTDEE + prediction.avgDailyExerciseBurn} <span className="text-xs font-medium">kcal</span>
            </div>
            <div className="text-[9px] text-blue-400 mt-0.5">
              BMR: {prediction.currentBMR} + sport: {prediction.avgDailyExerciseBurn}
            </div>
          </div>
        </div>

        {/* Daily deficit/surplus */}
        <div className={`rounded-xl p-3 border ${prediction.isDeficit ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {prediction.isDeficit ? (
                <TrendingDown className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingUp className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-xs font-bold ${prediction.isDeficit ? 'text-green-700' : 'text-red-700'}`}>
                Napi {prediction.isDeficit ? 'deficit' : 'tobblet'}
              </span>
            </div>
            <span className={`font-bold ${prediction.isDeficit ? 'text-green-700' : 'text-red-700'}`} style={{ fontSize: '1.15rem' }}>
              {prediction.isDeficit ? '-' : '+'}{Math.abs(prediction.dailyNetDeficit)} kcal
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[10px]">
            <span className={prediction.isDeficit ? 'text-green-500' : 'text-red-500'}>
              Heti: {prediction.isDeficit ? '-' : '+'}{Math.abs(prediction.weeklyNetDeficit).toLocaleString()} kcal
            </span>
            <span className={prediction.isDeficit ? 'text-green-500' : 'text-red-500'}>
              Havi: {prediction.isDeficit ? '-' : '+'}{Math.abs(prediction.monthlyNetDeficit).toLocaleString()} kcal
            </span>
          </div>
        </div>

        {/* Workout frequency */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-1.5">
            <Dumbbell className="w-3 h-3 text-purple-500" />
            <span className="text-[10px] text-gray-500">Edzes: {prediction.avgWorkoutDaysPerWeek} nap/het, ~{prediction.avgWorkoutMinutesPerDay} perc/nap</span>
          </div>
          {prediction.hasResistanceTraining && (
            <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">Ero</span>
          )}
        </div>
      </DSMCard>

      {/* Prediction Results Card */}
      <DSMCard>
        <DSMSectionTitle
          icon={Scale}
          iconColor="text-green-600"
          title={`${monthsInvested} honapos elorejelzes`}
          className="mb-3"
        />

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-green-50 rounded-xl p-2 text-center border border-green-100">
            <div className="text-green-700 font-bold" style={{ fontSize: '1.05rem' }}>
              -{prediction.predictedFatLossKg} kg
            </div>
            <div className="text-[9px] text-green-500">Zsirvezstes</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-2 text-center border border-blue-100">
            <div className="text-blue-700 font-bold" style={{ fontSize: '1.05rem' }}>
              +{prediction.predictedMuscleGainKg} kg
            </div>
            <div className="text-[9px] text-blue-500">Izomepites</div>
          </div>
          <div className={`rounded-xl p-2 text-center border ${prediction.predictedNetWeightChangeKg <= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <div className={`font-bold ${prediction.predictedNetWeightChangeKg <= 0 ? 'text-emerald-700' : 'text-red-700'}`} style={{ fontSize: '1.05rem' }}>
              {prediction.predictedNetWeightChangeKg > 0 ? '+' : ''}{prediction.predictedNetWeightChangeKg} kg
            </div>
            <div className={`text-[9px] ${prediction.predictedNetWeightChangeKg <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Netto valtozas</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-gray-700 font-bold text-sm">{prediction.predictedNewWeight} kg</div>
            <div className="text-[9px] text-gray-400">Becsult suly</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-gray-700 font-bold text-sm">-{Math.abs(prediction.predictedBodyFatPctChange)}%</div>
            <div className="text-[9px] text-gray-400">Testzsir %</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-gray-700 font-bold text-sm">-{prediction.predictedWaistReductionCm} cm</div>
            <div className="text-[9px] text-gray-400">Derekboseg</div>
          </div>
        </div>

        {/* Confidence */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Info className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-400">
              Megbizhatosag: <span className={`font-bold ${confidenceColor}`}>{confidenceLabel}</span>
            </span>
          </div>
          <span className="text-[9px] text-gray-300">{prediction.dataPointsUsed} adatpont</span>
        </div>
      </DSMCard>

      {/* Weekly Breakdown (collapsible) */}
      <DSMCard padding="sm">
        <button
          onClick={() => setShowWeekly(!showWeekly)}
          className="w-full flex items-center justify-between p-1"
        >
          <DSMSectionTitle icon={Activity} iconColor="text-indigo-500" title="Heti bontas" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400">{prediction.weeklyProjections.length} het</span>
            {showWeekly ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>

        {showWeekly && (
          <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
            {prediction.weeklyProjections.map((week) => (
              <div key={week.weekNumber} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg text-[10px]">
                <span className="w-10 text-gray-500 font-medium">{week.weekNumber}. het</span>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-red-500">-{week.projectedFatLossKg.toFixed(2)} kg zsir</span>
                  <span className="text-blue-500">+{week.projectedMuscleGainKg.toFixed(2)} kg izom</span>
                </div>
                <span className="font-bold text-gray-700">{week.projectedWeightKg} kg</span>
              </div>
            ))}
          </div>
        )}
      </DSMCard>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-[9px] text-amber-700 leading-relaxed">
          {prediction.disclaimer}
        </p>
      </div>
    </div>
  );
}
