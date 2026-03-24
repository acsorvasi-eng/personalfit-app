import { hapticFeedback } from '@/lib/haptics';
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  Store,
  Refrigerator,
  ChevronRight,
  Bluetooth,
  SlidersHorizontal,
} from "lucide-react";
import { DSMSwipeAction, DSMCoachMark } from "../../../components/dsm/ux-patterns";
import { DSMModal } from "../../../components/dsm";
import { PageHeader } from "../../../components/PageHeader";
import {
  Product,
  productDatabase,
  searchProducts,
  StoreName,
} from "../../../data/productDatabase";
import { useLanguage } from "../../../contexts/LanguageContext";
import { generateWeeklyShoppingList } from "../../../utils/mealPlanToShoppingList";
import { usePlanData } from "../../../hooks/usePlanData";
import { useFavoriteFoods } from '../../../hooks/useFavoriteFoods';
import { buildSmartRecommendations, PurchaseHistory } from '../utils/smartRecommendations';
import { getCurrentWeekIndex } from '../../../utils/mealPlanToShoppingList';
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

// ─── Reusable helpers matching Profile SettingsSheet style ───────────────────
function SRow({
  title, subtitle, rightText, onClick,
}: { title: string; subtitle?: string; rightText?: string; onClick?: () => void }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem', borderBottom: '1px solid #f3f4f6',
        cursor: onClick ? 'pointer' : 'default', background: 'white',
      }}
    >
      <div>
        <div style={{ fontSize: '1rem', fontWeight: 500, color: '#111827' }}>{title}</div>
        {subtitle != null && subtitle !== '' && (
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {rightText != null && rightText !== '' && (
        <span style={{ color: '#0d9488', fontSize: '0.875rem' }}>{rightText}</span>
      )}
    </div>
  );
}

function SCard({ sectionTitle, children }: { sectionTitle: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'white', borderRadius: '1rem', overflow: 'hidden',
      marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '0.75rem 1rem 0.25rem',
      }}>
        {sectionTitle}
      </div>
      {children}
    </div>
  );
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
  const { t } = useLanguage();
  const [local, setLocal] = useState(settings);
  const [expanded, setExpanded] = useState<'card' | 'address' | 'fridge' | null>(null);

  useEffect(() => { setLocal(settings); }, [settings, open]);
  useEffect(() => { if (!open) setExpanded(null); }, [open]);

  const saveRow = (patch: Partial<ShoppingSettings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
    hapticFeedback('light');
    setExpanded(null);
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '3rem 1rem 1rem', background: 'white', borderBottom: '1px solid #f3f4f6',
      }}>
        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>Bevásárlás beállítások</span>
        <button
          onClick={onClose}
          style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
        >
          <X style={{ width: 18, height: 18, color: '#6b7280' }} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>

        {/* Payment card section */}
        <SCard sectionTitle="Fizetés">
          <SRow
            title="Fizetési kártya"
            subtitle={local.cardHolder && local.cardLast4
              ? `${local.cardHolder} · ••••${local.cardLast4}`
              : 'Nincs megadva'}
            rightText={expanded === 'card' ? '▲' : 'Szerkesztés ›'}
            onClick={() => setExpanded(expanded === 'card' ? null : 'card')}
          />
          {expanded === 'card' && (
            <div style={{ padding: '1rem', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                placeholder="Kártyabirtokos neve"
                value={local.cardHolder}
                onChange={e => setLocal(p => ({ ...p, cardHolder: e.target.value }))}
                autoFocus
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
              <input
                type="text"
                placeholder="Kártya utolsó 4 számjegy"
                maxLength={4}
                value={local.cardLast4}
                onChange={e => setLocal(p => ({ ...p, cardLast4: e.target.value.replace(/\D/g, '') }))}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
              <button
                onClick={() => saveRow({ cardHolder: local.cardHolder, cardLast4: local.cardLast4 })}
                style={{ width: '100%', padding: '12px', borderRadius: 10, fontWeight: 700, color: 'white', fontSize: '0.9rem', background: '#0d9488', border: 'none', cursor: 'pointer' }}
              >
                {t('common.save')}
              </button>
            </div>
          )}
        </SCard>

        {/* Delivery section */}
        <SCard sectionTitle="Szállítás">
          <SRow
            title="Szállítási cím"
            subtitle={local.address || 'Nincs megadva'}
            rightText={expanded === 'address' ? '▲' : 'Szerkesztés ›'}
            onClick={() => setExpanded(expanded === 'address' ? null : 'address')}
          />
          {expanded === 'address' && (
            <div style={{ padding: '1rem', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                placeholder="pl. Kolozsvár, Főtér 1., 3. em. 12."
                value={local.address}
                onChange={e => setLocal(p => ({ ...p, address: e.target.value }))}
                rows={3}
                autoFocus
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px', fontSize: '0.9rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>Ide hozhatja a futár a rendelést</p>
              <button
                onClick={() => saveRow({ address: local.address })}
                style={{ width: '100%', padding: '12px', borderRadius: 10, fontWeight: 700, color: 'white', fontSize: '0.9rem', background: '#0d9488', border: 'none', cursor: 'pointer' }}
              >
                {t('common.save')}
              </button>
            </div>
          )}
        </SCard>

        {/* Smart fridge section */}
        <SCard sectionTitle={t('shopping.settings.smartFridgeTitle')}>
          <SRow
            title={t('shopping.settings.fridgePairing')}
            subtitle={local.fridgePaired ? `✓ ${local.fridgeName}` : t('shopping.settings.notPaired')}
            rightText={expanded === 'fridge' ? '▲' : (local.fridgePaired ? t('shopping.settings.manage') : t('shopping.settings.pairAction'))}
            onClick={() => setExpanded(expanded === 'fridge' ? null : 'fridge')}
          />
          {expanded === 'fridge' && (
            <div style={{ padding: '1rem', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {local.fridgePaired ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdfa', borderRadius: 10, padding: 12 }}>
                    <Bluetooth style={{ width: 18, height: 18, color: '#0d9488' }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#134e4a', fontSize: '0.9rem' }}>{local.fridgeName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#0d9488' }}>{t('shopping.settings.pairedStatus')}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => saveRow({ fridgePaired: false, fridgeName: '' })}
                    style={{ width: '100%', padding: '12px', borderRadius: 10, fontWeight: 700, color: '#dc2626', fontSize: '0.9rem', background: '#fef2f2', border: 'none', cursor: 'pointer' }}
                  >
                    {t('shopping.settings.disconnect')}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>{t('shopping.settings.fridgeAutoDesc')}</p>
                  <input
                    type="text"
                    placeholder={t('shopping.settings.fridgeNamePlaceholder')}
                    value={local.fridgeName}
                    onChange={e => setLocal(p => ({ ...p, fridgeName: e.target.value }))}
                    autoFocus
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={() => { if (local.fridgeName.trim()) saveRow({ fridgePaired: true, fridgeName: local.fridgeName }); }}
                    disabled={!local.fridgeName.trim()}
                    style={{ width: '100%', padding: '12px', borderRadius: 10, fontWeight: 700, color: 'white', fontSize: '0.9rem', background: '#0d9488', border: 'none', cursor: 'pointer', opacity: local.fridgeName.trim() ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <Bluetooth style={{ width: 16, height: 16 }} /> {t('shopping.settings.pairButton')}
                  </button>
                </>
              )}
            </div>
          )}
        </SCard>

      </div>
    </div>
  );
}

export function ShoppingList() {
  const { t } = useLanguage();
  const { planData } = usePlanData();
  const { favoriteIds } = useFavoriteFoods();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory>({});
  const [purchaseHistoryLoaded, setPurchaseHistoryLoaded] = useState(false);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
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
  const [tappedCarouselId, setTappedCarouselId] = useState<string | null>(null);
  const [selectedStores, setSelectedStores] = useState<StoreName[]>([]);
  const [storeFilterOpen, setStoreFilterOpen] = useState(false);

  // Persist store filter
  useEffect(() => {
    getSetting('storeFilter').then((saved) => {
      if (!saved) return;
      try { setSelectedStores(JSON.parse(saved)); } catch { /* ignore */ }
    });
  }, []);

  // Load purchase history
  useEffect(() => {
    (async () => {
      try {
        const raw = await getSetting('sh-purchase-history');
        const history: PurchaseHistory = raw ? JSON.parse(raw) : {};
        setPurchaseHistory(history);
      } catch {
        // ignore
      } finally {
        setPurchaseHistoryLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (favoriteIds.size > 0) setFavoritesLoaded(true);
  }, [favoriteIds]);

  // Fallback: users with zero favorites will never trigger the size>0 effect above.
  // The 300ms timeout ensures favoritesLoaded resolves even with no favorites or slow Firestore.
  useEffect(() => {
    const timer = setTimeout(() => setFavoritesLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);
  const toggleStore = (store: StoreName) => {
    setSelectedStores(prev => {
      const next = prev.includes(store) ? prev.filter(s => s !== store) : [...prev, store];
      setSetting('storeFilter', JSON.stringify(next)).catch(() => {});
      return next;
    });
    hapticFeedback('light');
  };
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
    const seen = new Set<string>();
    const results: Product[] = [];
    const base = terms.length <= 1
      ? searchProducts(searchQuery, undefined)
      : terms.flatMap(term => searchProducts(term, undefined));
    for (const p of base) {
      if (!seen.has(p.id)) { seen.add(p.id); results.push(p); }
    }
    return selectedStores.length > 0
      ? results.filter(p => selectedStores.includes(p.store))
      : results;
  }, [searchQuery, selectedStores]);

  const mealIngredients = useMemo(() => {
    if (!planData || planData.length === 0) return [];
    const weekIndex = getCurrentWeekIndex();
    const week = planData[weekIndex];
    if (!week) return [];
    return week.days.flatMap((day) =>
      [...day.breakfast, ...day.lunch, ...day.dinner, ...(day.snack ?? [])].flatMap(
        (meal) => meal.ingredients
      )
    );
  }, [planData]);

  const browseProducts = useMemo(() => {
    if (!favoritesLoaded || !purchaseHistoryLoaded) return [];
    const currentCartIds = new Set(shoppingItems.map(i => i.product.id));
    const isNewUser = favoriteIds.size === 0 && Object.keys(purchaseHistory).length === 0;
    return buildSmartRecommendations({
      searchQuery,
      products: productDatabase,
      currentCartIds,
      mealIngredients,
      favoriteIds,
      purchaseHistory,
      selectedStores,
      isNewUser,
    });
  }, [favoritesLoaded, purchaseHistoryLoaded, shoppingItems, favoriteIds, purchaseHistory,
      searchQuery, mealIngredients, selectedStores]);

  const displayProducts = searchResults.length > 0 ? searchResults : browseProducts;

  const totalItems = shoppingItems.length;
  const checkedCount = shoppingItems.filter((i) => i.checked).length;

  const totalPrice = useMemo(() => {
    return shoppingItems.reduce((sum, item) => sum + item.product.price, 0);
  }, [shoppingItems]);

  const addProduct = async (product: Product) => {
    const exists = shoppingItems.some((i) => i.product.id === product.id);
    if (exists) return;
    updateShoppingItems((prev) => [...prev, { product, quantity: product.defaultQuantity, checked: false }]);
    try {
      // Re-read from storage (not component state) to avoid clobbering concurrent writes
      // from other tabs or rapid sequential addProduct calls.
      const raw = await getSetting('sh-purchase-history');
      const history: PurchaseHistory = raw ? JSON.parse(raw) : {};
      const prev = history[product.id] ?? { addCount: 0, lastAdded: 0 };
      history[product.id] = { addCount: prev.addCount + 1, lastAdded: Date.now() };
      await setSetting('sh-purchase-history', JSON.stringify(history));
      setPurchaseHistory(history);
    } catch { /* silently ignore */ }
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
          stats={[
            {
              label: totalItems === 0 ? (t('shopping.shoppingList') || 'Kosár') : `${totalItems} termék`,
              value: (
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <ShoppingCart style={{ width: 16, height: 16, color: 'white' }} />
                  {totalItems > 0 && (
                    <span style={{
                      position: 'absolute', top: -6, right: -6,
                      background: '#ef4444', color: 'white',
                      borderRadius: '999px', fontSize: 9, fontWeight: 700,
                      minWidth: 14, height: 14, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '0 2px', lineHeight: 1,
                    }}>
                      {totalItems}
                    </span>
                  )}
                </div>
              ),
              isAction: true,
              onClick: () => {},
            },
            {
              label: 'Bolt & Szállítás',
              value: <Store style={{ width: 16, height: 16, color: 'white' }} />,
              isAction: true,
              onClick: () => { setSettingsOpen(true); hapticFeedback('light'); },
            },
          ]}
        />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Search bar + store filter */}
        {(() => {
          const ALL_STORES: StoreName[] = ['Kaufland', 'Lidl', 'Penny', 'Carrefour', 'Auchan', 'Profi'];
          return (
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-3 sm:px-4 lg:px-6 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className={`flex-1 flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-all ${
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
                {/* Filter button */}
                <button
                  onClick={() => { setStoreFilterOpen(v => !v); hapticFeedback('light'); }}
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all relative"
                  style={{
                    background: selectedStores.length > 0 ? '#0d9488' : '#f3f4f6',
                    border: '2px solid',
                    borderColor: selectedStores.length > 0 ? '#0d9488' : '#e5e7eb',
                  }}
                >
                  <SlidersHorizontal
                    className="w-4 h-4"
                    style={{ color: selectedStores.length > 0 ? 'white' : '#6b7280' }}
                  />
                  {selectedStores.length > 0 && (
                    <span style={{
                      position: 'absolute', top: -5, right: -5,
                      background: '#ef4444', color: 'white',
                      borderRadius: '999px', fontSize: 9, fontWeight: 700,
                      minWidth: 14, height: 14, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '0 2px', lineHeight: 1,
                      border: '1.5px solid white',
                    }}>
                      {selectedStores.length}
                    </span>
                  )}
                </button>
              </div>

            </div>
          );
        })()}

        {/* Store filter — centered overlay */}
        <AnimatePresence>
          {storeFilterOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-5"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setStoreFilterOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 12 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <span className="text-base font-bold text-gray-900">Üzlet szűrő</span>
                  <button
                    onClick={() => setStoreFilterOpen(false)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                {/* Store list */}
                <div className="flex flex-col gap-2 px-4 pb-4">
                  {(['Kaufland', 'Lidl', 'Penny', 'Carrefour', 'Auchan', 'Profi'] as StoreName[]).map((store) => {
                    const active = selectedStores.includes(store);
                    return (
                      <button
                        key={store}
                        onClick={() => toggleStore(store)}
                        className="flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all"
                        style={{
                          background: active ? '#f0fdfa' : '#f9fafb',
                          border: '1.5px solid',
                          borderColor: active ? '#0d9488' : '#e5e7eb',
                        }}
                      >
                        <span className="text-sm font-semibold" style={{ color: active ? '#0d9488' : '#374151' }}>
                          {store}
                        </span>
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                          style={{
                            borderColor: active ? '#0d9488' : '#d1d5db',
                            background: active ? '#0d9488' : 'transparent',
                          }}
                        >
                          {active && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                  {selectedStores.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedStores([]);
                        setSetting('storeFilter', '[]').catch(() => {});
                        hapticFeedback('light');
                      }}
                      className="mt-1 w-full py-3 rounded-xl text-sm font-semibold"
                      style={{ background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fecaca' }}
                    >
                      Összes törlése
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recommended carousel — shown when not searching */}
        {!searchQuery && browseProducts.length > 0 && (
          <div className="py-3">
            <div className="flex items-center gap-2 px-4 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs text-gray-500" style={{ fontWeight: 600 }}>
                {t('shopping.recommended')}
              </span>
            </div>
            {/* Peek carousel: center card full, ~20% of adjacent cards visible on each side */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                paddingLeft: '18%',
                paddingRight: '18%',
                paddingBottom: 8,
                scrollbarWidth: 'none',
              }}
            >
              <AnimatePresence initial={false}>
                {browseProducts
                  .filter(p => !isInList(p.id))
                  .map((product) => {
                    const tapped = tappedCarouselId === product.id;
                    return (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{
                          opacity: 0, scale: 0.3,
                          x: 120, y: -180,
                          transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] },
                        }}
                        style={{ scrollSnapAlign: 'center', flexShrink: 0, width: '60%' }}
                      >
                        <div
                          className="bg-white rounded-xl flex flex-col items-center p-3"
                          style={{ border: `2px solid ${tapped ? '#0d9488' : '#e5e7eb'}` }}
                        >
                          <div className="text-2xl mb-1">{product.image}</div>
                          <div className="text-xs font-semibold text-gray-800 text-center leading-snug truncate w-full">{product.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{product.store}</div>
                          <div className="text-xs font-bold text-teal-600 mt-0.5 mb-2">{product.price.toFixed(2)} lei</div>
                          <button
                            onClick={() => {
                              if (tapped) return;
                              setTappedCarouselId(product.id);
                              hapticFeedback('medium');
                              setTimeout(() => {
                                addProduct(product);
                                setTappedCarouselId(null);
                              }, 380);
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                            style={{
                              background: tapped ? '#0d9488' : 'transparent',
                              border: `2px solid ${tapped ? '#0d9488' : '#d1d5db'}`,
                            }}
                          >
                            {tapped && <Plus className="w-4 h-4 text-white" />}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Search results grid */}
        <AnimatePresence>
          {searchQuery && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-3 sm:px-4 lg:px-6 py-3"
            >
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500" style={{ fontWeight: 600 }}>
                  {t('shopping.searchResults')}
                </span>
                <span className="text-xs text-gray-400 ml-auto">{searchResults.length} {t('shopping.product')}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {searchResults.map((product) => {
                  const alreadyAdded = isInList(product.id);
                  const tapped = tappedCarouselId === product.id;
                  return (
                    <div
                      key={product.id}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                        alreadyAdded ? "border-green-200 bg-green-50 opacity-60" : tapped ? "border-teal-400 bg-white" : "border-gray-100 bg-white"
                      }`}
                    >
                      <div className="text-2xl mb-1">{product.image}</div>
                      <div className="text-xs font-semibold text-gray-800 text-center truncate w-full">{product.name}</div>
                      <div className="text-xs text-gray-400 truncate w-full text-center">{product.store}</div>
                      <div className="text-xs font-bold text-teal-600 mb-2">{product.price.toFixed(2)} lei</div>
                      {!alreadyAdded ? (
                        <button
                          onClick={() => {
                            if (tapped) return;
                            setTappedCarouselId(product.id);
                            hapticFeedback('medium');
                            setTimeout(() => {
                              addProduct(product);
                              setTappedCarouselId(null);
                            }, 350);
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                          style={{
                            background: tapped ? '#0d9488' : 'transparent',
                            border: `2px solid ${tapped ? '#0d9488' : '#d1d5db'}`,
                          }}
                        >
                          {tapped && <Plus className="w-4 h-4 text-white" />}
                        </button>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>


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
              <AnimatePresence initial={false}>
              {[...shoppingItems]
                .sort((a, b) => Number(a.checked) - Number(b.checked))
                .map((item) => (
                <motion.div
                  key={item.product.id}
                  layout
                  initial={{ opacity: 0, y: -16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
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
                </motion.div>
              ))}
              </AnimatePresence>
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
                <span className="text-sm font-bold text-teal-700">{t('shopping.fridgeRunningLow')}</span>
                <span className="ml-auto text-2xs bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full font-semibold">{t('shopping.comingSoon')}</span>
              </div>
              {shoppingSettings.fridgePaired ? (
                <p className="text-xs text-teal-600 leading-relaxed">
                  <span className="font-semibold">{shoppingSettings.fridgeName}</span>{' '}{t('shopping.fridgePairedDesc')}
                </p>
              ) : (
                <p className="text-xs text-teal-600 leading-relaxed">
                  {t('shopping.fridgeUnpairedDesc')}{' '}
                  <button
                    onClick={() => { setSettingsOpen(true); hapticFeedback('light'); }}
                    className="font-bold underline underline-offset-2"
                  >
                    {t('shopping.pairFridgeLink')}
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
