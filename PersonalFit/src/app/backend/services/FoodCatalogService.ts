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
// BASE INGREDIENT NORMALIZATION PIPELINE
// ═══════════════════════════════════════════════════════════════

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
      // Külön "Gyümölcs" kategória nincs, ezért a zöldség alá soroljuk
      return 'Zoldseg';
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
 */
export async function createFoodsBatch(inputs: CreateFoodInput[]): Promise<{ created: FoodEntity[]; skipped: string[] }> {
  const db = await getDB();
  const existing = await db.getAll<FoodEntity>('foods');
  const existingNames = new Set(existing.map(f => f.name.toLowerCase()));
  const now = nowISO();
  const created: FoodEntity[] = [];
  const skipped: string[] = [];

  for (const input of inputs) {
    // Final gate: reject corrupted names before they ever reach the DB
    if (isCorruptedFoodName(input.name)) {
      console.warn(`[FoodCatalog] createFoodsBatch gate rejected: "${input.name}"`);
      skipped.push(input.name);
      continue;
    }

    if (existingNames.has(input.name.toLowerCase())) {
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
  const isProduction = import.meta.env.PROD;

  try {
    if (isProduction) {
      const response = await fetch('/api/split-food-name', {
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
    }

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('[FoodCatalog] LLM split not available (no VITE_ANTHROPIC_API_KEY)');
      return null;
    }

    const prompt = `
You are a nutrition ingredient normalizer.

TASK:
- Decide if the given Hungarian food name is a single base ingredient or a composite meal.
- A base ingredient is a single atomic food like "tojás", "spenót", "gomba", "paprika", "quinoa", "csirkemell", "zabpehely", "mandulatej".
- A composite meal combines multiple ingredients, often with cooking adjectives like "sült", "grillezett", "párolt", "rántott", or with multiple ingredients listed inline.
- If it is a composite meal, extract the individual base ingredients as short Hungarian ingredient names (singular form, no quantities).

Input: "${name}"

Respond ONLY in strict JSON, no markdown, no explanation:
{"type":"single","ingredients":["<single-ingredient-name>"]}
OR
{"type":"composite","ingredients":["<ingredient-1>","<ingredient-2>", "..."]}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.warn('[FoodCatalog] Anthropic split API error:', response.status);
      return null;
    }

    const data = await response.json();
    let text: string =
      data?.content?.[0]?.type === 'text' ? data.content[0].text : data?.content?.[0]?.text || '';
    let cleaned = String(text || '').trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    const parsed = JSON.parse(cleaned) as SplitResult;
    if (!parsed || !Array.isArray(parsed.ingredients)) return null;
    return parsed;
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
    console.log(
      `[FoodCatalog] Deep cleanup befejezve: ${removed} étel törölve, ${splitCount} composite szétbontva, ${createdFromSplit} új alapanyag létrehozva`
    );
  }

  return removed;
}