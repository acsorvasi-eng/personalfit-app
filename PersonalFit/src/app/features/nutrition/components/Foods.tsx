/**
 * ====================================================================
 * Foods — Food Catalog (Full-Screen)
 * ====================================================================
 * The "Étkezés" tab: shows ALL foods the user can eat, extracted from
 * the 4-week diet plan PDF uploaded in the Profile section.
 *
 * Data sources:
 *   1. usePlanFoods() — real food data from IndexedDB (plan-linked or all DB foods)
 *   2. foodDatabase fallback — hardcoded 68 foods from mealData.ts
 *
 * Features:
 *   - Branded gradient header with food count
 *   - Search bar for filtering by name/description
 *   - Category tabs: Összes / Fehérje / Tejtermék / Szénhidrát / Zsír / Hüvelyes / Magvak / Zöldség / Tojás
 *   - Compact food cards with macro breakdown
 *   - Tap card → full-screen food detail with benefits & nutrition
 *   - Haptic feedback on interactions
 *   - Localized (HU/EN/RO) via t() calls
 */

// Web Speech API globals (runtime-provided in the browser)
declare var SpeechRecognition: any;
declare var webkitSpeechRecognition: any;
declare var SpeechRecognitionEvent: any;

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search,
  X,
  Heart,
  Sparkles,
  Info,
  Flame,
  UtensilsCrossed,
  Plus,
  Mic,
  Type,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanFoods, type PlanFood } from "../../../hooks/usePlanData";
import { useAppData } from "../../../hooks/useAppData";
import { EmptyState } from "../../../components/EmptyState";
import { DataUploadSheet } from "../../../components/DataUploadSheet";
import { useLanguage, type LanguageCode } from "../../../contexts/LanguageContext";
import { foodDatabase, type Food } from "../../../data/mealData";
import { useFavoriteFoods } from "../../../hooks/useFavoriteFoods";
import {
  cleanupCorruptedAIFoods,
  createFoodsBatch,
  updateFood,
  inferSemanticCategoryFromName,
  semanticCategoryToFoodCategory,
  migrateFruitCategories,
} from "../../../backend/services/FoodCatalogService";
import { PageHeader } from "../../../components/PageHeader";
import { TabFilter } from "../../../components/TabFilter";
import { translateFoodName } from "../../../utils/foodTranslations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../components/ui/dialog";
import { DSMButton } from "../../../components/dsm";
import type { FoodCategory, FoodSource } from "../../../backend/models";
import { toast } from "sonner";
import { GenerateMealPlanSheet } from "./GenerateMealPlanSheet";
import { getUserProfile } from "../../../backend/services/UserProfileService";

type AddFoodChipStatus = "pending" | "valid" | "invalid";
type AddFoodChip = {
  id: string;
  raw: string;
  name: string;
  status: AddFoodChipStatus;
  calories_per_100g?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
  /** Category string returned by the API (e.g. "Fehérje") */
  apiCategory?: string;
  lookupFailed?: boolean;
};

// ═══════════════════════════════════════════════════════════════
// CATEGORY MAPPING
// ═══════════════════════════════════════════════════════════════

/** Map raw category labels from usePlanFoods to translation keys */
const CATEGORY_I18N_MAP: Record<string, string> = {
  Osszes: "foods.all",
  Feherje: "foods.catProtein",
  Tejtermek: "foods.catDairy",
  "Komplex szenhidrat": "foods.catComplexCarbs",
  "Egeszseges zsir": "foods.catHealthyFat",
  Huvelyes: "foods.catLegumes",
  Mag: "foods.catSeeds",
  Zoldseg: "foods.catVegetables",
  Gyumolcs: "foods.catFruit",
  Tojas: "foods.catEgg",
};

/** Category icons — only used in detail sheet header */


const SkeletonFoodItem = () => (
  <div className="animate-pulse flex items-center justify-between p-4 mb-2 rounded-2xl border border-gray-100 bg-gray-50">
    <div className="flex-1 mr-4">
      <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-20" />
    </div>
    <div className="h-4 bg-gray-200 rounded w-16" />
  </div>
);

// ═══════════════════════════════════════════════════════════════
// FALLBACK: Convert foodDatabase to PlanFood[]
// ═══════════════════════════════════════════════════════════════

/** Map display category → raw category key (same as usePlanFoods uses) */
const DISPLAY_TO_RAW_MAP: Record<string, string> = {
  "Fehérje": "Feherje",
  "Tejtermék": "Tejtermek",
  "Komplex szénhidrát": "Komplex szenhidrat",
  "Egészséges zsír": "Egeszseges zsir",
  "Hüvelyes": "Huvelyes",
  "Mag": "Mag",
  "Zöldség": "Zoldseg",
  "Tojás": "Tojas",
};

function convertFoodDBtoPlainFoods(db: Food[]): {
  foods: PlanFood[];
  categories: string[];
} {
  const categorySet = new Set<string>();
  const foods: PlanFood[] = db.map((f) => {
    const rawCat = DISPLAY_TO_RAW_MAP[f.category] || f.category;
    categorySet.add(rawCat);
    return {
      id: f.id,
      name: f.name,
      description: f.description,
      category: rawCat,
      calories: parseInt(f.calories) || 0,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      benefits: f.benefits || [],
      suitableFor: f.suitableFor || [],
      source: "system",
    };
  });
  return {
    foods,
    categories: ["Osszes", ...Array.from(categorySet).sort()],
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Get macro bar widths as percentages */
function getMacroPercentages(food: PlanFood) {
  const total = food.protein + food.carbs + food.fat;
  if (total === 0) return { protein: 33, carbs: 33, fat: 34 };
  return {
    protein: Math.round((food.protein / total) * 100),
    carbs: Math.round((food.carbs / total) * 100),
    fat: Math.round((food.fat / total) * 100),
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function Foods() {
  const appData = useAppData();
  const {
    foods: planFoods,
    categories: planCategories,
    isLoading: planLoading,
    refresh: refreshPlanFoods,
  } = usePlanFoods();
  const { t, language } = useLanguage();
  const { isFavorite, toggleFavorite, favoriteCount } = useFavoriteFoods();

  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Osszes");
  const [selectedFood, setSelectedFood] = useState<PlanFood | null>(null);
  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(2000);

  // Add Food dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [typedFoods, setTypedFoods] = useState("");
  const [voiceFoods, setVoiceFoods] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const lastVoiceTextRef = useRef<string>("");
  const hiddenTextInputRef = useRef<HTMLInputElement | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [chips, setChips] = useState<AddFoodChip[]>([]);
  const [addingFoods, setAddingFoods] = useState(false);
  const [addResultMessage, setAddResultMessage] = useState<string | null>(null);
  // Ref to prevent concurrent fetch requests (state update is async, ref is synchronous)
  const fetchInProgressRef = useRef(false);
  // Ref to run the 0-kcal auto-repair only once per mount
  const repairDoneRef = useRef(false);

  // ── Auto-repair: silently fix 0-kcal foods already in the DB ──
  useEffect(() => {
    if (planLoading || repairDoneRef.current) return;
    const zeroFoods = planFoods.filter(f => (f.calories ?? 0) === 0 && f.name);
    if (zeroFoods.length === 0) return;
    repairDoneRef.current = true;
    const names = zeroFoods.map(f => f.name);
    console.log("[AutoRepair] Fixing 0-kcal foods:", names);
    fetch("/api/lookup-foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foods: names }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(async (data) => {
        if (!data) return;
        const results: any[] = data?.result || data?.foods || [];
        if (!Array.isArray(results)) return;
        let fixed = 0;
        for (let i = 0; i < zeroFoods.length; i++) {
          const result = results[i];
          if (!result || result.valid === false || !result.calories_per_100g) continue;
          try {
            await updateFood(zeroFoods[i].id, {
              calories_per_100g: Number(result.calories_per_100g) || 0,
              protein_per_100g: Number(result.protein_g) || 0,
              fat_per_100g: Number(result.fat_g) || 0,
              carbs_per_100g: Number(result.carbs_g) || 0,
            });
            fixed++;
          } catch { /* ignore individual failures */ }
        }
        if (fixed > 0) refreshPlanFoods();
      })
      .catch(() => { /* silent fail — don't disturb the user */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planLoading]);

  const addTokenAsChip = useCallback((token: string) => {
    const value = token.trim();
    if (!value) return;
    const lower = value.toLowerCase();
    const fillerWords = ["ennyi", "ott", "hozzá", "hozza", "add", "hozzád", "hozzad"];
    if (fillerWords.includes(lower)) return;
    setLookupError(null);
    setChips(prev => {
      if (prev.some(c => c.raw.toLowerCase() === lower)) return prev;
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      return [...prev, { id, raw: value, name: value, status: "pending", lookupFailed: false }];
    });
  }, []);

  // Background nutrition lookup — fires whenever chips change, debounced via ref guard
  useEffect(() => {
    const pending = chips.filter(c => c.status === "pending" && !c.lookupFailed);
    if (pending.length === 0 || fetchInProgressRef.current) return;

    // Snapshot the pending chip ids so we can match by id after the async call
    const pendingSnapshot = pending.map(c => ({ id: c.id, raw: c.raw }));

    fetchInProgressRef.current = true;
    setLookupLoading(true);
    setLookupError(null);

    const names = pendingSnapshot.map(c => c.raw);
    console.log("[AddFood] Nutrition lookup for:", names);

    fetch("/api/lookup-foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foods: names }),
    })
      .then(async resp => {
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          console.warn("[AddFood] HTTP error:", err);
          throw new Error("HTTP " + resp.status);
        }
        return resp.json();
      })
      .then(data => {
        const foods: any[] = data && (data.result || data.foods || []);
        if (!Array.isArray(foods) || foods.length === 0) {
          throw new Error("empty response");
        }
        // Match by position using snapshot ids — immune to concurrent state changes
        setChips(prev =>
          prev.map(chip => {
            const snapshotIdx = pendingSnapshot.findIndex(s => s.id === chip.id);
            if (snapshotIdx === -1 || chip.status !== "pending") return chip;
            const match = foods[snapshotIdx];
            if (!match || match.valid === false) {
              return { ...chip, status: "invalid" as const, lookupFailed: true };
            }
            return {
              ...chip,
              status: "valid" as const,
              lookupFailed: false,
              name: match.name || chip.raw,
              calories_per_100g: Number(match.calories_per_100g) || 0,
              protein_g: Number(match.protein_g) || 0,
              fat_g: Number(match.fat_g) || 0,
              carbs_g: Number(match.carbs_g) || 0,
              apiCategory: match.category || undefined,
            };
          })
        );
      })
      .catch(e => {
        console.error("[AddFood] Lookup failed:", e);
        setLookupError("Nem sikerült betölteni a tápértékeket. Próbáld újra.");
        setChips(prev =>
          prev.map(chip =>
            pendingSnapshot.some(s => s.id === chip.id)
              ? { ...chip, lookupFailed: true }
              : chip
          )
        );
      })
      .finally(() => {
        fetchInProgressRef.current = false;
        setLookupLoading(false);
      });
  }, [chips]);

  const retryLookup = useCallback(() => {
    setLookupError(null);
    setChips(prev =>
      prev.map(chip =>
        chip.status === "pending" && chip.lookupFailed
          ? { ...chip, lookupFailed: false }
          : chip
      )
    );
  }, []);

  // One-time cleanup: remove corrupted AI foods + reclassify fruits stored as vegetables.
  useEffect(() => {
    (async () => {
      try {
        const removed = await cleanupCorruptedAIFoods();
        if (removed > 0) {
          console.log(`[Foods] Törölt korrupt AI ételek száma: ${removed}`);
        }
        await migrateFruitCategories();
      } catch (err) {
        console.warn("[Foods] cleanup hiba:", err);
      }
    })();
  }, []);

  // Reload foods explicitly when quick-mode upload finishes.
  useEffect(() => {
    const handler = () => {
      console.log("[Foods] foodsUpdated event received — reloading foods");
      refreshPlanFoods();
    };
    window.addEventListener("foodsUpdated", handler);
    return () => window.removeEventListener("foodsUpdated", handler);
  }, [refreshPlanFoods]);

  // Load daily calorie target from user profile
  useEffect(() => {
    getUserProfile().then((profile) => {
      if (profile?.calorieTarget) {
        setDailyCalorieTarget(profile.calorieTarget);
      }
    }).catch(() => {});
  }, []);

  // Decide data source:
  //   - If van aktív tervhez kötött étel (planFoods) → azt használjuk
  //   - Ha nincs aktív terv → ténylegesen üres lista (EmptyState fog megjelenni)
  //   - Ha van aktív terv, de valamiért nincs planFoods → fallback a hardcoded foodDatabase-re
  const { foods, categories } = useMemo(() => {
    if (planFoods.length > 0) {
      return { foods: planFoods, categories: planCategories };
    }

    if (!appData.hasActivePlan) {
      // Nincs aktív terv: ne mutassunk hardcoded étellistát, az üres állapot
      // kommunikálja, hogy előbb tervet kell feltölteni.
      return { foods: [] as PlanFood[], categories: ["Osszes"] };
    }

    // Aktív terv van, de nincs betöltött étel → biztonságos fallback a hardcoded adatbázisra
    return convertFoodDBtoPlainFoods(foodDatabase);
  }, [planFoods, planCategories, appData.hasActivePlan]);

  // Build localized tabs — inject Kedvencek after Összes
  const tabs = useMemo(() => {
    const baseTabs = categories.map((cat) => ({
      key: cat,
      label: t(CATEGORY_I18N_MAP[cat] || cat),
    }));
    // Insert favorites tab right after "Osszes"
    const favTab = { key: "__favorites__", label: t("foods.favorites") };
    const osszesIdx = baseTabs.findIndex((t) => t.key === "Osszes");
    if (osszesIdx >= 0) {
      baseTabs.splice(osszesIdx + 1, 0, favTab);
    } else {
      baseTabs.unshift(favTab);
    }
    return baseTabs;
  }, [categories, t]);

  // Filter by tab and search
  const filteredFoods = useMemo(() => {
    let result = foods;

    // Category filter
    if (activeTab === "__favorites__") {
      result = result.filter((f) => isFavorite(f.id));
    } else if (activeTab !== "Osszes") {
      result = result.filter((f) => f.category === activeTab);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.benefits.some((b) => b.toLowerCase().includes(q))
      );
    }

    return result;
  }, [foods, activeTab, searchQuery, isFavorite]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Osszes: foods.length, "__favorites__": favoriteCount };
    for (const f of foods) {
      counts[f.category] = (counts[f.category] || 0) + 1;
    }
    return counts;
  }, [foods, favoriteCount]);

  // ─── Empty state guard ──────────────────────────────────────
  if (
    !appData.isLoading &&
    !appData.hasActivePlan &&
    foods.length === 0 &&
    !planLoading
  ) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <DataUploadSheet
          open={uploadSheetOpen}
          onClose={() => setUploadSheetOpen(false)}
          onComplete={() => appData.refresh()}
        />
        <EmptyState
          variant="foods"
          onUpload={() => setUploadSheetOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <DataUploadSheet
        open={uploadSheetOpen}
        onClose={() => setUploadSheetOpen(false)}
        onComplete={() => appData.refresh()}
      />

      {/* ═══ Header — full-bleed gradient, shared PageHeader DSM component ═══ */}
      <div className="flex-shrink-0">
        <PageHeader
          title={t("foods.title")}
          subtitle={t("foods.foodCount").replace("{n}", String(foods.length))}
          gradientFrom="from-blue-400"
          gradientVia="via-blue-500"
          gradientTo="to-blue-600"
          stats={[
            { label: t("foods.all"), value: foods.length },
            {
              label: t("foods.addFoodLabel"),
              value: "+",
              isAction: true,
              onClick: () => {
                setAddDialogOpen(true);
                setAddResultMessage(null);
                setLookupError(null);
              },
            },
            {
              label: t("foods.aiDietLabel"),
              value: "✨",
              isAction: true,
              onClick: () => setGenerateSheetOpen(true),
            },
          ]}
        />
      </div>

      {/* ═══ Category Tabs — uses shared TabFilter DSM component ═══ */}
      <div className="flex-shrink-0 px-4 pt-3 pb-1">
        <TabFilter
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== "Osszes") setSearchQuery("");
          }}
          size="md"
        />
      </div>

      {/* ═══ Search — visible only on Összes tab ═══ */}
      {activeTab === "Osszes" && (
        <div className="flex-shrink-0 px-4 pt-2 pb-1">
          <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
            <Search className="w-4 h-4 text-gray-400 ml-3 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("foods.search")}
              className="w-full bg-transparent py-2.5 pl-2.5 pr-3 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none"
              style={{ fontWeight: 500 }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-200/60 rounded-full mr-1.5 shrink-0"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ Food List ═══ */}
      <div className="flex-1 overflow-y-auto px-4 pb-3">
        {planLoading ? (
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <SkeletonFoodItem key={i} />
            ))}
          </div>
        ) : filteredFoods.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Search className="w-7 h-7 text-gray-300" />
            </div>
            <p
              className="text-sm text-gray-500"
              style={{ fontWeight: 600 }}
            >
              {t("foods.noResults")}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-[13px] text-[var(--color-primary-500)]"
                style={{ fontWeight: 600 }}
              >
                {t("foods.all")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {filteredFoods.map((food, idx) => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(idx * 0.03, 0.3),
                  duration: 0.25,
                  ease: "easeOut",
                }}
              >
                <FoodCard
                  food={food}
                  t={t}
                  isFavorite={isFavorite(food.id)}
                    language={language as LanguageCode}
                    showCategoryLabel={activeTab === "Osszes"}
                  onToggleFavorite={() => {
                    if (navigator.vibrate) navigator.vibrate([10, 20]);
                    toggleFavorite(food.id);
                  }}
                  onTap={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    setSelectedFood(food);
                  }}
                />
              </motion.div>
            ))}
            <div className="h-4" />
          </div>
        )}
      </div>

      {/* ═══ Food Detail Bottom Sheet ═══ */}
      <AnimatePresence>
        {selectedFood && (
          <FoodDetailSheet
            food={selectedFood}
            t={t}
            isFavorite={isFavorite(selectedFood.id)}
            onToggleFavorite={() => {
              if (navigator.vibrate) navigator.vibrate([10, 20]);
              toggleFavorite(selectedFood.id);
            }}
            onClose={() => setSelectedFood(null)}
          />
        )}
      </AnimatePresence>

      {/* ═══ Generate Meal Plan Sheet ═══ */}
      <GenerateMealPlanSheet
        open={generateSheetOpen}
        onClose={() => setGenerateSheetOpen(false)}
        foods={planFoods}
        dailyCalorieTarget={dailyCalorieTarget}
        onSaved={() => {
          refreshPlanFoods();
          appData.refresh();
        }}
      />

      {/* ═══ Add Food Dialog ═══ */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) {
          setIsListening(false);
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }
      }}>
        <DialogContent className="max-w-md sm:max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-5 sm:p-6 space-y-4">
          <DialogHeader>
            <DialogTitle>Étel hozzáadása</DialogTitle>
            <DialogDescription>
              Írd be vagy mondd be az ételek nevét (pl. pisztráng, dió, jégsaláta...).{" "}
              A rendszer lekéri a valós tápértékeket 100g-ra.
            </DialogDescription>
          </DialogHeader>

          {/* MICROPHONE BUTTON – primary input ABOVE chips */}
          <div className="mt-2 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => {
                console.log("[AddFood][Voice] Mic button tapped. isListening =", isListening);
                if (isListening && recognitionRef.current) {
                  console.log("[AddFood][Voice] Stopping existing recognition session");
                  recognitionRef.current.stop();
                  setIsListening(false);
                  return;
                }
                if (typeof window === "undefined") return;
                const SR: any =
                  (window as any).webkitSpeechRecognition ||
                  (window as any).SpeechRecognition;
                if (!SR) {
                  setLookupError(t("foods.voiceNotSupported"));
                  console.warn("[AddFood][Voice] SpeechRecognition not supported in this browser");
                  return;
                }
                console.log("[AddFood][Voice] Initializing SpeechRecognition");
                const rec = new SR();
                recognitionRef.current = rec;
                rec.lang = "hu-HU";
                rec.continuous = true;
                rec.interimResults = true;
                rec.onresult = (event: any) => {
                  console.log("[AddFood][Voice] onresult fired", {
                    resultCount: event.results.length,
                  });
                  // Építsük fel a teljes szöveget referenciaként (későbbi bővítéshez)
                  let combined = "";
                  for (let i = 0; i < event.results.length; i++) {
                    combined += event.results[i][0].transcript + " ";
                  }
                  const newText = combined.trim();
                  setVoiceFoods(newText);

                  // Minden végleges rész-eredményből chip-eket készítünk
                  for (let i = 0; i < event.results.length; i++) {
                    const res = event.results[i];
                    if (res.isFinal) {
                      const phrase = res[0].transcript || "";
                      console.log("[AddFood][Voice] Final result phrase:", phrase);
                      phrase
                        .split(/[,;\n\s]+/)
                        .map((t: string) => t.trim())
                        .filter(Boolean)
                        .forEach((token: string) => {
                          console.log("[AddFood][Voice] Creating chip from token:", token);
                          addTokenAsChip(token);
                        });
                    }
                  }

                  const last = event.results[event.results.length - 1];
                  if (last.isFinal) {
                    setIsListening(false);
                  }
                };
                rec.onerror = (err: any) => {
                  console.error("[AddFood][Voice] SpeechRecognition error:", err);
                  setIsListening(false);
                };
                rec.onend = () => {
                  console.log("[AddFood][Voice] SpeechRecognition ended");
                  setIsListening(false);
                };
                setIsListening(true);
                console.log("[AddFood][Voice] Starting SpeechRecognition");
                rec.start();
              }}
              className={`flex items-center justify-center w-16 h-16 rounded-full border-4 ${
                isListening
                  ? "border-red-400 bg-red-500/90 animate-pulse"
                  : "border-blue-300 bg-blue-500/90"
              } shadow-lg text-white`}
            >
              <Mic className="w-7 h-7" />
            </button>
            <span className="text-[11px] text-gray-500">
              {isListening ? t("foods.voiceRecording") : t("foods.voiceInstruction")}
            </span>
          </div>

          {/* CHIP INPUT AREA – the whole container behaves as an input */}
          <div
            className="mt-3 min-h-[72px] rounded-2xl border-2 border-gray-200 bg-white px-3 py-2 flex flex-wrap items-center gap-2 cursor-text"
            onClick={() => {
              if (hiddenTextInputRef.current) {
                hiddenTextInputRef.current.focus();
              }
            }}
          >
            {chips.map((chip) => {
              const isValid = chip.status === "valid";
              const isPending = chip.status === "pending";
              const isInvalid = chip.status === "invalid";
              const baseClasses =
                "px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border";
              const styleClasses = isValid
                ? "bg-primary/10 border-primary text-primary"
                : isInvalid
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-gray-50 border-gray-200 text-gray-600";
              return (
                <div key={chip.id} className={`${baseClasses} ${styleClasses}`}>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold max-w-[140px] truncate leading-tight">
                      {chip.name}
                    </span>
                    {isValid && chip.calories_per_100g != null && (
                      <span className="text-[10px] opacity-70 leading-tight">
                        {chip.calories_per_100g} kcal · {chip.protein_g}g P
                      </span>
                    )}
                    {isInvalid && (
                      <span className="text-[10px] opacity-70 leading-tight">nem ismert élelmiszer</span>
                    )}
                  </div>
                  {isPending && !chip.lookupFailed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />
                  )}
                  {isPending && chip.lookupFailed && (
                    <span className="text-amber-500 text-xs flex-shrink-0" title="Nem sikerült betölteni">⚠</span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setChips(prev => prev.filter(c => c.id !== chip.id))
                    }
                    className="w-4 h-4 flex items-center justify-center rounded-full bg-black/10 text-2xs flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <input
              ref={hiddenTextInputRef}
              autoFocus
              value={typedFoods}
              onChange={(e) => setTypedFoods(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const value = typedFoods.trim();
                  if (!value) return;
                  value
                    .split(/[,;\n]+/)
                    .map((t: string) => t.trim())
                    .filter(Boolean)
                    .forEach((token: string) => addTokenAsChip(token));
                  setTypedFoods("");
                }
              }}
              className="bg-transparent border-none outline-none text-sm min-w-[40px]"
              placeholder={chips.length === 0 ? t("foods.voicePlaceholder") : ""}
            />
          </div>

          <div className="space-y-2 mt-3">
            {lookupLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin flex-shrink-0" />
                Azonosítás folyamatban...
              </div>
            )}
            {lookupError && !lookupLoading && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-red-500 flex-1">{lookupError}</p>
                {chips.some(c => c.status === "pending" && c.lookupFailed) && (
                  <button
                    type="button"
                    onClick={retryLookup}
                    className="text-xs text-indigo-600 font-semibold underline underline-offset-2 whitespace-nowrap"
                  >
                    Újra
                  </button>
                )}
              </div>
            )}
            {addResultMessage && (
              <p className="text-xs text-primary">{addResultMessage}</p>
            )}
          </div>

          <div className="mt-3">
            <DSMButton
              variant="gradient"
              size="sm"
              fullWidth
              disabled={lookupLoading || !chips.some(c => c.status === "valid")}
              loading={addingFoods || lookupLoading}
              onClick={async () => {
                // Only save valid chips — pending/invalid are excluded
                const chipsToSave = chips.filter(c => c.status === "valid");
                if (chipsToSave.length === 0) return;
                try {
                  setAddingFoods(true);
                  setAddResultMessage(null);
                  console.log("[AddFood] Saving chips (valid + pending):", chipsToSave);
                  const inputs = chipsToSave.map((chip) => {
                    // Prefer category from the API lookup; fall back to local inference
                    const API_CAT_MAP: Record<string, FoodCategory> = {
                      'Fehérje': 'Feherje', 'Zsír': 'Egeszseges_zsir', 'Szénhidrát': 'Komplex_szenhidrat',
                      'Tejtermék': 'Tejtermek', 'Zöldség': 'Zoldseg', 'Gyümölcs': 'Gyumolcs',
                    };
                    const cat: FoodCategory = chip.apiCategory
                      ? (API_CAT_MAP[chip.apiCategory] ?? semanticCategoryToFoodCategory(inferSemanticCategoryFromName(chip.name)))
                      : semanticCategoryToFoodCategory(inferSemanticCategoryFromName(chip.name));
                    const source: FoodSource = "user_uploaded";
                    return {
                      name: chip.name,
                      description: "Felhasználó által hozzáadott étel",
                      category: cat,
                      calories_per_100g: chip.calories_per_100g ?? 0,
                      protein_per_100g: chip.protein_g ?? 0,
                      carbs_per_100g: chip.carbs_g ?? 0,
                      fat_per_100g: chip.fat_g ?? 0,
                      source,
                    };
                  });
                  const result = await createFoodsBatch(inputs as any, { upsertNutrition: true, upsertSource: true });
                  console.log("[AddFood] createFoodsBatch result:", result);
                  // All valid chips are considered processed (created + nutrition-updated in skipped)
                  const processedCount = chipsToSave.length;
                  setAddResultMessage(t("foods.foodAdded").replace("{n}", String(processedCount)));
                  toast.success(t("foods.foodAddedToast").replace("{n}", String(processedCount)));
                  appData.refresh();
                  refreshPlanFoods();
                  setAddDialogOpen(false);
                  setChips([]);
                } catch (e: any) {
                  setLookupError(e.message || t("foods.foodSaveFailed"));
                } finally {
                  setAddingFoods(false);
                }
              }}
            >
              {t("foods.addButton")}
            </DSMButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FOOD CARD (compact, in list)
// ═══════════════════════════════════════════════════════════════

function FoodCard({
  food,
  t,
  isFavorite,
  onToggleFavorite,
  onTap,
  showCategoryLabel,
  language,
}: {
  food: PlanFood;
  t: (key: string) => string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onTap: () => void;
  showCategoryLabel: boolean;
  language: LanguageCode;
}) {
  const catLabel = t(CATEGORY_I18N_MAP[food.category] || food.category);

  return (
    <button
      onClick={onTap}
      className="w-full bg-white rounded-2xl border border-gray-100 px-4 py-3.5 text-left active:scale-[0.98] transition-all group hover:shadow-sm hover:border-gray-200"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Name + category label */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-gray-800 truncate leading-snug">
            {translateFoodName(food.name, language)}
          </h3>
          {showCategoryLabel && (
            <span className="text-[12px] font-normal text-gray-500 mt-0.5 block">
              {catLabel}
            </span>
          )}
        </div>

        {/* Right: calories (right-aligned) → heart (last) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right min-w-[48px]">
            <span className="text-[14px] font-bold text-gray-800">{food.calories}</span>
            <span className="text-[11px] text-gray-400 ml-0.5">kcal</span>
          </div>
          <motion.div
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-50 cursor-pointer"
          >
            <Heart
              className={`w-[18px] h-[18px] transition-colors ${
                isFavorite
                  ? "text-rose-500 fill-rose-500"
                  : "text-gray-400"
              }`}
            />
          </motion.div>
        </div>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// FOOD DETAIL BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════

function FoodDetailSheet({
  food,
  t,
  isFavorite,
  onToggleFavorite,
  onClose,
}: {
  food: PlanFood;
  t: (key: string) => string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const catLabel = t(CATEGORY_I18N_MAP[food.category] || food.category);
  const macros = getMacroPercentages(food);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed inset-0 z-50 bg-[#f7f8fa] flex flex-col"
      >
        {/* ─── Header ─── */}
        <div className="flex-shrink-0 bg-gradient-to-br from-primary to-primary/80 px-5 pt-5 pb-6 relative overflow-hidden">
          {/* decorative circles */}
          <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/10 rounded-full" />
          <div className="absolute top-4 right-20 w-16 h-16 bg-white/5 rounded-full" />
          <div className="absolute bottom-2 -left-4 w-24 h-24 bg-white/8 rounded-full" />

          <div className="relative z-10">
            {/* Top row: icon + name + actions */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-[52px] h-[52px] rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0 text-2xl">
                  🥗
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-[20px] font-bold text-white leading-tight truncate">
                    {food.name}
                  </h1>
                  <span className="text-[12px] text-white/70 font-medium">
                    {catLabel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={onToggleFavorite}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                    isFavorite
                      ? "bg-rose-500 border-rose-400"
                      : "bg-white/20 border-white/25 hover:bg-white/30"
                  }`}
                  aria-label={t("foods.favorites")}
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      isFavorite ? "text-white fill-white" : "text-white"
                    }`}
                  />
                </motion.button>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white/20 border border-white/25 hover:bg-white/30 flex items-center justify-center transition-colors"
                  aria-label={t("foods.close")}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Calorie + per100g row */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white/15 border border-white/20 rounded-xl px-3 py-2">
                <Flame className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <div className="text-[10px] text-white/60 font-medium leading-none">{t("foods.calories")}</div>
                  <div className="text-[15px] font-bold text-white leading-tight">{food.calories} kcal</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-3 py-2">
                <Info className="w-3.5 h-3.5 text-white/60 shrink-0" />
                <span className="text-[11px] text-white/60 font-medium">{t("foods.nutritionPer100g")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 overflow-y-auto" ref={contentRef}>
          <div className="px-4 py-5 space-y-5">

            {/* Description */}
            {food.description && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="text-[13px] text-gray-600 font-normal leading-relaxed">
                  {food.description}
                </p>
              </div>
            )}

            {/* ── Macro Breakdown ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                  {t("foods.macroRatio")}
                </span>
              </div>

              {/* Macro bar */}
              <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden flex mb-5">
                <motion.div
                  className="h-full bg-emerald-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${macros.protein}%` }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
                <motion.div
                  className="h-full bg-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${macros.carbs}%` }}
                  transition={{ duration: 0.55, ease: "easeOut", delay: 0.06 }}
                />
                <motion.div
                  className="h-full bg-primary/70"
                  initial={{ width: 0 }}
                  animate={{ width: `${macros.fat}%` }}
                  transition={{ duration: 0.55, ease: "easeOut", delay: 0.12 }}
                />
              </div>

              {/* Macro cards */}
              <div className="grid grid-cols-3 gap-2.5">
                {/* Protein */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      {t("foods.protein")}
                    </span>
                  </div>
                  <div className="text-[20px] font-bold text-gray-800 leading-none">
                    {food.protein}<span className="text-[11px] font-medium text-gray-400 ml-0.5">g</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">{macros.protein}%</div>
                </div>

                {/* Carbs */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      {t("foods.carbs")}
                    </span>
                  </div>
                  <div className="text-[20px] font-bold text-gray-800 leading-none">
                    {food.carbs}<span className="text-[11px] font-medium text-gray-400 ml-0.5">g</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">{macros.carbs}%</div>
                </div>

                {/* Fat */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      {t("foods.fat")}
                    </span>
                  </div>
                  <div className="text-[20px] font-bold text-gray-800 leading-none">
                    {food.fat}<span className="text-[11px] font-medium text-gray-400 ml-0.5">g</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">{macros.fat}%</div>
                </div>
              </div>
            </div>

            {/* ── Benefits ── */}
            {food.benefits.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                    {t("foods.benefitsLabel")}
                  </span>
                </div>
                <div className="space-y-2">
                  {food.benefits.map((benefit, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.22 }}
                      className="flex items-start gap-3 py-2.5 px-3.5 rounded-xl bg-primary/5 border border-primary/10"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-[13px] text-gray-700 font-normal leading-snug">
                        {benefit}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Suitable For ── */}
            {food.suitableFor.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <UtensilsCrossed className="w-4 h-4 text-gray-400" />
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                    {t("foods.suitableForLabel")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {food.suitableFor.map((meal, i) => (
                    <span
                      key={i}
                      className="text-[12px] font-medium text-primary bg-primary/8 border border-primary/15 px-3 py-1.5 rounded-lg"
                    >
                      {meal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Footer note ── */}
            <p className="text-[11px] text-gray-400 text-center font-normal pb-2">
              {t("foods.fromMealPlan")}
            </p>

            <div className="h-[env(safe-area-inset-bottom,16px)]" />
          </div>
        </div>
      </motion.div>
    </>
  );
}