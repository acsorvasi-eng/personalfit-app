import type { LanguageCode } from '../contexts/LanguageContext';

// Simple accent-stripping to normalize keys
function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Word-level fordítási szótár – bővíthető később.
const WORD_MAP_EN: Record<string, string> = {
  'tojas': 'egg',
  'tojás': 'egg',
  'tojásos': 'egg',
  'pulykamell': 'turkey breast',
  'csirkemell': 'chicken breast',
  'sargarepa': 'carrot',
  'sárgarépa': 'carrot',
  'burgonya': 'potato',
  'krumpli': 'potato',
  'brokkoli': 'broccoli',
  'lazac': 'salmon',
  'tonhal': 'tuna',
  'makrela': 'mackerel',
  'makréla': 'mackerel',
  'salata': 'salad',
  'saláta': 'salad',
  'olivaolaj': 'olive oil',
  'olívaolaj': 'olive oil',
  'avokado': 'avocado',
  'avokádó': 'avocado',
  'teljes': 'wholegrain',
  'kiorlesu': 'wholegrain',
  'kiőrlésű': 'wholegrain',
  'kenyer': 'bread',
  'kenyér': 'bread',
  'gorog': 'greek',
  'görög': 'greek',
  'joghurt': 'yogurt',
  'turo': 'cottage cheese',
  'túró': 'cottage cheese',
  'dio': 'walnut',
  'dió': 'walnut',
  'mandula': 'almond',
  'banan': 'banana',
  'banán': 'banana',
  'rizs': 'rice',
  'zab': 'oats',
  'quinoa': 'quinoa',
  'cukkini': 'zucchini',
  'karfiol': 'cauliflower',
  'lenmag': 'flaxseed',
  'tokmag': 'pumpkin seed',
  'tökmag': 'pumpkin seed',
};

const WORD_MAP_RO: Record<string, string> = {
  'tojas': 'ou',
  'tojás': 'ou',
  'tojásos': 'ou',
  'pulykamell': 'piept de curcan',
  'csirkemell': 'piept de pui',
  'sargarepa': 'morcov',
  'sárgarépa': 'morcov',
  'burgonya': 'cartof',
  'krumpli': 'cartof',
  'brokkoli': 'broccoli',
  'lazac': 'somon',
  'tonhal': 'ton',
  'makrela': 'macrou',
  'makréla': 'macrou',
  'salata': 'salată',
  'saláta': 'salată',
  'olivaolaj': 'ulei de măsline',
  'olívaolaj': 'ulei de măsline',
  'avokado': 'avocado',
  'avokádó': 'avocado',
  'teljes': 'integral',
  'kiorlesu': 'integral',
  'kiőrlésű': 'integral',
  'kenyer': 'pâine',
  'kenyér': 'pâine',
  'gorog': 'grecesc',
  'görög': 'grecesc',
  'joghurt': 'iaurt',
  'turo': 'brânză de vaci',
  'túró': 'brânză de vaci',
  'dio': 'nucă',
  'dió': 'nucă',
  'mandula': 'migdale',
  'banan': 'banană',
  'banán': 'banană',
  'rizs': 'orez',
  'zab': 'ovăz',
  'quinoa': 'quinoa',
  'cukkini': 'dovlecel',
  'karfiol': 'conopidă',
  'lenmag': 'semințe de in',
  'tokmag': 'semințe de dovleac',
  'tökmag': 'semințe de dovleac',
};

export function translateFoodName(name: string, lang: LanguageCode): string {
  if (!name || lang === 'hu') return name;

  const dict = lang === 'en' ? WORD_MAP_EN : WORD_MAP_RO;

  // Szó + elválasztó alapú bontás, hogy a szóközök / vesszők megmaradjanak
  const parts = name.split(/(\s+|[,()+/-])/);

  const translated = parts.map((part) => {
    // Ha ez csak whitespace vagy elválasztó, hagyjuk
    if (!part.trim() || /(\s+|[,()+/-])/.test(part)) return part;

    const key = normalizeToken(part);
    const mapped = dict[key];
    return mapped ?? part;
  });

  return translated.join('');
}

