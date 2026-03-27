/**
 * seedFoods.ts
 * ============================================================
 * Futtatás: egyszer, az app első indításakor VAGY dev console-ból
 * Minden étel a kaja_30_napra.pdf-ből kinyerve, kategóriánként.
 * Makró adatok: USDA / OpenFoodFacts alapján, 100g-ra normalizálva.
 * ============================================================
 * HASZNÁLAT (browser console vagy egy init hook-ban):
 *   import { seedSystemFoods } from './seedFoods';
 *   await seedSystemFoods(db);
 */

import { FoodEntity, FoodCategory } from './models';

function makeFood(
  name: string,
  description: string,
  category: FoodCategory,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  benefits: string[],
  suitable_for: string[]
): FoodEntity {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    description,
    category,
    calories_per_100g: kcal,
    protein_per_100g: protein,
    carbs_per_100g: carbs,
    fat_per_100g: fat,
    source: 'system',
    is_favorite: false,
    benefits,
    suitable_for,
    is_system_locked: true,
    search_index: name.toLowerCase(),
    created_at: now,
    updated_at: now,
  };
}

export const SYSTEM_FOODS: FoodEntity[] = [

  // ──────────────────────────────────────────────────────────
  // FEHÉRJE — Húsok
  // ──────────────────────────────────────────────────────────
  makeFood(
    'Csirkemell', 'Sovány fehérjeforrás, alacsony zsírtartalom',
    'Feherje', 165, 31, 0, 3.6,
    ['Magas fehérje', 'Alacsony zsír', 'Izomépítés'],
    ['Edzésnap', 'Fogyókúra', 'Izomnövelés']
  ),
  makeFood(
    'Pulykamell', 'Sovány szárnyas, dietetikus kedvenc',
    'Feherje', 157, 30, 0, 3.2,
    ['Magas fehérje', 'Alacsony kalória'],
    ['Edzésnap', 'Pihenőnap', 'Fogyókúra']
  ),
  makeFood(
    'Pulykamell sonka', 'Feldolgozott sovány sonka, gyors fehérje',
    'Feherje', 105, 18, 2, 2.5,
    ['Gyors fehérje', 'Alacsony zsír'],
    ['Reggeli', 'Snack']
  ),
  makeFood(
    'Sonka', 'Klasszikus sertéssonka, mérsékelt zsírtartalom',
    'Feherje', 145, 20, 1, 7,
    ['Fehérje forrás'],
    ['Reggeli', 'Vacsora']
  ),
  makeFood(
    'Fehér karaj', 'Sovány sertéshús, alacsony zsír',
    'Feherje', 158, 26, 0, 6,
    ['Magas fehérje', 'Telítő'],
    ['Ebéd', 'Vacsora']
  ),
  makeFood(
    'Marha', 'Vörös hús, magas vas- és zinktartalom',
    'Feherje', 217, 26, 0, 12,
    ['Magas vas', 'B12-vitamin', 'Izomépítés'],
    ['Edzésnap', 'Erőedzés']
  ),
  makeFood(
    'Sovány marha', 'Zsírszegény marhahús, izomépítéshez ideális',
    'Feherje', 176, 28, 0, 7,
    ['Magas fehérje', 'Magas vas'],
    ['Edzésnap', 'Izomnövelés']
  ),
  makeFood(
    'Borjú', 'Fiatal marha, könnyebben emészthető',
    'Feherje', 172, 26, 0, 7,
    ['Magas fehérje', 'Könnyen emészthető'],
    ['Edzésnap', 'Diéta']
  ),

  // ──────────────────────────────────────────────────────────
  // FEHÉRJE — Halak
  // ──────────────────────────────────────────────────────────
  makeFood(
    'Lazac', 'Zsíros hal, omega-3 gazdag',
    'Feherje', 208, 20, 0, 13,
    ['Omega-3', 'Szív-egészség', 'Gyulladáscsökkentő'],
    ['Vacsora', 'Edzésnap', 'Pihenőnap']
  ),
  makeFood(
    'Füstölt lazac', 'Hidegen füstölt lazac, omega-3 forrás',
    'Feherje', 117, 18, 0, 4.3,
    ['Omega-3', 'B12-vitamin'],
    ['Reggeli', 'Vacsora']
  ),
  makeFood(
    'Sült lazac', 'Sütőben készült lazac, minimális olaj',
    'Feherje', 206, 20, 0, 13,
    ['Omega-3', 'D-vitamin'],
    ['Vacsora', 'Edzés utáni étkezés']
  ),
  makeFood(
    'Makréla', 'Zsíros tengeri hal, omega-3 kiemelkedő',
    'Feherje', 205, 19, 0, 14,
    ['Omega-3', 'D-vitamin', 'B12-vitamin'],
    ['Vacsora', 'Pihenőnap']
  ),
  makeFood(
    'Tonhal', 'Sovány tengeri hal, könnyen emészthető',
    'Feherje', 116, 26, 0, 1,
    ['Magas fehérje', 'Alacsony kalória', 'Jód'],
    ['Ebéd', 'Vacsora', 'Diéta']
  ),
  makeFood(
    'Tőkehal', 'Fehér hal, rendkívül sovány',
    'Feherje', 82, 18, 0, 0.7,
    ['Legalacsonyabb kalória', 'Alacsony zsír', 'Jód'],
    ['Fogyókúra', 'Vacsora', 'Diéta']
  ),
  makeFood(
    'Sült hal', 'Általános fehér hal sütve, alacsony kalória',
    'Feherje', 130, 22, 0, 5,
    ['Fehérje forrás', 'Alacsony szénhidrát'],
    ['Vacsora', 'Fogyókúra']
  ),

  // ──────────────────────────────────────────────────────────
  // TOJÁS
  // ──────────────────────────────────────────────────────────
  makeFood(
    'Tojás', 'Teljes értékű fehérje, minden esszenciális aminosav',
    'Tojas', 155, 13, 1.1, 11,
    ['Teljes fehérje', 'B12-vitamin', 'D-vitamin', 'Kolin'],
    ['Reggeli', 'Vacsora', 'Edzésnap', 'Pihenőnap']
  ),

  // ──────────────────────────────────────────────────────────
  // TEJTERMÉKEK
  // ──────────────────────────────────────────────────────────
  makeFood(
    'Túró', 'Alacsony zsírtartalmú sajt, lassú kazein fehérje',
    'Tejtermek', 98, 11, 3.4, 4.3,
    ['Lassú felszívódású fehérje', 'Kalcium', 'Éjszakai snack'],
    ['Vacsora', 'Edzés után', 'Pihenőnap']
  ),
  makeFood(
    'Görög joghurt', 'Sűrített joghurt, dupla fehérjetartalom',
    'Tejtermek', 97, 9, 4, 5,
    ['Magas fehérje', 'Probiotikum', 'Kalcium'],
    ['Reggeli', 'Snack', 'Pihenőnap']
  ),
  makeFood(
    'Joghurt', 'Klasszikus joghurt, probiotikumokban gazdag',
    'Tejtermek', 61, 3.5, 4.7, 3.3,
    ['Probiotikum', 'Kalcium', 'Bélflóra'],
    ['Reggeli', 'Snack']
  ),
  makeFood(
    'Kefír', 'Fermentált tejtermék, erős probiotikus hatás',
    'Tejtermek', 64, 3.4, 4.5, 3.5,
    ['Probiotikum', 'Bélflóra', 'Immunrendszer'],
    ['Reggeli', 'Pihenőnap']
  ),
  makeFood(
    'Juhsajt', 'Zsírosabb sajt, intenzív íz, kalciumban gazdag',
    'Tejtermek', 264, 14, 2, 22,
    ['Kalcium', 'Telítő', 'CLA zsírsavak'],
    ['Vacsora', 'Pihenőnap']
  ),
  makeFood(
    'Mandulatej', 'Növényi tejhelyettesítő, alacsony kalória',
    'Tejtermek', 17, 0.6, 0.3, 1.1,
    ['Alacsony kalória', 'Laktózmentes', 'E-vitamin'],
    ['Reggeli', 'Diéta']
  ),

  // ──────────────────────────────────────────────────────────
  // FEHÉRJE — Porok / Kiegészítők
  // ──────────────────────────────────────────────────────────
  makeFood(
    'Fehérjepor', 'Tejsavó vagy növényi alapú protein por',
    'Feherje', 370, 80, 5, 3,
    ['Magas fehérje', 'Gyors felszívódás', 'Izomépítés'],
    ['Edzés után', 'Edzésnap']
  ),
  makeFood(
    'Tejsavó protein', 'Whey protein, edzés utáni gyors fehérje',
    'Feherje', 370, 80, 5, 3,
    ['Leggyorsabb felszívódás', 'BCAA gazdag', 'Izomépítés'],
    ['Edzés után', 'Edzésnap']
  ),

  // ──────────────────────────────────────────────────────────
  // ZÖLDSÉGEK
  // ──────────────────────────────────────────────────────────
  makeFood(
    'Brokkoli', 'Keresztes virágú zöldség, C-vitamin bomba',
    'Zoldseg', 34, 2.8, 7, 0.4,
    ['C-vitamin', 'Antioxidáns', 'Rosttartalom', 'Rákellenes'],
    ['Ebéd', 'Vacsora', 'Edzésnap', 'Pihenőnap']
  ),
  makeFood(
    'Cukkini', 'Nyári tök, alacsony kalória, sok víz',
    'Zoldseg', 17, 1.2, 3.1, 0.3,
    ['Alacsony kalória', 'Hidratáló', 'B6-vitamin'],
    ['Ebéd', 'Vacsora', 'Diéta']
  ),
  makeFood(
    'Káposzta', 'Párolt fehér káposzta, bélflóra barát',
    'Zoldseg', 25, 1.3, 5.8, 0.1,
    ['Probiotikus hatás', 'C-vitamin', 'K-vitamin'],
    ['Ebéd', 'Vacsora']
  ),
  makeFood(
    'Kelkáposzta', 'Fodros káposzta, superfood státusz',
    'Zoldseg', 43, 1.5, 8.8, 0.4,
    ['Legtöbb tápanyag/kcal', 'K-vitamin', 'Antioxidáns'],
    ['Ebéd', 'Vacsora', 'Fogyókúra']
  ),
  makeFood(
    'Cékla', 'Természetes nitrátforrás, edzésteljesítmény növelő',
    'Zoldseg', 43, 1.6, 10, 0.2,
    ['Nitráttartalom', 'Vérnyomás csökkentő', 'Edzésteljesítmény'],
    ['Edzésnap', 'Ebéd']
  ),
  makeFood(
    'Főtt cékla', 'Főtt cékla, enyhébb ízű',
    'Zoldseg', 44, 1.7, 10, 0.2,
    ['Nitráttartalom', 'Folsav', 'Edzésteljesítmény'],
    ['Edzésnap', 'Ebéd']
  ),
  makeFood(
    'Sült cékla', 'Sütőben karamellizált cékla, intenzív íz',
    'Zoldseg', 58, 1.7, 13, 0.2,
    ['Antioxidáns', 'Edzésteljesítmény'],
    ['Edzésnap', 'Ebéd']
  ),
  makeFood(
    'Párolt cékla', 'Gőzölt cékla, megőrzött tápértékek',
    'Zoldseg', 43, 1.6, 10, 0.2,
    ['Nitráttartalom', 'Folsav'],
    ['Edzésnap', 'Diéta']
  ),
  makeFood(
    'Sárgarépa', 'Beta-karotin forrás, édes ízű gyökérzöldség',
    'Zoldseg', 41, 0.9, 10, 0.2,
    ['Beta-karotin', 'A-vitamin', 'Antioxidáns'],
    ['Ebéd', 'Snack']
  ),
  makeFood(
    'Karfiol', 'Fehér keresztes zöldség, alacsony szénhidrát',
    'Zoldseg', 25, 1.9, 5, 0.3,
    ['Alacsony szénhidrát', 'C-vitamin', 'Sokoldalú'],
    ['Ebéd', 'Vacsora', 'Low-carb']
  ),
  makeFood(
    'Karfiolpüré', 'Krumplipüré alternatíva, töredék kalóriával',
    'Zoldseg', 40, 2, 7, 1.5,
    ['Alacsony kalória', 'Low-carb', 'Telítő'],
    ['Ebéd', 'Vacsora', 'Fogyókúra']
  ),
  makeFood(
    'Uborka', 'Vízben gazdag zöldség, szinte nulla kalória',
    'Zoldseg', 15, 0.7, 3.6, 0.1,
    ['Hidratáló', 'Szinte nulla kalória', 'K-vitamin'],
    ['Snack', 'Vacsora', 'Diéta']
  ),
  makeFood(
    'Paradicsom', 'Likopin forrás, antioxidáns hatású',
    'Zoldseg', 18, 0.9, 3.9, 0.2,
    ['Likopin', 'C-vitamin', 'Antioxidáns'],
    ['Reggeli', 'Snack', 'Saláta']
  ),
  makeFood(
    'Saláta', 'Vegyes levélsaláta, minimális kalória',
    'Zoldseg', 20, 1.4, 3.3, 0.3,
    ['Alacsony kalória', 'Hidratáló', 'Rosttartalom'],
    ['Ebéd', 'Vacsora', 'Diéta']
  ),
  makeFood(
    'Vegyes saláta', 'Kevert levélsaláták, változatos tápanyag',
    'Zoldseg', 22, 1.5, 3.5, 0.3,
    ['Alacsony kalória', 'Antioxidáns', 'Rosttartalom'],
    ['Ebéd', 'Vacsora']
  ),
  makeFood(
    'Vegyes zöldség', 'Kevert zöldség, széles tápanyagprofil',
    'Zoldseg', 35, 2, 7, 0.3,
    ['Változatos vitaminok', 'Rost', 'Alacsony kalória'],
    ['Ebéd', 'Vacsora']
  ),
  makeFood(
    'Cukkini-paradicsom', 'Cukkini és paradicsom keveréke',
    'Zoldseg', 18, 1, 3.5, 0.2,
    ['C-vitamin', 'Hidratáló', 'Alacsony kalória'],
    ['Vacsora', 'Snack']
  ),
  makeFood(
    'Uborka-paradicsom', 'Klasszikus nyári saláta alap',
    'Zoldseg', 16, 0.8, 3.7, 0.1,
    ['Hidratáló', 'Alacsony kalória', 'C-vitamin'],
    ['Vacsora', 'Snack', 'Diéta']
  ),

  // ──────────────────────────────────────────────────────────
  // KOMPLEX SZÉNHIDRÁTOK
  // ──────────────────────────────────────────────────────────
  makeFood(
    'Zab', 'Teljes kiőrlésű zabpehely, lassú felszívódású',
    'Komplex_szenhidrat', 389, 17, 66, 7,
    ['Béta-glükán', 'Lassú felszívódás', 'LDL csökkentő', 'Telítő'],
    ['Reggeli', 'Edzésnap']
  ),
  makeFood(
    'Tk kenyér', 'Teljes kiőrlésű kenyér, magasabb rosttartalom',
    'Komplex_szenhidrat', 247, 9, 48, 3.4,
    ['Rosttartalom', 'B-vitaminok', 'Lassú felszívódás'],
    ['Reggeli', 'Edzésnap']
  ),
  makeFood(
    'Quinoa', 'Teljes értékű növényi fehérje + komplex CH',
    'Komplex_szenhidrat', 368, 14, 64, 6,
    ['Teljes fehérje növényi forrásból', 'Gluténmentes', 'Vas', 'Magnézium'],
    ['Ebéd', 'Edzésnap', 'Vegetáriánus']
  ),
  makeFood(
    'Főtt krumpli', 'Főtt burgonya, természetes keményítő',
    'Komplex_szenhidrat', 87, 1.9, 20, 0.1,
    ['Kálium', 'B6-vitamin', 'Lassú CH edzés után'],
    ['Ebéd', 'Edzésnap']
  ),
  makeFood(
    'Banán', 'Gyors szénhidrát, káliumban gazdag',
    'Komplex_szenhidrat', 89, 1.1, 23, 0.3,
    ['Kálium', 'Gyors energia', 'Görcsmegelőzés'],
    ['Edzés előtt', 'Edzés után', 'Snack']
  ),

  // ──────────────────────────────────────────────────────────
  // GYÜMÖLCSÖK
  // ──────────────────────────────────────────────────────────
  makeFood(
    'Kiwi', 'Vitamin C bajnok, emésztést segítő',
    'Zoldseg', 61, 1.1, 15, 0.5,
    ['C-vitamin kiemelkedő', 'K-vitamin', 'Emésztés'],
    ['Reggeli', 'Snack', 'Pihenőnap']
  ),
  makeFood(
    'Gránátalma', 'Antioxidáns szuperétel, gyulladáscsökkentő',
    'Zoldseg', 83, 1.7, 19, 1.2,
    ['Punicalagin antioxidáns', 'Gyulladáscsökkentő', 'Szív-egészség'],
    ['Snack', 'Edzésnap', 'Pihenőnap']
  ),

  // ──────────────────────────────────────────────────────────
  // EGÉSZSÉGES ZSÍROK
  // ──────────────────────────────────────────────────────────
  makeFood(
    'Avokádó', 'Egyszeresen telítetlen zsírsavak, káliumban gazdag',
    'Egeszseges_zsir', 160, 2, 9, 15,
    ['Szívbarát zsírok', 'Kálium', 'E-vitamin', 'Telítő'],
    ['Reggeli', 'Ebéd', 'Pihenőnap']
  ),
  makeFood(
    'Dió', 'Omega-3 zsírsavak növényi forrása',
    'Egeszseges_zsir', 654, 15, 14, 65,
    ['Omega-3 ALA', 'Szívvédő', 'Agy-egészség', 'Antioxidáns'],
    ['Snack', 'Reggeli', 'Pihenőnap']
  ),
  makeFood(
    'Mandula', 'Telítő mag, E-vitamin forrás',
    'Egeszseges_zsir', 579, 21, 22, 50,
    ['E-vitamin', 'Magnézium', 'Telítő', 'Csontok'],
    ['Snack', 'Reggeli']
  ),
  makeFood(
    'Mogyoróvaj', 'Telítő magkrém, fehérje + zsír kombó',
    'Egeszseges_zsir', 588, 25, 20, 50,
    ['Fehérje + zsír', 'Telítő', 'E-vitamin'],
    ['Reggeli', 'Snack']
  ),
  makeFood(
    'Kendermag', 'Teljes értékű növényi fehérje + omega-3',
    'Mag', 553, 31, 8.7, 49,
    ['Teljes növényi fehérje', 'Omega-3+6 arány', 'Magnézium'],
    ['Reggeli', 'Smoothie', 'Vegetáriánus']
  ),
  makeFood(
    'Olivaolaj', 'Extra szűz olívaolaj, mediterrán alap',
    'Egeszseges_zsir', 884, 0, 0, 100,
    ['Oleokantál gyulladáscsökkentő', 'Szív-egészség', 'E-vitamin'],
    ['Ebéd', 'Vacsora', 'Öntetek']
  ),
  makeFood(
    'Tökmagolaj', 'Hidegen sajtolt tökmagolaj, cink forrás',
    'Egeszseges_zsir', 884, 0, 0, 100,
    ['Cink', 'E-vitamin', 'Prosztatavédő'],
    ['Saláta', 'Főételek']
  ),

  // ──────────────────────────────────────────────────────────
  // HÜVELYESEK
  // ──────────────────────────────────────────────────────────
  makeFood(
    'Lencse', 'Növényi fehérje + komplex CH + rost kombináció',
    'Huvelyes', 116, 9, 20, 0.4,
    ['Növényi fehérje', 'Folsav', 'Vastartalékok', 'Telítő'],
    ['Ebéd', 'Vegetáriánus', 'Edzésnap']
  ),
  makeFood(
    'Lencsefőzelék', 'Magyar klasszikus, lencséből készült sűrű főzelék',
    'Huvelyes', 120, 8, 21, 1.5,
    ['Növényi fehérje', 'Rost', 'Folsav'],
    ['Ebéd', 'Edzésnap']
  ),

  // ──────────────────────────────────────────────────────────
  // EGYÉB / FŰSZEREK
  // ──────────────────────────────────────────────────────────
  makeFood(
    'Fahéj', 'Vércukrot szabályozó fűszer, antioxidáns',
    'Mag', 247, 4, 81, 1.2,
    ['Vércukor szabályozás', 'Antioxidáns', 'Gyulladáscsökkentő'],
    ['Reggeli', 'Snack']
  ),
];

/**
 * Seed függvény — hívd meg az IDatabase adapteren keresztül
 * Csak akkor ír be, ha az étel még nem létezik (name alapján deduplikál)
 */
export async function seedSystemFoods(db: any): Promise<void> {
  const existing = await db.getFoods?.() ?? [];
  const existingNames = new Set(existing.map((f: any) => f.name.toLowerCase()));

  let inserted = 0;
  for (const food of SYSTEM_FOODS) {
    if (!existingNames.has(food.name.toLowerCase())) {
      await db.saveFood?.(food);
      inserted++;
    }
  }
}

