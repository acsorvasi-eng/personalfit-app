import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, text } = req.body;
    const inputText = content || text;

    if (!inputText) {
      return res.status(400).json({ error: 'No content provided' });
    }

    const prompt = `You are a nutrition document analyzer. Extract ALL foods from the text below.

CRITICAL - Hungarian meal type detection:
- "reggeli", "Reggeli", "reggelire" → meal_type: "breakfast"
- "ebéd", "Ebéd", "ebédre", "ebedre" → meal_type: "lunch"
- "vacsora", "Vacsora", "vacsorára", "vacsorara" → meal_type: "dinner"
- "uzsonna", "snack" → meal_type: "snack"
- "edzés utáni", "post workout" → meal_type: "post_workout"
- No meal keyword found → meal_type: "lunch" (default)

For each food: estimate calories_per_100g from nutritional databases if not provided.

Return ONLY this exact JSON (no explanation, no markdown):
{
  "nutritionPlan": {
    "detected_weeks": 1,
    "weeks": [
      {
        "week": 1,
        "days": [
          {
            "day": 1,
            "meals": [
              {
                "meal_type": "breakfast",
                "items": [
                  {
                    "name": "food name in original language",
                    "amount_g": 200,
                    "calories_per_100g": 89,
                    "total_calories": 178,
                    "protein_g": null,
                    "carbs_g": null,
                    "fat_g": null
                  }
                ]
              },
              {
                "meal_type": "lunch",
                "items": []
              },
              {
                "meal_type": "dinner",
                "items": []
              }
            ]
          }
        ]
      }
    ]
  },
  "userProfile": {},
  "measurements": [],
  "trainingDays": [],
  "warnings": [],
  "confidence": 0.9
}

IMPORTANT: Create a separate meal object for EACH meal type found. Put each food under the correct meal_type based on the Hungarian keywords above.

Text to analyze:
${inputText.substring(0, 50000)}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.status(200).json({ result: JSON.stringify(parsed) });
      } catch {
        return res.status(200).json({ result: responseText });
      }
    }

    return res.status(200).json({ result: responseText });
  } catch (error: any) {
    console.error('Parse document error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
```

**`Cmd+A` → töröl → `Cmd+V` → `Cmd+S`** — majd terminálban:
```
git add -A && git commit -m "fix: clean parse-document.ts" && git push