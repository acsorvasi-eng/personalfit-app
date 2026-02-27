import { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy, Clock, Flame, X, Sparkles, Search, TrendingUp, Activity, Check, Plus, SlidersHorizontal, ArrowLeft, Trash2 } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutPlannerBanner, WorkoutCalendarSheet } from './WorkoutCalendar';
import { DSMCoachMark } from './dsm/ux-patterns';
// [STORED] AI Meal Recommendation imports — kept for future use
// import { ChefHat, Zap, RefreshCw } from 'lucide-react';
// import { recipeDatabase, calculateRecipeNutrition, Recipe } from '../data/recipeDatabase';
import { useCalorieTracker } from '../hooks/useCalorieTracker';
import { useLanguage } from '../contexts/LanguageContext';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface SportItem {
  id: string;
  name: string;
  icon: string;
  caloriesPerMinute: number;
  category: string;
  intensity: 'light' | 'moderate' | 'intense';
}

interface WorkoutEntry {
  activityId: string;
  activityName: string;
  activityIcon: string;
  duration: number;
  calories: number;
  timestamp: string;
  source: 'manual' | 'synced';
}

interface DailyWorkout {
  date: string;
  entries: WorkoutEntry[];
  totalDuration: number;
  totalCalories: number;
}

interface ConnectedApp {
  id: string;
  name: string;
  logo: string;
  bgColor: string;
  connected: boolean;
}

// ═══════════════════════════════════════════════════════════
// Comprehensive Sport Database
// ═══════════════════════════════════════════════════════════

const ALL_SPORTS: SportItem[] = [
  { id: 'running-outdoor', name: 'Szabadtéri futás', icon: '🏃', caloriesPerMinute: 10, category: 'Futás', intensity: 'moderate' },
  { id: 'running-treadmill', name: 'Futópad', icon: '🏃‍♂️', caloriesPerMinute: 9, category: 'Futás', intensity: 'moderate' },
  { id: 'running-trail', name: 'Terepfutás', icon: '⛰️', caloriesPerMinute: 11, category: 'Futás', intensity: 'intense' },
  { id: 'running-interval', name: 'Intervall futás', icon: '⚡', caloriesPerMinute: 12, category: 'Futás', intensity: 'intense' },
  { id: 'running-sprint', name: 'Sprintedzés', icon: '💨', caloriesPerMinute: 14, category: 'Futás', intensity: 'intense' },
  { id: 'walking', name: 'Gyaloglás', icon: '🚶', caloriesPerMinute: 4, category: 'Gyaloglás', intensity: 'light' },
  { id: 'walking-nordic', name: 'Nordic walking', icon: '🥾', caloriesPerMinute: 5, category: 'Gyaloglás', intensity: 'light' },
  { id: 'hiking', name: 'Túrázás', icon: '🥾', caloriesPerMinute: 6, category: 'Gyaloglás', intensity: 'moderate' },
  { id: 'mountaineering', name: 'Hegymászás', icon: '🏔️', caloriesPerMinute: 8, category: 'Gyaloglás', intensity: 'intense' },
  { id: 'stair-climbing', name: 'Lépcsőzés', icon: '🪜', caloriesPerMinute: 9, category: 'Gyaloglás', intensity: 'moderate' },
  { id: 'cycling-road', name: 'Országúti kerékpár', icon: '🚴', caloriesPerMinute: 8, category: 'Kerékpározás', intensity: 'moderate' },
  { id: 'cycling-mountain', name: 'Hegyikerékpár', icon: '🚵', caloriesPerMinute: 10, category: 'Kerékpározás', intensity: 'intense' },
  { id: 'cycling-indoor', name: 'Szobabicikli', icon: '🚴‍♀️', caloriesPerMinute: 7, category: 'Kerékpározás', intensity: 'moderate' },
  { id: 'cycling-spin', name: 'Spinning', icon: '🔄', caloriesPerMinute: 11, category: 'Kerékpározás', intensity: 'intense' },
  { id: 'swimming-freestyle', name: 'Gyorsúszás', icon: '🏊', caloriesPerMinute: 9, category: 'Úszás', intensity: 'moderate' },
  { id: 'swimming-backstroke', name: 'Hátúszás', icon: '🏊‍♂️', caloriesPerMinute: 8, category: 'Úszás', intensity: 'moderate' },
  { id: 'swimming-breaststroke', name: 'Mellúszás', icon: '🏊‍♀️', caloriesPerMinute: 7, category: 'Úszás', intensity: 'light' },
  { id: 'swimming-butterfly', name: 'Pillangóúszás', icon: '🦋', caloriesPerMinute: 11, category: 'Úszás', intensity: 'intense' },
  { id: 'swimming-open', name: 'Nyíltvízi úszás', icon: '🌊', caloriesPerMinute: 10, category: 'Úszás', intensity: 'intense' },
  { id: 'swimming-pool', name: 'Medencés úszás', icon: '🏊', caloriesPerMinute: 8, category: 'Úszás', intensity: 'moderate' },
  { id: 'gym-weights', name: 'Súlyzós edzés', icon: '🏋️', caloriesPerMinute: 6, category: 'Erőnléti', intensity: 'moderate' },
  { id: 'gym-bodyweight', name: 'Saját testsúly', icon: '💪', caloriesPerMinute: 5, category: 'Erőnléti', intensity: 'light' },
  { id: 'gym-crossfit', name: 'CrossFit', icon: '⚡', caloriesPerMinute: 11, category: 'Erőnléti', intensity: 'intense' },
  { id: 'gym-hiit', name: 'HIIT', icon: '🔥', caloriesPerMinute: 13, category: 'Erőnléti', intensity: 'intense' },
  { id: 'gym-functional', name: 'Funkcionális edzés', icon: '🏋️‍♀️', caloriesPerMinute: 7, category: 'Erőnléti', intensity: 'moderate' },
  { id: 'gym-core', name: 'Core edzés', icon: '🎯', caloriesPerMinute: 5, category: 'Erőnléti', intensity: 'moderate' },
  { id: 'gym-kettlebell', name: 'Kettlebell', icon: '🔔', caloriesPerMinute: 8, category: 'Erőnléti', intensity: 'moderate' },
  { id: 'gym-stretching', name: 'Nyújtás', icon: '🤸', caloriesPerMinute: 2, category: 'Erőnléti', intensity: 'light' },
  { id: 'yoga-hatha', name: 'Hatha jóga', icon: '🧘', caloriesPerMinute: 3, category: 'Jóga & Pilates', intensity: 'light' },
  { id: 'yoga-vinyasa', name: 'Vinyasa jóga', icon: '🧘‍♀️', caloriesPerMinute: 4, category: 'Jóga & Pilates', intensity: 'light' },
  { id: 'yoga-power', name: 'Power jóga', icon: '💪', caloriesPerMinute: 5, category: 'Jóga & Pilates', intensity: 'moderate' },
  { id: 'pilates', name: 'Pilates', icon: '🤸', caloriesPerMinute: 4, category: 'Jóga & Pilates', intensity: 'light' },
  { id: 'soccer', name: 'Futball', icon: '⚽', caloriesPerMinute: 9, category: 'Csapatsport', intensity: 'moderate' },
  { id: 'basketball', name: 'Kosárlabda', icon: '🏀', caloriesPerMinute: 8, category: 'Csapatsport', intensity: 'moderate' },
  { id: 'volleyball', name: 'Röplabda', icon: '🏐', caloriesPerMinute: 6, category: 'Csapatsport', intensity: 'light' },
  { id: 'handball', name: 'Kézilabda', icon: '🤾', caloriesPerMinute: 8, category: 'Csapatsport', intensity: 'moderate' },
  { id: 'tennis', name: 'Tenisz', icon: '🎾', caloriesPerMinute: 7, category: 'Ütősport', intensity: 'moderate' },
  { id: 'badminton', name: 'Tollaslabda', icon: '🏸', caloriesPerMinute: 6, category: 'Ütősport', intensity: 'light' },
  { id: 'table-tennis', name: 'Asztalitenisz', icon: '🏓', caloriesPerMinute: 5, category: 'Ütősport', intensity: 'light' },
  { id: 'boxing', name: 'Boksz', icon: '🥊', caloriesPerMinute: 10, category: 'Küzdősport', intensity: 'intense' },
  { id: 'kickboxing', name: 'Kickbox', icon: '🥊', caloriesPerMinute: 11, category: 'Küzdősport', intensity: 'intense' },
  { id: 'karate', name: 'Karate', icon: '🥋', caloriesPerMinute: 8, category: 'Küzdősport', intensity: 'moderate' },
  { id: 'judo', name: 'Judo', icon: '🥋', caloriesPerMinute: 9, category: 'Küzdősport', intensity: 'intense' },
  { id: 'skiing-downhill', name: 'Síelés', icon: '⛷️', caloriesPerMinute: 7, category: 'Téli sport', intensity: 'moderate' },
  { id: 'skiing-crosscountry', name: 'Sífutás', icon: '🎿', caloriesPerMinute: 10, category: 'Téli sport', intensity: 'intense' },
  { id: 'snowboarding', name: 'Snowboard', icon: '🏂', caloriesPerMinute: 7, category: 'Téli sport', intensity: 'moderate' },
  { id: 'rowing', name: 'Evezés', icon: '🚣', caloriesPerMinute: 8, category: 'Vízi sport', intensity: 'moderate' },
  { id: 'kayaking', name: 'Kajakozás', icon: '🛶', caloriesPerMinute: 7, category: 'Vízi sport', intensity: 'moderate' },
  { id: 'surfing', name: 'Szörfözés', icon: '🏄‍♂️', caloriesPerMinute: 7, category: 'Vízi sport', intensity: 'moderate' },
  { id: 'dancing', name: 'Tánc', icon: '💃', caloriesPerMinute: 7, category: 'Tánc & Aerobik', intensity: 'moderate' },
  { id: 'zumba', name: 'Zumba', icon: '💃', caloriesPerMinute: 8, category: 'Tánc & Aerobik', intensity: 'moderate' },
  { id: 'aerobics', name: 'Aerobik', icon: '🤸‍♀️', caloriesPerMinute: 7, category: 'Tánc & Aerobik', intensity: 'moderate' },
  { id: 'climbing', name: 'Sziklamászás', icon: '🧗', caloriesPerMinute: 8, category: 'Egyéb', intensity: 'intense' },
  { id: 'jump-rope', name: 'Ugrálókötél', icon: '🪢', caloriesPerMinute: 12, category: 'Egyéb', intensity: 'intense' },
  { id: 'trampoline', name: 'Trambulin', icon: '🤸', caloriesPerMinute: 6, category: 'Egyéb', intensity: 'moderate' },
  { id: 'golf', name: 'Golf', icon: '⛳', caloriesPerMinute: 4, category: 'Egyéb', intensity: 'light' },
  { id: 'triathlon', name: 'Triatlon', icon: '🏅', caloriesPerMinute: 10, category: 'Egyéb', intensity: 'intense' },
];

const SPORT_CATEGORIES = [...new Set(ALL_SPORTS.map(s => s.category))];

// ─── Category key map (HU name → translation key) ───
const CATEGORY_KEY_MAP: Record<string, string> = {
  'Futás': 'catRunning',
  'Gyaloglás': 'catWalking',
  'Kerékpározás': 'catCycling',
  'Úszás': 'catSwimming',
  'Erőnléti': 'catStrength',
  'Jóga & Pilates': 'catYoga',
  'Csapatsport': 'catTeam',
  'Ütősport': 'catRacket',
  'Küzdősport': 'catCombat',
  'Téli sport': 'catWinter',
  'Vízi sport': 'catWater',
  'Tánc & Aerobik': 'catDance',
  'Egyéb': 'catOther',
};

// ─── Sport name locale maps (EN/RO) ───
const SPORT_NAME_LOCALE: Record<string, Record<string, string>> = {
  en: {
    'running-outdoor': 'Outdoor Running', 'running-treadmill': 'Treadmill', 'running-trail': 'Trail Running',
    'running-interval': 'Interval Running', 'running-sprint': 'Sprint Training',
    'walking': 'Walking', 'walking-nordic': 'Nordic Walking', 'hiking': 'Hiking',
    'mountaineering': 'Mountaineering', 'stair-climbing': 'Stair Climbing',
    'cycling-road': 'Road Cycling', 'cycling-mountain': 'Mountain Biking',
    'cycling-indoor': 'Indoor Cycling', 'cycling-spin': 'Spinning',
    'swimming-freestyle': 'Freestyle Swimming', 'swimming-backstroke': 'Backstroke',
    'swimming-breaststroke': 'Breaststroke', 'swimming-butterfly': 'Butterfly',
    'swimming-open': 'Open Water Swimming', 'swimming-pool': 'Pool Swimming',
    'gym-weights': 'Weight Training', 'gym-bodyweight': 'Bodyweight Training',
    'gym-crossfit': 'CrossFit', 'gym-hiit': 'HIIT', 'gym-functional': 'Functional Training',
    'gym-core': 'Core Training', 'gym-kettlebell': 'Kettlebell', 'gym-stretching': 'Stretching',
    'yoga-hatha': 'Hatha Yoga', 'yoga-vinyasa': 'Vinyasa Yoga', 'yoga-power': 'Power Yoga',
    'pilates': 'Pilates',
    'soccer': 'Soccer', 'basketball': 'Basketball', 'volleyball': 'Volleyball', 'handball': 'Handball',
    'tennis': 'Tennis', 'badminton': 'Badminton', 'table-tennis': 'Table Tennis',
    'boxing': 'Boxing', 'kickboxing': 'Kickboxing', 'karate': 'Karate', 'judo': 'Judo',
    'skiing-downhill': 'Downhill Skiing', 'skiing-crosscountry': 'Cross-Country Skiing', 'snowboarding': 'Snowboarding',
    'rowing': 'Rowing', 'kayaking': 'Kayaking', 'surfing': 'Surfing',
    'dancing': 'Dancing', 'zumba': 'Zumba', 'aerobics': 'Aerobics',
    'climbing': 'Rock Climbing', 'jump-rope': 'Jump Rope', 'trampoline': 'Trampoline',
    'golf': 'Golf', 'triathlon': 'Triathlon',
  },
  ro: {
    'running-outdoor': 'Alergare în aer liber', 'running-treadmill': 'Bandă de alergare', 'running-trail': 'Alergare pe teren',
    'running-interval': 'Alergare cu intervale', 'running-sprint': 'Antrenament de sprint',
    'walking': 'Mers pe jos', 'walking-nordic': 'Nordic Walking', 'hiking': 'Drumeție',
    'mountaineering': 'Alpinism', 'stair-climbing': 'Urcat pe scări',
    'cycling-road': 'Ciclism rutier', 'cycling-mountain': 'Mountain Bike',
    'cycling-indoor': 'Bicicletă de interior', 'cycling-spin': 'Spinning',
    'swimming-freestyle': 'Înot liber', 'swimming-backstroke': 'Înot pe spate',
    'swimming-breaststroke': 'Înot bras', 'swimming-butterfly': 'Înot fluture',
    'swimming-open': 'Înot în ape deschise', 'swimming-pool': 'Înot în bazin',
    'gym-weights': 'Antrenament cu greutăți', 'gym-bodyweight': 'Greutatea corpului',
    'gym-crossfit': 'CrossFit', 'gym-hiit': 'HIIT', 'gym-functional': 'Antrenament funcțional',
    'gym-core': 'Antrenament de bază', 'gym-kettlebell': 'Kettlebell', 'gym-stretching': 'Stretching',
    'yoga-hatha': 'Hatha Yoga', 'yoga-vinyasa': 'Vinyasa Yoga', 'yoga-power': 'Power Yoga',
    'pilates': 'Pilates',
    'soccer': 'Fotbal', 'basketball': 'Baschet', 'volleyball': 'Volei', 'handball': 'Handbal',
    'tennis': 'Tenis', 'badminton': 'Badminton', 'table-tennis': 'Tenis de masă',
    'boxing': 'Box', 'kickboxing': 'Kickbox', 'karate': 'Karate', 'judo': 'Judo',
    'skiing-downhill': 'Schi alpin', 'skiing-crosscountry': 'Schi fond', 'snowboarding': 'Snowboard',
    'rowing': 'Canotaj', 'kayaking': 'Caiac', 'surfing': 'Surf',
    'dancing': 'Dans', 'zumba': 'Zumba', 'aerobics': 'Aerobic',
    'climbing': 'Escaladă', 'jump-rope': 'Coarda de sărit', 'trampoline': 'Trampolină',
    'golf': 'Golf', 'triathlon': 'Triatlon',
  },
};

const connectedApps: ConnectedApp[] = [
  { id: 'polar', name: 'Polar Flow', logo: '⌚', bgColor: 'from-blue-500 to-blue-600', connected: false },
  { id: 'strava', name: 'Strava', logo: '🏃', bgColor: 'from-orange-500 to-red-500', connected: false },
  { id: 'garmin', name: 'Garmin Connect', logo: '⚡', bgColor: 'from-cyan-500 to-blue-600', connected: false },
  { id: 'apple', name: 'Apple Health', logo: '🍎', bgColor: 'from-pink-500 to-rose-600', connected: false },
  { id: 'google', name: 'Google Fit', logo: '💪', bgColor: 'from-green-500 to-emerald-600', connected: false },
  { id: 'fitbit', name: 'Fitbit', logo: '💙', bgColor: 'from-indigo-500 to-blue-600', connected: false },
  { id: 'suunto', name: 'Suunto', logo: '🏔️', bgColor: 'from-amber-500 to-orange-600', connected: false },
];

function fuzzySearch(query: string, sports: SportItem[]): SportItem[] {
  const q = query.toLowerCase().trim();
  if (q.length < 3) return [];
  const scored = sports.map(sport => {
    const name = sport.name.toLowerCase();
    const cat = sport.category.toLowerCase();
    let score = 0;
    if (name.startsWith(q)) score += 100;
    else if (name.includes(q)) score += 60;
    if (cat.includes(q)) score += 40;
    if (score === 0) {
      let qi = 0;
      for (let i = 0; i < name.length && qi < q.length; i++) {
        if (name[i] === q[qi]) { qi++; score += 3; }
      }
      if (qi < q.length) score = 0;
    }
    return { sport, score };
  });
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 8).map(s => s.sport);
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function Workout() {
  const today = new Date().toISOString().split('T')[0];
  // [STORED] useCalorieTracker kept for future AI Meal Recommendation reactivation
  useCalorieTracker();
  const { t, language, locale } = useLanguage();

  // ── Locale helpers ───
  const getLocale = () => locale;
  const getSportName = (sport: SportItem) => {
    if (language === 'hu') return sport.name;
    return SPORT_NAME_LOCALE[language]?.[sport.id] ?? sport.name;
  };
  const getCategoryName = (huCategory: string) => {
    const key = CATEGORY_KEY_MAP[huCategory];
    return key ? t(`workout.${key}`) : huCategory;
  };
  const getIntensityLabel = (intensity: 'light' | 'moderate' | 'intense') => {
    return t(`workout.${intensity}`);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [showCollection, setShowCollection] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportItem | null>(null);
  const [duration, setDuration] = useState('');
  const [dailyWorkout, setDailyWorkout] = useState<DailyWorkout | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<DailyWorkout[]>([]);
  const [apps, setApps] = useState<ConnectedApp[]>(connectedApps);
  const [searchFocused, setSearchFocused] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // [STORED] AI Meal Recommendation — removed from UI, kept for future use
  // const [mealSuggestions, setMealSuggestions] = useState<{ recipe: Recipe; nutrition: ReturnType<typeof calculateRecipeNutrition> }[]>([]);
  // const [mealAiLoading, setMealAiLoading] = useState(false);
  // const [mealAiGenerated, setMealAiGenerated] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedApps = localStorage.getItem('connectedWorkoutApps');
    if (storedApps) setApps(JSON.parse(storedApps));
    const workoutData = localStorage.getItem('workoutTracking');
    if (workoutData) {
      const data = JSON.parse(workoutData);
      if (data[today]) setDailyWorkout(data[today]);
      const history: DailyWorkout[] = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        if (data[key] && data[key].entries?.length > 0) history.push(data[key]);
      }
      setWorkoutHistory(history);
    }
  }, [today]);

  const aiSuggestions = useMemo(() => fuzzySearch(searchQuery, ALL_SPORTS), [searchQuery]);

  const handleSelectSport = (sport: SportItem) => {
    setSelectedSport(sport); setShowDurationModal(true); setShowCollection(false);
    setSearchQuery(''); setSearchFocused(false);
  };

  const handleAddWorkout = () => {
    if (!selectedSport || !duration || parseInt(duration) <= 0) return;
    const durationNum = parseInt(duration);
    const calories = Math.round(selectedSport.caloriesPerMinute * durationNum);
    const newEntry: WorkoutEntry = { activityId: selectedSport.id, activityName: selectedSport.name, activityIcon: selectedSport.icon, duration: durationNum, calories, timestamp: new Date().toISOString(), source: 'manual' };
    const workoutData = localStorage.getItem('workoutTracking');
    const allData = workoutData ? JSON.parse(workoutData) : {};
    const currentDayData = allData[today] || { date: today, entries: [], totalDuration: 0, totalCalories: 0 };
    currentDayData.entries.push(newEntry);
    currentDayData.totalDuration += durationNum;
    currentDayData.totalCalories += calories;
    allData[today] = currentDayData;
    localStorage.setItem('workoutTracking', JSON.stringify(allData));
    setDailyWorkout(currentDayData); setShowDurationModal(false); setSelectedSport(null); setDuration('');
    if (navigator.vibrate) navigator.vibrate([10, 20]);
  };

  const handleDeleteEntry = (index: number) => {
    if (!dailyWorkout) return;
    const updatedEntries = [...dailyWorkout.entries];
    const removed = updatedEntries.splice(index, 1)[0];
    const updated = { ...dailyWorkout, entries: updatedEntries, totalDuration: dailyWorkout.totalDuration - removed.duration, totalCalories: dailyWorkout.totalCalories - removed.calories };
    const workoutData = localStorage.getItem('workoutTracking');
    const allData = workoutData ? JSON.parse(workoutData) : {};
    if (updated.entries.length === 0) delete allData[today]; else allData[today] = updated;
    localStorage.setItem('workoutTracking', JSON.stringify(allData));
    setDailyWorkout(updated.entries.length > 0 ? updated : null);
  };

  const handleAppConnect = (appId: string) => {
    const updatedApps = apps.map(app => app.id === appId ? { ...app, connected: !app.connected } : app);
    setApps(updatedApps);
    localStorage.setItem('connectedWorkoutApps', JSON.stringify(updatedApps));
  };

  const hasActivity = (dailyWorkout?.entries?.length ?? 0) > 0 || workoutHistory.length > 0;

  // [STORED] AI Meal Recommendation function — removed from UI, kept for future use
  // const generateMealSuggestions = async () => {
  //   setMealAiLoading(true);
  //   await new Promise(resolve => setTimeout(resolve, 1200));
  //   const burnedToday = dailyWorkout?.totalCalories || 0;
  //   const effectiveRemaining = remaining + burnedToday;
  //   const mealBudget = Math.max(200, Math.round(effectiveRemaining / 2.5));
  //   const scored = recipeDatabase.map(recipe => {
  //     const nutrition = calculateRecipeNutrition(recipe, 1);
  //     const cal = nutrition.calories;
  //     const calDiff = Math.abs(cal - mealBudget);
  //     const fitsInRemaining = cal <= effectiveRemaining;
  //     const score = fitsInRemaining ? 1000 - calDiff + (recipe.isMealPlan ? 50 : 0) : 0;
  //     return { recipe, nutrition, score };
  //   });
  //   const shuffled = scored.filter(s => s.score > 0).sort(() => Math.random() - 0.5).sort((a, b) => b.score - a.score);
  //   const selected: typeof shuffled = [];
  //   const usedCategories = new Set<string>();
  //   for (const item of shuffled) { if (selected.length >= 3) break; if (!usedCategories.has(item.recipe.category)) { selected.push(item); usedCategories.add(item.recipe.category); } }
  //   for (const item of shuffled) { if (selected.length >= 3) break; if (!selected.includes(item)) selected.push(item); }
  //   setMealSuggestions(selected.map(s => ({ recipe: s.recipe, nutrition: s.nutrition })));
  //   setMealAiLoading(false); setMealAiGenerated(true);
  // };

  // ─── Sync Apps Modal ───
  if (showApps) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-[#121212]">
        <div className="bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-[#2a2a2a] px-4 py-4 flex items-center gap-4">
          <button onClick={() => setShowApps(false)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#252525] rounded-xl transition-colors" aria-label={t('common.back')}>
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('workout.syncApps')}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('workout.connectAppsDesc')}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {apps.map(app => (
            <motion.div key={app.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2a2a2a] overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${app.bgColor} rounded-xl flex items-center justify-center text-2xl shadow-md`}>{app.logo}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">{app.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{app.connected ? `✓ ${t('workout.linked')}` : t('workout.autoSync')}</div>
                </div>
                <button onClick={() => handleAppConnect(app.id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${app.connected ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30' : 'bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'}`}>
                  {app.connected ? t('workout.disconnect') : t('workout.connect')}
                </button>
              </div>
              {app.connected && <div className="px-4 pb-3 pt-0"><div className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> {t('workout.autoSync')}</div></div>}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-[#121212] dark:to-[#1E1E1E]">
      <div className="flex-shrink-0">
        <PageHeader icon={Trophy} title={t('nav.sports')} subtitle={new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} gradientFrom="from-orange-500" gradientVia="via-red-500" gradientTo="to-pink-500" stats={[{ label: t('profile.workouts'), value: dailyWorkout?.totalDuration || 0, suffix: t('workout.min') }, { label: t('workout.syncApps'), value: "⇄", isAction: true, onClick: () => setShowApps(true) }]} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-3">

          {/* ── WORKOUT PLANNER BANNER (replaces static DSMWorkoutDayBanner) ── */}
          <WorkoutPlannerBanner onOpenCalendar={() => setCalendarOpen(true)} />

          {/* ── WORKOUT CALENDAR SHEET ── */}
          <WorkoutCalendarSheet open={calendarOpen} onClose={() => setCalendarOpen(false)} />

          {/* ── AI SEARCH ── */}
          <div className="relative" role="search" aria-label={t('workout.sportSearch')}>
            <div className={`relative flex items-center bg-white dark:bg-[#1E1E1E] rounded-2xl border-2 transition-all shadow-sm ${searchFocused ? 'border-orange-400 shadow-orange-100 dark:shadow-orange-900/20' : 'border-gray-200 dark:border-[#2a2a2a]'}`}>
              <div className="pl-4 pr-2" aria-hidden="true">{searchQuery.length >= 3 ? <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" /> : <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />}</div>
              <input ref={searchInputRef} type="text" placeholder={t('workout.searchPlaceholder')} aria-label={t('workout.sportSearch')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 200)} className="flex-1 py-3.5 pr-4 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none" />
              {searchQuery && <button onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }} className="pr-4" aria-label={t('workout.clearSearch')}><X className="w-4 h-4 text-gray-400 dark:text-gray-500" /></button>}
            </div>

            {searchFocused && searchQuery.length > 0 && searchQuery.length < 3 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="absolute left-0 right-0 top-full mt-1 z-20 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-orange-700 dark:text-orange-300">{t('workout.minChars')}</span>
              </motion.div>
            )}

            <AnimatePresence>
              {searchQuery.length >= 3 && aiSuggestions.length > 0 && searchFocused && (
                <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden max-h-72 overflow-y-auto">
                  <div className="px-3 py-2 bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-500/10 dark:to-pink-500/10 border-b border-orange-100 dark:border-orange-500/20 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" /><span className="text-[11px] font-semibold text-orange-700 dark:text-orange-300">{t('workout.aiSuggestions')}</span>
                    <span className="text-[10px] text-orange-500 dark:text-orange-400 ml-auto">{aiSuggestions.length} {t('workout.results')}</span>
                  </div>
                  {aiSuggestions.map(sport => (
                    <button key={sport.id} onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelectSport(sport)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors border-b border-gray-50 dark:border-[#252525] last:border-0 text-left">
                      <span className="text-2xl">{sport.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{getSportName(sport)}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">{getCategoryName(sport.category)} · {sport.caloriesPerMinute} {t('workout.kcalPerMin')}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sport.intensity === 'light' ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400' : sport.intensity === 'moderate' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'}`}>
                        {getIntensityLabel(sport.intensity)}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── SPORT COLLECTION BUTTON ── */}
          <div className="relative">
            <button onClick={() => { setShowCollection(true); setCollectionFilter(null); }} className="w-full flex items-center gap-3 bg-white dark:bg-[#1E1E1E] rounded-2xl border-2 border-dashed border-gray-300 dark:border-[#333] hover:border-orange-300 dark:hover:border-orange-500/50 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 px-4 py-3 transition-all group" aria-label={t('workout.addSport')}>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-500/20 dark:to-pink-500/20 group-hover:from-orange-200 group-hover:to-pink-200 rounded-xl flex items-center justify-center transition-colors"><Plus className="w-5 h-5 text-orange-600 dark:text-orange-400" /></div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('nav.sports')}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">{t('workout.chooseFromSports').replace('{n}', String(ALL_SPORTS.length))}</div>
              </div>
              <SlidersHorizontal className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 transition-colors" />
            </button>
            <DSMCoachMark id="workout-add-sport" title={t('workout.logWorkout')} message={t('workout.logHint') + ' ' + t('workout.caloriesAutoUpdate')} position="top" delay={1500} />
          </div>

          {/* [STORED] AI MEAL RECOMMENDATION — removed from UI, kept for future use */}

          {/* ── TODAY'S WORKOUTS ── */}
          {dailyWorkout && dailyWorkout.entries.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2a2a2a] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#2a2a2a]">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-orange-500" /> {t('profile.workouts')}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{dailyWorkout.totalDuration}{t('calendar.minShort')}</span>
                  <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" />{dailyWorkout.totalCalories}kcal</span>
                </div>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-[#252525]">
                {dailyWorkout.entries.map((entry, index) => (
                  <div key={index} className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
                    <span className="text-2xl flex-shrink-0">{entry.activityIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{entry.activityName}</div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        <span>{entry.duration} {t('workout.min')}</span><span>·</span><span className="text-orange-600 dark:text-orange-400 font-semibold">{entry.calories} kcal</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteEntry(index)} aria-label={t('workout.delete')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── RECENT HISTORY ── */}
          {workoutHistory.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2a2a2a] overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-[#2a2a2a]"><h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-500" /> {t('workout.history')}</h3></div>
              <div className="divide-y divide-gray-50 dark:divide-[#252525]">
                {workoutHistory.filter(w => w.date !== today).slice(0, 5).map(day => {
                  const d = new Date(day.date);
                  const dayName = d.toLocaleDateString(getLocale(), { weekday: 'short', month: 'short', day: 'numeric' });
                  return (
                    <div key={day.date} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-500/20 dark:to-indigo-500/20 rounded-xl flex items-center justify-center"><Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{dayName}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">{day.entries.length} {t('workout.workout')} · {day.entries.map(e => e.activityIcon).join(' ')}</div>
                      </div>
                      <div className="text-right"><div className="text-sm font-bold text-orange-600 dark:text-orange-400">{day.totalCalories}</div><div className="text-[10px] text-gray-400 dark:text-gray-500">{day.totalDuration}{t('calendar.minShort')}</div></div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── EMPTY STATE ── */}
          {!hasActivity && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2a2a2a] p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-500/20 dark:to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><TrendingUp className="w-10 h-10 text-orange-500" /></div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">{t('workout.startExercising')}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{t('workout.emptyHint')}</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ═══ SPORT COLLECTION MODAL ═══ */}
      <AnimatePresence>
        {showCollection && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowCollection(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1E1E1E] rounded-t-3xl max-h-[85vh] flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} role="dialog" aria-modal="true" aria-label={t('workout.collection')}>
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 dark:bg-[#333] rounded-full" /></div>
              <div className="px-5 py-3 border-b border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between">
                <div><h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('workout.collection')}</h3><p className="text-xs text-gray-500 dark:text-gray-400">{ALL_SPORTS.length} {t('workout.availableSports')}</p></div>
                <button onClick={() => setShowCollection(false)} className="w-8 h-8 bg-gray-100 dark:bg-[#252525] rounded-full flex items-center justify-center" aria-label={t('workout.close')}><X className="w-4 h-4 text-gray-600 dark:text-gray-400" /></button>
              </div>
              <div className="px-4 py-3 overflow-x-auto flex gap-2 border-b border-gray-50 dark:border-[#252525]" style={{ scrollbarWidth: 'none' }}>
                <button onClick={() => setCollectionFilter(null)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${!collectionFilter ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'}`}>{t('workout.allFilter')}</button>
                {SPORT_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCollectionFilter(cat)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${collectionFilter === cat ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'}`}>{getCategoryName(cat)}</button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-x-2 gap-y-4" role="list" aria-label={t('workout.availableSportsList')}>
                  {ALL_SPORTS.filter(s => !collectionFilter || s.category === collectionFilter).map(sport => (
                    <button key={sport.id} onClick={() => handleSelectSport(sport)} className="flex flex-col items-center gap-1.5 group" aria-label={`${getSportName(sport)} — ${sport.caloriesPerMinute} ${t('workout.kcalPerMin')}`}>
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#252525] dark:to-[#2a2a2a] group-hover:from-orange-50 group-hover:to-pink-50 dark:group-hover:from-orange-500/15 dark:group-hover:to-pink-500/15 rounded-full flex items-center justify-center text-2xl border-2 border-gray-200 dark:border-[#2a2a2a] group-hover:border-orange-300 dark:group-hover:border-orange-500/40 transition-all group-active:scale-90 shadow-sm">{sport.icon}</div>
                      <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium text-center leading-tight line-clamp-2 max-w-[80px]">{getSportName(sport)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ DURATION MODAL ═══ */}
      <AnimatePresence>
        {showDurationModal && selectedSport && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-40" onClick={() => { setShowDurationModal(false); setSelectedSport(null); setDuration(''); }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1E1E1E] rounded-t-3xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} role="dialog" aria-modal="true" aria-label={`${selectedSport.name} ${t('workout.durationLabel')}`}>
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 dark:bg-[#333] rounded-full" /></div>
              <div className="px-5 pb-6 pt-2 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-500/20 dark:to-pink-500/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner">{selectedSport.icon}</div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{getSportName(selectedSport)}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <span>{getCategoryName(selectedSport.category)}</span><span>·</span><span>{selectedSport.caloriesPerMinute} {t('workout.kcalPerMin')}</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${selectedSport.intensity === 'light' ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400' : selectedSport.intensity === 'moderate' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'}`}>
                        {getIntensityLabel(selectedSport.intensity)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('workout.durationMinutes')}</label>
                  <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder={t('calendar.exampleDuration')} className="w-full px-6 py-4 border-2 border-orange-200 dark:border-orange-500/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-2xl font-bold text-center text-gray-900 dark:text-gray-100 bg-white dark:bg-[#252525]" min="1" autoFocus />
                </div>
                {duration && parseInt(duration) > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-500/10 dark:to-pink-500/10 rounded-2xl p-4 border border-orange-200 dark:border-orange-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('workout.caloriesBurned')}</span>
                      <div className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /><span className="text-2xl font-black text-orange-600 dark:text-orange-400">{Math.round(selectedSport.caloriesPerMinute * parseInt(duration))}</span><span className="text-sm text-gray-500 dark:text-gray-400 font-semibold">kcal</span></div>
                    </div>
                  </motion.div>
                )}
                <button onClick={handleAddWorkout} disabled={!duration || parseInt(duration) <= 0} className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]">
                  <Trophy className="w-5 h-5" /> {t('workout.logWorkout')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}