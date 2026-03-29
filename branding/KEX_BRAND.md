# kix — Brand Guide

> "Transform what you eat" / "Változtasd meg, amit eszel" / "Transformă ce mănânci"

---

## Brand összefoglaló

**kix** egy AI-alapú, személyre szabott táplálkozási asszisztens alkalmazás. A brand egy barátságos, karakter-vezérelt identitásra épül — egy mosolygós, pislogó béka mascot köré, akit **Kix**-nek hívnak, és aki minden nap személyesen köszönti a felhasználót.

A béka a **metamorfózis szimbóluma**: ahogy az ebihal békává alakul, úgy alakítja át a felhasználó az étrendjét és életstílusát. A brand nem egy steril egészségügyi alkalmazás — hanem egy kedves, megközelíthető, Duolingo-stílusú companion.

A "kix" név a "kicks" szóra asszociál — lendület, energia, rúgás az egészségesebb élet felé. Rövid, ütős, eredeti, mindhárom piacon (HU/RO/EN) jól hangzik.

---

## Név

- **App neve:** kix (mindig kisbetűvel, mint: uber, bolt, wise)
- **Mascot neve:** Kix (a béka karakter — app = mascot = brand, mint Duolingo = Duo)
- **Formátum:** Nem "Kix", nem "KIX" — az app neve mindig **kix**, a karakter neve **Kix**
- **Kiejtés:** /kɪks/ — "kiksz" — azonosan HU, RO, EN nyelven
- **Domain cél:** kix.app vagy getkix.app

---

## Tagline

| Nyelv | Tagline |
|-------|---------|
| EN | Transform what you eat |
| HU | Változtasd meg, amit eszel |
| RO | Transformă ce mănânci |

---

## A Brand Zöld — A legfontosabb szín

### Splash Screen Gradiens (a FŐ brand szín)

```css
background: linear-gradient(160deg, #0d9488, #0f766e, #134e4a);
```

**Ez a gradiens MAGA a brand.** A splash screen, az app háttér, a marketing anyagok — mind erre épül.

| Szín | HEX | RGB | HSL | Tailwind | Szerep |
|------|-----|-----|-----|----------|--------|
| **kix-light** | `#0d9488` | rgb(13, 148, 136) | hsl(175, 84%, 32%) | `teal-600` | Gradiens START — fejléc, gombok, kiemelések |
| **kix-mid** | `#0f766e` | rgb(15, 118, 110) | hsl(175, 77%, 26%) | `teal-700` | Gradiens KÖZÉP — középtónus, hover állapot |
| **kix-deep** | `#134e4a` | rgb(19, 78, 74) | hsl(176, 61%, 19%) | `teal-900` | Gradiens VÉG — mély háttér, szöveg, sötét elemek |

### Gradiens specifikáció

```
Irány:     160° (bal felsőből jobb alsó felé, enyhe döntés)
Stop 1:    #0d9488 (0%)   — világos teal, frisseség, energia
Stop 2:    #0f766e (50%)  — középtónus, nyugalom, egyensúly
Stop 3:    #134e4a (100%) — mély teal, stabilitás, mélység
```

### Használat CSS-ben

```css
/* Splash screen, fő háttér */
.kix-gradient {
  background: linear-gradient(160deg, #0d9488, #0f766e, #134e4a);
}

/* Gomb gradiens (vízszintes) */
.kix-button {
  background: linear-gradient(90deg, #0d9488, #0f766e);
}

/* Szöveg gradiens */
.kix-text-gradient {
  background: linear-gradient(160deg, #0d9488, #0f766e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Használat Tailwind CSS-ben

```tsx
// Splash háttér
<div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900" />

// Egyszerű háttér
<div className="bg-teal-600" />  // kix-light
<div className="bg-teal-700" />  // kix-mid
<div className="bg-teal-900" />  // kix-deep
```

---

## Teljes színpaletta

### Elsődleges színek (a brand zöld gradiens)

| Token | HEX | Használat |
|-------|-----|-----------|
| `kix-light` | `#0d9488` | Elsődleges CTA, fejlécek, aktív elemek |
| `kix-mid` | `#0f766e` | Hover állapot, másodlagos felületek |
| `kix-deep` | `#134e4a` | Sötét háttér, szöveg sötét módban |

### Kiegészítő színek

| Token | HEX | Használat |
|-------|-----|-----------|
| `kix-surface` | `#ccfbf1` | Kix karakter szín, világos felületek, kártyák |
| `kix-accent` | `#99f6e4` | Highlight, badge, pirosító (béka arcon), tagline szín |
| `kix-glow` | `#5eead4` | Tagline szöveg, világító elemek, decoráció |

### Semleges színek

| Token | HEX | Használat |
|-------|-----|-----------|
| `kix-white` | `#f0fdfa` | Kix test (light mode), szöveg sötét háttéren |
| `kix-dark` | `#0f172a` | Oldal háttér (dark mode), béka szem/pupilla |
| `kix-text` | `#134e4a` | Szöveg light mode-ban (= kix-deep) |

### Jelzőszínek

| Token | HEX | Használat |
|-------|-----|-----------|
| `kix-error` | `#ef4444` | Hiba, törlés, figyelmeztetés (red-500) |
| `kix-warning` | `#f59e0b` | Figyelem, limit közel (amber-500) |
| `kix-success` | `#0d9488` | Siker = a brand szín (kix-light) |

---

## Kix karakter specifikáció

### Színek a karakteren

| Elem | HEX | Leírás |
|------|-----|--------|
| Test/fej | `#ccfbf1` | Világos menta — teal-100 |
| Szem pupilla | `#134e4a` | Mély teal — kix-deep |
| Szem csillanás | `#ccfbf1` | Azonos a testtel |
| Mosoly | `#0f766e` | kix-mid |
| Pirosító (arc) | `#99f6e4` opacity 0.5 | Halvány kix-accent |
| Has (mascot) | `#99f6e4` | kix-accent |

### Animációk

| Animáció | Időzítés | Leírás |
|----------|----------|--------|
| **Pislogás** | 4s ciklus, ~44%-nál 0.1s-os csukás | Természetes, emberi pislogás ritmus |
| **Lebegés** | 3s ciklus, 6px fel-le | Finom, nyugodt "élet" érzés |
| **Integetés** | 3s ciklus, ±14° forgás | Mascot verzióban, barátságos köszöntés |
| **Kukucskálás** | 5s ciklus, 30px fel-le | App icon peek verzió |

### Logóban az "i" betű trükk

A "kix" szóban az **i betű pontja lecserélhető a béka szemére** — ez egy szubtilis de felismerhető brand jel. A logóban a "k" és "x" normál betűk, de az "i" pont helyett egy kis béka szem (kör + csillanás) jelenik meg.

---

## Tipográfia

| Elem | Font | Súly | Méret |
|------|------|------|-------|
| Brand név ("kix") | System UI / SF Pro / Inter | 800 (Extra Bold) | App-ban: 42px, marketing: skálázódó |
| Tagline | System UI / SF Pro / Inter | 400 (Regular) | 11-12px, UPPERCASE, letter-spacing: 4-6px |
| App UI | System UI / SF Pro / Inter | 400-700 | Min 14px (brandbook szabály) |

**A brand név MINDIG kisbetűs:** `kix`, sosem `Kix` vagy `KIX` (kivéve mondat elején vagy a karakter nevénél: "Kix szól").

---

## App Store jelenlét

### App neve
**kix — AI Nutrition Coach**

### Rövid leírás (80 karakter)
> AI-powered meal plans. Local food. Your language. 🐸

### Hosszú leírás
> **kix** is your friendly AI nutrition assistant that speaks your language.
>
> Meet Kix — the little green frog who helps you eat better, one meal at a time. Get personalized weekly meal plans based on your goals, import your dietician's PDF plan, find local restaurants with calorie-aware suggestions, and track your nutrition — all in Hungarian, Romanian, or English.
>
> **What makes kix different:**
> - AI meal plans adapted to YOUR local food (not American portions)
> - PDF import: upload your dietician's plan, we make it trackable
> - Local restaurant daily menus with calorie estimates
> - Shopping list → store finder → delivery link (full purchase funnel)
> - Trilingual: built for HU, RO, and EN speakers
> - Morning briefing: Kix greets you every day with your personalized plan
>
> **Transform what you eat.** 🐸

### Kategória
Health & Fitness > Nutrition

---

## Marketing irányok

### Kix mint Duolingo-effektus
Kix, a béka karakter az app személyisége. Megjelenik:
- **Push notification-ökben:** "🐸 Kix itt! Jó reggelt Attila! Mai reggeli: túrós palacsinta (420 kcal)"
- **Loading screen-eken:** pislogó Kix animáció
- **Üres állapotokban:** Kix bíztatja a felhasználót
- **Achievement-eknél:** Kix ünnepel (streak, cél elérés)
- **Hibáknál:** Kix sajnálja ("Hoppá, valami elromlott. Próbáld újra!")

### Push notification hangnem
Kix személyes, barátságos, de nem tolakodó:
- Reggel: "🐸 Jó reggelt! Mai reggeli: görög joghurt granolával (380 kcal). Szép napot!"
- Edzésnap: "🐸 Edzésnap! +200 kcal szénhidrát ajánlott. Kix szurkol!"
- Streak: "🐸 3 napos streak! Holnap is tartsd!"
- Inaktivitás (3+ nap): "🐸 Hé, rég láttalak! Kix vár rád."

### Tagline variációk kampányokhoz

| Kampány | Tagline |
|---------|---------|
| Általános | Transform what you eat |
| Dietetikus partnerség | Your dietician's plan, in your pocket |
| Étterem feature | Eat smart, even when you eat out |
| Szociális (jövő) | Lunch together, eat better |
| Böjt feature | Faith-aware nutrition planning |
| Gamification | Every meal is a level up |

---

## Fájlok

```
branding/
├── KEX_BRAND.md                ← Ez a fájl (végleges brand guide)
├── kix-logo-v1-minimal.svg     ← Fehér arc teal háttéren
├── kix-logo-v2-modern.svg      ← Dark mode ikon + "kix" felirat
├── kix-logo-v3-icon.svg        ← Kukucskáló szemek (App Store ikon)
├── kix-logo-v4-duolingo.svg    ← Teljes mascot (villával, integet)
├── kix-logo-v5-wordmark.svg    ← Béka + "kix" felirat + tagline
└── kix-animated.html           ← Animált verziók (pislogás, peek, mascot, wordmark, splash)
```

### Régi fájlok (archiválva, nem használandó)
```
branding/
├── FROG_BRAND.md               ← Régi, frog névvel
├── frog-logo-v*.svg            ← Régi logók
└── frog-animated-v1.html       ← Régi animált logó
```

---

> **A kix brand lényege:** Nem egy steril egészségügyi alkalmazás. Egy kedves, személyes, karakter-vezérelt brand, ahol Kix — a béka — a felhasználó barátja és táplálkozási coach-ja egyszerre. 3 betű, 1 béka, végtelen energia. 🐸
