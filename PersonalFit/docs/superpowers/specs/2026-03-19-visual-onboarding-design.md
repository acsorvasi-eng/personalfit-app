# Visual Onboarding — Design Spec
**Date:** 2026-03-19
**Status:** Approved

---

## Overview

Replace the current onboarding wizard's Step 1 (dietary conditions + allergens) and Step 2 (98-ingredient manual selection) with a single image-based preference screen that determines the user's food profile in 1–2 taps. The rest of the wizard (personal data, meals, sport, sleep, summary) remains unchanged.

Research basis: Netflix (2014–2016) image preference studies, Noom onboarding research, and food neophobia/preference literature (Pliner & Hobden, 1992) demonstrate that 1–2 visual food choices predict dietary profile with ~80–95% accuracy — far outperforming lengthy questionnaires.

---

## 1. Flow Change

### Current (7 steps)
| Step | Name | Kept? |
|------|------|-------|
| 0 | Personal data | ✅ unchanged |
| 1 | Dietary conditions (diet type + allergens + alternatives) | ❌ replaced |
| 2 | Ingredient selection (98 foods, manual) | ❌ replaced |
| 3 | Meals / IF | ✅ becomes Step 2 |
| 4 | Sport | ✅ becomes Step 3 |
| 5 | Sleep | ✅ becomes Step 4 |
| 6 | Summary | ✅ becomes Step 5 |

### New (6 steps)
| Step | Name |
|------|------|
| 0 | Personal data |
| 1 | **Food style picker** (NEW — replaces Steps 1+2) |
| 2 | Meals / IF |
| 3 | Sport |
| 4 | Sleep |
| 5 | Summary |

---

## 2. Step 1 — Food Style Picker (`StepFoodStyle`)

### Layout
- Progress bar shows 1/6
- Title: "Melyik a te vacsorád?" / "Which dinner is yours?" / "Care este cina ta?"
- Subtitle: "Ebből felépítjük az étrendedet" / "We'll build your meal plan from this"
- **Max 2 badge**: "Max 2 választható" — updates to "✓ 2/2 kiválasztva" when limit reached
- 2×2 grid of photo cards
- Allergen panel below the grid
- CTA button: disabled until ≥1 photo selected; "Tovább →" when ready
- Optional escape link below CTA: "Részletesebb alapanyag beállítás →" (opens legacy StepFoods)

### Photo Cards (4 options)

| ID | Label (hu) | Label (en) | Label (ro) | Representative ingredients |
|----|-----------|-----------|-----------|---------------------------|
| `sporty` | 🏋️ Sportos & fehérjedús | 🏋️ Sporty & protein-rich | 🏋️ Sportiv & bogat în proteine | Csirkemell, pulykamell, tojás, görög joghurt, túró, lencse, zabpehely, brokkoli, édesburgonya |
| `plant` | 🥗 Könnyű & növényi | 🥗 Light & plant-based | 🥗 Ușor & vegetal | Tofu, tempeh, lencse, csicseriborsó, fekete bab, avokádó, minden zöldség & gyümölcs |
| `traditional` | 🍲 Hagyományos & laktató | 🍲 Traditional & hearty | 🍲 Tradițional & consistent | Marhahús, sertés (karaj/tarja/lapocka), csirke, burgonya, sárgarépa, paprika, káposzta, tészta |
| `mediterranean` | 🐟 Mediterrán | 🐟 Mediterranean | 🐟 Mediteranean | Lazac, tonhal, makréla, süllő, ponty, garnéla, olívaolaj, paradicsom, cukkini, padlizsán, citrom |

**Selection rules:**
- Max 2 selectable simultaneously
- When 2 are selected, unselected cards dim to 45% opacity (still tappable to swap)
- Selected card: indigo border (3px `#6366f1`) + semi-transparent overlay + ✓ badge (top-right)

### Allergen Panel
Shown below the photo grid, always visible. Chips: Laktóz, Glutén, Tojás, Hal, Diófélék, Szója, Rákféle.

When an allergen is tapped → shows an **alternative sub-panel** inline:

| Allergen | Alternatives shown |
|----------|-------------------|
| Laktóz | 🐐 Kecske, 🐑 Juh, 🐃 Bivaly, 🌾 Zab ital, 🥥 Kókusz, 🌰 Mandula, 🫘 Szója tej, 🍚 Rizs ital |
| Glutén | Hajdina, Köles, Rizs, Kukorica, Amaránt, Quinoa |
| Tojás | (no alternatives shown — just excluded) |
| Hal | (no alternatives shown — just excluded) |
| Diófélék | (no alternatives shown — just excluded) |
| Szója | (no alternatives shown — just excluded) |
| Rákféle | (no alternatives shown — just excluded) |

---

## 3. Ingredient Catalog Expansion

The current `SEED_FOODS` array (~98 items) is replaced with a comprehensive catalog of all foods commonly available in Hungarian grocery stores (Spar, Lidl, Aldi, Tesco, piac). Target: ~250 items.

### Categories and items

**Baromfi & tojás**
Csirkemell, Csirkecomb, Csirkeszárny, Csirkemáj, Egész csirke, Pulykamell, Pulykacomb, Kacsacomb, Kacsamell, Libamell, Tojás, Fürjtojás

**Sertés**
Sertéskaraj, Sertéstarja, Sertéslapocka, Sertéscomb, Sertésborda, Sertésszűzpecsenye, Sertéscsülök, Szalonna, Sertésmáj, Sertésvese, Kolbász, Füstölt sonka, Virsli

**Marha & borjú**
Marhahátszín, Marhacomb, Marhalapocka, Marhalábszár (pörköltnek), Marhamáj, Borjúborda, Borjúszelet, Borjúmáj

**Bárány & nyúl & vad**
Báránykaraj, Báránylapocka, Bárányoldalas, Nyúl, Őzhús, Szarvashús, Vaddisznóhús

**Hal & tenger gyümölcsei**
Lazac, Tonhal (friss/konzerv), Makréla, Harcsa, Süllő, Ponty, Pisztráng, Fogas, Tőkehal, Hering, Szardínia, Tilápia, Garnéla, Kagyló, Polip, Tintahal, Rák

**Tejtermékek**
Tehéntej, Teljes tej, Félzsíros tej, Görög joghurt, Natúr joghurt, Kefir, Tejföl, Tejszín, Vaj, Ghí, Gouda sajt, Edami sajt, Trappista sajt, Mozzarella, Feta sajt, Parmezán, Ricotta, Cottage cheese, Túró, Krémtúró, Mascarpone

**Kecske & juh termékek**
Kecskemell, Kecskesajt, Kecsketúró, Kecske joghurt, Kecsketej, Kecske tejföl, Kecskevajas, Juh tejföl, Juhtúró, Juh joghurt, Juhtej, Brinza, Feta (juh), Manchego

**Növényi fehérjék**
Tofu, Tempeh, Edamame, Lencse (barna/vörös/zöld), Csicseriborsó, Fekete bab, Fehér bab, Tarkabab, Vörös kidney bab, Szójabab, Humusz, Zöldborsó, Natúr mogyoróvaj, Mandulabaj, Kesudióvaj

**Gabonák & szénhidrátok**
Fehér rizs, Barna rizs, Basmati rizs, Vadrizs, Zabpehely, Teljes kiőrlésű zab, Quinoa, Amaránt, Hajdina, Köles, Búzadara, Kuszkusz, Bulgur, Fehér tészta, Teljes kiőrlésű tészta, Üvegtészta (rizs), Fehér kenyér, Rozskenyér, Teljes kiőrlésű kenyér, Pita, Tortilla, Polenta, Édesburgonya, Burgonya, Fehér liszt, Teljes kiőrlésű liszt, Rizsliszt, Kukoricaliszt

**Zöldségek — gyökérzöldségek**
Sárgarépa, Fehérrépa, Paszternák, Petrezselyemgyökér, Zeller (gumós), Cékla, Retek, Jégcsapretek, Torma, Édesburgonya, Csicsóka, Fekete gyökér

**Zöldségek — káposztafélék**
Fejes káposzta (fehér/vörös), Kelkáposzta, Savanyú káposzta, Karalábé, Karfiol, Brokkoli, Kelbimbó, Kínai kel, Pak choi, Romanesco

**Zöldségek — hüvelyesek & magvak**
Zöldbab, Cukkini (ceruzabab), Zöldborsó, Szárazbab, Szójabab, Kukorica (friss/fagyasztott)

**Zöldségek — paradicsom & paprika família**
Paradicsom (fürtös/koktél/szárított), Paprika (piros/zöld/sárga/kápia/csilipaprika), Padlizsán, Cukkini, Tök, Sütőtök, Patisszon, Spárgatök

**Zöldségek — saláták & levélzöldségek**
Fejes saláta, Jégsaláta, Rukkola, Spenót, Mángold, Sóska, Cikória, Endívia, Lollo rosso, Jicama, Radicchio, Friss spenót (baby)

**Zöldségek — hagyma família**
Vöröshagyma, Fehér hagyma, Lilahagyma, Fokhagyma, Póréhagyma, Metélőhagyma, Gyöngyhagyma, Újhagyma, Sonkahagyma

**Zöldségek — egyéb**
Uborka (kígyó/fürtös), Spárga (fehér/zöld), Articsóka, Édeskömény, Bok choy, Gomba (csiperkegomba, shiitake, laskagomba, portobello, szárított erdei gomba), Avokádó, Olajbogyó, Kapribogyó, Csicsókagomba

**Gyümölcsök — magvas**
Alma (Golden/Jonagold/Idared/Gala), Körte (Vilmos/Conference), Birs, Naspolya

**Gyümölcsök — csonthéjas**
Őszibarack, Nektarin, Sárgabarack, Szilva (besztercei/ringlotta), Meggy, Cseresznye

**Gyümölcsök — bogyósok**
Eper, Málna, Áfonya, Szeder, Ribizli (fehér/piros/fekete), Egres, Csipkebogyó, Bodza, Aronia

**Gyümölcsök — szőlő & dinnye**
Szőlő (fehér/piros/kék/csemege), Görögdinnye, Sárgadinnye, Füge

**Gyümölcsök — citrusfélék**
Narancs, Vérnarancs, Mandarin, Klementina, Citrom, Lime, Grapefruit, Pomelo

**Gyümölcsök — trópusi (bolti)**
Banán, Kivi, Mangó, Ananász, Papaya, Marakuja, Gránátalma, Lychee, Datolya, Aszalt szilva, Aszalt sárgabarack, Mazsola

**Olajok & zsírok**
Olívaolaj (extra szűz), Napraforgóolaj, Repceolaj, Kókuszolaj, Avokádóolaj, Sertészsír, Libázsír, Vaj, Ghí, Szezámolaj, Lenmagolaj

**Magvak & olajos magvak**
Napraforgómag, Tökmag, Lenmag, Chiamag, Szezámmag, Kendermag, Dió, Mogyoró (tökmag/mogyoró/kesudiói/mandula/kesudió/makadámia/pisztácia/pekándió/brazil dió/fenyőmag), Gesztenye, Mák

**Fűszerek & ízesítők** *(nem kalóriadúsak, de szerepelnek az AI promptban)*
Só, Bors, Pirospaprika (édes/csípős), Köménymag, Koriander, Kurkuma, Gyömbér, Fahéj, Szerecsendió, Oregánó, Bazsalikom, Rozmaring, Kakukkfű, Petrezselyem, Kapor, Snidling, Majoránna, Babérlevél

**Teák & italok** *(csak ha a user vizet/folyadékot is kér)*
Zöld tea, Fekete tea, Kamillatea, Fekete kávé

---

## 4. Photo → Ingredient Mapping Logic

```typescript
function buildIngredientSelection(
  selectedStyles: ('sporty' | 'plant' | 'traditional' | 'mediterranean')[],
  activeAllergens: Set<string>,
  selectedAlternativeKeys: Set<string>
): Set<string>
```

### Style mappings

**`sporty`** activates:
- All poultry (csirkemell, pulykamell, tojás)
- Greek yogurt, túró, cottage cheese, kefir
- All legumes (lencse, csicseriborsó, tofu, tempeh)
- Oats, quinoa, édesburgonya
- All vegetables, all low-sugar fruits
- Whey-adjacent foods (görög joghurt, sajtok)

**`plant`** activates:
- All legumes (lencse, csicseriborsó, fekete bab, fehér bab, tofu, tempeh, edamame)
- All vegetables (complete)
- All fruits (complete)
- Grains (quinoa, hajdina, köles, amaránt, zab)
- Seeds & nuts (complete)
- Plant oils
- Deactivates: vörös húsok, sertés, baromfi-máj

**`traditional`** activates:
- All pork cuts (karaj, tarja, lapocka, comb, borda, szűzpecsenye, csülök)
- Beef (comb, lapocka, lábszár)
- Poultry (csirke, pulyka)
- Burgonya, sárgarépa, fehér hagyma, fokhagyma, paprika, káposzta, fejes káposzta
- Pasta (fehér tészta, nokedli), kenyér
- Tejföl, vaj

**`mediterranean`** activates:
- All fish & seafood (lazac, tonhal, makréla, harcsa, süllő, ponty, garnéla, tőkehal)
- Olive oil, olajbogyó, kapribogyó
- Paradicsom, cukkini, padlizsán, paprika, fokhagyma, citrom, lime
- Fehér rizs, kuszkusz, bulgur
- Feta sajt, mozzarella, ricotta
- Deactivates: nehéz sertéshúsok (csülök, szalonna)

**Combination rules:**
- `sporty + mediterranean` → max fish + csirke, minden zöldség, minimal feldolgozott szénhidrát
- `sporty + traditional` → magas fehérje mindenféle húsból, nehéz komplex szénhidrát
- `plant + mediterranean` → teljesen hal-mentes is lehet (if hal allergen), zöldség + gabona fókusz
- `traditional + mediterranean` → vegyes hús+hal, közép-európai + mediterrán zöldségek

**Allergen override (utolsó réteg, mindig felülír):**
- Ha allergen aktív → az adott allergen összes terméke kikapcsol
- Ha alternative kijelölve → azok bekapcsolnak (még ha a style mapping ki is kapcsolta volna)

---

## 5. Component Architecture

### New file: `StepFoodStyle.tsx`
Standalone component, extracted from wizard for clarity.

Props:
```typescript
interface StepFoodStyleProps {
  selectedStyles: FoodStyle[];
  setSelectedStyles: (v: FoodStyle[]) => void;
  activeAllergens: Set<string>;
  setActiveAllergens: (v: Set<string>) => void;
  selectedAlternativeKeys: Set<string>;
  setSelectedAlternativeKeys: (v: Set<string>) => void;
  onDetailedSetup: () => void; // opens legacy ingredient screen
}
type FoodStyle = 'sporty' | 'plant' | 'traditional' | 'mediterranean';
```

### Modified: `ProfileSetupWizard.tsx`
- Import `StepFoodStyle` instead of `StepCriteria` + `StepFoods`
- Add state: `selectedStyles: FoodStyle[]`
- In `handleGenerate`: call `buildIngredientSelection(selectedStyles, activeAllergens, selectedAlternativeKeys)` to produce `selectedFoods` before the existing save logic
- Step count: 6 instead of 7
- Progress bar: `(step / 5) * 100`

### Preserved: `ProfileSetupWizardLegacy.tsx`
- Rename current `ProfileSetupWizard.tsx` → `ProfileSetupWizardLegacy.tsx`
- No changes to content
- Entry point (`App.tsx` or wherever wizard is rendered) switches to new wizard
- Legacy wizard deleted only after new wizard has been validated in production

### New utility: `src/app/utils/buildIngredientSelection.ts`
Pure function, testable in isolation. Takes styles + allergens + alternatives → returns `Set<string>` of food names matching the new expanded `SEED_FOODS`.

### Expanded: `SEED_FOODS` constant
Current location: inline in `ProfileSetupWizard.tsx` (around line 60–200).
Move to: `src/app/data/seedFoods.ts` for clarity.
Expand from ~98 to ~250 items covering the full Hungarian grocery catalog defined in Section 3.

---

## 6. Translation Keys Needed

All new keys in `src/app/translations/index.ts`, all 3 locales (hu/en/ro):

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
| `wizard.foodStyle.altTitle` | {allergen} helyett mit ehetsz? | What can you eat instead of {allergen}? | Ce poți mânca în loc de {allergen}? |
| `wizard.foodStyle.detailedSetup` | Részletesebb alapanyag beállítás → | Detailed ingredient setup → | Configurare detaliată ingrediente → |
| `wizard.foodStyle.ctaDisabled` | Válassz legalább 1 ételt | Select at least 1 style | Selectează cel puțin 1 stil |

---

## 7. Out of Scope

- Changing personal data step (Step 0)
- Changing meals, sport, sleep, summary steps
- Vegan diet type toggle (can be derived from `plant` style + no animal products — future improvement)
- Per-ingredient calorie/macro editing in the new flow (available via "Részletesebb beállítás" escape hatch)
- Deleting `ProfileSetupWizardLegacy.tsx` (happens only after production validation)
