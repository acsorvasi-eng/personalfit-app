/**
 * BodyVisionUploadGrid
 * 4-photo upload grid with validation, long-press actions,
 * progress bar, hints, and DSMNotification floating confirm.
 */

import { useRef } from "react";
import { Camera, Trash2, Archive, ShieldAlert, AlertTriangle } from "lucide-react";
import { DSMCard, DSMSectionTitle, DSMHint, DSMProgressBar, DSMNotification } from "../dsm";
import { BodyVisionThumbnailCard } from "./BodyVisionThumbnailCard";
import type { BodyImages, ImageValidation } from "./types";
import { POSITIONS, POSITION_LABELS } from "./types";

interface Props {
  bodyImages: BodyImages;
  imageValidation: ImageValidation;
  hasGenerated: boolean;
  anyImageUploaded: boolean;
  hasAnyRejected: boolean;
  longPressedPosition: keyof BodyImages | null;
  onSetLongPressed: (pos: keyof BodyImages | null) => void;
  onUpload: (file: File, position: keyof BodyImages) => void;
  onRemove: (position: keyof BodyImages) => void;
  onShowArchiveConfirm: () => void;
  onShowResetConfirm: () => void;
  showResetConfirm: boolean;
  onResetAll: () => void;
  onCancelReset: () => void;
  validCount: number;
}

export function BodyVisionUploadGrid({
  bodyImages, imageValidation, hasGenerated, anyImageUploaded, hasAnyRejected,
  longPressedPosition, onSetLongPressed, onUpload, onRemove,
  onShowArchiveConfirm, onShowResetConfirm,
  showResetConfirm, onResetAll, onCancelReset, validCount,
}: Props) {
  const frontRef = useRef<HTMLInputElement>(null);
  const sideRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const sideAltRef = useRef<HTMLInputElement>(null);

  const inputRefs: Record<keyof BodyImages, React.RefObject<HTMLInputElement | null>> = {
    front: frontRef, side: sideRef, back: backRef, sideAlt: sideAltRef,
  };

  return (
    <>
      {/* Floating delete confirmation notification */}
      <DSMNotification
        open={showResetConfirm}
        onClose={onCancelReset}
        variant="confirm"
        position="top"
        icon={Trash2}
        title="Kepek torlese"
        message={`Biztosan torlod?${hasGenerated ? ' Az eredmenyek is elvesznek.' : ''}`}
        onConfirm={onResetAll}
        confirmLabel="Torles"
        cancelLabel="Megse"
        confirmVariant="danger"
      />

      <DSMCard>
        <DSMSectionTitle
          icon={Camera}
          iconColor="text-purple-600"
          title="Fotok feltoltese"
          action={anyImageUploaded ? (
            <div className="flex items-center gap-1.5">
              {hasGenerated && (
                <button onClick={onShowArchiveConfirm} className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 hover:bg-amber-100">
                  <Archive className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={onShowResetConfirm} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center border border-red-200 hover:bg-red-100">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : undefined}
          className="mb-3"
        />

        {/* Hints */}
        <DSMHint
          icon={ShieldAlert}
          text="Felmeztelen vagy szoros ruhazatu fotok szuksegesek az AI elemzeshez"
          variant="info"
          className="mb-3"
        />
        {hasAnyRejected && (
          <DSMHint icon={AlertTriangle} text="Csereld ki a nem megfelelo fotokat" variant="error" className="mb-3" />
        )}

        {/* Grid */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {POSITIONS.map((position) => (
            <div key={position}>
              <BodyVisionThumbnailCard
                position={position}
                imageSrc={bodyImages[position]}
                validationStatus={imageValidation[position]}
                isLongPressed={longPressedPosition === position}
                onUploadClick={() => inputRefs[position].current?.click()}
                onLongPressStart={() => onSetLongPressed(position)}
                onLongPressEnd={() => onSetLongPressed(null)}
                onRemove={() => { onRemove(position); onSetLongPressed(null); }}
                onSwap={() => { inputRefs[position].current?.click(); onSetLongPressed(null); }}
              />
              <input
                ref={inputRefs[position]}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { e.target.files?.[0] && onUpload(e.target.files[0], position); onSetLongPressed(null); }}
              />
            </div>
          ))}
        </div>

        {/* Dismiss long press on tap outside */}
        {longPressedPosition && (
          <div className="fixed inset-0 z-10" onClick={() => onSetLongPressed(null)} />
        )}

        {/* Progress */}
        <DSMProgressBar
          value={validCount}
          max={4}
          color={hasAnyRejected ? "bg-red-400" : "bg-purple-500"}
          showLabel
          label={`${validCount}/4`}
        />
      </DSMCard>
    </>
  );
}
