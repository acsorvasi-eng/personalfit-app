/**
 * Meal Alternatives System — DEPRECATED
 * 
 * This file is no longer used. All meal alternatives now come from
 * uploaded plan data via usePlanData hook.
 * 
 * Kept for reference only. No components import from this file.
 */

import type { MealOption } from './mealData';

// Determine if a day-of-week index is a sports day
// Pattern: Mon(1)=train, Tue(2)=rest, Wed(3)=train, Thu(4)=train, Fri(5)=rest, Sat(6)=rest, Sun(7)=rest/active
export function isSportsDay(dayOfWeek: number): boolean {
  // dayOfWeek: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 4;
}

// Get the day of week (1-7) from a plan day index (1-7 repeating per week)
export function getDayType(planDayIndex: number): { isSport: boolean; label: string } {
  const isSport = isSportsDay(planDayIndex);
  return {
    isSport,
    label: isSport ? 'Edzésnap' : 'Pihenőnap',
  };
}

// ─── BREAKFAST ALTERNATIVES ─────────────────────────────────────────

const breakfastAlternativesSport: MealOption[] = [
  {
    id: 'alt-b-s1',
    name: 'Protein palacsinta áfonyával',
    type: 'breakfast',
    calories: '530 kcal',
    description: '2 tojás + 30g fehérjepor + 40g zab + áfonya',
    ingredients: ['Tojás (2db)', 'Fehérjepor (30g)', 'Zab (40g)', 'Áfonya (50g)', 'Méz (1 tk)'],
  },
  {
    id: 'alt-b-s2',
    name: 'Tojás wrap csirkemellel',
    type: 'breakfast',
    calories: '510 kcal',
    description: '3 tojás + 80g csirkemell + teljes kiőrlésű tortilla',
    ingredients: ['Tojás (3db)', 'Csirkemell (80g)', 'Tortilla (1db)', 'Spenót (30g)'],
  },
  {
    id: 'alt-b-s3',
    name: 'Zabkása mogyoróvajjal és banánnal',
    type: 'breakfast',
    calories: '520 kcal',
    description: '50g zab + 1 ek mogyoróvaj + 1 banán + fahéj',
    ingredients: ['Zab (50g)', 'Mogyoróvaj (1 ek)', 'Banán (120g)', 'Fahéj'],
  },
  {
    id: 'alt-b-s4',
    name: 'Smoothie bowl fehérjeporral',
    type: 'breakfast',
    calories: '490 kcal',
    description: '30g fehérjepor + 200ml mandulatej + 1 banán + granola',
    ingredients: ['Fehérjepor (30g)', 'Mandulatej (200ml)', 'Banán (100g)', 'Granola (30g)', 'Chiamag (1 ek)'],
  },
];

const breakfastAlternativesRest: MealOption[] = [
  {
    id: 'alt-b-r1',
    name: 'Görög joghurt magkeverékkel',
    type: 'breakfast',
    calories: '440 kcal',
    description: '250g görög joghurt + 30g vegyes mag + méz',
    ingredients: ['Görög joghurt (250g)', 'Tökmag (10g)', 'Mandula (10g)', 'Lenmag (10g)', 'Méz (1 tk)'],
  },
  {
    id: 'alt-b-r2',
    name: 'Avokádós tojás spenóttal',
    type: 'breakfast',
    calories: '460 kcal',
    description: '2 tojás + ½ avokádó + spenót + paradicsom',
    ingredients: ['Tojás (2db)', 'Avokádó fél (70g)', 'Spenót (80g)', 'Paradicsom (100g)'],
  },
  {
    id: 'alt-b-r3',
    name: 'Kecske túró magvakkal',
    type: 'breakfast',
    calories: '430 kcal',
    description: '200g kecske túró + 30g dió + fahéj + uborka',
    ingredients: ['Kecske túró (200g)', 'Dió (30g)', 'Fahéj', 'Uborka (100g)'],
  },
  {
    id: 'alt-b-r4',
    name: 'Füstölt lazacos tojás',
    type: 'breakfast',
    calories: '450 kcal',
    description: '2 tojás + 60g füstölt lazac + krémsajt + kapribogyó',
    ingredients: ['Tojás (2db)', 'Füstölt lazac (60g)', 'Krémsajt (30g)', 'Kapribogyó'],
  },
];

// ─── LUNCH ALTERNATIVES ─────────────────────────────────────────────

const lunchAlternativesSport: MealOption[] = [
  {
    id: 'alt-l-s1',
    name: 'Csirkemell barnarizzsel és brokkolival',
    type: 'lunch',
    calories: '640 kcal',
    description: '220g csirkemell + 180g barna rizs + 200g brokkoli',
    ingredients: ['Csirkemell (220g)', 'Barna rizs (180g)', 'Brokkoli (200g)'],
  },
  {
    id: 'alt-l-s2',
    name: 'Marhahús édesburgonyával',
    type: 'lunch',
    calories: '680 kcal',
    description: '200g marhahús + 200g édesburgonya + 150g spenót',
    ingredients: ['Marhahús (200g)', 'Édesburgonya (200g)', 'Spenót (150g)'],
  },
  {
    id: 'alt-l-s3',
    name: 'Lazac tészta zöldségekkel',
    type: 'lunch',
    calories: '650 kcal',
    description: '180g lazac + 150g tészta + 200g zöldség',
    ingredients: ['Lazac (180g)', 'Tészta (150g)', 'Cukkini (100g)', 'Paradicsom (100g)'],
  },
  {
    id: 'alt-l-s4',
    name: 'Pulykamell quinoával és avokádóval',
    type: 'lunch',
    calories: '660 kcal',
    description: '220g pulykamell + 180g quinoa + ½ avokádó',
    ingredients: ['Pulykamell (220g)', 'Quinoa (180g)', 'Avokádó fél (70g)', 'Citrom'],
  },
];

const lunchAlternativesRest: MealOption[] = [
  {
    id: 'alt-l-r1',
    name: 'Csirkemell caesar saláta',
    type: 'lunch',
    calories: '540 kcal',
    description: '200g csirkemell + 250g saláta + parmezán + dresszing',
    ingredients: ['Csirkemell (200g)', 'Vegyes saláta (250g)', 'Parmezán (20g)', 'Olívaolaj (1 ek)'],
  },
  {
    id: 'alt-l-r2',
    name: 'Pulykamell párolt zöldségekkel',
    type: 'lunch',
    calories: '520 kcal',
    description: '220g pulykamell + 300g párolt vegyes zöldség',
    ingredients: ['Pulykamell (220g)', 'Brokkoli (100g)', 'Karfiol (100g)', 'Sárgarépa (100g)'],
  },
  {
    id: 'alt-l-r3',
    name: 'Tonhal saláta avokádóval',
    type: 'lunch',
    calories: '550 kcal',
    description: '180g tonhal + 200g saláta + ½ avokádó + uborka',
    ingredients: ['Tonhal (180g)', 'Vegyes saláta (200g)', 'Avokádó fél (70g)', 'Uborka (100g)'],
  },
  {
    id: 'alt-l-r4',
    name: 'Sertéskaraj savanyú káposztával',
    type: 'lunch',
    calories: '560 kcal',
    description: '200g sertéskaraj + 250g savanyú káposzta',
    ingredients: ['Sovány sertéskaraj (200g)', 'Savanyú káposzta (250g)', 'Fűszerek'],
  },
];

// ─── DINNER ALTERNATIVES ─────────────────────────────────────────────

const dinnerAlternativesSport: MealOption[] = [
  {
    id: 'alt-d-s1',
    name: 'Grillezett hal salátával',
    type: 'dinner',
    calories: '490 kcal',
    description: '200g grillezett hal + 250g vegyes saláta + olívaolaj',
    ingredients: ['Tengeri hal (200g)', 'Vegyes saláta (250g)', 'Olívaolaj (1 ek)', 'Citrom'],
  },
  {
    id: 'alt-d-s2',
    name: 'Csirkemell grillezett zöldségekkel',
    type: 'dinner',
    calories: '480 kcal',
    description: '180g csirkemell + 300g grillezett zöldség',
    ingredients: ['Csirkemell (180g)', 'Cukkini (100g)', 'Padlizsán (100g)', 'Paprika (100g)'],
  },
  {
    id: 'alt-d-s3',
    name: 'Tojás sonkával és sajttal',
    type: 'dinner',
    calories: '500 kcal',
    description: '3 tojás + 60g sonka + 30g sajt + paradicsom',
    ingredients: ['Tojás (3db)', 'Sonka (60g)', 'Sajt (30g)', 'Paradicsom (100g)'],
  },
  {
    id: 'alt-d-s4',
    name: 'Lazac spenót ágyon',
    type: 'dinner',
    calories: '510 kcal',
    description: '180g lazac + 200g spenót + fokhagyma + citrom',
    ingredients: ['Lazac (180g)', 'Spenót (200g)', 'Fokhagyma (1 gerezd)', 'Citrom', 'Olívaolaj (1 ek)'],
  },
];

const dinnerAlternativesRest: MealOption[] = [
  {
    id: 'alt-d-r1',
    name: 'Kecske túró zöldségekkel',
    type: 'dinner',
    calories: '420 kcal',
    description: '200g kecske túró + 200g vegyes zöldség + olívaolaj',
    ingredients: ['Kecske túró (200g)', 'Uborka (100g)', 'Paradicsom (100g)', 'Olívaolaj (1 ek)'],
  },
  {
    id: 'alt-d-r2',
    name: 'Tojás avokádóval és rukkolával',
    type: 'dinner',
    calories: '440 kcal',
    description: '2 tojás + ½ avokádó + rucola + paradicsom',
    ingredients: ['Tojás (2db)', 'Avokádó fél (70g)', 'Rucola (100g)', 'Koktélparadicsom (80g)'],
  },
  {
    id: 'alt-d-r3',
    name: 'Juh túró diókkal és mézes almával',
    type: 'dinner',
    calories: '460 kcal',
    description: '180g juh túró + 30g dió + 1 alma + méz',
    ingredients: ['Juh túró (180g)', 'Dió (30g)', 'Alma (150g)', 'Méz (1 tk)'],
  },
  {
    id: 'alt-d-r4',
    name: 'Füstölt lazac saláta',
    type: 'dinner',
    calories: '430 kcal',
    description: '100g füstölt lazac + 200g saláta + 1 tojás + krémsajt',
    ingredients: ['Füstölt lazac (100g)', 'Vegyes saláta (200g)', 'Tojás (1db)', 'Krémsajt (30g)'],
  },
];

/**
 * Get 2 alternative meals for a given meal slot.
 * Returns alternatives based on whether it's a sports day or rest day.
 * Uses the week/day index as a seed for variety.
 */
export function getMealAlternatives(
  mealType: 'breakfast' | 'lunch' | 'dinner',
  weekIndex: number,
  dayIndex: number,
  isSport: boolean,
): MealOption[] {
  const seed = weekIndex * 7 + dayIndex;
  
  let pool: MealOption[];
  
  switch (mealType) {
    case 'breakfast':
      pool = isSport ? breakfastAlternativesSport : breakfastAlternativesRest;
      break;
    case 'lunch':
      pool = isSport ? lunchAlternativesSport : lunchAlternativesRest;
      break;
    case 'dinner':
      pool = isSport ? dinnerAlternativesSport : dinnerAlternativesRest;
      break;
  }
  
  // Pick 2 different items from the pool based on seed for variety
  const idx1 = seed % pool.length;
  const idx2 = (seed + 1) % pool.length;
  
  // Create unique IDs so they don't collide across days
  const alt1 = { ...pool[idx1], id: `${pool[idx1].id}-w${weekIndex}d${dayIndex}` };
  const alt2 = { ...pool[idx2], id: `${pool[idx2].id}-w${weekIndex}d${dayIndex}` };
  
  return [alt1, alt2];
}