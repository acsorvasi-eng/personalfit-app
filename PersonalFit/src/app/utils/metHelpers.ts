export const MET_MAP: Record<string, number> = {
  // HU keys (preserved for backward compat with old saved profiles)
  futas: 10, edzoterm: 6, crossfit: 6, kerekparozas: 8, uszas: 7,
  joga: 3, futball: 9, kosarlabda: 8, basketball: 8, tenisz: 8, gyaloglas: 3.5,
  // English ID keys (new — crossfit already above; basketball already above)
  running: 9.8, cycling: 7.5, swimming: 8.0, walking: 3.5,
  rowing: 7.0, jumprope: 10.0, gym: 5.0,
  calisthenics: 6.0, weightlifting: 6.0, football: 7.0,
  tennis: 7.3, volleyball: 4.0, squash: 12.0,
  yoga: 2.5, pilates: 3.0, meditation: 1.5, other: 5.0,
};

export function normAccent(s: string): string {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function getMET(label: string): number {
  const key = normAccent(label);
  return Object.entries(MET_MAP).find(([k]) => key.includes(k))?.[1] ?? 6;
}
