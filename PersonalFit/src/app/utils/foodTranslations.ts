import type { LanguageCode } from '../contexts/LanguageContext';

// Simple accent-stripping to normalize keys
function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ─── Full food name lookup (HU → EN/RO) ───────────────────────────────────────
// Built from SEED_FOODS multilingual data. Covers all ~100+ catalog foods.
// Takes priority over word-level substitution below.

const _RAW_FOOD_NAMES: Array<{ hu: string; en: string; ro: string }> = [
  // Protein
  { hu: 'Csirkemell',         en: 'Chicken breast',     ro: 'Piept de pui'       },
  { hu: 'Csirkecomb',         en: 'Chicken thigh',      ro: 'Pulpă de pui'       },
  { hu: 'Pulykamell',         en: 'Turkey breast',      ro: 'Piept de curcan'    },
  { hu: 'Tojás',              en: 'Egg',                ro: 'Ou'                 },
  { hu: 'Lazac',              en: 'Salmon',             ro: 'Somon'              },
  { hu: 'Tonhal',             en: 'Tuna',               ro: 'Ton'                },
  { hu: 'Makréla',            en: 'Mackerel',           ro: 'Macrou'             },
  { hu: 'Tilápia',            en: 'Tilapia',            ro: 'Tilapia'            },
  { hu: 'Garnélarák',         en: 'Shrimp',             ro: 'Creveți'            },
  { hu: 'Sertéshús',          en: 'Pork',               ro: 'Carne de porc'      },
  { hu: 'Marhahús',           en: 'Beef',               ro: 'Carne de vită'      },
  { hu: 'Bárány',             en: 'Lamb',               ro: 'Miel'               },
  { hu: 'Tofu',               en: 'Tofu',               ro: 'Tofu'               },
  { hu: 'Tempeh',             en: 'Tempeh',             ro: 'Tempeh'             },
  { hu: 'Lencse',             en: 'Lentils',            ro: 'Linte'              },
  { hu: 'Csicseriborsó',      en: 'Chickpeas',          ro: 'Năut'               },
  { hu: 'Fekete bab',         en: 'Black beans',        ro: 'Fasole neagră'      },
  { hu: 'Fehér bab',          en: 'White beans',        ro: 'Fasole albă'        },
  { hu: 'Tojásfehérje',       en: 'Egg white',          ro: 'Albuș de ou'        },
  { hu: 'Szardínia',          en: 'Sardines',           ro: 'Sardine'            },
  // Carbs
  { hu: 'Zab',                en: 'Oats',               ro: 'Ovăz'               },
  { hu: 'Rizs',               en: 'Rice',               ro: 'Orez'               },
  { hu: 'Barna rizs',         en: 'Brown rice',         ro: 'Orez brun'          },
  { hu: 'Teljes kiőrlésű kenyér', en: 'Whole grain bread', ro: 'Pâine integrală' },
  { hu: 'Fehér kenyér',       en: 'White bread',        ro: 'Pâine albă'         },
  { hu: 'Tészta',             en: 'Pasta',              ro: 'Paste'              },
  { hu: 'Teljes kiőrlésű tészta', en: 'Whole grain pasta', ro: 'Paste integrale' },
  { hu: 'Burgonya',           en: 'Potato',             ro: 'Cartofi'            },
  { hu: 'Édesburgonya',       en: 'Sweet potato',       ro: 'Cartofi dulci'      },
  { hu: 'Quinoa',             en: 'Quinoa',             ro: 'Quinoa'             },
  { hu: 'Kukorica',           en: 'Corn',               ro: 'Porumb'             },
  { hu: 'Hajdina',            en: 'Buckwheat',          ro: 'Hrișcă'             },
  { hu: 'Árpa',               en: 'Barley',             ro: 'Orz'                },
  { hu: 'Tortilla',           en: 'Tortilla',           ro: 'Tortilla'           },
  { hu: 'Zabpehely',          en: 'Oatmeal',            ro: 'Fulgi de ovăz'      },
  // Fat
  { hu: 'Avokádó',            en: 'Avocado',            ro: 'Avocado'            },
  { hu: 'Dió',                en: 'Walnut',             ro: 'Nuci'               },
  { hu: 'Mandula',            en: 'Almond',             ro: 'Migdale'            },
  { hu: 'Mogyoró',            en: 'Peanut',             ro: 'Arahide'            },
  { hu: 'Kesudió',            en: 'Cashew',             ro: 'Caju'               },
  { hu: 'Pekándió',           en: 'Pecan',              ro: 'Pecan'              },
  { hu: 'Olívaolaj',          en: 'Olive oil',          ro: 'Ulei de măsline'    },
  { hu: 'Kókuszolaj',         en: 'Coconut oil',        ro: 'Ulei de cocos'      },
  { hu: 'Mogyoróvaj',         en: 'Peanut butter',      ro: 'Unt de arahide'     },
  { hu: 'Chia mag',           en: 'Chia seeds',         ro: 'Semințe de chia'    },
  { hu: 'Lenmag',             en: 'Flaxseed',           ro: 'Semințe de in'      },
  { hu: 'Tök mag',            en: 'Pumpkin seeds',      ro: 'Semințe de dovleac' },
  // Dairy
  { hu: 'Görög joghurt',      en: 'Greek yogurt',       ro: 'Iaurt grecesc'      },
  { hu: 'Joghurt',            en: 'Yogurt',             ro: 'Iaurt'              },
  { hu: 'Túró',               en: 'Cottage cheese',     ro: 'Brânză de vaci'     },
  { hu: 'Sajt',               en: 'Cheese',             ro: 'Brânză'             },
  { hu: 'Mozzarella',         en: 'Mozzarella',         ro: 'Mozzarella'         },
  { hu: 'Ricotta',            en: 'Ricotta',            ro: 'Ricotta'            },
  { hu: 'Tej',                en: 'Milk',               ro: 'Lapte'              },
  { hu: 'Kefir',              en: 'Kefir',              ro: 'Chefir'             },
  { hu: 'Vaj',                en: 'Butter',             ro: 'Unt'                },
  { hu: 'Tejföl',             en: 'Sour cream',         ro: 'Smântână'           },
  // Vegetable
  { hu: 'Brokkoli',           en: 'Broccoli',           ro: 'Broccoli'           },
  { hu: 'Karfiol',            en: 'Cauliflower',        ro: 'Conopidă'           },
  { hu: 'Spenót',             en: 'Spinach',            ro: 'Spanac'             },
  { hu: 'Paradicsom',         en: 'Tomato',             ro: 'Roșie'              },
  { hu: 'Paprika',            en: 'Bell pepper',        ro: 'Ardei'              },
  { hu: 'Sárgarépa',          en: 'Carrot',             ro: 'Morcov'             },
  { hu: 'Uborka',             en: 'Cucumber',           ro: 'Castraveți'         },
  { hu: 'Fokhagyma',          en: 'Garlic',             ro: 'Usturoi'            },
  { hu: 'Hagyma',             en: 'Onion',              ro: 'Ceapă'              },
  { hu: 'Zöldborsó',          en: 'Green peas',         ro: 'Mazăre'             },
  { hu: 'Zöldbab',            en: 'Green beans',        ro: 'Fasole verde'       },
  { hu: 'Cukorborsó',         en: 'Sugar snap peas',    ro: 'Mazăre dulce'       },
  { hu: 'Cékla',              en: 'Beetroot',           ro: 'Sfeclă roșie'       },
  { hu: 'Kelkáposzta',        en: 'Kale',               ro: 'Kale'               },
  { hu: 'Saláta',             en: 'Lettuce',            ro: 'Salată'             },
  { hu: 'Padlizsán',          en: 'Eggplant',           ro: 'Vinete'             },
  { hu: 'Cukkini',            en: 'Zucchini',           ro: 'Dovlecel'           },
  { hu: 'Gomba',              en: 'Mushroom',           ro: 'Ciuperci'           },
  { hu: 'Articsóka',          en: 'Artichoke',          ro: 'Anghinare'          },
  { hu: 'Spárga',             en: 'Asparagus',          ro: 'Sparanghel'         },
  // Fruit
  { hu: 'Alma',               en: 'Apple',              ro: 'Măr'                },
  { hu: 'Banán',              en: 'Banana',             ro: 'Banană'             },
  { hu: 'Áfonya',             en: 'Blueberry',          ro: 'Afine'              },
  { hu: 'Eper',               en: 'Strawberry',         ro: 'Căpșuni'            },
  { hu: 'Narancs',            en: 'Orange',             ro: 'Portocală'          },
  { hu: 'Kivi',               en: 'Kiwi',               ro: 'Kiwi'               },
  { hu: 'Mangó',              en: 'Mango',              ro: 'Mango'              },
  { hu: 'Görögdinnye',        en: 'Watermelon',         ro: 'Pepene verde'       },
  { hu: 'Szőlő',              en: 'Grapes',             ro: 'Struguri'           },
  { hu: 'Körte',              en: 'Pear',               ro: 'Pară'               },
  { hu: 'Őszibarack',         en: 'Peach',              ro: 'Piersică'           },
  { hu: 'Cseresznye',         en: 'Cherry',             ro: 'Cireșe'             },
  { hu: 'Ananász',            en: 'Pineapple',          ro: 'Ananas'             },
  { hu: 'Grapefruit',         en: 'Grapefruit',         ro: 'Grapefruit'         },
  { hu: 'Citrom',             en: 'Lemon',              ro: 'Lămâie'             },
  { hu: 'Málna',              en: 'Raspberry',          ro: 'Zmeură'             },
  // Goat dairy alternatives
  { hu: 'Kecske tej',         en: 'Goat milk',          ro: 'Lapte de capră'     },
  { hu: 'Kecske joghurt',     en: 'Goat yogurt',        ro: 'Iaurt de capră'     },
  { hu: 'Kecske sajt',        en: 'Goat cheese',        ro: 'Brânză de capră'    },
  { hu: 'Kecske túró',        en: 'Goat cottage',       ro: 'Brânză proaspătă'   },
  { hu: 'Kecske tejföl',      en: 'Goat sour cream',    ro: 'Smântână de capră'  },
  { hu: 'Kecske kefir',       en: 'Goat kefir',         ro: 'Chefir de capră'    },
  { hu: 'Kecske vaj',         en: 'Goat butter',        ro: 'Unt de capră'       },
  // More vegetables
  { hu: 'Zeller',             en: 'Celery',             ro: 'Țelină'             },
  { hu: 'Pisztráng',          en: 'Trout',              ro: 'Păstrăv'            },
  { hu: 'Póréhagyma',         en: 'Leek',               ro: 'Praz'               },
  { hu: 'Káposzta',           en: 'Cabbage',            ro: 'Varză'              },
  { hu: 'Vörös káposzta',     en: 'Red cabbage',        ro: 'Varză roșie'        },
  { hu: 'Tök',                en: 'Pumpkin',            ro: 'Dovleac'            },
  { hu: 'Retek',              en: 'Radish',             ro: 'Ridichi'            },
  { hu: 'Kelbimbó',           en: 'Brussels sprouts',   ro: 'Varză de Bruxelles' },
  { hu: 'Karalábé',           en: 'Kohlrabi',           ro: 'Gulie'              },
  { hu: 'Petrezselyem',       en: 'Parsley',            ro: 'Pătrunjel'          },
  { hu: 'Édeskömény',         en: 'Fennel',             ro: 'Fenicul'            },
  { hu: 'Paprika (piros)',     en: 'Red bell pepper',   ro: 'Ardei roșu'         },
  { hu: 'Paprika (zöld)',      en: 'Green bell pepper', ro: 'Ardei verde'        },
  { hu: 'Paprika (sárga)',     en: 'Yellow bell pepper',ro: 'Ardei galben'       },
  // More fruit
  { hu: 'Szilva',             en: 'Plum',               ro: 'Prune'              },
  { hu: 'Sárgabarack',        en: 'Apricot',            ro: 'Caise'              },
  { hu: 'Sárgadinnye',        en: 'Melon',              ro: 'Pepene galben'      },
  { hu: 'Füge',               en: 'Fig',                ro: 'Smochine'           },
  { hu: 'Ribizli',            en: 'Currant',            ro: 'Coacăze'            },
  // More protein
  { hu: 'Ponty',              en: 'Carp',               ro: 'Crap'               },
  { hu: 'Tőkehal',            en: 'Cod',                ro: 'Cod'                },
  { hu: 'Hering',             en: 'Herring',            ro: 'Hering'             },
  { hu: 'Kacsa',              en: 'Duck',               ro: 'Rață'               },
  { hu: 'Nyúl',               en: 'Rabbit',             ro: 'Iepure'             },
  { hu: 'Borjú',              en: 'Veal',               ro: 'Vițel'              },
  // More dairy/fat
  { hu: 'Tejszín',            en: 'Cream',              ro: 'Frișcă'             },
  { hu: 'Napraforgóolaj',     en: 'Sunflower oil',      ro: 'Ulei de floarea-soarelui' },
  { hu: 'Szezámmag',          en: 'Sesame seeds',       ro: 'Semințe de susan'   },
  // More grains
  { hu: 'Köles',              en: 'Millet',             ro: 'Mei'                },
  { hu: 'Tönköly',            en: 'Spelt',              ro: 'Spelt'              },
  { hu: 'Búzadara',           en: 'Semolina',           ro: 'Griș'               },
  { hu: 'Polenta',            en: 'Polenta',            ro: 'Mămăligă'           },
  // Fish (Hungarian freshwater + common)
  { hu: 'Süllő',             en: 'Pike-perch',         ro: 'Șalău'              },
  { hu: 'Csuka',             en: 'Pike',               ro: 'Știucă'             },
  { hu: 'Kárász',            en: 'Crucian carp',       ro: 'Caras'              },
  { hu: 'Harcsafilé',        en: 'Catfish fillet',     ro: 'File de somn'       },
  { hu: 'Harcsa',            en: 'Catfish',            ro: 'Somn'               },
  // More common foods
  { hu: 'Fehérjepor',        en: 'Protein powder',     ro: 'Pudră proteică'     },
  { hu: 'Kakaópor',          en: 'Cocoa powder',       ro: 'Pudră de cacao'     },
  { hu: 'Méz',               en: 'Honey',              ro: 'Miere'              },
  { hu: 'Aszalt szilva',     en: 'Prunes',             ro: 'Prune uscate'       },
  { hu: 'Aszalt sárgabarack',en: 'Dried apricot',      ro: 'Caise uscate'       },
  { hu: 'Datolya',           en: 'Date',               ro: 'Curmale'            },
  { hu: 'Mazsola',           en: 'Raisin',             ro: 'Stafide'            },
  { hu: 'Fehér rizs',        en: 'White rice',         ro: 'Orez alb'           },
  { hu: 'Juhsajt',           en: 'Sheep cheese',       ro: 'Brânză de oaie'     },
  { hu: 'Feta',              en: 'Feta',               ro: 'Feta'               },
  { hu: 'Napraforgómag',     en: 'Sunflower seeds',    ro: 'Semințe de floarea-soarelui' },
  { hu: 'Kendermag',         en: 'Hemp seeds',         ro: 'Semințe de cânepă'  },
  { hu: 'Gesztenye',         en: 'Chestnut',           ro: 'Castane'            },
  { hu: 'Pirított napraforgómag', en: 'Roasted sunflower seeds', ro: 'Semințe de floarea-soarelui prăjite' },
];

/** Normalized HU name → {en, ro} — built at module load time */
const FOOD_NAME_DICT: Record<string, { en: string; ro: string }> =
  Object.fromEntries(_RAW_FOOD_NAMES.map(f => [normalizeToken(f.hu), { en: f.en, ro: f.ro }]));

/** Normalized EN name → hu — reverse lookup for DB names stored in English */
const FOOD_NAME_DICT_EN_TO_HU: Record<string, string> =
  Object.fromEntries(_RAW_FOOD_NAMES.map(f => [normalizeToken(f.en), f.hu]));

/** Normalized RO name → hu — reverse lookup */
const FOOD_NAME_DICT_RO_TO_HU: Record<string, string> =
  Object.fromEntries(_RAW_FOOD_NAMES.map(f => [normalizeToken(f.ro), f.hu]));

// ─── Word-level fallback ───────────────────────────────────────────────────────
// Used when the full-name lookup doesn't match (e.g. AI-generated compound names).

const WORD_MAP_EN: Record<string, string> = {
  'tojas': 'egg',
  'tojás': 'egg',
  'tojásos': 'egg',
  'pulykamell': 'turkey breast',
  'csirkemell': 'chicken breast',
  'sargarepa': 'carrot',
  'sárgarépa': 'carrot',
  'burgonya': 'potato',
  'krumpli': 'potato',
  'brokkoli': 'broccoli',
  'lazac': 'salmon',
  'tonhal': 'tuna',
  'makrela': 'mackerel',
  'makréla': 'mackerel',
  'salata': 'salad',
  'saláta': 'salad',
  'olivaolaj': 'olive oil',
  'olívaolaj': 'olive oil',
  'avokado': 'avocado',
  'avokádó': 'avocado',
  'teljes': 'wholegrain',
  'kiorlesu': 'wholegrain',
  'kiőrlésű': 'wholegrain',
  'kenyer': 'bread',
  'kenyér': 'bread',
  'gorog': 'greek',
  'görög': 'greek',
  'joghurt': 'yogurt',
  'turo': 'cottage cheese',
  'túró': 'cottage cheese',
  'dio': 'walnut',
  'dió': 'walnut',
  'mandula': 'almond',
  'banan': 'banana',
  'banán': 'banana',
  'rizs': 'rice',
  'zab': 'oats',
  'quinoa': 'quinoa',
  'cukkini': 'zucchini',
  'karfiol': 'cauliflower',
  'lenmag': 'flaxseed',
  'tokmag': 'pumpkin seed',
  'tökmag': 'pumpkin seed',
};

const WORD_MAP_RO: Record<string, string> = {
  'tojas': 'ou',
  'tojás': 'ou',
  'tojásos': 'ou',
  'pulykamell': 'piept de curcan',
  'csirkemell': 'piept de pui',
  'sargarepa': 'morcov',
  'sárgarépa': 'morcov',
  'burgonya': 'cartof',
  'krumpli': 'cartof',
  'brokkoli': 'broccoli',
  'lazac': 'somon',
  'tonhal': 'ton',
  'makrela': 'macrou',
  'makréla': 'macrou',
  'salata': 'salată',
  'saláta': 'salată',
  'olivaolaj': 'ulei de măsline',
  'olívaolaj': 'ulei de măsline',
  'avokado': 'avocado',
  'avokádó': 'avocado',
  'teljes': 'integral',
  'kiorlesu': 'integral',
  'kiőrlésű': 'integral',
  'kenyer': 'pâine',
  'kenyér': 'pâine',
  'gorog': 'grecesc',
  'görög': 'grecesc',
  'joghurt': 'iaurt',
  'turo': 'brânză de vaci',
  'túró': 'brânză de vaci',
  'dio': 'nucă',
  'dió': 'nucă',
  'mandula': 'migdale',
  'banan': 'banană',
  'banán': 'banană',
  'rizs': 'orez',
  'zab': 'ovăz',
  'quinoa': 'quinoa',
  'cukkini': 'dovlecel',
  'karfiol': 'conopidă',
  'lenmag': 'semințe de in',
  'tokmag': 'semințe de dovleac',
  'tökmag': 'semințe de dovleac',
};

export function translateFoodName(name: string, lang: LanguageCode): string {
  if (!name) return name;

  const nameKey = normalizeToken(name);

  if (lang === 'hu') {
    // DB stores names in English — convert EN→HU if needed
    const huName = FOOD_NAME_DICT_EN_TO_HU[nameKey];
    if (huName) return huName;
    // Also try RO→HU in case some names are stored in Romanian
    const huFromRo = FOOD_NAME_DICT_RO_TO_HU[nameKey];
    if (huFromRo) return huFromRo;
    // Already HU (or unknown) — return as-is
    return name;
  }

  // For EN/RO: first try HU→target (name is stored as HU)
  const entryFromHu = FOOD_NAME_DICT[nameKey];
  if (entryFromHu) return lang === 'en' ? entryFromHu.en : entryFromHu.ro;

  // Name may be stored in English — translate EN→HU→target
  const huName = FOOD_NAME_DICT_EN_TO_HU[nameKey];
  if (huName) {
    const entryViaHu = FOOD_NAME_DICT[normalizeToken(huName)];
    if (entryViaHu) return lang === 'en' ? entryViaHu.en : entryViaHu.ro;
  }

  // Word-level substitution fallback (handles AI-generated compound names)
  const dict = lang === 'en' ? WORD_MAP_EN : WORD_MAP_RO;
  const parts = name.split(/(\s+|[,()+/-])/);
  const translated = parts.map((part) => {
    if (!part.trim() || /(\s+|[,()+/-])/.test(part)) return part;
    const key = normalizeToken(part);
    const mapped = dict[key];
    return mapped ?? part;
  });

  return translated.join('');
}
