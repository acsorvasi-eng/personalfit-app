/**
 * AI Food Knowledge Database
 * Comprehensive Hungarian food/drink/ingredient database with REAL nutritional values per 100g/ml.
 * Includes smart Hungarian text parser for compound food recognition.
 */

export interface FoodItem {
  id: string;
  names: string[];        // All valid Hungarian names + variants (lowercase, no accents needed)
  category: FoodCategory;
  image: string;
  unit: 'g' | 'ml' | 'db';
  defaultPortion: number; // default portion in g or ml
  portionLabel: string;   // e.g. "1 csésze (240ml)"
  per100: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export type FoodCategory =
  | 'Kávé & Tea'
  | 'Tej & Tejtermék'
  | 'Gyümölcs'
  | 'Zöldség'
  | 'Hús & Hal'
  | 'Pékáru & Gabona'
  | 'Édesség & Snack'
  | 'Ital'
  | 'Olaj & Zsír'
  | 'Fűszer & Szósz'
  | 'Tojás'
  | 'Hüvelyes & Mag'
  | 'Egyéb';

// ─── Comprehensive Food Knowledge Database ────────────────────────────
export const foodKnowledge: FoodItem[] = [
  // ═══════════════════════════════════════════
  // KÁVÉ & TEA
  // ═══════════════════════════════════════════
  {
    id: 'hosszu-kave',
    names: ['hosszú kávé', 'hosszu kave', 'americano', 'amerikai kávé', 'filter kávé', 'filteres kávé', 'fekete kávé', 'long coffee'],
    category: 'Kávé & Tea',
    image: '☕',
    unit: 'ml',
    defaultPortion: 240,
    portionLabel: '1 csésze (240ml)',
    per100: { calories: 1, protein: 0.1, carbs: 0, fat: 0 }
  },
  {
    id: 'espresso',
    names: ['espresso', 'eszpresszó', 'kávé', 'kave', 'presszó', 'presszo', 'rövid kávé', 'rovid kave'],
    category: 'Kávé & Tea',
    image: '☕',
    unit: 'ml',
    defaultPortion: 30,
    portionLabel: '1 adag (30ml)',
    per100: { calories: 2, protein: 0.1, carbs: 0.4, fat: 0 }
  },
  {
    id: 'cappuccino',
    names: ['cappuccino', 'kapucsínó', 'kapucsino', 'cappucino'],
    category: 'Kávé & Tea',
    image: '☕',
    unit: 'ml',
    defaultPortion: 240,
    portionLabel: '1 csésze (240ml)',
    per100: { calories: 30, protein: 1.8, carbs: 2.8, fat: 1.2 }
  },
  {
    id: 'latte',
    names: ['latte', 'tejeskávé', 'tejes kávé', 'kávé tejjel', 'lattè', 'caffe latte'],
    category: 'Kávé & Tea',
    image: '☕',
    unit: 'ml',
    defaultPortion: 300,
    portionLabel: '1 csésze (300ml)',
    per100: { calories: 36, protein: 2.0, carbs: 3.5, fat: 1.5 }
  },
  {
    id: 'macchiato',
    names: ['macchiato', 'makiátó', 'makiato'],
    category: 'Kávé & Tea',
    image: '☕',
    unit: 'ml',
    defaultPortion: 60,
    portionLabel: '1 adag (60ml)',
    per100: { calories: 15, protein: 0.7, carbs: 1.2, fat: 0.6 }
  },
  {
    id: 'fekete-tea',
    names: ['fekete tea', 'tea', 'angol tea', 'earl grey'],
    category: 'Kávé & Tea',
    image: '🍵',
    unit: 'ml',
    defaultPortion: 250,
    portionLabel: '1 csésze (250ml)',
    per100: { calories: 1, protein: 0, carbs: 0.3, fat: 0 }
  },
  {
    id: 'zold-tea',
    names: ['zöld tea', 'zold tea', 'green tea', 'matcha'],
    category: 'Kávé & Tea',
    image: '🍵',
    unit: 'ml',
    defaultPortion: 250,
    portionLabel: '1 csésze (250ml)',
    per100: { calories: 1, protein: 0, carbs: 0.2, fat: 0 }
  },
  {
    id: 'kakao',
    names: ['kakaó', 'kakao', 'forró csokoládé', 'hot chocolate', 'meleg csoki'],
    category: 'Kávé & Tea',
    image: '🍫',
    unit: 'ml',
    defaultPortion: 250,
    portionLabel: '1 csésze (250ml)',
    per100: { calories: 77, protein: 3.5, carbs: 10.2, fat: 2.5 }
  },

  // ═══════════════════════════════════════════
  // TEJ & TEJTERMÉK
  // ═══════════════════════════════════════════
  {
    id: 'kecsketej',
    names: ['kecsketej', 'kecske tej', 'goat milk'],
    category: 'Tej & Tejtermék',
    image: '🥛',
    unit: 'ml',
    defaultPortion: 100,
    portionLabel: '100ml',
    per100: { calories: 69, protein: 3.6, carbs: 4.5, fat: 4.1 }
  },
  {
    id: 'tehentej-28',
    names: ['tehéntej', 'tehentej', 'tej', 'friss tej', '2.8% tej', 'teljes tej'],
    category: 'Tej & Tejtermék',
    image: '🥛',
    unit: 'ml',
    defaultPortion: 200,
    portionLabel: '1 pohár (200ml)',
    per100: { calories: 50, protein: 3.3, carbs: 4.7, fat: 1.8 }
  },
  {
    id: 'tehentej-15',
    names: ['félzsíros tej', 'felzsiros tej', '1.5% tej', '1.5 tej'],
    category: 'Tej & Tejtermék',
    image: '🥛',
    unit: 'ml',
    defaultPortion: 200,
    portionLabel: '1 pohár (200ml)',
    per100: { calories: 46, protein: 3.4, carbs: 4.9, fat: 1.5 }
  },
  {
    id: 'zabtej',
    names: ['zabtej', 'zab tej', 'zab ital', 'oat milk'],
    category: 'Tej & Tejtermék',
    image: '🥛',
    unit: 'ml',
    defaultPortion: 200,
    portionLabel: '1 pohár (200ml)',
    per100: { calories: 43, protein: 0.3, carbs: 6.7, fat: 1.5 }
  },
  {
    id: 'szojatej',
    names: ['szójatej', 'szojatej', 'szója tej', 'soy milk'],
    category: 'Tej & Tejtermék',
    image: '🥛',
    unit: 'ml',
    defaultPortion: 200,
    portionLabel: '1 pohár (200ml)',
    per100: { calories: 33, protein: 2.8, carbs: 1.2, fat: 1.8 }
  },
  {
    id: 'mandulatej',
    names: ['mandulatej', 'mandula tej', 'almond milk'],
    category: 'Tej & Tejtermék',
    image: '🥛',
    unit: 'ml',
    defaultPortion: 200,
    portionLabel: '1 pohár (200ml)',
    per100: { calories: 17, protein: 0.4, carbs: 0.3, fat: 1.1 }
  },
  {
    id: 'kokusztej',
    names: ['kókusztej', 'kokusztej', 'coconut milk'],
    category: 'Tej & Tejtermék',
    image: '🥥',
    unit: 'ml',
    defaultPortion: 200,
    portionLabel: '1 pohár (200ml)',
    per100: { calories: 20, protein: 0.2, carbs: 2.7, fat: 0.9 }
  },
  {
    id: 'tejfol',
    names: ['tejföl', 'tejfol', 'sour cream'],
    category: 'Tej & Tejtermék',
    image: '🥛',
    unit: 'g',
    defaultPortion: 50,
    portionLabel: '2 evőkanál (50g)',
    per100: { calories: 133, protein: 2.1, carbs: 2.8, fat: 12.5 }
  },
  {
    id: 'joghurt-natur',
    names: ['joghurt', 'natúr joghurt', 'természetes joghurt', 'yoghurt', 'jogurt'],
    category: 'Tej & Tejtermék',
    image: '🥛',
    unit: 'g',
    defaultPortion: 150,
    portionLabel: '1 pohár (150g)',
    per100: { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3 }
  },
  {
    id: 'gorog-joghurt',
    names: ['görög joghurt', 'gorog joghurt', 'greek yogurt'],
    category: 'Tej & Tejtermék',
    image: '🥛',
    unit: 'g',
    defaultPortion: 150,
    portionLabel: '1 pohár (150g)',
    per100: { calories: 97, protein: 9.0, carbs: 3.6, fat: 5.0 }
  },
  {
    id: 'turos',
    names: ['túró', 'turo', 'turos', 'cottage cheese'],
    category: 'Tej & Tejtermék',
    image: '🧀',
    unit: 'g',
    defaultPortion: 100,
    portionLabel: '100g',
    per100: { calories: 98, protein: 11.1, carbs: 3.4, fat: 4.3 }
  },
  {
    id: 'trappista-sajt',
    names: ['trappista sajt', 'trappista', 'sajt'],
    category: 'Tej & Tejtermék',
    image: '🧀',
    unit: 'g',
    defaultPortion: 30,
    portionLabel: '1 szelet (30g)',
    per100: { calories: 345, protein: 25.0, carbs: 0.5, fat: 27.0 }
  },
  {
    id: 'parmezsan',
    names: ['parmezán', 'parmezan', 'parmesan', 'parmigiano'],
    category: 'Tej & Tejtermék',
    image: '🧀',
    unit: 'g',
    defaultPortion: 20,
    portionLabel: '2 evőkanál reszelt (20g)',
    per100: { calories: 431, protein: 38.5, carbs: 4.1, fat: 29.0 }
  },
  {
    id: 'mozzarella',
    names: ['mozzarella', 'mocarella'],
    category: 'Tej & Tejtermék',
    image: '🧀',
    unit: 'g',
    defaultPortion: 125,
    portionLabel: '1 golyó (125g)',
    per100: { calories: 280, protein: 22.2, carbs: 2.2, fat: 20.3 }
  },
  {
    id: 'vaj',
    names: ['vaj', 'butter'],
    category: 'Tej & Tejtermék',
    image: '🧈',
    unit: 'g',
    defaultPortion: 10,
    portionLabel: '1 teáskanál (10g)',
    per100: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81.0 }
  },
  {
    id: 'tejszin',
    names: ['tejszín', 'tejszin', 'habtejszín', 'whipping cream', 'cream'],
    category: 'Tej & Tejtermék',
    image: '🥛',
    unit: 'ml',
    defaultPortion: 30,
    portionLabel: '2 evőkanál (30ml)',
    per100: { calories: 340, protein: 2.0, carbs: 2.7, fat: 36.0 }
  },

  // ═══════════════════════════════════════════
  // PÉKÁRU & GABONA
  // ═══════════════════════════════════════════
  {
    id: 'feher-kenyer',
    names: ['fehér kenyér', 'feher kenyer', 'kenyér', 'kenyer', 'bread'],
    category: 'Pékáru & Gabona',
    image: '🍞',
    unit: 'g',
    defaultPortion: 50,
    portionLabel: '1 szelet (50g)',
    per100: { calories: 265, protein: 9.0, carbs: 49.0, fat: 3.2 }
  },
  {
    id: 'teljes-kiorlesu-kenyer',
    names: ['teljes kiőrlésű kenyér', 'barna kenyér', 'rozskenyér', 'graham kenyér'],
    category: 'Pékáru & Gabona',
    image: '🍞',
    unit: 'g',
    defaultPortion: 50,
    portionLabel: '1 szelet (50g)',
    per100: { calories: 247, protein: 13.0, carbs: 41.0, fat: 3.4 }
  },
  {
    id: 'zsemle',
    names: ['zsemle', 'kifli', 'péksütemény', 'roll'],
    category: 'Pékáru & Gabona',
    image: '🥖',
    unit: 'db',
    defaultPortion: 60,
    portionLabel: '1 db (60g)',
    per100: { calories: 276, protein: 8.5, carbs: 52.0, fat: 3.5 }
  },
  {
    id: 'croissant',
    names: ['croissant', 'vajas kifli', 'vajaskifli'],
    category: 'Pékáru & Gabona',
    image: '🥐',
    unit: 'db',
    defaultPortion: 60,
    portionLabel: '1 db (60g)',
    per100: { calories: 406, protein: 8.2, carbs: 45.5, fat: 21.0 }
  },
  {
    id: 'zabpehely',
    names: ['zabpehely', 'zab', 'oatmeal', 'porridge', 'zabkása', 'oat'],
    category: 'Pékáru & Gabona',
    image: '🥣',
    unit: 'g',
    defaultPortion: 50,
    portionLabel: '5 evőkanál (50g)',
    per100: { calories: 379, protein: 13.2, carbs: 67.7, fat: 6.5 }
  },
  {
    id: 'rizs',
    names: ['rizs', 'fehér rizs', 'főtt rizs', 'jasmin rizs', 'basmati rizs'],
    category: 'Pékáru & Gabona',
    image: '🍚',
    unit: 'g',
    defaultPortion: 150,
    portionLabel: '1 adag főtt (150g)',
    per100: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 }
  },
  {
    id: 'teszta',
    names: ['tészta', 'teszta', 'spagetti', 'penne', 'fusilli', 'pasta', 'makaróni'],
    category: 'Pékáru & Gabona',
    image: '🍝',
    unit: 'g',
    defaultPortion: 200,
    portionLabel: '1 adag főtt (200g)',
    per100: { calories: 131, protein: 5.0, carbs: 25.0, fat: 1.1 }
  },
  {
    id: 'musli',
    names: ['müzli', 'muzli', 'musli', 'granola', 'muesli'],
    category: 'Pékáru & Gabona',
    image: '🥣',
    unit: 'g',
    defaultPortion: 50,
    portionLabel: '1 adag (50g)',
    per100: { calories: 378, protein: 8.5, carbs: 66.0, fat: 8.0 }
  },

  // ═══════════════════════════════════════════
  // GYÜMÖLCS
  // ═══════════════════════════════════════════
  {
    id: 'alma',
    names: ['alma', 'apple'],
    category: 'Gyümölcs',
    image: '🍎',
    unit: 'db',
    defaultPortion: 180,
    portionLabel: '1 db közepes (180g)',
    per100: { calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 }
  },
  {
    id: 'banan',
    names: ['banán', 'banan', 'banana'],
    category: 'Gyümölcs',
    image: '🍌',
    unit: 'db',
    defaultPortion: 120,
    portionLabel: '1 db közepes (120g)',
    per100: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 }
  },
  {
    id: 'narancs',
    names: ['narancs', 'orange'],
    category: 'Gyümölcs',
    image: '🍊',
    unit: 'db',
    defaultPortion: 180,
    portionLabel: '1 db közepes (180g)',
    per100: { calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1 }
  },
  {
    id: 'eper',
    names: ['eper', 'földieper', 'strawberry'],
    category: 'Gyümölcs',
    image: '🍓',
    unit: 'g',
    defaultPortion: 150,
    portionLabel: '1 adag (150g)',
    per100: { calories: 33, protein: 0.7, carbs: 7.7, fat: 0.3 }
  },
  {
    id: 'szolo',
    names: ['szőlő', 'szolo', 'grape'],
    category: 'Gyümölcs',
    image: '🍇',
    unit: 'g',
    defaultPortion: 150,
    portionLabel: '1 fürt (150g)',
    per100: { calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2 }
  },
  {
    id: 'korte',
    names: ['körte', 'korte', 'pear'],
    category: 'Gyümölcs',
    image: '🍐',
    unit: 'db',
    defaultPortion: 180,
    portionLabel: '1 db közepes (180g)',
    per100: { calories: 57, protein: 0.4, carbs: 15.2, fat: 0.1 }
  },
  {
    id: 'barack',
    names: ['barack', 'őszibarack', 'peach'],
    category: 'Gyümölcs',
    image: '🍑',
    unit: 'db',
    defaultPortion: 150,
    portionLabel: '1 db (150g)',
    per100: { calories: 39, protein: 0.9, carbs: 9.5, fat: 0.3 }
  },
  {
    id: 'cseresznye',
    names: ['cseresznye', 'meggy', 'cherry'],
    category: 'Gyümölcs',
    image: '🍒',
    unit: 'g',
    defaultPortion: 100,
    portionLabel: '1 marék (100g)',
    per100: { calories: 63, protein: 1.1, carbs: 16.0, fat: 0.2 }
  },
  {
    id: 'kiwi',
    names: ['kiwi'],
    category: 'Gyümölcs',
    image: '🥝',
    unit: 'db',
    defaultPortion: 75,
    portionLabel: '1 db (75g)',
    per100: { calories: 61, protein: 1.1, carbs: 14.7, fat: 0.5 }
  },
  {
    id: 'avokado',
    names: ['avokádó', 'avokado', 'avocado'],
    category: 'Gyümölcs',
    image: '🥑',
    unit: 'db',
    defaultPortion: 150,
    portionLabel: '1 db (150g mag nélkül)',
    per100: { calories: 160, protein: 2.0, carbs: 8.5, fat: 14.7 }
  },
  {
    id: 'citrom',
    names: ['citrom', 'lemon'],
    category: 'Gyümölcs',
    image: '🍋',
    unit: 'db',
    defaultPortion: 60,
    portionLabel: '1 db (60g)',
    per100: { calories: 29, protein: 1.1, carbs: 9.3, fat: 0.3 }
  },
  {
    id: 'dinnye',
    names: ['görögdinnye', 'dinnye', 'watermelon'],
    category: 'Gyümölcs',
    image: '🍉',
    unit: 'g',
    defaultPortion: 300,
    portionLabel: '1 szelet (300g)',
    per100: { calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2 }
  },
  {
    id: 'sargadinnye',
    names: ['sárgadinnye', 'cantaloupe', 'melon'],
    category: 'Gyümölcs',
    image: '🍈',
    unit: 'g',
    defaultPortion: 200,
    portionLabel: '1 szelet (200g)',
    per100: { calories: 34, protein: 0.8, carbs: 8.2, fat: 0.2 }
  },

  // ═══════════════════════════════════════════
  // ZÖLDSÉG
  // ═══════════════════════════════════════════
  {
    id: 'paradicsom',
    names: ['paradicsom', 'tomate', 'tomato'],
    category: 'Zöldség',
    image: '🍅',
    unit: 'db',
    defaultPortion: 150,
    portionLabel: '1 db közepes (150g)',
    per100: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 }
  },
  {
    id: 'uborka',
    names: ['uborka', 'cucumber'],
    category: 'Zöldség',
    image: '🥒',
    unit: 'db',
    defaultPortion: 200,
    portionLabel: '1 db (200g)',
    per100: { calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1 }
  },
  {
    id: 'paprika',
    names: ['paprika', 'zöldpaprika', 'kaliforniai paprika', 'bell pepper'],
    category: 'Zöldség',
    image: '🌶️',
    unit: 'db',
    defaultPortion: 120,
    portionLabel: '1 db (120g)',
    per100: { calories: 26, protein: 0.9, carbs: 6.0, fat: 0.3 }
  },
  {
    id: 'hagyma',
    names: ['hagyma', 'vöröshagyma', 'onion'],
    category: 'Zöldség',
    image: '🧅',
    unit: 'db',
    defaultPortion: 100,
    portionLabel: '1 db közepes (100g)',
    per100: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 }
  },
  {
    id: 'fokhagyma',
    names: ['fokhagyma', 'garlic'],
    category: 'Zöldség',
    image: '🧄',
    unit: 'g',
    defaultPortion: 5,
    portionLabel: '1 gerezd (5g)',
    per100: { calories: 149, protein: 6.4, carbs: 33.1, fat: 0.5 }
  },
  {
    id: 'krumpli',
    names: ['krumpli', 'burgonya', 'potato'],
    category: 'Zöldség',
    image: '🥔',
    unit: 'g',
    defaultPortion: 200,
    portionLabel: '1 db közepes (200g)',
    per100: { calories: 77, protein: 2.0, carbs: 17.5, fat: 0.1 }
  },
  {
    id: 'brokkoli',
    names: ['brokkoli', 'broccoli'],
    category: 'Zöldség',
    image: '🥦',
    unit: 'g',
    defaultPortion: 150,
    portionLabel: '1 adag (150g)',
    per100: { calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4 }
  },
  {
    id: 'sargarépa',
    names: ['sárgarépa', 'sargarepa', 'répa', 'carrot'],
    category: 'Zöldség',
    image: '🥕',
    unit: 'db',
    defaultPortion: 80,
    portionLabel: '1 db (80g)',
    per100: { calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2 }
  },
  {
    id: 'kukorica',
    names: ['kukorica', 'corn', 'csemegekukorica'],
    category: 'Zöldség',
    image: '🌽',
    unit: 'db',
    defaultPortion: 200,
    portionLabel: '1 cső (200g)',
    per100: { calories: 86, protein: 3.3, carbs: 19.0, fat: 1.2 }
  },
  {
    id: 'salata-level',
    names: ['saláta', 'fejes saláta', 'jégsaláta', 'lettuce'],
    category: 'Zöldség',
    image: '🥬',
    unit: 'g',
    defaultPortion: 100,
    portionLabel: '1 adag (100g)',
    per100: { calories: 14, protein: 1.4, carbs: 2.9, fat: 0.2 }
  },
  {
    id: 'spenot',
    names: ['spenót', 'spenot', 'spinach'],
    category: 'Zöldség',
    image: '🥬',
    unit: 'g',
    defaultPortion: 100,
    portionLabel: '1 adag (100g)',
    per100: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 }
  },
  {
    id: 'gomba',
    names: ['gomba', 'csiperke', 'csiperkegomba', 'champignon', 'mushroom'],
    category: 'Zöldség',
    image: '🍄',
    unit: 'g',
    defaultPortion: 100,
    portionLabel: '100g',
    per100: { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3 }
  },
  {
    id: 'padlizsan',
    names: ['padlizsán', 'padlizsan', 'eggplant'],
    category: 'Zöldség',
    image: '🍆',
    unit: 'db',
    defaultPortion: 200,
    portionLabel: '1 db (200g)',
    per100: { calories: 25, protein: 1.0, carbs: 5.9, fat: 0.2 }
  },

  // ═══════════════════════════════════════════
  // HÚS & HAL
  // ═══════════════════════════════════════════
  {
    id: 'csirkemell',
    names: ['csirkemell', 'csirke mell', 'chicken breast', 'grillezett csirkemell', 'sült csirkemell'],
    category: 'Hús & Hal',
    image: '🍗',
    unit: 'g',
    defaultPortion: 150,
    portionLabel: '1 adag (150g)',
    per100: { calories: 165, protein: 31.0, carbs: 0, fat: 3.6 }
  },
  {
    id: 'csirkecomb',
    names: ['csirkecomb', 'csirke comb', 'chicken thigh'],
    category: 'Hús & Hal',
    image: '🍗',
    unit: 'g',
    defaultPortion: 150,
    portionLabel: '1 db (150g)',
    per100: { calories: 209, protein: 26.0, carbs: 0, fat: 10.9 }
  },
  {
    id: 'serteshus',
    names: ['sertéshús', 'serteshus', 'sertés', 'pork'],
    category: 'Hús & Hal',
    image: '🥩',
    unit: 'g',
    defaultPortion: 150,
    portionLabel: '1 adag (150g)',
    per100: { calories: 242, protein: 27.3, carbs: 0, fat: 14.0 }
  },
  {
    id: 'marhahus',
    names: ['marhahús', 'marhahus', 'marha', 'beef'],
    category: 'Hús & Hal',
    image: '🥩',
    unit: 'g',
    defaultPortion: 150,
    portionLabel: '1 adag (150g)',
    per100: { calories: 250, protein: 26.0, carbs: 0, fat: 15.0 }
  },
  {
    id: 'csulok',
    names: ['csülök', 'csulok', 'sertés csülök'],
    category: 'Hús & Hal',
    image: '🍖',
    unit: 'g',
    defaultPortion: 200,
    portionLabel: '1 adag (200g)',
    per100: { calories: 260, protein: 18.0, carbs: 0, fat: 21.0 }
  },
  {
    id: 'szalonna',
    names: ['szalonna', 'bacon'],
    category: 'Hús & Hal',
    image: '🥓',
    unit: 'g',
    defaultPortion: 30,
    portionLabel: '2 szelet (30g)',
    per100: { calories: 541, protein: 37.0, carbs: 1.4, fat: 42.0 }
  },
  {
    id: 'kolbasz',
    names: ['kolbász', 'kolbasz', 'sausage', 'virsli'],
    category: 'Hús & Hal',
    image: '🌭',
    unit: 'g',
    defaultPortion: 100,
    portionLabel: '1 pár (100g)',
    per100: { calories: 301, protein: 13.0, carbs: 2.0, fat: 27.0 }
  },
  {
    id: 'sonka',
    names: ['sonka', 'ham', 'főtt sonka'],
    category: 'Hús & Hal',
    image: '🍖',
    unit: 'g',
    defaultPortion: 50,
    portionLabel: '2 szelet (50g)',
    per100: { calories: 145, protein: 21.0, carbs: 1.5, fat: 5.5 }
  },
  {
    id: 'lazac',
    names: ['lazac', 'salmon', 'füstölt lazac'],
    category: 'Hús & Hal',
    image: '🐟',
    unit: 'g',
    defaultPortion: 150,
    portionLabel: '1 filé (150g)',
    per100: { calories: 208, protein: 20.4, carbs: 0, fat: 13.4 }
  },
  {
    id: 'tonhal',
    names: ['tonhal', 'tuna', 'tonhal konzerv'],
    category: 'Hús & Hal',
    image: '🐟',
    unit: 'g',
    defaultPortion: 100,
    portionLabel: '1 konzerv (100g)',
    per100: { calories: 132, protein: 29.0, carbs: 0, fat: 1.3 }
  },

  // ═══════════════════════════════════════════
  // TOJÁS
  // ═══════════════════════════════════════════
  {
    id: 'tojas',
    names: ['tojás', 'tojas', 'egg', 'főtt tojás', 'rántotta', 'tükörtojás'],
    category: 'Tojás',
    image: '🥚',
    unit: 'db',
    defaultPortion: 60,
    portionLabel: '1 db közepes (60g)',
    per100: { calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6 }
  },

  // ═══════════════════════════════════════════
  // HÜVELYESEK & MAGVAK
  // ═══════════════════════════════════════════
  {
    id: 'dio',
    names: ['dió', 'dio', 'walnut'],
    category: 'Hüvelyes & Mag',
    image: '🥜',
    unit: 'g',
    defaultPortion: 30,
    portionLabel: '1 marék (30g)',
    per100: { calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2 }
  },
  {
    id: 'mandula',
    names: ['mandula', 'almond'],
    category: 'Hüvelyes & Mag',
    image: '🥜',
    unit: 'g',
    defaultPortion: 30,
    portionLabel: '1 marék (30g)',
    per100: { calories: 579, protein: 21.2, carbs: 21.7, fat: 49.9 }
  },
  {
    id: 'mogyoro',
    names: ['mogyoró', 'mogyoro', 'földimogyoró', 'peanut'],
    category: 'Hüvelyes & Mag',
    image: '🥜',
    unit: 'g',
    defaultPortion: 30,
    portionLabel: '1 marék (30g)',
    per100: { calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2 }
  },
  {
    id: 'napraforgomag',
    names: ['napraforgó mag', 'napraforgomag', 'sunflower seeds'],
    category: 'Hüvelyes & Mag',
    image: '🌻',
    unit: 'g',
    defaultPortion: 30,
    portionLabel: '1 marék (30g)',
    per100: { calories: 584, protein: 20.8, carbs: 20.0, fat: 51.5 }
  },
  {
    id: 'lenmag',
    names: ['lenmag', 'flaxseed'],
    category: 'Hüvelyes & Mag',
    image: '🌿',
    unit: 'g',
    defaultPortion: 15,
    portionLabel: '1 evőkanál (15g)',
    per100: { calories: 534, protein: 18.3, carbs: 28.9, fat: 42.2 }
  },
  {
    id: 'chiamag',
    names: ['chia mag', 'chiamag', 'chia'],
    category: 'Hüvelyes & Mag',
    image: '🌿',
    unit: 'g',
    defaultPortion: 15,
    portionLabel: '1 evőkanál (15g)',
    per100: { calories: 486, protein: 16.5, carbs: 42.1, fat: 30.7 }
  },

  // ═══════════════════════════════════════════
  // ÉDESSÉG & SNACK
  // ═══════════════════════════════════════════
  {
    id: 'csokolade-etcsi',
    names: ['étcsokoládé', 'etcsokolade', 'dark chocolate'],
    category: 'Édesség & Snack',
    image: '🍫',
    unit: 'g',
    defaultPortion: 30,
    portionLabel: '3 kocka (30g)',
    per100: { calories: 546, protein: 4.9, carbs: 60.0, fat: 31.3 }
  },
  {
    id: 'csokolade-tejes',
    names: ['tejcsokoládé', 'csokoládé', 'csokolade', 'chocolate', 'milk chocolate'],
    category: 'Édesség & Snack',
    image: '🍫',
    unit: 'g',
    defaultPortion: 30,
    portionLabel: '3 kocka (30g)',
    per100: { calories: 535, protein: 7.6, carbs: 59.4, fat: 29.7 }
  },
  {
    id: 'mez',
    names: ['méz', 'mez', 'honey'],
    category: 'Édesség & Snack',
    image: '🍯',
    unit: 'g',
    defaultPortion: 20,
    portionLabel: '1 evőkanál (20g)',
    per100: { calories: 304, protein: 0.3, carbs: 82.4, fat: 0 }
  },
  {
    id: 'cukor',
    names: ['cukor', 'kristálycukor', 'sugar'],
    category: 'Édesség & Snack',
    image: '🧂',
    unit: 'g',
    defaultPortion: 10,
    portionLabel: '2 teáskanál (10g)',
    per100: { calories: 387, protein: 0, carbs: 100, fat: 0 }
  },
  {
    id: 'lekvar',
    names: ['lekvár', 'lekvar', 'dzsem', 'jam'],
    category: 'Édesség & Snack',
    image: '🍓',
    unit: 'g',
    defaultPortion: 20,
    portionLabel: '1 evőkanál (20g)',
    per100: { calories: 250, protein: 0.4, carbs: 62.5, fat: 0.1 }
  },

  // ═══════════════════════════════════════════
  // OLAJ & ZSÍR
  // ═══════════════════════════════════════════
  {
    id: 'olivaolaj',
    names: ['olivaolaj', 'olívaolaj', 'olive oil'],
    category: 'Olaj & Zsír',
    image: '🫒',
    unit: 'ml',
    defaultPortion: 15,
    portionLabel: '1 evőkanál (15ml)',
    per100: { calories: 884, protein: 0, carbs: 0, fat: 100 }
  },
  {
    id: 'napraforgoolaj',
    names: ['napraforgó olaj', 'napraforgoolaj', 'étolaj', 'sunflower oil'],
    category: 'Olaj & Zsír',
    image: '🌻',
    unit: 'ml',
    defaultPortion: 15,
    portionLabel: '1 evőkanál (15ml)',
    per100: { calories: 884, protein: 0, carbs: 0, fat: 100 }
  },

  // ═══════════════════════════════════════════
  // ITAL
  // ═══════════════════════════════════════════
  {
    id: 'narancsle',
    names: ['narancslé', 'narancsle', 'orange juice', 'gyümölcslé'],
    category: 'Ital',
    image: '🧃',
    unit: 'ml',
    defaultPortion: 250,
    portionLabel: '1 pohár (250ml)',
    per100: { calories: 45, protein: 0.7, carbs: 10.4, fat: 0.2 }
  },
  {
    id: 'almasle',
    names: ['almalé', 'almasle', 'apple juice'],
    category: 'Ital',
    image: '🧃',
    unit: 'ml',
    defaultPortion: 250,
    portionLabel: '1 pohár (250ml)',
    per100: { calories: 46, protein: 0.1, carbs: 11.3, fat: 0.1 }
  },
  {
    id: 'cola',
    names: ['kóla', 'kola', 'coca cola', 'pepsi', 'cola'],
    category: 'Ital',
    image: '🥤',
    unit: 'ml',
    defaultPortion: 330,
    portionLabel: '1 doboz (330ml)',
    per100: { calories: 42, protein: 0, carbs: 10.6, fat: 0 }
  },
  {
    id: 'cola-zero',
    names: ['kóla zero', 'cola zero', 'zero cola', 'diet cola', 'light kóla'],
    category: 'Ital',
    image: '🥤',
    unit: 'ml',
    defaultPortion: 330,
    portionLabel: '1 doboz (330ml)',
    per100: { calories: 0, protein: 0, carbs: 0, fat: 0 }
  },
  {
    id: 'sor',
    names: ['sör', 'sor', 'beer', 'világos sör'],
    category: 'Ital',
    image: '🍺',
    unit: 'ml',
    defaultPortion: 500,
    portionLabel: '1 korsó (500ml)',
    per100: { calories: 43, protein: 0.5, carbs: 3.6, fat: 0 }
  },
  {
    id: 'bor-voros',
    names: ['vörösbor', 'bor', 'wine', 'red wine'],
    category: 'Ital',
    image: '🍷',
    unit: 'ml',
    defaultPortion: 150,
    portionLabel: '1 pohár (150ml)',
    per100: { calories: 85, protein: 0.1, carbs: 2.6, fat: 0 }
  },
  {
    id: 'bor-feher',
    names: ['fehérbor', 'feherbor', 'white wine'],
    category: 'Ital',
    image: '🍷',
    unit: 'ml',
    defaultPortion: 150,
    portionLabel: '1 pohár (150ml)',
    per100: { calories: 82, protein: 0.1, carbs: 2.6, fat: 0 }
  },
  {
    id: 'viz',
    names: ['víz', 'viz', 'ásványvíz', 'water'],
    category: 'Ital',
    image: '💧',
    unit: 'ml',
    defaultPortion: 250,
    portionLabel: '1 pohár (250ml)',
    per100: { calories: 0, protein: 0, carbs: 0, fat: 0 }
  },

  // ═══════════════════════════════════════════
  // FŰSZER & SZÓSZ
  // ═══════════════════════════════════════════
  {
    id: 'ketchup',
    names: ['ketchup', 'kecap'],
    category: 'Fűszer & Szósz',
    image: '🍅',
    unit: 'g',
    defaultPortion: 15,
    portionLabel: '1 evőkanál (15g)',
    per100: { calories: 112, protein: 1.7, carbs: 27.0, fat: 0.1 }
  },
  {
    id: 'mustar',
    names: ['mustár', 'mustar', 'mustard'],
    category: 'Fűszer & Szósz',
    image: '🟡',
    unit: 'g',
    defaultPortion: 10,
    portionLabel: '1 teáskanál (10g)',
    per100: { calories: 66, protein: 4.4, carbs: 5.3, fat: 3.3 }
  },
  {
    id: 'majonez',
    names: ['majonéz', 'majonez', 'mayo', 'mayonnaise'],
    category: 'Fűszer & Szósz',
    image: '🥄',
    unit: 'g',
    defaultPortion: 15,
    portionLabel: '1 evőkanál (15g)',
    per100: { calories: 680, protein: 1.0, carbs: 0.6, fat: 75.0 }
  },

  // ═══════════════════════════════════════════
  // EGYÉB
  // ═══════════════════════════════════════════
  {
    id: 'protein-shake',
    names: ['protein shake', 'fehérje shake', 'protein por', 'whey protein'],
    category: 'Egyéb',
    image: '🥤',
    unit: 'g',
    defaultPortion: 30,
    portionLabel: '1 adag por (30g)',
    per100: { calories: 380, protein: 75.0, carbs: 8.0, fat: 5.0 }
  },
];


// ─── Hungarian Suffix Stripping ───────────────────────────────────────
const hungarianSuffixes = [
  // Instrumental case (-val/-vel) - "kecsketejjel", "vajjal", "cukorral"
  'jjel', 'jjal', 'vel', 'val', 'zel', 'zal', 'sel', 'sal', 'rel', 'ral',
  // Short instrumental endings (for consonant assimilation: "tejjel" → "tej" + "jel")
  'el', 'al',
  // Superessive case (-on/-en/-ön) 
  'on', 'en', 'ön',
  // Inessive case (-ban/-ben)
  'ban', 'ben',
  // Sublative case (-ra/-re)
  'ra', 're',
  // Translative case (-vá/-vé)
  'vá', 'vé', 'va', 've',
  // Dative (-nak/-nek)
  'nak', 'nek',
  // Plural
  'ok', 'ek', 'ök', 'ak',
  // Accusative
  'at', 'et', 'ot', 'öt', 't',
];

// Strip Hungarian suffixes to get the root word
function stripHungarianSuffix(word: string): string[] {
  const results = [word];
  
  for (const suffix of hungarianSuffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      const stripped = word.slice(0, -suffix.length);
      results.push(stripped);
      
      // Handle consonant doubling: "tejjel" → "tej" (remove doubled last char)
      if (stripped.length >= 2 && stripped[stripped.length - 1] === stripped[stripped.length - 2]) {
        results.push(stripped.slice(0, -1));
      }
    }
  }
  
  return [...new Set(results)];
}

// Normalize Hungarian text: remove accents for fuzzy matching
function normalizeHungarian(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ő/g, 'o').replace(/ű/g, 'u')
    .replace(/Ő/g, 'O').replace(/Ű/g, 'U');
}

// ─── Smart Food Parser ────────────────────────────────────────────────

// Hungarian connector/modifier words to split on or ignore
const connectorWords = new Set([
  'és', 'meg', 'plusz', 'with', 'mellé', 'hozzá', 'valamint', 'továbbá', 'is',
  'egy', 'kis', 'nagy', 'fél', 'pár', 'sok', 'kevés', 'darab', 'db',
]);

// Quantity modifier patterns
const quantityPatterns: { pattern: RegExp; multiplier: number; label: string }[] = [
  { pattern: /(\d+)\s*ml/i, multiplier: 1, label: 'ml' },
  { pattern: /(\d+)\s*g\b/i, multiplier: 1, label: 'g' },
  { pattern: /(\d+)\s*dl/i, multiplier: 100, label: 'ml' },
  { pattern: /(\d+)\s*l\b/i, multiplier: 1000, label: 'ml' },
  { pattern: /(\d+)\s*kg/i, multiplier: 1000, label: 'g' },
  { pattern: /(\d+)\s*db/i, multiplier: 1, label: 'db' },
  { pattern: /(\d+(?:[.,]\d+)?)\s*adag/i, multiplier: 1, label: 'adag' },
  { pattern: /dupla/i, multiplier: 2, label: 'x' },
  { pattern: /tripla/i, multiplier: 3, label: 'x' },
];

export interface RecognizedComponent {
  food: FoodItem;
  portion: number;        // actual portion in g or ml
  portionLabel: string;   // human-readable portion
  matchedText: string;    // the text that matched
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface AIRecognitionResult {
  components: RecognizedComponent[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  combinedName: string;
  combinedImage: string;
  confidence: number; // 0-1
}

function matchFoodItem(query: string): { food: FoodItem; score: number } | null {
  const normalizedQuery = normalizeHungarian(query.trim());
  const queryWords = normalizedQuery.split(/\s+/);
  
  let bestMatch: { food: FoodItem; score: number } | null = null;
  
  for (const food of foodKnowledge) {
    for (const name of food.names) {
      const normalizedName = normalizeHungarian(name);
      
      // Exact match
      if (normalizedQuery === normalizedName) {
        return { food, score: 1.0 };
      }
      
      // Query contains full food name
      if (normalizedQuery.includes(normalizedName)) {
        const score = normalizedName.length / normalizedQuery.length;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { food, score: Math.max(0.9, score) };
        }
        continue;
      }
      
      // Food name contains query
      if (normalizedName.includes(normalizedQuery) && normalizedQuery.length >= 3) {
        const score = normalizedQuery.length / normalizedName.length;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { food, score: Math.max(0.7, score) };
        }
        continue;
      }
      
      // Word-level matching with Hungarian suffix stripping
      const nameWords = normalizedName.split(/\s+/);
      let wordMatches = 0;
      
      for (const qWord of queryWords) {
        const qVariants = stripHungarianSuffix(qWord);
        const qNormVariants = qVariants.map(v => normalizeHungarian(v));
        
        for (const nWord of nameWords) {
          const nVariants = stripHungarianSuffix(nWord);
          const nNormVariants = nVariants.map(v => normalizeHungarian(v));
          
          // Check if any variant of the query word matches any variant of the name word
          for (const qv of qNormVariants) {
            for (const nv of nNormVariants) {
              if (qv === nv || (qv.length >= 3 && nv.startsWith(qv)) || (nv.length >= 3 && qv.startsWith(nv))) {
                wordMatches++;
                break;
              }
            }
          }
        }
      }
      
      if (wordMatches > 0) {
        const score = wordMatches / Math.max(queryWords.length, nameWords.length) * 0.8;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { food, score };
        }
      }
    }
  }
  
  return bestMatch && bestMatch.score >= 0.3 ? bestMatch : null;
}

function extractQuantity(text: string, food: FoodItem): { portion: number; label: string; remainingText: string } {
  let portion = food.defaultPortion;
  let label = food.portionLabel;
  let remainingText = text;
  
  for (const { pattern, multiplier, label: unitLabel } of quantityPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (unitLabel === 'x') {
        // Multiplier (dupla, tripla)
        portion = food.defaultPortion * multiplier;
        label = `${multiplier}x ${food.portionLabel}`;
      } else if (unitLabel === 'adag') {
        const servings = parseFloat(match[1].replace(',', '.'));
        portion = food.defaultPortion * servings;
        label = `${servings} adag`;
      } else {
        const value = parseFloat(match[1]);
        portion = value * (unitLabel === 'ml' && multiplier > 1 ? multiplier : 1);
        if (unitLabel === 'g' && multiplier > 1) portion = value * multiplier;
        if (unitLabel === 'ml') portion = value * (multiplier || 1);
        label = `${portion}${food.unit}`;
      }
      remainingText = text.replace(match[0], '').trim();
      break;
    }
  }
  
  // Check for "kis"/"nagy" modifiers
  if (/\bkis\b/i.test(text)) {
    portion = Math.round(food.defaultPortion * 0.7);
    label = `kis adag (~${portion}${food.unit})`;
  } else if (/\bnagy\b/i.test(text)) {
    portion = Math.round(food.defaultPortion * 1.5);
    label = `nagy adag (~${portion}${food.unit})`;
  }
  
  return { portion, label, remainingText };
}

// Split compound food descriptions into parts
function splitFoodDescription(input: string): string[] {
  // First split by common connectors
  let parts = input
    .replace(/\s+(és|meg|plusz|valamint|továbbá)\s+/gi, '|||')
    .split('|||')
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  // For single part, try to detect compound foods with Hungarian suffixes
  // e.g., "kávé kecsketejjel" → ["kávé", "kecsketejjel"]
  if (parts.length === 1) {
    const words = parts[0].split(/\s+/);
    const subParts: string[] = [];
    let currentPart = '';
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const isConnector = connectorWords.has(word.toLowerCase());
      const isQuantityWord = /^\d+$/.test(word) || /^(ml|g|dl|l|kg|db)$/i.test(word);
      
      // Check if this word has an instrumental suffix (-val/-vel/-jel/-jal)
      const hasInstrumental = /(.+)(jjel|jjal|vel|val|zel|zal|sel|sal|rel|ral)$/i.test(word.toLowerCase());
      
      if (hasInstrumental && currentPart.length > 0) {
        // This is a new component (e.g., "kecsketejjel" = with goat milk)
        subParts.push(currentPart.trim());
        subParts.push(word);
        currentPart = '';
      } else if (isConnector) {
        if (currentPart.trim()) subParts.push(currentPart.trim());
        currentPart = '';
      } else {
        currentPart += (currentPart ? ' ' : '') + word;
      }
    }
    
    if (currentPart.trim()) subParts.push(currentPart.trim());
    if (subParts.length > 1) parts = subParts;
  }
  
  return parts;
}

// ─── Main AI Recognition Function ─────────────────────────────────────

export function recognizeFoodFromText(input: string): AIRecognitionResult | null {
  if (!input || input.trim().length < 2) return null;
  
  const parts = splitFoodDescription(input.trim());
  const components: RecognizedComponent[] = [];
  const seenFoodIds = new Set<string>();
  
  for (const part of parts) {
    // Try matching the whole part first
    let match = matchFoodItem(part);
    
    // If no match, try stripping suffixes from the whole part
    if (!match) {
      const words = part.split(/\s+/);
      const strippedWords = words.flatMap(w => stripHungarianSuffix(w.toLowerCase()));
      for (const stripped of strippedWords) {
        match = matchFoodItem(stripped);
        if (match) break;
      }
    }
    
    // If still no match, try each word individually
    if (!match) {
      const words = part.split(/\s+/);
      for (const word of words) {
        if (word.length < 3 || connectorWords.has(word.toLowerCase())) continue;
        const variants = stripHungarianSuffix(word.toLowerCase());
        for (const variant of variants) {
          match = matchFoodItem(variant);
          if (match) break;
        }
        if (match) break;
      }
    }
    
    if (match && !seenFoodIds.has(match.food.id)) {
      seenFoodIds.add(match.food.id);
      
      const { portion, label } = extractQuantity(part, match.food);
      const multiplier = portion / 100;
      
      components.push({
        food: match.food,
        portion,
        portionLabel: label,
        matchedText: part,
        nutrition: {
          calories: Math.round(match.food.per100.calories * multiplier),
          protein: Math.round(match.food.per100.protein * multiplier * 10) / 10,
          carbs: Math.round(match.food.per100.carbs * multiplier * 10) / 10,
          fat: Math.round(match.food.per100.fat * multiplier * 10) / 10,
        }
      });
    }
  }
  
  if (components.length === 0) return null;
  
  const totalNutrition = components.reduce((acc, c) => ({
    calories: acc.calories + c.nutrition.calories,
    protein: Math.round((acc.protein + c.nutrition.protein) * 10) / 10,
    carbs: Math.round((acc.carbs + c.nutrition.carbs) * 10) / 10,
    fat: Math.round((acc.fat + c.nutrition.fat) * 10) / 10,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  
  const combinedName = components.map(c => c.food.names[0]).join(' + ');
  const combinedImage = components[0].food.image;
  const confidence = components.length / parts.length;
  
  return {
    components,
    totalNutrition,
    combinedName,
    combinedImage,
    confidence,
  };
}

// ─── Search foods by query (for autocomplete dropdown) ────────────────

export function searchFoodKnowledge(query: string): FoodItem[] {
  if (!query || query.trim().length < 2) return [];
  
  const normalizedQuery = normalizeHungarian(query.trim());
  const queryVariants = stripHungarianSuffix(normalizedQuery);
  
  const results: { food: FoodItem; score: number }[] = [];
  
  for (const food of foodKnowledge) {
    let maxScore = 0;
    
    for (const name of food.names) {
      const normalizedName = normalizeHungarian(name);
      
      // Exact start match
      for (const variant of queryVariants) {
        if (normalizedName.startsWith(variant)) {
          maxScore = Math.max(maxScore, 0.95);
        }
        if (normalizedName.includes(variant) && variant.length >= 3) {
          maxScore = Math.max(maxScore, 0.8);
        }
      }
      
      // Partial word match
      if (normalizedName.includes(normalizedQuery)) {
        maxScore = Math.max(maxScore, 0.9);
      }
      
      // Reversed: query includes food name
      if (normalizedQuery.includes(normalizedName) && normalizedName.length >= 3) {
        maxScore = Math.max(maxScore, 0.85);
      }
    }
    
    if (maxScore > 0) {
      results.push({ food, score: maxScore });
    }
  }
  
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(r => r.food);
}

// ═══════════════════════════════════════════════════════════════════════
// COMPOUND FOOD VARIANTS — Traditional dishes with recipe-level variants
// ═══════════════════════════════════════════════════════════════════════

export interface CompoundFoodVariant {
  id: string;
  variantName: string;
  description: string;
  keyIngredients: string[];
  per100: { calories: number; protein: number; carbs: number; fat: number };
  defaultPortionG: number;
  portionLabel: string;
  tags: string[];
}

export interface CompoundFood {
  id: string;
  baseName: string;
  names: string[];
  image: string;
  category: CompoundFoodCategory;
  region: 'erdélyi' | 'magyar' | 'román' | 'nemzetközi' | 'balkáni';
  description: string;
  variants: CompoundFoodVariant[];
  defaultVariantId: string;
}

export type CompoundFoodCategory =
  | 'Savanyúság & Konzerv'
  | 'Saláta & Krém'
  | 'Leves'
  | 'Főétel'
  | 'Előétel & Mártás'
  | 'Pékáru & Tészta'
  | 'Desszert';

export const compoundFoodDatabase: CompoundFood[] = [
  // ═══ ZAKUSZKA ═══
  {
    id: 'zakuszka', baseName: 'Zakuszka',
    names: ['zakuszka','zacusca','zacuscă','zakuszka házi','zakuszka hazi','zöldségkrém','zoldségkrem','padlizsánkrém','padlizsankrem','román zakuszka','roman zakuszka','erdélyi zakuszka','erdelyi zakuszka','zakuszka konzerv','házi zakuszka','hazi zakuszka'],
    image: '🫙', category: 'Savanyúság & Konzerv', region: 'román',
    description: 'Román eredetű zöldségkrém sült paprikából és paradicsomból, számos regionális variánssal.',
    defaultVariantId: 'zakuszka-sima',
    variants: [
      { id: 'zakuszka-sima', variantName: 'Zakuszka sima (klasszikus)', description: 'Hagyományos sült paprika + paradicsom + hagyma alap, olajjal.', keyIngredients: ['sült paprika','paradicsom','hagyma','napraforgó olaj'], per100: { calories: 92, protein: 1.4, carbs: 9.8, fat: 5.2 }, defaultPortionG: 100, portionLabel: '~4 evőkanál (100g)', tags: ['vegán','klasszikus','olajjal'] },
      { id: 'zakuszka-vinettaval', variantName: 'Zakuszka padlizsánnal (vinettás)', description: 'Padlizsánnal krémesebbé és gazdagabbá téve. Több olajat igényel.', keyIngredients: ['sült paprika','padlizsán','paradicsom','hagyma','olaj'], per100: { calories: 108, protein: 1.6, carbs: 8.5, fat: 7.8 }, defaultPortionG: 100, portionLabel: '~4 evőkanál (100g)', tags: ['vegán','krémes','padlizsános'] },
      { id: 'zakuszka-babos', variantName: 'Zakuszka babbal (fasole)', description: 'Fehér babbal gazdagított — több fehérje és szénhidrát, laktatóbb.', keyIngredients: ['sült paprika','fehér bab','paradicsom','hagyma','olaj'], per100: { calories: 118, protein: 4.8, carbs: 14.2, fat: 4.5 }, defaultPortionG: 100, portionLabel: '~4 evőkanál (100g)', tags: ['vegán','fehérjedús','babos'] },
      { id: 'zakuszka-gombas', variantName: 'Zakuszka gombával', description: 'Csiperke- vagy erdei gombával — umami íz, alacsonyabb kalória.', keyIngredients: ['sült paprika','csiperkegomba','paradicsom','hagyma','olaj'], per100: { calories: 85, protein: 2.1, carbs: 8.2, fat: 4.8 }, defaultPortionG: 100, portionLabel: '~4 evőkanál (100g)', tags: ['vegán','gombás','könnyű'] },
      { id: 'zakuszka-vegyes', variantName: 'Zakuszka vegyes (de toate)', description: 'Paprika, padlizsán, gomba, bab — a leggazdagabb verzió.', keyIngredients: ['sült paprika','padlizsán','gomba','bab','paradicsom','olaj'], per100: { calories: 105, protein: 3.2, carbs: 10.5, fat: 5.6 }, defaultPortionG: 100, portionLabel: '~4 evőkanál (100g)', tags: ['vegán','vegyes','laktatós'] },
      { id: 'zakuszka-csipos', variantName: 'Zakuszka csípős (cu ardei iute)', description: 'Erős paprikával fűszerezve — anyagcserét serkentő.', keyIngredients: ['sült paprika','erős paprika','paradicsom','hagyma','olaj'], per100: { calories: 95, protein: 1.5, carbs: 10.2, fat: 5.3 }, defaultPortionG: 100, portionLabel: '~4 evőkanál (100g)', tags: ['vegán','csípős','pikáns'] },
      { id: 'zakuszka-light', variantName: 'Zakuszka light (olaj nélkül)', description: 'Minimális olajjal vagy olaj nélkül — diétás verzió.', keyIngredients: ['sült paprika','paradicsom','hagyma'], per100: { calories: 48, protein: 1.3, carbs: 10.0, fat: 0.5 }, defaultPortionG: 100, portionLabel: '~4 evőkanál (100g)', tags: ['vegán','diétás','olajmentes'] },
    ]
  },
  // ═══ VINETTA SALÁTA ═══
  {
    id: 'vinetta', baseName: 'Vinetta saláta',
    names: ['vinetta','vinetta saláta','vinetta salata','salata de vinete','padlizsánkrém','padlizsankrem','padlizsán saláta','padlizsan salata','vinete','vinetta salat','padlizsánkrém házi','padlizsansalata','baba ganoush','babaganus','babaganoush'],
    image: '🍆', category: 'Saláta & Krém', region: 'román',
    description: 'Grillezett padlizsánból készült krém — a román konyha alappillére.',
    defaultVariantId: 'vinetta-sima',
    variants: [
      { id: 'vinetta-sima', variantName: 'Vinetta sima (klasszikus)', description: 'Grillezett padlizsán + hagyma + só, kézzel kavarva.', keyIngredients: ['grillezett padlizsán','hagyma','só'], per100: { calories: 48, protein: 1.2, carbs: 5.8, fat: 2.1 }, defaultPortionG: 100, portionLabel: '~4 evőkanál (100g)', tags: ['vegán','könnyű','grillezett'] },
      { id: 'vinetta-olajjal', variantName: 'Vinetta olajjal (cu ulei)', description: 'Napraforgó- vagy olívaolajjal locsolva — krémes, gazdagabb.', keyIngredients: ['grillezett padlizsán','hagyma','napraforgó olaj'], per100: { calories: 132, protein: 1.1, carbs: 4.5, fat: 12.4 }, defaultPortionG: 100, portionLabel: '~4 evőkanál (100g)', tags: ['vegán','olajjal','krémes'] },
      { id: 'vinetta-majonezzel', variantName: 'Vinetta majonézzel', description: 'Majonéz hozzáadásával — jelentősen magasabb kalória és zsír.', keyIngredients: ['grillezett padlizsán','hagyma','majonéz'], per100: { calories: 195, protein: 1.3, carbs: 4.0, fat: 19.2 }, defaultPortionG: 100, portionLabel: '~4 evőkanál (100g)', tags: ['krémes','majonézes','gazdag'] },
      { id: 'vinetta-grillezett', variantName: 'Vinetta grillezve (egészben)', description: 'Nyílt lángon sütött padlizsán, füstös ízzel, minimal feldolgozás.', keyIngredients: ['egészben grillezett padlizsán','hagyma','só'], per100: { calories: 42, protein: 1.1, carbs: 5.5, fat: 1.8 }, defaultPortionG: 150, portionLabel: '1 adag (~150g)', tags: ['vegán','füstös','natúr'] },
      { id: 'vinetta-tahinis', variantName: 'Vinetta tahini szósszal (baba ganoush)', description: 'Közel-keleti stílus — tahini, citromlé, fokhagyma.', keyIngredients: ['grillezett padlizsán','tahini','citromlé','fokhagyma','olívaolaj'], per100: { calories: 145, protein: 3.5, carbs: 7.2, fat: 11.8 }, defaultPortionG: 100, portionLabel: '~4 evőkanál (100g)', tags: ['közel-keleti','tahinis','krémes'] },
      { id: 'vinetta-paradicsomos', variantName: 'Vinetta paradicsommal', description: 'Friss paradicsomkockákkal — könnyebb, frissebb változat.', keyIngredients: ['grillezett padlizsán','paradicsom','hagyma','olaj'], per100: { calories: 72, protein: 1.3, carbs: 6.5, fat: 4.5 }, defaultPortionG: 100, portionLabel: '~4 evőkanál (100g)', tags: ['vegán','paradicsomos','friss'] },
    ]
  },
  // ═══ FASÍRT ═══
  {
    id: 'fasirt', baseName: 'Fasírt',
    names: ['fasírt','fasirt','fasírozott','fasirozott','húsgombóc','husgomboc','meatball','chiftele','chiftea','parjoale','chiftelute','vagdalt'],
    image: '🍖', category: 'Főétel', region: 'magyar',
    description: 'Darált húsból készült fasírozott — variánsok a hústípus és készítés szerint.',
    defaultVariantId: 'fasirt-sertesmarha',
    variants: [
      { id: 'fasirt-sertesmarha', variantName: 'Fasírt sertés-marha (sütve)', description: 'Klasszikus 50-50 sertés-marha, serpenyőben sütve.', keyIngredients: ['darált sertés','darált marha','tojás','zsemlemorzsa','olaj'], per100: { calories: 245, protein: 17.5, carbs: 8.0, fat: 16.2 }, defaultPortionG: 120, portionLabel: '1 db közepes (120g)', tags: ['sütve','klasszikus'] },
      { id: 'fasirt-csirkemell', variantName: 'Fasírt csirkemellből', description: 'Sovány csirkemellből — alacsonyabb zsír, magasabb fehérje.', keyIngredients: ['darált csirkemell','tojás','zsemlemorzsa','hagyma'], per100: { calories: 168, protein: 22.0, carbs: 7.5, fat: 5.8 }, defaultPortionG: 120, portionLabel: '1 db közepes (120g)', tags: ['diétás','csirkés'] },
      { id: 'fasirt-sutoben', variantName: 'Fasírt sütőben (olaj nélkül)', description: 'Sütőben sütve olaj nélkül — kevesebb zsír.', keyIngredients: ['darált hús','tojás','zsemlemorzsa'], per100: { calories: 195, protein: 18.0, carbs: 8.0, fat: 10.0 }, defaultPortionG: 120, portionLabel: '1 db közepes (120g)', tags: ['sütőben','könnyebb'] },
      { id: 'fasirt-rantott', variantName: 'Rántott fasírt', description: 'Panírozva és bő olajban kisütve — legkalóriásabb.', keyIngredients: ['darált hús','tojás','liszt','zsemlemorzsa','olaj'], per100: { calories: 298, protein: 16.0, carbs: 14.5, fat: 20.0 }, defaultPortionG: 120, portionLabel: '1 db közepes (120g)', tags: ['rántott','bő olajban'] },
    ]
  },
  // ═══ MICI / MITITEI ═══
  {
    id: 'mici', baseName: 'Mici (Mititei)',
    names: ['mici','mititei','micsek','grill mici','mici grill','mic','miccs','mícsek','sült mici','sult mici','grillezett mici'],
    image: '🥩', category: 'Főétel', region: 'román',
    description: 'Román darált hús rúd — grillen a legjobb.',
    defaultVariantId: 'mici-grill',
    variants: [
      { id: 'mici-grill', variantName: 'Mici grillezve (klasszikus)', description: 'Szénparázsón sütve — a zsír lecsepeg.', keyIngredients: ['marha-sertés darált','szódabikarbóna','fokhagyma','bors','kakukkfű'], per100: { calories: 235, protein: 19.5, carbs: 1.2, fat: 17.0 }, defaultPortionG: 150, portionLabel: '3 db (150g)', tags: ['grill','klasszikus'] },
      { id: 'mici-serpenyoben', variantName: 'Mici serpenyőben (olajjal)', description: 'Serpenyőben — több zsír szívódik fel.', keyIngredients: ['marha-sertés darált','szódabikarbóna','fokhagyma','napraforgó olaj'], per100: { calories: 268, protein: 18.5, carbs: 1.5, fat: 21.0 }, defaultPortionG: 150, portionLabel: '3 db (150g)', tags: ['serpenyős','olajjal'] },
      { id: 'mici-csirkes', variantName: 'Mici csirkéből (light)', description: 'Csirke darált húsból — kevesebb zsír.', keyIngredients: ['darált csirke','szódabikarbóna','fokhagyma','fűszerek'], per100: { calories: 162, protein: 21.0, carbs: 1.5, fat: 8.0 }, defaultPortionG: 150, portionLabel: '3 db (150g)', tags: ['csirkés','light'] },
    ]
  },
  // ═══ SARMALE / TÖLTÖTT KÁPOSZTA ═══
  {
    id: 'sarmale', baseName: 'Töltött káposzta (Sarmale)',
    names: ['sarmale','szarmále','szarmale','töltött káposzta','toltott kaposzta','sarma','töltike','toltike','káposztatekercs','kaposztatekercs'],
    image: '🥬', category: 'Főétel', region: 'román',
    description: 'Savanyú káposztába töltött hús + rizs — ünnepek sztárétele.',
    defaultVariantId: 'sarmale-klasszikus',
    variants: [
      { id: 'sarmale-klasszikus', variantName: 'Sarmale klasszikus (sertés-marha)', description: 'Hagyományos 50-50 darált, rizzsel, savanyú káposztalevélben.', keyIngredients: ['savanyú káposzta','darált sertés-marha','rizs','hagyma','szalonna'], per100: { calories: 155, protein: 8.5, carbs: 9.2, fat: 9.5 }, defaultPortionG: 300, portionLabel: '3 db (~300g)', tags: ['klasszikus','ünnep'] },
      { id: 'sarmale-tejfollel', variantName: 'Sarmale tejföllel', description: 'Tejfölös szósszal tálalva — emeli a kalóriát.', keyIngredients: ['savanyú káposzta','darált hús','rizs','tejföl 20%'], per100: { calories: 178, protein: 7.8, carbs: 9.0, fat: 12.5 }, defaultPortionG: 350, portionLabel: '3 db + tejföl (~350g)', tags: ['tejföllel','gazdag'] },
      { id: 'sarmale-mamaligaval', variantName: 'Sarmale puliszkával', description: 'Puliszka mellé tálalva — plusz szénhidrát.', keyIngredients: ['savanyú káposzta','darált hús','rizs','puliszka'], per100: { calories: 165, protein: 7.0, carbs: 14.5, fat: 8.5 }, defaultPortionG: 400, portionLabel: '3 db + puliszka (~400g)', tags: ['puliszkával','tradicionális'] },
      { id: 'sarmale-csirkes', variantName: 'Sarmale csirkehúsból (light)', description: 'Csirkemell darált hússal — kevesebb zsír.', keyIngredients: ['savanyú káposzta','darált csirke','rizs','hagyma'], per100: { calories: 118, protein: 10.5, carbs: 9.5, fat: 4.0 }, defaultPortionG: 300, portionLabel: '3 db (~300g)', tags: ['light','csirkés'] },
    ]
  },
  // ═══ LECSÓ ═══
  {
    id: 'lecso', baseName: 'Lecsó',
    names: ['lecsó','lecso','paprikás lecsó','paprikas lecso','kolbászos lecsó','kolbaszos lecso','tojásos lecsó','tojasos lecso'],
    image: '🫑', category: 'Főétel', region: 'magyar',
    description: 'Magyar paprika-paradicsom ragu — variánsok a hozzáadott fehérje szerint.',
    defaultVariantId: 'lecso-sima',
    variants: [
      { id: 'lecso-sima', variantName: 'Lecsó sima (zöldséges)', description: 'Csak paprika, paradicsom, hagyma — vegán.', keyIngredients: ['paprika','paradicsom','hagyma','olaj'], per100: { calories: 52, protein: 1.2, carbs: 6.8, fat: 2.5 }, defaultPortionG: 300, portionLabel: '1 tányér (~300g)', tags: ['vegán','könnyű'] },
      { id: 'lecso-tojasos', variantName: 'Lecsó tojással', description: 'Felvert tojással — fehérjedús változat.', keyIngredients: ['paprika','paradicsom','hagyma','tojás','olaj'], per100: { calories: 78, protein: 4.5, carbs: 5.8, fat: 4.2 }, defaultPortionG: 300, portionLabel: '1 tányér (~300g)', tags: ['tojásos','fehérjedús'] },
      { id: 'lecso-kolbaszos', variantName: 'Lecsó kolbásszal', description: 'Debreceni kolbásszal — kalóriásabb és zsírosabb.', keyIngredients: ['paprika','paradicsom','hagyma','debreceni kolbász','olaj'], per100: { calories: 125, protein: 6.5, carbs: 5.5, fat: 8.8 }, defaultPortionG: 300, portionLabel: '1 tányér (~300g)', tags: ['kolbászos','gazdag'] },
      { id: 'lecso-virslis', variantName: 'Lecsó virslivel', description: 'Virslivel — gyors, laktatós családi változat.', keyIngredients: ['paprika','paradicsom','hagyma','virsli','olaj'], per100: { calories: 98, protein: 4.2, carbs: 5.5, fat: 6.5 }, defaultPortionG: 300, portionLabel: '1 tányér (~300g)', tags: ['virslis','gyors'] },
    ]
  },
  // ═══ PULISZKA ═══
  {
    id: 'puliszka', baseName: 'Puliszka (Mămăligă)',
    names: ['puliszka','mamaliga','mămăligă','polenta','puliszka sajtos','mamaliga cu branza','puliszka tejföllel'],
    image: '🌽', category: 'Főétel', region: 'erdélyi',
    description: 'Kukoricadarából főtt erdélyi/román köret.',
    defaultVariantId: 'puliszka-sima',
    variants: [
      { id: 'puliszka-sima', variantName: 'Puliszka sima', description: 'Vízben főtt kukoricadara — könnyű köret.', keyIngredients: ['kukoricadara','víz','só'], per100: { calories: 72, protein: 1.6, carbs: 15.5, fat: 0.5 }, defaultPortionG: 200, portionLabel: '1 adag (~200g)', tags: ['vegán','köret','sima'] },
      { id: 'puliszka-sajtos', variantName: 'Puliszka sajttal (cu brânză)', description: 'Juhtúróval vagy sajttal rétegelve — gazdagabb.', keyIngredients: ['kukoricadara','juhtúró/sajt','tejföl','vaj'], per100: { calories: 165, protein: 7.0, carbs: 14.0, fat: 9.0 }, defaultPortionG: 250, portionLabel: '1 adag (~250g)', tags: ['sajtos','erdélyi','gazdag'] },
      { id: 'puliszka-szalonnas', variantName: 'Puliszka tejföllel és szalonnával', description: 'Sült szalonnával és tejföllel tálalva.', keyIngredients: ['kukoricadara','tejföl','sült szalonna'], per100: { calories: 195, protein: 5.5, carbs: 13.5, fat: 13.5 }, defaultPortionG: 250, portionLabel: '1 adag (~250g)', tags: ['szalonnás','tejfölös','gazdag'] },
    ]
  },
  // ═══ LÁNGOS ═══
  {
    id: 'langos', baseName: 'Lángos',
    names: ['lángos','langos','lángos sajtos','langos sajtos','lángos tejfölös','langos tejfolos','lángos fokhagymás','langos fokhagymas','sima langos'],
    image: '🫓', category: 'Pékáru & Tészta', region: 'magyar',
    description: 'Bő olajban sütött kelt tészta — a feltétek radikálisan változtatják a kalóriát.',
    defaultVariantId: 'langos-sajtos-tejfolos',
    variants: [
      { id: 'langos-sima', variantName: 'Lángos sima (fokhagymás)', description: 'Fokhagyma és só — a legkönnyebb, de még olajban sütve.', keyIngredients: ['kelt tészta','olaj','fokhagyma','só'], per100: { calories: 312, protein: 6.0, carbs: 42.0, fat: 13.0 }, defaultPortionG: 150, portionLabel: '1 db (~150g)', tags: ['fokhagymás','sima'] },
      { id: 'langos-tejfolos', variantName: 'Lángos tejföllel', description: 'Tejföllel kenve — plusz zsír.', keyIngredients: ['kelt tészta','olaj','tejföl'], per100: { calories: 345, protein: 6.5, carbs: 38.0, fat: 18.0 }, defaultPortionG: 180, portionLabel: '1 db + tejföl (~180g)', tags: ['tejfölös'] },
      { id: 'langos-sajtos-tejfolos', variantName: 'Lángos sajtos-tejfölös', description: 'Reszelt sajt + tejföl — egy db ~450-550 kcal.', keyIngredients: ['kelt tészta','olaj','tejföl','trappista sajt'], per100: { calories: 365, protein: 12.0, carbs: 32.0, fat: 21.0 }, defaultPortionG: 200, portionLabel: '1 db + feltét (~200g)', tags: ['sajtos','tejfölös','klasszikus'] },
      { id: 'langos-sutoben', variantName: 'Lángos sütőben (diétás)', description: 'Sütőben sütve olaj nélkül — kevesebb zsír.', keyIngredients: ['kelt tészta','fokhagyma'], per100: { calories: 215, protein: 6.0, carbs: 42.0, fat: 2.5 }, defaultPortionG: 150, portionLabel: '1 db (~150g)', tags: ['sütőben','diétás','light'] },
    ]
  },
  // ═══ FŐZELÉK ═══
  {
    id: 'fozelek', baseName: 'Főzelék',
    names: ['főzelék','fozelek','tökfőzelék','tokfozelek','zöldborsó főzelék','zoldborsó fozelek','spenót főzelék','spenot fozelek','krumpli főzelék','krumpli fozelek','bab főzelék'],
    image: '🍲', category: 'Főétel', region: 'magyar',
    description: 'Rántással sűrített zöldséges egytálétel.',
    defaultVariantId: 'fozelek-tok',
    variants: [
      { id: 'fozelek-tok', variantName: 'Tökfőzelék', description: 'Tök + habarás — könnyű, alacsony kalória.', keyIngredients: ['tök','tejföl','liszt','ecet','cukor'], per100: { calories: 52, protein: 1.0, carbs: 8.5, fat: 1.8 }, defaultPortionG: 300, portionLabel: '1 tányér (~300g)', tags: ['könnyű','vegetáriánus'] },
      { id: 'fozelek-zoldborsó', variantName: 'Zöldborsó főzelék', description: 'Zöldborsó rántással — fehérjedúsabb.', keyIngredients: ['zöldborsó','rántás','cukor'], per100: { calories: 78, protein: 4.5, carbs: 10.0, fat: 2.5 }, defaultPortionG: 300, portionLabel: '1 tányér (~300g)', tags: ['zöldborsós','fehérjedús'] },
      { id: 'fozelek-spenot', variantName: 'Spenót főzelék', description: 'Spenót fokhagymás rántással — vasdús.', keyIngredients: ['spenót','fokhagyma','rántás','tejszín'], per100: { calories: 58, protein: 3.0, carbs: 5.5, fat: 2.8 }, defaultPortionG: 300, portionLabel: '1 tányér (~300g)', tags: ['spenótos','vasdús'] },
      { id: 'fozelek-krumpli', variantName: 'Krumplifőzelék', description: 'Krumplialapú — a legkalóriásabb változat.', keyIngredients: ['krumpli','rántás','babérlevél','ecet'], per100: { calories: 85, protein: 1.8, carbs: 14.5, fat: 2.5 }, defaultPortionG: 300, portionLabel: '1 tányér (~300g)', tags: ['krumplis','laktatós'] },
    ]
  },
  // ═══ PALACSINTA ═══
  {
    id: 'palacsinta', baseName: 'Palacsinta',
    names: ['palacsinta','palacinta','clătite','clatite','túrós palacsinta','turos palacsinta','lekváros palacsinta','lekvaros palacsinta','nutellás palacsinta','nutellas palacsinta','hortobágyi palacsinta','hortobagyi palacsinta'],
    image: '🥞', category: 'Desszert', region: 'magyar',
    description: 'Vékony palacsinta — a töltelék határozza meg a kalóriát.',
    defaultVariantId: 'palacsinta-lekvaros',
    variants: [
      { id: 'palacsinta-lekvaros', variantName: 'Palacsinta lekvárral', description: 'Baracklekvárral — klasszikus desszert.', keyIngredients: ['palacsinta tészta','baracklekvár'], per100: { calories: 195, protein: 5.5, carbs: 32.0, fat: 5.0 }, defaultPortionG: 120, portionLabel: '2 db (~120g)', tags: ['lekváros','édes','klasszikus'] },
      { id: 'palacsinta-turos', variantName: 'Palacsinta túróval', description: 'Édes túrókrémmel — több fehérje.', keyIngredients: ['palacsinta tészta','túró','cukor','mazsola'], per100: { calories: 210, protein: 9.0, carbs: 25.0, fat: 8.0 }, defaultPortionG: 140, portionLabel: '2 db (~140g)', tags: ['túrós','fehérjedús'] },
      { id: 'palacsinta-nutellas', variantName: 'Palacsinta Nutellával', description: 'Csokikrémmel — a legkalóriásabb édes változat.', keyIngredients: ['palacsinta tészta','Nutella/csokikrém'], per100: { calories: 298, protein: 6.0, carbs: 38.0, fat: 13.5 }, defaultPortionG: 130, portionLabel: '2 db (~130g)', tags: ['csokis','gazdag'] },
      { id: 'palacsinta-hortobagyi', variantName: 'Hortobágyi palacsinta', description: 'Sós — húsos töltelékkel + tejfölös paprikás szósz.', keyIngredients: ['palacsinta tészta','csirkehús','tejföl','paprikás szósz'], per100: { calories: 168, protein: 11.5, carbs: 14.0, fat: 7.5 }, defaultPortionG: 250, portionLabel: '2 db szósszal (~250g)', tags: ['sós','húsos','főétel'] },
    ]
  },
  // ═══ PAPRIKÁS KRUMPLI ═══
  {
    id: 'paprikas-krumpli', baseName: 'Paprikás krumpli',
    names: ['paprikás krumpli','paprikas krumpli','kolbászos paprikás krumpli','kolbaszos paprikas krumpli','paprikáskrumpli','paprikaskrumpli','virslis paprikás krumpli'],
    image: '🥔', category: 'Főétel', region: 'magyar',
    description: 'Magyar paprikás krumpli — variánsok a hozzáadott hús szerint.',
    defaultVariantId: 'paprikas-krumpli-kolbaszos',
    variants: [
      { id: 'paprikas-krumpli-sima', variantName: 'Paprikás krumpli sima', description: 'Kolbász nélkül — vegetáriánus.', keyIngredients: ['krumpli','hagyma','paprika őrölt','olaj'], per100: { calories: 72, protein: 1.5, carbs: 12.5, fat: 2.0 }, defaultPortionG: 350, portionLabel: '1 tányér (~350g)', tags: ['sima','vegetáriánus'] },
      { id: 'paprikas-krumpli-kolbaszos', variantName: 'Paprikás krumpli kolbásszal', description: 'Debreceni kolbásszal — klasszikus.', keyIngredients: ['krumpli','debreceni kolbász','hagyma','paprika őrölt','olaj'], per100: { calories: 115, protein: 5.0, carbs: 11.0, fat: 5.5 }, defaultPortionG: 350, portionLabel: '1 tányér (~350g)', tags: ['kolbászos','klasszikus'] },
      { id: 'paprikas-krumpli-virslis', variantName: 'Paprikás krumpli virslivel', description: 'Virslivel — gyors családi változat.', keyIngredients: ['krumpli','virsli','hagyma','paprika őrölt'], per100: { calories: 98, protein: 4.0, carbs: 11.5, fat: 4.0 }, defaultPortionG: 350, portionLabel: '1 tányér (~350g)', tags: ['virslis','gyors'] },
    ]
  },
  // ═══ KÜRTŐS KALÁCS ═══
  {
    id: 'kurtos-kalacs', baseName: 'Kürtős kalács',
    names: ['kürtős kalács','kurtos kalacs','kürtöskalács','kurtoskalacs','chimney cake','cozonac secuiesc'],
    image: '🥧', category: 'Desszert', region: 'erdélyi',
    description: 'Erdélyi kürtős kalács — a bevonat határozza meg a kalóriát.',
    defaultVariantId: 'kurtos-cukros',
    variants: [
      { id: 'kurtos-cukros', variantName: 'Kürtős kalács cukros', description: 'Kristálycukorral, karamellizálva — alap változat.', keyIngredients: ['kelt tészta','vaj','kristálycukor'], per100: { calories: 345, protein: 6.0, carbs: 52.0, fat: 12.5 }, defaultPortionG: 150, portionLabel: '1 db (~150g)', tags: ['cukros','klasszikus'] },
      { id: 'kurtos-dios', variantName: 'Kürtős kalács diós', description: 'Darált dióba forgatva — extra zsír és fehérje.', keyIngredients: ['kelt tészta','vaj','cukor','darált dió'], per100: { calories: 390, protein: 8.0, carbs: 45.0, fat: 19.5 }, defaultPortionG: 150, portionLabel: '1 db (~150g)', tags: ['diós','gazdag'] },
      { id: 'kurtos-fahéjas', variantName: 'Kürtős kalács fahéjas', description: 'Fahéjas-cukros bevonat — aromás.', keyIngredients: ['kelt tészta','vaj','fahéjas cukor'], per100: { calories: 348, protein: 6.0, carbs: 53.0, fat: 12.5 }, defaultPortionG: 150, portionLabel: '1 db (~150g)', tags: ['fahéjas','aromás'] },
      { id: 'kurtos-csokis', variantName: 'Kürtős kalács csokis', description: 'Csokoládé bevonattal — a legtöbb kalória.', keyIngredients: ['kelt tészta','vaj','csokoládé máz'], per100: { calories: 412, protein: 6.5, carbs: 50.0, fat: 21.0 }, defaultPortionG: 150, portionLabel: '1 db (~150g)', tags: ['csokis','gazdag'] },
    ]
  },
  // ═══ HUMUSZ ═══
  {
    id: 'humusz', baseName: 'Humusz',
    names: ['humusz','hummus','humus','csicseriborsó krém','csicseriborsokrem','csicseriborsó paszta'],
    image: '🥙', category: 'Előétel & Mártás', region: 'nemzetközi',
    description: 'Csicseriborsó krém — a tahini és olaj mennyisége határozza meg a kalóriát.',
    defaultVariantId: 'humusz-klasszikus',
    variants: [
      { id: 'humusz-klasszikus', variantName: 'Humusz klasszikus (tahinivel)', description: 'Csicseriborsó + tahini + citromlé + fokhagyma + olívaolaj.', keyIngredients: ['csicseriborsó','tahini','citromlé','fokhagyma','olívaolaj'], per100: { calories: 166, protein: 7.9, carbs: 14.3, fat: 9.6 }, defaultPortionG: 80, portionLabel: '~3 evőkanál (80g)', tags: ['klasszikus','vegán'] },
      { id: 'humusz-light', variantName: 'Humusz light (tahini nélkül)', description: 'Tahini és olaj nélkül — kevesebb zsír.', keyIngredients: ['csicseriborsó','citromlé','fokhagyma'], per100: { calories: 95, protein: 7.5, carbs: 14.5, fat: 1.2 }, defaultPortionG: 80, portionLabel: '~3 evőkanál (80g)', tags: ['light','alacsony zsír'] },
      { id: 'humusz-paprikas', variantName: 'Humusz sült paprikával', description: 'Sült piros paprikával ízesítve.', keyIngredients: ['csicseriborsó','tahini','sült paprika','olívaolaj'], per100: { calories: 158, protein: 7.5, carbs: 15.0, fat: 8.5 }, defaultPortionG: 80, portionLabel: '~3 evőkanál (80g)', tags: ['paprikás','aromás'] },
    ]
  },
  // ═══ POGÁCSA ═══
  {
    id: 'pogacsa', baseName: 'Pogácsa',
    names: ['pogácsa','pogacsa','sajtos pogácsa','sajtos pogacsa','tepertős pogácsa','tepertos pogacsa','túrós pogácsa','turos pogacsa'],
    image: '🧁', category: 'Pékáru & Tészta', region: 'magyar',
    description: 'Magyar sós pogácsa — a feltét típusa dönti el a kalóriát.',
    defaultVariantId: 'pogacsa-sajtos',
    variants: [
      { id: 'pogacsa-sajtos', variantName: 'Sajtos pogácsa', description: 'Reszelt sajttal — a leggyakoribb.', keyIngredients: ['liszt','vaj/zsír','trappista sajt','tejföl','tojás'], per100: { calories: 368, protein: 11.0, carbs: 32.0, fat: 22.0 }, defaultPortionG: 40, portionLabel: '1 db (~40g)', tags: ['sajtos','klasszikus'] },
      { id: 'pogacsa-tepertos', variantName: 'Tepertős pogácsa', description: 'Darált tepertővel — leggazdagabb, legzsírosabb.', keyIngredients: ['liszt','sertészsír','tepertő','tejföl'], per100: { calories: 420, protein: 10.0, carbs: 30.0, fat: 29.0 }, defaultPortionG: 40, portionLabel: '1 db (~40g)', tags: ['tepertős','gazdag'] },
      { id: 'pogacsa-turos', variantName: 'Túrós pogácsa', description: 'Túróval könnyített — több fehérje, kevesebb zsír.', keyIngredients: ['liszt','túró','vaj','tojás'], per100: { calories: 310, protein: 12.5, carbs: 30.0, fat: 16.0 }, defaultPortionG: 40, portionLabel: '1 db (~40g)', tags: ['túrós','könnyebb'] },
    ]
  },
  // ═══ MÁKOS TÉSZTA ═══
  {
    id: 'makos-teszta', baseName: 'Mákos / Diós tészta',
    names: ['mákos tészta','makos teszta','mákos csusza','makos csusza','diós tészta','dios teszta','mákos guba','makos guba','mákos nudli','makos nudli','diós nudli','dios nudli'],
    image: '🥟', category: 'Desszert', region: 'magyar',
    description: 'Édes magyar tészta darált mákkal vagy dióval.',
    defaultVariantId: 'makos-teszta-klasszikus',
    variants: [
      { id: 'makos-teszta-klasszikus', variantName: 'Mákos tészta (klasszikus)', description: 'Főtt tészta + darált mák + porcukor + olvasztott vaj.', keyIngredients: ['tészta','darált mák','porcukor','vaj'], per100: { calories: 285, protein: 8.5, carbs: 35.0, fat: 12.5 }, defaultPortionG: 250, portionLabel: '1 tányér (~250g)', tags: ['mákos','édes'] },
      { id: 'dios-teszta-klasszikus', variantName: 'Diós tészta', description: 'Darált dió + cukor + vaj — magasabb zsír.', keyIngredients: ['tészta','darált dió','porcukor','vaj'], per100: { calories: 320, protein: 9.0, carbs: 32.0, fat: 17.5 }, defaultPortionG: 250, portionLabel: '1 tányér (~250g)', tags: ['diós','édes'] },
      { id: 'makos-guba', variantName: 'Mákos guba (vaníliasodóval)', description: 'Tépett kifli + mák + vaníliasodó — leggazdagabb édes.', keyIngredients: ['kifli','darált mák','vaníliasodó','cukor'], per100: { calories: 298, protein: 7.5, carbs: 42.0, fat: 11.0 }, defaultPortionG: 250, portionLabel: '1 tányér (~250g)', tags: ['mákos guba','édes','gazdag'] },
    ]
  },
  // ═══ KALÁCS (COZONAC) ═══
  {
    id: 'cozonac', baseName: 'Kalács (Cozonac)',
    names: ['cozonac','kalács','kalacs','fonott kalács','fonott kalacs','diós kalács','dios kalacs','mákos kalács','makos kalacs','kakaós kalács','kakaos kalacs'],
    image: '🍞', category: 'Desszert', region: 'erdélyi',
    description: 'Ünnepi édes kelt kalács — töltelék típusa dönti el a kalóriát.',
    defaultVariantId: 'cozonac-dios',
    variants: [
      { id: 'cozonac-dios', variantName: 'Kalács diós töltelékkel', description: 'Darált dió + cukor + rum — klasszikus karácsonyi.', keyIngredients: ['kelt tészta','darált dió','cukor','rum aroma'], per100: { calories: 365, protein: 8.0, carbs: 45.0, fat: 17.0 }, defaultPortionG: 80, portionLabel: '1 szelet (~80g)', tags: ['diós','ünnepi'] },
      { id: 'cozonac-makos', variantName: 'Kalács mákos töltelékkel', description: 'Darált mák + cukor + tejföl töltelék.', keyIngredients: ['kelt tészta','darált mák','cukor','tejföl'], per100: { calories: 345, protein: 9.0, carbs: 42.0, fat: 15.5 }, defaultPortionG: 80, portionLabel: '1 szelet (~80g)', tags: ['mákos','ünnepi'] },
      { id: 'cozonac-kakaos', variantName: 'Kalács kakaós töltelékkel', description: 'Kakaó + cukor + vaj — gyerekek kedvence.', keyIngredients: ['kelt tészta','kakaópor','cukor','vaj'], per100: { calories: 355, protein: 7.0, carbs: 48.0, fat: 15.0 }, defaultPortionG: 80, portionLabel: '1 szelet (~80g)', tags: ['kakaós','édes'] },
    ]
  },
  // ═══ GUACAMOLE ═══
  {
    id: 'guacamole', baseName: 'Guacamole',
    names: ['guacamole','guakamole','avokádó krém','avokado krem','avokádós','avokados'],
    image: '🥑', category: 'Előétel & Mártás', region: 'nemzetközi',
    description: 'Avokádóalapú krém — természetes zsírokban gazdag.',
    defaultVariantId: 'guacamole-klasszikus',
    variants: [
      { id: 'guacamole-klasszikus', variantName: 'Guacamole klasszikus', description: 'Avokádó + lime + hagyma + paradicsom + koriander.', keyIngredients: ['avokádó','lime','vöröshagyma','paradicsom','koriander'], per100: { calories: 160, protein: 2.0, carbs: 8.5, fat: 14.7 }, defaultPortionG: 80, portionLabel: '~3 evőkanál (80g)', tags: ['vegán','klasszikus'] },
      { id: 'guacamole-light', variantName: 'Guacamole light (zöldborsóval)', description: 'Fele avokádó, fele zöldborsó — kevesebb zsír.', keyIngredients: ['avokádó','zöldborsó','lime','hagyma'], per100: { calories: 105, protein: 4.0, carbs: 10.0, fat: 6.0 }, defaultPortionG: 80, portionLabel: '~3 evőkanál (80g)', tags: ['light','vegán'] },
    ]
  },
];

// ─── Compound Food Search & Recognition ──────────────────────────────

export function searchCompoundFoods(query: string): CompoundFood[] {
  if (!query || query.trim().length < 2) return [];
  const normalizedQuery = normalizeHungarian(query.trim());
  const queryVariants = stripHungarianSuffix(normalizedQuery);
  const scored: { food: CompoundFood; score: number }[] = [];
  for (const food of compoundFoodDatabase) {
    let maxScore = 0;
    const normalizedBase = normalizeHungarian(food.baseName);
    if (normalizedBase === normalizedQuery) maxScore = 100;
    else if (normalizedBase.startsWith(normalizedQuery)) maxScore = 95;
    else if (normalizedBase.includes(normalizedQuery)) maxScore = 85;
    for (const name of food.names) {
      const nn = normalizeHungarian(name);
      if (nn === normalizedQuery) { maxScore = Math.max(maxScore, 100); break; }
      else if (nn.startsWith(normalizedQuery)) maxScore = Math.max(maxScore, 92);
      else if (nn.includes(normalizedQuery)) maxScore = Math.max(maxScore, 82);
      else if (normalizedQuery.includes(nn) && nn.length >= 3) maxScore = Math.max(maxScore, 78);
      for (const variant of queryVariants) {
        if (nn.startsWith(variant) && variant.length >= 3) maxScore = Math.max(maxScore, 88);
        else if (nn.includes(variant) && variant.length >= 3) maxScore = Math.max(maxScore, 75);
      }
    }
    if (maxScore === 0) {
      const qWords = normalizedQuery.split(/\s+/).filter(w => w.length >= 2);
      for (const name of food.names) {
        const nWords = normalizeHungarian(name).split(/\s+/);
        const matched = qWords.filter(qw => nWords.some(nw => nw.includes(qw) || qw.includes(nw)));
        if (matched.length > 0) maxScore = Math.max(maxScore, 50 + (matched.length / qWords.length) * 30);
      }
    }
    for (const v of food.variants) {
      const vn = normalizeHungarian(v.variantName);
      if (vn.includes(normalizedQuery) && normalizedQuery.length >= 4) maxScore = Math.max(maxScore, 85);
      for (const tag of v.tags) {
        if (normalizeHungarian(tag) === normalizedQuery) maxScore = Math.max(maxScore, 60);
      }
    }
    if (food.region === 'erdélyi' && maxScore > 0) maxScore += 5;
    if (maxScore > 0) scored.push({ food, score: maxScore });
  }
  return scored.sort((a, b) => b.score - a.score).map(s => s.food);
}

export function getCompoundFoodById(id: string): CompoundFood | undefined {
  return compoundFoodDatabase.find(f => f.id === id);
}

export function calculateCompoundFoodNutrition(
  variant: CompoundFoodVariant, portionG: number
): { calories: number; protein: number; carbs: number; fat: number } {
  const m = portionG / 100;
  return {
    calories: Math.round(variant.per100.calories * m),
    protein: Math.round(variant.per100.protein * m * 10) / 10,
    carbs: Math.round(variant.per100.carbs * m * 10) / 10,
    fat: Math.round(variant.per100.fat * m * 10) / 10,
  };
}