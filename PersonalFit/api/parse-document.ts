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

    const prompt = `You are a professional nutrition document analyzer. Extract ALL meal plan data.

HUNGARIAN → ENGLISH MAPPING:
Meal types: "Reggeli"→"breakfast", "Ebéd"→"lunch", "Vacsora"→"dinner", "Edzés után"→"post_workout"
Days: "HÉTFŐ"→1, "KEDD"→2, "SZERDA"→3, "CSÜTÖRTÖK"→4, "PÉNTEK"→5, "SZOMBAT"→6, "VASÁRNAP"→7
Weeks: "1. HÉT"→1, "2. HÉT"→2, "3. HÉT"→3, "4. HÉT"→4
Training: "(EDZÉS)" in day = is_training:true, "(PIHENŐ)" = is_training:false

CALORIES PER 100G: Calculate as (total_calories / amount_g * 100). Use nutritional database estimates if needed.
TABLESPOON conversion: "1 ek" = 15g

Extract EVERY week (1-4), EVERY day (1-7), EVERY meal, EVERY ingredient.

Return ONLY this JSON (no explanation):
{
  "nutritionPlan": {
    "detected_weeks": 4,
    "weeks": [
      {
        "week": 1,
        "days": [
          {
            "day": 1,
            "is_training": true,
            "meals": [
              {
                "meal_type": "breakfast",
                "items": [
                  {
                    "name": "Tojás",
                    "amount_g": 180,
                    "calories_per_100g": 155,
                    "total_calories": 279,
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
  "trainingDays": [
    {
      "week": 1,
      "day": 1,
      "activity": "gym training",
      "duration_minutes": 60,
      "estimated_calories": 300,
      "intensity": "high",
      "notes": "Hétfő EDZÉS"
    }
  ],
  "userProfile": {},
  "measurements": [],
  "warnings": [],
  "confidence": 0.95
}

IMPORTANT: Include ALL 4 weeks with ALL 7 days each. Include ALL training days in trainingDays array.

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

**`Cmd+S`** → terminálban:
```
git add -A && git commit -m "feat: 4-week meal plan + training days parsing" && git push