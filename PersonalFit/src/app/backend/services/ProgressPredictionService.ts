/**
 * Progress prediction: weight / body fat trajectory from calorie deficit.
 * 1 kg fat ≈ 7700 kcal.
 */

export interface ProgressSnapshot {
  day: number;
  date: string; // ISO date YYYY-MM-DD
  predictedWeight: number;
  predictedBodyFat?: number;
  cumulativeDeficit: number;
  estimatedFatLoss: number; // kg
}

export interface ProgressPredictionInput {
  currentWeight: number; // kg
  currentBodyFat?: number; // %
  dailyCalorieTarget: number;
  dailyCaloriesBurned: number; // from workout
  workoutsPerWeek: number;
  targetWeight?: number;
}

export class ProgressPredictionService {
  // 1 kg zsír = 7700 kcal
  static readonly KCAL_PER_KG = 7700;

  static predict(input: ProgressPredictionInput, days: number = 90): ProgressSnapshot[] {
    const snapshots: ProgressSnapshot[] = [];
    const dailyDeficit = input.dailyCaloriesBurned - input.dailyCalorieTarget;
    // napi átlag: edzésnapok + pihenőnapok átlaga
    const avgDailyDeficit =
      (input.workoutsPerWeek * (dailyDeficit + 300) +
        (7 - input.workoutsPerWeek) * dailyDeficit) /
      7;

    const startWeight = input.currentWeight;
    let totalDeficit = 0;

    for (let day = 1; day <= days; day++) {
      totalDeficit += avgDailyDeficit;
      const fatLoss = totalDeficit / this.KCAL_PER_KG;
      const weight = startWeight - fatLoss;

      const date = new Date();
      date.setDate(date.getDate() + day);

      snapshots.push({
        day,
        date: date.toISOString().split('T')[0],
        predictedWeight: Math.max(weight, 40), // min 40kg
        cumulativeDeficit: totalDeficit,
        estimatedFatLoss: Math.max(0, fatLoss),
        predictedBodyFat:
          input.currentBodyFat != null
            ? Math.max(
                5,
                input.currentBodyFat - (fatLoss / input.currentWeight) * 100
              )
            : undefined,
      });
    }
    return snapshots;
  }

  /** Milestone: mikor éri el a célsúlyt? */
  static getMilestones(
    snapshots: ProgressSnapshot[],
    targetWeight: number
  ): {
    targetReachDate: string | null;
    targetReachDay: number | null;
    weightAt30Days?: number;
    weightAt60Days?: number;
    weightAt90Days?: number;
  } {
    const hit = snapshots.find((s) => s.predictedWeight <= targetWeight);
    return {
      targetReachDate: hit?.date ?? null,
      targetReachDay: hit?.day ?? null,
      weightAt30Days: snapshots[29]?.predictedWeight,
      weightAt60Days: snapshots[59]?.predictedWeight,
      weightAt90Days: snapshots[89]?.predictedWeight,
    };
  }

  /** Heti bontás chart-hoz */
  static getWeeklySnapshots(
    snapshots: ProgressSnapshot[]
  ): ProgressSnapshot[] {
    return snapshots.filter((s) => s.day % 7 === 0);
  }
}
