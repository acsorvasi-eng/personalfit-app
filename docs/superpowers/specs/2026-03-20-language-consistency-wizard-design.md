# Language Consistency & Sport Picker Redesign — Design Spec

**Date:** 2026-03-20
**Status:** Approved

---

## Problem

`ProfileSetupWizard.tsx` renders several content areas in hardcoded Hungarian regardless of the selected language (HU/EN/RO). Affected areas:

1. `SPORT_OPTIONS` array — 10 sport labels hardcoded in Hungarian; no translation; sport picker UI is a plain 2-column card grid
2. `ALLERGEN_LABELS` array and `ALLERGEN_ALTERNATIVES` map — allergen names and their food alternatives hardcoded in Hungarian
3. `SEED_FOODS` array — ~90 food names hardcoded in Hungarian

The `t()` function in `LanguageContext` silently falls back to Hungarian when content bypasses the translation system. All three issues share the same root cause: raw string literals rendered directly as UI text with no `t()` call.

---

## Design

Three independent sub-tasks, each self-contained, executed in order.

---

### Sub-task 1: Sport Picker Redesign

**Goal:** Replace the 10-sport flat list with a ~20-sport categorised chip picker with full HU/EN/RO translations. No flags in UI.

#### Sport list and categories

| Category key | HU | EN | RO | Sports |
|---|---|---|---|---|
| `cardio` | Kardió | Cardio | Cardio | Futás, Kerékpározás, Úszás, Gyaloglás, Evezés, Ugrókötél |
| `strength` | Erő | Strength | Forță | Edzőterem, CrossFit, Calisthenics, Súlyemelés |
| `team` | Csapatsport | Team sports | Sport de echipă | Futball, Kosárlabda, Tenisz, Röplabda, Squash |
| `mindfulness` | Mindfulness | Mindfulness | Mindfulness | Jóga, Pilates, Meditáció |
| `other` | Egyéb | Other | Altele | Más |

Total: 20 sports + "Más/Other/Altele" catch-all.

#### Data structure

Replace the `SPORT_OPTIONS: { label: string, emoji: string }[]` array with:

```ts
// In ProfileSetupWizard.tsx (or extracted to a constants file if >50 lines)
const SPORT_CATEGORIES: {
  key: string;
  sports: { id: string; emoji: string; names: { hu: string; en: string; ro: string } }[];
}[] = [
  {
    key: 'cardio',
    sports: [
      { id: 'running',  emoji: '🏃', names: { hu: 'Futás',         en: 'Running',   ro: 'Alergare'    } },
      { id: 'cycling',  emoji: '🚴', names: { hu: 'Kerékpározás',  en: 'Cycling',   ro: 'Ciclism'     } },
      { id: 'swimming', emoji: '🏊', names: { hu: 'Úszás',         en: 'Swimming',  ro: 'Înot'        } },
      { id: 'walking',  emoji: '🚶', names: { hu: 'Gyaloglás',     en: 'Walking',   ro: 'Mers pe jos' } },
      { id: 'rowing',   emoji: '🚣', names: { hu: 'Evezés',        en: 'Rowing',    ro: 'Canotaj'     } },
      { id: 'jumprope', emoji: '🪢', names: { hu: 'Ugrókötél',     en: 'Jump rope', ro: 'Săritură'    } },
    ],
  },
  {
    key: 'strength',
    sports: [
      { id: 'gym',         emoji: '🏋️', names: { hu: 'Edzőterem',    en: 'Gym',          ro: 'Sală'         } },
      { id: 'crossfit',    emoji: '💥', names: { hu: 'CrossFit',      en: 'CrossFit',     ro: 'CrossFit'     } },
      { id: 'calisthenics',emoji: '🤸', names: { hu: 'Calisthenics',  en: 'Calisthenics', ro: 'Calisthenics' } },
      { id: 'weightlifting',emoji:'🏋️', names: { hu: 'Súlyemelés',    en: 'Weightlifting',ro: 'Haltere'      } },
    ],
  },
  {
    key: 'team',
    sports: [
      { id: 'football',    emoji: '⚽', names: { hu: 'Futball',     en: 'Football',    ro: 'Fotbal'    } },
      { id: 'basketball',  emoji: '🏀', names: { hu: 'Kosárlabda',  en: 'Basketball',  ro: 'Baschet'   } },
      { id: 'tennis',      emoji: '🎾', names: { hu: 'Tenisz',      en: 'Tennis',      ro: 'Tenis'     } },
      { id: 'volleyball',  emoji: '🏐', names: { hu: 'Röplabda',    en: 'Volleyball',  ro: 'Volei'     } },
      { id: 'squash',      emoji: '🎱', names: { hu: 'Squash',      en: 'Squash',      ro: 'Squash'    } },
    ],
  },
  {
    key: 'mindfulness',
    sports: [
      { id: 'yoga',       emoji: '🧘', names: { hu: 'Jóga',       en: 'Yoga',       ro: 'Yoga'      } },
      { id: 'pilates',    emoji: '🤸', names: { hu: 'Pilates',    en: 'Pilates',    ro: 'Pilates'   } },
      { id: 'meditation', emoji: '🙏', names: { hu: 'Meditáció',  en: 'Meditation', ro: 'Meditație' } },
    ],
  },
  {
    key: 'other',
    sports: [
      { id: 'other', emoji: '💪', names: { hu: 'Más', en: 'Other', ro: 'Altele' } },
    ],
  },
];
```

#### Category label translations

Add to `translations/index.ts` in all three language `wizard` blocks:

```ts
sportCategoryCardio:      'Kardió'       / 'Cardio'       / 'Cardio'
sportCategoryStrength:    'Erő'          / 'Strength'     / 'Forță'
sportCategoryTeam:        'Csapatsport'  / 'Team sports'  / 'Sport de echipă'
sportCategoryMindfulness: 'Mindfulness'  / 'Mindfulness'  / 'Mindfulness'
sportCategoryOther:       'Egyéb'        / 'Other'        / 'Altele'
```

Category key → translation key: `sportCategory` + capitalised key (e.g. `sportCategoryCardio`).

#### UI

The bottom sheet sport picker (`StepSport`) changes from a 2-column card grid to a categorised chip layout:

- Each category: small uppercase label (`t('wizard.sportCategory' + capitalise(cat.key))`), then `flex-wrap` row of chips
- Each chip: `emoji + names[language]`, rounded pill, teal selected state
- Selected sports remain stored as the sport `id` (not the label string) — this is a **breaking change** for existing saved profiles: on load, if a saved sport label doesn't match any `id`, it is preserved as-is in display but won't match the new IDs. Migration: not required (profiles in dev/test only).

#### MET map update

`src/app/utils/metHelpers.ts` contains a `MET_MAP` keyed by normalised Hungarian sport names (e.g. `futas`, `uszas`, `edzoterm`). `getMET(label)` does an accent-stripped substring match. After this change, `SportEntry` stores IDs (`'running'`, `'gym'`), so `getMET` must be updated to also accept English IDs.

Update `MET_MAP` to add English ID keys alongside existing Hungarian keys. `crossfit` already exists as a key in `MET_MAP` (value 6.0) — do **not** add a duplicate; it will already match via `getMET`. Add only the IDs that are genuinely new:

```ts
// Add alongside existing HU keys (crossfit already present — skip it):
running: 9.8, cycling: 7.5, swimming: 8.0, walking: 3.5,
rowing: 7.0, jumprope: 10.0, gym: 5.0,
calisthenics: 6.0, weightlifting: 6.0, football: 7.0,
basketball: 6.5, tennis: 7.3, volleyball: 4.0, squash: 12.0,
yoga: 2.5, pilates: 3.0, meditation: 1.5, other: 5.0,
```

This is additive — existing HU keys remain so that any previously-saved HU-label profiles still get correct MET values.

#### Saved data format

`selectedSports` state and persisted value changes from `string[]` of HU labels to `string[]` of sport IDs (`'running'`, `'gym'`, etc.). Display in the wizard badge area reads `sport.names[language]` by looking up the ID in a flat map derived from `SPORT_CATEGORIES`.

---

### Sub-task 2: Allergen Label Translations

**Goal:** `ALLERGEN_LABELS` chips and `ALLERGEN_ALTERNATIVES` labels show the correct language. No flags.

#### Current structure

```ts
const ALLERGEN_LABELS = ['Laktóz', 'Glutén', 'Tojás', 'Hal', 'Diófélék', 'Szója', 'Rákféle'] as const;
```

Labels are rendered as chip text AND used as lowercase lookup keys into `ALLERGEN_ALTERNATIVES` and `activeAllergens` Set.

#### New structure

Introduce a stable ID for each allergen and separate the display from the key:

```ts
const ALLERGENS: { id: string; emoji: string; names: { hu: string; en: string; ro: string } }[] = [
  { id: 'lactose',   emoji: '🥛', names: { hu: 'Laktóz',   en: 'Lactose',    ro: 'Lactoză'  } },
  { id: 'gluten',    emoji: '🌾', names: { hu: 'Glutén',   en: 'Gluten',     ro: 'Gluten'   } },
  { id: 'egg',       emoji: '🥚', names: { hu: 'Tojás',    en: 'Egg',        ro: 'Ouă'      } },
  { id: 'fish',      emoji: '🐟', names: { hu: 'Hal',      en: 'Fish',       ro: 'Pește'    } },
  { id: 'nuts',      emoji: '🥜', names: { hu: 'Diófélék', en: 'Nuts',       ro: 'Nuci'     } },
  { id: 'soy',       emoji: '🫘', names: { hu: 'Szója',    en: 'Soy',        ro: 'Soia'     } },
  { id: 'shellfish', emoji: '🦐', names: { hu: 'Rákféle',  en: 'Shellfish',  ro: 'Crustacee'} },
];
```

`activeAllergens` Set stores IDs (e.g. `'lactose'`), not Hungarian labels. The `ALLERGEN_ALTERNATIVES` map is rekeyed from HU label to ID.

`ALLERGEN_ALTERNATIVES` value labels (e.g. `'Kecske termékek'`) are also translated inline in the same object:

```ts
const ALLERGEN_ALTERNATIVES: Record<string, { names: { hu: string; en: string; ro: string }; emoji: string }[]> = {
  lactose: [
    { emoji: '🐐', names: { hu: 'Kecske termékek', en: 'Goat products',   ro: 'Produse caprine' } },
    // ...
  ],
  // ...
};
```

Display: `alt.names[language]`.

**Saved data migration:** `activeAllergens` is not persisted to profile (it's wizard-local state), so no migration needed.

---

### Sub-task 3: Food Name Translations (SEED_FOODS)

**Goal:** ~90 food names in the ingredient selection step show the correct language. No flags.

#### Current structure

```ts
const SEED_FOODS = [
  { name: 'Csirkemell', emoji: '🍗', category: 'Fehérje', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  // ...
];
```

#### New structure

```ts
interface SeedFood {
  id: string;
  emoji: string;
  category: 'protein' | 'carb' | 'fat' | 'dairy' | 'vegetable' | 'fruit';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  names: { hu: string; en: string; ro: string };
}
```

`category` changes from Hungarian string (`'Fehérje'`) to a stable English key (`'protein'`). The `CAT_LABELS` display lookup (already uses `t()`) is updated to match the new keys.

Display in food grid: `food.names[language]`.

`selectedFoods` is wizard session state (a `Set<string>`). Selected foods are persisted to the **food catalog** via `createFoodsBatch` (not stored in the user profile record). After this change, `selectedFoods` stores food IDs instead of Hungarian names.

**Important:** The food catalog `name` field (used downstream in meal-plan AI prompts) must remain a human-readable string. When building the batch entry, write `food.names.en` (English name) as the catalog `name` — not the bare ID. The AI prompt receives ingredient names and English is universally understood. The `id` field is used only for internal `selectedFoods` Set membership checks.

Since the food catalog is rebuilt on each wizard completion, no migration is needed.

---

## Architecture Notes

- All three sub-tasks modify `ProfileSetupWizard.tsx` — they should be executed sequentially, not in parallel, to avoid merge conflicts.
- No new files are needed unless `SPORT_CATEGORIES` or `SEED_FOODS` array exceeds ~80 lines; in that case extract to `src/app/data/sports.ts` and `src/app/data/foods.ts`.
- Translation additions go to `src/app/translations/index.ts` (nested, used by wizard via `t()`). The flat locale files (`src/i18n/locales/*.ts`) are NOT touched — they serve navigation/meal/onboarding keys, not wizard content.
- No flags anywhere in the UI — language display relies solely on text.

---

## Success Criteria

- Romanian UI shows Romanian sport names, allergen names, and food names
- English UI shows English equivalents
- Hungarian UI unchanged from current behaviour
- Wizard completes and saves correctly with new ID-based storage
- All existing tests pass; new tests cover the locale lookup helpers
