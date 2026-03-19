/**
 * ProfileSetupWizard - 6-step onboarding data collection
 * Steps: personal → foods → meals → sport → sleep → summary+generate
 * Everything saved locally — no cloud, no Firebase.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
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
import { saveUserProfile, getDefaultMealSettings, saveMealSettings } from '../../backend/services/UserProfileService';
import { SleepService } from '../../backend/services/SleepService';
import { createFoodsBatch } from '../../backend/services/FoodCatalogService';
import { setSetting } from '../../backend/services/SettingsService';
import type { CreateFoodInput } from '../../backend/services/FoodCatalogService';
import { DSMButton } from '../dsm';
import { canGenerate, incrementUsage } from '../../services/userFirestoreService';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type Gender = 'male' | 'female';
type Goal = 'lose' | 'maintain' | 'gain';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
type DietType = 'omnivore' | 'vegetarian';

interface SportEntry {
  id: string;
  label: string;
  days: number; // days per week
  minutes: number; // per session
}

// ─────────────────────────────────────────────────────────────────
// Predefined food catalog for onboarding picker
// ─────────────────────────────────────────────────────────────────

type DisplayCategory = 'Fehérje' | 'Szénhidrát' | 'Zsír' | 'Tejtermék' | 'Zöldség' | 'Gyümölcs';

function mapCategory(cat: DisplayCategory): string {
  switch (cat) {
    case 'Fehérje': return 'Feherje';
    case 'Szénhidrát': return 'Komplex_szenhidrat';
    case 'Zsír': return 'Egeszseges_zsir';
    case 'Tejtermék': return 'Tejtermek';
    case 'Zöldség': return 'Zoldseg';
    case 'Gyümölcs': return 'Zoldseg'; // no fruit category, map to veggie
  }
}

interface SeedFood {
  name: string;
  category: DisplayCategory;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  vegetarian: boolean;
  emoji: string;
  allergens?: string[];
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
  if (protein >= 12) return 'Fehérje';
  if (fat >= 15) return 'Zsír';
  if (carbs >= 20) return 'Szénhidrát';
  return 'Fehérje';
}

const SEED_FOODS: SeedFood[] = [
  // ── Fehérje ──────────────────────────────────────────────────
  { name: 'Csirkemell', category: 'Fehérje', calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, vegetarian: false, emoji: '🍗' },
  { name: 'Csirkecomb', category: 'Fehérje', calories_per_100g: 215, protein_per_100g: 26, carbs_per_100g: 0, fat_per_100g: 12, vegetarian: false, emoji: '🍗' },
  { name: 'Pulykamell', category: 'Fehérje', calories_per_100g: 135, protein_per_100g: 30, carbs_per_100g: 0, fat_per_100g: 1.5, vegetarian: false, emoji: '🦃' },
  { name: 'Tojás', category: 'Fehérje', calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1, fat_per_100g: 11, vegetarian: true, emoji: '🥚', allergens: ['tojás'] },
  { name: 'Lazac', category: 'Fehérje', calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 13, vegetarian: false, emoji: '🐟', allergens: ['hal'] },
  { name: 'Tonhal', category: 'Fehérje', calories_per_100g: 116, protein_per_100g: 26, carbs_per_100g: 0, fat_per_100g: 1, vegetarian: false, emoji: '🐠', allergens: ['hal'] },
  { name: 'Makréla', category: 'Fehérje', calories_per_100g: 205, protein_per_100g: 19, carbs_per_100g: 0, fat_per_100g: 14, vegetarian: false, emoji: '🐟', allergens: ['hal'] },
  { name: 'Tilápia', category: 'Fehérje', calories_per_100g: 96, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 2, vegetarian: false, emoji: '🐟', allergens: ['hal'] },
  { name: 'Garnélarák', category: 'Fehérje', calories_per_100g: 99, protein_per_100g: 24, carbs_per_100g: 0.2, fat_per_100g: 0.3, vegetarian: false, emoji: '🦐', allergens: ['rákféle'] },
  { name: 'Sertéshús', category: 'Fehérje', calories_per_100g: 242, protein_per_100g: 27, carbs_per_100g: 0, fat_per_100g: 14, vegetarian: false, emoji: '🥩' },
  { name: 'Marhahús', category: 'Fehérje', calories_per_100g: 250, protein_per_100g: 26, carbs_per_100g: 0, fat_per_100g: 15, vegetarian: false, emoji: '🥩' },
  { name: 'Bárány', category: 'Fehérje', calories_per_100g: 294, protein_per_100g: 25, carbs_per_100g: 0, fat_per_100g: 21, vegetarian: false, emoji: '🥩' },
  { name: 'Tofu', category: 'Fehérje', calories_per_100g: 76, protein_per_100g: 8, carbs_per_100g: 1.9, fat_per_100g: 4.8, vegetarian: true, emoji: '🫘', allergens: ['szója'] },
  { name: 'Tempeh', category: 'Fehérje', calories_per_100g: 193, protein_per_100g: 19, carbs_per_100g: 9, fat_per_100g: 11, vegetarian: true, emoji: '🫘', allergens: ['szója'] },
  { name: 'Lencse', category: 'Fehérje', calories_per_100g: 116, protein_per_100g: 9, carbs_per_100g: 20, fat_per_100g: 0.4, vegetarian: true, emoji: '🫘' },
  { name: 'Csicseriborsó', category: 'Fehérje', calories_per_100g: 164, protein_per_100g: 9, carbs_per_100g: 27, fat_per_100g: 2.6, vegetarian: true, emoji: '🫘' },
  { name: 'Fekete bab', category: 'Fehérje', calories_per_100g: 132, protein_per_100g: 8.9, carbs_per_100g: 24, fat_per_100g: 0.5, vegetarian: true, emoji: '🫘' },
  { name: 'Fehér bab', category: 'Fehérje', calories_per_100g: 127, protein_per_100g: 8.7, carbs_per_100g: 22, fat_per_100g: 0.5, vegetarian: true, emoji: '🫘' },
  { name: 'Tojásfehérje', category: 'Fehérje', calories_per_100g: 52, protein_per_100g: 11, carbs_per_100g: 0.7, fat_per_100g: 0.2, vegetarian: true, emoji: '🥚', allergens: ['tojás'] },
  { name: 'Szardínia', category: 'Fehérje', calories_per_100g: 208, protein_per_100g: 25, carbs_per_100g: 0, fat_per_100g: 11, vegetarian: false, emoji: '🐟', allergens: ['hal'] },
  // ── Szénhidrát ───────────────────────────────────────────────
  { name: 'Zab', category: 'Szénhidrát', calories_per_100g: 389, protein_per_100g: 17, carbs_per_100g: 66, fat_per_100g: 7, vegetarian: true, emoji: '🌾', allergens: ['glutén'] },
  { name: 'Rizs', category: 'Szénhidrát', calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fat_per_100g: 0.3, vegetarian: true, emoji: '🍚' },
  { name: 'Barna rizs', category: 'Szénhidrát', calories_per_100g: 111, protein_per_100g: 2.6, carbs_per_100g: 23, fat_per_100g: 0.9, vegetarian: true, emoji: '🍚' },
  { name: 'Teljes kiőrlésű kenyér', category: 'Szénhidrát', calories_per_100g: 247, protein_per_100g: 13, carbs_per_100g: 41, fat_per_100g: 4, vegetarian: true, emoji: '🍞', allergens: ['glutén'] },
  { name: 'Fehér kenyér', category: 'Szénhidrát', calories_per_100g: 265, protein_per_100g: 9, carbs_per_100g: 49, fat_per_100g: 3.2, vegetarian: true, emoji: '🍞', allergens: ['glutén'] },
  { name: 'Tészta', category: 'Szénhidrát', calories_per_100g: 157, protein_per_100g: 5.8, carbs_per_100g: 31, fat_per_100g: 0.9, vegetarian: true, emoji: '🍝', allergens: ['glutén'] },
  { name: 'Teljes kiőrlésű tészta', category: 'Szénhidrát', calories_per_100g: 148, protein_per_100g: 6.3, carbs_per_100g: 29, fat_per_100g: 0.8, vegetarian: true, emoji: '🍝', allergens: ['glutén'] },
  { name: 'Burgonya', category: 'Szénhidrát', calories_per_100g: 77, protein_per_100g: 2, carbs_per_100g: 17, fat_per_100g: 0.1, vegetarian: true, emoji: '🥔' },
  { name: 'Édesburgonya', category: 'Szénhidrát', calories_per_100g: 86, protein_per_100g: 1.6, carbs_per_100g: 20, fat_per_100g: 0.1, vegetarian: true, emoji: '🍠' },
  { name: 'Quinoa', category: 'Szénhidrát', calories_per_100g: 120, protein_per_100g: 4.4, carbs_per_100g: 21, fat_per_100g: 1.9, vegetarian: true, emoji: '🌾' },
  { name: 'Kukorica', category: 'Szénhidrát', calories_per_100g: 96, protein_per_100g: 3.4, carbs_per_100g: 21, fat_per_100g: 1.5, vegetarian: true, emoji: '🌽' },
  { name: 'Hajdina', category: 'Szénhidrát', calories_per_100g: 92, protein_per_100g: 3.4, carbs_per_100g: 20, fat_per_100g: 0.6, vegetarian: true, emoji: '🌾' },
  { name: 'Árpa', category: 'Szénhidrát', calories_per_100g: 123, protein_per_100g: 2.3, carbs_per_100g: 28, fat_per_100g: 0.4, vegetarian: true, emoji: '🌾', allergens: ['glutén'] },
  { name: 'Tortilla', category: 'Szénhidrát', calories_per_100g: 218, protein_per_100g: 6, carbs_per_100g: 36, fat_per_100g: 5.5, vegetarian: true, emoji: '🫓', allergens: ['glutén'] },
  { name: 'Zabpehely', category: 'Szénhidrát', calories_per_100g: 379, protein_per_100g: 13, carbs_per_100g: 68, fat_per_100g: 6.5, vegetarian: true, emoji: '🌾', allergens: ['glutén'] },
  // ── Zsír ─────────────────────────────────────────────────────
  { name: 'Avokádó', category: 'Zsír', calories_per_100g: 160, protein_per_100g: 2, carbs_per_100g: 9, fat_per_100g: 15, vegetarian: true, emoji: '🥑' },
  { name: 'Dió', category: 'Zsír', calories_per_100g: 654, protein_per_100g: 15, carbs_per_100g: 14, fat_per_100g: 65, vegetarian: true, emoji: '🌰', allergens: ['diófélék'] },
  { name: 'Mandula', category: 'Zsír', calories_per_100g: 579, protein_per_100g: 21, carbs_per_100g: 22, fat_per_100g: 50, vegetarian: true, emoji: '🥜', allergens: ['diófélék'] },
  { name: 'Mogyoró', category: 'Zsír', calories_per_100g: 567, protein_per_100g: 26, carbs_per_100g: 16, fat_per_100g: 49, vegetarian: true, emoji: '🥜', allergens: ['diófélék'] },
  { name: 'Kesudió', category: 'Zsír', calories_per_100g: 553, protein_per_100g: 18, carbs_per_100g: 30, fat_per_100g: 44, vegetarian: true, emoji: '🥜', allergens: ['diófélék'] },
  { name: 'Pekándió', category: 'Zsír', calories_per_100g: 691, protein_per_100g: 9, carbs_per_100g: 14, fat_per_100g: 72, vegetarian: true, emoji: '🌰', allergens: ['diófélék'] },
  { name: 'Olívaolaj', category: 'Zsír', calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, vegetarian: true, emoji: '🫒' },
  { name: 'Kókuszolaj', category: 'Zsír', calories_per_100g: 862, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, vegetarian: true, emoji: '🥥' },
  { name: 'Mogyoróvaj', category: 'Zsír', calories_per_100g: 588, protein_per_100g: 25, carbs_per_100g: 20, fat_per_100g: 50, vegetarian: true, emoji: '🥜', allergens: ['diófélék'] },
  { name: 'Chia mag', category: 'Zsír', calories_per_100g: 486, protein_per_100g: 17, carbs_per_100g: 42, fat_per_100g: 31, vegetarian: true, emoji: '🌱' },
  { name: 'Lenmag', category: 'Zsír', calories_per_100g: 534, protein_per_100g: 18, carbs_per_100g: 29, fat_per_100g: 42, vegetarian: true, emoji: '🌱' },
  { name: 'Tök mag', category: 'Zsír', calories_per_100g: 559, protein_per_100g: 30, carbs_per_100g: 11, fat_per_100g: 49, vegetarian: true, emoji: '🌱' },
  // ── Tejtermék ────────────────────────────────────────────────
  { name: 'Görög joghurt', category: 'Tejtermék', calories_per_100g: 59, protein_per_100g: 10, carbs_per_100g: 3.6, fat_per_100g: 0.4, vegetarian: true, emoji: '🥛', allergens: ['laktóz'] },
  { name: 'Joghurt', category: 'Tejtermék', calories_per_100g: 61, protein_per_100g: 3.5, carbs_per_100g: 4.7, fat_per_100g: 3.3, vegetarian: true, emoji: '🥛', allergens: ['laktóz'] },
  { name: 'Túró', category: 'Tejtermék', calories_per_100g: 98, protein_per_100g: 11, carbs_per_100g: 3.4, fat_per_100g: 4.3, vegetarian: true, emoji: '🧀', allergens: ['laktóz'] },
  { name: 'Sajt', category: 'Tejtermék', calories_per_100g: 402, protein_per_100g: 25, carbs_per_100g: 1.3, fat_per_100g: 33, vegetarian: true, emoji: '🧀', allergens: ['laktóz'] },
  { name: 'Mozzarella', category: 'Tejtermék', calories_per_100g: 280, protein_per_100g: 28, carbs_per_100g: 2.2, fat_per_100g: 17, vegetarian: true, emoji: '🧀', allergens: ['laktóz'] },
  { name: 'Ricotta', category: 'Tejtermék', calories_per_100g: 174, protein_per_100g: 11, carbs_per_100g: 3, fat_per_100g: 13, vegetarian: true, emoji: '🧀', allergens: ['laktóz'] },
  { name: 'Tej', category: 'Tejtermék', calories_per_100g: 61, protein_per_100g: 3.2, carbs_per_100g: 4.8, fat_per_100g: 3.3, vegetarian: true, emoji: '🥛', allergens: ['laktóz'] },
  { name: 'Kefir', category: 'Tejtermék', calories_per_100g: 61, protein_per_100g: 3.3, carbs_per_100g: 4.7, fat_per_100g: 3.5, vegetarian: true, emoji: '🥛', allergens: ['laktóz'] },
  { name: 'Vaj', category: 'Tejtermék', calories_per_100g: 717, protein_per_100g: 0.9, carbs_per_100g: 0.1, fat_per_100g: 81, vegetarian: true, emoji: '🧈', allergens: ['laktóz'] },
  { name: 'Tejföl', category: 'Tejtermék', calories_per_100g: 193, protein_per_100g: 2.4, carbs_per_100g: 3.4, fat_per_100g: 20, vegetarian: true, emoji: '🥛', allergens: ['laktóz'] },
  // ── Zöldség ──────────────────────────────────────────────────
  { name: 'Brokkoli', category: 'Zöldség', calories_per_100g: 34, protein_per_100g: 2.8, carbs_per_100g: 7, fat_per_100g: 0.4, vegetarian: true, emoji: '🥦' },
  { name: 'Karfiol', category: 'Zöldség', calories_per_100g: 25, protein_per_100g: 1.9, carbs_per_100g: 5, fat_per_100g: 0.3, vegetarian: true, emoji: '🥦' },
  { name: 'Spenót', category: 'Zöldség', calories_per_100g: 23, protein_per_100g: 2.9, carbs_per_100g: 3.6, fat_per_100g: 0.4, vegetarian: true, emoji: '🌿' },
  { name: 'Paradicsom', category: 'Zöldség', calories_per_100g: 18, protein_per_100g: 0.9, carbs_per_100g: 3.9, fat_per_100g: 0.2, vegetarian: true, emoji: '🍅' },
  { name: 'Paprika', category: 'Zöldség', calories_per_100g: 31, protein_per_100g: 1, carbs_per_100g: 6, fat_per_100g: 0.3, vegetarian: true, emoji: '🫑' },
  { name: 'Sárgarépa', category: 'Zöldség', calories_per_100g: 41, protein_per_100g: 0.9, carbs_per_100g: 10, fat_per_100g: 0.2, vegetarian: true, emoji: '🥕' },
  { name: 'Uborka', category: 'Zöldség', calories_per_100g: 16, protein_per_100g: 0.7, carbs_per_100g: 3.6, fat_per_100g: 0.1, vegetarian: true, emoji: '🥒' },
  { name: 'Fokhagyma', category: 'Zöldség', calories_per_100g: 149, protein_per_100g: 6.4, carbs_per_100g: 33, fat_per_100g: 0.5, vegetarian: true, emoji: '🧄' },
  { name: 'Hagyma', category: 'Zöldség', calories_per_100g: 40, protein_per_100g: 1.1, carbs_per_100g: 9.3, fat_per_100g: 0.1, vegetarian: true, emoji: '🧅' },
  { name: 'Zöldborsó', category: 'Zöldség', calories_per_100g: 81, protein_per_100g: 5.4, carbs_per_100g: 14, fat_per_100g: 0.4, vegetarian: true, emoji: '🫛' },
  { name: 'Zöldbab', category: 'Zöldség', calories_per_100g: 31, protein_per_100g: 1.8, carbs_per_100g: 7, fat_per_100g: 0.1, vegetarian: true, emoji: '🫘' },
  { name: 'Cukorborsó', category: 'Zöldség', calories_per_100g: 42, protein_per_100g: 2.8, carbs_per_100g: 7.6, fat_per_100g: 0.2, vegetarian: true, emoji: '🫛' },
  { name: 'Cékla', category: 'Zöldség', calories_per_100g: 43, protein_per_100g: 1.6, carbs_per_100g: 10, fat_per_100g: 0.2, vegetarian: true, emoji: '🫚' },
  { name: 'Kelkáposzta', category: 'Zöldség', calories_per_100g: 49, protein_per_100g: 4.3, carbs_per_100g: 9, fat_per_100g: 0.9, vegetarian: true, emoji: '🥬' },
  { name: 'Saláta', category: 'Zöldség', calories_per_100g: 15, protein_per_100g: 1.4, carbs_per_100g: 2.9, fat_per_100g: 0.2, vegetarian: true, emoji: '🥬' },
  { name: 'Padlizsán', category: 'Zöldség', calories_per_100g: 25, protein_per_100g: 1, carbs_per_100g: 6, fat_per_100g: 0.2, vegetarian: true, emoji: '🍆' },
  { name: 'Cukkini', category: 'Zöldség', calories_per_100g: 17, protein_per_100g: 1.2, carbs_per_100g: 3.1, fat_per_100g: 0.3, vegetarian: true, emoji: '🥒' },
  { name: 'Gomba', category: 'Zöldség', calories_per_100g: 22, protein_per_100g: 3.1, carbs_per_100g: 3.3, fat_per_100g: 0.3, vegetarian: true, emoji: '🍄' },
  { name: 'Articsóka', category: 'Zöldség', calories_per_100g: 47, protein_per_100g: 3.3, carbs_per_100g: 11, fat_per_100g: 0.2, vegetarian: true, emoji: '🌿' },
  { name: 'Spárga', category: 'Zöldség', calories_per_100g: 20, protein_per_100g: 2.2, carbs_per_100g: 3.9, fat_per_100g: 0.1, vegetarian: true, emoji: '🌿' },
  // ── Gyümölcs ─────────────────────────────────────────────────
  { name: 'Alma', category: 'Gyümölcs', calories_per_100g: 52, protein_per_100g: 0.3, carbs_per_100g: 14, fat_per_100g: 0.2, vegetarian: true, emoji: '🍎' },
  { name: 'Banán', category: 'Gyümölcs', calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 23, fat_per_100g: 0.3, vegetarian: true, emoji: '🍌' },
  { name: 'Áfonya', category: 'Gyümölcs', calories_per_100g: 57, protein_per_100g: 0.7, carbs_per_100g: 14, fat_per_100g: 0.3, vegetarian: true, emoji: '🫐' },
  { name: 'Eper', category: 'Gyümölcs', calories_per_100g: 32, protein_per_100g: 0.7, carbs_per_100g: 7.7, fat_per_100g: 0.3, vegetarian: true, emoji: '🍓' },
  { name: 'Narancs', category: 'Gyümölcs', calories_per_100g: 47, protein_per_100g: 0.9, carbs_per_100g: 12, fat_per_100g: 0.1, vegetarian: true, emoji: '🍊' },
  { name: 'Kivi', category: 'Gyümölcs', calories_per_100g: 61, protein_per_100g: 1.1, carbs_per_100g: 15, fat_per_100g: 0.5, vegetarian: true, emoji: '🥝' },
  { name: 'Mangó', category: 'Gyümölcs', calories_per_100g: 60, protein_per_100g: 0.8, carbs_per_100g: 15, fat_per_100g: 0.4, vegetarian: true, emoji: '🥭' },
  { name: 'Görögdinnye', category: 'Gyümölcs', calories_per_100g: 30, protein_per_100g: 0.6, carbs_per_100g: 7.6, fat_per_100g: 0.2, vegetarian: true, emoji: '🍉' },
  { name: 'Szőlő', category: 'Gyümölcs', calories_per_100g: 67, protein_per_100g: 0.6, carbs_per_100g: 17, fat_per_100g: 0.4, vegetarian: true, emoji: '🍇' },
  { name: 'Körte', category: 'Gyümölcs', calories_per_100g: 57, protein_per_100g: 0.4, carbs_per_100g: 15, fat_per_100g: 0.1, vegetarian: true, emoji: '🍐' },
  { name: 'Őszibarack', category: 'Gyümölcs', calories_per_100g: 39, protein_per_100g: 0.9, carbs_per_100g: 10, fat_per_100g: 0.3, vegetarian: true, emoji: '🍑' },
  { name: 'Cseresznye', category: 'Gyümölcs', calories_per_100g: 63, protein_per_100g: 1.1, carbs_per_100g: 16, fat_per_100g: 0.2, vegetarian: true, emoji: '🍒' },
  { name: 'Ananász', category: 'Gyümölcs', calories_per_100g: 50, protein_per_100g: 0.5, carbs_per_100g: 13, fat_per_100g: 0.1, vegetarian: true, emoji: '🍍' },
  { name: 'Grapefruit', category: 'Gyümölcs', calories_per_100g: 42, protein_per_100g: 0.8, carbs_per_100g: 11, fat_per_100g: 0.1, vegetarian: true, emoji: '🍊' },
  { name: 'Citrom', category: 'Gyümölcs', calories_per_100g: 29, protein_per_100g: 1.1, carbs_per_100g: 9, fat_per_100g: 0.3, vegetarian: true, emoji: '🍋' },
  { name: 'Málna', category: 'Gyümölcs', calories_per_100g: 52, protein_per_100g: 1.2, carbs_per_100g: 12, fat_per_100g: 0.7, vegetarian: true, emoji: '🫐' },
];

const FOOD_CATEGORY_TABS = ['Minden', 'Fehérje', 'Szénhidrát', 'Zsír', 'Tejtermék', 'Zöldség', 'Gyümölcs'] as const;
type FoodTabType = typeof FOOD_CATEGORY_TABS[number];

// ─────────────────────────────────────────────────────────────────
// Curated alternative foods for allergen substitution
// Covers Romanian market: kecske/juh/bivaly dairy, plant milks, etc.
// ─────────────────────────────────────────────────────────────────

const CURATED_ALTERNATIVES: Record<string, SeedFood[]> = {
  kecske: [
    { name: 'Kecske tej', category: 'Tejtermék', calories_per_100g: 69, protein_per_100g: 3.6, carbs_per_100g: 4.4, fat_per_100g: 4.2, vegetarian: true, emoji: '🥛' },
    { name: 'Kecske joghurt', category: 'Tejtermék', calories_per_100g: 59, protein_per_100g: 3.8, carbs_per_100g: 4.1, fat_per_100g: 3.5, vegetarian: true, emoji: '🥛' },
    { name: 'Kecske sajt', category: 'Tejtermék', calories_per_100g: 364, protein_per_100g: 22, carbs_per_100g: 2, fat_per_100g: 30, vegetarian: true, emoji: '🧀' },
    { name: 'Kecske túró', category: 'Tejtermék', calories_per_100g: 105, protein_per_100g: 11, carbs_per_100g: 3, fat_per_100g: 5.5, vegetarian: true, emoji: '🧀' },
    { name: 'Kecske tejföl', category: 'Tejtermék', calories_per_100g: 198, protein_per_100g: 2.7, carbs_per_100g: 3.2, fat_per_100g: 20, vegetarian: true, emoji: '🥛' },
    { name: 'Kecske kefir', category: 'Tejtermék', calories_per_100g: 65, protein_per_100g: 3.5, carbs_per_100g: 4.3, fat_per_100g: 3.8, vegetarian: true, emoji: '🥛' },
    { name: 'Kecske vaj', category: 'Tejtermék', calories_per_100g: 717, protein_per_100g: 0.9, carbs_per_100g: 0.1, fat_per_100g: 81, vegetarian: true, emoji: '🧈' },
  ],
  juh: [
    { name: 'Juh tej', category: 'Tejtermék', calories_per_100g: 108, protein_per_100g: 5.4, carbs_per_100g: 5.1, fat_per_100g: 7, vegetarian: true, emoji: '🥛' },
    { name: 'Juh joghurt', category: 'Tejtermék', calories_per_100g: 103, protein_per_100g: 5.5, carbs_per_100g: 5.1, fat_per_100g: 6.5, vegetarian: true, emoji: '🥛' },
    { name: 'Telemea (juh sajt)', category: 'Tejtermék', calories_per_100g: 300, protein_per_100g: 18, carbs_per_100g: 2, fat_per_100g: 25, vegetarian: true, emoji: '🧀' },
    { name: 'Urdă (juh túró)', category: 'Tejtermék', calories_per_100g: 150, protein_per_100g: 12, carbs_per_100g: 3, fat_per_100g: 10, vegetarian: true, emoji: '🧀' },
    { name: 'Juh tejföl', category: 'Tejtermék', calories_per_100g: 202, protein_per_100g: 3.2, carbs_per_100g: 4, fat_per_100g: 20, vegetarian: true, emoji: '🥛' },
    { name: 'Juh kefir', category: 'Tejtermék', calories_per_100g: 103, protein_per_100g: 5.2, carbs_per_100g: 4.8, fat_per_100g: 6.2, vegetarian: true, emoji: '🥛' },
    { name: 'Juh vaj', category: 'Tejtermék', calories_per_100g: 740, protein_per_100g: 1, carbs_per_100g: 0.1, fat_per_100g: 83, vegetarian: true, emoji: '🧈' },
    { name: 'Brânză de burduf', category: 'Tejtermék', calories_per_100g: 330, protein_per_100g: 20, carbs_per_100g: 2, fat_per_100g: 28, vegetarian: true, emoji: '🧀' },
  ],
  bivaly: [
    { name: 'Bivaly mozzarella', category: 'Tejtermék', calories_per_100g: 253, protein_per_100g: 19, carbs_per_100g: 2, fat_per_100g: 19, vegetarian: true, emoji: '🧀' },
    { name: 'Bivaly tej', category: 'Tejtermék', calories_per_100g: 117, protein_per_100g: 4.5, carbs_per_100g: 5, fat_per_100g: 8, vegetarian: true, emoji: '🥛' },
    { name: 'Bivaly joghurt', category: 'Tejtermék', calories_per_100g: 125, protein_per_100g: 5, carbs_per_100g: 5, fat_per_100g: 9, vegetarian: true, emoji: '🥛' },
    { name: 'Bivaly túró', category: 'Tejtermék', calories_per_100g: 140, protein_per_100g: 11, carbs_per_100g: 3, fat_per_100g: 9, vegetarian: true, emoji: '🧀' },
    { name: 'Bivaly kefir', category: 'Tejtermék', calories_per_100g: 117, protein_per_100g: 4.8, carbs_per_100g: 4.9, fat_per_100g: 7.5, vegetarian: true, emoji: '🥛' },
  ],
  'mandula tej': [
    { name: 'Mandula tej (natúr)', category: 'Tejtermék', calories_per_100g: 24, protein_per_100g: 0.9, carbs_per_100g: 3.1, fat_per_100g: 1.1, vegetarian: true, emoji: '🥛' },
    { name: 'Mandula joghurt', category: 'Tejtermék', calories_per_100g: 56, protein_per_100g: 1.2, carbs_per_100g: 7, fat_per_100g: 2.5, vegetarian: true, emoji: '🥛' },
  ],
  mandula: [
    { name: 'Mandula tej (natúr)', category: 'Tejtermék', calories_per_100g: 24, protein_per_100g: 0.9, carbs_per_100g: 3.1, fat_per_100g: 1.1, vegetarian: true, emoji: '🥛' },
    { name: 'Mandula joghurt', category: 'Tejtermék', calories_per_100g: 56, protein_per_100g: 1.2, carbs_per_100g: 7, fat_per_100g: 2.5, vegetarian: true, emoji: '🥛' },
    { name: 'Mandula tejszín', category: 'Zsír', calories_per_100g: 180, protein_per_100g: 1.5, carbs_per_100g: 4, fat_per_100g: 18, vegetarian: true, emoji: '🥛' },
  ],
  'zab tej': [
    { name: 'Zab tej', category: 'Tejtermék', calories_per_100g: 47, protein_per_100g: 1, carbs_per_100g: 6.6, fat_per_100g: 1.5, vegetarian: true, emoji: '🥛' },
  ],
  zab: [
    { name: 'Zab tej', category: 'Tejtermék', calories_per_100g: 47, protein_per_100g: 1, carbs_per_100g: 6.6, fat_per_100g: 1.5, vegetarian: true, emoji: '🥛' },
  ],
  'kókusz tej': [
    { name: 'Kókusz tej', category: 'Zsír', calories_per_100g: 197, protein_per_100g: 2, carbs_per_100g: 2.8, fat_per_100g: 21, vegetarian: true, emoji: '🥥' },
  ],
  kókusz: [
    { name: 'Kókusz tej', category: 'Zsír', calories_per_100g: 197, protein_per_100g: 2, carbs_per_100g: 2.8, fat_per_100g: 21, vegetarian: true, emoji: '🥥' },
    { name: 'Kókusz joghurt', category: 'Tejtermék', calories_per_100g: 88, protein_per_100g: 0.7, carbs_per_100g: 7, fat_per_100g: 6.2, vegetarian: true, emoji: '🥛' },
    { name: 'Kókusz tejszín', category: 'Zsír', calories_per_100g: 330, protein_per_100g: 3.5, carbs_per_100g: 6, fat_per_100g: 34, vegetarian: true, emoji: '🥥' },
  ],
  'rizs tej': [
    { name: 'Rizs tej', category: 'Tejtermék', calories_per_100g: 47, protein_per_100g: 0.3, carbs_per_100g: 9.2, fat_per_100g: 1, vegetarian: true, emoji: '🥛' },
  ],
  rizs: [
    { name: 'Rizs tej', category: 'Tejtermék', calories_per_100g: 47, protein_per_100g: 0.3, carbs_per_100g: 9.2, fat_per_100g: 1, vegetarian: true, emoji: '🥛' },
  ],
  'szója tej': [
    { name: 'Szója tej', category: 'Tejtermék', calories_per_100g: 33, protein_per_100g: 2.9, carbs_per_100g: 1.7, fat_per_100g: 1.8, vegetarian: true, emoji: '🥛' },
    { name: 'Szója joghurt', category: 'Tejtermék', calories_per_100g: 65, protein_per_100g: 3.8, carbs_per_100g: 5.4, fat_per_100g: 2, vegetarian: true, emoji: '🥛' },
  ],
};

// ─────────────────────────────────────────────────────────────────
// Curated alternative picker options per allergen
// Keys that start with uppercase match SEED_FOOD names directly.
// Lowercase keys map to CURATED_ALTERNATIVES entries.
// ─────────────────────────────────────────────────────────────────
const ALLERGEN_ALTERNATIVES: Record<string, Array<{ key: string; label: string; emoji: string }>> = {
  'laktóz': [
    { key: 'kecske',      label: 'Kecske termékek',  emoji: '🐐' },
    { key: 'juh',         label: 'Juh termékek',      emoji: '🐑' },
    { key: 'bivaly',      label: 'Bivaly termékek',   emoji: '🐃' },
    { key: 'mandula tej', label: 'Mandula ital',      emoji: '🥛' },
    { key: 'zab tej',     label: 'Zab ital',          emoji: '🌾' },
    { key: 'kókusz',      label: 'Kókusz ital',       emoji: '🥥' },
    { key: 'rizs tej',    label: 'Rizs ital',         emoji: '🍚' },
    { key: 'szója tej',   label: 'Szója ital',        emoji: '🫘' },
  ],
  'glutén': [
    { key: 'Rizs',          label: 'Rizs',          emoji: '🍚' },
    { key: 'Barna rizs',    label: 'Barna rizs',    emoji: '🍚' },
    { key: 'Kukorica',      label: 'Kukorica',      emoji: '🌽' },
    { key: 'Hajdina',       label: 'Hajdina',       emoji: '🌾' },
    { key: 'Quinoa',        label: 'Quinoa',        emoji: '🌾' },
    { key: 'Burgonya',      label: 'Burgonya',      emoji: '🥔' },
    { key: 'Édesburgonya',  label: 'Édesburgonya',  emoji: '🍠' },
  ],
  'tojás': [
    { key: 'Chia mag',  label: 'Chia mag',  emoji: '🌱' },
    { key: 'Lenmag',    label: 'Lenmag',    emoji: '🌱' },
    { key: 'Tofu',      label: 'Tofu',      emoji: '🫘' },
    { key: 'Banán',     label: 'Banán',     emoji: '🍌' },
    { key: 'Avokádó',   label: 'Avokádó',   emoji: '🥑' },
  ],
  'hal': [
    { key: 'Csirkemell',    label: 'Csirkemell',    emoji: '🍗' },
    { key: 'Pulykamell',    label: 'Pulykamell',    emoji: '🦃' },
    { key: 'Lencse',        label: 'Lencse',        emoji: '🫘' },
    { key: 'Csicseriborsó', label: 'Csicseriborsó', emoji: '🫘' },
    { key: 'Tofu',          label: 'Tofu',          emoji: '🫘' },
    { key: 'Tempeh',        label: 'Tempeh',        emoji: '🫘' },
  ],
  'diófélék': [
    { key: 'Tök mag',   label: 'Tökmag',        emoji: '🌱' },
    { key: 'Chia mag',  label: 'Chia mag',      emoji: '🌱' },
    { key: 'Lenmag',    label: 'Lenmag',        emoji: '🌱' },
    { key: 'Avokádó',   label: 'Avokádó',       emoji: '🥑' },
    { key: 'Olívaolaj', label: 'Olívaolaj',     emoji: '🫒' },
  ],
  'szója': [
    { key: 'Csicseriborsó', label: 'Csicseriborsó', emoji: '🫘' },
    { key: 'Lencse',        label: 'Lencse',        emoji: '🫘' },
    { key: 'Fekete bab',    label: 'Fekete bab',    emoji: '🫘' },
    { key: 'Fehér bab',     label: 'Fehér bab',     emoji: '🫘' },
    { key: 'kókusz',        label: 'Kókusz aminos', emoji: '🥥' },
  ],
  'rákféle': [
    { key: 'Csirkemell',    label: 'Csirkemell',    emoji: '🍗' },
    { key: 'Lazac',         label: 'Lazac',         emoji: '🐟' },
    { key: 'Tonhal',        label: 'Tonhal',        emoji: '🐠' },
    { key: 'Lencse',        label: 'Lencse',        emoji: '🫘' },
    { key: 'Tofu',          label: 'Tofu',          emoji: '🫘' },
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
  const sportExtra = sports.reduce((sum, s) => sum + (s.days / 7) * (s.minutes / 60) * 0.5, 0);
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

const SPORT_OPTIONS = [
  { label: 'Futás', emoji: '🏃' },
  { label: 'Edzőterem', emoji: '🏋️' },
  { label: 'Kerékpározás', emoji: '🚴' },
  { label: 'Úszás', emoji: '🏊' },
  { label: 'Jóga', emoji: '🧘' },
  { label: 'Futball', emoji: '⚽' },
  { label: 'Kosárlabda', emoji: '🏀' },
  { label: 'Tenisz', emoji: '🎾' },
  { label: 'Gyaloglás', emoji: '🚶' },
  { label: 'Más', emoji: '💪' },
];

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────

export function ProfileSetupWizard() {
  const navigate = useNavigate();
  const { setHasPlanSetup, setHasCompletedFullFlow, user } = useAuth();
  const { t, language } = useLanguage();

  const STEPS = ['Személyes adatok', 'Étkezési feltételek', 'Alapanyagok', 'Étkezések', 'Sport', 'Alvás', 'Összefoglalás'];

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Step 1: Personal
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState(28);
  const [weight, setWeight] = useState(75);
  const [height, setHeight] = useState(175);
  const [goal, setGoal] = useState<Goal>('maintain');

  // Step 2: Foods
  const [dietType, setDietType] = useState<DietType>('omnivore');
  const [foodTab, setFoodTab] = useState<FoodTabType>('Minden');
  const [foodSearch, setFoodSearch] = useState('');
  const [extraFoods, setExtraFoods] = useState<SeedFood[]>([]);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'results' | 'not_found'>('idle');
  const [lookupResults, setLookupResults] = useState<ProductResult[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set());
  const [activeAllergens, setActiveAllergens] = useState<Set<string>>(new Set());
  const [selectedAlternativeKeys, setSelectedAlternativeKeys] = useState<Set<string>>(new Set());

  // Step 3: Meals
  const [mealCount, setMealCount] = useState(3);

  // Step 4: Sport
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [sports, setSports] = useState<SportEntry[]>([]);
  const [showSportPicker, setShowSportPicker] = useState(false);

  // Step 5: Sleep
  const [wakeTime, setWakeTime] = useState('07:00');
  const [selectedCycles, setSelectedCycles] = useState(5);

  // ── Food toggle ──────────────────────────────────────────────

  const toggleFood = (name: string) => {
    setSelectedFoods(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
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
    const knownNames = new Set([...SEED_FOODS.map(f => f.name), ...extraFoods.map(f => f.name)]);
    const newFoods: SeedFood[] = [];

    keys.forEach(key => {
      // Uppercase key = matches a SEED_FOOD name directly → food already exists, no action needed
      if (key[0] === key[0].toUpperCase() && key[0] !== key[0].toLowerCase()) {
        return;
      }

      // Lowercase key = look up in CURATED_ALTERNATIVES
      const curated = CURATED_ALTERNATIVES[key] ?? [];
      curated.forEach(food => {
        if (!knownNames.has(food.name)) {
          newFoods.push(food);
          knownNames.add(food.name);
        }
      });
    });

    if (newFoods.length > 0) {
      setExtraFoods(prev => [...prev, ...newFoods]);
    }
  }, [extraFoods]);

  // ── Navigation ──────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (step === 1 && selectedAlternativeKeys.size > 0) {
      processAlternatives(selectedAlternativeKeys);
    }
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep(s => s + 1);
    }
  }, [step, selectedAlternativeKeys, processAlternatives]);

  const goPrev = useCallback(() => {
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
    if (dietType === 'vegetarian' && !f.vegetarian) return false;
    if (foodTab !== 'Minden' && f.category !== foodTab) return false;
    if (foodSearch) {
      const q = foodSearch.toLowerCase();
      if (!f.name.toLowerCase().includes(q)) return false;
    }
    if (activeAllergens.size > 0 && f.allergens) {
      if (f.allergens.some(a => activeAllergens.has(a))) return false;
    }
    return true;
  });

  const selectAllVisible = () => {
    setSelectedFoods(prev => {
      const next = new Set(prev);
      visibleFoods.forEach(f => next.add(f.name));
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
    const newFood: SeedFood = {
      name: result.name,
      category: guessCategory(result.protein, result.carbs, result.fat),
      calories_per_100g: result.calories,
      protein_per_100g: result.protein,
      carbs_per_100g: result.carbs,
      fat_per_100g: result.fat,
      vegetarian: true,
      emoji: '🛒',
    };
    setExtraFoods(prev => [...prev, newFood]);
    setSelectedFoods(prev => new Set([...prev, newFood.name]));
    setFoodSearch('');
    setLookupResults([]);
    setLookupStatus('idle');
  }, []);

  // ── Sport helpers ────────────────────────────────────────────

  const addSport = (label: string) => {
    setSports(prev => [...prev, { id: Date.now().toString(), label, days: 3, minutes: 45 }]);
    setShowSportPicker(false);
  };

  const removeSport = (id: string) => setSports(prev => prev.filter(s => s.id !== id));

  const updateSport = (id: string, field: 'days' | 'minutes', value: number) => {
    setSports(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // ── Final submit ─────────────────────────────────────────────

  const handleGenerate = async () => {
    // Usage limit check (free tier: 5 generations/day)
    if (user?.id && user.provider !== 'local' && user.provider !== 'demo') {
      const usage = await canGenerate(user.id);
      if (!usage.allowed) {
        alert(`Ma már felhasználtad a napi ${5} ingyenes generálást.\nPróbáld holnap újra, vagy válts Pro-ra.`);
        return;
      }
    }

    setIsGenerating(true);
    try {
      // 1. Save profile
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
        dietaryPreferences: dietType,
        mealSettings,
      });

      await saveMealSettings(mealSettings);

      // 2. Save selected foods to catalog (SEED_FOODS + any AI-looked-up extra foods)
      const allKnownFoods = [...SEED_FOODS, ...extraFoods];
      const foodsToSave: CreateFoodInput[] = allKnownFoods
        .filter(f => selectedFoods.has(f.name))
        .map(f => ({
          name: f.name,
          description: '',
          category: mapCategory(f.category) as any,
          calories_per_100g: f.calories_per_100g,
          protein_per_100g: f.protein_per_100g,
          carbs_per_100g: f.carbs_per_100g,
          fat_per_100g: f.fat_per_100g,
          source: 'user_uploaded' as any,
        }));
      console.log('[ProfileSetup] Saving', foodsToSave.length, 'foods to catalog');
      await createFoodsBatch(foodsToSave);
      console.log('[ProfileSetup] Foods saved OK');

      // 3. Generate meal plan (non-blocking — failure is OK)
      try {
        const ingredients = allKnownFoods
          .filter(f => selectedFoods.has(f.name))
          .map(f => ({
            name: f.name,
            calories_per_100g: f.calories_per_100g,
            protein_per_100g: f.protein_per_100g,
            carbs_per_100g: f.carbs_per_100g,
            fat_per_100g: f.fat_per_100g,
          }));

        // Map mealCount → mealModel string the API understands
        const mealModelMap: Record<number, string> = { 2: '2meals', 4: '4meals', 5: '5meals' };
        const mealModel = mealModelMap[mealCount]; // undefined → default 3 meals

        const activeAllergenList = Array.from(activeAllergens).join(', ');

        const userProfilePayload = {
          goal,
          activityLevel: activity,
          age,
          weight,
          gender,
          dietaryPreferences: dietType,
          allergies: activeAllergenList || undefined,
          mealCount,
          mealModel,
        };

        console.log('[ProfileSetup] Calling /api/generate-meal-plan with', ingredients.length, 'ingredients, target:', dailyTarget, 'mealModel:', mealModel ?? '3meals(default)');
        const abortCtrl = new AbortController();
        const timeoutId = setTimeout(() => abortCtrl.abort(), 90_000); // 90s max
        let resp: Response;
        try {
          resp = await fetch('/api/generate-meal-plan', {
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
            }),
          });
        } finally {
          clearTimeout(timeoutId);
        }

        console.log('[ProfileSetup] API response status:', resp.status);
        if (resp.ok) {
          const data = await resp.json();
          console.log('[ProfileSetup] API response keys:', Object.keys(data));
          if (data.nutritionPlan) {
            console.log('[ProfileSetup] Importing nutrition plan...');
            const { importFromAIParse, activatePlan } = await import('../../backend/services/NutritionPlanService');
            const label = `AI étrend — ${new Date().toLocaleDateString('hu-HU')}`;
            const plan = await importFromAIParse(data.nutritionPlan, label);
            await activatePlan(plan.id);
            console.log('[ProfileSetup] Nutrition plan imported and activated OK, id:', plan.id);
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

      // 6. Mark flow complete
      setHasPlanSetup(true);
      setHasCompletedFullFlow(true);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('[ProfileSetup] Error:', err);
      // Still navigate — user can fix later
      await setSetting('forceNoActivePlan', '0').catch(() => {});
      setHasPlanSetup(true);
      setHasCompletedFullFlow(true);
      navigate('/', { replace: true });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-3">
        {step > 0 && (
          <button onClick={goPrev} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>
        <span className="text-xs text-gray-400 tabular-nums w-10 text-right">
          {step + 1}/{STEPS.length}
        </span>
      </div>

      {/* Step title */}
      <div className="px-6 pb-2">
        <p className="text-xs text-primary font-medium uppercase tracking-wider">
          {STEPS[step]}
        </p>
      </div>

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
            className="px-6 pb-6"
          >
            {step === 0 && <StepPersonal gender={gender} setGender={setGender} age={age} setAge={setAge} weight={weight} setWeight={setWeight} height={height} setHeight={setHeight} goal={goal} setGoal={setGoal} />}
            {step === 1 && <StepCriteria dietType={dietType} setDietType={setDietType} activeAllergens={activeAllergens} toggleAllergen={toggleAllergen} selectedAlternativeKeys={selectedAlternativeKeys} setSelectedAlternativeKeys={setSelectedAlternativeKeys} />}
            {step === 2 && <StepFoods foodTab={foodTab} setFoodTab={setFoodTab} foodSearch={foodSearch} setFoodSearch={setFoodSearch} selectedFoods={selectedFoods} toggleFood={toggleFood} visibleFoods={visibleFoods} lookupStatus={lookupStatus} lookupResults={lookupResults} onLookupFood={handleLookupFood} onAddResult={addLookupResult} selectAllVisible={selectAllVisible} deselectAll={deselectAll} />}
            {step === 3 && <StepMeals mealCount={mealCount} setMealCount={setMealCount} />}
            {step === 4 && <StepSport activity={activity} setActivity={setActivity} sports={sports} addSport={addSport} removeSport={removeSport} updateSport={updateSport} showSportPicker={showSportPicker} setShowSportPicker={setShowSportPicker} />}
            {step === 5 && <StepSleep wakeTime={wakeTime} setWakeTime={setWakeTime} selectedCycles={selectedCycles} setSelectedCycles={setSelectedCycles} bedtimeOptions={bedtimeOptions} />}
            {step === 6 && <StepSummary dailyTarget={dailyTarget} waterLiters={waterLiters} bedtime={bedtime} sleepDuration={sleepDuration} selectedFoodsCount={selectedFoods.size} mealCount={mealCount} goal={goal} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-white px-6 pb-10 pt-3 border-t border-gray-100">
        {step < STEPS.length - 1 ? (
          <DSMButton
            onClick={goNext}
            variant="primary"
            className="w-full h-14 rounded-2xl gap-2 text-base"
          >
            {t('wizard.next')} <ChevronRight className="w-5 h-5" />
          </DSMButton>
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

  const displayValue = step < 1 ? value.toFixed(1) : String(value);
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className="bg-gray-50 rounded-2xl px-4 py-3.5">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">{label}</div>
      <div className="flex items-center gap-3">
        {/* Minus */}
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); startPress(-1); }}
          onPointerUp={stopPress}
          onPointerLeave={stopPress}
          onPointerCancel={stopPress}
          disabled={atMin}
          className={`w-[52px] h-[52px] rounded-2xl border flex items-center justify-center text-[22px] font-light select-none transition-colors shrink-0 ${
            atMin
              ? 'border-gray-200 bg-white text-gray-300 cursor-not-allowed'
              : 'border-gray-200 bg-white text-gray-700 active:bg-gray-100 shadow-sm'
          }`}
        >
          −
        </button>

        {/* Value display */}
        <div className="flex-1 text-center select-none">
          <div className="text-[36px] font-bold text-gray-900 tabular-nums leading-none tracking-tight">
            {displayValue}
          </div>
          <div className="text-[12px] text-gray-400 font-medium mt-1.5">{unit}</div>
        </div>

        {/* Plus */}
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); startPress(1); }}
          onPointerUp={stopPress}
          onPointerLeave={stopPress}
          onPointerCancel={stopPress}
          disabled={atMax}
          className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-[22px] font-light select-none transition-colors shrink-0 ${
            atMax
              ? 'bg-primary/30 text-white cursor-not-allowed'
              : 'bg-primary text-white active:opacity-80 shadow-md'
          }`}
        >
          +
        </button>
      </div>
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

      {/* Numeric fields */}
      <NumericField label={t('wizard.personal.age')} value={age} onChange={setAge} min={16} max={80} step={1} unit={t('wizard.personal.yearUnit')} />
      <NumericField label={t('wizard.personal.weight')} value={weight} onChange={setWeight} min={40} max={150} step={0.5} unit="kg" />
      <NumericField label={t('wizard.personal.height')} value={height} onChange={setHeight} min={140} max={220} step={1} unit="cm" />

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
  const ALLERGEN_LABELS = ['Laktóz', 'Glutén', 'Tojás', 'Hal', 'Diófélék', 'Szója', 'Rákféle'] as const;

  const toggleAlternative = (key: string) => {
    setSelectedAlternativeKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const activeList = ALLERGEN_LABELS.filter(l => activeAllergens.has(l.toLowerCase()));

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Étkezési feltételek</h2>
        <p className="text-sm text-gray-500">Ezek alapján rendezzük össze az alapanyaglistádat.</p>
      </div>

      {/* Diet type */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Étrend típusa</p>
        <div className="flex rounded-2xl bg-gray-100 p-1 gap-1">
          {([['omnivore', '🍖', 'Mindent eszem'], ['vegetarian', '🥦', 'Vegetáriánus']] as const).map(([val, emoji, label]) => (
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
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Allergiák & intoleranciák</p>
        <p className="text-xs text-gray-400">Érintsd meg ami vonatkozik rád — megmutatjuk mit ehetsz helyette.</p>
        <div className="flex flex-wrap gap-2">
          {ALLERGEN_LABELS.map(label => {
            const key = label.toLowerCase();
            const active = activeAllergens.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleAllergen(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  active
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-gray-50 border-border text-gray-600 hover:border-red-200'
                }`}
              >
                {active ? '🚫 ' : ''}{label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-allergen alternatives */}
      {activeList.length > 0 && (
        <div className="space-y-4">
          {activeList.map(label => {
            const key = label.toLowerCase();
            const options = ALLERGEN_ALTERNATIVES[key] ?? [];
            if (options.length === 0) return null;
            const selectedCount = options.filter(o => selectedAlternativeKeys.has(o.key)).length;
            return (
              <div key={key} className="rounded-2xl border border-border bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">
                    🚫 {label} helyett mit ehetsz?
                  </p>
                  {selectedCount > 0 && (
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {selectedCount} kiválasztva
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
                        <span>{opt.label}</span>
                        {selected && <span className="text-primary">✓</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedCount === 0 && (
                  <p className="text-xs text-gray-400 italic">Válassz legalább egyet, hogy az étrendedbe kerüljön.</p>
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

function StepFoods({ foodTab, setFoodTab, foodSearch, setFoodSearch, selectedFoods, toggleFood, visibleFoods, lookupStatus, lookupResults, onLookupFood, onAddResult, selectAllVisible, deselectAll }: {
  foodTab: FoodTabType; setFoodTab: (v: FoodTabType) => void;
  foodSearch: string; setFoodSearch: (v: string) => void;
  selectedFoods: Set<string>; toggleFood: (name: string) => void;
  visibleFoods: SeedFood[];
  lookupStatus: 'idle' | 'loading' | 'results' | 'not_found';
  lookupResults: ProductResult[];
  onLookupFood: (name: string) => void;
  onAddResult: (r: ProductResult) => void;
  selectAllVisible: () => void;
  deselectAll: () => void;
}) {
  const { t } = useLanguage();
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
            {cat}
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
              <Plus className="w-4 h-4 text-gray-300 group-hover:text-primary shrink-0 transition-colors" />
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
            Mind kijelöl
          </button>
          {selectedFoods.size > 0 && (
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs text-gray-400 font-medium hover:underline"
            >
              Töröl
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
          const selected = selectedFoods.has(food.name);
          return (
            <button
              key={food.name}
              onClick={() => toggleFood(food.name)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border-2 text-left transition-all ${
                selected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background'
              }`}
            >
              <span className="text-2xl shrink-0">{food.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-medium truncate ${selected ? 'text-primary' : 'text-gray-700'}`}>
                  {food.name}
                </p>
                <p className="text-2xs text-gray-400">{food.calories_per_100g} kcal/100g</p>
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

function StepMeals({ mealCount, setMealCount }: { mealCount: number; setMealCount: (v: number) => void }) {
  const { t } = useLanguage();
  const MEAL_OPTIONS = [
    { count: 2, label: t('wizard.meals.opt2label'), desc: t('wizard.meals.opt2desc'), emoji: '🍽️' },
    { count: 3, label: t('wizard.meals.opt3label'), desc: t('wizard.meals.opt3desc'), emoji: '🍽️🍽️' },
    { count: 4, label: t('wizard.meals.opt4label'), desc: t('wizard.meals.opt4desc'), emoji: '🍽️🍽️🍽️' },
    { count: 5, label: t('wizard.meals.opt5label'), desc: t('wizard.meals.opt5desc'), emoji: '🌟' },
  ];
  return (
    <div className="space-y-5 pt-2">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('wizard.meals.title')}</h2>
        <p className="text-sm text-gray-500">{t('wizard.meals.subtitle')}</p>
      </div>
      <div className="space-y-2.5">
        {MEAL_OPTIONS.map(opt => (
          <button
            key={opt.count}
            onClick={() => setMealCount(opt.count)}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all text-left ${
              mealCount === opt.count
                ? 'border-primary bg-primary/5'
                : 'border-border'
            }`}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${mealCount === opt.count ? 'text-primary' : 'text-gray-800'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-gray-400">{opt.desc}</p>
            </div>
            {mealCount === opt.count && <Check className="w-5 h-5 text-primary shrink-0" />}
          </button>
        ))}
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

function StepSport({ activity, setActivity, sports, addSport, removeSport, updateSport, showSportPicker, setShowSportPicker }: {
  activity: ActivityLevel; setActivity: (v: ActivityLevel) => void;
  sports: SportEntry[]; addSport: (label: string) => void; removeSport: (id: string) => void;
  updateSport: (id: string, field: 'days' | 'minutes', value: number) => void;
  showSportPicker: boolean; setShowSportPicker: (v: boolean) => void;
}) {
  const { t } = useLanguage();
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
          <button
            onClick={() => setShowSportPicker(true)}
            className="flex items-center gap-1 text-xs text-primary font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> {t('wizard.sport.addSport')}
          </button>
        </div>

        {sports.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">{t('wizard.sport.noSports')}</p>
        )}

        {sports.map(s => (
          <div key={s.id} className="bg-gray-50 rounded-2xl p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800">
                {SPORT_OPTIONS.find(o => o.label === s.label)?.emoji ?? '💪'} {s.label}
              </span>
              <button onClick={() => removeSport(s.id)} className="text-gray-400 hover:text-red-400 transition-colors">
                <Minus className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
              <div>
                <div className="flex justify-between mb-1">
                  <span>{t('wizard.sport.daysPerWeek')}</span>
                  <span className="font-semibold text-gray-700">{s.days}x</span>
                </div>
                <input type="range" min={1} max={7} value={s.days} onChange={e => updateSport(s.id, 'days', +e.target.value)} className="w-full accent-primary" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>{t('wizard.sport.minutesPer')}</span>
                  <span className="font-semibold text-gray-700">{s.minutes}p</span>
                </div>
                <input type="range" min={15} max={180} step={15} value={s.minutes} onChange={e => updateSport(s.id, 'minutes', +e.target.value)} className="w-full accent-primary" />
              </div>
            </div>
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
              <div className="grid grid-cols-2 gap-2">
                {SPORT_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => addSport(opt.label)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-700"
                  >
                    <span className="text-xl">{opt.emoji}</span> {opt.label}
                  </button>
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

function StepSummary({ dailyTarget, waterLiters, bedtime, sleepDuration, selectedFoodsCount, mealCount, goal }: {
  dailyTarget: number; waterLiters: number; bedtime: string; sleepDuration: string;
  selectedFoodsCount: number; mealCount: number; goal: Goal;
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
          <span className="font-medium text-gray-800">{t('wizard.summary.dailyMealsValue').replace('{n}', String(mealCount))}</span>
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
