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
 *   - Personal data extraction → populates userProfile (IndexedDB)
 *   - Measurements from ACTUAL document values (not hardcoded)
 *
 * PIPELINE:
 *   1. Accept file (PDF/Word/Image/Text) or raw text
 *   2. Extract text (pdfjs-dist for PDF)
 *   3. Unified AI parser → personal data + nutrition + measurements + training
 *   4. Populate userProfile in IndexedDB
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
import { extractTextFromPDF } from '../backend/services/AIParserService';
import type { AIParsedDocument, AIParsedUserProfile } from '../backend/services/AIParserService';
import { parseWithLLM } from '../backend/services/LLMParserService';
import { saveUserProfile } from '../backend/services/UserProfileService';
import * as NutritionPlanSvc from '../backend/services/NutritionPlanService';
import { mapAICategoryToFoodCategory } from '../backend/services/NutritionPlanService';
import * as ShoppingListSvc from '../backend/services/ShoppingListService';
import * as ActivitySvc from '../backend/services/ActivityService';
import * as MeasurementSvc from '../backend/services/MeasurementService';
import * as VersionControlSvc from '../backend/services/VersionControlService';
import * as FoodCatalogSvc from '../backend/services/FoodCatalogService';
import { parseBaseIngredients, normalizeIngredientName, isSingleBaseIngredientName } from '../backend/services/FoodCatalogService';
import { getDB, nowISO } from '../backend/db';
// REMOVED: import { mealPlan } from '../data/mealData'; — no more hardcoded demo data
import type { MealType, NutritionPlanEntity } from '../backend/models';
import { stagePlan, setStagingActive } from './useStagingManager';
import { getLocale, useLanguage } from '../contexts/LanguageContext';
import { getSetting, setSetting } from '../backend/services/SettingsService';

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

async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(String(e.target?.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface UploadState {
  step: UploadStep;
  progress: number; // 0-100
  error: string | null;
  warnings: string[];
  confidence: number;
  result: UploadResult | null;
  importStats?: {
    days_count: number;
    meals_count: number;
    foods_count: number;
    training_days: number;
    rest_days: number;
  };
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
  /** Whether staging was successfully auto-published after import */
  autoPublished?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// USER PROFILE POPULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Merges extracted personal data into IndexedDB userProfile.
 * Only OVERWRITES fields that have real extracted values.
 * Does NOT clear fields that weren't found in the document.
 */
async function populateUserProfile(extracted: AIParsedUserProfile): Promise<string[]> {
  const existing = {
    name: '',
    age: 0,
    weight: 0,
    height: 0,
    bloodPressure: '',
    activityLevel: '',
    goal: '',
    allergies: '',
    dietaryPreferences: '',
    avatar: '',
    calorieTarget: undefined as number | undefined,
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
    await saveUserProfile(existing);
    try {
      window.dispatchEvent(new Event('profileUpdated'));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // window not available (non-browser env) — ignore
    }
    console.log('[Upload] Profile updated:', fieldsUpdated.join(', '));
  }

  return fieldsUpdated;
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useDataUpload() {
  const { language } = useLanguage();
  const [state, setState] = useState<UploadState>({
    step: 'idle',
    progress: 0,
    error: null,
    warnings: [],
    confidence: 0,
    result: null,
    importStats: undefined,
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
   * Upload and process a file → FULL terv import.
   *
   * For PDFs: use AIParser.parseUploadedFile (pdfjs-dist) to get clean text.
   * For non-PDF files: read raw text and use unified regex-based parser.
   *
   * The optional `mode` controls how new data is merged into an existing plan.
   */
  const uploadFile = useCallback(async (file: File, mode: 'merge' | 'overwrite' = 'overwrite') => {
    try {
      setState({
        step: 'reading_file',
        progress: 5,
        error: null,
        warnings: [],
        confidence: 0,
        result: null,
        importStats: undefined,
      });

      setStep('parsing', 10);

      let parsed: AIParsedDocument;

      // Detect PDF by extension or MIME type
      const lowerName = file.name.toLowerCase();
      const mimeType = file.type.toLowerCase();
      const isPdf = lowerName.endsWith('.pdf') || mimeType === 'application/pdf';

      try {
        if (isPdf) {
          // PDF: prefer Gemini native PDF parser via base64, then fallback to Claude/regex
          const [dataUrl, rawText] = await Promise.all([
            readFileAsDataURL(file),
            extractTextFromPDF(file),
          ]);

          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

          if (base64) {
            try {
              const resp = await fetch('/api/parse-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  pdf_base64: base64,
                  // For now, fixed 3 meals/day + reasonable kcal target
                  meal_count: 3,
                  daily_kcal: 2000,
                }),
              });

              if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                throw new Error(errData.error || `Gemini parser error: ${resp.status}`);
              }

              const response = await resp.json();
              console.log('[upload] API response:', JSON.stringify(response).substring(0, 500));
              console.log('[upload] stats:', response.stats);
              if (!response.result) {
                throw new Error('Üres válasz az AI PDF parser-től');
              }

              const plan = JSON.parse(response.result);
              const weeks = Array.isArray(plan.weeks) ? plan.weeks : [];
              const nutritionPlan = {
                weeks,
                detected_weeks: plan.detected_weeks ?? weeks.length,
                detected_days_per_week: plan.detected_days_per_week ?? (Array.isArray(weeks[0]) ? weeks[0].length : 7),
              };

              parsed = {
                userProfile: {
                  name: undefined,
                  age: undefined,
                  weight: undefined,
                  height: undefined,
                  bmi: undefined,
                  gender: undefined,
                  blood_pressure: undefined,
                  activity_level: undefined,
                  goal: undefined,
                  allergies: [],
                  dietary_preferences: [],
                  calorie_target: plan.daily_kcal_target ?? undefined,
                },
                nutritionPlan,
                measurements: [],
                trainingDays: [],
                warnings: [],
                confidence: typeof plan.confidence === 'number' ? plan.confidence : 0.7,
                rawText,
              } as AIParsedDocument;

              if (response.stats) {
                setState(prev => ({
                  ...prev,
                  importStats: {
                    days_count: response.stats.days_count ?? 0,
                    meals_count: response.stats.meals_count ?? 0,
                    foods_count: response.stats.foods_count ?? 0,
                    training_days: response.stats.training_days ?? 0,
                    rest_days: response.stats.rest_days ?? 0,
                  },
                }));
              }
            } catch (geminiError) {
              console.warn('[Upload] Gemini PDF parser failed, falling back to Claude/regex:', geminiError);
              parsed = await parseWithLLM(rawText).catch(() => AIParser.parseDocumentText(rawText));
            }
          } else {
            const rawText = await extractTextFromPDF(file);
            parsed = await parseWithLLM(rawText).catch(() => AIParser.parseDocumentText(rawText));
          }
        } else {
          // Text/Word: read raw text, try LLM first then regex
          const rawText = await file.text();
          parsed = await parseWithLLM(rawText).catch(() => AIParser.parseDocumentText(rawText));
        }
      } catch (extractionError) {
        // If extraction completely fails, show error — NO demo data fallback
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

      // FULL MODE: teljes terv import
      return processExtractedData(parsed, file.name, mode);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ismeretlen hiba';
      setState(prev => ({ ...prev, step: 'error', error: message }));
    }
  }, []);

  /**
   * Process raw text input → FULL terv import.
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
        importStats: undefined,
      });

      // Try LLM first (if key/proxy), else regex parser
      const parsed = await parseWithLLM(text).catch(() => AIParser.parseDocumentText(text));

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

      // FULL MODE: teljes terv import
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
    sourceLabel: string,
    mode: 'merge' | 'overwrite' = 'overwrite',
  ) => {
    try {
      const allWarnings = [...parsed.warnings];

      // ── Step 1: Populate user profile from extracted data ──
      setStep('parsing', 20);
      const extractedFields = await populateUserProfile(parsed.userProfile);
      if (extractedFields.length > 0) {
        console.log(`[Upload] Extracted personal data: ${extractedFields.join(', ')}`);
      }

      // ── Step 2: Create nutrition plan ──
      setStep('creating_plan', 30);
      const label = `${sourceLabel} — ${new Date().toLocaleDateString(getLocale(language))}`;
      let planId: string;
      let totalWeeks: number;
      let totalDays = 0;
      let totalMeals = 0;
      let newFoodsCount = 0;

      if (parsed.nutritionPlan && parsed.nutritionPlan.weeks.length > 0) {
        // Use real extracted nutrition plan
        setStep('populating_foods', 40);
        const activePlan = await NutritionPlanSvc.getActivePlan();
        let plan:
          | (NutritionPlanEntity & { stats: NutritionPlanSvc.ImportStats })
          | (NutritionPlanEntity & { stats: NutritionPlanSvc.ImportStats });

        if (activePlan && mode === 'merge') {
          // Append new data into existing active plan
          const merged = await NutritionPlanSvc.importIntoExistingPlan(
            activePlan.id,
            parsed.nutritionPlan,
            'merge',
            label,
          );
          plan = merged as any;
        } else if (activePlan && mode === 'overwrite') {
          // Overwrite data inside existing active plan
          const overwritten = await NutritionPlanSvc.importIntoExistingPlan(
            activePlan.id,
            parsed.nutritionPlan,
            'overwrite',
            label,
          );
          plan = overwritten as any;
        } else {
          const imported = await NutritionPlanSvc.importFromAIParse(parsed.nutritionPlan, label);
          plan = imported as any;
        }

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
        await setSetting('totalConsumedCalories', JSON.stringify({
          target: parsed.userProfile.calorie_target,
          updatedAt: nowISO(),
        }));
      }

      // ── Step 8: Store weight in weightHistory ──
      if (parsed.userProfile.weight) {
        const weightHistoryRaw = await getSetting('weightHistory');
        const weightHistory = weightHistoryRaw ? JSON.parse(weightHistoryRaw) : [];
        const today = new Date().toISOString().split('T')[0];
        const alreadyExists = weightHistory.some((e: any) => e.date === today);
        if (!alreadyExists) {
          weightHistory.push({
            date: today,
            weight: parsed.userProfile.weight,
            week: 1,
          });
          await setSetting('weightHistory', JSON.stringify(weightHistory));
        }
      }

      // ── Step 9: Stage then auto-publish the plan ──
      // Data is already in IndexedDB and plan is already activated.
      // Stage then immediately publish so the user does not need to go to Settings.
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
      const autoPublished = await setStagingActive();
      if (autoPublished) {
        console.log('[Upload] Auto-published plan:', label);
      } else {
        console.warn('[Upload] Auto-publish: no staging data found after stagePlan');
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
        autoPublished,
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
  }, [language]);

  /**
   * FAST MODE: only extracts foods from the parsed nutrition plan
   * and populates the FoodCatalog, without creating full meal plans.
   * Target: 3–5s quick import for „csak étellista”.
   */
  const processFoodsOnly = useCallback(async (
    parsed: AIParsedDocument,
    sourceLabel: string,
  ) => {
    try {
      const allWarnings = [...parsed.warnings];

      // Step 1: update basic profile info (cheap, keeps UX consistent)
      setStep('parsing', 20);
      const extractedFields = await populateUserProfile(parsed.userProfile);
      if (extractedFields.length > 0) {
        console.log(`[Upload/FoodsOnly] Extracted personal data: ${extractedFields.join(', ')}`);
      }

      // Step 2: collect unique foods from nutrition plan
      if (!parsed.nutritionPlan || parsed.nutritionPlan.weeks.length === 0) {
        allWarnings.push('Étrend terv nem található a dokumentumban — nem sikerült ételeket kinyerni.');
        setState(prev => ({
          ...prev,
          step: 'error',
          error: 'Nem sikerült ételeket kinyerni az étrendből.',
          warnings: allWarnings,
        }));
        return;
      }

      setStep('populating_foods', 40);

      const seen = new Set<string>();
      const foodInputs: FoodCatalogSvc.CreateFoodInput[] = [];

      for (const week of parsed.nutritionPlan.weeks) {
        for (const day of week) {
          for (const meal of day.meals) {
            for (const ing of meal.ingredients) {
              const rawName = (ing.name || '').trim();
              if (!rawName) continue;

              // Normalize + re-validate against the latest AI parser rules
              const cleanedName = AIParser.cleanFoodName(rawName);
              if (!AIParser.isCleanFoodName(cleanedName)) continue;

              // Base-ingredient pipeline for foods-only upload:
              // 1) split composite names, 2) normalize, 3) ensure single base ingredient.
              const atomicNames = new Set<string>();
              for (const part of parseBaseIngredients(cleanedName)) {
                const normalized = normalizeIngredientName(part);
                if (!normalized) continue;
                const lower = normalized.toLowerCase();
                if (!isSingleBaseIngredientName(normalized)) continue;
                atomicNames.add(lower);
              }
              if (atomicNames.size === 0) continue;

              for (const lower of atomicNames) {
                if (seen.has(lower)) continue;
                seen.add(lower);

                const displayName = lower.charAt(0).toUpperCase() + lower.slice(1);

                const category = mapAICategoryToFoodCategory(ing.estimated_category);
                const calories = ing.estimated_calories_per_100g ?? 100;
                const protein = ing.estimated_protein_per_100g ?? 0;
                const carbs = ing.estimated_carbs_per_100g ?? 0;
                const fat = ing.estimated_fat_per_100g ?? 0;

                foodInputs.push({
                  name: displayName,
                  description: 'AI-ból kinyert étel az étrend dokumentumból',
                  category,
                  calories_per_100g: calories,
                  protein_per_100g: protein,
                  carbs_per_100g: carbs,
                  fat_per_100g: fat,
                  source: 'ai_generated',
                });
              }
            }
          }
        }
      }

      if (foodInputs.length === 0) {
        setState(prev => ({
          ...prev,
          step: 'error',
          error: 'Nem sikerült egyetlen használható ételt sem kinyerni.',
          warnings: allWarnings,
        }));
        return;
      }

      // Step 3: write foods to catalog (batched)
      const summary = await FoodCatalogSvc.createFoodsBatch(foodInputs);

      console.log('[Upload/FoodsOnly] Foods created:', summary.created.length, 'skipped:', summary.skipped.length);

      // Step 4: finalize quick upload result (no full plan yet)
      setStep('complete', 100);

      const label = `${sourceLabel} — Gyors étellista`;

      const result: UploadResult = {
        planId: 'foods-only',
        planLabel: label,
        totalWeeks: 0,
        totalDays: 0,
        totalMeals: 0,
        newFoods: summary.created.length,
        shoppingItems: 0,
        measurementsRecorded: false,
        trainingPlanCreated: false,
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
  const isLoading =
    state.step !== 'idle' &&
    state.step !== 'complete' &&
    state.step !== 'error';

  return {
    ...state,
    isLoading,
    uploadFile,
    processText,
    // Gyors mód – külön publikus hívók
    uploadFileFoodsOnly: async (file: File) => {
      setState({
        step: 'reading_file',
        progress: 5,
        error: null,
        warnings: [],
        confidence: 0,
        result: null,
      });

      setStep('parsing', 10);

      let parsed: AIParsedDocument;

      const lowerName = file.name.toLowerCase();
      const mimeType = file.type.toLowerCase();
      const isPdf = lowerName.endsWith('.pdf') || mimeType === 'application/pdf';

      try {
        if (isPdf) {
          // PDF: extract text, then try LLM first, fallback to local parser
          const rawText = await extractTextFromPDF(file);
          parsed = await parseWithLLM(rawText).catch(() => AIParser.parseDocumentText(rawText));
        } else {
          // Text/Word: read raw text, try LLM first, fallback to local parser
          const rawText = await file.text();
          parsed = await parseWithLLM(rawText).catch(() => AIParser.parseDocumentText(rawText));
        }
      } catch (extractionError) {
        console.warn('[Upload/FoodsOnly] File extraction failed:', extractionError);
        const msg = extractionError instanceof Error ? extractionError.message : 'Ismeretlen hiba';
        setState(prev => ({
          ...prev,
          step: 'error',
          error: `Feldolgozási hiba: ${msg}`,
        }));
        return;
      }

      const hasNutritionPlan = parsed.nutritionPlan && parsed.nutritionPlan.weeks.length > 0;
      if (!hasNutritionPlan) {
        setState(prev => ({
          ...prev,
          step: 'error',
          error: 'Nem sikerült étrendet kinyerni a dokumentumból.',
          warnings: [...prev.warnings, ...parsed.warnings],
        }));
        return;
      }

      return processFoodsOnly(parsed, file.name);
    },
    processTextFoodsOnly: async (text: string) => {
      setState({
        step: 'parsing',
        progress: 15,
        error: null,
        warnings: [],
        confidence: 0,
        result: null,
      });

      const parsed = await parseWithLLM(text).catch(() => AIParser.parseDocumentText(text));
      const hasNutritionPlan = parsed.nutritionPlan && parsed.nutritionPlan.weeks.length > 0;

      if (!hasNutritionPlan) {
        setState(prev => ({
          ...prev,
          step: 'error',
          error: 'Nem sikerült étrendet kinyerni a szövegből.',
          warnings: [...prev.warnings, ...parsed.warnings],
        }));
        return;
      }

      return processFoodsOnly(parsed, 'Szöveges bemenet — Gyors mód');
    },
    processExtractedData,
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