import { handleCors } from './_cors';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface GmonParsedResult {
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_percent: number | null;
  muscle_mass_kg: number | null;
  visceral_fat: number | null;
  bone_mass_kg: number | null;
  water_percent: number | null;
  bmi: number | null;
  metabolic_age: number | null;
  basal_metabolic_rate: number | null;
}

const GMON_JSON_SCHEMA = `{
  weight_kg: number | null,
  height_cm: number | null,
  body_fat_percent: number | null,
  muscle_mass_kg: number | null,
  visceral_fat: number | null,
  bone_mass_kg: number | null,
  water_percent: number | null,
  bmi: number | null,
  metabolic_age: number | null,
  basal_metabolic_rate: number | null
}`;

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  const rawText: string = typeof text === 'string' ? text : '';

  if (!rawText || rawText.trim().length < 10) {
    return res.status(400).json({ error: 'No text provided or text too short' });
  }

  try {
    const prompt = `Extract body composition data from this text.
Return ONLY a valid JSON object, no markdown, no explanation:
${GMON_JSON_SCHEMA}
If a value is not found in the text, use null.
Numbers must be numeric (no units in the value). For example weight_kg: 82 not "82 kg".

Text:
${rawText.substring(0, 30000)}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as GmonParsedResult;
    const result: GmonParsedResult = {
      weight_kg: typeof parsed.weight_kg === 'number' && parsed.weight_kg > 0 ? parsed.weight_kg : null,
      height_cm: typeof parsed.height_cm === 'number' && parsed.height_cm > 0 ? parsed.height_cm : null,
      body_fat_percent: typeof parsed.body_fat_percent === 'number' ? parsed.body_fat_percent : null,
      muscle_mass_kg: typeof parsed.muscle_mass_kg === 'number' ? parsed.muscle_mass_kg : null,
      visceral_fat: typeof parsed.visceral_fat === 'number' ? parsed.visceral_fat : null,
      bone_mass_kg: typeof parsed.bone_mass_kg === 'number' ? parsed.bone_mass_kg : null,
      water_percent: typeof parsed.water_percent === 'number' ? parsed.water_percent : null,
      bmi: typeof parsed.bmi === 'number' ? parsed.bmi : null,
      metabolic_age: typeof parsed.metabolic_age === 'number' ? parsed.metabolic_age : null,
      basal_metabolic_rate: typeof parsed.basal_metabolic_rate === 'number' ? parsed.basal_metabolic_rate : null,
    };

    console.log('[parse-gmon] Done:', Object.keys(result).filter(k => (result as any)[k] != null).length, 'fields');
    return res.status(200).json({ result: JSON.stringify(result) });
  } catch (error: any) {
    console.error('[parse-gmon] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to parse GMON' });
  }
}
