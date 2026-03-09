import { getDB } from './db';
import type { FoodEntity } from './models';

export interface IDatabase {
  getFoods(): Promise<FoodEntity[]>;
  saveFood(food: FoodEntity): Promise<void>;
}

export function getDatabase(): IDatabase {
  return {
    async getFoods(): Promise<FoodEntity[]> {
      const db = await getDB();
      return db.getAll<FoodEntity>('foods');
    },
    async saveFood(food: FoodEntity): Promise<void> {
      const db = await getDB();
      await db.put<FoodEntity>('foods', food);
    },
  };
}

