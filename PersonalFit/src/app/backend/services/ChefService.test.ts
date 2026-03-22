import { describe, it, expect } from 'vitest';
import {
  getCurrentSeason,
  detectMonotony,
  buildMealFrequency,
  isSilentSwapEligible,
} from './ChefService';

describe('getCurrentSeason', () => {
  it('returns spring for months 3-6', () => {
    expect(getCurrentSeason(3)).toBe('spring');
    expect(getCurrentSeason(6)).toBe('spring');
  });

  it('returns summer for months 7-8', () => {
    expect(getCurrentSeason(7)).toBe('summer');
    expect(getCurrentSeason(8)).toBe('summer');
  });

  it('returns autumn for months 9-11', () => {
    expect(getCurrentSeason(9)).toBe('autumn');
    expect(getCurrentSeason(11)).toBe('autumn');
  });

  it('returns winter for months 12, 1, 2', () => {
    expect(getCurrentSeason(12)).toBe('winter');
    expect(getCurrentSeason(1)).toBe('winter');
    expect(getCurrentSeason(2)).toBe('winter');
  });
});

describe('buildMealFrequency', () => {
  it('counts occurrences of each meal name', () => {
    const freq = buildMealFrequency(['Csirkepaprikás', 'Csirkepaprikás', 'Gulyás']);
    expect(freq.get('Csirkepaprikás')).toBe(2);
    expect(freq.get('Gulyás')).toBe(1);
  });

  it('returns empty map for empty input', () => {
    expect(buildMealFrequency([]).size).toBe(0);
  });
});

describe('detectMonotony', () => {
  it('returns true when a meal appears 3+ times', () => {
    const meals = ['Csirkepaprikás', 'Csirkepaprikás', 'Csirkepaprikás', 'Gulyás'];
    expect(detectMonotony(meals)).toBe(true);
  });

  it('returns false when no meal appears 3+ times', () => {
    const meals = ['Csirkepaprikás', 'Gulyás', 'Rántott csirke', 'Pörkölt', 'Csirkepaprikás'];
    expect(detectMonotony(meals)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(detectMonotony([])).toBe(false);
  });
});

describe('isSilentSwapEligible', () => {
  it('returns true when calorie delta is exactly at threshold', () => {
    expect(isSilentSwapEligible(500, 510, 10)).toBe(true);
  });

  it('returns true when calorie delta is within threshold', () => {
    expect(isSilentSwapEligible(500, 505, 10)).toBe(true);
  });

  it('returns false when calorie delta exceeds threshold', () => {
    expect(isSilentSwapEligible(500, 515, 10)).toBe(false);
  });

  it('defaults to 10 kcal threshold', () => {
    expect(isSilentSwapEligible(500, 509)).toBe(true);
    expect(isSilentSwapEligible(500, 511)).toBe(false);
  });
});
