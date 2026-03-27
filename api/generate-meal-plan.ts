import { handleCors } from './_shared/cors';
import { verifyAuth, sendAuthError } from './_shared/auth';
import { checkAndIncrementUsage } from './_shared/limits';
import { sanitizeUserInput, sanitizeArray } from './_shared/sanitize';
import { validateBodySize } from './_shared/validate';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// ─── Validation helpers ──────────────────────────────────────
interface ValidatedMeal {
  meal_type: string;
  name: string;
  description: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  ingredients: Array<{
    name: string;
    g: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
}

/** Meal type labels that should NOT be used as dish names */
const MEAL_TYPE_LABELS = new Set([
  'reggeli', 'ebéd', 'ebed', 'vacsora', 'snack', 'tízórai', 'tizorai',
  'uzsonna', 'breakfast', 'lunch', 'dinner',
  'edzés utáni', 'edzes utani', 'mic dejun', 'prânz', 'cină',
]);

function validateAndRepairMeal(meal: any, mealType: string): ValidatedMeal {
  const ingredients = (meal.ingredients ?? []).map((ing: any) => ({
    name: ing.name ?? 'Ismeretlen',
    g: Math.max(1, Number(ing.g ?? ing.quantity_grams ?? 100)),
    calories: Math.max(0, Number(ing.calories ?? 0)),
    protein: Math.max(0, Number(ing.protein ?? 0)),
    carbs: Math.max(0, Number(ing.carbs ?? 0)),
    fat: Math.max(0, Number(ing.fat ?? 0)),
  }));

  const totalCal = Number(meal.total_calories) || ingredients.reduce((s: number, i: any) => s + i.calories, 0) || 300;
  const totalProtein = Number(meal.total_protein) || ingredients.reduce((s: number, i: any) => s + i.protein, 0);
  const totalCarbs = Number(meal.total_carbs) || ingredients.reduce((s: number, i: any) => s + i.carbs, 0);
  const totalFat = Number(meal.total_fat) || ingredients.reduce((s: number, i: any) => s + i.fat, 0);

  // Fix: if the name is just a meal type label, generate a real name from ingredients
  let name = meal.name ?? '';
  if (!name || MEAL_TYPE_LABELS.has(name.toLowerCase().trim())) {
    const ingNames = ingredients.slice(0, 3).map((i: any) => i.name).filter((n: string) => n && n !== 'Ismeretlen');
    if (ingNames.length > 0) {
      // Create a descriptive name from main ingredients
      name = ingNames.length === 1
        ? ingNames[0]
        : ingNames.slice(0, -1).join(', ') + ' és ' + ingNames[ingNames.length - 1];
    } else {
      // Last resort: use a generic but descriptive fallback
      const fallbacks: Record<string, string> = {
        breakfast: 'Reggeli tál',
        lunch: 'Ebéd menü',
        dinner: 'Vacsora tál',
        snack: 'Snack',
      };
      name = fallbacks[mealType] || `${mealType} menü`;
    }
  }

  return {
    meal_type: meal.meal_type ?? mealType,
    name,
    description: meal.description ?? '',
    total_calories: Math.round(totalCal),
    total_protein: Math.round(totalProtein),
    total_carbs: Math.round(totalCarbs),
    total_fat: Math.round(totalFat),
    ingredients,
  };
}

function validateDay(day: any, dayIndex: number, mealTypes: string[], dayNames: string[]): any {
  const meals = mealTypes.map((mt, mi) => {
    const found = (day.meals ?? []).find((m: any) => m.meal_type === mt) ?? (day.meals ?? [])[mi];
    if (!found) return { meal_type: mt, name: '', description: '', total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0, ingredients: [] };
    return validateAndRepairMeal(found, mt);
  });

  return {
    day: dayIndex + 1,
    day_label: day.day_label ?? dayNames[dayIndex % 7],
    is_training_day: day.is_training_day ?? false,
    meals,
  };
}

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
    style: `Magyar és erdélyi recepteket használj valódi gasztronómiai nevekkel. TILOS semmitmondó neveket használni mint "Csirke rizzsel".

KRITIKUS SZABÁLY AZ ÉTELNEVEKHEZ:
- KIZÁRÓLAG valódi, közismert ételneveket használj. SOHA ne találj ki nem létező ételneveket.
- NE kombinálj véletlenszerű szavakat ételnevek létrehozásához. Pl. "Sülthüllő" NEM létező étel.
- Példa reggeli ételek: zabkása gyümölccsel, túrós palacsinta, rántotta pirítóssal, müzli joghurttal, tojásos szendvics, bundás kenyér
- Példa ebéd ételek: gulyásleves, csirkepaprikás galuskával, halászlé, pörkölt nokedlivel, töltött káposzta, rakott krumpli, lecsó, túrós csusza, paradicsomos húsgombóc spagettivel
- Példa vacsora ételek: sült csirkemell salátával, lazac párolt zöldséggel, gomba krémleves, lencsefőzelék, zöldséges rizottó, grillezett pulykamell

ÉTKEZÉSI STRUKTÚRA:
- Reggeli: könnyű, energiadús (zabkása, tojás, joghurt, gyümölcs, toast)
- Ebéd: a nap fő étkezése, tartalmas (leves + főétel VAGY tartalmas egytálétel)
- Vacsora: közepes, könnyen emészthető (sült hús salátával, leves, könnyű tészta)
- Snack: kis kalória (gyümölcs, joghurt, dió, zöldség)`,
  },
  ro: {
    intro: 'Ești un nutriționist și expert culinar în bucătăria română și transilvăneană.',
    style: `Folosește rețete autentice românești cu denumiri gastronomice reale. NU inventa denumiri fictive.

REGULĂ CRITICĂ PENTRU DENUMIRILE PREPARATELOR:
- Folosește NUMAI denumiri de preparate reale, cunoscute.
- NU combina cuvinte aleatorii pentru a crea denumiri de preparate.
- Exemple mic dejun: ovăz cu fructe, omletă cu legume, iaurt cu granola, pâine prăjită cu ou, clătite cu brânză
- Exemple prânz: ciorbă de burtă, sarmale cu mămăligă, papricaș cu găluște, tocană de porc, mici cu muștar, ciorbă de perișoare, pilaf de pui
- Exemple cină: piept de pui la grătar cu salată, somon cu legume la abur, supă cremă de ciuperci, paste cu sos de roșii, salată cu ton

STRUCTURA MESELOR:
- Mic dejun: ușor, energizant (ovăz, ouă, iaurt, fructe)
- Prânz: masa principală a zilei, consistentă (ciorbă + fel principal SAU preparat consistent)
- Cină: moderată, ușor digerabilă (carne la grătar cu salată, supă, paste ușoare)
- Gustare: puține calorii (fructe, iaurt, nuci, legume)`,
  },
  en: {
    intro: 'You are a nutritionist and culinary expert specializing in Central European cuisine.',
    style: `Use authentic recipes with proper gastronomic names. Never use bland names like "Chicken with rice".

CRITICAL RULE FOR DISH NAMES:
- ONLY use real, commonly known dishes. Never invent fictional food names.
- Do NOT combine random words to create food names.
- Example breakfasts: oatmeal with berries, scrambled eggs on toast, Greek yogurt with granola, avocado toast, cottage cheese pancakes
- Example lunches: Hungarian goulash, chicken paprikash with dumplings, stuffed cabbage rolls, beef stew with egg noodles, lentil soup, Greek salad with grilled chicken
- Example dinners: grilled salmon with steamed vegetables, mushroom cream soup, turkey breast with roasted vegetables, pasta bolognese, tuna salad

MEAL STRUCTURE:
- Breakfast: light, energizing (oatmeal, eggs, yogurt, fruit, toast)
- Lunch: main meal of the day, hearty (soup + main OR substantial one-dish meal)
- Dinner: moderate, easily digestible (grilled protein with salad, soup, light pasta)
- Snack: low calorie (fruit, yogurt, nuts, vegetables)`,
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
    case 'if16_8':
    case 'if18_6':
      return { lunch: Math.round(target * 0.55), dinner: target - Math.round(target * 0.55) };
    case '5meals': return { breakfast: Math.round(target * 0.25), snack1: Math.round(target * 0.10), lunch: Math.round(target * 0.30), snack2: Math.round(target * 0.10), dinner: target - Math.round(target * 0.75) };
    case '4meals': return { breakfast: Math.round(target * 0.25), snack: Math.round(target * 0.10), lunch: Math.round(target * 0.35), dinner: target - Math.round(target * 0.70) };
    default:       return { breakfast: Math.round(target * 0.25), lunch: Math.round(target * 0.40), dinner: target - Math.round(target * 0.65) };
  }
}

function getMealTypes(model: string | undefined): string[] {
  switch (model) {
    case '1meal': return ['lunch'];
    case '2meals': return ['breakfast', 'dinner'];
    case 'if16_8':
    case 'if18_6':
      return ['lunch', 'dinner'];
    case '5meals': return ['breakfast', 'snack', 'lunch', 'snack', 'dinner'];
    case '4meals': return ['breakfast', 'snack', 'lunch', 'dinner'];
    default:       return ['breakfast', 'lunch', 'dinner'];
  }
}

// ─── Strip accents for ingredient lookup ──────────────────────
function norm(s: string): string {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// ─── Meal name validation & anti-hallucination ───────────────

/** Words that indicate non-food animals — reject any meal name containing these */
const FORBIDDEN_WORDS = [
  'hüllő', 'kígyó', 'béka', 'rovar', 'bogár', 'pók', 'féreg', 'giliszta',
  'hullő', 'hullo', 'reptile', 'snake', 'frog', 'insect', 'spider', 'worm',
];

/** English-to-Hungarian food word map for translation */
const ENGLISH_TO_HUNGARIAN: Record<string, string> = {
  'oatmeal': 'zabkása', 'buckwheat': 'hajdina', 'grilled': 'grillezett',
  'baked': 'sült', 'roasted': 'sült', 'chicken': 'csirke', 'pork': 'sertés',
  'beef': 'marha', 'salad': 'saláta', 'soup': 'leves', 'rice': 'rizs',
  'lentil': 'lencse', 'egg': 'tojás', 'eggs': 'tojás', 'honey': 'méz',
  'banana': 'banán', 'with': '', 'and': 'és', 'noodles': 'tészta',
  'goulash': 'gulyás', 'pancake': 'palacsinta', 'pancakes': 'palacsinta',
  'yogurt': 'joghurt', 'cottage cheese': 'túró', 'broccoli': 'brokkoli',
  'spinach': 'spenót', 'mushroom': 'gomba', 'mushrooms': 'gomba',
  'pepper': 'paprika', 'tomato': 'paradicsom', 'potato': 'krumpli',
  'potatoes': 'krumpli', 'bread': 'kenyér', 'toast': 'pirítós',
  'smoothie': 'turmix', 'wrap': 'tekercs', 'steak': 'steak',
  'fish': 'hal', 'salmon': 'lazac', 'tuna': 'tonhal', 'turkey': 'pulyka',
  'cheese': 'sajt', 'cream': 'krémes', 'fried': 'sült', 'boiled': 'főtt',
  'steamed': 'párolt', 'vegetables': 'zöldségek', 'vegetable': 'zöldség',
  'onion': 'hagyma', 'garlic': 'fokhagyma', 'butter': 'vaj',
  'olive oil': 'olívaolaj', 'lemon': 'citrom', 'apple': 'alma',
  'berry': 'bogyó', 'berries': 'bogyós gyümölcs', 'walnut': 'dió',
  'almond': 'mandula', 'oat': 'zab', 'oats': 'zabpehely',
  'bowl': 'tál', 'plate': 'tányér', 'stuffed': 'töltött',
};

/** Common English food words — if ALL words in a name match these, it's likely English */
const ENGLISH_FOOD_WORDS = new Set([
  'grilled', 'baked', 'roasted', 'fried', 'boiled', 'steamed', 'sauteed', 'braised',
  'with', 'and', 'on', 'in', 'the', 'a', 'of',
  'chicken', 'pork', 'beef', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp',
  'salad', 'soup', 'stew', 'bowl', 'plate', 'wrap', 'sandwich',
  'rice', 'pasta', 'noodles', 'bread', 'toast', 'oatmeal', 'buckwheat', 'quinoa',
  'egg', 'eggs', 'cheese', 'yogurt', 'cream', 'butter', 'milk',
  'tomato', 'potato', 'onion', 'garlic', 'pepper', 'mushroom', 'mushrooms',
  'broccoli', 'spinach', 'carrot', 'cabbage', 'beans', 'lentil', 'lentils',
  'apple', 'banana', 'berry', 'berries', 'lemon', 'orange',
  'honey', 'sugar', 'salt', 'oil', 'olive',
  'smoothie', 'pancake', 'pancakes', 'steak', 'fillet', 'breast',
  'stuffed', 'vegetable', 'vegetables', 'fresh', 'mixed', 'light', 'hearty',
]);

/**
 * Validate and fix a meal name (and optionally description) to prevent hallucinations.
 * - Rejects names containing forbidden animal words
 * - Translates English meal names to Hungarian when language is "hu"
 */
function validateMealText(text: string, language: string): string {
  if (!text) return text;

  // Check for forbidden words (non-food animals)
  const lower = text.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (lower.includes(word)) {
      // Replace the entire name — it's hallucinated
      return '';
    }
  }

  // If language is Hungarian, check if text is in English and translate
  if (language === 'hu') {
    const words = text.toLowerCase().replace(/[,.\-()]/g, ' ').split(/\s+/).filter(w => w.length > 0);
    const englishWordCount = words.filter(w => ENGLISH_FOOD_WORDS.has(w)).length;

    // If most words are English food words, translate
    if (words.length > 0 && englishWordCount / words.length >= 0.6) {
      // Try to translate word by word
      // First handle multi-word phrases
      let translated = text.toLowerCase();
      const multiWordKeys = Object.keys(ENGLISH_TO_HUNGARIAN)
        .filter(k => k.includes(' '))
        .sort((a, b) => b.length - a.length);
      for (const phrase of multiWordKeys) {
        if (translated.includes(phrase)) {
          translated = translated.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ENGLISH_TO_HUNGARIAN[phrase]);
        }
      }
      // Then single words
      const singleWordKeys = Object.keys(ENGLISH_TO_HUNGARIAN).filter(k => !k.includes(' '));
      for (const word of singleWordKeys) {
        translated = translated.replace(new RegExp(`\\b${word}\\b`, 'gi'), ENGLISH_TO_HUNGARIAN[word]);
      }
      // Clean up: remove empty strings from "with" translation, capitalize first letter
      translated = translated.replace(/\s{2,}/g, ' ').trim();
      translated = translated.charAt(0).toUpperCase() + translated.slice(1);
      return translated;
    }
  }

  return text;
}

/**
 * Apply hallucination validation to all meals in the parsed response.
 * Fixes names and descriptions in-place.
 */
function validateAllMealNames(parsed: { days?: any[] }, language: string): void {
  if (!parsed?.days) return;
  for (const day of parsed.days) {
    if (!day.meals) continue;
    for (const meal of day.meals) {
      if (meal.name) {
        const validated = validateMealText(meal.name, language);
        if (validated === '') {
          // Name was rejected (hallucinated) — build from ingredients
          const ingNames = (meal.ingredients ?? [])
            .slice(0, 3)
            .map((i: any) => i.name)
            .filter((n: string) => n);
          meal.name = ingNames.length > 0
            ? ingNames.slice(0, -1).join(', ') + (ingNames.length > 1 ? ingredientListConjunction(language) : '') + ingNames[ingNames.length - 1]
            : hallucinationFallbackMealName(language);
        } else {
          meal.name = validated;
        }
      }
      if (meal.description) {
        const validatedDesc = validateMealText(meal.description, language);
        if (validatedDesc === '') {
          meal.description = '';
        } else {
          meal.description = validatedDesc;
        }
      }
    }
  }
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

// ─── Fasting helpers (server-side, mirrors FastingCalendarService) ──

type Religion = 'orthodox' | 'catholic' | 'protestant' | 'custom';
type FastingInfo = { isFasting: boolean; restrictions: string[]; reasonKey: string };

function orthodoxEasterDate(year: number): Date {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const julian = new Date(year, month - 1, day);
  julian.setDate(julian.getDate() + 13);
  return julian;
}

function catholicEasterDate(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addD(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function inRange(date: Date, s: Date, e: Date): boolean {
  const dt = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return dt >= new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime()
      && dt <= new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
}
function isoWd(d: Date): number { return (d.getDay() + 6) % 7; }
function sameD(a: Date, b: Date): boolean { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }

function checkFasting(date: Date, religion: Religion, customDays: number[]): FastingInfo {
  const year = date.getFullYear(), wd = isoWd(date);
  const noAnimal = ['meat','dairy','eggs'];
  if (religion === 'orthodox') {
    const easter = orthodoxEasterDate(year);
    if (inRange(date, addD(easter,-48), addD(easter,-1))) return { isFasting:true, restrictions:noAnimal, reasonKey:'greatLent' };
    if (inRange(date, new Date(year,10,15), new Date(year,11,24))) return { isFasting:true, restrictions:noAnimal, reasonKey:'nativityFast' };
    if (inRange(date, new Date(year,7,1), new Date(year,7,14))) return { isFasting:true, restrictions:noAnimal, reasonKey:'dormitionFast' };
    const apostlesStart = addD(addD(easter,57),1), apostlesEnd = new Date(year,5,28);
    if (inRange(date, apostlesStart, apostlesEnd)) return { isFasting:true, restrictions:noAnimal, reasonKey:'apostlesFast' };
    if (wd===2||wd===4) return { isFasting:true, restrictions:noAnimal, reasonKey:'wedFri' };
  } else if (religion === 'catholic') {
    const easter = catholicEasterDate(year);
    const ash = addD(easter,-46);
    const holySaturday = addD(easter,-1);
    if (sameD(date,ash)) return { isFasting:true, restrictions:noAnimal, reasonKey:'ashWednesday' };
    if (sameD(date,addD(easter,-2))) return { isFasting:true, restrictions:noAnimal, reasonKey:'goodFriday' };
    if (inRange(date,ash,holySaturday)) return { isFasting:true, restrictions:noAnimal, reasonKey:'lent' };
    // Advent Fridays
    const dec1 = new Date(year,11,1), dec24 = new Date(year,11,24);
    if (wd===4 && inRange(date,dec1,dec24)) return { isFasting:true, restrictions:['meat'], reasonKey:'adventFriday' };
  } else if (religion === 'custom' || religion === 'protestant') {
    if (customDays.includes(wd)) return { isFasting:true, restrictions:noAnimal, reasonKey:'customDay' };
  }
  return { isFasting:false, restrictions:[], reasonKey:'' };
}

function buildFastingPromptBlock(fastingDays: Map<number, FastingInfo>, dayNames: string[], lang: string): string {
  if (fastingDays.size === 0) return '';
  const labels: Record<string, Record<string, string>> = {
    hu: { meat: 'hús', dairy: 'tejtermékek', eggs: 'tojás' },
    ro: { meat: 'carne', dairy: 'lactate', eggs: 'ouă' },
    en: { meat: 'meat', dairy: 'dairy', eggs: 'eggs' },
  };
  const l = labels[lang] || labels.en;
  const lines: string[] = [];
  for (const [dayIdx, info] of fastingDays) {
    const restricted = info.restrictions.map(r => l[r] || r).join(', ');
    lines.push(`- ${dayNames[dayIdx]}: BÖJTI NAP — tilos: ${restricted}. Csak növényi ételeket készíts.`);
  }
  const header: Record<string, string> = {
    hu: 'VALLÁSI BÖJT — az alábbi napokon speciális étrendi korlátozások érvényesek:',
    ro: 'POST RELIGIOS — în zilele următoare se aplică restricții alimentare speciale:',
    en: 'RELIGIOUS FASTING — the following days have dietary restrictions:',
  };
  return `\n${header[lang] || header.en}\n${lines.join('\n')}\n`;
}

// ─── Handler ──────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  let authUser;
  try {
    authUser = await verifyAuth(req);
  } catch (err: any) {
    return sendAuthError(res, err);
  }

  // Rate limiting (expensive endpoint)
  try {
    await checkAndIncrementUsage(authUser.uid, authUser.isAdmin);
  } catch (err: any) {
    if (err?.status === 429) {
      return res.status(429).json({ error: err.message, resetsAt: err.resetsAt });
    }
    console.error('[generate-meal-plan] Rate limit check failed:', err);
  }

  try {
    validateBodySize(req.body);

    const {
      ingredients = [],
      dailyCalorieTarget = 2000,
      days = 7,
      language = 'hu',
      userProfile,
      mealCount,
      trainingDays = [],
      goal = 'maintain',
      fasting,
    }: {
      ingredients?: Ingredient[];
      dailyCalorieTarget?: number;
      days?: number;
      language?: string;
      userProfile?: UserProfile;
      mealCount?: number;
      trainingDays?: number[];
      goal?: string;
      fasting?: { enabled: boolean; religion: Religion; customDays: number[] };
    } = req.body || {};

    // Re-enabled calorie validation
    const valid = (ingredients as Ingredient[]).filter(i => (i.calories_per_100g ?? 0) > 0);
    if (valid.length === 0) {
      return res.status(400).json({ error: 'No ingredients with valid calorie data provided.' });
    }

    // Re-enabled 40-ingredient cap
    const selected = valid.length > 40
      ? valid.sort(() => Math.random() - 0.5).slice(0, 40)
      : valid;

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

    // Fasting day computation for the 7-day base week
    const fastingMap = new Map<number, FastingInfo>(); // dayIdx (0-6) → info
    if (fasting?.enabled && fasting.religion) {
      const today = new Date();
      // Find next Monday as the start of the generated week
      const todayWd = isoWd(today);
      const startDate = addD(today, -todayWd); // go back to Monday of this week
      for (let i = 0; i < clampedDays; i++) {
        const d = addD(startDate, i);
        const info = checkFasting(d, fasting.religion, fasting.customDays || []);
        if (info.isFasting) fastingMap.set(i, info);
      }
    }
    const fastingBlock = buildFastingPromptBlock(fastingMap, dayNames, lang);

    const prompt = `${userBlock}${intro}
${style}
${carbCycleBlock}${fastingBlock}
ALAPANYAGOK (név, kcal/100g, protein, szénhidrát, zsír):
${ingList}

FELADAT: Generálj ${clampedDays} napos TELJES étrendet. Napok: ${dayLabels}
Napi célkalória: ${dailyCalorieTarget} kcal. Étkezések: ${mealTypes.join(', ')} (${calBlock})

KÖTELEZŐ SZABÁLYOK:
1. CSAK a megadott alapanyagokat használd
2. Minden ételnél KÖTELEZŐ mezők: name, description, meal_type, total_calories, total_protein, total_carbs, total_fat, ingredients[]
3. Minden ingredient-nél KÖTELEZŐ: name, g (grammban), calories, protein, carbs, fat (az adott grammra kiszámolva, NEM 100g-ra)
4. A "description" mező: 1 rövid mondat az ételről (pl. "Krémes zabkása friss áfonyával és ropogós dióval")
5. VALÓDI, vonzó étlapszerű nevek — KIZÁRÓLAG létező ételek. TILOS kitalált neveket generálni.
   A "name" mező SOHA NEM lehet csak a meal_type (pl. "Reggeli", "Ebéd", "Vacsora", "Snack"). Mindig KONKRÉT ételnév legyen (pl. "Zabkása dióval és banánnal", "Csirkepaprikás galuskával", "Grillezett lazac párolt zöldséggel").
   Ha a "name" mező megegyezik a "meal_type" értékkel, az HIBÁS.
6. VÁLTOZATOSSÁG: Ugyanaz az étel NE ismétlődjön a ${clampedDays} napon belül. Minden napnak más reggelije, ebédje, vacsorája legyen.
7. REÁLIS ADAGOK: reggeli 250-450 kcal, ebéd 500-800 kcal, vacsora 400-600 kcal, snack 100-200 kcal. Az adagoknak össze kell adódniuk a napi célkalóriára (±5%).
8. Minden ingredient "g" értéke reális adag legyen (pl. csirkemell 150-200g, rizs 80-120g, zöldség 100-200g, olaj 10-15g)
9. is_training_day értékét állítsd helyesen minden napra
10. Válaszolj KIZÁRÓLAG nyers JSON-nel, semmi más szöveg
11. TILOS kitalált, nem létező ételneveket használni! Csak olyan ételneveket adj, amelyek léteznek a magyar/román/nemzetközi konyhában. TILTOTT szavak ételnevekben: "hüllő", "kígyó", "béka", "rovar", "bogár", "pók", "féreg", "giliszta". Pl. "Sülthüllő" NEM LÉTEZŐ ÉTEL!
12. Ha a nyelv magyar, MINDEN ételnév és leírás KIZÁRÓLAG MAGYARUL legyen. Soha ne használj angol szavakat! Példák: "Buckwheat" helyett "Hajdina", "Oatmeal" helyett "Zabkása", "Grilled pork" helyett "Grillezett sertés", "Chicken breast" helyett "Csirkemell", "Cottage cheese" helyett "Túró".
13. TILOS értelmetlen összetett szavakat gyártani. Minden ételnévnek kereshető, valódi ételnek kell lennie, amit egy magyar/román szakácskönyvben vagy étlapon megtalálsz.

SÉMA (minden mezőt töltsd ki!):
{"days":[{"day":1,"day_label":"Hétfő","is_training_day":false,"meals":[{"meal_type":"breakfast","name":"Zabkása pirított dióval és áfonyával","description":"Krémes zabkása friss áfonyával és ropogós dióval","total_calories":420,"total_protein":14,"total_carbs":58,"total_fat":16,"ingredients":[{"name":"zabpehely","g":80,"calories":300,"protein":10,"carbs":52,"fat":7},{"name":"dió","g":20,"calories":130,"protein":3,"carbs":3,"fat":13},{"name":"áfonya","g":50,"calories":28,"protein":0.4,"carbs":7,"fat":0.2}]}]}]}

Generáld le mind a ${clampedDays} napot TELJESEN, minden mezővel kitöltve:`;

    let parsed: { days?: any[] } | null = null;
    let lastErr = '';

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const msg = await getClient().messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 8192,
          messages: [{ role: 'user', content: prompt }],
        });
        const raw = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
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

    // Anti-hallucination: validate all meal names and descriptions
    validateAllMealNames(parsed, lang);

    // Validate and enrich every day/meal with complete data
    function enrich(ing: any) {
      const found = ingMap.get(norm(ing.name || ''));
      const grams = Math.max(1, Number(ing.g ?? ing.quantity_grams ?? 100));
      // Use AI-provided per-serving values if available, else compute from per-100g data
      const factor = grams / 100;
      return {
        name: ing.name,
        quantity_grams: grams,
        unit: 'g',
        calories: Math.round(Number(ing.calories) || (found ? found.calories_per_100g * factor : 100)),
        protein: Math.round(Number(ing.protein) || (found ? found.protein_per_100g * factor : 5)),
        carbs: Math.round(Number(ing.carbs) || (found ? found.carbs_per_100g * factor : 10)),
        fat: Math.round(Number(ing.fat) || (found ? found.fat_per_100g * factor : 3)),
        estimated_calories_per_100g: found?.calories_per_100g ?? Math.round((Number(ing.calories) || 100) / factor),
        estimated_protein_per_100g: found?.protein_per_100g ?? Math.round((Number(ing.protein) || 5) / factor),
        estimated_carbs_per_100g: found?.carbs_per_100g ?? Math.round((Number(ing.carbs) || 10) / factor),
        estimated_fat_per_100g: found?.fat_per_100g ?? Math.round((Number(ing.fat) || 3) / factor),
      };
    }

    const validatedDays = parsed.days.slice(0, 7).map((d: any, i: number) => {
      const validated = validateDay(d, i, mealTypes, dayNames);
      return {
        day_label: validated.day_label,
        is_training_day: validated.is_training_day,
        meals: validated.meals.map((m: any) => ({
          meal_type: m.meal_type,
          name: m.name,
          description: m.description || '',
          total_calories: m.total_calories,
          total_protein: m.total_protein,
          total_carbs: m.total_carbs,
          total_fat: m.total_fat,
          ingredients: (m.ingredients ?? []).map((rawIng: any) => enrich(rawIng)),
        })),
      };
    });

    const baseWeek = validatedDays;

    // Expand to 30 days (rotate the 7-day pattern)
    const TOTAL_DAYS = 30;
    const trainingDaySet = new Set(trainingDays);
    // Compute fasting for all 30 days based on actual calendar dates
    const today30 = new Date();
    const todayWd30 = isoWd(today30);
    const weekStart30 = addD(today30, -todayWd30); // Monday of current week

    const allDays = Array.from({ length: TOTAL_DAYS }, (_, i) => {
      const base = baseWeek[i % baseWeek.length];
      const weekdayIdx = i % 7; // 0=Mon … 6=Sun
      // Check fasting for the actual calendar date
      let is_fasting_day = false;
      let fasting_reason = '';
      if (fasting?.enabled && fasting.religion) {
        const calDate = addD(weekStart30, i);
        const fi = checkFasting(calDate, fasting.religion, fasting.customDays || []);
        is_fasting_day = fi.isFasting;
        fasting_reason = fi.reasonKey ? `fasting.reason.${fi.reasonKey}` : '';
      }
      return {
        ...base,
        week: Math.floor(i / 7) + 1,
        day: i + 1,
        day_label: dayNames[weekdayIdx],
        is_training_day: trainingDaySet.has(weekdayIdx),
        is_fasting_day,
        fasting_reason,
      };
    });

    const avgCal = Math.round(
      baseWeek.reduce((sum: number, d: any) =>
        sum + d.meals.reduce((s: number, m: any) => s + (m.total_calories ?? 0), 0), 0)
      / baseWeek.length
    );

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
    const isBilling = msg.includes('credit balance') || msg.includes('billing') || msg.includes('Plans & Billing') || msg.includes('billing_error') || err?.status === 400;
    return res.status(err?.status || 500).json({
      error: isBilling ? 'Service temporarily unavailable due to billing. Please try again later.' : 'An error occurred generating your meal plan.',
      billing: isBilling,
    });
  }
}