// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @capacitor/haptics
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
}));

// Mock @capacitor/core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

import { Haptics } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { hapticFeedback } from './haptics';

describe('hapticFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Haptics.impact with Light style on native platform', async () => {
    (Capacitor.isNativePlatform as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await hapticFeedback('light');
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
  });

  it('calls Haptics.impact with Medium style on native platform', async () => {
    (Capacitor.isNativePlatform as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await hapticFeedback('medium');
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'MEDIUM' });
  });

  it('calls Haptics.impact with Heavy style on native platform', async () => {
    (Capacitor.isNativePlatform as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await hapticFeedback('heavy');
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'HEAVY' });
  });

  it('does NOT call Haptics.impact on web platform', async () => {
    (Capacitor.isNativePlatform as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await hapticFeedback('light');
    expect(Haptics.impact).not.toHaveBeenCalled();
  });

  it('defaults to light style', async () => {
    (Capacitor.isNativePlatform as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await hapticFeedback();
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
  });
});
