import { useLanguage } from '../../contexts/LanguageContext';
import { FoodStyle } from '../../utils/buildIngredientSelection';

interface StepFoodStyleProps {
  selectedStyles: FoodStyle[];
  setSelectedStyles: (v: FoodStyle[]) => void;
  activeAllergens: Set<string>;
  setActiveAllergens: (v: Set<string>) => void;
  selectedAlternativeKeys: Set<string>;
  setSelectedAlternativeKeys: (v: Set<string>) => void;
  onDetailedSetup: () => void;
}

const FOOD_STYLES: Array<{
  id: FoodStyle;
  labelKey: string;
  descKey: string;
  emoji: string;
  photoId: string;
}> = [
  { id: 'sporty',        labelKey: 'wizard.foodStyle.sporty',        descKey: 'wizard.foodStyle.sportyDesc',        emoji: '🏋️', photoId: '1490645935967-10de6ba17061' },
  { id: 'plant',         labelKey: 'wizard.foodStyle.plant',         descKey: 'wizard.foodStyle.plantDesc',         emoji: '🥗', photoId: '1512621776951-a57141f2eefd' },
  { id: 'traditional',   labelKey: 'wizard.foodStyle.traditional',   descKey: 'wizard.foodStyle.traditionalDesc',   emoji: '🍲', photoId: '1547592180-85f173990554' },
  { id: 'mediterranean', labelKey: 'wizard.foodStyle.mediterranean', descKey: 'wizard.foodStyle.mediterraneanDesc', emoji: '🐟', photoId: '1519708227418-c8fd9a32b7a2' },
];

const ALLERGEN_LABELS = ['Laktóz', 'Glutén', 'Tojás', 'Hal', 'Diófélék', 'Szója', 'Rákféle'] as const;
type AllergenLabel = typeof ALLERGEN_LABELS[number];

const ALLERGEN_ALTERNATIVES: Record<string, Array<{ key: string; label: string; emoji: string }>> = {
  'laktóz': [
    { key: 'kecske',      label: 'Kecske termékek',  emoji: '🐐' },
    { key: 'juh',         label: 'Juh termékek',      emoji: '🐑' },
    { key: 'bivaly',      label: 'Bivaly termékek',   emoji: '🐃' },
    { key: 'mandula tej', label: 'Mandula ital',      emoji: '🥛' },
    { key: 'zab tej',     label: 'Zab ital',          emoji: '🌾' },
    { key: 'kókusz',      label: 'Kókusz ital',       emoji: '🥥' },
    { key: 'rizs tej',    label: 'Rizs ital',         emoji: '🍚' },
    { key: 'szója tej',   label: 'Szója ital',        emoji: '🫘' },
  ],
  'glutén': [
    { key: 'Rizs',          label: 'Rizs',          emoji: '🍚' },
    { key: 'Barna rizs',    label: 'Barna rizs',    emoji: '🍚' },
    { key: 'Kukorica',      label: 'Kukorica',      emoji: '🌽' },
    { key: 'Hajdina',       label: 'Hajdina',       emoji: '🌾' },
    { key: 'Quinoa',        label: 'Quinoa',        emoji: '🌾' },
    { key: 'Burgonya',      label: 'Burgonya',      emoji: '🥔' },
    { key: 'Édesburgonya',  label: 'Édesburgonya',  emoji: '🍠' },
  ],
  'tojás': [
    { key: 'Chia mag',  label: 'Chia mag',  emoji: '🌱' },
    { key: 'Lenmag',    label: 'Lenmag',    emoji: '🌱' },
    { key: 'Tofu',      label: 'Tofu',      emoji: '🫘' },
    { key: 'Banán',     label: 'Banán',     emoji: '🍌' },
    { key: 'Avokádó',   label: 'Avokádó',   emoji: '🥑' },
  ],
  'hal': [
    { key: 'Csirkemell',    label: 'Csirkemell',    emoji: '🍗' },
    { key: 'Pulykamell',    label: 'Pulykamell',    emoji: '🦃' },
    { key: 'Lencse',        label: 'Lencse',        emoji: '🫘' },
    { key: 'Csicseriborsó', label: 'Csicseriborsó', emoji: '🫘' },
    { key: 'Tofu',          label: 'Tofu',          emoji: '🫘' },
    { key: 'Tempeh',        label: 'Tempeh',        emoji: '🫘' },
  ],
  'diófélék': [
    { key: 'Tök mag',   label: 'Tökmag',        emoji: '🌱' },
    { key: 'Chia mag',  label: 'Chia mag',      emoji: '🌱' },
    { key: 'Lenmag',    label: 'Lenmag',        emoji: '🌱' },
    { key: 'Avokádó',   label: 'Avokádó',       emoji: '🥑' },
    { key: 'Olívaolaj', label: 'Olívaolaj',     emoji: '🫒' },
  ],
  'szója': [
    { key: 'Csicseriborsó', label: 'Csicseriborsó', emoji: '🫘' },
    { key: 'Lencse',        label: 'Lencse',        emoji: '🫘' },
    { key: 'Fekete bab',    label: 'Fekete bab',    emoji: '🫘' },
    { key: 'Fehér bab',     label: 'Fehér bab',     emoji: '🫘' },
    { key: 'kókusz',        label: 'Kókusz aminos', emoji: '🥥' },
  ],
  'rákféle': [
    { key: 'Csirkemell',    label: 'Csirkemell',    emoji: '🍗' },
    { key: 'Lazac',         label: 'Lazac',         emoji: '🐟' },
    { key: 'Tonhal',        label: 'Tonhal',        emoji: '🐠' },
    { key: 'Lencse',        label: 'Lencse',        emoji: '🫘' },
    { key: 'Tofu',          label: 'Tofu',          emoji: '🫘' },
  ],
};

function toggleStyle(id: FoodStyle, selected: FoodStyle[], setSelected: (v: FoodStyle[]) => void) {
  if (selected.includes(id)) {
    setSelected(selected.filter(s => s !== id));
  } else if (selected.length < 2) {
    setSelected([...selected, id]);
  } else {
    // Already 2 selected — swap: remove the first, add the new one
    setSelected([selected[1], id]);
  }
}

export function StepFoodStyle({
  selectedStyles,
  setSelectedStyles,
  activeAllergens,
  setActiveAllergens,
  selectedAlternativeKeys,
  setSelectedAlternativeKeys,
  onDetailedSetup,
}: StepFoodStyleProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-4">
      {/* Title + subtitle */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{t('wizard.foodStyle.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('wizard.foodStyle.subtitle')}</p>
        {/* Badge: show maxSelectHint when < 2 selected, maxReached when 2 selected */}
        <span className="text-xs font-medium text-indigo-600 mt-1 inline-block">
          {selectedStyles.length < 2
            ? t('wizard.foodStyle.maxSelectHint')
            : t('wizard.foodStyle.maxReached').replace('{n}', String(selectedStyles.length))
          }
        </span>
      </div>

      {/* 2×2 photo grid */}
      <div className="grid grid-cols-2 gap-3">
        {FOOD_STYLES.map(style => {
          const isSelected = selectedStyles.includes(style.id);
          const isDimmed = selectedStyles.length === 2 && !isSelected;
          return (
            <button
              key={style.id}
              onClick={() => toggleStyle(style.id, selectedStyles, setSelectedStyles)}
              className={`relative rounded-2xl overflow-hidden border-[3px] transition-all ${
                isSelected ? 'border-indigo-500' : 'border-transparent'
              } ${isDimmed ? 'opacity-45' : 'opacity-100'}`}
            >
              {/* Photo */}
              <img
                src={`https://images.unsplash.com/photo-${style.photoId}?w=400&h=320&fit=crop&auto=format`}
                alt={t(style.labelKey)}
                className="w-full h-28 object-cover"
              />
              {/* Indigo overlay when selected */}
              {isSelected && (
                <div className="absolute inset-0 bg-indigo-500/20" />
              )}
              {/* ✓ badge top-right */}
              {isSelected && (
                <span className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">✓</span>
              )}
              {/* Label + desc */}
              <div className="p-2 bg-white">
                <div className="text-xs font-semibold text-gray-900 leading-tight">
                  {style.emoji} {t(style.labelKey)}
                </div>
                <div className="text-[0.65rem] text-gray-400 mt-0.5 leading-tight">{t(style.descKey)}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Allergen panel */}
      <div className="rounded-xl border border-gray-200 p-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          {t('wizard.foodStyle.allergenTitle')}
        </p>
        {/* Allergen chips */}
        <div className="flex flex-wrap gap-2">
          {ALLERGEN_LABELS.map(label => {
            const key = label.toLowerCase();
            const isActive = activeAllergens.has(key);
            return (
              <button
                key={label}
                onClick={() => {
                  const next = new Set(activeAllergens);
                  if (isActive) {
                    next.delete(key);
                    // Also remove alternatives for this allergen
                    const alts = ALLERGEN_ALTERNATIVES[key] ?? [];
                    const nextAlt = new Set(selectedAlternativeKeys);
                    alts.forEach(a => nextAlt.delete(a.key));
                    setSelectedAlternativeKeys(nextAlt);
                  } else {
                    next.add(key);
                  }
                  setActiveAllergens(next);
                }}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  isActive
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {isActive ? '🚫 ' : ''}{label}
              </button>
            );
          })}
        </div>

        {/* Alternative sub-panels for active allergens that have alternatives */}
        {Array.from(activeAllergens).map(allergenKey => {
          const alternatives = ALLERGEN_ALTERNATIVES[allergenKey];
          if (!alternatives || alternatives.length === 0) return null;
          const allergenLabel = ALLERGEN_LABELS.find(l => l.toLowerCase() === allergenKey) ?? allergenKey;
          return (
            <div key={allergenKey} className="mt-3">
              <p className="text-xs text-gray-500 mb-1">
                {t('wizard.foodStyle.alternativesFor').replace('{label}', allergenLabel)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {alternatives.map(alt => {
                  const isAltSelected = selectedAlternativeKeys.has(alt.key);
                  return (
                    <button
                      key={alt.key}
                      onClick={() => {
                        const next = new Set(selectedAlternativeKeys);
                        if (isAltSelected) next.delete(alt.key);
                        else next.add(alt.key);
                        setSelectedAlternativeKeys(next);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                        isAltSelected
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {alt.emoji} {alt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed setup escape link */}
      <button
        onClick={onDetailedSetup}
        className="text-xs text-gray-400 underline text-center self-center"
      >
        {t('wizard.foodStyle.detailedSetup')}
      </button>
    </div>
  );
}
