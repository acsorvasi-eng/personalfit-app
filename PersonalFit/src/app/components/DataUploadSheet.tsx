/**
 * ====================================================================
 * DataUploadSheet — Clean Upload Processing Gate
 * ====================================================================
 * Full-screen bottom sheet with:
 *   - File picker (PDF, Word, Image, Text)
 *   - Text paste area for manual input
 *   - Processing pipeline with animated progress
 *   - Simple success/error result (no raw data preview)
 *   - Error handling with retry
 *
 * Entry point: Profile → Settings → "Tervem feltöltése"
 *
 * v3 CHANGES:
 *   - Removed "Amit az AI feldolgoz" feature grid
 *   - Removed detailed stats & extracted data preview from result
 *   - Simplified result: "Staging kész" message + close
 *   - No water dosage component
 *   - Clean processing gate UX
 */

import { hapticFeedback } from '@/lib/haptics';
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Image, X, ChevronDown,
  CheckCircle2, AlertTriangle, Sparkles, FileUp,
  ClipboardPaste, ArrowRight, RotateCw,
  Brain, Eye, Layers
} from 'lucide-react';
import { useDataUpload, STEP_LABELS, type UploadStep } from '../hooks/useDataUpload';
import { DSMButton } from './dsm';
import { useLanguage } from '../contexts/LanguageContext';
import { MergeConflictDialog } from './MergeConflictDialog';
import { MealIntervals } from '../features/menu/components/MealIntervals';
import SharedPremiumLoader, { getPhaseText } from './PremiumLoader';
import * as NutritionPlanService from '../backend/services/NutritionPlanService';
import * as FoodCatalogService from '../backend/services/FoodCatalogService';
import { showToast } from '../shared/components/Toast';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface DataUploadSheetProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// ACCEPTED FILE TYPES
// ═══════════════════════════════════════════════════════════════

const ACCEPTED_TYPES = [
  '.pdf', '.doc', '.docx', '.txt',
  '.jpg', '.jpeg', '.png', '.webp', '.heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/*',
].join(',');


// ═══════════════════════════════════════════════════════════════
// Upload phase labels for SharedPremiumLoader
// ═══════════════════════════════════════════════════════════════

const UPLOAD_PHASES = [
  { threshold: 0,  key: 'upload.phase.reading' },
  { threshold: 15, key: 'upload.phase.parsing' },
  { threshold: 35, key: 'upload.phase.foods' },
  { threshold: 55, key: 'upload.phase.meals' },
  { threshold: 75, key: 'upload.phase.finishing' },
  { threshold: 90, key: 'upload.phase.done' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DataUploadSheet({ open, onClose, onComplete }: DataUploadSheetProps) {
  const [mode, setMode] = useState<'choose' | 'text' | 'processing' | 'result'>('choose');
  // Default to FULL plan import so uploaded PDFs go through the complete
  // pipeline (plan + meals + shopping list + measurements + training),
  // which also enables auto-publish after processing.
  const [strategy, setStrategy] = useState<'foodsOnly' | 'full'>('full');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showMealCount, setShowMealCount] = useState(false);
  const [showImportProgress, setShowImportProgress] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [mergeStats, setMergeStats] = useState<{ foods: number; days: number; meals: number; newItems: string[] } | null>(null);
  const [lastUploadMode, setLastUploadMode] = useState<'merge' | 'overwrite' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useDataUpload();
  const { t } = useLanguage();

  // ─── Handlers ──────────────────────────────────────────────

  const startUpload = useCallback(async (file: File, modeOverride: 'merge' | 'overwrite') => {
    setSelectedFile(file);
    setMode('processing');
    setLastUploadMode(modeOverride);
    setShowImportProgress(true);

    // Haptic feedback
    hapticFeedback('light');

    if (strategy === 'foodsOnly' && 'uploadFileFoodsOnly' in upload) {
      // Gyors mód: csak étellista
      // @ts-ignore runtime check above
      await upload.uploadFileFoodsOnly(file);
    } else {
      // Teljes terv import a megadott móddal
      await upload.uploadFile(file, modeOverride);
    }
  }, [upload, strategy]);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);

    // Ellenőrizzük, hogy van-e már aktív étrendterv
    const activePlan = await NutritionPlanService.getActivePlan();

    if (activePlan) {
      try {
        const [days, meals, foodCount] = await Promise.all([
          NutritionPlanService.getMealDaysForPlan(activePlan.id),
          NutritionPlanService.getMealsForPlan(activePlan.id),
          FoodCatalogService.getFoodCount(),
        ]);

        setMergeStats({
          foods: foodCount,
          days: days.length,
          meals: meals.length,
          newItems: [],
        });
      } catch (err) {
        console.warn('[DataUploadSheet] Failed to load merge stats for active plan', err);
        setMergeStats(null);
      }
      setPendingFile(file);
      setShowMergeDialog(true);
    } else {
      await startUpload(file, 'overwrite');
    }
  }, [startUpload]);

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;
    setMode('processing');

    hapticFeedback('light');

    if (strategy === 'foodsOnly' && 'processTextFoodsOnly' in upload) {
      // Gyors mód: csak étellista
      // @ts-ignore runtime check above
      await upload.processTextFoodsOnly(textInput);
    } else {
      await upload.processText(textInput);
    }
  }, [textInput, upload, strategy]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleClose = useCallback(() => {
    if (upload.isProcessing) return; // Don't close while processing
    upload.reset();
    setMode('choose');
    setStrategy('foodsOnly');
    setTextInput('');
    setSelectedFile(null);
    onClose();
  }, [upload, onClose]);

  const handleDone = useCallback(() => {
    upload.reset();
    setMode('choose');
    setTextInput('');
    setSelectedFile(null);
    onComplete?.();
    onClose();
  }, [upload, onClose, onComplete]);

  const handleRetry = useCallback(() => {
    upload.reset();
    setMode('choose');
    setSelectedFile(null);
  }, [upload]);

  // ─── Toast for merge mode when new foods were added ─────────────
  useEffect(() => {
    if (
      lastUploadMode === 'merge' &&
      upload.step === 'complete' &&
      upload.result &&
      upload.result.newFoods > 0
    ) {
      const count = upload.result.newFoods;
      showToast(`${count} új étel hozzáadva a meglévő tervhez`);
      setLastUploadMode(null);
    }
  }, [lastUploadMode, upload.step, upload.result]);

  // ─── Auto-advance to result when complete ────────────────
  if (upload.step === 'complete' && mode === 'processing') {
    setTimeout(() => setMode('result'), 600);
  }
  if (upload.step === 'error' && mode === 'processing') {
    setTimeout(() => setMode('result'), 300);
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle + Header — full width, no border radius */}
            <div className="flex-shrink-0 w-full rounded-none m-0 pt-3 pb-2 px-4" style={{ width: '100%', borderRadius: 0, margin: 0 }}>
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                    <Upload className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-gray-900" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                      {t("upload.title")}
                    </h2>
                    <p className="text-[11px] text-gray-500">
                      {t("upload.aiProcessingBg")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={upload.isProcessing}
                  className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-colors touch-manipulation cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <AnimatePresence mode="wait">
                {mode === 'choose' && (
                  <motion.div
                    key="choose"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 pt-3"
                  >
                    <ChooseMode
                      onFileSelect={() => fileInputRef.current?.click()}
                      onTextMode={() => setMode('text')}
                      onDrop={handleDrop}
                      strategy={strategy}
                      onStrategyChange={setStrategy}
                    />
                  </motion.div>
                )}

                {mode === 'text' && (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 pt-3"
                  >
                    <TextInputMode
                      value={textInput}
                      onChange={setTextInput}
                      onSubmit={handleTextSubmit}
                      onBack={() => setMode('choose')}
                    />
                  </motion.div>
                )}

                {mode === 'processing' && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="pt-6"
                  >
                    <ProcessingView
                      step={upload.step}
                      progress={upload.progress}
                      fileName={selectedFile?.name || t("upload.text")}
                    />
                  </motion.div>
                )}

                {mode === 'result' && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="pt-3"
                  >
                    {upload.step === 'error' ? (
                      <ErrorView
                        error={upload.error || t("upload.unknownError")}
                        onRetry={handleRetry}
                        onClose={handleClose}
                      />
                    ) : (
                      <StagedSuccessView
                        planLabel={upload.result?.planLabel}
                        autoPublished={upload.result?.autoPublished}
                        warnings={upload.warnings}
                        onDone={handleDone}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileInputChange}
              className="hidden"
            />
          </motion.div>

          {showImportProgress && (
            <div className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-center">
              <SharedPremiumLoader
                progress={upload.progress ?? 0}
                phaseText={getPhaseText(upload.progress ?? 0, UPLOAD_PHASES, t)}
                subtext={t('upload.subtext') || 'A dietetikus étrendet feldolgozzuk...'}
                fullScreen={false}
              />
              {upload.step === 'complete' && (
                <button
                  onClick={() => {
                    setShowImportProgress(false);
                    if (strategy === 'foodsOnly') {
                      window.location.assign('/foods');
                    } else {
                      handleDone();
                    }
                  }}
                  className="mt-6 px-8 py-3 bg-primary text-white font-semibold rounded-2xl text-base"
                >
                  {t('common.continue') || 'Tovább'}
                </button>
              )}
              {upload.step === 'error' && (
                <div className="mt-6 text-center px-6">
                  <p className="text-sm text-red-500 mb-3">{upload.error || 'Hiba történt'}</p>
                  <button
                    onClick={() => setShowImportProgress(false)}
                    className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-2xl text-sm"
                  >
                    {t('common.back') || 'Vissza'}
                  </button>
                </div>
              )}
            </div>
          )}

          {showMergeDialog && (
            <MergeConflictDialog
              isOpen={showMergeDialog}
              current={mergeStats}
              next={null}
              newIngredients={mergeStats?.newItems || []}
              onOverwrite={() => {
                setShowMergeDialog(false);
                if (pendingFile) {
                  startUpload(pendingFile, 'overwrite');
                  setPendingFile(null);
                }
              }}
              onMerge={() => {
                setShowMergeDialog(false);
                if (pendingFile) {
                  startUpload(pendingFile, 'merge');
                  setPendingFile(null);
                }
              }}
              onCancel={() => {
                setShowMergeDialog(false);
                setPendingFile(null);
              }}
            />
          )}

          {showMealCount && (
            <MealIntervals
              onSave={() => {
                setShowMealCount(false);
              }}
              onClose={() => setShowMealCount(false)}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

/** Mode 1: Choose upload method — CLEAN (no feature grid) */
function ChooseMode({ onFileSelect, onTextMode, onDrop, strategy, onStrategyChange }: {
  onFileSelect: () => void;
  onTextMode: () => void;
  onDrop: (e: React.DragEvent) => void;
  strategy: 'foodsOnly' | 'full';
  onStrategyChange: (s: 'foodsOnly' | 'full') => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {/* AI Badge */}
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl border border-primary/20">
        <Brain className="w-4 h-4 text-purple-500" />
        <span className="text-xs text-purple-700" style={{ fontWeight: 600 }}>
          {t("upload.aiBadge")}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { setIsDragOver(false); onDrop(e); }}
        onClick={onFileSelect}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
        }`}
      >
        <motion.div
          animate={isDragOver ? { scale: 1.05, y: -4 } : { scale: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
            isDragOver
              ? 'bg-blue-100'
              : 'bg-gray-100'
          }`}>
            <FileUp className={`w-7 h-7 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
              {isDragOver ? t("upload.dropFile") : t("upload.selectFile")}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t("upload.dragOrTap")}
            </p>
          </div>
        </motion.div>

        {/* Supported formats */}
        <div className="flex items-center justify-center gap-3 mt-4">
          {[
            { icon: FileText, label: 'PDF', color: 'text-red-500' },
            { icon: FileText, label: 'Word', color: 'text-blue-500' },
            { icon: Image, label: t("upload.image"), color: 'text-purple-500' },
            { icon: FileText, label: t("upload.text"), color: 'text-green-500' },
          ].map((ft) => (
            <div key={ft.label} className="flex items-center gap-1">
              <ft.icon className={`w-3.5 h-3.5 ${ft.color}`} />
              <span className="text-2xs text-gray-500" style={{ fontWeight: 500 }}>
                {ft.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400" style={{ fontWeight: 500 }}>{t("upload.or")}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Mode toggle: Gyors vs. Teljes */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onStrategyChange('foodsOnly')}
          className={`flex-1 px-3 py-2 rounded-2xl text-xs border transition-colors ${
            strategy === 'foodsOnly'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-gray-50 text-gray-600'
          }`}
        >
          <span className="block font-semibold">Gyors mód</span>
          <span className="block text-2xs opacity-80">Csak étellista (3–5 mp)</span>
        </button>
        <button
          type="button"
          onClick={() => onStrategyChange('full')}
          className={`flex-1 px-3 py-2 rounded-2xl text-xs border transition-colors ${
            strategy === 'full'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-gray-50 text-gray-600'
          }`}
        >
          <span className="block font-semibold">Teljes mód</span>
          <span className="block text-2xs opacity-80">Étrend + bevásárlólista</span>
        </button>
      </div>

      {/* Text paste option */}
      <button
        onClick={onTextMode}
        className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <ClipboardPaste className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
            {t("upload.pasteText")}
          </p>
          <p className="text-[11px] text-gray-500">
            {t("upload.pasteTextDesc")}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}

/** Mode 2: Text input */
function TextInputMode({ value, onChange, onSubmit, onBack }: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
        <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
          {t("upload.textTitle")}
        </p>
      </div>

      {/* Hint */}
      <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-200/50">
        <Eye className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-blue-700 leading-relaxed">
          {t("upload.textHint")}
        </p>
      </div>

      {/* Text area */}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t("upload.textPlaceholder")}
        rows={10}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {value.length > 0 ? `${value.split('\n').filter(l => l.trim()).length} ${t("upload.lines")}` : t("upload.empty")}
        </span>
        <DSMButton
          variant="gradient"
          size="md"
          icon={Sparkles}
          onClick={onSubmit}
          disabled={value.trim().length < 10}
        >
          {t("upload.aiProcess")}
        </DSMButton>
      </div>
    </div>
  );
}

/** Mode 3: Processing animation */
function ProcessingView({ step, progress, fileName }: {
  step: UploadStep;
  progress: number;
  fileName: string;
}) {
  const { t } = useLanguage();
  const LOCALIZED_PIPELINE_STEPS: Array<{ step: UploadStep; icon: React.ElementType; label: string }> = [
    { step: 'reading_file', icon: FileText, label: t("upload.stepReadingFile") },
    { step: 'parsing', icon: Brain, label: t("upload.stepParsing") },
    { step: 'creating_plan', icon: Sparkles, label: t("upload.stepCreatingPlan") },
    { step: 'populating_foods', icon: Sparkles, label: t("upload.stepFoods") },
    { step: 'building_meals', icon: Sparkles, label: t("upload.stepMeals") },
    { step: 'generating_shopping', icon: Sparkles, label: t("upload.stepShopping") },
    { step: 'processing_measurements', icon: Sparkles, label: t("upload.stepMeasurements") },
    { step: 'processing_training', icon: Sparkles, label: t("upload.stepTraining") },
    { step: 'creating_versions', icon: Layers, label: t("upload.stepVersions") },
    { step: 'staging', icon: Layers, label: t("upload.stepStaging") },
  ];
  const currentIndex = LOCALIZED_PIPELINE_STEPS.findIndex(s => s.step === step);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Animated brain icon */}
      <motion.div
        animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-xl"
      >
        <Brain className="w-10 h-10 text-white" />
      </motion.div>

      {/* Title */}
      <div className="text-center">
        <p className="text-gray-900" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {t("upload.aiProcess")}
        </p>
        <p className="text-xs text-gray-500 mt-1">{fileName}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500" style={{ fontWeight: 600 }}>
            {LOCALIZED_PIPELINE_STEPS.find(s => s.step === step)?.label || t(STEP_LABELS[step])}
          </span>
          <span className="text-xs text-blue-600" style={{ fontWeight: 700 }}>
            {progress}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Pipeline steps */}
      <div className="w-full space-y-1.5">
        {LOCALIZED_PIPELINE_STEPS.map((ps, idx) => {
          const isActive = ps.step === step;
          const isDone = idx < currentIndex;
          const isPending = idx > currentIndex;

          return (
            <motion.div
              key={ps.step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: isPending ? 0.4 : 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                isActive
                  ? 'bg-blue-50 border border-blue-200'
                  : isDone
                  ? 'bg-gray-50'
                  : ''
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isDone ? 'bg-blue-100' :
                isActive ? 'bg-blue-500' :
                'bg-gray-100'
              }`}>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                ) : isActive ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <RotateCw className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                ) : (
                  <ps.icon className="w-3.5 h-3.5 text-gray-400" />
                )}
              </div>
              <span className={`text-xs ${
                isDone ? 'text-blue-700' :
                isActive ? 'text-blue-700' :
                'text-gray-400'
              }`} style={{ fontWeight: isActive || isDone ? 600 : 400 }}>
                {ps.label}
              </span>
              {isDone && (
                <span className="ml-auto text-2xs text-blue-500">✓</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Mode 4a: Success — CLEAN (no raw data preview) */
function StagedSuccessView({ planLabel, autoPublished, warnings, onDone }: {
  planLabel?: string;
  autoPublished?: boolean;
  warnings: string[];
  onDone: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4 py-2">
      {/* Success header */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, delay: 0.1 }}
        className="flex flex-col items-center gap-3 py-6"
      >
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <div className="text-center">
          <p className="text-gray-900" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {autoPublished ? t("profile.planPublished") : t("upload.processingDone")}
          </p>
          {planLabel && (
            <p className="text-xs text-gray-500 mt-1">
              {planLabel}
            </p>
          )}
        </div>

        {/* Status badge */}
        {autoPublished ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200" style={{ fontWeight: 600 }}>
            <Layers className="w-3 h-3" />
            {t("profile.planPublished")}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200" style={{ fontWeight: 600 }}>
            <Layers className="w-3 h-3" />
            {t("upload.stagingBadge")}
          </div>
        )}
      </motion.div>

      {/* Info hint */}
      {autoPublished ? (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 rounded-xl border border-blue-200/50">
          <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-blue-700 leading-relaxed">
            {t("profile.planPublished")} · {t("profile.active")}
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 rounded-xl border border-blue-200/50">
          <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-blue-700 leading-relaxed">
            {t("upload.stagingHint")}
          </p>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="px-3 py-2.5 bg-amber-50 rounded-xl border border-amber-200/50">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-amber-700" style={{ fontWeight: 600 }}>
              {t("upload.warnings")} ({warnings.length})
            </span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {warnings.slice(0, 3).map((w, i) => (
              <p key={i} className="text-[11px] text-amber-600">• {w}</p>
            ))}
            {warnings.length > 3 && (
              <p className="text-[11px] text-amber-500">{t("upload.andMore").replace('{n}', String(warnings.length - 3))}</p>
            )}
          </div>
        </div>
      )}

      {/* Done button */}
      <div className="pt-2">
        <DSMButton variant="gradient" size="lg" fullWidth icon={CheckCircle2} onClick={onDone}>
          {t("upload.close")}
        </DSMButton>
      </div>
    </div>
  );
}

/** Mode 4b: Error result */
function ErrorView({ error, onRetry, onClose }: {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center"
      >
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </motion.div>

      <div className="text-center">
        <p className="text-gray-900" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {t("upload.processingError")}
        </p>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">
          {error}
        </p>
      </div>

      <div className="flex gap-3 w-full pt-2">
        <DSMButton variant="outline" size="md" fullWidth onClick={onClose}>
          {t("upload.close")}
        </DSMButton>
        <DSMButton variant="primary" size="md" fullWidth icon={RotateCw} onClick={onRetry}>
          {t("upload.retry")}
        </DSMButton>
      </div>
    </div>
  );
}