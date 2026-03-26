// api/chef.ts — unified Chef Agent endpoint (recipe + menu estimation)
// Combines generate-recipe and estimate-menu-nutrition to stay within Vercel Hobby 12-function limit
import Anthropic from '@anthropic-ai/sdk';
import * as admin from 'firebase-admin';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LANG_LABELS: Record<string, string> = {
  hu: 'Hungarian',
  ro: 'Romanian',
  en: 'English',
};

function getAdminApp(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!;
  const keyB64 = process.env.FIREBASE_ADMIN_KEY;
  if (!keyB64) return null;
  try {
    const credential = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(credential) });
  } catch (e) {
    console.warn('[chef] Firebase Admin init failed:', e);
    return null;
  }
}

async function validateUser(userId: string | undefined): Promise<boolean> {
  if (!userId || userId === 'anonymous') return false;
  const app = getAdminApp();
  if (!app) return true; // fail open for local dev
  try {
    const snap = await admin.firestore(app).collection('users').doc(userId).get();
    return snap.exists;
  } catch {
    return true; // fail open on error
  }
}

const tryParse = (raw: string): any | null => {
  const cleaned = raw.trim()
    .replace(/^```json\s*/i, '').replace(/```$/i, '')
    .replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const objMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
  return null;
};

async function handleRecipe(body: any, res: any) {
  const { userId, userProfile, meal, weekContext, language } = body;
  const isValid = await validateUser(userId);
  if (!isValid) return res.status(401).json({ error: 'Unauthorized' });

  if (!meal?.name || !meal?.mealType) {
    return res.status(400).json({ error: 'Missing meal data' });
  }

  const lang = LANG_LABELS[language] || 'Hungarian';
  const ingredientList = (meal.ingredientDetails || []).length > 0
    ? meal.ingredientDetails.map((i: any) => `${i.name} ${i.quantity}`).join(', ')
    : (meal.ingredients || []).join(', ');

  const gastroRules = `
Gastro rules to check (include gastroNote only if a rule is violated or worth noting):
- Max eggs per week: ${userProfile?.age >= 60 ? 3 : 4} (current count this week: ${weekContext?.eggsThisWeek ?? 0})
- No same protein source twice in one day. Today's proteins so far: ${(weekContext?.proteinSourcesToday ?? []).join(', ') || 'none'}
- For weight_loss goal: dinner should be max 500 kcal
- Avoid heavy red meat (beef, pork) in dinner
- Max 2x red meat per week (current count: ${weekContext?.redMeatThisWeek ?? 0})
- If dinner calories exceed lunch calories, note it
`;

  const prompt = `You are a professional nutritionist chef. Respond ONLY in ${lang}. Respond ONLY with a valid JSON object — no markdown, no backticks, no prose outside the JSON.

Create a recipe for this ${meal.mealType} meal:
Name: ${meal.name}
Ingredients: ${ingredientList}
Calories: ${meal.calories}
User profile: age ${userProfile?.age ?? '?'}, gender ${userProfile?.gender ?? '?'}, weight ${userProfile?.weight ?? '?'}kg, goal: ${userProfile?.goal ?? '?'}${userProfile?.allergies ? `, allergies: ${userProfile.allergies}` : ''}

${gastroRules}

Return this exact JSON shape (all string values in ${lang}):
{
  "prepTime": <integer minutes>,
  "difficulty": "easy" | "medium" | "hard",
  "steps": ["step 1", "step 2", "step 3", "step 4"],
  "chefTip": "<personalized tip based on user goal, 1-2 sentences>",
  "gastroNote": "<gastro rule note if relevant, null otherwise>",
  "mealPrepGuide": "<how to batch-prep this for 3-4 days, null if not practical>"
}

Rules: steps must have 4-6 items. Return ONLY the JSON object.`;

  const tryGenerate = async (): Promise<string> => {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0]?.type === 'text' ? message.content[0].text : '';
  };

  try {
    let raw = await tryGenerate();
    let parsed = tryParse(raw);
    if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      raw = await tryGenerate();
      parsed = tryParse(raw);
    }
    if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      console.error('[chef/recipe] Invalid JSON from Claude:', raw.slice(0, 300));
      return res.status(500).json({ error: 'Invalid response from AI' });
    }
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('[chef/recipe] Error:', error);
    return res.status(500).json({ error: error?.message || 'Recipe generation failed' });
  }
}

async function handleMenu(body: any, res: any) {
  const { userId, targetMeal, city, country, language } = body;
  const isValid = await validateUser(userId);
  if (!isValid) return res.status(401).json({ error: 'Unauthorized' });

  if (!city || !targetMeal?.name) {
    return res.status(400).json({ error: 'Missing city or targetMeal' });
  }

  const lang = LANG_LABELS[language] || 'Hungarian';
  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are a local food expert and nutritionist. Respond ONLY in ${lang}. Respond ONLY with a valid JSON array — no markdown, no backticks, no prose.

City: ${city}, Country: ${country || 'Hungary'}
Date: ${today}
Target meal to match: "${targetMeal.name}" (${targetMeal.calories}, mealType: ${targetMeal.mealType})

Generate 3 realistic typical daily lunch menu options (napi menü) that would be available in ${city} today, similar in flavor and calories to the target meal.

For each option return:
{
  "restaurantName": "<realistic local restaurant name>",
  "dishName": "<typical local dish name in ${lang}>",
  "estimatedKcal": <integer>,
  "estimatedProtein": <integer grams>,
  "estimatedCarbs": <integer grams>,
  "estimatedFat": <integer grams>,
  "price": "<estimated price range e.g. '1800-2500 Ft' or '35-45 RON'>",
  "availableFrom": "11:30",
  "confidence": "medium"
}

Rules:
- dishName should be culturally appropriate for ${city}
- Calorie values should realistically match the target (${targetMeal.calories})
- Return ONLY the JSON array with exactly 3 items.`;

  const tryGenerate = async (): Promise<string> => {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0]?.type === 'text' ? message.content[0].text : '';
  };

  try {
    let raw = await tryGenerate();
    let parsed = tryParse(raw);
    if (!Array.isArray(parsed) || parsed.length < 3) {
      raw = await tryGenerate();
      parsed = tryParse(raw);
    }
    if (!Array.isArray(parsed) || parsed.length < 3) {
      console.error('[chef/menu] Parse failed or insufficient results:', raw.slice(0, 300));
      return res.status(500).json({ error: 'Invalid response from AI' });
    }

    const targetKcal = parseInt(targetMeal.calories) || 500;
    const withScores = parsed.map((item: any) => {
      const kcalDiff = Math.abs((item.estimatedKcal || 0) - targetKcal);
      const rawScore = Math.max(0, 100 - Math.round((kcalDiff / targetKcal) * 100));
      const confidence: 'high' | 'medium' | 'low' =
        rawScore >= 80 && kcalDiff < 80 ? 'high'
        : rawScore >= 50 ? 'medium'
        : 'low';
      return { ...item, matchScore: rawScore, confidence };
    });

    return res.status(200).json(withScores);
  } catch (error: any) {
    console.error('[chef/menu] Error:', error);
    return res.status(500).json({ error: error?.message || 'Menu estimation failed' });
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.body || {};

  if (type === 'recipe') return handleRecipe(req.body, res);
  if (type === 'menu') return handleMenu(req.body, res);
  if (type === 'find-stores') return handleFindStores(req.body, res);
  if (type === 'daily-menus') return handleDailyMenus(req.body, res);

  return res.status(400).json({ error: 'Missing or invalid type. Use "recipe", "menu", "find-stores", or "daily-menus".' });
}

// ─── Nearby grocery stores (Google Places Nearby Search) ────────────────────

async function handleFindStores(body: any, res: any) {
  const { lat, lng, radius = 10000 } = body || {};

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat, lng are required' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.log('[chef/find-stores] No GOOGLE_PLACES_API_KEY — returning fallback');
    return res.status(200).json({ stores: [], fallback: true });
  }

  try {
    const query = encodeURIComponent('supermarket grocery store');
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${lat},${lng}&radius=${radius}&type=supermarket&key=${apiKey}`;

    console.log(`[chef/find-stores] Searching stores near ${lat},${lng} radius=${radius}`);

    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`[chef/find-stores] Google Places HTTP ${resp.status}`);
      return res.status(200).json({ stores: [], fallback: true });
    }

    const data = await resp.json();
    const results = (data.results ?? []).slice(0, 20);

    const stores = results.map((place: any) => ({
      name: place.name ?? '',
      address: place.formatted_address ?? '',
      placeId: place.place_id ?? '',
      lat: place.geometry?.location?.lat ?? null,
      lng: place.geometry?.location?.lng ?? null,
      openNow: place.opening_hours?.open_now ?? null,
    }));

    console.log(`[chef/find-stores] Found ${stores.length} stores`);
    return res.status(200).json({ stores, fallback: false });
  } catch (err: any) {
    console.error('[chef/find-stores] Error:', err.message);
    return res.status(200).json({ stores: [], fallback: true });
  }
}

// ─── Daily menus scraper (meniulzilei.info + mitegyek.hu) ───────────────────

interface DailyMenuItem {
  name: string;
  type?: 'soup' | 'main' | 'dessert' | 'side' | 'other';
}

interface DailyMenuRestaurant {
  name: string;
  address?: string;
  slug: string;
  platform: string;
  menuDate?: string;
  variants: Array<{
    name?: string;
    items: DailyMenuItem[];
    price?: string;
  }>;
  detailUrl?: string;
}

const dailyMenuCache: Record<string, { data: DailyMenuRestaurant[]; ts: number }> = {};
const DAILY_CACHE_TTL = 60 * 60 * 1000;

async function handleDailyMenus(body: any, res: any) {
  const { platform, url, city } = body || {};
  if (!platform || !url) {
    return res.status(400).json({ error: 'platform and url are required' });
  }

  const cacheKey = platform + ':' + (city || url);
  const cached = dailyMenuCache[cacheKey];
  if (cached && Date.now() - cached.ts < DAILY_CACHE_TTL) {
    return res.status(200).json({ restaurants: cached.data, cached: true });
  }

  try {
    let restaurants: DailyMenuRestaurant[] = [];
    if (platform === 'meniulzilei') restaurants = await scrapeMeniulZilei(url, city || '');
    else if (platform === 'mitegyek') restaurants = await scrapeMitegyek(url);
    else return res.status(200).json({ restaurants: [], fallback: true });

    dailyMenuCache[cacheKey] = { data: restaurants, ts: Date.now() };
    console.log('[chef/daily-menus] ' + platform + '/' + city + ': ' + restaurants.length + ' restaurants');
    return res.status(200).json({ restaurants, cached: false });
  } catch (err: any) {
    console.error('[chef/daily-menus] Error:', err.message);
    return res.status(200).json({ restaurants: [], error: err.message });
  }
}

async function fetchPage(pageUrl: string): Promise<string> {
  const resp = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NuraBot/1.0)',
      'Accept': 'text/html',
      'Accept-Language': 'hu,ro,en;q=0.5',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return resp.text();
}

function guessItemType(name: string): DailyMenuItem['type'] {
  const l = name.toLowerCase();
  if (/\b(sup[aă]|ciorb[aă]|leves|bors|consomm|cr[eé]m[aă])\b/.test(l)) return 'soup';
  if (/\b(desert|prajit|tort|clatit|fruct|inghetat|rétes|palacsinta|torta|sütemény)\b/.test(l)) return 'dessert';
  if (/\b(garnit|salat[aă]|orez|cartofi|piure|mamalig|rizs|burgonya)\b/.test(l)) return 'side';
  return 'main';
}

// ─── meniulzilei.info ───────────────────────────────────────────────────────

async function scrapeMeniulZilei(baseUrl: string, city: string): Promise<DailyMenuRestaurant[]> {
  const listHtml = await fetchPage(baseUrl);

  const restPattern = /<h2\s+class="title">\s*<a[^>]*href="[^"]*\/restaurante\/([^/"]+)\/detalii"[^>]*(?:title="([^"]*)")?[^>]*>([^<]*)<\/a>/gi;
  const rests: Array<{ slug: string; name: string }> = [];
  let m;
  while ((m = restPattern.exec(listHtml)) !== null) {
    rests.push({ slug: m[1], name: m[2] || m[3] || m[1] });
  }

  const addrPattern = /<span\s+class="icon\s+home"><\/span>\s*([^<]+)/gi;
  const addrs: string[] = [];
  while ((m = addrPattern.exec(listHtml)) !== null) addrs.push(m[1].trim());

  const results: DailyMenuRestaurant[] = [];
  const citySlug = city || baseUrl.split('/')[3] || 'targu-mures';
  const max = Math.min(rests.length, 15);

  for (let i = 0; i < max; i += 5) {
    const batch = rests.slice(i, i + 5);
    const settled = await Promise.allSettled(
      batch.map(async (r, idx) => {
        const dUrl = 'https://www.meniulzilei.info/' + citySlug + '/restaurante/' + r.slug + '/daily-menu-list';
        const html = await fetchPage(dUrl);
        if (!html || html.length < 50) return null;
        const parsed = parseMZDaily(html);
        if (parsed.variants.length === 0) return null;
        return {
          name: r.name, address: addrs[i + idx], slug: r.slug, platform: 'meniulzilei',
          menuDate: parsed.date, variants: parsed.variants,
          detailUrl: 'https://www.meniulzilei.info/' + citySlug + '/restaurante/' + r.slug + '/detalii',
        } as DailyMenuRestaurant;
      })
    );
    for (const r of settled) if (r.status === 'fulfilled' && r.value) results.push(r.value);
  }
  return results;
}

function parseMZDaily(html: string): { date?: string; variants: DailyMenuRestaurant['variants'] } {
  const variants: DailyMenuRestaurant['variants'] = [];
  const dateMatch = html.match(/<h3\s+class="textToBold"[^>]*>([^<]+)/i);
  const date = dateMatch?.[1]?.trim();

  const blocks = html.split(/<h3(?:\s[^>]*)?>/).slice(1);
  for (const block of blocks) {
    const nameMatch = block.match(/^([^<]+)/);
    const vName = nameMatch?.[1]?.trim();
    if (!vName || vName.length > 100) continue;

    if (vName.toLowerCase().startsWith('pret') || vName.toLowerCase().startsWith('preţ')) {
      const pm = block.match(/<b>([^<]+)<\/b>/);
      if (pm && variants.length > 0) variants[variants.length - 1].price = pm[1].trim();
      continue;
    }

    const items: DailyMenuItem[] = [];
    const ip = /<li>\s*<span>([^<]+)<\/span>/gi;
    let im;
    while ((im = ip.exec(block)) !== null) {
      const n = im[1].trim();
      if (n && !n.toLowerCase().includes('paine inclus')) items.push({ name: n, type: guessItemType(n) });
    }

    const pm = block.match(/<b>([^<]*lei[^<]*)<\/b>/i) || block.match(/<b>(\d+[.,]\d+)<\/b>/);
    if (items.length > 0) {
      variants.push({ name: vName.replace(/^varianta\s*/i, 'V'), items, price: pm?.[1]?.trim() });
    }
  }
  return { date, variants };
}

// ─── mitegyek.hu ────────────────────────────────────────────────────────────

async function scrapeMitegyek(url: string): Promise<DailyMenuRestaurant[]> {
  const html = await fetchPage(url);
  const results: DailyMenuRestaurant[] = [];

  const boxPattern = /<div\s+class="dailyBox[^"]*"\s*data-url="\/ettermek\/([^"]+)"[^>]*>([\s\S]*?)(?=<div\s+class="dailyBox|<div\s+class="contentBlock|$)/gi;
  let bm;
  while ((bm = boxPattern.exec(html)) !== null) {
    const slug = bm[1];
    const boxHtml = bm[2];

    const nm = boxHtml.match(/<h2[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
    const name = nm?.[1]?.trim();
    if (!name) continue;

    const lm = boxHtml.match(/<\/h2>\s*<span>([^<]+)<\/span>/i);
    const address = lm?.[1]?.trim();

    const items: DailyMenuItem[] = [];
    const liPattern = /<li[^>]*>\s*(?:<img[^>]*src="[^"]*\/([^"/.]+)\.svg"[^>]*>)?\s*([^<]+)/gi;
    let li;
    while ((li = liPattern.exec(boxHtml)) !== null) {
      const icon = li[1] || '';
      const raw = li[2]?.trim();
      if (!raw) continue;
      const parts = raw.split('\t');
      const foodName = parts[0]?.trim();
      const priceInfo = parts[1]?.trim();
      if (!foodName) continue;

      let t: DailyMenuItem['type'] = 'other';
      if (icon.includes('soupe')) t = 'soup';
      else if (icon.includes('second-course')) t = 'main';
      else if (icon.includes('dessert')) t = 'dessert';
      else t = guessItemType(foodName);

      items.push({ name: foodName + (priceInfo ? ' (' + priceInfo + ')' : ''), type: t });
    }

    if (items.length > 0) {
      results.push({
        name, address, slug, platform: 'mitegyek',
        variants: [{ items }],
        detailUrl: 'https://www.mitegyek.hu/ettermek/' + slug,
      });
    }
  }
  return results;
}
