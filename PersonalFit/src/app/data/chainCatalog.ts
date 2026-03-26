/**
 * Chain Catalog — maps grocery store chains to their typical product availability.
 * Used to estimate which foods are available at which stores without per-item API calls.
 *
 * Coverage levels:
 *   'full'    — wide selection, multiple brands, always in stock
 *   'basic'   — limited selection or own-brand only
 *   'none'    — not typically carried
 *
 * Chains cover Romania + Hungary + international.
 */

export type ChainId =
  | 'kaufland' | 'lidl' | 'penny' | 'aldi' | 'spar' | 'tesco'
  | 'mega_image' | 'carrefour' | 'auchan' | 'profi' | 'cora' | 'coop';

export type CoverageLevel = 'full' | 'basic' | 'none';

export type FoodCategoryId = 'protein' | 'carb' | 'fat' | 'dairy' | 'vegetable' | 'fruit';

export interface ChainProfile {
  id: ChainId;
  displayName: string;
  /** Google Places search keyword — used in Nearby Search */
  placeKeyword: string;
  /** Countries where this chain operates */
  countries: string[];
  /** Delivery partners if any */
  delivery?: { partner: string; url: string };
  /** Category coverage */
  coverage: Record<FoodCategoryId, CoverageLevel>;
  /** Specific food IDs this chain is known to NOT carry (overrides category) */
  excludedFoods?: string[];
  /** Specific food IDs this chain is known to carry well (premium/specialty) */
  specialtyFoods?: string[];
}

// ─────────────────────────────────────────────────────────────────
// Chain definitions
// ─────────────────────────────────────────────────────────────────

export const CHAIN_PROFILES: ChainProfile[] = [
  {
    id: 'kaufland',
    displayName: 'Kaufland',
    placeKeyword: 'Kaufland',
    countries: ['RO', 'HU', 'DE', 'PL', 'CZ', 'SK', 'BG', 'HR', 'MD'],
    delivery: { partner: 'Glovo', url: 'https://glovoapp.com' },
    coverage: { protein: 'full', carb: 'full', fat: 'full', dairy: 'full', vegetable: 'full', fruit: 'full' },
    specialtyFoods: ['salmon', 'shrimp', 'avocado', 'quinoa', 'tofu', 'tempeh', 'greek_yogurt'],
  },
  {
    id: 'lidl',
    displayName: 'Lidl',
    placeKeyword: 'Lidl',
    countries: ['RO', 'HU', 'DE', 'PL', 'CZ', 'SK', 'BG', 'HR', 'PT', 'ES', 'IT', 'FR', 'UK'],
    coverage: { protein: 'full', carb: 'full', fat: 'basic', dairy: 'full', vegetable: 'full', fruit: 'full' },
    excludedFoods: ['artichoke', 'tempeh', 'tahini'],
    specialtyFoods: ['chicken_breast', 'oats', 'greek_yogurt', 'cottage_cheese'],
  },
  {
    id: 'penny',
    displayName: 'Penny',
    placeKeyword: 'Penny Market',
    countries: ['RO', 'HU', 'DE', 'IT', 'CZ'],
    coverage: { protein: 'basic', carb: 'full', fat: 'basic', dairy: 'full', vegetable: 'basic', fruit: 'basic' },
    excludedFoods: ['salmon', 'shrimp', 'avocado', 'quinoa', 'tofu', 'tempeh', 'kale', 'artichoke', 'asparagus'],
  },
  {
    id: 'aldi',
    displayName: 'Aldi',
    placeKeyword: 'Aldi',
    countries: ['HU', 'DE', 'UK', 'US', 'AU', 'PL'],
    coverage: { protein: 'full', carb: 'full', fat: 'basic', dairy: 'full', vegetable: 'full', fruit: 'full' },
    excludedFoods: ['tempeh', 'artichoke'],
    specialtyFoods: ['chicken_breast', 'oats', 'banana', 'egg'],
  },
  {
    id: 'spar',
    displayName: 'SPAR',
    placeKeyword: 'SPAR',
    countries: ['HU', 'AT', 'IT', 'NL', 'SI', 'HR'],
    coverage: { protein: 'full', carb: 'full', fat: 'full', dairy: 'full', vegetable: 'full', fruit: 'full' },
    specialtyFoods: ['salmon', 'avocado', 'quinoa', 'tofu', 'mozzarella'],
  },
  {
    id: 'tesco',
    displayName: 'Tesco',
    placeKeyword: 'Tesco',
    countries: ['HU', 'UK', 'CZ', 'SK'],
    coverage: { protein: 'full', carb: 'full', fat: 'full', dairy: 'full', vegetable: 'full', fruit: 'full' },
    specialtyFoods: ['tofu', 'tempeh', 'quinoa', 'avocado', 'kale'],
  },
  {
    id: 'mega_image',
    displayName: 'Mega Image',
    placeKeyword: 'Mega Image',
    countries: ['RO'],
    delivery: { partner: 'Glovo', url: 'https://glovoapp.com' },
    coverage: { protein: 'full', carb: 'full', fat: 'full', dairy: 'full', vegetable: 'full', fruit: 'full' },
    specialtyFoods: ['avocado', 'quinoa', 'tofu', 'kale', 'mango', 'pomegranate'],
  },
  {
    id: 'carrefour',
    displayName: 'Carrefour',
    placeKeyword: 'Carrefour',
    countries: ['RO', 'FR', 'ES', 'IT', 'PL', 'BR'],
    delivery: { partner: 'Bringo', url: 'https://brfringo.ro' },
    coverage: { protein: 'full', carb: 'full', fat: 'full', dairy: 'full', vegetable: 'full', fruit: 'full' },
    specialtyFoods: ['salmon', 'shrimp', 'avocado', 'quinoa', 'tofu', 'tempeh', 'tahini'],
  },
  {
    id: 'auchan',
    displayName: 'Auchan',
    placeKeyword: 'Auchan',
    countries: ['RO', 'HU', 'FR', 'PL', 'PT', 'ES'],
    delivery: { partner: 'Auchan', url: 'https://www.auchan.ro' },
    coverage: { protein: 'full', carb: 'full', fat: 'full', dairy: 'full', vegetable: 'full', fruit: 'full' },
    specialtyFoods: ['salmon', 'tofu', 'avocado', 'quinoa'],
  },
  {
    id: 'profi',
    displayName: 'Profi',
    placeKeyword: 'Profi',
    countries: ['RO'],
    coverage: { protein: 'basic', carb: 'full', fat: 'basic', dairy: 'full', vegetable: 'basic', fruit: 'basic' },
    excludedFoods: ['salmon', 'shrimp', 'avocado', 'quinoa', 'tofu', 'tempeh', 'kale', 'artichoke', 'mango', 'kiwi'],
  },
  {
    id: 'cora',
    displayName: 'Cora',
    placeKeyword: 'Cora',
    countries: ['RO'],
    coverage: { protein: 'full', carb: 'full', fat: 'full', dairy: 'full', vegetable: 'full', fruit: 'full' },
    specialtyFoods: ['salmon', 'shrimp', 'avocado', 'tofu'],
  },
  {
    id: 'coop',
    displayName: 'Coop',
    placeKeyword: 'Coop',
    countries: ['HU'],
    coverage: { protein: 'basic', carb: 'full', fat: 'basic', dairy: 'full', vegetable: 'basic', fruit: 'basic' },
    excludedFoods: ['salmon', 'avocado', 'quinoa', 'tofu', 'tempeh', 'kale', 'mango'],
  },
];

// ─────────────────────────────────────────────────────────────────
// Utility: check if a specific food is likely available at a chain
// ─────────────────────────────────────────────────────────────────

export function isFoodAvailableAtChain(
  foodId: string,
  foodCategory: FoodCategoryId,
  chain: ChainProfile,
): boolean {
  // Excluded foods override everything
  if (chain.excludedFoods?.includes(foodId)) return false;
  // Specialty foods are always available
  if (chain.specialtyFoods?.includes(foodId)) return true;
  // Otherwise check category coverage
  const coverage = chain.coverage[foodCategory];
  return coverage === 'full' || coverage === 'basic';
}
