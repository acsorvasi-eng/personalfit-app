/**
 * BodyVisionARViewer
 * Main AR preview viewport with rotation arrows, info/fullscreen buttons,
 * swipe support, and the pre-generation placeholder.
 */

import { ChevronLeft, ChevronRight, Info, Maximize2, Sparkles, RotateCcw } from "lucide-react";
import { DSMIconButton } from "../dsm";
import { BodyVisionARImage } from "./BodyVisionARImage";
import { BodyVisionInfoPanel } from "./BodyVisionInfoPanel";

interface Props {
  hasGenerated: boolean;
  currentLabel: string;
  warpedSrc: string;
  isProcessing: boolean;
  showColorOverlay: boolean;
  definitionOverlays: string[];
  hasWarped: boolean;
  showInfoOverlay: boolean;
  monthsInvested: number;
  weightLoss: number;
  fatLoss: number;
  muscleGain: number;
  netWeight: number;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onToggleInfo: () => void;
  onOpenFullscreen: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function BodyVisionARViewer({
  hasGenerated, currentLabel, warpedSrc, isProcessing, showColorOverlay,
  definitionOverlays, hasWarped, showInfoOverlay, monthsInvested,
  weightLoss, fatLoss, muscleGain, netWeight,
  onRotateLeft, onRotateRight, onToggleInfo, onOpenFullscreen,
  onTouchStart, onTouchEnd,
}: Props) {
  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-lg">
      {hasGenerated ? (
        <div className="relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {/* Main AR view */}
          <div className="aspect-[3/4] relative overflow-hidden">
            <BodyVisionARImage
              warpedSrc={warpedSrc}
              isFullscreen={false}
              isProcessing={isProcessing}
              showOverlays={showColorOverlay}
              definitionOverlays={definitionOverlays}
              hasWarped={hasWarped}
              zoomLevel={1}
              panOffset={{ x: 0, y: 0 }}
            />

            {/* View label */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20">
              <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <span className="text-[10px] text-white/80 font-medium">{currentLabel}</span>
              </div>
            </div>

            {/* Arrows */}
            <button onClick={onRotateLeft} className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-black/20 hover:bg-black/40 backdrop-blur rounded-full flex items-center justify-center transition-all">
              <ChevronLeft className="w-4 h-4 text-white/60" />
            </button>
            <button onClick={onRotateRight} className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-black/20 hover:bg-black/40 backdrop-blur rounded-full flex items-center justify-center transition-all">
              <ChevronRight className="w-4 h-4 text-white/60" />
            </button>

            {/* Action buttons */}
            <div className="absolute bottom-[30%] right-2 z-20 flex flex-col gap-1.5">
              <DSMIconButton
                icon={Info}
                onClick={onToggleInfo}
                variant={showInfoOverlay ? "active" : "glass"}
                label="Info"
              />
              <DSMIconButton
                icon={Maximize2}
                onClick={onOpenFullscreen}
                variant="glass"
                label="Fullscreen"
              />
            </div>

            {/* Info overlay */}
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

          {/* Bottom hint */}
          <div className="flex items-center justify-center gap-1.5 py-2 bg-gray-900">
            <RotateCcw className="w-2.5 h-2.5 text-white/20" />
            <span className="text-[9px] text-white/20">Huzd oldalra a forgatashoz</span>
          </div>
        </div>
      ) : (
        <div className="aspect-[3/4] relative flex flex-col items-center justify-center p-8">
          <Sparkles className="w-14 h-14 text-purple-400/60 mb-4 animate-pulse" />
          <p className="text-white/80 text-center font-medium mb-0.5" style={{ fontSize: '0.95rem' }}>AR Modell Generalasa</p>
          <p className="text-white/30 text-center text-xs">Nyomd a lenti gombot az inditashoz</p>
        </div>
      )}
    </div>
  );
}
