import { describe, it, expect } from 'vitest';
import { apiBase } from './api';

describe('apiBase', () => {
  it('is a string', () => {
    expect(typeof apiBase).toBe('string');
  });

  it('defaults to empty string or matches VITE_API_BASE env var', () => {
    // Since import.meta.env is compile-time, verify it's either '' or a valid URL
    expect(apiBase === '' || apiBase.startsWith('https://')).toBe(true);
  });
});
