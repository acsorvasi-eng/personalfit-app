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
 */
export async function createFoodsBatch(inputs: CreateFoodInput[]): Promise<{ created: FoodEntity[]; skipped: string[] }> {
  const db = await getDB();
  const existing = await db.getAll<FoodEntity>('foods');
  const existingNames = new Set(existing.map(f => f.name.toLowerCase()));
  const now = nowISO();
  const created: FoodEntity[] = [];
  const skipped: string[] = [];

  for (const input of inputs) {
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
