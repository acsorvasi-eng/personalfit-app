# Visual Onboarding — Design Spec
**Date:** 2026-03-19
**Status:** Approved

---

## Overview

Replace the current onboarding wizard's Step 1 (dietary conditions + allergens) and Step 2 (98-ingredient manual selection) with a single image-based preference screen that determines the user's food profile in 1–2 taps. The rest of the wizard (personal data, meals, sport, sleep, summary) remains unchanged.

Research basis: Netflix (2014–2016) image preference studies, Noom onboarding research, and food neophobia/preference literature (Pliner & Hobden, 1992) demonstrate that 1–2 visual food choices predict dietary profile with ~80–95% accuracy — far outperforming lengthy questionnaires.

> **Codebase note:** The existing wizard file internally refers to itself as a "6-step" wizard but renders steps 0–6 (7 render positions). This spec's "7 → 6" reduction refers to those 7 render positions becoming 6.

---

## 1. Flow Change

### Current (7 render positions, steps 0–6)
| Step | Name | Kept? |
|------|------|-------|
| 0 | Personal data | ✅ unchanged |
| 1 | Dietary conditions (diet type + allergens + alternatives) | ❌ replaced |
| 2 | Ingredient selection (98 foods, manual) | ❌ replaced |
| 3 | Meals / IF | ✅ becomes Step 2 |
| 4 | Sport | ✅ becomes Step 3 |
| 5 | Sleep | ✅ becomes Step 4 |
| 6 | Summary | ✅ becomes Step 5 |

### New (6 render positions, steps 0–5)
| Step | Name |
|------|------|
| 0 | Personal data |
| 1 | **Food style picker** (NEW — replaces Steps 1+2) |
| 2 | Meals / IF |
| 3 | Sport |
| 4 | Sleep |
| 5 | Summary |

**Progress bar formula:** Keep the existing formula `((step + 1) / STEPS.length) * 100` — update `STEPS.length` from 7 to 6. Step 0 will correctly show ~17%, step 5 will show 100%.

---

## 2. Step 1 — Food Style Picker (`StepFoodStyle`)

### Layout
- Progress bar shows `((1 + 1) / 6) * 100 = 33%`
- Title: `t('wizard.foodStyle.title')`
- Subtitle: `t('wizard.foodStyle.subtitle')`
- **Max badge**: shows `t('wizard.foodStyle.maxBadge')` when 0–1 selected; shows `t('wizard.foodStyle.maxReached', { n: selectedStyles.length })` when 2 selected. The `{n}` placeholder uses the existing translation helper interpolation syntax (same as `wizard.sport.burnEstimate` which uses `replace('{n}', ...)`)
- 2×2 grid of photo cards
- Allergen panel below the grid
- CTA button: disabled (shows `t('wizard.foodStyle.ctaDisabled')`) until ≥1 photo selected; active (shows `t('wizard.next')`, the existing shared next-button key) when ≥1 selected
- Escape link below CTA: `t('wizard.foodStyle.detailedSetup')` — tapping this calls `onDetailedSetup()`, which sets `step` to the legacy `StepFoods` position (injected inline into the wizard as an additional step). The legacy `StepFoods` component is not removed from the wizard, only hidden from the normal flow; `onDetailedSetup` jumps to it by setting `step = LEGACY_FOODS_STEP` (a constant defined in the wizard).

### Navigation
`StepFoodStyle` does NOT own navigation buttons. The wizard's outer shell handles Back/Next buttons as it does for all other steps. For Step 1 specifically, the outer shell conditionally disables the Next button when `selectedStyles.length < 1`. All other steps use the existing unconditional Next button. No new prop is needed on `StepFoodStyle` — the outer shell reads `selectedStyles.length` directly from the wizard-level state it already holds.

### Photo Cards (4 options)

| ID | Label (hu) | Label (en) | Label (ro) | Photo source |
|----|-----------|-----------|-----------|-------------|
| `sporty` | 🏋️ Sportos & fehérjedús | 🏋️ Sporty & protein-rich | 🏋️ Sportiv & bogat în proteine | Unsplash: `photo-1490645935967-10de6ba17061` (protein bowl) |
| `plant` | 🥗 Könnyű & növényi | 🥗 Light & plant-based | 🥗 Ușor & vegetal | Unsplash: `photo-1512621776951-a57141f2eefd` (Buddha bowl) |
| `traditional` | 🍲 Hagyományos & laktató | 🍲 Traditional & hearty | 🍲 Tradițional & consistent | Unsplash: `photo-1547592180-85f173990554` (hearty stew) |
| `mediterranean` | 🐟 Mediterrán | 🐟 Mediterranean | 🐟 Mediteranean | Unsplash: `photo-1519708227418-c8fd9a32b7a2` (grilled fish) |

**Photo implementation:** Use Unsplash source URLs (`https://images.unsplash.com/photo-{ID}?w=400&h=320&fit=crop&auto=format`) for v1. These are free for prototyping. Replace with licensed studio photos before marketing launch.

**Selection rules:**
- Max 2 selectable simultaneously
- When 2 are selected, unselected cards dim to 45% opacity (still tappable to swap)
- Selected card: indigo border (3px `#6366f1`) + semi-transparent indigo overlay + ✓ badge (top-right, white on indigo circle)

### Allergen Panel
Always visible below the photo grid. Chips use allergen label strings matching the existing `CURATED_ALLERGENS` structure in the wizard. **Note:** allergen labels are hardcoded Hungarian strings in the existing codebase (not fetched via `t()`) — continue the same pattern. Chips: Laktóz, Glutén, Tojás, Hal, Diófélék, Szója, Rákféle.

When an allergen is tapped → shows an **alternative sub-panel** inline below the chips:

| Allergen | Alternatives shown |
|----------|-------------------|
| Laktóz | 🐐 Kecske, 🐑 Juh, 🐃 Bivaly, 🌾 Zab ital, 🥥 Kókusz, 🌰 Mandula, 🫘 Szója tej, 🍚 Rizs ital |
| Glutén | Hajdina, Köles, Rizs, Kukorica, Amaránt, Quinoa, Zab ital (**product decision:** oat-derived products may contain trace gluten cross-contaminant; shown here matching existing wizard behavior and as a practical alternative for mild gluten sensitivity, not celiac) |
| Tojás | *(no alternatives — allergen just excluded from foods)* |
| Hal | *(no alternatives — allergen just excluded from foods)* |
| Diófélék | *(no alternatives — allergen just excluded from foods)* |
| Szója | *(no alternatives — allergen just excluded from foods)* |
| Rákféle | *(no alternatives — allergen just excluded from foods)* |

Alternative chip labels and the `CURATED_ALTERNATIVES` map reuse the existing data structure from `ProfileSetupWizard.tsx` (unchanged).

---

## 3. Ingredient Catalog Expansion

The current `SEED_FOODS` array (~98 items) is replaced with a comprehensive catalog. Target: ~250 items.

**Location change:** Move from inline in `ProfileSetupWizard.tsx` to `src/app/data/seedFoods.ts`.

**Macro data:** Each new `SeedFood` entry requires `calories_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`, `vegetarian: boolean`, `emoji: string`. For the ~150 new items, these values are generated using Claude (haiku) in a dedicated seed-generation script during implementation. The implementer runs the script once, reviews the output, and commits the resulting `seedFoods.ts`. Standard nutritional references (USDA FoodData Central) are used as the source.

**Name convention:** Each food has a canonical Hungarian name string (e.g., `'Csirkemell'`, `'Lazac'`). This exact string is what `buildIngredientSelection` returns and what `createFoodsBatch` looks up. Names are Title Case, no parenthetical qualifiers in the canonical name (e.g., `'Tonhal'` not `'Tonhal (friss/konzerv)'`). Parenthetical qualifiers in Section 3 lists are descriptive only.

**Renames from old SEED_FOODS:** The new `seedFoods.ts` uses `'Garnéla'` (not `'Garnélarák'` as in the existing wizard) and `'Fehér tészta'` (not `'Tészta'`). These are renames in the new data file — the old names exist only in `ProfileSetupWizardLegacy.tsx` and need not be updated there.

### Categories and canonical names

**Baromfi & tojás**
Csirkemell, Csirkecomb, Csirkeszárny, Csirkemáj, Egész csirke, Pulykamell, Pulykacomb, Kacsacomb, Kacsamell, Libamell, Tojás, Fürjtojás

**Sertés**
Sertéskaraj, Sertéstarja, Sertéslapocka, Sertéscomb, Sertésborda, Sertésszűzpecsenye, Sertéscsülök, Szalonna, Sertésmáj, Kolbász, Füstölt sonka, Virsli

**Marha & borjú**
Marhahátszín, Marhacomb, Marhalapocka, Marhalábszár, Marhamáj, Borjúborda, Borjúszelet, Borjúmáj

**Bárány & nyúl & vad**
Báránykaraj, Báránylapocka, Bárányoldalas, Nyúl, Őzhús, Szarvashús, Vaddisznóhús

**Hal & tenger gyümölcsei**
Lazac, Tonhal, Makréla, Harcsa, Süllő, Ponty, Pisztráng, Fogas, Tőkehal, Hering, Szardínia, Tilápia, Garnéla, Kagyló, Polip, Tintahal, Rák

**Tejtermékek**
Tehéntej, Görög joghurt, Natúr joghurt, Kefir, Tejföl, Tejszín, Vaj, Ghí, Gouda sajt, Trappista sajt, Mozzarella, Feta sajt, Parmezán, Ricotta, Cottage cheese, Túró, Krémtúró, Mascarpone

**Kecske & juh termékek**
Kecskesajt, Kecsketúró, Kecske joghurt, Kecsketej, Kecske tejföl, Juhtúró, Juh joghurt, Juhtej, Brinza, Manchego

**Bivaly termékek**
Bivalytej, Bivaly joghurt, Bivaly mozzarella, Bivaly túró, Bivaly kefir

**Növényi fehérjék**
Tofu, Tempeh, Edamame, Lencse, Vörös lencse, Zöld lencse, Csicseriborsó, Fekete bab, Fehér bab, Tarkabab, Kidney bab, Humusz, Zöldborsó, Mogyoróvaj, Mandulavaj, Kesudióvaj

**Gabonák & szénhidrátok**
Fehér rizs, Barna rizs, Basmati rizs, Vadrizs, Zabpehely, Quinoa, Amaránt, Hajdina, Köles, Búzadara, Kuszkusz, Bulgur, Fehér tészta, Teljes kiőrlésű tészta, Fehér kenyér, Rozskenyér, Teljes kiőrlésű kenyér, Pita, Tortilla, Polenta, Édesburgonya, Burgonya

**Zöldségek — gyökér**
Sárgarépa, Fehérrépa, Paszternák, Petrezselyemgyökér, Gumós zeller, Cékla, Retek, Torma, Csicsóka

**Zöldségek — káposzta**
Fejes káposzta, Vörös káposzta, Kelkáposzta, Savanyú káposzta, Karalábé, Karfiol, Brokkoli, Kelbimbó, Kínai kel, Pak choi

**Zöldségek — levél**
Fejes saláta, Jégsaláta, Rukkola, Spenót, Mángold, Sóska, Cikória, Endívia, Radicchio

**Zöldségek — hagyma**
Vöröshagyma, Fehér hagyma, Lilahagyma, Fokhagyma, Póréhagyma, Metélőhagyma, Újhagyma

**Zöldségek — paradicsom & paprika**
Paradicsom, Koktélparadicsom, Paprika, Piros paprika, Zöld paprika, Sárga paprika, Csilipaprika, Padlizsán, Cukkini, Tök, Sütőtök

**Zöldségek — egyéb**
Uborka, Spárga, Articsóka, Édeskömény, Gomba, Shiitake gomba, Laskagomba, Portobello gomba, Avokádó, Olajbogyó, Kapribogyó, Kukorica, Zöldbab

**Gyümölcsök**
Alma, Körte, Birs, Őszibarack, Nektarin, Sárgabarack, Szilva, Meggy, Cseresznye, Eper, Málna, Áfonya, Szeder, Ribizli, Egres, Szőlő, Görögdinnye, Sárgadinnye, Füge, Narancs, Mandarin, Klementina, Citrom, Lime, Grapefruit, Banán, Kivi, Mangó, Ananász, Papaya, Gránátalma, Datolya, Aszalt szilva, Aszalt sárgabarack, Mazsola

**Olajok & zsírok**
Olívaolaj, Napraforgóolaj, Repceolaj, Kókuszolaj, Avokádóolaj, Sertészsír, Libázsír, Szezámolaj, Lenmagolaj

**Magvak & olajos magvak**
Napraforgómag, Tökmag, Lenmag, Chiamag, Szezámmag, Dió, Mogyoró, Mandula, Kesudió, Makadámia dió, Pisztácia, Pekándió, Brazil dió, Fenyőmag, Gesztenye, Mák

---

## 4. Photo → Ingredient Mapping Logic

### Function contract

```typescript
// src/app/utils/buildIngredientSelection.ts

export function buildIngredientSelection(
  selectedStyles: FoodStyle[],             // precondition: length >= 1
  activeAllergens: Set<string>,
  selectedAlternativeKeys: Set<string>
): Set<string>
// Returns: Set of canonical food name strings that exist verbatim in SEED_FOODS.
// Precondition: selectedStyles.length >= 1 (enforced by UI — CTA disabled otherwise).
// If somehow called with empty styles, returns all SEED_FOODS names (safe fallback).
// If allergens wipe all selected foods, returns a minimum viable set of allergen-safe
// staples (rice, vegetables, fruits) so meal generation never receives an empty catalog.
```

### Style activation rules

**`sporty`** activates:
Csirkemell, Csirkecomb, Pulykamell, Tojás, Görög joghurt, Kefir, Túró, Cottage cheese, Lencse, Vörös lencse, Csicseriborsó, Tofu, Tempeh, Edamame, Zabpehely, Quinoa, Édesburgonya, Brokkoli, Spenót, Mángold, + all vegetables, + low-sugar fruits (Alma, Körte, Málna, Áfonya, Eper, Citrom)

**`plant`** activates:
All legumes, all vegetables, all fruits, Quinoa, Hajdina, Köles, Amaránt, Zabpehely, Barna rizs, all seeds & nuts, Olívaolaj, Avokádóolaj, Tofu, Tempeh, Edamame, Humusz

`plant` explicit deactivation (only when `plant` is selected WITHOUT `traditional`):
Vörös húsok (Marhahátszín, Marhacomb, Marhalapocka, Marhalábszár, Sertéskaraj, Sertéstarja, Sertéslapocka, Sertéscomb, Sertésborda, Sertésszűzpecsenye, Sertéscsülök, Szalonna), Csirkemáj, Marhamáj, Sertésmáj, Kolbász, Virsli, Füstölt sonka

**`traditional`** activates:
Sertéskaraj, Sertéstarja, Sertéslapocka, Sertéscomb, Sertésborda, Sertésszűzpecsenye, Sertéscsülök, Marhahátszín, Marhacomb, Marhalapocka, Marhalábszár, Csirkemell, Csirkecomb, Pulykamell, Tojás, Burgonya, Édesburgonya, Sárgarépa, Fehér hagyma, Fokhagyma, Paprika, Fejes káposzta, Vörös káposzta, Kelkáposzta, Fehér tészta, Fehér kenyér, Rozskenyér, Tejföl, Vaj, Gouda sajt, Trappista sajt, Tejszín

**`mediterranean`** activates:
Lazac, Tonhal, Makréla, Harcsa, Süllő, Ponty, Pisztráng, Fogas, Tőkehal, Szardínia, Tilápia, Garnéla, Olívaolaj, Olajbogyó, Kapribogyó, Paradicsom, Koktélparadicsom, Cukkini, Padlizsán, Paprika, Piros paprika, Fokhagyma, Citrom, Lime, Fehér rizs, Basmati rizs, Kuszkusz, Bulgur, Feta sajt, Mozzarella, Ricotta

`mediterranean` explicit deactivation (only when `mediterranean` selected WITHOUT `traditional`):
Sertéscsülök, Szalonna, Kolbász, Virsli, Füstölt sonka

### Combination conflict rule

**`plant + traditional`** (potentially conflicted): `traditional` wins for activation. Foods that `traditional` explicitly activates are included even though `plant` alone would exclude them. Rationale: if the user selected both, they explicitly want traditional meat dishes — `plant` in this context signals they also want vegetable-heavy options, not that they want to exclude meat entirely.

**All other combinations:** simple union of activations, with each style's explicit deactivations applying only if the other selected style does not explicitly activate the same food.

### Allergen override (final layer, always applied after style union)

1. For each active allergen: remove all foods in that allergen's food group from the result set
2. For each selected alternative key: add all foods mapped from that key in `CURATED_ALTERNATIVES` to the result set (regardless of style mapping)
3. Minimum viable set guard: if result set would be empty after allergen removal, add `['Fehér rizs', 'Brokkoli', 'Sárgarépa', 'Alma', 'Burgonya', 'Lencse']` as a safe fallback

### Alternative keys → food names mapping

The `selectedAlternativeKeys` strings (`'kecske'`, `'juh'`, `'bivaly'`, etc.) map to the `CURATED_ALTERNATIVES` Record already defined in the existing wizard. The expanded catalog includes all foods listed in these alternatives (Kecskesajt, Kecsketúró, Kecske joghurt, Kecsketej, Kecske tejföl, Juhtúró, Juh joghurt, Juhtej, Brinza, Manchego, Bivalytej, Bivaly joghurt, Bivaly mozzarella, Bivaly túró, Bivaly kefir, etc.). The function adds the foods whose canonical names exist in SEED_FOODS.

---

## 5. Component Architecture

### New file: `src/app/components/onboarding/StepFoodStyle.tsx`
Standalone component. Navigation follows the outer-shell pattern of all other steps.

Props:
```typescript
// FoodStyle is NOT defined here — import it from buildIngredientSelection.ts
import { FoodStyle } from '../../utils/buildIngredientSelection';

interface StepFoodStyleProps {
  selectedStyles: FoodStyle[];
  setSelectedStyles: (v: FoodStyle[]) => void;
  activeAllergens: Set<string>;
  setActiveAllergens: (v: Set<string>) => void;
  selectedAlternativeKeys: Set<string>;
  setSelectedAlternativeKeys: (v: Set<string>) => void;
  onDetailedSetup: () => void;
  // Called when user taps "Részletesebb alapanyag beállítás →"
  // The wizard handles this by jumping step to LEGACY_FOODS_STEP (see below)
}
```

### Modified: `ProfileSetupWizard.tsx`

- Rename existing file to `ProfileSetupWizardLegacy.tsx` first (see below)
- New wizard file imports `StepFoodStyle` in place of `StepCriteria` + `StepFoods`
- Remove `StepCriteria` from active flow; keep `StepFoods` in file as `LEGACY_FOODS_STEP = 99` (rendered only when `step === LEGACY_FOODS_STEP`)
- Add state: `selectedStyles: FoodStyle[] = []`
- `dietType` state removed; derive inline in `handleGenerate`:
  ```typescript
  const effectiveDietType = (selectedStyles.includes('plant') && selectedStyles.length === 1) ? 'vegetarian' : 'omnivore';
  ```
  Pass `effectiveDietType` wherever `dietType` was previously passed to the API (e.g., `dietaryPreferences: effectiveDietType`)
- In `handleGenerate`: call `buildIngredientSelection(selectedStyles, activeAllergens, selectedAlternativeKeys)` → assign result to `selectedFoods` before the existing save logic (replaces old manual `selectedFoods` Set)
- Update `STEPS` array length: 6 entries (steps 0–5)
- `onDetailedSetup` implementation: `() => setStep(LEGACY_FOODS_STEP)`

### Preserved: `ProfileSetupWizardLegacy.tsx`
- Rename current `ProfileSetupWizard.tsx` → `ProfileSetupWizardLegacy.tsx`
- No content changes
- Entry point (find via `grep -r "ProfileSetupWizard"` in `src/`) switches import to new wizard
- Delete only after new wizard has been live in production and validated

### New utility: `src/app/utils/buildIngredientSelection.ts`
Pure function (no side effects, no React). Exports `buildIngredientSelection` and **`FoodStyle`** (canonical definition — `StepFoodStyle.tsx` imports from here, not the reverse). Covered by unit tests.

```typescript
export type FoodStyle = 'sporty' | 'plant' | 'traditional' | 'mediterranean';
```

### New data file: `src/app/data/seedFoods.ts`
Exports `SEED_FOODS: SeedFood[]` with ~250 entries. Generated via seed script during Task 3 of implementation.

```typescript
export interface SeedFood {
  name: string;                  // canonical Title Case Hungarian name
  emoji: string;                 // single emoji character
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  vegetarian: boolean;
  allergens?: string[];          // e.g. ['laktóz', 'glutén'] — optional, lowercase
}
```

---

## 6. Translation Keys Needed

All new keys in `src/app/translations/index.ts`, all 3 locales (hu/en/ro).
Allergen chip labels reuse existing `wizard.criteria.*` keys — do not add duplicates.
`{n}` interpolation uses `String.replace('{n}', value)` — same pattern as existing `wizard.sport.burnEstimate`.

| Key | hu | en | ro |
|-----|----|----|-----|
| `wizard.foodStyle.title` | Melyik a te vacsorád? | Which dinner is yours? | Care este cina ta? |
| `wizard.foodStyle.subtitle` | Ebből felépítjük az étrendedet | We'll build your meal plan from this | Din aceasta construim planul tău |
| `wizard.foodStyle.maxBadge` | Max 2 választható | Max 2 selectable | Max 2 selectabile |
| `wizard.foodStyle.maxReached` | ✓ {n}/2 kiválasztva | ✓ {n}/2 selected | ✓ {n}/2 selectate |
| `wizard.foodStyle.sportyLabel` | Sportos & fehérjedús | Sporty & protein-rich | Sportiv & bogat în proteine |
| `wizard.foodStyle.sportyDesc` | Csirke, tojás, joghurt, quinoa | Chicken, eggs, yogurt, quinoa | Pui, ouă, iaurt, quinoa |
| `wizard.foodStyle.plantLabel` | Könnyű & növényi | Light & plant-based | Ușor & vegetal |
| `wizard.foodStyle.plantDesc` | Tofu, lencse, zöldségek, gyümölcsök | Tofu, lentils, vegetables, fruits | Tofu, linte, legume, fructe |
| `wizard.foodStyle.traditionalLabel` | Hagyományos & laktató | Traditional & hearty | Tradițional & consistent |
| `wizard.foodStyle.traditionalDesc` | Marhahús, sertés, burgonya, tészta | Beef, pork, potato, pasta | Vită, porc, cartofi, paste |
| `wizard.foodStyle.mediterraneanLabel` | Mediterrán | Mediterranean | Mediteranean |
| `wizard.foodStyle.mediterraneanDesc` | Hal, olívaolaj, zöldségek, rizs | Fish, olive oil, vegetables, rice | Pește, ulei de măsline, legume, orez |
| `wizard.foodStyle.allergyTitle` | Van allergiád? | Any allergies? | Ai alergii? |
| ~~`wizard.foodStyle.altTitle`~~ | *(reuse `wizard.criteria.alternativeHeading` — already exists with `{label}` placeholder, use `replace('{label}', allergenLabel)`)* | — | — |
| `wizard.foodStyle.detailedSetup` | Részletesebb alapanyag beállítás → | Detailed ingredient setup → | Configurare detaliată ingrediente → |
| `wizard.foodStyle.ctaDisabled` | Válassz legalább 1 stílust | Select at least 1 style | Selectează cel puțin 1 stil |

---

## 7. Out of Scope

- Changing personal data step (Step 0)
- Changing meals, sport, sleep, summary steps
- Vegan diet type toggle (derivable from `plant` style in a future improvement)
- Per-ingredient calorie/macro editing in new flow (accessible via "Részletesebb beállítás" escape hatch → legacy StepFoods)
- Deleting `ProfileSetupWizardLegacy.tsx` (deferred until production validation)
- Replacing Unsplash photo URLs with licensed studio photos (deferred to marketing launch)
- Offline / cached photo loading optimizations
