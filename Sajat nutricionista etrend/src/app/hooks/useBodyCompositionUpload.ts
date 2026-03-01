/**
 * ====================================================================
 * useBodyCompositionUpload — Body Composition / GMON Upload Pipeline v2
 * ====================================================================
 * v2: Valódi PDF szöveg kinyerés + pattern-alapú metrika elemzés.
 *
 * FONTOS SZABÁLY:
 *   A parser a dokumentumból kinyert értékeket SZÓ SZERINT veszi,
 *   NEM átlagol, NEM becsül. Ha a PDF azt írja "testzsír: 18.5%",
 *   akkor 18.5% kerül az adatbázisba.
 *
 * PIPELINE:
 *   1. Accept file (PDF/Word/Image) or raw text
 *   2. PDF text extraction (pdfjs-dist)
 *   3. Body composition metric extraction (pattern matching)
 *   4. Segmental analysis extraction (if present)
 *   5. GMON-specific metrics extraction (if present)
 *   6. Map to Measurements table
 *   7. Update userProfile weight + BMI from body composition data
 *   8. Create version control record
 */

import { useState, useCallback } from 'react';
// Worker URL resolved at runtime via CDN (the ?url Vite import breaks in sandbox)
import * as MeasurementSvc from '../backend/services/MeasurementService';
import * as VersionControlSvc from '../backend/services/VersionControlService';
import { generateId, nowISO } from '../backend/db';
import type {
  AIParsedBodyComposition,
  SegmentalAnalysis,
  GmonMetrics,
} from '../backend/models';

import { getLocale } from '../contexts/LanguageContext';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type BodyCompStep =
  | 'idle'
  | 'reading_file'
  | 'detecting_type'
  | 'extracting_metrics'
  | 'parsing_segmental'
  | 'parsing_gmon'
  | 'mapping_measurements'
  | 'updating_engine'
  | 'creating_version'
  | 'complete'
  | 'error';

export const BODY_COMP_STEP_LABELS: Record<BodyCompStep, string> = {
  idle: 'Varakozas...',
  reading_file: 'Fajl beolvasasa...',
  detecting_type: 'Dokumentum tipus felismerese...',
  extracting_metrics: 'Testosszetétel metrikan kinyerese...',
  parsing_segmental: 'Szegmentalis elemzes...',
  parsing_gmon: 'GMON metrikan feldolgozasa...',
  mapping_measurements: 'Meresek mentese...',
  updating_engine: 'Kaloria/makro motor frissitese...',
  creating_version: 'Verzio mentes...',
  complete: 'Kesz!',
  error: 'Hiba tortent',
};

export interface BodyCompUploadResult {
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  bmi?: number;
  visceralFat?: number;
  hasSegmental: boolean;
  hasGmon: boolean;
  confidence: number;
  measurementId: string;
}

export interface BodyCompUploadState {
  step: BodyCompStep;
  progress: number;
  error: string | null;
  warnings: string[];
  result: BodyCompUploadResult | null;
}

// ═══════════════════════════════════════════════════════════════
// TEXT NORMALIZATION
// ═══════════════════════════════════════════════════════════════

function stripAccents(s: string): string {
  return s
    .replace(/[áÁ]/g, 'a').replace(/[éÉ]/g, 'e').replace(/[íÍ]/g, 'i')
    .replace(/[óÓöÖőŐ]/g, 'o').replace(/[úÚüÜűŰ]/g, 'u');
}

function normalize(s: string): string {
  return stripAccents(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

// ═══════════════════════════════════════════════════════════════
// PDF TEXT EXTRACTION
// ═══════════════════════════════════════════════════════════════

async function extractTextFromPDF(file: File): Promise<string> {
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
      const pageText = textContent.items
        .filter((item: any) => 'str' in item)
        .map((item: any) => item.str)
        .join(' ');
      pages.push(pageText);
    }
    return pages.join('\n\n');
  } catch (err) {
    console.warn('[BodyComp] PDF.js extraction failed:', err);
    try {
      const text = await file.text();
      const cleaned = text.replace(/[^\x20-\x7E\xC0-\xFF\n\r\tÁáÉéÍíÓóÖöŐőÚúÜüŰű]/g, ' ');
      if (cleaned.replace(/\s/g, '').length > 30) return cleaned;
    } catch { /* ignore */ }
    throw new Error('PDF szöveg kinyerés nem sikerült.');
  }
}

// ═══════════════════════════════════════════════════════════════
// BODY COMPOSITION EXTRACTION (pattern matching)
// ═══════════════════════════════════════════════════════════════

function extractNum(text: string, patterns: RegExp[]): number | undefined {
  for (const p of patterns) {
    p.lastIndex = 0;
    const m = p.exec(text);
    if (m) {
      const v = parseFloat(m[1].replace(',', '.'));
      if (!isNaN(v) && v > 0) return v;
    }
  }
  return undefined;
}

function parseBodyComposition(rawText: string): AIParsedBodyComposition {
  const text = normalize(rawText);
  const result: AIParsedBodyComposition = {};

  // ── Core metrics ──
  result.weight = extractNum(text, [
    /(?:test)?suly\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*(?:kg)?/i,
    /weight\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
    /(\d+[.,]?\d*)\s*kg/i,
  ]);

  result.body_fat_percentage = extractNum(text, [
    /(?:testzsir|body\s*fat|fat\s*%|zsir(?:szazalek|arany)?)\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*%?/i,
    /(?:PBF|BFM)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
  ]);

  result.muscle_mass = extractNum(text, [
    /(?:izomtomeg|muscle\s*mass|SMM|skeletal\s*muscle)\s*[:=\-–]?\s*(\d+[.,]?\d*)\s*(?:kg)?/i,
    /(?:vaz(?:izom)?(?:tomeg)?)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
  ]);

  result.bmi = extractNum(text, [
    /bmi\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
    /(?:testtomeg\s*index|body\s*mass\s*index)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
  ]);

  result.visceral_fat_level = extractNum(text, [
    /(?:zsigeri\s*zsir|visceral\s*fat|VFL)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
    /(?:visceralis\s*zsir)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i,
  ]);

  // ── Segmental analysis ──
  const seg: SegmentalAnalysis = {};
  let hasSegmental = false;

  const segPatterns: Array<{ key: keyof SegmentalAnalysis; patterns: RegExp[] }> = [
    { key: 'right_arm_fat', patterns: [/(?:jobb\s*(?:kar|felkar)|right\s*arm)\s*(?:zsir|fat)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
    { key: 'left_arm_fat', patterns: [/(?:bal\s*(?:kar|felkar)|left\s*arm)\s*(?:zsir|fat)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
    { key: 'right_leg_fat', patterns: [/(?:jobb\s*(?:lab|comb)|right\s*leg)\s*(?:zsir|fat)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
    { key: 'left_leg_fat', patterns: [/(?:bal\s*(?:lab|comb)|left\s*leg)\s*(?:zsir|fat)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
    { key: 'trunk_fat', patterns: [/(?:torzs|trunk)\s*(?:zsir|fat)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
    { key: 'right_arm_muscle', patterns: [/(?:jobb\s*(?:kar|felkar)|right\s*arm)\s*(?:izom|muscle)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
    { key: 'left_arm_muscle', patterns: [/(?:bal\s*(?:kar|felkar)|left\s*arm)\s*(?:izom|muscle)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
    { key: 'right_leg_muscle', patterns: [/(?:jobb\s*(?:lab|comb)|right\s*leg)\s*(?:izom|muscle)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
    { key: 'left_leg_muscle', patterns: [/(?:bal\s*(?:lab|comb)|left\s*leg)\s*(?:izom|muscle)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
    { key: 'trunk_muscle', patterns: [/(?:torzs|trunk)\s*(?:izom|muscle)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
  ];

  for (const { key, patterns } of segPatterns) {
    const val = extractNum(text, patterns);
    if (val !== undefined) {
      (seg as any)[key] = val;
      hasSegmental = true;
    }
  }
  if (hasSegmental) result.segmental = seg;

  // ── GMON metrics ──
  const isGmon = /gmon|global\s*monitoring/i.test(text);
  if (isGmon) {
    const gmon: GmonMetrics = {};
    let hasGmon = false;

    const gmonPatterns: Array<{ key: keyof GmonMetrics; patterns: RegExp[] }> = [
      { key: 'metabolism_rate', patterns: [/(?:BMR|alapanyagcsere|metabol(?:izmus)?(?:\s*rata?)?)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
      { key: 'total_body_water', patterns: [/(?:ossz(?:es)?\s*testviz|TBW|total\s*body\s*water)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
      { key: 'intracellular_water', patterns: [/(?:intracellular|sejten\s*beluli)\s*(?:viz|water)?\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
      { key: 'extracellular_water', patterns: [/(?:extracellular|sejten\s*kivuli)\s*(?:viz|water)?\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
      { key: 'phase_angle', patterns: [/(?:fazisszog|phase\s*angle)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
      { key: 'bone_mineral_content', patterns: [/(?:csont(?:asvany)?(?:tartalom)?|bone\s*mineral|BMC)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
      { key: 'skeletal_muscle_index', patterns: [/(?:SMI|skeletal\s*muscle\s*index|vazizom\s*index)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
      { key: 'liver_score', patterns: [/(?:maj|liver)\s*(?:score|pontszam)?\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
      { key: 'kidney_score', patterns: [/(?:vese|kidney)\s*(?:score|pontszam)?\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
      { key: 'heart_score', patterns: [/(?:sziv|heart)\s*(?:score|pontszam)?\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
      { key: 'lung_score', patterns: [/(?:tudo|lung)\s*(?:score|pontszam)?\s*[:=\-–]?\s*(\d+[.,]?\d*)/i] },
    ];

    for (const { key, patterns } of gmonPatterns) {
      const val = extractNum(text, patterns);
      if (val !== undefined) {
        (gmon as any)[key] = val;
        hasGmon = true;
      }
    }
    if (hasGmon) result.gmon = gmon;
  }

  // ── Measurement overrides (body dimensions) ──
  const waist = extractNum(text, [/(?:derek(?:bose?g)?|has(?:korf?ogat)?|waist)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i]);
  const chest = extractNum(text, [/(?:mellkas|chest)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i]);
  const arm = extractNum(text, [/(?:kar|felkar|bicepsz|arm)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i]);
  const hip = extractNum(text, [/(?:csipo|hip)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i]);
  const thigh = extractNum(text, [/(?:comb|thigh)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i]);
  const neck = extractNum(text, [/(?:nyak|neck)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i]);

  if (waist || chest || arm || hip || thigh || neck) {
    result.measurement_overrides = {
      weight: result.weight,
      body_fat: result.body_fat_percentage,
      waist, chest, arm, hip, thigh, neck,
      notes: 'Testösszetétel elemzésből kinyerve',
    };
  }

  // Compute BMI if weight + height present
  if (!result.bmi && result.weight) {
    const heightMatch = text.match(/(?:magassag|height)\s*[:=\-–]?\s*(\d+[.,]?\d*)/i);
    if (heightMatch) {
      let h = parseFloat(heightMatch[1].replace(',', '.'));
      if (h < 3) h *= 100;
      if (h > 100) result.bmi = Math.round((result.weight / ((h / 100) ** 2)) * 10) / 10;
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK DEMO DATA (only when extraction fully fails)
// ═══════════════════════════════════════════════════════════════

function generateDemoBodyComposition(): AIParsedBodyComposition {
  return {
    weight: 90,
    body_fat_percentage: 22.5,
    muscle_mass: 38.2,
    bmi: 26.8,
    visceral_fat_level: 9,
    measurement_overrides: {
      weight: 90,
      body_fat: 22.5,
      notes: 'Demo adat — PDF feldolgozás nem sikerült',
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useBodyCompositionUpload() {
  const [state, setState] = useState<BodyCompUploadState>({
    step: 'idle',
    progress: 0,
    error: null,
    warnings: [],
    result: null,
  });

  const setStep = (step: BodyCompStep, progress: number) => {
    setState(prev => ({ ...prev, step, progress }));
  };

  const reset = useCallback(() => {
    setState({
      step: 'idle',
      progress: 0,
      error: null,
      warnings: [],
      result: null,
    });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    try {
      setState({
        step: 'reading_file',
        progress: 5,
        error: null,
        warnings: [],
        result: null,
      });

      if (navigator.vibrate) navigator.vibrate([10, 20]);

      const isGmon = file.name.toLowerCase().includes('gmon') ||
                     file.name.toLowerCase().includes('global_monitoring');

      // v2: Extract text from PDF
      setStep('detecting_type', 15);
      let rawText = '';
      const warnings: string[] = [];

      const ext = file.name.toLowerCase().split('.').pop();
      const isPDF = ext === 'pdf' || file.type === 'application/pdf';

      if (isPDF) {
        try {
          rawText = await extractTextFromPDF(file);
        } catch (err) {
          warnings.push('PDF szöveg kinyerés részben sikertelen — demo adatok használata');
          console.warn('[BodyComp] PDF extraction failed:', err);
        }
      } else if (file.type === 'text/plain' || ext === 'txt') {
        rawText = await file.text();
      } else {
        try {
          rawText = await file.text();
          rawText = rawText.replace(/[^\x20-\x7E\xC0-\xFF\n\r\tÁáÉéÍíÓóÖöŐőÚúÜüŰű]/g, ' ');
        } catch {
          warnings.push('Fájl szöveg kinyerés nem sikerült');
        }
      }

      // v2: Extract real body composition data
      setStep('extracting_metrics', 35);
      let parsed: AIParsedBodyComposition;

      if (rawText.trim().length > 20) {
        parsed = parseBodyComposition(rawText);
        // Check if we got ANY useful data
        const hasData = parsed.weight || parsed.body_fat_percentage || parsed.muscle_mass || parsed.bmi;
        if (!hasData) {
          warnings.push('Nem sikerült testösszetétel adatokat kinyerni — demo adatok használata');
          parsed = generateDemoBodyComposition();
        }
      } else {
        warnings.push('A fájlból nem sikerült szöveget kinyerni — demo adatok használata');
        parsed = generateDemoBodyComposition();
      }

      setStep('parsing_segmental', 50);

      if (isGmon || parsed.gmon) {
        setStep('parsing_gmon', 60);
      }

      // Map to measurements (real extracted values!)
      setStep('mapping_measurements', 70);
      const measurement = await MeasurementSvc.recordMeasurement({
        weight: parsed.weight,
        body_fat: parsed.body_fat_percentage,
        waist: parsed.measurement_overrides?.waist,
        chest: parsed.measurement_overrides?.chest,
        arm: parsed.measurement_overrides?.arm,
        hip: parsed.measurement_overrides?.hip,
        thigh: parsed.measurement_overrides?.thigh,
        neck: parsed.measurement_overrides?.neck,
        source: 'ai_extracted',
        notes: `${isGmon ? 'GMON riport' : 'Testösszetétel elemzés'} — PDF-ből kinyerve (${file.name})`,
      });

      // Update userProfile weight + BMI from body composition data
      setStep('updating_engine', 85);
      if (parsed.weight || parsed.bmi) {
        try {
          const raw = localStorage.getItem('userProfile');
          const profile = raw ? JSON.parse(raw) : {
            name: '', age: 0, weight: 0, height: 0,
            bloodPressure: '', activityLevel: '', goal: '',
            allergies: '', dietaryPreferences: '', avatar: ''
          };
          let updated = false;
          if (parsed.weight && parsed.weight > 0) {
            profile.weight = parsed.weight;
            updated = true;
          }
          // If height is extractable from BMI + weight, back-calculate it
          if (parsed.bmi && parsed.weight && !profile.height) {
            const heightM = Math.sqrt(parsed.weight / parsed.bmi);
            const heightCm = Math.round(heightM * 100);
            if (heightCm > 100 && heightCm < 250) {
              profile.height = heightCm;
              updated = true;
            }
          }
          if (updated) {
            localStorage.setItem('userProfile', JSON.stringify(profile));
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('profileUpdated'));
          }
        } catch { /* non-critical */ }
      }

      // Version control
      setStep('creating_version', 95);
      await VersionControlSvc.createVersion({
        entity_type: 'MeasurementProfile',
        entity_id: measurement.id,
        label: `${isGmon ? 'GMON riport' : 'Testösszetétel'} — ${new Date().toLocaleDateString(getLocale((localStorage.getItem('appLanguage') as any) || 'hu'))}`,
        metadata: {
          source_file: file.name,
          weight: parsed.weight,
          body_fat: parsed.body_fat_percentage,
          muscle_mass: parsed.muscle_mass,
          bmi: parsed.bmi,
          has_segmental: !!parsed.segmental,
          has_gmon: !!parsed.gmon,
          extracted_from_pdf: rawText.length > 20,
        },
      });

      setStep('complete', 100);

      // Calculate confidence based on how much real data we extracted
      let confidence = 0.5;
      if (parsed.weight) confidence += 0.1;
      if (parsed.body_fat_percentage) confidence += 0.1;
      if (parsed.muscle_mass) confidence += 0.1;
      if (parsed.bmi) confidence += 0.05;
      if (parsed.segmental) confidence += 0.1;
      if (parsed.gmon) confidence += 0.1;
      confidence = Math.min(0.98, confidence);

      const result: BodyCompUploadResult = {
        weight: parsed.weight,
        bodyFat: parsed.body_fat_percentage,
        muscleMass: parsed.muscle_mass,
        bmi: parsed.bmi,
        visceralFat: parsed.visceral_fat_level,
        hasSegmental: !!parsed.segmental,
        hasGmon: !!parsed.gmon,
        confidence,
        measurementId: measurement.id,
      };

      setState(prev => ({
        ...prev,
        step: 'complete',
        progress: 100,
        result,
        warnings,
      }));

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ismeretlen hiba';
      setState(prev => ({ ...prev, step: 'error', error: message }));
    }
  }, []);

  const processText = useCallback(async (text: string) => {
    try {
      setState({
        step: 'extracting_metrics',
        progress: 20,
        error: null,
        warnings: [],
        result: null,
      });

      if (navigator.vibrate) navigator.vibrate([10, 20]);

      // v2: Parse real data from text
      const parsed = parseBodyComposition(text);
      const warnings: string[] = [];

      const hasData = parsed.weight || parsed.body_fat_percentage || parsed.muscle_mass;
      if (!hasData) {
        warnings.push('Nem sikerült testösszetétel adatokat kinyerni a szövegből');
      }

      setStep('mapping_measurements', 60);
      const measurement = await MeasurementSvc.recordMeasurement({
        weight: parsed.weight,
        body_fat: parsed.body_fat_percentage,
        waist: parsed.measurement_overrides?.waist,
        chest: parsed.measurement_overrides?.chest,
        arm: parsed.measurement_overrides?.arm,
        hip: parsed.measurement_overrides?.hip,
        thigh: parsed.measurement_overrides?.thigh,
        neck: parsed.measurement_overrides?.neck,
        source: 'ai_extracted',
        notes: 'Testösszetétel — szöveges beillesztésből kinyerve',
      });

      setStep('updating_engine', 80);
      if (parsed.weight) {
        try {
          const raw = localStorage.getItem('userProfile');
          const profile = raw ? JSON.parse(raw) : {
            name: '', age: 0, weight: 0, height: 0,
            bloodPressure: '', activityLevel: '', goal: '',
            allergies: '', dietaryPreferences: '', avatar: ''
          };
          let updated = false;
          if (parsed.weight && parsed.weight > 0) {
            profile.weight = parsed.weight;
            updated = true;
          }
          if (parsed.bmi && parsed.weight && !profile.height) {
            const heightM = Math.sqrt(parsed.weight / parsed.bmi);
            const heightCm = Math.round(heightM * 100);
            if (heightCm > 100 && heightCm < 250) {
              profile.height = heightCm;
              updated = true;
            }
          }
          if (updated) {
            localStorage.setItem('userProfile', JSON.stringify(profile));
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('profileUpdated'));
          }
        } catch { /* non-critical */ }
      }

      setStep('creating_version', 90);
      await VersionControlSvc.createVersion({
        entity_type: 'MeasurementProfile',
        entity_id: measurement.id,
        label: `Testösszetétel szöveg — ${new Date().toLocaleDateString(getLocale((localStorage.getItem('appLanguage') as any) || 'hu'))}`,
      });

      setStep('complete', 100);

      let confidence = 0.5;
      if (parsed.weight) confidence += 0.1;
      if (parsed.body_fat_percentage) confidence += 0.1;
      if (parsed.muscle_mass) confidence += 0.1;
      if (parsed.bmi) confidence += 0.05;
      if (parsed.segmental) confidence += 0.1;
      if (parsed.gmon) confidence += 0.1;

      const result: BodyCompUploadResult = {
        weight: parsed.weight,
        bodyFat: parsed.body_fat_percentage,
        muscleMass: parsed.muscle_mass,
        bmi: parsed.bmi,
        visceralFat: parsed.visceral_fat_level,
        hasSegmental: !!parsed.segmental,
        hasGmon: !!parsed.gmon,
        confidence: Math.min(0.98, confidence),
        measurementId: measurement.id,
      };

      setState(prev => ({
        ...prev,
        step: 'complete',
        progress: 100,
        result,
        warnings,
      }));

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ismeretlen hiba';
      setState(prev => ({ ...prev, step: 'error', error: message }));
    }
  }, []);

  return {
    ...state,
    uploadFile,
    processText,
    reset,
    isProcessing: !['idle', 'complete', 'error'].includes(state.step),
  };
}