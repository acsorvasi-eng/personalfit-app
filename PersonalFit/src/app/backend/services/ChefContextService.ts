import type { RegionContext, CultureWeights } from '../../../lib/chef-types';

/** Map a region string + app language to cuisine culture weights.
 *  Exported for testing. Used by getRegionContext(). */
export function regionToCultureWeights(region: string, language: string): CultureWeights {
  const r = region.toLowerCase();

  if (r.includes('maros') || r.includes('târgu mureș') || r.includes('targu mures')) {
    return { hu: 50, ro: 50 };
  }
  if (r.includes('cluj') || r.includes('kolozsvár') || r.includes('kolozs')) {
    return { ro: 60, hu: 40 };
  }
  if (r.includes('harghita') || r.includes('hargita') || r.includes('covasna') || r.includes('kovászna')) {
    return { hu: 85, ro: 15 };
  }
  if (r.includes('brasov') || r.includes('brassó') || r.includes('sibiu') || r.includes('szeben')) {
    return { ro: 70, hu: 20, en: 10 };
  }
  if (r.includes('budapest') || r.includes('pest') || r.includes('buda')) {
    return { hu: 85, ro: 10, en: 5 };
  }
  if (r.includes('bucharest') || r.includes('bucurești') || r.includes('ilfov')) {
    return { ro: 90, en: 10 };
  }

  // Unknown region: fall back to language
  if (language === 'hu') return { hu: 85, ro: 10, en: 5 };
  if (language === 'ro') return { ro: 80, hu: 15, en: 5 };
  return { ro: 50, hu: 40, en: 10 };
}

/** Read the user's position via browser geolocation, reverse-geocode it with
 *  Nominatim to get a county-level string, then derive culture weights.
 *
 *  Privacy guarantee: raw GPS coordinates are never stored and never sent to
 *  our API. Only the county-level string (e.g. "Maros megye") is transmitted.
 *
 *  Returns null if geolocation is denied, unavailable, or Nominatim fails. */
export async function getRegionContext(language: string): Promise<RegionContext | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': language }, signal: AbortSignal.timeout(5000) }
          );
          if (!resp.ok) { resolve(null); return; }
          const data = await resp.json();
          const county =
            data.address?.county ||
            data.address?.state_district ||
            data.address?.state ||
            '';
          const isRomania = data.address?.country_code === 'ro';
          const region = [county, isRomania ? 'Erdély' : ''].filter(Boolean).join(', ');
          if (!region) { resolve(null); return; }
          const cultureWeights = regionToCultureWeights(region, language);
          resolve({ region, cultureWeights });
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 6000, maximumAge: 300_000 } // 5-min cache
    );
  });
}
