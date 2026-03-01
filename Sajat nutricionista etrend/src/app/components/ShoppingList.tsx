import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Trash2,
  Check,
  MapPin,
  Navigation,
  Store,
  Sparkles,
  Clock,
  ChevronRight,
  X,
  Search,
  Truck,
  Plus,
  ShoppingBag,
  Zap,
  BadgeCheck,
  Package,
  Leaf,
  Heart,
  CalendarDays,
  ListChecks,
} from "lucide-react";
import { PageHeader } from "./PageHeader";
import { DSMSwipeAction, DSMCoachMark } from "./dsm/ux-patterns";
import {
  Product,
  productDatabase,
  searchProducts,
  localStores,
  StoreInfo,
  loadUserDietProfile,
} from "../data/productDatabase";
import { useLanguage } from "../contexts/LanguageContext";
import { useCalorieTracker } from "../hooks/useCalorieTracker";
import { generateWeeklyShoppingList, getCurrentDayIndex } from "../utils/mealPlanToShoppingList";
import { usePlanData } from "../hooks/usePlanData";
import { useAppData } from "../hooks/useAppData";
import { EmptyState } from "./EmptyState";
import { DataUploadSheet } from "./DataUploadSheet";

interface ShoppingItem {
  product: Product;
  quantity: number;
  checked: boolean;
}

// AI-powered smart suggestions — labels are translation keys
const SMART_SUGGESTION_DEFS = [
  { labelKey: "menu.breakfast", emoji: "🌅", query: "zabpehely tej tojás" },
  { labelKey: "menu.lunch", emoji: "🍽️", query: "csirkemell rizs brokkoli" },
  { labelKey: "menu.dinner", emoji: "🌙", query: "lazac spenót burgonya" },
  { labelKey: "menu.snack", emoji: "🥜", query: "mandula áfonya" },
  { labelKey: "categories.dairy", emoji: "🧀", query: "kecskesajt joghurt túró" },
  { labelKey: "categories.fruits", emoji: "🍎", query: "alma banán eper" },
];

export function ShoppingList() {
  const { consumed, target } = useCalorieTracker();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const appData = useAppData();
  const { planData } = usePlanData();
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => {
    const saved = localStorage.getItem("shoppingItems");
    if (saved) {
      try {
        const items = JSON.parse(saved) as ShoppingItem[];
        // Migrate: remove items missing new tags field (stale schema)
        const valid = items.filter(i => i.product && Array.isArray(i.product.tags));
        if (valid.length !== items.length) {
          localStorage.setItem("shoppingItems", JSON.stringify(valid));
        }
        return valid;
      } catch { return []; }
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showStoreView, setShowStoreView] = useState(false);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // User location: Târgu Mureș center
  const userLocation = { lat: 46.5450, lng: 24.5620 };

  const updateShoppingItems = (updater: (prev: ShoppingItem[]) => ShoppingItem[]) => {
    setShoppingItems((prev) => {
      const next = updater(prev);
      localStorage.setItem("shoppingItems", JSON.stringify(next));
      return next;
    });
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() && !selectedCategory) return [];
    // Split multi-word queries to search individually
    const terms = searchQuery.trim().split(/\s+/).filter(Boolean);
    if (terms.length <= 1) {
      return searchProducts(searchQuery, selectedCategory || undefined);
    }
    // Multi-term: union of results
    const seen = new Set<string>();
    const results: Product[] = [];
    terms.forEach((term) => {
      searchProducts(term, selectedCategory || undefined).forEach((p) => {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          results.push(p);
        }
      });
    });
    return results;
  }, [searchQuery, selectedCategory]);

  // When no search query and no category, show diet-prioritized products
  const browseProducts = useMemo(() => {
    if (searchQuery.trim() || selectedCategory) return [];
    // Show recommended products based on user's diet profile
    return searchProducts('', undefined);
  }, [searchQuery, selectedCategory]);

  const displayProducts = searchResults.length > 0 ? searchResults : browseProducts;

  const totalItems = shoppingItems.length;
  const checkedCount = shoppingItems.filter((i) => i.checked).length;

  const totalPrice = useMemo(() => {
    return shoppingItems.reduce((sum, item) => sum + item.product.price, 0);
  }, [shoppingItems]);

  const addProduct = (product: Product) => {
    const existingIdx = shoppingItems.findIndex((i) => i.product.id === product.id);
    if (existingIdx >= 0) return; // Already in list
    updateShoppingItems((prev) => [
      ...prev,
      { product, quantity: product.defaultQuantity, checked: false },
    ]);
    // Quick feedback: briefly highlight
  };

  const removeItem = (index: number) => {
    updateShoppingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleItemCheck = (index: number) => {
    updateShoppingItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  };

  const isInList = (productId: string) => shoppingItems.some((i) => i.product.id === productId);

  const categories = useMemo(() => {
    const cats = new Set(productDatabase.map((p) => p.category));
    return Array.from(cats);
  }, []);

  // Store matching: which stores have the most items from the list
  const storeMatches = useMemo(() => {
    if (totalItems === 0) return [];
    const storeMap = new Map<string, { count: number; total: number; items: ShoppingItem[] }>();

    shoppingItems.forEach((item) => {
      const storeName = item.product.store;
      const existing = storeMap.get(storeName) || { count: 0, total: 0, items: [] };
      existing.count++;
      existing.total += item.product.price;
      existing.items.push(item);
      storeMap.set(storeName, existing);
    });

    return localStores
      .map((store) => {
        const data = storeMap.get(store.name) || { count: 0, total: 0, items: [] };
        return {
          ...store,
          matchCount: data.count,
          matchPercent: totalItems > 0 ? Math.round((data.count / totalItems) * 100) : 0,
          estimatedTotal: Math.round(data.total * 100) / 100,
          matchedItems: data.items,
        };
      })
      .filter((s) => s.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);
  }, [shoppingItems, totalItems]);

  const handleFindStores = async () => {
    setShowStoreView(true);
    setIsLoadingStores(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoadingStores(false);
  };

  const openInGoogleMaps = (store: StoreInfo) => {
    const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${store.coordinates.lat},${store.coordinates.lng}`;
    window.open(url, "_blank");
  };

  const handleSmartSuggestion = (suggestion: typeof SMART_SUGGESTION_DEFS[0]) => {
    setSearchQuery(suggestion.query);
    setIsSearchFocused(true);
    searchInputRef.current?.focus();
  };

  // ─── Auto-populate from meal plan ───
  const [showMealPlanImport, setShowMealPlanImport] = useState(false);
  const [mealPlanAddedCount, setMealPlanAddedCount] = useState(0);

  const mealPlanSuggestions = useMemo(() => {
    const savedMeals = localStorage.getItem('menuSelectedMeals');
    const selectedMeals = savedMeals ? JSON.parse(savedMeals) : {};
    return generateWeeklyShoppingList(planData, selectedMeals);
  }, [planData]);

  const handleAutoPopulateFromMealPlan = useCallback(() => {
    let addedCount = 0;
    const existingIds = new Set(shoppingItems.map(i => i.product.id));

    const newItems: ShoppingItem[] = [];
    for (const suggestion of mealPlanSuggestions) {
      if (!existingIds.has(suggestion.product.id)) {
        newItems.push({
          product: suggestion.product,
          quantity: suggestion.product.defaultQuantity,
          checked: false,
        });
        existingIds.add(suggestion.product.id);
        addedCount++;
      }
    }

    if (newItems.length > 0) {
      updateShoppingItems(prev => [...prev, ...newItems]);
      if (navigator.vibrate) navigator.vibrate([10, 20]);
    }
    setMealPlanAddedCount(addedCount);
    setShowMealPlanImport(false);

    // Auto-dismiss success message
    setTimeout(() => setMealPlanAddedCount(0), 3000);
  }, [shoppingItems, mealPlanSuggestions]);

  // Show EmptyState if no nutrition plan has been uploaded
  if (!appData.isLoading && !appData.hasActivePlan) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <DataUploadSheet open={uploadSheetOpen} onClose={() => setUploadSheetOpen(false)} onComplete={() => appData.refresh()} />
        <EmptyState variant="shopping" onUpload={() => setUploadSheetOpen(true)} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed Page Header */}
      <div className="flex-shrink-0">
        <PageHeader
          icon={ShoppingCart}
          title={t("shopping.title")}
          subtitle={`${totalItems} ${t('shopping.product')} · Târgu Mureș`}
          gradientFrom="from-blue-400"
          gradientTo="to-indigo-500"
          stats={[
            {
              label: t("shopping.estimatedPrice"),
              value: `${totalPrice.toFixed(0)}`,
              suffix: "lei",
            },
            {
              label: t("shopping.products"),
              value: totalItems,
              suffix: t('common.pcs'),
            },
          ]}
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Smart AI Search */}
        <div className="px-3 sm:px-4 lg:px-6 pt-4 pb-2 bg-white dark:bg-card sticky top-0 z-30 border-b border-gray-100 dark:border-[#2a2a2a]">
          <div className="relative" role="search" aria-label={t('common.productSearch')}>
            <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 gap-3 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-500/20 transition-all">
              <Sparkles className="w-5 h-5 text-indigo-500 flex-shrink-0" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder={t('shopping.searchPlaceholder')}
                aria-label={t('shopping.searchPlaceholder')}
                className="flex-1 bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory(null);
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  aria-label={t('shopping.clearSearch')}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 mt-3 scrollbar-hide" role="tablist" aria-label={t('common.productCategories')}>
            <button
              onClick={() => setSelectedCategory(null)}
              role="tab"
              aria-selected={!selectedCategory}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                !selectedCategory
                  ? "bg-indigo-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={{ fontWeight: 700 }}
            >
              {t('shopping.all')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                role="tab"
                aria-selected={selectedCategory === cat}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-indigo-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={{ fontWeight: 700 }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Smart Suggestions - only when no search */}
        {!searchQuery && !selectedCategory && totalItems === 0 && (
          <div className="px-3 sm:px-4 lg:px-6 py-4">
            <h3 className="text-sm text-gray-500 mb-3" style={{ fontWeight: 700 }}>
              <Zap className="w-4 h-4 inline text-amber-500 mr-1" />
              {t('shopping.quickSearch')}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {SMART_SUGGESTION_DEFS.map((s) => (
                <button
                  key={s.labelKey}
                  onClick={() => handleSmartSuggestion(s)}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-400/30 transition-all text-left active:scale-95"
                >
                  <span className="text-lg">{s.emoji}</span>
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate" style={{ fontWeight: 600 }}>{t(s.labelKey)}</span>
                </button>
              ))}
            </div>

            {/* ── Auto-populate from meal plan CTA ── */}
            {mealPlanSuggestions.length > 0 && (
              <motion.button
                onClick={handleAutoPopulateFromMealPlan}
                className="w-full mt-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-500/10 dark:to-blue-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 text-left hover:border-emerald-400 hover:shadow-md transition-all active:scale-[0.98]"
                whileTap={{ scale: 0.97 }}
                aria-label={t('shopping.populateFromPlan')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-emerald-800 text-[9px] font-bold tracking-wider uppercase">{t('shopping.weeklyMealPlan')}</div>
                    <h4 className="text-sm text-gray-900 mt-0.5" style={{ fontWeight: 700 }}>
                      {t('shopping.populateFromPlan')}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {mealPlanSuggestions.length} {t('shopping.ingredientsFromMenu')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[13px] text-emerald-600" style={{ fontWeight: 800 }}>
                      +{mealPlanSuggestions.length}
                    </span>
                    <ListChecks className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
              </motion.button>
            )}
          </div>
        )}

        {/* ── Success toast for meal plan auto-populate ── */}
        <AnimatePresence>
          {mealPlanAddedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="sticky top-[120px] z-40 mx-3 sm:mx-4 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg"
            >
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-[13px] text-emerald-800 font-medium">
                {mealPlanAddedCount} {t('shopping.productsAdded')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results / Browse Grid */}
        {(isSearchFocused || searchQuery || selectedCategory) && displayProducts.length > 0 && (
          <div className="px-3 sm:px-4 lg:px-6 py-3">
            <h3 className="text-xs text-gray-500 mb-2" style={{ fontWeight: 700 }}>
              {searchQuery
                ? `${t('shopping.results')} (${displayProducts.length})`
                : selectedCategory
                ? `${selectedCategory} (${displayProducts.length})`
                : t('shopping.popular')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list" aria-label={t('common.searchResults')}>
              {displayProducts.map((product) => {
                const alreadyAdded = isInList(product.id);
                const isMealPlan = product.tags.includes('meal-plan');
                const isDietFriendly = product.tags.includes('high-protein') || product.tags.includes('low-calorie') || product.tags.includes('clean-eating');
                const storeInfo = localStores.find(s => s.name === product.store);
                return (
                  <button
                    key={product.id}
                    onClick={() => !alreadyAdded && addProduct(product)}
                    disabled={alreadyAdded}
                    aria-label={`${product.name} — ${product.price.toFixed(2)} lei, ${product.store}${alreadyAdded ? ` (${t('common.alreadyOnList')})` : ''}`}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      alreadyAdded
                        ? "border-green-300 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 opacity-70"
                        : isMealPlan
                        ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/10 hover:border-emerald-400 active:scale-[0.98]"
                        : "border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-card hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 active:scale-[0.98]"
                    }`}
                  >
                    <span className="text-3xl flex-shrink-0">{product.image}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-gray-900 truncate" style={{ fontWeight: 700 }}>
                          {product.name}
                        </span>
                        {isMealPlan && (
                          <Leaf className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                          {product.store}
                        </span>
                        <span className="text-[10px] text-gray-400">{product.brand}</span>
                        {storeInfo && (
                          <span className="text-[10px] text-gray-400">· {storeInfo.distanceKm} km</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] text-gray-400">
                        <span>{product.caloriesPer100} kcal</span>
                        <span>{t('logMealExt.proteinShort')}: {product.protein}g</span>
                        <span>{t('logMealExt.carbsShort')}: {product.carbs}g</span>
                        <span>{t('logMealExt.fatShort')}: {product.fat}g</span>
                        <span className="text-gray-300">/100{product.unit === 'l' || product.unit === 'ml' ? 'ml' : 'g'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-sm text-indigo-600" style={{ fontWeight: 800 }}>
                        {product.price.toFixed(2)} lei
                      </span>
                      {alreadyAdded ? (
                        <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center">
                          <Plus className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Shopping List Items */}
        {totalItems > 0 && (
          <div className="px-3 sm:px-4 lg:px-6 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="relative">
                <h3 className="text-sm text-gray-800 flex items-center gap-2" style={{ fontWeight: 800 }}>
                  <ShoppingBag className="w-4 h-4 text-indigo-500" />
                  {t('shopping.shoppingList')} ({totalItems})
                </h3>
                <DSMCoachMark
                  id="shopping-swipe-delete"
                  title={t('shopping.swipeToDelete')}
                  message={t('shopping.swipeHint')}
                  position="bottom"
                  delay={2000}
                />
              </div>
              {checkedCount > 0 && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full" style={{ fontWeight: 700 }}>
                  {checkedCount}/{totalItems} {t('shopping.done').toLowerCase()}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {shoppingItems.map((item, index) => (
                <DSMSwipeAction
                  key={`${item.product.id}-${index}`}
                  onSwipeLeft={() => removeItem(index)}
                  leftAction={{ icon: Trash2, color: "bg-red-500", label: t('shopping.remove') }}
                >
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      item.checked
                        ? "bg-gray-50 border-gray-200"
                        : "bg-white dark:bg-card border-gray-100 dark:border-[#2a2a2a] hover:border-indigo-200"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleItemCheck(index)}
                      aria-label={item.checked ? t('shopping.uncheckItem') : t('shopping.checkItem')}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        item.checked
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300 hover:border-indigo-400"
                      }`}
                    >
                      {item.checked && <Check className="w-4 h-4 text-white" />}
                    </button>

                    {/* Product info */}
                    <span className="text-xl flex-shrink-0">{item.product.image}</span>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm truncate ${item.checked ? "line-through text-gray-400" : "text-gray-900"}`}
                        style={{ fontWeight: 600 }}
                      >
                        {item.product.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">
                          {item.product.store} · {item.product.price.toFixed(2)} lei
                        </span>
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(index)}
                      aria-label={t('shopping.remove')}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </DSMSwipeAction>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalItems === 0 && !searchQuery && !selectedCategory && (
          <div className="text-center py-8 px-4">
            <div className="text-5xl mb-3">🛒</div>
            <h3 className="text-lg text-gray-900 mb-1" style={{ fontWeight: 700 }}>
              {t('shopping.emptyList')}
            </h3>
            <p className="text-sm text-gray-500">
              {t('shopping.emptyListHint')}
            </p>
          </div>
        )}
      </div>

      {/* Fixed AI Store Finder CTA - always visible above bottom nav */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 bg-white/95 backdrop-blur-lg border-t border-gray-100">
        <button
          onClick={handleFindStores}
          className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-white/70 text-[9px] font-bold tracking-wider">{t('shopping.aiStoreFinder')}</div>
              <h3 className="text-sm mb-0" style={{ fontWeight: 800 }}>
                {t('shopping.findStores')}
              </h3>
              <p className="text-white/80 text-[10px]">Marosvásárhely · {t('common.realStoresDelivery')}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/80" />
          </div>
        </button>
      </div>

      {/* Store Finder Modal */}
      {showStoreView && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={t('shopping.nearbyStores')}>
          <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 px-5 py-5 rounded-t-3xl flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl text-white" style={{ fontWeight: 800 }}>
                      {t('shopping.nearbyStores')}
                    </h2>
                    <p className="text-white/80 text-xs">
                      Marosvásárhely · {totalItems} {t('shopping.product')} {t('shopping.onList')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStoreView(false)}
                  className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center transition-colors"
                  aria-label={t('shopping.close')}
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Store List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingStores ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <Sparkles className="w-7 h-7 text-purple-500 animate-spin" />
                  </div>
                  <p className="text-gray-600" style={{ fontWeight: 600 }}>
                    {t('shopping.analyzingStores')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{t('shopping.searchingStores')}</p>
                </div>
              ) : (
                <>
                  {/* Best match hint */}
                  {storeMatches.length > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-teal-50 border-2 border-blue-200 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-blue-800" style={{ fontWeight: 700 }}>
                          {t('shopping.bestChoice')}: {storeMatches[0].name}
                        </span>
                        <span className="text-xs text-blue-600 ml-auto">
                          {storeMatches[0].matchCount} {t('shopping.product')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Stores with matches */}
                  {storeMatches.map((store, index) => (
                    <div
                      key={store.name}
                      className={`border-2 rounded-2xl p-4 transition-all ${
                        index === 0
                          ? "border-blue-300 bg-gradient-to-br from-blue-50 to-teal-50"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-3xl">{store.logo}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
                              {store.name}
                            </h3>
                            {store.hasDelivery && (
                              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                {t('shopping.delivery')}
                              </span>
                            )}
                            {index === 0 && (
                              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">
                                #1
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{store.address}</p>
                          {store.hasDelivery && store.deliveryPartner && (
                            <p className="text-[10px] text-indigo-500 font-bold mt-0.5">
                              via {store.deliveryPartner}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-white/80 rounded-lg p-2 text-center border border-gray-100">
                          <div className="text-xs text-gray-500">{t('shopping.products')}</div>
                          <div className="text-sm text-indigo-600" style={{ fontWeight: 800 }}>
                            {store.matchCount}/{totalItems}
                          </div>
                        </div>
                        <div className="bg-white/80 rounded-lg p-2 text-center border border-gray-100">
                          <div className="text-xs text-gray-500">{t('shopping.estimatedPrice')}</div>
                          <div className="text-sm text-gray-900" style={{ fontWeight: 800 }}>
                            {store.estimatedTotal.toFixed(0)} lei
                          </div>
                        </div>
                        <div className="bg-white/80 rounded-lg p-2 text-center border border-gray-100">
                          <div className="text-xs text-gray-500">{t('shopping.open')}</div>
                          <div className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
                            {store.openHours.split(" - ")[1]}
                          </div>
                        </div>
                      </div>

                      {/* Matched items preview */}
                      {store.matchedItems.length > 0 && (
                        <div className="flex items-center gap-1 mb-3 overflow-hidden">
                          {store.matchedItems.slice(0, 6).map((item, i) => (
                            <span key={i} className="text-lg flex-shrink-0">{item.product.image}</span>
                          ))}
                          {store.matchedItems.length > 6 && (
                            <span className="text-xs text-gray-400 ml-1">
                              +{store.matchedItems.length - 6}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openInGoogleMaps(store)}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                          style={{ fontWeight: 700 }}
                        >
                          <Navigation className="w-4 h-4" />
                          <span className="text-sm">{t('shopping.navigate')}</span>
                        </button>
                        {store.hasDelivery ? (
                          <button
                            onClick={() => {
                              setShowStoreView(false);
                              navigate(`/checkout?store=${encodeURIComponent(store.name)}`);
                            }}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-teal-500 text-white py-3 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                            style={{ fontWeight: 700 }}
                          >
                            <Truck className="w-4 h-4" />
                            <span className="text-sm">{t('shopping.order')}</span>
                          </button>
                        ) : (
                          <div className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl flex items-center justify-center gap-2 cursor-default">
                            <Package className="w-4 h-4" />
                            <span className="text-xs" style={{ fontWeight: 600 }}>{t('shopping.noDelivery')}</span>
                          </div>
                        )}
                      </div>

                      {/* Delivery info */}
                      {store.hasDelivery && store.deliveryFee !== undefined && (
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                          <span>{t('shopping.deliveryFee')}: {store.deliveryFee} lei</span>
                          {store.minOrder && <span>{t('shopping.minOrder')}: {store.minOrder} lei</span>}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Stores without matches */}
                  {localStores
                    .filter((s) => !storeMatches.find((m) => m.name === s.name))
                    .map((store) => (
                      <div key={store.name} className="border-2 border-gray-100 rounded-2xl p-4 opacity-60">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{store.logo}</span>
                          <div className="flex-1">
                            <div className="text-sm text-gray-600" style={{ fontWeight: 600 }}>
                              {store.name}
                            </div>
                            <div className="text-xs text-gray-400">{store.address}</div>
                          </div>
                          <span className="text-xs text-gray-400">0 {t('shopping.product')}</span>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}