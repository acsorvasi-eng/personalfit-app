import { getUserProfile, saveUserProfile } from './UserProfileService';

const SLEEP_CYCLE_MINUTES = 90;
const FALL_ASLEEP_MINUTES = 14; // average time to fall asleep

export interface SleepCycle {
  cycleCount: number;
  sleepDuration: string; // "7h 45p"
  sleepDurationMinutes: number;
  bedtime: string; // "23:16"
  wakeTime: string; // "07:00"
  quality: 'minimum' | 'good' | 'optimal';
  label: string; // hu label
}

export interface SleepAnalysis {
  recommendedBedtimes: SleepCycle[]; // 3 options
  selectedCycles: number; // saved preference
  dailyCalorieAdjustment: number; // +150 if < 5 cycles
  circadianScore: number; // 0-100
  firstMealTime: string; // wake + 1h
  lastMealTime: string; // bed - 3h
  optimalWorkoutWindow: string; // wake + 1-3h
}

export class SleepService {
  /** Calculate optimal bedtimes from wake time */
  static getBedtimeOptions(wakeTimeStr: string): SleepCycle[] {
    const [wakeH, wakeM] = wakeTimeStr.split(':').map(Number);
    const wakeMinutes = wakeH * 60 + wakeM;
    const options: SleepCycle[] = [];

    // Calculate for 4, 5, 6, 7 cycles
    for (let cycles = 4; cycles <= 7; cycles++) {
      const sleepMinutes = cycles * SLEEP_CYCLE_MINUTES;
      const bedMinutes = wakeMinutes - sleepMinutes - FALL_ASLEEP_MINUTES;

      // Normalize to 0-1440
      const normalizedBed = ((bedMinutes % 1440) + 1440) % 1440;
      const bedH = Math.floor(normalizedBed / 60);
      const bedM = normalizedBed % 60;

      const bedtime = `${String(bedH).padStart(2, '0')}:${String(bedM).padStart(2, '0')}`;
      const hours = Math.floor(sleepMinutes / 60);
      const mins = sleepMinutes % 60;

      options.push({
        cycleCount: cycles,
        sleepDuration: `${hours}h ${mins > 0 ? mins + 'p' : ''}`.trim(),
        sleepDurationMinutes: sleepMinutes,
        bedtime,
        wakeTime: wakeTimeStr,
        quality: cycles <= 4 ? 'minimum' : cycles <= 5 ? 'good' : 'optimal',
        label:
          cycles <= 4
            ? 'Minimum'
            : cycles === 5
              ? 'Ajánlott'
              : cycles === 6
                ? 'Ideális'
                : 'Maximum regeneráció',
      });
    }

    // Return 3 most useful (4, 5, 6 cycles - skip 7 unless requested)
    return options.slice(0, 4).reverse(); // show optimal first
  }

  /** Calculate calorie adjustment based on sleep cycles */
  static getCalorieAdjustment(actualCycles: number): number {
    if (actualCycles < 4) return 300; // severe sleep debt
    if (actualCycles < 5) return 150; // poor sleep
    if (actualCycles >= 6) return 0; // good sleep
    return 0;
  }

  /** Circadian score (0-100) based on sleep + meal timing */
  static getCircadianScore(params: {
    actualSleepCycles: number;
    bedtimeOnSchedule: boolean;
    firstMealOnTime: boolean;
    lastMealOnTime: boolean;
    workoutInWindow: boolean;
  }): number {
    let score = 0;
    score += Math.min(params.actualSleepCycles * 10, 40); // max 40 pts
    if (params.bedtimeOnSchedule) score += 20;
    if (params.firstMealOnTime) score += 15;
    if (params.lastMealOnTime) score += 15;
    if (params.workoutInWindow) score += 10;
    return Math.min(score, 100);
  }

  /** Get meal timing recommendations from wake + bed times */
  static getMealTiming(
    wakeTimeStr: string,
    bedtimeStr: string
  ): {
    firstMealTime: string;
    lastMealTime: string;
    optimalWorkoutWindow: string;
  } {
    const addMinutes = (timeStr: string, mins: number): string => {
      const [h, m] = timeStr.split(':').map(Number);
      const total = ((h * 60 + m + mins) % 1440 + 1440) % 1440;
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };

    return {
      firstMealTime: addMinutes(wakeTimeStr, 60), // wake + 1h
      lastMealTime: addMinutes(bedtimeStr, -180), // bed - 3h
      optimalWorkoutWindow: `${addMinutes(wakeTimeStr, 60)} - ${addMinutes(wakeTimeStr, 180)}`,
    };
  }

  /** Save sleep preference to IndexedDB via UserProfileService */
  static async saveSleepSettings(settings: {
    wakeTime: string;
    selectedBedtime: string;
    selectedCycles: number;
  }): Promise<void> {
    await saveUserProfile({
      wakeTime: settings.wakeTime,
      bedtime: settings.selectedBedtime,
      sleepCycles: settings.selectedCycles,
    });
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new Event('profileUpdated'));
      } catch { /* ignore */ }
    }
    const timing = this.getMealTiming(settings.wakeTime, settings.selectedBedtime);
    const profile = await getUserProfile();
    if (profile?.mealSettings) {
      window.dispatchEvent(
        new CustomEvent('sleepSettingsUpdated', {
          detail: {
            suggestedFirstMeal: timing.firstMealTime,
            suggestedLastMeal: timing.lastMealTime,
            workoutWindow: timing.optimalWorkoutWindow,
          },
        })
      );
    }
  }

  /** Load and analyze current sleep settings */
  static async analyzeSleep(): Promise<SleepAnalysis | null> {
    const profile = await getUserProfile();
    if (!profile?.wakeTime) return null;

    const bedtime =
      profile.bedtime ??
      this.getBedtimeOptions(profile.wakeTime).find((o) => o.cycleCount === 6)?.bedtime ??
      '23:00';

    const cycles = profile.sleepCycles ?? 6;
    const mealTiming = this.getMealTiming(profile.wakeTime, bedtime);

    return {
      recommendedBedtimes: this.getBedtimeOptions(profile.wakeTime),
      selectedCycles: cycles,
      dailyCalorieAdjustment: this.getCalorieAdjustment(cycles),
      circadianScore: this.getCircadianScore({
        actualSleepCycles: cycles,
        bedtimeOnSchedule: true,
        firstMealOnTime: true,
        lastMealOnTime: true,
        workoutInWindow: false,
      }),
      firstMealTime: mealTiming.firstMealTime,
      lastMealTime: mealTiming.lastMealTime,
      optimalWorkoutWindow: mealTiming.optimalWorkoutWindow,
    };
  }
}
