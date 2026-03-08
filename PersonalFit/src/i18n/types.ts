/**
 * Translation key types derived from Hungarian (source of truth).
 * Every locale must implement a subset; missing keys fall back to Hungarian.
 */

import hu from './locales/hu';

export type TranslationKeys = typeof hu;
export type TranslationKey = keyof TranslationKeys;

/** Partial locale: same keys as hu, values are strings (any translation). */
export type LocalePartial = Partial<Record<TranslationKey, string>>;
