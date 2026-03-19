/**
 * ====================================================================
 * LLM Parser Service — v1 (Claude API alapú intelligens parser)
 * ====================================================================
 */

import type {
  AIParsedNutritionPlan,
  AIParsedDay,
  AIParsedMeal,
  AIParsedMeasurement,
  AIParsedTrainingDay,
} from '../models';
import type { AIParsedUserProfile, AIParsedDocument } from './AIParserService';
import { parseDocumentText, isCleanFoodName } from './AIParserService';
import { normalizeIngredientName } from './FoodCatalogService';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 8192;

function getApiKey(): string | null {
  return import.meta.env.VITE_ANTHROPIC_API_KEY ?? null;
}

const SYSTEM_PROMPT = `Te egy táplálkozási dokumentum elemző vagy. A felhasználó egy 30 napos étkezési tervből kinyert szöveget ad neked.

Válaszolj KIZÁRÓLAG valid JSON formátumban — NE írj magyarázatot, NE használj markdown jelölést, NE tegyél code fence jeleket.

A JSON PONTOS SÉMÁJA:
{
  "ingredients": string[],
  "nutritionPlan": {
    "detected_weeks": number,
    "detected_days_per_week": number,
    "weeks": Array<Array<{
      "week": number,
      "day": number,
      "day_label": string,
      "is_training_day": boolean,
      "meals": Array<{
        "meal_type": "breakfast"|"lunch"|"dinner"|"snack"|"post_workout",
        "name": string,
        "ingredients": Array<{"name": string, "quantity_grams": number, "unit": "g"|"ml"|"db"}>
      }>
    }>>
  },
  "confidence": number
}

SZABÁLYOK az ingredients tömbhöz (KRITIKUS):
- 50–80 EGYEDI ATOMIKUS alapélelmiszer name, max 25 karakter
- MINDEN nevet MAGYARUL adj meg — "csirkemell" NEM "chicken breast"
- NINCS mennyiség, NINCS mértékegység: "tojás" HELYES, "3 tojás" HIBÁS
- NINCS összetett étel: "lazac" HELYES, "sült lazac olívaolajjal" HIBÁS
- NINCS kategória szó: "sovány", "komplex", "magas protein" HIBÁS
- Scan ALL columns and ALL lines of the table — ingredients appear everywhere
- Translate English names to Hungarian: "walnut"→"dió", "avocado"→"avokádó"

SZABÁLYOK a nutritionPlan.weeks-hez:
- weeks külső tömb = hetek (4 hét), belső tömb = napok (7 nap/hét)
- is_training_day: true ha EDZÉS nap, false ha PIHENŐ nap
- meal_type: "breakfast"=Reggeli, "lunch"=Ebéd, "dinner"=Vacsora, "post_workout"=Edzés után
- quantity_grams: gramm értéke (ha "180g" akkor 180, ha "3 tojás" akkor ~180)`;

// REQUIREMENT 1: reject garbage and label text (not food)
const FORBIDDEN_CHARS = /[φ~{}\[\]<>*=]/;
const LABEL_PHRASES = ['napi összesen', 'protein + egészséges zsír'];
const MAX_INGREDIENT_NAME_LENGTH = 25;

function isAcceptableIngredientName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const s = name.trim();
  if (s.length > MAX_INGREDIENT_NAME_LENGTH) return false;
  if (FORBIDDEN_CHARS.test(s)) return false;
  const lower = s.toLowerCase();
  if (LABEL_PHRASES.some(phrase => lower.includes(phrase))) return false;
  return true;
}

interface LLMParserOutput {
  userProfile?: Partial<AIParsedUserProfile>;
  nutritionPlan?: AIParsedNutritionPlan | null;
  ingredients?: string[];
  measurements?: AIParsedMeasurement[];
  trainingDays?: AIParsedTrainingDay[];
  warnings?: string[];
  confidence?: number;
}

async function callClaudeAPI(text: string): Promise<string> {
  // Production: use Vercel serverless proxy
  // Development: use direct API (needs VITE_ANTHROPIC_API_KEY)
  const isProduction = import.meta.env.PROD;

  if (isProduction) {
    const response = await fetch('/api/parse-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.substring(0, 50000) }),
    });
    if (!response.ok) throw new Error(`Proxy hiba: ${response.status}`);
    const data = await response.json();
    if (!data.result && !data.foods) throw new Error('Üres válasz a proxytól');

    // Proxy returns { result: stringified { ingredients?, weeks, detected_weeks, detected_days_per_week } }.
    // REQUIREMENT 1: ingredients = clean atomic names. REQUIREMENT 2: weeks = 4-week meal plan.
    if (data.result) {
      try {
        const plan = JSON.parse(data.result);
        const nutritionPlan = {
          weeks: plan.weeks ?? [],
          detected_weeks: plan.detected_weeks ?? (plan.weeks?.length ?? 0),
          detected_days_per_week: typeof plan.detected_days_per_week === 'number'
            ? plan.detected_days_per_week
            : (plan.weeks?.[0]?.length ?? 7),
        };
        return JSON.stringify({
          nutritionPlan: nutritionPlan.weeks?.length ? nutritionPlan : null,
          ingredients: Array.isArray(plan.ingredients) ? plan.ingredients : undefined,
        });
      } catch {
        return String(data.result);
      }
    }

    return JSON.stringify({ nutritionPlan: data.foods ?? null });
  }

  // Development fallback: direct API call
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY nincs beállítva');

  const maxTextLength = 50000;
  const truncatedText = text.length > maxTextLength ? text.substring(0, maxTextLength) + '\n\n[CSONKÍTVA]' : text;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Elemezd ezt a 30 napos étkezési tervet és add vissza a kért JSON formátumban. Különösen fontos: az ingredients tömbben legyen minden egyedi alapélelmiszer amit megtalálsz (minimum 50 db), kizárólag magyar nevekkel, atomikusan (nem összetett ételek).\n\nSZÖVEG:\n${truncatedText}` }],
    }),
  });

  if (!response.ok) throw new Error(`API hiba: ${response.status}`);
  const data = await response.json();
  return data.content?.[0]?.text ?? '';
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

  // Support top-level plan (e.g. dev LLM returns { weeks, detected_weeks } without nutritionPlan wrapper)
  let planSource: AIParsedNutritionPlan | null = llmOutput.nutritionPlan?.weeks?.length
    ? llmOutput.nutritionPlan
    : null;
  if (!planSource && Array.isArray((llmOutput as { weeks?: unknown[] }).weeks) && (llmOutput as { weeks: unknown[] }).weeks.length > 0) {
    const raw = llmOutput as { weeks: AIParsedDay[][]; detected_weeks?: number; detected_days_per_week?: number };
    planSource = {
      weeks: raw.weeks,
      detected_weeks: raw.detected_weeks ?? raw.weeks.length,
      detected_days_per_week: raw.detected_days_per_week ?? (Array.isArray(raw.weeks[0]) ? raw.weeks[0].length : 7),
    };
  }

  // Filter garbage: keep only ingredients with clean names; normalize first so "3 tojás" -> "tojás" passes
  let nutritionPlan: AIParsedNutritionPlan | null = planSource;
  if (nutritionPlan) {
    const weeksFiltered = nutritionPlan.weeks
      .map(w => w
        .map(d => ({
          ...d,
          meals: d.meals
            .map(m => ({
              ...m,
              ingredients: (m.ingredients || [])
                .map((ing: Partial<AIParsedMeal['ingredients'][0]> & { name?: string }) => {
                  const rawName = String(ing?.name ?? '').trim();
                  const name = normalizeIngredientName(rawName) || rawName;
                  return {
                    name,
                    quantity_grams: ing.quantity_grams ?? 0,
                    unit: (ing.unit as 'g' | 'ml' | 'db') ?? 'g',
                    ...(ing.matched_food_id && { matched_food_id: ing.matched_food_id }),
                    ...(ing.estimated_calories_per_100g != null && { estimated_calories_per_100g: ing.estimated_calories_per_100g }),
                    ...(ing.estimated_protein_per_100g != null && { estimated_protein_per_100g: ing.estimated_protein_per_100g }),
                    ...(ing.estimated_carbs_per_100g != null && { estimated_carbs_per_100g: ing.estimated_carbs_per_100g }),
                    ...(ing.estimated_fat_per_100g != null && { estimated_fat_per_100g: ing.estimated_fat_per_100g }),
                    ...(ing.estimated_category && { estimated_category: ing.estimated_category }),
                  };
                })
                .filter((ing): ing is AIParsedMeal['ingredients'][0] =>
                  Boolean(ing.name && isAcceptableIngredientName(ing.name) && isCleanFoodName(ing.name))),
            }))
            .filter(m => m.ingredients.length > 0),
        }))
        .filter(d => d.meals.length > 0),
      )
      .filter(w => w.length > 0);
    if (weeksFiltered.length === 0) nutritionPlan = null;
    else nutritionPlan = { ...nutritionPlan, weeks: weeksFiltered, detected_weeks: weeksFiltered.length };
  }

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

  const ingredients = Array.isArray(llmOutput.ingredients)
    ? llmOutput.ingredients.filter((n): n is string => typeof n === 'string' && n.length > 0)
    : undefined;

  return {
    userProfile,
    nutritionPlan,
    ingredients,
    measurements,
    trainingDays: llmOutput.trainingDays ?? [],
    warnings,
    confidence,
    rawText,
  };
}

export async function parseWithLLM(rawText: string): Promise<AIParsedDocument & { usedLLM: boolean }> {
  const isProduction = import.meta.env.PROD;
  const apiKey = getApiKey();

  // In production, always use the proxy (no VITE_ANTHROPIC_API_KEY needed)
  // In development, fallback to regex if no API key
  if (!isProduction && !apiKey) {
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
  return !!getApiKey() || import.meta.env.PROD;
}

export function getParserInfo(): { name: string; available: boolean } {
  const available = isLLMParserAvailable();
  return { name: available ? 'Claude AI Parser' : 'Regex Parser (alap)', available };
}