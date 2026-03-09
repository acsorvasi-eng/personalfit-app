import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ingredients, geo, language, mealType } = req.body as {
      ingredients: string[];
      geo: 'transylvania' | 'budapest' | 'mediterranean';
      language: 'hu' | 'ro' | 'en';
      mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    };

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'ingredients array is required' });
    }

    const geoConfig = (() => {
      switch (geo) {
        case 'transylvania':
          return {
            region: 'Transylvania / Romania (Hungarian, Romanian and Saxon cuisine)',
            style: 'Transylvanian, Romanian and Saxon gastronomy',
          };
        case 'mediterranean':
          return {
            region: 'Mediterranean (Italy, Greece, Spain, South of France)',
            style: 'Mediterranean fusion cuisine',
          };
        case 'budapest':
        default:
          return {
            region: 'Budapest / Hungary (Central European cuisine)',
            style: 'Hungarian and Central European gastronomy',
          };
      }
    })();

    const mealTypeLabel = mealType
      ? `Meal type context: ${mealType} (breakfast / lunch / dinner / snack).`
      : '';

    const prompt = [
      `You are a creative gastronomy expert specializing in ${geoConfig.style}.`,
      '',
      `Given these meal ingredients: ${ingredients.join(', ')}`,
      `Geographic context: ${geoConfig.region}`,
      `Output language: ${language}`,
      mealTypeLabel,
      '',
      'Generate a creative, elegant restaurant-style name that:',
      '1. Reflects the regional culinary tradition',
      '2. Sounds appetizing and upscale (like a restaurant menu)',
      '3. Uses local language flavor appropriate for the region',
      '',
      'Respond ONLY with valid JSON:',
      '{ "name": "string", "subtitle": "string", "emoji": "string" }',
    ].join('\n');

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const block = message.content[0] as any;
    const rawText =
      block && typeof block.text === 'string'
        ? block.text
        : typeof block?.json === 'string'
          ? block.json
          : JSON.stringify(block);

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      name?: string;
      subtitle?: string;
      emoji?: string;
    };

    const name = (parsed.name || '').toString().trim();
    const subtitle = (parsed.subtitle || '').toString().trim();
    const emoji = (parsed.emoji || '').toString().trim() || '✨';

    if (!name) {
      throw new Error('Claude did not return a name field');
    }

    return res.status(200).json({ name, subtitle, emoji });
  } catch (err: any) {
    console.error('[meal-name] Error generating meal name:', err);
    return res
      .status(500)
      .json({ error: err?.message || 'Failed to generate meal name' });
  }
}

