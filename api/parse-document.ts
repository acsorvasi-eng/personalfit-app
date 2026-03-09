import Anthropic from '@anthropic-ai/sdk';

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

  const { content, text } = req.body;
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
    return res.status(200).json({
      result: JSON.stringify(result),
      plan_type: payload.plan_type,
    });

  } catch (error: any) {
    console.error('[parse-document] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to parse document' });
  }
}

/**
 * STEP 1: Detect whether the text is a weekly structured plan or an options-based plan.
 */
async function detectPlanType(cleanedText: string): Promise<'weekly' | 'options'> {
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
 * STEP 3 helper: Generate a 28-day plan from options using simple rotation logic.
 */
function generate28DayPlanFromOptions(options: any, mealCount: number): any[] {
  const trainingDays = [1, 3, 4, 6]; // Mon, Wed, Thu, Sat (1-based dayOfWeek)

  const breakfasts = Array.isArray(options?.breakfast_options) ? options.breakfast_options : [];
  const lunchProteins = Array.isArray(options?.lunch_protein_options) ? options.lunch_protein_options : [];
  const lunchCarbTraining = Array.isArray(options?.lunch_carb_training_options)
    ? options.lunch_carb_training_options
    : [];
  const lunchCarbRest = Array.isArray(options?.lunch_carb_rest_options) ? options.lunch_carb_rest_options : [];
  const dinners = Array.isArray(options?.dinner_options) ? options.dinner_options : [];
  const snacks = Array.isArray(options?.snack_options) ? options.snack_options : [];

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

    // Lunch protein + carb (if mealCount >= 2 and we have options)
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

    // Dinner (if mealCount >= 3 and we have options)
    if (mealCount >= 3 && dinners.length > 0) {
      const dinner = dinners[i % dinners.length] || {};
      meals.push({
        name: 'Vacsora',
        items: Array.isArray(dinner.items) ? dinner.items : [],
        kcal: typeof dinner.kcal === 'number' ? dinner.kcal : 0,
      });
    }

    // Snack post-workout (if mealCount >= 4)
    if (mealCount >= 4 && isTraining) {
      if (snacks.length > 0) {
        const snack = snacks[i % snacks.length] || {};
        meals.push({
          name: 'Edzés utáni',
          items: Array.isArray(snack.items) ? snack.items : ['30g fehérjepor', '1 banán'],
          kcal: typeof snack.kcal === 'number' ? snack.kcal : 220,
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

  // STEP 2B: Options-based engine
  const optionsPrompt = `You are a nutrition coach. This is an OPTIONS-BASED meal plan with breakfast variants, lunch A/B/C columns, and dinner options.

Extract ALL options into these categories:
{
  "breakfast_options": [
    {"items": ["60g tk kenyér", "10g vaj", "90g csirkemell sonka", "1 alma"], "kcal": 450},
    ...all breakfast variants...
  ],
  "lunch_protein_options": [
    {"name": "Csirkemell", "items": ["220g csirkemell grill"], "kcal": 360},
    ...all A column options...
  ],
  "lunch_carb_training_options": [
    {"name": "Főtt krumpli", "items": ["180g főtt krumpli rozmarinnal"], "kcal": 180},
    ...all B column options (training days)...
  ],
  "lunch_carb_rest_options": [
    {"name": "Mangold főzelék", "items": ["200g mangold főzelék"], "kcal": 120},
    ...all C column options (rest days)...
  ],
  "dinner_options": [
    {"items": ["250g zöldség saláta", "90g juhsajt"], "kcal": 380},
    ...all dinner variants...
  ],
  "snack_options": [
    {"items": ["40g dió"], "kcal": 240},
    ...
  ],
  "ingredients": ["csirkemell", "juhsajt", "brokkoli", ...]
}

Rules:
- Extract EVERY option, do not skip any
- Training days (edzésnap): Hétfő, Szerda, Csütörtök, Szombat
- Rest days (pihenőnap): Kedd, Péntek, Vasárnap
- Output ONLY valid JSON, no markdown

TEXT:
${cleanedText.substring(0, 45000)}`;

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
    lunch_protein_options?: any[];
    lunch_carb_training_options?: any[];
    lunch_carb_rest_options?: any[];
    dinner_options?: any[];
    snack_options?: any[];
  };

  // For now, default to 3 meals/day when generating from options.
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
    const s = String(raw ?? '').trim();
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
  const s = String(itemStr || '').trim();
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
  const days = (plan || []).slice(0, 28);
  const mealTypeMap: Record<string, string> = {
    'Reggeli': 'breakfast',
    'Ebéd': 'lunch',
    'Vacsora': 'dinner',
    'Edzés utáni': 'snack',
  };

  const weeks: any[][] = [[], [], [], []];
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
