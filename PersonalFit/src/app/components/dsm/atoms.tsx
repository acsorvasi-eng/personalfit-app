/**
 * ====================================================================
 * DSM ATOMS - Smallest indivisible UI elements
 * ====================================================================
 * These are the foundational building blocks:
 * - DSMText: Consistent typography
 * - DSMChip: Small tag/filter element
 * - DSMAvatar: User/entity avatar
 * - DSMDivider: Section separator
 * - DSMLabel: Form label
 * - DSMTag: Colored status tag
 * - DSMIcon: Standardized icon wrapper
 * - DSMDot: Status dot indicator
 * - DSMGradientText: Gradient-colored text
 * ====================================================================
 */

import type { ReactNode, ElementType } from "react";
import type { LucideIcon } from "lucide-react";

// ─── DSMText ────────────────────────────────────────────────────────
// Consistent text rendering with semantic variants.
type TextVariant = "h1" | "h2" | "h3" | "h4" | "body" | "caption" | "overline" | "micro";
type TextColor = "default" | "muted" | "primary" | "success" | "warning" | "error" | "white";

interface DSMTextProps {
  variant?: TextVariant;
  color?: TextColor;
  weight?: 400 | 500 | 600 | 700 | 800 | 900;
  className?: string;
  children: ReactNode;
  as?: ElementType;
}

const TEXT_VARIANT_MAP: Record<TextVariant, string> = {
  h1: "text-2xl",
  h2: "text-xl",
  h3: "text-lg",
  h4: "text-base",
  body: "text-sm",
  caption: "text-xs",
  overline: "text-[11px] uppercase tracking-wider",
  micro: "text-2xs",
};

const TEXT_COLOR_MAP: Record<TextColor, string> = {
  default: "text-gray-900",
  muted: "text-gray-500",
  primary: "text-[var(--primary-hover)]",
  success: "text-emerald-600",
  warning: "text-amber-600",
  error: "text-red-600",
  white: "text-white",
};

export function DSMText({
  variant = "body",
  color = "default",
  weight,
  className = "",
  children,
  as: Tag = "span" as ElementType,
}: DSMTextProps) {
  const Component = Tag;
  return (
    <Component
      className={`${TEXT_VARIANT_MAP[variant]} ${TEXT_COLOR_MAP[color]} ${className}`}
      style={weight ? { fontWeight: weight } : undefined}
    >
      {children}
    </Component>
  );
}

// ─── DSMChip ────────────────────────────────────────────────────────
// Small interactive or display chip/pill element.
type ChipVariant = "filled" | "outlined" | "soft";
type ChipColor = "green" | "blue" | "amber" | "red" | "purple" | "gray" | "emerald" | "orange" | "teal" | "cyan";

interface DSMChipProps {
  label: string;
  color?: ChipColor;
  variant?: ChipVariant;
  icon?: LucideIcon;
  emoji?: string;
  size?: "xs" | "sm" | "md";
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

const CHIP_COLORS: Record<ChipColor, { filled: string; outlined: string; soft: string }> = {
  green:   { filled: "bg-green-500 text-white",   outlined: "border-green-300 text-green-700",      soft: "bg-green-50 text-green-700" },
  blue:    { filled: "bg-blue-500 text-white",     outlined: "border-blue-300 text-blue-700",        soft: "bg-blue-50 text-blue-700" },
  amber:   { filled: "bg-amber-500 text-white",    outlined: "border-amber-300 text-amber-700",      soft: "bg-amber-50 text-amber-700" },
  red:     { filled: "bg-red-500 text-white",      outlined: "border-red-300 text-red-700",          soft: "bg-red-50 text-red-700" },
  purple:  { filled: "bg-purple-500 text-white",   outlined: "border-purple-300 text-purple-700",    soft: "bg-purple-50 text-purple-700" },
  gray:    { filled: "bg-gray-500 text-white",     outlined: "border-gray-300 text-gray-700",        soft: "bg-gray-100 text-gray-600" },
  emerald: { filled: "bg-emerald-500 text-white",  outlined: "border-emerald-300 text-emerald-700",  soft: "bg-emerald-50 text-emerald-700" },
  orange:  { filled: "bg-orange-500 text-white",   outlined: "border-orange-300 text-orange-700",    soft: "bg-orange-50 text-orange-700" },
  teal:    { filled: "bg-teal-500 text-white",     outlined: "border-teal-300 text-teal-700",        soft: "bg-teal-50 text-teal-700" },
  cyan:    { filled: "bg-cyan-500 text-white",     outlined: "border-cyan-300 text-cyan-700",        soft: "bg-cyan-50 text-cyan-700" },
};

const CHIP_SIZES: Record<string, string> = {
  xs: "px-1.5 py-0.5 text-2xs gap-0.5 rounded-md",
  sm: "px-2 py-0.5 text-[11px] gap-1 rounded-lg",
  md: "px-3 py-1 text-xs gap-1.5 rounded-full",
};

export function DSMChip({
  label, color = "green", variant = "soft", icon: Icon, emoji,
  size = "sm", onClick, active, className = "",
}: DSMChipProps) {
  const colorStyle = CHIP_COLORS[color][variant];
  const borderClass = variant === "outlined" ? "border" : "";
  const interactiveClass = onClick ? "cursor-pointer hover:opacity-80 active:scale-95 transition-all" : "";
  const activeClass = active ? "ring-2 ring-offset-1 ring-[var(--primary)]" : "";
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center font-bold ${CHIP_SIZES[size]} ${colorStyle} ${borderClass} ${interactiveClass} ${activeClass} ${className}`}
    >
      {emoji && <span>{emoji}</span>}
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </Tag>
  );
}

// ─── DSMAvatar ──────────────────────────────────────────────────────
// User or entity avatar with fallback.
interface DSMAvatarProps {
  src?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  emoji?: string;
  icon?: LucideIcon;
  bgColor?: string;
  onClick?: () => void;
}

const AVATAR_SIZES: Record<string, { container: string; text: string; icon: string }> = {
  xs: { container: "w-6 h-6",   text: "text-2xs", icon: "w-3 h-3" },
  sm: { container: "w-8 h-8",   text: "text-xs",     icon: "w-4 h-4" },
  md: { container: "w-10 h-10", text: "text-sm",     icon: "w-5 h-5" },
  lg: { container: "w-12 h-12", text: "text-base",   icon: "w-6 h-6" },
  xl: { container: "w-16 h-16", text: "text-xl",     icon: "w-8 h-8" },
};

export function DSMAvatar({
  src, name, size = "md", className = "", emoji, icon: Icon,
  bgColor = "bg-[var(--primary-light)]", onClick,
}: DSMAvatarProps) {
  const s = AVATAR_SIZES[size];
  const initials = name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "";
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`${s.container} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
        onClick ? "cursor-pointer hover:opacity-80 transition-all" : ""
      } ${!src ? bgColor : ""} ${className}`}
    >
      {src ? (
        <img src={src} alt={name || ""} className="w-full h-full object-cover" />
      ) : emoji ? (
        <span className={s.text}>{emoji}</span>
      ) : Icon ? (
        <Icon className={`${s.icon} text-[var(--primary-hover)]`} />
      ) : (
        <span className={`${s.text} text-[var(--primary-hover)] font-bold`}>{initials || "?"}</span>
      )}
    </Tag>
  );
}

// ─── DSMDivider ─────────────────────────────────────────────────────
// Horizontal or vertical separator line.
interface DSMDividerProps {
  className?: string;
  label?: string;
  vertical?: boolean;
  spacing?: "none" | "sm" | "md" | "lg";
}

const DIVIDER_SPACING: Record<string, string> = {
  none: "",
  sm: "my-2",
  md: "my-3",
  lg: "my-4",
};

export function DSMDivider({ className = "", label, vertical, spacing = "md" }: DSMDividerProps) {
  if (vertical) {
    return <div className={`w-px bg-gray-200 self-stretch ${className}`} />;
  }

  if (label) {
    return (
      <div className={`flex items-center gap-3 ${DIVIDER_SPACING[spacing]} ${className}`}>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[11px] text-gray-400 font-medium">{label}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
    );
  }

  return <div className={`h-px bg-gray-200 ${DIVIDER_SPACING[spacing]} ${className}`} />;
}

// ─── DSMTag ─────────────────────────────────────────────────────────
// Status tag with optional dot indicator.
type TagStatus = "active" | "inactive" | "pending" | "success" | "error" | "warning" | "trial";

interface DSMTagProps {
  status: TagStatus;
  label: string;
  showDot?: boolean;
  className?: string;
}

const TAG_STYLES: Record<TagStatus, { bg: string; text: string; dot: string }> = {
  active:   { bg: "bg-[var(--primary-light)]",   text: "text-[var(--primary-hover)]",   dot: "bg-[var(--primary)]" },
  inactive: { bg: "bg-gray-100",   text: "text-gray-500",    dot: "bg-gray-400" },
  pending:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  success:  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  error:    { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500" },
  warning:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  trial:    { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500" },
};

export function DSMTag({ status, label, showDot = true, className = "" }: DSMTagProps) {
  const style = TAG_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${style.bg} ${style.text} ${className}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      {label}
    </span>
  );
}

// ─── DSMIcon ────────────────────────────────────────────────────────
// Standardized icon wrapper with background circle.
interface DSMIconProps {
  icon: LucideIcon;
  size?: "xs" | "sm" | "md" | "lg";
  color?: string;
  bgColor?: string;
  className?: string;
}

const ICON_SIZES: Record<string, { container: string; icon: string }> = {
  xs: { container: "w-6 h-6",   icon: "w-3 h-3" },
  sm: { container: "w-8 h-8",   icon: "w-4 h-4" },
  md: { container: "w-10 h-10", icon: "w-5 h-5" },
  lg: { container: "w-12 h-12", icon: "w-6 h-6" },
};

export function DSMIcon({
  icon: Icon, size = "md", color = "text-[var(--primary-hover)]",
  bgColor = "bg-[var(--primary-light)]", className = "",
}: DSMIconProps) {
  const s = ICON_SIZES[size];
  return (
    <div className={`${s.container} ${bgColor} rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}>
      <Icon className={`${s.icon} ${color}`} />
    </div>
  );
}

// ─── DSMDot ─────────────────────────────────────────────────────────
// Small dot indicator for status or activity markers.
interface DSMDotProps {
  color?: "green" | "amber" | "red" | "blue" | "gray" | "cyan" | "orange";
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const DOT_COLORS: Record<string, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  gray: "bg-gray-400",
  cyan: "bg-cyan-500",
  orange: "bg-orange-500",
};

const DOT_SIZES: Record<string, string> = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

export function DSMDot({ color = "green", pulse, size = "sm", className = "" }: DSMDotProps) {
  return (
    <span className={`inline-block rounded-full ${DOT_SIZES[size]} ${DOT_COLORS[color]} ${pulse ? "animate-pulse" : ""} ${className}`} />
  );
}

// ─── DSMEmptyState ──────────────────────────────────────────────────
// Placeholder for screens/sections with no content.
interface DSMEmptyStateProps {
  emoji?: string;
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function DSMEmptyState({ emoji, icon: Icon, title, description, action, className = "" }: DSMEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-10 px-6 text-center ${className}`}>
      {emoji && <div className="text-5xl mb-4">{emoji}</div>}
      {Icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <h3 className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── DSMGradientText ────────────────────────────────────────────────
// Text with gradient coloring.
interface DSMGradientTextProps {
  from?: string;
  via?: string;
  to?: string;
  className?: string;
  children: ReactNode;
}

export function DSMGradientText({
  from = "from-[#2563EB]",
  via,
  to = "to-[#12CFA6]",
  className = "",
  children,
}: DSMGradientTextProps) {
  const gradClasses = ["bg-gradient-to-r", from, via || "", to].filter(Boolean).join(" ");
  return (
    <span className={`${gradClasses} bg-clip-text text-transparent ${className}`}>
      {children}
    </span>
  );
}

// ─── DSMSkeleton ────────────────────────────────────────────────────
// Loading skeleton placeholder.
interface DSMSkeletonProps {
  variant?: "text" | "circle" | "rect";
  width?: string;
  height?: string;
  className?: string;
}

export function DSMSkeleton({ variant = "text", width, height, className = "" }: DSMSkeletonProps) {
  const base = "animate-pulse bg-gray-200 rounded";
  const variantClass = {
    text: `h-4 ${width || "w-full"} rounded-md`,
    circle: `${width || "w-10"} ${height || "h-10"} rounded-full`,
    rect: `${width || "w-full"} ${height || "h-20"} rounded-xl`,
  }[variant];

  return <div className={`${base} ${variantClass} ${className}`} />;
}
