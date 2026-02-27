/**
 * ====================================================================
 * AI Parser Service — v3 (Intelligent multilingual PDF parser)
 * ====================================================================
 * Parses uploaded documents (PDF, Word, Image, Text) with intelligent
 * heuristic detection — NO strict regex, handles broken PDF lines.
 *
 * FONTOS SZABALY:
 *   Az AI parser a dokumentumbol kinyert ertekeket SZO SZERINT veszi,
 *   NEM atlagol, NEM becsul. Ha a PDF azt irja "suly: 78 kg", akkor
 *   78 kg kerul az adatbazisba, nem egy kerekitett/becsult ertek.
 *
 * v3 IMPROVEMENTS:
 *   - Trilingual detection: HU + RO + EN
 *   - Fuzzy/heuristic matching (not strict regex)
 *   - Broken PDF line healing
 *   - Structured JSON output (week→day→meal→foods)
 *   - Explicit error when no data found (NO hardcoded fallback)
 *
 * PIPELINE:
 *   1. Input: File (PDF/Text) → text extraction
 *   2. Broken line healing + structural marker splitting
 *   3. Szemelyes adatok kinyerese (suly, magassag, BMI, kor, stb.)
 *   4. Etrend struktura felismeres (het/nap/etkezes/osszetevok)
 *   5. Meresek kinyerese (derek, mellkas, csipo, stb.)
 *   6. Edzesterv felismeres
 *   7. Allergiak, preferenciak, kaloria cel kinyerese
 *   8. Unified output → DB population
 *
 * PDF FELDOLGOZAS:
 *   pdfjs-dist v5 client-side text extraction.
 *   Nem kell backend OCR szovegalapú PDF-ekhez.
 */

// Worker URL is resolved lazily at runtime via CDN — the ?url Vite import
// doesn't work in sandboxed environments (Figma Make).

import type {
  AIParseResult,
  AIParsedNutritionPlan,
  AIParsedDay,
  AIParsedMeal,
  AIParsedMeasurement,
  AIParsedTrainingDay,
  MealType,
  ActivityLevel,
  GoalType,
  Gender,
} from '../models';
import { generateId, nowISO } from '../db';
import * as FoodCatalogService from './FoodCatalogService';
import { foodKnowledge } from '../../data/aiFoodKnowledge';
import { foodDatabase } from '../../data/mealData';

// ═══════════════════════════════════════════════════════════════
// EXPORTED TYPES
// ═══════════════════════════════════════════════════════════════

export interface AIParsedUserProfile {
  name?: string;
  age?: number;
  weight?: number;          // kg
  height?: number;          // cm
  bmi?: number;
  gender?: Gender;
  blood_pressure?: string;  // "120/80"
  activity_level?: ActivityLevel;
  goal?: GoalType;
  allergies?: string[];
  dietary_preferences?: string[];
  calorie_target?: number;
}

export interface AIParsedDocument {
  userProfile: AIParsedUserProfile;
  nutritionPlan: AIParsedNutritionPlan | null;
  measurements: AIParsedMeasurement[];
  trainingDays: AIParsedTrainingDay[];
  warnings: string[];
  confidence: number;
  rawText: string;
}

/**
 * Structured JSON output for meal plans — v4 clean food extraction.
 * `calories` is auto-filled from the food knowledge base / database when a match is found.
 * `null` means no database match — the food is unknown or unrecognized.
 */
export interface StructuredMealPlanFood {
  name: string;
  quantity: string;
  calories: number | null;
}

export interface StructuredDayPlan {
  breakfast: StructuredMealPlanFood[];
  lunch: StructuredMealPlanFood[];
  dinner: StructuredMealPlanFood[];
  snack?: StructuredMealPlanFood[];
  post_workout?: StructuredMealPlanFood[];
}

export type StructuredMealPlanJSON = Record<string, Record<string, StructuredDayPlan>>;

// ═══════════════════════════════════════════════════════════════
// TEXT NORMALIZATION
// ═══════════════════════════════════════════════════════════════

/** Strip Hungarian diacritics for pattern matching (keeps original for display) */
function stripAccents(s: string): string {
  return s
    .replace(/[áÁ]/g, 'a')
    .replace(/[éÉ]/g, 'e')
    .replace(/[íÍ]/g, 'i')
    .replace(/[óÓöÖőŐ]/g, 'o')
    .replace(/[úÚüÜűŰ]/g, 'u');
}

/**
 * Strip Romanian + Hungarian diacritics for fuzzy matching.
 * ă→a, â→a, î→i, ș/ş→s, ț/ţ→t, plus Hungarian via stripAccents.
 */
function stripAllDiacritics(s: string): string {
  return stripAccents(s)
    .replace(/[ăĂâÂ]/g, 'a')
    .replace(/[îÎ]/g, 'i')
    .replace(/[șȘşŞ]/g, 's')
    .replace(/[țȚţŢ]/g, 't');
}

function normalizeText(s: string): string {
  return stripAccents(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Full normalization including Romanian diacritics */
function normalizeTextFull(s: string): string {
  return stripAllDiacritics(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

// ═══════════════════════════════════════════════════════════════
// TEXT SANITIZATION (v4 — anti-corruption pipeline)
// ═══════════════════════════════════════════════════════════════

/**
 * Deep sanitization of extracted PDF text.
 * Removes broken encodings, random symbols, corrupted characters,
 * and normalizes whitespace. Must be called BEFORE any parsing.
 */
function sanitizeExtractedText(raw: string): string {
  let text = raw;

  // ── Step 1: Remove BOM, zero-width chars, control chars ──
  text = text.replace(/[\uFEFF\u200B\u200C\u200D\u2060\uFFFD]/g, '');
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // ── Step 2: Fix common mojibake / broken UTF-8 sequences ──
  const mojibakeMap: [RegExp, string][] = [
    [/Ã¡/g, 'á'], [/Ã©/g, 'é'], [/Ã­/g, 'í'], [/Ã³/g, 'ó'],
    [/Ã¶/g, 'ö'], [/Å'/g, 'ő'], [/Ãº/g, 'ú'], [/Ã¼/g, 'ü'],
    [/Å±/g, 'ű'], [/Ã¤/g, 'ä'], [/Ã§/g, 'ç'],
    [/Ä[ăa]/g, 'ă'], [/Ã¢/g, 'â'], [/Ã®/g, 'î'],
    [/È[șs]/g, 'ș'], [/È[țt]/g, 'ț'],
    [/â€"/g, '–'], [/â€"/g, '—'], [/â€™/g, "'"],
    [/â€œ/g, '"'], [/â€[^\w]/g, '"'],
  ];
  for (const [pattern, replacement] of mojibakeMap) {
    text = text.replace(pattern, replacement);
  }

  // ── Step 3: Replace PDF ligatures and special chars ──
  text = text.replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/ﬀ/g, 'ff');
  text = text.replace(/…/g, '...').replace(/•/g, '-');

  // ── Step 4: Remove runs of random symbols / corrupted chars ──
  // Pattern: 3+ consecutive non-word, non-space, non-punctuation chars
  // These are garbage from broken PDF encoding
  text = text.replace(/[^\w\sáéíóöőúüűÁÉÍÓÖŐÚÜŰăĂâÂîÎșȘțȚ.,;:!?()%+\-–—/\\'"#@\d\n\r]{3,}/g, ' ');

  // ── Step 5: Remove isolated single garbage chars between spaces ──
  // e.g., "  } " or " $ " appearing mid-sentence
  text = text.replace(/\s[^\w\sáéíóöőúüűăâîșț.,;:!?()%+\-–\d]\s/g, ' ');

  // ── Step 6: Collapse duplicate spaces and normalize whitespace ──
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  // ── Step 7: Remove lines that are >60% non-letter characters ──
  // These are corrupted lines that will produce garbage food names
  const lines = text.split('\n');
  const cleanLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return true; // keep blank lines
    if (trimmed.length < 3) return false;  // too short to be useful
    const letterCount = (trimmed.match(/[a-záéíóöőúüűăâîșțA-ZÁÉÍÓÖŐÚÜŰĂÂÎȘȚ]/g) || []).length;
    const ratio = letterCount / trimmed.length;
    return ratio >= 0.4; // at least 40% real letters
  });

  text = cleanLines.join('\n');

  console.log(`[AIParser v4] Sanitized text: ${raw.length} → ${text.length} chars (removed ${raw.length - text.length} garbage chars)`);
  return text;
}

/**
 * Validate that a food name is clean and human-readable.
 * Rejects names with corrupted characters, random symbols, or garbage.
 */
function isCleanFoodName(name: string): boolean {
  if (!name || name.length < 2) return false;
  if (name.length > 120) return false;

  // Must contain at least one letter
  if (!/[a-záéíóöőúüűăâîșțA-ZÁÉÍÓÖŐÚÜŰĂÂÎȘȚ]/.test(name)) return false;

  // Count real letters vs total length
  const letterCount = (name.match(/[a-záéíóöőúüűăâîșțA-ZÁÉÍÓÖŐÚÜŰĂÂÎȘȚ]/g) || []).length;
  const ratio = letterCount / name.length;
  if (ratio < 0.5) return false; // Less than 50% letters = corrupted

  // Reject if contains obviously corrupted patterns:
  // 3+ consecutive consonants that aren't valid in HU/RO/EN
  const validClusters = /str|scr|spr|spl|chr|thr|sch|nts|ncs|gy|ly|ny|ty|sz|zs|cs|dz|dzs/i;
  const consonantRuns = name.match(/[bcdfghjklmnpqrstvwxyz]{4,}/gi);
  if (consonantRuns) {
    for (const run of consonantRuns) {
      if (!validClusters.test(run)) return false;
    }
  }

  // Reject names that are just numbers/units
  if (/^\d+\s*(g|kg|ml|dl|db|ek|tk)$/i.test(name)) return false;

  // Reject if starts with symbols (but allow parentheses — valid in food lists)
  if (/^[^a-záéíóöőúüűăâîșțA-ZÁÉÍÓÖŐÚÜŰĂÂÎȘȚ\d(]/.test(name)) return false;

  // Reject if it's ONLY a number (bare calorie value with no food name)
  if (/^\d+$/.test(name)) return false;

  return true;
}

/**
 * Clean a food name for display: trim excess whitespace,
 * remove trailing/leading punctuation, capitalize first letter.
 */
function cleanFoodName(raw: string): string {
  let name = raw.trim();
  // Remove leading/trailing dashes, bullets, dots, colons
  name = name.replace(/^[-•–—:.,;]+\s*/, '').replace(/\s*[-•–—:.,;]+$/, '');
  // Remove parenthetical noise like "(opcionális)" unless it's useful
  name = name.replace(/\([\s]*\)/g, '');
  // Strip wrapping parentheses if the whole name is in parens: "(tojás pulykamell sonka)" → "tojás pulykamell sonka"
  if (/^\(([^)]+)\)$/.test(name)) {
    name = name.slice(1, -1).trim();
  }
  // Strip trailing bare numbers that are likely calorie values glued to quantities
  // e.g. "1 banán 225" → "1 banán", "csirkemell 520" → "csirkemell"
  name = name.replace(/\s+\d{2,4}$/, '');
  // Collapse internal spaces
  name = name.replace(/\s+/g, ' ').trim();
  // Capitalize first letter
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name;
}

// ═══════════════════════════════════════════════════════════════
// FUZZY MATCHING UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Fuzzy match: does `text` contain something close to `keyword`?
 * Uses stripped diacritics + substring matching + 1-char tolerance
 * for words >= 4 chars. NOT strict regex.
 */
function fuzzyContains(text: string, keyword: string): boolean {
  const tn = stripAllDiacritics(text).toLowerCase();
  const kn = stripAllDiacritics(keyword).toLowerCase();
  // Direct substring match
  if (tn.includes(kn)) return true;
  // 1-char edit tolerance for longer keywords
  if (kn.length >= 4) {
    for (let i = 0; i <= tn.length - kn.length; i++) {
      const slice = tn.substring(i, i + kn.length);
      let diff = 0;
      for (let j = 0; j < kn.length; j++) {
        if (slice[j] !== kn[j]) diff++;
      }
      if (diff <= 1) return true;
    }
  }
  return false;
}

/**
 * Word-boundary aware check: does the line contain the keyword
 * as a standalone word (or at the start of a line)?
 */
function containsWord(line: string, keyword: string): boolean {
  const norm = stripAllDiacritics(line).toLowerCase();
  const kw = stripAllDiacritics(keyword).toLowerCase();
  const re = new RegExp(`(?:^|\\s|[:\\-–,;])${kw}(?:\\s|[:\\-–,;.]|$)`, 'i');
  return re.test(norm) || norm.startsWith(kw);
}

// ═══════════════════════════════════════════════════════════════
// PDF TEXT EXTRACTION (pdfjs-dist v5)
// ═══════════════════════════════════════════════════════════════

async function extractTextFromPDF(file: File): Promise<string> {
  // Strategy 1: pdfjs-dist with CDN worker
  try {
    const pdfjsLib = await import('pdfjs-dist');

    // Use CDN worker — the ?url Vite import doesn't work in sandboxed environments
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // CRITICAL FIX: Preserve line breaks using hasEOL + Y-position tracking
      let lastY: number | null = null;
      const lineChunks: string[] = [];

      for (const item of textContent.items) {
        if (!('str' in item)) continue;
        const textItem = item as any;
        const str = textItem.str as string;
        if (!str) continue;

        // Get Y position from transform matrix [scaleX, skewX, skewY, scaleY, x, y]
        const y = textItem.transform ? textItem.transform[5] : null;

        // Detect line break: Y position changed significantly OR hasEOL flag set
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
          lineChunks.push('\n');
        } else if (textItem.hasEOL) {
          lineChunks.push('\n');
        } else if (lineChunks.length > 0) {
          // Same line — add space separator if needed
          const last = lineChunks[lineChunks.length - 1];
          if (last && !last.endsWith(' ') && !last.endsWith('\n') && !str.startsWith(' ')) {
            lineChunks.push(' ');
          }
        }

        lineChunks.push(str);
        if (y !== null) lastY = y;
      }

      pages.push(lineChunks.join(''));
    }

    const fullText = pages.join('\n\n');

    // If we got meaningful text, sanitize and return
    if (fullText.trim().length >= 10) {
      console.log(`[AIParser] PDF text extracted: ${fullText.trim().length} chars from ${pdf.numPages} pages`);
      const sanitized = sanitizeExtractedText(fullText);
      console.log(`[AIParser] First 500 chars (sanitized):\n${sanitized.substring(0, 500)}`);
      return sanitized;
    }

    // pdfjs returned empty/near-empty text — likely scanned/image PDF
    console.warn(`[AIParser] PDF.js returned only ${fullText.trim().length} chars — possibly a scanned/image PDF`);
  } catch (err) {
    console.warn('[AIParser] PDF.js extraction failed:', err);
  }

  // Strategy 2: CDN worker fallback (in case local worker URL failed)
  try {
    const pdfjsLib = await import('pdfjs-dist');

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Same line-break-aware extraction as Strategy 1
      let lastY: number | null = null;
      const lineChunks: string[] = [];

      for (const item of textContent.items) {
        if (!('str' in item)) continue;
        const textItem = item as any;
        const str = textItem.str as string;
        if (!str) continue;

        const y = textItem.transform ? textItem.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
          lineChunks.push('\n');
        } else if (textItem.hasEOL) {
          lineChunks.push('\n');
        } else if (lineChunks.length > 0) {
          const last = lineChunks[lineChunks.length - 1];
          if (last && !last.endsWith(' ') && !last.endsWith('\n') && !str.startsWith(' ')) {
            lineChunks.push(' ');
          }
        }

        lineChunks.push(str);
        if (y !== null) lastY = y;
      }

      pages.push(lineChunks.join(''));
    }

    const fullText = pages.join('\n\n');
    if (fullText.trim().length >= 10) {
      console.log(`[AIParser] PDF text extracted (CDN worker): ${fullText.trim().length} chars`);
      return sanitizeExtractedText(fullText);
    }
  } catch (err2) {
    console.warn('[AIParser] PDF.js CDN worker fallback failed:', err2);
  }

  // Strategy 3: Raw text reading (binary PDFs may contain embedded text streams)
  try {
    const text = await file.text();
    // Filter out binary garbage — keep only printable chars
    const cleaned = text.replace(/[^\x20-\x7E\xC0-\xFF\n\r\tÁáÉéÍíÓóÖöŐőÚúÜüŰűĂăÂâÎîȘșȚț]/g, ' ');
    if (cleaned.replace(/\s/g, '').length > 50) {
      console.log(`[AIParser] Raw text fallback: ${cleaned.replace(/\s/g, '').length} printable chars`);
      return sanitizeExtractedText(cleaned);
    }
  } catch { /* ignore */ }

  throw new Error(
    'A fajlbol nem sikerult szoveget kinyerni. A PDF lehet szkennelt/kepes formatumu. Hasznald a "Szoveg beillesztese" opciot.'
  );
}

// ═══════════════════════════════════════════════════════════════
// PERSONAL DATA EXTRACTION PATTERNS
// ═══════════════════════════════════════════════════════════════

function extractPersonalData(rawText: string): AIParsedUserProfile {
  const text = normalizeText(rawText);
  const original = rawText; // Keep original for exact value extraction
  const profile: AIParsedUserProfile = {};

  // ── Name ──────────────────────────────────────────────────
  const namePatterns = [
    /(?:nev|name|paciens|kliens|ugyfelt?|nume|client)\s*[:=\-–]\s*([A-ZÁÉÍÓÖŐÚÜŰĂÂÎȘȚ][a-záéíóöőúüűăâîșț]+(?:\s+[A-ZÁÉÍÓÖŐÚÜŰĂÂÎȘȚ][a-záéíóöőúüűăâîșț]+)*)/,
    /(?:kedves|tisztelt|draga?|stimate?)\s+([A-ZÁÉÍÓÖŐÚÜŰĂÂÎȘȚ][a-záéíóöőúüűăâîșț]+(?:\s+[A-ZÁÉÍÓÖŐÚÜŰĂÂÎȘȚ][a-záéíóöőúüűăâîșț]+)*)/,
  ];
  for (const pattern of namePatterns) {
    const match = original.match(pattern);
    if (match) {
      profile.name = match[1].trim();
      break;
    }
  }

  // ── Weight (kg) ───────────────────────────────────────────
  const weightPatterns = [
    /(?:test)?suly\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*(?:kg)?/i,
    /(?:weight|greutate)\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*(?:kg)?/i,
    /(\d+[.,]?\d*)\s*kg\s*(?:testsuly|suly|test\s*tomeg|greutate)/i,
    /aktualis\s+suly\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
    /jelenlegi\s+suly\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
    /suly\s*[:=]?\s*(\d+[.,]?\d*)\s*kg/i,
    /greutate\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*kg/i,
  ];
  for (const pattern of weightPatterns) {
    const match = text.match(pattern);
    if (match) {
      const val = parseFloat(match[1].replace(',', '.'));
      if (val > 20 && val < 300) { profile.weight = val; break; }
    }
  }

  // ── Height (cm) ───────────────────────────────────────────
  const heightPatterns = [
    /(?:magassag|height|inaltime)\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*(?:cm|m)?/i,
    /(\d+[.,]?\d*)\s*(?:cm|m)\s*(?:magas|inaltime)/i,
    /magassag\s*[:=]?\s*(\d+[.,]?\d*)/i,
  ];
  for (const pattern of heightPatterns) {
    const match = text.match(pattern);
    if (match) {
      let val = parseFloat(match[1].replace(',', '.'));
      // Convert meters to cm
      if (val < 3) val = val * 100;
      if (val > 100 && val < 250) { profile.height = val; break; }
    }
  }

  // ── BMI ───────────────────────────────────────────────────
  const bmiPatterns = [
    /bmi\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
    /testtomeg\s*index\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
    /body\s*mass\s*index\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
    /indice\s*de\s*masa\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
  ];
  for (const pattern of bmiPatterns) {
    const match = text.match(pattern);
    if (match) {
      const val = parseFloat(match[1].replace(',', '.'));
      if (val > 10 && val < 60) { profile.bmi = val; break; }
    }
  }

  // ── Age ───────────────────────────────────────────────────
  const agePatterns = [
    /(?:kor|eletkor|age|varsta)\s*[:=\-–]?\s*(\d+)\s*(?:ev|eves|ani)?/i,
    /(\d+)\s*(?:eves|eve|ev(?:es)?)\b/i,
    /(\d+)\s*(?:ani|de\s*ani)\b/i,
    /szuletesi?\s*(?:datum|ev|ido)\s*[:=\-–]?\s*(\d{4})/i,
  ];
  for (const pattern of agePatterns) {
    const match = text.match(pattern);
    if (match) {
      let val = parseInt(match[1]);
      // If it looks like a birth year, calculate age
      if (val > 1900 && val < 2020) {
        val = new Date().getFullYear() - val;
      }
      if (val > 0 && val < 120) { profile.age = val; break; }
    }
  }

  // ── Gender ────────────────────────────────────────────────
  const genderPatterns = [
    { pattern: /(?:nem|gender|sex)\s*[:=\-–]?\s*(?:ferfi|male|masculin|barbat)/i, value: 'male' as Gender },
    { pattern: /(?:nem|gender|sex)\s*[:=\-–]?\s*(?:no|not?i|female|feminin|femeie)/i, value: 'female' as Gender },
    { pattern: /\b(?:ferfi|male|barbat|masculin)\b/i, value: 'male' as Gender },
    { pattern: /\b(?:no(?:i)?|holgy|female|femeie|feminin)\b/i, value: 'female' as Gender },
  ];
  for (const { pattern, value } of genderPatterns) {
    if (pattern.test(text)) {
      profile.gender = value;
      break;
    }
  }

  // ── Blood Pressure ────────────────────────────────────────
  const bpPatterns = [
    /(?:vernyomas|blood\s*pressure|rr|bp|tensiune)\s*[:=\-–]?\s*(\d{2,3})\s*[/\\]\s*(\d{2,3})/i,
    /(\d{2,3})\s*[/\\]\s*(\d{2,3})\s*(?:hgmm|mmhg)/i,
  ];
  for (const pattern of bpPatterns) {
    const match = text.match(pattern);
    if (match) {
      const sys = parseInt(match[1]);
      const dia = parseInt(match[2]);
      if (sys > 60 && sys < 250 && dia > 30 && dia < 150) {
        profile.blood_pressure = `${sys}/${dia}`;
        break;
      }
    }
  }

  // ── Activity Level ────────────────────────────────────────
  const activityKeywords: Array<{ keywords: RegExp; level: ActivityLevel }> = [
    { keywords: /(?:ulno|irodai|sedentary|inaktiv|mozgasszegeny|sedentar)/i, level: 'sedentary' },
    { keywords: /(?:enyhena?|konnyen|kissea?|lightly|usor)\s*(?:aktiv|mozgo|activ)/i, level: 'lightly_active' },
    { keywords: /(?:mersekelete?n|kozepes(?:en)?|moderately|moderat)\s*(?:aktiv|mozgo|activ)/i, level: 'moderately_active' },
    { keywords: /(?:nagyo?n|intenziven|very|foarte)\s*(?:aktiv|mozgo|activ)/i, level: 'very_active' },
    { keywords: /(?:extrem(?:en)?|rendkivul|extremely)\s*(?:aktiv|mozgo|activ)/i, level: 'extremely_active' },
    // Simple keyword fallbacks
    { keywords: /heti\s*[45]\s*(?:alkalom|edzes)/i, level: 'very_active' },
    { keywords: /heti\s*[23]\s*(?:alkalom|edzes)/i, level: 'moderately_active' },
    { keywords: /heti\s*1\s*(?:alkalom|edzes)/i, level: 'lightly_active' },
    { keywords: /naponta\s*(?:edz|sportol)/i, level: 'extremely_active' },
  ];
  for (const { keywords, level } of activityKeywords) {
    if (keywords.test(text)) {
      profile.activity_level = level;
      break;
    }
  }

  // ── Goal ──────────────────────────────────────────────────
  const goalKeywords: Array<{ keywords: RegExp; goal: GoalType }> = [
    { keywords: /(?:fogyas|sulycsokken|testsuly\s*csokkent|weight\s*loss|deficit|slabire|pierdere)/i, goal: 'weight_loss' },
    { keywords: /(?:izom(?:epites|noves|tomeg)|muscle|tomeges|bulk|masa\s*musculara)/i, goal: 'muscle_gain' },
    { keywords: /(?:szinttartas|fenntartas|karbantartas|maintenance|egyensuly|mentinere)/i, goal: 'maintenance' },
  ];
  for (const { keywords, goal } of goalKeywords) {
    if (keywords.test(text)) {
      profile.goal = goal;
      break;
    }
  }

  // ── Allergies ─────────────────────────────────────────────
  const allergySection = text.match(
    /(?:allergiak?|intoleranc|erzekenyseg|allergi(?:es)?|sensitivity|alergii?)\s*[:=\-–]?\s*([^\n.]{3,100})/i
  );
  if (allergySection) {
    profile.allergies = allergySection[1]
      .split(/[,;]/)
      .map(a => a.trim())
      .filter(a => a.length > 1 && a.length < 50);
  }
  // Also catch specific allergen mentions
  if (!profile.allergies || profile.allergies.length === 0) {
    const detectedAllergies: string[] = [];
    if (/laktoz(?:mentes|erzekeny|intoleran)|fara\s*lactoza/i.test(text)) detectedAllergies.push('Laktoze');
    if (/gluten(?:mentes|erzekeny|intoleran)|fara\s*gluten/i.test(text)) detectedAllergies.push('Gluten');
    if (/tejfeherje/i.test(text)) detectedAllergies.push('Tejfeherje');
    if (/tojasallergia|tojas\s*erzekeny/i.test(text)) detectedAllergies.push('Tojas');
    if (/mogyoro(?:allergia)?|arahide/i.test(text)) detectedAllergies.push('Mogyoro');
    if (/szoja/i.test(text) && /allergi|erzekeny|mentes/i.test(text)) detectedAllergies.push('Szoja');
    if (detectedAllergies.length > 0) profile.allergies = detectedAllergies;
  }

  // ── Dietary Preferences ───────────────────────────────────
  const prefSection = text.match(
    /(?:etrendi?\s*(?:preferencia|stilus|jelleg)|dieta\s*(?:tipusa?|jellege)|etkezesi?\s*(?:szokasa?|forma)|regim\s*alimentar)\s*[:=\-–]?\s*([^\n.]{3,100})/i
  );
  if (prefSection) {
    profile.dietary_preferences = prefSection[1]
      .split(/[,;]/)
      .map(p => p.trim())
      .filter(p => p.length > 1 && p.length < 50);
  }
  if (!profile.dietary_preferences || profile.dietary_preferences.length === 0) {
    const detectedPrefs: string[] = [];
    if (/vegetarianus|vegetarian/i.test(text)) detectedPrefs.push('Vegetarian');
    if (/vegan/i.test(text)) detectedPrefs.push('Vegan');
    if (/keto(?:gen)?/i.test(text)) detectedPrefs.push('Ketogen');
    if (/paleo/i.test(text)) detectedPrefs.push('Paleo');
    if (/mediterran/i.test(text)) detectedPrefs.push('Mediterran');
    if (/feherjedus|protein(?:dus|gazdag)/i.test(text)) detectedPrefs.push('Feherjedus');
    if (/szenhidrat\s*szegeny|low\s*carb/i.test(text)) detectedPrefs.push('Low carb');
    if (/zsirszegeny|low\s*fat/i.test(text)) detectedPrefs.push('Zsirszegeny');
    if (detectedPrefs.length > 0) profile.dietary_preferences = detectedPrefs;
  }

  // ── Calorie Target ────────────────────────────────────────
  const calorieTargetPatterns = [
    /(?:napi\s*)?kaloria\s*(?:cel|szukseglet|igeny|target|limit)\s*[:=\-–]?\s*(\d{3,5})\s*(?:kcal)?/i,
    /(?:ajanlott|tervezett|cel)\s*(?:napi\s*)?(?:kaloria|energi)\s*[:=\-–]?\s*(\d{3,5})/i,
    /(\d{3,5})\s*kcal\s*(?:napi|naponta|\/nap|pe\s*zi|zilnic)/i,
    /(?:tdee|bmr|alapanyagcsere)\s*[:=\-–]?\s*(\d{3,5})/i,
    /ossz(?:es)?\s*(?:napi\s*)?kaloria\s*[:=\-–]?\s*(\d{3,5})/i,
    /(?:total|calorii)\s*[:=\-–]?\s*(\d{3,5})\s*(?:kcal|calorii)/i,
  ];
  for (const pattern of calorieTargetPatterns) {
    const match = text.match(pattern);
    if (match) {
      const val = parseInt(match[1]);
      if (val > 500 && val < 10000) { profile.calorie_target = val; break; }
    }
  }

  // ── Compute BMI if we have weight and height but no BMI ──
  if (!profile.bmi && profile.weight && profile.height) {
    const h = profile.height / 100;
    profile.bmi = Math.round((profile.weight / (h * h)) * 10) / 10;
  }

  return profile;
}

// ══════════════��════════════════════════════════════════════════
// MEASUREMENT EXTRACTION
// ═══════════════════════════════════════════════════════════════

const MEASUREMENT_PATTERNS: Record<string, RegExp[]> = {
  weight: [
    /(?:test)?suly\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*(?:kg)?/i,
    /(\d+[.,]?\d*)\s*kg\s*(?:testsuly|suly|greutate)/i,
  ],
  body_fat: [
    /(?:testzsir|zsir\s*(?:szazalek|%)|body\s*fat|grasime)\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*%?/i,
    /zsir(?:arany|tartalom)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
  ],
  waist: [
    /(?:derek(?:bose?g)?|has(?:korf?ogat)?|waist|talie)\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*(?:cm)?/i,
  ],
  chest: [
    /(?:mellkas(?:bose?g)?|chest|torzs|piept)\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*(?:cm)?/i,
  ],
  arm: [
    /(?:kar(?:merete?)?|felkar|bicepsz|arm|brat)\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*(?:cm)?/i,
  ],
  hip: [
    /(?:csipo(?:bose?g)?|hip|fenekkerulet|sold)\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*(?:cm)?/i,
  ],
  thigh: [
    /(?:comb(?:merete?)?|thigh|coapse)\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*(?:cm)?/i,
  ],
  neck: [
    /(?:nyak(?:merete?)?|neck|gat)\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*(?:cm)?/i,
  ],
};

export function parseMeasurementsText(rawText: string): AIParsedMeasurement[] {
  const text = normalizeText(rawText);
  const measurement: AIParsedMeasurement = {
    date: new Date().toISOString().split('T')[0],
    notes: 'PDF-bol kinyerve',
  };

  for (const [key, patterns] of Object.entries(MEASUREMENT_PATTERNS)) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        // Sanity checks
        if (key === 'weight' && (value < 20 || value > 300)) continue;
        if (key === 'body_fat' && (value < 1 || value > 60)) continue;
        if (['waist', 'chest', 'hip'].includes(key) && (value < 30 || value > 200)) continue;
        if (['arm', 'thigh', 'neck'].includes(key) && (value < 10 || value > 100)) continue;
        (measurement as any)[key] = value;
        break;
      }
    }
  }

  const hasValues = Object.keys(measurement).some(
    k => k !== 'date' && k !== 'notes' && (measurement as any)[k] != null
  );

  return hasValues ? [measurement] : [];
}

// ═══════════════════════════════════════════════════════════════
// NUTRITION PLAN PARSING — v3 (Trilingual, fuzzy heuristic)
// ═══════════════════════════════════════════════════════════════

// ── Week detection: HU + RO + EN ────────────────────────────

function detectWeekNumber(line: string): number | null {
  const n = stripAllDiacritics(line).toLowerCase();
  // RO: SAPTAMANA 1, Saptamana 2, SAPT. 3
  const roMatch = n.match(/sapt(?:amana|[.]?)?\s*(\d+)/) || n.match(/(\d+)\s*[.]?\s*sapt(?:amana)?/);
  if (roMatch) { const v = parseInt(roMatch[1]); if (v > 0 && v <= 12) return v; }
  // HU: 1. het, het 2
  const huMatch = n.match(/(\d+)\s*[.]\s*het/) || n.match(/het\s*(\d+)/);
  if (huMatch) { const v = parseInt(huMatch[1]); if (v > 0 && v <= 12) return v; }
  // EN: Week 1
  const enMatch = n.match(/week\s*(\d+)/);
  if (enMatch) { const v = parseInt(enMatch[1]); if (v > 0 && v <= 12) return v; }
  return null;
}

// ── Day detection: HU + RO + EN ─────────────────────────────

const DAY_NAME_MAP: Record<string, number> = {
  // Hungarian
  'hetfo': 1, 'hetfő': 1,
  'kedd': 2,
  'szerda': 3,
  'csutortok': 4, 'csütörtök': 4,
  'pentek': 5, 'péntek': 5,
  'szombat': 6,
  'vasarnap': 7, 'vasárnap': 7,
  // Romanian
  'luni': 1,
  'marti': 2, 'marți': 2, 'marţi': 2,
  'miercuri': 3,
  'joi': 4,
  'vineri': 5,
  'sambata': 6, 'sâmbătă': 6, 'sîmbătă': 6,
  'duminica': 7, 'duminică': 7,
  // English
  'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
  'friday': 5, 'saturday': 6, 'sunday': 7,
};

/** English day key for structured output */
const DAY_NUM_TO_KEY: Record<number, string> = {
  1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday',
  5: 'friday', 6: 'saturday', 7: 'sunday',
};

function detectDayFromLine(line: string): number | null {
  const stripped = stripAllDiacritics(line).toLowerCase();

  // Exact token / word-boundary match first (most reliable)
  for (const [name, num] of Object.entries(DAY_NAME_MAP)) {
    const norm = stripAllDiacritics(name).toLowerCase();
    if (containsWord(stripped, norm)) return num;
  }

  // Fuzzy match for mangled PDF text (only longer names to avoid false positives)
  for (const [name, num] of Object.entries(DAY_NAME_MAP)) {
    if (name.length >= 5 && fuzzyContains(stripped, name)) return num;
  }

  // Numbered day: "1. nap", "Ziua 1", "Day 1"
  const numberedDay = stripped.match(/(?:(\d+)\s*[.]\s*(?:nap|zi(?:ua)?)|(?:nap|zi(?:ua)?|day)\s*(\d+))/);
  if (numberedDay) {
    const v = parseInt(numberedDay[1] || numberedDay[2]);
    if (v >= 1 && v <= 7) return v;
  }
  return null;
}

// ── Meal type detection: HU + RO + EN ───────────────────────

interface MealTypeEntry {
  type: MealType;
  keywords: string[];
}

const MEAL_TYPE_ENTRIES: MealTypeEntry[] = [
  {
    type: 'breakfast',
    keywords: [
      'mic dejun', 'micul dejun',       // RO
      'reggeli', 'breakfast',            // HU, EN
    ],
  },
  {
    type: 'lunch',
    keywords: [
      'pranz', 'prânz',                 // RO
      'ebed', 'ebéd', 'lunch',          // HU, EN
      'deli etkez',                      // HU alt
    ],
  },
  {
    type: 'dinner',
    keywords: [
      'cina', 'cină',                   // RO
      'vacsora', 'dinner',              // HU, EN
      'esti etkez',                      // HU alt
    ],
  },
  {
    type: 'snack',
    keywords: [
      'gustare', 'gustari',             // RO
      'snack', 'tizora', 'tízórai',     // EN, HU
      'uzsonna', 'nasi',               // HU
      'nassolás', 'nasolas',            // HU alt
    ],
  },
  {
    type: 'post_workout',
    keywords: [
      'edzes utan', 'edzés után',       // HU
      'post workout', 'post-workout',    // EN
      'dupa antrenament',               // RO
      'edzes utani', 'edzés utáni',     // HU adjective form
    ],
  },
];

function detectMealType(line: string): MealType | null {
  const stripped = stripAllDiacritics(line).toLowerCase().trim();
  for (const entry of MEAL_TYPE_ENTRIES) {
    for (const kw of entry.keywords) {
      const kwNorm = stripAllDiacritics(kw).toLowerCase();
      // Direct substring (handles "Mic dejun:" and similar)
      if (stripped.includes(kwNorm)) return entry.type;
      // Fuzzy for mangled PDF text
      if (kwNorm.length >= 5 && fuzzyContains(stripped, kwNorm)) return entry.type;
    }
  }
  return null;
}

function isMealHeader(text: string): boolean {
  return detectMealType(text) !== null;
}

// Keep backward compat — old callers still use extractMealType
function extractMealType(text: string): MealType {
  return detectMealType(text) || 'lunch';
}

// ═══════════════════════════════════════════════════════════════
// BROKEN LINE HEALING
// ═══════════════════════════════════════════════════════════════

/**
 * Heal broken PDF lines: rejoin fragments that were split mid-word or
 * mid-ingredient. Also normalizes whitespace.
 */
function healBrokenLines(rawLines: string[]): string[] {
  const healed: string[] = [];
  let buffer = '';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) {
      if (buffer) { healed.push(buffer); buffer = ''; }
      continue;
    }

    // Is this line a structural marker (week/day/meal header)?
    const isStructural =
      detectWeekNumber(line) !== null ||
      detectDayFromLine(line) !== null ||
      detectMealType(line) !== null;

    if (isStructural) {
      // Flush buffer first
      if (buffer) { healed.push(buffer); buffer = ''; }
      healed.push(line);
      continue;
    }

    // Heuristic: short fragments without quantity are likely broken
    const hasQuantity = /\d+\s*(?:g|kg|ml|dl|db|ek|tk|dkg|buc|lingura|lingurita|cana|felii|felie)/i.test(line);
    const isShortFragment = line.length < 25 && !hasQuantity && !/\d+\s*kcal/i.test(line);

    // A line ending with hyphen or a lowercase continuation of a short fragment
    const isContinuation =
      (buffer && buffer.endsWith('-')) ||
      (buffer && /^[a-záéíóöőúüűăâîșț]/.test(line) && isShortFragment);

    if (isContinuation && buffer) {
      // Join: remove trailing hyphen if present
      buffer = buffer.endsWith('-')
        ? buffer.slice(0, -1) + line
        : buffer + ' ' + line;
    } else {
      if (buffer) healed.push(buffer);
      buffer = line;
    }
  }
  if (buffer) healed.push(buffer);
  return healed;
}

// ═══════════════════════════════════════════════════════════════
// FOOD ITEM SPLITTING (v4 — "+" delimiter)
// ═══════════════════════════════════════════════════════════════

/**
 * Split a line containing multiple food items joined by "+".
 * Example: "Görög joghurt 250g + Dió 40g + Kiwi 1 db"
 * Returns individual food item strings, each trimmed.
 */
function splitFoodsByPlus(line: string): string[] {
  // Split by "+" that is surrounded by spaces (not inside words like "A+" grades)
  const parts = line.split(/\s*\+\s*/);
  return parts.map(p => p.trim()).filter(p => p.length > 0);
}

/**
 * Parse a single food item string into clean structured format.
 * Returns { name, quantity, calories: null } or null if corrupted.
 *
 * Handles formats:
 *   "Görög joghurt 3% 250g"
 *   "Dió 40g"
 *   "Kiwi 1 db"
 *   "250g csirkemell"
 *   "2 ek olívaolaj"
 */
function parseCleanFoodItem(raw: string): StructuredMealPlanFood | null {
  let text = raw.trim();
  if (!text) return null;

  // Remove leading bullet/dash markers
  text = text.replace(/^[-•–—]\s*/, '');

  // Handle "(quantity)calories" pattern — e.g. "(120g)225" or "(100g)520"
  // Strip calorie numbers glued directly after a parenthetical quantity
  text = text.replace(/\((\d+(?:[.,]\d+)?\s*(?:g|kg|ml|dl|db|dkg))\)(\d{2,4})\b/gi, '($1)');

  // Also strip standalone trailing calorie numbers not preceded by a unit
  // e.g. "1 banán (120g) 225" — the 225 is calories, not part of the food
  text = text.replace(/\)\s*(\d{2,4})\s*$/g, ')');

  // Strip bare trailing numbers if they look like calories (3-4 digits at end of line)
  text = text.replace(/\s+\d{3,4}\s*$/, '');

  // ── Extract quantity + unit ──
  // Pattern 1: number + unit at end or embedded: "joghurt 250g", "250g joghurt"
  const unitWords = 'g|kg|ml|l|dl|db|buc|ek|tk|dkg|szelet|kanál|kanal|szem|gerezd|csomag|csésze|csesze|fej|lingura|lingurita|cana|felie|felii|pachet|adag|pohár|pohar';
  const qtyRegex = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${unitWords})\\b`, 'i');
  const match = text.match(qtyRegex);

  let quantity = '';
  let foodName = text;

  if (match) {
    const num = match[1].replace(',', '.');
    const unit = match[2].toLowerCase();
    quantity = `${num}${unit === 'l' && parseFloat(num) < 10 ? 'l' : unit}`;
    // Remove the quantity from the name
    foodName = text.replace(match[0], '').trim();
  } else {
    // Try pattern: "1 db", "2 szelet" etc. (with space between num and unit)
    const spacedQty = text.match(new RegExp(`(\\d+)\\s+(${unitWords})\\b`, 'i'));
    if (spacedQty) {
      quantity = `${spacedQty[1]} ${spacedQty[2]}`;
      foodName = text.replace(spacedQty[0], '').trim();
    }
  }

  // Clean the food name
  foodName = cleanFoodName(foodName);

  // Validate: reject corrupted names
  if (!isCleanFoodName(foodName)) {
    console.warn(`[AIParser v4] Rejected corrupted food name: "${foodName}" (from: "${raw}")`);
    return null;
  }

  return {
    name: foodName,
    quantity: quantity || '',
    calories: null,
  };
}

// ═══════════════════════════════════════════════════════════════
// UNIT NORMALIZATION
// ═══════════════════════════════════════════════════════════════

function normalizeQuantityToGrams(value: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'kg': return value * 1000;
    case 'g': return value;
    case 'l': return value * 1000;
    case 'dl': return value * 100;
    case 'ml': return value;
    case 'db': case 'buc': return value * 50;
    case 'ek': case 'lingura': return value * 15;
    case 'tk': case 'lingurita': return value * 5;
    case 'csesze': case 'cana': return value * 240;
    case 'csepet': return value;
    case 'szelet': case 'felie': case 'felii': return value * 30;
    case 'kanál': case 'kanal': return value * 15;
    case 'szem': return value * 40;
    case 'gerezd': return value * 5;
    case 'csomag': case 'pachet': return value * 200;
    case 'fej': return value * 150;
    default: return value;
  }
}

function parseIngredientLine(line: string): {
  name: string;
  quantity_grams: number;
  unit: 'g' | 'ml' | 'db';
} {
  // Extended quantity patterns including Romanian units
  const qtyPatterns = [
    /([\d]+(?:[.,]\d+)?)\s*(g|kg|ml|l|dl|db|buc|ek|tk|szelet|kanal|szem|gerezd|csomag|csesze|fej|lingura|lingurita|cana|felie|felii|pachet)/i,
    /([\d]+(?:[.,]\d+)?)\s*(dkg)/i,
  ];

  for (const qPattern of qtyPatterns) {
    const match = line.match(qPattern);
    if (match) {
      const value = parseFloat(match[1].replace(',', '.'));
      let unit = match[2].toLowerCase();
      if (unit === 'dkg') {
        return {
          name: line.replace(match[0], '').replace(/[()]/g, '').trim() || line.trim(),
          quantity_grams: value * 10,
          unit: 'g',
        };
      }
      const grams = normalizeQuantityToGrams(value, unit);
      let normalizedUnit: 'g' | 'ml' | 'db' = 'g';
      if (['ml', 'l', 'dl'].includes(unit)) normalizedUnit = 'ml';
      if (['db', 'szem', 'buc'].includes(unit)) normalizedUnit = 'db';
      return {
        name: line.replace(match[0], '').replace(/[()]/g, '').trim() || line.trim(),
        quantity_grams: grams,
        unit: normalizedUnit,
      };
    }
  }

  return { name: line.trim(), quantity_grams: 100, unit: 'g' };
}

// ═══════════════════════════════════════════════════════════════
// FOOD MATCHING
// ═══════════════════════════════════════════════════════════════

async function matchFoodByName(name: string): Promise<string | undefined> {
  const results = await FoodCatalogService.searchFoods(name);
  return results.length > 0 ? results[0].id : undefined;
}

/**
 * Estimate nutritional values for an ingredient using multiple knowledge bases.
 * Falls back through: IndexedDB foods → foodKnowledge → foodDatabase → defaults.
 */
function estimateIngredientNutrition(ingredientName: string): {
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  category: string;
} {
  const normalized = normalizeText(ingredientName);
  const stripped = stripAccents(ingredientName.toLowerCase());

  // Strategy 1: Match against foodKnowledge (comprehensive Hungarian DB with real values)
  for (const item of foodKnowledge) {
    for (const alias of item.names) {
      const aliasNorm = normalizeText(alias);
      if (aliasNorm === normalized || normalized.includes(aliasNorm) || aliasNorm.includes(normalized)) {
        return {
          calories_per_100g: item.per100.calories,
          protein_per_100g: item.per100.protein,
          carbs_per_100g: item.per100.carbs,
          fat_per_100g: item.per100.fat,
          category: item.category,
        };
      }
    }
  }

  // Strategy 2: Fuzzy match against foodKnowledge (partial word match)
  for (const item of foodKnowledge) {
    const nameWords = normalized.split(/\s+/);
    for (const alias of item.names) {
      const aliasWords = normalizeText(alias).split(/\s+/);
      // If any significant word matches (>3 chars)
      const match = nameWords.some(w => w.length > 3 && aliasWords.some(aw => aw.includes(w) || w.includes(aw)));
      if (match) {
        return {
          calories_per_100g: item.per100.calories,
          protein_per_100g: item.per100.protein,
          carbs_per_100g: item.per100.carbs,
          fat_per_100g: item.per100.fat,
          category: item.category,
        };
      }
    }
  }

  // Strategy 3: Match against mealData foodDatabase (the 68 predefined system foods)
  for (const food of foodDatabase) {
    const foodNorm = normalizeText(food.name);
    if (foodNorm === normalized || normalized.includes(foodNorm) || foodNorm.includes(normalized)) {
      return {
        calories_per_100g: parseInt(food.calories) || 100,
        protein_per_100g: food.protein,
        carbs_per_100g: food.carbs,
        fat_per_100g: food.fat,
        category: food.category,
      };
    }
  }

  // Strategy 4: Fuzzy match against foodDatabase
  for (const food of foodDatabase) {
    const foodWords = normalizeText(food.name).split(/\s+/);
    const nameWords = normalized.split(/\s+/);
    const match = nameWords.some(w => w.length > 3 && foodWords.some(fw => fw.includes(w) || w.includes(fw)));
    if (match) {
      return {
        calories_per_100g: parseInt(food.calories) || 100,
        protein_per_100g: food.protein,
        carbs_per_100g: food.carbs,
        fat_per_100g: food.fat,
        category: food.category,
      };
    }
  }

  // Strategy 5: Category-based defaults (HU + RO common ingredient keywords)
  if (/csirke|pulyka|marha|sertes|hal|lazac|tonhal|kacsa|borju|pui|curcan|vita|porc|peste|somon|ton/i.test(stripped)) {
    return { calories_per_100g: 165, protein_per_100g: 25, carbs_per_100g: 0, fat_per_100g: 7, category: 'Hus & Hal' };
  }
  if (/tojas|tojás|ou|oua/i.test(stripped)) {
    return { calories_per_100g: 143, protein_per_100g: 13, carbs_per_100g: 1, fat_per_100g: 10, category: 'Tojas' };
  }
  if (/tej|joghurt|turó|túro|sajt|kefir|vaj|lapte|iaurt|branza|unt/i.test(stripped)) {
    return { calories_per_100g: 60, protein_per_100g: 5, carbs_per_100g: 5, fat_per_100g: 3, category: 'Tej & Tejtermek' };
  }
  if (/rizs|teszt|penne|spagetti|kenyer|kenyér|zab|zabpehely|hajdina|bulgur|kuszkusz|orez|paine|ovaz|fulgi/i.test(stripped)) {
    return { calories_per_100g: 130, protein_per_100g: 4, carbs_per_100g: 28, fat_per_100g: 1, category: 'Pekaru & Gabona' };
  }
  if (/olaj|oliva|kokusz|napraforgó|repce|ulei|masline|cocos|floarea/i.test(stripped)) {
    return { calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, category: 'Olaj & Zsir' };
  }
  if (/alma|banan|narancs|szolo|eper|malna|afonya|korte|szilva|cseresznye|dinnye|kivi|mango|avokado|mar|banana|portocala|struguri|capsuni|zmeura|afine|para|pruna|cirese|pepene|kiwi/i.test(stripped)) {
    return { calories_per_100g: 55, protein_per_100g: 1, carbs_per_100g: 13, fat_per_100g: 0.5, category: 'Gyumolcs' };
  }
  if (/salata|paprika|paradicsom|uborka|brokkoli|karfiol|spenat|spenot|repa|hagyma|fokhagyma|cukkini|padlizsan|salata|ardei|rosii|castraveti|broccoli|conopida|spanac|morcov|ceapa|usturoi|dovlecel|vinete/i.test(stripped)) {
    return { calories_per_100g: 25, protein_per_100g: 2, carbs_per_100g: 4, fat_per_100g: 0.3, category: 'Zoldseg' };
  }
  if (/bab|lencse|csicseriborsó|borsó|szója|fasole|linte|naut|mazare|soia/i.test(stripped)) {
    return { calories_per_100g: 120, protein_per_100g: 9, carbs_per_100g: 20, fat_per_100g: 0.5, category: 'Huvelyes & Mag' };
  }
  if (/dio|mandula|mogyor|foldimogyor|chia|lenmag|tokm|szezam|napraforgomag|nuca|migdale|alune|arahide|seminte/i.test(stripped)) {
    return { calories_per_100g: 580, protein_per_100g: 18, carbs_per_100g: 15, fat_per_100g: 50, category: 'Huvelyes & Mag' };
  }
  if (/mez|cukor|lekvár|dzsem|csokolade|csoki|miere|zahar|gem|ciocolata/i.test(stripped)) {
    return { calories_per_100g: 300, protein_per_100g: 1, carbs_per_100g: 75, fat_per_100g: 0.5, category: 'Edesseg & Snack' };
  }

  // Ultimate fallback: generic food
  return { calories_per_100g: 100, protein_per_100g: 5, carbs_per_100g: 15, fat_per_100g: 3, category: 'Egyeb' };
}

// ═══════════════════════════════════════════════════════════════
// TRAINING PLAN EXTRACTION
// ═══════════════════════════════════════════════════════════════

export function parseTrainingPlanText(rawText: string): AIParsedTrainingDay[] {
  const results: AIParsedTrainingDay[] = [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let currentWeek = 1;
  let currentDay = 1;

  for (const line of lines) {
    const lower = normalizeTextFull(line);

    // Week detection (trilingual)
    const weekNum = detectWeekNumber(line);
    if (weekNum) {
      currentWeek = weekNum;
      continue;
    }

    // Day detection (trilingual)
    const dayNum = detectDayFromLine(line);
    if (dayNum) {
      currentDay = dayNum;
    }

    // Duration detection
    const durationMatch = lower.match(/(\d+)\s*(?:perc|min(?:ute)?|minute)/);
    const calorieMatch = lower.match(/(\d+)\s*(?:kcal|kaloria|cal|calorii)/);

    // If line contains activity info
    if (durationMatch || calorieMatch || /edzes|sport|futa|usza|kereklaz|yoga|joga|pila|antrenament|alergare|inot|ciclism/i.test(lower)) {
      results.push({
        week: currentWeek,
        day: currentDay,
        activity: line,
        duration_minutes: durationMatch ? parseInt(durationMatch[1]) : 45,
        intensity: /intenziv|hiit|sprint|crossfit|intens/i.test(lower) ? 'intense' :
                   /konnyu|nyujt|yoga|joga|seta|pila|usor|plimbare/i.test(lower) ? 'light' : 'moderate',
        estimated_calories: calorieMatch ? parseInt(calorieMatch[1]) : 300,
        notes: '',
      });
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// INTELLIGENT PRE-PROCESSING
// ═══════════════════════════════════════════════════════════════

/**
 * Pre-process raw text: split run-together text at known structural markers.
 * Handles HU + RO + EN structural patterns. Then heal broken lines.
 */
function intelligentPreprocess(rawText: string): string[] {
  // v4: Apply deep sanitization first (removes corrupted chars, mojibake, garbage)
  let text = sanitizeExtractedText(rawText);

  // ─── Split before week markers (all languages) ───
  // RO: SĂPTĂMÂNA 1, Saptamana 2
  text = text.replace(
    /(?<!\n)\s*((?:S[ăaÃ]pt[ăaÃ]m[âaÃ®]na|SAPT(?:AMANA)?)\s*\d+)/gi,
    '\n$1'
  );
  // HU: 1. het, 2. het
  text = text.replace(/(?<!\n)\s*(\d+\.\s*h[eé]t)/gi, '\n$1');
  // EN: Week 1
  text = text.replace(/(?<!\n)\s*(Week\s*\d+)/gi, '\n$1');

  // ─── Split before day names (HU + RO + EN) ───
  // HU
  text = text.replace(
    /(?<!\n)\s*((?:H[eé]tf[oő]|Kedd|Szerda|Cs[uü]t[oö]rt[oö]k|P[eé]ntek|Szombat|Vas[aá]rnap)(?:\s*[-–:])?)/gi,
    '\n$1'
  );
  // RO
  text = text.replace(
    /(?<!\n)\s*((?:LUNI|MAR[ȚTțt]I|MIERCURI|JOI|VINERI|S[ÂAâa]MB[ĂAăa]T[ĂAăa]|DUMINIC[ĂAăa]|Luni|Mar[țt]i|Miercuri|Joi|Vineri|S[âa]mb[ăa]t[ăa]|Duminic[ăa])(?:\s*[-–:])?)/g,
    '\n$1'
  );
  // EN
  text = text.replace(
    /(?<!\n)\s*((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s*[-–:])?)/gi,
    '\n$1'
  );

  // ─── Split before numbered days ───
  text = text.replace(/(?<!\n)\s*(\d+\.\s*(?:nap|zi(?:ua)?))/gi, '\n$1');

  // ─── Split before meal type headers (HU + RO + EN) ───
  // RO: Mic dejun, Prânz, Cina, Gustare
  text = text.replace(
    /(?<!\n)\s*((?:Mic(?:ul)?\s*dejun|Pr[âa]nz|Cin[ăa]|Gustare|Gust[ăa]ri)(?:\s*[-–:])?)/gi,
    '\n$1'
  );
  // HU: Reggeli, Ebed, Vacsora, Edzés után, etc.
  text = text.replace(
    /(?<!\n)\s*((?:Reggeli|Eb[eé]d|Vacsora|T[ií]z[oó]rai?|Uzsonna|Snack|Nassol[aá]s|Edz[eé]s\s*ut[aá]n(?:i)?)(?:\s*[-–:])?)/gi,
    '\n$1'
  );
  // EN: Post-workout
  text = text.replace(
    /(?<!\n)\s*((?:Post[- ]?workout)(?:\s*[-–:])?)/gi,
    '\n$1'
  );
  // RO: Dupa antrenament
  text = text.replace(
    /(?<!\n)\s*((?:Dup[ăa]\s*antrenament)(?:\s*[-–:])?)/gi,
    '\n$1'
  );

  // ─── Split at bullet/dash/dot list items ───
  text = text.replace(/(?<!\n)\s*([-•–]\s+)/g, '\n$1');

  // ─── Split at quantity patterns preceded by word (ingredient boundaries) ───
  text = text.replace(
    /([a-záéíóöőúüűăâîșț]+)\s+(\d+\s*(?:g|kg|ml|dl|db|ek|tk|dkg|szelet|buc|lingura|lingurita|felie|felii))/gi,
    '$1\n$2'
  );

  console.log(`[AIParser v3] Pre-processed text (first 500 chars):\n${text.substring(0, 500)}`);

  // Split into lines, heal broken fragments
  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  return healBrokenLines(rawLines);
}

// ═══════════════════════════════════════════════════════════════
// MAIN NUTRITION PLAN TEXT PARSER (v3)
// ═══════════════════════════════════════════════════════════════

const TRAINING_DAY_PATTERN = /edzes(?:nap)?|sport|training|antrenament/gi;
const REST_DAY_PATTERN = /piheno(?:nap)?|rest|szunet|odihna/gi;
const CALORIE_PATTERN = /(\d+)\s*(?:kcal|kaloria|cal|calorii)/gi;

export async function parseNutritionPlanText(
  rawText: string
): Promise<AIParseResult> {
  const warnings: string[] = [];

  // ─── Intelligent pre-processing with broken line healing ─────
  const lines = intelligentPreprocess(rawText);

  let currentWeek = 1;
  let currentDay = 1;
  let currentMealType: MealType = 'breakfast';
  let isTrainingDay = false;

  const weeks: AIParsedDay[][] = [[]];
  let currentDayData: AIParsedDay | null = null;
  let currentMeal: AIParsedMeal | null = null;

  let structuralMarkersFound = 0;

  for (const line of lines) {
    const lower = normalizeTextFull(line);

    // ── Check for week markers (trilingual, heuristic) ──
    const weekNum = detectWeekNumber(line);
    if (weekNum !== null) {
      currentWeek = weekNum;
      while (weeks.length < currentWeek) weeks.push([]);
      structuralMarkersFound++;
      continue; // Week headers are pure structural — skip ingredient parsing
    }

    // ── Check for day markers (trilingual, fuzzy) ──
    const dayNum = detectDayFromLine(line);
    let dayDetected = false;
    if (dayNum !== null) {
      currentDay = dayNum;
      dayDetected = true;
      structuralMarkersFound++;
    }

    // ── Check for training/rest day ──
    TRAINING_DAY_PATTERN.lastIndex = 0;
    REST_DAY_PATTERN.lastIndex = 0;
    if (TRAINING_DAY_PATTERN.test(lower)) isTrainingDay = true;
    if (REST_DAY_PATTERN.test(lower)) isTrainingDay = false;

    // ── Check for meal type (trilingual, heuristic) ──
    const detectedMealType = detectMealType(line);
    const isMealHead = detectedMealType !== null;

    if (isMealHead) {
      currentMealType = detectedMealType!;
      structuralMarkersFound++;
    }

    if (dayDetected || isMealHead) {
      // Finalize previous meal if exists
      if (currentMeal && currentDayData) {
        currentDayData.meals.push(currentMeal);
      }

      if (dayDetected) {
        if (currentDayData) {
          weeks[currentWeek - 1]?.push(currentDayData);
        }
        currentDayData = {
          week: currentWeek,
          day: currentDay,
          day_label: isTrainingDay ? 'Edzesnap' : 'Pihenonap',
          is_training_day: isTrainingDay,
          meals: [],
        };
        if (!isMealHead) {
          currentMealType = 'breakfast'; // Default first meal of day
        }
      }

      if (!currentDayData) {
        currentDayData = {
          week: currentWeek,
          day: currentDay,
          day_label: isTrainingDay ? 'Edzesnap' : 'Pihenonap',
          is_training_day: isTrainingDay,
          meals: [],
        };
      }

      currentMeal = {
        meal_type: currentMealType,
        name: line,
        ingredients: [],
      };
      continue;
    }

    // ── Parse as ingredient line (v4: "+" splitting + clean validation) ──
    if (currentMeal && line.length > 2) {
      // Skip lines that are clearly headers/metadata, not ingredients
      const skipPatterns = /^(?:\d+\.\s*het|het\s*\d|week\s*\d|sapt|ossz|total|megjegyzes|note|observat)/i;
      if (skipPatterns.test(lower)) continue;

      // v4: Split by "+" delimiter — "joghurt 250g + Dió 40g" → 2 items
      const foodParts = splitFoodsByPlus(line);

      for (const part of foodParts) {
        // v4: Try clean food extraction first
        const cleanFood = parseCleanFoodItem(part);
        if (!cleanFood) {
          // Food name was corrupted/garbage — skip silently
          continue;
        }

        // Also do the old-style parsing for internal nutrition data
        const parsed = parseIngredientLine(part);
        const matchedId = await matchFoodByName(cleanFood.name);
        const estimated = estimateIngredientNutrition(cleanFood.name);
        currentMeal.ingredients.push({
          ...parsed,
          // Override name with cleaned version
          name: cleanFood.name,
          matched_food_id: matchedId,
          estimated_calories_per_100g: estimated.calories_per_100g,
          estimated_protein_per_100g: estimated.protein_per_100g,
          estimated_carbs_per_100g: estimated.carbs_per_100g,
          estimated_fat_per_100g: estimated.fat_per_100g,
          estimated_category: estimated.category,
        });
        if (!matchedId) {
          warnings.push(`Nem egyeztetett osszetevo: "${cleanFood.name}"`);
        }
      }
    }

    // ── Extract calories if present ──
    CALORIE_PATTERN.lastIndex = 0;
    const calMatch = CALORIE_PATTERN.exec(line);
    if (calMatch && currentMeal) {
      currentMeal.total_calories = parseInt(calMatch[1]);
    }
  }

  // Finalize last meal and day
  if (currentMeal && currentDayData) {
    currentDayData.meals.push(currentMeal);
  }
  if (currentDayData) {
    weeks[currentWeek - 1]?.push(currentDayData);
  }

  const plan: AIParsedNutritionPlan = {
    weeks: weeks.filter(w => w.length > 0),
    detected_weeks: weeks.filter(w => w.length > 0).length,
    detected_days_per_week: Math.max(...weeks.map(w => w.length), 0),
  };

  // ─── POST-PARSE VALIDATION: strict binary outcome ─────────────
  // Count actual meals that contain at least 1 ingredient (real food data)
  let totalMealsWithFood = 0;
  let totalIngredients = 0;
  for (const week of plan.weeks) {
    for (const day of week) {
      for (const meal of day.meals) {
        if (meal.ingredients.length > 0) {
          totalMealsWithFood++;
          totalIngredients += meal.ingredients.length;
        }
      }
    }
  }

  const hasRealData = totalMealsWithFood > 0 && totalIngredients > 0;

  // EXPLICIT ERROR: no structural markers at all
  if (structuralMarkersFound === 0) {
    console.warn('[AIParser v3] No structural markers (week/day/meal) detected in text.');
    warnings.push('PARSE_ERROR: No structured meal plan data detected. The document does not contain recognizable week/day/meal markers in HU, RO, or EN.');
  }
  // EXPLICIT ERROR: markers found but no actual food data extracted
  else if (!hasRealData) {
    console.warn(`[AIParser v3] Structural markers found (${structuralMarkersFound}) but 0 meals with ingredients.`);
    warnings.push('PARSE_ERROR: Structural markers (week/day/meal headers) were detected, but no food items could be extracted from the document. The content between meal headers may be empty or unrecognizable.');
  }

  // If parse error detected → null out the plan to prevent downstream ghost data
  const hasParseError = warnings.some(w => w.startsWith('PARSE_ERROR:'));
  const finalPlan: AIParsedNutritionPlan = hasParseError
    ? { weeks: [], detected_weeks: 0, detected_days_per_week: 0 }
    : plan;

  const result: AIParseResult = {
    id: generateId(),
    source_type: 'nutrition_plan',
    source_format: 'text',
    raw_text: rawText,
    structured_data: finalPlan,
    confidence: hasParseError ? 0 : calculateConfidence(plan, warnings),
    warnings,
    parsed_at: nowISO(),
  };

  return result;
}

// ═══════════════════════════════════════════════════════════════
// STRUCTURED JSON OUTPUT
// ═══════════════════════════════════════════════════════════════

/**
 * Convert internal AIParsedNutritionPlan to clean structured JSON format (v4):
 * {
 *   "week1": {
 *     "monday": {
 *       "breakfast": [
 *         { "name": "Görög joghurt 3%", "quantity": "250g", "calories": null },
 *         { "name": "Dió", "quantity": "40g", "calories": null }
 *       ],
 *       "lunch": [...],
 *       "dinner": [...]
 *     }
 *   }
 * }
 *
 * ONLY returns clean, validated food items.
 * Returns { data: null, error: string } if parsing failed.
 * NO hardcoded fallback, NO corrupted characters.
 */
export function toStructuredMealPlanJSON(
  plan: AIParsedNutritionPlan | null,
  warnings: string[]
): { data: StructuredMealPlanJSON | null; error: string | null } {
  // Check for explicit parse error
  const hasParseError = warnings.some(w => w.startsWith('PARSE_ERROR:'));
  if (hasParseError || !plan || plan.weeks.length === 0) {
    return {
      data: null,
      error: 'Food extraction failed. The document does not contain recognizable week/day/meal structure.',
    };
  }

  const result: StructuredMealPlanJSON = {};

  for (let wi = 0; wi < plan.weeks.length; wi++) {
    const weekKey = `week${wi + 1}`;
    result[weekKey] = {};

    for (const day of plan.weeks[wi]) {
      const dayKey = DAY_NUM_TO_KEY[day.day] || `day${day.day}`;
      const dayPlan: StructuredDayPlan = {
        breakfast: [],
        lunch: [],
        dinner: [],
      };

      for (const meal of day.meals) {
        // v4: Build clean food array — only validated items, no corrupted names
        const cleanFoods: StructuredMealPlanFood[] = [];

        for (const ing of meal.ingredients) {
          // Final validation gate: reject any corrupted food name
          if (!isCleanFoodName(ing.name)) {
            console.warn(`[AIParser v4] Output gate rejected: "${ing.name}"`);
            continue;
          }

          // Build human-readable quantity string
          let quantity = '';
          if (ing.quantity_grams && ing.unit) {
            if (ing.unit === 'db') {
              // "db" items: show as "1 db", "2 db"
              const count = Math.round(ing.quantity_grams / 50) || 1;
              quantity = `${count} db`;
            } else {
              quantity = `${ing.quantity_grams}${ing.unit}`;
            }
          }

          // Auto-fill calories from knowledge base / database match.
          // Only fill when there's a real match (not the generic "Egyeb" fallback).
          let calories: number | null = null;
          const calPer100 = ing.estimated_calories_per_100g;
          const category = ing.estimated_category;
          if (calPer100 && category && category !== 'Egyeb' && ing.quantity_grams > 0) {
            calories = Math.round((calPer100 * ing.quantity_grams) / 100);
          }

          cleanFoods.push({
            name: cleanFoodName(ing.name),
            quantity,
            calories,
          });
        }

        // Assign to the correct meal slot
        const mealType = meal.meal_type;
        if (mealType === 'breakfast') {
          dayPlan.breakfast.push(...cleanFoods);
        } else if (mealType === 'lunch') {
          dayPlan.lunch.push(...cleanFoods);
        } else if (mealType === 'dinner') {
          dayPlan.dinner.push(...cleanFoods);
        } else if (mealType === 'snack') {
          if (!dayPlan.snack) dayPlan.snack = [];
          dayPlan.snack.push(...cleanFoods);
        } else if (mealType === 'post_workout') {
          if (!dayPlan.post_workout) dayPlan.post_workout = [];
          dayPlan.post_workout.push(...cleanFoods);
        }
      }

      result[weekKey][dayKey] = dayPlan;
    }
  }

  // ─── OUTPUT VALIDATION: verify the JSON actually contains clean food ───
  let totalFoodsInOutput = 0;
  let totalWithCalories = 0;
  for (const weekKey of Object.keys(result)) {
    for (const dayKey of Object.keys(result[weekKey])) {
      const day = result[weekKey][dayKey];
      const allSlots = [
        day.breakfast, day.lunch, day.dinner, day.snack, day.post_workout,
      ].filter(Boolean) as StructuredMealPlanFood[][];
      for (const slot of allSlots) {
        totalFoodsInOutput += slot.length;
        totalWithCalories += slot.filter(f => f.calories !== null).length;
      }
    }
  }

  if (totalFoodsInOutput === 0) {
    return {
      data: null,
      error: 'Food extraction failed. Meal plan structure was recognized but no clean food items could be extracted. All extracted names were corrupted or unrecognizable.',
    };
  }

  console.log(
    `[AIParser v4] Clean structured output: ${totalFoodsInOutput} food items ` +
    `(${totalWithCalories} with calorie data, ${totalFoodsInOutput - totalWithCalories} unknown) ` +
    `across ${Object.keys(result).length} weeks`
  );
  return { data: result, error: null };
}

/**
 * High-level function: parse raw text and return structured JSON.
 * Returns explicit error if no data found — NO hardcoded fallback.
 */
export async function parseToStructuredMealPlan(
  rawText: string
): Promise<{ data: StructuredMealPlanJSON | null; error: string | null; warnings: string[] }> {
  const result = await parseNutritionPlanText(rawText);
  const plan = result.structured_data as AIParsedNutritionPlan | null;
  const { data, error } = toStructuredMealPlanJSON(plan, result.warnings);

  return {
    data,
    error,
    warnings: result.warnings,
  };
}

// ═══════════════════════════════════════════════════════════════
// UNIFIED DOCUMENT PARSER (v3 entry point)
// ═══════════════════════════════════════════════════════════════

/**
 * Unified document parser. Parses ALL extractable data from text:
 *   - Personal profile (weight, height, BMI, age, blood pressure, etc.)
 *   - Nutrition plan (weeks → days → meals → ingredients)
 *   - Body measurements (waist, chest, arm, etc.)
 *   - Training plan (activities, durations, intensities)
 *   - Allergies, dietary preferences, calorie targets
 *
 * FONTOS: A parser a dokumentumbol kinyert ertekeket SZO SZERINT veszi!
 * Ha nincs strukturalt adat, EXPLICIT HIBAUZENET — NEM hardcoded fallback.
 */
export async function parseDocumentText(rawText: string): Promise<AIParsedDocument> {
  const warnings: string[] = [];

  // v4: Sanitize text BEFORE any extraction
  const sanitizedText = sanitizeExtractedText(rawText);

  // Step 1: Extract personal data
  const userProfile = extractPersonalData(sanitizedText);

  // Step 2: Parse nutrition plan (v4 — trilingual, fuzzy, clean extraction)
  const planResult = await parseNutritionPlanText(sanitizedText);
  warnings.push(...planResult.warnings);

  // Respect PARSE_ERROR: if plan parsing failed, null it out — NO ghost data
  const planHasError = planResult.warnings.some(w => w.startsWith('PARSE_ERROR:'));
  const nutritionPlan: AIParsedNutritionPlan | null = planHasError
    ? null
    : (planResult.structured_data as AIParsedNutritionPlan);

  // Step 3: Parse measurements
  const measurements = parseMeasurementsText(sanitizedText);
  // Cross-reference: if we got weight from personal data, add it to measurements
  if (userProfile.weight && measurements.length > 0 && !measurements[0].weight) {
    measurements[0].weight = userProfile.weight;
  }
  if (userProfile.weight && measurements.length === 0) {
    measurements.push({
      date: new Date().toISOString().split('T')[0],
      weight: userProfile.weight,
      notes: 'PDF-bol kinyerve',
    });
  }

  // Step 4: Parse training plan
  const trainingDays = parseTrainingPlanText(sanitizedText);

  // Step 5: Calculate overall confidence
  let confidence = 0;
  let factors = 0;

  if (userProfile.weight || userProfile.height || userProfile.age) {
    confidence += 0.3;
    factors++;
  }
  if (nutritionPlan && nutritionPlan.weeks.length > 0) {
    confidence += planResult.confidence * 0.4;
    factors++;
  }
  if (measurements.length > 0) {
    confidence += 0.15;
    factors++;
  }
  if (trainingDays.length > 0) {
    confidence += 0.15;
    factors++;
  }
  if (userProfile.calorie_target) {
    confidence += 0.05;
  }
  if (userProfile.allergies && userProfile.allergies.length > 0) {
    confidence += 0.05;
  }

  // If nothing was extracted, low confidence
  if (factors === 0) confidence = 0.05;
  confidence = Math.min(1, Math.max(0, confidence));

  // Generate warnings for missing critical data
  if (!userProfile.weight) warnings.push('Testsuly nem talalhato a dokumentumban');
  if (!userProfile.height) warnings.push('Magassag nem talalhato a dokumentumban');
  if (!userProfile.age) warnings.push('Kor nem talalhato a dokumentumban');
  if (!nutritionPlan || nutritionPlan.weeks.length === 0) {
    warnings.push('Etrend terv nem talalhato — hasznald a szoveg beillesztest reszletesebb formatumban');
  }

  return {
    userProfile,
    nutritionPlan,
    measurements,
    trainingDays,
    warnings,
    confidence,
    rawText,
  };
}

// ═══════════════════════════════════════════════════════════════
// FILE TYPE DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectFileType(file: File): 'pdf' | 'word' | 'image' | 'text' {
  const ext = file.name.toLowerCase().split('.').pop();
  const mime = file.type.toLowerCase();

  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext || '') || mime.includes('word')) return 'word';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext || '')) return 'image';
  return 'text';
}

// ═══════════════════════════════════════════════════════════════
// MAIN FILE PARSER (v3 — real extraction, NO fallback)
// ═══════════════════════════════════════════════════════════════

/**
 * Parse an uploaded file. Extracts REAL data from PDFs using pdfjs-dist.
 * Returns explicit error if extraction fails — NO hardcoded data fallback.
 */
export async function parseUploadedFile(file: File): Promise<AIParsedDocument> {
  const fileType = detectFileType(file);

  let rawText = '';

  if (fileType === 'text') {
    rawText = await file.text();
  } else if (fileType === 'pdf') {
    rawText = await extractTextFromPDF(file);
  } else if (fileType === 'word') {
    // Word files: try reading as text (some .docx have embedded text)
    try {
      rawText = await file.text();
      const cleaned = rawText.replace(/[^\x20-\x7E\xC0-\xFF\n\r\tÁáÉéÍíÓóÖöŐőÚúÜüŰűĂăÂâÎîȘșȚț]/g, ' ');
      if (cleaned.replace(/\s/g, '').length > 50) {
        rawText = cleaned;
      } else {
        throw new Error('Word fajl nem olvashato szovegkent');
      }
    } catch {
      throw new Error(
        'Word fajl szoveg kinyeres nem sikerult. Kerlek, mentsd PDF-kent vagy hasznald a "Szoveg beillesztese" opciot.'
      );
    }
  } else {
    throw new Error(
      'Kepfajl feldolgozasahoz OCR szukseges. Kerlek, hasznald a "Szoveg beillesztese" opciot, vagy toltsd fel PDF-kent.'
    );
  }

  if (rawText.trim().length < 10) {
    throw new Error('A fajlbol nem sikerult elegendo szoveget kinyerni. Probald meg a "Szoveg beillesztese" opciot.');
  }

  return parseDocumentText(rawText);
}

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE CALCULATION
// ═══════════════════════════════════════════════════════════════

function calculateConfidence(plan: AIParsedNutritionPlan, warnings: string[]): number {
  let confidence = 1.0;

  if (plan.detected_weeks < 4) confidence -= 0.1 * (4 - plan.detected_weeks);

  const totalDays = plan.weeks.reduce((s, w) => s + w.length, 0);
  if (totalDays < 28) confidence -= 0.02 * (28 - totalDays);

  const warningPenalty = Math.min(0.3, warnings.length * 0.02);
  confidence -= warningPenalty;

  for (const week of plan.weeks) {
    for (const day of week) {
      for (const meal of day.meals) {
        if (meal.ingredients.length === 0) confidence -= 0.05;
      }
    }
  }

  return Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));
}
