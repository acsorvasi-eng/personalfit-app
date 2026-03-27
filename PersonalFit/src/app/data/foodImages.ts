/**
 * Curated food image library — high-quality Unsplash photos for common meals.
 * Each URL is a direct Unsplash CDN link (no API key needed, permanent).
 *
 * Format: https://images.unsplash.com/photo-{ID}?w={width}&h={height}&fit=crop&auto=format
 *
 * Matching: fuzzy keyword match from meal name → best image URL.
 */

interface FoodImageEntry {
  keywords: string[];  // HU + EN + RO keywords to match against meal name
  url: string;         // Unsplash CDN direct URL
  emoji: string;       // Fallback emoji
}

const FOOD_IMAGES: FoodImageEntry[] = [
  // ── Breakfast items ──
  { keywords: ['köles-kása', 'koles-kasa', 'köles kása', 'köleskása', 'millet porridge'],
    url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop&auto=format', emoji: '🥣' },
  { keywords: ['köles', 'koles', 'millet'],
    url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop&auto=format', emoji: '🌾' },
  { keywords: ['kása', 'kasa', 'porridge', 'oatmeal', 'zabkása', 'zabpehely', 'terci'],
    url: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop&auto=format', emoji: '🥣' },
  { keywords: ['tojás', 'tojas', 'egg', 'rántotta', 'rantotta', 'scrambled', 'omlett', 'ou'],
    url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop&auto=format', emoji: '🍳' },
  { keywords: ['palacsinta', 'pancake', 'clatite'],
    url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop&auto=format', emoji: '🥞' },
  { keywords: ['müzli', 'muzli', 'granola', 'cereal'],
    url: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&h=300&fit=crop&auto=format', emoji: '🥣' },
  { keywords: ['joghurt', 'yogurt', 'iaurt'],
    url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop&auto=format', emoji: '🥛' },
  { keywords: ['toast', 'pirítós', 'piritos', 'kenyér', 'kenyer', 'bread', 'paine'],
    url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop&auto=format', emoji: '🍞' },
  { keywords: ['smoothie', 'turmix'],
    url: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=300&fit=crop&auto=format', emoji: '🥤' },

  // ── Chicken / Poultry ──
  { keywords: ['csirkemell', 'chicken breast', 'piept de pui', 'grillezett csirke', 'grilled chicken'],
    url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop&auto=format', emoji: '🍗' },
  { keywords: ['csirke', 'chicken', 'pui', 'csirkecomb', 'pulyka', 'turkey', 'curcan'],
    url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop&auto=format', emoji: '🍗' },
  { keywords: ['paprikás', 'paprikas', 'paprikash'],
    url: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop&auto=format', emoji: '🍲' },

  // ── Beef / Pork / Meat ──
  { keywords: ['steak', 'marha', 'beef', 'vita'],
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&auto=format', emoji: '🥩' },
  { keywords: ['pörkölt', 'porkolt', 'stew', 'tocanita', 'gulás', 'goulash', 'gulas'],
    url: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=400&h=300&fit=crop&auto=format', emoji: '🍲' },
  { keywords: ['fasírt', 'fasirt', 'meatball', 'chiftea', 'húsgombóc'],
    url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&h=300&fit=crop&auto=format', emoji: '🧆' },
  { keywords: ['sertés', 'sertes', 'pork', 'porc', 'karaj', 'szelet'],
    url: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=300&fit=crop&auto=format', emoji: '🥩' },
  { keywords: ['kolbász', 'kolbasz', 'sausage', 'carnati', 'mici'],
    url: 'https://images.unsplash.com/photo-1525164286253-04e68b9d94c6?w=400&h=300&fit=crop&auto=format', emoji: '🌭' },
  { keywords: ['töltött káposzta', 'toltott kaposzta', 'stuffed cabbage', 'sarmale'],
    url: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=400&h=300&fit=crop&auto=format', emoji: '🥬' },

  // ── Fish ──
  { keywords: ['lazac', 'salmon', 'somon'],
    url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop&auto=format', emoji: '🐟' },
  { keywords: ['hal', 'fish', 'peste', 'tonhal', 'tuna', 'pisztráng', 'trout'],
    url: 'https://images.unsplash.com/photo-1510130113356-d2e14d4db5d4?w=400&h=300&fit=crop&auto=format', emoji: '🐟' },

  // ── Pasta / Rice / Grains ──
  { keywords: ['tészta', 'teszta', 'pasta', 'paste', 'spagetti', 'spaghetti', 'penne'],
    url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop&auto=format', emoji: '🍝' },
  { keywords: ['rizs', 'rice', 'orez', 'rizottó', 'risotto'],
    url: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400&h=300&fit=crop&auto=format', emoji: '🍚' },
  { keywords: ['polenta', 'puliszka', 'mamaliga', 'mămăligă'],
    url: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop&auto=format', emoji: '🌽' },
  { keywords: ['köles', 'koles', 'millet', 'mei'],
    url: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&h=300&fit=crop&auto=format', emoji: '🌾' },

  // ── Salads ──
  { keywords: ['saláta', 'salata', 'salad'],
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop&auto=format', emoji: '🥗' },
  { keywords: ['caesar'],
    url: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&h=300&fit=crop&auto=format', emoji: '🥗' },

  // ── Soups ──
  { keywords: ['leves', 'soup', 'supa', 'ciorba', 'ciorbă', 'gulyás', 'gulyasleves'],
    url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop&auto=format', emoji: '🥣' },
  { keywords: ['krémleves', 'kremleves', 'cream soup'],
    url: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400&h=300&fit=crop&auto=format', emoji: '🥣' },

  // ── Vegetables / Sides ──
  { keywords: ['brokkoli', 'broccoli'],
    url: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=300&fit=crop&auto=format', emoji: '🥦' },
  { keywords: ['burgonya', 'potato', 'cartofi', 'krumpli', 'sült krumpli'],
    url: 'https://images.unsplash.com/photo-1518977676601-b53f82ber7a2?w=400&h=300&fit=crop&auto=format', emoji: '🥔' },
  { keywords: ['zöldség', 'zeldseg', 'vegetable', 'legume', 'grillezett zöldség'],
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop&auto=format', emoji: '🥕' },

  // ── Desserts ──
  { keywords: ['rétes', 'retes', 'strudel'],
    url: 'https://images.unsplash.com/photo-1509365390695-33aee754301f?w=400&h=300&fit=crop&auto=format', emoji: '🥐' },
  { keywords: ['torta', 'cake', 'sütemény', 'sutemeny', 'dessert', 'desert'],
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop&auto=format', emoji: '🍰' },
  { keywords: ['gyümölcs', 'gyumolcs', 'fruit', 'fructe'],
    url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=300&fit=crop&auto=format', emoji: '🍇' },

  // ── Drinks ──
  { keywords: ['kávé', 'kave', 'coffee', 'cafea'],
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop&auto=format', emoji: '☕' },
  { keywords: ['tea', 'ceai'],
    url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop&auto=format', emoji: '🍵' },

  // ── Generic meals ──
  { keywords: ['reggeli', 'breakfast', 'mic dejun'],
    url: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop&auto=format', emoji: '🌅' },
  { keywords: ['ebéd', 'ebed', 'lunch', 'pranz', 'prânz'],
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&auto=format', emoji: '🍽️' },
  { keywords: ['vacsora', 'dinner', 'cina', 'cină'],
    url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop&auto=format', emoji: '🌙' },
  { keywords: ['tál', 'tal', 'bowl', 'buddha bowl'],
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop&auto=format', emoji: '🥗' },
];

// Remove accents for matching
function stripAccents(s: string): string {
  try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch { return s; }
}

/**
 * Find the best matching food image URL for a given meal/food name.
 * Returns { url, emoji } — url may be null if no match found.
 */
export function findFoodImage(name: string): { url: string | null; emoji: string } {
  if (!name) return { url: null, emoji: '🍽️' };

  const lower = stripAccents(name.toLowerCase());

  // Find the longest matching keyword (most specific wins)
  let bestMatch: FoodImageEntry | null = null;
  let bestLen = 0;

  for (const entry of FOOD_IMAGES) {
    for (const kw of entry.keywords) {
      const kwNorm = stripAccents(kw);
      if (lower.includes(kwNorm) && kwNorm.length > bestLen) {
        bestMatch = entry;
        bestLen = kwNorm.length;
      }
    }
  }

  if (bestMatch) return { url: bestMatch.url, emoji: bestMatch.emoji };
  return { url: null, emoji: '🍽️' };
}
