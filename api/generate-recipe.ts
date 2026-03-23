// api/generate-recipe.ts
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
    console.warn('[generate-recipe] Firebase Admin init failed:', e);
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

  const { userId, userProfile, meal, weekContext, language } = req.body || {};
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

Rules: steps must have 4-6 items. mealPrepGuide should explain batch cooking and storage. Return ONLY the JSON object.`;

  const tryGenerate = async (): Promise<string> => {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0]?.type === 'text' ? message.content[0].text : '';
  };

  const tryParse = (raw: string): any | null => {
    let cleaned = raw.trim()
      .replace(/^```json\s*/i, '').replace(/```$/i, '')
      .replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    try { return JSON.parse(cleaned); } catch {}
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
    return null;
  };

  try {
    let raw = await tryGenerate();
    let parsed = tryParse(raw);

    // Retry once on parse failure
    if (!parsed) {
      raw = await tryGenerate();
      parsed = tryParse(raw);
    }

    if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      console.error('[generate-recipe] Invalid JSON from Claude:', raw.slice(0, 300));
      return res.status(500).json({ error: 'Invalid response from AI' });
    }

    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('[generate-recipe] Error:', error);
    return res.status(500).json({ error: error?.message || 'Recipe generation failed' });
  }
}
