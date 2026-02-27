/**
 * BodyVisionARImage
 * Renders the canvas-warped AR image with optional muscle
 * definition overlays and privacy strip.
 */

import { RotateCw } from "lucide-react";
import { DSMPrivacyStrip } from "../dsm";

interface Props {
  warpedSrc: string;
  isFullscreen: boolean;
  isProcessing: boolean;
  showOverlays: boolean;
  definitionOverlays: string[];
  hasWarped: boolean;
  zoomLevel: number;
  panOffset: { x: number; y: number };
}

export function BodyVisionARImage({
  warpedSrc, isFullscreen, isProcessing, showOverlays,
  definitionOverlays, hasWarped, zoomLevel, panOffset,
}: Props) {
  return (
    <>
      <img
        src={warpedSrc}
        alt="AR View"
        className="w-full h-full object-cover transition-all duration-500 ease-out"
        style={{
          ...(isFullscreen && zoomLevel !== 1 ? {
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            translate: zoomLevel > 1 ? `${panOffset.x}px ${panOffset.y}px` : undefined,
          } : {}),
        }}
        draggable={false}
      />

      {/* Processing spinner */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-10">
          <div className="bg-black/60 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <RotateCw className="w-4 h-4 text-purple-300 animate-spin" />
            <span className="text-xs text-white/70">Feldolgozas...</span>
          </div>
        </div>
      )}

      {/* Muscle definition overlays */}
      {showOverlays && hasWarped && definitionOverlays.length > 0 && (
        <div className="absolute inset-0 pointer-events-none transition-all duration-700" style={{
          background: definitionOverlays.join(','),
          mixBlendMode: 'multiply',
        }} />
      )}

      <DSMPrivacyStrip />
    </>
  );
}
