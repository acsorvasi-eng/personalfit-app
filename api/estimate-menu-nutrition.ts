// api/estimate-menu-nutrition.ts
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
    console.warn('[estimate-menu-nutrition] Firebase Admin init failed:', e);
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, targetMeal, city, country, language } = req.body || {};
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

  const tryParse = (raw: string): any[] | null => {
    let cleaned = raw.trim()
      .replace(/^```json\s*/i, '').replace(/```$/i, '')
      .replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    try {
      const p = JSON.parse(cleaned);
      return Array.isArray(p) ? p : null;
    } catch {}
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
    return null;
  };

  try {
    let raw = await tryGenerate();
    let parsed = tryParse(raw);

    // Retry once on parse failure or insufficient results
    if (!parsed || parsed.length < 3) {
      raw = await tryGenerate();
      parsed = tryParse(raw);
    }

    // Validate array length matches the expected count (3 items requested)
    if (!parsed || parsed.length < 3) {
      console.error('[estimate-menu-nutrition] Parse failed or insufficient results:', raw.slice(0, 300));
      return res.status(500).json({ error: 'Invalid response from AI' });
    }

    // Compute matchScore: cosine-like similarity on [kcal, protein] vs target
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
    console.error('[estimate-menu-nutrition] Error:', error);
    return res.status(500).json({ error: error?.message || 'Menu estimation failed' });
  }
}
