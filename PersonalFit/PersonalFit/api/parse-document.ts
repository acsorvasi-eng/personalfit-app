import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are a nutrition expert. Analyze this text and extract ALL food items mentioned.

For each food item:
1. Extract the name
2. Extract quantity/amount if mentioned
3. Look up the calories per 100g from your nutrition knowledge
4. Calculate total calories if quantity is known

Return ONLY a valid JSON array like this:
[
  {
    "name": "Cseresznye",
    "quantity": "200g",
    "calories_per_100g": 63,
    "total_calories": 126,
    "confidence": "high"
  }
]

If no quantity mentioned, set quantity to null and total_calories to null.
confidence: "high" if you know the exact value, "medium" if estimated, "low" if uncertain.

TEXT TO ANALYZE:
${text}

Return ONLY the JSON array, no explanation.`
      }]
    });

    const content = response.content?.[0]?.text;
    if (!content) {
      console.error('[parse-document] Empty response from Claude:', JSON.stringify(response));
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    const cleaned = content.replace(/```json|```/g, '').trim();
    const foods = JSON.parse(cleaned);
    return res.status(200).json({ foods });

  } catch (err: any) {
    console.error('[parse-document] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
