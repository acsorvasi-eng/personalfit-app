import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type LookupFood = {
  /** Hungarian display name (name_hu from the LLM) */
  name: string;
  calories_per_100g: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  /** Hungarian category label from LLM: Fehérje, Zsír, Szénhidrát, Tejtermék, Zöldség, Gyümölcs */
  category?: string;
};

function removeAccents(s: string): string {
  try {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    return s;
  }
}

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
    console.log('[lookup-foods] Incoming foods:', cleanedFoods);
    const listBlock = cleanedFoods.map(f => `- ${f}`).join('\n');

    const prompt = `
You are a nutrition expert with access to a reliable nutrition database.

For each food in this list, return ONLY a JSON array with no markdown, no explanation.
Each item MUST have this exact shape:
{
  "name_hu": string,                       // Hungarian name, short, singular
  "calories_per_100g": number,            // kcal per 100g
  "protein_g": number,                    // grams of protein per 100g
  "fat_g": number,                        // grams of fat per 100g
  "carbs_g": number,                      // grams of carbohydrates per 100g
  "category": "Fehérje" | "Zsír" | "Szénhidrát" | "Tejtermék" | "Zöldség" | "Gyümölcs"
}

Foods:
${listBlock}

Respond ONLY with a raw JSON array, no backticks, no markdown, no explanations.`;

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
    // Strip common markdown fences
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    console.log('[lookup-foods] Raw LLM response (first 200 chars):', rawText.slice(0, 200));

    let parsed: any = null;

    const tryParse = (candidate: string): any | null => {
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    };

    // 1) Try direct parse
    parsed = tryParse(cleaned);

    // 2) If that fails, try to extract the first JSON array anywhere in the text
    if (!parsed) {
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        parsed = tryParse(arrayMatch[0]);
      }
    }

    // 3) As a last resort, try to extract a JSON object
    if (!parsed) {
      const objectMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        parsed = tryParse(objectMatch[0]);
      }
    }

    console.log('[lookup-foods] Cleaned JSON candidate (first 200 chars):', cleaned.slice(0, 200));

    if (!parsed) {
      console.error('[lookup-foods] Failed to parse JSON from Claude after multiple cleaning attempts');
      return res
        .status(500)
        .json({ error: 'LLM response was not valid JSON' });
    }

    if (!Array.isArray(parsed)) {
      console.error('[lookup-foods] Parsed payload is not an array:', parsed);
      return res.status(500).json({ error: 'Invalid payload shape', raw: parsed });
    }

    const foodsOut = parsed
      .map((item: any): LookupFood | null => {
        if (!item) return null;
        const name = String(item.name_hu || item.name || '').trim();
        if (!name) return null;
        const toNum = (v: any, fallback: number) => {
          const n = Number(v);
          return Number.isFinite(n) && n > 0 ? n : fallback;
        };
        const category = typeof item.category === 'string' ? String(item.category).trim() : undefined;
        return {
          name,
          calories_per_100g: toNum(item.calories_per_100g, 100),
          protein_g: toNum(item.protein_g, 5),
          fat_g: toNum(item.fat_g, 3),
          carbs_g: toNum(item.carbs_g, 15),
          category,
        };
      })
      .filter((f): f is LookupFood => f !== null);

    if (foodsOut.length === 0) {
      console.error('[lookup-foods] Empty foodsOut after mapping:', parsed);
      return res.status(500).json({ error: 'No valid foods returned from LLM', raw: parsed });
    }

    console.log('[lookup-foods] Final foodsOut:', foodsOut);

    // Match parse-document.ts pattern: wrap result array
    return res.status(200).json({ result: foodsOut });
  } catch (error: any) {
    console.error('[lookup-foods] Error:', error);
    return res
      .status(500)
      .json({ error: error?.message || 'Failed to look up foods with LLM' });
  }
}

