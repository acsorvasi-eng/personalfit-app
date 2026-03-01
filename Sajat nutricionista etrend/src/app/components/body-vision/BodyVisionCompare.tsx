/**
 * BodyVisionCompare
 * Side-by-side comparison of front views from all selected
 * archived sessions. Shows each session's front photo with
 * date and stats overlay, scrollable horizontally or in a grid.
 */

import { useLanguage } from '../../contexts/LanguageContext';
import { useState } from "react";
import { ArrowLeft, Camera, Clock, ChevronLeft, ChevronRight, Grid2x2, GalleryHorizontal } from "lucide-react";
import type { ArchivedSession, ViewType } from "./types";
import { POSITIONS, POSITION_LABELS } from "./types";
import { DSMPrivacyStrip } from "../dsm";

interface Props {
  sessions: ArchivedSession[];
  onClose: () => void;
}

export function BodyVisionCompare({ sessions, onClose }: Props) {
  const { locale } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'scroll'>('scroll');
  const [activeView, setActiveView] = useState<ViewType>('front');

  // Sort sessions by date
  const sorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top,12px)] pb-3 bg-gradient-to-b from-black/80 to-transparent z-10">
        <button onClick={onClose} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold" style={{ fontSize: '1rem' }}>Osszehasonlitas</h2>
          <span className="text-white/40 text-[10px]">{sorted.length} munkamenet &bull; {POSITION_LABELS[activeView]}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('scroll')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === 'scroll' ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/40'}`}
          >
            <GalleryHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/40'}`}
          >
            <Grid2x2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View selector tabs */}
      <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => setActiveView(pos)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
              activeView === pos
                ? 'bg-amber-500 text-white'
                : 'bg-white/8 text-white/40 hover:bg-white/15'
            }`}
          >
            {POSITION_LABELS[pos]}
          </button>
        ))}
      </div>

      {/* Comparison content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'scroll' ? (
          /* ---- Horizontal scroll mode ---- */
          <div className="h-full flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-4">
            {sorted.map((session) => {
              const img = session.bodyImages[activeView];
              const d = new Date(session.date);
              return (
                <div
                  key={session.id}
                  className="flex-shrink-0 w-[75vw] max-w-[320px] snap-center flex flex-col"
                >
                  {/* Image */}
                  <div className="flex-1 rounded-2xl overflow-hidden relative border border-white/10 bg-gray-900">
                    {img ? (
                      <>
                        <img src={img} alt={activeView} className="w-full h-full object-cover" draggable={false} />
                        <DSMPrivacyStrip />
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-2 min-h-[300px]">
                        <Camera className="w-10 h-10" />
                        <span className="text-xs">Nincs kep</span>
                      </div>
                    )}

                    {/* Date overlay */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                        <div className="text-[10px] text-white/90 font-bold">{session.label}</div>
                        <div className="text-[9px] text-white/50 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats strip */}
                  <div className="flex items-center justify-center gap-4 py-2.5 mt-1">
                    <div className="text-center">
                      <div className="text-green-400 font-bold text-xs">-{session.fatLoss}%</div>
                      <div className="text-white/25 text-[8px]">zsir</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-400 font-bold text-xs">+{session.muscleGain}%</div>
                      <div className="text-white/25 text-[8px]">izom</div>
                    </div>
                    <div className="text-center">
                      <div className="text-amber-400 font-bold text-xs">{session.monthsInvested} ho</div>
                      <div className="text-white/25 text-[8px]">idoszak</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ---- Grid mode ---- */
          <div className={`h-full overflow-y-auto px-4 pb-4 grid gap-2 ${
            sorted.length <= 2 ? 'grid-cols-2' : sorted.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
          }`}>
            {sorted.map((session) => {
              const img = session.bodyImages[activeView];
              const d = new Date(session.date);
              return (
                <div key={session.id} className="flex flex-col">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden relative border border-white/10 bg-gray-900">
                    {img ? (
                      <>
                        <img src={img} alt={activeView} className="w-full h-full object-cover" draggable={false} />
                        {/* Compact date tag */}
                        <div className="absolute top-1.5 left-1.5 z-10 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                          <span className="text-[8px] text-white/80 font-bold">{session.label}</span>
                        </div>
                        {/* Compact stats */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4">
                          <div className="flex items-center justify-center gap-2 text-[8px] font-bold">
                            <span className="text-green-400">-{session.fatLoss}%</span>
                            <span className="text-blue-400">+{session.muscleGain}%</span>
                          </div>
                          <div className="text-center text-[7px] text-white/30 mt-0.5">
                            {d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} &bull; {session.monthsInvested} ho
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/15">
                        <Camera className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation hint */}
      <div className="flex items-center justify-center gap-3 pb-[env(safe-area-inset-bottom,16px)] pt-2 bg-gradient-to-t from-black/70 to-transparent">
        {viewMode === 'scroll' && (
          <div className="flex items-center gap-2 text-white/20 text-[10px]">
            <ChevronLeft className="w-3 h-3" />
            <span>Huzd oldalra a lapozashoz</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        )}
        {viewMode === 'grid' && (
          <div className="flex gap-1.5">
            {sorted.map((s, i) => (
              <div key={s.id} className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}