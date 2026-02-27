/**
 * BodyVisionFullscreen
 * Fullscreen lightbox with zoom +/-, pinch-to-zoom,
 * pan, swipe rotation, and info overlay.
 */

import { X, Info, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { DSMIconButton } from "../dsm";
import { BodyVisionARImage } from "./BodyVisionARImage";
import { BodyVisionInfoPanel } from "./BodyVisionInfoPanel";

interface Props {
  currentLabel: string;
  warpedSrc: string;
  isProcessing: boolean;
  showColorOverlay: boolean;
  definitionOverlays: string[];
  hasWarped: boolean;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  showInfoOverlay: boolean;
  monthsInvested: number;
  weightLoss: number;
  fatLoss: number;
  muscleGain: number;
  netWeight: number;
  onClose: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleInfo: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function BodyVisionFullscreen({
  currentLabel, warpedSrc, isProcessing, showColorOverlay,
  definitionOverlays, hasWarped, zoomLevel, panOffset,
  showInfoOverlay, monthsInvested, weightLoss, fatLoss, muscleGain, netWeight,
  onClose, onRotateLeft, onRotateRight, onZoomIn, onZoomOut, onResetZoom,
  onToggleInfo, onTouchStart, onTouchMove, onTouchEnd,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-40 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,12px)] pb-2 bg-gradient-to-b from-black/70 to-transparent">
        <DSMIconButton icon={X} onClick={onClose} size="md" variant="default" />
        <div className="bg-white/10 backdrop-blur px-3 py-1 rounded-full">
          <span className="text-xs text-white/80">{currentLabel}</span>
        </div>
        <DSMIconButton icon={Info} onClick={onToggleInfo} size="md" variant={showInfoOverlay ? "active" : "default"} />
      </div>

      {/* Side arrows */}
      <button onClick={onRotateLeft} className="absolute left-2 top-1/2 -translate-y-1/2 z-40 w-10 h-10 bg-white/8 hover:bg-white/15 backdrop-blur rounded-full flex items-center justify-center transition-all">
        <ChevronLeft className="w-5 h-5 text-white/50" />
      </button>
      <button onClick={onRotateRight} className="absolute right-2 top-1/2 -translate-y-1/2 z-40 w-10 h-10 bg-white/8 hover:bg-white/15 backdrop-blur rounded-full flex items-center justify-center transition-all">
        <ChevronRight className="w-5 h-5 text-white/50" />
      </button>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        <div className="w-full h-full max-w-lg relative" style={{ touchAction: 'none' }}>
          <BodyVisionARImage
            warpedSrc={warpedSrc}
            isFullscreen={true}
            isProcessing={isProcessing}
            showOverlays={showColorOverlay}
            definitionOverlays={definitionOverlays}
            hasWarped={hasWarped}
            zoomLevel={zoomLevel}
            panOffset={panOffset}
          />
        </div>
        {showInfoOverlay && (
          <BodyVisionInfoPanel
            monthsInvested={monthsInvested}
            weightLoss={weightLoss}
            fatLoss={fatLoss}
            muscleGain={muscleGain}
            netWeight={netWeight}
            showColorOverlay={showColorOverlay}
            onClose={onToggleInfo}
          />
        )}
      </div>

      {/* Bottom zoom controls */}
      <div className="absolute bottom-0 inset-x-0 z-40 flex items-center justify-center gap-3 pb-[env(safe-area-inset-bottom,16px)] pt-2 bg-gradient-to-t from-black/70 to-transparent">
        <DSMIconButton icon={ZoomOut} onClick={onZoomOut} disabled={zoomLevel <= 1} variant="default" />
        <span className="text-[11px] text-white/50 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
        <DSMIconButton icon={ZoomIn} onClick={onZoomIn} disabled={zoomLevel >= 4} variant="default" />
        {zoomLevel > 1 && (
          <button onClick={onResetZoom} className="ml-2 px-3 py-1.5 bg-white/10 backdrop-blur rounded-full text-[10px] text-white/60">
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
