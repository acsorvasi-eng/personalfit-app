import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: `Te egy táplálkozási és fitnesz dokumentum elemző vagy.
Elemezd a szöveget és add vissza JSON formátumban.
Csak a dokumentumban szereplő adatokat add vissza.
Az étkezési típusok: breakfast, lunch, dinner, snack, post_workout
A napok számai: 1=Hétfő, 2=Kedd, 3=Szerda, 4=Csütörtök, 5=Péntek, 6=Szombat, 7=Vasárnap
Válaszolj KIZÁRÓLAG valid JSON formátumban, NE írj magyarázatot.`,
      messages: [{
        role: 'user',
        content: `Elemezd ez ezt a JSON struktúrát:
{
  "userProfile": { "name": null, "age": null, "weight": null, "height": null, "gender": null, "goal": null, "calorie_target": null, "allergies": [], "dietary_preferences": [] },
  "nutritionPlan": { "weeks": [], "detected_weeks": 0, "detected_days_per_week": 0 },
  "measurements": [],
  "trainingDays": [],
  "warnings": [],
  "confidence": 0.8
}

SZÖVEG:
${text.substring(0, 50000)}`
      }]
    });

    const content = response.content?.[0]?.text;
    if (!content) {
      console.error('[parse-document] Empty response:', JSON.stringify(response));
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    const cleaned = content.replace(/```json|```/g, '').trim();
    return res.status(200).json({ result: cleaned });

  } catch (err: any) {
    console.error('[parse-document] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
