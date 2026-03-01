export interface MealOption {
  id: string;
  name: string;
  type: string;
  calories: string;
  description: string;
  ingredients: string[];
}

export interface DayMeals {
  day: number;
  isTrainingDay: boolean;
  dayLabel: string; // "Edzésnap" | "Pihenőnap" | "Pihenőnap/Aktív" | "Pihenőnap/Úszás"
  breakfast: MealOption[];
  lunch: MealOption[];
  dinner: MealOption[];
}

export interface WeekData {
  week: number;
  summary: {
    avgCalories: string;
    protein: string;
    carbs: string;
    fat: string;
    expectedWeightLoss: string;
  };
  days: DayMeals[];
}

export const mealPlan: WeekData[] = [
  {
    week: 1,
    summary: {
      avgCalories: "~2000 kcal/nap",
      protein: "~180g/nap",
      carbs: "Edzésnap ~170g, Pihenőnap ~100g",
      fat: "~70-80g/nap",
      expectedWeightLoss: "0,5-0,8 kg/hét"
    },
    days: [
      // Hétfő (1. nap) - Edzésnap
      {
        day: 1,
        isTrainingDay: true,
        dayLabel: "Edzésnap",
        breakfast: [
          {
            id: "w1d1b1",
            name: "Tojásos reggeli teljes kiőrlésű kenyérrel",
            type: "breakfast",
            calories: "520 kcal",
            description: "3 tojás + 60g teljes kiőrlésű kenyér + ½ avokádó",
            ingredients: ["Tojás 3db (180g)", "Teljes kiőrlésű kenyér (60g)", "Avokádó fél (70g)"]
          }
        ],
        lunch: [
          {
            id: "w1d1l1",
            name: "Csirkemell főtt krumplival és brokkolival",
            type: "lunch",
            calories: "610 kcal",
            description: "220g csirkemell + 180g főtt burgonya + 200g brokkoli",
            ingredients: ["Csirkemell (220g)", "Főtt burgonya (180g)", "Brokkoli (200g)"]
          }
        ],
        dinner: [
          {
            id: "w1d1d1",
            name: "Lazac salátával",
            type: "dinner",
            calories: "520 kcal",
            description: "180g lazac + 250g saláta + 1 ek olívaolaj",
            ingredients: ["Lazac (180g)", "Vegyes saláta (250g)", "Olívaolaj (1 ek)"]
          }
        ]
      },
      // Kedd (2. nap) - Pihenőnap
      {
        day: 2,
        isTrainingDay: false,
        dayLabel: "Pihenőnap",
        breakfast: [
          {
            id: "w1d2b1",
            name: "Kecske joghurt diókkal",
            type: "breakfast",
            calories: "520 kcal",
            description: "250g kecske joghurt + 40g dió + 1 kiwi",
            ingredients: ["Kecske joghurt (250g)", "Dió (40g)", "Kiwi (1db)"]
          }
        ],
        lunch: [
          {
            id: "w1d2l1",
            name: "Pulykamell párolt káposztával",
            type: "lunch",
            calories: "560 kcal",
            description: "220g pulykamell + 220g párolt káposzta + 1 ek tökmagolaj",
            ingredients: ["Pulykamell (220g)", "Párolt káposzta (220g)", "Tökmagolaj (1 ek)"]
          }
        ],
        dinner: [
          {
            id: "w1d2d1",
            name: "Tojás kecske túróval és zöldséggel",
            type: "dinner",
            calories: "480 kcal",
            description: "2 tojás + 150g kecske túró + 200g uborka-paradicsom",
            ingredients: ["Tojás (2db)", "Kecske túró (150g)", "Uborka (100g)", "Paradicsom (100g)"]
          }
        ]
      },
      // Szerda (3. nap) - Edzésnap
      {
        day: 3,
        isTrainingDay: true,
        dayLabel: "Edzésnap",
        breakfast: [
          {
            id: "w1d3b1",
            name: "Zabkása mandulatejjel",
            type: "breakfast",
            calories: "500 kcal",
            description: "50g zab + 200ml mandulatej + 1 ek kendermag + 30g fehérjepor",
            ingredients: ["Zab (50g)", "Mandulatej (200ml)", "Kendermag (1 ek)", "Fehérjepor (30g)"]
          }
        ],
        lunch: [
          {
            id: "w1d3l1",
            name: "Marhahús quinoával és cukkini",
            type: "lunch",
            calories: "720 kcal",
            description: "200g marhahús + 180g főtt quinoa + 200g cukkini",
            ingredients: ["Marhahús (200g)", "Főtt quinoa (180g)", "Cukkini (200g)"]
          }
        ],
        dinner: [
          {
            id: "w1d3d1",
            name: "Tőkehal salátával",
            type: "dinner",
            calories: "480 kcal",
            description: "200g tőkehal + 250g saláta + 1 ek olívaolaj",
            ingredients: ["Tőkehal (200g)", "Vegyes saláta (250g)", "Olívaolaj (1 ek)"]
          }
        ]
      },
      // Csütörtök (4. nap) - Edzésnap
      {
        day: 4,
        isTrainingDay: true,
        dayLabel: "Edzésnap",
        breakfast: [
          {
            id: "w1d4b1",
            name: "Tojás füstölt lazaccal",
            type: "breakfast",
            calories: "550 kcal",
            description: "3 tojás + 80g füstölt lazac + 1 paradicsom",
            ingredients: ["Tojás (3db)", "Füstölt lazac (80g)", "Paradicsom (1db)"]
          }
        ],
        lunch: [
          {
            id: "w1d4l1",
            name: "Csirkemell lencsepörkölttel",
            type: "lunch",
            calories: "620 kcal",
            description: "220g csirkemell + 200g főtt lencse",
            ingredients: ["Csirkemell (220g)", "Főtt lencse (200g)", "Fűszerek"]
          }
        ],
        dinner: [
          {
            id: "w1d4d1",
            name: "Kecske túró salátával",
            type: "dinner",
            calories: "450 kcal",
            description: "180g kecske túró + 200g saláta + 1 ek olívaolaj",
            ingredients: ["Kecske túró (180g)", "Vegyes saláta (200g)", "Olívaolaj (1 ek)"]
          }
        ]
      },
      // Péntek (5. nap) - Pihenőnap/Úszás
      {
        day: 5,
        isTrainingDay: false,
        dayLabel: "Pihenőnap/Úszás",
        breakfast: [
          {
            id: "w1d5b1",
            name: "Kecske joghurt mandulával",
            type: "breakfast",
            calories: "450 kcal",
            description: "250g kecske joghurt + 30g mandula + fahéj",
            ingredients: ["Kecske joghurt (250g)", "Mandula (30g)", "Fahéj"]
          }
        ],
        lunch: [
          {
            id: "w1d5l1",
            name: "Sertéskaraj karfiolpürével",
            type: "lunch",
            calories: "600 kcal",
            description: "200g sertéskaraj + 240g karfiolpüré",
            ingredients: ["Sovány sertéskaraj (200g)", "Karfiolpüré (240g)", "Fűszerek"]
          }
        ],
        dinner: [
          {
            id: "w1d5d1",
            name: "Tojás sonkával és zöldséggel",
            type: "dinner",
            calories: "400 kcal",
            description: "2 tojás + 80g sonka + 200g zöldség",
            ingredients: ["Tojás (2db)", "Sonka (80g)", "Vegyes zöldség (200g)"]
          }
        ]
      },
      // Szombat (6. nap) - Pihenőnap
      {
        day: 6,
        isTrainingDay: false,
        dayLabel: "Pihenőnap",
        breakfast: [
          {
            id: "w1d6b1",
            name: "Zabkása fehérjeporral",
            type: "breakfast",
            calories: "480 kcal",
            description: "40g zab + 30g fehérjepor + 1 ek mogyoróvaj",
            ingredients: ["Zab (40g)", "Fehérjepor (30g)", "Mogyoróvaj (1 ek)"]
          }
        ],
        lunch: [
          {
            id: "w1d6l1",
            name: "Pulykamell vegyes zöldséggel",
            type: "lunch",
            calories: "550 kcal",
            description: "220g pulykamell + 300g vegyes zöldség",
            ingredients: ["Pulykamell (220g)", "Brokkoli (100g)", "Sárgarépa (100g)", "Cukkini (100g)"]
          }
        ],
        dinner: [
          {
            id: "w1d6d1",
            name: "Sült hal salátával",
            type: "dinner",
            calories: "450 kcal",
            description: "200g sült hal + 200g saláta",
            ingredients: ["Sült hal (200g)", "Vegyes saláta (200g)", "Citrom"]
          }
        ]
      },
      // Vasárnap (7. nap) - Pihenőnap/Aktív
      {
        day: 7,
        isTrainingDay: false,
        dayLabel: "Pihenőnap/Aktív",
        breakfast: [
          {
            id: "w1d7b1",
            name: "Tojás avokádóval",
            type: "breakfast",
            calories: "450 kcal",
            description: "3 tojás + ½ avokádó",
            ingredients: ["Tojás (3db)", "Avokádó fél (70g)"]
          }
        ],
        lunch: [
          {
            id: "w1d7l1",
            name: "Marhahús párolt zöldséggel",
            type: "lunch",
            calories: "600 kcal",
            description: "200g marhahús + 250g párolt zöldség",
            ingredients: ["Marhahús (200g)", "Brokkoli (100g)", "Karfiol (80g)", "Sárgarépa (70g)"]
          }
        ],
        dinner: [
          {
            id: "w1d7d1",
            name: "Juh túró diókkal",
            type: "dinner",
            calories: "500 kcal",
            description: "200g juh túró + 30g dió + uborka",
            ingredients: ["Juh túró (200g)", "Dió (30g)", "Uborka (100g)"]
          }
        ]
      }
    ]
  },
  {
    week: 2,
    summary: {
      avgCalories: "~2000 kcal/nap",
      protein: "~180g/nap",
      carbs: "Edzésnap ~170g, Pihenőnap ~100g",
      fat: "~70-80g/nap",
      expectedWeightLoss: "0,5-0,8 kg/hét"
    },
    days: [
      // Hétfő (8. nap) - Edzésnap
      {
        day: 1,
        isTrainingDay: true,
        dayLabel: "Edzésnap",
        breakfast: [
          {
            id: "w2d1b1",
            name: "Tojásos reggeli teljes kiőrlésű kenyérrel",
            type: "breakfast",
            calories: "520 kcal",
            description: "3 tojás + 60g teljes kiőrlésű kenyér + ½ avokádó",
            ingredients: ["Tojás 3db (180g)", "Teljes kiőrlésű kenyér (60g)", "Avokádó fél (70g)"]
          }
        ],
        lunch: [
          {
            id: "w2d1l1",
            name: "Csirkemell főtt krumplival és céklával",
            type: "lunch",
            calories: "610 kcal",
            description: "220g csirkemell + 180g főtt burgonya + 200g cékla",
            ingredients: ["Csirkemell (220g)", "Főtt burgonya (180g)", "Cékla (200g)"]
          }
        ],
        dinner: [
          {
            id: "w2d1d1",
            name: "Lazac salátával és gránátalmával",
            type: "dinner",
            calories: "520 kcal",
            description: "180g lazac + 250g saláta + gránátalma",
            ingredients: ["Lazac (180g)", "Vegyes saláta (200g)", "Gránátalma (50g)", "Olívaolaj (1 ek)"]
          }
        ]
      },
      // Kedd (9. nap) - Pihenőnap
      {
        day: 2,
        isTrainingDay: false,
        dayLabel: "Pihenőnap",
        breakfast: [
          {
            id: "w2d2b1",
            name: "Juh joghurt mandulával és kiwivel",
            type: "breakfast",
            calories: "520 kcal",
            description: "250g juh joghurt + 40g mandula + 1 kiwi",
            ingredients: ["Juh joghurt (250g)", "Mandula (40g)", "Kiwi (1db)"]
          }
        ],
        lunch: [
          {
            id: "w2d2l1",
            name: "Pulykamell kelkáposztával",
            type: "lunch",
            calories: "560 kcal",
            description: "220g pulykamell + 220g kelkáposzta + 1 ek tökmagolaj",
            ingredients: ["Pulykamell (220g)", "Kelkáposzta (220g)", "Tökmagolaj (1 ek)"]
          }
        ],
        dinner: [
          {
            id: "w2d2d1",
            name: "Tojás kecske túróval és salátával",
            type: "dinner",
            calories: "480 kcal",
            description: "2 tojás + 150g kecske túró + 200g saláta",
            ingredients: ["Tojás (2db)", "Kecske túró (150g)", "Fejes saláta (100g)", "Paradicsom (100g)"]
          }
        ]
      },
      // Szerda (10. nap) - Edzésnap
      {
        day: 3,
        isTrainingDay: true,
        dayLabel: "Edzésnap",
        breakfast: [
          {
            id: "w2d3b1",
            name: "Zabkása mandulatejjel és kendermag",
            type: "breakfast",
            calories: "500 kcal",
            description: "50g zab + 200ml mandulatej + 1 ek kendermag + 30g fehérjepor",
            ingredients: ["Zab (50g)", "Mandulatej (200ml)", "Kendermag (1 ek)", "Fehérjepor (30g)"]
          }
        ],
        lunch: [
          {
            id: "w2d3l1",
            name: "Marhahús quinoával és sárgarépával",
            type: "lunch",
            calories: "720 kcal",
            description: "200g marhahús + 180g főtt quinoa + 200g sárgarépa",
            ingredients: ["Marhahús (200g)", "Főtt quinoa (180g)", "Sárgarépa (200g)"]
          }
        ],
        dinner: [
          {
            id: "w2d3d1",
            name: "Makréla salátával",
            type: "dinner",
            calories: "480 kcal",
            description: "200g makréla + 250g saláta + 1 ek olívaolaj",
            ingredients: ["Makréla (200g)", "Vegyes saláta (250g)", "Olívaolaj (1 ek)"]
          }
        ]
      },
      // Csütörtök (11. nap) - Edzésnap
      {
        day: 4,
        isTrainingDay: true,
        dayLabel: "Edzésnap",
        breakfast: [
          {
            id: "w2d4b1",
            name: "Tojás füstölt tonhallal",
            type: "breakfast",
            calories: "550 kcal",
            description: "3 tojás + 80g füstölt tonhal + 1 paradicsom",
            ingredients: ["Tojás (3db)", "Füstölt tonhal (80g)", "Paradicsom (1db)"]
          }
        ],
        lunch: [
          {
            id: "w2d4l1",
            name: "Csirkemell babpörkölttel",
            type: "lunch",
            calories: "620 kcal",
            description: "220g csirkemell + 200g bab",
            ingredients: ["Csirkemell (220g)", "Főtt bab (200g)", "Fűszerek"]
          }
        ],
        dinner: [
          {
            id: "w2d4d1",
            name: "Juh túró vegyes salátával",
            type: "dinner",
            calories: "450 kcal",
            description: "180g juh túró + 200g vegyes saláta + 1 ek olívaolaj",
            ingredients: ["Juh túró (180g)", "Rucola (70g)", "Paradicsom (70g)", "Uborka (60g)", "Olívaolaj (1 ek)"]
          }
        ]
      },
      // Péntek (12. nap) - Pihenőnap/Úszás
      {
        day: 5,
        isTrainingDay: false,
        dayLabel: "Pihenőnap/Úszás",
        breakfast: [
          {
            id: "w2d5b1",
            name: "Kecske joghurt diókkal és fahéjjal",
            type: "breakfast",
            calories: "450 kcal",
            description: "250g kecske joghurt + 30g dió + fahéj",
            ingredients: ["Kecske joghurt (250g)", "Dió (30g)", "Fahéj", "Méz (1 tk)"]
          }
        ],
        lunch: [
          {
            id: "w2d5l1",
            name: "Sertéskaraj brokkoli pürével",
            type: "lunch",
            calories: "600 kcal",
            description: "200g sertéskaraj + 240g brokkoli püré",
            ingredients: ["Sovány sertéskaraj (200g)", "Brokkoli püré (240g)", "Fűszerek"]
          }
        ],
        dinner: [
          {
            id: "w2d5d1",
            name: "Tojás pulykasonkával",
            type: "dinner",
            calories: "400 kcal",
            description: "2 tojás + 80g pulykasonka + 200g zöldség",
            ingredients: ["Tojás (2db)", "Pulykasonka (80g)", "Paprika (100g)", "Cukkini (100g)"]
          }
        ]
      },
      // Szombat (13. nap) - Pihenőnap
      {
        day: 6,
        isTrainingDay: false,
        dayLabel: "Pihenőnap",
        breakfast: [
          {
            id: "w2d6b1",
            name: "Zabkása chia maggal",
            type: "breakfast",
            calories: "480 kcal",
            description: "40g zab + 30g fehérjepor + 1 ek chia mag",
            ingredients: ["Zab (40g)", "Fehérjepor (30g)", "Chia mag (1 ek)", "Fahéj"]
          }
        ],
        lunch: [
          {
            id: "w2d6l1",
            name: "Pulykamell sült zöldséggel",
            type: "lunch",
            calories: "550 kcal",
            description: "220g pulykamell + 300g sült zöldség",
            ingredients: ["Pulykamell (220g)", "Padlizsán (100g)", "Cukkini (100g)", "Paprika (100g)"]
          }
        ],
        dinner: [
          {
            id: "w2d6d1",
            name: "Tőkehal saláta ágyon",
            type: "dinner",
            calories: "450 kcal",
            description: "200g tőkehal + 200g saláta",
            ingredients: ["Tőkehal (200g)", "Vegyes saláta (200g)", "Citrom"]
          }
        ]
      },
      // Vasárnap (14. nap) - Pihenőnap/Aktív
      {
        day: 7,
        isTrainingDay: false,
        dayLabel: "Pihenőnap/Aktív",
        breakfast: [
          {
            id: "w2d7b1",
            name: "Rántotta avokádóval",
            type: "breakfast",
            calories: "450 kcal",
            description: "3 tojás + ½ avokádó + paradicsom",
            ingredients: ["Tojás (3db)", "Avokádó fél (70g)", "Koktélparadicsom (50g)"]
          }
        ],
        lunch: [
          {
            id: "w2d7l1",
            name: "Marhahús grillezett zöldséggel",
            type: "lunch",
            calories: "600 kcal",
            description: "200g marhahús + 250g grillezett zöldség",
            ingredients: ["Marhahús (200g)", "Cukkini (100g)", "Padlizsán (80g)", "Paprika (70g)"]
          }
        ],
        dinner: [
          {
            id: "w2d7d1",
            name: "Kecske túró mandulával és uborkával",
            type: "dinner",
            calories: "500 kcal",
            description: "200g kecske túró + 30g mandula + uborka",
            ingredients: ["Kecske túró (200g)", "Mandula (30g)", "Uborka (150g)"]
          }
        ]
      }
    ]
  },
  {
    week: 3,
    summary: {
      avgCalories: "~2000 kcal/nap",
      protein: "~180g/nap",
      carbs: "Edzésnap ~170g, Pihenőnap ~100g",
      fat: "~70-80g/nap",
      expectedWeightLoss: "0,5-0,8 kg/hét"
    },
    days: [
      // Hétfő (15. nap) - Edzésnap
      {
        day: 1,
        isTrainingDay: true,
        dayLabel: "Edzésnap",
        breakfast: [
          {
            id: "w3d1b1",
            name: "Omlett teljes kiőrlésű pirítóssal",
            type: "breakfast",
            calories: "520 kcal",
            description: "3 tojás + 60g teljes kiőrlésű kenyér + ½ avokádó + spenót",
            ingredients: ["Tojás 3db (180g)", "Teljes kiőrlésű kenyér (60g)", "Avokádó fél (70g)", "Spenót (50g)"]
          }
        ],
        lunch: [
          {
            id: "w3d1l1",
            name: "Csirkemell édesburgonyával",
            type: "lunch",
            calories: "610 kcal",
            description: "220g csirkemell + 180g édesburgonya + 200g spárga",
            ingredients: ["Csirkemell (220g)", "Édesburgonya (180g)", "Spárga (200g)"]
          }
        ],
        dinner: [
          {
            id: "w3d1d1",
            name: "Lazac sült zöldséggel",
            type: "dinner",
            calories: "520 kcal",
            description: "180g lazac + 250g sült zöldség + 1 ek olívaolaj",
            ingredients: ["Lazac (180g)", "Brokkoli (100g)", "Sárgarépa (80g)", "Cukkini (70g)", "Olívaolaj (1 ek)"]
          }
        ]
      },
      // Kedd (16. nap) - Pihenőnap
      {
        day: 2,
        isTrainingDay: false,
        dayLabel: "Pihenőnap",
        breakfast: [
          {
            id: "w3d2b1",
            name: "Kecske joghurt gránátalmával",
            type: "breakfast",
            calories: "520 kcal",
            description: "250g kecske joghurt + 40g pekándió + gránátalma",
            ingredients: ["Kecske joghurt (250g)", "Pekándió (40g)", "Gránátalma (50g)"]
          }
        ],
        lunch: [
          {
            id: "w3d2l1",
            name: "Pulykamell káposztasalátával",
            type: "lunch",
            calories: "560 kcal",
            description: "220g pulykamell + 220g káposztasaláta + 1 ek lenmag olaj",
            ingredients: ["Pulykamell (220g)", "Káposztasaláta (220g)", "Lenmag olaj (1 ek)"]
          }
        ],
        dinner: [
          {
            id: "w3d2d1",
            name: "Tojás kecskesajttal",
            type: "dinner",
            calories: "480 kcal",
            description: "2 tojás + 150g kecskesajt + 200g zöldség",
            ingredients: ["Tojás (2db)", "Kecskesajt (150g)", "Paprika (100g)", "Uborka (100g)"]
          }
        ]
      },
      // Szerda (17. nap) - Edzésnap
      {
        day: 3,
        isTrainingDay: true,
        dayLabel: "Edzésnap",
        breakfast: [
          {
            id: "w3d3b1",
            name: "Protein zabkása gyümölcsökkel",
            type: "breakfast",
            calories: "500 kcal",
            description: "50g zab + 200ml mandulatej + 30g fehérjepor + áfonya",
            ingredients: ["Zab (50g)", "Mandulatej (200ml)", "Fehérjepor (30g)", "Áfonya (50g)"]
          }
        ],
        lunch: [
          {
            id: "w3d3l1",
            name: "Marhahús barnarizzsel és spenóttal",
            type: "lunch",
            calories: "720 kcal",
            description: "200g marhahús + 180g barna rizs + 200g spenót",
            ingredients: ["Marhahús (200g)", "Barna rizs (180g)", "Spenót (200g)"]
          }
        ],
        dinner: [
          {
            id: "w3d3d1",
            name: "Tonhal saláta",
            type: "dinner",
            calories: "480 kcal",
            description: "200g tonhal + 250g vegyes saláta + 1 ek olívaolaj",
            ingredients: ["Tonhal (200g)", "Vegyes saláta (250g)", "Olívaolaj (1 ek)", "Citrom"]
          }
        ]
      },
      // Csütörtök (18. nap) - Edzésnap
      {
        day: 4,
        isTrainingDay: true,
        dayLabel: "Edzésnap",
        breakfast: [
          {
            id: "w3d4b1",
            name: "Shakshuka (tojás paradicsomos szószban)",
            type: "breakfast",
            calories: "550 kcal",
            description: "3 tojás + 80g füstölt makréla + paradicsomos szósz",
            ingredients: ["Tojás (3db)", "Füstölt makréla (80g)", "Paradicsom (200g)", "Fűszerpaprika"]
          }
        ],
        lunch: [
          {
            id: "w3d4l1",
            name: "Csirkemell csicseriborsóval",
            type: "lunch",
            calories: "620 kcal",
            description: "220g csirkemell + 200g csicseriborsó + sárgarépa",
            ingredients: ["Csirkemell (220g)", "Főtt csicseriborsó (200g)", "Sárgarépa (100g)"]
          }
        ],
        dinner: [
          {
            id: "w3d4d1",
            name: "Juh túró rukkolával és paradicsommal",
            type: "dinner",
            calories: "450 kcal",
            description: "180g juh túró + 200g rucola-paradicsom saláta + 1 ek olívaolaj",
            ingredients: ["Juh túró (180g)", "Rucola (100g)", "Koktélparadicsom (100g)", "Olívaolaj (1 ek)"]
          }
        ]
      },
      // Péntek (19. nap) - Pihenőnap/Úszás
      {
        day: 5,
        isTrainingDay: false,
        dayLabel: "Pihenőnap/Úszás",
        breakfast: [
          {
            id: "w3d5b1",
            name: "Kecske kefir magvakkal",
            type: "breakfast",
            calories: "450 kcal",
            description: "250g kecske kefir + 30g vegyes mag + fahéj",
            ingredients: ["Kecske kefir (250g)", "Tökmag (15g)", "Napraforgómag (15g)", "Fahéj"]
          }
        ],
        lunch: [
          {
            id: "w3d5l1",
            name: "Sertéskaraj zöldségekkel",
            type: "lunch",
            calories: "600 kcal",
            description: "200g sertéskaraj + 240g vegyes zöldség",
            ingredients: ["Sovány sertéskaraj (200g)", "Zöldbab (100g)", "Sárgarépa (70g)", "Brokkoli (70g)"]
          }
        ],
        dinner: [
          {
            id: "w3d5d1",
            name: "Tojás csirkemellel és salátával",
            type: "dinner",
            calories: "400 kcal",
            description: "2 tojás + 80g csirkemell + 200g saláta",
            ingredients: ["Tojás (2db)", "Csirkemell (80g)", "Fejes saláta (200g)"]
          }
        ]
      },
      // Szombat (20. nap) - Pihenőnap
      {
        day: 6,
        isTrainingDay: false,
        dayLabel: "Pihenőnap",
        breakfast: [
          {
            id: "w3d6b1",
            name: "Protein palacsinta",
            type: "breakfast",
            calories: "480 kcal",
            description: "40g zab + 30g fehérjepor + 2 tojás + áfonya",
            ingredients: ["Zab (40g)", "Fehérjepor (30g)", "Tojás (2db)", "Áfonya (50g)"]
          }
        ],
        lunch: [
          {
            id: "w3d6l1",
            name: "Pulykamell ratatouille-lal",
            type: "lunch",
            calories: "550 kcal",
            description: "220g pulykamell + 300g ratatouille",
            ingredients: ["Pulykamell (220g)", "Padlizsán (100g)", "Cukkini (100g)", "Paradicsom (100g)"]
          }
        ],
        dinner: [
          {
            id: "w3d6d1",
            name: "Sült tengeri hal citrommal",
            type: "dinner",
            calories: "450 kcal",
            description: "200g tengeri hal + 200g grillezett spárga",
            ingredients: ["Tengeri hal (200g)", "Grillezett spárga (200g)", "Citrom"]
          }
        ]
      },
      // Vasárnap (21. nap) - Pihenőnap/Aktív
      {
        day: 7,
        isTrainingDay: false,
        dayLabel: "Pihenőnap/Aktív",
        breakfast: [
          {
            id: "w3d7b1",
            name: "Tojás avokádóval és paradicsommal",
            type: "breakfast",
            calories: "450 kcal",
            description: "3 tojás + ½ avokádó + koktélparadicsom",
            ingredients: ["Tojás (3db)", "Avokádó fél (70g)", "Koktélparadicsom (100g)"]
          }
        ],
        lunch: [
          {
            id: "w3d7l1",
            name: "Marhahús kelkáposztával",
            type: "lunch",
            calories: "600 kcal",
            description: "200g marhahús + 250g párolt kelkáposzta",
            ingredients: ["Marhahús (200g)", "Kelkáposzta (250g)", "Fűszerek"]
          }
        ],
        dinner: [
          {
            id: "w3d7d1",
            name: "Kecske túró dióval és mézes uborkával",
            type: "dinner",
            calories: "500 kcal",
            description: "200g kecske túró + 30g dió + uborka + méz",
            ingredients: ["Kecske túró (200g)", "Dió (30g)", "Uborka (150g)", "Méz (1 tk)"]
          }
        ]
      }
    ]
  },
  {
    week: 4,
    summary: {
      avgCalories: "~2000 kcal/nap",
      protein: "~180g/nap",
      carbs: "Edzésnap ~170g, Pihenőnap ~100g",
      fat: "~70-80g/nap",
      expectedWeightLoss: "0,5-0,8 kg/hét"
    },
    days: [
      // Hétfő (22. nap) - Edzésnap
      {
        day: 1,
        isTrainingDay: true,
        dayLabel: "Edzésnap",
        breakfast: [
          {
            id: "w4d1b1",
            name: "Tojásos reggeli zabkenyérrel",
            type: "breakfast",
            calories: "520 kcal",
            description: "3 tojás + 60g zabkenyér + ½ avokádó + paradicsom",
            ingredients: ["Tojás 3db (180g)", "Zabkenyér (60g)", "Avokádó fél (70g)", "Paradicsom (1db)"]
          }
        ],
        lunch: [
          {
            id: "w4d1l1",
            name: "Csirkemell vörösburgonyával és céklával",
            type: "lunch",
            calories: "610 kcal",
            description: "220g csirkemell + 180g vörösburgonya + 200g cékla saláta",
            ingredients: ["Csirkemell (220g)", "Vörösburgonya (180g)", "Cékla (200g)", "Balzsamecet"]
          }
        ],
        dinner: [
          {
            id: "w4d1d1",
            name: "Lazac quinoával és zöldbabbal",
            type: "dinner",
            calories: "520 kcal",
            description: "180g lazac + 100g quinoa + 150g zöldbab",
            ingredients: ["Lazac (180g)", "Quinoa (100g)", "Zöldbab (150g)", "Olívaolaj (1 ek)"]
          }
        ]
      },
      // Kedd (23. nap) - Pihenőnap
      {
        day: 2,
        isTrainingDay: false,
        dayLabel: "Pihenőnap",
        breakfast: [
          {
            id: "w4d2b1",
            name: "Juh joghurt chia maggal és bogyós gyümölcsökkel",
            type: "breakfast",
            calories: "520 kcal",
            description: "250g juh joghurt + 40g kesudió + bogyós gyümölcsök",
            ingredients: ["Juh joghurt (250g)", "Kesudió (40g)", "Áfonya (30g)", "Málna (20g)"]
          }
        ],
        lunch: [
          {
            id: "w4d2l1",
            name: "Pulykamell grillezett zöldségekkel",
            type: "lunch",
            calories: "560 kcal",
            description: "220g pulykamell + 220g grillezett zöldség + 1 ek olívaolaj",
            ingredients: ["Pulykamell (220g)", "Cukkini (100g)", "Padlizsán (60g)", "Paprika (60g)", "Olívaolaj (1 ek)"]
          }
        ],
        dinner: [
          {
            id: "w4d2d1",
            name: "Tojás mozzarellával és rukkolával",
            type: "dinner",
            calories: "480 kcal",
            description: "2 tojás + 150g mozzarella + 200g rucola-paradicsom",
            ingredients: ["Tojás (2db)", "Mozzarella (150g)", "Rucola (100g)", "Koktélparadicsom (100g)"]
          }
        ]
      },
      // Szerda (24. nap) - Edzésnap
      {
        day: 3,
        isTrainingDay: true,
        dayLabel: "Edzésnap",
        breakfast: [
          {
            id: "w4d3b1",
            name: "Protein zabkása banánnal",
            type: "breakfast",
            calories: "500 kcal",
            description: "50g zab + 200ml kókusztej + 30g fehérjepor + banán",
            ingredients: ["Zab (50g)", "Kókusztej (200ml)", "Fehérjepor (30g)", "Banán (100g)"]
          }
        ],
        lunch: [
          {
            id: "w4d3l1",
            name: "Marhahús bulgurral és sütőtökkel",
            type: "lunch",
            calories: "720 kcal",
            description: "200g marhahús + 180g bulgur + 200g sütőtök",
            ingredients: ["Marhahús (200g)", "Bulgur (180g)", "Sütőtök (200g)"]
          }
        ],
        dinner: [
          {
            id: "w4d3d1",
            name: "Tőkehal mediterrán salátával",
            type: "dinner",
            calories: "480 kcal",
            description: "200g tőkehal + 250g mediterrán saláta + 1 ek olívaolaj",
            ingredients: ["Tőkehal (200g)", "Fejes saláta (100g)", "Paradicsom (80g)", "Uborka (70g)", "Olívaolaj (1 ek)"]
          }
        ]
      },
      // Csütörtök (25. nap) - Edzésnap
      {
        day: 4,
        isTrainingDay: true,
        dayLabel: "Edzésnap",
        breakfast: [
          {
            id: "w4d4b1",
            name: "Omlett füstölt tonhallal és spenóttal",
            type: "breakfast",
            calories: "550 kcal",
            description: "3 tojás + 80g füstölt tonhal + spenót + paradicsom",
            ingredients: ["Tojás (3db)", "Füstölt tonhal (80g)", "Spenót (100g)", "Paradicsom (1db)"]
          }
        ],
        lunch: [
          {
            id: "w4d4l1",
            name: "Csirkemell vöröslencse főzelékkel",
            type: "lunch",
            calories: "620 kcal",
            description: "220g csirkemell + 200g vöröslencse főzelék",
            ingredients: ["Csirkemell (220g)", "Vöröslencse (200g)", "Sárgarépa (50g)", "Fűszerek"]
          }
        ],
        dinner: [
          {
            id: "w4d4d1",
            name: "Juh túró avokádóval és paradicsommal",
            type: "dinner",
            calories: "450 kcal",
            description: "180g juh túró + ½ avokádó + 150g paradicsom + 1 ek olívaolaj",
            ingredients: ["Juh túró (180g)", "Avokádó fél (70g)", "Paradicsom (150g)", "Olívaolaj (1 ek)"]
          }
        ]
      },
      // Péntek (26. nap) - Pihenőnap/Úszás
      {
        day: 5,
        isTrainingDay: false,
        dayLabel: "Pihenőnap/Úszás",
        breakfast: [
          {
            id: "w4d5b1",
            name: "Kecske túrókrém gyümölcsökkel",
            type: "breakfast",
            calories: "450 kcal",
            description: "250g kecske túró + 30g dió + fahéj + bogyós gyümölcsök",
            ingredients: ["Kecske túró (250g)", "Dió (30g)", "Fahéj", "Áfonya (50g)"]
          }
        ],
        lunch: [
          {
            id: "w4d5l1",
            name: "Sertéskaraj spenóttal és gombával",
            type: "lunch",
            calories: "600 kcal",
            description: "200g sertéskaraj + 140g spenót + 100g gomba",
            ingredients: ["Sovány sertéskaraj (200g)", "Spenót (140g)", "Gomba (100g)"]
          }
        ],
        dinner: [
          {
            id: "w4d5d1",
            name: "Tojás csirkemellel és avokádóval",
            type: "dinner",
            calories: "400 kcal",
            description: "2 tojás + 80g csirkemell + ½ avokádó",
            ingredients: ["Tojás (2db)", "Csirkemell (80g)", "Avokádó fél (70g)", "Saláta (50g)"]
          }
        ]
      },
      // Szombat (27. nap) - Pihenőnap
      {
        day: 6,
        isTrainingDay: false,
        dayLabel: "Pihenőnap",
        breakfast: [
          {
            id: "w4d6b1",
            name: "Protein smoothie bowl",
            type: "breakfast",
            calories: "480 kcal",
            description: "40g zab + 30g fehérjepor + 200ml mandulatej + toppings",
            ingredients: ["Zab (40g)", "Fehérjepor (30g)", "Mandulatej (200ml)", "Banán (50g)", "Áfonya (30g)"]
          }
        ],
        lunch: [
          {
            id: "w4d6l1",
            name: "Pulykamell mediterrán zöldségekkel",
            type: "lunch",
            calories: "550 kcal",
            description: "220g pulykamell + 300g mediterrán zöldség",
            ingredients: ["Pulykamell (220g)", "Cukkini (100g)", "Padlizsán (100g)", "Paradicsom (100g)"]
          }
        ],
        dinner: [
          {
            id: "w4d6d1",
            name: "Sült lazac citromos spárgával",
            type: "dinner",
            calories: "450 kcal",
            description: "200g lazac + 200g spárga + citrom",
            ingredients: ["Lazac (200g)", "Spárga (200g)", "Citrom", "Olívaolaj (1 ek)"]
          }
        ]
      },
      // Vasárnap (28. nap) - Pihenőnap/Aktív
      {
        day: 7,
        isTrainingDay: false,
        dayLabel: "Pihenőnap/Aktív",
        breakfast: [
          {
            id: "w4d7b1",
            name: "Shakshuka avokádóval",
            type: "breakfast",
            calories: "450 kcal",
            description: "3 tojás + ½ avokádó + paradicsomos szósz",
            ingredients: ["Tojás (3db)", "Avokádó fél (70g)", "Paradicsom (150g)", "Fűszerpaprika"]
          }
        ],
        lunch: [
          {
            id: "w4d7l1",
            name: "Marhahús sült gyökérzöldségekkel",
            type: "lunch",
            calories: "600 kcal",
            description: "200g marhahús + 250g sült gyökérzöldség",
            ingredients: ["Marhahús (200g)", "Sárgarépa (100g)", "Cékla (80g)", "Paszternák (70g)"]
          }
        ],
        dinner: [
          {
            id: "w4d7d1",
            name: "Túró magkeverékkel és gránátalmával",
            type: "dinner",
            calories: "500 kcal",
            description: "200g túró + 30g magkeverék + gránátalma + uborka",
            ingredients: ["Túró (200g)", "Vegyes mag (30g)", "Gránátalma (50g)", "Uborka (100g)"]
          }
        ]
      }
    ]
  }
];

// Food Database for the Foods catalog page
export interface Food {
  id: string;
  name: string;
  category: string;
  description: string;
  calories: string;
  protein: number;
  carbs: number;
  fat: number;
  benefits: string[];
  suitableFor: string[];
}

export const foodDatabase: Food[] = [
  // Fehérjék - Tojás és szárnyas
  {
    id: "f1",
    name: "Tojás",
    category: "Fehérje",
    description: "Teljes értékű fehérjeforrás, gazdag vitaminokban és ásványi anyagokban",
    calories: "143",
    protein: 13,
    carbs: 1,
    fat: 10,
    benefits: ["Teljes értékű fehérje", "Gazdag B-vitaminokban", "Kolint tartalmaz"],
    suitableFor: ["Reggeli", "Vacsora"]
  },
  {
    id: "f2",
    name: "Csirkemell",
    category: "Fehérje",
    description: "Sovány, magas fehérjetartalmú hús, alacsony zsírtartalommal",
    calories: "165",
    protein: 31,
    carbs: 0,
    fat: 4,
    benefits: ["Magas fehérjetartalom", "Alacsony zsír", "Gazdag B-vitaminokban"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f3",
    name: "Pulykamell",
    category: "Fehérje",
    description: "Sovány, könnyen emészthető fehérjeforrás",
    calories: "135",
    protein: 30,
    carbs: 0,
    fat: 1,
    benefits: ["Nagyon alacsony zsírtartalom", "Magas fehérje", "Könnyen emészthető"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  // Fehérjék - Hal
  {
    id: "f4",
    name: "Lazac",
    category: "Fehérje",
    description: "Zsíros hal, gazdag omega-3 zsírsavakban",
    calories: "208",
    protein: 20,
    carbs: 0,
    fat: 13,
    benefits: ["Omega-3 zsírsavak", "D-vitamin", "Gyulladáscsökkentő hatás"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f5",
    name: "Tőkehal",
    category: "Fehérje",
    description: "Sovány fehér hal, alacsony zsírtartalommal",
    calories: "82",
    protein: 18,
    carbs: 0,
    fat: 1,
    benefits: ["Nagyon alacsony zsír", "Magas fehérje", "Alacsony kalória"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f6",
    name: "Tonhal",
    category: "Fehérje",
    description: "Sovány hal, gazdag fehérjében és omega-3-ban",
    calories: "144",
    protein: 30,
    carbs: 0,
    fat: 1,
    benefits: ["Magas fehérje", "Omega-3 zsírsavak", "Alacsony kalória"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f7",
    name: "Makréla",
    category: "Fehérje",
    description: "Zsíros hal, gazdag omega-3 zsírsavakban és D-vitaminban",
    calories: "205",
    protein: 19,
    carbs: 0,
    fat: 14,
    benefits: ["Omega-3 zsírsavak", "D-vitamin", "B12-vitamin"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f7a",
    name: "Csuka",
    category: "Fehérje",
    description: "Sovány édesvízi hal, alacsony zsírtartalommal",
    calories: "88",
    protein: 19,
    carbs: 0,
    fat: 1,
    benefits: ["Nagyon alacsony zsír", "Magas fehérje", "Foszfor"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f7b",
    name: "Süllő",
    category: "Fehérje",
    description: "Nemes édesvízi hal, sovány és fehérjében gazdag",
    calories: "84",
    protein: 19,
    carbs: 0,
    fat: 1,
    benefits: ["Alacsony zsír", "Magas fehérje", "Könnyen emészthető"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f7c",
    name: "Sügér",
    category: "Fehérje",
    description: "Édesvízi hal, finom ízű és alacsony zsírtartalmú",
    calories: "91",
    protein: 18,
    carbs: 0,
    fat: 2,
    benefits: ["Alacsony zsír", "Teljes értékű fehérje", "Szelén"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f7d",
    name: "Pisztráng",
    category: "Fehérje",
    description: "Édesvízi vagy tengeri hal, közepes zsírtartalommal",
    calories: "119",
    protein: 20,
    carbs: 0,
    fat: 3,
    benefits: ["Omega-3 zsírsavak", "B-vitaminok", "Foszfor"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f7e",
    name: "Harcsa",
    category: "Fehérje",
    description: "Édesvízi hal, zsírosabb változat, gazdag fehérjében",
    calories: "105",
    protein: 16,
    carbs: 0,
    fat: 4,
    benefits: ["Teljes értékű fehérje", "B12-vitamin", "Niacin"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f7f",
    name: "Ponty",
    category: "Fehérje",
    description: "Hagyományos édesvízi hal, közepes zsírtartalommal",
    calories: "127",
    protein: 18,
    carbs: 0,
    fat: 6,
    benefits: ["Teljes értékű fehérje", "Omega-3 zsírsavak", "Foszfor"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  // Fehérjék - Vöröshús
  {
    id: "f8",
    name: "Marhahús",
    category: "Fehérje",
    description: "Gazdag fehérjében, vasban és B-vitaminokban",
    calories: "250",
    protein: 26,
    carbs: 0,
    fat: 15,
    benefits: ["Magas vastartalom", "Teljes értékű fehérje", "B12-vitamin"],
    suitableFor: ["Ebéd"]
  },
  {
    id: "f9",
    name: "Sovány sertéskaraj",
    category: "Fehérje",
    description: "Sovány hús, gazdag fehérjében",
    calories: "143",
    protein: 26,
    carbs: 0,
    fat: 4,
    benefits: ["Alacsony zsír", "Magas fehérje", "B-vitaminok"],
    suitableFor: ["Ebéd"]
  },
  // Tejtermékek - Csak kecske és juh eredetű!
  {
    id: "f10",
    name: "Kecske joghurt",
    category: "Tejtermék",
    description: "Kecsketejes joghurt, könnyen emészthető, probiotikus",
    calories: "97",
    protein: 9,
    carbs: 4,
    fat: 5,
    benefits: ["Könnyen emészthető", "Probiotikumok", "Kalcium"],
    suitableFor: ["Reggeli", "Vacsora"]
  },
  {
    id: "f10a",
    name: "Juh joghurt",
    category: "Tejtermék",
    description: "Juhtejből készült joghurt, gazdag fehérjében",
    calories: "105",
    protein: 10,
    carbs: 5,
    fat: 6,
    benefits: ["Magas fehérje", "Probiotikumok", "Könnyen emészthető"],
    suitableFor: ["Reggeli", "Vacsora"]
  },
  {
    id: "f11",
    name: "Kecske túró",
    category: "Tejtermék",
    description: "Kecsketejes túró, könnyen emészthető, magas fehérjetartalmú",
    calories: "98",
    protein: 11,
    carbs: 3,
    fat: 4,
    benefits: ["Magas fehérje", "Könnyen emészthető", "Kalcium"],
    suitableFor: ["Reggeli", "Vacsora"]
  },
  {
    id: "f11a",
    name: "Juh túró",
    category: "Tejtermék",
    description: "Juhtejből készült túró, gazdag fehérjében és kalciumban",
    calories: "105",
    protein: 12,
    carbs: 3,
    fat: 5,
    benefits: ["Magas fehérje", "Kalcium", "Könnyen emészthető"],
    suitableFor: ["Reggeli", "Vacsora"]
  },
  {
    id: "f12",
    name: "Kecske mozzarella",
    category: "Tejtermék",
    description: "Kecsketejes mozzarella, lágy sajt közepes fehérjetartalommal",
    calories: "280",
    protein: 22,
    carbs: 2,
    fat: 21,
    benefits: ["Kalcium", "Fehérje", "Könnyen emészthető"],
    suitableFor: ["Vacsora"]
  },
  {
    id: "f13",
    name: "Kecskesajt",
    category: "Tejtermék",
    description: "Könnyen emészthető kecskesajt, gazdag fehérjében",
    calories: "364",
    protein: 22,
    carbs: 3,
    fat: 30,
    benefits: ["Könnyen emészthető", "Gazdag fehérjében", "Kalcium"],
    suitableFor: ["Vacsora"]
  },
  {
    id: "f13a",
    name: "Juhsajt",
    category: "Tejtermék",
    description: "Tradicionális juhsajt, gazdag fehérjében és kalciumban",
    calories: "380",
    protein: 23,
    carbs: 2,
    fat: 32,
    benefits: ["Magas fehérje", "Kalcium", "Könnyen emészthető"],
    suitableFor: ["Vacsora"]
  },
  {
    id: "f13b",
    name: "Kecske kefir",
    category: "Tejtermék",
    description: "Kecsketejes kefir, probiotikus ital",
    calories: "66",
    protein: 4,
    carbs: 5,
    fat: 4,
    benefits: ["Probiotikumok", "Könnyen emészthető", "Emésztést segíti"],
    suitableFor: ["Reggeli"]
  },
  // Komplex szénhidrátok
  {
    id: "f14",
    name: "Zab",
    category: "Komplex szénhidrát",
    description: "Teljes kiőrlésű gabona, gazdag rostokban",
    calories: "389",
    protein: 17,
    carbs: 66,
    fat: 7,
    benefits: ["Magas rosttartalom", "Lassú felszívódás", "Béta-glükán"],
    suitableFor: ["Reggeli"]
  },
  {
    id: "f15",
    name: "Quinoa",
    category: "Komplex szénhidrát",
    description: "Teljes értékű fehérjét tartalmazó pszeudo-gabona",
    calories: "120",
    protein: 4,
    carbs: 21,
    fat: 2,
    benefits: ["Teljes értékű fehérje", "Gluténmentes", "Magas rosttartalom"],
    suitableFor: ["Ebéd"]
  },
  {
    id: "f16",
    name: "Barna rizs",
    category: "Komplex szénhidrát",
    description: "Teljes kiőrlésű rizs, gazdag rostokban",
    calories: "111",
    protein: 3,
    carbs: 23,
    fat: 1,
    benefits: ["Lassú felszívódás", "Rosttartalom", "Ásványi anyagok"],
    suitableFor: ["Ebéd"]
  },
  {
    id: "f17",
    name: "Burgonya",
    category: "Komplex szénhidrát",
    description: "Keményítőben gazdag gumó, C-vitaminnal",
    calories: "77",
    protein: 2,
    carbs: 17,
    fat: 0,
    benefits: ["C-vitamin", "Kálium", "Laktató hatás"],
    suitableFor: ["Ebéd"]
  },
  {
    id: "f18",
    name: "Édesburgonya",
    category: "Komplex szénhidrát",
    description: "Béta-karotinban gazdag gumó, édes ízzel",
    calories: "86",
    protein: 2,
    carbs: 20,
    fat: 0,
    benefits: ["Béta-karotin", "Rosttartalom", "Alacsony glikémiás index"],
    suitableFor: ["Ebéd"]
  },
  {
    id: "f19",
    name: "Teljes kiőrlésű kenyér",
    category: "Komplex szénhidrát",
    description: "Rostos kenyér, lassú felszívódással",
    calories: "247",
    protein: 13,
    carbs: 41,
    fat: 3,
    benefits: ["Magas rosttartalom", "B-vitaminok", "Lassú felszívódás"],
    suitableFor: ["Reggeli"]
  },
  {
    id: "f20",
    name: "Bulgur",
    category: "Komplex szénhidrát",
    description: "Előfőzött búza, gyors elkészítés",
    calories: "83",
    protein: 3,
    carbs: 19,
    fat: 0,
    benefits: ["Rosttartalom", "Alacsony zsír", "Gyors elkészítés"],
    suitableFor: ["Ebéd"]
  },
  // Hüvelyesek
  {
    id: "f21",
    name: "Lencse",
    category: "Hüvelyes",
    description: "Magas fehérje- és rosttartalmú hüvelyes",
    calories: "116",
    protein: 9,
    carbs: 20,
    fat: 0,
    benefits: ["Növényi fehérje", "Magas rosttartalom", "Vastartalom"],
    suitableFor: ["Ebéd"]
  },
  {
    id: "f22",
    name: "Csicseriborsó",
    category: "Hüvelyes",
    description: "Sokoldalú hüvelyes, gazdag fehérjében",
    calories: "164",
    protein: 9,
    carbs: 27,
    fat: 3,
    benefits: ["Növényi fehérje", "Rosttartalom", "Folsav"],
    suitableFor: ["Ebéd"]
  },
  {
    id: "f23",
    name: "Bab",
    category: "Hüvelyes",
    description: "Magas fehérje- és rosttartalmú hüvelyes",
    calories: "127",
    protein: 8,
    carbs: 23,
    fat: 1,
    benefits: ["Növényi fehérje", "Magas rosttartalom", "Alacsony zsír"],
    suitableFor: ["Ebéd"]
  },
  // Egészséges zsírok
  {
    id: "f24",
    name: "Avokádó",
    category: "Egészséges zsír",
    description: "Egészséges egyszeresen telítetlen zsírsavakban gazdag gyümölcs",
    calories: "160",
    protein: 2,
    carbs: 9,
    fat: 15,
    benefits: ["Egészséges zsírok", "Rosttartalom", "Kálium"],
    suitableFor: ["Reggeli", "Vacsora"]
  },
  {
    id: "f25",
    name: "Olívaolaj",
    category: "Egészséges zsír",
    description: "Extra szűz olívaolaj, gazdag antioxidánsokban",
    calories: "884",
    protein: 0,
    carbs: 0,
    fat: 100,
    benefits: ["Egészséges zsírok", "Antioxidánsok", "Gyulladáscsökkentő"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f26",
    name: "Tökmagolaj",
    category: "Egészséges zsír",
    description: "Hidegen sajtolt olaj, gazdag ásványi anyagokban",
    calories: "884",
    protein: 0,
    carbs: 0,
    fat: 100,
    benefits: ["Omega-6 zsírsavak", "Cink", "Magnézium"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  // Magvak
  {
    id: "f27",
    name: "Dió",
    category: "Mag",
    description: "Omega-3 zsírsavakban gazdag mag",
    calories: "654",
    protein: 15,
    carbs: 14,
    fat: 65,
    benefits: ["Omega-3 zsírsavak", "Antioxidánsok", "Agyműködés támogatása"],
    suitableFor: ["Reggeli", "Vacsora"]
  },
  {
    id: "f28",
    name: "Mandula",
    category: "Mag",
    description: "E-vitaminban és magnéziumban gazdag mag",
    calories: "579",
    protein: 21,
    carbs: 22,
    fat: 50,
    benefits: ["E-vitamin", "Magnézium", "Rosttartalom"],
    suitableFor: ["Reggeli", "Vacsora"]
  },
  {
    id: "f29",
    name: "Kesudió",
    category: "Mag",
    description: "Krémes ízű mag, gazdag rézben és magnéziumban",
    calories: "553",
    protein: 18,
    carbs: 30,
    fat: 44,
    benefits: ["Réz", "Magnézium", "Egészséges zsírok"],
    suitableFor: ["Reggeli", "Vacsora"]
  },
  {
    id: "f30",
    name: "Kendermag",
    category: "Mag",
    description: "Teljes értékű fehérjét tartalmazó mag",
    calories: "553",
    protein: 32,
    carbs: 9,
    fat: 49,
    benefits: ["Teljes értékű fehérje", "Omega-3 és omega-6", "Rosttartalom"],
    suitableFor: ["Reggeli"]
  },
  {
    id: "f31",
    name: "Chia mag",
    category: "Mag",
    description: "Omega-3-ban és rostban gazdag mag",
    calories: "486",
    protein: 17,
    carbs: 42,
    fat: 31,
    benefits: ["Omega-3 zsírsavak", "Magas rosttartalom", "Antioxidánsok"],
    suitableFor: ["Reggeli"]
  },
  // Zöldségek
  {
    id: "f32",
    name: "Brokkoli",
    category: "Zöldség",
    description: "C-vitaminban és rostban gazdag zöldség",
    calories: "34",
    protein: 3,
    carbs: 7,
    fat: 0,
    benefits: ["C-vitamin", "K-vitamin", "Rosttartalom"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f33",
    name: "Spenót",
    category: "Zöldség",
    description: "Vasban és folsavban gazdag leveles zöldség",
    calories: "23",
    protein: 3,
    carbs: 4,
    fat: 0,
    benefits: ["Vastartalom", "Folsav", "K-vitamin"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f34",
    name: "Kelkáposzta",
    category: "Zöldség",
    description: "Szuperétel, gazdag vitaminokban és ásványi anyagokban",
    calories: "49",
    protein: 4,
    carbs: 9,
    fat: 1,
    benefits: ["C-vitamin", "K-vitamin", "Antioxidánsok"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f35",
    name: "Spárga",
    category: "Zöldség",
    description: "Alacsony kalóriájú, rostos zöldség",
    calories: "20",
    protein: 2,
    carbs: 4,
    fat: 0,
    benefits: ["Folsav", "K-vitamin", "Alacsony kalória"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f36",
    name: "Cukkini",
    category: "Zöldség",
    description: "Alacsony kalóriájú, sokoldalú zöldség",
    calories: "17",
    protein: 1,
    carbs: 3,
    fat: 0,
    benefits: ["Alacsony kalória", "C-vitamin", "Magas víztartalom"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f37",
    name: "Sárgarépa",
    category: "Zöldség",
    description: "Béta-karotinban gazdag gyökérzöldség",
    calories: "41",
    protein: 1,
    carbs: 10,
    fat: 0,
    benefits: ["Béta-karotin", "A-vitamin", "Rosttartalom"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f38",
    name: "Cékla",
    category: "Zöldség",
    description: "Nitrátban gazdag gyökérzöldség, teljesítményfokozó hatással",
    calories: "43",
    protein: 2,
    carbs: 10,
    fat: 0,
    benefits: ["Nitrát", "Folsav", "Teljesítményfokozás"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f39",
    name: "Paradicsom",
    category: "Zöldség",
    description: "Likopénben gazdag zöldség, antioxidáns hatással",
    calories: "18",
    protein: 1,
    carbs: 4,
    fat: 0,
    benefits: ["Likopén", "C-vitamin", "Antioxidánsok"],
    suitableFor: ["Reggeli", "Ebéd", "Vacsora"]
  },
  {
    id: "f40",
    name: "Uborka",
    category: "Zöldség",
    description: "Magas víztartalmú, hidratáló zöldség",
    calories: "15",
    protein: 1,
    carbs: 4,
    fat: 0,
    benefits: ["Magas víztartalom", "Hidratálás", "Alacsony kalória"],
    suitableFor: ["Reggeli", "Ebéd", "Vacsora"]
  },
  {
    id: "f41",
    name: "Paprika",
    category: "Zöldség",
    description: "C-vitaminban gazdag édes zöldség",
    calories: "31",
    protein: 1,
    carbs: 6,
    fat: 0,
    benefits: ["C-vitamin", "Antioxidánsok", "Alacsony kalória"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f42",
    name: "Karfiol",
    category: "Zöldség",
    description: "Alacsony szénhidráttartalmú, sokoldalú zöldség",
    calories: "25",
    protein: 2,
    carbs: 5,
    fat: 0,
    benefits: ["Alacsony szénhidrát", "C-vitamin", "Rosttartalom"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f43",
    name: "Káposzta",
    category: "Zöldség",
    description: "Rostos, alacsony kalóriájú zöldség",
    calories: "25",
    protein: 1,
    carbs: 6,
    fat: 0,
    benefits: ["Rosttartalom", "C-vitamin", "Alacsony kalória"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f44",
    name: "Zöldbab",
    category: "Zöldség",
    description: "Alacsony kalóriájú hüvelyesféle, gazdag rostban",
    calories: "31",
    protein: 2,
    carbs: 7,
    fat: 0,
    benefits: ["Rosttartalom", "Folsav", "Alacsony kalória"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f45",
    name: "Rucola",
    category: "Zöldség",
    description: "Csípős ízű leveles zöldség, gazdag K-vitaminban",
    calories: "25",
    protein: 3,
    carbs: 4,
    fat: 1,
    benefits: ["K-vitamin", "Kalcium", "Antioxidánsok"],
    suitableFor: ["Vacsora"]
  },
  {
    id: "f46",
    name: "Fejes saláta",
    category: "Zöldség",
    description: "Alacsony kalóriájú leveles zöldség",
    calories: "15",
    protein: 1,
    carbs: 3,
    fat: 0,
    benefits: ["Alacsony kalória", "Hidratálás", "Rosttartalom"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f47",
    name: "Padlizsán",
    category: "Zöldség",
    description: "Alacsony kalóriájú, rostos zöldség",
    calories: "25",
    protein: 1,
    carbs: 6,
    fat: 0,
    benefits: ["Antioxidánsok", "Rosttartalom", "Alacsony kalória"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f48",
    name: "Sütőtök",
    category: "Zöldség",
    description: "Béta-karotinban gazdag, édes ízű zöldség",
    calories: "26",
    protein: 1,
    carbs: 7,
    fat: 0,
    benefits: ["Béta-karotin", "Rosttartalom", "A-vitamin"],
    suitableFor: ["Ebéd"]
  },
  {
    id: "f49",
    name: "Gomba",
    category: "Zöldség",
    description: "Alacsony kalóriájú, gazdag D-vitaminban (ha napfényen szárították)",
    calories: "22",
    protein: 3,
    carbs: 3,
    fat: 0,
    benefits: ["D-vitamin", "Szelén", "Alacsony kalória"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  // Gyümölcsök
  {
    id: "f50",
    name: "Banán",
    category: "Komplex szénhidrát",
    description: "Káliumban gazdag gyümölcs, gyors energiaforrás",
    calories: "89",
    protein: 1,
    carbs: 23,
    fat: 0,
    benefits: ["Kálium", "B6-vitamin", "Gyors energia"],
    suitableFor: ["Reggeli", "Edzés után"]
  },
  {
    id: "f51",
    name: "Áfonya",
    category: "Egészséges zsír",
    description: "Antioxidánsokban gazdag bogyós gyümölcs",
    calories: "57",
    protein: 1,
    carbs: 14,
    fat: 0,
    benefits: ["Antioxidánsok", "C-vitamin", "Rosttartalom"],
    suitableFor: ["Reggeli"]
  },
  {
    id: "f52",
    name: "Gránátalma",
    category: "Egészséges zsír",
    description: "Antioxidánsokban rendkívül gazdag gyümölcs",
    calories: "83",
    protein: 2,
    carbs: 19,
    fat: 1,
    benefits: ["Antioxidánsok", "C-vitamin", "Gyulladáscsökkentő"],
    suitableFor: ["Reggeli", "Vacsora"]
  },
  {
    id: "f53",
    name: "Kiwi",
    category: "Egészséges zsír",
    description: "C-vitaminban rendkívül gazdag gyümölcs",
    calories: "61",
    protein: 1,
    carbs: 15,
    fat: 1,
    benefits: ["Magas C-vitamin", "Rosttartalom", "Emésztéssegítő"],
    suitableFor: ["Reggeli"]
  },
  {
    id: "f54",
    name: "Citrom",
    category: "Egészséges zsír",
    description: "C-vitaminban gazdag citrusfélé",
    calories: "29",
    protein: 1,
    carbs: 9,
    fat: 0,
    benefits: ["C-vitamin", "Antioxidánsok", "Detoxikálás"],
    suitableFor: ["Ebéd", "Vacsora"]
  },
  {
    id: "f55",
    name: "Málna",
    category: "Egészséges zsír",
    description: "Magas rosttartalmú bogyós gyümölcs",
    calories: "52",
    protein: 1,
    carbs: 12,
    fat: 1,
    benefits: ["Magas rosttartalom", "C-vitamin", "Antioxidánsok"],
    suitableFor: ["Reggeli"]
  },
  // Egyéb
  {
    id: "f56",
    name: "Fehérjepor",
    category: "Fehérje",
    description: "Tejsavó alapú fehérjekiegészítő",
    calories: "120",
    protein: 25,
    carbs: 3,
    fat: 1,
    benefits: ["Magas fehérje", "Gyors felszívódás", "Alacsony kalória"],
    suitableFor: ["Reggeli", "Edzés után"]
  },
  {
    id: "f57",
    name: "Mandulatej",
    category: "Tejtermék",
    description: "Növényi alapú tejalternatíva",
    calories: "17",
    protein: 1,
    carbs: 1,
    fat: 1,
    benefits: ["Laktózmentes", "Alacsony kalória", "E-vitamin"],
    suitableFor: ["Reggeli"]
  },
  {
    id: "f58",
    name: "Kókusztej",
    category: "Egészséges zsír",
    description: "Közepes láncú zsírsavakban gazdag növényi tej",
    calories: "230",
    protein: 2,
    carbs: 6,
    fat: 24,
    benefits: ["MCT zsírsavak", "Laktózmentes", "Krémes íz"],
    suitableFor: ["Reggeli"]
  }
];
