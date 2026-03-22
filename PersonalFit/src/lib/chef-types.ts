// ─── Meal plan structure (matches generate-meal-plan.ts output) ───────────────

export type ChefMealIngredient = {
  name: string;
  quantity_grams: number;
  unit: string;
  estimated_calories_per_100g: number;
  estimated_protein_per_100g: number;
  estimated_carbs_per_100g: number;
  estimated_fat_per_100g: number;
};

export type ChefMeal = {
  meal_type: string;          // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string;               // e.g., "Csirkepaprikás galuskával"
  total_calories: number;
  ingredients: ChefMealIngredient[];
};

export type ChefDay = {
  day: number;                // 1-30
  week: number;
  day_label: string;
  is_training_day: boolean;
  meals: ChefMeal[];
};

export type ChefMealPlan = {
  days: ChefDay[];
  meal_model?: string;
};

// ─── Chef metadata ────────────────────────────────────────────────────────────

export type ChefUserProfile = {
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

export type ChefChange = {
  day: number;
  meal: string;               // meal_type
  original: string;           // original dish name
  replacement: string;        // replacement dish name
  reason: string;             // human-readable, in user's language
  silent: boolean;
};

// ─── IndexedDB record shapes ──────────────────────────────────────────────────

export type ChefLogEntry = {
  id: string;
  date: string;               // YYYY-MM-DD
  day: number;
  meal: string;
  original: string;
  replacement: string;
  reason: string;
  silent: boolean;
};

export type ChefDecision = {
  id: string;
  dish_name: string;
  decision: 'accept' | 'reject';
  date: string;               // YYYY-MM-DD
};

export type ChefQueueEntry = {
  id: string;
  queued_at: string;          // ISO datetime
  type: 'new_dish' | 'weekly_summary' | 'season_refresh';
  context: Record<string, unknown>;
};

// ─── Chef pending message (runtime, not stored) ───────────────────────────────

export type ChefPendingMessage = {
  message: string;
  proposal?: {
    day: number;
    meal: string;
    replacement: string;
    calories: number;
    macros: { protein: number; carbs: number; fat: number };
  };
  requiresApproval: boolean;
  type: 'new_dish' | 'weekly_summary' | 'season_refresh';
};

// ─── Region context (passed to API calls) ────────────────────────────────────

export type CultureWeights = Record<string, number>; // { hu: 50, ro: 50 }

export type RegionContext = {
  region: string;             // e.g., "Maros megye, Erdély"
  cultureWeights: CultureWeights;
};
