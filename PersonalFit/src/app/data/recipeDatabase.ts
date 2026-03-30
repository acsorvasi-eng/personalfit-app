// Hungarian traditional recipes database with ingredient breakdown
export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: 'g' | 'ml' | 'db';
  caloriesPer100: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  id: string;
  name: string;
  portionSize: number; // in grams
  servings: number;
  image: string;
  category: 'Főétel' | 'Leves' | 'Desszert' | 'Saláta' | 'Előétel';
  ingredients: RecipeIngredient[];
  /** Search aliases for diacritics-free & multilingual matching */
  aliases?: string[];
  /** Cooking method tag for variant grouping */
  cookingMethod?: string;
  /** Group ID — links variants of the same base food */
  variantGroup?: string;
  /** Is this a meal-plan recipe? */
  isMealPlan?: boolean;
  /** Region tag */
  region?: 'erdélyi' | 'magyar' | 'román' | 'nemzetközi';
}

export const recipeDatabase: Recipe[] = [
  {
    id: 'lucskos-kaposzta',
    name: 'Lucskos káposzta csülökkel',
    portionSize: 450,
    servings: 4,
    image: '🍲',
    category: 'Főétel',
    ingredients: [
      { name: 'Sertés csülök', quantity: 400, unit: 'g', caloriesPer100: 260, protein: 18.0, carbs: 0, fat: 21.0 },
      { name: 'Savanyú káposzta', quantity: 600, unit: 'g', caloriesPer100: 19, protein: 0.9, carbs: 4.3, fat: 0.1 },
      { name: 'Szalonna', quantity: 100, unit: 'g', caloriesPer100: 670, protein: 11.0, carbs: 0, fat: 70.0 },
      { name: 'Hagyma', quantity: 100, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Paprika őrölt', quantity: 15, unit: 'g', caloriesPer100: 282, protein: 14.8, carbs: 53.9, fat: 12.9 },
      { name: 'Tejföl', quantity: 150, unit: 'g', caloriesPer100: 133, protein: 2.1, carbs: 2.8, fat: 12.5 },
      { name: 'Liszt', quantity: 30, unit: 'g', caloriesPer100: 364, protein: 10.3, carbs: 76.3, fat: 1.0 }
    ]
  },
  {
    id: 'porkolt',
    name: 'Marhapörkölt',
    portionSize: 350,
    servings: 4,
    image: '🍖',
    category: 'Főétel',
    ingredients: [
      { name: 'Marhahús', quantity: 800, unit: 'g', caloriesPer100: 250, protein: 26.0, carbs: 0, fat: 15.0 },
      { name: 'Hagyma', quantity: 300, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Paprika őrölt', quantity: 30, unit: 'g', caloriesPer100: 282, protein: 14.8, carbs: 53.9, fat: 12.9 },
      { name: 'Paradicsom', quantity: 200, unit: 'g', caloriesPer100: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      { name: 'Sertés zsír', quantity: 50, unit: 'g', caloriesPer100: 900, protein: 0, carbs: 0, fat: 100.0 },
      { name: 'Fokhagyma', quantity: 20, unit: 'g', caloriesPer100: 149, protein: 6.4, carbs: 33.1, fat: 0.5 }
    ]
  },
  {
    id: 'gulyas',
    name: 'Gulyásleves',
    portionSize: 400,
    servings: 6,
    image: '🥘',
    category: 'Leves',
    ingredients: [
      { name: 'Marhahús', quantity: 600, unit: 'g', caloriesPer100: 250, protein: 26.0, carbs: 0, fat: 15.0 },
      { name: 'Krumpli', quantity: 500, unit: 'g', caloriesPer100: 77, protein: 2.0, carbs: 17.5, fat: 0.1 },
      { name: 'Hagyma', quantity: 200, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Paprika zöldség', quantity: 300, unit: 'g', caloriesPer100: 26, protein: 0.9, carbs: 6.0, fat: 0.3 },
      { name: 'Paradicsom', quantity: 200, unit: 'g', caloriesPer100: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      { name: 'Paprika őrölt', quantity: 25, unit: 'g', caloriesPer100: 282, protein: 14.8, carbs: 53.9, fat: 12.9 },
      { name: 'Csipetke', quantity: 100, unit: 'g', caloriesPer100: 371, protein: 13.0, carbs: 75.0, fat: 1.5 }
    ]
  },
  {
    id: 'rakott-krumpli',
    name: 'Rakott krumpli',
    portionSize: 400,
    servings: 4,
    image: '🥔',
    category: 'Főétel',
    ingredients: [
      { name: 'Krumpli', quantity: 1000, unit: 'g', caloriesPer100: 77, protein: 2.0, carbs: 17.5, fat: 0.1 },
      { name: 'Tojás', quantity: 400, unit: 'g', caloriesPer100: 155, protein: 13.0, carbs: 1.1, fat: 11.0 },
      { name: 'Tejföl', quantity: 300, unit: 'g', caloriesPer100: 133, protein: 2.1, carbs: 2.8, fat: 12.5 },
      { name: 'Virsli', quantity: 400, unit: 'g', caloriesPer100: 290, protein: 12.0, carbs: 2.0, fat: 26.0 }
    ]
  },
  {
    id: 'turos-csusza',
    name: 'Túrós csusza',
    portionSize: 350,
    servings: 4,
    image: '🍝',
    category: 'Főétel',
    ingredients: [
      { name: 'Tészta', quantity: 500, unit: 'g', caloriesPer100: 348, protein: 13.0, carbs: 72.0, fat: 2.0 },
      { name: 'Túró', quantity: 400, unit: 'g', caloriesPer100: 156, protein: 16.7, carbs: 3.2, fat: 9.0 },
      { name: 'Tejföl', quantity: 200, unit: 'g', caloriesPer100: 133, protein: 2.1, carbs: 2.8, fat: 12.5 },
      { name: 'Szalonna', quantity: 150, unit: 'g', caloriesPer100: 670, protein: 11.0, carbs: 0, fat: 70.0 }
    ]
  },
  {
    id: 'csirke-paprikas',
    name: 'Csirkepaprikás',
    portionSize: 380,
    servings: 4,
    image: '🍗',
    category: 'Főétel',
    ingredients: [
      { name: 'Csirkecomb', quantity: 800, unit: 'g', caloriesPer100: 211, protein: 18.0, carbs: 0, fat: 15.0 },
      { name: 'Hagyma', quantity: 150, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Paprika őrölt', quantity: 20, unit: 'g', caloriesPer100: 282, protein: 14.8, carbs: 53.9, fat: 12.9 },
      { name: 'Tejföl', quantity: 300, unit: 'g', caloriesPer100: 133, protein: 2.1, carbs: 2.8, fat: 12.5 },
      { name: 'Paradicsom', quantity: 150, unit: 'g', caloriesPer100: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      { name: 'Liszt', quantity: 30, unit: 'g', caloriesPer100: 364, protein: 10.3, carbs: 76.3, fat: 1.0 }
    ]
  },
  {
    id: 'hazi-pizza',
    name: 'Házi pizza',
    portionSize: 300,
    servings: 4,
    image: '🍕',
    category: 'Főétel',
    ingredients: [
      { name: 'Pizza tészta', quantity: 400, unit: 'g', caloriesPer100: 266, protein: 8.8, carbs: 51.0, fat: 3.3 },
      { name: 'Paradicsomszósz', quantity: 200, unit: 'g', caloriesPer100: 29, protein: 1.2, carbs: 6.7, fat: 0.2 },
      { name: 'Mozzarella', quantity: 300, unit: 'g', caloriesPer100: 280, protein: 22.0, carbs: 3.0, fat: 21.0 },
      { name: 'Sonka', quantity: 200, unit: 'g', caloriesPer100: 145, protein: 21.0, carbs: 1.0, fat: 6.0 },
      { name: 'Gomba', quantity: 100, unit: 'g', caloriesPer100: 22, protein: 3.1, carbs: 3.3, fat: 0.3 }
    ]
  },
  {
    id: 'reszelt-teszta',
    name: 'Reszelt tészta',
    portionSize: 300,
    servings: 4,
    image: '🍜',
    category: 'Főétel',
    ingredients: [
      { name: 'Liszt', quantity: 500, unit: 'g', caloriesPer100: 364, protein: 10.3, carbs: 76.3, fat: 1.0 },
      { name: 'Tojás', quantity: 200, unit: 'g', caloriesPer100: 155, protein: 13.0, carbs: 1.1, fat: 11.0 },
      { name: 'Cukor', quantity: 80, unit: 'g', caloriesPer100: 387, protein: 0, carbs: 99.8, fat: 0 },
      { name: 'Vaj', quantity: 50, unit: 'g', caloriesPer100: 717, protein: 0.9, carbs: 0.1, fat: 81.0 },
      { name: 'Dió', quantity: 100, unit: 'g', caloriesPer100: 654, protein: 15.2, carbs: 13.7, fat: 65.2 }
    ]
  },
  {
    id: 'tojasos-nokedli',
    name: 'Tojásos nokedli',
    portionSize: 320,
    servings: 4,
    image: '🥚',
    category: 'Főétel',
    ingredients: [
      { name: 'Nokedli tészta', quantity: 500, unit: 'g', caloriesPer100: 348, protein: 13.0, carbs: 72.0, fat: 2.0 },
      { name: 'Tojás', quantity: 300, unit: 'g', caloriesPer100: 155, protein: 13.0, carbs: 1.1, fat: 11.0 },
      { name: 'Vaj', quantity: 80, unit: 'g', caloriesPer100: 717, protein: 0.9, carbs: 0.1, fat: 81.0 }
    ]
  },
  {
    id: 'halaszle',
    name: 'Halászlé',
    portionSize: 400,
    servings: 4,
    image: '🐟',
    category: 'Leves',
    ingredients: [
      { name: 'Ponty', quantity: 800, unit: 'g', caloriesPer100: 127, protein: 17.8, carbs: 0, fat: 5.6 },
      { name: 'Hagyma', quantity: 300, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Paprika őrölt', quantity: 30, unit: 'g', caloriesPer100: 282, protein: 14.8, carbs: 53.9, fat: 12.9 },
      { name: 'Paradicsom', quantity: 200, unit: 'g', caloriesPer100: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      { name: 'Paprika zöldség', quantity: 200, unit: 'g', caloriesPer100: 26, protein: 0.9, carbs: 6.0, fat: 0.3 }
    ]
  },
  {
    id: 'csirke-salata',
    name: 'Csirkés saláta',
    portionSize: 350,
    servings: 2,
    image: '🥗',
    category: 'Saláta',
    ingredients: [
      { name: 'Csirkemell', quantity: 300, unit: 'g', caloriesPer100: 165, protein: 31.0, carbs: 0, fat: 3.6 },
      { name: 'Jégsaláta', quantity: 200, unit: 'g', caloriesPer100: 14, protein: 0.9, carbs: 2.9, fat: 0.1 },
      { name: 'Paradicsom', quantity: 150, unit: 'g', caloriesPer100: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      { name: 'Uborka', quantity: 100, unit: 'g', caloriesPer100: 16, protein: 0.7, carbs: 3.6, fat: 0.1 },
      { name: 'Olívaolaj', quantity: 30, unit: 'ml', caloriesPer100: 884, protein: 0, carbs: 0, fat: 100.0 },
      { name: 'Avokádó', quantity: 100, unit: 'g', caloriesPer100: 160, protein: 2.0, carbs: 8.5, fat: 14.7 }
    ]
  },
  {
    id: 'palacsinta',
    name: 'Palacsinta',
    portionSize: 280,
    servings: 4,
    image: '🥞',
    category: 'Desszert',
    ingredients: [
      { name: 'Liszt', quantity: 300, unit: 'g', caloriesPer100: 364, protein: 10.3, carbs: 76.3, fat: 1.0 },
      { name: 'Tej', quantity: 500, unit: 'ml', caloriesPer100: 42, protein: 3.4, carbs: 5.0, fat: 1.0 },
      { name: 'Tojás', quantity: 200, unit: 'g', caloriesPer100: 155, protein: 13.0, carbs: 1.1, fat: 11.0 },
      { name: 'Cukor', quantity: 50, unit: 'g', caloriesPer100: 387, protein: 0, carbs: 99.8, fat: 0 },
      { name: 'Lekvár', quantity: 200, unit: 'g', caloriesPer100: 278, protein: 0.4, carbs: 69.0, fat: 0.1 }
    ]
  },
  // Additional traditional Hungarian recipes
  {
    id: 'babgulyas',
    name: 'Babgulyás',
    portionSize: 400,
    servings: 6,
    image: '🫘',
    category: 'Leves',
    ingredients: [
      { name: 'Bab', quantity: 400, unit: 'g', caloriesPer100: 127, protein: 8.7, carbs: 22.8, fat: 0.5 },
      { name: 'Csípős kolbász', quantity: 300, unit: 'g', caloriesPer100: 325, protein: 13.0, carbs: 3.0, fat: 29.0 },
      { name: 'Krumpli', quantity: 400, unit: 'g', caloriesPer100: 77, protein: 2.0, carbs: 17.5, fat: 0.1 },
      { name: 'Hagyma', quantity: 150, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Paprika őrölt', quantity: 20, unit: 'g', caloriesPer100: 282, protein: 14.8, carbs: 53.9, fat: 12.9 },
      { name: 'Paradicsom', quantity: 150, unit: 'g', caloriesPer100: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      { name: 'Tárkony', quantity: 10, unit: 'g', caloriesPer100: 295, protein: 22.8, carbs: 50.2, fat: 7.2 }
    ]
  },
  {
    id: 'zoldborsoleves',
    name: 'Zöldborsóleves',
    portionSize: 350,
    servings: 4,
    image: '🟢',
    category: 'Leves',
    ingredients: [
      { name: 'Zöldborsó', quantity: 500, unit: 'g', caloriesPer100: 81, protein: 5.4, carbs: 14.5, fat: 0.4 },
      { name: 'Sárgarépa', quantity: 150, unit: 'g', caloriesPer100: 41, protein: 0.9, carbs: 9.6, fat: 0.2 },
      { name: 'Krumpli', quantity: 200, unit: 'g', caloriesPer100: 77, protein: 2.0, carbs: 17.5, fat: 0.1 },
      { name: 'Tejföl', quantity: 150, unit: 'g', caloriesPer100: 133, protein: 2.1, carbs: 2.8, fat: 12.5 },
      { name: 'Liszt', quantity: 30, unit: 'g', caloriesPer100: 364, protein: 10.3, carbs: 76.3, fat: 1.0 }
    ]
  },
  {
    id: 'gombaleves',
    name: 'Gombaleves',
    portionSize: 350,
    servings: 4,
    image: '🍄',
    category: 'Leves',
    ingredients: [
      { name: 'Csiperkegomba', quantity: 500, unit: 'g', caloriesPer100: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },
      { name: 'Hagyma', quantity: 100, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Tejföl', quantity: 200, unit: 'g', caloriesPer100: 133, protein: 2.1, carbs: 2.8, fat: 12.5 },
      { name: 'Liszt', quantity: 30, unit: 'g', caloriesPer100: 364, protein: 10.3, carbs: 76.3, fat: 1.0 },
      { name: 'Vaj', quantity: 50, unit: 'g', caloriesPer100: 717, protein: 0.9, carbs: 0.1, fat: 81.0 }
    ]
  },
  {
    id: 'bableves',
    name: 'Bableves',
    portionSize: 400,
    servings: 6,
    image: '🥘',
    category: 'Leves',
    ingredients: [
      { name: 'Bab száraz', quantity: 300, unit: 'g', caloriesPer100: 333, protein: 21.0, carbs: 60.0, fat: 1.2 },
      { name: 'Füstölt csülök', quantity: 400, unit: 'g', caloriesPer100: 260, protein: 18.0, carbs: 0, fat: 21.0 },
      { name: 'Hagyma', quantity: 100, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Sárgarépa', quantity: 150, unit: 'g', caloriesPer100: 41, protein: 0.9, carbs: 9.6, fat: 0.2 },
      { name: 'Tárkony', quantity: 10, unit: 'g', caloriesPer100: 295, protein: 22.8, carbs: 50.2, fat: 7.2 }
    ]
  },
  {
    id: 'sertesporkolt',
    name: 'Sertéspörkölt',
    portionSize: 350,
    servings: 4,
    image: '🍖',
    category: 'Főétel',
    ingredients: [
      { name: 'Sertéshús', quantity: 800, unit: 'g', caloriesPer100: 242, protein: 20.0, carbs: 0, fat: 18.0 },
      { name: 'Hagyma', quantity: 300, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Paprika őrölt', quantity: 30, unit: 'g', caloriesPer100: 282, protein: 14.8, carbs: 53.9, fat: 12.9 },
      { name: 'Paradicsom', quantity: 200, unit: 'g', caloriesPer100: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      { name: 'Sertés zsír', quantity: 50, unit: 'g', caloriesPer100: 900, protein: 0, carbs: 0, fat: 100.0 }
    ]
  },
  {
    id: 'toltott-kaposzta',
    name: 'Töltött káposzta',
    portionSize: 400,
    servings: 6,
    image: '🥬',
    category: 'Főétel',
    ingredients: [
      { name: 'Savanyú káposzta', quantity: 1000, unit: 'g', caloriesPer100: 19, protein: 0.9, carbs: 4.3, fat: 0.1 },
      { name: 'Darált hús', quantity: 600, unit: 'g', caloriesPer100: 250, protein: 26.0, carbs: 0, fat: 15.0 },
      { name: 'Rizs', quantity: 200, unit: 'g', caloriesPer100: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
      { name: 'Tojás', quantity: 100, unit: 'g', caloriesPer100: 155, protein: 13.0, carbs: 1.1, fat: 11.0 },
      { name: 'Tejföl', quantity: 300, unit: 'g', caloriesPer100: 133, protein: 2.1, carbs: 2.8, fat: 12.5 },
      { name: 'Füstölt húsvéglap', quantity: 200, unit: 'g', caloriesPer100: 260, protein: 18.0, carbs: 0, fat: 21.0 }
    ]
  },
  {
    id: 'rántott-hus',
    name: 'Rántott hús',
    portionSize: 200,
    servings: 4,
    image: '🥩',
    category: 'Főétel',
    ingredients: [
      { name: 'Sertéshús szelet', quantity: 600, unit: 'g', caloriesPer100: 242, protein: 20.0, carbs: 0, fat: 18.0 },
      { name: 'Tojás', quantity: 200, unit: 'g', caloriesPer100: 155, protein: 13.0, carbs: 1.1, fat: 11.0 },
      { name: 'Liszt', quantity: 100, unit: 'g', caloriesPer100: 364, protein: 10.3, carbs: 76.3, fat: 1.0 },
      { name: 'Zsemlemorzsa', quantity: 150, unit: 'g', caloriesPer100: 395, protein: 13.0, carbs: 72.0, fat: 5.5 },
      { name: 'Napraforgó olaj', quantity: 100, unit: 'ml', caloriesPer100: 884, protein: 0, carbs: 0, fat: 100.0 }
    ]
  },
  {
    id: 'pacal-porkolt',
    name: 'Pacalpörkölt',
    portionSize: 350,
    servings: 4,
    image: '🍲',
    category: 'Főétel',
    ingredients: [
      { name: 'Pacal', quantity: 800, unit: 'g', caloriesPer100: 94, protein: 11.7, carbs: 0, fat: 5.0 },
      { name: 'Hagyma', quantity: 200, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Paprika őrölt', quantity: 30, unit: 'g', caloriesPer100: 282, protein: 14.8, carbs: 53.9, fat: 12.9 },
      { name: 'Fokhagyma', quantity: 30, unit: 'g', caloriesPer100: 149, protein: 6.4, carbs: 33.1, fat: 0.5 },
      { name: 'Sertés zsír', quantity: 50, unit: 'g', caloriesPer100: 900, protein: 0, carbs: 0, fat: 100.0 }
    ]
  },
  {
    id: 'stefania',
    name: 'Stefánia szelet',
    portionSize: 250,
    servings: 6,
    image: '🥚',
    category: 'Főétel',
    ingredients: [
      { name: 'Darált hús', quantity: 800, unit: 'g', caloriesPer100: 250, protein: 26.0, carbs: 0, fat: 15.0 },
      { name: 'Tojás főtt', quantity: 300, unit: 'g', caloriesPer100: 155, protein: 13.0, carbs: 1.1, fat: 11.0 },
      { name: 'Zsemlemorzsa', quantity: 100, unit: 'g', caloriesPer100: 395, protein: 13.0, carbs: 72.0, fat: 5.5 },
      { name: 'Hagyma', quantity: 100, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Szalonna', quantity: 100, unit: 'g', caloriesPer100: 670, protein: 11.0, carbs: 0, fat: 70.0 }
    ]
  },
  {
    id: 'fasirt',
    name: 'Fasírt',
    portionSize: 150,
    servings: 8,
    image: '🍔',
    category: 'Főétel',
    ingredients: [
      { name: 'Darált hús', quantity: 800, unit: 'g', caloriesPer100: 250, protein: 26.0, carbs: 0, fat: 15.0 },
      { name: 'Tojás', quantity: 150, unit: 'g', caloriesPer100: 155, protein: 13.0, carbs: 1.1, fat: 11.0 },
      { name: 'Zsemle áztatott', quantity: 200, unit: 'g', caloriesPer100: 265, protein: 8.8, carbs: 49.0, fat: 3.3 },
      { name: 'Hagyma', quantity: 150, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Fokhagyma', quantity: 20, unit: 'g', caloriesPer100: 149, protein: 6.4, carbs: 33.1, fat: 0.5 }
    ]
  },
  {
    id: 'lecso',
    name: 'Lecsó',
    portionSize: 300,
    servings: 4,
    image: '🫑',
    category: 'Főétel',
    ingredients: [
      { name: 'Paprika', quantity: 800, unit: 'g', caloriesPer100: 26, protein: 0.9, carbs: 6.0, fat: 0.3 },
      { name: 'Paradicsom', quantity: 600, unit: 'g', caloriesPer100: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      { name: 'Hagyma', quantity: 200, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Kolbász', quantity: 300, unit: 'g', caloriesPer100: 325, protein: 13.0, carbs: 3.0, fat: 29.0 },
      { name: 'Szalonna', quantity: 100, unit: 'g', caloriesPer100: 670, protein: 11.0, carbs: 0, fat: 70.0 }
    ]
  },
  {
    id: 'paradicsomos-káposzta',
    name: 'Paradicsommártásos káposzta',
    portionSize: 350,
    servings: 4,
    image: '🥬',
    category: 'Főétel',
    ingredients: [
      { name: 'Káposzta', quantity: 800, unit: 'g', caloriesPer100: 25, protein: 1.3, carbs: 5.8, fat: 0.1 },
      { name: 'Paradicsom', quantity: 400, unit: 'g', caloriesPer100: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      { name: 'Hagyma', quantity: 100, unit: 'g', caloriesPer100: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
      { name: 'Rizs', quantity: 150, unit: 'g', caloriesPer100: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
      { name: 'Paprika őrölt', quantity: 15, unit: 'g', caloriesPer100: 282, protein: 14.8, carbs: 53.9, fat: 12.9 }
    ]
  },
  {
    id: 'zoldseges-rizs',
    name: 'Zöldséges rizs',
    portionSize: 300,
    servings: 4,
    image: '🍚',
    category: 'Főétel',
    ingredients: [
      { name: 'Rizs', quantity: 400, unit: 'g', caloriesPer100: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
      { name: 'Sárgarépa', quantity: 200, unit: 'g', caloriesPer100: 41, protein: 0.9, carbs: 9.6, fat: 0.2 },
      { name: 'Zöldborsó', quantity: 200, unit: 'g', caloriesPer100: 81, protein: 5.4, carbs: 14.5, fat: 0.4 },
      { name: 'Kukorica', quantity: 200, unit: 'g', caloriesPer100: 86, protein: 3.3, carbs: 18.7, fat: 1.4 },
      { name: 'Vaj', quantity: 50, unit: 'g', caloriesPer100: 717, protein: 0.9, carbs: 0.1, fat: 81.0 }
    ]
  },
  {
    id: 'greek-salad',
    name: 'Görög saláta',
    portionSize: 300,
    servings: 2,
    image: '🥗',
    category: 'Saláta',
    ingredients: [
      { name: 'Paradicsom', quantity: 300, unit: 'g', caloriesPer100: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      { name: 'Uborka', quantity: 200, unit: 'g', caloriesPer100: 16, protein: 0.7, carbs: 3.6, fat: 0.1 },
      { name: 'Feta sajt', quantity: 150, unit: 'g', caloriesPer100: 264, protein: 14.2, carbs: 4.1, fat: 21.3 },
      { name: 'Olívabogyó', quantity: 100, unit: 'g', caloriesPer100: 115, protein: 0.8, carbs: 6.3, fat: 10.7 },
      { name: 'Olívaolaj', quantity: 40, unit: 'ml', caloriesPer100: 884, protein: 0, carbs: 0, fat: 100.0 }
    ]
  },
  {
    id: 'cezar-salad',
    name: 'Cézár saláta',
    portionSize: 350,
    servings: 2,
    image: '🥗',
    category: 'Saláta',
    ingredients: [
      { name: 'Jégsaláta', quantity: 300, unit: 'g', caloriesPer100: 14, protein: 0.9, carbs: 2.9, fat: 0.1 },
      { name: 'Csirkemell grillezett', quantity: 200, unit: 'g', caloriesPer100: 165, protein: 31.0, carbs: 0, fat: 3.6 },
      { name: 'Parmezán', quantity: 50, unit: 'g', caloriesPer100: 431, protein: 38.0, carbs: 3.2, fat: 29.0 },
      { name: 'Kenyér pirítós', quantity: 100, unit: 'g', caloriesPer100: 313, protein: 9.7, carbs: 48.0, fat: 9.0 },
      { name: 'Cézár öntet', quantity: 80, unit: 'g', caloriesPer100: 450, protein: 2.0, carbs: 8.0, fat: 45.0 }
    ]
  },
  {
    id: 'tunamix-salad',
    name: 'Tonhalsaláta',
    portionSize: 300,
    servings: 2,
    image: '🐟',
    category: 'Saláta',
    ingredients: [
      { name: 'Tonhal konzerv', quantity: 200, unit: 'g', caloriesPer100: 116, protein: 26.0, carbs: 0, fat: 0.9 },
      { name: 'Jégsaláta', quantity: 200, unit: 'g', caloriesPer100: 14, protein: 0.9, carbs: 2.9, fat: 0.1 },
      { name: 'Paradicsom koktél', quantity: 150, unit: 'g', caloriesPer100: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      { name: 'Kukorica', quantity: 100, unit: 'g', caloriesPer100: 86, protein: 3.3, carbs: 18.7, fat: 1.4 },
      { name: 'Olívaolaj', quantity: 30, unit: 'ml', caloriesPer100: 884, protein: 0, carbs: 0, fat: 100.0 }
    ]
  },
  {
    id: 'repa-salata',
    name: 'Répa saláta',
    portionSize: 200,
    servings: 4,
    image: '🥕',
    category: 'Saláta',
    ingredients: [
      { name: 'Sárgarépa', quantity: 600, unit: 'g', caloriesPer100: 41, protein: 0.9, carbs: 9.6, fat: 0.2 },
      { name: 'Citrom', quantity: 50, unit: 'g', caloriesPer100: 29, protein: 1.1, carbs: 9.3, fat: 0.3 },
      { name: 'Méz', quantity: 30, unit: 'g', caloriesPer100: 304, protein: 0.3, carbs: 82.4, fat: 0 },
      { name: 'Napraforgó olaj', quantity: 40, unit: 'ml', caloriesPer100: 884, protein: 0, carbs: 0, fat: 100.0 }
    ]
  },
  {
    id: 'somloi-galuska',
    name: 'Somlói galuska',
    portionSize: 250,
    servings: 6,
    image: '🍰',
    category: 'Desszert',
    ingredients: [
      { name: 'Piskóta', quantity: 400, unit: 'g', caloriesPer100: 297, protein: 7.5, carbs: 50.0, fat: 7.8 },
      { name: 'Tej', quantity: 500, unit: 'ml', caloriesPer100: 42, protein: 3.4, carbs: 5.0, fat: 1.0 },
      { name: 'Tojás', quantity: 200, unit: 'g', caloriesPer100: 155, protein: 13.0, carbs: 1.1, fat: 11.0 },
      { name: 'Cukor', quantity: 150, unit: 'g', caloriesPer100: 387, protein: 0, carbs: 99.8, fat: 0 },
      { name: 'Dió darált', quantity: 150, unit: 'g', caloriesPer100: 654, protein: 15.2, carbs: 13.7, fat: 65.2 },
      { name: 'Csokoládé', quantity: 100, unit: 'g', caloriesPer100: 546, protein: 7.8, carbs: 24.0, fat: 42.0 },
      { name: 'Tejszín', quantity: 200, unit: 'ml', caloriesPer100: 292, protein: 2.1, carbs: 3.3, fat: 30.0 }
    ]
  },
  {
    id: 'turogomboc',
    name: 'Túrógombóc',
    portionSize: 200,
    servings: 4,
    image: '🥟',
    category: 'Desszert',
    ingredients: [
      { name: 'Túró', quantity: 500, unit: 'g', caloriesPer100: 156, protein: 16.7, carbs: 3.2, fat: 9.0 },
      { name: 'Tojás', quantity: 150, unit: 'g', caloriesPer100: 155, protein: 13.0, carbs: 1.1, fat: 11.0 },
      { name: 'Búzadara', quantity: 100, unit: 'g', caloriesPer100: 360, protein: 13.0, carbs: 72.0, fat: 1.1 },
      { name: 'Tejföl', quantity: 200, unit: 'g', caloriesPer100: 133, protein: 2.1, carbs: 2.8, fat: 12.5 },
      { name: 'Zsemlemorzsa', quantity: 100, unit: 'g', caloriesPer100: 395, protein: 13.0, carbs: 72.0, fat: 5.5 },
      { name: 'Cukor', quantity: 80, unit: 'g', caloriesPer100: 387, protein: 0, carbs: 99.8, fat: 0 }
    ]
  },
  {
    id: 'almaspite',
    name: 'Almás pite',
    portionSize: 180,
    servings: 8,
    image: '🥧',
    category: 'Desszert',
    ingredients: [
      { name: 'Liszt', quantity: 400, unit: 'g', caloriesPer100: 364, protein: 10.3, carbs: 76.3, fat: 1.0 },
      { name: 'Vaj', quantity: 200, unit: 'g', caloriesPer100: 717, protein: 0.9, carbs: 0.1, fat: 81.0 },
      { name: 'Alma', quantity: 800, unit: 'g', caloriesPer100: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
      { name: 'Cukor', quantity: 150, unit: 'g', caloriesPer100: 387, protein: 0, carbs: 99.8, fat: 0 },
      { name: 'Fahéj', quantity: 10, unit: 'g', caloriesPer100: 247, protein: 3.9, carbs: 80.6, fat: 1.2 }
    ]
  },
  {
    id: 'mak-os-teszta',
    name: 'Mákos tészta',
    portionSize: 300,
    servings: 4,
    image: '🍝',
    category: 'Desszert',
    ingredients: [
      { name: 'Tészta', quantity: 500, unit: 'g', caloriesPer100: 348, protein: 13.0, carbs: 72.0, fat: 2.0 },
      { name: 'Mák darált', quantity: 200, unit: 'g', caloriesPer100: 525, protein: 17.5, carbs: 28.1, fat: 42.0 },
      { name: 'Cukor', quantity: 150, unit: 'g', caloriesPer100: 387, protein: 0, carbs: 99.8, fat: 0 },
      { name: 'Vaj', quantity: 80, unit: 'g', caloriesPer100: 717, protein: 0.9, carbs: 0.1, fat: 81.0 }
    ]
  }
];

// Calculate nutrition for a recipe portion
export function calculateRecipeNutrition(recipe: Recipe, servings: number = 1) {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  recipe.ingredients.forEach(ingredient => {
    const calories = (ingredient.caloriesPer100 * ingredient.quantity) / 100;
    const protein = (ingredient.protein * ingredient.quantity) / 100;
    const carbs = (ingredient.carbs * ingredient.quantity) / 100;
    const fat = (ingredient.fat * ingredient.quantity) / 100;

    totalCalories += calories;
    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;
  });

  // Per serving
  const perServing = {
    calories: Math.round((totalCalories / recipe.servings) * servings),
    protein: Math.round((totalProtein / recipe.servings) * servings * 10) / 10,
    carbs: Math.round((totalCarbs / recipe.servings) * servings * 10) / 10,
    fat: Math.round((totalFat / recipe.servings) * servings * 10) / 10,
    portionSize: Math.round(recipe.portionSize * servings)
  };

  return perServing;
}

// Search recipes by name
export function searchRecipes(query: string): Recipe[] {
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) return [];

  return recipeDatabase.filter(recipe => 
    recipe.name.toLowerCase().includes(lowerQuery)
  );
}

// Detect if query is likely a recipe vs a product
export function isLikelyRecipe(query: string): boolean {
  const lowerQuery = query.toLowerCase().trim();
  
  // Hungarian meal keywords
  const mealKeywords = [
    'leves', 'paprikás', 'pörkölt', 'gulyás', 'rakott', 'főzelék',
    'csusza', 'tészta', 'pizza', 'saláta', 'halászlé', 'nokedli',
    'palacsinta', 'rántott', 'töltött', 'fasírt', 'stefánia',
    'csülök', 'kolbász', 'virsli'
  ];

  // Check if query contains meal keywords
  return mealKeywords.some(keyword => lowerQuery.includes(keyword));
}

// ═══════════════════════════════════════════════════════════════
// COOKING METHOD VARIANTS — Same food, different prep = different kcal
// ═══════════════════════════════════════════════════════════════

export interface CookingVariant {
  id: string;
  method: string;
  methodIcon: string;
  label: string;
  calorieMultiplier: number;
  extraFatPer100: number;
  extraCarbsPer100: number;
}

export const cookingMethods: CookingVariant[] = [
  { id: 'grilled',   method: 'grillezve',        methodIcon: '🔥', label: 'Grillezve',                      calorieMultiplier: 1.0,  extraFatPer100: 0,   extraCarbsPer100: 0 },
  { id: 'baked',     method: 'sütőben sütve',     methodIcon: '♨️',  label: 'Sütőben sütve',                  calorieMultiplier: 1.05, extraFatPer100: 2,   extraCarbsPer100: 0 },
  { id: 'steamed',   method: 'párolva',           methodIcon: '💨', label: 'Párolva / Gőzölve',              calorieMultiplier: 0.95, extraFatPer100: 0,   extraCarbsPer100: 0 },
  { id: 'pan-fried', method: 'serpenyőben sütve',  methodIcon: '🍳', label: 'Serpenyőben sütve (kevés olaj)',  calorieMultiplier: 1.15, extraFatPer100: 5,   extraCarbsPer100: 0 },
  { id: 'deep-fried',method: 'olajban sütve',     methodIcon: '🫕', label: 'Olajban sütve / Rántva',         calorieMultiplier: 1.55, extraFatPer100: 15,  extraCarbsPer100: 8 },
  { id: 'boiled',    method: 'főzve',             methodIcon: '🫧', label: 'Főzve / Párolt lében',           calorieMultiplier: 0.9,  extraFatPer100: 0,   extraCarbsPer100: 0 },
  { id: 'smoked',    method: 'füstölve',          methodIcon: '🌫️', label: 'Füstölve',                       calorieMultiplier: 1.0,  extraFatPer100: 1,   extraCarbsPer100: 0 },
  { id: 'raw',       method: 'nyersen',           methodIcon: '🥬', label: 'Nyersen / Nyers',                calorieMultiplier: 1.0,  extraFatPer100: 0,   extraCarbsPer100: 0 },
];

// ═══════════════════════════════════════════════════════════════
// SMART FOOD ITEMS — Foods that trigger cooking method selection
// ═══════════════════════════════════════════════════════════════

export interface SmartFoodItem {
  id: string;
  name: string;
  names: string[];
  image: string;
  category: string;
  region: 'erdélyi' | 'magyar' | 'román' | 'nemzetközi';
  applicableMethods: string[];
  basePer100: { calories: number; protein: number; carbs: number; fat: number };
  defaultPortionG: number;
  isMealPlan?: boolean;
}

export const smartFoodItems: SmartFoodItem[] = [
  // ════════ HAL / FISH ════════
  {
    id: 'pisztrang', name: 'Pisztráng',
    names: ['pisztráng', 'pisztrang', 'pastrav', 'trout', 'sult pisztrang', 'sült pisztráng', 'pisztráng filé', 'pisztrang file'],
    image: '🐟', category: 'Hal', region: 'erdélyi',
    applicableMethods: ['grilled', 'baked', 'pan-fried', 'deep-fried', 'steamed', 'smoked'],
    basePer100: { calories: 119, protein: 20.5, carbs: 0, fat: 3.5 }, defaultPortionG: 200,
  },
  {
    id: 'lazac', name: 'Lazac',
    names: ['lazac', 'somon', 'salmon', 'sült lazac', 'sult lazac', 'lazacfilé', 'lazacfile'],
    image: '🐟', category: 'Hal', region: 'nemzetközi',
    applicableMethods: ['grilled', 'baked', 'pan-fried', 'steamed', 'smoked', 'raw'],
    basePer100: { calories: 208, protein: 20.0, carbs: 0, fat: 13.0 }, defaultPortionG: 200, isMealPlan: true,
  },
  {
    id: 'ponty', name: 'Ponty',
    names: ['ponty', 'crap', 'carp', 'sült ponty', 'sult ponty', 'rántott ponty', 'rantott ponty'],
    image: '🐟', category: 'Hal', region: 'erdélyi',
    applicableMethods: ['grilled', 'baked', 'pan-fried', 'deep-fried', 'boiled'],
    basePer100: { calories: 127, protein: 17.8, carbs: 0, fat: 5.6 }, defaultPortionG: 250,
  },
  {
    id: 'harcsa', name: 'Harcsa',
    names: ['harcsa', 'somn', 'catfish', 'sült harcsa', 'sult harcsa', 'harcsapaprikás', 'harcsapaprikas'],
    image: '🐟', category: 'Hal', region: 'erdélyi',
    applicableMethods: ['grilled', 'baked', 'pan-fried', 'deep-fried', 'boiled'],
    basePer100: { calories: 95, protein: 16.4, carbs: 0, fat: 2.8 }, defaultPortionG: 250,
  },
  {
    id: 'tokehal', name: 'Tőkehal',
    names: ['tőkehal', 'tokehal', 'cod', 'tőkehal filé', 'tokehal file'],
    image: '🐟', category: 'Hal', region: 'nemzetközi',
    applicableMethods: ['grilled', 'baked', 'pan-fried', 'deep-fried', 'steamed'],
    basePer100: { calories: 82, protein: 18.0, carbs: 0, fat: 0.7 }, defaultPortionG: 200,
  },
  {
    id: 'tonhal-steak', name: 'Tonhal steak',
    names: ['tonhal steak', 'tonhal', 'ton', 'tuna steak', 'sült tonhal', 'sult tonhal'],
    image: '🐟', category: 'Hal', region: 'nemzetközi',
    applicableMethods: ['grilled', 'baked', 'pan-fried', 'raw'],
    basePer100: { calories: 144, protein: 23.0, carbs: 0, fat: 4.9 }, defaultPortionG: 200,
  },
  // ════════ HÚS / MEAT ════════
  {
    id: 'csirkemell', name: 'Csirkemell',
    names: ['csirkemell', 'csirke mell', 'piept de pui', 'chicken breast', 'sült csirkemell', 'sult csirkemell', 'csirke', 'csirkemellfilé'],
    image: '🍗', category: 'Szárnyas', region: 'nemzetközi',
    applicableMethods: ['grilled', 'baked', 'pan-fried', 'deep-fried', 'steamed', 'boiled'],
    basePer100: { calories: 165, protein: 31.0, carbs: 0, fat: 3.6 }, defaultPortionG: 200, isMealPlan: true,
  },
  {
    id: 'csirkecomb', name: 'Csirkecomb',
    names: ['csirkecomb', 'csirke comb', 'pulpa de pui', 'chicken thigh', 'sült csirkecomb', 'sult csirkecomb'],
    image: '🍗', category: 'Szárnyas', region: 'nemzetközi',
    applicableMethods: ['grilled', 'baked', 'pan-fried', 'deep-fried'],
    basePer100: { calories: 211, protein: 18.0, carbs: 0, fat: 15.0 }, defaultPortionG: 250,
  },
  {
    id: 'pulykamell', name: 'Pulykamell',
    names: ['pulykamell', 'pulyka', 'curcan', 'turkey breast', 'sült pulykamell', 'sult pulykamell'],
    image: '🦃', category: 'Szárnyas', region: 'nemzetközi',
    applicableMethods: ['grilled', 'baked', 'pan-fried', 'steamed'],
    basePer100: { calories: 135, protein: 29.0, carbs: 0, fat: 1.7 }, defaultPortionG: 200, isMealPlan: true,
  },
  {
    id: 'sertes-karaj', name: 'Sertés karaj',
    names: ['sertés karaj', 'sertes karaj', 'karaj', 'cotlet de porc', 'pork chop', 'sült karaj', 'sult karaj'],
    image: '🥩', category: 'Sertés', region: 'magyar',
    applicableMethods: ['grilled', 'baked', 'pan-fried', 'deep-fried'],
    basePer100: { calories: 242, protein: 20.0, carbs: 0, fat: 18.0 }, defaultPortionG: 200,
  },
  {
    id: 'sertes-szuzpecsenye', name: 'Sertés szűzpecsenye',
    names: ['szűzpecsenye', 'szuzpecsenye', 'sertés szűz', 'sertes szuz', 'muschiulet de porc'],
    image: '🥩', category: 'Sertés', region: 'magyar',
    applicableMethods: ['grilled', 'baked', 'pan-fried'],
    basePer100: { calories: 143, protein: 26.0, carbs: 0, fat: 3.5 }, defaultPortionG: 200, isMealPlan: true,
  },
  {
    id: 'marha-steak', name: 'Marha steak',
    names: ['marha steak', 'marha', 'steak', 'bifsztek', 'vita', 'beef steak', 'sült steak', 'sult steak'],
    image: '🥩', category: 'Marha', region: 'nemzetközi',
    applicableMethods: ['grilled', 'pan-fried', 'baked'],
    basePer100: { calories: 271, protein: 26.0, carbs: 0, fat: 18.0 }, defaultPortionG: 200,
  },
  {
    id: 'daralt-hus', name: 'Darált hús',
    names: ['darált hús', 'daralt hus', 'carne tocata', 'ground meat', 'fasírozó', 'fasirozo'],
    image: '🥩', category: 'Vegyes hús', region: 'nemzetközi',
    applicableMethods: ['grilled', 'pan-fried', 'baked', 'boiled'],
    basePer100: { calories: 250, protein: 26.0, carbs: 0, fat: 15.0 }, defaultPortionG: 150,
  },
  // ════════ TOJÁS / EGGS ════════
  {
    id: 'tojas', name: 'Tojás',
    names: ['tojás', 'tojas', 'oua', 'egg', 'sült tojás', 'sult tojas', 'rántotta', 'rantotta', 'tükörtojás', 'tukortojas'],
    image: '🥚', category: 'Tojás', region: 'nemzetközi',
    applicableMethods: ['pan-fried', 'boiled', 'baked', 'steamed'],
    basePer100: { calories: 155, protein: 13.0, carbs: 1.1, fat: 11.0 }, defaultPortionG: 120, isMealPlan: true,
  },
  // ════════ ZÖLDSÉG / VEGETABLES ════════
  {
    id: 'cukkini', name: 'Cukkini',
    names: ['cukkini', 'dovlecel', 'zucchini', 'sült cukkini', 'sult cukkini', 'grillezett cukkini'],
    image: '🥒', category: 'Zöldség', region: 'nemzetközi',
    applicableMethods: ['grilled', 'baked', 'pan-fried', 'steamed', 'raw'],
    basePer100: { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 }, defaultPortionG: 200, isMealPlan: true,
  },
  {
    id: 'padlizsan', name: 'Padlizsán',
    names: ['padlizsán', 'padlizsan', 'vinete', 'eggplant', 'sült padlizsán', 'sult padlizsan'],
    image: '🍆', category: 'Zöldség', region: 'nemzetközi',
    applicableMethods: ['grilled', 'baked', 'pan-fried', 'deep-fried'],
    basePer100: { calories: 25, protein: 1.0, carbs: 6.0, fat: 0.2 }, defaultPortionG: 200,
  },
  {
    id: 'brokkoli', name: 'Brokkoli',
    names: ['brokkoli', 'broccoli', 'párolt brokkoli', 'parolt brokkoli', 'sült brokkoli'],
    image: '🥦', category: 'Zöldség', region: 'nemzetközi',
    applicableMethods: ['steamed', 'baked', 'pan-fried', 'boiled', 'raw'],
    basePer100: { calories: 34, protein: 2.8, carbs: 7.0, fat: 0.4 }, defaultPortionG: 200, isMealPlan: true,
  },
  {
    id: 'burgonya', name: 'Burgonya',
    names: ['burgonya', 'krumpli', 'cartofi', 'potato', 'sült krumpli', 'sult krumpli', 'hasábburgonya', 'hasabburgonya', 'krumplipüré', 'krumplipure'],
    image: '🥔', category: 'Zöldség', region: 'nemzetközi',
    applicableMethods: ['baked', 'pan-fried', 'deep-fried', 'boiled', 'steamed'],
    basePer100: { calories: 77, protein: 2.0, carbs: 17.5, fat: 0.1 }, defaultPortionG: 250, isMealPlan: true,
  },
];

/** Calculate nutrition for a SmartFoodItem with a specific cooking method */
export function calculateSmartFoodNutrition(
  food: SmartFoodItem, method: CookingVariant, portionG: number
): { calories: number; protein: number; carbs: number; fat: number } {
  const base = food.basePer100;
  const m = portionG / 100;
  return {
    calories: Math.round((base.calories * method.calorieMultiplier + method.extraFatPer100 * 9 + method.extraCarbsPer100 * 4) * m),
    protein: Math.round(base.protein * m * 10) / 10,
    carbs: Math.round((base.carbs + method.extraCarbsPer100) * m * 10) / 10,
    fat: Math.round((base.fat + method.extraFatPer100) * m * 10) / 10,
  };
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED SEARCH — diacritics-free, priority-based
// ═══════════════════════════════════════════════════════════════

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ő/g, 'o').replace(/ű/g, 'u').replace(/Ő/g, 'o').replace(/Ű/g, 'u');
}

export function searchRecipesEnhanced(query: string): Recipe[] {
  const nq = normalize(query.trim());
  if (!nq || nq.length < 1) return [];
  const scored: { recipe: Recipe; score: number }[] = [];
  for (const recipe of recipeDatabase) {
    let maxScore = 0;
    const nName = normalize(recipe.name);
    if (nName === nq) maxScore = 100;
    else if (nName.startsWith(nq)) maxScore = 90;
    else if (nName.includes(nq)) maxScore = 80;
    else if (nq.includes(nName) && nName.length >= 3) maxScore = 75;
    if (recipe.aliases) {
      for (const alias of recipe.aliases) {
        const na = normalize(alias);
        if (na === nq) maxScore = Math.max(maxScore, 95);
        else if (na.startsWith(nq)) maxScore = Math.max(maxScore, 85);
        else if (na.includes(nq)) maxScore = Math.max(maxScore, 75);
      }
    }
    if (maxScore === 0) {
      const qWords = nq.split(/\s+/).filter(w => w.length >= 2);
      const nWords = nName.split(/\s+/);
      const matched = qWords.filter(qw => nWords.some(nw => nw.includes(qw) || qw.includes(nw)));
      if (matched.length > 0) maxScore = 50 + (matched.length / qWords.length) * 30;
    }
    if (maxScore === 0) {
      for (const ing of recipe.ingredients) {
        if (normalize(ing.name).includes(nq)) { maxScore = 40; break; }
      }
    }
    if (recipe.isMealPlan && maxScore > 0) maxScore += 15;
    if (recipe.region === 'erdélyi' && maxScore > 0) maxScore += 5;
    if (maxScore > 0) scored.push({ recipe, score: maxScore });
  }
  return scored.sort((a, b) => b.score - a.score).map(s => s.recipe);
}

export function searchSmartFoods(query: string): SmartFoodItem[] {
  const nq = normalize(query.trim());
  if (!nq || nq.length < 1) return [];
  const scored: { food: SmartFoodItem; score: number }[] = [];
  for (const food of smartFoodItems) {
    let maxScore = 0;
    for (const name of food.names) {
      const nn = normalize(name);
      if (nn === nq) maxScore = Math.max(maxScore, 100);
      else if (nn.startsWith(nq)) maxScore = Math.max(maxScore, 90);
      else if (nn.includes(nq)) maxScore = Math.max(maxScore, 80);
      else if (nq.includes(nn) && nn.length >= 3) maxScore = Math.max(maxScore, 75);
      else {
        const qWords = nq.split(/\s+/).filter(w => w.length >= 2);
        const nWords = nn.split(/\s+/);
        const matched = qWords.filter(qw => nWords.some(nw => nw.includes(qw) || qw.includes(nw)));
        if (matched.length > 0) maxScore = Math.max(maxScore, 50 + (matched.length / Math.max(qWords.length, 1)) * 30);
      }
    }
    if (food.isMealPlan && maxScore > 0) maxScore += 15;
    if (food.region === 'erdélyi' && maxScore > 0) maxScore += 10;
    if (maxScore > 0) scored.push({ food, score: maxScore });
  }
  return scored.sort((a, b) => b.score - a.score).map(s => s.food);
}

export function isLikelyRecipeEnhanced(query: string): boolean {
  const nq = normalize(query.trim());
  const kw = ['leves','paprikas','porkolt','gulyas','rakott','fozelek','csusza','teszta','pizza','salata','halaszle','nokedli','palacsinta','rantott','toltott','fasirt','stefania','csulok','kolbasz','virsli','lecso','babgulyas','bableves','gombaleves','pacal','sult','sutve','fozve','grillezve','parolva','rantva','fustolt'];
  return kw.some(k => nq.includes(k));
}