function handleCors(req: any, res: any): boolean { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); if (req.method === 'OPTIONS') { res.status(204).end(); return true; } return false; }
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

// ─── Types ────────────────────────────────────────────────────
type Ingredient = {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
};

type UserProfile = {
  allergies?: string;
  dietaryPreferences?: string;
  goal?: string;
  activityLevel?: string;
  age?: number;
  weight?: number;
  gender?: string;
  mealModel?: string;
  likedFoods?: string[];
  dislikedFoods?: string[];
};

// ─── Locale data ──────────────────────────────────────────────
const DAY_NAMES: Record<string, string[]> = {
  hu: ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'],
  ro: ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

const CUISINE: Record<string, { intro: string; style: string }> = {
  hu: {
    intro: 'Te egy magyarországi és erdélyi konyhában jártas dietetikus és séf vagy.',
    style: `Magyar és erdélyi recepteket használj valódi gasztronómiai nevekkel (csirkepaprikás galuskával, halászlé, erdélyi rakott krumpli, pörkölt, zabkása gyümölccsel stb.). TILOS semmitmondó neveket használni mint "Csirke rizzsel".
KRITIKUS SZABÁLY AZ ÉTELNEVEKHEZ:
- KIZÁRÓLAG valódi, közismert ételneveket használj. SOHA ne találj ki nem létező ételneveket.
- Minden ételnévnek egy valódi, felismerhető ételnek kell lennie, amit egy magyar szakácskönyvben vagy étteremben megtalálnál.
- NE kombinálj véletlenszerű szavakat ételnevek létrehozásához. Pl. "Sülthüllő" NEM létező étel — ilyet TILOS generálni.
- Használj hagyományos magyar/közép-európai ételeket: gulyás, pörkölt, töltött káposzta, lecsó, túrós csusza, lángos, paprikás csirke, meggyleves, somlói galuska stb.`,
  },
  ro: {
    intro: 'Ești un nutriționist și expert culinar în bucătăria română și transilvăneană.',
    style: `Folosește rețete autentice românești cu denumiri gastronomice reale (ciorbă de pui, mămăligă cu brânză, papricaș cu găluște etc.).
REGULĂ CRITICĂ PENTRU DENUMIRILE PREPARATELOR:
- Folosește NUMAI denumiri de preparate reale, cunoscute. NU inventa denumiri fictive de mâncăruri.
- Fiecare denumire trebuie să fie un preparat real, recunoscut din bucătăria românească, transilvăneană sau internațională.
- NU combina cuvinte aleatorii pentru a crea denumiri de preparate. Fiecare preparat trebuie să existe într-o carte de bucate sau pe un meniu de restaurant real.`,
  },
  en: {
    intro: 'You are a nutritionist and culinary expert specializing in Central European cuisine.',
    style: `Use authentic recipes with proper gastronomic names (Chicken Paprikash with dumplings, Hungarian Goulash, etc.). Never use bland names like "Chicken with rice".
CRITICAL RULE FOR DISH NAMES:
- ONLY use real, commonly known dishes and ingredients. Never invent fictional food names.
- Every dish name must be a real, recognizable dish from the target cuisine (Hungarian, Romanian, or international).
- Do NOT combine random words to create food names. Each dish should be something you could find in a real cookbook or restaurant menu.`,
  },
};

// ─── mealCount number → model string ─────────────────────────
function mealCountToModel(count: number | undefined, fallback?: string): string {
  if (fallback && fallback !== '3meals') return fallback;
  switch (count) {
    case 1: return '1meal';
    case 2: return '2meals';
    case 4: return '4meals';
    case 5: return '5meals';
    default: return fallback ?? '3meals';
  }
}

// ─── Meal model → calorie split ───────────────────────────────
function getMealCalories(model: string | undefined, target: number) {
  switch (model) {
    case '1meal': return { lunch: target };
    case '2meals': return { breakfast: Math.round(target * 0.40), dinner: target - Math.round(target * 0.40) };
    case '5meals': return { breakfast: Math.round(target * 0.25), snack1: Math.round(target * 0.10), lunch: Math.round(target * 0.30), snack2: Math.round(target * 0.10), dinner: target - Math.round(target * 0.75) };
    case '4meals': return { breakfast: Math.round(target * 0.25), snack: Math.round(target * 0.10), lunch: Math.round(target * 0.35), dinner: target - Math.round(target * 0.70) };
    default:       return { breakfast: Math.round(target * 0.25), lunch: Math.round(target * 0.40), dinner: target - Math.round(target * 0.65) };
  }
}

function getMealTypes(model: string | undefined): string[] {
  switch (model) {
    case '1meal': return ['lunch'];
    case '2meals': return ['breakfast', 'dinner'];
    case '5meals': return ['breakfast', 'snack', 'lunch', 'snack', 'dinner'];
    case '4meals': return ['breakfast', 'snack', 'lunch', 'dinner'];
    default:       return ['breakfast', 'lunch', 'dinner'];
  }
}

// ─── Strip accents for ingredient lookup ──────────────────────
function norm(s: string): string {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// ─── Robust JSON extraction ───────────────────────────────────
function extractJSON(text: string): any {
  const s = text.trim()
    .replace(/^```json\s*/i, '').replace(/```\s*$/i, '')
    .replace(/^```\s*/i, '').trim();

  // 1. Direct parse
  try { return JSON.parse(s); } catch {}

  // 2. Extract first JSON object
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch {}

  // 3. Repair truncated JSON
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

// ─── Handler ──────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      ingredients = [],
      dailyCalorieTarget = 2000,
      days = 7,
      language = 'hu',
      userProfile,
      mealCount,
      trainingDays = [],
      goal = 'maintain',
    }: {
      ingredients?: Ingredient[];
      dailyCalorieTarget?: number;
      days?: number;
      language?: string;
      userProfile?: UserProfile;
      mealCount?: number;
      trainingDays?: number[];
      goal?: string;
    } = req.body || {};

    // TODO: re-enable calorie validation before production
    // const valid = (ingredients as Ingredient[]).filter(i => (i.calories_per_100g ?? 0) > 0);
    // if (valid.length === 0) {
    //   return res.status(400).json({ error: 'Nincs érvényes kalória-adattal rendelkező alapanyag. Add hozzá az ételeket az "Add food" dialógon keresztül.' });
    // }
    const valid = (ingredients as Ingredient[]).length > 0 ? (ingredients as Ingredient[]) : [{ name: 'csirke', calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6 }, { name: 'rizs', calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fat_per_100g: 0.3 }, { name: 'tojás', calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1, fat_per_100g: 11 }];

    // TODO: re-enable 40-ingredient cap before production
    // const selected = valid.length > 40
    //   ? valid.sort(() => Math.random() - 0.5).slice(0, 40)
    //   : valid;
    const selected = valid;

    const clampedDays = Math.min(Math.max(days, 1), 7);
    const lang = ['hu', 'ro', 'en'].includes(language) ? language : 'hu';
    const dayNames = DAY_NAMES[lang];
    const { intro, style } = CUISINE[lang];
    const effectiveModel = mealCountToModel(mealCount, userProfile?.mealModel);
    const mealCals = getMealCalories(effectiveModel, dailyCalorieTarget);
    const mealTypes = getMealTypes(effectiveModel);

    // Build ingredient lookup map
    const ingMap = new Map<string, Ingredient>();
    for (const i of selected) ingMap.set(norm(i.name), i);

    // Build compact ingredient list
    const ingList = selected
      .map(i => `${i.name}(${i.calories_per_100g}kcal/${i.protein_per_100g}gP/${i.carbs_per_100g}gC/${i.fat_per_100g}gF)`)
      .join('; ');

    const calBlock = Object.entries(mealCals)
      .map(([k, v]) => `${k}=${v}kcal`)
      .join(', ');

    const dayLabels = dayNames.slice(0, clampedDays)
      .map((d, i) => `day${i + 1}="${d}"`)
      .join(', ');

    // Training day names for the prompt
    const hasTrainingDays = trainingDays.length > 0;
    const trainingDayNames = trainingDays.map(d => dayNames[d]).join(', ');

    // Carb cycling block — only relevant when goal is weight loss
    const carbCycleBlock = hasTrainingDays
      ? `\nSPORT ÉS SZÉNHIDRÁT CIKLUS:
- Edzésnapok (is_training_day=true): ${trainingDayNames}
- Pihenőnapok (is_training_day=false): a többi nap
${goal === 'loss'
  ? `- FOGYÁS CÉL: Pihenőnapokon csökkentett szénhidrát — kerüld a rizst, burgonyát, tésztát, kenyeret. Helyettesítsd fehérjével és zöldségekkel. Edzésnapokon ezek megengedett.`
  : `- KARBAN TARTÁS/NÖVELÉS: Minden nap szokásos szénhidrát, edzésnapokon kissé több (rizs, zabpehely, burgonya).\n`}
`
      : '';

    // User context
    const userLines: string[] = [];
    if (userProfile?.dislikedFoods?.length) userLines.push(`KERÜLENDŐ TELJESEN: ${userProfile.dislikedFoods.join(', ')}`);
    if (userProfile?.likedFoods?.length)    userLines.push(`Kedvelt: ${userProfile.likedFoods.join(', ')}`);
    if (userProfile?.allergies)             userLines.push(`Allergia: ${userProfile.allergies}`);
    if (userProfile?.goal)                  userLines.push(`Cél: ${userProfile.goal}`);
    const userBlock = userLines.length ? `FELHASZNÁLÓI PROFIL:\n${userLines.join('\n')}\n\n` : '';

    const prompt = `${userBlock}${intro}
${style}
${carbCycleBlock}
ALAPANYAGOK (név, kcal/100g, protein, szénhidrát, zsír):
${ingList}

FELADAT: Generálj ${clampedDays} napos étrendet. Napok: ${dayLabels}
Napi célkalória: ${dailyCalorieTarget} kcal. Étkezések: ${mealTypes.join(', ')} (${calBlock})

SZABÁLYOK:
1. CSAK a megadott alapanyagokat használd
2. Minden ételnél adj meg egy VALÓDI, vonzó étlapszerű nevet — KIZÁRÓLAG létező, közismert ételek neveit használd. TILOS kitalált, értelmetlen ételneveket generálni (pl. "Sülthüllő" NEM étel). Minden névnek olyannak kell lennie, amit egy valódi étterem étlapján vagy szakácskönyvben megtalálnál.
3. Változatos ételek napról napra — ne ismételj egymás után
4. ingredients.g = gramm mennyiség az adott étkezésben
5. is_training_day értékét állítsd helyesen minden napra
6. Válaszolj KIZÁRÓLAG nyers JSON-nel, semmi más szöveg

SÉMA:
{"days":[{"day":1,"day_label":"Hétfő","is_training_day":false,"meals":[{"meal_type":"breakfast","name":"Zabkása pirított dióval","total_calories":483,"ingredients":[{"name":"zab","g":80},{"name":"dió","g":20}]}]}]}

Generáld le mind a ${clampedDays} napot:`;

    console.log(`[generate-meal-plan] Starting: lang=${lang} days=${clampedDays} ingredients=${selected.length} target=${dailyCalorieTarget}kcal model=${effectiveModel}`);

    let parsed: { days?: any[] } | null = null;
    let lastErr = '';

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const msg = await getClient().messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 6144,
          messages: [{ role: 'user', content: prompt }],
        });
        const raw = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
        console.log(`[generate-meal-plan] Attempt ${attempt} raw (first 200):`, raw.slice(0, 200));
        parsed = extractJSON(raw) as { days?: any[] } | null;
        if (parsed?.days?.length) break;
        lastErr = `No days in LLM response (attempt ${attempt})`;
      } catch (e: any) {
        lastErr = e.message;
        console.error(`[generate-meal-plan] Attempt ${attempt} error:`, e.message);
        if (attempt === 2) throw new Error(`Claude API error: ${e.message}`);
      }
    }

    if (!parsed?.days?.length) {
      throw new Error(`Nem sikerült étrendet generálni. ${lastErr}`);
    }

    // Enrich with macro data from our ingredient map
    function enrich(ing: any) {
      const found = ingMap.get(norm(ing.name || ''));
      return {
        name: ing.name,
        quantity_grams: ing.g ?? ing.quantity_grams ?? 100,
        unit: 'g',
        estimated_calories_per_100g: found?.calories_per_100g ?? 100,
        estimated_protein_per_100g: found?.protein_per_100g ?? 5,
        estimated_carbs_per_100g: found?.carbs_per_100g ?? 10,
        estimated_fat_per_100g: found?.fat_per_100g ?? 3,
      };
    }

    const baseWeek = parsed.days.slice(0, 7).map((d: any, i: number) => ({
      day_label: d.day_label ?? dayNames[i % 7],
      is_training_day: d.is_training_day ?? false,
      meals: (d.meals ?? []).map((m: any) => ({
        meal_type: m.meal_type,
        name: m.name,
        total_calories: m.total_calories,
        ingredients: (m.ingredients ?? []).map(enrich),
      })),
    }));

    // Expand to 30 days (rotate the 7-day pattern)
    const TOTAL_DAYS = 30;
    const trainingDaySet = new Set(trainingDays);
    const allDays = Array.from({ length: TOTAL_DAYS }, (_, i) => {
      const base = baseWeek[i % baseWeek.length];
      const weekdayIdx = i % 7; // 0=Mon … 6=Sun
      return {
        ...base,
        week: Math.floor(i / 7) + 1,
        day: i + 1,
        day_label: dayNames[weekdayIdx],
        is_training_day: trainingDaySet.has(weekdayIdx),
      };
    });

    const avgCal = Math.round(
      baseWeek.reduce((sum: number, d: any) =>
        sum + d.meals.reduce((s: number, m: any) => s + (m.total_calories ?? 0), 0), 0)
      / baseWeek.length
    );

    console.log(`[generate-meal-plan] Done: ${TOTAL_DAYS} days (${baseWeek.length}-day rotation), avg ${avgCal} kcal/day, model=${effectiveModel}`);

    return res.status(200).json({
      nutritionPlan: {
        days: allDays,
        meal_model: effectiveModel,
      },
      stats: {
        days: TOTAL_DAYS,
        meals_per_day: mealTypes.length,
        meals: TOTAL_DAYS * mealTypes.length,
        avg_calories_per_day: avgCal,
      },
    });

  } catch (err: any) {
    const msg = err?.message ?? 'Internal server error';
    console.error('[generate-meal-plan] Fatal error:', msg);
    // Surface billing errors with a specific flag so the frontend can show a friendly message
    const isBilling = msg.includes('credit balance') || msg.includes('billing') || msg.includes('Plans & Billing') || msg.includes('billing_error') || err?.status === 400;
    return res.status(500).json({ error: msg, billing: isBilling });
  }
}
