/**
 * BodyVisionInfoPanel
 * Stats overlay panel with glass-morphism, showing
 * weight loss, muscle gain, body fat %, net weight, waist reduction.
 */

import { X } from "lucide-react";
import { DSMGlassPanel, DSMStatCard } from "../dsm";

interface Props {
  monthsInvested: number;
  weightLoss: number;
  fatLoss: number;
  muscleGain: number;
  netWeight: number;
  showColorOverlay: boolean;
  onClose: () => void;
}

export function BodyVisionInfoPanel({
  monthsInvested, weightLoss, fatLoss, muscleGain, netWeight,
  showColorOverlay, onClose,
}: Props) {
  return (
    <DSMGlassPanel onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-white/60 uppercase tracking-wider">
          {monthsInvested} honap &middot; Elorejelzes
        </span>
        <button onClick={onClose} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-3 h-3 text-white/60" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <DSMStatCard value={`-${weightLoss} kg`} label="Zsirvezstes" color="text-green-400" />
        <DSMStatCard value={`+${muscleGain} kg`} label="Izomepites" color="text-blue-400" />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <DSMStatCard value={`-${fatLoss}%`} label="Testzsir %" color="text-emerald-400" fontSize="0.95rem" />
        <DSMStatCard
          value={`${netWeight > 0 ? '+' : ''}${netWeight.toFixed(1)} kg`}
          label="Netto suly"
          color="text-purple-400"
          fontSize="0.95rem"
        />
        <DSMStatCard value={`-${Math.round(weightLoss * 1.0)} cm`} label="Derekboseg" color="text-amber-400" fontSize="0.95rem" />
      </div>

      <div className="px-1 pt-1 border-t border-white/5">
        <div className="text-[8px] text-white/25 text-center">
          Kaloria-deficit alapu becslés · nem garancia
        </div>
      </div>
    </DSMGlassPanel>
  );
}