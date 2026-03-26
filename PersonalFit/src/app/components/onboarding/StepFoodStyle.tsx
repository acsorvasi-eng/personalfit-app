import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
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
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const allergenCount = activeAllergens.size;

  return (
    <div className="flex flex-col gap-4">
      {/* Title row with filter icon */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">{t('wizard.foodStyle.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('wizard.foodStyle.subtitle')}</p>
          <span className="text-sm font-medium text-primary mt-1 inline-block">
            {selectedStyles.length < 2
              ? t('wizard.foodStyle.maxSelectHint')
              : t('wizard.foodStyle.maxReached').replace('{n}', String(selectedStyles.length))
            }
          </span>
        </div>
        {/* Filter icon for allergies */}
        <button
          onClick={() => setShowAllergyModal(true)}
          className="relative w-11 h-11 flex items-center justify-center rounded-2xl border border-gray-200 bg-white ml-3 mt-1"
        >
          <SlidersHorizontal className="w-5 h-5 text-gray-600" />
          {allergenCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-sm font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {allergenCount}
            </span>
          )}
        </button>
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
                isSelected ? 'border-primary' : 'border-transparent'
              } ${isDimmed ? 'opacity-45' : 'opacity-100'}`}
            >
              <img
                src={`https://images.unsplash.com/photo-${style.photoId}?w=400&h=320&fit=crop&auto=format`}
                alt={t(style.labelKey)}
                className="w-full h-28 object-cover"
              />
              {isSelected && <div className="absolute inset-0 bg-primary/20" />}
              {isSelected && (
                <span className="absolute top-2 right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">✓</span>
              )}
              <div className="p-2 bg-white">
                <div className="text-sm font-semibold text-gray-900 leading-tight">
                  {style.emoji} {t(style.labelKey)}
                </div>
                <div className="text-sm text-gray-500 mt-0.5 leading-tight">{t(style.descKey)}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed setup link */}
      <button
        onClick={onDetailedSetup}
        className="text-sm text-gray-500 underline text-center self-center"
      >
        {t('wizard.foodStyle.detailedSetup')}
      </button>

      {/* ─── Allergy full-screen modal ─────────────────────────── */}
      <AnimatePresence>
        {showAllergyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white flex flex-col"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 20px) + 1rem)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {t('wizard.allergiesTitle') || 'Allergiák és korlátozások'}
              </h2>
              <button
                onClick={() => setShowAllergyModal(false)}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-32">
              <p className="text-sm text-gray-500 mb-4">
                {t('wizard.foodStyle.allergenTitle')}
              </p>

              {/* Allergen chips */}
              <div className="flex flex-wrap gap-3 mb-6">
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
                          const alts = ALLERGEN_ALTERNATIVES[key] ?? [];
                          const nextAlt = new Set(selectedAlternativeKeys);
                          alts.forEach(a => nextAlt.delete(a.key));
                          setSelectedAlternativeKeys(nextAlt);
                        } else {
                          next.add(key);
                        }
                        setActiveAllergens(next);
                      }}
                      className={`text-sm px-4 py-2.5 rounded-2xl border font-medium transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-red-100 text-red-700 border-red-300'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {isActive ? '🚫 ' : ''}{label}
                    </button>
                  );
                })}
              </div>

              {/* Alternative sub-panels */}
              {Array.from(activeAllergens).map(allergenKey => {
                const alternatives = ALLERGEN_ALTERNATIVES[allergenKey];
                if (!alternatives || alternatives.length === 0) return null;
                const allergenLabel = ALLERGEN_LABELS.find(l => l.toLowerCase() === allergenKey) ?? allergenKey;
                return (
                  <div key={allergenKey} className="mb-5">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {t('wizard.foodStyle.alternativesFor').replace('{label}', allergenLabel)}
                    </p>
                    <div className="flex flex-wrap gap-2">
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
                            className={`text-sm px-3 py-2 rounded-2xl border font-medium transition-colors min-h-[44px] ${
                              isAltSelected
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
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

            {/* Done button — fixed at bottom */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/90 backdrop-blur-sm border-t border-gray-100" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 1.25rem)' }}>
              <button
                onClick={() => setShowAllergyModal(false)}
                className="w-full h-14 bg-primary text-white font-semibold rounded-2xl text-base"
              >
                {t('wizard.allergiesDone') || 'Kész'}
                {allergenCount > 0 && ` (${allergenCount})`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
