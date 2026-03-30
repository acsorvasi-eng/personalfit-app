/**
 * Comprehensive product database for Marosvásárhely / Târgu Mureș stores
 * Prices in RON (lei), based on real Romanian grocery chain pricing (2025-2026)
 *
 * Every common product appears across MULTIPLE stores with realistic price variations.
 * Products tagged for dietary prioritization based on user profile goals.
 *
 * Stores with OWN delivery service:
 *   - Kaufland (Kaufland.ro delivery & Glovo partnership)
 *   - Carrefour (Bringo delivery service)
 *   - Auchan (own delivery via auchan.ro)
 *
 * Stores WITHOUT delivery (navigate only):
 *   - Lidl
 *   - Penny
 *   - Profi
 */

export type StoreName = 'Kaufland' | 'Carrefour' | 'Auchan' | 'Lidl' | 'Penny' | 'Profi';

export type DietTag =
  | 'high-protein'
  | 'low-carb'
  | 'low-fat'
  | 'low-calorie'
  | 'whole-grain'
  | 'sugar-free'
  | 'fiber-rich'
  | 'omega-3'
  | 'antioxidant'
  | 'vitamin-rich'
  | 'probiotic'
  | 'meal-plan'       // appears in the 4-week meal plan
  | 'clean-eating'
  | 'keto-friendly'
  | 'post-workout';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  store: StoreName;
  image: string;
  unit: 'db' | 'ml' | 'g' | 'kg' | 'l';
  defaultQuantity: number;
  caloriesPer100: number;
  price: number; // in RON (lei)
  protein: number;
  carbs: number;
  fat: number;
  tags: DietTag[];
  /** Search aliases - Hungarian & Romanian common names */
  aliases?: string[];
}

export interface StoreInfo {
  name: StoreName;
  logo: string;
  hasDelivery: boolean;
  deliveryPartner?: string;
  address: string;
  city: string;
  openHours: string;
  coordinates: { lat: number; lng: number };
  deliveryFee?: number;
  minOrder?: number;
  /** Distance from user in km (Marosvásárhely center) */
  distanceKm: number;
}

// Real stores in Marosvásárhely / Târgu Mureș with real addresses
export const localStores: StoreInfo[] = [
  {
    name: 'Kaufland',
    logo: '🟥',
    hasDelivery: true,
    deliveryPartner: 'Kaufland Delivery & Glovo',
    address: 'Str. Gheorghe Doja 160',
    city: 'Târgu Mureș',
    openHours: '07:00 - 22:00',
    coordinates: { lat: 46.5450, lng: 24.5700 },
    deliveryFee: 14.99,
    minOrder: 100,
    distanceKm: 1.2,
  },
  {
    name: 'Lidl',
    logo: '🟡',
    hasDelivery: false,
    address: 'B-dul 1 Decembrie 1918 nr. 253',
    city: 'Târgu Mureș',
    openHours: '07:30 - 21:30',
    coordinates: { lat: 46.5505, lng: 24.5505 },
    distanceKm: 1.5,
  },
  {
    name: 'Penny',
    logo: '🟠',
    hasDelivery: false,
    address: 'Str. Budai Nagy Antal 37',
    city: 'Târgu Mureș',
    openHours: '07:00 - 22:00',
    coordinates: { lat: 46.5415, lng: 24.5560 },
    distanceKm: 1.8,
  },
  {
    name: 'Profi',
    logo: '🟤',
    hasDelivery: false,
    address: 'Str. Bolyai Farkas 18',
    city: 'Târgu Mureș',
    openHours: '07:00 - 22:00',
    coordinates: { lat: 46.5440, lng: 24.5632 },
    distanceKm: 0.6,
  },
  {
    name: 'Carrefour',
    logo: '🔵',
    hasDelivery: true,
    deliveryPartner: 'Bringo by Carrefour',
    address: 'Str. Gheorghe Doja 243, Shopping City',
    city: 'Târgu Mureș',
    openHours: '08:00 - 22:00',
    coordinates: { lat: 46.5382, lng: 24.5783 },
    deliveryFee: 12.99,
    minOrder: 80,
    distanceKm: 2.3,
  },
  {
    name: 'Auchan',
    logo: '🟢',
    hasDelivery: true,
    deliveryPartner: 'Auchan Delivery',
    address: 'Promenada Mall, Str. Înfrățirii 2',
    city: 'Târgu Mureș',
    openHours: '08:00 - 21:30',
    coordinates: { lat: 46.5520, lng: 24.5610 },
    deliveryFee: 9.99,
    minOrder: 75,
    distanceKm: 2.1,
  },
];

// ─────────────────────────────────────────────
// STORE BRAND MAPPING - realistic private label brands per store
// ─────────────────────────────────────────────
const STORE_BRANDS: Record<StoreName, string> = {
  Kaufland: 'K-Classic',
  Lidl: 'Freshona',
  Penny: 'Penny',
  Profi: 'Profi',
  Carrefour: 'Carrefour',
  Auchan: 'Auchan',
};

// ─────────────────────────────────────────────
// Helper to generate the same product across multiple stores
// ─────────────────────────────────────────────
interface MultiStoreProductDef {
  baseName: string;
  category: string;
  image: string;
  unit: Product['unit'];
  defaultQuantity: number;
  caloriesPer100: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: DietTag[];
  aliases?: string[];
  /** Per-store overrides: [store, brand, price] */
  stores: [StoreName, string, number][];
}

function generateMultiStore(def: MultiStoreProductDef): Product[] {
  return def.stores.map(([store, brand, price]) => ({
    id: `${def.baseName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${store.toLowerCase()}`,
    name: def.baseName,
    brand,
    category: def.category,
    store,
    image: def.image,
    unit: def.unit,
    defaultQuantity: def.defaultQuantity,
    caloriesPer100: def.caloriesPer100,
    price,
    protein: def.protein,
    carbs: def.carbs,
    fat: def.fat,
    tags: def.tags,
    aliases: def.aliases,
  }));
}

// ═══════════════════════════════════════════════
// PRODUCT DEFINITIONS — Real products, real prices
// ═══════════════════════════════════════════════

const multiStoreProducts: MultiStoreProductDef[] = [
  // ════════════ FEHÉRJE / PROTEIN SOURCES ════════════

  // Chicken breast
  {
    baseName: 'Csirkemell filé friss',
    category: 'Hús & Hal',
    image: '🍗',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 165,
    protein: 31.0,
    carbs: 0,
    fat: 3.6,
    tags: ['high-protein', 'low-fat', 'low-carb', 'meal-plan', 'clean-eating'],
    aliases: ['csirke', 'csirkemell', 'piept de pui', 'pui', 'chicken'],
    stores: [
      ['Kaufland', 'Agricola', 27.99],
      ['Lidl', 'Transavia', 26.49],
      ['Carrefour', 'Carrefour Bio', 32.99],
      ['Auchan', 'Auchan', 28.99],
      ['Penny', 'Penny', 25.99],
      ['Profi', 'Profi', 29.49],
    ],
  },
  // Chicken thigh
  {
    baseName: 'Csirkecomb csonttal',
    category: 'Hús & Hal',
    image: '🍗',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 211,
    protein: 18.0,
    carbs: 0,
    fat: 15.0,
    tags: ['high-protein'],
    aliases: ['csirkecomb', 'pulpa de pui', 'chicken thigh'],
    stores: [
      ['Kaufland', 'Agricola', 14.99],
      ['Lidl', 'Transavia', 13.99],
      ['Carrefour', 'Carrefour', 16.49],
      ['Penny', 'Penny', 13.49],
      ['Profi', 'Profi', 15.99],
    ],
  },
  // Turkey breast
  {
    baseName: 'Pulykamell szelet',
    category: 'Hús & Hal',
    image: '🦃',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 135,
    protein: 29.0,
    carbs: 0,
    fat: 1.7,
    tags: ['high-protein', 'low-fat', 'low-carb', 'meal-plan', 'clean-eating'],
    aliases: ['pulyka', 'pulykamell', 'curcan', 'turkey'],
    stores: [
      ['Kaufland', 'K-Classic', 34.99],
      ['Auchan', 'Auchan', 33.49],
      ['Carrefour', 'Carrefour', 36.99],
      ['Lidl', 'Cris-Tim', 32.99],
    ],
  },
  // Pork chop
  {
    baseName: 'Sertés karaj',
    category: 'Hús & Hal',
    image: '🥩',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 242,
    protein: 20.0,
    carbs: 0,
    fat: 18.0,
    tags: ['high-protein'],
    aliases: ['sertés', 'karaj', 'cotlet de porc', 'pork'],
    stores: [
      ['Kaufland', 'K-Classic', 23.99],
      ['Lidl', 'Lidl', 21.99],
      ['Penny', 'Penny', 22.99],
      ['Carrefour', 'Carrefour', 25.99],
      ['Profi', 'Profi', 24.49],
    ],
  },
  // Ground beef
  {
    baseName: 'Darált marhahús',
    category: 'Hús & Hal',
    image: '🥩',
    unit: 'g',
    defaultQuantity: 500,
    caloriesPer100: 250,
    protein: 26.0,
    carbs: 0,
    fat: 15.0,
    tags: ['high-protein', 'meal-plan'],
    aliases: ['darált', 'marha', 'carne tocata', 'vita', 'beef', 'ground beef'],
    stores: [
      ['Kaufland', 'K-Classic', 24.99],
      ['Carrefour', 'Carrefour', 27.99],
      ['Auchan', 'Auchan', 25.49],
      ['Lidl', 'Lidl', 23.99],
    ],
  },
  // Pork tenderloin
  {
    baseName: 'Sertés szűzpecsenye',
    category: 'Hús & Hal',
    image: '🥩',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 143,
    protein: 26.0,
    carbs: 0,
    fat: 3.5,
    tags: ['high-protein', 'low-fat', 'clean-eating'],
    aliases: ['szűzpecsenye', 'muschiulet de porc'],
    stores: [
      ['Kaufland', 'K-Classic', 34.99],
      ['Carrefour', 'Carrefour', 37.99],
      ['Auchan', 'Auchan', 35.99],
      ['Lidl', 'Lidl', 33.49],
    ],
  },
  // Salmon fillet
  {
    baseName: 'Lazacfilé friss',
    category: 'Hús & Hal',
    image: '🐟',
    unit: 'g',
    defaultQuantity: 300,
    caloriesPer100: 208,
    protein: 20.0,
    carbs: 0,
    fat: 13.0,
    tags: ['high-protein', 'omega-3', 'meal-plan', 'clean-eating'],
    aliases: ['lazac', 'salmon', 'somon'],
    stores: [
      ['Kaufland', 'K-Classic', 49.99],
      ['Carrefour', 'Carrefour', 54.99],
      ['Auchan', 'Auchan', 47.99],
      ['Lidl', 'Ocean Sea', 44.99],
    ],
  },
  // Frozen salmon
  {
    baseName: 'Lazacfilé fagyasztott',
    category: 'Hús & Hal',
    image: '🐟',
    unit: 'g',
    defaultQuantity: 400,
    caloriesPer100: 208,
    protein: 20.0,
    carbs: 0,
    fat: 13.0,
    tags: ['high-protein', 'omega-3', 'meal-plan'],
    aliases: ['lazac fagyasztott', 'salmon congelat'],
    stores: [
      ['Kaufland', 'K-Classic', 39.99],
      ['Auchan', 'Auchan', 38.49],
      ['Lidl', 'Ocean Sea', 36.99],
      ['Carrefour', 'Carrefour', 42.99],
    ],
  },
  // Tuna canned
  {
    baseName: 'Tonhal konzerv natúr',
    category: 'Hús & Hal',
    image: '🥫',
    unit: 'g',
    defaultQuantity: 160,
    caloriesPer100: 116,
    protein: 26.0,
    carbs: 0,
    fat: 0.9,
    tags: ['high-protein', 'low-fat', 'low-carb', 'meal-plan', 'clean-eating'],
    aliases: ['tonhal', 'ton', 'tuna'],
    stores: [
      ['Kaufland', 'Rio Mare', 9.99],
      ['Lidl', 'Nixe', 7.49],
      ['Carrefour', 'Rio Mare', 10.49],
      ['Penny', 'Penny', 6.99],
      ['Auchan', 'Rio Mare', 9.49],
      ['Profi', 'Eva', 7.99],
    ],
  },
  // Eggs
  {
    baseName: 'Tojás M méret 10db',
    category: 'Hús & Hal',
    image: '🥚',
    unit: 'db',
    defaultQuantity: 10,
    caloriesPer100: 155,
    protein: 13.0,
    carbs: 1.1,
    fat: 11.0,
    tags: ['high-protein', 'meal-plan', 'clean-eating'],
    aliases: ['tojás', 'oua', 'egg'],
    stores: [
      ['Kaufland', 'K-Classic', 11.99],
      ['Lidl', 'Pilos', 10.99],
      ['Carrefour', 'Carrefour', 12.49],
      ['Auchan', 'Auchan', 11.49],
      ['Penny', 'Penny', 10.49],
      ['Profi', 'Profi', 12.99],
    ],
  },
  // Bio eggs
  {
    baseName: 'Tojás L bio szabadtartás 6db',
    category: 'Hús & Hal',
    image: '🥚',
    unit: 'db',
    defaultQuantity: 6,
    caloriesPer100: 155,
    protein: 13.0,
    carbs: 1.1,
    fat: 11.0,
    tags: ['high-protein', 'meal-plan', 'clean-eating'],
    aliases: ['tojás bio', 'oua bio'],
    stores: [
      ['Kaufland', 'K-Bio', 14.49],
      ['Carrefour', 'Carrefour Bio', 15.99],
      ['Auchan', 'Auchan Bio', 14.99],
      ['Lidl', 'Biotrend', 13.99],
    ],
  },
  // Sonka/Ham
  {
    baseName: 'Sonka Praga',
    category: 'Hús & Hal',
    image: '🥓',
    unit: 'g',
    defaultQuantity: 150,
    caloriesPer100: 145,
    protein: 21.0,
    carbs: 1.0,
    fat: 6.0,
    tags: ['high-protein', 'low-carb'],
    aliases: ['sonka', 'sunca', 'ham'],
    stores: [
      ['Kaufland', 'Cris-Tim', 8.99],
      ['Carrefour', 'Cris-Tim', 9.49],
      ['Lidl', 'Pikok', 7.99],
      ['Penny', 'Caroli', 7.49],
      ['Profi', 'Caroli', 8.49],
    ],
  },
  // Pick salami
  {
    baseName: 'Téliszalámi',
    category: 'Hús & Hal',
    image: '🥩',
    unit: 'g',
    defaultQuantity: 80,
    caloriesPer100: 514,
    protein: 25.0,
    carbs: 1.5,
    fat: 45.0,
    tags: ['high-protein'],
    aliases: ['szalámi', 'salam', 'salami'],
    stores: [
      ['Kaufland', 'Pick', 26.99],
      ['Carrefour', 'Pick', 27.99],
      ['Auchan', 'Pick', 25.99],
    ],
  },
  // Cod
  {
    baseName: 'Tőkehalfilé fagyasztott',
    category: 'Hús & Hal',
    image: '🐟',
    unit: 'g',
    defaultQuantity: 400,
    caloriesPer100: 82,
    protein: 18.0,
    carbs: 0,
    fat: 0.7,
    tags: ['high-protein', 'low-fat', 'low-calorie', 'clean-eating'],
    aliases: ['tőkehal', 'cod', 'bacalhau'],
    stores: [
      ['Kaufland', 'K-Classic', 29.99],
      ['Lidl', 'Ocean Sea', 27.49],
      ['Auchan', 'Auchan', 31.99],
    ],
  },
  // Shrimp
  {
    baseName: 'Garnélarák fagyasztott',
    category: 'Hús & Hal',
    image: '🦐',
    unit: 'g',
    defaultQuantity: 300,
    caloriesPer100: 99,
    protein: 24.0,
    carbs: 0.2,
    fat: 0.3,
    tags: ['high-protein', 'low-fat', 'low-calorie', 'omega-3'],
    aliases: ['garnéla', 'rák', 'creveti', 'shrimp'],
    stores: [
      ['Kaufland', 'K-Classic', 34.99],
      ['Carrefour', 'Carrefour', 39.99],
      ['Auchan', 'Auchan', 36.99],
      ['Lidl', 'Ocean Sea', 32.99],
    ],
  },

  // ════════════ TEJTERMÉKEK / DAIRY ════════════

  // Greek yogurt
  {
    baseName: 'Görög joghurt 10%',
    category: 'Tejtermék',
    image: '🥛',
    unit: 'g',
    defaultQuantity: 400,
    caloriesPer100: 130,
    protein: 6.4,
    carbs: 4.0,
    fat: 10.0,
    tags: ['high-protein', 'probiotic'],
    aliases: ['görög joghurt', 'iaurt grecesc', 'greek yogurt'],
    stores: [
      ['Lidl', 'Pilos', 7.49],
      ['Kaufland', 'K-Classic', 8.49],
      ['Carrefour', 'Carrefour', 8.99],
      ['Auchan', 'Auchan', 7.99],
      ['Penny', 'Penny', 7.29],
    ],
  },
  // Skyr
  {
    baseName: 'Skyr natúr 0%',
    category: 'Tejtermék',
    image: '🥛',
    unit: 'g',
    defaultQuantity: 450,
    caloriesPer100: 63,
    protein: 11.0,
    carbs: 4.0,
    fat: 0.2,
    tags: ['high-protein', 'low-fat', 'low-calorie', 'clean-eating', 'meal-plan'],
    aliases: ['skyr', 'joghurt', 'iaurt'],
    stores: [
      ['Lidl', 'Milbona', 8.99],
      ['Kaufland', 'K-Classic', 9.99],
      ['Carrefour', 'Carrefour', 10.49],
    ],
  },
  // Cottage cheese / Túró
  {
    baseName: 'Túró sovány 0.5%',
    category: 'Tejtermék',
    image: '🧀',
    unit: 'g',
    defaultQuantity: 250,
    caloriesPer100: 72,
    protein: 13.0,
    carbs: 3.5,
    fat: 0.5,
    tags: ['high-protein', 'low-fat', 'low-calorie', 'meal-plan', 'clean-eating'],
    aliases: ['túró', 'branza de vaci', 'cottage cheese'],
    stores: [
      ['Kaufland', 'Zuzu', 6.99],
      ['Lidl', 'Pilos', 5.99],
      ['Carrefour', 'Zuzu', 7.49],
      ['Auchan', 'Napolact', 6.49],
      ['Penny', 'Zuzu', 5.79],
      ['Profi', 'Zuzu', 7.29],
    ],
  },
  // Goat cheese
  {
    baseName: 'Kecskesajt natúr',
    category: 'Tejtermék',
    image: '🧀',
    unit: 'g',
    defaultQuantity: 150,
    caloriesPer100: 364,
    protein: 21.6,
    carbs: 2.2,
    fat: 29.8,
    tags: ['high-protein', 'low-carb'],
    aliases: ['kecskesajt', 'branza de capra', 'goat cheese'],
    stores: [
      ['Carrefour', 'Président', 16.99],
      ['Kaufland', 'K-Classic', 14.99],
      ['Auchan', 'Auchan', 15.49],
      ['Lidl', 'Alpenmark', 13.99],
    ],
  },
  // Mozzarella
  {
    baseName: 'Mozzarella friss',
    category: 'Tejtermék',
    image: '🧀',
    unit: 'g',
    defaultQuantity: 125,
    caloriesPer100: 280,
    protein: 22.0,
    carbs: 3.0,
    fat: 21.0,
    tags: ['high-protein'],
    aliases: ['mozzarella', 'mozarella'],
    stores: [
      ['Carrefour', 'Galbani', 9.99],
      ['Kaufland', 'Galbani', 9.49],
      ['Lidl', 'Lovilio', 7.99],
      ['Auchan', 'Auchan', 8.49],
      ['Penny', 'Penny', 7.49],
    ],
  },
  // Milk 1.5%
  {
    baseName: 'Tej 1.5% zsírszegény',
    category: 'Tejtermék',
    image: '🥛',
    unit: 'l',
    defaultQuantity: 1,
    caloriesPer100: 42,
    protein: 3.4,
    carbs: 4.8,
    fat: 1.5,
    tags: ['low-fat', 'low-calorie', 'meal-plan'],
    aliases: ['tej', 'lapte', 'milk'],
    stores: [
      ['Kaufland', 'Zuzu', 5.49],
      ['Lidl', 'Pilos', 4.99],
      ['Carrefour', 'Napolact', 5.99],
      ['Auchan', 'Zuzu', 5.29],
      ['Penny', 'Zuzu', 4.79],
      ['Profi', 'Zuzu', 5.69],
    ],
  },
  // Milk 2.8%
  {
    baseName: 'Tej 2.8%',
    category: 'Tejtermék',
    image: '🥛',
    unit: 'l',
    defaultQuantity: 1,
    caloriesPer100: 50,
    protein: 3.3,
    carbs: 4.8,
    fat: 2.8,
    tags: [],
    aliases: ['tej', 'lapte', 'milk'],
    stores: [
      ['Kaufland', 'Zuzu', 6.29],
      ['Lidl', 'Pilos', 5.79],
      ['Carrefour', 'Napolact', 6.49],
      ['Penny', 'Zuzu', 5.49],
      ['Profi', 'Zuzu', 6.49],
    ],
  },
  // Goat milk
  {
    baseName: 'Kecsketej bio 3.5%',
    category: 'Tejtermék',
    image: '🥛',
    unit: 'l',
    defaultQuantity: 1,
    caloriesPer100: 69,
    protein: 3.6,
    carbs: 4.5,
    fat: 4.1,
    tags: ['probiotic'],
    aliases: ['kecsketej', 'lapte de capra'],
    stores: [
      ['Kaufland', 'Covalact', 12.49],
      ['Lidl', 'Pilos', 11.99],
      ['Carrefour', 'Napolact', 13.99],
      ['Auchan', 'Auchan Bio', 12.99],
    ],
  },
  // Kefir
  {
    baseName: 'Kefír natúr 1.5%',
    category: 'Tejtermék',
    image: '🥛',
    unit: 'g',
    defaultQuantity: 330,
    caloriesPer100: 40,
    protein: 3.3,
    carbs: 4.0,
    fat: 1.5,
    tags: ['probiotic', 'low-fat', 'low-calorie'],
    aliases: ['kefír', 'chefir', 'kefir'],
    stores: [
      ['Kaufland', 'Napolact', 4.99],
      ['Lidl', 'Pilos', 4.49],
      ['Carrefour', 'Carrefour', 5.49],
      ['Auchan', 'Auchan', 4.79],
      ['Profi', 'Napolact', 5.29],
    ],
  },
  // Sheep cheese
  {
    baseName: 'Juhtúró hagyományos',
    category: 'Tejtermék',
    image: '🧀',
    unit: 'g',
    defaultQuantity: 250,
    caloriesPer100: 356,
    protein: 22.0,
    carbs: 1.5,
    fat: 28.0,
    tags: ['high-protein', 'low-carb'],
    aliases: ['juhtúró', 'branza de oaie', 'sheep cheese'],
    stores: [
      ['Auchan', 'Năsal', 18.49],
      ['Kaufland', 'Covalact de Țară', 17.99],
      ['Carrefour', 'Năsal', 19.99],
    ],
  },
  // Parmesan
  {
    baseName: 'Parmezán sajt reszelt',
    category: 'Tejtermék',
    image: '🧀',
    unit: 'g',
    defaultQuantity: 100,
    caloriesPer100: 431,
    protein: 38.0,
    carbs: 4.1,
    fat: 29.0,
    tags: ['high-protein', 'low-carb'],
    aliases: ['parmezán', 'parmezan', 'parmesan'],
    stores: [
      ['Kaufland', 'Parmigiano', 12.99],
      ['Lidl', 'Lovilio', 10.99],
      ['Carrefour', 'Galbani', 14.49],
      ['Auchan', 'Auchan', 11.99],
    ],
  },
  // Whey protein
  {
    baseName: 'Fehérjepor vanília',
    category: 'Sport & Kiegészítő',
    image: '💪',
    unit: 'g',
    defaultQuantity: 900,
    caloriesPer100: 375,
    protein: 80.0,
    carbs: 6.0,
    fat: 5.0,
    tags: ['high-protein', 'low-carb', 'post-workout', 'meal-plan'],
    aliases: ['protein', 'fehérjepor', 'whey', 'proteina'],
    stores: [
      ['Auchan', 'Scitec Nutrition', 109.99],
      ['Carrefour', 'BioTechUSA', 119.99],
      ['Kaufland', 'Scitec Nutrition', 114.99],
    ],
  },
  // Protein bar
  {
    baseName: 'Protein szelet csoki',
    category: 'Sport & Kiegészítő',
    image: '🍫',
    unit: 'g',
    defaultQuantity: 60,
    caloriesPer100: 360,
    protein: 35.0,
    carbs: 30.0,
    fat: 12.0,
    tags: ['high-protein', 'post-workout'],
    aliases: ['protein szelet', 'baton proteic', 'protein bar'],
    stores: [
      ['Carrefour', 'BioTechUSA', 6.49],
      ['Auchan', 'Scitec', 5.99],
      ['Kaufland', 'Multipower', 7.49],
      ['Lidl', 'Sondey Sport', 4.99],
    ],
  },

  // ════════════ ZÖLDSÉGEK / VEGETABLES ════════════

  // Broccoli
  {
    baseName: 'Brokkoli friss',
    category: 'Zöldség',
    image: '🥦',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 34,
    protein: 2.8,
    carbs: 7.0,
    fat: 0.4,
    tags: ['low-calorie', 'fiber-rich', 'vitamin-rich', 'meal-plan', 'clean-eating'],
    aliases: ['brokkoli', 'broccoli'],
    stores: [
      ['Kaufland', 'Kaufland', 7.99],
      ['Lidl', 'Freshona', 7.49],
      ['Carrefour', 'Carrefour', 8.99],
      ['Auchan', 'Auchan', 7.79],
      ['Penny', 'Penny', 6.99],
      ['Profi', 'Profi', 8.49],
    ],
  },
  // Spinach
  {
    baseName: 'Spenót friss baby',
    category: 'Zöldség',
    image: '🥬',
    unit: 'g',
    defaultQuantity: 250,
    caloriesPer100: 23,
    protein: 2.9,
    carbs: 3.6,
    fat: 0.4,
    tags: ['low-calorie', 'fiber-rich', 'vitamin-rich', 'meal-plan', 'clean-eating'],
    aliases: ['spenót', 'spanac', 'spinach'],
    stores: [
      ['Kaufland', 'Kaufland', 6.99],
      ['Lidl', 'Freshona', 5.99],
      ['Carrefour', 'Carrefour', 7.49],
      ['Auchan', 'Auchan', 6.49],
      ['Penny', 'Penny', 5.49],
    ],
  },
  // Carrot
  {
    baseName: 'Sárgarépa',
    category: 'Zöldség',
    image: '🥕',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 41,
    protein: 0.9,
    carbs: 9.6,
    fat: 0.2,
    tags: ['low-calorie', 'fiber-rich', 'vitamin-rich', 'meal-plan', 'clean-eating'],
    aliases: ['sárgarépa', 'répa', 'morcov', 'morcovi', 'carrot'],
    stores: [
      ['Kaufland', 'Kaufland', 3.49],
      ['Lidl', 'Freshona', 2.99],
      ['Carrefour', 'Carrefour', 3.99],
      ['Auchan', 'Auchan', 3.29],
      ['Penny', 'Penny', 2.79],
      ['Profi', 'Profi', 3.69],
    ],
  },
  // Tomato
  {
    baseName: 'Paradicsom koktél',
    category: 'Zöldség',
    image: '🍅',
    unit: 'g',
    defaultQuantity: 500,
    caloriesPer100: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    tags: ['low-calorie', 'antioxidant', 'vitamin-rich', 'meal-plan'],
    aliases: ['paradicsom', 'tomate', 'tomato', 'cherry tomato'],
    stores: [
      ['Kaufland', 'Kaufland', 7.99],
      ['Lidl', 'Freshona', 6.99],
      ['Carrefour', 'Carrefour', 8.49],
      ['Auchan', 'Auchan', 7.49],
      ['Penny', 'Penny', 6.49],
      ['Profi', 'Profi', 8.99],
    ],
  },
  // Regular tomato
  {
    baseName: 'Paradicsom romániai',
    category: 'Zöldség',
    image: '🍅',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    tags: ['low-calorie', 'vitamin-rich', 'meal-plan'],
    aliases: ['paradicsom', 'rosii', 'tomate', 'tomato'],
    stores: [
      ['Kaufland', 'Kaufland', 5.99],
      ['Lidl', 'Lidl', 5.49],
      ['Carrefour', 'Carrefour', 6.49],
      ['Penny', 'Penny', 4.99],
      ['Profi', 'Profi', 6.29],
    ],
  },
  // Cucumber
  {
    baseName: 'Uborka friss',
    category: 'Zöldség',
    image: '🥒',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 16,
    protein: 0.7,
    carbs: 3.6,
    fat: 0.1,
    tags: ['low-calorie', 'meal-plan'],
    aliases: ['uborka', 'castraveti', 'cucumber'],
    stores: [
      ['Kaufland', 'Kaufland', 4.99],
      ['Lidl', 'Freshona', 4.49],
      ['Carrefour', 'Carrefour', 5.49],
      ['Auchan', 'Auchan', 4.79],
      ['Penny', 'Penny', 3.99],
      ['Profi', 'Profi', 5.29],
    ],
  },
  // Bell pepper
  {
    baseName: 'Paprika kaliforniai',
    category: 'Zöldség',
    image: '🫑',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 26,
    protein: 0.9,
    carbs: 6.0,
    fat: 0.3,
    tags: ['low-calorie', 'vitamin-rich', 'meal-plan'],
    aliases: ['paprika', 'ardei', 'pepper', 'bell pepper'],
    stores: [
      ['Kaufland', 'Kaufland', 9.99],
      ['Lidl', 'Lidl', 8.99],
      ['Carrefour', 'Carrefour', 10.99],
      ['Auchan', 'Auchan', 9.49],
      ['Penny', 'Penny', 8.49],
      ['Profi', 'Profi', 10.49],
    ],
  },
  // Onion
  {
    baseName: 'Vöröshagyma',
    category: 'Zöldség',
    image: '🧅',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 40,
    protein: 1.1,
    carbs: 9.3,
    fat: 0.1,
    tags: ['low-calorie', 'meal-plan'],
    aliases: ['hagyma', 'vöröshagyma', 'ceapa', 'onion'],
    stores: [
      ['Kaufland', 'Kaufland', 2.99],
      ['Lidl', 'Lidl', 2.49],
      ['Carrefour', 'Carrefour', 3.29],
      ['Auchan', 'Auchan', 2.79],
      ['Penny', 'Penny', 2.29],
      ['Profi', 'Profi', 3.49],
    ],
  },
  // Garlic
  {
    baseName: 'Fokhagyma friss',
    category: 'Zöldség',
    image: '🧄',
    unit: 'g',
    defaultQuantity: 200,
    caloriesPer100: 149,
    protein: 6.4,
    carbs: 33.1,
    fat: 0.5,
    tags: ['vitamin-rich', 'meal-plan'],
    aliases: ['fokhagyma', 'usturoi', 'garlic'],
    stores: [
      ['Kaufland', 'Kaufland', 3.99],
      ['Lidl', 'Lidl', 3.49],
      ['Carrefour', 'Carrefour', 4.49],
      ['Penny', 'Penny', 2.99],
      ['Profi', 'Profi', 3.79],
    ],
  },
  // Mushroom
  {
    baseName: 'Csiperkegomba friss',
    category: 'Zöldség',
    image: '🍄',
    unit: 'g',
    defaultQuantity: 400,
    caloriesPer100: 22,
    protein: 3.1,
    carbs: 3.3,
    fat: 0.3,
    tags: ['low-calorie', 'low-fat', 'vitamin-rich', 'meal-plan'],
    aliases: ['gomba', 'csiperke', 'ciuperci', 'mushroom'],
    stores: [
      ['Kaufland', 'Kaufland', 5.99],
      ['Lidl', 'Freshona', 4.99],
      ['Carrefour', 'Carrefour', 6.49],
      ['Auchan', 'Auchan', 5.49],
      ['Penny', 'Penny', 4.49],
      ['Profi', 'Profi', 5.79],
    ],
  },
  // Zucchini
  {
    baseName: 'Cukkini friss',
    category: 'Zöldség',
    image: '🥒',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 17,
    protein: 1.2,
    carbs: 3.1,
    fat: 0.3,
    tags: ['low-calorie', 'low-carb', 'meal-plan', 'clean-eating'],
    aliases: ['cukkini', 'dovlecel', 'zucchini'],
    stores: [
      ['Kaufland', 'Kaufland', 5.99],
      ['Lidl', 'Freshona', 5.49],
      ['Carrefour', 'Carrefour', 6.49],
      ['Auchan', 'Auchan', 5.79],
      ['Penny', 'Penny', 4.99],
    ],
  },
  // Lettuce
  {
    baseName: 'Jégsaláta',
    category: 'Zöldség',
    image: '🥬',
    unit: 'db',
    defaultQuantity: 1,
    caloriesPer100: 14,
    protein: 0.9,
    carbs: 2.9,
    fat: 0.1,
    tags: ['low-calorie', 'meal-plan'],
    aliases: ['saláta', 'jégsaláta', 'salata', 'lettuce'],
    stores: [
      ['Kaufland', 'Kaufland', 3.99],
      ['Lidl', 'Lidl', 3.49],
      ['Carrefour', 'Carrefour', 4.49],
      ['Auchan', 'Auchan', 3.79],
      ['Penny', 'Penny', 2.99],
      ['Profi', 'Profi', 4.29],
    ],
  },
  // Cauliflower
  {
    baseName: 'Karfiol friss',
    category: 'Zöldség',
    image: '🥦',
    unit: 'db',
    defaultQuantity: 1,
    caloriesPer100: 25,
    protein: 2.0,
    carbs: 5.0,
    fat: 0.3,
    tags: ['low-calorie', 'low-carb', 'fiber-rich', 'meal-plan'],
    aliases: ['karfiol', 'conopida', 'cauliflower'],
    stores: [
      ['Kaufland', 'Kaufland', 5.99],
      ['Lidl', 'Freshona', 4.99],
      ['Carrefour', 'Carrefour', 6.99],
      ['Auchan', 'Auchan', 5.49],
      ['Penny', 'Penny', 4.49],
    ],
  },
  // Sweet corn
  {
    baseName: 'Csemegekukorica konzerv',
    category: 'Zöldség',
    image: '🌽',
    unit: 'g',
    defaultQuantity: 340,
    caloriesPer100: 86,
    protein: 3.2,
    carbs: 16.3,
    fat: 1.2,
    tags: ['fiber-rich'],
    aliases: ['kukorica', 'porumb', 'corn'],
    stores: [
      ['Kaufland', 'K-Classic', 3.99],
      ['Lidl', 'Freshona', 3.49],
      ['Carrefour', 'Bonduelle', 5.49],
      ['Penny', 'Penny', 2.99],
      ['Profi', 'Bonduelle', 4.99],
    ],
  },
  // Frozen vegetables mix
  {
    baseName: 'Fagyasztott zöldségmix',
    category: 'Zöldség',
    image: '🥦',
    unit: 'g',
    defaultQuantity: 450,
    caloriesPer100: 50,
    protein: 2.5,
    carbs: 9.0,
    fat: 0.5,
    tags: ['low-calorie', 'fiber-rich', 'vitamin-rich'],
    aliases: ['fagyasztott zöldség', 'legume congelate', 'frozen vegetables'],
    stores: [
      ['Kaufland', 'K-Classic', 6.99],
      ['Lidl', 'Freshona', 5.99],
      ['Carrefour', 'Bonduelle', 8.49],
      ['Auchan', 'Auchan', 6.49],
      ['Penny', 'Penny', 5.49],
    ],
  },
  // Frozen broccoli
  {
    baseName: 'Fagyasztott brokkoli',
    category: 'Zöldség',
    image: '🥦',
    unit: 'g',
    defaultQuantity: 450,
    caloriesPer100: 34,
    protein: 2.8,
    carbs: 7.0,
    fat: 0.4,
    tags: ['low-calorie', 'fiber-rich', 'vitamin-rich', 'meal-plan'],
    aliases: ['fagyasztott brokkoli', 'broccoli congelat'],
    stores: [
      ['Kaufland', 'K-Classic', 7.49],
      ['Lidl', 'Freshona', 6.49],
      ['Carrefour', 'Bonduelle', 8.99],
      ['Auchan', 'Auchan', 6.99],
    ],
  },
  // Avocado
  {
    baseName: 'Avokádó érett',
    category: 'Zöldség',
    image: '🥑',
    unit: 'db',
    defaultQuantity: 2,
    caloriesPer100: 160,
    protein: 2.0,
    carbs: 8.5,
    fat: 14.7,
    tags: ['keto-friendly', 'omega-3', 'fiber-rich', 'meal-plan'],
    aliases: ['avokádó', 'avocado'],
    stores: [
      ['Kaufland', 'Kaufland', 4.99],
      ['Lidl', 'Lidl', 4.49],
      ['Carrefour', 'Carrefour', 5.49],
      ['Auchan', 'Auchan', 4.79],
      ['Penny', 'Penny', 3.99],
    ],
  },
  // Green beans
  {
    baseName: 'Zöldbab fagyasztott',
    category: 'Zöldség',
    image: '🫘',
    unit: 'g',
    defaultQuantity: 450,
    caloriesPer100: 31,
    protein: 1.8,
    carbs: 7.0,
    fat: 0.1,
    tags: ['low-calorie', 'fiber-rich', 'vitamin-rich'],
    aliases: ['zöldbab', 'fasole verde', 'green beans'],
    stores: [
      ['Kaufland', 'K-Classic', 5.99],
      ['Lidl', 'Freshona', 4.99],
      ['Carrefour', 'Bonduelle', 7.49],
      ['Auchan', 'Auchan', 5.49],
    ],
  },

  // ════════════ GYÜMÖLCSÖK / FRUITS ════════════

  // Banana
  {
    baseName: 'Banán',
    category: 'Gyümölcs',
    image: '🍌',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 89,
    protein: 1.1,
    carbs: 22.8,
    fat: 0.3,
    tags: ['vitamin-rich', 'post-workout', 'meal-plan'],
    aliases: ['banán', 'banana'],
    stores: [
      ['Kaufland', 'Chiquita', 5.99],
      ['Lidl', 'Lidl', 5.49],
      ['Carrefour', 'Dole', 6.29],
      ['Auchan', 'Auchan', 5.79],
      ['Penny', 'Penny', 4.99],
      ['Profi', 'Profi', 6.49],
    ],
  },
  // Apple
  {
    baseName: 'Alma Golden',
    category: 'Gyümölcs',
    image: '🍎',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 52,
    protein: 0.3,
    carbs: 13.8,
    fat: 0.2,
    tags: ['low-calorie', 'fiber-rich', 'vitamin-rich', 'meal-plan'],
    aliases: ['alma', 'mere', 'apple'],
    stores: [
      ['Kaufland', 'Kaufland', 5.49],
      ['Lidl', 'Lidl', 4.99],
      ['Carrefour', 'Carrefour', 5.99],
      ['Auchan', 'Auchan', 5.29],
      ['Penny', 'Penny', 4.49],
      ['Profi', 'Profi', 5.79],
    ],
  },
  // Orange
  {
    baseName: 'Narancs Valencia',
    category: 'Gyümölcs',
    image: '🍊',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 47,
    protein: 0.9,
    carbs: 11.8,
    fat: 0.1,
    tags: ['low-calorie', 'vitamin-rich'],
    aliases: ['narancs', 'portocale', 'orange'],
    stores: [
      ['Kaufland', 'Kaufland', 4.99],
      ['Lidl', 'Lidl', 4.49],
      ['Carrefour', 'Carrefour', 5.49],
      ['Auchan', 'Auchan', 4.79],
      ['Penny', 'Penny', 3.99],
      ['Profi', 'Profi', 5.29],
    ],
  },
  // Strawberry
  {
    baseName: 'Eper friss',
    category: 'Gyümölcs',
    image: '🍓',
    unit: 'g',
    defaultQuantity: 500,
    caloriesPer100: 32,
    protein: 0.7,
    carbs: 7.7,
    fat: 0.3,
    tags: ['low-calorie', 'antioxidant', 'vitamin-rich'],
    aliases: ['eper', 'capsuni', 'strawberry'],
    stores: [
      ['Kaufland', 'Kaufland', 12.99],
      ['Lidl', 'Lidl', 11.99],
      ['Carrefour', 'Carrefour', 13.99],
      ['Auchan', 'Auchan', 12.49],
      ['Penny', 'Penny', 10.99],
    ],
  },
  // Blueberry
  {
    baseName: 'Áfonya friss',
    category: 'Gyümölcs',
    image: '🫐',
    unit: 'g',
    defaultQuantity: 250,
    caloriesPer100: 57,
    protein: 0.7,
    carbs: 14.5,
    fat: 0.3,
    tags: ['antioxidant', 'vitamin-rich', 'meal-plan'],
    aliases: ['áfonya', 'afine', 'blueberry'],
    stores: [
      ['Kaufland', 'K-Bio', 14.99],
      ['Lidl', 'Lidl', 12.99],
      ['Carrefour', 'Carrefour', 16.49],
      ['Auchan', 'Auchan', 13.99],
    ],
  },
  // Frozen berries
  {
    baseName: 'Fagyasztott erdei gyümölcs',
    category: 'Gyümölcs',
    image: '🫐',
    unit: 'g',
    defaultQuantity: 300,
    caloriesPer100: 42,
    protein: 0.8,
    carbs: 9.5,
    fat: 0.3,
    tags: ['antioxidant', 'low-calorie', 'meal-plan'],
    aliases: ['erdei gyümölcs', 'fructe de padure', 'frozen berries'],
    stores: [
      ['Kaufland', 'K-Classic', 9.99],
      ['Lidl', 'Freshona', 8.99],
      ['Carrefour', 'Carrefour', 10.99],
      ['Auchan', 'Auchan', 9.49],
      ['Penny', 'Penny', 7.99],
    ],
  },
  // Lemon
  {
    baseName: 'Citrom',
    category: 'Gyümölcs',
    image: '🍋',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 29,
    protein: 1.1,
    carbs: 9.3,
    fat: 0.3,
    tags: ['low-calorie', 'vitamin-rich', 'meal-plan'],
    aliases: ['citrom', 'lamaie', 'lemon'],
    stores: [
      ['Kaufland', 'Kaufland', 7.99],
      ['Lidl', 'Lidl', 6.99],
      ['Carrefour', 'Carrefour', 8.49],
      ['Penny', 'Penny', 5.99],
      ['Profi', 'Profi', 7.49],
    ],
  },
  // Grapes
  {
    baseName: 'Szőlő fehér magvatlan',
    category: 'Gyümölcs',
    image: '🍇',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 69,
    protein: 0.7,
    carbs: 18.1,
    fat: 0.2,
    tags: ['antioxidant'],
    aliases: ['szőlő', 'struguri', 'grapes'],
    stores: [
      ['Kaufland', 'Kaufland', 9.99],
      ['Lidl', 'Lidl', 8.99],
      ['Carrefour', 'Carrefour', 10.99],
      ['Auchan', 'Auchan', 9.49],
      ['Penny', 'Penny', 7.99],
    ],
  },
  // Kiwi
  {
    baseName: 'Kiwi',
    category: 'Gyümölcs',
    image: '🥝',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 61,
    protein: 1.1,
    carbs: 14.7,
    fat: 0.5,
    tags: ['low-calorie', 'vitamin-rich', 'fiber-rich'],
    aliases: ['kivi', 'kiwi'],
    stores: [
      ['Kaufland', 'Zespri', 9.99],
      ['Lidl', 'Lidl', 8.49],
      ['Carrefour', 'Zespri', 10.99],
      ['Auchan', 'Auchan', 9.29],
    ],
  },

  // ════════════ GABONAFÉLÉK / GRAINS ════════════

  // Basmati rice
  {
    baseName: 'Rizs basmati',
    category: 'Gabona',
    image: '🍚',
    unit: 'g',
    defaultQuantity: 500,
    caloriesPer100: 130,
    protein: 2.7,
    carbs: 28.2,
    fat: 0.3,
    tags: ['meal-plan'],
    aliases: ['rizs', 'orez', 'rice', 'basmati'],
    stores: [
      ['Kaufland', 'K-Classic', 7.49],
      ['Lidl', 'Golden Sun', 6.99],
      ['Carrefour', 'Carrefour', 8.49],
      ['Auchan', 'Auchan', 7.29],
      ['Penny', 'Penny', 5.99],
      ['Profi', 'Profi', 7.99],
    ],
  },
  // Brown rice
  {
    baseName: 'Rizs barna teljes kiőrlésű',
    category: 'Gabona',
    image: '🍚',
    unit: 'g',
    defaultQuantity: 500,
    caloriesPer100: 111,
    protein: 2.6,
    carbs: 23.0,
    fat: 0.9,
    tags: ['whole-grain', 'fiber-rich', 'meal-plan', 'clean-eating'],
    aliases: ['barna rizs', 'orez brun', 'brown rice'],
    stores: [
      ['Kaufland', 'K-Classic', 8.99],
      ['Lidl', 'Golden Sun', 7.99],
      ['Carrefour', 'Carrefour Bio', 10.49],
      ['Auchan', 'Auchan', 8.49],
    ],
  },
  // Oats
  {
    baseName: 'Zabpehely',
    category: 'Gabona',
    image: '🥣',
    unit: 'g',
    defaultQuantity: 500,
    caloriesPer100: 379,
    protein: 13.2,
    carbs: 67.7,
    fat: 6.5,
    tags: ['whole-grain', 'fiber-rich', 'meal-plan', 'clean-eating', 'high-protein'],
    aliases: ['zab', 'zabpehely', 'ovaz', 'oats', 'oatmeal'],
    stores: [
      ['Kaufland', 'K-Classic', 5.99],
      ['Lidl', 'Crownfield', 5.49],
      ['Carrefour', 'Carrefour', 6.49],
      ['Auchan', 'Auchan', 5.79],
      ['Penny', 'Penny', 4.49],
      ['Profi', 'Profi', 5.99],
    ],
  },
  // Whole wheat bread
  {
    baseName: 'Kenyér teljes kiőrlésű',
    category: 'Gabona',
    image: '🍞',
    unit: 'g',
    defaultQuantity: 500,
    caloriesPer100: 247,
    protein: 8.9,
    carbs: 48.0,
    fat: 1.3,
    tags: ['whole-grain', 'fiber-rich', 'meal-plan'],
    aliases: ['kenyér', 'paine integrala', 'bread'],
    stores: [
      ['Kaufland', 'K-Classic', 5.49],
      ['Lidl', 'Lidl', 4.99],
      ['Carrefour', 'Carrefour', 5.99],
      ['Auchan', 'Auchan', 5.29],
      ['Penny', 'Penny', 4.49],
      ['Profi', 'Profi', 5.79],
    ],
  },
  // Pasta
  {
    baseName: 'Tészta penne',
    category: 'Gabona',
    image: '🍝',
    unit: 'g',
    defaultQuantity: 500,
    caloriesPer100: 348,
    protein: 13.0,
    carbs: 72.0,
    fat: 2.0,
    tags: ['meal-plan'],
    aliases: ['tészta', 'penne', 'paste', 'pasta'],
    stores: [
      ['Kaufland', 'Barilla', 7.99],
      ['Lidl', 'Combino', 4.49],
      ['Carrefour', 'Barilla', 8.49],
      ['Auchan', 'De Cecco', 9.99],
      ['Penny', 'Penny', 3.99],
      ['Profi', 'Baneasa', 4.99],
    ],
  },
  // Whole wheat pasta
  {
    baseName: 'Tészta teljes kiőrlésű spagetti',
    category: 'Gabona',
    image: '🍝',
    unit: 'g',
    defaultQuantity: 500,
    caloriesPer100: 348,
    protein: 14.5,
    carbs: 65.0,
    fat: 2.5,
    tags: ['whole-grain', 'fiber-rich', 'meal-plan', 'clean-eating'],
    aliases: ['spagetti', 'teljes kiőrlésű tészta', 'spaghetti integrale'],
    stores: [
      ['Kaufland', 'Barilla Integrale', 9.49],
      ['Carrefour', 'Barilla Integrale', 9.99],
      ['Auchan', 'Auchan Bio', 8.99],
      ['Lidl', 'Combino Bio', 6.99],
    ],
  },
  // Potato
  {
    baseName: 'Burgonya fehér',
    category: 'Gabona',
    image: '🥔',
    unit: 'kg',
    defaultQuantity: 2,
    caloriesPer100: 77,
    protein: 2.0,
    carbs: 17.5,
    fat: 0.1,
    tags: ['meal-plan'],
    aliases: ['burgonya', 'krumpli', 'cartofi', 'potato'],
    stores: [
      ['Kaufland', 'Kaufland', 3.99],
      ['Lidl', 'Lidl', 3.49],
      ['Carrefour', 'Carrefour', 4.49],
      ['Auchan', 'Auchan', 3.79],
      ['Penny', 'Penny', 2.99],
      ['Profi', 'Profi', 3.99],
    ],
  },
  // Sweet potato
  {
    baseName: 'Édesburgonya',
    category: 'Gabona',
    image: '🍠',
    unit: 'kg',
    defaultQuantity: 1,
    caloriesPer100: 86,
    protein: 1.6,
    carbs: 20.1,
    fat: 0.1,
    tags: ['fiber-rich', 'vitamin-rich', 'meal-plan', 'clean-eating'],
    aliases: ['édesburgonya', 'cartof dulce', 'sweet potato'],
    stores: [
      ['Kaufland', 'Kaufland', 8.99],
      ['Lidl', 'Lidl', 7.99],
      ['Carrefour', 'Carrefour', 9.99],
      ['Auchan', 'Auchan', 8.49],
      ['Penny', 'Penny', 7.49],
    ],
  },
  // Quinoa
  {
    baseName: 'Quinoa fehér',
    category: 'Gabona',
    image: '🌾',
    unit: 'g',
    defaultQuantity: 400,
    caloriesPer100: 120,
    protein: 4.4,
    carbs: 21.3,
    fat: 1.9,
    tags: ['high-protein', 'whole-grain', 'fiber-rich', 'clean-eating'],
    aliases: ['quinoa', 'kinoa'],
    stores: [
      ['Kaufland', 'K-Classic', 14.99],
      ['Carrefour', 'Carrefour Bio', 16.99],
      ['Auchan', 'Auchan Bio', 15.49],
      ['Lidl', 'Golden Sun', 12.99],
    ],
  },

  // ════════════ DIÓFÉLÉK & MAGVAK / NUTS & SEEDS ════════════

  // Almonds
  {
    baseName: 'Mandula natúr',
    category: 'Diófélék',
    image: '🥜',
    unit: 'g',
    defaultQuantity: 200,
    caloriesPer100: 579,
    protein: 21.2,
    carbs: 21.6,
    fat: 49.9,
    tags: ['high-protein', 'keto-friendly', 'omega-3', 'meal-plan'],
    aliases: ['mandula', 'migdale', 'almonds'],
    stores: [
      ['Kaufland', 'K-Classic', 19.99],
      ['Lidl', 'Alesto', 17.99],
      ['Carrefour', 'Carrefour', 21.99],
      ['Auchan', 'Auchan', 18.99],
      ['Penny', 'Penny', 16.99],
    ],
  },
  // Walnuts
  {
    baseName: 'Dió román',
    category: 'Diófélék',
    image: '🌰',
    unit: 'g',
    defaultQuantity: 200,
    caloriesPer100: 654,
    protein: 15.2,
    carbs: 13.7,
    fat: 65.2,
    tags: ['omega-3', 'keto-friendly', 'meal-plan'],
    aliases: ['dió', 'nuci', 'walnuts'],
    stores: [
      ['Kaufland', 'K-Classic', 18.99],
      ['Lidl', 'Alesto', 16.99],
      ['Carrefour', 'Carrefour', 19.99],
      ['Penny', 'Penny', 15.99],
      ['Profi', 'Profi', 17.99],
    ],
  },
  // Peanut butter
  {
    baseName: 'Mogyoróvaj crunchy',
    category: 'Diófélék',
    image: '🥜',
    unit: 'g',
    defaultQuantity: 350,
    caloriesPer100: 588,
    protein: 25.0,
    carbs: 20.0,
    fat: 50.0,
    tags: ['high-protein', 'keto-friendly'],
    aliases: ['mogyoróvaj', 'unt de arahide', 'peanut butter'],
    stores: [
      ['Kaufland', 'K-Classic', 14.99],
      ['Lidl', 'Pilos', 12.99],
      ['Carrefour', 'Carrefour', 15.99],
      ['Auchan', 'Auchan', 13.99],
    ],
  },
  // Chia seeds
  {
    baseName: 'Chia mag bio',
    category: 'Diófélék',
    image: '🌱',
    unit: 'g',
    defaultQuantity: 250,
    caloriesPer100: 486,
    protein: 16.5,
    carbs: 42.1,
    fat: 30.7,
    tags: ['omega-3', 'fiber-rich', 'high-protein', 'clean-eating', 'meal-plan'],
    aliases: ['chia', 'chia mag', 'seminte de chia'],
    stores: [
      ['Kaufland', 'K-Bio', 14.99],
      ['Lidl', 'Biotrend', 12.99],
      ['Carrefour', 'Carrefour Bio', 16.49],
      ['Auchan', 'Auchan Bio', 13.99],
    ],
  },
  // Sunflower seeds
  {
    baseName: 'Napraforgómag hántolt',
    category: 'Diófélék',
    image: '🌻',
    unit: 'g',
    defaultQuantity: 250,
    caloriesPer100: 584,
    protein: 20.8,
    carbs: 20.0,
    fat: 51.5,
    tags: ['high-protein', 'omega-3'],
    aliases: ['napraforgómag', 'seminte de floarea soarelui', 'sunflower seeds'],
    stores: [
      ['Kaufland', 'K-Classic', 7.99],
      ['Lidl', 'Alesto', 6.99],
      ['Penny', 'Penny', 5.99],
      ['Profi', 'Profi', 7.49],
    ],
  },
  // Flax seeds
  {
    baseName: 'Lenmag őrölt',
    category: 'Diófélék',
    image: '🌾',
    unit: 'g',
    defaultQuantity: 250,
    caloriesPer100: 534,
    protein: 18.3,
    carbs: 28.9,
    fat: 42.2,
    tags: ['omega-3', 'fiber-rich', 'clean-eating', 'meal-plan'],
    aliases: ['lenmag', 'seminte de in', 'flax seeds'],
    stores: [
      ['Kaufland', 'K-Bio', 6.99],
      ['Lidl', 'Biotrend', 5.99],
      ['Carrefour', 'Carrefour Bio', 7.99],
      ['Auchan', 'Auchan Bio', 6.49],
    ],
  },

  // ════════════ OLAJOK & FŰSZEREK / OILS & CONDIMENTS ════════════

  // Olive oil
  {
    baseName: 'Olívaolaj extra szűz',
    category: 'Olaj & Fűszer',
    image: '🫒',
    unit: 'ml',
    defaultQuantity: 500,
    caloriesPer100: 884,
    protein: 0,
    carbs: 0,
    fat: 100.0,
    tags: ['omega-3', 'meal-plan', 'clean-eating'],
    aliases: ['olívaolaj', 'ulei de masline', 'olive oil'],
    stores: [
      ['Kaufland', 'K-Classic', 22.99],
      ['Lidl', 'Primadonna', 19.99],
      ['Carrefour', 'Carrefour', 24.99],
      ['Auchan', 'Auchan', 21.99],
      ['Penny', 'Penny', 18.99],
    ],
  },
  // Coconut oil
  {
    baseName: 'Kókuszolaj bio',
    category: 'Olaj & Fűszer',
    image: '🥥',
    unit: 'ml',
    defaultQuantity: 500,
    caloriesPer100: 862,
    protein: 0,
    carbs: 0,
    fat: 100.0,
    tags: ['keto-friendly', 'clean-eating'],
    aliases: ['kókuszolaj', 'ulei de cocos', 'coconut oil'],
    stores: [
      ['Kaufland', 'K-Bio', 24.99],
      ['Carrefour', 'Carrefour Bio', 27.99],
      ['Auchan', 'Auchan Bio', 25.99],
      ['Lidl', 'Biotrend', 22.99],
    ],
  },
  // Sunflower oil
  {
    baseName: 'Napraforgó olaj',
    category: 'Olaj & Fűszer',
    image: '🌻',
    unit: 'l',
    defaultQuantity: 1,
    caloriesPer100: 884,
    protein: 0,
    carbs: 0,
    fat: 100.0,
    tags: [],
    aliases: ['napraforgó olaj', 'ulei de floarea soarelui', 'sunflower oil'],
    stores: [
      ['Kaufland', 'Floriol', 8.99],
      ['Lidl', 'Lidl', 7.99],
      ['Carrefour', 'Carrefour', 9.49],
      ['Auchan', 'Bunica', 8.49],
      ['Penny', 'Penny', 7.49],
      ['Profi', 'Floriol', 8.99],
    ],
  },
  // Butter
  {
    baseName: 'Vaj 82%',
    category: 'Olaj & Fűszer',
    image: '🧈',
    unit: 'g',
    defaultQuantity: 200,
    caloriesPer100: 717,
    protein: 0.9,
    carbs: 0.1,
    fat: 82.0,
    tags: ['keto-friendly', 'meal-plan'],
    aliases: ['vaj', 'unt', 'butter'],
    stores: [
      ['Kaufland', 'Lurpak', 13.49],
      ['Lidl', 'Milbona', 10.99],
      ['Carrefour', 'Président', 14.99],
      ['Auchan', 'Lurpak', 12.99],
      ['Penny', 'Penny', 9.99],
      ['Profi', 'Zuzu', 11.49],
    ],
  },
  // Honey
  {
    baseName: 'Méz akác természetes',
    category: 'Olaj & Fűszer',
    image: '🍯',
    unit: 'g',
    defaultQuantity: 400,
    caloriesPer100: 304,
    protein: 0.3,
    carbs: 82.4,
    fat: 0,
    tags: ['meal-plan'],
    aliases: ['méz', 'miere', 'honey'],
    stores: [
      ['Kaufland', 'Apidava', 16.99],
      ['Lidl', 'Belvida', 14.99],
      ['Carrefour', 'Apidava', 18.99],
      ['Penny', 'Penny', 12.99],
      ['Profi', 'Apidava', 17.49],
    ],
  },
  // Hummus
  {
    baseName: 'Humusz natúr',
    category: 'Olaj & Fűszer',
    image: '🥙',
    unit: 'g',
    defaultQuantity: 200,
    caloriesPer100: 166,
    protein: 8.0,
    carbs: 14.3,
    fat: 9.6,
    tags: ['fiber-rich', 'meal-plan'],
    aliases: ['humusz', 'humus', 'hummus'],
    stores: [
      ['Kaufland', 'K-Take it Veggie', 7.99],
      ['Carrefour', 'Carrefour', 8.99],
      ['Auchan', 'Auchan', 7.49],
      ['Lidl', 'Eridanous', 6.99],
    ],
  },
  // Mustard
  {
    baseName: 'Mustár klasszikus',
    category: 'Olaj & Fűszer',
    image: '🟡',
    unit: 'g',
    defaultQuantity: 280,
    caloriesPer100: 66,
    protein: 4.4,
    carbs: 5.3,
    fat: 3.4,
    tags: ['low-calorie'],
    aliases: ['mustár', 'mustar', 'mustard'],
    stores: [
      ['Kaufland', 'K-Classic', 3.99],
      ['Lidl', 'Kania', 2.99],
      ['Penny', 'Penny', 2.49],
      ['Profi', 'Olympia', 3.49],
    ],
  },

  // ════════════ ITALOK / BEVERAGES ════════════

  // Water
  {
    baseName: 'Ásványvíz Dorna 2L',
    category: 'Ital',
    image: '💧',
    unit: 'l',
    defaultQuantity: 2,
    caloriesPer100: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    tags: ['sugar-free'],
    aliases: ['víz', 'apa', 'water', 'dorna'],
    stores: [
      ['Kaufland', 'Dorna', 3.99],
      ['Lidl', 'Dorna', 3.79],
      ['Carrefour', 'Dorna', 4.29],
      ['Auchan', 'Dorna', 3.89],
      ['Penny', 'Dorna', 3.49],
      ['Profi', 'Dorna', 4.49],
    ],
  },
  // Borsec
  {
    baseName: 'Ásványvíz Borsec szénsavas 1.5L',
    category: 'Ital',
    image: '💧',
    unit: 'l',
    defaultQuantity: 1.5,
    caloriesPer100: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    tags: ['sugar-free'],
    aliases: ['borsec', 'apa minerala', 'sparkling water'],
    stores: [
      ['Kaufland', 'Borsec', 4.49],
      ['Lidl', 'Borsec', 4.29],
      ['Carrefour', 'Borsec', 4.79],
      ['Penny', 'Borsec', 3.99],
      ['Profi', 'Borsec', 4.69],
    ],
  },
  // Green tea
  {
    baseName: 'Zöld tea natúr',
    category: 'Ital',
    image: '🍵',
    unit: 'db',
    defaultQuantity: 20,
    caloriesPer100: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    tags: ['sugar-free', 'antioxidant', 'meal-plan'],
    aliases: ['zöld tea', 'ceai verde', 'green tea'],
    stores: [
      ['Kaufland', 'K-Classic', 5.99],
      ['Lidl', 'Lord Nelson', 4.49],
      ['Carrefour', 'Twinings', 8.99],
      ['Penny', 'Penny', 3.99],
      ['Profi', 'Lipton', 7.49],
    ],
  },
  // Black coffee
  {
    baseName: 'Kávé őrölt 100% arabica',
    category: 'Ital',
    image: '☕',
    unit: 'g',
    defaultQuantity: 250,
    caloriesPer100: 2,
    protein: 0.1,
    carbs: 0,
    fat: 0,
    tags: ['sugar-free', 'meal-plan'],
    aliases: ['kávé', 'cafea', 'coffee'],
    stores: [
      ['Kaufland', 'Tchibo', 19.99],
      ['Lidl', 'Bellarom', 14.99],
      ['Carrefour', 'Lavazza', 24.99],
      ['Auchan', 'Julius Meinl', 22.99],
      ['Penny', 'Penny', 12.99],
    ],
  },

  // ════════════ ÉDESÍTŐK & SNACKEK / SWEETS & SNACKS ════════════

  // Dark chocolate
  {
    baseName: 'Étcsokoládé 70%',
    category: 'Édesség',
    image: '🍫',
    unit: 'g',
    defaultQuantity: 100,
    caloriesPer100: 546,
    protein: 7.8,
    carbs: 24.0,
    fat: 42.0,
    tags: ['antioxidant'],
    aliases: ['étcsoki', 'ciocolata neagra', 'dark chocolate'],
    stores: [
      ['Kaufland', 'K-Classic', 5.49],
      ['Lidl', 'Fin Carré', 4.99],
      ['Carrefour', 'Lindt', 12.99],
      ['Auchan', 'Auchan', 5.99],
      ['Penny', 'Penny', 3.99],
    ],
  },
  // Rice cakes
  {
    baseName: 'Puffasztott rizs szelet',
    category: 'Édesség',
    image: '🍘',
    unit: 'g',
    defaultQuantity: 130,
    caloriesPer100: 387,
    protein: 7.1,
    carbs: 82.0,
    fat: 2.8,
    tags: ['low-fat', 'sugar-free', 'meal-plan'],
    aliases: ['rizs szelet', 'orez expandat', 'rice cakes'],
    stores: [
      ['Kaufland', 'K-Classic', 4.49],
      ['Lidl', 'Sondey', 3.99],
      ['Carrefour', 'Carrefour', 5.49],
      ['Penny', 'Penny', 3.49],
      ['Profi', 'Profi', 4.79],
    ],
  },

  // ════════════ HÜVELYESEK / LEGUMES ════════════

  // Red lentils
  {
    baseName: 'Vörös lencse',
    category: 'Hüvelyes',
    image: '🫘',
    unit: 'g',
    defaultQuantity: 500,
    caloriesPer100: 116,
    protein: 9.0,
    carbs: 20.1,
    fat: 0.4,
    tags: ['high-protein', 'fiber-rich', 'meal-plan', 'clean-eating'],
    aliases: ['lencse', 'linte', 'lentils'],
    stores: [
      ['Kaufland', 'K-Classic', 6.99],
      ['Lidl', 'Golden Sun', 5.99],
      ['Carrefour', 'Carrefour Bio', 8.49],
      ['Auchan', 'Auchan', 6.49],
      ['Penny', 'Penny', 5.49],
    ],
  },
  // Chickpeas
  {
    baseName: 'Csicseriborsó konzerv',
    category: 'Hüvelyes',
    image: '🫘',
    unit: 'g',
    defaultQuantity: 400,
    caloriesPer100: 119,
    protein: 8.9,
    carbs: 27.4,
    fat: 2.6,
    tags: ['high-protein', 'fiber-rich', 'meal-plan', 'clean-eating'],
    aliases: ['csicseriborsó', 'naut', 'chickpeas'],
    stores: [
      ['Kaufland', 'K-Classic', 4.49],
      ['Lidl', 'Freshona', 3.99],
      ['Carrefour', 'Bonduelle', 5.99],
      ['Auchan', 'Auchan', 4.29],
      ['Penny', 'Penny', 3.49],
    ],
  },
  // Kidney beans
  {
    baseName: 'Vörösbab konzerv',
    category: 'Hüvelyes',
    image: '🫘',
    unit: 'g',
    defaultQuantity: 400,
    caloriesPer100: 127,
    protein: 8.7,
    carbs: 22.8,
    fat: 0.5,
    tags: ['high-protein', 'fiber-rich'],
    aliases: ['vörösbab', 'bab', 'fasole rosie', 'kidney beans'],
    stores: [
      ['Kaufland', 'K-Classic', 3.99],
      ['Lidl', 'Freshona', 3.49],
      ['Carrefour', 'Bonduelle', 5.49],
      ['Penny', 'Penny', 2.99],
      ['Profi', 'Olympia', 3.79],
    ],
  },

  // ════════════ CANNED & PREPARED / KONZERV ════════════

  // Canned tomato
  {
    baseName: 'Paradicsompasszáta',
    category: 'Konzerv',
    image: '🍅',
    unit: 'g',
    defaultQuantity: 680,
    caloriesPer100: 32,
    protein: 1.6,
    carbs: 5.6,
    fat: 0.2,
    tags: ['low-calorie', 'meal-plan'],
    aliases: ['passata', 'paradicsomszósz', 'sos de rosii', 'tomato sauce'],
    stores: [
      ['Kaufland', 'K-Classic', 5.49],
      ['Lidl', 'Freshona', 4.49],
      ['Carrefour', 'Mutti', 7.99],
      ['Auchan', 'Auchan', 4.99],
      ['Penny', 'Penny', 3.99],
    ],
  },
  // Canned tuna in olive oil
  {
    baseName: 'Tonhal konzerv olívás',
    category: 'Konzerv',
    image: '🥫',
    unit: 'g',
    defaultQuantity: 160,
    caloriesPer100: 198,
    protein: 23.0,
    carbs: 0,
    fat: 12.0,
    tags: ['high-protein', 'omega-3'],
    aliases: ['tonhal olívás', 'ton in ulei de masline'],
    stores: [
      ['Kaufland', 'Rio Mare', 11.99],
      ['Lidl', 'Nixe', 8.99],
      ['Carrefour', 'Rio Mare', 12.49],
      ['Auchan', 'Rio Mare', 11.49],
      ['Penny', 'Penny', 7.99],
    ],
  },
];

// ═══════════════════════════════════════════════
// Generate the flat product database from multi-store definitions
// ═══════════════════════════════════════════════
export const productDatabase: Product[] = multiStoreProducts.flatMap(generateMultiStore);

// ═══════════════════════════════════════════════
// SEARCH & PRIORITIZATION ENGINE
// ═══════════════════════════════════════════════

export interface UserDietProfile {
  goal: string;        // "Fogyás" | "Súlygyarapodás" | "Szinttartás"
  allergies: string;
  dietaryPreferences: string;
  calorieTarget?: number;
}

/** Load the user's diet profile from IndexedDB (async). Call from component with useEffect or use async wrapper. */
export async function loadUserDietProfileAsync(): Promise<UserDietProfile> {
  try {
    const { getSetting } = await import('../backend/services/SettingsService');
    const raw = await getSetting('userProfile');
    if (raw) {
      const p = JSON.parse(raw);
      return {
        goal: p.goal || 'Fogyás',
        allergies: p.allergies || 'Nincs',
        dietaryPreferences: p.dietaryPreferences || 'Nincs megkötés',
        calorieTarget: p.calorieTarget,
      };
    }
  } catch { /* fallback */ }
  return { goal: 'Fogyás', allergies: 'Nincs', dietaryPreferences: 'Nincs megkötés' };
}

/** Sync wrapper: returns default until async load completes. Prefer loadUserDietProfileAsync in React. */
export function loadUserDietProfile(): UserDietProfile {
  return { goal: 'Fogyás', allergies: 'Nincs', dietaryPreferences: 'Nincs megkötés' };
}

/** Priority tags based on diet goal */
function getPriorityTagsForGoal(goal: string): DietTag[] {
  switch (goal) {
    case 'Fogyás':
      return ['meal-plan', 'high-protein', 'low-calorie', 'low-fat', 'low-carb', 'fiber-rich', 'clean-eating', 'whole-grain', 'sugar-free'];
    case 'Súlygyarapodás':
      return ['meal-plan', 'high-protein', 'post-workout', 'whole-grain', 'omega-3'];
    case 'Szinttartás':
      return ['meal-plan', 'clean-eating', 'fiber-rich', 'vitamin-rich', 'whole-grain'];
    default:
      return ['meal-plan'];
  }
}

/** Score a product based on how well it fits the user's diet */
function scoreDietFit(product: Product, profile: UserDietProfile): number {
  const priorityTags = getPriorityTagsForGoal(profile.goal);
  let score = 0;

  // Bonus for each matching priority tag (earlier tags = higher weight)
  priorityTags.forEach((tag, idx) => {
    if (product.tags.includes(tag)) {
      score += (priorityTags.length - idx) * 10; // 90, 80, 70, ...
    }
  });

  // Extra bonus for meal-plan items
  if (product.tags.includes('meal-plan')) {
    score += 100;
  }

  // For "Fogyás" goal, penalize high-calorie items
  if (profile.goal === 'Fogyás') {
    if (product.caloriesPer100 > 400) score -= 30;
    if (product.caloriesPer100 < 100) score += 20;
    // Bonus for high protein-to-calorie ratio
    if (product.protein > 15 && product.caloriesPer100 < 200) score += 40;
  }

  // For "Súlygyarapodás", bonus for calorie-dense, high protein
  if (profile.goal === 'Súlygyarapodás') {
    if (product.protein > 20) score += 30;
    if (product.caloriesPer100 > 300 && product.protein > 15) score += 20;
  }

  return score;
}

/**
 * Smart product search with diet-based prioritization.
 * Returns products from ALL stores matching the query,
 * sorted by diet compatibility first, then price.
 */
export function searchProducts(query: string, category?: string, profile?: UserDietProfile): Product[] {
  const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

  if (!searchTerms.length && !category) {
    // No query → return popular/recommended items
    const p = profile || loadUserDietProfile();
    return [...productDatabase]
      .sort((a, b) => scoreDietFit(b, p) - scoreDietFit(a, p))
      .slice(0, 24);
  }

  // Match products: check name, brand, category, store, AND aliases
  const matched = productDatabase.filter((product) => {
    if (category && product.category !== category) return false;
    if (!searchTerms.length) return true;

    const searchableText = [
      product.name,
      product.brand,
      product.category,
      product.store,
      ...(product.aliases || []),
    ].join(' ').toLowerCase();

    return searchTerms.some(term => searchableText.includes(term));
  });

  // Sort: diet-fit score DESC, then price ASC within same score tier
  const p = profile || loadUserDietProfile();
  return matched.sort((a, b) => {
    const scoreA = scoreDietFit(a, p);
    const scoreB = scoreDietFit(b, p);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.price - b.price; // cheapest first within same diet-fit tier
  });
}

// Calculate nutrition for a given quantity
export function calculateNutrition(product: Product, quantity: number) {
  let baseQuantity = quantity;
  if (product.unit === 'kg' || product.unit === 'l') {
    baseQuantity = quantity * 1000;
  }
  if (product.unit === 'db') {
    baseQuantity = quantity * 60; // approximate grams per piece
  }

  const multiplier = baseQuantity / 100;

  return {
    calories: Math.round(product.caloriesPer100 * multiplier),
    protein: Math.round(product.protein * multiplier * 10) / 10,
    carbs: Math.round(product.carbs * multiplier * 10) / 10,
    fat: Math.round(product.fat * multiplier * 10) / 10,
  };
}

// Get available stores that carry items from the shopping list
export function getStoresForItems(productIds: string[]): (StoreInfo & { matchCount: number; matchPercent: number; estimatedTotal: number })[] {
  const storeMap = new Map<StoreName, { count: number; total: number }>();

  productIds.forEach((id) => {
    const product = productDatabase.find((p) => p.id === id);
    if (product) {
      const existing = storeMap.get(product.store) || { count: 0, total: 0 };
      existing.count++;
      existing.total += product.price;
      storeMap.set(product.store, existing);
    }
  });

  return localStores
    .map((store) => {
      const data = storeMap.get(store.name) || { count: 0, total: 0 };
      const matchableFromList = productIds.filter((id) => {
        const product = productDatabase.find((p) => p.id === id);
        return product?.store === store.name;
      });
      return {
        ...store,
        matchCount: matchableFromList.length,
        matchPercent: productIds.length > 0 ? Math.round((matchableFromList.length / productIds.length) * 100) : 0,
        estimatedTotal: Math.round(data.total * 100) / 100,
      };
    })
    .sort((a, b) => b.matchCount - a.matchCount);
}
