import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Day name → day number mapping
const DAY_NUMBER: Record<string, number> = {
  'HÉTFŐ': 1, 'KEDD': 2, 'SZERDA': 3, 'CSÜTÖRTÖK': 4,
  'PÉNTEK': 5, 'SZOMBAT': 6, 'VASÁRNAP': 7,
};

// Meal type → macro ratio estimates (protein%, carb%, fat% of calories)
const MACRO_RATIOS: Record<string, { p: number; c: number; f: number }> = {
  breakfast: { p: 0.25, c: 0.40, f: 0.35 },
  lunch:     { p: 0.30, c: 0.45, f: 0.25 },
  dinner:    { p: 0.35, c: 0.15, f: 0.50 },
  snack:     { p: 0.50, c: 0.35, f: 0.15 },
};

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
    const chunks = splitIntoWeekChunks(rawText);
    console.log(`[parse-document] Processing ${chunks.length} weeks in parallel`);

    // Process all weeks IN PARALLEL to avoid timeout
    const weekPromises = chunks.map((chunk, i) => processWeek(chunk, i + 1));
    const weekResults = await Promise.all(weekPromises);

    // Build AIParsedNutritionPlan format (what importFromAIParse expects)
    const weeksArray = weekResults
      .filter(w => w !== null && w.length > 0)
      .map(days => days!);

    const result = {
      detected_weeks: weeksArray.length,
      weeks: weeksArray,
    };

    console.log(`[parse-document] Done: ${weeksArray.length} weeks, ${weeksArray.flat().length} days total`);
    return res.status(200).json({ result: JSON.stringify(result) });

  } catch (error: any) {
    console.error('[parse-document] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to parse document' });
  }
}

/**
 * Process one week chunk with Claude AI.
 * Returns array of day objects in AIParsedNutritionPlan format.
 */
async function processWeek(chunk: string, weekNum: number): Promise<any[] | null> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are a nutrition coach.

You receive Hungarian TEXT for one WEEK. The text can be:
- EITHER: an already written weekly meal plan (with days and meals),
- OR: a NATURAL LANGUAGE REQUEST describing constraints for a weekly plan
  (for example: "készíts egy szöveget 7 napra reggeli ebéd vacsora, napi 2100 kcal alatt, sok zöldség, kevés hús, heti 3x edzés kb 600 kcal és egyszer úszás").

Your task in BOTH cases:
1) Produce a 7-day meal plan for that week in JSON format (see schema below).
2) If the text already contains a structured plan, PARSE it as faithfully as possible.
3) If the text is only a REQUEST (no explicit per-day menu), then first DESIGN a reasonable 7-day plan that satisfies the constraints, then output it in the JSON format.

WEEK ${weekNum} TEXT:
${chunk}

Return a JSON array of day objects:
[
  {
    "dayName": "HÉTFŐ",
    "isTraining": true,
    "meals": [
      {
        "type": "breakfast",
        "kcal": 520,
        "items": [
          { "name": "3 tojás", "kcal": 240 },
          { "name": "teljes kiőrlésű kenyér", "kcal": 150 },
          { "name": "avokádó", "kcal": 130 }
        ]
      },
      {
        "type": "lunch",
        "kcal": 610,
        "items": [
          { "name": "csirkemell", "kcal": 250 },
          { "name": "krumpli", "kcal": 200 },
          { "name": "brokkoli", "kcal": 80 },
          { "name": "olívaolaj", "kcal": 80 }
        ]
      },
      {
        "type": "dinner",
        "kcal": 520,
        "items": [
          { "name": "lazac", "kcal": 260 },
          { "name": "saláta", "kcal": 100 },
          { "name": "olívaolaj", "kcal": 80 },
          { "name": "kenyér", "kcal": 80 }
        ]
      },
      {
        "type": "snack",
        "kcal": 220,
        "items": [
          { "name": "fehérjepor", "kcal": 120 },
          { "name": "banán", "kcal": 100 }
        ]
      }
    ]
  },
  {
    "dayName": "KEDD",
    "isTraining": false,
    "meals": [...]
  }
]

Rules:
- Always include ALL 7 days (HÉTFŐ..VASÁRNAP) even if the original text is shorter.
- dayName: one of HÉTFŐ, KEDD, SZERDA, CSÜTÖRTÖK, PÉNTEK, SZOMBAT, VASÁRNAP.
- isTraining: true if the text clearly indicates a training day (edzés/edzőterem/cardio), false otherwise.
- type: Reggeli→"breakfast", Ebéd→"lunch", Vacsora→"dinner", Edzés után / snack → "snack".
- Each meal SHOULD have an "items" array where each element is ONE atomic food (e.g. "tojás", "olívaolaj", "barna rizs", "alma") with its own kcal.
- If the original text already lists foods separately, map each to one item with a reasonable kcal share.
- kcal on the meal is total kcal for the meal; item kcal values should roughly sum to the meal kcal.
- Use more vegetables and less meat if the text asks for that.
- Return ONLY the JSON array, without markdown, without explanation.`
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`[parse-document] Week ${weekNum}: no JSON array in response`);
      return null;
    }

    const days = JSON.parse(jsonMatch[0]);

    // Convert to AIParsedNutritionPlan day format
    return days.map((day: any) => {
      const dayNum = DAY_NUMBER[day.dayName] || 1;

      return {
        week: weekNum,
        day: dayNum,
        day_label: day.dayName || 'HÉTFŐ',
        is_training_day: day.isTraining || false,
        meals: (day.meals || []).map((meal: any) => ({
          meal_type: meal.type || 'lunch',
          name: getMealName(meal.type),
          ingredients: buildIngredientsFromMeal(meal),
        })),
      };
    });

  } catch (err) {
    console.error(`[parse-document] Week ${weekNum} error:`, err);
    return null;
  }
}

/**
 * Split a free-form meal description into individual food item strings.
 */
function splitDescriptionIntoItems(description: string): string[] {
  if (!description) return [];
  let text = String(description);

  // Normalize separators: "+", ",", ";", "és"
  text = text
    .replace(/•/g, ',')
    .replace(/\s+\+\s+/g, ',')
    .replace(/\s+és\s+/gi, ',')
    .replace(/\s+es\s+/gi, ',');

  const rawParts = text.split(/[,;\n]/);
  return rawParts
    .map(p => p.trim())
    .filter(p => p.length > 1);
}

/**
 * Build a single ingredient entry from a meal description + kcal.
 * Uses quantity_grams=100 so that calories_per_100g = total meal kcal.
 * Estimates protein/carbs/fat from meal type ratios.
 */
function buildIngredient(description: string, kcal: number, mealType: string) {
  const cal = Math.max(kcal || 100, 1);
  const ratio = MACRO_RATIOS[mealType] || MACRO_RATIOS['lunch'];

  // Convert kcal ratios to grams per 100g serving
  const protein_per_100g = Math.round((cal * ratio.p) / 4);   // protein = 4 kcal/g
  const carbs_per_100g   = Math.round((cal * ratio.c) / 4);   // carbs = 4 kcal/g
  const fat_per_100g     = Math.round((cal * ratio.f) / 9);   // fat = 9 kcal/g

  return {
    name: description || 'Étel',
    quantity_grams: 100,
    unit: 'g',
    estimated_calories_per_100g: cal,
    estimated_protein_per_100g: protein_per_100g,
    estimated_carbs_per_100g: carbs_per_100g,
    estimated_fat_per_100g: fat_per_100g,
    estimated_category: getCategoryForMealType(mealType),
  };
}

/**
 * Build multiple ingredient entries from a meal description.
 * The total kcal is split evenly across all items when no explicit items[] are present.
 */
function buildIngredients(description: string, kcal: number, mealType: string) {
  const items = splitDescriptionIntoItems(description);
  if (items.length === 0) {
    return [buildIngredient(description, kcal, mealType)];
  }

  const perItemKcal = Math.max(Math.round((kcal || 100) / items.length), 1);
  return items.map(item => buildIngredient(item, perItemKcal, mealType));
}

/**
 * Build ingredients from a full meal object.
 * Prefer structured meal.items[] if present, otherwise fall back to description splitting.
 */
function buildIngredientsFromMeal(meal: any) {
  const type = meal.type || 'lunch';
  const baseKcal = meal.kcal;

  // Preferred path: structured items array from the LLM
  if (Array.isArray(meal.items) && meal.items.length > 0) {
    const rawItems = meal.items as Array<{ name?: string; kcal?: number }>;
    const clean = rawItems
      .map(i => ({
        name: (i.name || '').trim(),
        kcal: typeof i.kcal === 'number' ? i.kcal : 0,
      }))
      .filter(i => i.name.length > 1);

    if (clean.length > 0) {
      let totalKcal = clean.reduce((sum, i) => sum + (i.kcal || 0), 0);
      if (!totalKcal || totalKcal <= 0) {
        totalKcal = baseKcal || 100;
      }
      const fallbackPerItem = Math.max(Math.round(totalKcal / clean.length), 1);
      return clean.map(i => buildIngredient(i.name, i.kcal || fallbackPerItem, type));
    }
  }

  // Fallback: heuristic split of free-form description into items
  return buildIngredients(meal.description, baseKcal, type);
}

function getMealName(type: string): string {
  const names: Record<string, string> = {
    breakfast: 'Reggeli',
    lunch: 'Ebéd',
    dinner: 'Vacsora',
    snack: 'Edzés utáni snack',
  };
  return names[type] || type;
}

function getCategoryForMealType(type: string): string {
  const cats: Record<string, string> = {
    breakfast: 'Egyéb',
    lunch: 'Hús & Hal',
    dinner: 'Hús & Hal',
    snack: 'Tej & Tejtermék',
  };
  return cats[type] || 'Egyéb';
}

/**
 * Split raw text into week chunks.
 * Handles "1. HÉT", "2. hét", etc. and merges duplicate week numbers.
 */
function splitIntoWeekChunks(text: string): string[] {
  const parts = text.split(/(?=\d+\.\s*hét)/i).filter(p => p.trim().length > 50);

  if (parts.length >= 2) {
    const weekMap = new Map<number, string>();
    for (const part of parts) {
      const numMatch = part.match(/^(\d+)\./);
      if (numMatch) {
        const weekNum = parseInt(numMatch[1]);
        weekMap.set(weekNum, (weekMap.get(weekNum) || '') + '\n' + part);
      }
    }
    return Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, chunk]) => chunk);
  }

  return [text];
}