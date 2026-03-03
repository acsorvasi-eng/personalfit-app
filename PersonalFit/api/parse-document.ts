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
        content: `Parse this Hungarian meal plan week. Return ONLY valid JSON array, no markdown, no explanation.

WEEK ${weekNum} TEXT:
${chunk}

Return a JSON array of day objects:
[
  {
    "dayName": "HÉTFŐ",
    "isTraining": true,
    "meals": [
      { "type": "breakfast", "description": "3 tojás + tk kenyér + avokádó", "kcal": 520 },
      { "type": "lunch", "description": "csirkemell + krumpli + brokkoli", "kcal": 610 },
      { "type": "dinner", "description": "lazac + saláta + olivaolaj", "kcal": 520 },
      { "type": "snack", "description": "fehérjepor + banán", "kcal": 220 }
    ]
  },
  {
    "dayName": "KEDD",
    "isTraining": false,
    "meals": [...]
  }
]

Rules:
- dayName: one of HÉTFŐ, KEDD, SZERDA, CSÜTÖRTÖK, PÉNTEK, SZOMBAT, VASÁRNAP
- isTraining: true if "(EDZÉS)" in that day, false if "(PIHENŐ)"
- type: Reggeli→"breakfast", Ebéd→"lunch", Vacsora→"dinner", Edzés után→"snack"
- description: food items text, NO kcal numbers
- kcal: integer number only
- Include all 7 days
- Return ONLY the JSON array`
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
          ingredients: [buildIngredient(meal.description, meal.kcal, meal.type)],
        })),
      };
    });

  } catch (err) {
    console.error(`[parse-document] Week ${weekNum} error:`, err);
    return null;
  }
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