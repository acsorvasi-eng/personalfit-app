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
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: resolveApiKey() });
  return _client;
}

function extractJSON(text: string): unknown {
  const s = text.trim()
    .replace(/^```json\s*/i, '').replace(/```\s*$/i, '')
    .replace(/^```\s*/i, '').trim();
  try { return JSON.parse(s); } catch {}
  // Try to find a JSON object or array
  const mObj = s.match(/\{[\s\S]*\}/);
  if (mObj) { try { return JSON.parse(mObj[0]); } catch {} }
  const mArr = s.match(/\[[\s\S]*\]/);
  if (mArr) { try { return JSON.parse(mArr[0]); } catch {} }
  return null;
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type } = req.body || {};

    if (type === 'recipe') {
      return handleRecipe(req, res);
    } else if (type === 'menu') {
      return handleMenu(req, res);
    } else {
      return res.status(400).json({ error: 'type must be "recipe" or "menu"' });
    }
  } catch (err: any) {
    console.error('[chef] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function handleRecipe(req: any, res: any) {
  const { userProfile, meal, weekContext, language = 'hu' } = req.body;

  if (!meal?.name) {
    return res.status(400).json({ error: 'meal.name is required' });
  }

  const langNote = language === 'ro' ? 'Reply in Romanian.'
    : language === 'en' ? 'Reply in English.'
    : 'Válaszolj magyarul.';

  const ingredientList = meal.ingredientDetails?.length
    ? meal.ingredientDetails.map((i: any) => `${i.name} (${i.quantity})`).join(', ')
    : meal.ingredients?.join(', ') || meal.name;

  const allergyNote = userProfile?.allergies
    ? `\nAllergies/intolerances: ${userProfile.allergies}. NEVER include these ingredients.`
    : '';

  const goalNote = userProfile?.goal
    ? `\nDietary goal: ${userProfile.goal}`
    : '';

  const weekNote = weekContext
    ? `\nThis week so far: ${weekContext.eggsThisWeek} egg dishes, ${weekContext.redMeatThisWeek} red meat dishes. Today's protein sources: ${weekContext.proteinSourcesToday?.join(', ') || 'none yet'}.`
    : '';

  const prompt = `You are a professional home cook assistant. Create a recipe for: "${meal.name}"
Target calories: ${meal.calories} kcal
Ingredients available: ${ingredientList}${allergyNote}${goalNote}${weekNote}

${langNote}

Return ONLY valid JSON (no markdown, no extra text):
{
  "prepTime": <number, total minutes including cooking>,
  "difficulty": "<easy|medium|hard>",
  "steps": ["<step 1>", "<step 2>", ...],
  "chefTip": "<one practical cooking tip>",
  "gastroNote": "<digestive/health note or null>",
  "mealPrepGuide": "<how to batch-prep this meal, or null if not applicable>"
}

Keep steps concise (max 6-8 steps). Use everyday language.`;

  console.log(`[chef] recipe request: "${meal.name}" lang=${language}`);

  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
  const parsed = extractJSON(raw) as Record<string, unknown> | null;

  if (!parsed || !Array.isArray(parsed.steps)) {
    console.error('[chef] Failed to parse recipe JSON:', raw.slice(0, 300));
    return res.status(500).json({ error: 'Failed to generate recipe' });
  }

  return res.status(200).json(parsed);
}

async function handleMenu(req: any, res: any) {
  const { targetMeal, city = 'Budapest', country = 'Hungary', language = 'hu' } = req.body;

  if (!targetMeal?.name) {
    return res.status(400).json({ error: 'targetMeal.name is required' });
  }

  const langNote = language === 'ro' ? 'Reply in Romanian.'
    : language === 'en' ? 'Reply in English.'
    : 'Válaszolj magyarul.';

  const prompt = `You are a restaurant dining advisor. A user wants to eat something similar to "${targetMeal.name}" (~${targetMeal.calories || '?'} kcal) at a restaurant in ${city}, ${country}.

${langNote}

Suggest 2-3 realistic restaurant types and dish names they could look for. Consider local cuisine and popular restaurants in ${city}.

Return ONLY valid JSON array (no markdown):
[
  {
    "restaurantName": "<type of restaurant, e.g. 'Italian restaurant' or a well-known chain name>",
    "dishName": "<specific dish name to order>",
    "estimatedKcal": <number>,
    "estimatedProtein": <number>,
    "estimatedCarbs": <number>,
    "estimatedFat": <number>,
    "price": "<estimated price range or null>",
    "availableFrom": null,
    "matchScore": <50-95>,
    "confidence": "<medium|low>"
  }
]

Be realistic about restaurant types in ${city}. Use local restaurant categories and dish names.`;

  console.log(`[chef] menu request: "${targetMeal.name}" city=${city} lang=${language}`);

  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
  const parsed = extractJSON(raw);
  const matches = Array.isArray(parsed) ? parsed : [];

  return res.status(200).json(matches);
}
