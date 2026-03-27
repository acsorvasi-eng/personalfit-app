/**
 * Daily Menu Sources — maps cities to scraping sources for RO + HU.
 *
 * Each source defines:
 *   - A base URL pattern for the city's daily menu page
 *   - The country (used for geolocation matching)
 *   - City coordinates (center point for distance matching)
 */

export interface DailyMenuSource {
  id: string;
  country: 'RO' | 'HU';
  city: string;
  /** Display name in local language */
  cityLocal: string;
  lat: number;
  lng: number;
  /** Scraping source platform */
  platform: 'meniulzilei' | 'azilapranz' | 'mitegyek' | 'napimenu' | 'hovamenjek';
  /** URL to scrape for this city */
  url: string;
}

// ─────────────────────────────────────────────────────────────────
// Romania — meniulzilei.info + azilapranz.ro
// ─────────────────────────────────────────────────────────────────

const RO_SOURCES: DailyMenuSource[] = [
  // meniulzilei.info cities
  { id: 'ro_tgmures_mzi',  country: 'RO', city: 'targu-mures', cityLocal: 'Târgu Mureș', lat: 46.5386, lng: 24.5575, platform: 'meniulzilei', url: 'https://www.meniulzilei.info/targu-mures/restaurante' },
  { id: 'ro_oradea_mzi',   country: 'RO', city: 'oradea',      cityLocal: 'Oradea',       lat: 47.0465, lng: 21.9189, platform: 'meniulzilei', url: 'https://www.meniulzilei.info/oradea/restaurante' },
  { id: 'ro_satumare_mzi', country: 'RO', city: 'satu-mare',   cityLocal: 'Satu Mare',    lat: 47.7920, lng: 22.8854, platform: 'meniulzilei', url: 'https://www.meniulzilei.info/satu-mare/restaurante' },

  // azilapranz.ro cities
  { id: 'ro_timisoara_alp', country: 'RO', city: 'timisoara',  cityLocal: 'Timișoara',    lat: 45.7489, lng: 21.2087, platform: 'azilapranz', url: 'https://azilapranz.ro/timisoara' },
  { id: 'ro_cluj_alp',     country: 'RO', city: 'cluj',        cityLocal: 'Cluj-Napoca',  lat: 46.7712, lng: 23.6236, platform: 'azilapranz', url: 'https://azilapranz.ro/cluj-napoca' },
  { id: 'ro_bucuresti_alp',country: 'RO', city: 'bucuresti',   cityLocal: 'București',    lat: 44.4268, lng: 26.1025, platform: 'azilapranz', url: 'https://azilapranz.ro/bucuresti' },
  { id: 'ro_iasi_alp',     country: 'RO', city: 'iasi',        cityLocal: 'Iași',         lat: 47.1585, lng: 27.6014, platform: 'azilapranz', url: 'https://azilapranz.ro/iasi' },
  { id: 'ro_constanta_alp',country: 'RO', city: 'constanta',   cityLocal: 'Constanța',    lat: 44.1598, lng: 28.6348, platform: 'azilapranz', url: 'https://azilapranz.ro/constanta' },
  { id: 'ro_arad_alp',     country: 'RO', city: 'arad',        cityLocal: 'Arad',         lat: 46.1866, lng: 21.3123, platform: 'azilapranz', url: 'https://azilapranz.ro/arad' },
  { id: 'ro_sibiu_alp',    country: 'RO', city: 'sibiu',       cityLocal: 'Sibiu',        lat: 45.7983, lng: 24.1256, platform: 'azilapranz', url: 'https://azilapranz.ro/sibiu' },
  { id: 'ro_ploiesti_alp', country: 'RO', city: 'ploiesti',    cityLocal: 'Ploiești',     lat: 44.9462, lng: 26.0254, platform: 'azilapranz', url: 'https://azilapranz.ro/ploiesti' },
  { id: 'ro_zalau_alp',    country: 'RO', city: 'zalau',       cityLocal: 'Zalău',        lat: 47.1911, lng: 23.0568, platform: 'azilapranz', url: 'https://azilapranz.ro/zalau' },
  { id: 'ro_oradea_alp',   country: 'RO', city: 'oradea',      cityLocal: 'Oradea',       lat: 47.0465, lng: 21.9189, platform: 'azilapranz', url: 'https://azilapranz.ro/oradea' },
  { id: 'ro_brasov_alp',   country: 'RO', city: 'brasov',      cityLocal: 'Brașov',       lat: 45.6427, lng: 25.5887, platform: 'azilapranz', url: 'https://azilapranz.ro/brasov' },
  { id: 'ro_tgmures_alp',  country: 'RO', city: 'targu-mures', cityLocal: 'Târgu Mureș',  lat: 46.5386, lng: 24.5575, platform: 'azilapranz', url: 'https://azilapranz.ro/targu-mures' },
  { id: 'ro_craiova_alp',  country: 'RO', city: 'craiova',     cityLocal: 'Craiova',      lat: 44.3190, lng: 23.7965, platform: 'azilapranz', url: 'https://azilapranz.ro/craiova' },
  { id: 'ro_buzau_alp',    country: 'RO', city: 'buzau',       cityLocal: 'Buzău',        lat: 45.1500, lng: 26.8333, platform: 'azilapranz', url: 'https://azilapranz.ro/buzau' },
  { id: 'ro_baiamare_alp', country: 'RO', city: 'baia-mare',   cityLocal: 'Baia Mare',    lat: 47.6567, lng: 23.5850, platform: 'azilapranz', url: 'https://azilapranz.ro/baia-mare' },
];

// ─────────────────────────────────────────────────────────────────
// Hungary — mitegyek.hu + napimenu.eu + hovamenjek.hu
// ─────────────────────────────────────────────────────────────────

const HU_SOURCES: DailyMenuSource[] = [
  // mitegyek.hu — 30+ cities
  { id: 'hu_budapest_mit',     country: 'HU', city: 'budapest',       cityLocal: 'Budapest',       lat: 47.4979, lng: 19.0402, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/budapest-v-kerulet' },
  { id: 'hu_debrecen_mit',     country: 'HU', city: 'debrecen',       cityLocal: 'Debrecen',       lat: 47.5316, lng: 21.6273, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/debrecen' },
  { id: 'hu_szeged_mit',       country: 'HU', city: 'szeged',         cityLocal: 'Szeged',         lat: 46.2530, lng: 20.1414, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/szeged' },
  { id: 'hu_pecs_mit',         country: 'HU', city: 'pecs',           cityLocal: 'Pécs',           lat: 46.0727, lng: 18.2323, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/pecs' },
  { id: 'hu_gyor_mit',         country: 'HU', city: 'gyor',           cityLocal: 'Győr',           lat: 47.6875, lng: 17.6504, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/gyor' },
  { id: 'hu_miskolc_mit',      country: 'HU', city: 'miskolc',        cityLocal: 'Miskolc',        lat: 48.1035, lng: 20.7784, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/miskolc' },
  { id: 'hu_eger_mit',         country: 'HU', city: 'eger',           cityLocal: 'Eger',           lat: 47.9025, lng: 20.3772, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/eger' },
  { id: 'hu_sopron_mit',       country: 'HU', city: 'sopron',         cityLocal: 'Sopron',         lat: 47.6851, lng: 16.5908, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/sopron' },
  { id: 'hu_kecskemet_mit',    country: 'HU', city: 'kecskemet',      cityLocal: 'Kecskemét',      lat: 46.8964, lng: 19.6913, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/kecskemet' },
  { id: 'hu_szolnok_mit',      country: 'HU', city: 'szolnok',        cityLocal: 'Szolnok',        lat: 47.1621, lng: 20.1825, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/szolnok' },
  { id: 'hu_veszprem_mit',     country: 'HU', city: 'veszprem',       cityLocal: 'Veszprém',       lat: 47.0933, lng: 17.9115, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/veszprem' },
  { id: 'hu_szombathely_mit',  country: 'HU', city: 'szombathely',    cityLocal: 'Szombathely',    lat: 47.2307, lng: 16.6218, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/szombathely' },
  { id: 'hu_kaposvar_mit',     country: 'HU', city: 'kaposvar',       cityLocal: 'Kaposvár',       lat: 46.3594, lng: 17.7968, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/kaposvar' },
  { id: 'hu_szekesfehervar_mit',country:'HU', city: 'szekesfehervar', cityLocal: 'Székesfehérvár', lat: 47.1860, lng: 18.4221, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/szekesfehervar' },
  { id: 'hu_nyiregyhaza_mit',  country: 'HU', city: 'nyiregyhaza',    cityLocal: 'Nyíregyháza',    lat: 47.9553, lng: 21.7174, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/nyiregyhaza' },
  { id: 'hu_zalaegerszeg_mit', country: 'HU', city: 'zalaegerszeg',   cityLocal: 'Zalaegerszeg',   lat: 46.8417, lng: 16.8416, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/zalaegerszeg' },
  { id: 'hu_tatabanya_mit',    country: 'HU', city: 'tatabanya',      cityLocal: 'Tatabánya',      lat: 47.5860, lng: 18.3949, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/tatabanya' },
  { id: 'hu_bekescsaba_mit',   country: 'HU', city: 'bekescsaba',     cityLocal: 'Békéscsaba',     lat: 46.6734, lng: 21.0877, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/bekescsaba' },
  { id: 'hu_dunaujvaros_mit',  country: 'HU', city: 'dunaujvaros',    cityLocal: 'Dunaújváros',    lat: 46.9619, lng: 18.9355, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/dunaujvaros' },
  { id: 'hu_siofok_mit',       country: 'HU', city: 'siofok',         cityLocal: 'Siófok',         lat: 46.9048, lng: 18.0498, platform: 'mitegyek', url: 'https://www.mitegyek.hu/napi-menu/siofok' },

  // napimenu.eu — Budapest + major cities
  { id: 'hu_budapest_nme',     country: 'HU', city: 'budapest',       cityLocal: 'Budapest',       lat: 47.4979, lng: 19.0402, platform: 'napimenu', url: 'https://www.napimenu.eu/' },
  { id: 'hu_debrecen_nme',     country: 'HU', city: 'debrecen',       cityLocal: 'Debrecen',       lat: 47.5316, lng: 21.6273, platform: 'napimenu', url: 'https://www.napimenu.eu/debrecen' },
  { id: 'hu_szeged_nme',       country: 'HU', city: 'szeged',         cityLocal: 'Szeged',         lat: 46.2530, lng: 20.1414, platform: 'napimenu', url: 'https://www.napimenu.eu/szeged' },
  { id: 'hu_pecs_nme',         country: 'HU', city: 'pecs',           cityLocal: 'Pécs',           lat: 46.0727, lng: 18.2323, platform: 'napimenu', url: 'https://www.napimenu.eu/pecs' },
  { id: 'hu_gyor_nme',         country: 'HU', city: 'gyor',           cityLocal: 'Győr',           lat: 47.6875, lng: 17.6504, platform: 'napimenu', url: 'https://www.napimenu.eu/gyor' },
  { id: 'hu_miskolc_nme',      country: 'HU', city: 'miskolc',        cityLocal: 'Miskolc',        lat: 48.1035, lng: 20.7784, platform: 'napimenu', url: 'https://www.napimenu.eu/miskolc' },
  { id: 'hu_kecskemet_nme',    country: 'HU', city: 'kecskemet',      cityLocal: 'Kecskemét',      lat: 46.8964, lng: 19.6913, platform: 'napimenu', url: 'https://www.napimenu.eu/kecskemet' },
  { id: 'hu_szekesfehervar_nme',country:'HU', city: 'szekesfehervar', cityLocal: 'Székesfehérvár', lat: 47.1860, lng: 18.4221, platform: 'napimenu', url: 'https://www.napimenu.eu/szekesfehervar' },
  { id: 'hu_nyiregyhaza_nme',  country: 'HU', city: 'nyiregyhaza',    cityLocal: 'Nyíregyháza',    lat: 47.9553, lng: 21.7174, platform: 'napimenu', url: 'https://www.napimenu.eu/nyiregyhaza' },

  // hovamenjek.hu — Budapest + major cities
  { id: 'hu_budapest_hmj',     country: 'HU', city: 'budapest',       cityLocal: 'Budapest',       lat: 47.4979, lng: 19.0402, platform: 'hovamenjek', url: 'https://www.hovamenjek.hu/napi-menu/budapest' },
  { id: 'hu_debrecen_hmj',     country: 'HU', city: 'debrecen',       cityLocal: 'Debrecen',       lat: 47.5316, lng: 21.6273, platform: 'hovamenjek', url: 'https://www.hovamenjek.hu/napi-menu/debrecen' },
  { id: 'hu_szeged_hmj',       country: 'HU', city: 'szeged',         cityLocal: 'Szeged',         lat: 46.2530, lng: 20.1414, platform: 'hovamenjek', url: 'https://www.hovamenjek.hu/napi-menu/szeged' },
  { id: 'hu_pecs_hmj',         country: 'HU', city: 'pecs',           cityLocal: 'Pécs',           lat: 46.0727, lng: 18.2323, platform: 'hovamenjek', url: 'https://www.hovamenjek.hu/napi-menu/pecs' },
  { id: 'hu_gyor_hmj',         country: 'HU', city: 'gyor',           cityLocal: 'Győr',           lat: 47.6875, lng: 17.6504, platform: 'hovamenjek', url: 'https://www.hovamenjek.hu/napi-menu/gyor' },
  { id: 'hu_miskolc_hmj',      country: 'HU', city: 'miskolc',        cityLocal: 'Miskolc',        lat: 48.1035, lng: 20.7784, platform: 'hovamenjek', url: 'https://www.hovamenjek.hu/napi-menu/miskolc' },
  { id: 'hu_kecskemet_hmj',    country: 'HU', city: 'kecskemet',      cityLocal: 'Kecskemét',      lat: 46.8964, lng: 19.6913, platform: 'hovamenjek', url: 'https://www.hovamenjek.hu/napi-menu/kecskemet' },
  { id: 'hu_szekesfehervar_hmj',country:'HU', city: 'szekesfehervar', cityLocal: 'Székesfehérvár', lat: 47.1860, lng: 18.4221, platform: 'hovamenjek', url: 'https://www.hovamenjek.hu/napi-menu/szekesfehervar' },
  { id: 'hu_nyiregyhaza_hmj',  country: 'HU', city: 'nyiregyhaza',    cityLocal: 'Nyíregyháza',    lat: 47.9553, lng: 21.7174, platform: 'hovamenjek', url: 'https://www.hovamenjek.hu/napi-menu/nyiregyhaza' },
];

// ─────────────────────────────────────────────────────────────────
// All sources combined
// ─────────────────────────────────────────────────────────────────

export const ALL_DAILY_MENU_SOURCES: DailyMenuSource[] = [...RO_SOURCES, ...HU_SOURCES];

/**
 * Find the closest source(s) to the user's geolocation.
 * Returns sources sorted by distance, within maxDistanceKm.
 */
export function findNearestSources(
  lat: number,
  lng: number,
  maxDistanceKm = 50,
): Array<DailyMenuSource & { distanceKm: number }> {
  return ALL_DAILY_MENU_SOURCES
    .map(source => ({
      ...source,
      distanceKm: haversine(lat, lng, source.lat, source.lng),
    }))
    .filter(s => s.distanceKm <= maxDistanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
