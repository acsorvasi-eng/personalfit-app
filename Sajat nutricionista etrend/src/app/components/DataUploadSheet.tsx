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

import { useState, useRef, useCallback } from 'react';
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

const FILE_TYPE_INFO = [
  { icon: FileText, label: 'PDF', ext: '.pdf', color: 'text-red-500' },
  { icon: FileText, label: 'Word', ext: '.doc/.docx', color: 'text-blue-500' },
  { icon: Image, label: 'Kép', ext: '.jpg/.png', color: 'text-purple-500' },
  { icon: FileText, label: 'Szöveg', ext: '.txt', color: 'text-green-500' },
];

// ═══════════════════════════════════════════════════════════════
// PIPELINE STEPS for Processing View
// ═══════════════════════════════════════════════════════════════

const PIPELINE_STEPS: Array<{ step: UploadStep; icon: React.ElementType; label: string }> = [
  { step: 'reading_file', icon: FileText, label: 'Fájl beolvasása' },
  { step: 'parsing', icon: Brain, label: 'AI elemzés' },
  { step: 'creating_plan', icon: Sparkles, label: 'Terv létrehozása' },
  { step: 'populating_foods', icon: Sparkles, label: 'Élelmiszerek' },
  { step: 'building_meals', icon: Sparkles, label: 'Étkezések' },
  { step: 'generating_shopping', icon: Sparkles, label: 'Bevásárlólista' },
  { step: 'processing_measurements', icon: Sparkles, label: 'Mérések' },
  { step: 'processing_training', icon: Sparkles, label: 'Edzésterv' },
  { step: 'creating_versions', icon: Layers, label: 'Verzió mentés' },
  { step: 'staging', icon: Layers, label: 'Staging' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DataUploadSheet({ open, onClose, onComplete }: DataUploadSheetProps) {
  const [mode, setMode] = useState<'choose' | 'text' | 'processing' | 'result'>('choose');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useDataUpload();
  const { t } = useLanguage();

  // ─── Handlers ──────────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setMode('processing');

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate([10, 20]);

    await upload.uploadFile(file);
  }, [upload]);

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;
    setMode('processing');

    if (navigator.vibrate) navigator.vibrate([10, 20]);

    await upload.processText(textInput);
  }, [textInput, upload]);

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
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] bg-white dark:bg-[#1E1E1E] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle + Header */}
            <div className="flex-shrink-0 pt-3 pb-2 px-5">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <Upload className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-gray-900 dark:text-gray-100" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                      {t("upload.title")}
                    </h2>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {t("upload.aiProcessingBg")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={upload.isProcessing}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#252525] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] disabled:opacity-30 transition-colors"
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
        </>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

/** Mode 1: Choose upload method — CLEAN (no feature grid) */
function ChooseMode({ onFileSelect, onTextMode, onDrop }: {
  onFileSelect: () => void;
  onTextMode: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {/* AI Badge */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-500/10 dark:to-blue-500/10 rounded-xl border border-purple-200/50 dark:border-purple-500/20">
        <Brain className="w-4 h-4 text-purple-500 dark:text-purple-400" />
        <span className="text-xs text-purple-700 dark:text-purple-300" style={{ fontWeight: 600 }}>
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
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500'
            : 'border-gray-200 dark:border-[#2a2a2a] hover:border-blue-300 dark:hover:border-blue-500/40 hover:bg-gray-50 dark:hover:bg-[#252525]'
        }`}
      >
        <motion.div
          animate={isDragOver ? { scale: 1.05, y: -4 } : { scale: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
            isDragOver
              ? 'bg-blue-100 dark:bg-blue-500/20'
              : 'bg-gray-100 dark:bg-[#252525]'
          }`}>
            <FileUp className={`w-7 h-7 ${isDragOver ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} />
          </div>
          <div>
            <p className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 600 }}>
              {isDragOver ? t("upload.dropFile") : t("upload.selectFile")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
              <span className="text-[10px] text-gray-500 dark:text-gray-400" style={{ fontWeight: 500 }}>
                {ft.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200 dark:bg-[#2a2a2a]" />
        <span className="text-xs text-gray-400 dark:text-gray-500" style={{ fontWeight: 500 }}>{t("upload.or")}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-[#2a2a2a]" />
      </div>

      {/* Text paste option */}
      <button
        onClick={onTextMode}
        className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#252525] rounded-2xl border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
          <ClipboardPaste className="w-5 h-5 text-blue-500 dark:text-blue-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 600 }}>
            {t("upload.pasteText")}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {t("upload.pasteTextDesc")}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
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
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#252525] flex items-center justify-center text-gray-500 dark:text-gray-400"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
        <p className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 600 }}>
          {t("upload.textTitle")}
        </p>
      </div>

      {/* Hint */}
      <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200/50 dark:border-blue-500/20">
        <Eye className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
          {t("upload.textHint")}
        </p>
      </div>

      {/* Text area */}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t("upload.textPlaceholder")}
        rows={10}
        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-[#2a2a2a] rounded-2xl text-sm bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 resize-none"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">
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
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-xl"
      >
        <Brain className="w-10 h-10 text-white" />
      </motion.div>

      {/* Title */}
      <div className="text-center">
        <p className="text-gray-900 dark:text-gray-100" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {t("upload.aiProcess")}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{fileName}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400" style={{ fontWeight: 600 }}>
            {LOCALIZED_PIPELINE_STEPS.find(s => s.step === step)?.label || STEP_LABELS[step]}
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400" style={{ fontWeight: 700 }}>
            {progress}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-[#252525] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-400 to-teal-500 rounded-full"
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
                  ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20'
                  : isDone
                  ? 'bg-gray-50 dark:bg-[#252525]'
                  : ''
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isDone ? 'bg-blue-100 dark:bg-blue-500/20' :
                isActive ? 'bg-blue-500' :
                'bg-gray-100 dark:bg-[#252525]'
              }`}>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                ) : isActive ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <RotateCw className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                ) : (
                  <ps.icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <span className={`text-xs ${
                isDone ? 'text-blue-700 dark:text-blue-400' :
                isActive ? 'text-blue-700 dark:text-blue-400' :
                'text-gray-400 dark:text-gray-500'
              }`} style={{ fontWeight: isActive || isDone ? 600 : 400 }}>
                {ps.label}
              </span>
              {isDone && (
                <span className="ml-auto text-[10px] text-blue-500 dark:text-blue-400">✓</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Mode 4a: Staged success — CLEAN (no raw data preview) */
function StagedSuccessView({ planLabel, warnings, onDone }: {
  planLabel?: string;
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
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <div className="text-center">
          <p className="text-gray-900 dark:text-gray-100" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {t("upload.processingDone")}
          </p>
          {planLabel && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {planLabel}
            </p>
          )}
        </div>

        {/* Staged badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20" style={{ fontWeight: 600 }}>
          <Layers className="w-3 h-3" />
          {t("upload.stagingBadge")}
        </div>
      </motion.div>

      {/* Info hint */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200/50 dark:border-blue-500/20">
        <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
          {t("upload.stagingHint")}
        </p>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="px-3 py-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200/50 dark:border-amber-500/20">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-amber-700 dark:text-amber-400" style={{ fontWeight: 600 }}>
              {t("upload.warnings")} ({warnings.length})
            </span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {warnings.slice(0, 3).map((w, i) => (
              <p key={i} className="text-[11px] text-amber-600 dark:text-amber-400/80">• {w}</p>
            ))}
            {warnings.length > 3 && (
              <p className="text-[11px] text-amber-500 dark:text-amber-500/80">{t("upload.andMore").replace('{n}', String(warnings.length - 3))}</p>
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
        className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center"
      >
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </motion.div>

      <div className="text-center">
        <p className="text-gray-900 dark:text-gray-100" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {t("upload.processingError")}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
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