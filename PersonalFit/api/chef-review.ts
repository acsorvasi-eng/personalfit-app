import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

function resolveApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    return content.match(/^ANTHROPIC_API_KEY=["']?([^"'\r\n]+)["']?/m)?.[1];
  } catch { return undefined; }
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: resolveApiKey() });
  return _client;
}

function extractJSON(text: string): unknown {
  const s = text.trim()
    .replace(/^```json\s*/i, '').replace(/```\s*$/i, '')
    .replace(/^```\s*/i, '').trim();
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch {}
  let obj = m[0];
  for (let i = obj.length - 1; i > obj.length / 2; i--) {
    const sub = obj.slice(0, i);
    const opens  = (sub.match(/\[/g) || []).length - (sub.match(/\]/g) || []).length;
    const braces = (sub.match(/\{/g) || []).length - (sub.match(/\}/g) || []).length;
    if (opens >= 0 && braces >= 0) {
      try { return JSON.parse(sub + ']'.repeat(opens) + '}'.repeat(braces)); } catch {}
    }
  }
  return null;
}

// Month ranges for seasonal ingredient guidance (Transylvania/Hungary)
const SEASONAL: Record<string, { available: string[]; avoid: string[] }> = {
  spring: {
    available: ['medvehagyma', 'sóska', 'retek', 'zöldhagyma', 'rebarbara', 'eper', 'spárga', 'borsó', 'saláta'],
    avoid: ['savanyúkáposzta', 'görögdinnye', 'őszibarack'],
  },
  summer: {
    available: ['paradicsom', 'paprika', 'uborka', 'kukorica', 'cseresznye', 'meggy', 'barack', 'szilva', 'málna', 'eper'],
    avoid: ['savanyúkáposzta', 'kelkáposzta', 'pasztinák', 'rebarbara'],
  },
  autumn: {
    available: ['tök', 'szőlő', 'gomba', 'körte', 'alma', 'cékla', 'szilva', 'kelkáposzta'],
    avoid: ['eper', 'cseresznye', 'meggy', 'barack', 'spárga'],
  },
  winter: {
    available: ['savanyúkáposzta', 'répa', 'pasztinák', 'fehérrépa', 'alma', 'körte', 'cékla', 'gyökérzöldségek', 'dió'],
    avoid: ['eper', 'paradicsom', 'paprika', 'uborka', 'spárga', 'cseresznye', 'görögdinnye'],
  },
};

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      mealPlan,
      region = '',
      season = 'winter',
      month = 1,
      cultureWeights = {},
      language = 'hu',
      userName = '',
    } = req.body || {};

    if (!mealPlan?.days?.length) {
      return res.status(400).json({ error: 'mealPlan.days is required' });
    }

    // De-duplicate unique meals across the 30-day plan (avoid sending repetitive data to LLM)
    const uniqueMeals = new Map<string, { meal_type: string; name: string; total_calories: number }>();
    for (const day of mealPlan.days) {
      for (const meal of (day.meals ?? [])) {
        if (!uniqueMeals.has(meal.name)) {
          uniqueMeals.set(meal.name, {
            meal_type: meal.meal_type,
            name: meal.name,
            total_calories: meal.total_calories ?? 0,
          });
        }
      }
    }

    // Group unique meals by meal_type for the prompt
    const byType: Record<string, string[]> = {};
    for (const m of uniqueMeals.values()) {
      (byType[m.meal_type] ??= []).push(`${m.name}(${m.total_calories}kcal)`);
    }
    const mealSummary = Object.entries(byType)
      .map(([type, names]) => `${type}: ${names.join(' | ')}`)
      .join('\n');

    const cultureParts = Object.entries(cultureWeights)
      .map(([k, v]) => `${k}:${v}%`)
      .join(', ') || 'hu:60, ro:40';

    const seasonData = SEASONAL[season] ?? SEASONAL.winter;

    const prompt = `Te "A Séf" vagy — egy ${region || 'erdélyi'} konyhában jártas kulináris szakértő.
Konyhakultúra arány: ${cultureParts}
Felhasználó: ${userName || 'ismeretlen'}
Évszak: ${season}, hónap: ${month}. Régió: ${region || 'Erdély, Románia'}

SZEZONÁLIS ÚTMUTATÓ (${season}):
Most kapható helyi piacon: ${seasonData.available.join(', ')}
Kerülendő (nem szezonális): ${seasonData.avoid.join(', ')}
SOHA NEM KAPHATÓ helyi boltokban: mango, avokádó, papaya, maracuja, és más trópusi gyümölcs

EGYEDI ÉTELEK AZ ÉTLAPBÓL:
${mealSummary}

FELADAT: Azonosítsd azokat az ételeket amelyek:
1. Nem szezonális vagy helyi alapanyagot tartalmaznak (pl. eper januárban)
2. Nem kapható egzotikus alapanyagot használnak (pl. mangó)
3. Nem illenek a régió konyhakultúrájához

Minden problémás ételnél adj hiteles, szezonális, helyi pótlást amely KÖZEL AZONOS KALÓRIASZÁMOT tart.

Válaszolj KIZÁRÓLAG JSON-ben, semmi más szöveg:
{"changes":[{"original":"<eredeti_étel_neve>","replacement":"<javasolt_étel_neve>","reason":"<rövid indok ${language === 'ro' ? 'românul' : language === 'en' ? 'in English' : 'magyarul'}>"}]}
Ha nincs szükség változtatásra: {"changes":[]}`;

    console.log(`[chef-review] season=${season} month=${month} region="${region}" uniqueMeals=${uniqueMeals.size}`);

    const msg = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    const parsed = extractJSON(raw) as { changes?: Array<{ original: string; replacement: string; reason: string }> } | null;
    const llmChanges = parsed?.changes ?? [];
    console.log(`[chef-review] LLM suggested ${llmChanges.length} changes`);

    // Apply changes to the plan by renaming matching meals (preserves ingredients/calories)
    const improvedPlan = JSON.parse(JSON.stringify(mealPlan)) as typeof mealPlan;
    const appliedChanges: Array<{
      day: number; meal: string; original: string; replacement: string; reason: string; silent: boolean;
    }> = [];

    for (const change of llmChanges) {
      const seen = new Set<string>(); // track meal_type+day to avoid duplicate change log entries
      for (const day of improvedPlan.days) {
        for (const meal of (day.meals ?? [])) {
          if (meal.name === change.original) {
            meal.name = change.replacement;
            const key = `${day.day}|${meal.meal_type}`;
            if (!seen.has(key)) {
              seen.add(key);
              appliedChanges.push({
                day: day.day,
                meal: meal.meal_type,
                original: change.original,
                replacement: change.replacement,
                reason: change.reason,
                silent: true,
              });
            }
          }
        }
      }
    }

    console.log(`[chef-review] Applied ${appliedChanges.length} change entries`);
    return res.status(200).json({ mealPlan: improvedPlan, changes: appliedChanges });

  } catch (err: any) {
    console.error('[chef-review] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
