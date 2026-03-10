import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** User daily calorie target (kcal). For now hardcoded; later from user profile (userProfile.dailyCalorieTarget). */
const DAILY_CALORIE_TARGET = 2000;

// Day name → day number mapping
const DAY_NUMBER: Record<string, number> = {
  'HÉTFŐ': 1, 'KEDD': 2, 'SZERDA': 3, 'CSÜTÖRTÖK': 4,
  'PÉNTEK': 5, 'SZOMBAT': 6, 'VASÁRNAP': 7,
  'Hétfő': 1, 'Kedd': 2, 'Szerda': 3, 'Csütörtök': 4,
  'Péntek': 5, 'Szombat': 6, 'Vasárnap': 7,
};

const DAY_NAMES: string[] = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

// Meal type → macro ratio estimates (protein%, carb%, fat% of calories)
const MACRO_RATIOS: Record<string, { p: number; c: number; f: number }> = {
  breakfast: { p: 0.25, c: 0.40, f: 0.35 },
  lunch:     { p: 0.30, c: 0.45, f: 0.25 },
  dinner:    { p: 0.35, c: 0.15, f: 0.50 },
  snack:     { p: 0.50, c: 0.35, f: 0.15 },
};

// Garbage patterns: merged table cells, PDF noise, label text (not food)
const GARBAGE_PATTERNS = [
  /\([A-Za-z0-9*φ~{}\[\]<>=\\]+\)/g,           // (AVk*FhA8φNI...
  /[φ~{}\[\]<>*=]/g,                           // single forbidden chars
  /\bNapi összesen\b/gi,
  /\bProtein\s*\+\s*egészséges zsír\b/gi,
];
const LABEL_PHRASES = ['napi összesen', 'protein + egészséges zsír', 'összesen'];

function removeAccents(s: string): string {
  try {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    return s;
  }
}

/**
 * Clean PDF-extracted text: remove merged cell garbage, label lines, forbidden chars.
 * REQUIREMENT 1: no "(AVk*FhA8φNI...", no φ, ~, }, {, <, >, *, =
 */
function cleanPdfText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let out = text;

  for (const re of GARBAGE_PATTERNS) {
    out = out.replace(re, ' ');
  }

  // Remove lines that are only labels or too long without spaces (run-on garbage)
  const lines = out.split(/\r?\n/);
  const cleaned = lines
    .map(line => {
      const t = line.trim();
      const lower = t.toLowerCase();
      if (LABEL_PHRASES.some(phrase => lower.includes(phrase))) return '';
      if (t.length > 25 && !/\s/.test(t)) return ''; // no space in long string = garbage
      return line;
    })
    .filter(Boolean);

  return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content, text, pdf_base64, meal_count = 3, daily_kcal = DAILY_CALORIE_TARGET, mode } = req.body;

  // Quick mode: foods-only extraction with a single lightweight Gemini call.
  if (pdf_base64 && mode === 'quick') {
    try {
      const ingredients = await parseQuickIngredients(pdf_base64);
      const cleaned = filterCleanIngredients(ingredients);
      const stats = {
        days_count: 0,
        meals_count: 0,
        foods_count: cleaned.length,
        training_days: 0,
        rest_days: 0,
      };
      console.log('[parse-document] quick mode ingredients:', cleaned.length);
      return res.status(200).json({
        mode: 'quick',
        ingredients: cleaned,
        stats,
      });
    } catch (error: any) {
      console.error('[parse-document] quick mode failed, falling back to full engine:', error);
      // fall through to full engine below
    }
  }

  // If base64 PDF provided → try Gemini first
  if (pdf_base64) {
    // Deterministic HÉT / NAP parser path if caller provided extracted text
    if (req.body.extracted_text) {
      try {
        const det = parseHetNapStructure(String(req.body.extracted_text || ''));
        if (det && det.weeks.length > 0) {
          const stats = computePlanStats(det.weeks, det.ingredients);
          console.log('[hetNap] deterministic parse succeeded:', JSON.stringify(stats));
          return res.status(200).json({
            result: JSON.stringify({
              ingredients: det.ingredients,
              weeks: det.weeks,
              detected_weeks: det.weeks.length,
              detected_days_per_week: 7,
            }),
            plan_type: 'weekly',
            engine: 'deterministic',
            stats,
          });
        }
      } catch (err) {
        console.warn('[hetNap] deterministic parser failed, falling back to Gemini:', err);
      }
    }

    try {
      const geminiResult = await parseWithGemini(pdf_base64, meal_count, daily_kcal);
      console.log(
        `[parse-document] Gemini engine (${geminiResult.plan_type}) : ${geminiResult.ingredients.length} ingredients, ${geminiResult.weeks.length} weeks`
      );
      const stats = computePlanStats(geminiResult.weeks, geminiResult.ingredients);
      console.log('[API] final stats (gemini):', JSON.stringify(stats));
      return res.status(200).json({
        result: JSON.stringify({
          ingredients: geminiResult.ingredients,
          detected_weeks: geminiResult.detected_weeks,
          detected_days_per_week: geminiResult.detected_days_per_week,
          weeks: geminiResult.weeks,
        }),
        plan_type: geminiResult.plan_type,
        engine: 'gemini',
        stats,
      });
    } catch (err: any) {
      console.error('[gemini] failed, falling back to Claude:', err?.message || err);
      // fall through to Claude-based text engine below
    }
  }

  const rawText: string = content || text || '';

  if (!rawText) {
    return res.status(400).json({ error: 'No content provided' });
  }

  try {
    const cleanedText = cleanPdfText(rawText);
    const payload = await parseDocumentToIngredientsAndPlan(cleanedText);

    const result = {
      ingredients: payload.ingredients,
      detected_weeks: payload.detected_weeks,
      detected_days_per_week: payload.detected_days_per_week,
      weeks: payload.weeks,
    };

    console.log(
      `[parse-document] Done (${payload.plan_type}) : ${payload.ingredients.length} ingredients, ${payload.weeks.length} weeks`
    );
    const computedStats = computePlanStats(payload.weeks, payload.ingredients);
    console.log('[API] final stats (claude):', JSON.stringify(computedStats));
    return res.status(200).json({
      result: JSON.stringify(result),
      plan_type: payload.plan_type,
      engine: 'claude',
      stats: computedStats,
    });
  } catch (error: any) {
    console.error('[parse-document] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to parse document' });
  }
}

function computePlanStats(
  weeks: any[][],
  ingredients: string[],
): {
  days_count: number;
  meals_count: number;
  foods_count: number;
  training_days: number;
  rest_days: number;
} {
  const safeWeeks = Array.isArray(weeks) ? weeks : [];
  const allDays = safeWeeks.reduce<any[]>((acc, w) => {
    if (Array.isArray(w)) acc.push(...w);
    return acc;
  }, []);

  const days_count = allDays.length;
  const meals_count = allDays.reduce((sum, day) => {
    const meals = Array.isArray(day?.meals) ? day.meals : [];
    return sum + meals.length;
  }, 0);

  const foods_count = Array.isArray(ingredients) ? ingredients.length : 0;

  const training_days = allDays.filter((d) => {
    if (d?.is_training_day === true) return true;
    const type = (d?.type || '').toString().toLowerCase();
    return type === 'edzés' || type === 'edzes' || type === 'training';
  }).length;

  const rest_days = allDays.filter((d) => {
    if (d?.is_training_day === false) return true;
    const type = (d?.type || '').toString().toLowerCase();
    return type === 'pihenő' || type === 'piheno' || type === 'rest';
  }).length;

  return {
    days_count,
    meals_count,
    foods_count,
    training_days,
    rest_days,
  };
}

/**
 * Known meal-name prefixes that sometimes get merged into item strings.
 */
const MEAL_PREFIXES = ['Reggeli', 'Ebéd', 'Ebед', 'Vacsora', 'Breakfast', 'Lunch', 'Dinner', 'Tízórai', 'Uzsonna'];

function stripMealPrefix(str: string): string {
  const s = String(str || '').trim();
  if (!s) return s;
  for (const prefix of MEAL_PREFIXES) {
    if (s.startsWith(prefix)) {
      return s.slice(prefix.length).trim();
    }
  }
  return s;
}

/**
 * Deterministic parser for HÉT / NAP structured meal plans.
 */
function parseHetNapStructure(text: string): { ingredients: string[]; weeks: any[][] } | null {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const DAY_MAP: Record<string, { hu: string; training: boolean }> = {
    'HÉT': { hu: 'Hétfő', training: true },
    'KED': { hu: 'Kedd', training: false },
    'SZE': { hu: 'Szerda', training: true },
    'CSÜ': { hu: 'Csütörtök', training: true },
    'PÉN': { hu: 'Péntek', training: false },
    'SZO': { hu: 'Szombat', training: false },
    'VAS': { hu: 'Vasárnap', training: false },
  };

  const hasHetStructure = lines.some(l => /^\d+\.\s*HÉT/i.test(l));
  if (!hasHetStructure) return null;

  const days: any[] = [];
  const ingredientSet = new Set<string>();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const dayKey = Object.keys(DAY_MAP).find(d => line === d || line.startsWith(d + ' '));
    if (dayKey) {
      const next = lines[i + 1] || '';
      const isTraining = /EDZÉS/i.test(line) || /EDZÉS/i.test(next);
      const isRest = /PIHENŐ/i.test(line) || /PIHENŐ/i.test(next);
      if (isTraining || isRest) {
        const reggeli = lines[i + 2] || '';
        const ebed = lines[i + 3] || '';
        const vacsora = lines[i + 4] || '';
        const utani = lines[i + 5] || '';

        const parseItems = (s: string) =>
          s
            .split('+')
            .map(x => x.trim())
            .filter(x => x.length > 1 && !/^\d+$/.test(x) && !/~\d/.test(x));

        const reggeliItems = parseItems(reggeli);
        const ebedItems = parseItems(ebed);
        const vacsoraItems = parseItems(vacsora);
        const utaniItems = utani && !utani.startsWith('~') ? parseItems(utani) : [];

        [...reggeliItems, ...ebedItems, ...vacsoraItems, ...utaniItems].forEach(item => {
          let name = item
            .replace(/^\d+\s*g\s+/i, '')
            .replace(/^\d+\s*ml\s+/i, '')
            .replace(/^\d+\s+/, '')
            .replace(/^½\s*/, '')
            .trim();
          if (name.length > 1) {
            name = name.charAt(0).toUpperCase() + name.slice(1);
            ingredientSet.add(name);
          }
        });

        const meals: any[] = [
          { name: 'Reggeli', items: reggeliItems, meal_type: 'breakfast' },
          { name: 'Ebéd', items: ebedItems, meal_type: 'lunch' },
          { name: 'Vacsora', items: vacsoraItems, meal_type: 'dinner' },
        ];
        if (utaniItems.length > 0) {
          meals.push({ name: 'Edzés utáni', items: utaniItems, meal_type: 'snack' });
        }

        days.push({
          day: days.length + 1,
          dayOfWeek: DAY_MAP[dayKey].hu,
          type: isTraining ? 'edzés' : 'pihenő',
          is_training_day: isTraining,
          meals,
        });

        i += utaniItems.length > 0 ? 6 : 5;
        continue;
      }
    }
    i++;
  }

  if (days.length < 7) return null;

  const weeks = convert30DayPlanToWeeks(days);
  const ingredients = Array.from(ingredientSet);

  console.log('[hetNap] parsed days:', days.length, 'ingredients:', ingredients.length);
  return { ingredients, weeks };
}

/**
 * STEP 1: Detect whether the text is a weekly structured plan or an options-based plan.
 */
async function detectPlanType(cleanedText: string): Promise<'weekly' | 'options'> {
  const lowerText = cleanedText.toLowerCase();
  const weeklySignals = ['1. hét', '2. hét', 'nap reggeli ebéd', 'het\nedzés', 'hétfő\nedzés'];
  if (weeklySignals.some(s => lowerText.includes(s))) {
    console.log('[detectPlanType] weekly signals found, skipping LLM detection');
    return 'weekly';
  }

  const detectPrompt = `Analyze this meal plan text and respond with ONLY one word:
- "weekly" if it has explicit day-by-day schedule (Hétfő, Kedd, etc with specific meals per day)
- "options" if it has meal option lists/columns to choose from (A oszlop, B oszlop, reggeli variációk, vacsora opciók)

TEXT:
${cleanedText.substring(0, 3000)}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 16,
      messages: [{ role: 'user', content: detectPrompt }],
    });

    const block = message.content[0] as any;
    const text =
      block && typeof block.text === 'string'
        ? block.text
        : typeof block?.json === 'string'
          ? block.json
          : JSON.stringify(block);

    const lower = text.trim().toLowerCase();
    if (lower.includes('options')) return 'options';
    if (lower.includes('weekly')) return 'weekly';
    // Default: weekly structured plan
    return 'weekly';
  } catch (err) {
    console.warn('[parse-document] detectPlanType failed, defaulting to weekly:', err);
    return 'weekly';
  }
}

/**
 * STEP 3 helper: Generate a 28-day plan from options using rotation logic.
 * Uses:
 * - breakfast_options
 * - lunch_protein + lunch_carb_training / lunch_carb_rest
 * - dinner_options
 * - post_workout (training days only)
 */
function generate28DayPlanFromOptions(options: any, mealCount: number): any[] {
  const trainingDays = [1, 3, 4, 6]; // Hétfő, Szerda, Csütörtök, Szombat (1-based)

  const breakfasts = Array.isArray(options?.breakfast_options) ? options.breakfast_options : [];
  const lunchProteins = Array.isArray(options?.lunch_protein) ? options.lunch_protein : [];
  const lunchCarbTraining = Array.isArray(options?.lunch_carb_training) ? options.lunch_carb_training : [];
  const lunchCarbRest = Array.isArray(options?.lunch_carb_rest) ? options.lunch_carb_rest : [];
  const dinners = Array.isArray(options?.dinner_options) ? options.dinner_options : [];
  const postWorkout = options?.post_workout || null;

  const days: any[] = [];

  for (let i = 0; i < 28; i++) {
    const dayOfWeek = (i % 7) + 1;
    const isTraining = trainingDays.includes(dayOfWeek);
    const meals: any[] = [];

    // Breakfast (always, if we have options)
    if (breakfasts.length > 0) {
      const breakfast = breakfasts[i % breakfasts.length] || {};
      meals.push({
        name: 'Reggeli',
        items: Array.isArray(breakfast.items) ? breakfast.items : [],
        kcal: typeof breakfast.kcal === 'number' ? breakfast.kcal : 0,
      });
    }

    // Lunch protein + carb
    if (mealCount >= 2 && lunchProteins.length > 0 && (lunchCarbTraining.length > 0 || lunchCarbRest.length > 0)) {
      const protein = lunchProteins[i % lunchProteins.length] || {};
      const carbSource = isTraining ? lunchCarbTraining : lunchCarbRest;
      const carb = carbSource.length > 0 ? carbSource[i % carbSource.length] || {} : {};

      const proteinItems = Array.isArray(protein.items) ? protein.items : [];
      const carbItems = Array.isArray(carb.items) ? carb.items : [];
      const proteinKcal = typeof protein.kcal === 'number' ? protein.kcal : 0;
      const carbKcal = typeof carb.kcal === 'number' ? carb.kcal : 0;

      meals.push({
        name: 'Ebéd',
        items: [...proteinItems, ...carbItems],
        kcal: proteinKcal + carbKcal,
      });
    }

    // Dinner
    if (mealCount >= 3 && dinners.length > 0) {
      const dinner = dinners[i % dinners.length] || {};
      meals.push({
        name: 'Vacsora',
        items: Array.isArray(dinner.items) ? dinner.items : [],
        kcal: typeof dinner.kcal === 'number' ? dinner.kcal : 0,
      });
    }

    // Snack — post-workout only on training days
    if (mealCount >= 4 && isTraining) {
      if (postWorkout) {
        meals.push({
          name: 'Edzés utáni',
          items: Array.isArray(postWorkout.items) ? postWorkout.items : ['30g fehérjepor', '1 banán'],
          kcal: typeof postWorkout.kcal === 'number' ? postWorkout.kcal : 220,
        });
      } else {
        meals.push({
          name: 'Edzés utáni',
          items: ['30g fehérjepor', '1 banán'],
          kcal: 220,
        });
      }
    }

    const dayName = DAY_NAMES[dayOfWeek - 1] ?? 'Hétfő';
    const totalKcal = meals.reduce((sum, m) => sum + (typeof m.kcal === 'number' ? m.kcal : 0), 0);

    days.push({
      day: i + 1,
      dayOfWeek: dayName,
      type: isTraining ? 'edzés' : 'pihenő',
      totalKcal,
      meals,
    });
  }

  return days;
}

/**
 * Helper for Gemini: turn parsed options/weekly structure into a 28-day plan.
 */
function generate28DayPlan(parsed: any, mealCount: number, _dailyKcal: number): any[] {
  // If Gemini already produced a day-by-day plan, trust it.
  if (Array.isArray(parsed?.plan) && parsed.plan.length > 0) {
    return parsed.plan;
  }

  // Otherwise, assume options-based structure and synthesize days from options.
  return generate28DayPlanFromOptions(parsed, mealCount);
}

/**
 * Dual-engine parser:
 * - Engine 1: weekly structured plan (28 days)
 * - Engine 2: options-based plan (rotation over breakfast/lunch/dinner/snack options)
 */
async function parseDocumentToIngredientsAndPlan(cleanedText: string): Promise<{
  ingredients: string[];
  weeks: any[][];
  detected_weeks: number;
  detected_days_per_week: number;
  plan_type: 'weekly' | 'options';
}> {
  const planType = await detectPlanType(cleanedText);

  // STEP 2A: Weekly structured engine (current strict prompt)
  if (planType === 'weekly') {
    const prompt = `You are a nutrition data extractor. Parse this Hungarian meal plan PDF text.

The input may be in ANY language. Output MUST be in Hungarian.

CRITICAL RULES:
1. Meal names MUST be: "Reggeli", "Ebéd", "Vacsora", "Edzés utáni" — nothing else
2. Items MUST be individual ingredients with quantity, e.g: "3 tojás (180g)", "60g tk kenyér", "½ avokádó (70g)"
3. NEVER merge the meal name into the item string — "EbédSovány protein" is WRONG
4. Extract ALL 28 days (4 weeks × 7 days)
5. Each meal must have SEPARATE items array — one ingredient per array element

Return ONLY this JSON (no markdown, no explanation):
{
  "ingredients": ["tojás","csirkemell","lazac",...],
  "plan": [
    {
      "day": 1,
      "dayOfWeek": "Hétfő",
      "type": "edzés",
      "totalKcal": 2150,
      "meals": [
        {
          "name": "Reggeli",
          "items": ["3 tojás (180g)", "60g tk kenyér", "½ avokádó (70g)"],
          "kcal": 520
        },
        {
          "name": "Ebéd", 
          "items": ["220g csirkemell", "180g főtt krumpli", "200g brokkoli"],
          "kcal": 610
        },
        {
          "name": "Vacsora",
          "items": ["180g lazac", "250g saláta", "1 ek olivaolaj"],
          "kcal": 520
        },
        {
          "name": "Edzés utáni",
          "items": ["30g fehérjepor", "1 banán (120g)"],
          "kcal": 220
        }
      ]
    }
  ]
}

TEXT TO PARSE:
${cleanedText.substring(0, 45000)}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    });

    const firstBlock = message.content[0] as any;
    const responseText =
      firstBlock && typeof firstBlock.text === 'string'
        ? firstBlock.text
        : typeof firstBlock?.json === 'string'
          ? firstBlock.json
          : JSON.stringify(firstBlock);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object in LLM response (weekly engine)');
    }

    const parsed = JSON.parse(jsonMatch[0]) as { ingredients?: string[]; plan?: any[] };
    const rawIngredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
    const rawPlan = Array.isArray(parsed.plan) ? parsed.plan : [];

    const ingredients = filterCleanIngredients(rawIngredients);
    const weeks = convert30DayPlanToWeeks(rawPlan);

    return {
      ingredients,
      weeks,
      detected_weeks: weeks.length,
      detected_days_per_week: 7,
      plan_type: 'weekly',
    };
  }

  // STEP 2B: Options-based engine (VICTUS-style multi-column PDFs)
  const optionsPrompt = `You are a nutrition data extractor. This text comes from a multi-column PDF table where columns got merged into single lines.

The document structure is:
- REGGELI section: 4 columns merged → "Reggel-edzés napokon" has 2 sub-columns, "Reggel-pihenő napokon" has 2 sub-columns. Each ✓ item is a separate breakfast option ingredient.
- EBÉD section: A oszlop = protein sources, B oszlop = edzésnap köretek, C oszlop = pihenőnap köretek
- VACSORA section: Multiple dinner option columns merged together, each ➢ starts a new option
- NASSOLÁS section: Snack options

YOUR TASK: Reconstruct the original structure by grouping items that belong together.

For breakfast: Group consecutive ✓ items that form a complete meal (typically 3-5 items). 
For lunch: Separate A/B/C columns by the labels "A –", "B –", "C –"
For dinner: Each ➢ item or group of ➢ items is one dinner option
For snacks: Items after "Nassolás" header

Return this JSON (no markdown):
{
  "plan_type": "options",
  "breakfast_options": [
    {"id": 1, "items": ["60g teljes kiőrlésű kenyér", "10g vaj", "90g csirkemell sonka", "1 alma"], "kcal": 420, "day_type": "training"},
    {"id": 2, "items": ["250g joghurt", "50g zabpehely", "1 kis kanál kakaó", "1 narancs"], "kcal": 380, "day_type": "training"},
    ...extract ALL breakfast variants...
  ],
  "lunch_protein": [
    {"id": 1, "name": "Csirkemell", "items": ["220g csirkemell grill/párolt"], "kcal": 330},
    {"id": 2, "name": "Csirkecomb", "items": ["180g csirkecomb grill/párolt"], "kcal": 280},
    ...all A oszlop items...
  ],
  "lunch_carb_training": [
    {"id": 1, "name": "Főtt krumpli", "items": ["180g natúr főtt krumpli rozmarinnal"], "kcal": 150},
    ...all B oszlop items...
  ],
  "lunch_carb_rest": [
    {"id": 1, "name": "Mangold főzelék", "items": ["200g mangold főzelék", "1 ek tökmagolaj"], "kcal": 120},
    ...all C oszlop items...
  ],
  "dinner_options": [
    {"id": 1, "items": ["250g zöldség saláta", "90g juhsajt"], "kcal": 350},
    {"id": 2, "items": ["300g görög saláta", "csirkemell", "1 ek kendermag"], "kcal": 420},
    ...all dinner options...
  ],
  "snack_options": [
    {"id": 1, "items": ["40g dió"], "kcal": 240},
    {"id": 2, "items": ["140g joghurt"], "kcal": 100},
    ...
  ],
  "post_workout": {"items": ["30g fehérjepor", "1 banán"], "kcal": 220},
  "ingredients": ["csirkemell", "joghurt", "tojás", "avokádó", ...]
}

TEXT:
${cleanedText}`;

  const optionsMessage = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 16000,
    messages: [{ role: 'user', content: optionsPrompt }],
  });

  const optionsBlock = optionsMessage.content[0] as any;
  const optionsText =
    optionsBlock && typeof optionsBlock.text === 'string'
      ? optionsBlock.text
      : typeof optionsBlock?.json === 'string'
        ? optionsBlock.json
        : JSON.stringify(optionsBlock);

  const optionsMatch = optionsText.match(/\{[\s\S]*\}/);
  if (!optionsMatch) {
    throw new Error('No JSON object in LLM response (options engine)');
  }

  const options = JSON.parse(optionsMatch[0]) as {
    ingredients?: string[];
    breakfast_options?: any[];
    lunch_protein?: any[];
    lunch_carb_training?: any[];
    lunch_carb_rest?: any[];
    dinner_options?: any[];
    snack_options?: any[];
    post_workout?: { items?: string[]; kcal?: number };
  };

  // For now, default to 3 meals/day (Reggeli, Ebéd, Vacsora) + Edzés utáni snack on training days.
  const generatedDays = generate28DayPlanFromOptions(options, 3);
  const ingredients = filterCleanIngredients(Array.isArray(options.ingredients) ? options.ingredients : []);
  const weeks = convert30DayPlanToWeeks(generatedDays);

  return {
    ingredients,
    weeks,
    detected_weeks: weeks.length,
    detected_days_per_week: 7,
    plan_type: 'options',
  };
}

/**
 * Gemini 2.0 Flash parser for base64-encoded PDFs.
 */
async function parseWithGemini(
  pdfBase64: string,
  mealCount: number,
  dailyKcal: number
): Promise<{
  ingredients: string[];
  weeks: any[][];
  detected_weeks: number;
  detected_days_per_week: number;
  plan_type: 'weekly' | 'options';
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  // FIX 2 — log approximate PDF size for diagnostics (chunking later)
  const pdfSizeKB = Math.round((pdfBase64.length * 0.75) / 1024);
  console.log('[gemini] PDF size:', pdfSizeKB, 'KB');
  if (pdfSizeKB > 500) {
    console.warn('[gemini] LARGE PDF detected, consider chunking:', pdfSizeKB, 'KB');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { maxOutputTokens: 8192 },
  });

  // Call 2 – flat 28-day plan (no options structure)
  const planPrompt = `Parse this meal plan PDF. Return ONLY this exact JSON structure, no markdown:
{
  "plan": [
    {
      "day": 1,
      "dayOfWeek": "Hétfő", 
      "type": "edzés",
      "meals": [
        {"name": "Reggeli", "items": ["3 tojás", "60g tk kenyér", "½ avokádó"], "kcal": 520},
        {"name": "Ebéd", "items": ["220g csirkemell", "180g főtt krumpli", "200g brokkoli"], "kcal": 610},
        {"name": "Vacsora", "items": ["180g lazac", "250g saláta", "1 ek olívaolaj"], "kcal": 520},
        {"name": "Edzés utáni", "items": ["30g fehérjepor", "1 banán"], "kcal": 220}
      ]
    }
  ],
  "ingredients": ["tojás", "tk kenyér", "avokádó", "csirkemell"]
}

Requirements:
- Extract ALL 28 days of the plan (4 weeks × 7 days).
- For each day, set "day" (1-28), "dayOfWeek" ("Hétfő"..."Vasárnap"), and "type" ("edzés" or "pihenő").
- For each meal, set:
  - name: exactly one of "Reggeli", "Ebéd", "Vacsora", "Edzés utáni"
  - items: array of ingredient strings in Hungarian with quantities (e.g. "3 tojás", "60g tk kenyér").
  - kcal: approximate kcal for that meal (integer).
- "ingredients": flat list of ALL unique base ingredients across the whole document, Hungarian names only.
- ALL names MUST be in Hungarian (walnut → dió, potato → krumpli, yogurt → joghurt, celery → zeller, cottage cheese → túró).
- Do NOT return any explanation or markdown, ONLY valid JSON matching the structure above.`;

  // Call 1 – focused ingredient extraction (maximal coverage, 80–100 items)
  const ingredientPrompt = `You are a food ingredient extractor. List EVERY single food ingredient from this meal plan PDF.

Rules:
- Output ONLY a JSON array of objects: [{"name": "csirkemell", "category": "Feherje"}, ...]
- ALL names in Hungarian
- Include EVERYTHING: meats, fish, eggs, dairy, vegetables, fruits, grains, nuts, seeds, oils, spices, condiments
- Atomic ingredients only (no compound names)
- Expected count: 80-100 items
- Categories: Feherje, Tejtermek, Zoldseg, Gyumolcs, Komplex_szenhidrat, Egeszseges_zsir, Mag, Huvelyes

From this PDF extract ALL of these and more:
csirkemell, pulykamell, csirkecomb, hal, tojás, bacon, sonka, tehéntúró, joghurt, kefir, mozzarella, feta, juhsajt, krémsajt, telemia, vaj, brokkoli, spenót, paradicsom, paprika, avokádó, uborka, káposzta, zeller, gomba, cékla, cukkini, mangold, spárga, póréhagyma, karalábé, karfiol, padlizsán, sárgarépa, saláta, olajbogyó, alma, banán, narancs, kivi, eper, málna, gesztenye, áfonya, tk kenyér, zabpehely, rozspehely, quinoa, laska, tortilla, rizs, olívaolaj, kókuszolaj, tökmagolaj, dió, mandula, kesudió, napraforgómag, tökmag, kendermag, chia, mogyoróvaj, fehérjepor, kakaó, fahéj, citromlé, zakuszka

Return ONLY the JSON array, no other text.`;

  // First: try to get a maximally complete ingredient list
  let ingredientNames: string[] = [];
  try {
    const ingredientResp = await model.generateContent([
      { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
      ingredientPrompt,
    ]);
    const ingredientText = ingredientResp.response.text();
    const ingredientJsonMatch = ingredientText.match(/\[[\s\S]*\]/);
    if (!ingredientJsonMatch) {
      throw new Error('No JSON array in Gemini ingredient response');
    }
    const ingredientParsed = JSON.parse(ingredientJsonMatch[0]);
    if (Array.isArray(ingredientParsed)) {
      ingredientNames = ingredientParsed
        .map((ing: any) => (ing && typeof ing.name === 'string' ? ing.name : ''))
        .filter(Boolean);
    }
  } catch (err) {
    console.warn('[parse-document] Gemini ingredient extraction failed, will fall back to plan ingredients:', err);
  }

  // Second: get structured options / plan
  const response = await model.generateContent([
    { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
    planPrompt,
  ]);

  const responseText = response.response.text();
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Gemini response');

  const parsed = JSON.parse(jsonMatch[0]);
  console.log('[gemini] parsed keys:', Object.keys(parsed || {}));
  console.log('[gemini] parsed.plan length:', Array.isArray((parsed as any)?.plan) ? (parsed as any).plan.length : 0);
  try {
    console.log('[gemini] parsed.plan[0]:', JSON.stringify((parsed as any)?.plan?.[0]).substring(0, 300));
  } catch {
    console.log('[gemini] parsed.plan[0]: <unserializable>');
  }
  console.log('[gemini] breakfast_options:', Array.isArray((parsed as any)?.breakfast_options) ? (parsed as any).breakfast_options.length : 0);
  const days = generate28DayPlan(parsed, mealCount, dailyKcal);
  const weeks = convert30DayPlanToWeeks(days);
  console.log('[gemini] days generated:', days.length);
  console.log('[gemini] weeks generated:', weeks.length, weeks.map((w: any[]) => w.length));

  // If the focused ingredient call failed or returned nothing, fall back to any ingredients from the plan JSON
  if (ingredientNames.length === 0 && Array.isArray(parsed.ingredients)) {
    ingredientNames = (parsed.ingredients as any[])
      .map((ing: any) => (ing && typeof ing.name === 'string' ? ing.name : ''))
      .filter(Boolean);
  }

  const ingredients = filterCleanIngredients(ingredientNames);

  return {
    ingredients,
    weeks,
    detected_weeks: weeks.length,
    detected_days_per_week: 7,
    plan_type: parsed.plan_type === 'weekly' ? 'weekly' : 'options',
  };
}

/**
 * FIX 1 — Quick mode: lightweight foods-only Gemini parser.
 * Returns a flat list of ingredient names (Hungarian, atomic).
 */
async function parseQuickIngredients(pdfBase64: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { maxOutputTokens: 2048 },
  });

  const quickPrompt = `List EVERY food ingredient from this meal plan PDF.

Rules:
- Output ONLY a JSON array of objects: [{"name": "csirkemell", "category": "Feherje"}, ...]
- ALL ingredient names MUST be in Hungarian (walnut → dió, potato → krumpli, yogurt → joghurt, celery → zeller, cottage cheese → túró).
- Atomic ingredients only (no combined names like "cukkini-paradicsom").
- No explanation, no markdown, just JSON.`;

  const response = await model.generateContent([
    { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
    quickPrompt,
  ]);

  const text = response.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON array in Gemini quick response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) {
    throw new Error('Quick response JSON is not an array');
  }

  const names = parsed
    .map((ing: any) => {
      if (!ing) return '';
      if (typeof ing === 'string') return ing;
      if (typeof ing.name === 'string') return ing.name;
      return '';
    })
    .filter((v: string) => typeof v === 'string' && v.trim().length > 0);

  return names;
}

/**
 * REQUIREMENT 1 filter: atomic names only; split compounds, strip labels/measurements,
 * accent-insensitive dedup, max ~60–80 unique clean Hungarian ingredients.
 */
function filterCleanIngredients(names: string[]): string[] {
  const forbidden = /[φ~{}\[\]<>*=]/;
  const categoryWords = [
    'sovány','sovany','komplex','zsíros','zsírosabb','magas','vegyes',
    'extra','light','protein','fehérje','feherje','ch'
  ];
  const measurementWords = [
    'g','gramm','gram','kg','db','ml','dl','evőkanál','evokanal','ek',
    'teáskanál','teaskanal','tk','csésze','csesze','adag','adagok'
  ];
  const synonymMap: Record<string, string> = {
    'fehérje por': 'fehérjepor',
    'feherje por': 'fehérjepor',
    'fehérjepor': 'fehérjepor',
    'feherjepor': 'fehérjepor',
  };

  const seen = new Set<string>(); // accent-insensitive key
  const out: string[] = [];

  for (const raw of names) {
    const s = stripMealPrefix(String(raw ?? '')).trim();
    if (!s) continue;
    if (forbidden.test(s)) continue;

    // Strip leading quantity (e.g. "220g csirkemell" -> "csirkemell")
    let base = s.replace(/^\d+[.,]?\d*\s*[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]*\s+/, '').trim();
    if (!base) continue;

    // Split on commas, slashes, plus and dashes into candidate tokens
    const parts = base
      .split(/[,/+\-]/)
      .map(p => p.trim())
      .filter(p => p.length > 0 && p.length <= 40);

    for (let part of parts) {
      let n = part.toLowerCase();

      // Remove category words
      for (const w of categoryWords) {
        n = n.replace(new RegExp(`\\b${w}\\b`, 'gi'), '').trim();
      }

      // Remove standalone measurement tokens
      for (const w of measurementWords) {
        n = n.replace(new RegExp(`\\b${w}\\b`, 'gi'), '').trim();
      }

      // Collapse whitespace
      n = n.replace(/\s+/g, ' ').trim();
      if (!n) continue;

      // Length and label checks
      if (n.length < 2 || n.length > 25) continue;
      if (LABEL_PHRASES.some(phrase => n.includes(phrase))) continue;

      // Apply simple synonym normalization
      if (synonymMap[n]) {
        n = synonymMap[n];
      }

      const accentless = removeAccents(n);
      if (seen.has(accentless)) continue;
      seen.add(accentless);

      const display = n.charAt(0).toUpperCase() + n.slice(1);
      out.push(display);
    }
  }

  return out;
}

/**
 * Parse item string like "3 tojás (180g)" or "60g tk kenyér" → { name, quantity_grams }.
 */
function parseItemToIngredient(itemStr: string): { name: string; quantity_grams: number } {
  const raw = String(itemStr || '').trim();
  const s = stripMealPrefix(raw);
  if (!s) return { name: 'Étel', quantity_grams: 50 };

  const inParens = s.match(/\((\d+)\s*g\)/i) || s.match(/\((\d+)g\)/i);
  if (inParens) {
    const grams = parseInt(inParens[1], 10) || 50;
    const namePart = s.replace(/\s*\(\d+\s*g\)\s*/gi, '').trim();
    const name = namePart.replace(/^\d+\s+/, '').trim() || 'Étel';
    return { name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(), quantity_grams: grams };
  }

  const leadingG = s.match(/^(\d+)\s*g\s+(.+)$/i);
  if (leadingG) {
    const grams = parseInt(leadingG[1], 10) || 50;
    const name = leadingG[2].trim().charAt(0).toUpperCase() + leadingG[2].trim().slice(1).toLowerCase();
    return { name, quantity_grams: grams };
  }

  return { name: s.replace(/^\d+\s+/, '').trim() || 'Étel', quantity_grams: 50 };
}

/**
 * Convert 30-day plan to 4 weeks × 7 days (AIParsedNutritionPlan format).
 * First 28 days used; cap totalKcal at DAILY_CALORIE_TARGET.
 */
function convert30DayPlanToWeeks(plan: any[]): any[][] {
  const totalAvailableDays = Array.isArray(plan) ? plan.length : 0;

  // Use actual days in the current month (28–31), never hardcode 28.
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0–11
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const maxDays = Math.min(totalAvailableDays, daysInMonth);

  const days = (plan || []).slice(0, maxDays);
  const mealTypeMap: Record<string, string> = {
    'Reggeli': 'breakfast',
    'Ebéd': 'lunch',
    'Vacsora': 'dinner',
    'Edzés utáni': 'snack',
  };

  const weeksCount = Math.max(1, Math.ceil(days.length / 7));
  const weeks: any[][] = Array.from({ length: weeksCount }, () => []);

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const weekIndex = Math.floor(i / 7);
    const dayInWeek = (i % 7) + 1;
    const dayName = d?.dayOfWeek || 'Hétfő';
    const dayNum = DAY_NUMBER[dayName.toUpperCase()] ?? dayInWeek;
    const totalKcal = Math.min(Number(d?.totalKcal) || DAILY_CALORIE_TARGET, DAILY_CALORIE_TARGET);

    const meals = (d?.meals || []).map((m: any) => {
      const type = mealTypeMap[m?.name] || 'lunch';
      const typeKey = type as keyof typeof MACRO_RATIOS;
      const ratio = MACRO_RATIOS[typeKey] || MACRO_RATIOS.lunch;
      const mealKcal = typeof m?.kcal === 'number' ? m.kcal : 0;
      const items = Array.isArray(m?.items) ? m.items : [];
      const ingredients = items.map((item: string) => {
        const { name, quantity_grams } = parseItemToIngredient(item);
        const cal = items.length > 0 ? Math.max(Math.round(mealKcal / items.length), 1) : 100;
        return {
          name,
          quantity_grams,
          unit: 'g' as const,
          estimated_calories_per_100g: Math.round((cal / quantity_grams) * 100) || 100,
          estimated_protein_per_100g: Math.round((cal * ratio.p) / 4),
          estimated_carbs_per_100g: Math.round((cal * ratio.c) / 4),
          estimated_fat_per_100g: Math.round((cal * ratio.f) / 9),
          estimated_category: type === 'breakfast' ? 'Egyéb' : 'Hús & Hal',
        };
      });

      return {
        meal_type: type,
        name: m?.name || 'Ebéd',
        ingredients,
      };
    });

    weeks[weekIndex].push({
      week: weekIndex + 1,
      day: dayNum,
      day_label: dayName,
      is_training_day: String(d?.type).toLowerCase() === 'edzés',
      meals,
    });
  }

  return weeks.filter(w => w.length > 0);
}
