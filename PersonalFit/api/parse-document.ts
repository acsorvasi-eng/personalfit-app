import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        system: `Te egy táplálkozási dokumentum elemző vagy. Elemezd a szöveget és add vissza JSON formátumban. Csak a dokumentumban szereplő adatokat add vissza. Az étkezési típusok: breakfast, lunch, dinner, snack, post_workout. Napok: 1=Hétfő, 2=Kedd, 3=Szerda, 4=Csütörtök, 5=Péntek, 6=Szombat, 7=Vasárnap. Válaszolj KIZÁRÓLAG valid JSON formátumban, markdown nélkül.`,
        messages: [{
          role: 'user',
          content: `Elemezd és add vissza ezt a struktúrát:\n{"userProfile":{"weight":null,"height":null,"age":null,"gender":null,"goal":null,"calorie_target":null},"nutritionPlan":{"weeks":[[{"week":1,"day":1,"day_label":"Edzésnap","is_training_day":true,"meals":[{"meal_type":"breakfast","name":"Reggeli","ingredients":[{"name":"étel neve","quantity_grams":100,"unit":"g"}],"total_calories":500}]}]],"detected_weeks":4,"detected_days_per_week":7},"measurements":[],"trainingDays":[],"warnings":[],"confidence":0.9}\n\nDOKUMENTUM:\n${text.substring(0, 50000)}`,
        }],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) {
      console.error('[parse-document] Empty response from Claude — full data:', data);
      return res.status(500).json({ error: 'Empty response from Claude' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ result: content });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
