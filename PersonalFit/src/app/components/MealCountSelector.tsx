import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface MealCountSelectorProps {
  isOpen: boolean;
  defaultValue?: number;
  onSelect: (count: number) => void;
  onClose: () => void;
}

const MEAL_COUNTS = [1, 2, 3, 4, 5];

export function MealCountSelector({
  isOpen,
  defaultValue = 3,
  onSelect,
  onClose,
}: MealCountSelectorProps) {
  const [selected, setSelected] = React.useState<number>(defaultValue);

  React.useEffect(() => {
    setSelected(defaultValue);
  }, [defaultValue, isOpen]);

  const handleSelect = (count: number) => {
    setSelected(count);
    onSelect(count);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <div className="overflow-hidden rounded-3xl bg-[#070b14] shadow-2xl border border-sky-500/40">
              {/* Header */}
              <div className="bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400 px-5 pt-4 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-sky-50/80 tracking-wide uppercase">
                    PDF feltöltés befejezve
                  </p>
                  <h2 className="text-base font-bold text-white mt-0.5">
                    Napi hány étkezést szeretnél?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-sky-900/40 flex items-center justify-center text-sky-50/80 hover:bg-sky-900/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-5 pt-4 pb-4 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950/95">
                <p className="text-[13px] text-slate-300 mb-3">
                  Válaszd ki, hány étkezésre szeretnéd elosztani a napi kalóriákat. Később bármikor módosíthatod.
                </p>

                <div className="grid grid-cols-5 gap-2 mb-4">
                  {MEAL_COUNTS.map((count) => {
                    const isActive = count === selected;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleSelect(count)}
                        className={[
                          'h-10 rounded-2xl text-sm font-semibold transition-all border',
                          isActive
                            ? 'bg-emerald-400/90 text-slate-950 border-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.6)]'
                            : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-emerald-400 hover:text-emerald-200',
                        ].join(' ')}
                      >
                        {count}x
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-slate-500">
                  Tipp: <span className="text-emerald-300 font-medium">3 étkezés</span> a leggyakoribb (Reggeli, Ebéd, Vacsora),
                  <span className="text-emerald-300 font-medium"> 4-5 étkezés</span> pedig edzésnapokra ideális.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MealCountSelector;

