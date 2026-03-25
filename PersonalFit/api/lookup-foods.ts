function handleCors(req: any, res: any): boolean { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); if (req.method === 'OPTIONS') { res.status(204).end(); return true; } return false; }
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

function resolveApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    return content.match(/^ANTHROPIC_API_KEY=["']?([^"'\r\n]+)["']?/m)?.[1];
  } catch { return undefined; }
}

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: resolveApiKey() });
  return _client;
}

type LookupFood = {
  /** Hungarian display name (name_hu from the LLM) */
  name: string;
  /** true = real identifiable food, false = not a real food / gibberish */
  valid: boolean;
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
  if (handleCors(req, res)) return;
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
The output array MUST have the same number of items as the input list, in the same order.
Each item MUST have this exact shape:
{
  "name_hu": string,                       // Hungarian name, short, singular (correct Hungarian spelling, with accents)
  "valid": boolean,                        // true = real identifiable food; false = not a food, gibberish, or unrecognisable
  "calories_per_100g": number,            // kcal per 100g (0 if valid=false)
  "protein_g": number,                    // grams of protein per 100g (0 if valid=false)
  "fat_g": number,                        // grams of fat per 100g (0 if valid=false)
  "carbs_g": number,                      // grams of carbohydrates per 100g (0 if valid=false)
  "category": "Fehérje" | "Zsír" | "Szénhidrát" | "Tejtermék" | "Zöldség" | "Gyümölcs"  // use "Fehérje" if valid=false
}

Rules:
- Set "valid": false ONLY for genuinely unrecognisable input (gibberish, random letters). Real food names written without Hungarian diacritics are always valid.
- Accept Hungarian food names with or without accents. Mapping examples:
  "csuka" = csuka (pike), "sullo" or "süllo" = süllő (pike-perch/zander), "harcsa" = harcsa (catfish), "ponty" = ponty (carp), "suger" or "sugor" = sügér (perch), "angolna" = angolna (eel), "pisztrang" = pisztráng (trout), "fogas" = fogás/süllő, "keszeg" = keszeg (bream), "compó" = compó (tench), "amur" = amur (grass carp).
  Also: "zeller szar" or "zeller szár" = zellérszár (celery stalk), "edeskomeny gumo" = édesköménygumó (fennel bulb), "feher repa" = fehérrépa (parsnip).
- Freshwater fish (csuka, süllő, harcsa, ponty, sügér, pisztráng, etc.) are "Fehérje" category, high protein (~17-22g), low fat (~1-5g), very low carbs (~0g).
- Provide accurate nutritional values from USDA / scientific nutrition databases.
- The output array MUST have exactly the same number of items as the input list.

Foods:
${listBlock}

Respond ONLY with a raw JSON array, no backticks, no markdown, no explanations.`;

    const message = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
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
        const valid = item.valid !== false; // default true if missing
        const toNum = (v: any, fallback: number) => {
          const n = Number(v);
          return Number.isFinite(n) && n >= 0 ? n : fallback;
        };
        const category = typeof item.category === 'string' ? String(item.category).trim() : undefined;
        return {
          name,
          valid,
          calories_per_100g: valid ? toNum(item.calories_per_100g, 100) : 0,
          protein_g: valid ? toNum(item.protein_g, 5) : 0,
          fat_g: valid ? toNum(item.fat_g, 3) : 0,
          carbs_g: valid ? toNum(item.carbs_g, 15) : 0,
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

