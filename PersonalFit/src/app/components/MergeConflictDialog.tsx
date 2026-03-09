import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle, Shuffle, Layers } from 'lucide-react';

interface MergeStats {
  days: number;
  meals: number;
  foods: number;
}

interface MergeConflictDialogProps {
  isOpen: boolean;
  current: MergeStats | null;
  next: MergeStats | null;
  newIngredients: string[];
  onOverwrite: () => void;
  onMerge: () => void;
  onCancel: () => void;
}

export function MergeConflictDialog({
  isOpen,
  current,
  next,
  newIngredients,
  onOverwrite,
  onMerge,
  onCancel,
}: MergeConflictDialogProps) {
  const uniqueNewIngredients = Array.from(new Set(newIngredients)).slice(0, 40);

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
            <div className="overflow-hidden rounded-3xl bg-slate-950 shadow-2xl border border-amber-500/40">
              {/* Header */}
              <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-black/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-50" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-amber-50/85 uppercase tracking-wide">
                      PDF terv ütközés
                    </p>
                    <h2 className="text-base font-bold text-white">
                      Már van feltöltött terved
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-8 h-8 rounded-full bg-black/25 flex items-center justify-center text-amber-50/80 hover:bg-black/40 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 pt-4 pb-4 space-y-4 bg-slate-950">
                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-3">
                    <p className="text-[11px] font-medium text-slate-400 mb-1">
                      Jelenlegi terved
                    </p>
                    {current ? (
                      <p className="text-slate-100 font-semibold">
                        {current.foods} étel · {current.days} nap · {current.meals} étkezés
                      </p>
                    ) : (
                      <p className="text-slate-500 italic">Nincs aktív terv</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-emerald-500/50 bg-slate-900/80 p-3">
                    <p className="text-[11px] font-medium text-emerald-300 mb-1">
                      Új PDF alapján
                    </p>
                    {next ? (
                      <p className="text-emerald-100 font-semibold">
                        {next.foods} étel · {next.days} nap · {next.meals} étkezés
                      </p>
                    ) : (
                      <p className="text-emerald-400 italic">Feldolgozás alatt...</p>
                    )}
                  </div>
                </div>

                {/* New ingredients list */}
                {uniqueNewIngredients.length > 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <p className="text-[11px] font-semibold text-slate-200 tracking-wide uppercase">
                        Újonnan hozzáadott ételek
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {uniqueNewIngredients.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-100 border border-slate-700"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                    {newIngredients.length > uniqueNewIngredients.length && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        +{newIngredients.length - uniqueNewIngredients.length} további étel
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={onMerge}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
                  >
                    <Shuffle className="w-4 h-4" />
                    Összefésülés (új ételek hozzáadása)
                  </button>
                  <button
                    type="button"
                    onClick={onOverwrite}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold bg-red-600/90 hover:bg-red-500 text-white transition-colors"
                  >
                    Felülírás (csak az új terv marad)
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-2xl text-sm font-medium bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    Mégse
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MergeConflictDialog;

