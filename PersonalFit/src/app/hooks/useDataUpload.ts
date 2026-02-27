/**
 * ====================================================================
 * useDataUpload — Upload Orchestration Pipeline v3
 * ====================================================================
 * Handles the complete file upload → AI parse → data population flow.
 *
 * v3 CHANGES:
 *   - ALL demo/hardcoded data fallbacks REMOVED
 *   - App works STRICTLY from uploaded data only
 *   - If parsing fails → error state (no demo plan generated)
 *   - REAL PDF text extraction via pdfjs-dist
 *   - Personal data extraction → populates userProfile localStorage
 *   - Measurements from ACTUAL document values (not hardcoded)
 *
 * PIPELINE:
 *   1. Accept file (PDF/Word/Image/Text) or raw text
 *   2. Extract text (pdfjs-dist for PDF)
 *   3. Unified AI parser → personal data + nutrition + measurements + training
 *   4. Populate userProfile in localStorage
 *   5. Create NutritionPlan + MealDays + Meals + MealItems
 *   6. Add new foods to FoodCatalog
 *   7. Generate ShoppingList
 *   8. Record Measurements (from REAL extracted values)
 *   9. Create TrainingPlan (from REAL extracted values)
 *   10. Create VersionControl records
 *   11. Stage plan (user must Publish to activate)
 *
 * FONTOS SZABALY:
 *   Az AI parser a dokumentumból kinyert értékeket SZÓ SZERINT veszi,
 *   NEM átlagol, NEM becsl. NINCS demo adat fallback.
 */

import { useState, useCallback } from 'react';
import * as AIParser from '../backend/services/AIParserService';
import type { AIParsedDocument, AIParsedUserProfile } from '../backend/services/AIParserService';
import * as NutritionPlanSvc from '../backend/services/NutritionPlanService';
import * as ShoppingListSvc from '../backend/services/ShoppingListService';
import * as ActivitySvc from '../backend/services/ActivityService';
import * as MeasurementSvc from '../backend/services/MeasurementService';
import * as VersionControlSvc from '../backend/services/VersionControlService';
import * as FoodCatalogSvc from '../backend/services/FoodCatalogService';
import { getDB, nowISO } from '../backend/db';
// REMOVED: import { mealPlan } from '../data/mealData'; — no more hardcoded demo data
import type { MealType } from '../backend/models';
import { stagePlan } from './useStagingManager';
import { getLocale } from '../contexts/LanguageContext';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type UploadStep =
  | 'idle'
  | 'reading_file'
  | 'parsing'
  | 'creating_plan'
  | 'populating_foods'
  | 'building_meals'
  | 'generating_shopping'
  | 'processing_measurements'
  | 'processing_training'
  | 'creating_versions'
  | 'staging'
  | 'complete'
  | 'error';

export const STEP_LABELS: Record<UploadStep, string> = {
  idle: 'Várakozás...',
  reading_file: 'Fájl beolvasása...',
  parsing: 'AI elemzés...',
  creating_plan: 'Étrend terv létrehozása...',
  populating_foods: 'Élelmiszerek hozzáadása...',
  building_meals: 'Étkezések összeállítása...',
  generating_shopping: 'Bevásárlólista generálása...',
  processing_measurements: 'Mérések feldolgozása...',
  processing_training: 'Edzésterv feldolgozása...',
  creating_versions: 'Verzió mentése...',
  staging: 'Staging állapotba mentés...',
  complete: 'Kész!',
  error: 'Hiba történt',
};

export interface UploadState {
  step: UploadStep;
  progress: number; // 0-100
  error: string | null;
  warnings: string[];
  confidence: number;
  result: UploadResult | null;
}

export interface UploadResult {
  planId: string;
  planLabel: string;
  totalWeeks: number;
  totalDays: number;
  totalMeals: number;
  newFoods: number;
  shoppingItems: number;
  measurementsRecorded: boolean;
  trainingPlanCreated: boolean;
  confidence: number;
  /** New: extracted personal data summary */
  personalDataExtracted: boolean;
  extractedFields: string[];
}

// ═══════════════════════════════════════════════════════════════
// USER PROFILE POPULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Merges extracted personal data into localStorage userProfile.
 * Only OVERWRITES fields that have real extracted values.
 * Does NOT clear fields that weren't found in the document.
 */
function populateUserProfile(extracted: AIParsedUserProfile): string[] {
  const saved = localStorage.getItem('userProfile');
  const existing = saved ? JSON.parse(saved) : {
    name: '', age: 0, weight: 0, height: 0,
    bloodPressure: '', activityLevel: '', goal: '',
    allergies: '', dietaryPreferences: '', avatar: ''
  };

  const fieldsUpdated: string[] = [];

  if (extracted.name) {
    existing.name = extracted.name;
    fieldsUpdated.push('Név');
  }
  if (extracted.age && extracted.age > 0) {
    existing.age = extracted.age;
    fieldsUpdated.push('Kor');
  }
  if (extracted.weight && extracted.weight > 0) {
    existing.weight = extracted.weight;
    fieldsUpdated.push('Súly');
  }
  if (extracted.height && extracted.height > 0) {
    existing.height = extracted.height;
    fieldsUpdated.push('Magasság');
  }
  if (extracted.blood_pressure) {
    existing.bloodPressure = extracted.blood_pressure;
    fieldsUpdated.push('Vérnyomás');
  }
  if (extracted.activity_level) {
    const activityLabels: Record<string, string> = {
      'sedentary': 'Ülő életmód',
      'lightly_active': 'Enyhén aktív',
      'moderately_active': 'Mérsékelten aktív',
      'very_active': 'Nagyon aktív',
      'extremely_active': 'Extrém aktív',
    };
    existing.activityLevel = activityLabels[extracted.activity_level] || extracted.activity_level;
    fieldsUpdated.push('Aktivitási szint');
  }
  if (extracted.goal) {
    const goalLabels: Record<string, string> = {
      'weight_loss': 'Fogyás',
      'maintenance': 'Szinttartás',
      'muscle_gain': 'Izomépítés',
    };
    existing.goal = goalLabels[extracted.goal] || extracted.goal;
    fieldsUpdated.push('Cél');
  }
  if (extracted.allergies && extracted.allergies.length > 0) {
    existing.allergies = extracted.allergies.join(', ');
    fieldsUpdated.push('Allergiák');
  }
  if (extracted.dietary_preferences && extracted.dietary_preferences.length > 0) {
    existing.dietaryPreferences = extracted.dietary_preferences.join(', ');
    fieldsUpdated.push('Étkezési preferenciák');
  }
  if (extracted.calorie_target && extracted.calorie_target > 0) {
    existing.calorieTarget = extracted.calorie_target;
    fieldsUpdated.push('Kalória cél');
  }

  if (fieldsUpdated.length > 0) {
    localStorage.setItem('userProfile', JSON.stringify(existing));
    // Notify all listeners
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('profileUpdated'));
    console.log('[Upload] Profile updated:', fieldsUpdated.join(', '));
  }

  return fieldsUpdated;
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useDataUpload() {
  const [state, setState] = useState<UploadState>({
    step: 'idle',
    progress: 0,
    error: null,
    warnings: [],
    confidence: 0,
    result: null,
  });

  const setStep = (step: UploadStep, progress: number) => {
    setState(prev => ({ ...prev, step, progress }));
  };

  const reset = useCallback(() => {
    setState({
      step: 'idle',
      progress: 0,
      error: null,
      warnings: [],
      confidence: 0,
      result: null,
    });
  }, []);

  /**
   * Upload and process a file.
   * v2: Uses REAL text extraction for PDFs via pdfjs-dist.
   */
  const uploadFile = useCallback(async (file: File) => {
    try {
      setState({
        step: 'reading_file',
        progress: 5,
        error: null,
        warnings: [],
        confidence: 0,
        result: null,
      });

      setStep('parsing', 10);

      // v2: Use the unified document parser which handles PDF extraction
      let parsed: AIParsedDocument;
      try {
        parsed = await AIParser.parseUploadedFile(file);
      } catch (extractionError) {
        // If PDF extraction completely fails, show error — NO demo data fallback
        console.warn('[Upload] File extraction failed:', extractionError);
        const msg = extractionError instanceof Error ? extractionError.message : 'Ismeretlen hiba';
        setState(prev => ({
          ...prev,
          step: 'error',
          error: `Feldolgozási hiba: ${msg}`,
        }));
        return;
      }

      // Check if we got useful data
      const hasNutritionPlan = parsed.nutritionPlan && parsed.nutritionPlan.weeks.length > 0;
      const hasPersonalData = !!(parsed.userProfile.weight || parsed.userProfile.height || parsed.userProfile.age);
      const hasMeasurements = parsed.measurements.length > 0;

      if (!hasNutritionPlan && !hasPersonalData && !hasMeasurements) {
        // Nothing useful extracted — show error, NO demo data fallback
        console.warn('[Upload] No useful data extracted');
        setState(prev => ({
          ...prev,
          step: 'error',
          error: 'A dokumentumból nem sikerült használható adatot kinyerni. Próbáld meg részletesebb formátumban, vagy használd a "Szöveg beillesztése" opciót.',
          warnings: [...prev.warnings, ...parsed.warnings],
        }));
        return;
      }

      // Process the extracted data
      return processExtractedData(parsed, file.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ismeretlen hiba';
      setState(prev => ({ ...prev, step: 'error', error: message }));
    }
  }, []);

  /**
   * Process raw text input.
   * v2: Uses the unified document parser.
   */
  const processText = useCallback(async (text: string) => {
    try {
      setState({
        step: 'parsing',
        progress: 15,
        error: null,
        warnings: [],
        confidence: 0,
        result: null,
      });

      // v2: Use unified document parser
      const parsed = await AIParser.parseDocumentText(text);

      const hasNutritionPlan = parsed.nutritionPlan && parsed.nutritionPlan.weeks.length > 0;
      const hasPersonalData = !!(parsed.userProfile.weight || parsed.userProfile.height || parsed.userProfile.age);
      const hasMeasurements = parsed.measurements.length > 0;

      if (!hasNutritionPlan && !hasPersonalData && !hasMeasurements) {
        // No useful data extracted — show error, NO demo data fallback
        setState(prev => ({
          ...prev,
          step: 'error',
          error: 'Nem sikerült strukturált adatot kinyerni a szövegből. Próbáld meg részletesebb formátumban (hét/nap/étkezés/összetevők).',
          warnings: [...parsed.warnings],
        }));
        return;
      }

      return processExtractedData(parsed, 'Szöveges bemenet');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ismeretlen hiba';
      setState(prev => ({ ...prev, step: 'error', error: message }));
    }
  }, []);

  /**
   * Process real extracted data from a document.
   * v2: Populates user profile, uses REAL measurement values.
   */
  const processExtractedData = useCallback(async (
    parsed: AIParsedDocument,
    sourceLabel: string
  ) => {
    try {
      const allWarnings = [...parsed.warnings];

      // ── Step 1: Populate user profile from extracted data ──
      setStep('parsing', 20);
      const extractedFields = populateUserProfile(parsed.userProfile);
      if (extractedFields.length > 0) {
        console.log(`[Upload] Extracted personal data: ${extractedFields.join(', ')}`);
      }

      // ── Step 2: Create nutrition plan ──
      setStep('creating_plan', 30);
      const label = `${sourceLabel} — ${new Date().toLocaleDateString(getLocale((localStorage.getItem('appLanguage') as any) || 'hu'))}`;
      let planId: string;
      let totalWeeks: number;
      let totalDays = 0;
      let totalMeals = 0;
      let newFoodsCount = 0;

      if (parsed.nutritionPlan && parsed.nutritionPlan.weeks.length > 0) {
        // Use real extracted nutrition plan
        setStep('populating_foods', 40);
        const plan = await NutritionPlanSvc.importFromAIParse(parsed.nutritionPlan, label);
        planId = plan.id;
        totalWeeks = parsed.nutritionPlan.detected_weeks;
        newFoodsCount = plan.stats.createdNew;

        // Log import stats for diagnostics
        console.log('[Upload] Import stats:', JSON.stringify(plan.stats));
        if (plan.stats.errors.length > 0) {
          allWarnings.push(...plan.stats.errors);
        }
        if (plan.stats.skippedEmpty > 0) {
          allWarnings.push(`${plan.stats.skippedEmpty} összetevő kihagyva (nem sikerült feloldani)`);
        }

        setStep('building_meals', 60);
        // Count created entities
        const db = await getDB();
        const mealDays = await db.getAllFromIndex('meal_days', 'by-plan', planId);
        const meals = await db.getAllFromIndex('meals', 'by-plan', planId);
        totalDays = mealDays.length;
        totalMeals = meals.length;

        console.log(`[Upload] Plan populated: ${totalDays} days, ${totalMeals} meals, ${newFoodsCount} new foods, ${plan.stats.totalMealItems} meal items`);
      } else {
        // No nutrition plan found — create empty plan shell, only personal data was extracted
        allWarnings.push('Etrend terv nem található a dokumentumban. Csak személyes adatok kerülték kinyeresre.');
        const plan = await NutritionPlanSvc.createPlan({
          label,
          source: 'user_upload',
          total_weeks: 1,
        });
        planId = plan.id;
        totalWeeks = 1;
      }

      // ── Step 3: Activate plan and generate shopping list ──
      setStep('generating_shopping', 70);
      await NutritionPlanSvc.activatePlan(planId);
      let shoppingItemCount = 0;
      for (let w = 1; w <= totalWeeks; w++) {
        const items = await ShoppingListSvc.regenerateForWeek(w);
        shoppingItemCount += items.length;
      }

      // ── Step 4: Record REAL measurements (from document, NOT hardcoded!) ──
      setStep('processing_measurements', 80);
      let measurementsRecorded = false;
      if (parsed.measurements.length > 0) {
        const m = parsed.measurements[0];
        await MeasurementSvc.recordMeasurement({
          weight: m.weight,
          body_fat: m.body_fat,
          waist: m.waist,
          chest: m.chest,
          arm: m.arm,
          hip: m.hip,
          thigh: m.thigh,
          neck: m.neck,
          source: 'user_upload',
          notes: m.notes || 'PDF/szövegből kinyert mérések',
        });
        measurementsRecorded = true;
        console.log('[Upload] Measurements recorded from document:', m);
      } else if (parsed.userProfile.weight) {
        // At minimum record weight if available
        await MeasurementSvc.recordMeasurement({
          weight: parsed.userProfile.weight,
          source: 'user_upload',
          notes: 'PDF/szövegből kinyert testsúly',
        });
        measurementsRecorded = true;
      }

      // ── Step 5: Create training plan from REAL extracted data ──
      setStep('processing_training', 88);
      let trainingPlanCreated = false;
      if (parsed.trainingDays.length > 0) {
        const trainingPlan = await ActivitySvc.createTrainingPlan({
          label: `Edzésterv — ${label}`,
          source: 'user_upload',
        });

        for (const td of parsed.trainingDays) {
          await ActivitySvc.addTrainingPlanDay({
            training_plan_id: trainingPlan.id,
            week: td.week,
            day: td.day,
            planned_activity: td.activity,
            planned_duration_minutes: td.duration_minutes,
            estimated_calories: td.estimated_calories,
            intensity: td.intensity,
            notes: td.notes,
          });
        }
        await ActivitySvc.activateTrainingPlan(trainingPlan.id);
        trainingPlanCreated = true;

        await VersionControlSvc.createVersion({
          entity_type: 'TrainingPlan',
          entity_id: trainingPlan.id,
          label: `Edzésterv — ${label}`,
        });
      } else {
        // No training plan extracted — just note it in warnings
        allWarnings.push('Edzesterv nem található a dokumentumban.');
        // Empty training plan (user can configure later)
        const trainingPlan = await ActivitySvc.createTrainingPlan({
          label: `Edz��sterv — ${label}`,
          source: 'user_upload',
        });
        await ActivitySvc.activateTrainingPlan(trainingPlan.id);
        trainingPlanCreated = false;
      }

      // ── Step 6: Create version records ──
      setStep('creating_versions', 93);
      await VersionControlSvc.createVersion({
        entity_type: 'NutritionPlan',
        entity_id: planId,
        label,
        metadata: {
          totalWeeks,
          totalDays,
          totalMeals,
          extractedProfile: extractedFields,
        },
      });

      if (measurementsRecorded) {
        await VersionControlSvc.createVersion({
          entity_type: 'MeasurementProfile',
          entity_id: 'initial',
          label: 'Mérések — ' + label,
          metadata: {
            source: 'document_extraction',
            fields: Object.keys(parsed.measurements[0] || {}),
          },
        });
      }

      // Activate nutrition plan version
      const nutritionVersions = await VersionControlSvc.getVersionsForEntity('NutritionPlan');
      if (nutritionVersions.length > 0) {
        await VersionControlSvc.activateVersion(nutritionVersions[0].id);
      }

      // ── Step 7: Update calorie target if extracted ──
      if (parsed.userProfile.calorie_target) {
        localStorage.setItem('totalConsumedCalories', JSON.stringify({
          target: parsed.userProfile.calorie_target,
          updatedAt: nowISO(),
        }));
      }

      // ── Step 8: Store weight in weightHistory ──
      if (parsed.userProfile.weight) {
        const weightHistoryRaw = localStorage.getItem('weightHistory');
        const weightHistory = weightHistoryRaw ? JSON.parse(weightHistoryRaw) : [];
        const today = new Date().toISOString().split('T')[0];
        const alreadyExists = weightHistory.some((e: any) => e.date === today);
        if (!alreadyExists) {
          weightHistory.push({
            date: today,
            weight: parsed.userProfile.weight,
            week: 1,
          });
          localStorage.setItem('weightHistory', JSON.stringify(weightHistory));
        }
      }

      // ── Step 9: Stage AND auto-publish the plan ──
      // Data is already in IndexedDB and plan is already activated.
      // We stage then immediately publish to skip the manual gate.
      setStep('staging', 95);
      stagePlan({
        planId,
        label,
        sourceFileName: sourceLabel,
        totalWeeks,
        totalDays,
        totalMeals,
        shoppingItems: shoppingItemCount,
        measurementsRecorded,
        trainingPlanCreated,
        confidence: parsed.confidence,
        extractedFields,
      });

      // Auto-publish: set staging state to 'active' immediately
      try {
        const stagingRaw = localStorage.getItem('uploadStaging');
        if (stagingRaw) {
          const staging = JSON.parse(stagingRaw);
          staging.state = 'active';
          staging.publishedAt = new Date().toISOString();
          localStorage.setItem('uploadStaging', JSON.stringify(staging));
          window.dispatchEvent(new Event('stagingUpdated'));
          window.dispatchEvent(new Event('profileUpdated'));
          window.dispatchEvent(new Event('storage'));
          console.log('[Upload] Auto-published plan:', label);
        }
      } catch (e) {
        console.warn('[Upload] Auto-publish failed:', e);
      }

      // ── Complete ──
      setStep('complete', 100);

      const result: UploadResult = {
        planId,
        planLabel: label,
        totalWeeks,
        totalDays,
        totalMeals,
        newFoods: newFoodsCount,
        shoppingItems: shoppingItemCount,
        measurementsRecorded,
        trainingPlanCreated,
        confidence: parsed.confidence,
        personalDataExtracted: extractedFields.length > 0,
        extractedFields,
      };

      setState(prev => ({
        ...prev,
        step: 'complete',
        progress: 100,
        result,
        confidence: parsed.confidence,
        warnings: allWarnings,
      }));

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ismeretlen hiba';
      setState(prev => ({ ...prev, step: 'error', error: message }));
    }
  }, []);

  // NOTE: generateFromDemoData REMOVED — app works strictly from uploaded data only

  return {
    ...state,
    uploadFile,
    processText,
    reset,
    isProcessing: !['idle', 'complete', 'error'].includes(state.step),
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}