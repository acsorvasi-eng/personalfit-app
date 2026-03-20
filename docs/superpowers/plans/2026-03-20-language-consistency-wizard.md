# Language Consistency & Sport Picker Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ProfileSetupWizard render sports, allergens, and food names in the user's selected language (HU/EN/RO), and redesign the sport picker to use categorised chips with ~20 sports.

**Architecture:** Four sequential tasks, all modifying `ProfileSetupWizard.tsx`. Task 1 updates `metHelpers.ts` (MET_MAP). Task 2 replaces the 10-sport flat array with a categorised structure and redesigns the bottom sheet UI. Task 3 replaces the Hungarian allergen label array with an ID-based multilingual structure. Task 4 replaces the 100-item Hungarian-only `SEED_FOODS` array with a multilingual version.

**Tech Stack:** React 18, TypeScript, Vite, existing `useLanguage()` hook (returns `language: 'hu'|'en'|'ro'`), `src/app/translations/index.ts` (nested, wizard keys), Vitest for tests.

---

## File Map

| File | Change |
|------|--------|
| `PersonalFit/src/app/utils/metHelpers.ts` | Add English sport ID keys to `MET_MAP` |
| `PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx` | Replace SPORT_OPTIONS → SPORT_CATEGORIES; replace ALLERGEN_LABELS → ALLERGENS; replace SEED_FOODS with multilingual version; update all rendering |
| `PersonalFit/src/app/translations/index.ts` | Add 5 sport category label keys to HU/EN/RO wizard blocks |
| `PersonalFit/src/app/utils/buildIngredientSelection.test.ts` | Add tests for sport locale lookup helper |

---

## Task 1: Add English sport IDs to MET_MAP

**Files:**
- Modify: `PersonalFit/src/app/utils/metHelpers.ts`
- Test: `PersonalFit/src/app/utils/buildIngredientSelection.test.ts`

### Context

`metHelpers.ts` currently has:
```ts
export const MET_MAP: Record<string, number> = {
  futas: 10, edzoterm: 6, crossfit: 6, kerekparozas: 8, uszas: 7,
  joga: 3, futball: 9, kosarlabda: 8, basketball: 8, tenisz: 8, gyaloglas: 3.5,
};
export function getMET(label: string): number {
  const key = normAccent(label);
  return Object.entries(MET_MAP).find(([k]) => key.includes(k))?.[1] ?? 6;
}
```

After Task 2, `SportEntry.label` will become a sport ID like `'running'`, `'gym'`. `getMET(s.id)` must return the correct value. `crossfit` already exists as a key — do NOT add a duplicate.

- [ ] **Step 1: Add failing test**

Add to `PersonalFit/src/app/utils/buildIngredientSelection.test.ts`:

```ts
import { getMET } from '../metHelpers';

describe('getMET with English sport IDs', () => {
  it('returns correct MET for English IDs', () => {
    expect(getMET('running')).toBeGreaterThan(5);
    expect(getMET('gym')).toBeGreaterThan(4);
    expect(getMET('yoga')).toBeLessThan(4);
    expect(getMET('swimming')).toBeGreaterThan(5);
    expect(getMET('cycling')).toBeGreaterThan(5);
  });

  it('returns default 6 for unknown sport', () => {
    expect(getMET('unknownsport123')).toBe(6);
  });
});
```

- [ ] **Step 2: Run test — should FAIL for `getMET('running')`, `getMET('gym')` etc.**

```bash
cd PersonalFit && npx vitest run --reporter=verbose 2>&1 | tail -15
```
Expected: new tests FAIL (running/gym/yoga return default 6).

- [ ] **Step 3: Update `MET_MAP` in `metHelpers.ts`**

Add English ID keys alongside existing HU keys. Rules:
- Do NOT add `crossfit` — already present with value 6
- Do NOT add `basketball` as a new EN key — it already exists as a HU key (value 8). The EN sport ID `basketball` will match the existing `basketball: 8` entry. The spec's code sample shows `basketball: 6.5` but the spec text says "Add only the IDs that are genuinely new" — `basketball` is not new. Adding a duplicate would silently overwrite the existing value. Keep existing `basketball: 8`.
- `tenisz` (HU) and `tennis` (EN) are different strings — both can coexist

```ts
export const MET_MAP: Record<string, number> = {
  // HU keys (preserved for backward compat with old saved profiles)
  futas: 10, edzoterm: 6, crossfit: 6, kerekparozas: 8, uszas: 7,
  joga: 3, futball: 9, kosarlabda: 8, basketball: 8, tenisz: 8, gyaloglas: 3.5,
  // English ID keys (new — crossfit already above; basketball already above)
  running: 9.8, cycling: 7.5, swimming: 8.0, walking: 3.5,
  rowing: 7.0, jumprope: 10.0, gym: 5.0,
  calisthenics: 6.0, weightlifting: 6.0, football: 7.0,
  tennis: 7.3, volleyball: 4.0, squash: 12.0,
  yoga: 2.5, pilates: 3.0, meditation: 1.5, other: 5.0,
};
```

- [ ] **Step 4: Run tests — all should PASS**

```bash
cd PersonalFit && npx vitest run --reporter=verbose 2>&1 | tail -15
```
Expected: all tests PASS (14+ tests).

- [ ] **Step 5: Commit**

```bash
git add PersonalFit/src/app/utils/metHelpers.ts PersonalFit/src/app/utils/buildIngredientSelection.test.ts
git commit -m "feat: add English sport ID keys to MET_MAP"
```

---

## Task 2: Sport picker redesign — categories, translations, chip UI

**Files:**
- Modify: `PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx` (lines 391–402, 1619–1671, 1676–1708)
- Modify: `PersonalFit/src/app/translations/index.ts`

### Context

`SportEntry` interface (lines 56–61) currently:
```ts
interface SportEntry { id: string; label: string; days: number[]; minutes: number; }
```

`addSport(label)` creates a new `SportEntry` with `label` set to the Hungarian sport name. After this task, `label` will be the sport's **display name in the current language**, and we add a new field `sportId` for the stable ID used in `getMET`.

Actually, simpler: keep `label` for display but add `sportId: string` to `SportEntry`. Then `getMET(s.sportId)` replaces `getMET(s.label)`. Display uses `label` (set at add-time to `sport.names[language]`).

Wait — if `label` is set at add-time in the current language, it's frozen in that language. Better approach: store the `sportId` only, and derive the display name from `SPORT_CATEGORIES` at render time. This keeps display always in sync with current language.

**Final approach:**
- `SportEntry` stores `sportId: string` (instead of `label: string`)
- Remove `label` from `SportEntry`
- Display in badge: look up `SPORT_CATEGORIES` flat map by `sportId` → `sport.names[language]`
- `getMET(s.sportId)` replaces `getMET(s.label)`

The `id` field in `SportEntry` is already a UUID (random, used for React keys and removal). Keep it. Add `sportId: string` field.

- [ ] **Step 1: Add sport category translation keys to `translations/index.ts`**

Find the HU `wizard:` block (around line 507 area, look for `wizard:` → `sport:` nested object). Add 5 keys after the existing sport keys:

```ts
// HU wizard.sport block — add:
sportCategoryCardio: 'Kardió',
sportCategoryStrength: 'Erő',
sportCategoryTeam: 'Csapatsport',
sportCategoryMindfulness: 'Mindfulness',
sportCategoryOther: 'Egyéb',
```

Find the EN `wizard:` block (around line 2032) and add:
```ts
sportCategoryCardio: 'Cardio',
sportCategoryStrength: 'Strength',
sportCategoryTeam: 'Team sports',
sportCategoryMindfulness: 'Mindfulness',
sportCategoryOther: 'Other',
```

Find the RO `wizard:` block (around line 3483) and add:
```ts
sportCategoryCardio: 'Cardio',
sportCategoryStrength: 'Forță',
sportCategoryTeam: 'Sport de echipă',
sportCategoryMindfulness: 'Mindfulness',
sportCategoryOther: 'Altele',
```

- [ ] **Step 2: Verify build passes**

```bash
cd PersonalFit && npm run build 2>&1 | tail -5
```
Expected: `✓ built in X.Xs`

- [ ] **Step 3: Replace `SPORT_OPTIONS` with `SPORT_CATEGORIES` in ProfileSetupWizard.tsx**

Remove lines 391–402 (`const SPORT_OPTIONS = [...]`) and replace with:

```ts
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
      { id: 'gym',          emoji: '🏋️', names: { hu: 'Edzőterem',   en: 'Gym',          ro: 'Sală'         } },
      { id: 'crossfit',     emoji: '💥',  names: { hu: 'CrossFit',    en: 'CrossFit',     ro: 'CrossFit'     } },
      { id: 'calisthenics', emoji: '🤸',  names: { hu: 'Calisthenics',en: 'Calisthenics', ro: 'Calisthenics' } },
      { id: 'weightlifting',emoji: '🏋️', names: { hu: 'Súlyemelés',  en: 'Weightlifting',ro: 'Haltere'      } },
    ],
  },
  {
    key: 'team',
    sports: [
      { id: 'football',   emoji: '⚽', names: { hu: 'Futball',    en: 'Football',   ro: 'Fotbal'         } },
      { id: 'basketball', emoji: '🏀', names: { hu: 'Kosárlabda', en: 'Basketball', ro: 'Baschet'        } },
      { id: 'tennis',     emoji: '🎾', names: { hu: 'Tenisz',     en: 'Tennis',     ro: 'Tenis'          } },
      { id: 'volleyball', emoji: '🏐', names: { hu: 'Röplabda',   en: 'Volleyball', ro: 'Volei'          } },
      { id: 'squash',     emoji: '🎱', names: { hu: 'Squash',     en: 'Squash',     ro: 'Squash'         } },
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
```

- [ ] **Step 4: Update `SportEntry` interface and `addSport` function**

Change `SportEntry` (lines 56–61):
```ts
interface SportEntry {
  id: string;      // UUID for React key / removal
  sportId: string; // stable sport identifier (e.g. 'running', 'gym')
  days: number[];
  minutes: number;
}
```

Find `addSport` function (somewhere around line 560–580 — search for `addSport`). It currently does `setSports(prev => [...prev, { id: uuid(), label, days: [], minutes: 45 }])`. Update to:
```ts
const addSport = (sportId: string) => {
  if (sports.some(s => s.sportId === sportId)) return; // prevent duplicates
  setSports(prev => [...prev, { id: crypto.randomUUID(), sportId, days: [], minutes: 45 }]);
  setShowSportPicker(false);
};
```

- [ ] **Step 5: Update sport badge display (lines ~1619–1671)**

Replace the badge header line:
```tsx
// OLD:
{SPORT_OPTIONS.find(o => o.label === s.label)?.emoji ?? '💪'} {s.label}
// NEW:
{SPORT_BY_ID[s.sportId]?.emoji ?? '💪'} {SPORT_BY_ID[s.sportId]?.names[language] ?? s.sportId}
```

Replace the calorie burn estimate line:
```tsx
// OLD:
Math.round(getMET(s.label) * weightKg * (s.minutes / 60))
// NEW:
Math.round(getMET(s.sportId) * weightKg * (s.minutes / 60))
```

- [ ] **Step 6: Replace sport picker bottom sheet UI (lines ~1676–1708)**

Replace the entire `{showSportPicker && (...)}` motion div content. Keep the overlay and spring animation wrappers. Replace the grid inside with categorised chips:

```tsx
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
```

- [ ] **Step 7: Build and verify no TypeScript errors**

```bash
cd PersonalFit && npm run build 2>&1 | tail -8
```
Expected: `✓ built in X.Xs`

- [ ] **Step 8: Commit**

```bash
git add PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx PersonalFit/src/app/translations/index.ts
git commit -m "feat: redesign sport picker — categorised chips, 20 sports, HU/EN/RO"
```

---

## Task 3: Allergen label translations

**Files:**
- Modify: `PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx` (lines ~291–347, ~1184, ~1227–1296)

### Context

Currently `ALLERGEN_LABELS = ['Laktóz', 'Glutén', ...]` at line 1184 (inside the allergen step sub-component). `activeAllergens` Set stores lowercased HU labels. `ALLERGEN_ALTERNATIVES` is keyed by lowercased HU labels.

After this task: `activeAllergens` stores English IDs (`'lactose'`, `'gluten'`, etc.), `ALLERGENS` is a top-level constant with multilingual names, `ALLERGEN_ALTERNATIVES` is rekeyed by ID.

- [ ] **Step 1: Replace `ALLERGEN_ALTERNATIVES` (lines ~291–347)**

Remove the existing `ALLERGEN_ALTERNATIVES` definition and replace with a new structure keyed by English IDs, with translated labels:

```ts
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
    { key: 'csicseriborsó', emoji: '🫘', names: { hu: 'Csicseriborsó', en: 'Chickpeas',    ro: 'Năut'           } },
    { key: 'lencse',        emoji: '🫘', names: { hu: 'Lencse',        en: 'Lentils',      ro: 'Linte'          } },
    { key: 'fekete_bab',    emoji: '🫘', names: { hu: 'Fekete bab',    en: 'Black beans',  ro: 'Fasole neagră'  } },
    { key: 'feher_bab',     emoji: '🫘', names: { hu: 'Fehér bab',     en: 'White beans',  ro: 'Fasole albă'    } },
    { key: 'kokusz_aminos', emoji: '🥥', names: { hu: 'Kókusz aminos', en: 'Coconut aminos',ro: 'Aminoacizi cocos'} },
  ],
  shellfish: [
    { key: 'csirkemell', emoji: '🍗', names: { hu: 'Csirkemell', en: 'Chicken breast', ro: 'Piept de pui' } },
    { key: 'lazac',      emoji: '🐟', names: { hu: 'Lazac',      en: 'Salmon',         ro: 'Somon'        } },
    { key: 'tonhal',     emoji: '🐠', names: { hu: 'Tonhal',     en: 'Tuna',           ro: 'Ton'          } },
    { key: 'lencse',     emoji: '🫘', names: { hu: 'Lencse',     en: 'Lentils',        ro: 'Linte'        } },
    { key: 'tofu',       emoji: '🫘', names: { hu: 'Tofu',       en: 'Tofu',           ro: 'Tofu'         } },
  ],
};
```

- [ ] **Step 2: Replace `ALLERGEN_LABELS` with `ALLERGENS` array (line ~1184)**

Remove: `const ALLERGEN_LABELS = ['Laktóz', 'Glutén', 'Tojás', 'Hal', 'Diófélék', 'Szója', 'Rákféle'] as const;`

Add at the same location (inside the allergen step component or just before it — wherever `ALLERGEN_LABELS` is currently defined):

```ts
const ALLERGENS = [
  { id: 'lactose',   names: { hu: 'Laktóz',   en: 'Lactose',   ro: 'Lactoză'   } },
  { id: 'gluten',    names: { hu: 'Glutén',   en: 'Gluten',    ro: 'Gluten'    } },
  { id: 'egg',       names: { hu: 'Tojás',    en: 'Egg',       ro: 'Ouă'       } },
  { id: 'fish',      names: { hu: 'Hal',      en: 'Fish',      ro: 'Pește'     } },
  { id: 'nuts',      names: { hu: 'Diófélék', en: 'Nuts',      ro: 'Nuci'      } },
  { id: 'soy',       names: { hu: 'Szója',    en: 'Soy',       ro: 'Soia'      } },
  { id: 'shellfish', names: { hu: 'Rákféle',  en: 'Shellfish', ro: 'Crustacee' } },
] as const;
```

- [ ] **Step 3: Update `toggleAllergen` calls — now use allergen `id`**

Search for `toggleAllergen` and the chip rendering code (~line 1227). Currently:
```tsx
{ALLERGEN_LABELS.map(label => {
  const key = label.toLowerCase();
  const active = activeAllergens.has(key);
  return (
    <button key={key} onClick={() => toggleAllergen(key)} ...>
      {active ? '🚫 ' : ''}{label}
    </button>
  );
})}
```

Replace with:
```tsx
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
```

- [ ] **Step 4: Update allergen alternatives rendering (~lines 1250–1296)**

Currently `activeList` is derived from `ALLERGEN_LABELS` filtered by `activeAllergens`. Find this derivation (something like `const activeList = ALLERGEN_LABELS.filter(l => activeAllergens.has(l.toLowerCase()))`) and replace:

```ts
// OLD pattern:
const activeList = ALLERGEN_LABELS.filter(l => activeAllergens.has(l.toLowerCase()));

// NEW:
const activeList = ALLERGENS.filter(a => activeAllergens.has(a.id));
```

Then in the render loop, update references from `label` / `key` to allergen IDs and translated names:

```tsx
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
    </div>
  );
})}
```

- [ ] **Step 5: Build and verify**

```bash
cd PersonalFit && npm run build 2>&1 | tail -8
```
Expected: `✓ built in X.Xs`

- [ ] **Step 6: Commit**

```bash
git add PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx
git commit -m "feat: translate allergen labels and alternatives (HU/EN/RO)"
```

---

## Task 4: Food name translations (SEED_FOODS)

**Files:**
- Modify: `PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx` (lines 67, 80–213, 216–218, 1319–1327, 1412–1461, 712–733)

### Context

`SeedFood` interface (lines 80–90) currently uses `name: string` and `category: DisplayCategory` (Hungarian string). After this task:
- `SeedFood` gets `id: string` and `names: {hu:string; en:string; ro:string}` (replacing `name`)
- `category` changes from `'Fehérje'` to `'protein'` (English key)
- `DisplayCategory` type updated
- `FOOD_CATEGORY_TABS` updated
- `CAT_LABELS` updated
- Food grid uses `food.names[language]`
- `selectedFoods` Set stores `food.id` not `food.name`
- `createFoodsBatch` filter uses `food.id`; catalog `name` field = `food.names.en`
- `food.allergens` values updated from HU strings to allergen IDs (matching Task 3's IDs)

- [ ] **Step 1: Update `DisplayCategory` type and `FOOD_CATEGORY_TABS` (line 67 and 216)**

```ts
// Line 67 — replace:
type DisplayCategory = 'protein' | 'carb' | 'fat' | 'dairy' | 'vegetable' | 'fruit';

// Line 216 — replace:
const FOOD_CATEGORY_TABS = ['all', 'protein', 'carb', 'fat', 'dairy', 'vegetable', 'fruit'] as const;
type FoodTabType = typeof FOOD_CATEGORY_TABS[number];
```

- [ ] **Step 2: Update `SeedFood` interface (lines 80–90)**

```ts
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
```

- [ ] **Step 3: Replace `SEED_FOODS` array (lines 114–214)**

Replace the entire `const SEED_FOODS: SeedFood[] = [...]` block with the multilingual version:

```ts
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
  // ── Fat ───────────────────────────────────────────────────────
  { id: 'avocado',         category: 'fat',     emoji: '🥑', vegetarian: true,  calories_per_100g: 160, protein_per_100g: 2,    carbs_per_100g: 9,    fat_per_100g: 15,  names: { hu: 'Avokádó',     en: 'Avocado',         ro: 'Avocado'             } },
  { id: 'walnut',          category: 'fat',     emoji: '🌰', vegetarian: true,  calories_per_100g: 654, protein_per_100g: 15,   carbs_per_100g: 14,   fat_per_100g: 65,  names: { hu: 'Dió',         en: 'Walnut',          ro: 'Nuci'                }, allergens: ['nuts'] },
  { id: 'almond',          category: 'fat',     emoji: '🥜', vegetarian: true,  calories_per_100g: 579, protein_per_100g: 21,   carbs_per_100g: 22,   fat_per_100g: 50,  names: { hu: 'Mandula',     en: 'Almond',          ro: 'Migdale'             }, allergens: ['nuts'] },
  { id: 'peanut',          category: 'fat',     emoji: '🥜', vegetarian: true,  calories_per_100g: 567, protein_per_100g: 26,   carbs_per_100g: 16,   fat_per_100g: 49,  names: { hu: 'Mogyoró',     en: 'Peanut',          ro: 'Arahide'             }, allergens: ['nuts'] },
  { id: 'cashew',          category: 'fat',     emoji: '🥜', vegetarian: true,  calories_per_100g: 553, protein_per_100g: 18,   carbs_per_100g: 30,   fat_per_100g: 44,  names: { hu: 'Kesudió',     en: 'Cashew',          ro: 'Caju'                }, allergens: ['nuts'] },
  { id: 'pecan',           category: 'fat',     emoji: '🌰', vegetarian: true,  calories_per_100g: 691, protein_per_100g: 9,    carbs_per_100g: 14,   fat_per_100g: 72,  names: { hu: 'Pekándió',    en: 'Pecan',           ro: 'Pecan'               }, allergens: ['nuts'] },
  { id: 'olive_oil',       category: 'fat',     emoji: '🫒', vegetarian: true,  calories_per_100g: 884, protein_per_100g: 0,    carbs_per_100g: 0,    fat_per_100g: 100, names: { hu: 'Olívaolaj',   en: 'Olive oil',       ro: 'Ulei de măsline'     } },
  { id: 'coconut_oil',     category: 'fat',     emoji: '🥥', vegetarian: true,  calories_per_100g: 862, protein_per_100g: 0,    carbs_per_100g: 0,    fat_per_100g: 100, names: { hu: 'Kókuszolaj',  en: 'Coconut oil',     ro: 'Ulei de cocos'       } },
  { id: 'peanut_butter',   category: 'fat',     emoji: '🥜', vegetarian: true,  calories_per_100g: 588, protein_per_100g: 25,   carbs_per_100g: 20,   fat_per_100g: 50,  names: { hu: 'Mogyoróvaj', en: 'Peanut butter',   ro: 'Unt de arahide'      }, allergens: ['nuts'] },
  { id: 'chia_seeds',      category: 'fat',     emoji: '🌱', vegetarian: true,  calories_per_100g: 486, protein_per_100g: 17,   carbs_per_100g: 42,   fat_per_100g: 31,  names: { hu: 'Chia mag',    en: 'Chia seeds',      ro: 'Semințe de chia'     } },
  { id: 'flaxseed',        category: 'fat',     emoji: '🌱', vegetarian: true,  calories_per_100g: 534, protein_per_100g: 18,   carbs_per_100g: 29,   fat_per_100g: 42,  names: { hu: 'Lenmag',      en: 'Flaxseed',        ro: 'Semințe de in'       } },
  { id: 'pumpkin_seeds',   category: 'fat',     emoji: '🌱', vegetarian: true,  calories_per_100g: 559, protein_per_100g: 30,   carbs_per_100g: 11,   fat_per_100g: 49,  names: { hu: 'Tök mag',     en: 'Pumpkin seeds',   ro: 'Semințe de dovleac'  } },
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
];
```

- [ ] **Step 4: Update `CAT_LABELS` lookup (lines 1319–1327)**

```ts
const CAT_LABELS: Record<FoodTabType, string> = {
  'all':       t('wizard.foods.catAll'),
  'protein':   t('wizard.foods.catProtein'),
  'carb':      t('wizard.foods.catCarb'),
  'fat':       t('wizard.foods.catFat'),
  'dairy':     t('wizard.foods.catDairy'),
  'vegetable': t('wizard.foods.catVeg'),
  'fruit':     t('wizard.foods.catFruit'),
};
```

Also update `FOOD_CATEGORY_TABS[0]` filter logic. Currently food filtering uses `activeTab === 'Minden'` (or similar). Find the filter and update to `activeTab === 'all'`.

- [ ] **Step 5: Update food grid rendering (line ~1412–1461)**

`selectedFoods` Set now stores food `id`. Update all `.has(food.name)` → `.has(food.id)` and all display of `food.name` → `food.names[language]`:

```tsx
// In toggleFood: was toggleFood(food.name) → now toggleFood(food.id)
const toggleFood = (foodId: string) => {
  setSelectedFoods(prev => {
    const next = new Set(prev);
    next.has(foodId) ? next.delete(foodId) : next.add(foodId);
    return next;
  });
};

// In grid render:
const selected = selectedFoods.has(food.id);
// ...
<button key={food.id} onClick={() => toggleFood(food.id)} ...>
  <p className="text-xs font-medium truncate ...">{food.names[language]}</p>
  ...
</button>
```

- [ ] **Step 6: Update `effectiveSelectedFoods` filter and `createFoodsBatch` (lines 712–733)**

```ts
// Filter uses food.id now:
const effectiveSelectedFoods: Set<string> = ...
  // (same logic, selectedFoods already stores ids)

const allKnownFoods = [...SEED_FOODS, ...extraFoods];
const foodsToSave: CreateFoodInput[] = allKnownFoods
  .filter(f => effectiveSelectedFoods.has(f.id))  // was f.name
  .map(f => ({
    name: f.names.en,  // English name for AI meal-plan prompts (was f.name)
    description: '',
    category: mapCategory(f.category) as any,
    calories_per_100g: f.calories_per_100g,
    protein_per_100g: f.protein_per_100g,
    carbs_per_100g: f.carbs_per_100g,
    fat_per_100g: f.fat_per_100g,
    source: 'user_uploaded' as any,
  }));
```

Also check `mapCategory(f.category)` — it previously received HU strings like `'Fehérje'`. Now it receives English keys like `'protein'`. Update `mapCategory` accordingly (search for its definition in the file; update the mapping from HU strings to English keys).

- [ ] **Step 7: Update `buildIngredientSelection` allergen references**

`buildIngredientSelection` at line ~721 is called with `Array.from(activeAllergens)` which now contains English IDs. Check if `buildIngredientSelection.ts` does any allergen name matching against food data. If it does, ensure it matches against the new `food.allergens` values (now English IDs like `'lactose'`). Read `src/app/utils/buildIngredientSelection.ts` and update as needed.

- [ ] **Step 8: Build and verify no TypeScript errors**

```bash
cd PersonalFit && npm run build 2>&1 | tail -8
```
Expected: `✓ built in X.Xs`

- [ ] **Step 9: Run all tests**

```bash
cd PersonalFit && npx vitest run --reporter=verbose 2>&1 | tail -20
```
Expected: all tests PASS.

- [ ] **Step 10: Commit**

```bash
git add PersonalFit/src/app/components/onboarding/ProfileSetupWizard.tsx
git commit -m "feat: translate food names (100 foods × HU/EN/RO), use IDs for storage"
```

---

## Final

- [ ] Full test suite: `cd PersonalFit && npx vitest run`
- [ ] Build: `cd PersonalFit && npm run build`
- [ ] Push: `git push`
