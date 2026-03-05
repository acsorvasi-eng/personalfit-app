# Data layer reference

Single reference for IndexedDB stores used by PersonalFit. Schema is defined in `src/app/backend/db.ts`; all entity CRUD goes through `getDB()` / the idb adapter.

## Stores, key paths, and indexes

| Store | Key path | Indexes |
|-------|----------|---------|
| **foods** | `id` | by-category, by-source, by-name, by-favorite, by-search |
| **nutrition_plans** | `id` | by-active, by-version |
| **meal_days** | `id` | by-plan, by-plan-week, by-plan-week-day |
| **meals** | `id` | by-meal-day, by-plan, by-type |
| **meal_items** | `id` | by-meal, by-food |
| **shopping_list** | `id` | by-plan, by-week, by-food, by-checked |
| **activity_logs** | `id` | by-date, by-type, by-date-type |
| **training_plans** | `id` | by-active, by-version |
| **training_plan_days** | `id` | by-plan, by-plan-week, by-plan-week-day |
| **measurements** | `id` | by-date, by-version |
| **versions** | `id` | by-entity-type, by-entity-id, by-active, by-type-active |
| **user_profile** | `id` | (none) |
| **weight_history** | `id` | by-date |
| **daily_history** | `date` | by-date |

Composite index key paths:

- **meal_days**: `by-plan-week` → `['nutrition_plan_id', 'week']`; `by-plan-week-day` → `['nutrition_plan_id', 'week', 'day']`
- **training_plan_days**: same pattern with `training_plan_id`
- **activity_logs**: `by-date-type` → `['date', 'activity_type']`
- **versions**: `by-type-active` → `['entity_type', 'is_active']`

Source: `src/app/backend/db.ts` (`STORE_SCHEMAS`). The database name and version are defined in the same file (`DB_NAME`, `DB_VERSION`); bump the version when changing store schemas.
