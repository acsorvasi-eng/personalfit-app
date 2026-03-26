// api/chef.ts — unified Chef Agent endpoint (recipe + menu estimation)
// Combines generate-recipe and estimate-menu-nutrition to stay within Vercel Hobby 12-function limit
import Anthropic from '@anthropic-ai/sdk';
import * as admin from 'firebase-admin';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LANG_LABELS: Record<string, string> = {
  hu: 'Hungarian',
  ro: 'Romanian',
  en: 'English',
};

function getAdminApp(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!;
  const keyB64 = process.env.FIREBASE_ADMIN_KEY;
  if (!keyB64) return null;
  try {
    const credential = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(credential) });
  } catch (e) {
    console.warn('[chef] Firebase Admin init failed:', e);
    return null;
  }
}

async function validateUser(userId: string | undefined): Promise<boolean> {
  if (!userId || userId === 'anonymous') return false;
  const app = getAdminApp();
  if (!app) return true; // fail open for local dev
  try {
    const snap = await admin.firestore(app).collection('users').doc(userId).get();
    return snap.exists;
  } catch {
    return true; // fail open on error
  }
}

const tryParse = (raw: string): any | null => {
  const cleaned = raw.trim()
    .replace(/^```json\s*/i, '').replace(/```$/i, '')
    .replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const objMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
  return null;
};

async function handleRecipe(body: any, res: any) {
  const { userId, userProfile, meal, weekContext, language } = body;
  const isValid = await validateUser(userId);
  if (!isValid) return res.status(401).json({ error: 'Unauthorized' });

  if (!meal?.name || !meal?.mealType) {
    return res.status(400).json({ error: 'Missing meal data' });
  }

  const lang = LANG_LABELS[language] || 'Hungarian';
  const ingredientList = (meal.ingredientDetails || []).length > 0
    ? meal.ingredientDetails.map((i: any) => `${i.name} ${i.quantity}`).join(', ')
    : (meal.ingredients || []).join(', ');

  const gastroRules = `
Gastro rules to check (include gastroNote only if a rule is violated or worth noting):
- Max eggs per week: ${userProfile?.age >= 60 ? 3 : 4} (current count this week: ${weekContext?.eggsThisWeek ?? 0})
- No same protein source twice in one day. Today's proteins so far: ${(weekContext?.proteinSourcesToday ?? []).join(', ') || 'none'}
- For weight_loss goal: dinner should be max 500 kcal
- Avoid heavy red meat (beef, pork) in dinner
- Max 2x red meat per week (current count: ${weekContext?.redMeatThisWeek ?? 0})
- If dinner calories exceed lunch calories, note it
`;

  const prompt = `You are a professional nutritionist chef. Respond ONLY in ${lang}. Respond ONLY with a valid JSON object — no markdown, no backticks, no prose outside the JSON.

Create a recipe for this ${meal.mealType} meal:
Name: ${meal.name}
Ingredients: ${ingredientList}
Calories: ${meal.calories}
User profile: age ${userProfile?.age ?? '?'}, gender ${userProfile?.gender ?? '?'}, weight ${userProfile?.weight ?? '?'}kg, goal: ${userProfile?.goal ?? '?'}${userProfile?.allergies ? `, allergies: ${userProfile.allergies}` : ''}

${gastroRules}

Return this exact JSON shape (all string values in ${lang}):
{
  "prepTime": <integer minutes>,
  "difficulty": "easy" | "medium" | "hard",
  "steps": ["step 1", "step 2", "step 3", "step 4"],
  "chefTip": "<personalized tip based on user goal, 1-2 sentences>",
  "gastroNote": "<gastro rule note if relevant, null otherwise>",
  "mealPrepGuide": "<how to batch-prep this for 3-4 days, null if not practical>"
}

Rules: steps must have 4-6 items. Return ONLY the JSON object.`;

  const tryGenerate = async (): Promise<string> => {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0]?.type === 'text' ? message.content[0].text : '';
  };

  try {
    let raw = await tryGenerate();
    let parsed = tryParse(raw);
    if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      raw = await tryGenerate();
      parsed = tryParse(raw);
    }
    if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      console.error('[chef/recipe] Invalid JSON from Claude:', raw.slice(0, 300));
      return res.status(500).json({ error: 'Invalid response from AI' });
    }
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('[chef/recipe] Error:', error);
    return res.status(500).json({ error: error?.message || 'Recipe generation failed' });
  }
}

async function handleMenu(body: any, res: any) {
  const { userId, targetMeal, city, country, language } = body;
  const isValid = await validateUser(userId);
  if (!isValid) return res.status(401).json({ error: 'Unauthorized' });

  if (!city || !targetMeal?.name) {
    return res.status(400).json({ error: 'Missing city or targetMeal' });
  }

  const lang = LANG_LABELS[language] || 'Hungarian';
  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are a local food expert and nutritionist. Respond ONLY in ${lang}. Respond ONLY with a valid JSON array — no markdown, no backticks, no prose.

City: ${city}, Country: ${country || 'Hungary'}
Date: ${today}
Target meal to match: "${targetMeal.name}" (${targetMeal.calories}, mealType: ${targetMeal.mealType})

Generate 3 realistic typical daily lunch menu options (napi menü) that would be available in ${city} today, similar in flavor and calories to the target meal.

For each option return:
{
  "restaurantName": "<realistic local restaurant name>",
  "dishName": "<typical local dish name in ${lang}>",
  "estimatedKcal": <integer>,
  "estimatedProtein": <integer grams>,
  "estimatedCarbs": <integer grams>,
  "estimatedFat": <integer grams>,
  "price": "<estimated price range e.g. '1800-2500 Ft' or '35-45 RON'>",
  "availableFrom": "11:30",
  "confidence": "medium"
}

Rules:
- dishName should be culturally appropriate for ${city}
- Calorie values should realistically match the target (${targetMeal.calories})
- Return ONLY the JSON array with exactly 3 items.`;

  const tryGenerate = async (): Promise<string> => {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0]?.type === 'text' ? message.content[0].text : '';
  };

  try {
    let raw = await tryGenerate();
    let parsed = tryParse(raw);
    if (!Array.isArray(parsed) || parsed.length < 3) {
      raw = await tryGenerate();
      parsed = tryParse(raw);
    }
    if (!Array.isArray(parsed) || parsed.length < 3) {
      console.error('[chef/menu] Parse failed or insufficient results:', raw.slice(0, 300));
      return res.status(500).json({ error: 'Invalid response from AI' });
    }

    const targetKcal = parseInt(targetMeal.calories) || 500;
    const withScores = parsed.map((item: any) => {
      const kcalDiff = Math.abs((item.estimatedKcal || 0) - targetKcal);
      const rawScore = Math.max(0, 100 - Math.round((kcalDiff / targetKcal) * 100));
      const confidence: 'high' | 'medium' | 'low' =
        rawScore >= 80 && kcalDiff < 80 ? 'high'
        : rawScore >= 50 ? 'medium'
        : 'low';
      return { ...item, matchScore: rawScore, confidence };
    });

    return res.status(200).json(withScores);
  } catch (error: any) {
    console.error('[chef/menu] Error:', error);
    return res.status(500).json({ error: error?.message || 'Menu estimation failed' });
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.body || {};

  if (type === 'recipe') return handleRecipe(req.body, res);
  if (type === 'menu') return handleMenu(req.body, res);
  if (type === 'find-stores') return handleFindStores(req.body, res);

  return res.status(400).json({ error: 'Missing or invalid type. Use "recipe", "menu", or "find-stores".' });
}

// ─── Nearby grocery stores (Google Places Nearby Search) ────────────────────

async function handleFindStores(body: any, res: any) {
  const { lat, lng, radius = 10000 } = body || {};

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat, lng are required' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.log('[chef/find-stores] No GOOGLE_PLACES_API_KEY — returning fallback');
    return res.status(200).json({ stores: [], fallback: true });
  }

  try {
    const query = encodeURIComponent('supermarket grocery store');
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${lat},${lng}&radius=${radius}&type=supermarket&key=${apiKey}`;

    console.log(`[chef/find-stores] Searching stores near ${lat},${lng} radius=${radius}`);

    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`[chef/find-stores] Google Places HTTP ${resp.status}`);
      return res.status(200).json({ stores: [], fallback: true });
    }

    const data = await resp.json();
    const results = (data.results ?? []).slice(0, 20);

    const stores = results.map((place: any) => ({
      name: place.name ?? '',
      address: place.formatted_address ?? '',
      placeId: place.place_id ?? '',
      lat: place.geometry?.location?.lat ?? null,
      lng: place.geometry?.location?.lng ?? null,
      openNow: place.opening_hours?.open_now ?? null,
    }));

    console.log(`[chef/find-stores] Found ${stores.length} stores`);
    return res.status(200).json({ stores, fallback: false });
  } catch (err: any) {
    console.error('[chef/find-stores] Error:', err.message);
    return res.status(200).json({ stores: [], fallback: true });
  }
}
