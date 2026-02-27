/**
 * ====================================================================
 * FuturisticDashboard - AI Hangvezérelt Asszisztens
 * ====================================================================
 * Full-screen voice-driven AI assistant panel with:
 * - Brain icon trigger (emerald/cyan gradient, pulsing indicator)
 * - Slide-up panel (spring animation)
 * - 28-bar radial Voice Orb (4 states: idle, listening, thinking, speaking)
 * - SpeechRecognition hu-HU continuous mode with 2s silence detection
 * - Multi-turn ActiveFlow conversation system
 * - Typewriter AI response display
 * - Real-time AIContext from app data (calories, water, meals, workout)
 * - Haptic feedback patterns
 * ====================================================================
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Mic, MicOff, X, Sparkles } from "lucide-react";
import { useCalorieTracker } from "../hooks/useCalorieTracker";
import { usePlanData, type WeekData } from "../hooks/usePlanData";
import { useLanguage } from "../contexts/LanguageContext";
// mealPlan import removed — all data from uploads only

// ─── Template interpolation helper ────────────────────────────────
function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

// ─── Language → SpeechRecognition locale ──────────────────────────
const SPEECH_LANG_MAP: Record<string, string> = {
  hu: 'hu-HU',
  en: 'en-US',
  ro: 'ro-RO',
};

// Map UI language → TTS voice locale (used for Web Speech fallback)
const TTS_LANG_MAP: Record<string, string> = {
  hu: 'hu-HU',
  en: 'en-US',
  ro: 'ro-RO',
};

const ELEVEN_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel – natural female voice

async function speakWithElevenLabs(text: string): Promise<boolean> {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;
  if (!apiKey || !text.trim()) return false;

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.85,
        },
      }),
    });

    if (!res.ok) {
      console.warn('[TTS] ElevenLabs request failed:', res.status, await res.text());
      return false;
    }

    const audioData = await res.arrayBuffer();
    const blob = new Blob([audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.play().catch((err) => {
      console.warn('[TTS] Failed to play ElevenLabs audio:', err);
    });
    return true;
  } catch (err) {
    console.warn('[TTS] ElevenLabs error, falling back to Web Speech:', err);
    return false;
  }
}

function speakWithWebSpeech(text: string, language: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
  try {
    const synth = window.speechSynthesis;
    const targetLang = TTS_LANG_MAP[language] || 'hu-HU';

    const pickVoice = () => {
      const voices = synth.getVoices() || [];
      if (!voices.length) return undefined;

      const langMatches = voices.filter((v) => v.lang?.toLowerCase().startsWith(targetLang.toLowerCase()));
      const byLang = langMatches.length ? langMatches : voices;

      const preferredNameHints = [
        'female',
        'woman',
        'Samantha',
        'Zira',
        'Google magyar',
        'Google UK English Female',
        'Google US English',
      ];

      for (const hint of preferredNameHints) {
        const v = byLang.find((voice) => voice.name.toLowerCase().includes(hint.toLowerCase()));
        if (v) return v;
      }

      return byLang[0];
    };

    const startSpeaking = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLang;
      utterance.rate = 0.98;
      utterance.pitch = 1.05;

      const voice = pickVoice();
      if (voice) {
        utterance.voice = voice;
      }

      synth.cancel();
      synth.speak(utterance);
    };

    if (!synth.getVoices().length) {
      const handler = () => {
        synth.removeEventListener('voiceschanged', handler as any);
        startSpeaking();
      };
      synth.addEventListener('voiceschanged', handler as any);
    } else {
      startSpeaking();
    }
  } catch {
    // Fail silently if TTS is not available
  }
}

async function speakText(text: string, language: string) {
  if (!text.trim()) return;
  const usedEleven = await speakWithElevenLabs(text);
  if (!usedEleven) {
    speakWithWebSpeech(text, language);
  }
}

// ─── Web Speech API type declarations ──────────────────────────────
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

// ─── Types ──────────────────────────────────────────────────────────
type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface ActiveFlow {
  type: "order_confirm" | "order_delivery" | "order_address" | "meal_detail" | "confirm_generic";
  data?: Record<string, any>;
  onYes: (ctx: AIContext, t: (key: string) => string) => FlowResult;
  onNo: (ctx: AIContext, t: (key: string) => string) => FlowResult;
}

interface FlowResult {
  response: string;
  newFlow: ActiveFlow | null;
}

interface AIContext {
  consumed: number;
  target: number;
  remaining: number;
  waterIntake: number;
  maxWater: number;
  nextMealName: string;
  nextMealSlotLabel: string;
  nextMealKcal: string;
  /** Human‑readable summary for today's full menu (breakfast, lunch, dinner) */
  todayMenuSummary: string;
  workoutCal: number;
  workoutMin: number;
  alerts: { name: string; status: "low" | "empty" }[];
  steps: number;
  name: string;
}

// ─── MEAL_DB — 8 magyar recept javaslókhoz ─────────────────────────
const MEAL_DB = [
  { name: "Csirkemell salátával", kcal: 380, training: false, recipe: "Pirítsd meg a csirkemellet olivaolajban, tálald friss salátával és citromos dresszinggel.", ingredients: "220g csirkemell, 200g vegyes saláta, 1 ek olívaolaj, citromlé" },
  { name: "Marhapörkölt rizzsel", kcal: 650, training: true, recipe: "Dinszteld a hagymát, add hozzá a marhahúst, pirospaprikát, főzd 90 percig. Tálald rizzsel.", ingredients: "200g marhahús, 150g rizs, 2 hagyma, 1 ek pirospaprika" },
  { name: "Lazac párolt zöldséggel", kcal: 420, training: false, recipe: "Süsd a lazacot bőrös oldalával lefelé, párold a brokkolit és cukkinit gőzben.", ingredients: "180g lazacfilé, 150g brokkoli, 100g cukkini, fűszerek" },
  { name: "Tojásrántotta sonkával", kcal: 350, training: false, recipe: "Keverd össze a tojásokat, süsd vajban, adj hozzá csíkokra vágott sonkát.", ingredients: "3 tojás, 60g sonka, 1 kk vaj, só, bors" },
  { name: "Zabkása gyümölcsökkel", kcal: 320, training: true, recipe: "Főzd a zabot mandulatejben, tedd rá a szeletelt banánt és áfonyát.", ingredients: "50g zabpehely, 200ml mandulatej, 1 banán, 30g áfonya" },
  { name: "Grillezett pulykamell", kcal: 400, training: true, recipe: "Fűszerezd a pulykát rozmaringgal és fokhagymával, grillezd 6-7 percig.", ingredients: "220g pulykamell, 200g édesburgonya, rozmaring, fokhagyma" },
  { name: "Töltött paprika", kcal: 480, training: false, recipe: "Töltsd meg a paprikát húsos-rizses töltelékkel, főzd paradicsomszószban.", ingredients: "4 paprika, 300g darált hús, 100g rizs, 500ml paradicsomlé" },
  { name: "Gulyásleves", kcal: 520, training: true, recipe: "Pirítsd a hagymát, add hozzá a kockára vágott húst, burgonyát, pirospaprikát, főzd 1 órát.", ingredients: "200g marhahús, 200g burgonya, 2 hagyma, pirospaprika, kömény" },
];

// ─── MOCK_INVENTORY — készletfigyelés ──────────────────────────────
const MOCK_INVENTORY = [
  { name: "Kecske tej", status: "low" as const },
  { name: "Tojás", status: "ok" as const },
  { name: "Csirkemell", status: "ok" as const },
  { name: "Brokkoli", status: "empty" as const },
  { name: "Zabpehely", status: "ok" as const },
  { name: "Kecske túró", status: "low" as const },
  { name: "Lazac", status: "ok" as const },
  { name: "Avokádó", status: "empty" as const },
  { name: "Banán", status: "ok" as const },
  { name: "Dió", status: "low" as const },
];

// ─── Build AIContext from app data ─────────────────────────────────
function buildAIContext(
  calorieData: { consumed: number; target: number; remaining: number },
  planData: WeekData[] = [],
  t: (key: string) => string
): AIContext {
  // Water
  let waterIntake = 0;
  try {
    const today = new Date().toISOString().split("T")[0];
    const waterData = localStorage.getItem("waterTracking");
    if (waterData) {
      const data = JSON.parse(waterData);
      waterIntake = data[today] || 0;
    }
  } catch {}

  // Workout
  let workoutCal = 0;
  let workoutMin = 0;
  try {
    const today = new Date().toISOString().split("T")[0];
    const workoutData = localStorage.getItem("workoutTracking");
    if (workoutData) {
      const data = JSON.parse(workoutData);
      if (data[today]) {
        workoutCal = data[today].calories || 0;
        workoutMin = data[today].minutes || 0;
      }
    }
  } catch {}

  // Next meal — compute from planData (uploaded data)
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const jsDay = now.getDay();
  const planDay = jsDay === 0 ? 6 : jsDay - 1;
  const weekIndex = 0; // current week
  const dayData = planData[weekIndex]?.days[planDay];

  let nextMealName = t('dashboard.noData');
  let nextMealSlotLabel = t('dashboard.breakfast');
  let nextMealKcal = "0";
  let todayMenuSummary = t('dashboard.noData');

  if (dayData) {
    if (minutes < 8 * 60 && dayData.breakfast[0]) {
      nextMealName = dayData.breakfast[0].name;
      nextMealSlotLabel = t('dashboard.breakfast');
      nextMealKcal = dayData.breakfast[0].calories;
    } else if (minutes < 13.5 * 60 && dayData.lunch[0]) {
      nextMealName = dayData.lunch[0].name;
      nextMealSlotLabel = t('dashboard.lunch');
      nextMealKcal = dayData.lunch[0].calories;
    } else if (dayData.dinner[0]) {
      nextMealName = dayData.dinner[0].name;
      nextMealSlotLabel = t('dashboard.dinner');
      nextMealKcal = dayData.dinner[0].calories;
    }

    // Build a friendly, localized summary for today's full menu
    const breakfastName = dayData.breakfast[0]?.name;
    const lunchName = dayData.lunch[0]?.name;
    const dinnerName = dayData.dinner[0]?.name;
    const parts: string[] = [];
    if (breakfastName) parts.push(`${t('menu.breakfast')}: ${breakfastName}`);
    if (lunchName) parts.push(`${t('menu.lunch')}: ${lunchName}`);
    if (dinnerName) parts.push(`${t('menu.dinner')}: ${dinnerName}`);
    if (parts.length) {
      todayMenuSummary = parts.join(' • ');
    }
  }

  // Alerts
  const alerts = MOCK_INVENTORY.filter(i => i.status === "low" || i.status === "empty") as { name: string; status: "low" | "empty" }[];

  // User name
  let name = t('dashboard.user');
  try {
    const profile = localStorage.getItem("userProfile");
    if (profile) {
      const data = JSON.parse(profile);
      if (data.name) name = data.name;
    }
  } catch {}

  return {
    consumed: calorieData.consumed,
    target: calorieData.target,
    remaining: calorieData.remaining,
    waterIntake,
    maxWater: 3000,
    nextMealName,
    nextMealSlotLabel,
    nextMealKcal,
    todayMenuSummary,
    workoutCal,
    workoutMin,
    alerts,
    steps: 6420,
    name,
  };
}

// ─── Build greeting ────────────────────────────────────────────────
function buildGreeting(ctx: AIContext, t: (key: string) => string): string {
  const hour = new Date().getHours();
  let greeting: string;
  if (hour < 10) greeting = t('dashboard.goodMorning');
  else if (hour < 18) greeting = t('dashboard.goodDay');
  else greeting = t('dashboard.goodEvening');

  greeting += `, ${ctx.name}! `;

  if (hour < 10 && ctx.consumed === 0) {
    greeting += interpolate(t('dashboard.greetMorningMeal'), { meal: ctx.nextMealName, kcal: ctx.nextMealKcal });
  } else if (hour >= 11 && hour < 14 && ctx.consumed < ctx.target * 0.3) {
    greeting += interpolate(t('dashboard.greetLunchReminder'), { meal: ctx.nextMealName });
  } else if (ctx.waterIntake < 1000 && hour > 12) {
    greeting += interpolate(t('dashboard.greetWaterLow'), { litres: (ctx.waterIntake / 1000).toFixed(1) });
  } else if (ctx.alerts.length > 0) {
    const alertNames = ctx.alerts.slice(0, 2).map(a => a.name).join(", ");
    const status = ctx.alerts[0].status === "empty" ? t('dashboard.alertEmpty') : t('dashboard.alertLow');
    greeting += interpolate(t('dashboard.greetAlert'), { items: alertNames, status });
  } else {
    const remainingMsg = ctx.remaining > 0
      ? interpolate(t('dashboard.remainingLeft'), { remaining: ctx.remaining })
      : t('dashboard.goalReachedMsg');
    greeting += interpolate(t('dashboard.greetDefault'), { consumed: ctx.consumed, target: ctx.target, remainingMsg });
  }

  return greeting;
}

// ─── Process command (NLU) ─────────────────────────────────────────
function setTodayWaterIntake(totalMl: number) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const raw = localStorage.getItem("waterTracking");
    const data = raw ? JSON.parse(raw) : {};
    const clamped = Math.max(0, Math.min(totalMl, 5000));
    data[today] = clamped;
    localStorage.setItem("waterTracking", JSON.stringify(data));
    // Notify other parts of the app (Layout, UnifiedMenu, etc.)
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("waterTrackerSync"));
  } catch {
    // Fail silently if storage is not available
  }
}

function processCommand(text: string, ctx: AIContext, flow: ActiveFlow | null, lastSuggestedRef: React.MutableRefObject<string>, t: (key: string) => string): FlowResult {
  const lower = text.toLowerCase().replace(/[áàăâ]/g, "a").replace(/[éè]/g, "e").replace(/[íìî]/g, "i").replace(/[óò]/g, "o").replace(/[öő]/g, "o").replace(/[úù]/g, "u").replace(/[üű]/g, "u").replace(/[ș]/g, "s").replace(/[ț]/g, "t");

  // ── Active flow: yes/no ──
  if (flow) {
    if (/^(igen|ja|persze|oke?|rendben|jo|jol van|aha|hogyne|megfelel|az jo|yes|yeah|sure|ok|fine|alright|correct|da|sigur|bine|exact)/.test(lower)) {
      return flow.onYes(ctx, t);
    }
    if (/^(nem|ne|megsem|hagyd|stop|kosz|elegendo|elutasit|masik|mast kerek|no|nope|cancel|nah|nu|anulare|lasa|altceva)/.test(lower)) {
      if ((lower.includes("mas") || lower.includes("another") || lower.includes("altceva")) && flow.type === "meal_detail") {
        // "mást kérek" / "another one" / "altceva" -> suggest another food
        return suggestFood(ctx, lastSuggestedRef, t);
      }
      return flow.onNo(ctx, t);
    }
    // Delivery time specific answers
    if (flow.type === "order_delivery") {
      if (/delutan|du|este|holnap|afternoon|evening|tomorrow|dupa-amiaza|seara|maine/.test(lower)) {
        return flow.onYes(ctx, t);
      }
    }
  }

  // ── Explicit water intake update (e.g. "ma ittam 2 liter vizet") ──
  if ((/ittam|ittunk|i drank|i have drunk|am baut/.test(lower)) && (/viz|vizet|water|apa/.test(lower))) {
    const amountMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(l|liter|litert|litre|liters?|ml|milliliter|millilitert)/);
    if (amountMatch) {
      const value = parseFloat(amountMatch[1].replace(',', '.'));
      const unit = amountMatch[2];
      let ml = value;
      if (/l|liter|litre/.test(unit)) {
        ml = value * 1000;
      }
      setTodayWaterIntake(ml);
      const litres = (ml / 1000).toFixed(1);
      return {
        response: `Értettem. Ma ${litres} liter vízfogyasztással számolok.`,
        newFlow: null,
      };
    }
  }

  // ── Order ──
  if (/rendel|megrendel|kuldj|kuldd|hozz|order|deliver|send|bring|comand|livr|trimite|adu/.test(lower)) {
    const product = matchProduct(lower);
    if (product) {
      return {
        response: interpolate(t('dashboard.orderConfirm'), { product }),
        newFlow: {
          type: "order_confirm",
          data: { product },
          onYes: (_ctx, t) => ({
            response: interpolate(t('dashboard.orderPrepare'), { product }),
            newFlow: {
              type: "order_delivery",
              data: { product },
              onYes: (_ctx, t) => ({
                response: t('dashboard.orderAddress'),
                newFlow: {
                  type: "order_address",
                  data: { product },
                  onYes: (_ctx, t) => ({
                    response: interpolate(t('dashboard.orderDone'), { product }),
                    newFlow: null,
                  }),
                  onNo: (_ctx, t) => ({
                    response: t('dashboard.orderNewAddress'),
                    newFlow: null,
                  }),
                },
              }),
              onNo: (_ctx, t) => ({
                response: t('dashboard.orderWhen'),
                newFlow: {
                  type: "order_delivery",
                  data: { product },
                  onYes: (_ctx, t) => ({
                    response: t('dashboard.orderGotTime'),
                    newFlow: {
                      type: "order_address",
                      data: { product },
                      onYes: (_ctx, t) => ({
                        response: interpolate(t('dashboard.orderDoneShort'), { product }),
                        newFlow: null,
                      }),
                      onNo: (_ctx, t) => ({
                        response: t('dashboard.orderDeletedShort'),
                        newFlow: null,
                      }),
                    },
                  }),
                  onNo: (_ctx, t) => ({
                    response: t('dashboard.orderCancelled'),
                    newFlow: null,
                  }),
                },
              }),
            },
          }),
          onNo: (_ctx, t) => ({
            response: t('dashboard.orderStopped'),
            newFlow: null,
          }),
        },
      };
    }
  }

  // ── Food suggestion ──
  if (/javasolj|ajanlj|segits etelt|mit egyek|mit fozzek|valasszak|etel.*javasla|suggest|recommend|what.*eat|what.*cook|food.*suggest|suger|recomand|ce.*mananc|ce.*gatesc/.test(lower)) {
    return suggestFood(ctx, lastSuggestedRef, t);
  }

  // ── Water ──
  if (/viz|ital|igyal|innek|szomjas|vizfogyaszt|water|drink|thirsty|hydrat|apa|beau|insetat/.test(lower)) {
    const litres = (ctx.waterIntake / 1000).toFixed(1);
    const pct = Math.round((ctx.waterIntake / ctx.maxWater) * 100);
    const tip = pct < 50 ? t('dashboard.waterTipLow') : pct < 80 ? t('dashboard.waterTipMid') : t('dashboard.waterTipHigh');
    return {
      response: interpolate(t('dashboard.waterStatus'), { litres, pct, tip }),
      newFlow: null,
    };
  }

  // ── Meal/food ──
  if (/etel|etkez|enni|reggeli|ebed|vacsora|mit egy|mit foz|kovetkezo|meal|food|eat|breakfast|lunch|dinner|next|masa|mancare|mananc|mic dejun|pranz|cina|urmato/.test(lower)) {
    return {
      response: interpolate(t('dashboard.nextMealInfo'), { slot: ctx.nextMealSlotLabel, meal: ctx.nextMealName, kcal: ctx.nextMealKcal }),
      newFlow: {
        type: "meal_detail",
        data: { meal: ctx.nextMealName },
        onYes: (_ctx, t) => ({
          response: interpolate(t('dashboard.mealRecipeHint'), { meal: ctx.nextMealName }),
          newFlow: null,
        }),
        onNo: (_ctx, t) => ({
          response: t('dashboard.okDismiss'),
          newFlow: null,
        }),
      },
    };
  }

  // ── Full daily menu summary ──
  if (/napi menu|napi menut|napi menumat|mondd el a napi menu|tell me today'?s menu|today'?s menu|meniul de azi|meniul zilei/.test(lower)) {
    return {
      response: ctx.todayMenuSummary,
      newFlow: null,
    };
  }

  // ── Workout ──
  if (/edzes|sport|edz|edzettem|futottam|usztam|mozg|aktiv|torna|workout|exercise|train|ran|swam|gym|antrenament|exerciti|alergat|inotat|sala/.test(lower)) {
    if (ctx.workoutMin > 0) {
      return {
        response: interpolate(t('dashboard.workoutDone'), { min: ctx.workoutMin, cal: ctx.workoutCal }),
        newFlow: null,
      };
    }
    const jsDay = new Date().getDay();
    const planDay = jsDay === 0 ? 6 : jsDay - 1;
    const isTraining = planDay === 0 || planDay === 2 || planDay === 3;
    return {
      response: isTraining ? t('dashboard.workoutTrainingDay') : t('dashboard.workoutRestDay'),
      newFlow: null,
    };
  }

  // ── Shopping ──
  if (/bevasarl|bolt|vasarl|uzlet|kaufland|carrefour|lidl|shop|grocer|store|market|cumpar|magazin|piata/.test(lower)) {
    const alertList = ctx.alerts.map(a => `${a.name} (${a.status === "empty" ? t('dashboard.alertEmpty') : t('dashboard.alertLow')})`).join(", ");
    return {
      response: alertList
        ? interpolate(t('dashboard.shoppingAlert'), { alerts: alertList })
        : t('dashboard.shoppingOk'),
      newFlow: null,
    };
  }

  // ── Calories ──
  if (/kaloria|kcal|szenhidrat|feherje|zsir|makro|mennyi|kalor|calorie|carb|protein|fat|macro|how much|calori|carbohidrat|grasim|cat/.test(lower)) {
    const remainingMsg = ctx.remaining > 0 ? interpolate(t('dashboard.remainingLeft'), { remaining: ctx.remaining }) : t('dashboard.goalReachedMsg');
    const workoutMsg = ctx.workoutCal > 0 ? interpolate(t('dashboard.calorieSportExtra'), { cal: ctx.workoutCal }) : "";
    return {
      response: interpolate(t('dashboard.calorieStatus'), { consumed: ctx.consumed, target: ctx.target, remainingMsg, workoutMsg }),
      newFlow: null,
    };
  }

  // ── Progress ──
  if (/haladas|suly|fogyas|grafikon|kilogramm|kilo|test|progress|weight|loss|chart|body|progres|greut|slabit|grafic|corp/.test(lower)) {
    return {
      response: t('dashboard.progressHint'),
      newFlow: null,
    };
  }

  // ── Mood ──
  if (/hangulat|erzes|hogy vagy|faradt|motivacio|kedv|energia|mood|feel|how are|tired|motivat|energy|dispoziti|simt|obosit|energi/.test(lower)) {
    const waterHint = ctx.waterIntake >= 2000 ? t('dashboard.moodResp2Water') : t('dashboard.moodResp2Goal');
    const responses = [
      interpolate(t('dashboard.moodResp1'), { consumed: ctx.consumed }),
      interpolate(t('dashboard.moodResp2'), { waterHint }),
      t('dashboard.moodResp3'),
    ];
    return { response: responses[Math.floor(Math.random() * responses.length)], newFlow: null };
  }

  // ── Help ──
  if (/segitseg|segits|help|mit tudsz|funkcio|tud|what can|feature|assist|ajutor|ce.*poti|functii/.test(lower)) {
    return {
      response: t('dashboard.helpList'),
      newFlow: null,
    };
  }

  // ── Greeting ──
  if (/szia|hello|hey|szervusz|jo napot|udv|hali|csao|good morning|good day|buna|salut|servus/.test(lower)) {
    return { response: buildGreeting(ctx, t), newFlow: null };
  }

  // ── Generic yes without flow ──
  if (/^(igen|ja|persze|yes|yeah|sure|da|sigur)/.test(lower) && !flow) {
    return { response: t('dashboard.genericYes'), newFlow: null };
  }

  // ── Thank you ──
  if (/koszon|koszi|kosz|hala|thanks|thank|multumesc|mersi|multam/.test(lower)) {
    return { response: t('dashboard.thanksResp'), newFlow: null };
  }

  // ── Fallback ──
  return {
    response: t('dashboard.fallbackResp'),
    newFlow: null,
  };
}

function matchProduct(text: string): string | null {
  const products: Record<string, string> = {
    // HU
    "tej": "Kecsketej (1L)", "kecsketej": "Kecsketej (1L)",
    "tojas": "Tojas (10 db)",
    "csirkemell": "Csirkemell (1 kg)", "csirke": "Csirkemell (1 kg)",
    "brokkoli": "Brokkoli (500g)",
    "lazac": "Lazac file (300g)",
    "zab": "Zabpehely (500g)", "zabpehely": "Zabpehely (500g)",
    "turo": "Kecske turo (250g)",
    "kenyar": "Teljes kiorlesu kenyer", "kenyer": "Teljes kiorlesu kenyer",
    "avokado": "Avokado (2 db)",
    "banan": "Banan (1 kg)", "dio": "Dio (200g)",
    "rizs": "Jasmin rizs (1 kg)",
    // EN
    "milk": "Kecsketej (1L)", "goat milk": "Kecsketej (1L)",
    "eggs": "Tojas (10 db)", "egg": "Tojas (10 db)",
    "chicken breast": "Csirkemell (1 kg)", "chicken": "Csirkemell (1 kg)",
    "broccoli": "Brokkoli (500g)",
    "salmon": "Lazac file (300g)",
    "oatmeal": "Zabpehely (500g)", "oat": "Zabpehely (500g)",
    "cottage cheese": "Kecske turo (250g)",
    "bread": "Teljes kiorlesu kenyer",
    "avocado": "Avokado (2 db)",
    "banana": "Banan (1 kg)", "walnut": "Dio (200g)",
    "rice": "Jasmin rizs (1 kg)",
    // RO
    "lapte": "Kecsketej (1L)", "lapte de capra": "Kecsketej (1L)",
    "oua": "Tojas (10 db)", "ou": "Tojas (10 db)",
    "piept de pui": "Csirkemell (1 kg)", "pui": "Csirkemell (1 kg)",
    "somon": "Lazac file (300g)",
    "ovaz": "Zabpehely (500g)", "fulgi de ovaz": "Zabpehely (500g)",
    "branza": "Kecske turo (250g)",
    "paine": "Teljes kiorlesu kenyer",
    "banane": "Banan (1 kg)", "nuca": "Dio (200g)",
    "orez": "Jasmin rizs (1 kg)",
  };
  for (const [key, val] of Object.entries(products)) {
    if (text.includes(key)) return val;
  }
  return null;
}

function suggestFood(ctx: AIContext, lastSuggestedRef: React.MutableRefObject<string>, t: (key: string) => string): FlowResult {
  const jsDay = new Date().getDay();
  const planDay = jsDay === 0 ? 6 : jsDay - 1;
  const isTraining = planDay === 0 || planDay === 2 || planDay === 3;

  // Filter by training and calories
  const candidates = MEAL_DB.filter(m => {
    if (m.name === lastSuggestedRef.current) return false;
    if (isTraining && m.training) return true;
    if (!isTraining && !m.training) return true;
    if (ctx.remaining > 0 && m.kcal <= ctx.remaining) return true;
    return false;
  });

  const meal = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : MEAL_DB[0];
  lastSuggestedRef.current = meal.name;

  const hint = isTraining ? t('dashboard.suggestTraining') : t('dashboard.suggestRest');

  return {
    response: interpolate(t('dashboard.suggestMeal'), { meal: meal.name, kcal: meal.kcal, hint }),
    newFlow: {
      type: "meal_detail",
      data: { meal: meal.name },
      onYes: (_ctx, t) => ({
        response: interpolate(t('dashboard.suggestRecipe'), { meal: meal.name, recipe: meal.recipe, ingredients: meal.ingredients }),
        newFlow: null,
      }),
      onNo: (_ctx, t) => suggestFood(ctx, lastSuggestedRef, t),
    },
  };
}

// ─── Haptic helpers ────────────────────────────────────────────────
function hapticOpen() { try { navigator.vibrate?.([15, 30, 50]); } catch {} }
function hapticProcess() { try { navigator.vibrate?.(10); } catch {} }

// ─── VoiceOrb ──────────────────────────────────────────────────────
const NUM_BARS = 28;
const INNER_R = 52;
const OUTER_BASE = 70;
const SIZE = 230;
const CENTER = SIZE / 2;

const ORB_COLORS: Record<OrbState, { bar: string }> = {
  idle: { bar: "#a78bfa" },
  listening: { bar: "#22d3ee" },
  thinking: { bar: "#fbbf24" },
  speaking: { bar: "#34d399" },
};

function VoiceOrb({ state }: { state: OrbState }) {
  const [bars, setBars] = useState<number[]>(() => Array(NUM_BARS).fill(0.3));
  const frameRef = useRef(0);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      frameRef.current++;
      setBars(prev => prev.map((_, i) => {
        const angle = (i / NUM_BARS) * Math.PI * 2;
        const t = frameRef.current * 0.03;
        switch (state) {
          case "idle":
            return 0.2 + Math.sin(t + angle * 2) * 0.15;
          case "listening":
            return 0.3 + Math.random() * 0.7;
          case "thinking":
            return 0.25 + Math.sin(t * 0.5 + angle * 3) * 0.2;
          case "speaking":
            return 0.3 + Math.sin(t * 2 + angle * 4) * 0.35 + Math.random() * 0.15;
          default:
            return 0.3;
        }
      }));
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  const colors = ORB_COLORS[state];

  const IconComponent = state === "listening" ? Mic : state === "thinking" ? Brain : Sparkles;
  const iconColor = state === "listening" ? "#22d3ee" : state === "thinking" ? "#fbbf24" : state === "speaking" ? "#34d399" : "#a78bfa";

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      {/* Bars (clean radial lines, no extra glow/blur) */}
      <svg width={SIZE} height={SIZE} className="absolute inset-0">
        {bars.map((h, i) => {
          const angle = (i / NUM_BARS) * 360;
          const barLen = INNER_R + h * (OUTER_BASE - INNER_R + 20);
          const rad = (angle * Math.PI) / 180;
          const x1 = CENTER + Math.cos(rad) * INNER_R;
          const y1 = CENTER + Math.sin(rad) * INNER_R;
          const x2 = CENTER + Math.cos(rad) * barLen;
          const y2 = CENTER + Math.sin(rad) * barLen;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={colors.bar}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.5 + h * 0.5}
            />
          );
        })}
      </svg>
      {/* Center icon */}
      <div className="relative flex items-center justify-center">
        <IconComponent className="w-9 h-9 transition-colors duration-500" style={{ color: iconColor }} />
      </div>
    </div>
  );
}

// ─── TypewriterText ────────────────────────────────────────────────
function TypewriterText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;
    completedRef.current = false;
    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        indexRef.current++;
        setDisplayed(text.slice(0, indexRef.current));
      } else {
        clearInterval(timer);
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }
    }, 28);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <span>
      {displayed}
      {indexRef.current < text.length && (
        <span className="inline-block w-0.5 h-4 bg-emerald-400 ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}

// ─── CountdownBar ──────────────────────────────────────────────────
function CountdownBar({ active, duration = 2000 }: { active: boolean; duration?: number }) {
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (active) setKey(k => k + 1);
  }, [active]);

  if (!active) return null;

  return (
    <div className="w-[120px] h-1 bg-white/10 rounded-full overflow-hidden mt-3 mx-auto">
      <motion.div
        key={key}
        className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: duration / 1000, ease: "linear" }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface ChatMessage {
  id: number;
  role: "user" | "ai";
  text: string;
}

export function FuturisticDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [isTyping, setIsTyping] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [micActive, setMicActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusLabel, setStatusLabel] = useState("");
  const [silenceActive, setSilenceActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentAiText, setCurrentAiText] = useState("");
  const [hasSpeechAPI, setHasSpeechAPI] = useState(true);
  const msgIdRef = useRef(0);

  // Refs for stale closure prevention
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const accumulatedTextRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldRestartRef = useRef(false);
  const activeFlowRef = useRef<ActiveFlow | null>(null);
  const lastSuggestedRef = useRef("");
  const processRef = useRef<(text: string) => void>(() => {});
  const micActiveRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pendingAiRef = useRef<{ id: number; text: string } | null>(null);

  const calorieData = useCalorieTracker();
  const { planData } = usePlanData();
  const { t, language } = useLanguage();
  const ctx = useMemo(() => buildAIContext(calorieData, planData, t), [calorieData, planData, t]);

  // Keep micActiveRef in sync
  useEffect(() => { micActiveRef.current = micActive; }, [micActive]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentAiText, interimText]);

  // ─── processRef kept fresh ───
  useEffect(() => {
    processRef.current = (finalText: string) => {
      if (!finalText.trim()) return;
      hapticProcess();

      // Add user message to history (guard against accidental duplicates)
      msgIdRef.current++;
      const userMsg: ChatMessage = { id: msgIdRef.current, role: "user", text: finalText.trim() };
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === "user" && last.text === userMsg.text) {
          return prev;
        }
        return [...prev, userMsg];
      });

      // Stop listening temporarily
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
      setInterimText("");
      setSilenceActive(false);

      // Thinking state
      setIsProcessing(true);
      setOrbState("thinking");
      setStatusLabel(t('dashboard.processing'));

      // Process after a brief delay (feel natural)
      setTimeout(() => {
        const result = processCommand(finalText, ctx, activeFlowRef.current, lastSuggestedRef, t);
        activeFlowRef.current = result.newFlow;
        setIsProcessing(false);

        // Speaking state (typewriter)
        msgIdRef.current++;
        const aiMsgId = msgIdRef.current;
        setOrbState("speaking");
        setIsTyping(true);
        setStatusLabel(t('dashboard.responding'));
        setCurrentAiText(result.response);

        // Speak the AI response aloud using browser TTS
        speakText(result.response, language);

        // Store the pending AI message for completion handler
        pendingAiRef.current = { id: aiMsgId, text: result.response };
      }, 600 + Math.random() * 400);
    };
  }, [ctx, t, language]);

  // ─── SpeechRecognition setup ───
  const initRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setHasSpeechAPI(false);
      return null;
    }

    const recognition = new SR();
    recognition.lang = SPEECH_LANG_MAP[language] || "hu-HU";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          accumulatedTextRef.current += " " + transcript;
        } else {
          interim = transcript;
        }
      }
      setInterimText(accumulatedTextRef.current.trim() + (interim ? " " + interim : ""));
      setSilenceActive(true);

      // Reset 2s silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const final = (accumulatedTextRef.current + " " + interim).trim();
        if (final) {
          processRef.current(final);
        }
        accumulatedTextRef.current = "";
        setSilenceActive(false);
      }, 2000);
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-available") {
        setMicActive(false);
        shouldRestartRef.current = false;
        setOrbState("idle");
        setStatusLabel(t('dashboard.micNotAvailable'));
      }
    };

    return recognition;
  }, [language]);

  // ─── Start listening (internal) ───
  const doStartListening = useCallback(() => {
    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }
    if (!recognitionRef.current) return;

    accumulatedTextRef.current = "";
    setInterimText("");
    shouldRestartRef.current = true;
    setOrbState("listening");
    setStatusLabel(t('dashboard.listening'));

    try { recognitionRef.current.start(); } catch {}
  }, [initRecognition, t]);

  // ─── Stop listening (internal) ───
  const doStopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    setSilenceActive(false);

    // Process whatever we have
    const text = accumulatedTextRef.current.trim();
    if (text) {
      processRef.current(text);
    }
    accumulatedTextRef.current = "";
    setInterimText("");
  }, []);

  // ─── Toggle mic (the main user interaction) ───
  const toggleMic = useCallback(() => {
    if (micActive) {
      // Turn OFF
      setMicActive(false);
      doStopListening();
      setOrbState("idle");
      setStatusLabel("");
      hapticProcess();
    } else {
      // Turn ON
      setMicActive(true);
      doStartListening();
      hapticOpen();
    }
  }, [micActive, doStartListening, doStopListening]);

  // ─── Typewriter completion → auto-resume listening if mic is active ───
  const handleTypewriterComplete = useCallback(() => {
    // Add AI message to history (guard against accidental duplicates)
    const pending = pendingAiRef.current;
    if (pending) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === "ai" && last.text === pending.text) {
          return prev;
        }
        return [...prev, { id: pending.id, role: "ai", text: pending.text }];
      });
      pendingAiRef.current = null;
    }
    setIsTyping(false);
    setCurrentAiText("");

    // Auto-resume listening if mic is still active
    if (micActiveRef.current) {
      setTimeout(() => {
        setOrbState("listening");
        setStatusLabel(t('dashboard.listening'));
        doStartListening();
      }, 300);
    } else {
      setOrbState("idle");
      setStatusLabel("");
    }
  }, [doStartListening, t]);

  // ─── Panel open: greeting ───
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    hapticOpen();
    window.dispatchEvent(new CustomEvent("aiPanelStateChange", { detail: { open: true } }));
    setOrbState("idle");
    setCurrentAiText("");
    setIsTyping(false);
    setIsProcessing(false);
    setInterimText("");
    setMicActive(false);
    setMessages([]);
    activeFlowRef.current = null;
    msgIdRef.current = 0;

    // Greeting after panel animation
    setTimeout(() => {
      const greeting = buildGreeting(ctx, t);
      msgIdRef.current++;
      setOrbState("speaking");
      setIsTyping(true);
      setStatusLabel(t('dashboard.responding'));
      setCurrentAiText(greeting);
      pendingAiRef.current = { id: msgIdRef.current, text: greeting };
    }, 450);
  }, [ctx, t]);

  const handleClose = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent("aiPanelStateChange", { detail: { open: false } }));
    setMicActive(false);
    setIsProcessing(false);
    setIsTyping(false);
    setOrbState("idle");
    setInterimText("");
    setCurrentAiText("");
    setMessages([]);
    activeFlowRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // ─── Derived states ───
  const isListeningNow = micActive && !isProcessing && !isTyping;
  const isSpeakingNow = isListeningNow && interimText.length > 0;

  return (
    <>
      {/* ═══ TRIGGER BUTTON ═══ */}
      <button
        onClick={handleOpen}
        className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center backdrop-blur-xl shadow-lg hover:shadow-xl transition-all active:scale-90 border border-white/20 md:w-14 md:h-14"
        aria-label={t('dashboard.openAssistant')}
      >
        <Brain className="w-6 h-6 text-white" />
        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white/50" />
        </span>
      </button>

      {/* ═══ AI PANEL ═══ */}
      {isOpen && (
        <>
          {/* Backdrop — static, no opening animation */}
          <div
            className="fixed inset-0 z-[60] bg-slate-950"
            onClick={handleClose}
          />

          {/* Panel — static, no slide-up animation */}
          <div className="fixed inset-0 z-[61] flex flex-col md:items-center">
            <div className="flex-1 relative flex flex-col overflow-hidden">
              {/* Base bg with smooth dark gradient so the top animation isn't cut or transparent */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900" />

              {/* ── Close button ── */}
              <div className="relative z-20 flex justify-end px-5" style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 16px))" }}>
                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
                  aria-label={t('dashboard.close')}
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {/* ── Central area: ONLY Orb (no additional cards/messages) ── */}
              <div className="relative flex-1 flex flex-col items-center px-4 md:px-8 overflow-hidden z-10">
                <div className="flex-shrink-0 pt-6 pb-3 md:pt-8">
                  <VoiceOrb state={orbState} />
                </div>
              </div>

              {/* ── Bottom: Mic toggle ── */}
                <div
                  className="relative flex items-center justify-center px-6 py-5 z-10"
                  style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 20px))" }}
                >
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="relative">
                      {/* Pulsating rings when listening */}
                      {isListeningNow && (
                        <>
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-cyan-400/50"
                            animate={{ scale: [1, 1.5, 1.5], opacity: [0.6, 0, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                          />
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
                            animate={{ scale: [1, 1.8, 1.8], opacity: [0.4, 0, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                          />
                        </>
                      )}

                      {/* Intense glow when user is actively speaking */}
                      {isSpeakingNow && (
                        <motion.div
                          className="absolute inset-[-10px] rounded-full bg-cyan-400/15"
                          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.15, 0.5] }}
                          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                        />
                      )}

                      <button
                        onClick={toggleMic}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                          micActive
                            ? "bg-cyan-500/25 border-2 border-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.4)]"
                            : "bg-white/10 border-2 border-white/15 hover:bg-white/15"
                        }`}
                        aria-label={micActive ? t('dashboard.micOff') : t('dashboard.micOn')}
                      >
                        {micActive ? (
                          <motion.div
                            animate={
                              isSpeakingNow
                                ? { scale: [1, 1.35, 1.1, 1.3, 1] }
                                : { scale: [1, 1.15, 1] }
                            }
                            transition={
                              isSpeakingNow
                                ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
                                : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                            }
                          >
                            <Mic className="w-9 h-9 text-cyan-400" />
                          </motion.div>
                        ) : (
                          <MicOff className="w-8 h-8 text-white/50" />
                        )}
                      </button>
                    </div>

                    {/* Status label */}
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={statusLabel}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className={`text-xs tracking-wide ${micActive ? "text-cyan-300/60" : "text-white/40"}`}
                        style={{ fontWeight: 500 }}
                      >
                        {statusLabel}
                      </motion.span>
                    </AnimatePresence>

                    {/* No SpeechAPI fallback hint */}
                    {!hasSpeechAPI && (
                      <p className="text-xs text-amber-400/60 text-center max-w-[200px]">
                        {t('dashboard.browserNoSpeech')}
                      </p>
                    )}
                  </div>
                </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}