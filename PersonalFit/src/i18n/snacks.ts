/**
 * Rest-period snack options by language (hu, ro, en).
 * Used by MealIntervalEditor and UnifiedMenu for consistent labels.
 */

import type { I18nLang } from './index';

export interface SnackItem {
  id: string;
  emoji: string;
  name: string;
  portion: string;
  kcal: number;
}

export const SNACKS: Record<I18nLang, SnackItem[]> = {
  hu: [
    { id: 'alma', emoji: '🍎', name: 'Alma', portion: '1 db', kcal: 42 },
    { id: 'dio', emoji: '🫘', name: 'Dió', portion: '3 szem', kcal: 65 },
    { id: 'mandula', emoji: '🥜', name: 'Mandula', portion: '5 szem', kcal: 58 },
    { id: 'kivi', emoji: '🥝', name: 'Kivi', portion: '1 db', kcal: 43 },
    { id: 'sargarepa', emoji: '🥕', name: 'Sárgarépa', portion: '1 db', kcal: 33 },
    { id: 'afonya', emoji: '🫐', name: 'Áfonya', portion: '1 marék', kcal: 40 },
  ],
  ro: [
    { id: 'alma', emoji: '🍎', name: 'Măr', portion: '1 buc', kcal: 42 },
    { id: 'dio', emoji: '🫘', name: 'Nucă', portion: '3 boabe', kcal: 65 },
    { id: 'mandula', emoji: '🥜', name: 'Migdale', portion: '5 boabe', kcal: 58 },
    { id: 'kivi', emoji: '🥝', name: 'Kiwi', portion: '1 buc', kcal: 43 },
    { id: 'sargarepa', emoji: '🥕', name: 'Morcov', portion: '1 buc', kcal: 33 },
    { id: 'afonya', emoji: '🫐', name: 'Afine', portion: '1 mână', kcal: 40 },
  ],
  en: [
    { id: 'alma', emoji: '🍎', name: 'Apple', portion: '1 pc', kcal: 42 },
    { id: 'dio', emoji: '🫘', name: 'Walnut', portion: '3 nuts', kcal: 65 },
    { id: 'mandula', emoji: '🥜', name: 'Almonds', portion: '5 nuts', kcal: 58 },
    { id: 'kivi', emoji: '🥝', name: 'Kiwi', portion: '1 pc', kcal: 43 },
    { id: 'sargarepa', emoji: '🥕', name: 'Carrot', portion: '1 pc', kcal: 33 },
    { id: 'afonya', emoji: '🫐', name: 'Blueberry', portion: '1 handful', kcal: 40 },
  ],
};

/** Build label like "1 db · 42 kcal" for UI */
export function snackLabel(item: SnackItem): string {
  return `${item.portion} · ${item.kcal} kcal`;
}
