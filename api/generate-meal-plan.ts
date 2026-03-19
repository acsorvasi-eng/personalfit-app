import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';

// ─── Firebase Admin (server-side Firestore) ───────────────────────
// Requires FIREBASE_ADMIN_KEY env var (base64-encoded service account JSON)
// If not configured → rate limit check is skipped (fail open for local dev)
function getAdminApp(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!;
  const keyB64 = process.env.FIREBASE_ADMIN_KEY;
  if (!keyB64) return null;
  try {
    const credential = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(credential) });
  } catch (e) {
    console.warn('[generate-meal-plan] Firebase Admin init failed:', e);
    return null;
  }
}

const FREE_DAILY_LIMIT = 5;
function todayStr() { return new Date().toISOString().slice(0, 10); }

async function checkAndIncrementUsage(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const app = getAdminApp();
  if (!app) return { allowed: true, remaining: FREE_DAILY_LIMIT }; // fail open — no admin config

  try {
    const db = admin.firestore(app);
    const ref = db.collection('users').doc(userId);
    const snap = await ref.get();

    if (!snap.exists) return { allowed: true, remaining: FREE_DAILY_LIMIT };

    const data = snap.data()!;
    if (data.plan === 'pro') {
      await ref.update({ 'usage.totalGenerations': admin.firestore.FieldValue.increment(1), updatedAt: new Date().toISOString() });
      return { allowed: true, remaining: 999 };
    }

    const today = todayStr();
    const count = data.usage?.lastResetDate !== today ? 0 : (data.usage?.generationsToday ?? 0);

    if (count >= FREE_DAILY_LIMIT) {
      return { allowed: false, remaining: 0 };
    }

    // Increment — reset daily counter if new day
    if (data.usage?.lastResetDate !== today) {
      await ref.update({
        'usage.generationsToday': 1,
        'usage.lastResetDate': today,
        'usage.totalGenerations': admin.firestore.FieldValue.increment(1),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await ref.update({
        'usage.generationsToday': admin.firestore.FieldValue.increment(1),
        'usage.totalGenerations': admin.firestore.FieldValue.increment(1),
        updatedAt: new Date().toISOString(),
      });
    }

    return { allowed: true, remaining: FREE_DAILY_LIMIT - count - 1 };
  } catch (e) {
    console.warn('[generate-meal-plan] Usage check failed, failing open:', e);
    return { allowed: true, remaining: FREE_DAILY_LIMIT };
  }
}

// ─── 24h Meal Plan Cache (Firestore) ─────────────────────────────
// Key = base64url of "lang_target_ingredient1|ingredient2|..."
// Saves ~60–80% of Claude API calls for repeated requests.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function makeCacheKey(ingredients: IngredientInput[], target: number, lang: string): string {
  const base = `${lang}_${target}_${ingredients.map(i => i.name).sort().join('|')}`;
  return Buffer.from(base).toString('base64url').slice(0, 100);
}

async function getCached(key: string): Promise<object | null> {
  const app = getAdminApp();
  if (!app) return null;
  try {
    const snap = await admin.firestore(app).collection('mealPlanCache').doc(key).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    if (Date.now() > data.expiresAt) return null; // expired
    console.log('[generate-meal-plan] Cache HIT:', key.slice(0, 20));
    return data.result;
  } catch { return null; }
}

async function writeCache(key: string, result: object): Promise<void> {
  const app = getAdminApp();
  if (!app) return;
  try {
    await admin.firestore(app).collection('mealPlanCache').doc(key).set({
      result,
      createdAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  } catch { /* non-fatal */ }
}

function resolveApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    return content.match(/^ANTHROPIC_API_KEY=["']?([^"'\r\n]+)["']?/m)?.[1];
  } catch { return undefined; }
}

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: resolveApiKey() });
  return _client;
}

type IngredientInput = {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
};

type UserProfileContext = {
  allergies?: string;
  dietaryPreferences?: string;
  goal?: string;
  activityLevel?: string;
  age?: number;
  weight?: number;
  gender?: string;
  macroProteinPct?: number;
  macroCarbsPct?: number;
  macroFatPct?: number;
  mealCount?: number;
  mealModel?: string;
  likedFoods?: string[];
  dislikedFoods?: string[];
};

const DAY_NAMES_HU = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
const DAY_NAMES_RO = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
const DAY_NAMES_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// ─── Language → cuisine context ──────────────────────────────
function getCuisineContext(lang: string): { intro: string; style: string; dayNames: string[] } {
  switch (lang) {
    case 'ro':
      return {
        intro: 'Ești un expert culinar în bucătăria română și transilvăneană.',
        style: `
STIL CULINAR ȘI DENUMIRI:
- Folosește rețete autentice românești și transilvănene (ciorbă, mămăligă, sarmale, tochitură, papricaș, zacuscă etc.)
- Zona poate fi multiculturală (Transilvania) — poți folosi atât rețete românești cât și maghiare tradiționale
- OBLIGATORIU: Fiecare fel de mâncare trebuie să aibă un NUME GASTRONOMIC REAL și atractiv
- Dacă ingredientele formează un fel cunoscut → folosește NUMELE EXACT (ex: "Ciorbă de pui cu tăiței", "Mămăligă cu brânză și smântână", "Papricaș de pui cu găluște")
- Dacă nu există un nume fix → creează un nume descriptiv și apetisant (ex: "File de pește cu legume sotate", "Omletă cu verdețuri și brânză")
- NU folosi denumiri banale ca "Pui cu orez" sau "Pește fript"
- Denumirile trebuie să fie atrăgătoare, specifice regiunii, ca pe un meniu de restaurant`,
        dayNames: DAY_NAMES_RO,
      };
    case 'en':
      return {
        intro: 'You are an expert culinary chef specializing in Central European and international cuisine.',
        style: `
CULINARY STYLE AND NAMING:
- Use real, authentic recipes from Central European cuisine (Hungarian, Romanian, Transylvanian, Austrian influences)
- MANDATORY: Every meal must have a proper GASTRONOMIC NAME — not a generic description
- If the ingredients form a known dish → use the EXACT culinary name (e.g., "Chicken Paprikash with Egg Noodles", "Hungarian Goulash", "Stuffed Cabbage Rolls")
- If no standard name exists → create an appealing, descriptive name (e.g., "Pan-seared Trout with Roasted Vegetables", "Herb Omelette with Garden Salad")
- NEVER use bland names like "Chicken with rice" or "Fish with vegetables"
- Names should read like a restaurant menu — appetizing and specific`,
        dayNames: DAY_NAMES_EN,
      };
    default: // 'hu' and fallback
      return {
        intro: 'Te egy magyarországi és erdélyi konyhában jártas séf és dietetikus vagy.',
        style: `
KONYHASTÍLUS ÉS NÉVADÁS:
- Elsősorban magyar és erdélyi recepteket használj (gulyás, pörkölt, töltött paprika, rakott krumpli, csirkepaprikás, halászlé, rántotta, zabkása stb.)
- Ha az étel erdélyi/romániai kontextusban van → szívesen keverd a román konyhát is (ciorbă, mámáliga, saláta de boeuf stb.)
- KÖTELEZŐ: Minden ételnél adj meg egy VALÓDI, GASZTRONÓMIAILAG HELYES nevet
- Ha az összetevők egy ismert ételt alkotnak → használd a PONTOS nevet (pl. "Erdélyi rakott krumpli", "Tojásos nokedli", "Csirkepaprikás galuskával", "Spenótos tükörtojás pirítóssal", "Tejfölös pontyfilé")
- Ha nincs hagyományos neve → alkoss leíró, ízletes étlapszerű nevet (pl. "Fűszeres csirkemell pirított zöldségekkel", "Citromos lazacfilé friss salátával", "Vajas-fokhagymás pisztráng sütőtökkel")
- TILOS semmitmondó neveket használni, mint "Csirke rizzsel", "Hal sütve", "Tojás kenyérrel"
- A nevek legyenek vonzóak, étlapszerűek, a régió konyhájára jellemzők`,
        dayNames: DAY_NAMES_HU,
      };
  }
}

// ─── Meal model → prompt sections ────────────────────────────
type MealConfig = {
  caloriesBlock: string;
  mealCountRule: string;
  schemaExample: string;
};

function buildMealConfig(
  mealModel: string | undefined,
  dailyCalorieTarget: number,
  breakfastTarget: number,
  lunchTarget: number,
  dinnerTarget: number,
  dayLabel: string,
): MealConfig {
  switch (mealModel) {
    case '5meals': {
      const b = Math.round(dailyCalorieTarget * 0.25);
      const s1 = Math.round(dailyCalorieTarget * 0.1);
      const l = Math.round(dailyCalorieTarget * 0.3);
      const s2 = Math.round(dailyCalorieTarget * 0.1);
      const d = dailyCalorieTarget - b - s1 - l - s2;
      return {
        caloriesBlock: `- Reggeli/Breakfast: ${b} kcal\n- Tízórai/Snack: ${s1} kcal\n- Ebéd/Lunch: ${l} kcal\n- Uzsonna/Snack: ${s2} kcal\n- Vacsora/Dinner: ${d} kcal`,
        mealCountRule: '2. 5 étkezés/nap: breakfast, snack, lunch, snack, dinner',
        schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"breakfast","name":"Zabkása","total_calories":${b},"ingredients":[{"name":"zab","g":80}]},{"meal_type":"snack","name":"Alma","total_calories":${s1},"ingredients":[{"name":"alma","g":120}]},{"meal_type":"lunch","name":"Csirkepaprikás","total_calories":${l},"ingredients":[{"name":"csirkemell","g":150}]},{"meal_type":"snack","name":"Joghurt","total_calories":${s2},"ingredients":[{"name":"joghurt","g":150}]},{"meal_type":"dinner","name":"Spenótos tojás","total_calories":${d},"ingredients":[{"name":"tojás","g":120}]}]}]}`,
      };
    }
    case '4meals': {
      const b = Math.round(dailyCalorieTarget * 0.25);
      const s = Math.round(dailyCalorieTarget * 0.10);
      const l = Math.round(dailyCalorieTarget * 0.35);
      const d = dailyCalorieTarget - b - s - l;
      return {
        caloriesBlock: `- Reggeli/Breakfast: ${b} kcal\n- Tízórai/Snack: ${s} kcal\n- Ebéd/Lunch: ${l} kcal\n- Vacsora/Dinner: ${d} kcal`,
        mealCountRule: '2. 4 étkezés/nap: breakfast, snack, lunch, dinner',
        schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"breakfast","name":"Zabkása","total_calories":${b},"ingredients":[{"name":"zab","g":80}]},{"meal_type":"snack","name":"Alma","total_calories":${s},"ingredients":[{"name":"alma","g":150}]},{"meal_type":"lunch","name":"Csirkepaprikás","total_calories":${l},"ingredients":[{"name":"csirkemell","g":150}]},{"meal_type":"dinner","name":"Spenótos tojás","total_calories":${d},"ingredients":[{"name":"tojás","g":120}]}]}]}`,
      };
    }
    case '2meals': {
      const b = Math.round(dailyCalorieTarget * 0.35);
      const d = dailyCalorieTarget - b;
      return {
        caloriesBlock: `- Reggeli/Breakfast: ${b} kcal\n- Vacsora/Dinner: ${d} kcal`,
        mealCountRule: '2. 2 étkezés/nap: breakfast, dinner',
        schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"breakfast","name":"Zabkása","total_calories":${b},"ingredients":[{"name":"zab","g":80}]},{"meal_type":"dinner","name":"Csirkepaprikás","total_calories":${d},"ingredients":[{"name":"csirkemell","g":150}]}]}]}`,
      };
    }
    case 'if16_8':
      return {
        caloriesBlock: `- Étkezési ablak 12:00–20:00: ${dailyCalorieTarget} kcal`,
        mealCountRule: '2. 1 étkezési ablak/nap (16:8 szakaszos böjt) — meal_type: "eating_window"',
        schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"eating_window","name":"Napi étkezési ablak","total_calories":${dailyCalorieTarget},"ingredients":[{"name":"csirkemell","g":150},{"name":"zöldség","g":200}]}]}]}`,
      };
    case 'if18_6':
      return {
        caloriesBlock: `- Étkezési ablak 13:00–19:00: ${dailyCalorieTarget} kcal`,
        mealCountRule: '2. 1 étkezési ablak/nap (18:6 szakaszos böjt) — meal_type: "eating_window"',
        schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"eating_window","name":"Napi étkezési ablak","total_calories":${dailyCalorieTarget},"ingredients":[{"name":"csirkemell","g":150},{"name":"zöldség","g":200}]}]}]}`,
      };
    default: // '3meals' or absent
      return {
        caloriesBlock: `- Reggeli/Breakfast: ${breakfastTarget} kcal\n- Ebéd/Lunch: ${lunchTarget} kcal\n- Vacsora/Dinner: ${dinnerTarget} kcal`,
        mealCountRule: '2. 3 étkezés/nap: breakfast, lunch, dinner',
        schemaExample: `{"days":[{"day":1,"day_label":"${dayLabel}","is_training_day":false,"meals":[{"meal_type":"breakfast","name":"Zabkása pirított dióval","total_calories":${breakfastTarget},"ingredients":[{"name":"zab","g":80},{"name":"dió","g":20}]},{"meal_type":"lunch","name":"Csirkepaprikás galuskával","total_calories":${lunchTarget},"ingredients":[{"name":"csirkemell","g":150}]},{"meal_type":"dinner","name":"Spenótos tükörtojás pirítóssal","total_calories":${dinnerTarget},"ingredients":[{"name":"tojás","g":120}]}]}]}`,
      };
  }
}

// ─── User profile → context block for prompt ─────────────────
function buildUserContextBlock(p: UserProfileContext | undefined): string {
  if (!p) return '';
  const lines: string[] = [];

  const goalParts = [p.goal, p.activityLevel, p.age ? `${p.age} év` : '', p.weight ? `${p.weight} kg` : '', p.gender].filter(Boolean);
  if (goalParts.length) lines.push(`- Goal: ${goalParts.join(' | ')}`);

  const dietParts = [p.dietaryPreferences, p.allergies ? `Allergia: ${p.allergies}` : ''].filter(Boolean);
  if (dietParts.length) lines.push(`- Diet: ${dietParts.join(' | ')}`);

  const mealParts = [
    p.mealCount ? `${p.mealCount} étkezés/nap` : '',
    p.mealModel ? `(${p.mealModel})` : '',
    (p.macroProteinPct && p.macroCarbsPct && p.macroFatPct)
      ? `Makró: ${p.macroProteinPct}% fehérje / ${p.macroCarbsPct}% szénhidrát / ${p.macroFatPct}% zsír`
      : '',
  ].filter(Boolean);
  if (mealParts.length) lines.push(`- Étkezés: ${mealParts.join(' ')}`);

  if (p.likedFoods?.length) lines.push(`- Kedvelt ételek: ${p.likedFoods.join(', ')}`);
  if (p.dislikedFoods?.length) lines.push(`- Kerülendő ételek: ${p.dislikedFoods.join(', ')} — EZEKET TELJESEN KERÜLD`);

  if (!lines.length) return '';
  return `FELHASZNÁLÓI KONTEXTUS:\n${lines.join('\n')}\n\n`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    ingredients,
    dailyCalorieTarget = 2000,
    days = 7,
    language = 'hu',
    userProfile,
    userId,
    trainingDays = [],
    trainingCaloriesPerDay = {},
  }: {
    ingredients: IngredientInput[];
    dailyCalorieTarget?: number;
    days?: number;
    language?: string;
    userProfile?: UserProfileContext;
    userId?: string;
    trainingDays?: number[];
    trainingCaloriesPerDay?: Record<string, number>;
  } = req.body || {};

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'ingredients array required' });
  }

  // ── Cache check (24h) ─────────────────────────────────────────
  const cacheKey = makeCacheKey(ingredients, dailyCalorieTarget, language);
  const cached = await getCached(cacheKey);
  if (cached) {
    return res.status(200).json({ ...cached, fromCache: true });
  }

  // ── Rate limit check ───────────────────────────────────────────
  if (userId) {
    const usage = await checkAndIncrementUsage(userId);
    if (!usage.allowed) {
      return res.status(429).json({
        error: 'daily_limit_reached',
        message: 'Napi generálási limit elérve. Próbáld holnap, vagy válts Pro-ra.',
        remaining: 0,
      });
    }
  }

  const clampedDays = Math.min(Math.max(days, 1), 7);
  const breakfastTarget = Math.round(dailyCalorieTarget * 0.25);
  const lunchTarget = Math.round(dailyCalorieTarget * 0.40);
  const dinnerTarget = Math.round(dailyCalorieTarget * 0.35);

  // Build lookup for server-side macro enrichment
  const ingredientMap = new Map<string, IngredientInput>();
  for (const ing of ingredients) {
    ingredientMap.set(stripAccents(ing.name), ing);
  }

  const { intro, style, dayNames } = getCuisineContext(language);

  // Compact ingredient list — only names + calories to reduce prompt size
  const ingredientList = ingredients
    .map(i => `${i.name}(${i.calories_per_100g}kcal)`)
    .join(', ');

  const { caloriesBlock, mealCountRule, schemaExample } = buildMealConfig(
    userProfile?.mealModel,
    dailyCalorieTarget,
    breakfastTarget,
    lunchTarget,
    dinnerTarget,
    dayNames[0],
  );

  const userContextBlock = buildUserContextBlock(userProfile);

  // ── Training-day helpers ──────────────────────────────────────
  const trainingDaySet = new Set<number>(trainingDays);
  const hasTrainingDays = trainingDaySet.size > 0;
  const goal = userProfile?.goal ?? '';
  const trainingDayNames = trainingDays.map(i => dayNames[i] ?? String(i)).join(', ');

  const carbCycleBlock = hasTrainingDays
    ? `\nSZÉNHIDRÁT CIKLUS (${goal === 'loss' ? 'FOGYÁS CÉL' : 'TARTÁS/NÖVELÉS'}):
- Edzésnapok (${trainingDayNames}): emelt kalória-cél (alap + sport égetés).
  ${goal === 'loss'
    ? 'Ajánlott szénhidrát: rizs, burgonya, tészta, zabpehely — az edzés utáni szénhidrát+fehérje gátolja az izomlebontást és feltölti a glikogénraktárakat.'
    : 'Normál szénhidrát, edzésnapokon kissé több (rizs, zabpehely, burgonya).'}
- Pihenőnapok:
  ${goal === 'loss'
    ? 'Max 150g szénhidrát, KIZÁRÓLAG lassú felszívódású forrásból: rozskenyér, teljes kiőrlésű kenyér, zöldség. TILOS: fehér rizs, fehér tészta, burgonya, fehér kenyér. Pótold fehérjével és zöldséggel.'
    : 'Normál szénhidrát.'}\n`
    : '';

  const prompt = `${userContextBlock}${intro}

ALAPANYAGOK / INGREDIENTS: ${ingredientList}

Napi alapkalória: ${dailyCalorieTarget} kcal${hasTrainingDays ? ` (edzésnapokon magasabb a sport égetéssel)` : ''}.
${caloriesBlock}
${carbCycleBlock}${style}

SZABÁLYOK / RULES:
1. CSAK a megadott alapanyagokat használd / Use ONLY the listed ingredients
${mealCountRule}
3. Ne ismételd egymás után ugyanazt az ételt
4. is_training_day: true/false minden naphoz

Válaszolj CSAK JSON-nel (no markdown, no text):
${schemaExample}

Generálj ${clampedDays} napot (day 1..${clampedDays}), minden naphoz más ételnevekkel, ${dayNames.slice(0, clampedDays).map((d, i) => `day ${i + 1}="${d}"`).join(', ')}.`;

  try {
    console.log(`[generate-meal-plan] lang=${language} days=${clampedDays} ingredients=${ingredients.length} kcal=${dailyCalorieTarget} mealModel=${userProfile?.mealModel ?? 'default'}`);

    const message = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('[generate-meal-plan] No JSON found, first 300 chars:', rawText.slice(0, 300));
      throw new Error('No JSON in LLM response');
    }

    const parsed = JSON.parse(match[0]) as { days?: any[] };
    const rawDays: any[] = Array.isArray(parsed.days) ? parsed.days : [];
    if (rawDays.length === 0) throw new Error('No days generated');

    // Enrich ingredients with macro data from input (avoids asking LLM to repeat macros)
    function enrichIngredient(ing: any) {
      const key = stripAccents(ing.name || '');
      const found = ingredientMap.get(key);
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

    const weekDays = rawDays.slice(0, 7).map((d, i) => {
      const weekdayIdx = i % 7;
      const burnBonus = (trainingCaloriesPerDay as Record<string, number>)[String(weekdayIdx)] ?? 0;
      return {
        week: 1,
        day: weekdayIdx + 1,
        day_label: d.day_label ?? dayNames[weekdayIdx],
        weekday_index: weekdayIdx,
        is_training_day: trainingDaySet.has(weekdayIdx) || (d.is_training_day ?? false),
        daily_calorie_target: dailyCalorieTarget + burnBonus,
        meals: (d.meals ?? []).map((m: any) => ({
          meal_type: m.meal_type,
          name: m.name,
          total_calories: m.total_calories,
          ingredients: (m.ingredients ?? []).map(enrichIngredient),
        })),
      };
    });

    const nutritionPlan = {
      detected_weeks: 1,
      detected_days_per_week: weekDays.length,
      weeks: [weekDays],
    };

    const avgCalories = Math.round(
      rawDays.reduce((sum, d) =>
        sum + (d.meals ?? []).reduce((s: number, m: any) => s + (m.total_calories ?? 0), 0), 0)
      / rawDays.length
    );

    console.log(`[generate-meal-plan] Done: ${weekDays.length} days, avg ${avgCalories} kcal/day`);

    const responsePayload = {
      nutritionPlan,
      stats: { days: weekDays.length, meals: weekDays.reduce((s, d) => s + d.meals.length, 0), avg_calories_per_day: avgCalories },
    };

    // Write to cache (non-blocking)
    writeCache(cacheKey, responsePayload).catch(() => {});

    return res.status(200).json(responsePayload);
  } catch (err: any) {
    console.error('[generate-meal-plan] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
