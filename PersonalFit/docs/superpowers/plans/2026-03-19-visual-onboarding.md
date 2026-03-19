# Visual Onboarding Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace wizard Steps 1+2 (dietary conditions + 98-ingredient picker) with a single 2×2 food style photo selector that auto-generates the ingredient catalog.

**Architecture:** A new pure utility `buildIngredientSelection(styles, allergens, alternatives)` maps food style choices to a canonical `Set<string>` of food names. A new `StepFoodStyle` component hosts the photo grid and allergen panel. The existing wizard is renamed to `ProfileSetupWizardLegacy.tsx` (unchanged), and a new 6-step wizard wraps the new step.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest (unit tests), Vite

**Spec:** `docs/superpowers/specs/2026-03-19-visual-onboarding-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/data/seedFoods.ts` | CREATE | ~250-item food catalog; exports `SeedFood`, `SEED_FOODS`, `ALTERNATIVE_NAMES` (named `ALTERNATIVE_NAMES` to avoid collision with the existing `CURATED_ALTERNATIVES` record in the legacy wizard) |
| `src/app/utils/buildIngredientSelection.ts` | CREATE | Pure function: styles + allergens → `Set<string>` of food names; exports `FoodStyle` type |
| `src/app/utils/buildIngredientSelection.test.ts` | CREATE | Unit tests for the utility |
| `src/app/components/onboarding/StepFoodStyle.tsx` | CREATE | 2×2 photo picker + allergen panel UI |
| `src/app/components/onboarding/ProfileSetupWizardLegacy.tsx` | RENAME (no edits) | Preserve current 7-step wizard |
| `src/app/components/onboarding/ProfileSetupWizard.tsx` | CREATE (new) | New 6-step wizard using `StepFoodStyle` |
| `src/app/translations/index.ts` | MODIFY | Add `wizard.foodStyle.*` keys in hu/en/ro |
| `vite.config.ts` | MODIFY | Add vitest `test` block |
| `package.json` | MODIFY | Add `"test": "vitest run"` script |

---

## Task 1: Vitest Setup

**Files:**
- Modify: `PersonalFit/vite.config.ts`
- Modify: `PersonalFit/package.json`

- [ ] **Step 1: Install vitest**

```bash
cd PersonalFit && npm install -D vitest
```

Expected: vitest appears in `package.json` devDependencies.

- [ ] **Step 2: Add test config to `vite.config.ts`**

Add `/// <reference types="vitest" />` at the top of the file, then add a `test` block inside `defineConfig`:

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true, secure: false },
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  test: {
    globals: true,
    environment: 'node',
  },
})
```

- [ ] **Step 3: Add test script to `package.json`**

Find the `"scripts"` block and add:
```json
"test": "vitest run"
```

- [ ] **Step 4: Create smoke test to verify setup**

Create `src/app/utils/buildIngredientSelection.test.ts`:
```typescript
describe('smoke', () => {
  it('vitest works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run test to confirm setup**

```bash
npm test
```

Expected output: `✓ src/app/utils/buildIngredientSelection.test.ts > smoke > vitest works`

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts package.json package-lock.json src/app/utils/buildIngredientSelection.test.ts
git commit -m "chore: add vitest test infrastructure"
```

---

## Task 2: Seed Food Catalog (`seedFoods.ts`)

**Files:**
- Create: `src/app/data/seedFoods.ts`

This task migrates the existing ~100-item `SEED_FOODS` from `ProfileSetupWizardLegacy.tsx` and adds ~150 new items to reach the full ~250-item catalog. It also exports `CURATED_ALTERNATIVES` (used by `buildIngredientSelection` and `StepFoodStyle`).

- [ ] **Step 1: Create `src/app/data/seedFoods.ts` with the `SeedFood` interface**

```typescript
export interface SeedFood {
  name: string;               // canonical Title Case Hungarian name
  emoji: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  vegetarian: boolean;
  allergens?: string[];       // lowercase, e.g. ['laktóz', 'glutén']
  category?: string;          // optional, kept for backward compat with legacy wizard
}
```

- [ ] **Step 2: Copy existing items from `ProfileSetupWizardLegacy.tsx` (lines 107–204)**

Open `ProfileSetupWizardLegacy.tsx`. Find the `SEED_FOODS` array (starts around line 105). Copy all entries into `seedFoods.ts` as the start of the `SEED_FOODS` array. These already have the correct shape (just make `category` optional — it already is since it's typed as `string` not `string | undefined`; no edits needed, just copy).

- [ ] **Step 3: Add the new items below the existing ones**

Append these new items to the `SEED_FOODS` array:

```typescript
// ── Baromfi (new) ───────────────────────────────────────────────
{ name: 'Csirkeszárny', emoji: '🍗', calories_per_100g: 203, protein_per_100g: 18, carbs_per_100g: 0, fat_per_100g: 14, vegetarian: false },
{ name: 'Csirkemáj', emoji: '🫀', calories_per_100g: 116, protein_per_100g: 17, carbs_per_100g: 1, fat_per_100g: 4.8, vegetarian: false },
{ name: 'Egész csirke', emoji: '🐔', calories_per_100g: 215, protein_per_100g: 18, carbs_per_100g: 0, fat_per_100g: 15, vegetarian: false },
{ name: 'Pulykacomb', emoji: '🦃', calories_per_100g: 144, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 7, vegetarian: false },
{ name: 'Kacsacomb', emoji: '🦆', calories_per_100g: 337, protein_per_100g: 19, carbs_per_100g: 0, fat_per_100g: 28, vegetarian: false },
{ name: 'Kacsamell', emoji: '🦆', calories_per_100g: 135, protein_per_100g: 19, carbs_per_100g: 0, fat_per_100g: 6, vegetarian: false },
{ name: 'Libamell', emoji: '🪿', calories_per_100g: 161, protein_per_100g: 22, carbs_per_100g: 0, fat_per_100g: 8, vegetarian: false },
{ name: 'Fürjtojás', emoji: '🥚', calories_per_100g: 158, protein_per_100g: 13, carbs_per_100g: 0.4, fat_per_100g: 11, vegetarian: true, allergens: ['tojás'] },
// ── Sertés ──────────────────────────────────────────────────────
{ name: 'Sertéskaraj', emoji: '🥩', calories_per_100g: 182, protein_per_100g: 22, carbs_per_100g: 0, fat_per_100g: 10, vegetarian: false },
{ name: 'Sertéstarja', emoji: '🥩', calories_per_100g: 250, protein_per_100g: 17, carbs_per_100g: 0, fat_per_100g: 20, vegetarian: false },
{ name: 'Sertéslapocka', emoji: '🥩', calories_per_100g: 215, protein_per_100g: 18, carbs_per_100g: 0, fat_per_100g: 16, vegetarian: false },
{ name: 'Sertéscomb', emoji: '🥩', calories_per_100g: 185, protein_per_100g: 21, carbs_per_100g: 0, fat_per_100g: 11, vegetarian: false },
{ name: 'Sertésborda', emoji: '🥩', calories_per_100g: 263, protein_per_100g: 17, carbs_per_100g: 0, fat_per_100g: 21, vegetarian: false },
{ name: 'Sertésszűzpecsenye', emoji: '🥩', calories_per_100g: 131, protein_per_100g: 22, carbs_per_100g: 0, fat_per_100g: 4.5, vegetarian: false },
{ name: 'Sertéscsülök', emoji: '🦴', calories_per_100g: 195, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 13, vegetarian: false },
{ name: 'Szalonna', emoji: '🥓', calories_per_100g: 541, protein_per_100g: 8, carbs_per_100g: 0, fat_per_100g: 57, vegetarian: false },
{ name: 'Sertésmáj', emoji: '🫀', calories_per_100g: 134, protein_per_100g: 21, carbs_per_100g: 2.5, fat_per_100g: 3.6, vegetarian: false },
{ name: 'Kolbász', emoji: '🌭', calories_per_100g: 301, protein_per_100g: 12, carbs_per_100g: 2, fat_per_100g: 27, vegetarian: false, allergens: ['glutén'] },
{ name: 'Füstölt sonka', emoji: '🥓', calories_per_100g: 163, protein_per_100g: 21, carbs_per_100g: 0, fat_per_100g: 8.5, vegetarian: false },
{ name: 'Virsli', emoji: '🌭', calories_per_100g: 290, protein_per_100g: 11, carbs_per_100g: 1.5, fat_per_100g: 26, vegetarian: false, allergens: ['glutén'] },
// ── Marha & borjú ───────────────────────────────────────────────
{ name: 'Marhahátszín', emoji: '🥩', calories_per_100g: 217, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 15, vegetarian: false },
{ name: 'Marhacomb', emoji: '🥩', calories_per_100g: 176, protein_per_100g: 24, carbs_per_100g: 0, fat_per_100g: 8.5, vegetarian: false },
{ name: 'Marhalapocka', emoji: '🥩', calories_per_100g: 224, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 16, vegetarian: false },
{ name: 'Marhalábszár', emoji: '🥩', calories_per_100g: 168, protein_per_100g: 22, carbs_per_100g: 0, fat_per_100g: 8.5, vegetarian: false },
{ name: 'Marhamáj', emoji: '🫀', calories_per_100g: 135, protein_per_100g: 21, carbs_per_100g: 4.4, fat_per_100g: 3.6, vegetarian: false },
{ name: 'Borjúborda', emoji: '🥩', calories_per_100g: 189, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 12, vegetarian: false },
{ name: 'Borjúszelet', emoji: '🥩', calories_per_100g: 172, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 10, vegetarian: false },
{ name: 'Borjúmáj', emoji: '🫀', calories_per_100g: 153, protein_per_100g: 20, carbs_per_100g: 3.9, fat_per_100g: 5.8, vegetarian: false },
// ── Bárány & nyúl & vad ─────────────────────────────────────────
{ name: 'Báránykaraj', emoji: '🥩', calories_per_100g: 294, protein_per_100g: 17, carbs_per_100g: 0, fat_per_100g: 25, vegetarian: false },
{ name: 'Báránylapocka', emoji: '🥩', calories_per_100g: 232, protein_per_100g: 18, carbs_per_100g: 0, fat_per_100g: 17, vegetarian: false },
{ name: 'Bárányoldalas', emoji: '🥩', calories_per_100g: 340, protein_per_100g: 16, carbs_per_100g: 0, fat_per_100g: 30, vegetarian: false },
{ name: 'Nyúl', emoji: '🐇', calories_per_100g: 136, protein_per_100g: 21, carbs_per_100g: 0, fat_per_100g: 5.5, vegetarian: false },
{ name: 'Őzhús', emoji: '🦌', calories_per_100g: 158, protein_per_100g: 24, carbs_per_100g: 0, fat_per_100g: 6.5, vegetarian: false },
{ name: 'Szarvashús', emoji: '🦌', calories_per_100g: 158, protein_per_100g: 24, carbs_per_100g: 0, fat_per_100g: 6.5, vegetarian: false },
{ name: 'Vaddisznóhús', emoji: '🐗', calories_per_100g: 122, protein_per_100g: 22, carbs_per_100g: 0, fat_per_100g: 3.3, vegetarian: false },
// ── Hal & tenger gyümölcsei (new items) ─────────────────────────
{ name: 'Harcsa', emoji: '🐟', calories_per_100g: 95, protein_per_100g: 16, carbs_per_100g: 0, fat_per_100g: 3.5, vegetarian: false, allergens: ['hal'] },
{ name: 'Süllő', emoji: '🐟', calories_per_100g: 91, protein_per_100g: 18, carbs_per_100g: 0, fat_per_100g: 1.5, vegetarian: false, allergens: ['hal'] },
{ name: 'Fogas', emoji: '🐟', calories_per_100g: 84, protein_per_100g: 17, carbs_per_100g: 0, fat_per_100g: 1.2, vegetarian: false, allergens: ['hal'] },
{ name: 'Tőkehal', emoji: '🐟', calories_per_100g: 82, protein_per_100g: 18, carbs_per_100g: 0, fat_per_100g: 0.7, vegetarian: false, allergens: ['hal'] },
{ name: 'Hering', emoji: '🐟', calories_per_100g: 158, protein_per_100g: 18, carbs_per_100g: 0, fat_per_100g: 9, vegetarian: false, allergens: ['hal'] },
{ name: 'Tilápia', emoji: '🐟', calories_per_100g: 96, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 1.7, vegetarian: false, allergens: ['hal'] },
{ name: 'Garnéla', emoji: '🦐', calories_per_100g: 99, protein_per_100g: 24, carbs_per_100g: 0.2, fat_per_100g: 0.3, vegetarian: false, allergens: ['rákféle'] },
{ name: 'Kagyló', emoji: '🦪', calories_per_100g: 86, protein_per_100g: 12, carbs_per_100g: 3.7, fat_per_100g: 2, vegetarian: false, allergens: ['rákféle'] },
{ name: 'Polip', emoji: '🐙', calories_per_100g: 82, protein_per_100g: 15, carbs_per_100g: 2.2, fat_per_100g: 1, vegetarian: false, allergens: ['rákféle'] },
{ name: 'Tintahal', emoji: '🦑', calories_per_100g: 92, protein_per_100g: 16, carbs_per_100g: 3, fat_per_100g: 1.4, vegetarian: false, allergens: ['rákféle'] },
{ name: 'Rák', emoji: '🦀', calories_per_100g: 87, protein_per_100g: 18, carbs_per_100g: 0.4, fat_per_100g: 1.1, vegetarian: false, allergens: ['rákféle'] },
// ── Kecske & juh termékek ────────────────────────────────────────
{ name: 'Kecskesajt', emoji: '🧀', calories_per_100g: 264, protein_per_100g: 18, carbs_per_100g: 0, fat_per_100g: 21, vegetarian: true },
{ name: 'Kecsketúró', emoji: '🫙', calories_per_100g: 90, protein_per_100g: 11, carbs_per_100g: 3, fat_per_100g: 4, vegetarian: true },
{ name: 'Kecske joghurt', emoji: '🥛', calories_per_100g: 59, protein_per_100g: 3.8, carbs_per_100g: 4.1, fat_per_100g: 3.5, vegetarian: true },
{ name: 'Kecsketej', emoji: '🥛', calories_per_100g: 69, protein_per_100g: 3.6, carbs_per_100g: 4.4, fat_per_100g: 4.2, vegetarian: true },
{ name: 'Kecske tejföl', emoji: '🥛', calories_per_100g: 170, protein_per_100g: 3, carbs_per_100g: 3.5, fat_per_100g: 16, vegetarian: true },
{ name: 'Juhtúró', emoji: '🫙', calories_per_100g: 113, protein_per_100g: 11, carbs_per_100g: 3.5, fat_per_100g: 6.5, vegetarian: true },
{ name: 'Juh joghurt', emoji: '🥛', calories_per_100g: 78, protein_per_100g: 4.5, carbs_per_100g: 5, fat_per_100g: 4.5, vegetarian: true },
{ name: 'Juhtej', emoji: '🥛', calories_per_100g: 108, protein_per_100g: 5.4, carbs_per_100g: 4.8, fat_per_100g: 7, vegetarian: true },
{ name: 'Brinza', emoji: '🧀', calories_per_100g: 260, protein_per_100g: 14, carbs_per_100g: 2, fat_per_100g: 22, vegetarian: true },
{ name: 'Manchego', emoji: '🧀', calories_per_100g: 395, protein_per_100g: 25, carbs_per_100g: 0.5, fat_per_100g: 32, vegetarian: true },
// ── Bivaly termékek ──────────────────────────────────────────────
{ name: 'Bivalytej', emoji: '🥛', calories_per_100g: 117, protein_per_100g: 4.5, carbs_per_100g: 5, fat_per_100g: 8, vegetarian: true },
{ name: 'Bivaly joghurt', emoji: '🥛', calories_per_100g: 100, protein_per_100g: 5, carbs_per_100g: 5, fat_per_100g: 6.5, vegetarian: true },
{ name: 'Bivaly mozzarella', emoji: '🧀', calories_per_100g: 264, protein_per_100g: 16, carbs_per_100g: 2.5, fat_per_100g: 20, vegetarian: true },
{ name: 'Bivaly túró', emoji: '🫙', calories_per_100g: 120, protein_per_100g: 12, carbs_per_100g: 3, fat_per_100g: 7, vegetarian: true },
{ name: 'Bivaly kefir', emoji: '🥛', calories_per_100g: 95, protein_per_100g: 4.5, carbs_per_100g: 5, fat_per_100g: 5.5, vegetarian: true },
// ── Növényi fehérjék (new) ───────────────────────────────────────
{ name: 'Zöld lencse', emoji: '🫘', calories_per_100g: 116, protein_per_100g: 9, carbs_per_100g: 20, fat_per_100g: 0.4, vegetarian: true },
{ name: 'Fekete bab', emoji: '🫘', calories_per_100g: 132, protein_per_100g: 9, carbs_per_100g: 24, fat_per_100g: 0.5, vegetarian: true },
{ name: 'Fehér bab', emoji: '🫘', calories_per_100g: 127, protein_per_100g: 8.7, carbs_per_100g: 22, fat_per_100g: 0.5, vegetarian: true },
{ name: 'Tarkabab', emoji: '🫘', calories_per_100g: 127, protein_per_100g: 8.7, carbs_per_100g: 22, fat_per_100g: 0.5, vegetarian: true },
{ name: 'Kidney bab', emoji: '🫘', calories_per_100g: 127, protein_per_100g: 8.7, carbs_per_100g: 22, fat_per_100g: 0.5, vegetarian: true },
{ name: 'Mandulavaj', emoji: '🫙', calories_per_100g: 614, protein_per_100g: 21, carbs_per_100g: 19, fat_per_100g: 56, vegetarian: true, allergens: ['diófélék'] },
// ── Gabonák (new names) ─────────────────────────────────────────
{ name: 'Fehér tészta', emoji: '🍝', calories_per_100g: 157, protein_per_100g: 5.8, carbs_per_100g: 31, fat_per_100g: 0.9, vegetarian: true, allergens: ['glutén'] },
{ name: 'Fehér kenyér', emoji: '🍞', calories_per_100g: 265, protein_per_100g: 9, carbs_per_100g: 49, fat_per_100g: 3.2, vegetarian: true, allergens: ['glutén'] },
{ name: 'Kuszkusz', emoji: '🫙', calories_per_100g: 176, protein_per_100g: 6, carbs_per_100g: 36, fat_per_100g: 0.3, vegetarian: true, allergens: ['glutén'] },
{ name: 'Bulgur', emoji: '🫙', calories_per_100g: 151, protein_per_100g: 5.6, carbs_per_100g: 34, fat_per_100g: 0.5, vegetarian: true, allergens: ['glutén'] },
{ name: 'Basmati rizs', emoji: '🍚', calories_per_100g: 150, protein_per_100g: 3.5, carbs_per_100g: 33, fat_per_100g: 0.4, vegetarian: true },
{ name: 'Vadrizs', emoji: '🌾', calories_per_100g: 101, protein_per_100g: 4, carbs_per_100g: 21, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Köles', emoji: '🌾', calories_per_100g: 119, protein_per_100g: 3.5, carbs_per_100g: 23, fat_per_100g: 1, vegetarian: true },
{ name: 'Búzadara', emoji: '🌾', calories_per_100g: 360, protein_per_100g: 13, carbs_per_100g: 73, fat_per_100g: 1, vegetarian: true, allergens: ['glutén'] },
{ name: 'Polenta', emoji: '🫙', calories_per_100g: 71, protein_per_100g: 1.7, carbs_per_100g: 14, fat_per_100g: 0.9, vegetarian: true },
// ── Zöldségek — gyökér ──────────────────────────────────────────
{ name: 'Fehérrépa', emoji: '🥕', calories_per_100g: 37, protein_per_100g: 1.2, carbs_per_100g: 8.5, fat_per_100g: 0.1, vegetarian: true },
{ name: 'Paszternák', emoji: '🥕', calories_per_100g: 75, protein_per_100g: 1.3, carbs_per_100g: 18, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Petrezselyemgyökér', emoji: '🌿', calories_per_100g: 55, protein_per_100g: 1.5, carbs_per_100g: 12, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Gumós zeller', emoji: '🥬', calories_per_100g: 42, protein_per_100g: 1.5, carbs_per_100g: 9.2, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Retek', emoji: '🌶️', calories_per_100g: 16, protein_per_100g: 0.7, carbs_per_100g: 3.4, fat_per_100g: 0.1, vegetarian: true },
{ name: 'Torma', emoji: '🌿', calories_per_100g: 48, protein_per_100g: 1.2, carbs_per_100g: 11, fat_per_100g: 0.7, vegetarian: true },
{ name: 'Csicsóka', emoji: '🥔', calories_per_100g: 73, protein_per_100g: 2, carbs_per_100g: 17, fat_per_100g: 0.0, vegetarian: true },
// ── Zöldségek — káposzta ────────────────────────────────────────
{ name: 'Vörös káposzta', emoji: '🥬', calories_per_100g: 31, protein_per_100g: 1.4, carbs_per_100g: 7.4, fat_per_100g: 0.1, vegetarian: true },
{ name: 'Savanyú káposzta', emoji: '🥬', calories_per_100g: 19, protein_per_100g: 0.9, carbs_per_100g: 4.3, fat_per_100g: 0.1, vegetarian: true },
{ name: 'Karalábé', emoji: '🥬', calories_per_100g: 27, protein_per_100g: 1.7, carbs_per_100g: 6.2, fat_per_100g: 0.1, vegetarian: true },
{ name: 'Kelbimbó', emoji: '🥦', calories_per_100g: 43, protein_per_100g: 3.4, carbs_per_100g: 9, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Kínai kel', emoji: '🥬', calories_per_100g: 13, protein_per_100g: 1.5, carbs_per_100g: 2.2, fat_per_100g: 0.2, vegetarian: true },
{ name: 'Pak choi', emoji: '🥬', calories_per_100g: 13, protein_per_100g: 1.5, carbs_per_100g: 2.2, fat_per_100g: 0.2, vegetarian: true },
// ── Zöldségek — levél ───────────────────────────────────────────
{ name: 'Jégsaláta', emoji: '🥗', calories_per_100g: 14, protein_per_100g: 0.9, carbs_per_100g: 2.9, fat_per_100g: 0.1, vegetarian: true },
{ name: 'Rukkola', emoji: '🥗', calories_per_100g: 25, protein_per_100g: 2.6, carbs_per_100g: 3.7, fat_per_100g: 0.7, vegetarian: true },
{ name: 'Sóska', emoji: '🥬', calories_per_100g: 22, protein_per_100g: 2, carbs_per_100g: 3.2, fat_per_100g: 0.7, vegetarian: true },
{ name: 'Cikória', emoji: '🥬', calories_per_100g: 23, protein_per_100g: 1.7, carbs_per_100g: 4.7, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Endívia', emoji: '🥬', calories_per_100g: 17, protein_per_100g: 1.3, carbs_per_100g: 3.4, fat_per_100g: 0.2, vegetarian: true },
{ name: 'Radicchio', emoji: '🥗', calories_per_100g: 23, protein_per_100g: 1.4, carbs_per_100g: 4.5, fat_per_100g: 0.3, vegetarian: true },
// ── Zöldségek — hagyma ──────────────────────────────────────────
{ name: 'Fehér hagyma', emoji: '🧅', calories_per_100g: 40, protein_per_100g: 1.1, carbs_per_100g: 9.3, fat_per_100g: 0.1, vegetarian: true },
{ name: 'Lilahagyma', emoji: '🧅', calories_per_100g: 40, protein_per_100g: 1.1, carbs_per_100g: 9.3, fat_per_100g: 0.1, vegetarian: true },
{ name: 'Póréhagyma', emoji: '🧅', calories_per_100g: 61, protein_per_100g: 1.5, carbs_per_100g: 14, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Metélőhagyma', emoji: '🌿', calories_per_100g: 30, protein_per_100g: 3.3, carbs_per_100g: 4.4, fat_per_100g: 0.7, vegetarian: true },
{ name: 'Újhagyma', emoji: '🧅', calories_per_100g: 32, protein_per_100g: 1.8, carbs_per_100g: 7.3, fat_per_100g: 0.2, vegetarian: true },
// ── Zöldségek — paradicsom & paprika ────────────────────────────
{ name: 'Koktélparadicsom', emoji: '🍅', calories_per_100g: 18, protein_per_100g: 0.9, carbs_per_100g: 3.9, fat_per_100g: 0.2, vegetarian: true },
{ name: 'Piros paprika', emoji: '🫑', calories_per_100g: 31, protein_per_100g: 1, carbs_per_100g: 6, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Zöld paprika', emoji: '🫑', calories_per_100g: 20, protein_per_100g: 0.9, carbs_per_100g: 4.6, fat_per_100g: 0.2, vegetarian: true },
{ name: 'Sárga paprika', emoji: '🫑', calories_per_100g: 27, protein_per_100g: 1, carbs_per_100g: 6.3, fat_per_100g: 0.2, vegetarian: true },
{ name: 'Csilipaprika', emoji: '🌶️', calories_per_100g: 40, protein_per_100g: 1.9, carbs_per_100g: 9, fat_per_100g: 0.4, vegetarian: true },
{ name: 'Tök', emoji: '🎃', calories_per_100g: 20, protein_per_100g: 1, carbs_per_100g: 4.9, fat_per_100g: 0.1, vegetarian: true },
{ name: 'Sütőtök', emoji: '🎃', calories_per_100g: 26, protein_per_100g: 1, carbs_per_100g: 6.5, fat_per_100g: 0.1, vegetarian: true },
// ── Zöldségek — egyéb ───────────────────────────────────────────
{ name: 'Articsóka', emoji: '🌿', calories_per_100g: 47, protein_per_100g: 3.3, carbs_per_100g: 10.5, fat_per_100g: 0.2, vegetarian: true },
{ name: 'Édeskömény', emoji: '🌿', calories_per_100g: 31, protein_per_100g: 1.2, carbs_per_100g: 7.3, fat_per_100g: 0.2, vegetarian: true },
{ name: 'Shiitake gomba', emoji: '🍄', calories_per_100g: 34, protein_per_100g: 2.2, carbs_per_100g: 6.8, fat_per_100g: 0.5, vegetarian: true },
{ name: 'Laskagomba', emoji: '🍄', calories_per_100g: 33, protein_per_100g: 3.3, carbs_per_100g: 6.1, fat_per_100g: 0.4, vegetarian: true },
{ name: 'Portobello gomba', emoji: '🍄', calories_per_100g: 22, protein_per_100g: 2.1, carbs_per_100g: 4.3, fat_per_100g: 0.4, vegetarian: true },
{ name: 'Kapribogyó', emoji: '🫙', calories_per_100g: 23, protein_per_100g: 2.4, carbs_per_100g: 4.9, fat_per_100g: 0.9, vegetarian: true },
// ── Gyümölcsök (new) ────────────────────────────────────────────
{ name: 'Birs', emoji: '🍐', calories_per_100g: 57, protein_per_100g: 0.4, carbs_per_100g: 15.3, fat_per_100g: 0.1, vegetarian: true },
{ name: 'Nektarin', emoji: '🍑', calories_per_100g: 44, protein_per_100g: 1.1, carbs_per_100g: 10.6, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Meggy', emoji: '🍒', calories_per_100g: 50, protein_per_100g: 1, carbs_per_100g: 12.2, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Ribizli', emoji: '🫐', calories_per_100g: 56, protein_per_100g: 1.4, carbs_per_100g: 13.8, fat_per_100g: 0.2, vegetarian: true },
{ name: 'Egres', emoji: '🫐', calories_per_100g: 44, protein_per_100g: 0.9, carbs_per_100g: 10.2, fat_per_100g: 0.6, vegetarian: true },
{ name: 'Szőlő', emoji: '🍇', calories_per_100g: 69, protein_per_100g: 0.7, carbs_per_100g: 18.1, fat_per_100g: 0.2, vegetarian: true },
{ name: 'Görögdinnye', emoji: '🍉', calories_per_100g: 30, protein_per_100g: 0.6, carbs_per_100g: 7.6, fat_per_100g: 0.2, vegetarian: true },
{ name: 'Sárgadinnye', emoji: '🍈', calories_per_100g: 34, protein_per_100g: 0.8, carbs_per_100g: 8.6, fat_per_100g: 0.2, vegetarian: true },
{ name: 'Füge', emoji: '🍑', calories_per_100g: 74, protein_per_100g: 0.8, carbs_per_100g: 19.2, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Mandarin', emoji: '🍊', calories_per_100g: 53, protein_per_100g: 0.8, carbs_per_100g: 13.3, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Klementina', emoji: '🍊', calories_per_100g: 47, protein_per_100g: 0.9, carbs_per_100g: 12, fat_per_100g: 0.2, vegetarian: true },
{ name: 'Grapefruit', emoji: '🍊', calories_per_100g: 42, protein_per_100g: 0.8, carbs_per_100g: 10.7, fat_per_100g: 0.1, vegetarian: true },
{ name: 'Kivi', emoji: '🥝', calories_per_100g: 61, protein_per_100g: 1.1, carbs_per_100g: 14.7, fat_per_100g: 0.5, vegetarian: true },
{ name: 'Mangó', emoji: '🥭', calories_per_100g: 60, protein_per_100g: 0.8, carbs_per_100g: 15, fat_per_100g: 0.4, vegetarian: true },
{ name: 'Ananász', emoji: '🍍', calories_per_100g: 50, protein_per_100g: 0.5, carbs_per_100g: 13.1, fat_per_100g: 0.1, vegetarian: true },
{ name: 'Papaya', emoji: '🍈', calories_per_100g: 43, protein_per_100g: 0.5, carbs_per_100g: 11, fat_per_100g: 0.3, vegetarian: true },
{ name: 'Gránátalma', emoji: '🍎', calories_per_100g: 83, protein_per_100g: 1.7, carbs_per_100g: 18.7, fat_per_100g: 1.2, vegetarian: true },
{ name: 'Datolya', emoji: '🌴', calories_per_100g: 282, protein_per_100g: 2.5, carbs_per_100g: 75, fat_per_100g: 0.4, vegetarian: true },
{ name: 'Aszalt szilva', emoji: '🫙', calories_per_100g: 240, protein_per_100g: 2.2, carbs_per_100g: 64, fat_per_100g: 0.4, vegetarian: true },
{ name: 'Aszalt sárgabarack', emoji: '🫙', calories_per_100g: 241, protein_per_100g: 3.4, carbs_per_100g: 63, fat_per_100g: 0.5, vegetarian: true },
{ name: 'Mazsola', emoji: '🫙', calories_per_100g: 299, protein_per_100g: 3.1, carbs_per_100g: 79, fat_per_100g: 0.5, vegetarian: true },
// ── Olajok (new) ────────────────────────────────────────────────
{ name: 'Repceolaj', emoji: '🫙', calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, vegetarian: true },
{ name: 'Avokádóolaj', emoji: '🥑', calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, vegetarian: true },
{ name: 'Szezámolaj', emoji: '🫙', calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, vegetarian: true },
{ name: 'Lenmagolaj', emoji: '🫙', calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, vegetarian: true },
{ name: 'Sertészsír', emoji: '🫙', calories_per_100g: 902, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, vegetarian: false },
{ name: 'Libázsír', emoji: '🫙', calories_per_100g: 900, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, vegetarian: false },
// ── Magvak & olajos magvak (new) ────────────────────────────────
{ name: 'Chiamag', emoji: '🌱', calories_per_100g: 486, protein_per_100g: 17, carbs_per_100g: 42, fat_per_100g: 31, vegetarian: true },
{ name: 'Makadámia dió', emoji: '🌰', calories_per_100g: 718, protein_per_100g: 7.9, carbs_per_100g: 13.8, fat_per_100g: 75.8, vegetarian: true, allergens: ['diófélék'] },
{ name: 'Pekándió', emoji: '🌰', calories_per_100g: 691, protein_per_100g: 9.2, carbs_per_100g: 13.9, fat_per_100g: 71.9, vegetarian: true, allergens: ['diófélék'] },
{ name: 'Brazil dió', emoji: '🌰', calories_per_100g: 659, protein_per_100g: 14.3, carbs_per_100g: 11.7, fat_per_100g: 67.1, vegetarian: true, allergens: ['diófélék'] },
{ name: 'Fenyőmag', emoji: '🌰', calories_per_100g: 673, protein_per_100g: 13.7, carbs_per_100g: 13.1, fat_per_100g: 68.4, vegetarian: true, allergens: ['diófélék'] },
{ name: 'Gesztenye', emoji: '🌰', calories_per_100g: 245, protein_per_100g: 3.2, carbs_per_100g: 53, fat_per_100g: 2.5, vegetarian: true },
{ name: 'Mák', emoji: '🌱', calories_per_100g: 525, protein_per_100g: 18, carbs_per_100g: 28, fat_per_100g: 42, vegetarian: true, allergens: ['diófélék'] },
```

- [ ] **Step 4: Add CURATED_ALTERNATIVES export after SEED_FOODS**

```typescript
// Maps allergen alternative keys → food names (canonical, exist in SEED_FOODS)
export const ALTERNATIVE_NAMES: Record<string, string[]> = {
  kecske: ['Kecsketej', 'Kecske joghurt', 'Kecskesajt', 'Kecsketúró', 'Kecske tejföl'],
  juh: ['Juhtej', 'Juh joghurt', 'Juhtúró', 'Brinza', 'Manchego'],
  bivaly: ['Bivalytej', 'Bivaly joghurt', 'Bivaly mozzarella', 'Bivaly túró', 'Bivaly kefir'],
  'mandula tej': ['Mandulavaj', 'Mandula'],
  mandula: ['Mandulavaj', 'Mandula'],
  'zab tej': ['Zabpehely'],
  zab: ['Zabpehely'],
  'kókusz tej': ['Kókuszolaj'],
  kókusz: ['Kókuszolaj'],
  'rizs tej': ['Fehér rizs', 'Barna rizs'],
  'szója tej': ['Tofu', 'Tempeh', 'Edamame'],
};
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/data/seedFoods.ts
git commit -m "feat: add expanded 250-item food catalog to seedFoods.ts"
```

---

## Task 3: buildIngredientSelection Utility (TDD)

**Files:**
- Create: `src/app/utils/buildIngredientSelection.ts`
- Edit: `src/app/utils/buildIngredientSelection.test.ts`

- [ ] **Step 1: Replace smoke test with real failing tests**

Replace the content of `src/app/utils/buildIngredientSelection.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildIngredientSelection } from './buildIngredientSelection';

describe('buildIngredientSelection', () => {
  it('sporty style includes chicken and eggs', () => {
    const result = buildIngredientSelection(['sporty'], new Set(), new Set());
    expect(result.has('Csirkemell')).toBe(true);
    expect(result.has('Tojás')).toBe(true);
  });

  it('sporty style does not include red meat', () => {
    const result = buildIngredientSelection(['sporty'], new Set(), new Set());
    expect(result.has('Marhahátszín')).toBe(false);
    expect(result.has('Sertéskaraj')).toBe(false);
  });

  it('plant style includes vegetables and legumes', () => {
    const result = buildIngredientSelection(['plant'], new Set(), new Set());
    expect(result.has('Tofu')).toBe(true);
    expect(result.has('Lencse')).toBe(true);
    expect(result.has('Brokkoli')).toBe(true);
  });

  it('plant style excludes red meat when selected alone', () => {
    const result = buildIngredientSelection(['plant'], new Set(), new Set());
    expect(result.has('Marhahátszín')).toBe(false);
    expect(result.has('Kolbász')).toBe(false);
  });

  it('plant + traditional: traditional wins — meat is included', () => {
    const result = buildIngredientSelection(['plant', 'traditional'], new Set(), new Set());
    expect(result.has('Marhahátszín')).toBe(true);
    expect(result.has('Sertéskaraj')).toBe(true);
    expect(result.has('Tofu')).toBe(true); // plant foods still included
  });

  it('mediterranean includes fish and olive oil', () => {
    const result = buildIngredientSelection(['mediterranean'], new Set(), new Set());
    expect(result.has('Lazac')).toBe(true);
    expect(result.has('Garnéla')).toBe(true);
    expect(result.has('Olívaolaj')).toBe(true);
  });

  it('allergen removes dairy foods', () => {
    const result = buildIngredientSelection(['sporty'], new Set(['laktóz']), new Set());
    expect(result.has('Görög joghurt')).toBe(false);
    expect(result.has('Tehéntej')).toBe(false);
  });

  it('allergen + alternative: adds alternative foods', () => {
    const result = buildIngredientSelection(['sporty'], new Set(['laktóz']), new Set(['kecske']));
    expect(result.has('Kecsketej')).toBe(true);
    expect(result.has('Kecske joghurt')).toBe(true);
  });

  it('empty styles returns all SEED_FOODS names', () => {
    const result = buildIngredientSelection([], new Set(), new Set());
    expect(result.size).toBeGreaterThan(200);
  });

  it('returns minimum viable set when allergens remove everything', () => {
    const allAllergens = new Set(['laktóz', 'glutén', 'tojás', 'hal', 'diófélék', 'szója', 'rákféle']);
    // Use a tiny custom style list that gets entirely wiped
    // We simulate by passing all allergens with sporty (sporty has eggs/dairy)
    const result = buildIngredientSelection(['sporty'], allAllergens, new Set());
    // Should always have at least the safe fallback staples
    expect(result.has('Fehér rizs')).toBe(true);
    expect(result.has('Brokkoli')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — all should fail**

```bash
npm test
```

Expected: `FAIL — Cannot find module './buildIngredientSelection'` (or similar import error).

- [ ] **Step 3: Create `src/app/utils/buildIngredientSelection.ts`**

```typescript
import { SEED_FOODS, ALTERNATIVE_NAMES } from '../data/seedFoods';

export type FoodStyle = 'sporty' | 'plant' | 'traditional' | 'mediterranean';

// ── Activation lists (food names from spec Section 4) ──────────────────────

const ALL_VEGETABLES = [
  'Sárgarépa','Fehérrépa','Paszternák','Petrezselyemgyökér','Gumós zeller','Cékla','Retek','Torma','Csicsóka',
  'Fejes káposzta','Vörös káposzta','Kelkáposzta','Savanyú káposzta','Karalábé','Karfiol','Brokkoli','Kelbimbó','Kínai kel','Pak choi',
  'Fejes saláta','Jégsaláta','Rukkola','Spenót','Mángold','Sóska','Cikória','Endívia','Radicchio',
  'Vöröshagyma','Fehér hagyma','Lilahagyma','Fokhagyma','Póréhagyma','Metélőhagyma','Újhagyma',
  'Paradicsom','Koktélparadicsom','Paprika','Piros paprika','Zöld paprika','Sárga paprika','Csilipaprika','Padlizsán','Cukkini','Tök','Sütőtök',
  'Uborka','Spárga','Articsóka','Édeskömény','Gomba','Shiitake gomba','Laskagomba','Portobello gomba','Avokádó','Olajbogyó','Kapribogyó','Kukorica','Zöldbab',
];

const ALL_FRUITS = [
  'Alma','Körte','Birs','Őszibarack','Nektarin','Sárgabarack','Szilva','Meggy','Cseresznye','Eper','Málna','Áfonya','Szeder','Ribizli','Egres','Szőlő',
  'Görögdinnye','Sárgadinnye','Füge','Narancs','Mandarin','Klementina','Citrom','Lime','Grapefruit','Banán','Kivi','Mangó','Ananász','Papaya',
  'Gránátalma','Datolya','Aszalt szilva','Aszalt sárgabarack','Mazsola',
];

const ALL_LEGUMES = [
  'Tofu','Tempeh','Edamame','Lencse','Vörös lencse','Zöld lencse','Csicseriborsó','Fekete bab','Fehér bab','Tarkabab','Kidney bab',
  'Humusz','Zöldborsó','Mogyoróvaj','Mandulavaj','Kesudióvaj',
];

const ALL_SEEDS_NUTS = [
  'Napraforgómag','Tökmag','Lenmag','Chiamag','Szezámmag','Dió','Mogyoró','Mandula','Kesudió','Makadámia dió','Pisztácia','Pekándió','Brazil dió','Fenyőmag','Gesztenye','Mák',
];

const STYLE_ACTIVATIONS: Record<FoodStyle, string[]> = {
  sporty: [
    'Csirkemell','Csirkecomb','Pulykamell','Tojás','Görög joghurt','Kefir','Túró','Cottage cheese',
    'Lencse','Vörös lencse','Csicseriborsó','Tofu','Tempeh','Edamame',
    'Zabpehely','Quinoa','Édesburgonya',
    ...ALL_VEGETABLES,
    'Alma','Körte','Málna','Áfonya','Eper','Citrom',
  ],
  plant: [
    ...ALL_LEGUMES,
    ...ALL_VEGETABLES,
    ...ALL_FRUITS,
    ...ALL_SEEDS_NUTS,
    'Quinoa','Hajdina','Köles','Amaránt','Zabpehely','Barna rizs',
    'Olívaolaj','Avokádóolaj','Tofu','Tempeh','Edamame','Humusz',
  ],
  traditional: [
    'Sertéskaraj','Sertéstarja','Sertéslapocka','Sertéscomb','Sertésborda','Sertésszűzpecsenye','Sertéscsülök',
    'Marhahátszín','Marhacomb','Marhalapocka','Marhalábszár',
    'Csirkemell','Csirkecomb','Pulykamell','Tojás',
    'Burgonya','Édesburgonya','Sárgarépa','Fehér hagyma','Fokhagyma','Paprika',
    'Fejes káposzta','Vörös káposzta','Kelkáposzta',
    'Fehér tészta','Fehér kenyér','Rozskenyér',
    'Tejföl','Vaj','Gouda sajt','Trappista sajt','Tejszín',
  ],
  mediterranean: [
    'Lazac','Tonhal','Makréla','Harcsa','Süllő','Ponty','Pisztráng','Fogas','Tőkehal','Szardínia','Tilápia','Garnéla',
    'Olívaolaj','Olajbogyó','Kapribogyó',
    'Paradicsom','Koktélparadicsom','Cukkini','Padlizsán','Paprika','Piros paprika','Fokhagyma','Citrom','Lime',
    'Fehér rizs','Basmati rizs','Kuszkusz','Bulgur',
    'Feta sajt','Mozzarella','Ricotta',
  ],
};

// Foods excluded when 'plant' is selected without 'traditional'
const PLANT_DEACTIVATIONS = new Set([
  'Marhahátszín','Marhacomb','Marhalapocka','Marhalábszár',
  'Sertéskaraj','Sertéstarja','Sertéslapocka','Sertéscomb','Sertésborda','Sertésszűzpecsenye','Sertéscsülök',
  'Szalonna','Csirkemáj','Marhamáj','Sertésmáj','Kolbász','Virsli','Füstölt sonka',
]);

// Foods excluded when 'mediterranean' is selected without 'traditional'
const MEDITERRANEAN_DEACTIVATIONS = new Set([
  'Sertéscsülök','Szalonna','Kolbász','Virsli','Füstölt sonka',
]);

const MINIMUM_VIABLE_SET = ['Fehér rizs','Brokkoli','Sárgarépa','Alma','Burgonya','Lencse'];

export function buildIngredientSelection(
  selectedStyles: FoodStyle[],
  activeAllergens: Set<string>,
  selectedAlternativeKeys: Set<string>,
): Set<string> {
  // Edge case: empty styles → return all SEED_FOODS
  if (selectedStyles.length === 0) {
    return new Set(SEED_FOODS.map(f => f.name));
  }

  // 1. Build name set from style activations (union)
  const names = new Set<string>();
  for (const style of selectedStyles) {
    for (const name of STYLE_ACTIVATIONS[style]) {
      names.add(name);
    }
  }

  // 2. Apply deactivations — only when the other style doesn't override
  const hasTraditional = selectedStyles.includes('traditional');

  if (selectedStyles.includes('plant') && !hasTraditional) {
    for (const name of PLANT_DEACTIVATIONS) {
      names.delete(name);
    }
  }

  if (selectedStyles.includes('mediterranean') && !hasTraditional) {
    for (const name of MEDITERRANEAN_DEACTIVATIONS) {
      names.delete(name);
    }
  }

  // 3. Allergen exclusion — remove foods that have matching allergen tags
  const foodAllergenMap = new Map(
    SEED_FOODS.filter(f => f.allergens?.length).map(f => [f.name, f.allergens!])
  );

  for (const allergen of activeAllergens) {
    for (const name of [...names]) {
      const allergens = foodAllergenMap.get(name);
      if (allergens?.includes(allergen.toLowerCase())) {
        names.delete(name);
      }
    }
  }

  // 4. Add alternative foods
  for (const key of selectedAlternativeKeys) {
    const alternatives = ALTERNATIVE_NAMES[key] ?? [];
    for (const name of alternatives) {
      names.add(name);
    }
  }

  // 5. Safety fallback
  if (names.size === 0) {
    return new Set(MINIMUM_VIABLE_SET);
  }

  return names;
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
npm test
```

Expected: `✓ 10 tests passed`

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/utils/buildIngredientSelection.ts src/app/utils/buildIngredientSelection.test.ts
git commit -m "feat: add buildIngredientSelection utility with full style/allergen logic"
```

---

## Task 4: Translation Keys

**Files:**
- Modify: `src/app/translations/index.ts`

The file has 3 locale sections (hu, en, ro). Each has a `wizard` sub-object. Find `wizard.meals` in each locale and add the new `foodStyle` block nearby. There is no existing `wizard.foodStyle` key.

- [ ] **Step 1: Add `wizard.foodStyle` keys to the Hungarian locale (`hu`)**

Find the `wizard:` block in the `hu` section. Add after `wizard.meals` (or before `wizard.personal` — near the top of the wizard keys):

```typescript
foodStyle: {
  title: 'Melyik a te vacsorád?',
  subtitle: 'Ebből felépítjük az étrendedet',
  maxBadge: 'Max 2 választható',
  maxReached: '✓ {n}/2 kiválasztva',
  sportyLabel: 'Sportos & fehérjedús',
  sportyDesc: 'Csirke, tojás, joghurt, quinoa',
  plantLabel: 'Könnyű & növényi',
  plantDesc: 'Tofu, lencse, zöldségek, gyümölcsök',
  traditionalLabel: 'Hagyományos & laktató',
  traditionalDesc: 'Marhahús, sertés, burgonya, tészta',
  mediterraneanLabel: 'Mediterrán',
  mediterraneanDesc: 'Hal, olívaolaj, zöldségek, rizs',
  allergyTitle: 'Van allergiád?',
  detailedSetup: 'Részletesebb alapanyag beállítás →',
  ctaDisabled: 'Válassz legalább 1 stílust',
},
```

- [ ] **Step 2: Add the same block to the English locale (`en`)**

```typescript
foodStyle: {
  title: 'Which dinner is yours?',
  subtitle: "We'll build your meal plan from this",
  maxBadge: 'Max 2 selectable',
  maxReached: '✓ {n}/2 selected',
  sportyLabel: 'Sporty & protein-rich',
  sportyDesc: 'Chicken, eggs, yogurt, quinoa',
  plantLabel: 'Light & plant-based',
  plantDesc: 'Tofu, lentils, vegetables, fruits',
  traditionalLabel: 'Traditional & hearty',
  traditionalDesc: 'Beef, pork, potato, pasta',
  mediterraneanLabel: 'Mediterranean',
  mediterraneanDesc: 'Fish, olive oil, vegetables, rice',
  allergyTitle: 'Any allergies?',
  detailedSetup: 'Detailed ingredient setup →',
  ctaDisabled: 'Select at least 1 style',
},
```

- [ ] **Step 3: Add the same block to the Romanian locale (`ro`)**

```typescript
foodStyle: {
  title: 'Care este cina ta?',
  subtitle: 'Din aceasta construim planul tău',
  maxBadge: 'Max 2 selectabile',
  maxReached: '✓ {n}/2 selectate',
  sportyLabel: 'Sportiv & bogat în proteine',
  sportyDesc: 'Pui, ouă, iaurt, quinoa',
  plantLabel: 'Ușor & vegetal',
  plantDesc: 'Tofu, linte, legume, fructe',
  traditionalLabel: 'Tradițional & consistent',
  traditionalDesc: 'Vită, porc, cartofi, paste',
  mediterraneanLabel: 'Mediteranean',
  mediterraneanDesc: 'Pește, ulei de măsline, legume, orez',
  allergyTitle: 'Ai alergii?',
  detailedSetup: 'Configurare detaliată ingrediente →',
  ctaDisabled: 'Selectează cel puțin 1 stil',
},
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors (the translations file uses `as const` or record types that should pick up new keys).

- [ ] **Step 5: Commit**

```bash
git add src/app/translations/index.ts
git commit -m "feat: add wizard.foodStyle translation keys (hu/en/ro)"
```

---

## Task 5: StepFoodStyle Component

**Files:**
- Create: `src/app/components/onboarding/StepFoodStyle.tsx`

This component renders the 2×2 photo grid plus allergen panel. It does NOT render navigation buttons (those are in the wizard outer shell).

The allergen panel logic is very similar to the existing `StepCriteria` component in `ProfileSetupWizardLegacy.tsx` (lines 1101–1227). Read that component for reference on the allergen toggle/alternatives rendering pattern, but do NOT modify it.

- [ ] **Step 1: Create `src/app/components/onboarding/StepFoodStyle.tsx`**

```typescript
import { FoodStyle } from '../../utils/buildIngredientSelection';
import { useTranslation } from '../../hooks/useTranslation'; // adjust import to match existing pattern

// Hardcoded allergen data — matches CURATED_ALLERGENS in legacy wizard
const ALLERGENS = ['Laktóz', 'Glutén', 'Tojás', 'Hal', 'Diófélék', 'Szója', 'Rákféle'];

// Alternative key chips shown per allergen (keys map to ALTERNATIVE_NAMES in seedFoods)
const ALLERGEN_ALTERNATIVES: Record<string, { key: string; label: string }[]> = {
  Laktóz: [
    { key: 'kecske', label: '🐐 Kecske' },
    { key: 'juh', label: '🐑 Juh' },
    { key: 'bivaly', label: '🐃 Bivaly' },
    { key: 'zab tej', label: '🌾 Zab ital' },
    { key: 'kókusz', label: '🥥 Kókusz' },
    { key: 'mandula', label: '🌰 Mandula' },
    { key: 'szója tej', label: '🫘 Szója tej' },
    { key: 'rizs tej', label: '🍚 Rizs ital' },
  ],
  Glutén: [
    { key: 'hajdina', label: 'Hajdina' },
    { key: 'köles', label: 'Köles' },
    { key: 'rizs', label: 'Rizs' },
    { key: 'kukorica', label: 'Kukorica' },
    { key: 'amaránt', label: 'Amaránt' },
    { key: 'quinoa', label: 'Quinoa' },
    { key: 'zab tej', label: '🌾 Zab ital' },
  ],
};

const FOOD_STYLES: { id: FoodStyle; photoId: string }[] = [
  { id: 'sporty',        photoId: 'photo-1490645935967-10de6ba17061' },
  { id: 'plant',         photoId: 'photo-1512621776951-a57141f2eefd' },
  { id: 'traditional',   photoId: 'photo-1547592180-85f173990554' },
  { id: 'mediterranean', photoId: 'photo-1519708227418-c8fd9a32b7a2' },
];

interface StepFoodStyleProps {
  selectedStyles: FoodStyle[];
  setSelectedStyles: (v: FoodStyle[]) => void;
  activeAllergens: Set<string>;
  setActiveAllergens: (v: Set<string>) => void;
  selectedAlternativeKeys: Set<string>;
  setSelectedAlternativeKeys: (v: Set<string>) => void;
  onDetailedSetup: () => void;
}

export function StepFoodStyle({
  selectedStyles,
  setSelectedStyles,
  activeAllergens,
  setActiveAllergens,
  selectedAlternativeKeys,
  setSelectedAlternativeKeys,
  onDetailedSetup,
}: StepFoodStyleProps) {
  const { t } = useTranslation();

  const toggleStyle = (id: FoodStyle) => {
    if (selectedStyles.includes(id)) {
      setSelectedStyles(selectedStyles.filter(s => s !== id));
    } else if (selectedStyles.length < 2) {
      setSelectedStyles([...selectedStyles, id]);
    } else {
      // max 2: replace the first selected with the new one
      setSelectedStyles([selectedStyles[1], id]);
    }
  };

  const toggleAllergen = (label: string) => {
    const next = new Set(activeAllergens);
    if (next.has(label)) {
      next.delete(label);
      // also remove any alternatives belonging to this allergen
      const altKeys = (ALLERGEN_ALTERNATIVES[label] ?? []).map(a => a.key);
      const nextAlt = new Set(selectedAlternativeKeys);
      for (const k of altKeys) nextAlt.delete(k);
      setSelectedAlternativeKeys(nextAlt);
    } else {
      next.add(label);
    }
    setActiveAllergens(next);
  };

  const toggleAltKey = (key: string) => {
    const next = new Set(selectedAlternativeKeys);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelectedAlternativeKeys(next);
  };

  const maxReached = selectedStyles.length >= 2;

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Badge */}
      <p className="text-center text-xs font-semibold text-indigo-500">
        {maxReached
          ? t('wizard.foodStyle.maxReached').replace('{n}', String(selectedStyles.length))
          : t('wizard.foodStyle.maxBadge')}
      </p>

      {/* 2×2 Photo Grid */}
      <div className="grid grid-cols-2 gap-3">
        {FOOD_STYLES.map(({ id, photoId }) => {
          const selected = selectedStyles.includes(id);
          const dimmed = maxReached && !selected;
          return (
            <button
              key={id}
              onClick={() => toggleStyle(id)}
              className={`relative rounded-2xl overflow-hidden border-[3px] transition-all ${
                selected ? 'border-indigo-500' : 'border-transparent'
              } ${dimmed ? 'opacity-45' : ''}`}
            >
              <img
                src={`https://images.unsplash.com/${photoId}?w=400&h=320&fit=crop&auto=format`}
                alt={t(`wizard.foodStyle.${id}Label`)}
                className="w-full h-28 object-cover"
                loading="lazy"
              />
              {selected && (
                <div className="absolute inset-0 bg-indigo-500/20 pointer-events-none" />
              )}
              {selected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                <p className="text-white text-xs font-bold leading-tight">
                  {t(`wizard.foodStyle.${id}Label`)}
                </p>
                <p className="text-white/75 text-[0.6rem] leading-tight mt-0.5">
                  {t(`wizard.foodStyle.${id}Desc`)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Allergen Panel */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          {t('wizard.foodStyle.allergyTitle')}
        </p>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map(label => {
            const active = activeAllergens.has(label);
            return (
              <button
                key={label}
                onClick={() => toggleAllergen(label)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {active ? '🚫 ' : ''}{label}
              </button>
            );
          })}
        </div>

        {/* Alternatives sub-panel */}
        {[...activeAllergens].map(allergen => {
          const alts = ALLERGEN_ALTERNATIVES[allergen];
          if (!alts?.length) return null;
          return (
            <div key={allergen} className="flex flex-col gap-1.5 pt-1 border-t border-gray-200">
              <p className="text-[0.65rem] font-semibold text-gray-400">
                {t('wizard.criteria.alternativeHeading').replace('{label}', allergen)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {alts.map(({ key, label }) => {
                  const chosen = selectedAlternativeKeys.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleAltKey(key)}
                      className={`px-2.5 py-1 rounded-full text-[0.65rem] font-semibold border transition-colors ${
                        chosen
                          ? 'bg-blue-100 text-blue-700 border-blue-300'
                          : 'bg-white text-gray-500 border-gray-200'
                      }`}
                    >
                      {label} {chosen ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Escape hatch */}
      <button
        onClick={onDetailedSetup}
        className="text-center text-xs text-gray-400 underline underline-offset-2 py-1"
      >
        {t('wizard.foodStyle.detailedSetup')}
      </button>
    </div>
  );
}
```

**Note on `useTranslation` import:** Find how other step components import the translation hook. Search for `useTranslation` in `ProfileSetupWizardLegacy.tsx` or nearby step files and use the same import path.

**Note on `t('wizard.foodStyle.${id}Label')` dynamic key:** TypeScript may warn about dynamic translation key access. Use `as any` cast or a helper like `(t as any)(\`wizard.foodStyle.\${id}Label\`)` if needed — or define a small local lookup object to avoid the cast.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Fix any type errors (likely the dynamic `t()` key pattern).

- [ ] **Step 3: Commit**

```bash
git add src/app/components/onboarding/StepFoodStyle.tsx
git commit -m "feat: add StepFoodStyle component — 2x2 photo picker with allergen panel"
```

---

## Task 6: Wizard Refactor

**Files:**
- Rename: `src/app/components/onboarding/ProfileSetupWizard.tsx` → `ProfileSetupWizardLegacy.tsx`
- Create: `src/app/components/onboarding/ProfileSetupWizard.tsx`

**Important:** After renaming, NO edits to `ProfileSetupWizardLegacy.tsx`. The new wizard is a modified copy.

- [ ] **Step 1: Rename the existing file**

```bash
cd PersonalFit && git mv src/app/components/onboarding/ProfileSetupWizard.tsx src/app/components/onboarding/ProfileSetupWizardLegacy.tsx
```

- [ ] **Step 2: Find the entry point that imports ProfileSetupWizard**

```bash
grep -r "ProfileSetupWizard" src/ --include="*.tsx" --include="*.ts" -l
```

Note which files import it (likely `src/app/App.tsx` or a routing file). Do NOT change these imports yet — the new wizard will have the same filename, so imports automatically point to the new file once it exists.

- [ ] **Step 3: Create the new `ProfileSetupWizard.tsx`**

Start by copying `ProfileSetupWizardLegacy.tsx` entirely, then apply these changes:

**3a. Add import at the top:**
```typescript
import { StepFoodStyle } from './StepFoodStyle';
import { buildIngredientSelection, FoodStyle } from '../../utils/buildIngredientSelection';
import { SEED_FOODS } from '../../data/seedFoods';
```

**3b. Add `LEGACY_FOODS_STEP` constant (near the top of the file, before the component):**
```typescript
const LEGACY_FOODS_STEP = 99;
```

**3c. In the component, add new state and remove `dietType` state:**

Add:
```typescript
const [selectedStyles, setSelectedStyles] = useState<FoodStyle[]>([]);
```

Remove (or comment out) the line:
```typescript
const [dietType, setDietType] = useState<DietType>('omnivore');
```

**3c-ii. Fix `visibleFoods` vegetarian filter (no longer uses `dietType`):**

Find the `visibleFoods` computation (around line 521). It has a guard like:
```typescript
if (dietType === 'vegetarian' && !f.vegetarian) return false;
```

Replace with:
```typescript
const isPlantOnly = selectedStyles.includes('plant') && selectedStyles.length === 1;
if (isPlantOnly && !f.vegetarian) return false;
```

This guard only applies when the user is on `LEGACY_FOODS_STEP` anyway (StepFoods), so it remains correct: plant-only selection hides non-vegetarian foods in the manual picker.

**3d. Update the `STEPS` array from 7 to 6 entries:**

Replace:
```typescript
const STEPS = [
  t('wizard.personal.title'),
  t('wizard.criteria.title'),
  t('wizard.foods.title'),
  t('wizard.meals.title'),
  t('wizard.sport.title'),
  t('wizard.sleep.title'),
  t('wizard.summary.title'),
];
```

With:
```typescript
const STEPS = [
  t('wizard.personal.title'),
  t('wizard.foodStyle.title'),
  t('wizard.meals.title'),
  t('wizard.sport.title'),
  t('wizard.sleep.title'),
  t('wizard.summary.title'),
];
```

**3e. Update `goNext` — remove the `step === 1` alternatives processing:**

The old `goNext` (line ~494) calls `processAlternatives(selectedAlternativeKeys)` when `step === 1`. Remove that block — `selectedAlternativeKeys` is now tracked directly as state and no extra processing is needed.

**3f. Update step rendering (the block around lines 849–855):**

Replace:
```tsx
{step === 1 && <StepCriteria ... />}
{step === 2 && <StepFoods ... />}
{step === 3 && <StepMeals ... />}
{step === 4 && <StepSport ... />}
{step === 5 && <StepSleep ... />}
{step === 6 && <StepSummary ... selectedFoodsCount={selectedFoods.size} ... />}
```

With:
```tsx
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
{step === 5 && <StepSummary dailyTarget={dailyTarget} waterLiters={waterLiters} bedtime={bedtime} sleepDuration={sleepDuration} selectedFoodsCount={previewFoodCount} mealCount={mealCount} mealModel={mealModel} goal={goal} />}
{/* Legacy detailed foods step — accessible via escape hatch only */}
{step === LEGACY_FOODS_STEP && (
  <div className="flex flex-col gap-4">
    <StepFoods foodTab={foodTab} setFoodTab={setFoodTab} foodSearch={foodSearch} setFoodSearch={setFoodSearch} selectedFoods={selectedFoods} toggleFood={toggleFood} visibleFoods={visibleFoods} lookupStatus={lookupStatus} lookupResults={lookupResults} onLookupFood={handleLookupFood} onAddResult={addLookupResult} selectAllVisible={selectAllVisible} deselectAll={deselectAll} />
    {/* Exit button — LEGACY_FOODS_STEP = 99 bypasses goNext's step < STEPS.length-1 guard */}
    <DSMButton onClick={() => setStep(2)} variant="primary" className="w-full h-14 rounded-2xl gap-2 text-base">
      {t('wizard.next')} →
    </DSMButton>
  </div>
)}
```

**3g. Add `previewFoodCount` derived value (add after state declarations):**
```typescript
const previewFoodCount = useMemo(
  () => buildIngredientSelection(selectedStyles, activeAllergens, selectedAlternativeKeys).size,
  [selectedStyles, activeAllergens, selectedAlternativeKeys]
);
```

**3h. Update the Next button to be disabled at step 1 when no styles selected.**

Find the `DSMButton` that calls `goNext` (around line 863). Change:
```tsx
<DSMButton onClick={goNext} variant="primary" className="w-full h-14 rounded-2xl gap-2 text-base">
```
To:
```tsx
<DSMButton
  onClick={goNext}
  disabled={step === 1 && selectedStyles.length < 1}
  variant="primary"
  className="w-full h-14 rounded-2xl gap-2 text-base"
>
```

**3i. Update `handleGenerate` to derive foods and dietType from styles:**

Find `handleGenerate` (line ~640). At the very start of the function body, add these two derivations:

```typescript
// If user arrived via the escape hatch (LEGACY_FOODS_STEP), use their manual
// selectedFoods; otherwise derive from photo-style / allergen choices.
const derivedFoods: Set<string> = step === LEGACY_FOODS_STEP
  ? selectedFoods
  : buildIngredientSelection(selectedStyles, activeAllergens, selectedAlternativeKeys);

// dietType state has been removed — derive inline
const effectiveDietType = (selectedStyles.includes('plant') && selectedStyles.length === 1)
  ? 'vegetarian'
  : 'omnivore';
```

Then in the body of `handleGenerate`:
- Replace every occurrence of `selectedFoods` with `derivedFoods` (there are two: food-save batch ~line 681 and `ingredients` mapping ~line 699)
- Replace `dietType` with `effectiveDietType` in the `userProfile` API payload

**Note about `allKnownFoods` (~lines 521, 680):** The wizard builds `allKnownFoods = [...SEED_FOODS, ...extraFoods]` to resolve food names to full objects. After this change, import `SEED_FOODS` from `src/app/data/seedFoods.ts` and remove the local `SEED_FOODS` constant from the new wizard file. Two names changed: `'Garnélarák'` → `'Garnéla'` and `'Tészta'` → `'Fehér tészta'`. These only affect the `LEGACY_FOODS_STEP` manual picker — foods appear under their new canonical names. No data is lost.

**Also update `handleFinish`** (if it exists separately) with the same `derivedFoods` / `effectiveDietType` pattern.

- [ ] **Step 4: Remove unused state and imports**

After the changes above:
- Keep `selectedFoods` state — still used by `LEGACY_FOODS_STEP` path (StepFoods manual selection)
- Remove `dietType` state — replaced by `effectiveDietType` inline in `handleGenerate`
- Remove `processAlternatives` function — `selectedAlternativeKeys` is now tracked directly as state, no extra processing needed
- Remove the local `SEED_FOODS` constant from the new wizard — import from `src/app/data/seedFoods.ts` instead
- `StepCriteria` import — remove it (not used in new 6-step flow; it remains in `ProfileSetupWizardLegacy.tsx`)

Keep all state and helpers used by `LEGACY_FOODS_STEP`: `selectedFoods`, `toggleFood`, `visibleFoods`, `selectAllVisible`, `deselectAll`, `foodTab`, `foodSearch`, `lookupStatus`, `lookupResults`, `handleLookupFood`, `addLookupResult`.

After cleanup, also remove the now-redundant second `derivedFoods` derivation from this step — the correct final version is the conditional one in Step 3i above.

**Fix 6 note on `toggleStyle` swap behavior:** The `toggleStyle` implementation in Task 5 swaps by evicting the *first*-selected style when a third style is tapped (i.e., `setSelectedStyles([selectedStyles[1], id])`). The spec says "still tappable to swap" — this is an intentional simplification: the user can still swap by tapping an already-selected card to deselect it, then tapping a new one. Do not change this behavior.
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Fix all type errors. Common issues:
- `useMemo` missing import — add to React imports
- `FoodStyle` import from the wrong path
- `dietType` references still in the code

- [ ] **Step 6: Run the app and test manually**

```bash
npm run dev
```

Navigate to the onboarding flow. Verify:
- Step 1 shows the 2×2 photo grid
- Photos load from Unsplash
- Max 2 selectable, third tap swaps
- Allergen panel shows, allergen toggle works, alternatives appear
- "Részletesebb beállítás" link jumps to the old food picker
- Next button is disabled until ≥1 photo selected
- Steps 2–5 (Meals, Sport, Sleep, Summary) render correctly
- Summary shows food count > 0 when styles are selected
- Generation completes without errors

- [ ] **Step 7: Commit**

```bash
git add src/app/components/onboarding/ProfileSetupWizard.tsx src/app/components/onboarding/ProfileSetupWizardLegacy.tsx
git commit -m "feat: 6-step visual onboarding — replace StepCriteria+StepFoods with StepFoodStyle"
```

---

## Task 7: Build Verification + Deploy

**Files:** None (build/deploy only)

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: no errors. Check that bundle size hasn't grown unreasonably (seedFoods.ts is ~250 items × ~150 bytes ≈ 37KB raw, well under concern threshold).

- [ ] **Step 3: Run typecheck one final time**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit any final fixes**

```bash
git add -p && git commit -m "fix: resolve remaining typecheck issues before deploy"
```

(Only if there are fixes; skip if clean.)

- [ ] **Step 5: Push to origin**

```bash
git push origin main
```

- [ ] **Step 6: Deploy to Vercel production**

```bash
vercel --prod
```

Expected: deployment URL printed. Visit the URL and run through the onboarding flow end-to-end.

- [ ] **Step 7: Smoke test on production**

On the deployed URL:
1. Start onboarding
2. Select "Sportos" style — Next enables
3. Select "Mediterrán" style as second — maxReached badge shows
4. Tap "Laktóz" allergen — alternatives appear
5. Select "Kecske" alternative
6. Complete remaining steps
7. Confirm meal plan generates with fish (from mediterrán) and chicken (from sportos)

---

## Notes for Implementer

**No existing tests:** This project had no test infrastructure before Task 1. Only `buildIngredientSelection.ts` has unit tests — the component and wizard are tested manually (Step 6 of Task 6).

**Legacy wizard safety:** `ProfileSetupWizardLegacy.tsx` is never deleted in this plan. After production validation by the product owner, it can be removed in a follow-up PR.

**Unsplash photos:** The Unsplash source URLs (`images.unsplash.com/photo-{ID}`) are free for prototyping but require a license for production. These will be replaced with licensed studio photos before marketing launch (tracked separately).

**`wizard.criteria.alternativeHeading` translation key:** This existing key uses a `{label}` placeholder. Usage: `t('wizard.criteria.alternativeHeading').replace('{label}', allergenLabel)`. This is how the existing `StepCriteria` works and how `StepFoodStyle` reuses it.
