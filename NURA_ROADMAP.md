# nura — Teljes Roadmap & Feladatlista

> Utolsó frissítés: 2026-03-27
> Alapja: Attila és Claude közös product planning session

---

## Összefoglaló

A nura egy AI-alapú, személyre szabott táplálkozási asszisztens, amely a magyar és román piacra készül. Az app jelenleg ~70%-ban kész egy MVP launch-ra. Ez a dokumentum tartalmazza az összes megbeszélt feladatot, időrendben, priorizálva, részletes leírással.

**Technológiai döntés:** Az app marad React + Vite + Capacitor alapon (nem React Native). Ez a helyes döntés, mert a 42K soros kódbázis átírása ~6 hónap lenne, és a Capacitor WebView teljesítménye megfelelő a use case-hez.

---

## FÁZIS 0 — Kritikus bugfixek & stabilizáció (1 hét)

> Cél: Az app core funkciói stabilan működjenek, mielőtt bármit publikálnánk.

### T-001: Étrend generálás 95%-os akadás javítása
- **Prioritás:** KRITIKUS
- **Leírás:** A meal plan generálás néha megakad 95%-nál a Menu oldalról indítva. A root cause a chef review API timeout. Az "Ételek" oldalról működik.
- **Érintett fájlok:** `api/chef-review.ts`, `GenerateMealPlanSheet.tsx`
- **Megoldás:** Chef review timeout növelése vagy fallback mechanizmus (ha review timeout-ol, a terv review nélkül is elfogadható). Retry logic hozzáadása.
- **Kész kritérium:** 20/20 generálás sikeresen lefut mind Menu, mind Ételek oldalról.

### T-002: Nyelvi konzisztencia javítása (HU/RO/EN keverés megszüntetése)
- **Prioritás:** KRITIKUS
- **Leírás:** Jelenleg egyes UI elemek és generált tartalmak vegyesen jelennek meg magyarul és románul. Ez amatőr benyomást kelt és azonnali uninstall-hoz vezethet.
- **Feladatok:**
  - Audit: minden hardcoded string felkutatása a kódbázisban
  - AI prompt-ok nyelvparaméterének következetes átadása
  - Generált étel nevek, receptek, leírások mindig a beállított nyelven jelenjenek meg
  - Tesztelés mind 3 nyelven végig az egész flow-n
- **Kész kritérium:** Teljes app végigkattintása HU, RO és EN nyelven — sehol nem jelenik meg idegen nyelvű tartalom.

### T-003: iOS header/status bar overlap javítása
- **Prioritás:** MAGAS
- **Leírás:** Néhány képernyőn a tartalom belelóg az iOS status bar-ba (notch terület).
- **Megoldás:** Safe-area-inset-top következetes alkalmazása minden screen-en.
- **Kész kritérium:** Minden képernyő tesztelve iPhone 12 Pro Max-on és iPhone SE-n.

### T-004: Meal generation prompt javítások
- **Prioritás:** MAGAS
- **Leírás:** A jelenlegi AI prompt nem kényszeríti ki a makró célokat és néha nem optimális étrendeket generál.
- **Feladatok:**
  - Minimum protein constraint hozzáadása (1.6-2.0g/kg fogyáshoz)
  - User makró százalékok tényleges érvényesítése (jelenleg dekoratív)
  - Alapvető konyhaszekrény tételek engedélyezése (só, fűszerek, olaj)
  - Vacsora kalória csökkentése fogyásnál (35% → 25-30%)
  - Post-generálás makró validációs lépés
  - Hal gyakoriság ösztönzése (2+/hét)
- **Kész kritérium:** 10 generált étrend manuális review-ja — mindegyik megfelel a makró céloknak.

---

## FÁZIS 1 — App Store Launch (2-3 hét)

> Cél: Az app elérhető legyen az App Store-ban és Play Store-ban, letölthető, használható.

### T-005: iOS App Store submit
- **Prioritás:** KRITIKUS
- **Leírás:** Az app publikálása az Apple App Store-ba.
- **Feladatok:**
  - App Store Connect fiók véglegesítése (acsorvasi@yahoo.com Apple Developer)
  - Screenshots készítése (6.7" és 5.5" méretben, HU/EN/RO)
  - App Store leírás megírása (3 nyelven)
  - Privacy Policy és Terms of Service URL-ek
  - App Review Guidelines compliance check (különösen: subscription, health claims)
  - Xcode Archive → Upload → Submit for Review
  - `com.personalfit.app` bundle ID véglegesítése (vagy átnevezés `com.nura.app`-ra)
- **Kész kritérium:** "Waiting for Review" státusz az App Store Connect-ben.

### T-006: Android Play Store submit
- **Prioritás:** KRITIKUS
- **Leírás:** Az app publikálása a Google Play Store-ba.
- **Feladatok:**
  - Google Play Developer Console fiók (25 USD egyszeri díj)
  - Android build pipeline beüzemelése (Capacitor Android build)
  - Signed APK/AAB generálása
  - Play Store listing (screenshots, leírás, 3 nyelven)
  - Content rating kérdőív kitöltése
  - Privacy Policy URL
- **Kész kritérium:** "In Review" státusz a Play Console-ban.

### T-007: Étel képek megjelenítése mindenhol
- **Prioritás:** MAGAS
- **Leírás:** A FoodImage komponens (Unsplash proxy) jelenleg nem jelenik meg mindenhol. A reggeli/ebéd/vacsora kártyákon (UnifiedMenu) is meg kell jelennie az étel fotóknak.
- **Érintett:** `UnifiedMenu`, meal kártyák, recipe overlay
- **Kész kritérium:** Minden étel kártyán van vizuális kép, fallback placeholder ha nincs Unsplash találat.

### T-008: Meal count → naptár adaptáció
- **Prioritás:** MAGAS
- **Leírás:** A napi étkezési naptár jelenleg fix 3 étkezést mutat. A wizard-ban beállított mealCount (1-5) alapján kell adaptálódnia.
- **Érintett:** Nutrition calendar, daily meal plan display
- **Kész kritérium:** IF 16:8 felhasználó 2 étkezést lát, 5 étkezéses felhasználó 5 slotot.

### T-009: Vite bundle méret optimalizáció
- **Prioritás:** KÖZEPES
- **Leírás:** A jelenlegi index bundle 2.6MB, ami lassú betöltést okoz, különösen mobilon.
- **Feladatok:**
  - Lazy loading audit (minden feature modul valóban lazy-loaded?)
  - Tree shaking: MUI és Radix UI részleges importok
  - Vendor chunk splitting finomítás
- **Cél:** Index bundle < 1MB.

---

## FÁZIS 2 — Első 100 felhasználó szerzése (2-4 hét a launch után)

> Cél: Valódi felhasználók, visszajelzések, retention mérése.

### T-010: Push notification infrastruktúra (Fázis 1 — szöveges)
- **Prioritás:** NAGYON MAGAS
- **Leírás:** Ez a nura legfontosabb retention eszköze. Nem klasszikus "nyisd meg az appot" push, hanem **személyre szabott reggeli briefing**.
- **Koncepció:** Minden reggel, az ébresztő után, a felhasználó kap egy személyre szabott push notification-t:
  > "Jó reggelt Attila! 🌅 Mai reggeli: görög joghurt granolával (380 kcal). Ma edzésnap van — +200 kcal szénhidrát ajánlott. Napi célod: 2100 kcal. Igyál 2.5L vizet!"
- **Technológia:**
  - `@capacitor/push-notifications` plugin
  - Firebase Cloud Messaging (FCM) backend
  - Vercel Cron Job (reggel 6:00) → minden aktív user-nek elküldi a személyre szabott üzenetet
  - Az üzenet tartalmazza: reggeli recept, napi kalória cél, edzés emlékeztető, víz cél, speciális megjegyzések (böjt, allergia)
- **Interaktivitás:** Notification action buttons:
  - "Megeszem ✓" → loggolja a reggelit
  - "Cserélj ↻" → alternatív reggeli javaslat (app megnyílik)
- **Adatforrás:** Az IndexedDB-ben tárolt meal plan + user profil + napi naptár
- **Kész kritérium:** 7 napon át minden reggel megérkezik a push, a tartalom személyre szabott és a beállított nyelven van.

### T-011: Barcode scanner
- **Prioritás:** MAGAS
- **Leírás:** Minden versenytárs (MyFitnessPal, Yazio, Fitia) rendelkezik barcode scanner-rel. A felhasználók elvárják. Nélküle a food logging manuális és lassú.
- **Technológia:** `@capacitor-mlkit/barcode-scanning` vagy `capacitor-barcode-scanner`
- **Adatforrás:** Open Food Facts API (ingyenes, EU termékek) + saját 150-es katalógus
- **Flow:** Kamera → barcode → Open Food Facts lookup → kalória/makró adatok → hozzáadás a napi loghoz
- **Kész kritérium:** Magyar és román termékek vonalkódja felismerésre kerül, kalória adat megjelenik.

### T-012: Napi kalória összesítés dashboard
- **Prioritás:** MAGAS
- **Leírás:** Jelenleg nincs vizuális összesítés arról, hogy a felhasználó hol tart a napi kalória céljához képest.
- **Koncepció:** Egy egyszerű, vizuálisan erős dashboard:
  - Körkörös progress bar (bevitt / cél kcal)
  - Makró bontás (fehérje / szénhidrát / zsír) sáv diagrammal
  - Étkezésenkénti breakdown (reggeli: 380 kcal ✓, ebéd: ---, vacsora: ---)
  - Víz fogyasztás tracker
- **Kész kritérium:** A dashboard valós időben frissül az étel loggolás után.

### T-013: 15 dietetikus megkeresése partnerségre
- **Prioritás:** MAGAS (üzleti, nem technikai)
- **Leírás:** A marketing stratégia alapja: 15 dietetikus × 30 kliens = 450 potenciális user, 0 EUR költséggel.
- **Megközelítés:**
  - HU: Magyar Dietetikusok Országos Szövetsége taglistából
  - RO: Colegiul Dieteticienilor din România
  - Pitch: "A klienseid az app-ban tudják követni az Ön által készített étrendet (PDF import). Ön ingyen Pro hozzáférést kap."
- **Szükséges az app-ban:** PDF import stabil működése + dietetikus referral link
- **Kész kritérium:** 15 dietetikusnak kiküldve az ajánlat, legalább 5 pozitív válasz.

### T-014: Animált onboarding intro
- **Prioritás:** KÖZEPES
- **Leírás:** Az első 3 onboarding képernyő összevonása egyetlen animált, "légiesen könnyű" screen-be. Kevesebb kattintás, jobb első benyomás.
- **Kész kritérium:** Az onboarding flow 1 animált intro screen-nel indul a jelenlegi 3 helyett.

---

## FÁZIS 3 — Növekedés & premium funkciók (1-3 hónap a launch után)

> Cél: Fizetős felhasználók szerzése, feature-ök amiért érdemes előfizetni.

### T-015: "Nem főzök ma" gomb + étterem javaslat
- **Prioritás:** MAGAS
- **Leírás:** A szociális rendelés előfutára. Egyéni szinten: ha a felhasználó nem akar főzni, az app a kalória célja alapján javasol éttermet és ételt a közelben.
- **Flow:**
  1. User megnyomja: "Ma nem főzök"
  2. App megnézi a napi kalória keretet és a hátralévő makrókat
  3. AI javasol 2-3 éttermi opciót a közelben (Google Places + napi menü scrapelés)
  4. Minden javaslat mellé: kalória becslés + Wolt/Glovo/Bolt Food deep link
- **Technológia:** Meglévő restaurant finder + chef-suggest API bővítése
- **Kész kritérium:** "Nem főzök" → 3 releváns, kalória-tudatos étterem javaslat < 5mp.

### T-016: Vallási böjti naptár integráció
- **Prioritás:** KÖZEPES-MAGAS
- **Leírás:** A román ortodox/görögkatolikus és magyar római katolikus közösségeknek rendszeres böjti időszakaik vannak, amelyek fundamentálisan befolyásolják az étrendet.
- **Funkciók:**
  - Beállítás: böjt típus (ortodox/katolikus), szigorúsági szint
  - Böjti naptár (automatikus dátumok az egyházi naptár alapján)
  - Amikor böjt aktív: a generált étrend automatikusan kizárja a tiltott ételeket (pl. összes állati eredetű)
  - Vizuális jelzés a napi nézetben, hogy böjti nap van
- **Kész kritérium:** Ortodox nagyböjt alatt a generált étrend 100% növényi, automatikusan.

### T-017: Wearable integráció (Apple HealthKit / Google Fit)
- **Prioritás:** KÖZEPES
- **Leírás:** Lépésszám, alvás, edzés adatok importálása a pontos kalória számításhoz.
- **Technológia:** `@nickleso/capacitor-healthkit` (iOS) + `capacitor-health-connect` (Android)
- **Kész kritérium:** Edzés kalória égetés automatikusan módosítja a napi kalória célt.

### T-018: Fotó-alapú étel loggolás
- **Prioritás:** KÖZEPES
- **Leírás:** Fénykép készítése az ételről → AI felismeri → kalória becslés. Ez a legkényelmesebb loggolási mód.
- **Technológia:** Kamera + Google Gemini Vision API (vagy Claude Vision)
- **Flow:** Fotó → AI: "Ez egy túrós palacsinta, kb. 420 kcal, 18g fehérje" → User megerősíti → Log
- **Kész kritérium:** 10 magyar/román étel fotó felismerése > 80% pontossággal.

---

## FÁZIS 4 — Szociális ebédrendelés (3-6 hónap a launch után)

> Cél: Hálózati hatás kiépítése. CSAK akkor indul, ha van legalább 500 aktív felhasználó.
> Célcsoport: Nagyvárosi irodaházak, munkahelyi közösségek.

### T-019: Szociális rendelés — Alap (megosztható link)
- **Prioritás:** KÖZEPES (FÁZIS 4)
- **Leírás:** Köztes megoldás a teljes szociális rendszer előtt.
- **Flow:**
  1. User kiválaszt egy éttermet a "Nem főzök ma" javaslatból
  2. "Megosztás kollégáknak" → generál egy linket
  3. A link megnyitja a nura-t a másiknál, látja az éttermet + az ő kalória céljának megfelelő javaslatokat
  4. Mindenki külön rendel a Wolt/Glovo-n, de ugyanonnan
- **Nincs:** Közös kassza, fizetés koordináció, jogi kockázat
- **Kész kritérium:** Link megosztás → másik user megnyitja → saját javaslat megjelenik.

### T-020: Szociális rendelés — Csoportok & szavazás
- **Prioritás:** ALACSONY (csak ha T-019 sikeres)
- **Leírás:** A teljes szociális rendszer kiépítése irodaházi csoportok számára.
- **Funkciók:**
  - Barátok/kollégák rendszer (Firebase kapcsolatok)
  - Push notification ebédidőben: "Főzöl vagy rendelünk?"
  - Meghívás: "Hívd meg a kollégáidat!"
  - Közös szavazás étteremre (mindenki szavaz, AI aggregál a kalória célok alapján)
  - AI koordinátor: a csoport preferenciái + mindenki kalória célja → optimális étterem javaslat
- **Technológia:**
  - Firestore real-time listeners (szavazás, csoport state)
  - Firebase Cloud Messaging (push a csoport tagjainak)
  - Deep link-ek a delivery app-okhoz
- **Jogi megközelítés:** Fázis 1-ben mindenki külön fizet (nincs pénzforgalmi engedély szükség). Később: Wolt Group Order integráció vagy Stripe Connect.
- **Célpiac:** Budapest, Bukarest, Kolozsvár, Debrecen — 50+ fős irodaházak
- **Kész kritérium:** 5 fős csoport sikeresen szavaz étteremre és mindenki megkapja a saját kalória-célnak megfelelő javaslatot.

---

## FÁZIS 5 — Push Notification Fázis 2 (hang-alapú, 6+ hónap)

> Cél: A szöveges reggeli briefing hangos verzióra váltása — személyes AI coach érzés.

### T-021: Hang-alapú reggeli briefing
- **Prioritás:** ALACSONY (jövőbeli)
- **Leírás:** A Fázis 1-es szöveges push notification hang-alapú változata. Az app felolvassa a napi briefing-et, személyes hangnemben.
- **Technológia:** ElevenLabs TTS API vagy edge-on futó TTS (on-device)
- **Koncepció:**
  > "Jó reggelt Attila! Ma a reggeli túrós palacsinta, 420 kalória. Edzésnap van, úgyhogy pótold a szénhidrátot ebédnél. A napi célod 2100 kalória. Igyál legalább 2 és fél liter vizet. Szép napot!"
- **Kihívások:** TTS költség skálázása, hang személyesítés, offline mód
- **Kész kritérium:** A reggeli briefing felolvasva érkezik, természetes hangon, a beállított nyelven.

---

## Technikai adósságok (folyamatos)

| ID | Feladat | Prioritás |
|----|---------|-----------|
| TD-01 | Google Sign-In web popup blokkolás fix | Közepes |
| TD-02 | Vite chunk splitting optimalizáció (2.6MB → <1MB) | Magas |
| TD-03 | Android build pipeline beüzemelése | Kritikus (Fázis 1 előfeltétel) |
| TD-04 | iOS Xcode 26.4 kompatibilitás | Közepes |
| TD-05 | Étel adatbázis bővítése (150 → 500+) | Folyamatos |
| TD-06 | AI hallucináció monitoring (fake étel nevek) | Közepes |
| TD-07 | "Sülthüllő" típusú AI hibák monitoring | Alacsony (prompt javítva) |

---

## Időbecslés összefoglaló

| Fázis | Időkeret | Fő cél |
|-------|----------|--------|
| **Fázis 0** | 1 hét | Stabilitás, bugfixek |
| **Fázis 1** | 2-3 hét | App Store + Play Store launch |
| **Fázis 2** | 2-4 hét (launch után) | Első 100 user, push notification, barcode |
| **Fázis 3** | 1-3 hónap (launch után) | Premium funkciók, wearable, fotó log |
| **Fázis 4** | 3-6 hónap (launch után) | Szociális ebédrendelés (ha van userbázis) |
| **Fázis 5** | 6+ hónap | Hang-alapú AI coach |

---

## Üzleti mérföldkövek

| Mérföldkő | Trigger | Akció |
|-----------|---------|-------|
| **App Store-ban elérhető** | Fázis 1 kész | Marketing indul, dietetikus outreach |
| **100 aktív user** | Fázis 2 közben | Első retention analízis, NPS felmérés |
| **500 aktív user** | Fázis 3 után | Szociális funkciók fejlesztése indulhat |
| **1000 fizető user** | Fázis 3-4 között | Étterem partner szerződések megkezdése |
| **5000 user** | Fázis 4 közben | Series A / angel investment keresés |

---

> **A legfontosabb szabály:** Ne építs szociális funkciókat, amíg nincs legalább 500 aktív egyéni felhasználó. A hálózati hatás 0 felhasználóval = 0 érték.
