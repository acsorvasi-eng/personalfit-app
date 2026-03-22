import { describe, it, expect } from 'vitest';
import { regionToCultureWeights } from './ChefContextService';

describe('regionToCultureWeights', () => {
  it('returns 50/50 for Maros megye', () => {
    const w = regionToCultureWeights('Maros megye, Erdély', 'hu');
    expect(w.hu).toBe(50);
    expect(w.ro).toBe(50);
  });

  it('returns 60/40 ro/hu for Cluj', () => {
    const w = regionToCultureWeights('Cluj, Romania', 'ro');
    expect(w.ro).toBe(60);
    expect(w.hu).toBe(40);
  });

  it('returns 85/15 hu/ro for Harghita', () => {
    const w = regionToCultureWeights('Harghita, Romania', 'hu');
    expect(w.hu).toBe(85);
    expect(w.ro).toBe(15);
  });

  it('falls back to language-based weights for unknown region', () => {
    const w = regionToCultureWeights('Some Unknown Place', 'hu');
    expect(w.hu).toBeGreaterThan(w.ro ?? 0);
  });

  it('falls back to ro-dominant for unknown region with ro language', () => {
    const w = regionToCultureWeights('Some Unknown Place', 'ro');
    expect(w.ro).toBeGreaterThan(w.hu ?? 0);
  });
});
