# Személyre Szabott 4 Hetes Étkezési Terv Alkalmazás

## Áttekintés

Ez egy mobilra optimalizált magyar nyelvű étkezési terv követő alkalmazás, amely 4 hetes személyre szabott étrendet biztosít, követési funkciókkal, bevásárló lista generálással és progresszió nyomon követéssel.

## Főbb Funkciók

### 1. **Napi Menü** (Kezdőlap - `/`)
- A nap étkezéseinek megjelenítése (Reggeli, Ebéd, Vacsora)
- Több opció közül választás lehetősége
- Checkbox az elfogyasztott ételek jelölésére
- Valós idejű kalória számítás
- Hét és nap váltó navigáció
- Heti összegzés megjelenítése

### 2. **Heti Menü** (`/weekly`)
- Teljes 4 hetes terv áttekintése
- Összecsukható hetek és napok
- Minden napra vonatkozó részletes étkezési opciók
- Heti összegzések (kalória, makrók, várható fogyás)
- Könnyen navigálható naptár nézet

### 3. **Élelmiszerek** (`/foods`)
- Teljes élelmiszer katalógus
- Keresés és kategória szerinti szűrés
- Részletes tápanyag információk
- Előnyök és alkalmazási javaslatok
- Kedvencek mentése
- Részletes termék nézet modal ablakban

### 4. **Bevásárló Lista** (`/shopping`)
- Automatikus lista generálás a heti menü alapján
- Kategóriák szerinti csoportosítás:
  - 🥩 Fehérje
  - 🥛 Tejtermék
  - 🥬 Zöldségek
  - 🍎 Gyümölcsök
  - 🌾 Gabonafélék
  - 🧂 Fűszerek és egyéb
- Egyéni termékek hozzáadása
- Checkbox a megvásárolt termékek jelölésére
- Progresszió kijelző

### 5. **Profil** (`/profile`)
- Személyes adatok szerkesztése:
  - Kor, Súly, Magasság
  - Vérnyomás
  - Aktivitási szint
  - Cél (fogyás/tartás/gyarapodás)
  - Allergiák
  - Étkezési preferenciák
- Automatikus számítások:
  - BMI
  - Napi kalória szükséglet
  - Makro arányok (fehérje, szénhidrát, zsír)
- Haladás követése

### 6. **Extra Funkciók**

#### Víz Tracker 💧
- Lebegő widget a jobb alsó sarokban
- Vizuális pohár feltöltődéssel
- 3L napi cél
- 250ml-es lépésközök

#### Edzés Tracker 🏆
- Heti edzések számlálója a fejlécben
- 4 alkalom/hét cél
- Érme achievement 4 edzés teljesítésekor

## Navigáció

Alsó navigációs menü 5 fő opcióval:
1. 🥦 Élelmiszerek
2. 📅 Heti menü
3. 🍽 Napi menü (Kiemelt/központi)
4. 🛒 Bevásárló lista
5. 👤 Profil

## Dizájn Elvek

- **Minimalizmus**: Tiszta, világos felület
- **Színpaletta**:
  - Zöld: Egészséges élelmiszerek, fő akciók
  - Kék: Hidratáció, progresszió
  - Meleg neutrális: Menük, kártyák
- **Mobilra optimalizált**: Elsősorban mobil élmény
- **Gyors interakció**: Kevés kattintás, azonnali visszajelzés

## Technológiai Stack

- **React 18** - UI framework
- **React Router** - Navigáció
- **Tailwind CSS v4** - Stílusok
- **Lucide React** - Ikonok
- **TypeScript** - Típusbiztonság

## Adatok

Az étkezési tervek a csatolt PDF dokumentumokból lettek strukturálva és a `/src/app/data/mealData.ts` fájlban tárolódnak.

## Használat

1. Nyisd meg az alkalmazást
2. Tekintsd meg a mai napra vonatkozó étkezési tervet
3. Válassz opciót minden étkezéshez
4. Jelöld be, amikor megettél valamit
5. Kövesd a progressziódat
6. Generálj bevásárló listát a hétre
7. Frissítsd a profilodat a személyre szabott kalória és makró célokhoz

## Jövőbeli Fejlesztési Lehetőségek

- Supabase backend integráció adatok mentésére
- Push értesítések étkezési időpontokra
- Progresszió grafikonok
- Recept részletek fotókkal
- Barcode scanner a bevásárlás könnyítésére
- Közösségi funkciók (megosztás, motiváció)
