/**
 * ====================================================================
 * Backend Entity Models
 * ====================================================================
 * All type definitions for the structured data layer.
 * These models define the IndexedDB schema and serve as the
 * single source of truth for all data entities in the app.
 *
 * Conventions:
 *   - All IDs are UUID v4 strings (generated via crypto.randomUUID())
 *   - All dates stored as ISO 8601 strings
 *   - All macros normalized per 100g
 *   - All quantities in grams unless otherwise stated
 *   - Hungarian language enum values preserved from UI
 */

// ═══════════════════════════════════════════════════════════════
// 1. FOOD CATALOG
// ═══════════════════════════════════════════════════════════════

export const FOOD_CATEGORIES = [
  'Feherje',
  'Tejtermek',
  'Komplex_szenhidrat',
  'Egeszseges_zsir',
  'Huvelyes',
  'Mag',
  'Zoldseg',
  'Tojas',
] as const;

export type FoodCategory = typeof FOOD_CATEGORIES[number];

/** Display names for categories (Hungarian) */
export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  Feherje: 'Feherje',
  Tejtermek: 'Tejtermek',
  Komplex_szenhidrat: 'Komplex szenhidrat',
  Egeszseges_zsir: 'Egeszseges zsir',
  Huvelyes: 'Huvelyes',
  Mag: 'Mag',
  Zoldseg: 'Zoldseg',
  Tojas: 'Tojas',
};

export type FoodSource = 'system' | 'user_uploaded' | 'ai_generated';

export interface FoodEntity {
  id: string;
  name: string;
  description: string;
  category: FoodCategory;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  source: FoodSource;
  is_favorite: boolean;
  benefits: string[];
  suitable_for: string[];
  /** System-locked foods cannot be edited or deleted */
  is_system_locked: boolean;
  /** Search-optimized lowercase name + aliases */
  search_index: string;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 2. NUTRITION PLAN
// ═══════════════════════════════════════════════════════════════

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'post_workout';

export interface NutritionPlanEntity {
  id: string;
  version: number;
  is_active: boolean;
  upload_date: string;
  source: 'predefined' | 'user_upload' | 'ai_generated';
  label: string;
  total_weeks: number;
  created_at: string;
  updated_at: string;
}

export interface MealDayEntity {
  id: string;
  nutrition_plan_id: string;
  week: number;            // 1-4
  day: number;             // 1-7 (Mon-Sun)
  day_label: string;       // "Edzesnap" | "Pihenonap"
  is_training_day: boolean;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  created_at: string;
}

export interface MealEntity {
  id: string;
  meal_day_id: string;
  nutrition_plan_id: string;
  meal_type: MealType;
  name: string;
  description: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  /** Whether this is the primary option or an alternative */
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface MealItemEntity {
  id: string;
  meal_id: string;
  food_id: string;          // FK to FoodEntity
  food_name: string;        // Denormalized for display performance
  quantity_grams: number;
  unit: 'g' | 'ml' | 'db';
  calculated_calories: number;
  calculated_protein: number;
  calculated_carbs: number;
  calculated_fat: number;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 3. SHOPPING LIST
// ═══════════════════════════════════════════════════════════════

export interface ShoppingListItemEntity {
  id: string;
  food_id: string;
  food_name: string;        // Denormalized for display
  nutrition_plan_id: string;
  total_quantity_grams: number;
  week: number;
  unit: 'g' | 'ml' | 'db';
  is_checked: boolean;
  /** Product match from store database (optional) */
  matched_product_id?: string;
  estimated_price_ron?: number;
  store_name?: string;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 4. ACTIVITY & SPORTS
// ═══════════════════════════════════════════════════════════════

export type ActivityIntensity = 'light' | 'moderate' | 'intense';

export interface ActivityLogEntity {
  id: string;
  date: string;            // YYYY-MM-DD
  activity_type: string;
  activity_name: string;
  activity_icon: string;
  category: string;
  duration_minutes: number;
  intensity: ActivityIntensity;
  calories_burned: number;
  steps?: number;
  source: 'manual' | 'synced';
  synced_from?: string;     // e.g. "Polar", "Garmin"
  created_at: string;
}

export interface TrainingPlanEntity {
  id: string;
  version: number;
  is_active: boolean;
  label: string;
  source: 'predefined' | 'user_upload' | 'ai_generated';
  created_at: string;
  updated_at: string;
}

export interface TrainingPlanDayEntity {
  id: string;
  training_plan_id: string;
  week: number;
  day: number;
  planned_activity: string;
  planned_duration_minutes: number;
  estimated_calories: number;
  intensity: ActivityIntensity;
  notes: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 5. DYNAMIC CALORIE SYSTEM
// ═══════════════════════════════════════════════════════════════

export interface DailyCalorieBudget {
  date: string;                // YYYY-MM-DD
  base_calorie_need: number;   // BMR * activity factor
  calories_consumed: number;
  calories_burned_activity: number;
  calories_burned_scheduled: number; // From training plan
  net_balance: number;         // consumed - (burned_activity + burned_scheduled)
  energy_balance: number;      // consumed - base_need + net_balance
  target_calories: number;
  remaining: number;
  percentage: number;
  updated_at: string;
}

export interface EnergyBalanceSnapshot {
  date: string;
  consumed: number;
  burned: number;
  net: number;
  deficit_surplus: number;
}

// ═══════════════════════════════════════════════════════════════
// 6. MEASUREMENTS (TIME SERIES)
// ═══════════════════════════════════════════════════════════════

export interface MeasurementEntity {
  id: string;
  date: string;            // YYYY-MM-DD
  weight?: number;         // kg
  body_fat?: number;       // percentage
  waist?: number;          // cm
  chest?: number;          // cm
  arm?: number;            // cm
  hip?: number;            // cm
  thigh?: number;          // cm
  neck?: number;           // cm
  notes: string;
  /** Measurement set version (each upload = new version) */
  version: number;
  source: 'manual' | 'user_upload' | 'ai_extracted';
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 7. VERSION CONTROL
// ═══════════════════════════════════════════════════════════════

export type VersionableEntityType =
  | 'NutritionPlan'
  | 'TrainingPlan'
  | 'MeasurementProfile';

export interface VersionRecord {
  id: string;
  entity_type: VersionableEntityType;
  entity_id: string;
  version: number;
  is_active: boolean;
  label: string;
  snapshot_date: string;
  metadata: Record<string, any>;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 8. USER PROFILE
// ═══════════════════════════════════════════════════════════════

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
export type Gender = 'male' | 'female';
export type GoalType = 'weight_loss' | 'maintenance' | 'muscle_gain';

export interface UserProfileEntity {
  id: string;
  name: string;
  age: number;
  weight: number;          // kg
  height: number;          // cm
  gender: Gender;
  blood_pressure: string;
  activity_level: ActivityLevel;
  goal: GoalType;
  allergies: string[];
  dietary_preferences: string[];
  calorie_target?: number;
  avatar: string;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 9. AI PARSER OUTPUT
// ═══════════════════════════════════════════════════════════════

export interface AIParseResult {
  id: string;
  source_type: 'nutrition_plan' | 'training_plan' | 'measurements';
  source_format: 'pdf' | 'word' | 'image' | 'text';
  raw_text?: string;
  structured_data: any;     // Typed downstream per source_type
  confidence: number;       // 0-1
  warnings: string[];
  parsed_at: string;
}

export interface AIParsedMeal {
  meal_type: MealType;
  name: string;
  ingredients: Array<{
    name: string;
    quantity_grams: number;
    unit: 'g' | 'ml' | 'db';
    matched_food_id?: string;
    /** Estimated nutritional values per 100g (from knowledge base or parser) */
    estimated_calories_per_100g?: number;
    estimated_protein_per_100g?: number;
    estimated_carbs_per_100g?: number;
    estimated_fat_per_100g?: number;
    estimated_category?: string;
  }>;
  total_calories?: number;
  total_protein?: number;
  total_carbs?: number;
  total_fat?: number;
}

export interface AIParsedDay {
  week: number;
  day: number;
  day_label: string;
  is_training_day: boolean;
  meals: AIParsedMeal[];
}

export interface AIParsedNutritionPlan {
  weeks: AIParsedDay[][];
  detected_weeks: number;
  detected_days_per_week: number;
}

export interface AIParsedMeasurement {
  date: string;
  weight?: number;
  body_fat?: number;
  waist?: number;
  chest?: number;
  arm?: number;
  hip?: number;
  thigh?: number;
  neck?: number;
  notes: string;
}

export interface AIParsedTrainingDay {
  week: number;
  day: number;
  activity: string;
  duration_minutes: number;
  intensity: ActivityIntensity;
  estimated_calories: number;
  notes: string;
}

// ═══════════════════════════════════════════════════════════════
// 9b. BODY COMPOSITION & GMON MODELS
// ═══════════════════════════════════════════════════════════════

export interface SegmentalAnalysis {
  right_arm_fat?: number;
  left_arm_fat?: number;
  right_leg_fat?: number;
  left_leg_fat?: number;
  trunk_fat?: number;
  right_arm_muscle?: number;
  left_arm_muscle?: number;
  right_leg_muscle?: number;
  left_leg_muscle?: number;
  trunk_muscle?: number;
}

export interface GmonMetrics {
  /** Basal metabolic rate from GMON */
  metabolism_rate?: number;
  /** Organ health scores (0-100) */
  liver_score?: number;
  kidney_score?: number;
  heart_score?: number;
  lung_score?: number;
  /** Total body water percentage */
  total_body_water?: number;
  /** Intracellular water percentage */
  intracellular_water?: number;
  /** Extracellular water percentage */
  extracellular_water?: number;
  /** Phase angle (cell health indicator) */
  phase_angle?: number;
  /** Bone mineral content (kg) */
  bone_mineral_content?: number;
  /** Skeletal muscle index */
  skeletal_muscle_index?: number;
}

export interface BodyCompositionEntity {
  id: string;
  date: string;
  source_type: 'body_composition' | 'gmon';
  source_format: 'pdf' | 'word' | 'image' | 'text';
  /** Core metrics */
  weight?: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  bmi?: number;
  visceral_fat_level?: number;
  /** Segmental breakdown (if present) */
  segmental?: SegmentalAnalysis;
  /** GMON-specific metrics */
  gmon?: GmonMetrics;
  /** Raw notes / comments */
  notes: string;
  /** Version for multi-upload tracking */
  version: number;
  confidence: number;
  created_at: string;
}

export interface AIParsedBodyComposition {
  weight?: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  bmi?: number;
  visceral_fat_level?: number;
  segmental?: SegmentalAnalysis;
  gmon?: GmonMetrics;
  /** Additional measurement data to merge into Measurements table */
  measurement_overrides?: Partial<AIParsedMeasurement>;
}

// ═══════════════════════════════════════════════════════════════
// 10. DAILY HISTORY (EXISTING COMPAT)
// ═══════════════════════════════════════════════════════════════

export interface DailyHistoryEntity {
  date: string;            // YYYY-MM-DD (primary key)
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals_logged: number;
  meals: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    image: string;
    timestamp: number;
  }>;
  workout_calories: number;
  workout_duration: number;
  workout_entries: Array<{
    name: string;
    calories: number;
    duration: number;
    icon: string;
  }>;
  scheduled_meals_checked: number;
  water_intake: number;    // ml
}

// ═══════════════════════════════════════════════════════════════
// 11. MEAL CARD UI SCHEMA — LOCKED DESIGN CONTRACT
// ═══════════════════════════════════════════════════════════════
//
// This schema defines the canonical MealCard visual contract.
// Any component rendering meal cards MUST conform to this spec.
// DO NOT modify without explicit stakeholder approval.
//
// Revision: v1.0 — 2026-02-24 (locked)
// ═══════════════════════════════════════════════════════════════

/**
 * Canonical MealCard layout variants.
 * - 'compact': Default collapsed state — icon + title + time only.
 *   No inline meal details, no ingredients, no calorie badge.
 *   Tap opens a detail bottom sheet (MealDetailSheet).
 * - 'active': Same as compact but with blue tint + ring for the
 *   current eating window meal.
 * - 'consumed': Green check icon replaces emoji, strike-through title.
 */
export type MealCardVariant = 'compact' | 'active' | 'consumed';

/**
 * Locked design spec for MealCard — DO NOT CHANGE.
 *
 * This constant is the single source of truth for the card's
 * visual structure. The component must render exactly:
 *   Row: [EmojiIcon 40×40 rounded-2xl] [Title bold + Time with Clock icon]
 *   No inline meal details / ingredients / calorie badges on the card surface.
 *   Detail is only shown in the MealDetailSheet bottom sheet on tap.
 */
export const MEAL_CARD_DESIGN_CONTRACT = {
  version: '1.0',
  locked: true,
  layout: {
    type: 'single-row',
    padding: 'px-4 py-3.5',
    borderRadius: 'rounded-2xl',
    gap: 'gap-3',
  },
  icon: {
    size: 'w-10 h-10',
    shape: 'rounded-2xl',
    defaultBg: 'bg-gradient-to-br from-amber-50 to-amber-100',
    activeBg: 'bg-gradient-to-br from-blue-100 to-blue-200',
    consumedBg: 'bg-green-500',
  },
  title: {
    size: 'text-[15px]',
    weight: 'font-bold',
    defaultColor: 'text-gray-900',
    activeColor: 'text-blue-700',
    consumedColor: 'text-green-700 line-through',
  },
  time: {
    size: 'text-[12px]',
    color: 'text-gray-400',
    clockIcon: 'w-3 h-3',
  },
  variants: {
    compact: {
      bg: 'bg-white',
      border: 'border border-gray-100/60',
      shadow: 'shadow-sm',
    },
    active: {
      bg: 'bg-blue-50/60',
      border: 'ring-2 ring-blue-300/50',
      shadow: 'shadow-lg',
    },
    consumed: {
      bg: 'bg-white',
      border: 'border border-green-200/60',
      shadow: 'shadow-sm',
      opacity: 'opacity-70',
    },
  },
  interaction: {
    tap: 'Opens MealDetailSheet bottom sheet',
    longPress: 'N/A',
    inlineDetails: false,   // ← KEY: NO inline meal info on card
    inlineCalories: false,  // ← KEY: NO calorie badge on card
    inlineIngredients: false,
  },
} as const;

/** Meal time windows — canonical schedule */
export const MEAL_TIME_WINDOWS = {
  breakfast: { start: '06:00', end: '08:00', icon: '🌅' },
  lunch:     { start: '12:30', end: '13:30', icon: '☀️' },
  dinner:    { start: '17:30', end: '18:30', icon: '🌙' },
  snack:     { start: '10:00', end: '10:30', icon: '🥜' },
  post_workout: { start: '16:00', end: '16:30', icon: '💪' },
} as const;