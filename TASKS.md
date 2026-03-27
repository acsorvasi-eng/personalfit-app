# nura - Active Tasks

## In Progress
(none)

## Pending

### Priority 1 — Quick wins
- [ ] Order button on daily menus -> Glovo/Wolt/Bolt Food deep link
- [ ] Food images (FoodImage) on breakfast/lunch/dinner cards (UnifiedMenu)
- [ ] Language consistency fix (HU/RO/EN mixing cleanup)
- [ ] Meal count -> calendar adaptation (1-5 meals/day)

### Priority 2 — Short term (1-2 weeks)
- [ ] Animated onboarding intro (3 screens -> 1 animated)
- [ ] Religious fasting calendar integration
- [ ] azilapranz.ro scraper (13 RO cities)
- [ ] napimenu.eu + hovamenjek.hu scraper (HU)
- [ ] User-submitted daily menus (photo -> AI parse -> community data)

### Priority 3 — Social ordering (Phase 1)
- [ ] Order button -> delivery app deep link (Glovo, Wolt, Bolt Food, Tazz)
- [ ] Restaurant selection -> AI suggestion based on diet
- [ ] "Not cooking today" button -> alternative daily menu suggestion

### Tech debt
- [ ] Generation sometimes stalls at 95% (chef review timeout)
- [ ] Google Sign-In web popup blocking
- [ ] Header overlap on iOS in some places
- [ ] Android Developer mode / build pipeline
- [ ] Vite chunk size warning (2.6MB index bundle)
- [ ] Add error boundaries to all major UI components
- [ ] Performance audit — identify slow renders

## Done
- [x] Firebase Auth (Google Sign-In) integration
- [x] Stripe payment integration (checkout + webhook)
- [x] Chef AI agent (meal plan generation + review)
- [x] Restaurant finder with nearby stores
- [x] Daily menu scraper backend (meniulzilei.info + mitegyek.hu)
- [x] PDF upload in onboarding ("I already have a plan" -> DataUploadSheet)
- [x] Visual onboarding (ProfileSetupWizard)
- [x] Cross-device Firestore sync
- [x] 250+ food catalog (HU/EN/RO)
- [x] Store integration (chain catalog + Google Places + useNearbyStores)
- [x] Unified circular loader (SharedPremiumLoader)
- [x] Smoothed progress animation (UploadProgressOverlay)
- [x] Recipe overlay with restaurant tab
- [x] Smart shopping list with category grouping
- [x] localStorage -> IndexedDB migration for core data
- [x] Capacitor iOS + Android shell
