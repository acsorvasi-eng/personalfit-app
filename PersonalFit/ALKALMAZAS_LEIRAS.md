# nura — Szemelyre Szabott Taplalkozasi es Fitness Alkalmazas

## Attekintes

Mobilra optimalizalt magyar es roman nyelvu taplalkozasi es fitness alkalmazas. 4 hetes szemelyre szabott etrendet biztosit Chef AI agenssel, etterem keresoval, bevasarlo lista generatassal, PDF import-tal es cross-device szinkronizacioval.

**Technologia:** React 18 + Vite SPA, Capacitor nativ shell (iOS + Android), Firebase Auth, Cloud Firestore, Stripe fizetes, Vercel Serverless backend.

## Fobb Funkciok

### 1. **Napi Menu** (Kezdolap - `/`)
- A nap etkezeseinek megjelenitese (Reggeli, Ebed, Vacsora)
- Tobb opcio kozul valasztas lehetosege
- Checkbox az elfogyasztott etelek jelolesere
- Valos ideju kaloria szamitas
- Het es nap valto navigacio
- Heti osszegzes megjelenitese

### 2. **Chef AI Agent**
- Szemelyre szabott 4 hetes etrend generalas
- AI-alapu etrend review es javaslatok
- Profil alapjan optimalizalt makro aranyok
- Etkezes-tervezes a felhasznalo celjai szerint (fogyas/tartas/gyarapodas)

### 3. **Etterem Kereso**
- Kozeli etteremek felderitese (Google Places integracio)
- Napi menu scraping magyar es roman oldalakrol (meniulzilei.info, mitegyek.hu)
- Rendeles gomb delivery appokhoz (Glovo, Wolt, Bolt Food)
- Etterem tab a recept overlay-ben

### 4. **Recept Overlay**
- Teljes recept reszletek megtekintesel
- Hozzavalok listaja mennyisegekkel
- Etterem tab napi menukkel
- Rendeles lehetoseg kozvetlenul az alkalmazasbol

### 5. **Elelmiszerek** (`/foods`)
- 250+ eteles katalogus (HU/EN/RO)
- Kereses es kategoria szerinti szures
- Reszletes tapanyag informaciok
- Elonyok es alkalmazasi javaslatok
- Kedvencek mentese

### 6. **Bevasarlo Lista** (`/shopping`)
- Automatikus lista generalas a heti menu alapjan
- Kategoriak szerinti csoportositas (feherje, tejtermek, zoldsegek, gyumolcsok, gabonafelek, fuszerek)
- Bolt kereso (Lidl, Carrefour, Aldi, stb.) Google Places-szel
- Egyeni termekek hozzaadasa
- Checkbox a megvasarolt termekek jelolesere

### 7. **Profil** (`/profile`)
- Szemelyes adatok szerkesztese (kor, suly, magassag, aktivitasi szint, cel, allergiak, etkezesi preferenciak)
- Automatikus szamitasok: BMI, napi kaloria szukseglet, makro aranyok
- Haladas kovetese

### 8. **PDF Import**
- Etkezesi terv feltoltes PDF-bol
- AI-alapu dokumentum feldolgozas es strukturalas
- "Van mar etrendem" opcio az onboarding-ban

### 9. **Vizualis Onboarding**
- Tobblepeses profil beallitas varazsslo (ProfileSetupWizard)
- Google Sign-In belepes
- Elofizetesi kepernyo (Stripe Checkout)
- Etrend generalas vagy PDF feltoltes valasztas

### 10. **Cross-device Szinkronizacio**
- Firebase Auth + Cloud Firestore
- Profil, etkezesi terv es kedvencek szinkronizacio eszkozok kozott
- Offline-first: lokalis IndexedDB az elsodleges, Firestore a masodlagos

### 11. **Extra Funkciok**

#### Viz Tracker
- Lebeho widget vizualis pohar feltoltodessel
- 3L napi cel, 250ml-es lepeskozok

#### Edzes Tracker
- Heti edzesek szamlaloja
- 4 alkalom/het cel
- Erme achievement teljesiteskor

#### Stripe Fizetes
- Elofizetesi checkout (Stripe)
- Webhook feldolgozas

## Navigacio

Also navigacios menu 5 fo opcioval:
1. Elelmiszerek
2. Heti menu
3. Napi menu (kiemelt/kozponti)
4. Bevasarlo lista
5. Profil

## Dizajn Elvek

- **Minimalizmus**: Tiszta, vilagos felulet
- **Szinpaletta**: Teal/feher/fekete, gradiens akcio gombok
- **Mobilra optimalizalt**: Elsosoorban mobil elmeny
- **Gyors interakcio**: Keves kattintas, azonnali visszajelzes
- **Minimum 14px** betumeret mindenhol

## Technologiai Stack

- **React 18** + **TypeScript** — UI framework
- **Vite** — build tool
- **Tailwind CSS v4** — stilusok
- **Capacitor** — nativ iOS + Android shell
- **Firebase Auth** — Google Sign-In
- **Cloud Firestore** — cross-device sync
- **Stripe** — fizetes
- **Vercel Serverless** — backend API (10+ function)
- **OpenAI API** — Chef AI agent
- **Radix UI** — komponensek
- **Framer Motion** — animaciok
- **Lucide React** — ikonok
- **React Router** — navigacio

## Adatok

Az etkezesi tervek a Chef AI agent altal generaltoak vagy PDF-bol importaltoak. Lokalis adatok IndexedDB-ben, szinkronizacio Cloud Firestore-ban.

## Hasznalat

1. Nyisd meg az alkalmazast
2. Lepj be Google fiokkal
3. Toltsd ki a profilodat az onboarding-ban
4. Generaltass etrendet a Chef AI-val VAGY toltsd fel a sajat PDF etrendedet
5. Kovetsd a napi menudet
6. Jelold be az elfogyasztott eteleket
7. Generalf bevasarlo listat a hetre
8. Keressen kozeli ettermeket ha nem foznel
