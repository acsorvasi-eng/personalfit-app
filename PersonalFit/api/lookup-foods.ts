import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type LookupFood = {
  name: string;
  calories_per_100g: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  category?: string;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { foods } = req.body || {};
  if (!Array.isArray(foods) || foods.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid "foods" array' });
  }

  const cleanedFoods = foods
    .map((f: any) => String(f || '').trim())
    .filter((f: string) => f.length > 0);

  if (cleanedFoods.length === 0) {
    return res.status(400).json({ error: 'No valid food names provided' });
  }

  try {
    const listBlock = cleanedFoods.map(f => `- ${f}`).join('\n');

    const prompt = `
You are a nutrition expert with access to a reliable nutrition database.

For each Hungarian food in the list below, return JSON with:
- name: Hungarian food name (short, singular form)
- calories_per_100g: kilocalories per 100g (number)
- protein_g: grams of protein per 100g (number)
- fat_g: grams of fat per 100g (number)
- carbs_g: grams of carbohydrates per 100g (number)
- category: one of ["protein","carbs","vegetable","fruit","fat","dairy","grain","other"]

If a food is very generic (e.g. "hal"), choose the most typical nutritional profile for that item.
If you are unsure, make a best-effort estimate based on similar foods.

Foods:
${listBlock}

Respond ONLY with strict JSON, no markdown, in this shape:
[
  {
    "name": "csuka",
    "calories_per_100g": 110,
    "protein_g": 22,
    "fat_g": 2,
    "carbs_g": 0,
    "category": "protein"
  }
]
`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const rawText =
      message.content[0] && message.content[0].type === 'text'
        ? message.content[0].text
        : '';

    let cleaned = rawText.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('[lookup-foods] Failed to parse JSON from Claude:', cleaned);
      return res
        .status(500)
        .json({ error: 'LLM response was not valid JSON', raw: cleaned });
    }

    if (!Array.isArray(parsed)) {
      return res.status(500).json({ error: 'Invalid payload shape', raw: parsed });
    }

    const foodsOut: LookupFood[] = parsed
      .map((item: any) => {
        if (!item) return null;
        const name = String(item.name || '').trim();
        if (!name) return null;
        const toNum = (v: any, fallback: number) => {
          const n = Number(v);
          return Number.isFinite(n) && n > 0 ? n : fallback;
        };
        return {
          name,
          calories_per_100g: toNum(item.calories_per_100g, 100),
          protein_g: toNum(item.protein_g, 5),
          fat_g: toNum(item.fat_g, 3),
          carbs_g: toNum(item.carbs_g, 15),
          category: typeof item.category === 'string' ? item.category : undefined,
        } as LookupFood;
      })
      .filter(Boolean);

    if (foodsOut.length === 0) {
      return res.status(500).json({ error: 'No valid foods returned from LLM', raw: parsed });
    }

    return res.status(200).json({ foods: foodsOut });
  } catch (error: any) {
    console.error('[lookup-foods] Error:', error);
    return res
      .status(500)
      .json({ error: error?.message || 'Failed to look up foods with LLM' });
  }
}

