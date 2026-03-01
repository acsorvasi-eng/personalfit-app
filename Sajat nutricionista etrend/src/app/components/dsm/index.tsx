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
import { Link, useLocation } from "react-router";
import { useLanguage } from "../../contexts/LanguageContext";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Apple, UtensilsCrossed, ShoppingCart, User, Dumbbell,
  X, ArrowLeft, ChevronLeft, ChevronRight, RotateCw,
  AlertTriangle, Camera, Eye, Trash2, Archive, Info,
  Maximize2, ZoomIn, ZoomOut, CheckCircle2, Bell, XCircle,
  Droplets
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "../PageHeader";

// ====================================================================
// 1. DESIGN TOKENS
// ====================================================================
// Modify these constants to change the entire app's visual foundation.
// They reference CSS custom properties from theme.css where applicable.
// ====================================================================

export const DSM_TOKENS = {
  // --- FONTS ---
  fonts: {
    base: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  // --- COLORS ---
  colors: {
    // Primary brand palette (Sixth-Halt Blue)
    primary: {
      50: "#eef4ff",
      100: "#d9e6ff",
      200: "#b3ccff",
      300: "#809fff",
      400: "#4d73ff",
      500: "#3366FF",
      600: "#2952cc",
      700: "#1f3d99",
      800: "#142966",
      900: "#0a1433",
    },
    // Accent (emerald)
    emerald: { 400: "#34d399", 500: "#10b981", 600: "#059669" },
    // Accent (teal / secondary)
    teal: { 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488" },
    // Secondary (Sixth-Halt Teal)
    secondary: {
      50: "#e6faf5",
      100: "#b3f0e0",
      200: "#80e6cc",
      300: "#4ddcb8",
      400: "#1ad2a3",
      500: "#12CFA6",
      600: "#0ea685",
      700: "#0b7c63",
    },
    // Neutrals
    gray: {
      50: "#f9fafb", 100: "#f3f4f6", 200: "#e5e7eb", 300: "#d1d5db",
      400: "#9ca3af", 500: "#6b7280", 600: "#4b5563", 700: "#374151",
      800: "#1f2937", 900: "#111827",
    },
    // Semantic
    blue: { 50: "#eff6ff", 100: "#dbeafe", 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb" },
    purple: { 50: "#faf5ff", 100: "#f3e8ff", 400: "#c084fc", 500: "#a855f7", 600: "#9333ea", 700: "#7e22ce" },
    amber: { 50: "#fffbeb", 100: "#fef3c7", 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706" },
    orange: { 400: "#fb923c", 500: "#f97316", 600: "#ea580c" },
    red: { 50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5", 400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c" },
    yellow: { 300: "#fde047", 400: "#facc15", 500: "#eab308", 900: "#713f12" },
    green: { 50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d" },
    white: "#ffffff",
    black: "#000000",
  },

  // --- GRADIENTS (commonly used) ---
  gradients: {
    primary: "from-[#3366FF] to-[#12CFA6]",
    primaryBr: "from-[#3366FF] via-[#2952cc] to-[#12CFA6]",
    purpleBlue: "from-purple-600 to-blue-600",
    amberOrange: "from-amber-500 to-orange-500",
    bodyApp: "from-[var(--color-primary-50)] to-white",
    water: "from-blue-400 to-blue-500",
  },

  // --- SPACING ---
  spacing: {
    xs: "0.25rem",   // 4px
    sm: "0.5rem",    // 8px
    md: "0.75rem",   // 12px
    base: "1rem",    // 16px
    lg: "1.25rem",   // 20px
    xl: "1.5rem",    // 24px
    "2xl": "2rem",   // 32px
    "3xl": "2.5rem", // 40px
    "4xl": "3rem",   // 48px
  },

  // --- BORDER RADIUS ---
  radius: {
    sm: "0.375rem",  // 6px
    md: "0.5rem",    // 8px
    lg: "0.75rem",   // 12px
    xl: "1rem",      // 16px
    "2xl": "1.25rem",// 20px
    "3xl": "1.5rem", // 24px
    full: "9999px",
  },

  // --- SHADOWS ---
  shadows: {
    sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
    base: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)",
    md: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
    lg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
    xl: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
    "2xl": "0 25px 50px -12px rgba(0,0,0,0.25)",
    primary: "0 10px 15px -3px rgba(51,102,255,0.2), 0 4px 6px -4px rgba(51,102,255,0.1)",
    green: "0 10px 15px -3px rgba(34,197,94,0.2), 0 4px 6px -4px rgba(34,197,94,0.1)",
  },

  // --- Z-INDEX LAYERS ---
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
  },

  // --- TRANSITIONS ---
  transitions: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    base: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
    slower: "500ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  // --- HAPTIC PATTERNS ---
  haptics: {
    longPress: [15, 30, 50],
    mealCheck: [10, 20],
    alternativeSelect: 10,
  },

  // --- BOTTOM NAV ---
  nav: {
    height: "64px",        // bottom nav bar height
    safeAreaBottom: "16px", // safe area inset
  },
} as const;

// ====================================================================
// 2. PRIMITIVE COMPONENTS
// ====================================================================

// --- DSMCard ---
// Standard white card container used across all screens.
interface DSMCardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  border?: string;
  onClick?: () => void;
}

export function DSMCard({ children, className = "", padding = "md", border = "border-gray-100", onClick }: DSMCardProps) {
  const pad = { none: "", sm: "p-3", md: "p-4", lg: "p-5" }[padding];
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border ${border} dark:border-[#2a2a2a] ${pad} ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// --- DSMButton ---
// Standardized button with variants matching the app's design language.
type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost" | "gradient" | "gradientAmber" | "gradientPurple" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface DSMButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  className?: string;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-md",
  secondary: "bg-[var(--color-primary-50)] dark:bg-[rgba(51,102,255,0.1)] text-[var(--color-primary-700)] dark:text-[#809fff] border border-[var(--color-primary-200)] dark:border-[rgba(51,102,255,0.2)] hover:bg-[var(--color-primary-100)] dark:hover:bg-[rgba(51,102,255,0.2)]",
  destructive: "bg-red-500 text-white hover:bg-red-600 shadow-md",
  ghost: "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525]",
  gradient: "bg-gradient-to-r from-[#3366FF] to-[#12CFA6] text-white hover:from-[#2952cc] hover:to-[#0ea685] shadow-md",
  gradientAmber: "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md",
  gradientPurple: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md",
  outline: "bg-white dark:bg-[#1E1E1E] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#252525]",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3.5 rounded-xl gap-2.5",
};

export function DSMButton({
  children, variant = "primary", size = "md", disabled, loading, icon: Icon,
  className = "", fullWidth, onClick, type = "button",
}: DSMButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`font-bold transition-all flex items-center justify-center
        ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]}
        ${fullWidth ? "w-full" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed shadow-none" : ""}
        ${className}`}
    >
      {loading ? <RotateCw className="w-5 h-5 animate-spin" /> : Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
}

// --- DSMIconButton ---
// Circular icon-only button.
interface DSMIconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "glass" | "danger" | "active";
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function DSMIconButton({ icon: Icon, onClick, size = "md", variant = "default", label, className = "", disabled }: DSMIconButtonProps) {
  const sizeClass = { sm: "w-7 h-7", md: "w-9 h-9", lg: "w-10 h-10" }[size];
  const iconSize = { sm: "w-3.5 h-3.5", md: "w-4 h-4", lg: "w-5 h-5" }[size];
  const variantClass = {
    default: "bg-white/10 backdrop-blur text-white/70 hover:bg-white/20",
    glass: "bg-black/40 backdrop-blur text-white/70 hover:bg-black/60",
    danger: "bg-red-500 text-white",
    active: "bg-purple-600 text-white",
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`${sizeClass} rounded-full flex items-center justify-center transition-all ${variantClass} ${disabled ? "opacity-30" : ""} ${className}`}
    >
      <Icon className={iconSize} />
    </button>
  );
}

// --- DSMInput ---
// Standard text input field.
interface DSMInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  type?: string;
}

export function DSMInput({ value, onChange, placeholder, autoFocus, className = "", type = "text" }: DSMInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={`w-full px-3.5 py-2.5 border-2 border-gray-200 dark:border-[#2a2a2a] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)] dark:focus:ring-[rgba(51,102,255,0.3)] focus:border-[var(--color-primary-400)] dark:focus:border-[var(--primary)] bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 ${className}`}
    />
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
      <div className={`flex-1 ${height} bg-gray-100 dark:bg-[#252525] rounded-full overflow-hidden`}>
        <div
          className={`${height} transition-all duration-500 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{label || `${Math.round(pct)}%`}</span>
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
        <h2 className="font-bold text-gray-900 dark:text-gray-100" style={{ fontSize: "1.05rem" }}>{title}</h2>
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
  info: "bg-blue-50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20 text-blue-700 dark:text-blue-400",
  warning: "bg-amber-50 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/20 text-amber-700 dark:text-amber-400",
  error: "bg-red-50 dark:bg-red-500/10 border-red-200/60 dark:border-red-500/20 text-red-700 dark:text-red-400",
};
const HINT_ICON_BG = {
  info: "bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
  warning: "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
  error: "bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400",
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
        <span className="text-[12px] font-medium leading-snug">{text}</span>
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
// The 5-tab bottom navigation bar extracted from Layout.tsx.
interface BottomNavProps {
  t: (key: string) => string;
}

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}

function NavLinkItem({ to, icon: Icon, label, active }: NavLinkProps) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-0.5 py-1 flex-1 relative"
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      {/* Icon container - elevated circle for active */}
      <div className={`relative w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full flex items-center justify-center transition-all duration-300 ${
        active
          ? "bg-[var(--color-primary-50)] dark:bg-[rgba(51,102,255,0.15)] shadow-[0_2px_12px_rgba(51,102,255,0.25)] -translate-y-0.5"
          : "bg-transparent"
      }`}>
        {/* Active ring */}
        {active && (
          <div className="absolute inset-0 rounded-full border-2 border-[var(--color-primary-200)] dark:border-[rgba(51,102,255,0.3)]" />
        )}
        <Icon
          className={`w-[22px] h-[22px] sm:w-6 sm:h-6 transition-colors duration-200 ${
            active ? "text-[var(--color-primary-600)] dark:text-[#809fff]" : "text-gray-400 dark:text-gray-500"
          }`}
          strokeWidth={active ? 2.2 : 1.8}
        />
      </div>
      {/* Label */}
      <span className={`text-[11px] sm:text-[12px] text-center leading-tight transition-colors duration-200 ${
        active ? "text-[var(--color-primary-700)] dark:text-[#809fff] font-semibold" : "text-gray-400 dark:text-gray-500 font-medium"
      }`}>
        {label}
      </span>
    </Link>
  );
}

export function BottomNav({ t }: BottomNavProps) {
  const location = useLocation();

  // Match active state more broadly for sub-routes
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40" role="navigation" aria-label={t("nav.menu")}>
      {/* Frosted glass background */}
      <div className="bg-white/95 dark:bg-[#121212]/95 backdrop-blur-lg border-t border-gray-200/80 dark:border-[#2a2a2a]/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="max-w-4xl mx-auto flex items-end px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:px-3">
          <NavLinkItem to="/foods" icon={Apple} label={t("nav.foods")} active={isActive("/foods")} />
          <NavLinkItem to="/shopping" icon={ShoppingCart} label={t("nav.shopping")} active={isActive("/shopping")} />
          <NavLinkItem to="/" icon={UtensilsCrossed} label={t("nav.menu")} active={isActive("/")} />
          <NavLinkItem to="/workout" icon={Dumbbell} label={t("nav.sports")} active={isActive("/workout")} />
          <NavLinkItem to="/profile" icon={User} label={t("nav.profile")} active={isActive("/profile")} />
        </div>
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
          ? "bg-blue-100/90 dark:bg-blue-900/40 border-blue-400 dark:border-blue-500/50 shadow-blue-300/40 dark:shadow-blue-500/20"
          : isEmpty
            ? "bg-white/80 dark:bg-[#1E1E1E]/80 border-cyan-300/60 dark:border-cyan-500/30 shadow-cyan-200/30 dark:shadow-cyan-500/10"
            : "bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-600/40 shadow-blue-200/30 dark:shadow-blue-500/15"
        }
      `}
      {...longPressTimer}
    >
      {/* Pulse ring when empty — attracts attention */}
      {isEmpty && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-cyan-400/50 dark:border-cyan-400/30"
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Celebration ring when full */}
      {isFull && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-blue-400/60 dark:border-blue-400/40"
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
              className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-500 dark:text-blue-400 pointer-events-none whitespace-nowrap"
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
            ? "text-blue-600 dark:text-blue-400"
            : "text-cyan-700 dark:text-cyan-400"
        }`}>
          <Droplets className="w-3 h-3 inline-block mr-0.5 -mt-0.5" />
          {waterLabel}
        </span>
        <span className={`text-[12px] font-bold leading-tight ${
          isFull
            ? "text-blue-500 dark:text-blue-300"
            : isEmpty
              ? "text-gray-400 dark:text-gray-500"
              : "text-blue-500 dark:text-blue-400"
        }`}>
          {isEmpty ? "+250ml" : isFull ? `${liters}L ✓` : `${liters}L`}
        </span>
      </div>
    </motion.button>
  );
}

// ====================================================================
// 4. COMPOSITE COMPONENTS
// ====================================================================

// --- DSMModal ---
// Centered popup modal with dark blur backdrop.
interface DSMModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export function DSMModal({ open, onClose, children, maxWidth = "max-w-xs" }: DSMModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className={`relative w-full ${maxWidth} bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
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
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white ${
            variant === "danger" ? "bg-red-500" : "bg-[var(--primary)]"
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
  confirmVariant?: "danger" | "default";
}

export function DSMNotification({
  open, onClose, variant = "success", position = "top", icon: Icon,
  title, message, onConfirm, confirmLabel = "OK", cancelLabel = "Mégse", confirmVariant = "default",
}: DSMNotificationProps) {
  if (!open) return null;

  const bgColor = {
    success: "bg-green-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
    confirm: "bg-gray-800 dark:bg-[#1E1E1E]",
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
                  confirmVariant === "danger" ? "bg-red-500" : "bg-[var(--primary)]"
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
// Sub-page navigation header with gradient background, back button, title/subtitle, and optional action.
interface DSMSubPageHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  action?: ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
}

export function DSMSubPageHeader({
  title, subtitle, onBack, action,
  gradientFrom = "from-[#3366FF]", gradientTo = "to-[#12CFA6]",
}: DSMSubPageHeaderProps) {
  const { t } = useLanguage();
  return (
    <div className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white px-4 py-4`}
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 16px))" }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25 transition-all active:scale-90"
              aria-label={t("ui.back")}
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div>
              <h1 className="font-bold" style={{ fontSize: "1.1rem" }}>{title}</h1>
              {subtitle && <p className="text-xs text-white/70">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      </div>
    </div>
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
      <div className="text-[10px] text-white/50 mt-0.5">{label}</div>
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