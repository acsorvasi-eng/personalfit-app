import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Plus, Trash2, Sparkles, Check, Camera, Mic, X, Loader2, AlertCircle, Search, ChevronDown, ChefHat, Package, MicOff } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { Product, productDatabase, calculateNutrition } from "../data/productDatabase";
import { Recipe, recipeDatabase, calculateRecipeNutrition, searchRecipes, isLikelyRecipe, SmartFoodItem, CookingVariant, cookingMethods, searchSmartFoods, searchRecipesEnhanced, calculateSmartFoodNutrition } from "../data/recipeDatabase";
import { PageHeader } from "./PageHeader";
import { useCalorieTracker } from "../hooks/useCalorieTracker";
import { recognizeFoodFromText, searchFoodKnowledge, AIRecognitionResult, FoodItem, searchCompoundFoods, CompoundFood, CompoundFoodVariant, calculateCompoundFoodNutrition } from "../data/aiFoodKnowledge";

interface LoggedMeal {
  id: string;
  name: string;
  type: 'product' | 'recipe';
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
  image: string;
}

interface RecognizedFood {
  name: string;
  confidence: number;
  estimatedWeight: string;
}

type SearchResultType = 'product' | 'recipe' | 'mixed';

export function LogMeal() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const { consumed, target } = useCalorieTracker();
  const [mealInput, setMealInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [servingsInput, setServingsInput] = useState("1");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(`loggedMeals_${today}`);
    if (stored) {
      try { return JSON.parse(stored); } catch { return []; }
    }
    return [];
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [recognizedFood, setRecognizedFood] = useState<RecognizedFood | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ═══ SmartFood cooking method selector state ═══
  const [selectedSmartFood, setSelectedSmartFood] = useState<SmartFoodItem | null>(null);
  const [selectedCookingMethod, setSelectedCookingMethod] = useState<CookingVariant | null>(null);
  const [smartPortionInput, setSmartPortionInput] = useState("");

  // ═══ CompoundFood variant selector state ═══
  const [selectedCompoundFood, setSelectedCompoundFood] = useState<CompoundFood | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<CompoundFoodVariant | null>(null);
  const [compoundPortionInput, setCompoundPortionInput] = useState("");

  // Nutrition calculated for compound food variant
  const calculatedCompoundNutrition = useMemo(() => {
    if (!selectedVariant || !compoundPortionInput) return null;
    const portion = parseFloat(compoundPortionInput);
    if (isNaN(portion) || portion <= 0) return null;
    return calculateCompoundFoodNutrition(selectedVariant, portion);
  }, [selectedVariant, compoundPortionInput]);

  // Nutrition calculated for smart food + cooking method
  const calculatedSmartNutrition = useMemo(() => {
    if (!selectedSmartFood || !selectedCookingMethod || !smartPortionInput) return null;
    const portion = parseFloat(smartPortionInput);
    if (isNaN(portion) || portion <= 0) return null;
    return calculateSmartFoodNutrition(selectedSmartFood, selectedCookingMethod, portion);
  }, [selectedSmartFood, selectedCookingMethod, smartPortionInput]);

  // AI Recognition result for compound foods
  const aiRecognition = useMemo((): AIRecognitionResult | null => {
    if (!mealInput.trim() || mealInput.trim().length < 3) return null;
    // Don't show AI recognition if a product or recipe is already selected
    if (selectedProduct || selectedRecipe) return null;
    return recognizeFoodFromText(mealInput);
  }, [mealInput, selectedProduct, selectedRecipe]);

  // Smart search - detect if looking for recipe or product
  const searchResults = useMemo(() => {
    // Start searching from 1 character for instant recognition
    if (!mealInput.trim() || mealInput.trim().length < 1) {
      return { type: 'mixed' as SearchResultType, products: [], recipes: [], aiFoods: [] as FoodItem[], smartFoods: [] as SmartFoodItem[], compoundFoods: [] as CompoundFood[] };
    }

    const query = mealInput.toLowerCase().trim();

    // Enhanced diacritics-free recipe search
    const matchedRecipes = searchRecipesEnhanced(query);

    // Enhanced product search with alias support
    const matchedProducts = productDatabase.filter(product => {
      const q = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ő/g, 'o').replace(/ű/g, 'u');
      const pName = product.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ő/g, 'o').replace(/ű/g, 'u').toLowerCase();
      const pBrand = product.brand.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ő/g, 'o').replace(/ű/g, 'u').toLowerCase();
      const pAliases = (product.aliases || []).map(a => a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ő/g, 'o').replace(/ű/g, 'u').toLowerCase());
      return pName.includes(q) || pBrand.includes(q) || pAliases.some(a => a.includes(q));
    }).slice(0, 20);

    // Search AI food knowledge
    const matchedAiFoods = query.length >= 2 ? searchFoodKnowledge(query) : [];

    // Search SmartFoods (cooking method items) - highest priority
    const matchedSmartFoods = searchSmartFoods(query);

    // Search CompoundFoods (variant items) - top priority alongside SmartFoods
    const matchedCompoundFoods = query.length >= 2 ? searchCompoundFoods(query) : [];

    const resultType: SearchResultType = 'mixed';

    return {
      type: resultType,
      recipes: matchedRecipes,
      products: matchedProducts,
      aiFoods: matchedAiFoods,
      smartFoods: matchedSmartFoods,
      compoundFoods: matchedCompoundFoods,
    };
  }, [mealInput]);

  // Add AI recognized food as a combined meal
  const addAIRecognizedMeal = () => {
    if (!aiRecognition) return;

    const newMeal: LoggedMeal = {
      id: Date.now().toString(),
      name: aiRecognition.combinedName,
      type: 'recipe',
      quantity: 1,
      calories: aiRecognition.totalNutrition.calories,
      protein: aiRecognition.totalNutrition.protein,
      carbs: aiRecognition.totalNutrition.carbs,
      fat: aiRecognition.totalNutrition.fat,
      timestamp: Date.now(),
      image: aiRecognition.combinedImage
    };

    setLoggedMeals(prev => [...prev, newMeal]);
    resetForm();
    showSuccessAnimation();
  };

  // Select an AI food item from search dropdown
  const selectAIFood = (food: FoodItem) => {
    // Set meal input to the food name and show AI recognition
    setMealInput(food.names[0]);
    setShowDropdown(false);
    setSelectedProduct(null);
    setSelectedRecipe(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Persist logged meals to localStorage whenever they change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`loggedMeals_${today}`, JSON.stringify(loggedMeals));
    const totalCalories = loggedMeals.reduce((sum, meal) => sum + meal.calories, 0);
    localStorage.setItem('totalConsumedCalories', totalCalories.toString());
  }, [loggedMeals]);

  // Auto-calculate calories for product
  const calculatedProductNutrition = useMemo(() => {
    if (!selectedProduct || !quantityInput) return null;
    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty <= 0) return null;
    return calculateNutrition(selectedProduct, qty);
  }, [selectedProduct, quantityInput]);

  // Auto-calculate calories for recipe
  const calculatedRecipeNutrition = useMemo(() => {
    if (!selectedRecipe || !servingsInput) return null;
    const servings = parseFloat(servingsInput);
    if (isNaN(servings) || servings <= 0) return null;
    return calculateRecipeNutrition(selectedRecipe, servings);
  }, [selectedRecipe, servingsInput]);

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedRecipe(null);
    setMealInput(product.name);
    setQuantityInput(product.defaultQuantity.toString());
    setShowDropdown(false);
  };

  const selectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setSelectedProduct(null);
    setMealInput(recipe.name);
    setServingsInput("1");
    setShowDropdown(false);
  };

  // Add meal to log
  const handleAddMeal = () => {
    if (selectedProduct && calculatedProductNutrition) {
      const newMeal: LoggedMeal = {
        id: Date.now().toString(),
        name: selectedProduct.name,
        type: 'product',
        quantity: parseFloat(quantityInput),
        calories: calculatedProductNutrition.calories,
        protein: calculatedProductNutrition.protein,
        carbs: calculatedProductNutrition.carbs,
        fat: calculatedProductNutrition.fat,
        timestamp: Date.now(),
        image: selectedProduct.image
      };

      setLoggedMeals(prev => [...prev, newMeal]);
      resetForm();
      showSuccessAnimation();
    } else if (selectedRecipe && calculatedRecipeNutrition) {
      const newMeal: LoggedMeal = {
        id: Date.now().toString(),
        name: selectedRecipe.name,
        type: 'recipe',
        quantity: parseFloat(servingsInput),
        calories: calculatedRecipeNutrition.calories,
        protein: calculatedRecipeNutrition.protein,
        carbs: calculatedRecipeNutrition.carbs,
        fat: calculatedRecipeNutrition.fat,
        timestamp: Date.now(),
        image: selectedRecipe.image
      };

      setLoggedMeals(prev => [...prev, newMeal]);
      resetForm();
      showSuccessAnimation();
    }
  };

  const resetForm = () => {
    setMealInput("");
    setQuantityInput("");
    setServingsInput("1");
    setSelectedProduct(null);
    setSelectedRecipe(null);
    setSelectedSmartFood(null);
    setSelectedCookingMethod(null);
    setSmartPortionInput("");
    setSelectedCompoundFood(null);
    setSelectedVariant(null);
    setCompoundPortionInput("");
  };

  const showSuccessAnimation = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const removeMeal = (id: string) => {
    setLoggedMeals(prev => prev.filter(meal => meal.id !== id));
  };

  // Calculate total nutrition
  const totalNutrition = useMemo(() => {
    return loggedMeals.reduce((acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [loggedMeals]);

  // Simulate AI image recognition
  const recognizeFood = async (imageFile: File): Promise<RecognizedFood | null> => {
    setIsRecognizing(true);
    setRecognitionError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const mockRecognitions: RecognizedFood[] = [
        { name: "Csirkemell sütve", confidence: 0.92, estimatedWeight: "150g" },
        { name: "Rizs főve", confidence: 0.88, estimatedWeight: "200g" },
        { name: "Brokkoli párolt", confidence: 0.85, estimatedWeight: "100g" },
      ];

      const result = mockRecognitions[Math.floor(Math.random() * mockRecognitions.length)];
      setRecognizedFood(result);
      setMealInput(result.name);
      return result;

    } catch (error) {
      setRecognitionError(t("logMealExt.errorRecognize"));
      return null;
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setRecognitionError(t("logMealExt.errorImageOnly"));
      return;
    }

    await recognizeFood(file);
  };

  // Voice recognition - enhanced with smart matching
  const [voiceMatches, setVoiceMatches] = useState<{ recipes: Recipe[]; products: Product[] } | null>(null);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);

  // Smart voice match - find recipes and products from transcript
  const processVoiceTranscript = useCallback((transcript: string) => {
    setIsVoiceProcessing(true);
    setVoiceTranscript(transcript);
    
    const lower = transcript.toLowerCase().trim();
    
    // Split transcript by common Hungarian connectors to find multiple items
    const connectors = /\s+(és|meg|plusz|with|mellé|hozzá|valamint|továbbá|is)\s+/gi;
    const parts = lower.split(connectors).filter(p => p.trim().length > 2 && !['és', 'meg', 'plusz', 'with', 'mellé', 'hozzá', 'valamint', 'továbbá', 'is'].includes(p.trim()));
    
    // If no connectors found, treat the whole transcript as one query
    const queries = parts.length > 0 ? parts : [lower];
    
    const matchedRecipes: Recipe[] = [];
    const matchedProducts: Product[] = [];
    const seenRecipeIds = new Set<string>();
    const seenProductIds = new Set<string>();
    
    for (const query of queries) {
      const q = query.trim();
      if (q.length < 2) continue;
      
      // Search recipes
      const recipes = recipeDatabase.filter(recipe => {
        const rName = recipe.name.toLowerCase();
        return rName.includes(q) || q.includes(rName) || 
          q.split(/\s+/).some(word => word.length > 3 && rName.includes(word));
      });
      for (const r of recipes) {
        if (!seenRecipeIds.has(r.id)) {
          seenRecipeIds.add(r.id);
          matchedRecipes.push(r);
        }
      }
      
      // Search products
      const products = productDatabase.filter(product => {
        const pName = product.name.toLowerCase();
        return pName.includes(q) || q.includes(pName) ||
          q.split(/\s+/).some(word => word.length > 3 && pName.includes(word));
      });
      for (const p of products) {
        if (!seenProductIds.has(p.id)) {
          seenProductIds.add(p.id);
          matchedProducts.push(p);
        }
      }
    }
    
    // Also try the full transcript as-is
    const fullRecipes = recipeDatabase.filter(r => {
      const rName = r.name.toLowerCase();
      return rName.includes(lower) || lower.includes(rName) ||
        lower.split(/\s+/).some(word => word.length > 3 && rName.includes(word));
    });
    for (const r of fullRecipes) {
      if (!seenRecipeIds.has(r.id)) {
        seenRecipeIds.add(r.id);
        matchedRecipes.push(r);
      }
    }
    
    const fullProducts = productDatabase.filter(p => {
      const pName = p.name.toLowerCase();
      return pName.includes(lower) || lower.includes(pName) ||
        lower.split(/\s+/).some(word => word.length > 3 && pName.includes(word));
    });
    for (const p of fullProducts) {
      if (!seenProductIds.has(p.id)) {
        seenProductIds.add(p.id);
        matchedProducts.push(p);
      }
    }
    
    if (matchedRecipes.length > 0 || matchedProducts.length > 0) {
      setVoiceMatches({ recipes: matchedRecipes.slice(0, 5), products: matchedProducts.slice(0, 10) });
      
      // If exactly one recipe matches, auto-select it
      if (matchedRecipes.length === 1 && matchedProducts.length === 0) {
        selectRecipe(matchedRecipes[0]);
        setVoiceMatches(null);
      }
      // If exactly one product matches, auto-select it
      else if (matchedProducts.length === 1 && matchedRecipes.length === 0) {
        selectProduct(matchedProducts[0]);
        setVoiceMatches(null);
      }
    } else {
      // No matches, just put the text in the input and show dropdown
      setShowDropdown(true);
      setVoiceMatches(null);
    }
    
    setIsVoiceProcessing(false);
  }, []);

  // Add all voice-matched recipes as a combined meal
  const addVoiceCombinedMeal = () => {
    if (!voiceMatches) return;
    
    let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0;
    const names: string[] = [];
    const emojis: string[] = [];
    
    for (const recipe of voiceMatches.recipes) {
      const nutrition = calculateRecipeNutrition(recipe, 1);
      totalCal += nutrition.calories;
      totalPro += nutrition.protein;
      totalCarb += nutrition.carbs;
      totalFat += nutrition.fat;
      names.push(recipe.name);
      emojis.push(recipe.image);
    }
    
    for (const product of voiceMatches.products) {
      const nutrition = calculateNutrition(product, product.defaultQuantity);
      totalCal += nutrition.calories;
      totalPro += nutrition.protein;
      totalCarb += nutrition.carbs;
      totalFat += nutrition.fat;
      names.push(product.name);
      emojis.push(product.image);
    }
    
    const newMeal: LoggedMeal = {
      id: Date.now().toString(),
      name: names.join(' + '),
      type: 'recipe',
      quantity: 1,
      calories: totalCal,
      protein: totalPro,
      carbs: totalCarb,
      fat: totalFat,
      timestamp: Date.now(),
      image: emojis[0] || '🍽️'
    };
    
    setLoggedMeals(prev => [...prev, newMeal]);
    setVoiceMatches(null);
    setVoiceTranscript(null);
    resetForm();
    showSuccessAnimation();
  };

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setRecognitionError(t("logMealExt.errorVoiceNotSupported"));
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = locale;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setRecognitionError(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMealInput(transcript);
      setShowDropdown(true);
      processVoiceTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      setRecognitionError(t("logMealExt.errorVoiceRecognition"));
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-blue-100 dark:from-[#121212] dark:via-[#121212] dark:to-[#1E1E1E]">
      {/* Header */}
      <PageHeader
        iconElement={
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
        }
        title={t("logMealExt.headerTitle")}
        subtitle={t("logMealExt.headerSubtitle")}
        gradientFrom="from-blue-400"
        gradientVia="via-emerald-400"
        gradientTo="to-teal-500"
        action={
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
            <Sparkles className="w-5 h-5 text-yellow-300" />
          </div>
        }
        stats={[
          {
            label: `${consumed} / ${target} kcal`,
            value: consumed,
            suffix: "kcal"
          },
          {
            label: t("logMealExt.loggedFood"),
            value: loggedMeals.length,
            suffix: t("logMealExt.pcs")
          }
        ]}
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search Input */}
        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-lg p-6 space-y-4" ref={dropdownRef}>
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">{t("logMealExt.whatDidYouEat")}</h2>
          </div>

          {/* Main Search Input */}
          <div className="relative">
            <input
              type="text"
              value={mealInput}
              onChange={(e) => {
                setMealInput(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder={t("logMealExt.searchPlaceholder")}
              className="w-full px-4 py-3 border-2 border-blue-300 dark:border-blue-500/30 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all font-medium bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100"
            />

            {/* Dropdown Results */}
            {showDropdown && mealInput.length >= 1 && (searchResults.compoundFoods.length > 0 || searchResults.smartFoods.length > 0 || searchResults.recipes.length > 0 || searchResults.products.length > 0 || searchResults.aiFoods.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1E1E1E] border-2 border-blue-200 dark:border-blue-500/30 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50">

                {/* ═══ Compound Foods — Recipe Variant Items (HIGHEST PRIORITY) ═══ */}
                {searchResults.compoundFoods.length > 0 && (
                  <div className="border-b-2 border-emerald-200 dark:border-emerald-500/30">
                    <div className="sticky top-0 bg-gradient-to-r from-emerald-50 to-teal-100 dark:from-emerald-500/10 dark:to-teal-500/10 px-4 py-2 flex items-center gap-2 z-10">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase">
                        AI Variánsok ({searchResults.compoundFoods.length})
                      </span>
                    </div>
                    {searchResults.compoundFoods.slice(0, 5).map((cf) => {
                      const defVariant = cf.variants.find(v => v.id === cf.defaultVariantId) || cf.variants[0];
                      const minCal = Math.min(...cf.variants.map(v => v.per100.calories));
                      const maxCal = Math.max(...cf.variants.map(v => v.per100.calories));
                      return (
                        <button
                          key={cf.id}
                          onClick={() => {
                            setSelectedCompoundFood(cf);
                            setSelectedVariant(null);
                            setCompoundPortionInput(defVariant.defaultPortionG.toString());
                            setSelectedProduct(null);
                            setSelectedRecipe(null);
                            setSelectedSmartFood(null);
                            setMealInput(cf.baseName);
                            setShowDropdown(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border-b border-gray-100 dark:border-[#2a2a2a] last:border-b-0 transition-all text-left flex items-center gap-3"
                        >
                          <div className="text-3xl flex-shrink-0">{cf.image}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{cf.baseName}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{cf.category} · {cf.region}</div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                                {cf.variants.length} variáns
                              </span>
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">
                                {minCal}–{maxCal} kcal/100g
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold">
                              🧠 AI
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ═══ Smart Foods — Cooking Method Items (TOP PRIORITY) ═══ */}
                {searchResults.smartFoods.length > 0 && (
                  <div className="border-b-2 border-amber-200">
                    <div className="sticky top-0 bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-500/10 dark:to-orange-500/10 px-4 py-2 flex items-center gap-2 z-10">
                      <span className="text-sm">🍳</span>
                      <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase">{t("logMealExt.howPrepared")} ({searchResults.smartFoods.length})</span>
                    </div>
                    {searchResults.smartFoods.slice(0, 8).map((food) => {
                      const grilledMethod = cookingMethods.find(m => m.id === 'grilled')!;
                      const friedMethod = cookingMethods.find(m => m.id === 'deep-fried')!;
                      const baseNutr = calculateSmartFoodNutrition(food, grilledMethod, food.defaultPortionG);
                      const friedNutr = calculateSmartFoodNutrition(food, friedMethod, food.defaultPortionG);
                      return (
                        <button
                          key={food.id}
                          onClick={() => {
                            setSelectedSmartFood(food);
                            setSelectedCookingMethod(null);
                            setSmartPortionInput(food.defaultPortionG.toString());
                            setSelectedProduct(null);
                            setSelectedRecipe(null);
                            setMealInput(food.name);
                            setShowDropdown(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-b border-gray-100 dark:border-[#2a2a2a] last:border-b-0 transition-all text-left flex items-center gap-3"
                        >
                          <div className="text-3xl flex-shrink-0">{food.image}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{food.name}</span>
                              {food.isMealPlan && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">{t("logMealExt.inMealPlan")}</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{food.category} · {food.region}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] bg-green-100 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded font-bold">
                                🔥 {baseNutr.calories} kcal
                              </span>
                              <span className="text-[10px] text-gray-400">→</span>
                              <span className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-bold">
                                🫕 {friedNutr.calories} kcal
                              </span>
                              <span className="text-[10px] text-gray-400">/{food.defaultPortionG}g</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold">
                              {t("logMealExt.cookingBadge")}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Recipes Section */}
                {searchResults.recipes.length > 0 && (
                  <div className="border-b border-gray-200 dark:border-[#2a2a2a]">
                    <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-500/10 dark:to-orange-500/15 px-4 py-2 flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-xs font-black text-orange-700 dark:text-orange-300 uppercase">{t("logMealExt.recipesSection")} ({searchResults.recipes.length})</span>
                    </div>
                    {searchResults.recipes.map((recipe) => {
                      const nutrition = calculateRecipeNutrition(recipe, 1);
                      return (
                        <button
                          key={recipe.id}
                          onClick={() => selectRecipe(recipe)}
                          className="w-full px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-500/10 border-b border-gray-100 dark:border-[#2a2a2a] last:border-b-0 transition-all text-left flex items-center gap-3"
                        >
                          {/* Recipe Icon */}
                          <div className="text-3xl flex-shrink-0">{recipe.image}</div>

                          {/* Recipe Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{recipe.name}</div>
                            <div className="text-xs text-gray-500">{recipe.category}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full font-bold">
                                {nutrition.calories} {t("logMealExt.kcalPerServing")}
                              </span>
                              <span className="text-xs text-gray-400">{recipe.portionSize}g</span>
                            </div>
                          </div>

                          {/* AI Badge */}
                          <div className="flex-shrink-0">
                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Products Section */}
                {searchResults.products.length > 0 && (
                  <div>
                    <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/15 px-4 py-2 flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase">{t("logMealExt.productsSection")} ({searchResults.products.length})</span>
                    </div>
                    {searchResults.products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => selectProduct(product)}
                        className="w-full px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 border-b border-gray-100 dark:border-[#2a2a2a] last:border-b-0 transition-all text-left flex items-center gap-3"
                      >
                        {/* Product Icon */}
                        <div className="text-3xl flex-shrink-0">{product.image}</div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{product.name}</div>
                          <div className="text-xs text-gray-600 truncate">{product.brand}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                              {product.store}
                            </span>
                            <span className="text-xs text-gray-500">{product.caloriesPer100} kcal/100{product.unit}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* AI Foods Section */}
                {searchResults.aiFoods.length > 0 && (
                  <div>
                    <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 px-4 py-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase">{t("logMealExt.aiFoodsSection")} ({searchResults.aiFoods.length})</span>
                    </div>
                    {searchResults.aiFoods.map((food) => (
                      <button
                        key={food.id}
                        onClick={() => selectAIFood(food)}
                        className="w-full px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-500/10 border-b border-gray-100 dark:border-[#2a2a2a] last:border-b-0 transition-all text-left flex items-center gap-3"
                      >
                        {/* Food Icon */}
                        <div className="text-3xl flex-shrink-0">{food.image}</div>

                        {/* Food Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{food.names[0]}</div>
                          <div className="text-xs text-gray-500">{food.category}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">
                              {food.portionLabel}
                            </span>
                            <span className="text-xs text-gray-500">{food.per100.calories} kcal/100{food.unit}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {searchResults.compoundFoods.length === 0 && searchResults.smartFoods.length === 0 && searchResults.recipes.length === 0 && searchResults.products.length === 0 && searchResults.aiFoods.length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="font-medium">{t("logMealExt.noResults")}</p>
                    <p className="text-sm">{t("logMealExt.tryDifferentKeyword")}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Features */}
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isRecognizing}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isRecognizing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("logMealExt.analyzing")}
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  {t("logMealExt.photo")}
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
              className={`flex-1 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-teal-500'} text-white px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5" />
                  {t("logMealExt.stopListening")}
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  {t("logMealExt.voice")}
                </>
              )}
            </button>
          </div>

          {/* Voice Processing Indicator */}
          {isVoiceProcessing && (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">{t("logMealExt.searchingFromVoice")}</p>
            </div>
          )}

          {/* Voice Transcript Display */}
          {voiceTranscript && !isVoiceProcessing && (
            <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">„{voiceTranscript}"</p>
              </div>
              <button onClick={() => { setVoiceTranscript(null); setVoiceMatches(null); }} className="p-1 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-lg">
                <X className="w-4 h-4 text-purple-400" />
              </button>
            </div>
          )}

          {/* Voice Matched Results - Combined Panel */}
          {voiceMatches && (voiceMatches.recipes.length + voiceMatches.products.length > 1) && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 border-2 border-purple-200 dark:border-purple-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-bold text-purple-900 dark:text-purple-200">{t("logMealExt.recognizedFoods")}</h3>
                </div>
                <span className="text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full font-bold">
                  {voiceMatches.recipes.length + voiceMatches.products.length} {t("logMealExt.matches")}
                </span>
              </div>

              {/* Matched Recipes */}
              {voiceMatches.recipes.map((recipe) => {
                const nutrition = calculateRecipeNutrition(recipe, 1);
                return (
                  <div key={recipe.id} className="bg-white dark:bg-[#1E1E1E] rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    <div className="text-2xl">{recipe.image}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{recipe.name}</div>
                      <div className="text-xs text-gray-500">{recipe.category} • {nutrition.calories} {t("logMealExt.kcalPerServing")}</div>
                    </div>
                    <button
                      onClick={() => { selectRecipe(recipe); setVoiceMatches(null); setVoiceTranscript(null); }}
                      className="text-xs bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-200 dark:hover:bg-orange-500/30 transition-all"
                    >
                      {t("logMealExt.selectBtn")}
                    </button>
                  </div>
                );
              })}

              {/* Matched Products */}
              {voiceMatches.products.slice(0, 5).map((product) => (
                <div key={product.id} className="bg-white dark:bg-[#1E1E1E] rounded-xl p-3 flex items-center gap-3 shadow-sm">
                  <div className="text-2xl">{product.image}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.brand} • {product.caloriesPer100} kcal/100{product.unit}</div>
                  </div>
                  <button
                    onClick={() => { selectProduct(product); setVoiceMatches(null); setVoiceTranscript(null); }}
                    className="text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-all"
                  >
                    {t("logMealExt.selectBtn")}
                  </button>
                </div>
              ))}

              {/* Combined Add Button */}
              {(voiceMatches.recipes.length + voiceMatches.products.length) >= 2 && (
                <div className="pt-2 border-t border-purple-200 dark:border-purple-500/30">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-3 text-white mb-2">
                    <div className="text-xs font-bold mb-1 opacity-80">{t("logMealExt.totalCaloriesSummarized")}</div>
                    <div className="text-2xl font-black">
                      {(() => {
                        let total = 0;
                        voiceMatches.recipes.forEach(r => { total += calculateRecipeNutrition(r, 1).calories; });
                        voiceMatches.products.forEach(p => { total += calculateNutrition(p, p.defaultQuantity).calories; });
                        return total;
                      })()}
                      <span className="text-sm font-semibold ml-1 opacity-80">kcal</span>
                    </div>
                  </div>
                  <button
                    onClick={addVoiceCombinedMeal}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-xl font-black hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    {t("logMealExt.addCombined")}
                  </button>
                </div>
              )}
            </div>
          )}

          {recognitionError && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{recognitionError}</p>
            </div>
          )}
        </div>

        {/* AI Recognition Breakdown Panel - shows when compound food is recognized */}
        {aiRecognition && !selectedProduct && !selectedRecipe && !selectedSmartFood && !selectedCompoundFood && !showDropdown && (
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500 px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <h3 className="text-white font-black">{t("logMealExt.aiRecognition")}</h3>
                </div>
                <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full font-bold backdrop-blur-sm">
                  {aiRecognition.components.length} {t("logMealExt.component")}
                </span>
              </div>
              <p className="text-white/80 text-xs">
                {t("logMealExt.recognizedLabel")}: <span className="text-white font-bold">„{mealInput}"</span>
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Component Breakdown */}
              <div className="space-y-3">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t("logMealExt.componentBreakdown")}</div>
                {aiRecognition.components.map((component, idx) => (
                  <div key={component.food.id} className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-500/10 dark:to-violet-500/10 border-2 border-purple-200 dark:border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">{component.food.image}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-gray-900 dark:text-gray-100">{component.food.names[0]}</div>
                        <div className="text-xs text-purple-600 dark:text-purple-400 font-bold">{component.food.category}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {component.portionLabel} ({component.portion}{component.food.unit})
                        </div>
                      </div>
                      <div className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-lg text-xs font-black">
                        {component.nutrition.calories} kcal
                      </div>
                    </div>
                    {/* Per-component nutrition */}
                    <div className="grid grid-cols-4 gap-2 bg-white/80 dark:bg-white/10 rounded-lg p-2.5">
                      <div className="text-center">
                        <div className="text-sm text-gray-900 dark:text-gray-100 font-black">{component.nutrition.calories}</div>
                        <div className="text-[10px] text-gray-500">kcal</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-900 dark:text-gray-100 font-black">{component.nutrition.protein}</div>
                        <div className="text-[10px] text-gray-500">{t("logMealExt.protein")}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-900 dark:text-gray-100 font-black">{component.nutrition.carbs}</div>
                        <div className="text-[10px] text-gray-500">{t("logMealExt.carbs")}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-900 dark:text-gray-100 font-black">{component.nutrition.fat}</div>
                        <div className="text-[10px] text-gray-500">{t("logMealExt.fat")}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Combined Total */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black">{t("logMealExt.totalNutrition")}</span>
                  </div>
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-black">{aiRecognition.totalNutrition.calories}</div>
                    <div className="text-xs opacity-80">kcal</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{aiRecognition.totalNutrition.protein}</div>
                    <div className="text-xs opacity-80">{t("logMealExt.protein")}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{aiRecognition.totalNutrition.carbs}</div>
                    <div className="text-xs opacity-80">{t("logMealExt.carbs")}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{aiRecognition.totalNutrition.fat}</div>
                    <div className="text-xs opacity-80">{t("logMealExt.fat")}</div>
                  </div>
                </div>
              </div>

              {/* Add Button */}
              <button
                onClick={addAIRecognizedMeal}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl font-black text-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus className="w-6 h-6" />
                {t("logMeal.addMeal")}
              </button>
            </div>
          </div>
        )}

        {/* ═══ COMPOUND FOOD VARIANT SELECTOR — AI Variant Panel ═══ */}
        {selectedCompoundFood && !selectedProduct && !selectedRecipe && !selectedSmartFood && (
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-5 py-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-4xl">{selectedCompoundFood.image}</div>
                <div>
                  <h3 className="text-white font-black text-lg">{selectedCompoundFood.baseName}</h3>
                  <p className="text-white/80 text-xs">{selectedCompoundFood.category} · {selectedCompoundFood.region}</p>
                </div>
                <button
                  onClick={() => { setSelectedCompoundFood(null); setSelectedVariant(null); }}
                  className="ml-auto w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="text-white/90 text-xs">
                {selectedCompoundFood.description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold backdrop-blur-sm">
                  🧠 {selectedCompoundFood.variants.length} variáns elemezve
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Variant Selector Title */}
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Válaszd ki a variánst
              </div>

              {/* Variant Cards */}
              <div className="space-y-2">
                {selectedCompoundFood.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => {
                        setSelectedVariant(variant);
                        setCompoundPortionInput(variant.defaultPortionG.toString());
                      }}
                      className={`w-full p-3.5 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-500/30'
                          : 'border-gray-200 dark:border-[#333] bg-white dark:bg-[#252525] hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-gray-900 dark:text-gray-100 font-bold">{variant.variantName}</span>
                            {isSelected && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">{variant.description}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {variant.tags.map(tag => (
                              <span key={tag} className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {variant.keyIngredients.slice(0, 4).map(ing => (
                              <span key={ing} className="text-[9px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                                {ing}
                              </span>
                            ))}
                            {variant.keyIngredients.length > 4 && (
                              <span className="text-[9px] text-gray-400">+{variant.keyIngredients.length - 4}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className={`text-lg font-black ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                            {variant.per100.calories}
                          </div>
                          <div className="text-[10px] text-gray-400">kcal/100g</div>
                          <div className="flex gap-1.5 mt-1 text-[9px] text-gray-400">
                            <span>F:{variant.per100.protein}g</span>
                            <span>Sz:{variant.per100.carbs}g</span>
                            <span>Zs:{variant.per100.fat}g</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Portion Input + Add Button */}
              {selectedVariant && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Adag (g)
                    </label>
                    <input
                      type="number"
                      value={compoundPortionInput}
                      onChange={(e) => setCompoundPortionInput(e.target.value)}
                      placeholder={`pl. ${selectedVariant.defaultPortionG}`}
                      className="w-full px-4 py-3 border-2 border-emerald-300 dark:border-emerald-500/30 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 transition-all font-bold text-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-400 mt-1">{selectedVariant.portionLabel}</p>
                  </div>

                  {/* Calculated Nutrition */}
                  {calculatedCompoundNutrition && (
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm">
                          {selectedVariant.variantName}
                        </span>
                        <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <div className="text-2xl font-black">{calculatedCompoundNutrition.calories}</div>
                          <div className="text-xs opacity-80">kcal</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black">{calculatedCompoundNutrition.protein}</div>
                          <div className="text-xs opacity-80">{t("logMealExt.protein")}</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black">{calculatedCompoundNutrition.carbs}</div>
                          <div className="text-xs opacity-80">{t("logMealExt.carbs")}</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black">{calculatedCompoundNutrition.fat}</div>
                          <div className="text-xs opacity-80">{t("logMealExt.fat")}</div>
                        </div>
                      </div>
                      <div className="mt-2 text-center text-xs opacity-80">
                        {compoundPortionInput}g · {selectedVariant.variantName}
                      </div>
                    </div>
                  )}

                  {/* Add Button */}
                  <button
                    onClick={() => {
                      if (!calculatedCompoundNutrition || !selectedCompoundFood || !selectedVariant) return;
                      const newMeal: LoggedMeal = {
                        id: Date.now().toString(),
                        name: `${selectedCompoundFood.baseName} (${selectedVariant.variantName})`,
                        type: 'recipe',
                        quantity: parseFloat(compoundPortionInput),
                        calories: calculatedCompoundNutrition.calories,
                        protein: calculatedCompoundNutrition.protein,
                        carbs: calculatedCompoundNutrition.carbs,
                        fat: calculatedCompoundNutrition.fat,
                        timestamp: Date.now(),
                        image: selectedCompoundFood.image,
                      };
                      setLoggedMeals(prev => [...prev, newMeal]);
                      resetForm();
                      showSuccessAnimation();
                    }}
                    disabled={!calculatedCompoundNutrition}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4 rounded-xl font-black text-lg hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus className="w-6 h-6" />
                    {t("logMeal.addMeal")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ COOKING METHOD SELECTOR — SmartFood Panel ═══ */}
        {selectedSmartFood && !selectedProduct && !selectedRecipe && !selectedCompoundFood && (
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-5 py-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-4xl">{selectedSmartFood.image}</div>
                <div>
                  <h3 className="text-white font-black text-lg">{selectedSmartFood.name}</h3>
                  <p className="text-white/80 text-xs">{selectedSmartFood.category} · {selectedSmartFood.region}</p>
                </div>
              </div>
              <p className="text-white/90 text-xs font-bold">
                {t("logMealExt.cookingMethodDesc")}
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Cooking Method Cards */}
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t("logMealExt.chooseCookingMethod")}</div>
              <div className="grid grid-cols-2 gap-2">
                {selectedSmartFood.applicableMethods.map((methodId) => {
                  const method = cookingMethods.find(m => m.id === methodId);
                  if (!method) return null;
                  const portion = parseFloat(smartPortionInput) || selectedSmartFood.defaultPortionG;
                  const nutr = calculateSmartFoodNutrition(selectedSmartFood, method, portion);
                  const isSelected = selectedCookingMethod?.id === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedCookingMethod(method)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/15 shadow-md ring-2 ring-orange-200 dark:ring-orange-500/30'
                          : 'border-gray-200 bg-white dark:bg-[#252525] hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-500/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xl">{method.methodIcon}</span>
                        <span className="text-xs text-gray-900 dark:text-gray-100 font-bold">{method.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-black ${isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-gray-800 dark:text-gray-200'}`}>
                          {nutr.calories}
                        </span>
                        <span className="text-[10px] text-gray-500">kcal</span>
                      </div>
                      <div className="flex gap-2 mt-1 text-[9px] text-gray-400">
                        <span>{t("logMealExt.proteinShort")}:{nutr.protein}g</span>
                        <span>{t("logMealExt.carbsShort")}:{nutr.carbs}g</span>
                        <span>{t("logMealExt.fatShort")}:{nutr.fat}g</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Portion Input */}
              {selectedCookingMethod && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      {t("logMealExt.portionG")}
                    </label>
                    <input
                      type="number"
                      value={smartPortionInput}
                      onChange={(e) => setSmartPortionInput(e.target.value)}
                      placeholder={`${t("logMealExt.eg")} ${selectedSmartFood.defaultPortionG}`}
                      className="w-full px-4 py-3 border-2 border-orange-300 dark:border-orange-500/30 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-500/20 transition-all font-bold text-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  {/* Calculated Nutrition */}
                  {calculatedSmartNutrition && (
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm">
                          {selectedSmartFood.name} — {selectedCookingMethod.label}
                        </span>
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <div className="text-2xl font-black">{calculatedSmartNutrition.calories}</div>
                          <div className="text-xs opacity-80">kcal</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black">{calculatedSmartNutrition.protein}</div>
                          <div className="text-xs opacity-80">{t("logMealExt.protein")}</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black">{calculatedSmartNutrition.carbs}</div>
                          <div className="text-xs opacity-80">{t("logMealExt.carbs")}</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black">{calculatedSmartNutrition.fat}</div>
                          <div className="text-xs opacity-80">{t("logMealExt.fat")}</div>
                        </div>
                      </div>
                      <div className="mt-2 text-center text-xs opacity-80">
                        {smartPortionInput}g · {selectedCookingMethod.methodIcon} {selectedCookingMethod.method}
                      </div>
                    </div>
                  )}

                  {/* Add Button */}
                  <button
                    onClick={() => {
                      if (!calculatedSmartNutrition || !selectedSmartFood || !selectedCookingMethod) return;
                      const newMeal: LoggedMeal = {
                        id: Date.now().toString(),
                        name: `${selectedSmartFood.name} (${selectedCookingMethod.method})`,
                        type: 'recipe',
                        quantity: parseFloat(smartPortionInput),
                        calories: calculatedSmartNutrition.calories,
                        protein: calculatedSmartNutrition.protein,
                        carbs: calculatedSmartNutrition.carbs,
                        fat: calculatedSmartNutrition.fat,
                        timestamp: Date.now(),
                        image: selectedSmartFood.image,
                      };
                      setLoggedMeals(prev => [...prev, newMeal]);
                      resetForm();
                      showSuccessAnimation();
                    }}
                    disabled={!calculatedSmartNutrition}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-4 rounded-xl font-black text-lg hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus className="w-6 h-6" />
                    {t("logMeal.addMeal")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Selected Product Preview */}
        {selectedProduct && (
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{t("logMealExt.selectedProduct")}</h3>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/15 border-2 border-blue-300 dark:border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{selectedProduct.image}</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-gray-100">{selectedProduct.name}</div>
                  <div className="text-sm text-gray-600">{selectedProduct.brand}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-bold">
                      {selectedProduct.store}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                {t("logMealExt.quantity")} ({selectedProduct.unit})
              </label>
              <input
                type="number"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                placeholder={`${t("logMealExt.eg")} 100`}
                className="w-full px-4 py-3 border-2 border-blue-300 dark:border-blue-500/30 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all font-bold text-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Calculated Nutrition */}
            {calculatedProductNutrition && (
              <div className="bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold">{t("logMealExt.nutritionValue")}</span>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-black">{calculatedProductNutrition.calories}</div>
                    <div className="text-xs opacity-80">kcal</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{calculatedProductNutrition.protein}</div>
                    <div className="text-xs opacity-80">{t("logMealExt.protein")}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{calculatedProductNutrition.carbs}</div>
                    <div className="text-xs opacity-80">{t("logMealExt.carbs")}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{calculatedProductNutrition.fat}</div>
                    <div className="text-xs opacity-80">{t("logMealExt.fat")}</div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleAddMeal}
              disabled={!calculatedProductNutrition}
              className="w-full bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-4 rounded-xl font-black text-lg hover:from-blue-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="w-6 h-6" />
              {t("logMeal.addMeal")}
            </button>
          </div>
        )}

        {/* Selected Recipe Preview */}
        {selectedRecipe && (
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ChefHat className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{t("logMealExt.selectedRecipe")}</h3>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-500/10 dark:to-orange-500/15 border-2 border-orange-300 dark:border-orange-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{selectedRecipe.image}</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-gray-100">{selectedRecipe.name}</div>
                  <div className="text-sm text-gray-600">{selectedRecipe.category}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-bold">
                      {t("logMealExt.aiCalculated")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ingredients Preview */}
              <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-500/30">
                <div className="text-xs font-bold text-orange-700 dark:text-orange-300 mb-2">{t("logMealExt.mainIngredients")}</div>
                <div className="flex flex-wrap gap-1">
                  {selectedRecipe.ingredients.slice(0, 5).map((ingredient, idx) => (
                    <span key={idx} className="text-xs bg-white dark:bg-white/10 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">
                      {ingredient.name}
                    </span>
                  ))}
                  {selectedRecipe.ingredients.length > 5 && (
                    <span className="text-xs bg-white dark:bg-white/10 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">
                      +{selectedRecipe.ingredients.length - 5} {t("logMealExt.moreIngredients")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Servings Input */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                {t("logMealExt.servingsCount")} (1 {t("logMealExt.serving")} ≈ {selectedRecipe.portionSize}g)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={servingsInput}
                onChange={(e) => setServingsInput(e.target.value)}
                placeholder={`${t("logMealExt.eg")} 1`}
                className="w-full px-4 py-3 border-2 border-blue-300 dark:border-blue-500/30 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all font-bold text-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Calculated Nutrition */}
            {calculatedRecipeNutrition && (
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold">{t("logMealExt.aiCalculatedNutrition")}</span>
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-black">{calculatedRecipeNutrition.calories}</div>
                    <div className="text-xs opacity-80">kcal</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{calculatedRecipeNutrition.protein}</div>
                    <div className="text-xs opacity-80">{t("logMealExt.protein")}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{calculatedRecipeNutrition.carbs}</div>
                    <div className="text-xs opacity-80">{t("logMealExt.carbs")}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{calculatedRecipeNutrition.fat}</div>
                    <div className="text-xs opacity-80">{t("logMealExt.fat")}</div>
                  </div>
                </div>
                <div className="mt-2 text-center text-xs opacity-80">
                  {t("logMealExt.totalAmount")} ~{calculatedRecipeNutrition.portionSize}g
                </div>
              </div>
            )}

            <button
              onClick={handleAddMeal}
              disabled={!calculatedRecipeNutrition}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 rounded-xl font-black text-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="w-6 h-6" />
              {t("logMeal.addMeal")}
            </button>
          </div>
        )}

        {/* Logged Meals Summary */}
        {loggedMeals.length > 0 && (
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{t("logMealExt.myLog")}</h3>
              <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                {loggedMeals.length} {t("logMealExt.foodItems")}
              </span>
            </div>

            {/* Total Nutrition */}
            <div className="bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl p-4 text-white">
              <div className="text-sm font-bold mb-2">{t("logMealExt.totalLabel")}</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-xl font-black">{totalNutrition.calories}</div>
                  <div className="text-xs opacity-80">kcal</div>
                </div>
                <div>
                  <div className="text-xl font-black">{totalNutrition.protein.toFixed(1)}</div>
                  <div className="text-xs opacity-80">{t("logMealExt.protein")}</div>
                </div>
                <div>
                  <div className="text-xl font-black">{totalNutrition.carbs.toFixed(1)}</div>
                  <div className="text-xs opacity-80">{t("logMealExt.carbs")}</div>
                </div>
                <div>
                  <div className="text-xl font-black">{totalNutrition.fat.toFixed(1)}</div>
                  <div className="text-xs opacity-80">{t("logMealExt.fat")}</div>
                </div>
              </div>
            </div>

            {/* Meal List */}
            <div className="space-y-2">
              {loggedMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="text-2xl">{meal.image}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{meal.name}</div>
                    <div className="text-xs text-gray-600">
                      {meal.type === 'recipe' ? `${meal.quantity} ${t("logMealExt.serving")}` : `${meal.quantity}g`} • {meal.calories} kcal
                    </div>
                  </div>
                  <button
                    onClick={() => removeMeal(meal.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Animation */}
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-green-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
              <Check className="w-6 h-6" />
              <span className="font-black text-lg">{t("logMeal.success")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}