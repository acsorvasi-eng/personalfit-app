/**
 * ====================================================================
 * LLM Parser Service — v1 (Claude API alapú intelligens parser)
 * ====================================================================
 */

import type {
  AIParsedNutritionPlan,
  AIParsedMeasurement,
  AIParsedTrainingDay,
} from '../models';
import type { AIParsedUserProfile, AIParsedDocument } from './AIParserService';
import { parseDocumentText } from './AIParserService';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 4096;

function getApiKey(): string | null {
  return import.meta.env.VITE_ANTHROPIC_API_KEY ?? null;
}

const SYSTEM_PROMPT = `Te egy táplálkozási és fitnesz dokumentum elemző vagy.
A felhasználó PDF-ből kinyert szöveget ad neked. Elemezd és add vissza JSON formátumban.
Csak a dokumentumban szereplő adatokat add vissza — ne becsülj, ne találj ki értékeket.
Az étkezési típusok: breakfast, lunch, dinner, snack, post_workout
A napok számai: 1=Hétfő, 2=Kedd, 3=Szerda, 4=Csütörtök, 5=Péntek, 6=Szombat, 7=Vasárnap
Válaszolj KIZÁRÓLAG valid JSON formátumban. NE írj magyarázatot, NE használj markdown jelölést.`;

interface LLMParserOutput {
  userProfile?: Partial<AIParsedUserProfile>;
  nutritionPlan?: AIParsedNutritionPlan | null;
  measurements?: AIParsedMeasurement[];
  trainingDays?: AIParsedTrainingDay[];
  warnings?: string[];
  confidence?: number;
}

async function callClaudeAPI(text: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY nincs beállítva');

  const maxTextLength = 50000;
  const truncatedText = text.length > maxTextLength
    ? text.substring(0, maxTextLength) + '\n\n[SZÖVEG CSONKÍTVA]'
    : text;

  const schema = `{
  "userProfile": { "name": "string|null", "age": "number|null", "weight": "number|null", "height": "number|null", "bmi": "number|null", "gender": "male|female|null", "blood_pressure": "string|null", "activity_level": "sedentary|lightly_active|moderately_active|very_active|extremely_active|null", "goal": "weight_loss|maintenance|muscle_gain|null", "allergies": [], "dietary_preferences": [], "calorie_target": "number|null" },
  "nutritionPlan": { "weeks": [[{ "week": 1, "day": 1, "day_label": "string", "is_training_day": false, "meals": [{ "meal_type": "breakfast", "name": "string", "ingredients": [{ "name": "string", "quantity_grams": 100, "unit": "g" }], "total_calories": null }] }]], "detected_weeks": 1, "detected_days_per_week": 7 },
  "measurements": [{ "date": "YYYY-MM-DD", "weight": null, "body_fat": null, "waist": null, "chest": null, "arm": null, "hip": null, "thigh": null, "neck": null, "notes": "" }],
  "trainingDays": [{ "week": 1, "day": 1, "activity": "string", "duration_minutes": 45, "intensity": "moderate", "estimated_calories": 300, "notes": "" }],
  "warnings": [],
  "confidence": 0.8
}`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Elemezd ezt a dokumentumot és add vissza az adatokat ebben a JSON struktúrában:\n${schema}\n\nDOKUMENTUM:\n---\n${truncatedText}\n---`,
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API hiba (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0];
  if (!content || content.type !== 'text') throw new Error('Váratlan API válasz formátum');
  return content.text;
}

function safeParseJSON(rawResponse: string): LLMParserOutput | null {
  let cleaned = rawResponse.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned) as LLMParserOutput;
  } catch (err) {
    console.error('[LLMParser] JSON parse hiba:', err);
    return null;
  }
}

function convertToAIParsedDocument(llmOutput: LLMParserOutput, rawText: string): AIParsedDocument {
  const today = new Date().toISOString().split('T')[0];

  const userProfile: AIParsedUserProfile = {
    name: llmOutput.userProfile?.name ?? undefined,
    age: llmOutput.userProfile?.age ?? undefined,
    weight: llmOutput.userProfile?.weight ?? undefined,
    height: llmOutput.userProfile?.height ?? undefined,
    bmi: llmOutput.userProfile?.bmi ?? undefined,
    gender: llmOutput.userProfile?.gender ?? undefined,
    blood_pressure: llmOutput.userProfile?.blood_pressure ?? undefined,
    activity_level: llmOutput.userProfile?.activity_level ?? undefined,
    goal: llmOutput.userProfile?.goal ?? undefined,
    allergies: llmOutput.userProfile?.allergies ?? [],
    dietary_preferences: llmOutput.userProfile?.dietary_preferences ?? [],
    calorie_target: llmOutput.userProfile?.calorie_target ?? undefined,
  };

  if (!userProfile.bmi && userProfile.weight && userProfile.height) {
    const h = userProfile.height / 100;
    userProfile.bmi = Math.round((userProfile.weight / (h * h)) * 10) / 10;
  }

  const nutritionPlan: AIParsedNutritionPlan | null =
    llmOutput.nutritionPlan?.weeks?.length ? llmOutput.nutritionPlan : null;

  let measurements: AIParsedMeasurement[] = llmOutput.measurements ?? [];
  if (userProfile.weight && measurements.length === 0) {
    measurements = [{ date: today, weight: userProfile.weight, notes: 'Claude AI által kinyerve' }];
  } else if (userProfile.weight && measurements.length > 0 && !measurements[0].weight) {
    measurements[0].weight = userProfile.weight;
  }

  const warnings: string[] = llmOutput.warnings ?? [];
  if (!userProfile.weight) warnings.push('Testsúly nem található a dokumentumban');
  if (!userProfile.height) warnings.push('Magasság nem található a dokumentumban');
  if (!nutritionPlan) warnings.push('Étkezési terv nem található a dokumentumban');

  const confidence = llmOutput.confidence ?? 0.5;

  return {
    userProfile,
    nutritionPlan,
    measurements,
    trainingDays: llmOutput.trainingDays ?? [],
    warnings,
    confidence,
    rawText,
  };
}

export async function parseWithLLM(rawText: string): Promise<AIParsedDocument & { usedLLM: boolean }> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn('[LLMParser] API kulcs nincs beállítva — regex parser használata');
    const regexResult = await parseDocumentText(rawText);
    return { ...regexResult, usedLLM: false };
  }

  console.log('[LLMParser] Claude API hívás indítása...');

  try {
    const rawResponse = await callClaudeAPI(rawText);
    const llmOutput = safeParseJSON(rawResponse);
    if (!llmOutput) throw new Error('Claude válasza nem valid JSON');

    const result = convertToAIParsedDocument(llmOutput, rawText);
    console.log(`[LLMParser] ✅ Sikeres — confidence: ${result.confidence}`);
    return { ...result, usedLLM: true };

  } catch (err) {
    console.warn('[LLMParser] Claude API hiba — regex fallback:', err);
    const regexResult = await parseDocumentText(rawText);
    return { ...regexResult, usedLLM: false };
  }
}

export function isLLMParserAvailable(): boolean {
  return !!getApiKey();
}

export function getParserInfo(): { name: string; available: boolean } {
  const available = isLLMParserAvailable();
  return { name: available ? 'Claude AI Parser' : 'Regex Parser (alap)', available };
}
