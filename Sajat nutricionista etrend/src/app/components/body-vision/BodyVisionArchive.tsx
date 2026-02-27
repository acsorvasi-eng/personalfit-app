/**
 * BodyVisionArchive
 * Read-only archive list with:
 *  - Click on row → opens BodyVisionArchiveViewer (full read-only view)
 *  - Checkbox selection → compare front views from selected sessions
 *  - Delete button per row
 *  - No add/create modal — purely a list viewer
 */

import { useState } from "react";
import { Archive, X, Clock, Trash2, Eye, GitCompareArrows } from "lucide-react";
import type { ArchivedSession } from "./types";
import { BodyVisionArchiveViewer } from "./BodyVisionArchiveViewer";
import { BodyVisionCompare } from "./BodyVisionCompare";
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  sessions: ArchivedSession[];
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function BodyVisionArchive({ sessions, onDelete, onClose }: Props) {
  const { locale } = useLanguage();
  const [openSession, setOpenSession] = useState<ArchivedSession | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  if (sessions.length === 0) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedSessions = sessions.filter(s => selectedIds.has(s.id));

  // ---- Full-screen read-only viewer for a single session ----
  if (openSession) {
    return (
      <BodyVisionArchiveViewer
        session={openSession}
        onClose={() => setOpenSession(null)}
      />
    );
  }

  // ---- Comparison mode ----
  if (showCompare && selectedSessions.length >= 2) {
    return (
      <BodyVisionCompare
        sessions={selectedSessions}
        onClose={() => setShowCompare(false)}
      />
    );
  }

  // ---- Archive list ----
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-white" />
          <span className="text-white font-bold text-sm">Archivum</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size >= 2 && (
            <button
              onClick={() => setShowCompare(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/25 rounded-full text-white text-[11px] font-bold hover:bg-white/35 transition-all backdrop-blur-sm"
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
              <span>Osszehasonlitas ({selectedIds.size})</span>
            </button>
          )}
          <button onClick={onClose} className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Session list */}
      <div className="p-3 space-y-2 max-h-[420px] overflow-y-auto">
        {sessions.map((session) => {
          const d = new Date(session.date);
          const isChecked = selectedIds.has(session.id);

          return (
            <div
              key={session.id}
              className={`border rounded-xl overflow-hidden transition-all ${
                isChecked ? 'border-amber-300 bg-amber-50/40' : 'border-gray-100 bg-gray-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 p-3">
                {/* Checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(session.id); }}
                  className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    isChecked
                      ? 'bg-amber-500 border-amber-500'
                      : 'border-gray-300 bg-white hover:border-amber-400'
                  }`}
                >
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Clickable row content → opens full viewer */}
                <div
                  className="flex-1 min-w-0 cursor-pointer active:opacity-70"
                  onClick={() => setOpenSession(session)}
                >
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-900 truncate">{session.label}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 ml-[18px] mt-0.5">
                    {d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} &bull; {session.monthsInvested} ho
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2.5 text-[10px] font-bold flex-shrink-0">
                  <span className="text-green-600">-{session.fatLoss}%</span>
                  <span className="text-blue-600">+{session.muscleGain}%</span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenSession(session); }}
                    className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(session.id); selectedIds.delete(session.id); }}
                    className="w-7 h-7 rounded-lg bg-gray-100 text-red-400 flex items-center justify-center hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom hint when items selected */}
      {selectedIds.size === 1 && (
        <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 text-center">
          <span className="text-[11px] text-amber-700">Jelolj ki meg legalabb 1 munkamenetet az osszehasonlitashoz</span>
        </div>
      )}
    </div>
  );
}