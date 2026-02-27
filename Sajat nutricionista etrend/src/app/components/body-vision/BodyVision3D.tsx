/**
 * BodyVision3D - Main Orchestrator
 *
 * Composes all BodyVision sub-components:
 *   - BodyVisionUploadGrid  (photo upload with validation)
 *   - BodyVisionARViewer    (AR preview viewport)
 *   - BodyVisionFullscreen  (fullscreen lightbox)
 *   - BodyVisionControls    (slider + generate)
 *   - BodyVisionArchive     (archived sessions)
 *   - BodyVisionStatsPanel  (stats overlay)
 *   - ar-engine             (canvas liquify warp)
 *   - skin-detection        (AI skin analysis)
 *   - useBodyPrediction     (AI body prediction)
 *
 * All state management lives here and is passed down via props.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { Archive, ShieldAlert } from "lucide-react";
import { DSMSubPageHeader, DSMCard, DSMNotification, DSMInput } from "../dsm";
import { BodyVisionUploadGrid } from "./BodyVisionUploadGrid";
import { BodyVisionARViewer } from "./BodyVisionARViewer";
import { BodyVisionFullscreen } from "./BodyVisionFullscreen";
import { BodyVisionControls } from "./BodyVisionControls";
import { BodyVisionArchive } from "./BodyVisionArchive";
import { BodyVisionStatsPanel } from "./BodyVisionStatsPanel";
import { processBodyTransform, getDefinitionOverlays } from "./ar-engine";
import { analyzeSkinContent } from "./skin-detection";
import { useBodyPrediction } from "../../hooks/useBodyPrediction";
import type { BodyImages, ImageValidation, ArchivedSession, ViewType } from "./types";
import { POSITIONS, POSITION_LABELS } from "./types";

export function BodyVision3D() {
  const navigate = useNavigate();

  // ========== STATE ==========
  const [bodyImages, setBodyImages] = useState<BodyImages>(() => {
    const s = localStorage.getItem('bodyVision3D');
    return s ? JSON.parse(s) : { front: '', side: '', back: '', sideAlt: '' };
  });

  const [imageValidation, setImageValidation] = useState<ImageValidation>(() => {
    const s = localStorage.getItem('bodyVision3D');
    if (s) {
      const imgs = JSON.parse(s) as BodyImages;
      return {
        front: imgs.front ? 'valid' : 'pending',
        side: imgs.side ? 'valid' : 'pending',
        back: imgs.back ? 'valid' : 'pending',
        sideAlt: imgs.sideAlt ? 'valid' : 'pending',
      };
    }
    return { front: 'pending', side: 'pending', back: 'pending', sideAlt: 'pending' };
  });

  const [rejectedPositions, setRejectedPositions] = useState<Set<keyof BodyImages>>(new Set());
  const [monthsInvested, setMonthsInvested] = useState(3);
  const [showColorOverlay, setShowColorOverlay] = useState(true);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(() => localStorage.getItem('bodyVisionGenerated') === 'true');

  // UI states
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [longPressedPosition, setLongPressedPosition] = useState<keyof BodyImages | null>(null);

  // Warped images cache
  const [warpedImages, setWarpedImages] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Archive state
  const [archivedSessions, setArchivedSessions] = useState<ArchivedSession[]>(() => {
    const s = localStorage.getItem('bodyVisionArchive');
    return s ? JSON.parse(s) : [];
  });
  const [showArchive, setShowArchive] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveLabel, setArchiveLabel] = useState('');

  // Touch refs
  const touchStartX = useRef<number | null>(null);
  const lastPinchDist = useRef<number | null>(null);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);

  // ========== DERIVED ==========
  const getCurrentImage = () => {
    switch (rotationAngle) {
      case 0: return bodyImages.front; case 90: return bodyImages.side;
      case 180: return bodyImages.back; case 270: return bodyImages.sideAlt;
      default: return bodyImages.front;
    }
  };

  const getCurrentLabel = () => {
    switch (rotationAngle) {
      case 0: return 'Elolnezet'; case 90: return 'Jobb oldal';
      case 180: return 'Hatulnezet'; case 270: return 'Bal oldal';
      default: return 'Elolnezet';
    }
  };

  const getCurrentView = (): ViewType => {
    switch (rotationAngle) {
      case 0: return 'front'; case 90: return 'side';
      case 180: return 'back'; case 270: return 'sideAlt';
      default: return 'front';
    }
  };

  const allImagesValid = POSITIONS.every(p => imageValidation[p] === 'valid');
  const allImagesUploaded = !!(bodyImages.front && bodyImages.side && bodyImages.back && bodyImages.sideAlt);
  const canProceed = allImagesUploaded && allImagesValid;
  const anyImageUploaded = !!(bodyImages.front || bodyImages.side || bodyImages.back || bodyImages.sideAlt);
  const hasAnyRejected = rejectedPositions.size > 0;
  const validCount = POSITIONS.filter(p => imageValidation[p] === 'valid').length;
  const currentView = getCurrentView();

  // ========== PREDICTION ENGINE ==========
  const prediction = useBodyPrediction({ forecastMonths: monthsInvested });

  // Stats from prediction engine (scientifically calculated)
  const getWeightLoss = () => prediction.predictedFatLossKg;
  const getFatLoss = () => Math.abs(prediction.predictedBodyFatPctChange);
  const getMuscleGain = () => prediction.predictedMuscleGainKg;
  const getWeightChange = () => prediction.predictedNetWeightChangeKg;

  const definitionOverlays = getDefinitionOverlays(monthsInvested, currentView, prediction.warpProgress);
  const warpKey = `${currentView}-${monthsInvested}-${prediction.warpProgress.toFixed(4)}`;
  const currentImage = getCurrentImage();
  const warpedSrc = warpedImages[warpKey] || currentImage;
  const hasWarped = hasGenerated && !!warpedImages[warpKey];

  // ========== EFFECTS ==========
  useEffect(() => {
    if (!hasGenerated) return;
    if (!currentImage) return;
    if (warpedImages[warpKey]) return;
    const timer = setTimeout(() => {
      setIsProcessing(true);
      processBodyTransform(currentImage, currentView, monthsInvested, 800, prediction.warpProgress).then((result) => {
        setWarpedImages(prev => ({ ...prev, [warpKey]: result }));
        setIsProcessing(false);
      });
    }, 120);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGenerated, currentView, monthsInvested, bodyImages, prediction.warpProgress]);

  // ========== HANDLERS ==========
  const validateImage = useCallback(async (base64: string, position: keyof BodyImages) => {
    setImageValidation(prev => ({ ...prev, [position]: 'analyzing' }));
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    const result = await analyzeSkinContent(base64);
    if (result.isSemiNaked) {
      setImageValidation(prev => ({ ...prev, [position]: 'valid' }));
      setRejectedPositions(prev => { const n = new Set(prev); n.delete(position); return n; });
    } else {
      setImageValidation(prev => ({ ...prev, [position]: 'invalid' }));
      setRejectedPositions(prev => new Set(prev).add(position));
    }
  }, []);

  const handleImageUpload = useCallback(async (file: File, position: keyof BodyImages) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const updated = { ...bodyImages, [position]: base64 };
      setBodyImages(updated);
      localStorage.setItem('bodyVision3D', JSON.stringify(updated));
      await validateImage(base64, position);
    };
    reader.readAsDataURL(file);
  }, [bodyImages, validateImage]);

  const handleRemoveImage = (position: keyof BodyImages) => {
    const updated = { ...bodyImages, [position]: '' };
    setBodyImages(updated);
    localStorage.setItem('bodyVision3D', JSON.stringify(updated));
    setImageValidation(prev => ({ ...prev, [position]: 'pending' }));
    setRejectedPositions(prev => { const n = new Set(prev); n.delete(position); return n; });
    if (hasGenerated) { setHasGenerated(false); localStorage.removeItem('bodyVisionGenerated'); setWarpedImages({}); }
  };

  const handleResetAll = () => {
    setBodyImages({ front: '', side: '', back: '', sideAlt: '' });
    localStorage.setItem('bodyVision3D', JSON.stringify({ front: '', side: '', back: '', sideAlt: '' }));
    setImageValidation({ front: 'pending', side: 'pending', back: 'pending', sideAlt: 'pending' });
    setRejectedPositions(new Set());
    setHasGenerated(false);
    localStorage.removeItem('bodyVisionGenerated');
    setWarpedImages({});
    setShowResetConfirm(false);
    setRotationAngle(0);
  };

  const handleArchiveSession = () => {
    const session: ArchivedSession = {
      id: Date.now().toString(), date: new Date().toISOString(),
      bodyImages: { ...bodyImages }, monthsInvested,
      fatLoss: getFatLoss(), muscleGain: getMuscleGain(), weightChange: getWeightChange(),
      label: archiveLabel.trim() || `Munkamenet ${archivedSessions.length + 1}`,
    };
    const updated = [session, ...archivedSessions];
    setArchivedSessions(updated);
    localStorage.setItem('bodyVisionArchive', JSON.stringify(updated));
    handleResetAll();
    setShowArchiveConfirm(false);
    setArchiveLabel('');
  };

  const handleDeleteArchived = (id: string) => {
    const updated = archivedSessions.filter(s => s.id !== id);
    setArchivedSessions(updated);
    localStorage.setItem('bodyVisionArchive', JSON.stringify(updated));
  };

  const handleGenerate3D = () => {
    setIsGenerating(true);
    setWarpedImages({});
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
      localStorage.setItem('bodyVisionGenerated', 'true');
    }, 2500);
  };

  const rotateLeft = () => setRotationAngle((p) => (p - 90 + 360) % 360);
  const rotateRight = () => setRotationAngle((p) => (p + 90) % 360);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      if (fullscreenMode && zoomLevel > 1) {
        lastPanPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }
    if (e.touches.length === 2 && fullscreenMode) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && fullscreenMode && lastPinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / lastPinchDist.current;
      setZoomLevel(z => Math.max(1, Math.min(4, z * scale)));
      lastPinchDist.current = dist;
    }
    if (e.touches.length === 1 && fullscreenMode && zoomLevel > 1 && lastPanPos.current) {
      const dx = e.touches[0].clientX - lastPanPos.current.x;
      const dy = e.touches[0].clientY - lastPanPos.current.y;
      setPanOffset(p => ({ x: p.x + dx, y: p.y + dy }));
      lastPanPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    lastPinchDist.current = null;
    lastPanPos.current = null;
    if (touchStartX.current !== null && !fullscreenMode) {
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(diff) > 50) { diff > 0 ? rotateLeft() : rotateRight(); }
    }
    if (touchStartX.current !== null && fullscreenMode && zoomLevel <= 1) {
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(diff) > 50) { diff > 0 ? rotateLeft() : rotateRight(); }
    }
    touchStartX.current = null;
  };

  const openFullscreen = () => { setFullscreenMode(true); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); };
  const closeFullscreen = () => { setFullscreenMode(false); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); setShowInfoOverlay(false); };

  // ========== FULLSCREEN MODE ==========
  if (fullscreenMode) {
    return (
      <BodyVisionFullscreen
        currentLabel={getCurrentLabel()}
        warpedSrc={warpedSrc}
        isProcessing={isProcessing}
        showColorOverlay={showColorOverlay}
        definitionOverlays={definitionOverlays}
        hasWarped={hasWarped}
        zoomLevel={zoomLevel}
        panOffset={panOffset}
        showInfoOverlay={showInfoOverlay}
        monthsInvested={monthsInvested}
        weightLoss={getWeightLoss()}
        fatLoss={getFatLoss()}
        muscleGain={getMuscleGain()}
        netWeight={getWeightChange()}
        onClose={closeFullscreen}
        onRotateLeft={rotateLeft}
        onRotateRight={rotateRight}
        onZoomIn={() => setZoomLevel(z => Math.min(4, z + 0.5))}
        onZoomOut={() => setZoomLevel(z => Math.max(1, z - 0.5))}
        onResetZoom={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
        onToggleInfo={() => setShowInfoOverlay(!showInfoOverlay)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 pb-24">
      {/* Header */}
      <DSMSubPageHeader
        title="AR Test Vizio"
        onBack={() => navigate('/profile')}
        action={archivedSessions.length > 0 ? (
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="relative w-9 h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25 transition-all"
          >
            <Archive className="w-4.5 h-4.5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-400 text-[8px] font-bold text-gray-900 rounded-full flex items-center justify-center">
              {archivedSessions.length}
            </span>
          </button>
        ) : undefined}
      />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Archive */}
        {showArchive && (
          <BodyVisionArchive
            sessions={archivedSessions}
            onDelete={handleDeleteArchived}
            onClose={() => setShowArchive(false)}
          />
        )}

        {/* Upload Grid */}
        <BodyVisionUploadGrid
          bodyImages={bodyImages}
          imageValidation={imageValidation}
          hasGenerated={hasGenerated}
          anyImageUploaded={anyImageUploaded}
          hasAnyRejected={hasAnyRejected}
          longPressedPosition={longPressedPosition}
          onSetLongPressed={setLongPressedPosition}
          onUpload={handleImageUpload}
          onRemove={handleRemoveImage}
          onShowArchiveConfirm={() => setShowArchiveConfirm(true)}
          onShowResetConfirm={() => setShowResetConfirm(true)}
          showResetConfirm={showResetConfirm}
          onResetAll={handleResetAll}
          onCancelReset={() => setShowResetConfirm(false)}
          validCount={validCount}
        />

        {/* Archive confirm notification */}
        <DSMNotification
          open={showArchiveConfirm}
          onClose={() => { setShowArchiveConfirm(false); setArchiveLabel(''); }}
          variant="confirm"
          position="top"
          icon={Archive}
          title="Archivalas"
          message="Add meg a munkamenet nevet a mentes elott."
          onConfirm={archiveLabel.trim() ? handleArchiveSession : undefined}
          confirmLabel="Mentes"
          cancelLabel="Megse"
          confirmVariant="warning"
        >
          <DSMInput
            value={archiveLabel}
            onChange={setArchiveLabel}
            placeholder={`Munkamenet ${archivedSessions.length + 1}`}
            autoFocus
            className="border-2 border-amber-400 focus:ring-amber-500 focus:border-amber-500 mb-0"
          />
        </DSMNotification>

        {/* AR Viewer */}
        {canProceed && (
          <BodyVisionARViewer
            hasGenerated={hasGenerated}
            currentLabel={getCurrentLabel()}
            warpedSrc={warpedSrc}
            isProcessing={isProcessing}
            showColorOverlay={showColorOverlay}
            definitionOverlays={definitionOverlays}
            hasWarped={hasWarped}
            showInfoOverlay={showInfoOverlay}
            monthsInvested={monthsInvested}
            weightLoss={getWeightLoss()}
            fatLoss={getFatLoss()}
            muscleGain={getMuscleGain()}
            netWeight={getWeightChange()}
            onRotateLeft={rotateLeft}
            onRotateRight={rotateRight}
            onToggleInfo={() => setShowInfoOverlay(!showInfoOverlay)}
            onOpenFullscreen={openFullscreen}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        )}

        {/* Controls */}
        {canProceed && (
          <BodyVisionControls
            monthsInvested={monthsInvested}
            onMonthsChange={setMonthsInvested}
            showColorOverlay={showColorOverlay}
            onToggleOverlay={() => setShowColorOverlay(!showColorOverlay)}
            isGenerating={isGenerating}
            hasGenerated={hasGenerated}
            onGenerate={handleGenerate3D}
            onArchive={() => setShowArchiveConfirm(true)}
          />
        )}

        {/* Prediction Stats Panel - science-based results */}
        {canProceed && hasGenerated && (
          <BodyVisionStatsPanel
            prediction={prediction}
            monthsInvested={monthsInvested}
          />
        )}

        {/* Blocked state */}
        {allImagesUploaded && !allImagesValid && !POSITIONS.some(p => imageValidation[p] === 'analyzing') && (
          <DSMCard border="border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">AI elemzes blokkolva</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Csereld ki a visszautasitott kepeket</p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {POSITIONS.filter(p => imageValidation[p] === 'invalid').map(p => (
                <button key={p} className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-[10px] font-medium border border-red-200 hover:bg-red-100">
                  {POSITION_LABELS[p]}
                </button>
              ))}
            </div>
          </DSMCard>
        )}
      </div>
    </div>
  );
}