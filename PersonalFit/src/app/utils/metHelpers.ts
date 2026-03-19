export const MET_MAP: Record<string, number> = {
  futas: 10,
  edzoterm: 6,
  crossfit: 6,
  kerekparozas: 8,
  uszas: 7,
  joga: 3,
  futball: 9,
  kosarlabda: 8,
  basketball: 8,
  tenisz: 8,
  gyaloglas: 3.5,
};

export function normAccent(s: string): string {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function getMET(label: string): number {
  const key = normAccent(label);
  return Object.entries(MET_MAP).find(([k]) => key.includes(k))?.[1] ?? 6;
}
