/**
 * BodyVisionThumbnailCard
 * Individual photo thumbnail with validation badge,
 * long-press overlay for swap/delete actions.
 */

import { useRef } from "react";
import { Camera, RotateCw, AlertTriangle, X } from "lucide-react";
import { DSMBadge } from "../dsm";
import type { BodyImages, ValidationStatus } from "./types";
import { POSITION_LABELS } from "./types";
import { DSM_TOKENS } from "../dsm";

interface Props {
  position: keyof BodyImages;
  imageSrc: string;
  validationStatus: ValidationStatus;
  isLongPressed: boolean;
  onUploadClick: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  onRemove: () => void;
  onSwap: () => void;
}

export function BodyVisionThumbnailCard({
  position, imageSrc, validationStatus, isLongPressed,
  onUploadClick, onLongPressStart, onLongPressEnd, onRemove, onSwap,
}: Props) {
  const hasImage = !!imageSrc;
  const isInvalid = validationStatus === 'invalid';
  const isAnalyzing = validationStatus === 'analyzing';
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = () => {
    if (!hasImage) return;
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(DSM_TOKENS.haptics.longPress as number[]);
      onLongPressStart();
    }, 400);
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Validation badge
  const renderBadge = () => {
    if (isAnalyzing) return (
      <div className="absolute top-1 left-1 z-10">
        <DSMBadge variant="warning" pulse>
          <RotateCw className="w-2.5 h-2.5 text-yellow-900 animate-spin" />
        </DSMBadge>
      </div>
    );
    if (validationStatus === 'valid') return (
      <div className="absolute top-1 left-1 z-10">
        <DSMBadge variant="success">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </DSMBadge>
      </div>
    );
    if (isInvalid) return (
      <div className="absolute top-1 left-1 z-10">
        <DSMBadge variant="error">
          <AlertTriangle className="w-3 h-3 text-white" />
        </DSMBadge>
      </div>
    );
    return null;
  };

  return (
    <div>
      <div
        onClick={() => { if (isLongPressed) return; if (!hasImage) onUploadClick(); }}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        className={`aspect-[3/4] bg-gray-50 rounded-xl overflow-hidden border-2 transition-all relative select-none ${
          isInvalid ? 'border-red-300' : hasImage ? 'border-purple-300' : 'border-dashed border-gray-200 cursor-pointer hover:border-purple-400 hover:bg-purple-50/30'
        }`}
      >
        {hasImage ? (
          <>
            <img
              src={imageSrc}
              alt={position}
              className={`w-full h-full object-cover transition-all ${isAnalyzing ? 'opacity-50' : ''} ${isInvalid ? 'opacity-30 grayscale' : ''}`}
              draggable={false}
            />
            {isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <RotateCw className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
            {isInvalid && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/40">
                <AlertTriangle className="w-5 h-5 text-red-200" />
              </div>
            )}
            {renderBadge()}

            {/* Long press overlay */}
            {isLongPressed && (
              <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm flex items-center justify-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onSwap(); }}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                >
                  <Camera className="w-4.5 h-4.5 text-purple-600" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                >
                  <X className="w-4.5 h-4.5 text-white" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Camera className="w-5 h-5 text-gray-300 mb-0.5" />
            <span className="text-[8px] text-gray-400">{POSITION_LABELS[position].split(' ')[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
