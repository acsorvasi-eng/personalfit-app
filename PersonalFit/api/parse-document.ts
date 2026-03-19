import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

/** Read ANTHROPIC_API_KEY from process.env, falling back to .env.local for local dev. */
function resolveApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const envFile = path.resolve(process.cwd(), '.env.local');
    const content = fs.readFileSync(envFile, 'utf8');
    const match = content.match(/^ANTHROPIC_API_KEY=["']?([^"'\r\n]+)["']?/m);
    return match?.[1];
  } catch {
    return undefined;
  }
}

// Lazy-initialized so the key is resolved per first request
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: resolveApiKey() });
  return client;
}

/** User daily calorie target (kcal). For now hardcoded; later from user profile (userProfile.dailyCalorieTarget). */
const DAILY_CALORIE_TARGET = 2000;

// Day name → day number mapping
const DAY_NUMBER: Record<string, number> = {
  'HÉTFŐ': 1, 'KEDD': 2, 'SZERDA': 3, 'CSÜTÖRTÖK': 4,
  'PÉNTEK': 5, 'SZOMBAT': 6, 'VASÁRNAP': 7,
  'Hétfő': 1, 'Kedd': 2, 'Szerda': 3, 'Csütörtök': 4,
  'Péntek': 5, 'Szombat': 6, 'Vasárnap': 7,
};

// Meal type → macro ratio estimates (protein%, carb%, fat% of calories)
const MACRO_RATIOS: Record<string, { p: number; c: number; f: number }> = {
  breakfast: { p: 0.25, c: 0.40, f: 0.35 },
  lunch:     { p: 0.30, c: 0.45, f: 0.25 },
  dinner:    { p: 0.35, c: 0.15, f: 0.50 },
  snack:     { p: 0.50, c: 0.35, f: 0.15 },
};

// Garbage patterns: merged table cells, PDF noise, label text (not food)
const GARBAGE_PATTERNS = [
  /\([A-Za-z0-9*φ~{}\[\]<>=\\]+\)/g,           // (AVk*FhA8φNI...
  /[φ~{}\[\]<>*=]/g,                           // single forbidden chars
  /\bNapi összesen\b/gi,
  /\bProtein\s*\+\s*egészséges zsír\b/gi,
];
const LABEL_PHRASES = ['napi összesen', 'protein + egészséges zsír', 'összesen'];

function removeAccents(s: string): string {
  try {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    return s;
  }
}

/**
 * Clean PDF-extracted text: remove merged cell garbage, label lines, forbidden chars.
 * REQUIREMENT 1: no "(AVk*FhA8φNI...", no φ, ~, }, {, <, >, *, =
 */
function cleanPdfText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let out = text;

  for (const re of GARBAGE_PATTERNS) {
    out = out.replace(re, ' ');
  }

  // Remove lines that are only labels or too long without spaces (run-on garbage)
  const lines = out.split(/\r?\n/);
  const cleaned = lines
    .map(line => {
      const t = line.trim();
      const lower = t.toLowerCase();
      if (LABEL_PHRASES.some(phrase => lower.includes(phrase))) return '';
      if (t.length > 25 && !/\s/.test(t)) return ''; // no space in long string = garbage
      return line;
    })
    .filter(Boolean);

  return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content, text, extracted_text } = req.body;
  const rawText: string = content || text || extracted_text || '';

  if (!rawText) {
    return res.status(400).json({ error: 'No content provided' });
  }

  try {
    const cleanedText = cleanPdfText(rawText);
    const payload = await parseDocumentToIngredientsAndPlan(cleanedText);

    const result = {
      ingredients: payload.ingredients,
      detected_weeks: payload.detected_weeks,
      detected_days_per_week: payload.detected_days_per_week,
      weeks: payload.weeks,
    };

    console.log(`[parse-document] Done: ${payload.ingredients.length} ingredients, ${payload.weeks.length} weeks`);

    const flatWeeks = Array.isArray(result.weeks)
      ? (result.weeks as any[]).reduce<any[]>((acc, w) => {
          if (Array.isArray(w)) acc.push(...w);
          return acc;
        }, [])
      : [];

    const totalDays = (result as any).totalDays || flatWeeks.length;
    const totalMeals = (result as any).totalMeals || flatWeeks.reduce((sum, day) => {
      const meals = Array.isArray((day as any)?.meals) ? (day as any).meals : [];
      return sum + meals.length;
    }, 0);
    const totalIngredients = (result as any).totalIngredients || (Array.isArray(result.ingredients) ? result.ingredients.length : 0);

    const stats = {
      days_count: totalDays,
      meals_count: totalMeals,
      foods_count: totalIngredients,
      training_days: (result as any).training_days || 0,
      rest_days: (result as any).rest_days || 0,
    };

    return res.status(200).json({
      result: JSON.stringify(result),
      stats,
    });

  } catch (error: any) {
    console.error('[parse-document] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to parse document' });
  }
}

/**
 * Single LLM call: extract (1) clean ingredients list, (2) 30-day meal plan.
 * Then convert plan to 4 weeks × 7 days and filter ingredients.
 */
async function parseDocumentToIngredientsAndPlan(cleanedText: string): Promise<{
  ingredients: string[];
  weeks: any[][];
  detected_weeks: number;
  detected_days_per_week: number;
}> {
  const prompt = `You are a nutrition coach. Extract TWO outputs from the Hungarian meal plan text below.

OUTPUT 1 — ingredients:
- Extract EVERY individual food ingredient from the entire text (target 80–120 unique ingredients for a full 28-day plan).
- The text may contain multi-column tables; ingredients can appear in ANY column or cell. Scan ALL columns and ALL lines, not just the first column.
- Return a JSON array of ATOMIC base ingredient names ONLY. No quantities, no units, no descriptions.
- ALL names MUST be in Hungarian. If the source uses English names (e.g. "walnut", "potato", "broccoli", "avocado", "zucchini"), translate to the correct Hungarian base ingredient (e.g. "dió", "krumpli", "brokkoli", "avokádó", "cukkini").
- Include meats, fish, vegetables, fruits, dairy, grains, nuts, seeds, legumes, oils, and other real foods. Do NOT skip anything that looks like an ingredient.
- Do NOT combine ingredients into one token: "cukkini-paradicsom" is WRONG. Instead extract them as two separate ingredients: "cukkini" and "paradicsom".
- Each name must be a single base food, max 25 characters.

GOOD: "tojás", "csirkemell", "lazac", "avokádó", "zab", "túró", "brokkoli", "dió", "banán", "olívaolaj", "kesudió"
BAD: "3 tojás", "180g lazac", "Protein + egészséges zsír", "Napi összesen", any string with φ ~ } { < > * =

OUTPUT 2 — plan:
- A JSON array of exactly 30 days. Each day:
  - day: 1..30
  - dayOfWeek: "Hétfő" | "Kedd" | "Szerda" | "Csütörtök" | "Péntek" | "Szombat" | "Vasárnap"
  - type: "edzés" | "pihenő"
  - totalKcal: number (MUST NOT exceed ${DAILY_CALORIE_TARGET} — user's daily target)
  - meals: array of { name: "Reggeli"|"Ebéd"|"Vacsora"|"Edzés utáni", items: string[], kcal: number }
    - items: strings WITH quantities, e.g. "3 tojás (180g)", "60g tk kenyér", "½ avokádó (70g)", "220g csirkemell"

Return ONLY valid JSON in this exact shape (no markdown):
{"ingredients":["tojás","csirkemell",...],"plan":[{"day":1,"dayOfWeek":"Hétfő","type":"edzés","totalKcal":2000,"meals":[{"name":"Reggeli","items":["3 tojás (180g)","60g tk kenyér"],"kcal":520},...]},...]}

TEXT:
${cleanedText.substring(0, 45000)}`;

  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object in LLM response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as { ingredients?: string[]; plan?: any[] };
  const rawIngredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
  const rawPlan = Array.isArray(parsed.plan) ? parsed.plan : [];

  const ingredients = filterCleanIngredients(rawIngredients);
  const weeks = convert30DayPlanToWeeks(rawPlan);

  return {
    ingredients,
    weeks,
    detected_weeks: weeks.length,
    detected_days_per_week: 7,
  };
}

/**
 * REQUIREMENT 1 filter: atomic names only; split compounds, strip labels/measurements,
 * accent-insensitive dedup, max ~60–80 unique clean Hungarian ingredients.
 */
function filterCleanIngredients(names: string[]): string[] {
  const forbidden = /[φ~{}\[\]<>*=]/;
  const categoryWords = [
    'sovány','sovany','komplex','zsíros','zsírosabb','magas','vegyes',
    'extra','light','protein','fehérje','feherje','ch'
  ];
  const measurementWords = [
    'g','gramm','gram','kg','db','ml','dl','evőkanál','evokanal','ek',
    'teáskanál','teaskanal','tk','csésze','csesze','adag','adagok'
  ];
  const synonymMap: Record<string, string> = {
    'fehérje por': 'fehérjepor',
    'feherje por': 'fehérjepor',
    'fehérjepor': 'fehérjepor',
    'feherjepor': 'fehérjepor',
  };

  const seen = new Set<string>(); // accent-insensitive key
  const out: string[] = [];

  for (const raw of names) {
    const s = String(raw ?? '').trim();
    if (!s) continue;
    if (forbidden.test(s)) continue;

    // Strip leading quantity (e.g. "220g csirkemell" -> "csirkemell")
    let base = s.replace(/^\d+[.,]?\d*\s*[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]*\s+/, '').trim();
    if (!base) continue;

    // Split on commas, slashes, plus and dashes into candidate tokens
    const parts = base
      .split(/[,/+\-]/)
      .map(p => p.trim())
      .filter(p => p.length > 0 && p.length <= 40);

    for (let part of parts) {
      let n = part.toLowerCase();

      // Remove category words
      for (const w of categoryWords) {
        n = n.replace(new RegExp(`\\b${w}\\b`, 'gi'), '').trim();
      }

      // Remove standalone measurement tokens
      for (const w of measurementWords) {
        n = n.replace(new RegExp(`\\b${w}\\b`, 'gi'), '').trim();
      }

      // Collapse whitespace
      n = n.replace(/\s+/g, ' ').trim();
      if (!n) continue;

      // Length and label checks
      if (n.length < 2 || n.length > 25) continue;
      if (LABEL_PHRASES.some(phrase => n.includes(phrase))) continue;

      // Apply simple synonym normalization
      if (synonymMap[n]) {
        n = synonymMap[n];
      }

      const accentless = removeAccents(n);
      if (seen.has(accentless)) continue;
      seen.add(accentless);

      const display = n.charAt(0).toUpperCase() + n.slice(1);
      out.push(display);
    }
  }

  return out;
}

/**
 * Parse item string like "3 tojás (180g)" or "60g tk kenyér" → { name, quantity_grams }.
 */
function parseItemToIngredient(itemStr: string): { name: string; quantity_grams: number } {
  const s = String(itemStr || '').trim();
  if (!s) return { name: 'Étel', quantity_grams: 50 };

  const inParens = s.match(/\((\d+)\s*g\)/i) || s.match(/\((\d+)g\)/i);
  if (inParens) {
    const grams = parseInt(inParens[1], 10) || 50;
    const namePart = s.replace(/\s*\(\d+\s*g\)\s*/gi, '').trim();
    const name = namePart.replace(/^\d+\s+/, '').trim() || 'Étel';
    return { name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(), quantity_grams: grams };
  }

  const leadingG = s.match(/^(\d+)\s*g\s+(.+)$/i);
  if (leadingG) {
    const grams = parseInt(leadingG[1], 10) || 50;
    const name = leadingG[2].trim().charAt(0).toUpperCase() + leadingG[2].trim().slice(1).toLowerCase();
    return { name, quantity_grams: grams };
  }

  return { name: s.replace(/^\d+\s+/, '').trim() || 'Étel', quantity_grams: 50 };
}

/**
 * Convert 30-day plan to 4 weeks × 7 days (AIParsedNutritionPlan format).
 * First 28 days used; cap totalKcal at DAILY_CALORIE_TARGET.
 */
function convert30DayPlanToWeeks(plan: any[]): any[][] {
  const days = (plan || []).slice(0, 28);
  const mealTypeMap: Record<string, string> = {
    'Reggeli': 'breakfast',
    'Ebéd': 'lunch',
    'Vacsora': 'dinner',
    'Edzés utáni': 'snack',
  };

  const weeks: any[][] = [[], [], [], []];
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const weekIndex = Math.floor(i / 7);
    const dayInWeek = (i % 7) + 1;
    const dayName = d?.dayOfWeek || 'Hétfő';
    const dayNum = DAY_NUMBER[dayName.toUpperCase()] ?? dayInWeek;
    const totalKcal = Math.min(Number(d?.totalKcal) || DAILY_CALORIE_TARGET, DAILY_CALORIE_TARGET);

    const meals = (d?.meals || []).map((m: any) => {
      const type = mealTypeMap[m?.name] || 'lunch';
      const typeKey = type as keyof typeof MACRO_RATIOS;
      const ratio = MACRO_RATIOS[typeKey] || MACRO_RATIOS.lunch;
      const mealKcal = typeof m?.kcal === 'number' ? m.kcal : 0;
      const items = Array.isArray(m?.items) ? m.items : [];
      const ingredients = items.map((item: string) => {
        const { name, quantity_grams } = parseItemToIngredient(item);
        const cal = items.length > 0 ? Math.max(Math.round(mealKcal / items.length), 1) : 100;
        return {
          name,
          quantity_grams,
          unit: 'g' as const,
          estimated_calories_per_100g: Math.round((cal / quantity_grams) * 100) || 100,
          estimated_protein_per_100g: Math.round((cal * ratio.p) / 4),
          estimated_carbs_per_100g: Math.round((cal * ratio.c) / 4),
          estimated_fat_per_100g: Math.round((cal * ratio.f) / 9),
          estimated_category: type === 'breakfast' ? 'Egyéb' : 'Hús & Hal',
        };
      });

      return {
        meal_type: type,
        name: m?.name || 'Ebéd',
        ingredients,
      };
    });

    weeks[weekIndex].push({
      week: weekIndex + 1,
      day: dayNum,
      day_label: dayName,
      is_training_day: String(d?.type).toLowerCase() === 'edzés',
      meals,
    });
  }

  return weeks.filter(w => w.length > 0);
}
