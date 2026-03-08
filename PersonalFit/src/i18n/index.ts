/**
 * Scalable i18n: per-language files + dynamic loading.
 * Hungarian is source of truth; other locales merge with hu fallback.
 */

import hu from './locales/hu';

export type { TranslationKeys, TranslationKey } from './types';

/** Supported language codes. Add new locales in LOCALES and LANGUAGE_META only. */
export type I18nLang = 'hu' | 'ro' | 'en';

import type { LocalePartial } from './types';

const LOCALES: Record<I18nLang, () => Promise<{ default: LocalePartial | typeof hu }>> = {
  hu: () => Promise.resolve({ default: hu }),
  ro: () => import('./locales/ro'),
  en: () => import('./locales/en'),
};

export const SUPPORTED_LANGUAGES: I18nLang[] = Object.keys(LOCALES) as I18nLang[];

export const LANGUAGE_META: Record<string, { flag: string; name: string }> = {
  hu: { flag: '🇭🇺', name: 'Magyar' },
  ro: { flag: '🇷🇴', name: 'Română' },
  en: { flag: '🇬🇧', name: 'English' },
  de: { flag: '🇩🇪', name: 'Deutsch' },
  sk: { flag: '🇸🇰', name: 'Slovenčina' },
  hr: { flag: '🇭🇷', name: 'Hrvatski' },
};

/** Load locale and merge with Hungarian fallback. */
export async function loadLocale(lang: string): Promise<Record<string, string>> {
  if (lang === 'hu') return { ...hu };
  const loader = LOCALES[lang as I18nLang];
  if (!loader) return { ...hu };
  try {
    const mod = await (typeof loader === 'function' ? loader() : Promise.resolve(loader));
    const partial = mod?.default ?? {};
    return { ...hu, ...partial } as Record<string, string>;
  } catch {
    return { ...hu };
  }
}
