/**
 * ====================================================================
 * DSMQuickLogSheet - Bottom sheet for quick meal/calorie logging
 * ====================================================================
 * Replaces full-page navigation to /log-meal for quick calorie entries.
 * Keeps user in context on the Menu tab while logging food.
 *
 * UX Flow (optimized):
 *   Tap "+" on rest card → Bottom sheet slides up → Type food name →
 *   See AI match → Confirm → Toast success → Sheet closes
 *
 * Reduces: 1 full page navigation, ~3 taps, ~6 seconds
 * ====================================================================
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Plus, Check, Sparkles, ChefHat, Package, AlertCircle } from "lucide-react";
import { DSMBottomSheet } from "./ux-patterns";
import { DSMChip, DSMEmptyState } from "./atoms";
import { DSMNutritionBar } from "./molecules";
import { Product, productDatabase, calculateNutrition } from "../../data/productDatabase";
import { Recipe, recipeDatabase, calculateRecipeNutrition, searchRecipes } from "../../data/recipeDatabase";
import { recognizeFoodFromText, AIRecognitionResult } from "../../data/aiFoodKnowledge";

// ─── Types ──────────────────────────────────────────────────────────
interface QuickLogItem {
  id: string;
  name: string;
  type: "product" | "recipe" | "ai";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
}

interface DSMQuickLogSheetProps {
  open: boolean;
  onClose: () => void;
  onLogMeal: (item: {
    name: string;
    type: "product" | "recipe";
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quantity: number;
  }) => void;
  slot?: "after-breakfast" | "after-lunch" | "after-dinner";
}

// ─── Component ──────────────────────────────────────────────────────
export function DSMQuickLogSheet({ open, onClose, onLogMeal, slot }: DSMQuickLogSheetProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickLogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<QuickLogItem | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [isLogging, setIsLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search when sheet opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedItem(null);
      setQuantity("100");
      setLogSuccess(false);
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [open]);

  // Search products + recipes
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();

    // Search products
    const productResults: QuickLogItem[] = productDatabase
      .filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .slice(0, 5)
      .map(p => ({
        id: `prod-${p.id}`,
        name: p.name,
        type: "product" as const,
        calories: Math.round(p.calories),
        protein: Math.round(p.protein),
        carbs: Math.round(p.carbs),
        fat: Math.round(p.fat),
      }));

    // Search recipes
    const recipeResults: QuickLogItem[] = recipeDatabase
      .filter(r => r.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map(r => {
        const nutrition = calculateRecipeNutrition(r);
        return {
          id: `rec-${r.id}`,
          name: r.name,
          type: "recipe" as const,
          calories: Math.round(nutrition.calories),
          protein: Math.round(nutrition.protein),
          carbs: Math.round(nutrition.carbs),
          fat: Math.round(nutrition.fat),
        };
      });

    // AI recognition
    const aiResult = recognizeFoodFromText(q);
    const aiItems: QuickLogItem[] = aiResult && aiResult.components.length > 0
      ? aiResult.components.slice(0, 2).map((comp, i) => ({
          id: `ai-${i}`,
          name: comp.food.name,
          type: "ai" as const,
          calories: Math.round(comp.nutrition.calories),
          protein: Math.round(comp.nutrition.protein),
          carbs: Math.round(comp.nutrition.carbs),
          fat: Math.round(comp.nutrition.fat),
        }))
      : [];

    setResults([...productResults, ...recipeResults, ...aiItems].slice(0, 8));
  }, [query]);

  // Slot label
  const slotLabel = useMemo(() => {
    if (slot === "after-breakfast") return "Reggeli utan";
    if (slot === "after-lunch") return "Ebed utan";
    if (slot === "after-dinner") return "Vacsora utan";
    return "Etkezes rogzitese";
  }, [slot]);

  const handleLog = useCallback(() => {
    if (!selectedItem) return;
    setIsLogging(true);

    const qty = parseInt(quantity) || 100;
    const multiplier = selectedItem.type === "recipe" ? 1 : qty / 100;

    setTimeout(() => {
      onLogMeal({
        name: selectedItem.name,
        type: selectedItem.type === "ai" ? "product" : selectedItem.type,
        calories: Math.round(selectedItem.calories * multiplier),
        protein: Math.round(selectedItem.protein * multiplier),
        carbs: Math.round(selectedItem.carbs * multiplier),
        fat: Math.round(selectedItem.fat * multiplier),
        quantity: qty,
      });

      if (navigator.vibrate) navigator.vibrate([10, 20]);
      setIsLogging(false);
      setLogSuccess(true);
      setTimeout(() => onClose(), 1200);
    }, 400);
  }, [selectedItem, quantity, onLogMeal, onClose]);

  return (
    <DSMBottomSheet
      open={open}
      onClose={onClose}
      title="Gyors rogzites"
      subtitle={slotLabel}
      icon={Plus}
      snapPoint="full"
    >
      <div className="px-4 pb-6 space-y-4">
        {/* ── Success State ── */}
        <AnimatePresence>
          {logSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="w-16 h-16 bg-[var(--color-primary-100)] rounded-full flex items-center justify-center mb-3"
              >
                <Check className="w-8 h-8 text-[var(--color-primary-600)]" />
              </motion.div>
              <p className="text-gray-900" style={{ fontWeight: 700 }}>Rogzitve!</p>
              <p className="text-xs text-gray-400 mt-1">
                {selectedItem?.name} - {selectedItem?.calories} kcal
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Search ── */}
        {!logSuccess && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedItem(null); }}
                placeholder="Keress etelt, termeketvagy receptet..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-[#2a2a2a] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)] dark:focus:ring-[rgba(51,102,255,0.3)] focus:border-[var(--color-primary-400)] dark:focus:border-[var(--primary)] bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                autoComplete="off"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setSelectedItem(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 dark:bg-[#2a2a2a] flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>

            {/* ── Quick Suggestions ── */}
            {query.length < 2 && !selectedItem && (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Gyors valasztas</p>
                <div className="flex flex-wrap gap-2">
                  {["Alma", "Banan", "Tojas", "Zab", "Csirkemell", "Joghurt", "Rizs", "Brokkoli"].map(item => (
                    <button
                      key={item}
                      onClick={() => setQuery(item)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-[#252525] hover:bg-[var(--color-primary-50)] dark:hover:bg-[rgba(51,102,255,0.1)] rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:text-[var(--color-primary-700)] dark:hover:text-[#809fff] transition-all"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Results ── */}
            {results.length > 0 && !selectedItem && (
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                {results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-primary-50)] dark:hover:bg-[rgba(51,102,255,0.1)] transition-all text-left active:scale-[0.99]"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === "recipe" ? "bg-amber-50 dark:bg-amber-500/10" :
                      item.type === "ai" ? "bg-purple-50 dark:bg-purple-500/10" : "bg-[var(--color-primary-50)] dark:bg-[rgba(51,102,255,0.1)]"
                    }`}>
                      {item.type === "recipe" ? <ChefHat className="w-4 h-4 text-amber-600 dark:text-amber-400" /> :
                       item.type === "ai" ? <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" /> :
                       <Package className="w-4 h-4 text-[var(--color-primary-600)] dark:text-[#809fff]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 dark:text-gray-100 truncate" style={{ fontWeight: 600 }}>{item.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{item.calories} kcal</span>
                        <DSMChip
                          label={item.type === "recipe" ? "Recept" : item.type === "ai" ? "AI" : "Termek"}
                          color={item.type === "recipe" ? "amber" : item.type === "ai" ? "purple" : "blue"}
                          variant="soft"
                          size="xs"
                        />
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-gray-300 dark:text-gray-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* ── Empty State ── */}
            {query.length >= 2 && results.length === 0 && (
              <div className="py-6 text-center">
                <AlertCircle className="w-8 h-8 text-gray-300 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Nincs talalat: "{query}"</p>
                <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">Probald maskepp iras</p>
              </div>
            )}

            {/* ── Selected Item Detail ── */}
            <AnimatePresence>
              {selectedItem && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-[var(--color-primary-50)] dark:bg-[rgba(51,102,255,0.1)] rounded-xl p-4 border border-[var(--color-primary-200)] dark:border-[rgba(51,102,255,0.2)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedItem.type === "recipe" ? "bg-amber-100 dark:bg-amber-500/15" :
                        selectedItem.type === "ai" ? "bg-purple-100 dark:bg-purple-500/15" : "bg-[var(--color-primary-100)] dark:bg-[rgba(51,102,255,0.15)]"
                      }`}>
                        {selectedItem.type === "recipe" ? <ChefHat className="w-4 h-4 text-amber-600 dark:text-amber-400" /> :
                         selectedItem.type === "ai" ? <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" /> :
                         <Package className="w-4 h-4 text-[var(--color-primary-600)] dark:text-[#809fff]" />}
                      </div>
                      <div>
                        <div className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>{selectedItem.name}</div>
                        <DSMNutritionBar
                          calories={selectedItem.calories}
                          protein={selectedItem.protein}
                          carbs={selectedItem.carbs}
                          fat={selectedItem.fat}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="w-6 h-6 rounded-full bg-white dark:bg-[#252525] flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Quantity (for products only) */}
                  {selectedItem.type !== "recipe" && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Mennyiseg:</label>
                      <div className="flex items-center gap-1">
                        {["50", "100", "150", "200"].map(q => (
                          <button
                            key={q}
                            onClick={() => setQuantity(q)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                              quantity === q
                                ? "bg-[var(--primary)] text-white"
                                : "bg-white dark:bg-[#252525] text-gray-600 dark:text-gray-400 hover:bg-[var(--color-primary-100)] dark:hover:bg-[rgba(51,102,255,0.15)]"
                            }`}
                            style={{ fontWeight: quantity === q ? 700 : 500 }}
                          >
                            {q}g
                          </button>
                        ))}
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-14 px-2 py-1 border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-xs text-center bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100"
                          min="1"
                          max="2000"
                        />
                      </div>
                    </div>
                  )}

                  {/* Log Button */}
                  <button
                    onClick={handleLog}
                    disabled={isLogging}
                    className="w-full py-3 bg-gradient-to-r from-[#3366FF] to-[#12CFA6] text-white rounded-xl text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ fontWeight: 700 }}
                  >
                    {isLogging ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Rogzites...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Rogzites ({Math.round(selectedItem.calories * (selectedItem.type === "recipe" ? 1 : (parseInt(quantity) || 100) / 100))} kcal)
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </DSMBottomSheet>
  );
}