/**
 * ProfileSetupWizard - 6-step onboarding data collection
 * Steps: personal → foods → meals → sport → sleep → summary+generate
 * Everything saved locally — no cloud, no Firebase.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { apiBase, authFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import SharedPremiumLoader, { MEAL_GEN_PHASES, getPhaseText } from '../PremiumLoader';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  Droplets,
  Moon,
  Dumbbell,
  UtensilsCrossed,
  User,
  Apple,
  Plus,
  Minus,
  Sparkles,
  Clock,
  Search,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  saveUserProfile,
  getDefaultMealSettings,
  saveMealSettings,
  getDefaultMealsForModel,
  getDefaultMealsForCount,
  type MealModel,
} from '../../backend/services/UserProfileService';
import { SleepService } from '../../backend/services/SleepService';
import { createFoodsBatch } from '../../backend/services/FoodCatalogService';
import { setSetting } from '../../backend/services/SettingsService';
import type { CreateFoodInput } from '../../backend/services/FoodCatalogService';
import { DSMButton } from '../dsm';
import { canGenerate, incrementUsage } from '../../services/userFirestoreService';
import { getMET } from '../../utils/metHelpers';
import { FoodStyle, buildIngredientSelection } from '../../utils/buildIngredientSelection';
import { StepFoodStyle } from './StepFoodStyle';
import { callChefReview } from './callChefReview';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useNearbyStores, buildStoreMapUrl, type NearbyStore } from '../../hooks/useNearbyStores';
import type { FoodCategoryId } from '../../data/chainCatalog';
import { DataUploadSheet } from '../DataUploadSheet';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type Gender = 'male' | 'female';
type Goal = 'lose' | 'maintain' | 'gain';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
type DietType = 'omnivore' | 'vegetarian';

interface SportEntry {
  id: string;      // UUID for React key / removal
  sportId: string; // stable sport identifier (e.g. 'running', 'gym')
  days: number[];  // weekday indices: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  minutes: number; // per session
}

// ─────────────────────────────────────────────────────────────────
// Predefined food catalog for onboarding picker
// ─────────────────────────────────────────────────────────────────

type DisplayCategory = 'protein' | 'carb' | 'fat' | 'dairy' | 'vegetable' | 'fruit';

const mapCategory = (cat: DisplayCategory): string => {
  const map: Record<DisplayCategory, string> = {
    protein: 'Feherje',
    carb: 'Komplex_szenhidrat',
    fat: 'Egeszseges_zsir',
    dairy: 'Tejtermek',
    vegetable: 'Zoldseg',
    fruit: 'Gyumolcs',
  };
  return map[cat] ?? 'Feherje';
};

interface SeedFood {
  id: string;
  names: { hu: string; en: string; ro: string };
  category: DisplayCategory;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  vegetarian: boolean;
  emoji: string;
  allergens?: string[]; // allergen IDs: 'lactose', 'gluten', 'egg', 'fish', 'nuts', 'soy', 'shellfish'
}

interface ProductResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  stores: string[];
}

const STORE_LABELS: Record<string, string> = {
  lidl: 'Lidl', carrefour: 'Carrefour', penny: 'Penny', 'penny-market': 'Penny',
  spar: 'Spar', aldi: 'Aldi', tesco: 'Tesco', interspar: 'Interspar',
  auchan: 'Auchan', coop: 'Coop', dm: 'dm',
};

function guessCategory(protein: number, carbs: number, fat: number): DisplayCategory {
  if (protein >= 12) return 'protein';
  if (fat >= 15) return 'fat';
  if (carbs >= 20) return 'carb';
  return 'protein';
}

const SEED_FOODS: SeedFood[] = [
  // ── Protein ──────────────────────────────────────────────────
  { id: 'chicken_breast',  category: 'protein', emoji: '🍗', vegetarian: false, calories_per_100g: 165, protein_per_100g: 31,   carbs_per_100g: 0,    fat_per_100g: 3.6, names: { hu: 'Csirkemell',     en: 'Chicken breast',  ro: 'Piept de pui'    } },
  { id: 'chicken_thigh',   category: 'protein', emoji: '🍗', vegetarian: false, calories_per_100g: 215, protein_per_100g: 26,   carbs_per_100g: 0,    fat_per_100g: 12,  names: { hu: 'Csirkecomb',     en: 'Chicken thigh',   ro: 'Pulpă de pui'    } },
  { id: 'turkey_breast',   category: 'protein', emoji: '🦃', vegetarian: false, calories_per_100g: 135, protein_per_100g: 30,   carbs_per_100g: 0,    fat_per_100g: 1.5, names: { hu: 'Pulykamell',     en: 'Turkey breast',   ro: 'Piept de curcan' } },
  { id: 'egg',             category: 'protein', emoji: '🥚', vegetarian: true,  calories_per_100g: 155, protein_per_100g: 13,   carbs_per_100g: 1.1,  fat_per_100g: 11,  names: { hu: 'Tojás',          en: 'Egg',             ro: 'Ou'              }, allergens: ['egg']      },
  { id: 'salmon',          category: 'protein', emoji: '🐟', vegetarian: false, calories_per_100g: 208, protein_per_100g: 20,   carbs_per_100g: 0,    fat_per_100g: 13,  names: { hu: 'Lazac',          en: 'Salmon',          ro: 'Somon'           }, allergens: ['fish']     },
  { id: 'tuna',            category: 'protein', emoji: '🐠', vegetarian: false, calories_per_100g: 116, protein_per_100g: 26,   carbs_per_100g: 0,    fat_per_100g: 1,   names: { hu: 'Tonhal',         en: 'Tuna',            ro: 'Ton'             }, allergens: ['fish']     },
  { id: 'mackerel',        category: 'protein', emoji: '🐟', vegetarian: false, calories_per_100g: 205, protein_per_100g: 19,   carbs_per_100g: 0,    fat_per_100g: 14,  names: { hu: 'Makréla',        en: 'Mackerel',        ro: 'Macrou'          }, allergens: ['fish']     },
  { id: 'tilapia',         category: 'protein', emoji: '🐟', vegetarian: false, calories_per_100g: 96,  protein_per_100g: 20,   carbs_per_100g: 0,    fat_per_100g: 2,   names: { hu: 'Tilápia',        en: 'Tilapia',         ro: 'Tilapia'         }, allergens: ['fish']     },
  { id: 'shrimp',          category: 'protein', emoji: '🦐', vegetarian: false, calories_per_100g: 99,  protein_per_100g: 24,   carbs_per_100g: 0.2,  fat_per_100g: 0.3, names: { hu: 'Garnélarák',     en: 'Shrimp',          ro: 'Creveți'         }, allergens: ['shellfish']},
  { id: 'pork',            category: 'protein', emoji: '🥩', vegetarian: false, calories_per_100g: 242, protein_per_100g: 27,   carbs_per_100g: 0,    fat_per_100g: 14,  names: { hu: 'Sertéshús',      en: 'Pork',            ro: 'Carne de porc'   } },
  { id: 'beef',            category: 'protein', emoji: '🥩', vegetarian: false, calories_per_100g: 250, protein_per_100g: 26,   carbs_per_100g: 0,    fat_per_100g: 15,  names: { hu: 'Marhahús',       en: 'Beef',            ro: 'Carne de vită'   } },
  { id: 'lamb',            category: 'protein', emoji: '🥩', vegetarian: false, calories_per_100g: 294, protein_per_100g: 25,   carbs_per_100g: 0,    fat_per_100g: 21,  names: { hu: 'Bárány',         en: 'Lamb',            ro: 'Miel'            } },
  { id: 'tofu',            category: 'protein', emoji: '🫘', vegetarian: true,  calories_per_100g: 76,  protein_per_100g: 8,    carbs_per_100g: 1.9,  fat_per_100g: 4.8, names: { hu: 'Tofu',           en: 'Tofu',            ro: 'Tofu'            }, allergens: ['soy']      },
  { id: 'tempeh',          category: 'protein', emoji: '🫘', vegetarian: true,  calories_per_100g: 193, protein_per_100g: 19,   carbs_per_100g: 9,    fat_per_100g: 11,  names: { hu: 'Tempeh',         en: 'Tempeh',          ro: 'Tempeh'          }, allergens: ['soy']      },
  { id: 'lentils',         category: 'protein', emoji: '🫘', vegetarian: true,  calories_per_100g: 116, protein_per_100g: 9,    carbs_per_100g: 20,   fat_per_100g: 0.4, names: { hu: 'Lencse',         en: 'Lentils',         ro: 'Linte'           } },
  { id: 'chickpeas',       category: 'protein', emoji: '🫘', vegetarian: true,  calories_per_100g: 164, protein_per_100g: 9,    carbs_per_100g: 27,   fat_per_100g: 2.6, names: { hu: 'Csicseriborsó',  en: 'Chickpeas',       ro: 'Năut'            } },
  { id: 'black_beans',     category: 'protein', emoji: '🫘', vegetarian: true,  calories_per_100g: 132, protein_per_100g: 8.9,  carbs_per_100g: 24,   fat_per_100g: 0.5, names: { hu: 'Fekete bab',     en: 'Black beans',     ro: 'Fasole neagră'   } },
  { id: 'white_beans',     category: 'protein', emoji: '🫘', vegetarian: true,  calories_per_100g: 127, protein_per_100g: 8.7,  carbs_per_100g: 22,   fat_per_100g: 0.5, names: { hu: 'Fehér bab',      en: 'White beans',     ro: 'Fasole albă'     } },
  { id: 'egg_white',       category: 'protein', emoji: '🥚', vegetarian: true,  calories_per_100g: 52,  protein_per_100g: 11,   carbs_per_100g: 0.7,  fat_per_100g: 0.2, names: { hu: 'Tojásfehérje',  en: 'Egg white',       ro: 'Albuș de ou'     }, allergens: ['egg']      },
  { id: 'sardines',        category: 'protein', emoji: '🐟', vegetarian: false, calories_per_100g: 208, protein_per_100g: 25,   carbs_per_100g: 0,    fat_per_100g: 11,  names: { hu: 'Szardínia',      en: 'Sardines',        ro: 'Sardine'         }, allergens: ['fish']     },
  { id: 'ground_pork',     category: 'protein', emoji: '🥩', vegetarian: false, calories_per_100g: 263, protein_per_100g: 17,   carbs_per_100g: 0,    fat_per_100g: 21,  names: { hu: 'Darált sertés',    en: 'Ground pork',     ro: 'Carne tocată de porc'  } },
  { id: 'ground_beef',     category: 'protein', emoji: '🥩', vegetarian: false, calories_per_100g: 254, protein_per_100g: 17,   carbs_per_100g: 0,    fat_per_100g: 20,  names: { hu: 'Darált marha',     en: 'Ground beef',     ro: 'Carne tocată de vită'  } },
  { id: 'chicken_liver',   category: 'protein', emoji: '🫀', vegetarian: false, calories_per_100g: 119, protein_per_100g: 17,   carbs_per_100g: 0.7,  fat_per_100g: 5,   names: { hu: 'Csirkemáj',        en: 'Chicken liver',   ro: 'Ficat de pui'          } },
  { id: 'duck_breast',     category: 'protein', emoji: '🦆', vegetarian: false, calories_per_100g: 201, protein_per_100g: 23,   carbs_per_100g: 0,    fat_per_100g: 11,  names: { hu: 'Kacsamell',        en: 'Duck breast',     ro: 'Piept de rață'         } },
  { id: 'ham',             category: 'protein', emoji: '🍖', vegetarian: false, calories_per_100g: 145, protein_per_100g: 21,   carbs_per_100g: 1.5,  fat_per_100g: 6,   names: { hu: 'Sonka',            en: 'Ham',             ro: 'Șuncă'                 } },
  { id: 'bacon',           category: 'protein', emoji: '🥓', vegetarian: false, calories_per_100g: 541, protein_per_100g: 13,   carbs_per_100g: 1.4,  fat_per_100g: 42,  names: { hu: 'Szalonna',         en: 'Bacon',           ro: 'Slănină'               } },
  { id: 'sausage',         category: 'protein', emoji: '🌭', vegetarian: false, calories_per_100g: 301, protein_per_100g: 12,   carbs_per_100g: 2,    fat_per_100g: 27,  names: { hu: 'Kolbász',          en: 'Sausage',         ro: 'Cârnați'               } },
  { id: 'canned_tuna',     category: 'protein', emoji: '🥫', vegetarian: false, calories_per_100g: 116, protein_per_100g: 26,   carbs_per_100g: 0,    fat_per_100g: 1,   names: { hu: 'Tonhal konzerv',   en: 'Canned tuna',     ro: 'Ton conservă'          }, allergens: ['fish'] },
  { id: 'trout',           category: 'protein', emoji: '🐟', vegetarian: false, calories_per_100g: 141, protein_per_100g: 20,   carbs_per_100g: 0,    fat_per_100g: 6,   names: { hu: 'Pisztráng',        en: 'Trout',           ro: 'Păstrăv'               }, allergens: ['fish'] },
  { id: 'carp',            category: 'protein', emoji: '🐟', vegetarian: false, calories_per_100g: 127, protein_per_100g: 18,   carbs_per_100g: 0,    fat_per_100g: 6,   names: { hu: 'Ponty',            en: 'Carp',            ro: 'Crap'                  }, allergens: ['fish'] },
  { id: 'rabbit',          category: 'protein', emoji: '🐇', vegetarian: false, calories_per_100g: 173, protein_per_100g: 33,   carbs_per_100g: 0,    fat_per_100g: 4,   names: { hu: 'Nyúl',             en: 'Rabbit',          ro: 'Iepure'                } },
  { id: 'turkey_leg',      category: 'protein', emoji: '🦃', vegetarian: false, calories_per_100g: 208, protein_per_100g: 28,   carbs_per_100g: 0,    fat_per_100g: 10,  names: { hu: 'Pulykacomb',       en: 'Turkey leg',      ro: 'Pulpă de curcan'       } },
  { id: 'chicken_wing',    category: 'protein', emoji: '🍗', vegetarian: false, calories_per_100g: 203, protein_per_100g: 18,   carbs_per_100g: 0,    fat_per_100g: 13,  names: { hu: 'Csirkeszárny',     en: 'Chicken wing',    ro: 'Aripioare de pui'      } },
  // ── Carbs ─────────────────────────────────────────────────────
  { id: 'oats',            category: 'carb',    emoji: '🌾', vegetarian: true,  calories_per_100g: 389, protein_per_100g: 17,   carbs_per_100g: 66,   fat_per_100g: 7,   names: { hu: 'Zab',                    en: 'Oats',                  ro: 'Ovăz'              }, allergens: ['gluten'] },
  { id: 'rice',            category: 'carb',    emoji: '🍚', vegetarian: true,  calories_per_100g: 130, protein_per_100g: 2.7,  carbs_per_100g: 28,   fat_per_100g: 0.3, names: { hu: 'Rizs',                   en: 'Rice',                  ro: 'Orez'              } },
  { id: 'brown_rice',      category: 'carb',    emoji: '🍚', vegetarian: true,  calories_per_100g: 111, protein_per_100g: 2.6,  carbs_per_100g: 23,   fat_per_100g: 0.9, names: { hu: 'Barna rizs',             en: 'Brown rice',            ro: 'Orez brun'         } },
  { id: 'whole_grain_bread',category: 'carb',   emoji: '🍞', vegetarian: true,  calories_per_100g: 247, protein_per_100g: 13,   carbs_per_100g: 41,   fat_per_100g: 4,   names: { hu: 'Teljes kiőrlésű kenyér', en: 'Whole grain bread',     ro: 'Pâine integrală'   }, allergens: ['gluten'] },
  { id: 'white_bread',     category: 'carb',    emoji: '🍞', vegetarian: true,  calories_per_100g: 265, protein_per_100g: 9,    carbs_per_100g: 49,   fat_per_100g: 3.2, names: { hu: 'Fehér kenyér',           en: 'White bread',           ro: 'Pâine albă'        }, allergens: ['gluten'] },
  { id: 'pasta',           category: 'carb',    emoji: '🍝', vegetarian: true,  calories_per_100g: 157, protein_per_100g: 5.8,  carbs_per_100g: 31,   fat_per_100g: 0.9, names: { hu: 'Tészta',                 en: 'Pasta',                 ro: 'Paste'             }, allergens: ['gluten'] },
  { id: 'whole_grain_pasta',category: 'carb',   emoji: '🍝', vegetarian: true,  calories_per_100g: 148, protein_per_100g: 6.3,  carbs_per_100g: 29,   fat_per_100g: 0.8, names: { hu: 'Teljes kiőrlésű tészta', en: 'Whole grain pasta',     ro: 'Paste integrale'   }, allergens: ['gluten'] },
  { id: 'potato',          category: 'carb',    emoji: '🥔', vegetarian: true,  calories_per_100g: 77,  protein_per_100g: 2,    carbs_per_100g: 17,   fat_per_100g: 0.1, names: { hu: 'Burgonya',               en: 'Potato',                ro: 'Cartofi'           } },
  { id: 'sweet_potato',    category: 'carb',    emoji: '🍠', vegetarian: true,  calories_per_100g: 86,  protein_per_100g: 1.6,  carbs_per_100g: 20,   fat_per_100g: 0.1, names: { hu: 'Édesburgonya',           en: 'Sweet potato',          ro: 'Cartofi dulci'     } },
  { id: 'quinoa',          category: 'carb',    emoji: '🌾', vegetarian: true,  calories_per_100g: 120, protein_per_100g: 4.4,  carbs_per_100g: 21,   fat_per_100g: 1.9, names: { hu: 'Quinoa',                 en: 'Quinoa',                ro: 'Quinoa'            } },
  { id: 'corn',            category: 'carb',    emoji: '🌽', vegetarian: true,  calories_per_100g: 96,  protein_per_100g: 3.4,  carbs_per_100g: 21,   fat_per_100g: 1.5, names: { hu: 'Kukorica',               en: 'Corn',                  ro: 'Porumb'            } },
  { id: 'buckwheat',       category: 'carb',    emoji: '🌾', vegetarian: true,  calories_per_100g: 92,  protein_per_100g: 3.4,  carbs_per_100g: 20,   fat_per_100g: 0.6, names: { hu: 'Hajdina',                en: 'Buckwheat',             ro: 'Hrișcă'            } },
  { id: 'barley',          category: 'carb',    emoji: '🌾', vegetarian: true,  calories_per_100g: 123, protein_per_100g: 2.3,  carbs_per_100g: 28,   fat_per_100g: 0.4, names: { hu: 'Árpa',                   en: 'Barley',                ro: 'Orz'               }, allergens: ['gluten'] },
  { id: 'tortilla',        category: 'carb',    emoji: '🫓', vegetarian: true,  calories_per_100g: 218, protein_per_100g: 6,    carbs_per_100g: 36,   fat_per_100g: 5.5, names: { hu: 'Tortilla',               en: 'Tortilla',              ro: 'Tortilla'          }, allergens: ['gluten'] },
  { id: 'oatmeal',         category: 'carb',    emoji: '🌾', vegetarian: true,  calories_per_100g: 379, protein_per_100g: 13,   carbs_per_100g: 68,   fat_per_100g: 6.5, names: { hu: 'Zabpehely',              en: 'Oatmeal',               ro: 'Fulgi de ovăz'     }, allergens: ['gluten'] },
  { id: 'polenta',         category: 'carb',    emoji: '🌽', vegetarian: true,  calories_per_100g: 85,  protein_per_100g: 1.6,  carbs_per_100g: 19,   fat_per_100g: 0.3, names: { hu: 'Puliszka / polenta',     en: 'Polenta',               ro: 'Mămăligă'          } },
  { id: 'couscous',        category: 'carb',    emoji: '🌾', vegetarian: true,  calories_per_100g: 176, protein_per_100g: 6,    carbs_per_100g: 36,   fat_per_100g: 0.3, names: { hu: 'Kuszkusz',               en: 'Couscous',              ro: 'Cușcuș'            }, allergens: ['gluten'] },
  { id: 'semolina',        category: 'carb',    emoji: '🌾', vegetarian: true,  calories_per_100g: 360, protein_per_100g: 13,   carbs_per_100g: 73,   fat_per_100g: 1.1, names: { hu: 'Gríz / búzadara',       en: 'Semolina',              ro: 'Griș'              }, allergens: ['gluten'] },
  { id: 'millet',          category: 'carb',    emoji: '🌾', vegetarian: true,  calories_per_100g: 119, protein_per_100g: 3.5,  carbs_per_100g: 23,   fat_per_100g: 1,   names: { hu: 'Köles',                  en: 'Millet',                ro: 'Mei'               } },
  { id: 'spelt',           category: 'carb',    emoji: '🌾', vegetarian: true,  calories_per_100g: 338, protein_per_100g: 15,   carbs_per_100g: 70,   fat_per_100g: 2.4, names: { hu: 'Tönkölybúza',            en: 'Spelt',                 ro: 'Alac'              }, allergens: ['gluten'] },
  { id: 'rye_bread',       category: 'carb',    emoji: '🍞', vegetarian: true,  calories_per_100g: 259, protein_per_100g: 8.5,  carbs_per_100g: 48,   fat_per_100g: 3.3, names: { hu: 'Rozskenyér',             en: 'Rye bread',             ro: 'Pâine de secară'   }, allergens: ['gluten'] },
  { id: 'rice_cakes',      category: 'carb',    emoji: '🍘', vegetarian: true,  calories_per_100g: 387, protein_per_100g: 8,    carbs_per_100g: 81,   fat_per_100g: 2.8, names: { hu: 'Puffasztott rizs',       en: 'Rice cakes',            ro: 'Expandat de orez'  } },
  { id: 'flour',           category: 'carb',    emoji: '🌾', vegetarian: true,  calories_per_100g: 364, protein_per_100g: 10,   carbs_per_100g: 76,   fat_per_100g: 1,   names: { hu: 'Liszt',                  en: 'Flour',                 ro: 'Făină'             }, allergens: ['gluten'] },
  { id: 'bulgur',          category: 'carb',    emoji: '🌾', vegetarian: true,  calories_per_100g: 83,  protein_per_100g: 3.1,  carbs_per_100g: 19,   fat_per_100g: 0.2, names: { hu: 'Bulgur',                 en: 'Bulgur',                ro: 'Bulgur'            }, allergens: ['gluten'] },
  // ── Fat ───────────────────────────────────────────────────────
  { id: 'avocado',         category: 'fat',     emoji: '🥑', vegetarian: true,  calories_per_100g: 160, protein_per_100g: 2,    carbs_per_100g: 9,    fat_per_100g: 15,  names: { hu: 'Avokádó',     en: 'Avocado',         ro: 'Avocado'             } },
  { id: 'walnut',          category: 'fat',     emoji: '🌰', vegetarian: true,  calories_per_100g: 654, protein_per_100g: 15,   carbs_per_100g: 14,   fat_per_100g: 65,  names: { hu: 'Dió',         en: 'Walnut',          ro: 'Nuci'                }, allergens: ['nuts'] },
  { id: 'almond',          category: 'fat',     emoji: '🥜', vegetarian: true,  calories_per_100g: 579, protein_per_100g: 21,   carbs_per_100g: 22,   fat_per_100g: 50,  names: { hu: 'Mandula',     en: 'Almond',          ro: 'Migdale'             }, allergens: ['nuts'] },
  { id: 'peanut',          category: 'fat',     emoji: '🥜', vegetarian: true,  calories_per_100g: 567, protein_per_100g: 26,   carbs_per_100g: 16,   fat_per_100g: 49,  names: { hu: 'Földimogyoró', en: 'Peanut',         ro: 'Arahide'             }, allergens: ['nuts'] },
  { id: 'cashew',          category: 'fat',     emoji: '🥜', vegetarian: true,  calories_per_100g: 553, protein_per_100g: 18,   carbs_per_100g: 30,   fat_per_100g: 44,  names: { hu: 'Kesudió',     en: 'Cashew',          ro: 'Caju'                }, allergens: ['nuts'] },
  { id: 'pecan',           category: 'fat',     emoji: '🌰', vegetarian: true,  calories_per_100g: 691, protein_per_100g: 9,    carbs_per_100g: 14,   fat_per_100g: 72,  names: { hu: 'Pekándió',    en: 'Pecan',           ro: 'Pecan'               }, allergens: ['nuts'] },
  { id: 'olive_oil',       category: 'fat',     emoji: '🫒', vegetarian: true,  calories_per_100g: 884, protein_per_100g: 0,    carbs_per_100g: 0,    fat_per_100g: 100, names: { hu: 'Olívaolaj',   en: 'Olive oil',       ro: 'Ulei de măsline'     } },
  { id: 'coconut_oil',     category: 'fat',     emoji: '🥥', vegetarian: true,  calories_per_100g: 862, protein_per_100g: 0,    carbs_per_100g: 0,    fat_per_100g: 100, names: { hu: 'Kókuszolaj',  en: 'Coconut oil',     ro: 'Ulei de cocos'       } },
  { id: 'peanut_butter',   category: 'fat',     emoji: '🥜', vegetarian: true,  calories_per_100g: 588, protein_per_100g: 25,   carbs_per_100g: 20,   fat_per_100g: 50,  names: { hu: 'Mogyoróvaj', en: 'Peanut butter',   ro: 'Unt de arahide'      }, allergens: ['nuts'] },
  { id: 'chia_seeds',      category: 'fat',     emoji: '🌱', vegetarian: true,  calories_per_100g: 486, protein_per_100g: 17,   carbs_per_100g: 42,   fat_per_100g: 31,  names: { hu: 'Chia mag',    en: 'Chia seeds',      ro: 'Semințe de chia'     } },
  { id: 'flaxseed',        category: 'fat',     emoji: '🌱', vegetarian: true,  calories_per_100g: 534, protein_per_100g: 18,   carbs_per_100g: 29,   fat_per_100g: 42,  names: { hu: 'Lenmag',      en: 'Flaxseed',        ro: 'Semințe de in'       } },
  { id: 'pumpkin_seeds',   category: 'fat',     emoji: '🌱', vegetarian: true,  calories_per_100g: 559, protein_per_100g: 30,   carbs_per_100g: 11,   fat_per_100g: 49,  names: { hu: 'Tök mag',     en: 'Pumpkin seeds',   ro: 'Semințe de dovleac'  } },
  { id: 'sunflower_seeds', category: 'fat',     emoji: '🌻', vegetarian: true,  calories_per_100g: 584, protein_per_100g: 21,   carbs_per_100g: 20,   fat_per_100g: 51,  names: { hu: 'Napraforgó mag', en: 'Sunflower seeds', ro: 'Semințe de floarea-soarelui' } },
  { id: 'sunflower_oil',  category: 'fat',     emoji: '🌻', vegetarian: true,  calories_per_100g: 884, protein_per_100g: 0,    carbs_per_100g: 0,    fat_per_100g: 100, names: { hu: 'Napraforgó olaj', en: 'Sunflower oil',  ro: 'Ulei de floarea-soarelui'    } },
  { id: 'sesame_seeds',   category: 'fat',     emoji: '🌱', vegetarian: true,  calories_per_100g: 573, protein_per_100g: 18,   carbs_per_100g: 23,   fat_per_100g: 50,  names: { hu: 'Szezámmag',    en: 'Sesame seeds',    ro: 'Semințe de susan'    }, allergens: ['sesame'] },
  { id: 'hazelnut',       category: 'fat',     emoji: '🌰', vegetarian: true,  calories_per_100g: 628, protein_per_100g: 15,   carbs_per_100g: 17,   fat_per_100g: 61,  names: { hu: 'Mogyoró',      en: 'Hazelnut',        ro: 'Alune de pădure'     }, allergens: ['nuts'] },
  { id: 'tahini',         category: 'fat',     emoji: '🫘', vegetarian: true,  calories_per_100g: 595, protein_per_100g: 17,   carbs_per_100g: 22,   fat_per_100g: 54,  names: { hu: 'Tahini',       en: 'Tahini',          ro: 'Tahini'              }, allergens: ['sesame'] },
  { id: 'butter_ghee',    category: 'fat',     emoji: '🧈', vegetarian: true,  calories_per_100g: 900, protein_per_100g: 0,    carbs_per_100g: 0,    fat_per_100g: 100, names: { hu: 'Ghí / tisztított vaj', en: 'Ghee',      ro: 'Unt clarificat'      }, allergens: ['lactose'] },
  // ── Dairy ─────────────────────────────────────────────────────
  { id: 'greek_yogurt',    category: 'dairy',   emoji: '🥛', vegetarian: true,  calories_per_100g: 59,  protein_per_100g: 10,   carbs_per_100g: 3.6,  fat_per_100g: 0.4, names: { hu: 'Görög joghurt', en: 'Greek yogurt',   ro: 'Iaurt grecesc' }, allergens: ['lactose'] },
  { id: 'yogurt',          category: 'dairy',   emoji: '🥛', vegetarian: true,  calories_per_100g: 61,  protein_per_100g: 3.5,  carbs_per_100g: 4.7,  fat_per_100g: 3.3, names: { hu: 'Joghurt',      en: 'Yogurt',         ro: 'Iaurt'         }, allergens: ['lactose'] },
  { id: 'cottage_cheese',  category: 'dairy',   emoji: '🧀', vegetarian: true,  calories_per_100g: 98,  protein_per_100g: 11,   carbs_per_100g: 3.4,  fat_per_100g: 4.3, names: { hu: 'Túró',         en: 'Cottage cheese', ro: 'Brânză de vaci'}, allergens: ['lactose'] },
  { id: 'cheese',          category: 'dairy',   emoji: '🧀', vegetarian: true,  calories_per_100g: 402, protein_per_100g: 25,   carbs_per_100g: 1.3,  fat_per_100g: 33,  names: { hu: 'Sajt',         en: 'Cheese',         ro: 'Brânză'        }, allergens: ['lactose'] },
  { id: 'mozzarella',      category: 'dairy',   emoji: '🧀', vegetarian: true,  calories_per_100g: 280, protein_per_100g: 28,   carbs_per_100g: 2.2,  fat_per_100g: 17,  names: { hu: 'Mozzarella',   en: 'Mozzarella',     ro: 'Mozzarella'    }, allergens: ['lactose'] },
  { id: 'ricotta',         category: 'dairy',   emoji: '🧀', vegetarian: true,  calories_per_100g: 174, protein_per_100g: 11,   carbs_per_100g: 3,    fat_per_100g: 13,  names: { hu: 'Ricotta',      en: 'Ricotta',        ro: 'Ricotta'       }, allergens: ['lactose'] },
  { id: 'milk',            category: 'dairy',   emoji: '🥛', vegetarian: true,  calories_per_100g: 61,  protein_per_100g: 3.2,  carbs_per_100g: 4.8,  fat_per_100g: 3.3, names: { hu: 'Tej',          en: 'Milk',           ro: 'Lapte'         }, allergens: ['lactose'] },
  { id: 'kefir',           category: 'dairy',   emoji: '🥛', vegetarian: true,  calories_per_100g: 61,  protein_per_100g: 3.3,  carbs_per_100g: 4.7,  fat_per_100g: 3.5, names: { hu: 'Kefir',        en: 'Kefir',          ro: 'Chefir'        }, allergens: ['lactose'] },
  { id: 'butter',          category: 'dairy',   emoji: '🧈', vegetarian: true,  calories_per_100g: 717, protein_per_100g: 0.9,  carbs_per_100g: 0.1,  fat_per_100g: 81,  names: { hu: 'Vaj',          en: 'Butter',         ro: 'Unt'           }, allergens: ['lactose'] },
  { id: 'sour_cream',      category: 'dairy',   emoji: '🥛', vegetarian: true,  calories_per_100g: 193, protein_per_100g: 2.4,  carbs_per_100g: 3.4,  fat_per_100g: 20,  names: { hu: 'Tejföl',       en: 'Sour cream',     ro: 'Smântână'      }, allergens: ['lactose'] },
  { id: 'telemea',         category: 'dairy',   emoji: '🧀', vegetarian: true,  calories_per_100g: 250, protein_per_100g: 17,   carbs_per_100g: 2,    fat_per_100g: 20,  names: { hu: 'Telemea sajt', en: 'Telemea cheese', ro: 'Telemea'       }, allergens: ['lactose'] },
  { id: 'trappista',       category: 'dairy',   emoji: '🧀', vegetarian: true,  calories_per_100g: 350, protein_per_100g: 25,   carbs_per_100g: 1,    fat_per_100g: 27,  names: { hu: 'Trappista sajt', en: 'Trappista cheese', ro: 'Brânză Trappista' }, allergens: ['lactose'] },
  { id: 'cream_cheese',    category: 'dairy',   emoji: '🧀', vegetarian: true,  calories_per_100g: 342, protein_per_100g: 6,    carbs_per_100g: 4,    fat_per_100g: 34,  names: { hu: 'Krémsajt',     en: 'Cream cheese',   ro: 'Cremă de brânză'}, allergens: ['lactose'] },
  { id: 'whey_protein',    category: 'dairy',   emoji: '💪', vegetarian: true,  calories_per_100g: 370, protein_per_100g: 80,   carbs_per_100g: 8,    fat_per_100g: 3,   names: { hu: 'Fehérjepor',   en: 'Whey protein',   ro: 'Proteină whey'  }, allergens: ['lactose'] },
  // ── Pantry staples ────────────────────────────────────────────
  { id: 'honey',           category: 'carb',    emoji: '🍯', vegetarian: true,  calories_per_100g: 304, protein_per_100g: 0.3,  carbs_per_100g: 82,   fat_per_100g: 0,   names: { hu: 'Méz',          en: 'Honey',          ro: 'Miere'          } },
  { id: 'salami',          category: 'protein', emoji: '🥩', vegetarian: false, calories_per_100g: 336, protein_per_100g: 22,   carbs_per_100g: 1.5,  fat_per_100g: 27,  names: { hu: 'Szalámi',      en: 'Salami',         ro: 'Salam'          } },
  // ── Vegetable ─────────────────────────────────────────────────
  { id: 'broccoli',        category: 'vegetable', emoji: '🥦', vegetarian: true, calories_per_100g: 34,  protein_per_100g: 2.8,  carbs_per_100g: 7,    fat_per_100g: 0.4, names: { hu: 'Brokkoli',    en: 'Broccoli',         ro: 'Broccoli'       } },
  { id: 'cauliflower',     category: 'vegetable', emoji: '🥦', vegetarian: true, calories_per_100g: 25,  protein_per_100g: 1.9,  carbs_per_100g: 5,    fat_per_100g: 0.3, names: { hu: 'Karfiol',     en: 'Cauliflower',      ro: 'Conopidă'       } },
  { id: 'spinach',         category: 'vegetable', emoji: '🌿', vegetarian: true, calories_per_100g: 23,  protein_per_100g: 2.9,  carbs_per_100g: 3.6,  fat_per_100g: 0.4, names: { hu: 'Spenót',      en: 'Spinach',          ro: 'Spanac'         } },
  { id: 'tomato',          category: 'vegetable', emoji: '🍅', vegetarian: true, calories_per_100g: 18,  protein_per_100g: 0.9,  carbs_per_100g: 3.9,  fat_per_100g: 0.2, names: { hu: 'Paradicsom',  en: 'Tomato',           ro: 'Roșie'          } },
  { id: 'bell_pepper',     category: 'vegetable', emoji: '🫑', vegetarian: true, calories_per_100g: 31,  protein_per_100g: 1,    carbs_per_100g: 6,    fat_per_100g: 0.3, names: { hu: 'Paprika',     en: 'Bell pepper',      ro: 'Ardei'          } },
  { id: 'carrot',          category: 'vegetable', emoji: '🥕', vegetarian: true, calories_per_100g: 41,  protein_per_100g: 0.9,  carbs_per_100g: 10,   fat_per_100g: 0.2, names: { hu: 'Sárgarépa',   en: 'Carrot',           ro: 'Morcov'         } },
  { id: 'cucumber',        category: 'vegetable', emoji: '🥒', vegetarian: true, calories_per_100g: 16,  protein_per_100g: 0.7,  carbs_per_100g: 3.6,  fat_per_100g: 0.1, names: { hu: 'Uborka',      en: 'Cucumber',         ro: 'Castraveți'     } },
  { id: 'garlic',          category: 'vegetable', emoji: '🧄', vegetarian: true, calories_per_100g: 149, protein_per_100g: 6.4,  carbs_per_100g: 33,   fat_per_100g: 0.5, names: { hu: 'Fokhagyma',   en: 'Garlic',           ro: 'Usturoi'        } },
  { id: 'onion',           category: 'vegetable', emoji: '🧅', vegetarian: true, calories_per_100g: 40,  protein_per_100g: 1.1,  carbs_per_100g: 9.3,  fat_per_100g: 0.1, names: { hu: 'Hagyma',      en: 'Onion',            ro: 'Ceapă'          } },
  { id: 'green_peas',      category: 'vegetable', emoji: '🫛', vegetarian: true, calories_per_100g: 81,  protein_per_100g: 5.4,  carbs_per_100g: 14,   fat_per_100g: 0.4, names: { hu: 'Zöldborsó',   en: 'Green peas',       ro: 'Mazăre'         } },
  { id: 'green_beans',     category: 'vegetable', emoji: '🫘', vegetarian: true, calories_per_100g: 31,  protein_per_100g: 1.8,  carbs_per_100g: 7,    fat_per_100g: 0.1, names: { hu: 'Zöldbab',     en: 'Green beans',      ro: 'Fasole verde'   } },
  { id: 'snap_peas',       category: 'vegetable', emoji: '🫛', vegetarian: true, calories_per_100g: 42,  protein_per_100g: 2.8,  carbs_per_100g: 7.6,  fat_per_100g: 0.2, names: { hu: 'Cukorborsó',  en: 'Sugar snap peas',  ro: 'Mazăre dulce'   } },
  { id: 'beetroot',        category: 'vegetable', emoji: '🫚', vegetarian: true, calories_per_100g: 43,  protein_per_100g: 1.6,  carbs_per_100g: 10,   fat_per_100g: 0.2, names: { hu: 'Cékla',       en: 'Beetroot',         ro: 'Sfeclă roșie'   } },
  { id: 'kale',            category: 'vegetable', emoji: '🥬', vegetarian: true, calories_per_100g: 49,  protein_per_100g: 4.3,  carbs_per_100g: 9,    fat_per_100g: 0.9, names: { hu: 'Kelkáposzta', en: 'Kale',             ro: 'Kale'           } },
  { id: 'lettuce',         category: 'vegetable', emoji: '🥬', vegetarian: true, calories_per_100g: 15,  protein_per_100g: 1.4,  carbs_per_100g: 2.9,  fat_per_100g: 0.2, names: { hu: 'Saláta',      en: 'Lettuce',          ro: 'Salată'         } },
  { id: 'eggplant',        category: 'vegetable', emoji: '🍆', vegetarian: true, calories_per_100g: 25,  protein_per_100g: 1,    carbs_per_100g: 6,    fat_per_100g: 0.2, names: { hu: 'Padlizsán',   en: 'Eggplant',         ro: 'Vinete'         } },
  { id: 'zucchini',        category: 'vegetable', emoji: '🥒', vegetarian: true, calories_per_100g: 17,  protein_per_100g: 1.2,  carbs_per_100g: 3.1,  fat_per_100g: 0.3, names: { hu: 'Cukkini',     en: 'Zucchini',         ro: 'Dovlecel'       } },
  { id: 'mushroom',        category: 'vegetable', emoji: '🍄', vegetarian: true, calories_per_100g: 22,  protein_per_100g: 3.1,  carbs_per_100g: 3.3,  fat_per_100g: 0.3, names: { hu: 'Gomba',       en: 'Mushroom',         ro: 'Ciuperci'       } },
  { id: 'artichoke',       category: 'vegetable', emoji: '🌿', vegetarian: true, calories_per_100g: 47,  protein_per_100g: 3.3,  carbs_per_100g: 11,   fat_per_100g: 0.2, names: { hu: 'Articsóka',   en: 'Artichoke',        ro: 'Anghinare'      } },
  { id: 'asparagus',       category: 'vegetable', emoji: '🌿', vegetarian: true, calories_per_100g: 20,  protein_per_100g: 2.2,  carbs_per_100g: 3.9,  fat_per_100g: 0.1, names: { hu: 'Spárga',      en: 'Asparagus',        ro: 'Sparanghel'     } },
  { id: 'cabbage',         category: 'vegetable', emoji: '🥬', vegetarian: true, calories_per_100g: 25,  protein_per_100g: 1.3,  carbs_per_100g: 6,    fat_per_100g: 0.1, names: { hu: 'Káposzta',    en: 'Cabbage',          ro: 'Varză'          } },
  { id: 'red_cabbage',     category: 'vegetable', emoji: '🥬', vegetarian: true, calories_per_100g: 31,  protein_per_100g: 1.4,  carbs_per_100g: 7,    fat_per_100g: 0.2, names: { hu: 'Lilakáposzta', en: 'Red cabbage',     ro: 'Varză roșie'    } },
  { id: 'leek',            category: 'vegetable', emoji: '🧅', vegetarian: true, calories_per_100g: 61,  protein_per_100g: 1.5,  carbs_per_100g: 14,   fat_per_100g: 0.3, names: { hu: 'Póréhagyma',  en: 'Leek',             ro: 'Praz'           } },
  { id: 'celery',          category: 'vegetable', emoji: '🌿', vegetarian: true, calories_per_100g: 42,  protein_per_100g: 1.5,  carbs_per_100g: 9,    fat_per_100g: 0.3, names: { hu: 'Zeller',      en: 'Celery root',      ro: 'Țelină'         } },
  { id: 'parsley_root',    category: 'vegetable', emoji: '🌿', vegetarian: true, calories_per_100g: 55,  protein_per_100g: 2.3,  carbs_per_100g: 12,   fat_per_100g: 0.6, names: { hu: 'Petrezselyem gyökér', en: 'Parsley root', ro: 'Rădăcină de pătrunjel' } },
  { id: 'radish',          category: 'vegetable', emoji: '🌿', vegetarian: true, calories_per_100g: 16,  protein_per_100g: 0.7,  carbs_per_100g: 3.4,  fat_per_100g: 0.1, names: { hu: 'Retek',       en: 'Radish',           ro: 'Ridiche'        } },
  { id: 'pumpkin',         category: 'vegetable', emoji: '🎃', vegetarian: true, calories_per_100g: 26,  protein_per_100g: 1,    carbs_per_100g: 7,    fat_per_100g: 0.1, names: { hu: 'Sütőtök',     en: 'Pumpkin',          ro: 'Dovleac'        } },
  { id: 'kohlrabi',        category: 'vegetable', emoji: '🥬', vegetarian: true, calories_per_100g: 27,  protein_per_100g: 1.7,  carbs_per_100g: 6,    fat_per_100g: 0.1, names: { hu: 'Karalábé',    en: 'Kohlrabi',         ro: 'Gulie'          } },
  { id: 'green_onion',     category: 'vegetable', emoji: '🧅', vegetarian: true, calories_per_100g: 32,  protein_per_100g: 1.8,  carbs_per_100g: 7,    fat_per_100g: 0.2, names: { hu: 'Újhagyma',    en: 'Green onion',      ro: 'Ceapă verde'    } },
  { id: 'turnip',          category: 'vegetable', emoji: '🌿', vegetarian: true, calories_per_100g: 28,  protein_per_100g: 0.9,  carbs_per_100g: 6,    fat_per_100g: 0.1, names: { hu: 'Fehérrépa',   en: 'Turnip',           ro: 'Nap'            } },
  { id: 'hot_pepper',      category: 'vegetable', emoji: '🌶️', vegetarian: true, calories_per_100g: 40,  protein_per_100g: 1.9,  carbs_per_100g: 9,    fat_per_100g: 0.4, names: { hu: 'Erős paprika', en: 'Hot pepper',      ro: 'Ardei iute'     } },
  { id: 'corn_canned',     category: 'vegetable', emoji: '🌽', vegetarian: true, calories_per_100g: 64,  protein_per_100g: 2.3,  carbs_per_100g: 14,   fat_per_100g: 0.5, names: { hu: 'Kukorica konzerv', en: 'Canned corn',  ro: 'Porumb conservă'} },
  { id: 'pickled_cucumber', category: 'vegetable', emoji: '🥒', vegetarian: true, calories_per_100g: 11, protein_per_100g: 0.3,  carbs_per_100g: 2.3,  fat_per_100g: 0.2, names: { hu: 'Kovászos uborka', en: 'Pickled cucumber', ro: 'Castraveți murați' } },
  { id: 'sauerkraut',      category: 'vegetable', emoji: '🥬', vegetarian: true, calories_per_100g: 19,  protein_per_100g: 0.9,  carbs_per_100g: 4.3,  fat_per_100g: 0.1, names: { hu: 'Savanyú káposzta', en: 'Sauerkraut',   ro: 'Varză murată'   } },
  // ── Fruit ─────────────────────────────────────────────────────
  { id: 'apple',           category: 'fruit',   emoji: '🍎', vegetarian: true, calories_per_100g: 52,  protein_per_100g: 0.3,  carbs_per_100g: 14,   fat_per_100g: 0.2, names: { hu: 'Alma',         en: 'Apple',       ro: 'Măr'          } },
  { id: 'banana',          category: 'fruit',   emoji: '🍌', vegetarian: true, calories_per_100g: 89,  protein_per_100g: 1.1,  carbs_per_100g: 23,   fat_per_100g: 0.3, names: { hu: 'Banán',        en: 'Banana',      ro: 'Banană'       } },
  { id: 'blueberry',       category: 'fruit',   emoji: '🫐', vegetarian: true, calories_per_100g: 57,  protein_per_100g: 0.7,  carbs_per_100g: 14,   fat_per_100g: 0.3, names: { hu: 'Áfonya',       en: 'Blueberry',   ro: 'Afine'        } },
  { id: 'strawberry',      category: 'fruit',   emoji: '🍓', vegetarian: true, calories_per_100g: 32,  protein_per_100g: 0.7,  carbs_per_100g: 7.7,  fat_per_100g: 0.3, names: { hu: 'Eper',         en: 'Strawberry',  ro: 'Căpșuni'      } },
  { id: 'orange',          category: 'fruit',   emoji: '🍊', vegetarian: true, calories_per_100g: 47,  protein_per_100g: 0.9,  carbs_per_100g: 12,   fat_per_100g: 0.1, names: { hu: 'Narancs',      en: 'Orange',      ro: 'Portocală'    } },
  { id: 'kiwi',            category: 'fruit',   emoji: '🥝', vegetarian: true, calories_per_100g: 61,  protein_per_100g: 1.1,  carbs_per_100g: 15,   fat_per_100g: 0.5, names: { hu: 'Kivi',         en: 'Kiwi',        ro: 'Kiwi'         } },
  { id: 'mango',           category: 'fruit',   emoji: '🥭', vegetarian: true, calories_per_100g: 60,  protein_per_100g: 0.8,  carbs_per_100g: 15,   fat_per_100g: 0.4, names: { hu: 'Mangó',        en: 'Mango',       ro: 'Mango'        } },
  { id: 'watermelon',      category: 'fruit',   emoji: '🍉', vegetarian: true, calories_per_100g: 30,  protein_per_100g: 0.6,  carbs_per_100g: 7.6,  fat_per_100g: 0.2, names: { hu: 'Görögdinnye',  en: 'Watermelon',  ro: 'Pepene verde' } },
  { id: 'grapes',          category: 'fruit',   emoji: '🍇', vegetarian: true, calories_per_100g: 67,  protein_per_100g: 0.6,  carbs_per_100g: 17,   fat_per_100g: 0.4, names: { hu: 'Szőlő',        en: 'Grapes',      ro: 'Struguri'     } },
  { id: 'pear',            category: 'fruit',   emoji: '🍐', vegetarian: true, calories_per_100g: 57,  protein_per_100g: 0.4,  carbs_per_100g: 15,   fat_per_100g: 0.1, names: { hu: 'Körte',        en: 'Pear',        ro: 'Pară'         } },
  { id: 'peach',           category: 'fruit',   emoji: '🍑', vegetarian: true, calories_per_100g: 39,  protein_per_100g: 0.9,  carbs_per_100g: 10,   fat_per_100g: 0.3, names: { hu: 'Őszibarack',   en: 'Peach',       ro: 'Piersică'     } },
  { id: 'cherry',          category: 'fruit',   emoji: '🍒', vegetarian: true, calories_per_100g: 63,  protein_per_100g: 1.1,  carbs_per_100g: 16,   fat_per_100g: 0.2, names: { hu: 'Cseresznye',   en: 'Cherry',      ro: 'Cireșe'       } },
  { id: 'pineapple',       category: 'fruit',   emoji: '🍍', vegetarian: true, calories_per_100g: 50,  protein_per_100g: 0.5,  carbs_per_100g: 13,   fat_per_100g: 0.1, names: { hu: 'Ananász',      en: 'Pineapple',   ro: 'Ananas'       } },
  { id: 'grapefruit',      category: 'fruit',   emoji: '🍊', vegetarian: true, calories_per_100g: 42,  protein_per_100g: 0.8,  carbs_per_100g: 11,   fat_per_100g: 0.1, names: { hu: 'Grapefruit',   en: 'Grapefruit',  ro: 'Grapefruit'   } },
  { id: 'lemon',           category: 'fruit',   emoji: '🍋', vegetarian: true, calories_per_100g: 29,  protein_per_100g: 1.1,  carbs_per_100g: 9,    fat_per_100g: 0.3, names: { hu: 'Citrom',       en: 'Lemon',       ro: 'Lămâie'       } },
  { id: 'raspberry',       category: 'fruit',   emoji: '🫐', vegetarian: true, calories_per_100g: 52,  protein_per_100g: 1.2,  carbs_per_100g: 12,   fat_per_100g: 0.7, names: { hu: 'Málna',        en: 'Raspberry',   ro: 'Zmeură'       } },
  { id: 'plum',            category: 'fruit',   emoji: '🟣', vegetarian: true, calories_per_100g: 46,  protein_per_100g: 0.7,  carbs_per_100g: 11,   fat_per_100g: 0.3, names: { hu: 'Szilva',       en: 'Plum',        ro: 'Prună'        } },
  { id: 'apricot',         category: 'fruit',   emoji: '🍑', vegetarian: true, calories_per_100g: 48,  protein_per_100g: 1.4,  carbs_per_100g: 11,   fat_per_100g: 0.4, names: { hu: 'Sárgabarack',  en: 'Apricot',     ro: 'Caisă'        } },
  { id: 'melon',           category: 'fruit',   emoji: '🍈', vegetarian: true, calories_per_100g: 34,  protein_per_100g: 0.8,  carbs_per_100g: 8,    fat_per_100g: 0.2, names: { hu: 'Sárgadinnye',  en: 'Melon',       ro: 'Pepene galben'} },
  { id: 'fig',             category: 'fruit',   emoji: '🟤', vegetarian: true, calories_per_100g: 74,  protein_per_100g: 0.8,  carbs_per_100g: 19,   fat_per_100g: 0.3, names: { hu: 'Füge',         en: 'Fig',         ro: 'Smochină'     } },
  { id: 'pomegranate',     category: 'fruit',   emoji: '🔴', vegetarian: true, calories_per_100g: 83,  protein_per_100g: 1.7,  carbs_per_100g: 19,   fat_per_100g: 1.2, names: { hu: 'Gránátalma',   en: 'Pomegranate', ro: 'Rodie'        } },
  { id: 'blackberry',      category: 'fruit',   emoji: '🫐', vegetarian: true, calories_per_100g: 43,  protein_per_100g: 1.4,  carbs_per_100g: 10,   fat_per_100g: 0.5, names: { hu: 'Szeder',       en: 'Blackberry',  ro: 'Mure'         } },
  { id: 'sour_cherry',     category: 'fruit',   emoji: '🍒', vegetarian: true, calories_per_100g: 50,  protein_per_100g: 1,    carbs_per_100g: 12,   fat_per_100g: 0.3, names: { hu: 'Meggy',        en: 'Sour cherry', ro: 'Vișină'       } },
  { id: 'quince',          category: 'fruit',   emoji: '🍐', vegetarian: true, calories_per_100g: 57,  protein_per_100g: 0.4,  carbs_per_100g: 15,   fat_per_100g: 0.1, names: { hu: 'Birsalma',     en: 'Quince',      ro: 'Gutuie'       } },
  { id: 'dried_dates',     category: 'fruit',   emoji: '🟤', vegetarian: true, calories_per_100g: 277, protein_per_100g: 1.8,  carbs_per_100g: 75,   fat_per_100g: 0.2, names: { hu: 'Datolya',      en: 'Dates',       ro: 'Curmale'      } },
  { id: 'cranberry',       category: 'fruit',   emoji: '🔴', vegetarian: true, calories_per_100g: 46,  protein_per_100g: 0.4,  carbs_per_100g: 12,   fat_per_100g: 0.1, names: { hu: 'Tőzegáfonya',  en: 'Cranberry',   ro: 'Merișoare'    } },
];

const FOOD_CATEGORY_TABS = ['all', 'protein', 'carb', 'fat', 'dairy', 'vegetable', 'fruit'] as const;
type FoodTabType = typeof FOOD_CATEGORY_TABS[number];

// ─────────────────────────────────────────────────────────────────
// Curated alternative foods for allergen substitution
// Covers Romanian market: kecske/juh/bivaly dairy, plant milks, etc.
// ─────────────────────────────────────────────────────────────────

const CURATED_ALTERNATIVES: Record<string, SeedFood[]> = {
  kecske: [
    { id: 'goat_milk',       category: 'dairy', calories_per_100g: 69,  protein_per_100g: 3.6, carbs_per_100g: 4.4, fat_per_100g: 4.2, vegetarian: true, emoji: '🥛', names: { hu: 'Kecske tej',    en: 'Goat milk',        ro: 'Lapte de capră'    } },
    { id: 'goat_yogurt',     category: 'dairy', calories_per_100g: 59,  protein_per_100g: 3.8, carbs_per_100g: 4.1, fat_per_100g: 3.5, vegetarian: true, emoji: '🥛', names: { hu: 'Kecske joghurt', en: 'Goat yogurt',      ro: 'Iaurt de capră'    } },
    { id: 'goat_cheese',     category: 'dairy', calories_per_100g: 364, protein_per_100g: 22,  carbs_per_100g: 2,   fat_per_100g: 30,  vegetarian: true, emoji: '🧀', names: { hu: 'Kecske sajt',   en: 'Goat cheese',      ro: 'Brânză de capră'   } },
    { id: 'goat_cottage',    category: 'dairy', calories_per_100g: 105, protein_per_100g: 11,  carbs_per_100g: 3,   fat_per_100g: 5.5, vegetarian: true, emoji: '🧀', names: { hu: 'Kecske túró',   en: 'Goat cottage',     ro: 'Brânză proaspătă'  } },
    { id: 'goat_sour_cream', category: 'dairy', calories_per_100g: 198, protein_per_100g: 2.7, carbs_per_100g: 3.2, fat_per_100g: 20,  vegetarian: true, emoji: '🥛', names: { hu: 'Kecske tejföl', en: 'Goat sour cream',  ro: 'Smântână de capră' } },
    { id: 'goat_kefir',      category: 'dairy', calories_per_100g: 65,  protein_per_100g: 3.5, carbs_per_100g: 4.3, fat_per_100g: 3.8, vegetarian: true, emoji: '🥛', names: { hu: 'Kecske kefir',  en: 'Goat kefir',       ro: 'Chefir de capră'   } },
    { id: 'goat_butter',     category: 'dairy', calories_per_100g: 717, protein_per_100g: 0.9, carbs_per_100g: 0.1, fat_per_100g: 81,  vegetarian: true, emoji: '🧈', names: { hu: 'Kecske vaj',    en: 'Goat butter',      ro: 'Unt de capră'      } },
  ],
  juh: [
    { id: 'sheep_milk',      category: 'dairy', calories_per_100g: 108, protein_per_100g: 5.4, carbs_per_100g: 5.1, fat_per_100g: 7,   vegetarian: true, emoji: '🥛', names: { hu: 'Juh tej',            en: 'Sheep milk',    ro: 'Lapte de oaie'   } },
    { id: 'sheep_yogurt',    category: 'dairy', calories_per_100g: 103, protein_per_100g: 5.5, carbs_per_100g: 5.1, fat_per_100g: 6.5, vegetarian: true, emoji: '🥛', names: { hu: 'Juh joghurt',        en: 'Sheep yogurt',  ro: 'Iaurt de oaie'   } },
    { id: 'telemea',         category: 'dairy', calories_per_100g: 300, protein_per_100g: 18,  carbs_per_100g: 2,   fat_per_100g: 25,  vegetarian: true, emoji: '🧀', names: { hu: 'Telemea (juh sajt)', en: 'Telemea cheese', ro: 'Telemea'         } },
    { id: 'urda',            category: 'dairy', calories_per_100g: 150, protein_per_100g: 12,  carbs_per_100g: 3,   fat_per_100g: 10,  vegetarian: true, emoji: '🧀', names: { hu: 'Urdă (juh túró)',   en: 'Urdă cheese',   ro: 'Urdă'            } },
    { id: 'sheep_sour_cream',category: 'dairy', calories_per_100g: 202, protein_per_100g: 3.2, carbs_per_100g: 4,   fat_per_100g: 20,  vegetarian: true, emoji: '🥛', names: { hu: 'Juh tejföl',        en: 'Sheep sour cream', ro: 'Smântână de oaie'} },
    { id: 'sheep_kefir',     category: 'dairy', calories_per_100g: 103, protein_per_100g: 5.2, carbs_per_100g: 4.8, fat_per_100g: 6.2, vegetarian: true, emoji: '🥛', names: { hu: 'Juh kefir',         en: 'Sheep kefir',   ro: 'Chefir de oaie'  } },
    { id: 'sheep_butter',    category: 'dairy', calories_per_100g: 740, protein_per_100g: 1,   carbs_per_100g: 0.1, fat_per_100g: 83,  vegetarian: true, emoji: '🧈', names: { hu: 'Juh vaj',           en: 'Sheep butter',  ro: 'Unt de oaie'     } },
    { id: 'branza_burduf',   category: 'dairy', calories_per_100g: 330, protein_per_100g: 20,  carbs_per_100g: 2,   fat_per_100g: 28,  vegetarian: true, emoji: '🧀', names: { hu: 'Brânză de burduf',  en: 'Brânză de burduf', ro: 'Brânză de burduf'} },
  ],
  bivaly: [
    { id: 'buffalo_mozzarella', category: 'dairy', calories_per_100g: 253, protein_per_100g: 19,  carbs_per_100g: 2,   fat_per_100g: 19,  vegetarian: true, emoji: '🧀', names: { hu: 'Bivaly mozzarella', en: 'Buffalo mozzarella', ro: 'Mozzarella de bivoliță' } },
    { id: 'buffalo_milk',       category: 'dairy', calories_per_100g: 117, protein_per_100g: 4.5, carbs_per_100g: 5,   fat_per_100g: 8,   vegetarian: true, emoji: '🥛', names: { hu: 'Bivaly tej',        en: 'Buffalo milk',       ro: 'Lapte de bivoliță'     } },
    { id: 'buffalo_yogurt',     category: 'dairy', calories_per_100g: 125, protein_per_100g: 5,   carbs_per_100g: 5,   fat_per_100g: 9,   vegetarian: true, emoji: '🥛', names: { hu: 'Bivaly joghurt',    en: 'Buffalo yogurt',     ro: 'Iaurt de bivoliță'     } },
    { id: 'buffalo_cottage',    category: 'dairy', calories_per_100g: 140, protein_per_100g: 11,  carbs_per_100g: 3,   fat_per_100g: 9,   vegetarian: true, emoji: '🧀', names: { hu: 'Bivaly túró',       en: 'Buffalo cottage',    ro: 'Brânză proaspătă bivol'} },
    { id: 'buffalo_kefir',      category: 'dairy', calories_per_100g: 117, protein_per_100g: 4.8, carbs_per_100g: 4.9, fat_per_100g: 7.5, vegetarian: true, emoji: '🥛', names: { hu: 'Bivaly kefir',      en: 'Buffalo kefir',      ro: 'Chefir de bivoliță'    } },
  ],
  'mandula tej': [
    { id: 'almond_milk',    category: 'dairy', calories_per_100g: 24,  protein_per_100g: 0.9, carbs_per_100g: 3.1, fat_per_100g: 1.1, vegetarian: true, emoji: '🥛', names: { hu: 'Mandula tej (natúr)', en: 'Almond milk',    ro: 'Lapte de migdale'   } },
    { id: 'almond_yogurt',  category: 'dairy', calories_per_100g: 56,  protein_per_100g: 1.2, carbs_per_100g: 7,   fat_per_100g: 2.5, vegetarian: true, emoji: '🥛', names: { hu: 'Mandula joghurt',    en: 'Almond yogurt',  ro: 'Iaurt de migdale'   } },
  ],
  mandula: [
    { id: 'almond_milk',    category: 'dairy', calories_per_100g: 24,  protein_per_100g: 0.9, carbs_per_100g: 3.1, fat_per_100g: 1.1, vegetarian: true, emoji: '🥛', names: { hu: 'Mandula tej (natúr)', en: 'Almond milk',    ro: 'Lapte de migdale'   } },
    { id: 'almond_yogurt',  category: 'dairy', calories_per_100g: 56,  protein_per_100g: 1.2, carbs_per_100g: 7,   fat_per_100g: 2.5, vegetarian: true, emoji: '🥛', names: { hu: 'Mandula joghurt',    en: 'Almond yogurt',  ro: 'Iaurt de migdale'   } },
    { id: 'almond_cream',   category: 'fat',   calories_per_100g: 180, protein_per_100g: 1.5, carbs_per_100g: 4,   fat_per_100g: 18,  vegetarian: true, emoji: '🥛', names: { hu: 'Mandula tejszín',    en: 'Almond cream',   ro: 'Frișcă de migdale'  } },
  ],
  'zab tej': [
    { id: 'oat_milk',       category: 'dairy', calories_per_100g: 47,  protein_per_100g: 1,   carbs_per_100g: 6.6, fat_per_100g: 1.5, vegetarian: true, emoji: '🥛', names: { hu: 'Zab tej', en: 'Oat milk', ro: 'Lapte de ovăz' } },
  ],
  zab: [
    { id: 'oat_milk',       category: 'dairy', calories_per_100g: 47,  protein_per_100g: 1,   carbs_per_100g: 6.6, fat_per_100g: 1.5, vegetarian: true, emoji: '🥛', names: { hu: 'Zab tej', en: 'Oat milk', ro: 'Lapte de ovăz' } },
  ],
  'kókusz tej': [
    { id: 'coconut_milk',   category: 'fat',   calories_per_100g: 197, protein_per_100g: 2,   carbs_per_100g: 2.8, fat_per_100g: 21,  vegetarian: true, emoji: '🥥', names: { hu: 'Kókusz tej', en: 'Coconut milk', ro: 'Lapte de cocos' } },
  ],
  kókusz: [
    { id: 'coconut_milk',    category: 'fat',   calories_per_100g: 197, protein_per_100g: 2,   carbs_per_100g: 2.8, fat_per_100g: 21,  vegetarian: true, emoji: '🥥', names: { hu: 'Kókusz tej',     en: 'Coconut milk',   ro: 'Lapte de cocos'    } },
    { id: 'coconut_yogurt',  category: 'dairy', calories_per_100g: 88,  protein_per_100g: 0.7, carbs_per_100g: 7,   fat_per_100g: 6.2, vegetarian: true, emoji: '🥛', names: { hu: 'Kókusz joghurt', en: 'Coconut yogurt', ro: 'Iaurt de cocos'    } },
    { id: 'coconut_cream',   category: 'fat',   calories_per_100g: 330, protein_per_100g: 3.5, carbs_per_100g: 6,   fat_per_100g: 34,  vegetarian: true, emoji: '🥥', names: { hu: 'Kókusz tejszín', en: 'Coconut cream',  ro: 'Frișcă de cocos'   } },
  ],
  'rizs tej': [
    { id: 'rice_milk',      category: 'dairy', calories_per_100g: 47,  protein_per_100g: 0.3, carbs_per_100g: 9.2, fat_per_100g: 1,   vegetarian: true, emoji: '🥛', names: { hu: 'Rizs tej', en: 'Rice milk', ro: 'Lapte de orez' } },
  ],
  rizs: [
    { id: 'rice_milk',      category: 'dairy', calories_per_100g: 47,  protein_per_100g: 0.3, carbs_per_100g: 9.2, fat_per_100g: 1,   vegetarian: true, emoji: '🥛', names: { hu: 'Rizs tej', en: 'Rice milk', ro: 'Lapte de orez' } },
  ],
  'szója tej': [
    { id: 'soy_milk',       category: 'dairy', calories_per_100g: 33,  protein_per_100g: 2.9, carbs_per_100g: 1.7, fat_per_100g: 1.8, vegetarian: true, emoji: '🥛', names: { hu: 'Szója tej',     en: 'Soy milk',    ro: 'Lapte de soia'  } },
    { id: 'soy_yogurt',     category: 'dairy', calories_per_100g: 65,  protein_per_100g: 3.8, carbs_per_100g: 5.4, fat_per_100g: 2,   vegetarian: true, emoji: '🥛', names: { hu: 'Szója joghurt', en: 'Soy yogurt',  ro: 'Iaurt de soia'  } },
  ],
};

// ─────────────────────────────────────────────────────────────────
// Curated alternative picker options per allergen
// Keys that start with uppercase match SEED_FOOD names directly.
// Lowercase keys map to CURATED_ALTERNATIVES entries.
// ─────────────────────────────────────────────────────────────────
const ALLERGEN_ALTERNATIVES: Record<string, Array<{ key: string; names: { hu: string; en: string; ro: string }; emoji: string }>> = {
  lactose: [
    { key: 'kecske',      emoji: '🐐', names: { hu: 'Kecske termékek', en: 'Goat products',   ro: 'Produse caprine'  } },
    { key: 'juh',         emoji: '🐑', names: { hu: 'Juh termékek',    en: 'Sheep products',  ro: 'Produse de oaie'  } },
    { key: 'bivaly',      emoji: '🐃', names: { hu: 'Bivaly termékek', en: 'Buffalo products', ro: 'Produse de bivol' } },
    { key: 'mandula_tej', emoji: '🥛', names: { hu: 'Mandula ital',    en: 'Almond milk',     ro: 'Lapte de migdale' } },
    { key: 'zab_tej',     emoji: '🌾', names: { hu: 'Zab ital',        en: 'Oat milk',        ro: 'Lapte de ovăz'   } },
    { key: 'kokusz',      emoji: '🥥', names: { hu: 'Kókusz ital',     en: 'Coconut milk',    ro: 'Lapte de cocos'  } },
    { key: 'rizs_tej',    emoji: '🍚', names: { hu: 'Rizs ital',       en: 'Rice milk',       ro: 'Lapte de orez'   } },
    { key: 'szoja_tej',   emoji: '🫘', names: { hu: 'Szója ital',      en: 'Soy milk',        ro: 'Lapte de soia'   } },
  ],
  gluten: [
    { key: 'rizs',          emoji: '🍚', names: { hu: 'Rizs',          en: 'Rice',            ro: 'Orez'            } },
    { key: 'barna_rizs',    emoji: '🍚', names: { hu: 'Barna rizs',    en: 'Brown rice',      ro: 'Orez brun'       } },
    { key: 'kukorica',      emoji: '🌽', names: { hu: 'Kukorica',      en: 'Corn',            ro: 'Porumb'          } },
    { key: 'hajdina',       emoji: '🌾', names: { hu: 'Hajdina',       en: 'Buckwheat',       ro: 'Hrișcă'          } },
    { key: 'quinoa',        emoji: '🌾', names: { hu: 'Quinoa',        en: 'Quinoa',          ro: 'Quinoa'          } },
    { key: 'burgonya',      emoji: '🥔', names: { hu: 'Burgonya',      en: 'Potato',          ro: 'Cartofi'         } },
    { key: 'edesburgonya',  emoji: '🍠', names: { hu: 'Édesburgonya',  en: 'Sweet potato',    ro: 'Cartofi dulci'   } },
  ],
  egg: [
    { key: 'chia',    emoji: '🌱', names: { hu: 'Chia mag', en: 'Chia seeds', ro: 'Semințe de chia' } },
    { key: 'lenmag',  emoji: '🌱', names: { hu: 'Lenmag',   en: 'Flaxseed',   ro: 'Semințe de in'   } },
    { key: 'tofu',    emoji: '🫘', names: { hu: 'Tofu',     en: 'Tofu',       ro: 'Tofu'            } },
    { key: 'banan',   emoji: '🍌', names: { hu: 'Banán',    en: 'Banana',     ro: 'Banană'          } },
    { key: 'avokado', emoji: '🥑', names: { hu: 'Avokádó',  en: 'Avocado',    ro: 'Avocado'         } },
  ],
  fish: [
    { key: 'csirkemell',    emoji: '🍗', names: { hu: 'Csirkemell',    en: 'Chicken breast', ro: 'Piept de pui'    } },
    { key: 'pulykamell',    emoji: '🦃', names: { hu: 'Pulykamell',    en: 'Turkey breast',  ro: 'Piept de curcan' } },
    { key: 'lencse',        emoji: '🫘', names: { hu: 'Lencse',        en: 'Lentils',        ro: 'Linte'           } },
    { key: 'csicseriborsó', emoji: '🫘', names: { hu: 'Csicseriborsó', en: 'Chickpeas',      ro: 'Năut'            } },
    { key: 'tofu',          emoji: '🫘', names: { hu: 'Tofu',          en: 'Tofu',           ro: 'Tofu'            } },
    { key: 'tempeh',        emoji: '🫘', names: { hu: 'Tempeh',        en: 'Tempeh',         ro: 'Tempeh'          } },
  ],
  nuts: [
    { key: 'tokmag',    emoji: '🌱', names: { hu: 'Tökmag',    en: 'Pumpkin seeds', ro: 'Semințe de dovleac' } },
    { key: 'chiamag',   emoji: '🌱', names: { hu: 'Chia mag',  en: 'Chia seeds',    ro: 'Semințe de chia'    } },
    { key: 'lenmag',    emoji: '🌱', names: { hu: 'Lenmag',    en: 'Flaxseed',      ro: 'Semințe de in'      } },
    { key: 'avokado',   emoji: '🥑', names: { hu: 'Avokádó',   en: 'Avocado',       ro: 'Avocado'            } },
    { key: 'olivaolaj', emoji: '🫒', names: { hu: 'Olívaolaj', en: 'Olive oil',     ro: 'Ulei de măsline'    } },
  ],
  soy: [
    { key: 'csicseriborsó', emoji: '🫘', names: { hu: 'Csicseriborsó', en: 'Chickpeas',     ro: 'Năut'            } },
    { key: 'lencse',        emoji: '🫘', names: { hu: 'Lencse',        en: 'Lentils',       ro: 'Linte'           } },
    { key: 'fekete_bab',    emoji: '🫘', names: { hu: 'Fekete bab',    en: 'Black beans',   ro: 'Fasole neagră'   } },
    { key: 'feher_bab',     emoji: '🫘', names: { hu: 'Fehér bab',     en: 'White beans',   ro: 'Fasole albă'     } },
    { key: 'kokusz_aminos', emoji: '🥥', names: { hu: 'Kókusz aminos', en: 'Coconut aminos', ro: 'Aminoacizi cocos'} },
  ],
  shellfish: [
    { key: 'csirkemell', emoji: '🍗', names: { hu: 'Csirkemell', en: 'Chicken breast', ro: 'Piept de pui' } },
    { key: 'lazac',      emoji: '🐟', names: { hu: 'Lazac',      en: 'Salmon',         ro: 'Somon'        } },
    { key: 'tonhal',     emoji: '🐠', names: { hu: 'Tonhal',     en: 'Tuna',           ro: 'Ton'          } },
    { key: 'lencse',     emoji: '🫘', names: { hu: 'Lencse',     en: 'Lentils',        ro: 'Linte'        } },
    { key: 'tofu',       emoji: '🫘', names: { hu: 'Tofu',       en: 'Tofu',           ro: 'Tofu'         } },
  ],
};

// ─────────────────────────────────────────────────────────────────
// Calorie calculations
// ─────────────────────────────────────────────────────────────────

function calcBMR(gender: Gender, weight: number, height: number, age: number): number {
  if (gender === 'male') return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

function calcTDEE(bmr: number, activity: ActivityLevel): number {
  const mult: Record<ActivityLevel, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
  return bmr * mult[activity];
}

function calcTarget(tdee: number, goal: Goal): number {
  if (goal === 'lose') return Math.round(tdee - 300);
  if (goal === 'gain') return Math.round(tdee + 300);
  return Math.round(tdee);
}

function calcWater(weight: number, sports: SportEntry[]): number {
  const base = weight * 0.033;
  const sportExtra = sports.reduce((sum, s) => sum + (s.days.length / 7) * (s.minutes / 60) * 0.5, 0);
  return Math.round((base + sportExtra) * 10) / 10;
}

// ─────────────────────────────────────────────────────────────────
// Slide variants
// ─────────────────────────────────────────────────────────────────

const slideVariants = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 60 }),
  animate: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -60, transition: { duration: 0.18 } }),
};

// ─────────────────────────────────────────────────────────────────
// Sport options
// ─────────────────────────────────────────────────────────────────

const LEGACY_FOODS_STEP = 99;
const GENERATING_STEP = 98;

interface SportDef { id: string; emoji: string; names: { hu: string; en: string; ro: string } }
interface SportCategory { key: string; sports: SportDef[] }

const SPORT_CATEGORIES: SportCategory[] = [
  {
    key: 'cardio',
    sports: [
      { id: 'running',  emoji: '🏃', names: { hu: 'Futás',        en: 'Running',   ro: 'Alergare'    } },
      { id: 'cycling',  emoji: '🚴', names: { hu: 'Kerékpározás', en: 'Cycling',   ro: 'Ciclism'     } },
      { id: 'swimming', emoji: '🏊', names: { hu: 'Úszás',        en: 'Swimming',  ro: 'Înot'        } },
      { id: 'walking',  emoji: '🚶', names: { hu: 'Gyaloglás',    en: 'Walking',   ro: 'Mers pe jos' } },
      { id: 'rowing',   emoji: '🚣', names: { hu: 'Evezés',       en: 'Rowing',    ro: 'Canotaj'     } },
      { id: 'jumprope', emoji: '🪢', names: { hu: 'Ugrókötél',    en: 'Jump rope', ro: 'Săritură'    } },
    ],
  },
  {
    key: 'strength',
    sports: [
      { id: 'gym',          emoji: '🏋️', names: { hu: 'Edzőterem',    en: 'Gym',          ro: 'Sală'         } },
      { id: 'crossfit',     emoji: '💥',  names: { hu: 'CrossFit',     en: 'CrossFit',     ro: 'CrossFit'     } },
      { id: 'calisthenics', emoji: '🤸',  names: { hu: 'Calisthenics', en: 'Calisthenics', ro: 'Calisthenics' } },
      { id: 'weightlifting',emoji: '🏋️', names: { hu: 'Súlyemelés',   en: 'Weightlifting',ro: 'Haltere'      } },
    ],
  },
  {
    key: 'team',
    sports: [
      { id: 'football',   emoji: '⚽', names: { hu: 'Futball',    en: 'Football',   ro: 'Fotbal'  } },
      { id: 'basketball', emoji: '🏀', names: { hu: 'Kosárlabda', en: 'Basketball', ro: 'Baschet' } },
      { id: 'tennis',     emoji: '🎾', names: { hu: 'Tenisz',     en: 'Tennis',     ro: 'Tenis'   } },
      { id: 'volleyball', emoji: '🏐', names: { hu: 'Röplabda',   en: 'Volleyball', ro: 'Volei'   } },
      { id: 'squash',     emoji: '🎱', names: { hu: 'Squash',     en: 'Squash',     ro: 'Squash'  } },
    ],
  },
  {
    key: 'mindfulness',
    sports: [
      { id: 'yoga',       emoji: '🧘', names: { hu: 'Jóga',      en: 'Yoga',       ro: 'Yoga'      } },
      { id: 'pilates',    emoji: '🤸', names: { hu: 'Pilates',   en: 'Pilates',    ro: 'Pilates'   } },
      { id: 'meditation', emoji: '🙏', names: { hu: 'Meditáció', en: 'Meditation', ro: 'Meditație' } },
    ],
  },
  {
    key: 'other',
    sports: [
      { id: 'other', emoji: '💪', names: { hu: 'Más', en: 'Other', ro: 'Altele' } },
    ],
  },
];

// Flat lookup: sportId → SportDef
const SPORT_BY_ID: Record<string, SportDef> = Object.fromEntries(
  SPORT_CATEGORIES.flatMap(c => c.sports.map(s => [s.id, s]))
);

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────

export function ProfileSetupWizard() {
  const navigate = useNavigate();
  const { setHasPlanSetup, setHasCompletedFullFlow, user } = useAuth();
  const { t, language } = useLanguage();

  const STEPS = [
    t('wizard.personal.title'),
    t('wizard.foodStyle.title'),
    t('wizard.meals.title'),
    t('wizard.sport.title'),
    t('wizard.sleep.title'),
  ];

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Nearby stores (geolocation + Google Places)
  const geo = useGeolocation();
  const { stores: nearbyStores, getStoresForFood } = useNearbyStores(geo.latitude, geo.longitude);

  // PDF upload state (dietician plan)
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  // Step 1: Personal
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState(28);
  const [weight, setWeight] = useState(75);
  const [height, setHeight] = useState(175);
  const [goal, setGoal] = useState<Goal>('maintain');

  // Step 1: Food Style
  const [selectedStyles, setSelectedStyles] = useState<FoodStyle[]>([]);
  const [usedLegacyFoodPicker, setUsedLegacyFoodPicker] = useState(false);

  // Step 2: Foods
  const [dietType, setDietType] = useState<DietType>('omnivore');
  const [foodTab, setFoodTab] = useState<FoodTabType>('all');
  const [foodSearch, setFoodSearch] = useState('');
  const [extraFoods, setExtraFoods] = useState<SeedFood[]>([]);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'results' | 'not_found'>('idle');
  const [lookupResults, setLookupResults] = useState<ProductResult[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set());
  const [activeAllergens, setActiveAllergens] = useState<Set<string>>(new Set());
  const [selectedAlternativeKeys, setSelectedAlternativeKeys] = useState<Set<string>>(new Set());

  // Step 3: Meals
  const [mealCount, setMealCount] = useState(3);
  const [mealModel, setMealModel] = useState<string | undefined>(undefined);

  // Step 4: Sport
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [sports, setSports] = useState<SportEntry[]>([]);
  const [showSportPicker, setShowSportPicker] = useState(false);

  // Step 5: Sleep
  const [wakeTime, setWakeTime] = useState('07:00');
  const [selectedCycles, setSelectedCycles] = useState(5);

  // ── Food toggle ──────────────────────────────────────────────

  const toggleFood = (id: string) => {
    setSelectedFoods(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllergen = (allergen: string) => {
    setActiveAllergens(prev => {
      const next = new Set(prev);
      if (next.has(allergen)) next.delete(allergen);
      else next.add(allergen);
      return next;
    });
  };

  const processAlternatives = useCallback((keys: Set<string>) => {
    const knownIds = new Set([...SEED_FOODS.map(f => f.id), ...extraFoods.map(f => f.id)]);
    const newFoods: SeedFood[] = [];

    keys.forEach(key => {
      // Uppercase key = matches a SEED_FOOD name directly → food already exists, no action needed
      if (key[0] === key[0].toUpperCase() && key[0] !== key[0].toLowerCase()) {
        return;
      }

      // Lowercase key = look up in CURATED_ALTERNATIVES
      const curated = CURATED_ALTERNATIVES[key] ?? [];
      curated.forEach(food => {
        if (!knownIds.has(food.id)) {
          newFoods.push(food);
          knownIds.add(food.id);
        }
      });
    });

    if (newFoods.length > 0) {
      setExtraFoods(prev => [...prev, ...newFoods]);
    }
  }, [extraFoods]);

  // ── Navigation ──────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (step === LEGACY_FOODS_STEP) {
      // Exit from legacy food picker back to main flow
      setDirection(1);
      setStep(2);
      return;
    }
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep(s => s + 1);
    }
  }, [step, STEPS.length]);

  const goPrev = useCallback(() => {
    if (step === LEGACY_FOODS_STEP) {
      // Back from legacy food picker goes to step 1 (food style)
      setDirection(-1);
      setStep(1);
      return;
    }
    if (step > 0) {
      setDirection(-1);
      setStep(s => s - 1);
    }
  }, [step]);

  // ── Derived calorie values ───────────────────────────────────

  const bmr = calcBMR(gender, weight, height, age);
  const tdee = calcTDEE(bmr, activity);
  const dailyTarget = calcTarget(tdee, goal);
  const waterLiters = calcWater(weight, sports);
  const bedtimeOptions = SleepService.getBedtimeOptions(wakeTime);
  const bedtime = bedtimeOptions.find(o => o.cycleCount === selectedCycles)?.bedtime ?? '23:00';
  const sleepDuration = bedtimeOptions.find(o => o.cycleCount === selectedCycles)?.sleepDuration ?? '7h 30p';

  const allFoods = [...SEED_FOODS, ...extraFoods];

  const visibleFoods = allFoods.filter(f => {
    if (selectedStyles.includes('plant') && selectedStyles.length === 1 && !f.vegetarian) return false;
    if (foodTab !== 'all' && f.category !== foodTab) return false;
    if (foodSearch) {
      const q = foodSearch.toLowerCase();
      const nameMatch = Object.values(f.names).some(n => n.toLowerCase().includes(q));
      if (!nameMatch) return false;
    }
    if (activeAllergens.size > 0 && f.allergens) {
      if (f.allergens.some(a => activeAllergens.has(a))) return false;
    }
    return true;
  });

  const selectAllVisible = () => {
    setSelectedFoods(prev => {
      const next = new Set(prev);
      visibleFoods.forEach(f => next.add(f.id));
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedFoods(new Set());
  };

  // ── Store product lookup (Open Food Facts) ──────────────────

  const handleLookupFood = useCallback(async (query: string) => {
    const name = query.trim();
    if (!name) return;
    setLookupStatus('loading');
    setLookupResults([]);
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&fields=product_name,product_name_hu,nutriments,stores_tags&page_size=6&lc=hu`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('fetch error');
      const data = await resp.json();
      const results: ProductResult[] = (data.products ?? [])
        .filter((p: any) => {
          const n = p.nutriments;
          return n && (n['energy-kcal_100g'] || n['energy-kcal']) && (p.product_name_hu || p.product_name);
        })
        .map((p: any) => {
          const n = p.nutriments;
          const kcal = Math.round(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0);
          const protein = +(n['proteins_100g'] ?? n['proteins'] ?? 0).toFixed(1);
          const carbs = +(n['carbohydrates_100g'] ?? n['carbohydrates'] ?? 0).toFixed(1);
          const fat = +(n['fat_100g'] ?? n['fat'] ?? 0).toFixed(1);
          const stores: string[] = (p.stores_tags ?? [])
            .map((s: string) => STORE_LABELS[s.replace('en:', '')] ?? null)
            .filter(Boolean)
            .slice(0, 3);
          return {
            name: (p.product_name_hu || p.product_name || name).slice(0, 40),
            calories: kcal,
            protein,
            carbs,
            fat,
            stores,
          } satisfies ProductResult;
        })
        .slice(0, 5);

      if (results.length > 0) {
        setLookupResults(results);
        setLookupStatus('results');
      } else {
        setLookupStatus('not_found');
        setTimeout(() => setLookupStatus('idle'), 2500);
      }
    } catch {
      setLookupStatus('not_found');
      setTimeout(() => setLookupStatus('idle'), 2500);
    }
  }, []);

  const addLookupResult = useCallback((result: ProductResult) => {
    const foodId = `lookup_${Date.now()}`;
    const newFood: SeedFood = {
      id: foodId,
      names: { hu: result.name, en: result.name, ro: result.name },
      category: guessCategory(result.protein, result.carbs, result.fat),
      calories_per_100g: result.calories,
      protein_per_100g: result.protein,
      carbs_per_100g: result.carbs,
      fat_per_100g: result.fat,
      vegetarian: true,
      emoji: '🛒',
    };
    setExtraFoods(prev => [...prev, newFood]);
    setSelectedFoods(prev => new Set([...prev, newFood.id]));
    setFoodSearch('');
    setLookupResults([]);
    setLookupStatus('idle');
  }, []);

  // ── Sport helpers ────────────────────────────────────────────

  const addSport = (sportId: string) => {
    if (sports.some(s => s.sportId === sportId)) return; // prevent duplicates
    setSports(prev => [...prev, { id: crypto.randomUUID(), sportId, days: [], minutes: 45 }]);
    setShowSportPicker(false);
  };

  const removeSport = (id: string) => setSports(prev => prev.filter(s => s.id !== id));

  const updateSport = (id: string, patch: Partial<SportEntry>) => {
    setSports(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const toggleSportDay = (id: string, dayIdx: number) => {
    setSports(prev => prev.map(s =>
      s.id === id
        ? { ...s, days: s.days.includes(dayIdx) ? s.days.filter(d => d !== dayIdx) : [...s.days, dayIdx] }
        : s
    ));
  };

  // ── Final submit ─────────────────────────────────────────────

  const handleGenerate = async () => {
    // Usage limit check (free tier: 5 generations/day)
    if (user?.id && user.provider !== 'local' && user.provider !== 'demo') {
      const usage = await canGenerate(user.id, user.email);
      if (!usage.allowed) {
        alert(`Ma már felhasználtad a napi ${5} ingyenes generálást.\nPróbáld holnap újra, vagy válts Pro-ra.`);
        return;
      }
    }

    setIsGenerating(true);
    setStep(GENERATING_STEP); // Switch to full-screen loading animation
    try {
      const mealModelMap: Record<number, string> = { 2: '2meals', 4: '4meals', 5: '5meals' };
      const effectiveMealModel = mealModel ?? mealModelMap[mealCount]; // IF model takes priority

      // 1. Save profile
      const mealSettings = getDefaultMealSettings();
      mealSettings.mealCount = mealCount;

      const VALID_MODELS: MealModel[] = ['3meals', '5meals', '2meals', 'if16_8', 'if18_6'];
      const resolvedModel = (effectiveMealModel && VALID_MODELS.includes(effectiveMealModel as MealModel))
        ? effectiveMealModel as MealModel
        : undefined;
      if (resolvedModel) mealSettings.mealModel = resolvedModel;
      mealSettings.meals = resolvedModel
        ? getDefaultMealsForModel(resolvedModel)
        : getDefaultMealsForCount(mealCount);

      await saveUserProfile({
        name: user?.name ?? '',
        gender,
        age,
        weight,
        height,
        goal,
        activityLevel: activity,
        calorieTarget: dailyTarget,
        waterGoalMl: Math.round(waterLiters * 1000),
        wakeTime,
        bedtime,
        sleepCycles: selectedCycles,
        dietaryPreferences: (selectedStyles.includes('plant') && selectedStyles.length === 1) ? 'vegetarian' : 'omnivore',
        mealSettings,
      });

      await saveMealSettings(mealSettings);

      // 2. Save selected foods to catalog (SEED_FOODS + any AI-looked-up extra foods)
      // Use manual food selection if user went through legacy picker; otherwise auto-build from styles
      const effectiveSelectedFoods: Set<string> = usedLegacyFoodPicker || selectedFoods.size > 0
        ? selectedFoods
        : buildIngredientSelection(
            selectedStyles,
            Array.from(activeAllergens),
            Array.from(selectedAlternativeKeys)
          );
      const allKnownFoods = [...SEED_FOODS, ...extraFoods];
      const foodsToSave: CreateFoodInput[] = allKnownFoods
        .filter(f => effectiveSelectedFoods.has(f.id))
        .map(f => ({
          name: f.names.en,
          description: '',
          category: mapCategory(f.category) as any,
          calories_per_100g: f.calories_per_100g,
          protein_per_100g: f.protein_per_100g,
          carbs_per_100g: f.carbs_per_100g,
          fat_per_100g: f.fat_per_100g,
          source: 'user_uploaded' as any,
        }));
      await createFoodsBatch(foodsToSave, { upsertSource: true });

      // 3. Generate meal plan (non-blocking — failure is OK)
      try {
        const ingredients = allKnownFoods
          .filter(f => effectiveSelectedFoods.has(f.id))
          .map(f => ({
            name: f.names.en,
            calories_per_100g: f.calories_per_100g,
            protein_per_100g: f.protein_per_100g,
            carbs_per_100g: f.carbs_per_100g,
            fat_per_100g: f.fat_per_100g,
          }));

        const activeAllergenList = Array.from(activeAllergens).join(', ');

        // Load fasting settings if available
        let fastingPayload: { enabled: boolean; religion: string; customDays: number[] } | undefined;
        try {
          const { getFastingSettings } = await import('../../backend/services/FastingCalendarService');
          const fs = await getFastingSettings();
          if (fs.enabled) fastingPayload = fs;
        } catch {}

        const userProfilePayload = {
          goal,
          activityLevel: activity,
          age,
          weight,
          gender,
          dietaryPreferences: (selectedStyles.includes('plant') && selectedStyles.length === 1) ? 'vegetarian' : 'omnivore',
          allergies: activeAllergenList || undefined,
          mealCount,
          mealModel: effectiveMealModel,
          macroProteinPct: 30,
          macroCarbsPct: 40,
          macroFatPct: 30,
          likedFoods: [] as string[],
          dislikedFoods: [] as string[],
        };

        const trainingDayIndices = [...new Set(sports.flatMap(s => s.days))].sort();
        const wizardWeight = weight || 70;
        const wizardBurnPerDay: Record<number, number> = {};
        for (const s of sports) {
          const met = getMET(s.sportId);
          const kcal = Math.round(met * wizardWeight * (s.minutes / 60));
          for (const day of s.days) {
            wizardBurnPerDay[day] = (wizardBurnPerDay[day] ?? 0) + kcal;
          }
        }

        const abortCtrl = new AbortController();
        const timeoutId = setTimeout(() => abortCtrl.abort(), 90_000); // 90s max
        let resp: Response;
        try {
          resp = await authFetch(`${apiBase}/api/generate-meal-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortCtrl.signal,
            body: JSON.stringify({
              ingredients,
              dailyCalorieTarget: dailyTarget,
              days: 7,
              language,
              userId: user?.id,
              userProfile: userProfilePayload,
              trainingDays: trainingDayIndices,
              trainingCaloriesPerDay: wizardBurnPerDay,
              goal: goal === 'lose' ? 'loss' : goal === 'gain' ? 'gain' : 'maintain',
              fasting: fastingPayload,
            }),
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (resp.ok) {
          const data = await resp.json();
          if (data.nutritionPlan) {

            // Chef review with 15s timeout — skip if slow
            let improvedPlan = data.nutritionPlan;
            try {
              improvedPlan = await Promise.race([
                callChefReview({
                  nutritionPlan: data.nutritionPlan,
                  language,
                  userName: user?.name ?? '',
                  userProfile: userProfilePayload,
                }),
                new Promise<typeof data.nutritionPlan>((_, reject) =>
                  setTimeout(() => reject(new Error('chef-timeout')), 15000)
                ),
              ]);
            } catch {
              console.warn('[ProfileSetup] Chef review skipped (timeout or error)');
            }

            const { importFromAIParse, activatePlan, exportActivePlan } = await import('../../backend/services/NutritionPlanService');
            const label = `AI étrend — ${new Date().toLocaleDateString('hu-HU')}`;
            const plan = await importFromAIParse(improvedPlan as any, label);
            await activatePlan(plan.id);

            // Fire-and-forget cloud sync for cross-device access
            if (user?.id && user.provider !== 'local' && user.provider !== 'demo') {
              exportActivePlan().then(exported => {
                if (exported) {
                  import('../../services/userFirestoreService').then(({ syncPlanToCloud }) => {
                    syncPlanToCloud(user.id, exported).catch(() => {});
                  });
                }
              }).catch(() => {});
            }
          } else {
            console.warn('[ProfileSetup] API returned ok but no nutritionPlan key:', data);
          }
        } else {
          const errText = await resp.text().catch(() => '(unreadable)');
          console.warn('[ProfileSetup] API error', resp.status, errText.slice(0, 200));
        }
      } catch (planErr) {
        console.warn('[ProfileSetup] Plan generation failed, continuing anyway:', planErr);
      }

      // 4. Increment usage counter in Firestore
      if (user?.id && user.provider !== 'local' && user.provider !== 'demo') {
        incrementUsage(user.id).catch(() => {});
      }

      // 5. Save sport preferences + clear forceNoActivePlan so all tabs load
      if (sports.length > 0) {
        await setSetting('userSports', JSON.stringify(sports));
      }
      await setSetting('forceNoActivePlan', '0');

      // 6. Show 100% and navigate
      setGenProgress(100);
      setGenPhase(4);
      await new Promise(r => setTimeout(r, 500));
      setHasPlanSetup(true);
      setHasCompletedFullFlow(true);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('[ProfileSetup] Error:', err);
      setGenProgress(100);
      await new Promise(r => setTimeout(r, 800));
      await setSetting('forceNoActivePlan', '0').catch(() => {});
      setHasPlanSetup(true);
      setHasCompletedFullFlow(true);
      navigate('/', { replace: true });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  // ── Full-screen generating animation (step 99) ──────────────
  const [genProgress, setGenProgress] = useState(0);
  const [genPhase, setGenPhase] = useState(0);

  useEffect(() => {
    if (step !== 99) return;
    setGenProgress(0);
    setGenPhase(0);
    // Simulate progress across 5 phases: profile→macros→meals→chef→finishing
    const intervals: ReturnType<typeof setInterval>[] = [];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    // Phase 0 (0→25) — ~4s
    intervals.push(setInterval(() => setGenProgress(p => p < 25 ? p + 1 : p), 160));
    // Phase 1 (25→50) — starts at 4s
    timeouts.push(setTimeout(() => { setGenPhase(1); intervals.push(setInterval(() => setGenProgress(p => p < 50 ? p + 1 : p), 160)); }, 4000));
    // Phase 2 (50→75) — starts at 8s
    timeouts.push(setTimeout(() => { setGenPhase(2); intervals.push(setInterval(() => setGenProgress(p => p < 75 ? p + 1 : p), 160)); }, 8000));
    // Phase 3 (75→90) — starts at 12s
    timeouts.push(setTimeout(() => { setGenPhase(3); intervals.push(setInterval(() => setGenProgress(p => p < 90 ? p + 1 : p), 200)); }, 12000));
    // Phase 4 (90→95) — starts at 15s
    timeouts.push(setTimeout(() => { setGenPhase(4); intervals.push(setInterval(() => setGenProgress(p => p < 95 ? p + 1 : p), 400)); }, 15000));
    return () => { intervals.forEach(clearInterval); timeouts.forEach(clearTimeout); };
  }, [step]);

  if (step === GENERATING_STEP) {
    const WIZARD_PHASES = [
      { threshold: 0,  key: 'wizard.genPhase1' },
      { threshold: 12, key: 'wizard.genPhase2' },
      { threshold: 30, key: 'wizard.genPhase3' },
      { threshold: 55, key: 'wizard.genPhase4' },
      { threshold: 80, key: 'wizard.genPhase5' },
    ];
    return (
      <SharedPremiumLoader
        progress={genProgress}
        phaseText={getPhaseText(genProgress, WIZARD_PHASES, t)}
        subtext={t('wizard.genSubtext')}
        fullScreen={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar — back button only, no progress bar */}
      <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 0.5rem)" }}>
        {(step > 0 || step === LEGACY_FOODS_STEP) && (
          <button onClick={goPrev} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Step title — removed duplicate label, the step content has its own title */}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="px-6 pb-40"
          >
            {step === 0 && <StepPersonal gender={gender} setGender={setGender} age={age} setAge={setAge} weight={weight} setWeight={setWeight} height={height} setHeight={setHeight} goal={goal} setGoal={setGoal} />}
            {step === 1 && (
              <StepFoodStyle
                selectedStyles={selectedStyles}
                setSelectedStyles={setSelectedStyles}
                activeAllergens={activeAllergens}
                setActiveAllergens={setActiveAllergens}
                selectedAlternativeKeys={selectedAlternativeKeys}
                setSelectedAlternativeKeys={setSelectedAlternativeKeys}
                onDetailedSetup={() => setStep(LEGACY_FOODS_STEP)}
              />
            )}
            {step === 2 && <StepMeals mealCount={mealCount} setMealCount={setMealCount} mealModel={mealModel} setMealModel={setMealModel} />}
            {step === 3 && <StepSport activity={activity} setActivity={setActivity} sports={sports} addSport={addSport} removeSport={removeSport} updateSport={updateSport} toggleSportDay={toggleSportDay} showSportPicker={showSportPicker} setShowSportPicker={setShowSportPicker} weightKg={weight || 70} />}
            {step === 4 && <StepSleep wakeTime={wakeTime} setWakeTime={setWakeTime} selectedCycles={selectedCycles} setSelectedCycles={setSelectedCycles} bedtimeOptions={bedtimeOptions} />}
            {step === LEGACY_FOODS_STEP && (
              <div>
                <StepFoods
                  foodTab={foodTab} setFoodTab={setFoodTab}
                  foodSearch={foodSearch} setFoodSearch={setFoodSearch}
                  selectedFoods={selectedFoods} toggleFood={toggleFood}
                  visibleFoods={visibleFoods}
                  lookupStatus={lookupStatus} lookupResults={lookupResults}
                  onLookupFood={handleLookupFood} onAddResult={addLookupResult}
                  selectAllVisible={selectAllVisible} deselectAll={deselectAll}
                  getStoresForFood={getStoresForFood}
                />
                <div className="pb-40" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA — fixed with gradient fade */}
      {(
        <div className="fixed bottom-0 left-0 right-0 z-20" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
          <div className="px-6 pt-8" style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.98) 65%, transparent)' }}>
            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 mb-3">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === step ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>
            {step < STEPS.length - 1 || step === LEGACY_FOODS_STEP ? (
              <>
                <DSMButton
                  onClick={goNext}
                  disabled={step === 1 && selectedStyles.length < 1}
                  variant="primary"
                  className="w-full h-14 rounded-2xl gap-2 text-base"
                >
                  {step === 1 && selectedStyles.length < 1
                    ? t('wizard.foodStyle.ctaDisabled')
                    : <>{t('wizard.next')} <ChevronRight className="w-5 h-5" /></>
                  }
                </DSMButton>
                {/* Upload own plan option — show on food style step */}
                {step === 1 && (
                  <button
                    onClick={() => setShowUploadSheet(true)}
                    className="w-full text-center text-sm text-gray-500 mt-2 py-2"
                  >
                    {t('wizard.uploadOwnPlan') || 'Van már étrendem →'}
                  </button>
                )}
              </>
            ) : (
              <DSMButton
                onClick={handleGenerate}
                disabled={isGenerating}
                variant="primary"
                className="w-full h-14 rounded-2xl gap-2 text-base"
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {t('wizard.generating')}</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> {t('wizard.generate')}</>
                )}
              </DSMButton>
            )}
          </div>
        </div>
      )}

      {/* DataUploadSheet — dietician plan upload */}
      <DataUploadSheet
        open={showUploadSheet}
        onClose={() => setShowUploadSheet(false)}
        onComplete={async () => {
          // Dietician plan uploaded successfully — save basic profile and skip AI generation
          setShowUploadSheet(false);

          // Save profile with current wizard values (even partial)
          const mealSettings = getDefaultMealSettings();
          mealSettings.mealCount = mealCount;
          await saveUserProfile({
            name: user?.name ?? '',
            gender,
            age,
            weight,
            height,
            goal,
            activityLevel: activity,
            calorieTarget: dailyTarget,
            waterGoalMl: Math.round(waterLiters * 1000),
            wakeTime,
            bedtime,
            sleepCycles: selectedCycles,
            dietaryPreferences: 'omnivore',
            mealSettings,
          });
          await saveMealSettings(mealSettings);
          await setSetting('planSource', 'dietician_upload');

          // Mark onboarding as complete
          setHasPlanSetup(true);
          setHasCompletedFullFlow(true);
          navigate('/', { replace: true });
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Reusable numeric stepper: − / value / + with long-press fast step
// No slider, no keyboard, no layout shift — mobile-first best practice
// ─────────────────────────────────────────────────────────────────

function NumericField({ label, value, onChange, min, max, step, unit }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10) / 10));

  const step_ = (dir: 1 | -1) => {
    const next = clamp(valueRef.current + dir * step);
    valueRef.current = next;
    onChange(next);
  };

  const startPress = (dir: 1 | -1) => {
    step_(dir);
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => step_(dir), 80);
    }, 380);
  };

  const stopPress = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => () => stopPress(), []);

  const openEdit = () => {
    setDraft(step < 1 ? value.toFixed(1) : String(value));
    setEditing(true);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 10);
  };

  const commitEdit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) onChange(clamp(parsed));
    setEditing(false);
  };

  const displayValue = step < 1 ? value.toFixed(1) : String(value);
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className="flex items-center px-4 h-[60px] gap-3">
      {/* Label */}
      <div className="w-24 text-sm text-gray-500 font-medium shrink-0">{label}</div>

      {/* Minus */}
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); startPress(-1); }}
        onPointerUp={stopPress}
        onPointerLeave={stopPress}
        onPointerCancel={stopPress}
        disabled={atMin}
        className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xl font-light select-none transition-colors shrink-0 ${
          atMin
            ? 'border-gray-200 bg-white text-gray-400 cursor-not-allowed'
            : 'border-gray-200 bg-white text-gray-700 active:bg-gray-100 shadow-sm'
        }`}
      >
        −
      </button>

      {/* Value / inline keypad edit */}
      <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={e => setDraft(e.target.value.replace(',', '.'))}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="w-16 text-center text-[28px] font-bold text-gray-900 tabular-nums leading-none bg-transparent border-b-2 border-primary outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={openEdit}
            className="text-[28px] font-bold text-gray-900 tabular-nums leading-none active:opacity-60 cursor-pointer"
          >
            {displayValue}
          </button>
        )}
        <span className="text-sm font-medium text-gray-400">{unit}</span>
      </div>

      {/* Plus */}
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); startPress(1); }}
        onPointerUp={stopPress}
        onPointerLeave={stopPress}
        onPointerCancel={stopPress}
        disabled={atMax}
        className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-light select-none transition-colors shrink-0 ${
          atMax
            ? 'bg-primary/30 text-white cursor-not-allowed'
            : 'bg-primary text-white active:opacity-80 shadow-md'
        }`}
      >
        +
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 1: Personal data
// ─────────────────────────────────────────────────────────────────

function StepPersonal({ gender, setGender, age, setAge, weight, setWeight, height, setHeight, goal, setGoal }: {
  gender: Gender; setGender: (v: Gender) => void;
  age: number; setAge: (v: number) => void;
  weight: number; setWeight: (v: number) => void;
  height: number; setHeight: (v: number) => void;
  goal: Goal; setGoal: (v: Goal) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6 pt-2">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('wizard.personal.title')}</h2>
        <p className="text-sm text-gray-500">{t('wizard.personal.subtitle')}</p>
      </div>

      {/* Gender */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">{t('wizard.personal.gender')}</label>
        <div className="grid grid-cols-2 gap-3">
          {([['male', '♂', t('wizard.personal.male')], ['female', '♀', t('wizard.personal.female')]] as const).map(([val, icon, label]) => (
            <button
              key={val}
              onClick={() => setGender(val)}
              className={`h-12 rounded-2xl border-2 flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                gender === val
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-gray-600'
              }`}
            >
              <span className="text-lg">{icon}</span> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Numeric fields — single compact card */}
      <div className="bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-200">
        <NumericField label={t('wizard.personal.age')} value={age} onChange={setAge} min={16} max={80} step={1} unit={t('wizard.personal.yearUnit')} />
        <NumericField label={t('wizard.personal.weight')} value={weight} onChange={setWeight} min={40} max={150} step={0.5} unit="kg" />
        <NumericField label={t('wizard.personal.height')} value={height} onChange={setHeight} min={140} max={220} step={1} unit="cm" />
      </div>

      {/* Goal */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">{t('wizard.personal.goal')}</label>
        <div className="space-y-2">
          {([
            ['lose', '📉', t('wizard.personal.goalLose'), t('wizard.personal.goalLoseHint')],
            ['maintain', '⚖️', t('wizard.personal.goalMaintain'), t('wizard.personal.goalMaintainHint')],
            ['gain', '📈', t('wizard.personal.goalGain'), t('wizard.personal.goalGainHint')],
          ] as const).map(([val, emoji, label, hint]) => (
            <button
              key={val}
              onClick={() => setGoal(val)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                goal === val
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${goal === val ? 'text-primary' : 'text-gray-700'}`}>{label}</p>
                <p className="text-xs text-gray-400">{hint}</p>
              </div>
              {goal === val && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 2: Dietary Criteria
// ─────────────────────────────────────────────────────────────────

function StepCriteria({
  dietType, setDietType,
  activeAllergens, toggleAllergen,
  selectedAlternativeKeys, setSelectedAlternativeKeys,
}: {
  dietType: DietType; setDietType: (v: DietType) => void;
  activeAllergens: Set<string>; toggleAllergen: (a: string) => void;
  selectedAlternativeKeys: Set<string>;
  setSelectedAlternativeKeys: (fn: (prev: Set<string>) => Set<string>) => void;
}) {
  const ALLERGENS = [
    { id: 'lactose',   names: { hu: 'Laktóz',   en: 'Lactose',   ro: 'Lactoză'   } },
    { id: 'gluten',    names: { hu: 'Glutén',   en: 'Gluten',    ro: 'Gluten'    } },
    { id: 'egg',       names: { hu: 'Tojás',    en: 'Egg',       ro: 'Ouă'       } },
    { id: 'fish',      names: { hu: 'Hal',      en: 'Fish',      ro: 'Pește'     } },
    { id: 'nuts',      names: { hu: 'Diófélék', en: 'Nuts',      ro: 'Nuci'      } },
    { id: 'soy',       names: { hu: 'Szója',    en: 'Soy',       ro: 'Soia'      } },
    { id: 'shellfish', names: { hu: 'Rákféle',  en: 'Shellfish', ro: 'Crustacee' } },
  ] as const;

  const toggleAlternative = (key: string) => {
    setSelectedAlternativeKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const { t, language } = useLanguage();
  const activeList = ALLERGENS.filter(a => activeAllergens.has(a.id));

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('wizard.criteria.title')}</h2>
        <p className="text-sm text-gray-500">{t('wizard.criteria.subtitle')}</p>
      </div>

      {/* Diet type */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('wizard.criteria.dietTypeLabel')}</p>
        <div className="flex rounded-2xl bg-gray-100 p-1 gap-1">
          {([['omnivore', '🍖', t('wizard.foods.omnivore')], ['vegetarian', '🥦', t('wizard.foods.vegetarian')]] as const).map(([val, emoji, label]) => (
            <button
              key={val}
              onClick={() => setDietType(val)}
              className={`flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                dietType === val ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              <span>{emoji}</span> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Allergen chips */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('wizard.criteria.allergiesLabel')}</p>
        <p className="text-xs text-gray-400">{t('wizard.criteria.allergiesHint')}</p>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map(allergen => {
            const active = activeAllergens.has(allergen.id);
            return (
              <button
                key={allergen.id}
                type="button"
                onClick={() => toggleAllergen(allergen.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  active
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-gray-50 border-border text-gray-600 hover:border-red-200'
                }`}
              >
                {active ? '🚫 ' : ''}{allergen.names[language]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-allergen alternatives */}
      {activeList.length > 0 && (
        <div className="space-y-4">
          {activeList.map(allergen => {
            const options = ALLERGEN_ALTERNATIVES[allergen.id] ?? [];
            if (options.length === 0) return null;
            const selectedCount = options.filter(o => selectedAlternativeKeys.has(o.key)).length;
            return (
              <div key={allergen.id} className="rounded-2xl border border-border bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">
                    {t('wizard.criteria.alternativeHeading').replace('{label}', allergen.names[language])}
                  </p>
                  {selectedCount > 0 && (
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {t('wizard.criteria.selectedCount').replace('{n}', String(selectedCount))}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {options.map(opt => {
                    const selected = selectedAlternativeKeys.has(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => toggleAlternative(opt.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                          selected
                            ? 'bg-primary/10 border-primary text-primary font-medium'
                            : 'bg-white border-border text-gray-600 hover:border-primary/50'
                        }`}
                      >
                        <span>{opt.emoji}</span>
                        <span>{opt.names[language]}</span>
                        {selected && <span className="text-primary">✓</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedCount === 0 && (
                  <p className="text-xs text-gray-400 italic">{t('wizard.criteria.selectAtLeast')}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 2: Foods
// ─────────────────────────────────────────────────────────────────

function StepFoods({ foodTab, setFoodTab, foodSearch, setFoodSearch, selectedFoods, toggleFood, visibleFoods, lookupStatus, lookupResults, onLookupFood, onAddResult, selectAllVisible, deselectAll, getStoresForFood }: {
  foodTab: FoodTabType; setFoodTab: (v: FoodTabType) => void;
  foodSearch: string; setFoodSearch: (v: string) => void;
  selectedFoods: Set<string>; toggleFood: (id: string) => void;
  visibleFoods: SeedFood[];
  lookupStatus: 'idle' | 'loading' | 'results' | 'not_found';
  lookupResults: ProductResult[];
  onLookupFood: (name: string) => void;
  onAddResult: (r: ProductResult) => void;
  selectAllVisible: () => void;
  deselectAll: () => void;
  getStoresForFood?: (foodId: string, foodCategory: FoodCategoryId) => NearbyStore[];
}) {
  const { t, language } = useLanguage();
  const CAT_LABELS: Record<FoodTabType, string> = {
    'all':       t('wizard.foods.catAll'),
    'protein':   t('wizard.foods.catProtein'),
    'carb':      t('wizard.foods.catCarb'),
    'fat':       t('wizard.foods.catFat'),
    'dairy':     t('wizard.foods.catDairy'),
    'vegetable': t('wizard.foods.catVeg'),
    'fruit':     t('wizard.foods.catFruit'),
  };
  return (
    <div className="space-y-4 pt-2">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('wizard.foods.title')}</h2>
        <p className="text-sm text-gray-500">{t('wizard.foods.subtitle')}</p>
      </div>

      {/* Category tabs — always visible */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FOOD_CATEGORY_TABS.map(cat => (
          <button
            key={cat}
            onClick={() => setFoodTab(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              foodTab === cat ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={foodSearch}
          onChange={e => setFoodSearch(e.target.value)}
          placeholder={t('wizard.foods.searchPlaceholder')}
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-background text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Store lookup results */}
      {lookupStatus === 'results' && lookupResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium">{t('wizard.foods.storeResults')}</p>
          {lookupResults.map((r, i) => (
            <button
              key={i}
              onClick={() => onAddResult(r)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-border bg-background text-left hover:border-primary/50 transition-all group"
            >
              <span className="text-2xl shrink-0">🛒</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate group-hover:text-primary">
                  {r.name}
                </p>
                <p className="text-2xs text-gray-400">
                  {r.calories} kcal · {r.protein}g P · {r.carbs}g C · {r.fat}g F
                  {r.stores.length > 0 && <> · <span className="text-primary">{r.stores.join(', ')}</span></>}
                </p>
              </div>
              <Plus className="w-4 h-4 text-gray-400 group-hover:text-primary shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Select / deselect all action bar */}
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs text-gray-400">{t('wizard.foods.selectedCount').replace('{n}', String(selectedFoods.size))}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAllVisible}
            className="text-xs text-primary font-medium hover:underline"
          >
            {t('wizard.foods.selectAll')}
          </button>
          {selectedFoods.size > 0 && (
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs text-gray-400 font-medium hover:underline"
            >
              {t('wizard.foods.deselectAll')}
            </button>
          )}
        </div>
      </div>

      {/* Food grid */}
      <div className="grid grid-cols-2 gap-2">
        {visibleFoods.length === 0 && foodSearch.trim() && lookupStatus !== 'results' && (
          <div className="col-span-2 flex flex-col items-center gap-3 py-5">
            {lookupStatus === 'not_found' ? (
              <p className="text-sm text-red-400">{t('wizard.foods.notFound')}</p>
            ) : (
              <>
                <p className="text-sm text-gray-400">{t('wizard.foods.notInList').replace('{name}', foodSearch)}</p>
                <button
                  onClick={() => onLookupFood(foodSearch)}
                  disabled={lookupStatus === 'loading'}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/5 text-primary text-sm font-medium border border-primary/20 disabled:opacity-60 transition-all"
                >
                  {lookupStatus === 'loading' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('wizard.foods.searching')}</>
                  ) : (
                    <>{t('wizard.foods.searchStores')}</>
                  )}
                </button>
              </>
            )}
          </div>
        )}
        {visibleFoods.length === 0 && !foodSearch.trim() && (
          <p className="col-span-2 text-center text-sm text-gray-400 py-6">{t('wizard.foods.noResults')}</p>
        )}
        {visibleFoods.map(food => {
          const selected = selectedFoods.has(food.id);
          const foodStores = getStoresForFood?.(food.id, food.category as FoodCategoryId) ?? [];
          const topStores = foodStores.slice(0, 2);
          return (
            <button
              key={food.id}
              onClick={() => toggleFood(food.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border-2 text-left transition-all ${
                selected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background'
              }`}
            >
              <span className="text-2xl shrink-0">{food.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-medium truncate ${selected ? 'text-primary' : 'text-gray-700'}`}>
                  {food.names[language]}
                </p>
                <p className="text-2xs text-gray-400">{food.calories_per_100g} kcal/100g</p>
                {topStores.length > 0 && (
                  <p className="text-2xs text-teal-600 truncate mt-0.5">
                    📍 {topStores.map(s => s.distanceKm > 0 ? `${s.chainProfile.displayName} ${s.distanceKm.toFixed(1)}km` : s.chainProfile.displayName).join(' · ')}
                  </p>
                )}
              </div>
              {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 3: Meals
// ─────────────────────────────────────────────────────────────────

function StepMeals({
  mealCount, setMealCount, mealModel, setMealModel
}: {
  mealCount: number;
  setMealCount: (v: number) => void;
  mealModel: string | undefined;
  setMealModel: (v: string | undefined) => void;
}) {
  const { t } = useLanguage();

  const NORMAL_OPTIONS = [
    { count: 2, model: undefined as string | undefined, label: t('wizard.meals.opt2label'), desc: t('wizard.meals.opt2desc'), emoji: '🍽️' },
    { count: 3, model: undefined as string | undefined, label: t('wizard.meals.opt3label'), desc: t('wizard.meals.opt3desc'), emoji: '🍽️🍽️' },
    { count: 4, model: undefined as string | undefined, label: t('wizard.meals.opt4label'), desc: t('wizard.meals.opt4desc'), emoji: '🍽️🍽️🍽️' },
    { count: 5, model: undefined as string | undefined, label: t('wizard.meals.opt5label'), desc: t('wizard.meals.opt5desc'), emoji: '🌟' },
  ];

  const IF_OPTIONS = [
    { count: 1, model: 'if16_8' as string | undefined, label: t('wizard.meals.optIF16label'), desc: t('wizard.meals.optIF16desc'), emoji: '⏱️' },
    { count: 1, model: 'if18_6' as string | undefined, label: t('wizard.meals.optIF18label'), desc: t('wizard.meals.optIF18desc'), emoji: '🌙' },
  ];

  const isSelected = (count: number, model: string | undefined) =>
    mealCount === count && mealModel === model;

  const renderOption = (opt: { count: number; model: string | undefined; label: string; desc: string; emoji: string }) => (
    <button
      key={opt.model ?? String(opt.count)}
      onClick={() => { setMealCount(opt.count); setMealModel(opt.model); }}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all text-left ${
        isSelected(opt.count, opt.model) ? 'border-primary bg-primary/5' : 'border-border'
      }`}
    >
      <span className="text-2xl">{opt.emoji}</span>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${isSelected(opt.count, opt.model) ? 'text-primary' : 'text-gray-800'}`}>
          {opt.label}
        </p>
        <p className="text-xs text-gray-400">{opt.desc}</p>
      </div>
      {isSelected(opt.count, opt.model) && <Check className="w-5 h-5 text-primary shrink-0" />}
    </button>
  );

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('wizard.meals.title')}</h2>
        <p className="text-sm text-gray-500">{t('wizard.meals.subtitle')}</p>
      </div>

      <div className="space-y-2.5">
        {/* Normal meals section label */}
        <p className="text-[0.68rem] font-semibold text-gray-400 tracking-widest px-1">
          {t('wizard.meals.sectionNormal')}
        </p>
        {NORMAL_OPTIONS.map(renderOption)}

        {/* IF section divider */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[0.68rem] font-semibold text-gray-400 tracking-widest whitespace-nowrap">
            {t('wizard.meals.sectionIF')}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {IF_OPTIONS.map(renderOption)}

        {mealModel?.startsWith('if') && (
          <div className="bg-amber-50 rounded-2xl p-4 flex gap-3">
            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">{t('wizard.meals.ifNote')}</p>
          </div>
        )}
      </div>

      <div className="bg-primary/5 rounded-2xl p-4 flex gap-3">
        <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-primary">{t('wizard.meals.hint')}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 4: Sport & Activity
// ─────────────────────────────────────────────────────────────────

function StepSport({ activity, setActivity, sports, addSport, removeSport, updateSport, toggleSportDay, showSportPicker, setShowSportPicker, weightKg }: {
  activity: ActivityLevel; setActivity: (v: ActivityLevel) => void;
  sports: SportEntry[]; addSport: (sportId: string) => void; removeSport: (id: string) => void;
  updateSport: (id: string, patch: Partial<SportEntry>) => void;
  toggleSportDay: (id: string, dayIdx: number) => void;
  showSportPicker: boolean; setShowSportPicker: (v: boolean) => void;
  weightKg: number;
}) {
  const { t, language } = useLanguage();
  const ACTIVITY_OPTIONS = [
    { val: 'sedentary' as ActivityLevel, emoji: '💺', label: t('wizard.sport.actSedentary'), desc: t('wizard.sport.actSedentaryDesc') },
    { val: 'light' as ActivityLevel, emoji: '🚶', label: t('wizard.sport.actLight'), desc: t('wizard.sport.actLightDesc') },
    { val: 'moderate' as ActivityLevel, emoji: '🏃', label: t('wizard.sport.actModerate'), desc: t('wizard.sport.actModerateDesc') },
    { val: 'active' as ActivityLevel, emoji: '🏋️', label: t('wizard.sport.actActive'), desc: t('wizard.sport.actActiveDesc') },
  ];
  return (
    <div className="space-y-5 pt-2">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('wizard.sport.title')}</h2>
        <p className="text-sm text-gray-500">{t('wizard.sport.subtitle')}</p>
      </div>

      {/* Activity level */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">{t('wizard.sport.activityLabel')}</label>
        <div className="grid grid-cols-2 gap-2">
          {ACTIVITY_OPTIONS.map(opt => (
            <button
              key={opt.val}
              onClick={() => setActivity(opt.val)}
              className={`flex flex-col items-start px-3 py-3 rounded-2xl border-2 transition-all text-left ${
                activity === opt.val
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <span className="text-2xl mb-1">{opt.emoji}</span>
              <p className={`text-sm font-medium ${activity === opt.val ? 'text-primary' : 'text-gray-700'}`}>{opt.label}</p>
              <p className="text-xs text-gray-400">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sports */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">{t('wizard.sport.sportsLabel')}</label>
          {sports.length > 0 && (
            <button
              onClick={() => setShowSportPicker(true)}
              className="flex items-center gap-1 text-xs text-primary font-medium touch-manipulation"
            >
              <Plus className="w-3.5 h-3.5" /> {t('wizard.sport.addSport')}
            </button>
          )}
        </div>

        {sports.length === 0 && (
          <button
            onClick={() => setShowSportPicker(true)}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-6 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all touch-manipulation cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-gray-500">{t('wizard.sport.addSport')}</span>
            <span className="text-xs text-gray-500">{t('wizard.sport.noSportsHint')}</span>
          </button>
        )}

        {sports.map(s => (
          <div key={s.id} className="bg-gray-50 rounded-2xl p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800">
                {SPORT_BY_ID[s.sportId]?.emoji ?? '💪'} {SPORT_BY_ID[s.sportId]?.names[language] ?? s.sportId}
              </span>
              <button onClick={() => removeSport(s.id)} className="text-gray-400 hover:text-red-400 transition-colors">
                <Minus className="w-4 h-4" />
              </button>
            </div>
            {/* Day picker */}
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1.5">{t('wizard.sport.trainingDays')}</p>
              <div className="grid grid-cols-7 gap-1">
                {t('wizard.sport.weekdayAbbrs').split(',').map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleSportDay(s.id, idx)}
                    className={`text-[0.72rem] font-bold py-2.5 min-h-[44px] flex items-center justify-center rounded-lg transition-all ${
                      s.days.includes(idx)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes slider */}
            <div className="mb-1">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{t('wizard.sport.minutesPer')}</span>
                <span className="font-semibold text-gray-700">{s.minutes}p</span>
              </div>
              <input
                type="range" min={15} max={180} step={15} value={s.minutes}
                onChange={e => updateSport(s.id, { minutes: +e.target.value })}
                className="w-full accent-primary"
              />
            </div>

            {/* Calorie burn estimate */}
            {s.days.length > 0 && (
              <p className="text-[0.72rem] text-primary mt-1">
                ⚡ {t('wizard.sport.burnEstimate').replace('{n}', String(
                  Math.round(getMET(s.sportId) * weightKg * (s.minutes / 60))
                ))}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Sport picker bottom sheet */}
      <AnimatePresence>
        {showSportPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            onClick={() => setShowSportPicker(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-background rounded-t-3xl w-full p-5 pb-10"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-gray-900 mb-4">{t('wizard.sport.pickSport')}</h3>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pb-2">
                {SPORT_CATEGORIES.map(cat => (
                  <div key={cat.key}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      {t(`wizard.sport.sportCategory${cat.key.charAt(0).toUpperCase() + cat.key.slice(1)}`)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cat.sports.map(sport => {
                        const alreadyAdded = sports.some(s => s.sportId === sport.id);
                        return (
                          <button
                            key={sport.id}
                            onClick={() => !alreadyAdded && addSport(sport.id)}
                            disabled={alreadyAdded}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                              alreadyAdded
                                ? 'bg-primary/10 border-primary text-primary font-medium opacity-60 cursor-default'
                                : 'bg-white border-border text-gray-700 hover:border-primary/50 active:bg-gray-50'
                            }`}
                          >
                            <span>{sport.emoji}</span>
                            <span>{sport.names[language]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 5: Sleep
// ─────────────────────────────────────────────────────────────────

function StepSleep({ wakeTime, setWakeTime, selectedCycles, setSelectedCycles, bedtimeOptions }: {
  wakeTime: string; setWakeTime: (v: string) => void;
  selectedCycles: number; setSelectedCycles: (v: number) => void;
  bedtimeOptions: ReturnType<typeof SleepService.getBedtimeOptions>;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-5 pt-2">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('wizard.sleep.title')}</h2>
        <p className="text-sm text-gray-500">{t('wizard.sleep.subtitle')}</p>
      </div>

      {/* Wake time */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">{t('wizard.sleep.wakeLabel')}</label>
        <input
          type="time"
          value={wakeTime}
          onChange={e => setWakeTime(e.target.value)}
          className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-background text-gray-900 text-base focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Cycle picker */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">{t('wizard.sleep.bedtimeLabel')}</label>
        <div className="space-y-2">
          {bedtimeOptions.map(opt => (
            <button
              key={opt.cycleCount}
              onClick={() => setSelectedCycles(opt.cycleCount)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border-2 transition-all ${
                selectedCycles === opt.cycleCount
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <Moon className={`w-5 h-5 shrink-0 ${selectedCycles === opt.cycleCount ? 'text-primary' : 'text-gray-400'}`} />
              <div className="flex-1 text-left">
                <p className={`text-sm font-medium ${selectedCycles === opt.cycleCount ? 'text-primary' : 'text-gray-700'}`}>
                  {t('wizard.sleep.bedtimePrefix')} {opt.bedtime} · {opt.sleepDuration}
                </p>
                <p className="text-xs text-gray-400">{opt.label} · {opt.cycleCount} ciklus</p>
              </div>
              {selectedCycles === opt.cycleCount && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 6: Summary
// ─────────────────────────────────────────────────────────────────

function StepSummary({ dailyTarget, waterLiters, bedtime, sleepDuration, selectedFoodsCount, mealCount, mealModel, goal }: {
  dailyTarget: number; waterLiters: number; bedtime: string; sleepDuration: string;
  selectedFoodsCount: number; mealCount: number; mealModel?: string; goal: Goal;
}) {
  const { t } = useLanguage();
  const goalLabel = goal === 'lose' ? t('wizard.summary.goalLose') : goal === 'gain' ? t('wizard.summary.goalGain') : t('wizard.summary.goalMaintain');

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('wizard.summary.title')}</h2>
        <p className="text-sm text-gray-500">{t('wizard.summary.subtitle')}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: UtensilsCrossed, label: t('wizard.summary.dailyCalories'), value: `${dailyTarget} kcal`, color: 'text-orange-500', bg: 'bg-orange-50' },
          { icon: Droplets, label: t('wizard.summary.dailyWater'), value: `${waterLiters} L`, color: 'text-blue-500', bg: 'bg-blue-50' },
          { icon: Moon, label: t('wizard.summary.bedtime'), value: bedtime, color: 'text-violet-500', bg: 'bg-violet-50' },
          { icon: Dumbbell, label: t('wizard.summary.goal'), value: goalLabel, color: 'text-primary', bg: 'bg-primary/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4`}>
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-base font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">{t('wizard.summary.ingredients')}</span>
          <span className="font-medium text-gray-800">{t('wizard.summary.ingredientsValue').replace('{n}', String(selectedFoodsCount))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t('wizard.summary.dailyMeals')}</span>
          <span className="font-medium text-gray-800">
            {mealModel === 'if16_8' ? 'IF 16:8' : mealModel === 'if18_6' ? 'IF 18:6' : t('wizard.summary.dailyMealsValue').replace('{n}', String(mealCount))}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t('wizard.summary.sleep')}</span>
          <span className="font-medium text-gray-800">{sleepDuration}</span>
        </div>
      </div>

      <div className="bg-violet-50 rounded-2xl p-4 flex gap-3">
        <Sparkles className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
        <p className="text-sm text-violet-700">
          {t('wizard.summary.aiHint')}
        </p>
      </div>
    </div>
  );
}
