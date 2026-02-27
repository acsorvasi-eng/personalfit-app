/**
 * ====================================================================
 * Backend Module - Barrel Export
 * ====================================================================
 * Central export point for all backend services.
 *
 * ARCHITECTURE OVERVIEW:
 *
 * ┌─────────────────────────────────────────────────────┐
 * │                    UI LAYER                          │
 * │  (React Components — unchanged navigation & UI)      │
 * └──────────────┬──────────────────────────────────────┘
 *                │
 * ┌──────────────▼──────────────────────────────────────┐
 * │              SERVICE LAYER                           │
 * │                                                      │
 * │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
 * │  │ FoodCatalog  │  │NutritionPlan │  │ Shopping   │ │
 * │  │ Service      │  │  Service     │  │ Service    │ │
 * │  └──────┬───────┘  └──────┬───────┘  └──────┬─────┘ │
 * │  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴─────┐ │
 * │  │ Activity     │  │ Calorie      │  │ Measure-   │ │
 * │  │ Service      │  │ Engine       │  │ ment Svc   │ │
 * │  └──────┬───────┘  └──────┬───────┘  └──────┬─────┘ │
 * │  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴─────┐ │
 * │  │ Version      │  │ AI Parser    │  │ Security   │ │
 * │  │ Control      │  │ Service      │  │ Service    │ │
 * │  └──────┬───────┘  └──────┬───────┘  └──────┬─────┘ │
 * │  ┌──────┴───────┐                                    │
 * │  │ Reset        │                                    │
 * │  │ Service      │                                    │
 * │  └──────────────┘                                    │
 * └──────────────┬──────────────────────────────────────┘
 *                │
 * ┌──────────────▼──────────────────────────────────────┐
 * │              DATABASE LAYER (IndexedDB)              │
 * │                                                      │
 * │  foods | nutrition_plans | meal_days | meals          │
 * │  meal_items | shopping_list | activity_logs           │
 * │  training_plans | training_plan_days | measurements   │
 * │  versions | user_profile | daily_history              │
 * │                                                      │
 * │  + BroadcastChannel for cross-tab sync               │
 * │  + localStorage for lightweight config               │
 * └─────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 *   1. User uploads document → AIParserService
 *   2. Parser extracts structured data → FoodCatalogService (new foods)
 *   3. Structured plan → NutritionPlanService + VersionControlService
 *   4. Active plan → ShoppingListService (auto-generation)
 *   5. User logs activity → ActivityService
 *   6. CalorieEngine reads from: profile + consumed + activity + training plan
 *   7. CalorieEngine outputs: budget, remaining, balance → UI
 *   8. MeasurementService: append-only time series → progress calculations
 *
 * PERFORMANCE OPTIMIZATION:
 *   - Indexed queries for category/date/type filtering
 *   - Denormalized food_name on MealItem/ShoppingItem (avoid joins)
 *   - Batch operations in transactions
 *   - BroadcastChannel for cross-tab reactivity (no polling)
 *   - Macro aggregation computed on write (not read)
 */

// ─── Database Layer ───
export {
  getDB,
  generateId,
  nowISO,
  todayDate,
  destroyDatabase,
  onDBChange,
  notifyDBChange,
  getDBChannel,
  DB_NAME,
  DB_VERSION,
} from './db';

// ─── Entity Models ───
export type {
  FoodEntity,
  FoodCategory,
  FoodSource,
  NutritionPlanEntity,
  MealDayEntity,
  MealEntity,
  MealItemEntity,
  MealType,
  ShoppingListItemEntity,
  ActivityLogEntity,
  ActivityIntensity,
  TrainingPlanEntity,
  TrainingPlanDayEntity,
  DailyCalorieBudget,
  EnergyBalanceSnapshot,
  MeasurementEntity,
  VersionRecord,
  VersionableEntityType,
  UserProfileEntity,
  ActivityLevel,
  Gender,
  GoalType,
  DailyHistoryEntity,
  AIParseResult,
  AIParsedNutritionPlan,
  AIParsedDay,
  AIParsedMeal,
  AIParsedMeasurement,
  AIParsedTrainingDay,
  BodyCompositionEntity,
  AIParsedBodyComposition,
  SegmentalAnalysis,
  GmonMetrics,
} from './models';

export { FOOD_CATEGORIES, FOOD_CATEGORY_LABELS } from './models';

// ─── Services ───
export * as FoodCatalog from './services/FoodCatalogService';
export * as NutritionPlan from './services/NutritionPlanService';
export * as ShoppingList from './services/ShoppingListService';
export * as Activity from './services/ActivityService';
export * as CalorieEngine from './services/CalorieEngineService';
export * as Measurement from './services/MeasurementService';
export * as VersionControl from './services/VersionControlService';
export * as Reset from './services/ResetService';
export * as AIParser from './services/AIParserService';
export * as Security from './services/SecurityService';

// ─── Seed ───
export { seedDatabase, seedFoods } from './seed';