import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { translations } from '../translations';

export type LanguageCode = 'hu' | 'en' | 'ro';

const SUPPORTED_LANGUAGES: LanguageCode[] = ['hu', 'en', 'ro'];

// ─── Locale mapping for Intl APIs ───
export const LOCALE_MAP: Record<LanguageCode, string> = {
  hu: 'hu-HU',
  en: 'en-US',
  ro: 'ro-RO',
};

/** Get the BCP-47 locale string for the current language */
export function getLocale(lang: LanguageCode): string {
  return LOCALE_MAP[lang] || 'hu-HU';
}

/** Capitalize first letter (locale-aware) */
function capitalize(s: string, locale: string): string {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
}

/** Get a localized short day name (e.g. "H", "Mon", "Lun") using Intl */
export function getLocaleDayShort(date: Date, lang: LanguageCode): string {
  return new Intl.DateTimeFormat(LOCALE_MAP[lang], { weekday: 'short' }).format(date);
}

/** Get a localized narrow day name (single-char-ish) */
export function getLocaleDayNarrow(date: Date, lang: LanguageCode): string {
  // Narrow can have ambiguity (Sz/Sz in HU), so use short for HU
  if (lang === 'hu') {
    const HU_DAYS_SHORT = ['V', 'H', 'K', 'Sz', 'Cs', 'P', 'Szo'];
    return HU_DAYS_SHORT[date.getDay()];
  }
  return new Intl.DateTimeFormat(LOCALE_MAP[lang], { weekday: 'short' }).format(date);
}

/** Get a localized full month name */
export function getLocaleMonth(date: Date, lang: LanguageCode): string {
  return capitalize(
    new Intl.DateTimeFormat(LOCALE_MAP[lang], { month: 'long' }).format(date),
    LOCALE_MAP[lang]
  );
}

interface LanguageContextType {
  language: LanguageCode;
  locale: string;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

// ─── Fallback t() for when used outside provider (e.g. Figma preview iframe) ───
function fallbackT(key: string): string {
  const keys = key.split('.');
  let value: any = translations.hu;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }
  return typeof value === 'string' ? value : key;
}

const fallbackContext: LanguageContextType = {
  language: 'hu',
  locale: 'hu-HU',
  setLanguage: () => {},
  t: fallbackT,
};

const LanguageContext = createContext<LanguageContextType>(fallbackContext);

/** Detect the best matching supported language from the device/browser */
function detectDeviceLanguage(): LanguageCode | null {
  try {
    // navigator.languages gives ordered preference list (e.g. ['ro-RO', 'ro', 'en-US', 'en'])
    const candidates = navigator.languages ?? [navigator.language];
    for (const lang of candidates) {
      const code = lang.split('-')[0].toLowerCase();
      if (SUPPORTED_LANGUAGES.includes(code as LanguageCode)) {
        return code as LanguageCode;
      }
    }
  } catch {
    // navigator may not be available in some environments
  }
  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    // 1. Check localStorage first (user's explicit choice)
    try {
      const saved = localStorage.getItem('selectedLanguage') as LanguageCode;
      if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
        return saved;
      }
    } catch {
      // localStorage may not be available in some environments
    }

    // 2. Detect device/browser language (uses navigator.languages for full preference list)
    const detected = detectDeviceLanguage();
    if (detected) return detected;

    // 3. Default to Hungarian
    return 'hu';
  });

  const locale = LOCALE_MAP[language];

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('selectedLanguage', lang);
    } catch {
      // localStorage may not be available
    }
  }, []);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to Hungarian if translation not found
        let fallback: any = translations.hu;
        for (const fallbackKey of keys) {
          if (fallback && typeof fallback === 'object' && fallbackKey in fallback) {
            fallback = fallback[fallbackKey];
          } else {
            return key; // Return key if no translation found
          }
        }
        return typeof fallback === 'string' ? fallback : key;
      }
    }

    return typeof value === 'string' ? value : key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, locale, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  // Always returns a valid context — defaults to fallbackContext
  // when used outside LanguageProvider (e.g. Figma preview iframe, tests)
  return useContext(LanguageContext);
}
