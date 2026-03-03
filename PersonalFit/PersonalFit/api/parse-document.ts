import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content, text } = req.body;
  const rawText: string = content || text || '';

  if (!rawText) {
    return res.status(400).json({ error: 'No content provided' });
  }

  // Split text into chunks if very long (>6000 chars) - process week by week
  const chunks = splitIntoWeekChunks(rawText);

  try {
    const allWeeks: any[] = [];
    const trainingDays: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const weekNum = i + 1;

      const message = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `You are parsing a Hungarian meal plan. Extract EXACTLY this week's data and return ONLY valid JSON, no other text.

WEEK ${weekNum} TEXT:
${chunk}

Return this exact JSON structure:
{
  "weekNumber": ${weekNum},
  "days": [
    {
      "dayName": "HÉTFŐ",
      "dayOfWeek": 1,
      "isTraining": true,
      "meals": [
        {
          "type": "breakfast",
          "description": "meal description",
          "kcal": 520
        },
        {
          "type": "lunch",
          "description": "meal description",
          "kcal": 610
        },
        {
          "type": "dinner",
          "description": "meal description",
          "kcal": 520
        }
      ],
      "totalKcal": 2150
    }
  ]
}

Rules:
- Hungarian day names: HÉTFŐ=1, KEDD=2, SZERDA=3, CSÜTÖRTÖK=4, PÉNTEK=5, SZOMBAT=6, VASÁRNAP=7
- isTraining=true if day has "(EDZÉS)" in it, false if "(PIHENŐ)"
- meal types: "Reggeli"→"breakfast", "Ebéd"→"lunch", "Vacsora"→"dinner", "Edzés után"→"snack"
- kcal: extract the number from the row (e.g. "520" at end of Reggeli row)
- description: the food description text
- totalKcal: sum of all meal kcal for the day
- If a meal is missing, skip it
- Return ONLY the JSON object, no markdown, no explanation`
          }
        ]
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const weekData = JSON.parse(jsonMatch[0]);
          allWeeks.push(weekData);

          // Collect training days
          if (weekData.days) {
            for (const day of weekData.days) {
              if (day.isTraining) {
                trainingDays.push(`${weekNum}-${day.dayName}`);
              }
            }
          }
        } catch (parseErr) {
          console.error(`Week ${weekNum} JSON parse error:`, parseErr);
          // Continue with other weeks
        }
      }
    }

    // Build final result in the format NutritionPlanSvc expects
    const result = buildNutritionPlanResult(allWeeks, trainingDays);

    return res.status(200).json({ result: JSON.stringify(result) });
  } catch (error: any) {
    console.error('parse-document error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to parse document'
    });
  }
}

/**
 * Split raw text into week-sized chunks.
 * Looks for "1. HÉT", "2. HÉT", etc. markers (case insensitive).
 * Merges multiple parts belonging to the same week number.
 */
function splitIntoWeekChunks(text: string): string[] {
  // Split by week headers like "1. HÉT", "2. hét", etc.
  const weekPattern = /(?=\d+\.\s*hét)/gi;
  const parts = text.split(weekPattern).filter(p => p.trim().length > 50);

  if (parts.length >= 2) {
    // Merge parts that belong to the same week number
    const weekMap = new Map<number, string>();
    for (const part of parts) {
      const numMatch = part.match(/^(\d+)\./);
      if (numMatch) {
        const weekNum = parseInt(numMatch[1]);
        if (weekMap.has(weekNum)) {
          weekMap.set(weekNum, weekMap.get(weekNum)! + '\n' + part);
        } else {
          weekMap.set(weekNum, part);
        }
      }
    }
    // Return sorted by week number
    return Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, chunk]) => chunk);
  }

  // Fallback: split by large chunks if no week headers found
  const chunkSize = 6000;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Convert weeks array to the format expected by NutritionPlanSvc.importFromAIParse
 *
 * Expected format:
 * {
 *   foods: [...],         // unique foods list
 *   mealPlan: [...],      // day entries with meals
 *   trainingDays: [...]   // list of training day identifiers
 * }
 */
function buildNutritionPlanResult(weeks: any[], trainingDays: string[]) {
  const foods: any[] = [];
  const foodMap = new Map<string, any>();
  const mealPlanDays: any[] = [];

  for (const week of weeks) {
    if (!week.days) continue;
    const weekNum = week.weekNumber || 1;

    for (const day of week.days) {
      const dayEntry: any = {
        week: weekNum,
        dayOfWeek: day.dayOfWeek || 1,
        dayName: day.dayName || '',
        isTraining: day.isTraining || false,
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
        totalKcal: day.totalKcal || 0
      };

      if (day.meals) {
        for (const meal of day.meals) {
          const foodItem = {
            name: meal.description || 'Étel',
            kcal: meal.kcal || 0,
            amount: '1 adag',
            unit: 'adag'
          };

          // Deduplicate foods list
          const foodKey = foodItem.name.toLowerCase().trim();
          if (!foodMap.has(foodKey)) {
            const food = {
              id: `food_${foods.length + 1}`,
              name: foodItem.name,
              kcalPer100g: foodItem.kcal, // Store as-is since we have portion kcal
              defaultAmount: 100,
              unit: 'g'
            };
            foodMap.set(foodKey, food);
            foods.push(food);
          }

          const mealEntry = {
            foodId: foodMap.get(foodKey)?.id,
            name: foodItem.name,
            kcal: foodItem.kcal,
            amount: foodItem.amount
          };

          switch (meal.type) {
            case 'breakfast':
              dayEntry.breakfast.push(mealEntry);
              break;
            case 'lunch':
              dayEntry.lunch.push(mealEntry);
              break;
            case 'dinner':
              dayEntry.dinner.push(mealEntry);
              break;
            case 'snack':
            default:
              dayEntry.snacks.push(mealEntry);
              break;
          }
        }
      }

      mealPlanDays.push(dayEntry);
    }
  }

  return {
    foods,
    mealPlan: mealPlanDays,
    trainingDays,
    weeksCount: weeks.length,
    totalDays: mealPlanDays.length
  };
}