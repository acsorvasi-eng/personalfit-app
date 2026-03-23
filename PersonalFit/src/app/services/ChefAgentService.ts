// PersonalFit/src/app/services/ChefAgentService.ts
import { getDB } from '../backend/db';
import type { ChefAgentInput, ChefAgentOutput, RecipeCacheEntry } from './recipeModels';
import { RecipeGenerationError } from './recipeModels';
import type { MealOption } from '../hooks/usePlanData';

// Keywords for weekContext computation
const EGG_KEYWORDS = ['tojás', 'egg', 'ou', 'ouă'];
const RED_MEAT_KEYWORDS = ['marhahús', 'sertés', 'beef', 'pork', 'porc', 'vită', 'bőrös', 'sonka'];
const PROTEIN_KEYWORDS = ['tojás', 'egg', 'csirke', 'chicken', 'hal', 'fish', 'marhahús', 'beef', 'sertés', 'pork', 'tonhal', 'tuna', 'pulyka', 'turkey'];

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

export function computeWeekContext(
  weekMeals: MealOption[],
  todayMeals: MealOption[],
  currentMealId: string,
): ChefAgentInput['weekContext'] {
  const todayIngredientsBeforeCurrent = todayMeals
    .filter(m => m.id !== currentMealId)
    .flatMap(m => m.ingredients);

  const eggsThisWeek = weekMeals.filter(m =>
    m.ingredients.some(i => containsAny(i, EGG_KEYWORDS))
  ).length;

  const redMeatThisWeek = weekMeals.filter(m =>
    m.ingredients.some(i => containsAny(i, RED_MEAT_KEYWORDS))
  ).length;

  const proteinSourcesToday = PROTEIN_KEYWORDS.filter(kw =>
    todayIngredientsBeforeCurrent.some(i => i.toLowerCase().includes(kw))
  );

  return { eggsThisWeek, redMeatThisWeek, proteinSourcesToday };
}

function makeCacheKey(input: ChefAgentInput): string {
  const sortedIngredients = [...input.meal.ingredients].sort().join(',');
  const raw = `recipe|${input.userId}|${input.meal.mealType}|${input.meal.name}|${sortedIngredients}`;
  return raw.slice(0, 200);
}

export async function generateRecipe(input: ChefAgentInput): Promise<ChefAgentOutput> {
  const db = await getDB();
  const cacheKey = makeCacheKey(input);

  // Cache hit
  const cached = await db.get<RecipeCacheEntry>('recipe_cache', cacheKey);
  if (cached?.recipe) {
    return cached.recipe;
  }

  // API call
  const response = await fetch('/api/generate-recipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userProfile: input.userProfile,
      meal: input.meal,
      weekContext: input.weekContext,
      language: input.language,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new RecipeGenerationError((err as { error?: string }).error || `HTTP ${response.status}`);
  }

  const result: ChefAgentOutput = await response.json();

  if (!result || !Array.isArray(result.steps)) {
    throw new RecipeGenerationError('Invalid recipe response shape');
  }

  // Cache write
  const entry: RecipeCacheEntry = {
    cacheKey,
    userId: input.userId,
    generatedAt: Date.now(),
    recipe: result,
  };
  await db.put('recipe_cache', entry);

  return result;
}
