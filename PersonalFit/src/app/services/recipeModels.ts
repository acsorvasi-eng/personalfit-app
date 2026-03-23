// PersonalFit/src/app/services/recipeModels.ts

export interface ChefAgentInput {
  userProfile: {
    age: number;
    gender: 'male' | 'female' | 'other';
    weight: number;
    goal: string;
    allergies: string;
  };
  meal: {
    name: string;
    ingredients: string[];
    ingredientDetails: Array<{
      name: string;
      quantity: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
    calories: string;
    mealType: 'lunch' | 'dinner';
  };
  weekContext: {
    eggsThisWeek: number;
    redMeatThisWeek: number;
    proteinSourcesToday: string[];
  };
  language: 'hu' | 'ro' | 'en';
  userId: string;
}

export interface ChefAgentOutput {
  prepTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  steps: string[];
  chefTip: string;
  gastroNote: string | null;
  mealPrepGuide: string | null;
}

export interface DailyMenuMatch {
  restaurantName: string;
  dishName: string;
  estimatedKcal: number;
  estimatedProtein: number;
  price: string | null;
  availableFrom: string | null;
  matchScore: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface RecipeCacheEntry {
  cacheKey: string;
  userId: string;
  generatedAt: number;
  recipe: ChefAgentOutput;
}

export interface DailyMenuCacheEntry {
  cacheKey: string;
  city: string;
  date: string;
  matches: DailyMenuMatch[];
  generatedAt: number;
}

export class RecipeGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecipeGenerationError';
  }
}
