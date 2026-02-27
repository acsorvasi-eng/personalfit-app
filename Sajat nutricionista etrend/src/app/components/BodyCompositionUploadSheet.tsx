/**
 * ====================================================================
 * BodyCompositionUploadSheet — Bottom Sheet for Body Comp / GMON Upload
 * ====================================================================
 * Optional upload: Body Composition Analyzer or GMON Report.
 * Extracts: Weight, Fat%, Muscle Mass, BMI, Visceral Fat,
 * Segmental analysis, GMON-specific metrics.
 *
 * Entry point: Profile → Settings → Upload Section → Optional
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Image, X, ChevronDown,
  CheckCircle2, AlertTriangle, Sparkles, FileUp,
  ClipboardPaste, ArrowRight, RotateCw,
  Activity, Ruler, Brain, Scale, Heart,
  Eye, Zap, BarChart3, Scan
} from 'lucide-react';
import { useBodyCompositionUpload, BODY_COMP_STEP_LABELS, type BodyCompStep } from '../hooks/useBodyCompositionUpload';
import { DSMButton } from './dsm';
import { useLanguage } from '../contexts/LanguageContext';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface BodyCompositionUploadSheetProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

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
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function BodyCompositionUploadSheet({ open, onClose, onComplete }: BodyCompositionUploadSheetProps) {
  const [mode, setMode] = useState<'choose' | 'text' | 'processing' | 'result'>('choose');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const upload = useBodyCompositionUpload();

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setMode('processing');
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
    if (upload.isProcessing) return;
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

  // Auto-advance
  if (upload.step === 'complete' && mode === 'processing') {
    setTimeout(() => setMode('result'), 600);
  }
  if (upload.step === 'error' && mode === 'processing') {
    setTimeout(() => setMode('result'), 300);
  }

  const FILE_TYPE_INFO = [
    { icon: FileText, label: 'PDF', color: 'text-red-500' },
    { icon: FileText, label: 'Word', color: 'text-blue-500' },
    { icon: Image, label: t('bodyCompUpload.fileTypeImage'), color: 'text-purple-500' },
    { icon: FileText, label: t('bodyCompUpload.fileTypeText'), color: 'text-green-500' },
  ];

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
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                    <Scan className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-gray-900 dark:text-gray-100" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                      {t('bodyCompUpload.title')}
                    </h2>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {t('bodyCompUpload.subtitle')}
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
                    <ChooseBodyCompMode
                      onFileSelect={() => fileInputRef.current?.click()}
                      onTextMode={() => setMode('text')}
                      onDrop={handleDrop}
                      fileTypeInfo={FILE_TYPE_INFO}
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
                      fileName={selectedFile?.name || t('bodyCompUpload.textModeLabel')}
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
                        error={upload.error || t('bodyCompUpload.unknownError')}
                        onRetry={handleRetry}
                        onClose={handleClose}
                      />
                    ) : upload.result ? (
                      <ResultView result={upload.result} onDone={handleDone} />
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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

function ChooseBodyCompMode({ onFileSelect, onTextMode, onDrop, fileTypeInfo }: {
  onFileSelect: () => void;
  onTextMode: () => void;
  onDrop: (e: React.DragEvent) => void;
  fileTypeInfo: Array<{ icon: React.ElementType; label: string; color: string }>;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {/* Info tooltip */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-500/10 dark:to-indigo-500/10 rounded-xl border border-purple-200/50 dark:border-purple-500/20">
        <Scan className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-purple-700 dark:text-purple-300 leading-relaxed">
          {t('bodyCompUpload.infoText')}
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { setIsDragOver(false); onDrop(e); }}
        onClick={onFileSelect}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-purple-400 bg-purple-50 dark:bg-purple-500/10 dark:border-purple-500'
            : 'border-gray-200 dark:border-[#2a2a2a] hover:border-purple-300 dark:hover:border-purple-500/40 hover:bg-gray-50 dark:hover:bg-[#252525]'
        }`}
      >
        <motion.div
          animate={isDragOver ? { scale: 1.05, y: -4 } : { scale: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
            isDragOver
              ? 'bg-purple-100 dark:bg-purple-500/20'
              : 'bg-gray-100 dark:bg-[#252525]'
          }`}>
            <FileUp className={`w-7 h-7 ${isDragOver ? 'text-purple-500' : 'text-gray-400 dark:text-gray-500'}`} />
          </div>
          <div>
            <p className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 600 }}>
              {isDragOver ? t('bodyCompUpload.dropFile') : t('bodyCompUpload.selectReport')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('bodyCompUpload.reportSubtitle')}
            </p>
          </div>
        </motion.div>

        <div className="flex items-center justify-center gap-3 mt-4">
          {fileTypeInfo.map((ft) => (
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
        <span className="text-xs text-gray-400 dark:text-gray-500" style={{ fontWeight: 500 }}>{t('bodyCompUpload.or')}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-[#2a2a2a]" />
      </div>

      {/* Text paste */}
      <button
        onClick={onTextMode}
        className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#252525] rounded-2xl border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
          <ClipboardPaste className="w-5 h-5 text-purple-500 dark:text-purple-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 600 }}>
            {t('bodyCompUpload.pasteData')}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {t('bodyCompUpload.pasteDataDesc')}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
      </button>

      {/* What gets extracted */}
      <div className="space-y-2 pt-1">
        <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>
          {t('bodyCompUpload.whatAiExtracts')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ExtractFeature icon={Scale} label={t('bodyCompUpload.weightBmi')} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10" />
          <ExtractFeature icon={Activity} label={t('bodyCompUpload.bodyFatPct')} color="text-orange-500" bg="bg-orange-50 dark:bg-orange-500/10" />
          <ExtractFeature icon={Zap} label={t('bodyCompUpload.muscleMassLabel')} color="text-green-500" bg="bg-green-50 dark:bg-green-500/10" />
          <ExtractFeature icon={BarChart3} label={t('bodyCompUpload.visceralFat')} color="text-red-500" bg="bg-red-50 dark:bg-red-500/10" />
          <ExtractFeature icon={Ruler} label={t('bodyCompUpload.segmental')} color="text-purple-500" bg="bg-purple-50 dark:bg-purple-500/10" />
          <ExtractFeature icon={Heart} label={t('bodyCompUpload.gmonOrgans')} color="text-pink-500" bg="bg-pink-50 dark:bg-pink-500/10" />
        </div>
      </div>
    </div>
  );
}

function ExtractFeature({ icon: Icon, label, color, bg }: {
  icon: React.ElementType; label: string; color: string; bg: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${bg}`}>
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-xs text-gray-700 dark:text-gray-300" style={{ fontWeight: 500 }}>{label}</span>
    </div>
  );
}

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
          {t('bodyCompUpload.bodyCompData')}
        </p>
      </div>

      <div className="flex items-start gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200/50 dark:border-purple-500/20">
        <Eye className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-purple-700 dark:text-purple-300 leading-relaxed">
          {t('bodyCompUpload.pasteHint')}{' '}
          {t('bodyCompUpload.aiRecognizes')}
        </p>
      </div>

      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t('bodyCompUpload.placeholder')}
        rows={8}
        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-[#2a2a2a] rounded-2xl text-sm bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-500/30 focus:border-purple-400 dark:focus:border-purple-500 resize-none"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {value.length > 0 ? `${value.split('\n').filter(l => l.trim()).length} ${t('bodyCompUpload.linesCount')}` : t('bodyCompUpload.emptyLabel')}
        </span>
        <DSMButton
          variant="gradient"
          size="md"
          icon={Sparkles}
          onClick={onSubmit}
          disabled={value.trim().length < 10}
        >
          {t('bodyCompUpload.aiProcess')}
        </DSMButton>
      </div>
    </div>
  );
}

function ProcessingView({ step, progress, fileName }: {
  step: BodyCompStep;
  progress: number;
  fileName: string;
}) {
  const { t } = useLanguage();
  const PIPELINE_STEPS: Array<{ step: BodyCompStep; icon: React.ElementType; label: string }> = [
    { step: 'reading_file', icon: FileText, label: t('bodyCompUpload.stepReadingFile') },
    { step: 'detecting_type', icon: Scan, label: t('bodyCompUpload.stepDetectType') },
    { step: 'extracting_metrics', icon: Activity, label: t('bodyCompUpload.stepExtractMetrics') },
    { step: 'parsing_segmental', icon: BarChart3, label: t('bodyCompUpload.stepSegmental') },
    { step: 'parsing_gmon', icon: Heart, label: t('bodyCompUpload.stepGmon') },
    { step: 'mapping_measurements', icon: Ruler, label: t('bodyCompUpload.stepMapping') },
    { step: 'updating_engine', icon: Zap, label: t('bodyCompUpload.stepEngine') },
    { step: 'creating_version', icon: Sparkles, label: t('bodyCompUpload.stepVersion') },
  ];

  const currentIndex = PIPELINE_STEPS.findIndex(s => s.step === step);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <motion.div
        animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-xl"
      >
        <Scan className="w-10 h-10 text-white" />
      </motion.div>

      <div className="text-center">
        <p className="text-gray-900 dark:text-gray-100" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {t('bodyCompUpload.analysisTitle')}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{fileName}</p>
      </div>

      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400" style={{ fontWeight: 600 }}>
            {BODY_COMP_STEP_LABELS[step]}
          </span>
          <span className="text-xs text-purple-600 dark:text-purple-400" style={{ fontWeight: 700 }}>
            {progress}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-[#252525] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="w-full space-y-1.5">
        {PIPELINE_STEPS.map((ps, idx) => {
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
                  ? 'bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20'
                  : isDone
                  ? 'bg-gray-50 dark:bg-[#252525]'
                  : ''
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isDone ? 'bg-purple-100 dark:bg-purple-500/20' :
                isActive ? 'bg-purple-500' :
                'bg-gray-100 dark:bg-[#252525]'
              }`}>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                ) : isActive ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <RotateCw className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                ) : (
                  <ps.icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <span className={`text-xs ${
                isDone ? 'text-purple-700 dark:text-purple-400' :
                isActive ? 'text-purple-700 dark:text-purple-400' :
                'text-gray-400 dark:text-gray-500'
              }`} style={{ fontWeight: isActive || isDone ? 600 : 400 }}>
                {ps.label}
              </span>
              {isDone && (
                <span className="ml-auto text-[10px] text-purple-500 dark:text-purple-400">✓</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ResultView({ result, onDone }: {
  result: NonNullable<ReturnType<typeof useBodyCompositionUpload>['result']>;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4 py-2">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, delay: 0.1 }}
        className="flex flex-col items-center gap-3 py-4"
      >
        <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-purple-500" />
        </div>
        <div className="text-center">
          <p className="text-gray-900 dark:text-gray-100" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {t('bodyCompUpload.importSuccess')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {result.hasGmon ? t('bodyCompUpload.gmonPlusComp') : t('bodyCompUpload.compAnalysis')}
          </p>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
          result.confidence >= 0.8
            ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
        }`} style={{ fontWeight: 600 }}>
          <Sparkles className="w-3 h-3" />
          {t('bodyCompUpload.aiConfidence')}: {Math.round(result.confidence * 100)}%
        </div>
      </motion.div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2">
        {result.weight != null && (
          <MetricCard icon={Scale} label={t('bodyCompUpload.weightLabel')} value={`${result.weight}`} unit="kg" color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10" />
        )}
        {result.bodyFat != null && (
          <MetricCard icon={Activity} label={t('bodyCompUpload.bodyFatLabel')} value={`${result.bodyFat}`} unit="%" color="text-orange-500" bg="bg-orange-50 dark:bg-orange-500/10" />
        )}
        {result.muscleMass != null && (
          <MetricCard icon={Zap} label={t('bodyCompUpload.muscleMassResult')} value={`${result.muscleMass}`} unit="kg" color="text-green-500" bg="bg-green-50 dark:bg-green-500/10" />
        )}
        {result.bmi != null && (
          <MetricCard icon={BarChart3} label="BMI" value={`${result.bmi}`} unit="" color="text-purple-500" bg="bg-purple-50 dark:bg-purple-500/10" />
        )}
        {result.visceralFat != null && (
          <MetricCard icon={Heart} label={t('bodyCompUpload.visceralLabel')} value={`${result.visceralFat}`} unit="" color="text-red-500" bg="bg-red-50 dark:bg-red-500/10" />
        )}
        <MetricCard
          icon={result.hasSegmental ? CheckCircle2 : Ruler}
          label={t('bodyCompUpload.segmental')}
          value={result.hasSegmental ? '✓' : '—'}
          unit=""
          color="text-teal-500"
          bg="bg-teal-50 dark:bg-teal-500/10"
        />
      </div>

      {result.hasGmon && (
        <div className="px-3 py-2.5 bg-pink-50 dark:bg-pink-500/10 rounded-xl border border-pink-200/50 dark:border-pink-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4 text-pink-500" />
            <span className="text-xs text-pink-700 dark:text-pink-400" style={{ fontWeight: 600 }}>
              {t('bodyCompUpload.gmonImported')}
            </span>
          </div>
          <p className="text-[11px] text-pink-600 dark:text-pink-400/80">
            {t('bodyCompUpload.gmonDetails')}
          </p>
        </div>
      )}

      <div className="pt-2">
        <DSMButton variant="gradient" size="lg" fullWidth icon={CheckCircle2} onClick={onDone}>
          {t('bodyCompUpload.doneButton')}
        </DSMButton>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, unit, color, bg }: {
  icon: React.ElementType; label: string; value: string; unit: string; color: string; bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center border border-transparent`}>
      <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
      <div className="text-lg text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>
        {value}{unit && <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-0.5">{unit}</span>}
      </div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

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
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{error}</p>
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