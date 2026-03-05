import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type SplitResult = {
  type: 'single' | 'composite';
  ingredients: string[];
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name } = req.body || {};
  if (!name || typeof name !== 'string') {
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
        .json({ error: 'LLM response was not valid JSON', raw: cleaned });
    }

    if (
      !parsed ||
      (parsed.type !== 'single' && parsed.type !== 'composite') ||
      !Array.isArray(parsed.ingredients)
    ) {
      return res.status(500).json({ error: 'Invalid LLM split payload', raw: parsed });
    }

    const ingredients = parsed.ingredients
      .map(i => String(i || '').trim())
      .filter(i => i.length > 0);

    return res.status(200).json({
      type: parsed.type,
      ingredients,
    });
  } catch (error: any) {
    console.error('[split-food-name] Error:', error);
    return res
      .status(500)
      .json({ error: error?.message || 'Failed to split food name with LLM' });
  }
}

