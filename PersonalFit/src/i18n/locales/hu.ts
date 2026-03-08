/**
 * Hungarian — source of truth for flat i18n keys.
 * All other locales are Partial<typeof hu> and fall back to this.
 */

const hu = {
  'nav.foods': 'Ételek',
  'nav.list': 'Lista',
  'nav.menu': 'Menüm',
  'nav.sport': 'Sport',
  'nav.shopping': 'Lista',
  'nav.sports': 'Sport',
  'nav.profile': 'Profil',

  'rest.timeRemaining': 'HÁTRALÉVŐ IDŐ',
  'rest.restPeriod': 'Pihenési időszak',
  'rest.remaining': 'hátra',
  'rest.allowed': 'ENGEDÉLYEZETT:',
  'rest.nextMeal': 'Következő étkezés',
  'rest.longPressHint': 'Hosszan nyomva: étkezési beállítások',

  'meal.breakfast': 'Reggeli',
  'meal.morningSnack': 'Tízórai',
  'meal.lunch': 'Ebéd',
  'meal.afternoonSnack': 'Uzsonna',
  'meal.dinner': 'Vacsora',
  'meal.mainMeal': 'Főétkezés',

  'mealEditor.title': 'Étkezési beállítások',
  'mealEditor.subtitle': 'Napi étkezések száma és időpontjai',
  'mealEditor.mealCount': 'Napi étkezések száma',
  'mealEditor.snackTitle': 'Engedélyezett nassolnivalók',
  'mealEditor.snackSubtitle': 'Maximum 2 választható',
  'mealEditor.snackMax': 'Maximum 2 nassolnivaló választható',
  'mealEditor.save': 'Mentés',
  'mealEditor.cancel': 'Mégsem',
  'mealEditor.edit': 'Szerkesztés',
  'mealEditor.dialogTitle': 'Étkezési intervallumok',
  'mealEditor.dialogMessage': 'Szeretnéd módosítani az étkezési időpontokat?',
  'mealEditor.ifFasting': 'Böjti időszakban csak víz engedélyezett',
  'mealEditor.validation': 'A befejezési időnek a kezdési idő után kell lennie',
  'mealEditor.saved': 'Beállítások mentve ✓',
  'mealEditor.sleepBanner': '🌙 Alvásod alapján javasolt étkezési idők frissítése →',
  'mealEditor.sleepUpdate': 'Frissítés',
  'mealEditor.sleepSkip': 'Kihagyás',

  'mealModel.3': '3 étkezés (Reggeli / Ebéd / Vacsora)',
  'mealModel.5': '5 étkezés (Reggeli / Tízórai / Ebéd / Uzsonna / Vacsora)',
  'mealModel.2': '2 étkezés (Reggeli / Vacsora)',
  'mealModel.168': '16:8 Intermittent Fasting (12:00 - 20:00)',
  'mealModel.186': '18:6 Intermittent Fasting (13:00 - 19:00)',

  'water.add': '💧 +250ml',
  'water.added': '💧 +250ml víz hozzáadva',
  'water.saveFailed': 'Víz mentése sikertelen',
  'water.longPressHint': 'Hosszan nyomva: beállítások',
  'water.goal': 'Napi vízszükséglet',
  'water.goalReached': '🎉 Elérted a napi célt!',
  'water.progress': 'ml / {goal}ml',

  'menu.title': 'Menüm',
  'menu.subtitle': '28 napos terv',

  'sleep.title': 'Alvás & Regeneráció',
  'sleep.subtitle': 'Ciklus-alapú számítás',
  'sleep.wakeTime': 'Ébredési idő',
  'sleep.bedtimeOptions': 'Ajánlott lefekvési idők',
  'sleep.cycles': 'ciklus',
  'sleep.tonightTitle': 'Ma éjjel',
  'sleep.bedtimeLabel': 'Lefekvés',
  'sleep.wakeLabel': 'Ébredés',
  'sleep.firstMeal': 'Első étkezés',
  'sleep.lastMeal': 'Utolsó étel',
  'sleep.workout': 'Edzés',
  'sleep.lowSleepWarning': 'Kevés alvás: +{n} kcal mai cél',
  'sleep.label.minimum': 'Minimum',
  'sleep.label.good': 'Ajánlott',
  'sleep.label.optimal': 'Ideális',
  'sleep.label.max': 'Maximum regeneráció',

  'calorieCalculator.successTitle': 'Sikeresen hozzáadva! 🎉',
  'calorieCalculator.successBack': 'Visszatérés a menübe...',
  'macros.protein': 'Fehérje',
  'macros.carbs': 'Szénhidrát',
  'macros.fat': 'Zsír',
} as const;

export default hu;
