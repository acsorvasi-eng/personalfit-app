/**
 * Vercel serverless function — proxy for Unsplash food image search.
 * GET /api/food-image?q=chicken+breast
 * Returns { url: string | null, photographer: string | null }
 *
 * Requires UNSPLASH_ACCESS_KEY env var set in Vercel dashboard.
 */

import { handleCors } from './_shared/cors';
import { verifyAuth, sendAuthError } from './_shared/auth';

const CACHE: Map<string, { url: string | null; photographer: string | null; ts: number }> = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours in-memory

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = (req.query?.q as string || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing ?q= parameter' });

  const key = q.toLowerCase();

  // In-memory cache hit
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json({ url: cached.url, photographer: cached.photographer });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    // Graceful degradation — no API key configured
    return res.status(200).json({ url: null, photographer: null });
  }

  try {
    const params = new URLSearchParams({
      query: `${q} food`,
      per_page: '1',
      orientation: 'landscape',
    });
    const apiUrl = `https://api.unsplash.com/search/photos?${params}`;
    const resp = await fetch(apiUrl, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!resp.ok) {
      // Rate limited or other error — return null gracefully
      console.error(`Unsplash API error: ${resp.status} ${resp.statusText}`);
      return res.status(200).json({ url: null, photographer: null });
    }

    const data = await resp.json();
    const photo = data.results?.[0];
    const url = photo?.urls?.small ?? null;
    const photographer = photo?.user?.name ?? null;

    // Store in memory cache
    CACHE.set(key, { url, photographer, ts: Date.now() });

    // Trim cache if too large
    if (CACHE.size > 2000) {
      const oldest = [...CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts);
      for (let i = 0; i < 500; i++) CACHE.delete(oldest[i][0]);
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ url, photographer });
  } catch (err: any) {
    console.error('Food image proxy error:', err?.message || err);
    return res.status(200).json({ url: null, photographer: null });
  }
}
