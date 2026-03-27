import { handleCors } from './_shared/cors';
import { verifyAuth, sendAuthError } from './_shared/auth';
import { validateBodySize } from './_shared/validate';
import { sanitizeUserInput } from './_shared/sanitize';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type SplitResult = {
  type: 'single' | 'composite';
  ingredients: string[];
};

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  try {
    await verifyAuth(req);
  } catch (err: any) {
    return sendAuthError(res, err);
  }

  try { validateBodySize(req.body); } catch (err: any) {
    return res.status(err?.status || 413).json({ error: err?.message || 'Request too large' });
  }

  const { name: rawName } = req.body || {};
  const name = sanitizeUserInput(rawName, 500);
  if (!name) {
    return res.status(400).json({ error: 'Missing or invalid "name" field' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `
You are a nutrition ingredient normalizer.

TASK:
- Decide if the given Hungarian food name is a single base ingredient or a composite meal.
- A base ingredient is a single atomic food like "tojás", "spenót", "gomba", "paprika", "quinoa", "csirkemell", "zabpehely", "mandulatej".
- A composite meal combines multiple ingredients, often with cooking adjectives like "sült", "grillezett", "párolt", "rántott", or with multiple ingredients listed inline.
- If it is a composite meal, extract the individual base ingredients as short Hungarian ingredient names (singular form, no quantities).

Input: "${name}"

Respond ONLY in strict JSON, no markdown, no explanation:
{"type":"single","ingredients":["<single-ingredient-name>"]}
OR
{"type":"composite","ingredients":["<ingredient-1>","<ingredient-2>", "..."]}`
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

    let parsed: SplitResult;
    try {
      parsed = JSON.parse(cleaned) as SplitResult;
    } catch (e) {
      console.error('[split-food-name] Failed to parse JSON from Claude:', cleaned);
      return res
        .status(500)
        .json({ error: 'Failed to parse food name' });
    }

    if (
      !parsed ||
      (parsed.type !== 'single' && parsed.type !== 'composite') ||
      !Array.isArray(parsed.ingredients)
    ) {
      return res.status(500).json({ error: 'Invalid response from food name parser' });
    }

    const ingredients = parsed.ingredients
      .map(i => String(i || '').trim())
      .filter(i => i.length > 0);

    return res.status(200).json({
      type: parsed.type,
      ingredients,
    });
  } catch (error: any) {
    console.error('[split-food-name] Error:', error?.message || error);
    return res
      .status(500)
      .json({ error: 'An error occurred processing your request.' });
  }
}

