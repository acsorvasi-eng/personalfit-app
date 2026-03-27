/**
 * ====================================================================
 * Food Catalog Service
 * ====================================================================
 * CRUD operations for the Food entity.
 *
 * Rules:
 *   - Predefined (system) foods are locked: cannot be edited or deleted.
 *   - AI-extracted and user-uploaded foods can be added dynamically.
 *   - No duplicate food names allowed.
 *   - Macros normalized per 100g.
 *   - Search is indexed via the `search_index` field.
 *   - Favorites stored per-user locally (in the food entity itself).
 */
import { getDB, generateId, nowISO, notifyDBChange } from '../db';
import type { FoodEntity, FoodCategory, FoodSource } from '../models';
import { isCleanFoodName } from './AIParserService';
import { apiBase, authFetch } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════

export async function getAllFoods(): Promise<FoodEntity[]> {
  const db = await getDB();
  return db.getAll<FoodEntity>('foods');
}

export async function getFoodById(id: string): Promise<FoodEntity | undefined> {
  const db = await getDB();
  return db.get<FoodEntity>('foods', id);
}

export async function getFoodsByCategory(category: FoodCategory): Promise<FoodEntity[]> {
  const db = await getDB();
  return db.getAllFromIndex<FoodEntity>('foods', 'by-category', category);
}

export async function getFavorites(): Promise<FoodEntity[]> {
  const all = await getAllFoods();
  return all.filter(f => f.is_favorite);
}

export async function searchFoods(query: string): Promise<FoodEntity[]> {
  if (!query.trim()) return getAllFoods();

  const all = await getAllFoods();
  const normalizedQuery = query.toLowerCase().replace(/[^\w\sáéíóöőúüű]/g, '').trim();
  const terms = normalizedQuery.split(/\s+/);

  return all.filter(food => {
    const idx = food.search_index || food.name.toLowerCase();
    return terms.every(term => idx.includes(term));
  });
}

export async function getFoodCount(): Promise<number> {
  const db = await getDB();
  return db.count('foods');
}

export async function getFoodCountByCategory(): Promise<Record<string, number>> {
  const all = await getAllFoods();
  const counts: Record<string, number> = {};
  for (const food of all) {
    counts[food.category] = (counts[food.category] || 0) + 1;
  }
  return counts;
}

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════

export interface CreateFoodInput {
  name: string;
  description: string;
  category: FoodCategory;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  source: FoodSource;
  benefits?: string[];
  suitable_for?: string[];
}

/**
 * High-level semantic categories used for filtering Foods.
 *
 * These are intentionally nyelvfüggetlen (EN kulcsok), hogy
 * könnyen lehessen őket UI tabokra kötni:
 *   - protein, carbs, vegetable, fruit, fat, dairy, grain
 */
export type FoodSemanticCategory =
  | 'protein'
  | 'carbs'
  | 'vegetable'
  | 'fruit'
  | 'fat'
  | 'dairy'
  | 'grain';

// Cooking verb prefixes used for composite detection
const COOKING_VERB_PREFIXES = [
  'sült',
  'sult',
  'grillezett',
  'párolt',
  'parolt',
  'rántott',
  'rantott',
];

// ═══════════════════════════════════════════════════════════════
// HUNGARIAN COMPOUND DISH SPLITTING
// ═══════════════════════════════════════════════════════════════

/** Phrases that are a single ingredient (do not split). */
const SINGLE_INGREDIENT_PHRASES = new Set([
  'édes burgonya', 'édesburgonya', 'edes burgonya', 'edesburgonya',
]);

/** Hungarian adjective forms → base ingredient name (singular). */
const ADJECTIVE_TO_BASE: Record<string, string> = {
  petrezsejmes: 'petrezselyem', petrezselymes: 'petrezselyem',
  brokkolis: 'brokkoli',
  gombás: 'gomba', gombas: 'gomba',
  mákos: 'mák', makos: 'mák',
  karfiolos: 'karfiol',
  spenótos: 'spenót', spenotos: 'spenót',
  túrós: 'túró', turos: 'túró',
};

/**
 * Split Hungarian compound dish names into base ingredients.
 * Rule: if the name contains a known vegetable/ingredient as prefix or suffix, split it.
 * Otherwise return the name as a single ingredient.
 *
 * Examples:
 * - "Petrezsejmes krumpli" → ["krumpli", "petrezselyem"]
 * - "Édes burgonya" → ["édes burgonya"]
 * - "Mákos laska steviával" → ["tészta", "mák", "stevia"]
 * - "Brokkolis spagetti" → ["spagetti", "brokkoli"]
 * - "Gombás rántotta" → ["tojás", "gomba"]
 * - "Lencsefőzelék" → ["lencse"]
 * - "Karfiolpüré" → ["karfiol"]
 */
export function splitHungarianCompoundDish(raw: string): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();

  // Single-ingredient phrases: keep as one
  if (SINGLE_INGREDIENT_PHRASES.has(lower)) {
    return [trimmed];
  }

  const out: string[] = [];

  // Instrumental "-val/-vel" at end: e.g. "mákos laska steviával" → add "stevia"
  const instrumentalMatch = lower.match(/\s+([a-záéíóöőúüű]+?)(val|vel|sal|sel|szal|szel|zzel)\s*$/i);
  if (instrumentalMatch) {
    const stem = instrumentalMatch[1];
    const display = (stem === 'steviá' || stem === 'stevia') ? 'stevia' : (stem.charAt(0).toUpperCase() + stem.slice(1));
    if (display.length >= 2) out.push(display);
  }
  const rest = instrumentalMatch ? lower.slice(0, lower.length - (instrumentalMatch[0].length)).trim() : lower;

  // Compound word (no space): Xfőzelék → [X], Xpüré → [X]
  const fozelekMatch = rest.match(/^([a-záéíóöőúüű]+)főzelék$/i) || rest.match(/^([a-záéíóöőúüű]+)fozelek$/i);
  if (fozelekMatch) {
    const base = fozelekMatch[1];
    if (base.length >= 2) {
      out.push(base.charAt(0).toUpperCase() + base.slice(1));
      return out.length ? out.reverse() : [trimmed];
    }
  }
  const pureMatch = rest.match(/^([a-záéíóöőúüű]+)püré$/i) || rest.match(/^([a-záéíóöőúüű]+)pure$/i);
  if (pureMatch) {
    const base = pureMatch[1];
    if (base.length >= 2) {
      out.push(base.charAt(0).toUpperCase() + base.slice(1));
      return out.length ? out.reverse() : [trimmed];
    }
  }

  // "X rántotta" / "X rantotta" → tojás + modifier
  const rantottaMatch = rest.match(/^(.+?)\s+rántotta$/i) || rest.match(/^(.+?)\s+rantotta$/i);
  if (rantottaMatch) {
    const modifier = rantottaMatch[1].trim();
    const baseIng = ADJECTIVE_TO_BASE[modifier.toLowerCase()] ?? modifier;
    out.push('tojás');
    out.push(baseIng.charAt(0).toUpperCase() + baseIng.slice(1));
    return out.length ? out.reverse() : [trimmed];
  }

  // "X spagetti" / "X tészta" / "X laska" → tészta + modifier
  const pastaMatch = rest.match(/^(.+?)\s+(spagetti|tészta|teszta|laska)\s*$/i);
  if (pastaMatch) {
    const modifier = pastaMatch[1].trim();
    const baseIng = ADJECTIVE_TO_BASE[modifier.toLowerCase()] ?? modifier;
    out.push('tészta');
    out.push(baseIng.charAt(0).toUpperCase() + baseIng.slice(1));
    return out.length ? out.reverse() : [trimmed];
  }

  // "X Y" where X is known adjective (petrezsejmes krumpli, brokkolis spagetti)
  const words = rest.split(/\s+/);
  if (words.length >= 2) {
    const first = words[0];
    const baseFromAdj = ADJECTIVE_TO_BASE[first];
    if (baseFromAdj) {
      const second = words.slice(1).join(' ');
      out.push(second.charAt(0).toUpperCase() + second.slice(1));
      out.push(baseFromAdj.charAt(0).toUpperCase() + baseFromAdj.slice(1));
      return out.length ? out.reverse() : [trimmed];
    }
  }

  // No compound pattern matched: keep as single ingredient (ignore instrumental-only extraction)
  return [trimmed];
}

// ═══════════════════════════════════════════════════════════════
// BASE INGREDIENT NORMALIZATION PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Hungarian ingredient synonym normalization.
 * Maps common variant names from PDFs to canonical single-ingredient names.
 */
const INGREDIENT_SYNONYMS: Record<string, string> = {
  // Fehérje por → fehérjepor
  'fehérje por': 'fehérjepor',
  'feherje por': 'fehérjepor',
  // Tehéntúró / Fogarasi túró → túró
  'tehéntúró': 'túró',
  'tehenturo': 'túró',
  'fogarasi túró': 'túró',
  'fogarasi turo': 'túró',
  // Zöldség saláta → saláta
  'zöldség saláta': 'saláta',
  'zoldseg salata': 'saláta',
  // Angol "salad" → saláta
  'salad': 'saláta',
  // Tejföl (keep canonical with accents)
  'tejföl': 'tejföl',
  'tejfol': 'tejföl',
  // Kefir (already base form, but kept for completeness)
  'kefir': 'kefir',
  // Juhsajt
  'juhsajt': 'juhsajt',
  // Tökmagolaj
  'tökmagolaj': 'tökmagolaj',
  'tokmagolaj': 'tökmagolaj',
  // Pumpkin seed variants → tökmag
  'pumpkin seed': 'tökmag',
  'pumpkin seed(hántott': 'tökmag',
};

/**
 * Step 1 – Split a raw ingredient/meal string into candidate base ingredients.
 *
 * This is a conservative splitter: it handles obvious textual connectors
 * like "+", ",", ";", "és/with", but it never tries to be too clever.
 *
 * If the input is already a single atomic ingredient (e.g. "pulykamell"),
 * this function MUST return exactly one element with the original text.
 */
export function parseBaseIngredients(raw: string): string[] {
  if (!raw) return [];

  let text = String(raw).trim();
  if (!text) return [];

  // Normalize bullets and obvious textual connectors to commas
  text = text
    .replace(/•/g, ',')
    .replace(/\s*\+\s*/g, ',')               // "a + b"
    .replace(/\s+és\s+/gi, ',')              // "a és b"
    .replace(/\s+es\s+/gi, ',')              // common OCR variant
    .replace(/\s+with\s+/gi, ',');           // "a with b"

  // Split on commas / semicolons / slashes
  const parts = text
    .split(/[,;/]/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (parts.length === 0) {
    return [];
  }

  return parts;
}

/**
 * Step 2 – Normalize a single candidate ingredient name.
 *
 * - lowercases
 * - removes obvious cooking adjectives (grillezett, párolt, sült, rántott, főtt)
 * - strips common Hungarian case endings like "-val/-vel/-sal/-sel"
 * - collapses whitespace
 * - returns capitalized display name
 */
export function normalizeIngredientName(raw: string): string {
  if (!raw) return '';

  let n = String(raw).toLowerCase().trim();
  if (!n) return '';

  // Strip leading quantity (e.g. "3 tojás" -> "tojás") so isCleanFoodName and DB pipeline accept it
  n = n.replace(/^\d+\s+/, '').trim();
  if (!n) return '';

  // Remove leading/trailing punctuation
  n = n.replace(/^[-•–—:.,;()\[\]]+\s*/, '').replace(/\s*[-•–—:.,;()\[\]]+$/, '');

  const COOKING_VERBS = [
    'grillezett',
    'párolt',
    'parolt',
    'sült',
    'sult',
    'rántott',
    'rantott',
    'főtt',
    'fott',
  ];

  // Drop cooking verbs when they appear at the start
  for (const verb of COOKING_VERBS) {
    n = n.replace(new RegExp(`^${verb}\\s+`, 'i'), '');
  }

  // Also drop cooking verbs that appear in the middle ("brokkoli párolt")
  for (const verb of COOKING_VERBS) {
    n = n.replace(new RegExp(`\\b${verb}\\s+`, 'gi'), '');
  }

  // Strip common Hungarian instrumental endings: "-val/-vel/-sal/-sel/-szal/-szel/-zzel"
  n = n.replace(
    /\b([a-záéíóöőúüű]+?)(val|vel|sal|sel|szal|szel|zzel)\b/gi,
    '$1'
  );

  // Collapse extra whitespace
  n = n.replace(/\s+/g, ' ').trim();
  if (!n) return '';

  // Apply synonym normalization if we have a known mapping
  const synonym = INGREDIENT_SYNONYMS[n];
  if (synonym) {
    n = synonym;
  }

  // Capitalize first letter for display/storage
  return n.charAt(0).toUpperCase() + n.slice(1);
}

/**
 * Step 3 – Validate that a normalized name represents EXACTLY ONE base ingredient
 * and not a whole meal description.
 *
 * Rules:
 * - reject cooking verbs that survived normalization
 * - reject connectors (és, with, rizzsel, salátával, -val/-vel patterns)
 * - reject clearly multi-food phrases (very naive token count heuristic)
 */
export function isSingleBaseIngredientName(name: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase();

  // Hard reject: cooking verbs
  const COOKING_VERBS = ['grillezett', 'párolt', 'parolt', 'sült', 'sult', 'rántott', 'rantott', 'főtt', 'fott'];
  if (COOKING_VERBS.some(v => n.includes(v))) return false;

  // Hard reject: explicit composite-meal keywords from requirements
  // e.g. tojásrántotta, zabkása, brokkolis csirke, csirkesaláta
  if (/(rántotta|rantotta|omlett|zabkása|zabkasa)/.test(n)) return false;
  if (/(brokkolis\s+csirke|csirkesaláta|csirkesalata)/.test(n)) return false;

  // Hard reject: textual connectors indicating combinations
  const CONNECTORS = [
    ' és ',
    ' es ',
    ' with ',
    ' rizzsel',
    ' rizzel',
    ' salátával',
    ' salataval',
  ];
  if (CONNECTORS.some(c => n.includes(c.trim()) || n.includes(c))) return false;

  // Hard reject: remaining "-val/-vel" instrumental forms that look like "x-szel"
  if (/\b[a-záéíóöőúüű]+(val|vel|szel|szal|zzel)\b/.test(n)) return false;

  // Naive multi-food heuristic: more than 3 words is usually a meal, not an ingredient
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length > 3) return false;

  return true;
}

/**
 * Map a semantic category to the existing FoodCategory enum
 * used in the DB (Hungarian domain categories).
 */
export function semanticCategoryToFoodCategory(cat: FoodSemanticCategory): FoodCategory {
  switch (cat) {
    case 'protein':
      return 'Feherje';
    case 'carbs':
      return 'Komplex_szenhidrat';
    case 'vegetable':
      return 'Zoldseg';
    case 'fruit':
      return 'Gyumolcs';
    case 'fat':
      return 'Egeszseges_zsir';
    case 'dairy':
      return 'Tejtermek';
    case 'grain':
      // Gabonák / teljes értékű szénhidrátok
      return 'Komplex_szenhidrat';
    default:
      return 'Feherje';
  }
}

/**
 * Heurisztikus kategorizálás élelmiszer név alapján.
 *
 * Cél: egyetlen alapanyag esetén eldönteni, hogy
 * protein / carbs / vegetable / fruit / fat / dairy / grain közül melyik.
 *
 * Ez a függvény nyugodtan bővíthető új kulcsszavakkal.
 */
export function inferSemanticCategoryFromName(name: string): FoodSemanticCategory {
  const n = name.toLowerCase();

  // Gyümölcsök
  const fruitKeywords = [
    'alma', 'banán', 'banan', 'narancs', 'citrom', 'lime', 'gránátalma', 'granatalma',
    'eper', 'szeder', 'áfonya', 'afonya', 'ribizli', 'málna', 'malna', 'gyümölcs', 'gyumolcs',
  ];
  if (fruitKeywords.some(k => n.includes(k))) return 'fruit';

  // Zöldségek
  const vegKeywords = [
    'saláta', 'salata', 'uborka', 'paradicsom', 'paprika', 'brokkoli', 'karfiol',
    'cékla', 'cekla', 'répa', 'repa', 'sárgarépa', 'sargarepa', 'cukkini', 'zöldség', 'zoldseg',
    'spenót', 'spenot', 'kelbimbó', 'kel', 'padlizsán', 'padlizsan', 'hagyma', 'fokhagyma',
    'petrezselyem', 'petrezelyem',
  ];
  if (vegKeywords.some(k => n.includes(k))) return 'vegetable';

  // Tejtermékek
  const dairyKeywords = [
    'tej', 'joghurt', 'kefir', 'sajt', 'túró', 'turo', 'mozzarella', 'parmezán', 'parmezan',
    'cottage', 'kasein', 'tejsavó', 'fehérjeshake', 'proteinshake',
  ];
  if (dairyKeywords.some(k => n.includes(k))) return 'dairy';

  // Zsiradékok / olajok / magvak
  const fatKeywords = [
    'olaj', 'olívaolaj', 'olivaolaj', 'vaj', 'margarin', 'zsír', 'zsir',
    'dió', 'dio', 'mogyoró', 'mogyoro', 'mandula', 'kesudió', 'kesudio', 'pekándió', 'pekandio',
    'mag', 'lenmag', 'chia', 'napraforgómag', 'napraforgomag',
  ];
  if (fatKeywords.some(k => n.includes(k))) return 'fat';

  // Gabonák / grain – zab, zabpehely, kenyér, tészta, kuszkusz, bulgur stb.
  const grainKeywords = [
    'zab', 'zabpehely', 'zabkása', 'zabkasa', 'kenyér', 'kenyer', 'tészta', 'teszta',
    'bulgur', 'kuszkusz', 'keksz', 'müzli', 'muzli', 'granola',
  ];
  if (grainKeywords.some(k => n.includes(k))) return 'grain';

  // Szénhidrát – rizs, burgonya, krumpli, köret
  const carbKeywords = [
    'rizs', 'barna rizs', 'jázmin rizs', 'jazmin rizs',
    'burgonya', 'krumpli', 'édesburgonya', 'edesburgonya',
    'rizottó', 'rizotto', 'gnocchi', 'nudli', 'galuska',
  ];
  if (carbKeywords.some(k => n.includes(k))) return 'carbs';

  // Fehérjék – húsok, halak, tojás, hüvelyesek, tofu stb.
  const proteinKeywords = [
    'csirkemell', 'csirke', 'pulykamell', 'pulyka', 'pulykacomb',
    'marha', 'sertés', 'sertes', 'karaj', 'comb', 'hús', 'hus',
    'hal', 'lazac', 'tonhal', 'tőkehal', 'tokéhal', 'ponto', 'pisztráng', 'pisztrang',
    'tojás', 'tojas', 'rántotta', 'rantotta', 'omlett', 'sonka', 'kolbász', 'kolbasz',
    'csicseriborsó', 'csicseriborso', 'lencse', 'bab', 'tofu', 'tempeh',
  ];
  if (proteinKeywords.some(k => n.includes(k))) return 'protein';

  // Alapértelmezés: fehérje (jobb egy konzervatív default, mint ismeretlen)
  return 'protein';
}

export async function createFood(input: CreateFoodInput): Promise<FoodEntity> {
  const existing = await getAllFoods();
  const duplicate = existing.find(
    f => f.name.toLowerCase() === input.name.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Duplikált élelmiszer név: "${input.name}" már létezik (ID: ${duplicate.id})`);
  }

  const db = await getDB();
  const now = nowISO();
  const entity: FoodEntity = {
    id: generateId(),
    name: input.name,
    description: input.description,
    category: input.category,
    calories_per_100g: input.calories_per_100g,
    protein_per_100g: input.protein_per_100g,
    carbs_per_100g: input.carbs_per_100g,
    fat_per_100g: input.fat_per_100g,
    source: input.source,
    is_favorite: false,
    benefits: input.benefits || [],
    suitable_for: input.suitable_for || [],
    is_system_locked: false,
    search_index: `${input.name} ${input.description}`.toLowerCase().replace(/[^\w\sáéíóöőúüű]/g, '').trim(),
    created_at: now,
    updated_at: now,
  };

  await db.put('foods', entity);
  notifyDBChange({ store: 'foods', action: 'put', key: entity.id });
  return entity;
}

/**
 * Batch create foods (for AI extraction results).
 * Skips duplicates silently.
 * v4.1: Final gate — rejects corrupted names before DB write.
 *
 * @param upsertSource — when true, existing foods with the same name get their
 *   source updated to match the input. Use from the wizard so wizard-selected
 *   foods that already exist in the DB still get tagged as 'user_uploaded'.
 */
/** Remove accents and lowercase — used for fuzzy duplicate matching */
function normalizeFoodName(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export async function createFoodsBatch(
  inputs: CreateFoodInput[],
  options?: { upsertSource?: boolean; upsertNutrition?: boolean }
): Promise<{ created: FoodEntity[]; skipped: string[] }> {
  const db = await getDB();
  const existing = await db.getAll<FoodEntity>('foods');
  // Index by both exact lowercase name AND accent-stripped form for fuzzy matching
  const existingByName = new Map(existing.map(f => [f.name.toLowerCase(), f]));
  const existingByNorm = new Map(existing.map(f => [normalizeFoodName(f.name), f]));
  const existingNames = new Set(existingByName.keys());
  const now = nowISO();
  const created: FoodEntity[] = [];
  const skipped: string[] = [];

  for (const input of inputs) {
    const isUserUploaded = input.source === 'user_uploaded';

    // Final gate: reject corrupted names before they ever reach the DB
    // For user-uploaded foods we trust the chip pipeline and skip this
    // aggressive corruption filter so ALL chips can be saved.
    if (!isUserUploaded && isCorruptedFoodName(input.name)) {
      console.warn(`[FoodCatalog] createFoodsBatch gate rejected: "${input.name}" (source: ${input.source})`);
      skipped.push(input.name);
      continue;
    }

    const inputNorm = normalizeFoodName(input.name);
    const isExisting = existingNames.has(input.name.toLowerCase()) || existingByNorm.has(inputNorm);
    if (isExisting) {
      const existingFood = existingByName.get(input.name.toLowerCase()) ?? existingByNorm.get(inputNorm)!;
      let needsUpdate = false;
      let patch: Partial<FoodEntity> = {};

      // upsertSource: sync source field
      if (options?.upsertSource && existingFood.source !== input.source) {
        patch.source = input.source;
        needsUpdate = true;
      }
      // upsertNutrition: overwrite 0-value nutrition with real values
      if (options?.upsertNutrition && (existingFood.calories_per_100g ?? 0) === 0 && (input.calories_per_100g ?? 0) > 0) {
        patch.calories_per_100g = input.calories_per_100g;
        patch.protein_per_100g  = input.protein_per_100g;
        patch.carbs_per_100g    = input.carbs_per_100g;
        patch.fat_per_100g      = input.fat_per_100g;
        patch.category          = input.category;
        needsUpdate = true;
      }
      if (needsUpdate) {
        const updated: FoodEntity = { ...existingFood, ...patch, updated_at: now };
        await db.put('foods', updated);
        existingByName.set(input.name.toLowerCase(), updated);
      } else {
      }
      skipped.push(input.name);
      continue;
    }

    const entity: FoodEntity = {
      id: generateId(),
      name: input.name,
      description: input.description,
      category: input.category,
      calories_per_100g: input.calories_per_100g,
      protein_per_100g: input.protein_per_100g,
      carbs_per_100g: input.carbs_per_100g,
      fat_per_100g: input.fat_per_100g,
      source: input.source,
      is_favorite: false,
      benefits: input.benefits || [],
      suitable_for: input.suitable_for || [],
      is_system_locked: false,
      search_index: `${input.name} ${input.description}`.toLowerCase().replace(/[^\w\sáéíóöőúüű]/g, '').trim(),
      created_at: now,
      updated_at: now,
    };

    await db.put('foods', entity);
    existingNames.add(input.name.toLowerCase());
    created.push(entity);
  }

  if (created.length > 0) {
    notifyDBChange({ store: 'foods', action: 'put' });
  }

  return { created, skipped };
}

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════

export async function updateFood(id: string, updates: Partial<CreateFoodInput>): Promise<FoodEntity> {
  const db = await getDB();
  const existing = await db.get<FoodEntity>('foods', id);
  if (!existing) throw new Error(`Élelmiszer nem található: ${id}`);
  if (existing.is_system_locked) throw new Error(`Rendszer élelmiszer nem módosítható: ${existing.name}`);

  if (updates.name && updates.name.toLowerCase() !== existing.name.toLowerCase()) {
    const all = await db.getAll<FoodEntity>('foods');
    const dup = all.find(f => f.id !== id && f.name.toLowerCase() === updates.name!.toLowerCase());
    if (dup) throw new Error(`Duplikált élelmiszer név: "${updates.name}"`);
  }

  const updated: FoodEntity = {
    ...existing,
    ...updates,
    search_index: `${updates.name || existing.name} ${updates.description || existing.description}`
      .toLowerCase().replace(/[^\w\sáéíóöőúüű]/g, '').trim(),
    updated_at: nowISO(),
  };

  await db.put('foods', updated);
  notifyDBChange({ store: 'foods', action: 'put', key: id });
  return updated;
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const db = await getDB();
  const food = await db.get<FoodEntity>('foods', id);
  if (!food) throw new Error(`Élelmiszer nem található: ${id}`);

  food.is_favorite = !food.is_favorite;
  food.updated_at = nowISO();
  await db.put('foods', food);
  notifyDBChange({ store: 'foods', action: 'put', key: id });
  return food.is_favorite;
}

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════

export async function deleteFood(id: string): Promise<void> {
  const db = await getDB();
  const food = await db.get<FoodEntity>('foods', id);
  if (!food) throw new Error(`Élelmiszer nem található: ${id}`);
  if (food.is_system_locked) throw new Error(`Rendszer élelmiszer nem törölhető: ${food.name}`);

  await db.delete('foods', id);
  notifyDBChange({ store: 'foods', action: 'delete', key: id });
}

// ═══════════════════════════════════════════════════════════════
// DATA HYGIENE UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Szigorított ellenőrzés: korrupt / zajos élelmiszer név detektálása.
 *
 * v4.1: Cirill/görög/stb. Unicode blokkok azonnali elutasítás,
 * PDF token minták, hex stringek, 70% betűarány, max 5% szimbólum,
 * minimum 2 különböző betű.
 */
function isCorruptedFoodName(name: string): boolean {
  if (!name) return true;

  // Összefoglaló sorok (kcal, átlag kalória stb.) mindig korruptak
  if (/^\d+\s*kcal/i.test(name)) return true;
  if (/extra\s+valtozatossag|átlag\s+kal[oó]ria|average\s+calories/i.test(name)) return true;

  // Foods katalógusban csak TISZTA, egyetlen alapanyag lehet.
  // Ha a név több összetevőre utal vagy étel-leírás, tekintsük korruptnak.
  if (!isSingleBaseIngredientName(name)) return true;

  // A parser központi validátora: ha ez szerint nem "tiszta" élelmiszer név,
  // akkor a katalógusban is korruptnak tekintjük.
  if (!isCleanFoodName(name)) return true;

  return false;
}

type SplitResult = {
  type: 'single' | 'composite';
  ingredients: string[];
};

function isSuspiciousCompositeCandidate(name: string): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  if (!n) return false;

  const words = n.split(/\s+/).filter(Boolean);

  // More than 2 words → high chance of composite meal
  if (words.length > 2) return true;

  // Starts with cooking adjective like "sült", "grillezett", "párolt", "rántott"
  if (COOKING_VERB_PREFIXES.some(v => n.startsWith(`${v} `))) return true;

  return false;
}

async function splitFoodNameWithLLM(name: string): Promise<SplitResult | null> {
  // Always use the server-side proxy — API key stays server-only
  try {
    const response = await authFetch(`${apiBase}/api/split-food-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      console.warn('[FoodCatalog] split-food-name proxy error:', response.status);
      return null;
    }
    const data = (await response.json()) as SplitResult;
    if (!data || !Array.isArray(data.ingredients)) return null;
    return data;
  } catch (err) {
    console.warn('[FoodCatalog] LLM split error for name:', name, err);
    return null;
  }
}

/**
 * Deep cleanup rutin: törli az összes nem system-locked ételt
 * amelyek neve korrupt / zajos.
 *
 * v4.1: Nem csak ai_generated source-t néz — minden nem-system ételt
 * ellenőriz, mivel a meglévő ~483 rekord vegyes source-szal kerülhetett be.
 *
 * Visszatér: hány rekordot törölt.
 */

/**
 * One-time migration: re-categorise foods that were saved as 'Zoldseg' but
 * are actually fruits (based on Hungarian name heuristics).
 * Safe to call multiple times — only touches foods with category === 'Zoldseg'.
 */
export async function migrateFruitCategories(): Promise<number> {
  const db = await getDB();
  const all = await db.getAll<FoodEntity>('foods');
  let fixed = 0;
  for (const food of all) {
    if (food.category === 'Zoldseg') {
      const semantic = inferSemanticCategoryFromName(food.name);
      if (semantic === 'fruit') {
        await db.put('foods', { ...food, category: 'Gyumolcs', updated_at: nowISO() });
        notifyDBChange({ store: 'foods', action: 'put', key: food.id });
        fixed++;
      }
    }
  }
  if (fixed > 0) {
  }
  return fixed;
}

export async function cleanupCorruptedAIFoods(): Promise<number> {
  const db = await getDB();
  const all = await db.getAll<FoodEntity>('foods');
  let removed = 0;
  let splitCount = 0;
  let createdFromSplit = 0;

  const existingByName = new Map<string, FoodEntity>();
  for (const food of all) {
    existingByName.set(food.name.toLowerCase(), food);
  }

  const suspicious: FoodEntity[] = [];

  for (const food of all) {
    // System locked ételeket soha ne töröljük
    if (food.is_system_locked) continue;

    // Obvious garbage / non-ingredient names → delete outright
    if (isCorruptedFoodName(food.name)) {
      console.warn(`[FoodCatalog] Deep cleanup törölte: "${food.name}" (source: ${food.source})`);
      await db.delete('foods', food.id);
      removed++;
      continue;
    }

    // Candidates for AI-assisted composite splitting
    if (isSuspiciousCompositeCandidate(food.name)) {
      suspicious.push(food);
    }
  }

  // AI-assisted splitting for suspicious composite candidates
  for (const food of suspicious) {
    const split = await splitFoodNameWithLLM(food.name);
    if (!split || split.type === 'single' || !split.ingredients.length) {
      continue;
    }

    const atomicNames = new Set<string>();

    for (const rawIng of split.ingredients) {
      const bases = parseBaseIngredients(rawIng);
      for (const base of bases) {
        const normalized = normalizeIngredientName(base);
        if (!normalized) continue;

        const lower = normalized.toLowerCase();
        if (!isCleanFoodName(normalized)) continue;
        if (!isSingleBaseIngredientName(normalized)) continue;

        atomicNames.add(lower);
      }
    }

    if (atomicNames.size === 0) {
      continue;
    }

    // For each atomic ingredient name, ensure a FoodEntity exists
    for (const lower of atomicNames) {
      const displayName = lower.charAt(0).toUpperCase() + lower.slice(1);
      if (existingByName.has(lower)) {
        continue;
      }

      const semanticCat = inferSemanticCategoryFromName(displayName);
      const category = semanticCategoryToFoodCategory(semanticCat);

      // Very rough default macros per 100g by category
      let calories_per_100g = 100;
      let protein_per_100g = 5;
      let carbs_per_100g = 15;
      let fat_per_100g = 3;

      if (category === 'Feherje') {
        calories_per_100g = 120;
        protein_per_100g = 20;
        carbs_per_100g = 0;
        fat_per_100g = 5;
      } else if (category === 'Komplex_szenhidrat') {
        calories_per_100g = 130;
        protein_per_100g = 4;
        carbs_per_100g = 28;
        fat_per_100g = 1;
      } else if (category === 'Zoldseg') {
        calories_per_100g = 25;
        protein_per_100g = 2;
        carbs_per_100g = 4;
        fat_per_100g = 0.3;
      } else if (category === 'Egeszseges_zsir') {
        calories_per_100g = 884;
        protein_per_100g = 0;
        carbs_per_100g = 0;
        fat_per_100g = 100;
      } else if (category === 'Tejtermek') {
        calories_per_100g = 60;
        protein_per_100g = 5;
        carbs_per_100g = 5;
        fat_per_100g = 3;
      }

      const now = nowISO();
      const entity: FoodEntity = {
        id: generateId(),
        name: displayName,
        description: 'AI által composite ételből szétbontott alapanyag',
        category,
        calories_per_100g,
        protein_per_100g,
        carbs_per_100g,
        fat_per_100g,
        source: food.source,
        is_favorite: false,
        benefits: [],
        suitable_for: [],
        is_system_locked: false,
        search_index: displayName.toLowerCase(),
        created_at: now,
        updated_at: now,
      };

      await db.put('foods', entity);
      existingByName.set(lower, entity);
      createdFromSplit++;
    }

    // Remove the original composite food
    await db.delete('foods', food.id);
    removed++;
    splitCount++;
    console.warn(
      `[FoodCatalog] Composite food "${food.name}" szétbontva ${atomicNames.size} alapanyagra és törölve az eredeti rekord`
    );
  }

  if (removed > 0 || createdFromSplit > 0) {
    notifyDBChange({ store: 'foods', action: 'delete' });
  }

  return removed;
}