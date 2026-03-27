/**
 * Curated food image library v2 — verified Unsplash photos for specific dishes.
 * Every photo shows EXACTLY the named dish. Longest keyword match wins.
 */

interface FoodImageEntry {
  keywords: string[];
  url: string;
  emoji: string;
}

const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=400&h=300&fit=crop&auto=format`;

const FOOD_IMAGES: FoodImageEntry[] = [
  // ── Specific dishes (longer keywords = higher priority) ──
  { keywords: ['köles-kása', 'koles-kasa', 'köleskása', 'köles kása vajas gombával'],
    url: U('1543363364-98d2b51b47fb'), emoji: '🥣' },
  { keywords: ['túrós palacsinta', 'turos palacsinta', 'cottage cheese pancake'],
    url: U('1597990566967-a0cffc700e1a'), emoji: '🥞' },
  { keywords: ['avokádós toast', 'avokados toast', 'avocado toast'],
    url: U('1613769049987-b31b641f25b1'), emoji: '🥑' },
  { keywords: ['töltött káposzta', 'toltott kaposzta', 'stuffed cabbage', 'sarmale'],
    url: U('1457298483369-0a95d2b17fcd'), emoji: '🥬' },
  { keywords: ['gomba krémleves', 'gombakremleves', 'cream of mushroom soup'],
    url: U('1528131678130-c15f627bce80'), emoji: '🍄' },
  { keywords: ['bolognai', 'bolognese', 'pasta bolognese'],
    url: U('1600803907087-f56d462fd26b'), emoji: '🍝' },
  { keywords: ['görög saláta', 'gorog salata', 'greek salad'],
    url: U('1745126010010-da1c6f5300a9'), emoji: '🥗' },
  { keywords: ['lencsefőzelék', 'lencsefozelek', 'lencse leves', 'lentil soup'],
    url: U('1678007698628-0c214c4ef18e'), emoji: '🫘' },
  { keywords: ['bab leves', 'bableves', 'bean soup'],
    url: U('1547592166-23ac45744acd'), emoji: '🫘' },
  { keywords: ['almás rétes', 'almas retes', 'apple strudel', 'strudel'],
    url: U('1657313937945-c7aa356b832b'), emoji: '🥐' },
  { keywords: ['zöldséges rizs', 'zoldseges rizs', 'rice with vegetables'],
    url: U('1633383718081-22ac93e3db65'), emoji: '🍚' },

  // ── Main proteins ──
  { keywords: ['csirkemell', 'chicken breast', 'piept de pui', 'grillezett csirke'],
    url: U('1567121938596-6d9d015d348b'), emoji: '🍗' },
  { keywords: ['pulykamell', 'turkey breast', 'piept de curcan'],
    url: U('1609658938891-32dd655106af'), emoji: '🦃' },
  { keywords: ['lazac', 'salmon', 'somon', 'grillezett lazac'],
    url: U('1508170754725-6e9a5cfbcabf'), emoji: '🐟' },
  { keywords: ['sertés', 'sertes', 'karaj', 'pork chop', 'porc'],
    url: U('1432139555190-58524dae6a55'), emoji: '🥩' },
  { keywords: ['fasírt', 'fasirt', 'húsgombóc', 'husgomboc', 'meatball'],
    url: U('1600688685721-852c38f6e8a6'), emoji: '🧆' },
  { keywords: ['hal', 'fish', 'peste', 'sült hal', 'baked fish'],
    url: U('1572862905000-c5b6244027a5'), emoji: '🐟' },

  // ── Stews / Soups ──
  { keywords: ['paprikás', 'paprikas', 'paprikash', 'csirke paprikás'],
    url: U('1763037152286-3c6c8482a86a'), emoji: '🍲' },
  { keywords: ['gulyás', 'gulyas', 'goulash', 'pörkölt', 'porkolt', 'stew', 'tocanita'],
    url: U('1689860892307-7db54ab276ba'), emoji: '🍲' },
  { keywords: ['csirkeleves', 'tyúkhúsleves', 'chicken soup', 'leves'],
    url: U('1627366422957-3efa9c6df0fc'), emoji: '🥣' },

  // ── Breakfast items ──
  { keywords: ['tojás', 'tojas', 'egg', 'rántotta', 'rantotta', 'scrambled', 'omlett'],
    url: U('1773672726538-885c0d878033'), emoji: '🍳' },
  { keywords: ['zabkása', 'zabkasa', 'oatmeal', 'zabpehely'],
    url: U('1594490150174-b349c66d93c5'), emoji: '🥣' },
  { keywords: ['joghurt', 'yogurt', 'müzli', 'muzli', 'granola', 'iaurt'],
    url: U('1725883691833-97103ecd582a'), emoji: '🥛' },
  { keywords: ['palacsinta', 'pancake', 'clatite'],
    url: U('1597990566967-a0cffc700e1a'), emoji: '🥞' },

  // ── Sides / Other ──
  { keywords: ['polenta', 'puliszka', 'mamaliga', 'mămăligă'],
    url: U('1676547480642-3e056a4137e8'), emoji: '🌽' },
  { keywords: ['tészta', 'teszta', 'pasta', 'paste', 'spagetti'],
    url: U('1600803907087-f56d462fd26b'), emoji: '🍝' },
  { keywords: ['rizs', 'rice', 'orez'],
    url: U('1633383718081-22ac93e3db65'), emoji: '🍚' },
  { keywords: ['saláta', 'salata', 'salad'],
    url: U('1745126010010-da1c6f5300a9'), emoji: '🥗' },
  { keywords: ['pirított zöldség', 'piritott zoldseg', 'stir fry', 'wok'],
    url: U('1695918429216-7771d419f2a9'), emoji: '🥕' },
  { keywords: ['zöldség', 'zoldseg', 'vegetable', 'legume'],
    url: U('1695918429216-7771d419f2a9'), emoji: '🥕' },

  // ── Desserts ──
  { keywords: ['rétes', 'retes'],
    url: U('1657313937945-c7aa356b832b'), emoji: '🥐' },
  { keywords: ['torta', 'cake', 'sütemény', 'sutemeny', 'dessert'],
    url: U('1578985545062-69928b1d9587'), emoji: '🍰' },

  // ── Drinks ──
  { keywords: ['kávé', 'kave', 'coffee', 'cafea'],
    url: U('1509042239860-f550ce710b93'), emoji: '☕' },
  { keywords: ['tea', 'ceai'],
    url: U('1556679343-c7306c1976bc'), emoji: '🍵' },

  // ── Meal type fallbacks (lowest priority, short keywords) ──
  { keywords: ['reggeli', 'breakfast', 'mic dejun'],
    url: U('1533089860892-a7c6f0a88666'), emoji: '🌅' },
  { keywords: ['ebéd', 'ebed', 'lunch', 'pranz'],
    url: U('1546069901-ba9599a7e63c'), emoji: '🍽️' },
  { keywords: ['vacsora', 'dinner', 'cina'],
    url: U('1414235077428-338989a2e8c0'), emoji: '🌙' },
];

function stripAccents(s: string): string {
  try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch { return s; }
}

export function findFoodImage(name: string): { url: string | null; emoji: string } {
  if (!name) return { url: null, emoji: '🍽️' };
  const lower = stripAccents(name.toLowerCase());

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
  return { url: null, emoji: '🍽️' };
}
