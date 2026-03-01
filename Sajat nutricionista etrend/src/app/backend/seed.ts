/**
 * ====================================================================
 * Database Seeder
 * ====================================================================
 * Seeds the IndexedDB with the 68 predefined system-locked foods
 * from the existing foodDatabase.
 *
 * Idempotent: checks if foods already exist before seeding.
 */

import { getDB, generateId, nowISO } from './db';
import type { FoodEntity, FoodCategory } from './models';
import { foodDatabase } from '../data/mealData';

// ═══════════════════════════════════════════════════════════════
// CATEGORY MAPPING
// ═══════════════════════════════════════════════════════════════

/** Map from Hungarian display category → FoodCategory enum */
const CATEGORY_MAP: Record<string, FoodCategory> = {
  'Fehérje': 'Feherje',
  'Tejtermék': 'Tejtermek',
  'Komplex szénhidrát': 'Komplex_szenhidrat',
  'Egészséges zsír': 'Egeszseges_zsir',
  'Hüvelyes': 'Huvelyes',
  'Mag': 'Mag',
  'Zöldség': 'Zoldseg',
  'Tojás': 'Tojas',
};

function mapCategory(displayCategory: string): FoodCategory {
  return CATEGORY_MAP[displayCategory] || 'Feherje';
}

function buildSearchIndex(name: string, description: string): string {
  return `${name} ${description}`
    .toLowerCase()
    .replace(/[^\w\sáéíóöőúüű]/g, '')
    .trim();
}

// ═══════════════════════════════════════════════════════════════
// SEED FOODS
// ═══════════════════════════════════════════════════════════════

export async function seedFoods(): Promise<{ seeded: number; skipped: number }> {
  const db = await getDB();
  let seeded = 0;
  let skipped = 0;

  // Check existing count
  const existingCount = await db.count('foods');
  if (existingCount >= foodDatabase.length) {
    return { seeded: 0, skipped: foodDatabase.length };
  }

  const now = nowISO();

  for (const food of foodDatabase) {
    const existingId = `system-${food.id}`;
    const existing = await db.get('foods', existingId);
    if (existing) {
      skipped++;
      continue;
    }

    const entity: FoodEntity = {
      id: existingId,
      name: food.name,
      description: food.description,
      category: mapCategory(food.category),
      calories_per_100g: parseInt(food.calories) || 0,
      protein_per_100g: food.protein,
      carbs_per_100g: food.carbs,
      fat_per_100g: food.fat,
      source: 'system',
      is_favorite: false,
      benefits: food.benefits || [],
      suitable_for: food.suitableFor || [],
      is_system_locked: true,
      search_index: buildSearchIndex(food.name, food.description),
      created_at: now,
      updated_at: now,
    };

    await db.put('foods', entity);
    seeded++;
  }

  console.log(`[Seed] Foods: ${seeded} seeded, ${skipped} skipped`);
  return { seeded, skipped };
}

// ═══════════════════════════════════════════════════════════════
// SEED ALL
// ═══════════════════════════════════════════════════════════════

export async function seedDatabase(): Promise<void> {
  console.log('[Seed] Starting database seed...');
  const foodResult = await seedFoods();
  console.log(`[Seed] Complete. Foods: ${foodResult.seeded} new, ${foodResult.skipped} existing`);
}
