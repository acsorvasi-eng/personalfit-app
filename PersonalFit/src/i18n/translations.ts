/**
 * Flat translation keys for instant 3-language switch (hu, ro, en).
 * Used by LanguageContext; flat lookup ensures consistent keys across the app.
 */

export type I18nLang = 'hu' | 'ro' | 'en';

export const translations: Record<I18nLang, Record<string, string>> = {
  hu: {
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

    'mealModel.3': '3 étkezés (Reggeli / Ebéd / Vacsora)',
    'mealModel.5': '5 étkezés (Reggeli / Tízórai / Ebéd / Uzsonna / Vacsora)',
    'mealModel.2': '2 étkezés (Reggeli / Vacsora)',
    'mealModel.168': '16:8 Intermittent Fasting (12:00 - 20:00)',
    'mealModel.186': '18:6 Intermittent Fasting (13:00 - 19:00)',

    'water.add': '💧 +250ml',
    'water.added': '💧 +250ml víz hozzáadva',
    'water.saveFailed': 'Víz mentése sikertelen',
    'water.longPressHint': 'Hosszan nyomva: beállítások',

    'menu.title': 'Menüm',
    'menu.subtitle': '28 napos terv',
  },

  ro: {
    'nav.foods': 'Alimente',
    'nav.list': 'Listă',
    'nav.menu': 'Meniu',
    'nav.sport': 'Sport',
    'nav.shopping': 'Listă',
    'nav.sports': 'Sport',
    'nav.profile': 'Profil',

    'rest.timeRemaining': 'TIMP RĂMAS',
    'rest.restPeriod': 'Pauză',
    'rest.remaining': 'rămas',
    'rest.allowed': 'PERMIS:',
    'rest.nextMeal': 'Masa următoare',

    'meal.breakfast': 'Mic dejun',
    'meal.morningSnack': 'Gustare dimineață',
    'meal.lunch': 'Prânz',
    'meal.afternoonSnack': 'Gustare după-amiază',
    'meal.dinner': 'Cină',
    'meal.mainMeal': 'Masă principală',

    'mealEditor.title': 'Setări mese',
    'mealEditor.subtitle': 'Numărul și orarul meselor zilnice',
    'mealEditor.mealCount': 'Numărul meselor zilnice',
    'mealEditor.snackTitle': 'Gustări permise',
    'mealEditor.snackSubtitle': 'Maximum 2 selectabile',
    'mealEditor.snackMax': 'Maximum 2 gustări selectabile',
    'mealEditor.save': 'Salvează',
    'mealEditor.cancel': 'Anulează',
    'mealEditor.edit': 'Editează',
    'mealEditor.dialogTitle': 'Intervale mese',
    'mealEditor.dialogMessage': 'Dorești să modifici intervalele meselor?',
    'mealEditor.ifFasting': 'În perioada de post doar apa este permisă',
    'mealEditor.validation': 'Ora de sfârșit trebuie să fie după ora de început',
    'mealEditor.saved': 'Setări salvate ✓',

    'mealModel.3': '3 mese (Mic dejun / Prânz / Cină)',
    'mealModel.5': '5 mese (Mic dejun / Gustare / Prânz / Gustare / Cină)',
    'mealModel.2': '2 mese (Mic dejun / Cină)',
    'mealModel.168': '16:8 Intermittent Fasting (12:00 - 20:00)',
    'mealModel.186': '18:6 Intermittent Fasting (13:00 - 19:00)',

    'water.add': '💧 +250ml',
    'water.added': '💧 +250ml apă adăugată',
    'water.saveFailed': 'Salvare apă eșuată',
    'water.longPressHint': 'Apăsare lungă: setări',

    'menu.title': 'Meniul meu',
    'menu.subtitle': 'Plan 28 zile',
  },

  en: {
    'nav.foods': 'Foods',
    'nav.list': 'List',
    'nav.menu': 'My Menu',
    'nav.sport': 'Sport',
    'nav.shopping': 'List',
    'nav.sports': 'Sport',
    'nav.profile': 'Profile',

    'rest.timeRemaining': 'TIME REMAINING',
    'rest.restPeriod': 'Rest period',
    'rest.remaining': 'remaining',
    'rest.allowed': 'ALLOWED:',
    'rest.nextMeal': 'Next meal',

    'meal.breakfast': 'Breakfast',
    'meal.morningSnack': 'Morning snack',
    'meal.lunch': 'Lunch',
    'meal.afternoonSnack': 'Afternoon snack',
    'meal.dinner': 'Dinner',
    'meal.mainMeal': 'Main meal',

    'mealEditor.title': 'Meal settings',
    'mealEditor.subtitle': 'Number and schedule of daily meals',
    'mealEditor.mealCount': 'Number of daily meals',
    'mealEditor.snackTitle': 'Allowed snacks',
    'mealEditor.snackSubtitle': 'Maximum 2 selectable',
    'mealEditor.snackMax': 'Maximum 2 snacks selectable',
    'mealEditor.save': 'Save',
    'mealEditor.cancel': 'Cancel',
    'mealEditor.edit': 'Edit',
    'mealEditor.dialogTitle': 'Meal intervals',
    'mealEditor.dialogMessage': 'Do you want to modify meal intervals?',
    'mealEditor.ifFasting': 'Only water is allowed during fasting period',
    'mealEditor.validation': 'End time must be after start time',
    'mealEditor.saved': 'Settings saved ✓',

    'mealModel.3': '3 meals (Breakfast / Lunch / Dinner)',
    'mealModel.5': '5 meals (Breakfast / Morning snack / Lunch / Afternoon snack / Dinner)',
    'mealModel.2': '2 meals (Breakfast / Dinner)',
    'mealModel.168': '16:8 Intermittent Fasting (12:00 - 20:00)',
    'mealModel.186': '18:6 Intermittent Fasting (13:00 - 19:00)',

    'water.add': '💧 +250ml',
    'water.added': '💧 +250ml water added',
    'water.saveFailed': 'Failed to save water',
    'water.longPressHint': 'Long press: settings',

    'menu.title': 'My Menu',
    'menu.subtitle': '28 day plan',
  },
};
