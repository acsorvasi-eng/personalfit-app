import { hapticFeedback } from '@/lib/haptics';
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Check,
  Sparkles,
  X,
  Search,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Settings,
  CreditCard,
  MapPin,
  Refrigerator,
  ChevronRight,
  Bluetooth,
} from "lucide-react";
import { DSMSwipeAction, DSMCoachMark } from "../../../components/dsm/ux-patterns";
import { PageHeader } from "../../../components/PageHeader";
import {
  Product,
  productDatabase,
  searchProducts,
} from "../../../data/productDatabase";
import { useLanguage } from "../../../contexts/LanguageContext";
import { generateWeeklyShoppingList } from "../../../utils/mealPlanToShoppingList";
import { usePlanData } from "../../../hooks/usePlanData";
import { getSetting, setSetting } from "../../../backend/services/SettingsService";
import { ShoppingItem } from "../types";
import {
  computeStoreRecommendations,
  computeBestTwoStoreCombo,
  StoreRecommendation,
  TwoStoreRecommendation,
  UserLocation,
  StorePreferences,
} from "../../../utils/storeRecommendation";
import { StoreStopBySheet } from "./StoreStopBySheet";
import { OrderDeliverySheet } from "./OrderDeliverySheet";

function SmartStorePanel({
  topRec,
  twoStoreCombo,
  uncheckedCount,
  onStopBy,
  onOrder,
}: {
  topRec: StoreRecommendation;
  twoStoreCombo: TwoStoreRecommendation | null;
  uncheckedCount: number;
  onStopBy: () => void;
  onOrder: () => void;
}) {
  return (
    <div className="mx-4 mb-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-3 border border-teal-200">
      <div className="text-2xs font-bold text-teal-600 tracking-wide mb-2.5">
        🏪 LEGJOBB BOLT MOST
      </div>

      {/* Best single store */}
      <div className="flex justify-between items-center bg-white rounded-xl px-3 py-2.5 border-2 border-teal-600 mb-2">
        <div>
          <div className="text-sm font-bold text-gray-800">
            {topRec.store.name}
            {topRec.isPreferred && (
              <span className="ml-1.5 text-2xs text-amber-500 font-semibold">⭐ Megszokott</span>
            )}
          </div>
          <div className="text-2xs text-gray-500">
            {topRec.matchCount}/{uncheckedCount} termék elérhető
            {" · "}{topRec.distanceKm} km
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-extrabold text-teal-600">
            ~{topRec.estimatedTotal.toFixed(0)} lei
          </div>
          {topRec.missingItems.length > 0 && (
            <div className="text-2xs text-gray-400">
              {topRec.missingItems.length} hiányzó
            </div>
          )}
        </div>
      </div>

      {/* Two-store combo */}
      {twoStoreCombo && (
        <div className="flex justify-between items-center bg-white rounded-xl px-3 py-2.5 border border-gray-200 mb-2">
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {twoStoreCombo.primary.store.name} + {twoStoreCombo.secondary.store.name}
            </div>
            <div className="text-2xs text-gray-500">
              {twoStoreCombo.combinedMatchCount}/{uncheckedCount} termék · 2 futár
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-extrabold text-gray-700">
              ~{(twoStoreCombo.combinedTotal + twoStoreCombo.combinedDeliveryFee).toFixed(0)} lei
            </div>
            <div className="text-2xs text-red-400">
              +{twoStoreCombo.combinedDeliveryFee.toFixed(2)} lei futár (2×)
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onStopBy}
          className="flex-1 py-2.5 bg-white border-2 border-teal-600 rounded-xl text-xs font-semibold text-teal-600 active:scale-95 transition-all"
        >
          🚶 Megállok útban
        </button>
        <button
          onClick={onOrder}
          className="flex-1 py-2.5 bg-teal-600 rounded-xl text-xs font-semibold text-white active:scale-95 transition-all"
        >
          🛵 Megrendelem
        </button>
      </div>
    </div>
  );
}

// ─── Shopping Settings Sheet ─────────────────────────────────────────────────
interface ShoppingSettings {
  cardHolder: string;
  cardLast4: string;
  address: string;
  fridgePaired: boolean;
  fridgeName: string;
}

function ShoppingSettingsSheet({
  open,
  onClose,
  settings,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  settings: ShoppingSettings;
  onChange: (s: ShoppingSettings) => void;
}) {
  const [local, setLocal] = useState(settings);
  useEffect(() => { setLocal(settings); }, [settings, open]);

  const save = () => { onChange(local); onClose(); hapticFeedback('light'); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-black text-gray-900">Bevásárlás beállítások</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Payment */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#0d9488' }}>
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">Fizetési kártya</h3>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Kártyabirtokos neve"
                value={local.cardHolder}
                onChange={e => setLocal(p => ({ ...p, cardHolder: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-400 text-sm bg-gray-50 outline-none"
              />
              <input
                type="text"
                placeholder="Kártya utolsó 4 számjegy"
                maxLength={4}
                value={local.cardLast4}
                onChange={e => setLocal(p => ({ ...p, cardLast4: e.target.value.replace(/\D/g, '') }))}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-400 text-sm bg-gray-50 outline-none"
              />
            </div>
          </div>

          {/* Delivery address */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#0d9488' }}>
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">Szállítási cím</h3>
            </div>
            <textarea
              placeholder="pl. Kolozsvár, Főtér 1., 3. em. 12."
              value={local.address}
              onChange={e => setLocal(p => ({ ...p, address: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-400 text-sm bg-gray-50 outline-none resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Ide hozhatja a futár a rendelést</p>
          </div>

          {/* Smart fridge */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#0d9488' }}>
                <Refrigerator className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">Okos hűtő</h3>
            </div>
            {local.fridgePaired ? (
              <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bluetooth className="w-5 h-5 text-teal-600" />
                  <div>
                    <div className="font-bold text-teal-800 text-sm">{local.fridgeName || 'Hűtő'}</div>
                    <div className="text-xs text-teal-600">Párosítva ✓</div>
                  </div>
                </div>
                <button
                  onClick={() => setLocal(p => ({ ...p, fridgePaired: false, fridgeName: '' }))}
                  className="text-xs text-red-500 font-semibold px-3 py-1.5 rounded-lg bg-red-50"
                >
                  Lekapcsol
                </button>
              </div>
            ) : (
              <div>
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 text-center mb-3">
                  <Refrigerator className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Nincs párosítva</p>
                  <p className="text-xs text-gray-400 mt-1">Az okos hűtő automatikusan jelzi ha valami fogyóban van</p>
                </div>
                <input
                  type="text"
                  placeholder="Hűtő neve (pl. Samsung Family Hub)"
                  value={local.fridgeName}
                  onChange={e => setLocal(p => ({ ...p, fridgeName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-400 text-sm bg-gray-50 outline-none mb-2"
                />
                <button
                  onClick={() => { if (local.fridgeName.trim()) setLocal(p => ({ ...p, fridgePaired: true })); }}
                  disabled={!local.fridgeName.trim()}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: '#0d9488' }}
                >
                  <Bluetooth className="w-4 h-4" /> Párosítás
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        <div className="px-5 pb-8 pt-2">
          <button
            onClick={save}
            className="w-full py-4 rounded-2xl font-black text-white text-base"
            style={{ background: '#0d9488' }}
          >
            Mentés
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShoppingList() {
  const { t } = useLanguage();
  const { planData } = usePlanData();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  useEffect(() => {
    getSetting("shoppingItems").then((saved) => {
      if (!saved) return;
      try {
        const items = JSON.parse(saved) as ShoppingItem[];
        const valid = items.filter(i => i.product && Array.isArray(i.product.tags));
        setShoppingItems(valid);
        if (valid.length !== items.length) setSetting("shoppingItems", JSON.stringify(valid)).catch(() => {});
      } catch { /* ignore */ }
    });
  }, []);

  // Load saved store preferences
  useEffect(() => {
    getSetting("storePreferences").then((saved) => {
      if (!saved) return;
      try { setStorePreferences(JSON.parse(saved)); } catch { /* ignore */ }
    });
  }, []);

  // Request GPS location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* permission denied — silently use static distances */ }
    );
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [stopByOpen, setStopByOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shoppingSettings, setShoppingSettings] = useState<ShoppingSettings>({
    cardHolder: '', cardLast4: '', address: '', fridgePaired: false, fridgeName: '',
  });

  // Load / save shopping settings
  useEffect(() => {
    getSetting('shoppingSettings').then((saved) => {
      if (!saved) return;
      try { setShoppingSettings(JSON.parse(saved)); } catch { /* ignore */ }
    });
  }, []);

  const handleSaveSettings = (s: ShoppingSettings) => {
    setShoppingSettings(s);
    setSetting('shoppingSettings', JSON.stringify(s)).catch(() => {});
  };
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [storePreferences, setStorePreferences] = useState<StorePreferences>({});

  const updateShoppingItems = (updater: (prev: ShoppingItem[]) => ShoppingItem[]) => {
    setShoppingItems((prev) => {
      const next = updater(prev);
      setSetting("shoppingItems", JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const recordStoreVisit = (storeName: string) => {
    setStorePreferences((prev) => {
      const next = { ...prev, [storeName]: (prev[storeName] ?? 0) + 1 };
      setSetting("storePreferences", JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const terms = searchQuery.trim().split(/\s+/).filter(Boolean);
    if (terms.length <= 1) {
      return searchProducts(searchQuery, undefined);
    }
    const seen = new Set<string>();
    const results: Product[] = [];
    terms.forEach((term) => {
      searchProducts(term, undefined).forEach((p) => {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          results.push(p);
        }
      });
    });
    return results;
  }, [searchQuery]);

  const browseProducts = useMemo(() => {
    if (searchQuery.trim()) return [];
    return searchProducts('', undefined);
  }, [searchQuery]);

  const displayProducts = searchResults.length > 0 ? searchResults : browseProducts;

  const totalItems = shoppingItems.length;
  const checkedCount = shoppingItems.filter((i) => i.checked).length;

  const totalPrice = useMemo(() => {
    return shoppingItems.reduce((sum, item) => sum + item.product.price, 0);
  }, [shoppingItems]);

  const addProduct = (product: Product) => {
    const exists = shoppingItems.some((i) => i.product.id === product.id);
    if (exists) return;
    updateShoppingItems((prev) => [
      ...prev,
      { product, quantity: product.defaultQuantity, checked: false },
    ]);
  };

  const removeItem = (productId: string) => {
    updateShoppingItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const toggleItemCheck = (productId: string) => {
    updateShoppingItems((prev) =>
      prev.map((item) => item.product.id === productId ? { ...item, checked: !item.checked } : item)
    );
  };

  const isInList = (productId: string) => shoppingItems.some((i) => i.product.id === productId);

  const uncheckedItems = useMemo(
    () => shoppingItems.filter((i) => !i.checked),
    [shoppingItems]
  );

  const storeRecommendations = useMemo(
    () => computeStoreRecommendations(
      uncheckedItems,
      userLocation ?? undefined,
      storePreferences
    ),
    [uncheckedItems, userLocation, storePreferences]
  );

  const topRecommendation = storeRecommendations[0] ?? null;

  const twoStoreCombo = useMemo(
    () => computeBestTwoStoreCombo(storeRecommendations),
    [storeRecommendations]
  );

  // ─── Auto-populate from meal plan ───
  const [showMealPlanImport, setShowMealPlanImport] = useState(false);
  const [mealPlanAddedCount, setMealPlanAddedCount] = useState(0);

  const [menuSelectedMealsJson, setMenuSelectedMealsJson] = useState<string | null>(null);
  useEffect(() => {
    getSetting('menuSelectedMeals').then(setMenuSelectedMealsJson);
  }, []);
  const mealPlanSuggestions = useMemo(() => {
    const selectedMeals = menuSelectedMealsJson ? (() => { try { return JSON.parse(menuSelectedMealsJson); } catch { return {}; } })() : {};
    return generateWeeklyShoppingList(planData, selectedMeals);
  }, [planData, menuSelectedMealsJson]);

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
      hapticFeedback('light');
    }
    setMealPlanAddedCount(addedCount);
    setShowMealPlanImport(false);

    setTimeout(() => setMealPlanAddedCount(0), 3000);
  }, [shoppingItems, mealPlanSuggestions]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0">
        <PageHeader
          title={t('nav.shopping') || 'Bevásárlólista'}
          subtitle={
            totalItems === 0
              ? t('shopping.emptyHint') || 'Adj hozzá termékeket az étrendedből'
              : `${totalItems - checkedCount} termék vár · ${checkedCount} kész`
          }
          stats={totalItems > 0 ? [
            {
              label: t('shopping.total') || 'Összes',
              value: totalItems,
              suffix: 'db',
            },
            {
              label: t('shopping.done') || 'Kész',
              value: `${checkedCount}/${totalItems}`,
            },
            {
              label: t('shopping.price') || 'Becsült ár',
              value: `~${Math.round(totalPrice)}`,
              suffix: 'lei',
            },
          ] : []}
          action={
            <div className="flex items-center gap-2">
              {/* Cart badge */}
              <div className="relative">
                <button className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </button>
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ background: totalItems > 0 ? '#fff' : 'rgba(255,255,255,0.35)', color: totalItems > 0 ? '#0d9488' : '#fff' }}
                >
                  {totalItems}
                </span>
              </div>
              {/* Settings */}
              <button
                onClick={() => { setSettingsOpen(true); hapticFeedback('light'); }}
                className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center"
              >
                <Settings className="w-4 h-4 text-white" />
              </button>
            </div>
          }
        />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Search bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-3 sm:px-4 lg:px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <div className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-all ${
              isSearchFocused ? "border-teal-400 bg-teal-50/30" : "border-gray-200 bg-gray-50"
            }`}>
              <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder={t('shopping.addProduct')}
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="p-0.5 hover:bg-gray-200 rounded-full">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search results or browse grid */}
        <AnimatePresence>
          {displayProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-3 sm:px-4 lg:px-6 py-3"
            >
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500" style={{ fontWeight: 600 }}>
                  {searchQuery ? t('shopping.searchResults') : t('shopping.recommended')}
                </span>
                <span className="text-xs text-gray-400 ml-auto">{displayProducts.length} {t('shopping.product')}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {displayProducts.map((product) => {
                  const alreadyAdded = isInList(product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addProduct(product)}
                      disabled={alreadyAdded}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all active:scale-95 ${
                        alreadyAdded
                          ? "border-green-200 bg-green-50 opacity-60 cursor-default"
                          : "border-gray-100 bg-white hover:border-teal-200 hover:shadow-sm"
                      }`}
                    >
                      <div className="text-2xl mb-1">{product.image}</div>
                      <div className="text-xs font-semibold text-gray-800 text-center truncate w-full">{product.name}</div>
                      <div className="text-xs text-gray-500 truncate w-full text-center">{product.store}</div>
                      <div className="text-xs font-bold text-teal-600">{product.price.toFixed(2)} lei</div>
                      {!alreadyAdded && (
                        <div className="mt-1 w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center">
                          <Plus className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Meal plan import CTA */}
        {mealPlanSuggestions.length > 0 && !searchQuery && (
          <div className="px-3 sm:px-4 py-2">
            {mealPlanAddedCount > 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <div className="text-green-700 text-sm font-bold">✓ {mealPlanAddedCount} termék hozzáadva!</div>
              </div>
            ) : (
              <button
                onClick={() => setShowMealPlanImport(true)}
                className="w-full bg-teal-50 border border-teal-200 rounded-xl p-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <div>
                    <div className="text-xs font-bold text-teal-700">Heti étrendből ({mealPlanSuggestions.length} termék)</div>
                    <div className="text-2xs text-teal-600">Koppints a hozzáadáshoz</div>
                  </div>
                </div>
              </button>
            )}
            {showMealPlanImport && (
              <div className="mt-2 bg-white border border-gray-200 rounded-xl p-3">
                <p className="text-sm text-gray-700 mb-3">{mealPlanSuggestions.length} termék hozzáadása a listához?</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowMealPlanImport(false)} className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg">Mégse</button>
                  <button onClick={handleAutoPopulateFromMealPlan} className="flex-1 py-2 text-sm font-bold text-white bg-teal-600 rounded-lg">Hozzáadás</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shopping list items */}
        {totalItems > 0 && (
          <div className="px-3 sm:px-4 lg:px-6 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="relative">
                <h3 className="text-sm text-gray-800 flex items-center gap-2" style={{ fontWeight: 800 }}>
                  <ShoppingBag className="w-4 h-4 text-indigo-500" />
                  {t('shopping.shoppingList')}{' '}
                  ({totalItems})
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
              {[...shoppingItems]
                .sort((a, b) => Number(a.checked) - Number(b.checked))
                .map((item) => (
                <DSMSwipeAction
                  key={item.product.id}
                  onSwipeLeft={() => removeItem(item.product.id)}
                  leftAction={{ icon: Trash2, color: "bg-red-500", label: t('shopping.remove') }}
                >
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      item.checked
                        ? "bg-gray-50 border-gray-200 opacity-40"
                        : "bg-white border-gray-100 hover:border-indigo-200"
                    }`}
                  >
                    <button
                      onClick={() => toggleItemCheck(item.product.id)}
                      aria-label={item.checked ? t('shopping.uncheckItem') : t('shopping.checkItem')}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        item.checked
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300 hover:border-indigo-400"
                      }`}
                    >
                      {item.checked && <Check className="w-4 h-4 text-white" />}
                    </button>

                    <span className="text-xl flex-shrink-0">{item.product.image}</span>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm truncate ${item.checked ? "line-through text-gray-400" : "text-gray-900"}`}
                        style={{ fontWeight: 600 }}
                      >
                        {item.product.name}
                      </div>
                      <div className="text-2xs text-gray-400">legjobb ár: {item.product.store}</div>
                    </div>

                    <div className="text-right">
                      <div className={`text-sm font-bold ${item.checked ? "text-gray-400 line-through" : "text-teal-600"}`}>
                        {item.product.price.toFixed(2)} lei
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.product.id)}
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

        {/* Smart Store Panel */}
        {topRecommendation && uncheckedItems.length > 0 && (
          <SmartStorePanel
            topRec={topRecommendation}
            twoStoreCombo={twoStoreCombo}
            uncheckedCount={uncheckedItems.length}
            onStopBy={() => {
              recordStoreVisit(topRecommendation.store.name);
              setStopByOpen(true);
            }}
            onOrder={() => {
              recordStoreVisit(topRecommendation.store.name);
              setOrderOpen(true);
            }}
          />
        )}

        {/* Empty state */}
        {totalItems === 0 && !searchQuery && (
          <div className="px-4 py-6">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🛒</div>
              <h3 className="text-lg text-gray-900 mb-1" style={{ fontWeight: 700 }}>
                {t('shopping.emptyList')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('shopping.emptyListHint')}
              </p>
            </div>

            {/* Fogyandóba van — smart fridge placeholder */}
            <div className="rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/40 p-4">
              <div className="flex items-center gap-3 mb-2">
                <Refrigerator className="w-5 h-5 text-teal-500 flex-shrink-0" />
                <span className="text-sm font-bold text-teal-700">Fogyandóba van</span>
                <span className="ml-auto text-2xs bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full font-semibold">Hamarosan</span>
              </div>
              {shoppingSettings.fridgePaired ? (
                <p className="text-xs text-teal-600 leading-relaxed">
                  Az okos hűtőd (<span className="font-semibold">{shoppingSettings.fridgeName}</span>) figyelni fogja mi van fogyóban és automatikusan ide kerülnek a hiányzó termékek.
                </p>
              ) : (
                <p className="text-xs text-teal-600 leading-relaxed">
                  Ha párosítasz egy okos hűtőt a beállításokban, automatikusan megjelenik itt ami fogyóban van.{' '}
                  <button
                    onClick={() => { setSettingsOpen(true); hapticFeedback('light'); }}
                    className="font-bold underline underline-offset-2"
                  >
                    Hűtő párosítása →
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

        <div className="pb-24" />
      </div>

      {/* Bottom sheets */}
      <StoreStopBySheet
        open={stopByOpen}
        onClose={() => setStopByOpen(false)}
        store={topRecommendation?.store ?? null}
        allUncheckedItems={uncheckedItems}
      />
      <OrderDeliverySheet
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        topRecommendation={topRecommendation}
        twoStoreCombo={twoStoreCombo}
      />
      <ShoppingSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={shoppingSettings}
        onChange={handleSaveSettings}
      />
    </div>
  );
}
