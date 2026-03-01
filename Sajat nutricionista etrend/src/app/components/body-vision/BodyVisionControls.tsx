/**
 * BodyVisionControls
 * Time slider, AR toggle, generate button, and archive button.
 */

import { RotateCw, Sparkles, Archive } from "lucide-react";
import { DSMCard } from "../dsm";

interface Props {
  monthsInvested: number;
  onMonthsChange: (months: number) => void;
  showColorOverlay: boolean;
  onToggleOverlay: () => void;
  isGenerating: boolean;
  hasGenerated: boolean;
  onGenerate: () => void;
  onArchive: () => void;
}

export function BodyVisionControls({
  monthsInvested, onMonthsChange, showColorOverlay, onToggleOverlay,
  isGenerating, hasGenerated, onGenerate, onArchive,
}: Props) {
  return (
    <DSMCard>
      {/* Slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Idoszak</span>
            <span className="text-sm font-bold text-purple-600">{monthsInvested} ho</span>
          </div>
          <button
            onClick={onToggleOverlay}
            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${showColorOverlay ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}
          >
            AR {showColorOverlay ? 'BE' : 'KI'}
          </button>
        </div>
        <input
          type="range"
          min="1"
          max="12"
          value={monthsInvested}
          onChange={(e) => onMonthsChange(Number(e.target.value))}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <div className="flex justify-between text-[9px] text-gray-300 mt-1 px-0.5">
          {[1, 3, 6, 9, 12].map(m => <span key={m}>{m}</span>)}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3.5 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow flex items-center justify-center gap-2.5 disabled:opacity-50"
      >
        {isGenerating ? (
          <><RotateCw className="w-5 h-5 animate-spin" /><span>Generalas...</span></>
        ) : (
          <><Sparkles className="w-5 h-5" /><span>{hasGenerated ? 'Frissites' : 'AR Generalas'}</span></>
        )}
      </button>

      {/* Archive button */}
      {hasGenerated && (
        <button
          onClick={onArchive}
          className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
        >
          <Archive className="w-4 h-4" /><span>Archivalas & Uj Munkamenet</span>
        </button>
      )}
    </DSMCard>
  );
}
