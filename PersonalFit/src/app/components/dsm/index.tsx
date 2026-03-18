/**
 * ====================================================================
 * DSM - Design System Manager
 * ====================================================================
 * Centralized design system for the entire application.
 * All recurring UI elements, design tokens, and reusable primitives
 * are defined here. Modify this file to update the entire app.
 *
 * SECTIONS:
 *   1. Design Tokens (colors, fonts, spacing, shadows, etc.)
 *   2. Primitive Components (Card, Button, Input, Badge, etc.)
 *   3. Layout Components (BottomNav, WaterTracker)
 *   4. Composite Components (Modal, ConfirmDialog, GlassPanel, etc.)
 *   5. Re-exports (PageHeader, SearchBar, TabFilter)
 *   6. Atoms & Molecules
 * ====================================================================
 */

import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useLanguage } from "../../contexts/LanguageContext";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Apple, UtensilsCrossed, ShoppingCart, User, Dumbbell,
  X, ChevronLeft, ChevronRight, RotateCw,
  AlertTriangle, Camera, Eye, Trash2, Archive, Info,
  Maximize2, ZoomIn, ZoomOut, CheckCircle2, Bell, XCircle,
  Droplets
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "../PageHeader";
import { WaterService } from "../../backend/services/WaterService";
import { getUserProfile } from "../../backend/services/UserProfileService";

// ====================================================================
// 1. DESIGN TOKENS
// ====================================================================
// Modify these constants to change the entire app's visual foundation.
// They reference CSS custom properties from theme.css where applicable.
// ====================================================================

export const DSM_TOKENS = {
  colors: {
    primary:      '#2563EB',
    primaryHover: '#1D4ED8',
    primaryLight: '#EFF6FF',
    success:      '#10B981',
    warning:      '#F59E0B',
    error:        '#EF4444',
    gray900:      '#0F172A',
    gray600:      '#475569',
    gray400:      '#94A3B8',
    gray200:      '#E2E8F0',
    gray100:      '#F1F5F9',
    gray50:       '#F8FAFC',
    white:        '#FFFFFF',
  },
  fonts: {
    heading: "'Outfit', sans-serif",
    body:    "'Inter', sans-serif",
  },
  spacing: {
    xs: '4px', sm: '8px', md: '12px', lg: '16px',
    xl: '20px', '2xl': '24px', '3xl': '32px', '4xl': '48px',
  },
  radius: {
    sm: '8px', md: '12px', lg: '16px', xl: '20px',
    '2xl': '24px', full: '9999px',
  },
  shadows: {
    sm:      '0 1px 3px rgba(0,0,0,0.06)',
    md:      '0 4px 6px rgba(0,0,0,0.08)',
    primary: '0 4px 14px rgba(37,99,235,0.25)',
  },
  /** @deprecated no-op — kept for backward compatibility */
  haptics: {
    /** @deprecated vibration pattern for long press — kept for backward compatibility */
    longPress: [15, 30, 50] as number[],
  },
} as const;

// ====================================================================
// 2. PRIMITIVE COMPONENTS
// ====================================================================

// --- DSMCard ---
interface DSMCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  /** @deprecated no-op — kept for backward compatibility */
  padding?: string;
  /** @deprecated no-op — kept for backward compatibility */
  border?: string;
}

export function DSMCard({ children, className = '', onClick }: DSMCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-background rounded-2xl border border-border shadow-sm p-4 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// --- DSMButton ---
interface DSMButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    // deprecated — kept for backward compatibility, map to nearest equivalent
    | 'gradient' | 'gradientAmber' | 'gradientPurple' | 'outline' | 'destructive';
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  /** @deprecated no-op — kept for backward compatibility */
  size?: string;
  /** @deprecated no-op — kept for backward compatibility */
  icon?: React.ReactNode | React.ElementType;
  /** @deprecated no-op — kept for backward compatibility */
  loading?: boolean;
}

export function DSMButton({
  variant = 'primary',
  fullWidth = true,
  disabled = false,
  onClick,
  children,
  type = 'button',
  className = '',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  size: _size,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  icon: _icon,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loading: _loading,
}: DSMButtonProps) {
  const base = 'h-11 rounded-xl px-4 text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2';
  const width = fullWidth ? 'w-full' : 'w-auto';
  const variants: Record<string, string> = {
    primary:        'bg-primary text-white hover:bg-primary-hover active:scale-95',
    secondary:      'bg-white border border-border text-gray-900 hover:bg-surface active:scale-95',
    ghost:          'bg-transparent text-primary hover:bg-primary-light active:scale-95',
    danger:         'bg-error text-white hover:opacity-90 active:scale-95',
    // deprecated — map to nearest equivalent
    gradient:       'bg-primary text-white hover:bg-primary-hover active:scale-95',
    gradientAmber:  'bg-primary text-white hover:bg-primary-hover active:scale-95',
    gradientPurple: 'bg-primary text-white hover:bg-primary-hover active:scale-95',
    outline:        'bg-white border border-border text-gray-900 hover:bg-surface active:scale-95',
    destructive:    'bg-error text-white hover:opacity-90 active:scale-95',
  };
  const disabledCls = 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60';

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${width} ${disabled ? disabledCls : variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// --- DSMIconButton ---
interface DSMIconButtonProps {
  onClick?: () => void;
  active?: boolean;
  children?: React.ReactNode;
  className?: string;
  /** @deprecated pass a Lucide icon component or ReactNode; rendered as children if children omitted */
  icon?: React.ReactNode | React.ElementType;
  /** @deprecated no-op — kept for backward compatibility */
  size?: number | string;
  /** @deprecated no-op — kept for backward compatibility */
  variant?: string;
  /** @deprecated no-op — kept for backward compatibility */
  label?: string;
  disabled?: boolean;
}

export function DSMIconButton({ onClick, active = false, children, className = '', icon, disabled = false }: DSMIconButtonProps) {
  // icon may be a Lucide component constructor or a ReactNode — render accordingly
  const iconContent = (() => {
    if (children != null) return children;
    if (icon == null) return null;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in (icon as object))) {
      const IconComponent = icon as React.ElementType;
      return <IconComponent className="w-5 h-5" />;
    }
    return icon as React.ReactNode;
  })();

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-150 ${
        active
          ? 'bg-primary-light text-primary'
          : 'bg-surface text-gray-900 hover:bg-gray-100'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {iconContent}
    </button>
  );
}

// --- DSMInput ---
interface DSMInputProps {
  label?: string;
  error?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  autoFocus?: boolean;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

export function DSMInput({
  label,
  error,
  placeholder,
  value,
  onChange,
  type = 'text',
  className = '',
  autoFocus,
  maxLength,
  inputMode,
}: DSMInputProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="text-xs font-medium text-gray-600 mb-1">{label}</label>
      )}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        maxLength={maxLength}
        inputMode={inputMode}
        onChange={e => onChange(e.target.value)}
        className={`bg-surface border rounded-xl h-11 px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors duration-150 ${
          error ? 'border-error focus:border-error' : 'border-border focus:border-primary'
        }`}
      />
      {error && (
        <span className="text-xs text-error mt-1">{error}</span>
      )}
    </div>
  );
}

// --- DSMBadge ---
// Status badge (validation, notification, etc.)
type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

interface DSMBadgeProps {
  variant: BadgeVariant;
  children?: ReactNode;
  size?: "sm" | "md";
  pulse?: boolean;
  className?: string;
}

const BADGE_COLORS: Record<BadgeVariant, string> = {
  success: "bg-green-500/90",
  warning: "bg-yellow-400/90",
  error: "bg-red-500/90",
  info: "bg-blue-500/90",
  neutral: "bg-gray-400/90",
};

export function DSMBadge({ variant, children, size = "sm", pulse, className = "" }: DSMBadgeProps) {
  const sizeClass = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  return (
    <div className={`${sizeClass} ${BADGE_COLORS[variant]} rounded-full flex items-center justify-center shadow ${pulse ? "animate-pulse" : ""} ${className}`}>
      {children}
    </div>
  );
}

// --- DSMProgressBar ---
// Linear progress indicator.
interface DSMProgressBarProps {
  value: number;   // 0-100
  max?: number;
  color?: string;  // Tailwind bg class
  height?: string;
  className?: string;
  showLabel?: boolean;
  label?: string;
}

export function DSMProgressBar({
  value, max = 100, color = "bg-purple-500", height = "h-1.5",
  className = "", showLabel, label,
}: DSMProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 ${height} bg-gray-100 rounded-full overflow-hidden`}>
        <div
          className={`${height} transition-all duration-500 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-medium text-gray-400">{label || `${Math.round(pct)}%`}</span>
      )}
    </div>
  );
}

// --- DSMSectionTitle ---
// Section heading with optional icon and action.
interface DSMSectionTitleProps {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}

export function DSMSectionTitle({ icon: Icon, iconColor = "text-purple-600", title, action, className = "" }: DSMSectionTitleProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
        <h2 className="font-bold text-gray-900" style={{ fontSize: "1.05rem" }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

// --- DSMHint ---
// Friendly speech-bubble style hint with tail.
interface DSMHintProps {
  icon: LucideIcon;
  text: string;
  variant?: "info" | "warning" | "error";
  className?: string;
  tailPosition?: "left" | "center" | "none";
}

const HINT_BG = {
  info: "bg-blue-50 border-blue-200/60 text-blue-700",
  warning: "bg-amber-50 border-amber-200/60 text-amber-700",
  error: "bg-red-50 border-red-200/60 text-red-700",
};
const HINT_ICON_BG = {
  info: "bg-blue-100 text-blue-600",
  warning: "bg-amber-100 text-amber-600",
  error: "bg-red-100 text-red-600",
};
const HINT_TAIL_COLOR = {
  info: "#f0fdf4",
  warning: "#fffbeb",
  error: "#fef2f2",
};

export function DSMHint({ icon: Icon, text, variant = "info", className = "", tailPosition = "left" }: DSMHintProps) {
  return (
    <div className={`relative ${className}`}>
      <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border shadow-sm ${HINT_BG[variant]}`}>
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${HINT_ICON_BG[variant]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-medium leading-snug">{text}</span>
      </div>
      {/* Speech bubble tail */}
      {tailPosition !== "none" && (
        <div className={`absolute -bottom-1.5 ${tailPosition === "left" ? "left-5" : "left-1/2 -translate-x-1/2"}`}>
          <div className="w-3 h-3 rotate-45 border-b border-r shadow-sm" style={{ backgroundColor: HINT_TAIL_COLOR[variant], borderColor: variant === "info" ? "#bbf7d0" : variant === "warning" ? "#fcd34d" : "#fecaca" }} />
        </div>
      )}
    </div>
  );
}

// ====================================================================
// 3. LAYOUT COMPONENTS
// ====================================================================

// --- BottomNav ---
interface BottomNavProps {
  t: (key: string) => string;
}

export function BottomNav({ t }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/foods', icon: Apple, label: t('nav.foods') },
    { path: '/shopping', icon: ShoppingCart, label: t('nav.shopping') },
    { path: '/', icon: UtensilsCrossed, label: t('nav.menu') },
    { path: '/workout', icon: Dumbbell, label: t('nav.sports') },
    { path: '/profile', icon: User, label: t('nav.profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pb-safe">
      <div className="h-16 flex items-stretch max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path ||
            (tab.path !== '/' && location.pathname.startsWith(tab.path));
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors duration-150"
            >
              <Icon
                size={22}
                className={active ? 'text-primary' : 'text-gray-400'}
              />
              <span className={`text-2xs font-medium ${active ? 'text-primary' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// --- WaterTracker ---
// Floating blue water bullet widget with SVG glass, animated fill,
// tap to add +250ml (wraps at goal), long press to reset,
// haptic feedback, pulse when empty, dark mode support.
interface WaterTrackerProps {
  current: number; // Current water intake in ml
  goal: number;    // Daily water intake goal in ml
  onAdd: (amount: number) => void;
  onReset: () => void;
  waterLabel?: string;
}

export function WaterTracker({ current, goal, onAdd, onReset, waterLabel = 'Víz' }: WaterTrackerProps) {
  const fillPct = Math.min(100, (current / goal) * 100);
  const liters = (current / 1000).toFixed(1);
  const isEmpty = current === 0;
  const isFull = current >= goal;

  // Long press detection for reset
  const longPressTimer = useCallback(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return {
      onTouchStart: () => {
        timer = setTimeout(() => {
          if (navigator.vibrate) navigator.vibrate([15, 30, 50]);
          onReset();
        }, 600);
      },
      onTouchEnd: () => { if (timer) clearTimeout(timer); },
      onTouchCancel: () => { if (timer) clearTimeout(timer); },
      onMouseDown: () => {
        timer = setTimeout(() => {
          if (navigator.vibrate) navigator.vibrate([15, 30, 50]);
          onReset();
        }, 600);
      },
      onMouseUp: () => { if (timer) clearTimeout(timer); },
      onMouseLeave: () => { if (timer) clearTimeout(timer); },
    };
  }, [onReset])();

  const handleTap = useCallback(() => {
    onAdd(250);
  }, [onAdd]);

  // Unique SVG gradient IDs to avoid conflicts
  const gradId = "waterBulletGrad";
  const clipId = "waterBulletClip";

  return (
    <motion.button
      onClick={handleTap}
      whileTap={{ scale: 0.88 }}
      aria-label={`Víz hozzáadása (+250ml). Jelenlegi: ${liters}L / ${(goal / 1000).toFixed(0)}L. Hosszú nyomás: nullázás.`}
      className={`
        relative flex items-center gap-2 pl-2 pr-3 py-2 rounded-2xl
        border-2 shadow-lg backdrop-blur-md transition-all cursor-pointer select-none
        ${isFull
          ? "bg-blue-100/90 border-blue-400 shadow-blue-300/40"
          : isEmpty
            ? "bg-white/80 border-cyan-300/60 shadow-cyan-200/30"
            : "bg-blue-50/90 border-blue-300 shadow-blue-200/30"
        }
      `}
      {...longPressTimer}
    >
      {/* Pulse ring when empty — attracts attention */}
      {isEmpty && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-cyan-400/50"
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Celebration ring when full */}
      {isFull && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-blue-400/60"
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 0.3, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* SVG Water glass with animated fill */}
      <div className="relative w-7 h-8 flex-shrink-0">
        <svg viewBox="0 0 28 36" className="w-full h-full">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#60A5FA", stopOpacity: 0.85 }} />
              <stop offset="50%" style={{ stopColor: "#3B82F6", stopOpacity: 0.95 }} />
              <stop offset="100%" style={{ stopColor: "#2563EB", stopOpacity: 1 }} />
            </linearGradient>
            <clipPath id={clipId}>
              <path d="M 5 3 L 23 3 L 24 33 L 4 33 Z" />
            </clipPath>
          </defs>

          {/* Water fill — animated from bottom */}
          <g clipPath={`url(#${clipId})`}>
            <motion.rect
              x="4"
              width="20"
              fill={`url(#${gradId})`}
              initial={false}
              animate={{
                y: 33 - (fillPct * 0.30),
                height: fillPct * 0.30,
              }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            />
            {/* Water surface wave */}
            {fillPct > 0 && (
              <motion.ellipse
                cx="14"
                rx="10"
                ry="1.2"
                fill="#93C5FD"
                opacity={0.5}
                initial={false}
                animate={{ cy: 33 - (fillPct * 0.30) }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
              />
            )}
          </g>

          {/* Glass outline */}
          <path
            d="M 5 3 L 23 3 L 24 33 L 4 33 Z"
            fill="none"
            stroke={isFull ? "#3B82F6" : "#60A5FA"}
            strokeWidth="1.8"
            opacity={isFull ? 0.9 : 0.6}
            strokeLinejoin="round"
          />

          {/* Glass rim highlight */}
          <line x1="6" y1="3" x2="22" y2="3" stroke="#93C5FD" strokeWidth="1" opacity="0.4" />

          {/* Droplet icon when empty */}
          {isEmpty && (
            <g opacity="0.3">
              <path d="M 14 13 Q 10 20 14 24 Q 18 20 14 13 Z" fill="#60A5FA" />
            </g>
          )}
        </svg>

        {/* Tiny "+250" indicator on tap */}
        <AnimatePresence>
          {!isEmpty && fillPct < 100 && (
            <motion.div
              key={current}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -14 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-500 pointer-events-none whitespace-nowrap"
            >
              +250
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Text label */}
      <div className="flex flex-col items-start min-w-0">
        <span className={`text-[11px] font-bold leading-tight ${
          isFull
            ? "text-blue-600"
            : "text-cyan-700"
        }`}>
          <Droplets className="w-3 h-3 inline-block mr-0.5 -mt-0.5" />
          {waterLabel}
        </span>
        <span className={`text-xs font-bold leading-tight ${
          isFull
            ? "text-blue-500"
            : isEmpty
              ? "text-gray-400"
              : "text-blue-500"
        }`}>
          {isEmpty ? "+250ml" : isFull ? `${liters}L ✓` : `${liters}L`}
        </span>
      </div>
    </motion.button>
  );
}

// --- WaterButton ---
// Simple pill: blue gradient, white outline drop icon, current total in ml. Tap = +250ml. Optional skin for contextual cards.
export interface WaterButtonProps {
  className?: string;
  skin?: "rest" | "evening" | "morning";
  totalMl?: number;
  goalMl?: number;
  onPress?: () => void;
}

export function WaterButton({
  className = "",
  skin,
  totalMl,
  goalMl,
  onPress,
}: WaterButtonProps) {
  const [internalTotal, setInternalTotal] = useState(0);
  const [internalGoal, setInternalGoal] = useState(2500);
  const isControlled = totalMl != null && goalMl != null && onPress != null;
  const total = isControlled ? totalMl : internalTotal;
  const goal = isControlled ? goalMl : internalGoal;

  useEffect(() => {
    if (isControlled) return;
    WaterService.getTodayTotal().then(setInternalTotal);
    getUserProfile().then((p) => {
      if (p?.weight && p.weight > 0) setInternalGoal(Math.round(p.weight * 35));
    });
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ total: number }>).detail;
      if (detail?.total != null) setInternalTotal(detail.total);
    };
    window.addEventListener("waterUpdated", handler);
    return () => window.removeEventListener("waterUpdated", handler);
  }, [isControlled]);

  const handleTap = useCallback(
    async (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (isControlled && onPress) {
        onPress();
        return;
      }
      const optimistic = internalTotal + 250;
      setInternalTotal(optimistic);
      try {
        const saved = await WaterService.addWater(250);
        setInternalTotal(saved);
      } catch {
        setInternalTotal((prev) => prev - 250);
      }
    },
    [isControlled, onPress, internalTotal]
  );

  const goalReached = goal > 0 && total >= goal;
  const buttonStyle =
    skin === "evening"
      ? { background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.5)", color: "white" }
      : skin === "morning"
        ? { background: "#f59e0b", border: "none", color: "white" }
        : { background: "linear-gradient(135deg, #3b82f6, #06b6d4)", border: "none", color: "white" };

  return (
    <button
      type="button"
      onClick={handleTap}
      onTouchEnd={handleTap}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      aria-label={`Water ${total}ml`}
      className={className}
      style={{
        width: "100%",
        minWidth: "120px",
        height: "52px",
        borderRadius: "999px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.6rem",
        animation: "none",
        boxShadow: "none",
        ...buttonStyle,
      }}
    >
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M9 1C9 1 2 8.5 2 13.5C2 17.09 5.13 20 9 20C12.87 20 16 17.09 16 13.5C16 8.5 9 1 9 1Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.01em" }}>
        {total}ml{goalReached ? " ✓" : ""}
      </span>
    </button>
  );
}

// ====================================================================
// 4. COMPOSITE COMPONENTS
// ====================================================================

// --- DSMModal ---
interface DSMModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export function DSMModal({ open, onClose, title, children, maxWidth = "max-w-lg" }: DSMModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className={`bg-background rounded-t-3xl px-4 pt-4 pb-safe w-full ${maxWidth}`} onClick={(e) => e.stopPropagation()}>
        <div className="w-8 h-1 rounded-full bg-gray-200 mx-auto mb-4" />
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h2 font-heading font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// --- DSMConfirmDialog ---
// Confirmation dialog with title, message, confirm/cancel buttons.
interface DSMConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
}

export function DSMConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = "Megerősítés", cancelLabel = "Mégse", variant = "default",
}: DSMConfirmDialogProps) {
  if (!open) return null;
  return (
    <DSMModal open={open} onClose={onClose}>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white ${
            variant === "danger" ? "bg-red-500" : "bg-primary"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </DSMModal>
  );
}

// --- DSMGlassPanel ---
// Dark glass-morphism overlay panel (used for AR info overlay).
interface DSMGlassPanelProps {
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

export function DSMGlassPanel({ children, onClose, className = "" }: DSMGlassPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`bg-black/70 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl ${className}`}
    >
      {children}
    </motion.div>
  );
}

// --- DSMNotification ---
// Floating notification/toast with optional confirm/cancel actions.
interface DSMNotificationProps {
  open: boolean;
  onClose: () => void;
  variant?: "success" | "warning" | "error" | "confirm";
  position?: "top" | "bottom";
  icon?: LucideIcon;
  title: string;
  message?: string;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "default" | "warning";
  children?: React.ReactNode;
}

export function DSMNotification({
  open, onClose, variant = "success", position = "top", icon: Icon,
  title, message, onConfirm, confirmLabel = "OK", cancelLabel = "Mégse", confirmVariant = "default", children,
}: DSMNotificationProps) {
  if (!open) return null;

  const bgColor = {
    success: "bg-green-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
    confirm: "bg-gray-800",
  }[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: position === "top" ? -40 : 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === "top" ? -40 : 40 }}
          className={`fixed ${position === "top" ? "top-4" : "bottom-24"} left-4 right-4 z-[70] ${bgColor} rounded-2xl p-4 shadow-2xl border border-white/10`}
        >
          <div className="flex items-start gap-3">
            {Icon && (
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{title}</p>
              {message && <p className="text-xs text-white/70 mt-0.5">{message}</p>}
              {children}
            </div>
            {!onConfirm && (
              <button onClick={onClose} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>
            )}
          </div>
          {variant === "confirm" && onConfirm && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-medium bg-white/10 text-white/80"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => { onConfirm(); onClose(); }}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold text-white ${
                  confirmVariant === "danger" ? "bg-red-500" : confirmVariant === "warning" ? "bg-amber-500" : "bg-primary"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- DSMSubPageHeader ---
interface DSMSubPageHeaderProps {
  title: string;
  onBack?: () => void;
  rightActions?: React.ReactNode;
}

export function DSMSubPageHeader({ title, onBack, rightActions }: DSMSubPageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-background border-b border-border">
      <div className="h-14 flex items-center gap-3 px-4">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h2 className="flex-1 text-h2 font-heading font-semibold text-gray-900 truncate">{title}</h2>
        {rightActions && <div className="flex items-center gap-2">{rightActions}</div>}
      </div>
    </header>
  );
}

// --- DSMStatCard ---
// Compact stat card with value, label, and color.
interface DSMStatCardProps {
  value: string;
  label: string;
  color?: string;
  fontSize?: string;
}

export function DSMStatCard({ value, label, color = "text-white", fontSize = "1.1rem" }: DSMStatCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-2.5 text-center">
      <div className={`font-bold ${color}`} style={{ fontSize }}>{value}</div>
      <div className="text-2xs text-white/50 mt-0.5">{label}</div>
    </div>
  );
}

// --- DSMPrivacyStrip ---
// Privacy notice strip for body vision images.
export function DSMPrivacyStrip() {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-3 py-1.5 flex items-center gap-2">
      <Info className="w-3 h-3 text-white/40 flex-shrink-0" />
      <span className="text-[9px] text-white/40">A kepek kizarolag helyileg, a keszulekeden tarolodnak.</span>
    </div>
  );
}

// ====================================================================
// 5. RE-EXPORTS
// ====================================================================

export { PageHeader };
export { SearchBar } from "../SearchBar";
export { TabFilter, createTabs } from "../TabFilter";

// ====================================================================
// 6. ATOMS & MOLECULES (re-exports from sub-modules)
// ====================================================================

export * from "./atoms";
export * from "./molecules";
export * from "./ux-patterns";
export { AppHeader } from './AppHeader';