/**
 * Curated food image library v3 — verified Unsplash photos for specific dishes.
 * Covers HU, RO, and international dishes. Longest keyword match wins.
 * Includes fuzzy keyword-splitting fallback when exact match fails.
 */

interface FoodImageEntry {
  keywords: string[];
  url: string;
  emoji: string;
}

const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=400&h=300&fit=crop&auto=format`;

const FOOD_IMAGES: FoodImageEntry[] = [
  // ══════════════════════════════════════════════════════════════
  // SPECIFIC HUNGARIAN DISHES (longest keywords = highest priority)
  // ══════════════════════════════════════════════════════════════
  { keywords: ['gulyásleves', 'gulyás leves', 'goulash soup'],
    url: U('1689860892307-7db54ab276ba'), emoji: '🍲' },
  { keywords: ['csirkepaprikás galuskával', 'csirke paprikas galuskaval', 'chicken paprikash with dumplings'],
    url: U('1763037152286-3c6c8482a86a'), emoji: '🍲' },
  { keywords: ['töltött káposzta', 'toltott kaposzta', 'stuffed cabbage'],
    url: U('1457298483369-0a95d2b17fcd'), emoji: '🥬' },
  { keywords: ['halászlé', 'halaszle', 'fisherman soup', 'fish soup'],
    url: U('1564671165093-20b5c843b543'), emoji: '🐟' },
  { keywords: ['rakott krumpli', 'layered potato'],
    url: U('1568600891339-fa1267a1c8b2'), emoji: '🥔' },
  { keywords: ['túrós csusza', 'turos csusza', 'cottage cheese noodles'],
    url: U('1551462147-37885acc36f1'), emoji: '🍝' },
  { keywords: ['lecsó', 'lecso', 'ratatouille'],
    url: U('1564834744159-ff0ea41ba4b9'), emoji: '🫑' },
  { keywords: ['lángos', 'langos', 'fried dough'],
    url: U('1565299624946-b28f40a0ae38'), emoji: '🫓' },
  { keywords: ['meggyleves', 'meggy leves', 'sour cherry soup'],
    url: U('1547592166-23ac45744acd'), emoji: '🍒' },
  { keywords: ['somlói galuska', 'somloi galuska', 'trifle'],
    url: U('1578985545062-69928b1d9587'), emoji: '🍰' },
  { keywords: ['bundás kenyér', 'bundas kenyer', 'french toast'],
    url: U('1484723091739-30a097e8f929'), emoji: '🍞' },
  { keywords: ['erdélyi rakott krumpli', 'erdelyi rakott krumpli'],
    url: U('1568600891339-fa1267a1c8b2'), emoji: '🥔' },
  { keywords: ['paradicsomos húsgombóc', 'paradicsomos husgomboc', 'meatball in tomato sauce'],
    url: U('1600688685721-852c38f6e8a6'), emoji: '🧆' },
  { keywords: ['köles-kása', 'koles-kasa', 'köleskása', 'köles kása'],
    url: U('1543363364-98d2b51b47fb'), emoji: '🥣' },
  { keywords: ['túrós palacsinta', 'turos palacsinta', 'cottage cheese pancake'],
    url: U('1597990566967-a0cffc700e1a'), emoji: '🥞' },
  { keywords: ['főzelék', 'fozelek'],
    url: U('1678007698628-0c214c4ef18e'), emoji: '🥣' },
  { keywords: ['rántott', 'rantott', 'schnitzel', 'snitel', 'șnițel', 'rántott csirkemell', 'rántott sajt'],
    url: U('1599921841143-819065a55cc6'), emoji: '🍗' },
  { keywords: ['stefánia', 'stefania', 'meatloaf', 'stefánia vagdalt'],
    url: U('1546039907-7e3a37f13c56'), emoji: '🥩' },
  { keywords: ['túrógombóc', 'turogomboc', 'cottage cheese dumpling'],
    url: U('1551462147-37885acc36f1'), emoji: '🥟' },
  { keywords: ['mákos', 'makos', 'poppy seed', 'mákos tészta', 'mac cu paste'],
    url: U('1551462147-37885acc36f1'), emoji: '🍝' },

  // ══════════════════════════════════════════════════════════════
  // SPECIFIC ROMANIAN DISHES
  // ══════════════════════════════════════════════════════════════
  { keywords: ['ciorbă de burtă', 'ciorba de burta', 'tripe soup'],
    url: U('1547592166-23ac45744acd'), emoji: '🍲' },
  { keywords: ['ciorbă de perișoare', 'ciorba de perisoare', 'meatball soup'],
    url: U('1627366422957-3efa9c6df0fc'), emoji: '🍲' },
  { keywords: ['ciorbă de pui', 'ciorba de pui', 'chicken sour soup'],
    url: U('1627366422957-3efa9c6df0fc'), emoji: '🍲' },
  { keywords: ['ciorbă', 'ciorba'],
    url: U('1547592166-23ac45744acd'), emoji: '🍲' },
  { keywords: ['sarmale cu mămăligă', 'sarmale cu mamaliga'],
    url: U('1457298483369-0a95d2b17fcd'), emoji: '🥬' },
  { keywords: ['sarmale', 'cabbage rolls'],
    url: U('1457298483369-0a95d2b17fcd'), emoji: '🥬' },
  { keywords: ['mici', 'mititei'],
    url: U('1558030006-d4a0e4f14913'), emoji: '🌭' },
  { keywords: ['mămăligă cu brânză', 'mamaliga cu branza', 'polenta with cheese'],
    url: U('1676547480642-3e056a4137e8'), emoji: '🌽' },
  { keywords: ['papanași', 'papanasi', 'cottage cheese doughnuts'],
    url: U('1578985545062-69928b1d9587'), emoji: '🍩' },
  { keywords: ['cozonac'],
    url: U('1509440159-c3282dda9ac6'), emoji: '🍞' },
  { keywords: ['tocană', 'tocana', 'tocanita'],
    url: U('1689860892307-7db54ab276ba'), emoji: '🍲' },
  { keywords: ['pilaf de pui', 'chicken pilaf'],
    url: U('1633383718081-22ac93e3db65'), emoji: '🍚' },
  { keywords: ['clătite', 'clatite', 'crêpes'],
    url: U('1597990566967-a0cffc700e1a'), emoji: '🥞' },

  // ══════════════════════════════════════════════════════════════
  // INTERNATIONAL DISHES
  // ══════════════════════════════════════════════════════════════
  { keywords: ['avokádós toast', 'avokados toast', 'avocado toast'],
    url: U('1613769049987-b31b641f25b1'), emoji: '🥑' },
  { keywords: ['gomba krémleves', 'gombakremleves', 'cream of mushroom soup', 'mushroom soup'],
    url: U('1528131678130-c15f627bce80'), emoji: '🍄' },
  { keywords: ['bolognai', 'bolognese', 'pasta bolognese'],
    url: U('1600803907087-f56d462fd26b'), emoji: '🍝' },
  { keywords: ['görög saláta', 'gorog salata', 'greek salad'],
    url: U('1745126010010-da1c6f5300a9'), emoji: '🥗' },
  { keywords: ['lencsefőzelék', 'lencsefozelek', 'lencse leves', 'lentil soup', 'lentil stew'],
    url: U('1678007698628-0c214c4ef18e'), emoji: '🫘' },
  { keywords: ['bab leves', 'bableves', 'bean soup'],
    url: U('1547592166-23ac45744acd'), emoji: '🫘' },
  { keywords: ['almás rétes', 'almas retes', 'apple strudel', 'strudel'],
    url: U('1657313937945-c7aa356b832b'), emoji: '🥐' },
  { keywords: ['zöldséges rizs', 'zoldseges rizs', 'rice with vegetables', 'vegetable rice'],
    url: U('1633383718081-22ac93e3db65'), emoji: '🍚' },
  { keywords: ['rizottó', 'rizotto', 'risotto'],
    url: U('1633383718081-22ac93e3db65'), emoji: '🍚' },
  { keywords: ['smoothie', 'turmix'],
    url: U('1505252585461-04db1eb84625'), emoji: '🥤' },
  { keywords: ['wrap', 'tortilla'],
    url: U('1626700051175-6818013e1d4f'), emoji: '🌯' },
  { keywords: ['szendvics', 'sandwich', 'sendvis'],
    url: U('1528735602780-2552fd46c7af'), emoji: '🥪' },
  { keywords: ['steak', 'szték', 'sztek', 'beef steak'],
    url: U('1546964124-76c5b0a3b57f'), emoji: '🥩' },
  { keywords: ['pizza'],
    url: U('1565299507472-765c94ed1b1c'), emoji: '🍕' },
  { keywords: ['quinoa', 'quinoa salad', 'quinoa bowl'],
    url: U('1505576399279-0d06b1fea60f'), emoji: '🥗' },
  { keywords: ['humusz', 'hummus'],
    url: U('1577805947252-80a0c2df1055'), emoji: '🫘' },
  { keywords: ['buddha bowl', 'buddha tál', 'poke bowl'],
    url: U('1512621776951-a57141f2eefd'), emoji: '🥗' },

  // ══════════════════════════════════════════════════════════════
  // MAIN PROTEINS
  // ══════════════════════════════════════════════════════════════
  { keywords: ['csirkemell', 'chicken breast', 'piept de pui', 'grillezett csirke', 'grilled chicken'],
    url: U('1567121938596-6d9d015d348b'), emoji: '🍗' },
  { keywords: ['pulykamell', 'turkey breast', 'piept de curcan', 'grilled turkey'],
    url: U('1609658938891-32dd655106af'), emoji: '🦃' },
  { keywords: ['lazac', 'salmon', 'somon', 'grillezett lazac'],
    url: U('1508170754725-6e9a5cfbcabf'), emoji: '🐟' },
  { keywords: ['tonhal', 'tuna', 'ton'],
    url: U('1572862905000-c5b6244027a5'), emoji: '🐟' },
  { keywords: ['sertés', 'sertes', 'karaj', 'pork chop', 'porc', 'pork'],
    url: U('1432139555190-58524dae6a55'), emoji: '🥩' },
  { keywords: ['fasírt', 'fasirt', 'húsgombóc', 'husgomboc', 'meatball'],
    url: U('1600688685721-852c38f6e8a6'), emoji: '🧆' },
  { keywords: ['hal', 'fish', 'peste', 'sült hal', 'baked fish'],
    url: U('1572862905000-c5b6244027a5'), emoji: '🐟' },
  { keywords: ['tofu'],
    url: U('1546069901-d5bdc52ef9fd'), emoji: '🧊' },
  { keywords: ['marha', 'marhahús', 'marhahus', 'beef', 'vita'],
    url: U('1588168946166-5f2ccf23b9d4'), emoji: '🥩' },
  { keywords: ['borjú', 'borju', 'veal', 'vitel'],
    url: U('1544025162-d76694265947'), emoji: '🥩' },
  { keywords: ['sonka', 'ham', 'sunca', 'șuncă', 'prosciutto'],
    url: U('1524438418049-ab2acb7aa48f'), emoji: '🥓' },
  { keywords: ['pisztráng', 'pisztrang', 'trout', 'pastrav', 'păstrăv'],
    url: U('1534422298391-e4f8c172dddb'), emoji: '🐟' },
  { keywords: ['ponty', 'carp', 'crap'],
    url: U('1498654200943-1088dd4438ae'), emoji: '🐟' },
  { keywords: ['harcsa', 'catfish', 'somn'],
    url: U('1519708227418-b060153bad55'), emoji: '🐟' },
  { keywords: ['csuka', 'pike', 'stiuca', 'știucă'],
    url: U('1498654200943-1088dd4438ae'), emoji: '🐟' },
  { keywords: ['süllő', 'sullo', 'pike-perch', 'salau', 'șalău'],
    url: U('1498654200943-1088dd4438ae'), emoji: '🐟' },
  { keywords: ['makréla', 'makrela', 'mackerel', 'macrou'],
    url: U('1580476262798-bddd9f4b7369'), emoji: '🐟' },

  // ══════════════════════════════════════════════════════════════
  // STEWS / SOUPS (generic)
  // ══════════════════════════════════════════════════════════════
  { keywords: ['paprikás', 'paprikas', 'paprikash', 'csirke paprikás', 'papricaș'],
    url: U('1763037152286-3c6c8482a86a'), emoji: '🍲' },
  { keywords: ['gulyás', 'gulyas', 'goulash', 'pörkölt', 'porkolt', 'stew'],
    url: U('1689860892307-7db54ab276ba'), emoji: '🍲' },
  { keywords: ['csirkeleves', 'tyúkhúsleves', 'chicken soup'],
    url: U('1627366422957-3efa9c6df0fc'), emoji: '🥣' },
  { keywords: ['krémleves', 'kremleves', 'cream soup', 'supă cremă', 'supa crema'],
    url: U('1528131678130-c15f627bce80'), emoji: '🍲' },
  { keywords: ['leves', 'soup', 'supă', 'supa'],
    url: U('1627366422957-3efa9c6df0fc'), emoji: '🥣' },

  // ══════════════════════════════════════════════════════════════
  // BREAKFAST ITEMS
  // ══════════════════════════════════════════════════════════════
  { keywords: ['rántotta', 'rantotta', 'scrambled egg'],
    url: U('1773672726538-885c0d878033'), emoji: '🍳' },
  { keywords: ['omlett', 'omlette', 'omletă', 'omelette'],
    url: U('1773672726538-885c0d878033'), emoji: '🍳' },
  { keywords: ['tojás', 'tojas', 'egg', 'ou'],
    url: U('1773672726538-885c0d878033'), emoji: '🍳' },
  { keywords: ['zabkása', 'zabkasa', 'oatmeal', 'zabpehely', 'ovăz', 'ovaz', 'porridge'],
    url: U('1594490150174-b349c66d93c5'), emoji: '🥣' },
  { keywords: ['joghurt', 'yogurt', 'müzli', 'muzli', 'granola', 'iaurt'],
    url: U('1725883691833-97103ecd582a'), emoji: '🥛' },
  { keywords: ['túró', 'turo', 'cottage cheese', 'branza de vaci', 'brânză de vaci'],
    url: U('1486297678908-f040de5aaec2'), emoji: '🧀' },
  { keywords: ['kefír', 'kefir'],
    url: U('1572443490709-b0f0e0f43af0'), emoji: '🥛' },
  { keywords: ['fehérjepor', 'feherje por', 'protein por', 'whey', 'protein powder'],
    url: U('1593095948071-474c5cc2989d'), emoji: '💪' },
  { keywords: ['palacsinta', 'pancake'],
    url: U('1597990566967-a0cffc700e1a'), emoji: '🥞' },
  { keywords: ['pirítós', 'piritos', 'toast', 'paine prajita'],
    url: U('1484723091739-30a097e8f929'), emoji: '🍞' },

  // ══════════════════════════════════════════════════════════════
  // SIDES / OTHER
  // ══════════════════════════════════════════════════════════════
  { keywords: ['polenta', 'puliszka', 'mamaliga', 'mămăligă'],
    url: U('1676547480642-3e056a4137e8'), emoji: '🌽' },
  { keywords: ['nokedli', 'galuska', 'dumplings', 'găluște', 'galuste'],
    url: U('1551462147-37885acc36f1'), emoji: '🥟' },
  { keywords: ['krumpli', 'burgonya', 'potato', 'cartofi', 'sült krumpli', 'baked potato'],
    url: U('1568600891339-fa1267a1c8b2'), emoji: '🥔' },
  { keywords: ['tészta', 'teszta', 'pasta', 'paste', 'spagetti', 'spaghetti', 'penne'],
    url: U('1600803907087-f56d462fd26b'), emoji: '🍝' },
  { keywords: ['rizs', 'rice', 'orez'],
    url: U('1633383718081-22ac93e3db65'), emoji: '🍚' },
  { keywords: ['saláta', 'salata', 'salad'],
    url: U('1745126010010-da1c6f5300a9'), emoji: '🥗' },
  { keywords: ['brokkoli', 'broccoli', 'brocoli'],
    url: U('1459411552884-841db9b3cc2a'), emoji: '🥦' },
  { keywords: ['spenót', 'spenot', 'spinach', 'spanac'],
    url: U('1576045057995-568f588f82fb'), emoji: '🥬' },
  { keywords: ['sárgarépa', 'sargarepa', 'carrot', 'morcov', 'morcovi'],
    url: U('1447175008436-054170c2e979'), emoji: '🥕' },
  { keywords: ['paradicsom', 'tomato', 'roșie', 'rosie', 'tomate'],
    url: U('1546094096-0df4bcaaa337'), emoji: '🍅' },
  { keywords: ['uborka', 'cucumber', 'castravete'],
    url: U('1449300079323-02e209d9d3a6'), emoji: '🥒' },
  { keywords: ['édesburgonya', 'edesburgonya', 'sweet potato', 'cartof dulce', 'batata'],
    url: U('1596097635121-14b63a7df3d2'), emoji: '🍠' },
  { keywords: ['cékla', 'cekla', 'beetroot', 'sfecla', 'sfeclă'],
    url: U('1601648764658-cf37e8c89b70'), emoji: '🟣' },
  { keywords: ['karfiol', 'cauliflower', 'conopida', 'conopidă'],
    url: U('1568702846914-96b305d2aaeb'), emoji: '🥦' },
  { keywords: ['cukkini', 'zucchini', 'dovlecel'],
    url: U('1563252722-65c68a724d51'), emoji: '🥒' },
  { keywords: ['káposzta', 'kaposzta', 'cabbage', 'varza', 'varză'],
    url: U('1594282486552-05b4d80fbb9f'), emoji: '🥬' },
  { keywords: ['padlizsán', 'padlizsan', 'eggplant', 'vinete', 'aubergine'],
    url: U('1615484477778-ca3b77940c25'), emoji: '🍆' },
  { keywords: ['sütőtök', 'sutotok', 'pumpkin', 'dovleac', 'tök'],
    url: U('1506917728037-b6af01a7d403'), emoji: '🎃' },
  { keywords: ['spárga', 'sparga', 'asparagus', 'sparanghel'],
    url: U('1515471209610-dae1c92d8777'), emoji: '🌿' },
  { keywords: ['rucola', 'rukkola', 'arugula', 'rocket'],
    url: U('1512621776951-a57141f2eefd'), emoji: '🥗' },
  { keywords: ['bulgur'],
    url: U('1563379926898-05f4575a45d8'), emoji: '🌾' },
  { keywords: ['csicseriborsó', 'csicserborso', 'chickpea', 'naut', 'năut'],
    url: U('1515543904747-bac7acca4007'), emoji: '🫘' },
  { keywords: ['pirított zöldség', 'piritott zoldseg', 'stir fry', 'wok', 'roasted vegetables'],
    url: U('1695918429216-7771d419f2a9'), emoji: '🥕' },
  { keywords: ['párolt zöldség', 'parolt zoldseg', 'steamed vegetables', 'legume la abur'],
    url: U('1695918429216-7771d419f2a9'), emoji: '🥦' },
  { keywords: ['zöldség', 'zoldseg', 'vegetable', 'legume'],
    url: U('1695918429216-7771d419f2a9'), emoji: '🥕' },
  { keywords: ['banán', 'banan', 'banana'],
    url: U('1571771894821-ce9b6c11b08e'), emoji: '🍌' },
  { keywords: ['áfonya', 'afonya', 'blueberry', 'afine'],
    url: U('1498557850523-fd3d118b962e'), emoji: '🫐' },
  { keywords: ['málna', 'malna', 'raspberry', 'zmeura', 'zmeură'],
    url: U('1577069861033-55d04cec4ef5'), emoji: '🍇' },
  { keywords: ['gyümölcs', 'gyumolcs', 'fruit', 'fructe'],
    url: U('1619566636858-adf3ef46400b'), emoji: '🍎' },
  { keywords: ['dió', 'dio', 'walnut', 'nuca', 'nuts', 'mogyoró', 'mogyoro', 'mandula', 'almond'],
    url: U('1543363136-3fdb60cf1ab6'), emoji: '🥜' },
  { keywords: ['kókusztej', 'kokusztej', 'coconut milk', 'lapte de cocos'],
    url: U('1550583724-b2692b85b150'), emoji: '🥥' },
  { keywords: ['chia mag', 'chia seed', 'chia'],
    url: U('1511690743986-665a15f8d8c3'), emoji: '🌱' },

  // ══════════════════════════════════════════════════════════════
  // DESSERTS
  // ══════════════════════════════════════════════════════════════
  { keywords: ['rétes', 'retes'],
    url: U('1657313937945-c7aa356b832b'), emoji: '🥐' },
  { keywords: ['torta', 'cake', 'sütemény', 'sutemeny', 'dessert', 'prăjitură', 'prajitura'],
    url: U('1578985545062-69928b1d9587'), emoji: '🍰' },

  // ══════════════════════════════════════════════════════════════
  // DRINKS
  // ══════════════════════════════════════════════════════════════
  { keywords: ['kávé', 'kave', 'coffee', 'cafea'],
    url: U('1509042239860-f550ce710b93'), emoji: '☕' },
  { keywords: ['tea', 'ceai'],
    url: U('1556679343-c7306c1976bc'), emoji: '🍵' },

  // ══════════════════════════════════════════════════════════════
  // MEAL TYPE FALLBACKS (lowest priority — short keywords)
  // ══════════════════════════════════════════════════════════════
  { keywords: ['reggeli', 'breakfast', 'mic dejun'],
    url: U('1533089860892-a7c6f0a88666'), emoji: '🌅' },
  { keywords: ['ebéd', 'ebed', 'lunch', 'prânz', 'pranz'],
    url: U('1546069901-ba9599a7e63c'), emoji: '🍽️' },
  { keywords: ['vacsora', 'dinner', 'cină', 'cina'],
    url: U('1414235077428-338989a2e8c0'), emoji: '🌙' },
  { keywords: ['snack', 'gustare', 'uzsonna', 'tízórai'],
    url: U('1619566636858-adf3ef46400b'), emoji: '🍎' },
];

function stripAccents(s: string): string {
  try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch { return s; }
}

// Meal-type fallback images used when no keyword matches at all
const MEAL_TYPE_FALLBACKS: Record<string, { url: string; emoji: string }> = {
  breakfast: { url: U('1533089860892-a7c6f0a88666'), emoji: '🌅' },
  lunch:     { url: U('1546069901-ba9599a7e63c'), emoji: '🍽️' },
  dinner:    { url: U('1414235077428-338989a2e8c0'), emoji: '🌙' },
  snack:     { url: U('1619566636858-adf3ef46400b'), emoji: '🍎' },
};

/**
 * Find the best matching food image for a given meal name.
 *
 * Strategy:
 *  1. Exact substring match (longest keyword wins) — original behavior
 *  2. Fuzzy: split meal name into words, check if any word matches a keyword
 *  3. Meal-type fallback if provided
 *  4. Generic fallback
 */
export function findFoodImage(
  name: string,
  mealType?: string,
): { url: string | null; emoji: string } {
  if (!name) {
    if (mealType && MEAL_TYPE_FALLBACKS[mealType]) {
      return MEAL_TYPE_FALLBACKS[mealType];
    }
    return { url: null, emoji: '🍽️' };
  }

  const lower = stripAccents(name.toLowerCase());

  // ── Pass 1: Exact substring match (longest keyword wins) ──
  let bestMatch: FoodImageEntry | null = null;
  let bestLen = 0;

  for (const entry of FOOD_IMAGES) {
    for (const kw of entry.keywords) {
      const kwNorm = stripAccents(kw.toLowerCase());
      if (lower.includes(kwNorm) && kwNorm.length > bestLen) {
        bestMatch = entry;
        bestLen = kwNorm.length;
      }
    }
  }

  if (bestMatch) return { url: bestMatch.url, emoji: bestMatch.emoji };

  // ── Pass 2: Fuzzy — split meal name into words, match individual words ──
  // Skip very short words (articles, prepositions)
  const words = lower.split(/[\s,\-–—]+/).filter(w => w.length >= 3);
  let fuzzyMatch: FoodImageEntry | null = null;
  let fuzzyLen = 0;

  for (const entry of FOOD_IMAGES) {
    for (const kw of entry.keywords) {
      const kwNorm = stripAccents(kw.toLowerCase());
      for (const word of words) {
        // Check if a significant word from the meal name appears in a keyword, or vice versa
        if ((kwNorm.includes(word) || word.includes(kwNorm)) && kwNorm.length > fuzzyLen) {
          fuzzyMatch = entry;
          fuzzyLen = kwNorm.length;
        }
      }
    }
  }

  if (fuzzyMatch) return { url: fuzzyMatch.url, emoji: fuzzyMatch.emoji };

  // ── Pass 3: Meal-type fallback ──
  if (mealType && MEAL_TYPE_FALLBACKS[mealType]) {
    return MEAL_TYPE_FALLBACKS[mealType];
  }

  return { url: null, emoji: '🍽️' };
}
