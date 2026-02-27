/**
 * ProfileHeader
 *
 * Uses the same standard PageHeader layout as every other page
 * (icon + title + subtitle + stats). Identical height and style.
 *
 * Now supports:
 * - Clickable avatar (triggers file upload → AvatarEditor)
 * - Inline-editable name (tap to edit, Enter/blur saves, Escape cancels)
 * - Inline-editable age (tap to edit)
 */

import React, { useState, useRef, useEffect } from "react";
import { User, Camera } from "lucide-react";
import { PageHeader } from "./PageHeader";

interface ProfileHeaderProps {
  name: string;
  age: number;
  consumed: number;
  dailyTarget: number;
  workoutCalories: number;
  avatar?: string;
  onNavigateBodyVision: () => void;
  onNameSave?: (name: string) => void;
  onAgeSave?: (age: number) => void;
  onAvatarClick?: () => void;
}

export function ProfileHeader({
  name,
  age,
  consumed,
  dailyTarget,
  workoutCalories,
  avatar,
  onNavigateBodyVision,
  onNameSave,
  onAgeSave,
  onAvatarClick,
}: ProfileHeaderProps) {
  const adjustedAllowance = dailyTarget + workoutCalories;

  // ─── Avatar element ────────────────────────────────────────────
  const avatarElement = (
    <button
      onClick={onAvatarClick}
      className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-white/20 backdrop-blur-sm border border-white/10 flex items-center justify-center group cursor-pointer"
      aria-label="Profilkép módosítása"
    >
      {avatar ? (
        <img
          src={avatar}
          alt="Profilkép"
          className="w-full h-full object-cover"
        />
      ) : (
        <User className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
      )}
      {/* Camera overlay on hover */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
        <Camera className="w-4 h-4 text-white" />
      </div>
    </button>
  );

  // ─── Title element (editable name + age) ───────────────────────
  const titleElement = (
    <div className="flex-1 min-w-0">
      <InlineEditableText
        value={name || "Felhasználó"}
        placeholder="Felhasználó"
        onSave={(v) => onNameSave?.(v)}
        className="text-white truncate"
        isTitle
      />
      <InlineEditableText
        value={age > 0 ? `${age} éves` : "Profil"}
        placeholder="Kor"
        onSave={(v) => {
          // Parse out the number from something like "32 éves" or just "32"
          const num = parseInt(v.replace(/[^\d]/g, ""), 10);
          if (!isNaN(num) && num > 0) onAgeSave?.(num);
        }}
        rawValue={age > 0 ? String(age) : ""}
        suffix=" éves"
        className="text-white/80 text-xs sm:text-sm mt-0.5 truncate"
        isTitle={false}
      />
    </div>
  );

  return (
    <PageHeader
      iconElement={avatarElement}
      title={name || "Felhasználó"}
      titleElement={titleElement}
      gradientFrom="from-blue-400"
      gradientVia="via-teal-500"
      gradientTo="to-blue-500"
      stats={[
        {
          label: `${consumed} / ${adjustedAllowance} kcal`,
          value: consumed,
          suffix: "kcal",
        },
        {
          label: "3D Test Vízió",
          value: "AI",
          isAction: true,
          onClick: onNavigateBodyVision,
        },
      ]}
    />
  );
}

// ─── InlineEditableText ──────────────────────────────────────────────
/** Tap-to-edit text field for the header. Renders as plain text; on tap opens an input. */
function InlineEditableText({
  value,
  placeholder,
  onSave,
  className,
  isTitle,
  rawValue,
  suffix,
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  className?: string;
  isTitle: boolean;
  rawValue?: string;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(rawValue ?? value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(rawValue ?? value);
  }, [value, rawValue, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== (rawValue ?? value)) {
      onSave(suffix ? trimmed : trimmed);
      if (navigator.vibrate) navigator.vibrate(10);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(rawValue ?? value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type={rawValue !== undefined ? "number" : "text"}
          inputMode={rawValue !== undefined ? "numeric" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          onBlur={commit}
          className={`bg-white/20 backdrop-blur-sm rounded-lg px-2 py-0.5 outline-none border border-white/30 ${
            isTitle ? "text-base sm:text-lg" : "text-xs sm:text-sm"
          } text-white placeholder-white/50 ${
            rawValue !== undefined ? "w-16" : "w-full max-w-[180px]"
          }`}
          style={{ fontWeight: isTitle ? 700 : 400 }}
          placeholder={placeholder}
        />
        {suffix && rawValue !== undefined && (
          <span
            className="text-white/80 text-xs sm:text-sm"
            style={{ fontWeight: 400 }}
          >
            {suffix}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`block text-left cursor-pointer hover:bg-white/10 active:bg-white/15 rounded-lg px-1 -mx-1 py-0.5 transition-colors ${className}`}
      style={isTitle ? { fontWeight: 700, fontSize: undefined } : undefined}
      aria-label={`${placeholder} szerkesztése`}
    >
      {isTitle ? <h1 className="text-white truncate">{value}</h1> : value}
    </button>
  );
}
