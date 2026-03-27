# frog — Brand Guide

> "Transform what you eat" / "Változtasd meg, amit eszel" / "Transformă ce mănânci"

---

## Brand összefoglaló

**frog** egy AI-alapú, személyre szabott táplálkozási asszisztens alkalmazás. A brand egy barátságos, karakter-vezérelt identitásra épül — egy mosolygós, pislogó béka mascot köré, aki minden nap személyesen köszönti a felhasználót.

A béka a **metamorfózis szimbóluma**: ahogy az ebihal békává alakul, úgy alakítja át a felhasználó az étrendjét és életstílusát. A brand nem egy steril egészségügyi alkalmazás — hanem egy kedves, megközelíthető, Duolingo-stílusú companion.

---

## Név

- **Név:** frog (mindig kisbetűvel, mint: uber, bolt, wise)
- **Formátum:** Nem "Frog", nem "FROG" — mindig **frog**
- **Kiejtés:** /frɒɡ/ — azonosan HU, RO, EN nyelven

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
| **frog-light** | `#0d9488` | rgb(13, 148, 136) | hsl(175, 84%, 32%) | `teal-600` | Gradiens START — fejléc, gombok, kiemelések |
| **frog-mid** | `#0f766e` | rgb(15, 118, 110) | hsl(175, 77%, 26%) | `teal-700` | Gradiens KÖZÉP — középtónus, hover állapot |
| **frog-deep** | `#134e4a` | rgb(19, 78, 74) | hsl(176, 61%, 19%) | `teal-900` | Gradiens VÉG — mély háttér, szöveg, sötét elemek |

### Gradiens specifikáció

```
Irány:     160° (bal felsőből jobb alsó felé, enyhe döntés)
Stop 1:    #0d9488 (0%)   — világos teal, frisseség, energia
Stop 2:    #0f766e (50%)  — középtónus, nyugalom, egyensúly
Stop 3:    #134e4a (100%) — mély teal, stabilitás, mélység
```

**Miért 160°?** Nem függőleges (180°), nem átlós (135°) — hanem egy enyhe elfordítás, ami dinamikus de nem agresszív. Épp annyira élénk, mint amennyire nyugodt.

### Használat CSS-ben

```css
/* Splash screen, fő háttér */
.frog-gradient {
  background: linear-gradient(160deg, #0d9488, #0f766e, #134e4a);
}

/* Gomb gradiens (vízszintes) */
.frog-button {
  background: linear-gradient(90deg, #0d9488, #0f766e);
}

/* Szöveg gradiens */
.frog-text-gradient {
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
<div className="bg-teal-600" />  // frog-light
<div className="bg-teal-700" />  // frog-mid
<div className="bg-teal-900" />  // frog-deep
```

---

## Teljes színpaletta

### Elsődleges színek (a brand zöld gradiens)

| Token | HEX | Használat |
|-------|-----|-----------|
| `frog-light` | `#0d9488` | Elsődleges CTA, fejlécek, aktív elemek |
| `frog-mid` | `#0f766e` | Hover állapot, másodlagos felületek |
| `frog-deep` | `#134e4a` | Sötét háttér, szöveg sötét módban |

### Kiegészítő színek

| Token | HEX | Használat |
|-------|-----|-----------|
| `frog-surface` | `#ccfbf1` | Béka karakter szín, világos felületek, kártyák |
| `frog-accent` | `#99f6e4` | Highlight, badge, pirosító (béka arcon), tagline szín |
| `frog-glow` | `#5eead4` | Tagline szöveg, világító elemek, decoráció |

### Semleges színek

| Token | HEX | Használat |
|-------|-----|-----------|
| `frog-white` | `#f0fdfa` | Béka test (light mode), szöveg sötét háttéren |
| `frog-dark` | `#0f172a` | Oldal háttér (dark mode), béka szem/pupilla |
| `frog-text` | `#134e4a` | Szöveg light mode-ban (= frog-deep) |

### Jelzőszínek

| Token | HEX | Használat |
|-------|-----|-----------|
| `frog-error` | `#ef4444` | Hiba, törlés, figyelmeztetés (red-500) |
| `frog-warning` | `#f59e0b` | Figyelem, limit közel (amber-500) |
| `frog-success` | `#0d9488` | Siker = a brand szín (frog-light) |

---

## Béka karakter specifikáció

### Színek a karakteren

| Elem | HEX | Leírás |
|------|-----|--------|
| Test/fej | `#ccfbf1` | Világos menta — teal-100 |
| Szem pupilla | `#134e4a` | Mély teal — frog-deep |
| Szem csillanás | `#ccfbf1` | Azonos a testtel |
| Mosoly | `#0f766e` | frog-mid |
| Pirosító (arc) | `#99f6e4` opacity 0.5 | Halvány frog-accent |
| Has (mascot) | `#99f6e4` | frog-accent |

### Animációk

| Animáció | Időzítés | Leírás |
|----------|----------|--------|
| **Pislogás** | 4s ciklus, ~44%-nál 0.1s-os csukás | Természetes, emberi pislogás ritmus |
| **Lebegés** | 3s ciklus, 6px fel-le | Finom, nyugodt "élet" érzés |
| **Integetés** | 3s ciklus, ±14° forgás | Mascot verzióban, barátságos köszöntés |
| **Kukucskálás** | 5s ciklus, 30px fel-le | App icon peek verzió |

---

## Tipográfia

| Elem | Font | Súly | Méret |
|------|------|------|-------|
| Brand név ("frog") | System UI / SF Pro / Inter | 800 (Extra Bold) | App-ban: 42px, marketing: skálázódó |
| Tagline | System UI / SF Pro / Inter | 400 (Regular) | 11-12px, UPPERCASE, letter-spacing: 4-6px |
| App UI | System UI / SF Pro / Inter | 400-700 | Min 14px (brandbook szabály) |

**A brand név MINDIG kisbetűs:** `frog`, sosem `Frog` vagy `FROG`.

---

## App Store jelenlét

### App neve
**frog — AI Nutrition Coach**

### Rövid leírás (80 karakter)
> AI-powered meal plans. Local food. Your language. 🐸

### Hosszú leírás
> **frog** is your friendly AI nutrition assistant that speaks your language.
>
> Get personalized weekly meal plans based on your goals, import your dietician's PDF plan, find local restaurants with calorie-aware suggestions, and track your nutrition — all in Hungarian, Romanian, or English.
>
> **What makes frog different:**
> - AI meal plans adapted to YOUR local food (not American portions)
> - PDF import: upload your dietician's plan, we make it trackable
> - Local restaurant daily menus with calorie estimates
> - Shopping list → store finder → delivery link (full purchase funnel)
> - Trilingual: built for HU, RO, and EN speakers
>
> **Transform what you eat.** 🐸

### Kategória
Health & Fitness > Nutrition

---

## Marketing irányok

### A béka mint Duolingo-effektus
A béka karakter az app személyisége. Megjelenik:
- **Push notification-ökben:** "🐸 Jó reggelt Attila! Mai reggeli: túrós palacsinta (420 kcal)"
- **Loading screen-eken:** pislogó béka animáció
- **Üres állapotokban:** béka bíztatja a felhasználót
- **Achievement-eknél:** béka ünnepel (streak, cél elérés)

### Tagline variációk kampányokhoz

| Kampány | Tagline |
|---------|---------|
| Általános | Transform what you eat |
| Dietetikus partnerség | Your dietician's plan, in your pocket |
| Étterem feature | Eat smart, even when you eat out |
| Szociális (jövő) | Lunch together, eat better |
| Böjt feature | Faith-aware nutrition planning |

---

## Fájlok

```
branding/
├── FROG_BRAND.md              ← Ez a fájl
├── frog-logo-v1-minimal.svg   ← Fehér arc teal háttéren
├── frog-logo-v2-modern.svg    ← Dark mode ikon + felirat
├── frog-logo-v3-icon.svg      ← Kukucskáló szemek (App Store)
├── frog-logo-v4-duolingo-style.svg  ← Teljes mascot (villával, integet)
├── frog-logo-v5-wordmark.svg  ← Béka + "frog" felirat + tagline
└── frog-animated-v1.html      ← 5 animált verzió (pislogás, peek, mascot, wordmark, splash)
```

---

> **A frog brand lényege:** Nem egy steril egészségügyi alkalmazás. Egy kedves, személyes, karakter-vezérelt brand, ahol a béka a felhasználó barátja és táplálkozási coach-ja egyszerre.
