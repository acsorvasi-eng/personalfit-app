/**
 * BodyVisionArchiveViewer
 * Full read-only viewer for a single archived session.
 * Shows all 4 views with rotation, stats, no editing.
 */

import { useState, useRef } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Camera } from "lucide-react";
import type { ArchivedSession, ViewType } from "./types";
import { POSITIONS, POSITION_LABELS } from "./types";
import { DSMPrivacyStrip, DSMStatCard } from "../dsm";
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  session: ArchivedSession;
  onClose: () => void;
}

export function BodyVisionArchiveViewer({ session, onClose }: Props) {
  const { locale } = useLanguage();
  const [currentView, setCurrentView] = useState<'front' | 'back'>('front');
  const touchStartX = useRef<number | null>(null);
  const d = new Date(session.date);

  const currentImage = session.bodyImages[activeView];

  const rotateLeft = () => {
    const idx = POSITIONS.indexOf(activeView);
    setActiveView(POSITIONS[(idx - 1 + POSITIONS.length) % POSITIONS.length]);
  };
  const rotateRight = () => {
    const idx = POSITIONS.indexOf(activeView);
    setActiveView(POSITIONS[(idx + 1) % POSITIONS.length]);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(diff) > 50) { diff > 0 ? rotateLeft() : rotateRight(); }
    }
    touchStartX.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top,12px)] pb-3 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold truncate" style={{ fontSize: '1rem' }}>{session.label}</h2>
          <div className="flex items-center gap-1.5 text-white/40 text-[10px]">
            <Clock className="w-3 h-3" />
            <span>{d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>&bull;</span>
            <span>{session.monthsInvested} honap</span>
          </div>
        </div>
      </div>

      {/* Main image */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentImage ? (
          <div className="w-full h-full max-w-lg relative">
            <img
              src={currentImage}
              alt={POSITION_LABELS[activeView]}
              className="w-full h-full object-cover"
              draggable={false}
            />
            <DSMPrivacyStrip />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-white/30">
            <Camera className="w-12 h-12" />
            <span className="text-sm">Nincs kep</span>
          </div>
        )}

        {/* View label */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <span className="text-[10px] text-white/80 font-medium">{POSITION_LABELS[activeView]}</span>
          </div>
        </div>

        {/* Rotation arrows */}
        <button onClick={rotateLeft} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/8 hover:bg-white/15 backdrop-blur rounded-full flex items-center justify-center transition-all">
          <ChevronLeft className="w-5 h-5 text-white/50" />
        </button>
        <button onClick={rotateRight} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/8 hover:bg-white/15 backdrop-blur rounded-full flex items-center justify-center transition-all">
          <ChevronRight className="w-5 h-5 text-white/50" />
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="bg-black/80 border-t border-white/5 px-4 py-3">
        <div className="flex gap-2 justify-center mb-3">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setActiveView(pos)}
              className={`w-14 h-[72px] rounded-lg overflow-hidden border-2 transition-all ${
                activeView === pos ? 'border-amber-400 scale-105' : 'border-white/10 opacity-60'
              }`}
            >
              {session.bodyImages[pos] ? (
                <img src={session.bodyImages[pos]} alt={pos} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Camera className="w-3 h-3 text-gray-600" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          <DSMStatCard value={`-${session.fatLoss}%`} label="Zsirvezstes" color="text-green-400" fontSize="0.95rem" />
          <DSMStatCard value={`+${session.muscleGain}%`} label="Izomepites" color="text-blue-400" fontSize="0.95rem" />
          <DSMStatCard
            value={`${session.weightChange > 0 ? '+' : ''}${session.weightChange.toFixed(1)} kg`}
            label="Netto suly"
            color="text-purple-400"
            fontSize="0.95rem"
          />
        </div>
      </div>
    </div>
  );
}