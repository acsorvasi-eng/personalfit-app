/**
 * ====================================================================
 * DSM MOLECULES - Compositions of atoms into reusable patterns
 * ====================================================================
 * These combine atoms into common UI patterns:
 * - DSMFeatureRow: Feature list item with check/lock icon
 * - DSMStatRow: Key-value stat display
 * - DSMListItem: Standard list item with icon + text + action
 * - DSMNutritionBar: Macro nutrition display bar
 * - DSMMetricCard: Metric display card with icon + value
 * - DSMInfoBanner: Informational banner with icon and text
 * - DSMActionCard: Card with gradient header and action content
 * - DSMFormField: Label + input combination
 * - DSMFeatureGrid: Grid of feature/benefit items
 * ====================================================================
 */

import { ReactNode } from "react";
import { Check, Lock, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DSMIcon, DSMChip } from "./atoms";

// ─── DSMFeatureRow ──────────────────────────────────────────────────
// Feature list item with included/excluded indicator.
interface DSMFeatureRowProps {
  text: string;
  included?: boolean;
  icon?: LucideIcon;
  emoji?: string;
  className?: string;
}

export function DSMFeatureRow({ text, included = true, icon, emoji, className = "" }: DSMFeatureRowProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {emoji ? (
        <div className="w-8 h-8 bg-gray-50 dark:bg-[#252525] rounded-lg flex items-center justify-center text-base flex-shrink-0">
          {emoji}
        </div>
      ) : icon ? (
        <DSMIcon icon={icon} size="sm" color={included ? "text-[var(--color-primary-600)] dark:text-[#809fff]" : "text-gray-400 dark:text-gray-500"} bgColor={included ? "bg-[var(--color-primary-50)] dark:bg-[rgba(51,102,255,0.1)]" : "bg-gray-100 dark:bg-[#252525]"} />
      ) : (
        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          included ? "bg-[var(--color-primary-100)] dark:bg-[rgba(51,102,255,0.15)]" : "bg-gray-100 dark:bg-[#252525]"
        }`}>
          {included ? (
            <Check className="w-3 h-3 text-[var(--color-primary-600)] dark:text-[#809fff]" />
          ) : (
            <Lock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
          )}
        </div>
      )}
      <span className={`text-sm ${included ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}>
        {text}
      </span>
      {included && !emoji && !icon && (
        <Check className="w-4 h-4 text-[var(--primary)] ml-auto flex-shrink-0" />
      )}
    </div>
  );
}

// ─── DSMStatRow ─────────────────────────────────────────────────────
// Horizontal key-value stat display.
interface DSMStatRowProps {
  label: string;
  value: string | number;
  suffix?: string;
  valueColor?: string;
  action?: ReactNode;
  className?: string;
}

export function DSMStatRow({ label, value, suffix, valueColor = "text-gray-800 dark:text-gray-200", action, className = "" }: DSMStatRowProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${valueColor}`}>
          {value}{suffix && <span className="text-gray-400 dark:text-gray-500 ml-0.5">{suffix}</span>}
        </span>
        {action}
      </div>
    </div>
  );
}

// ─── DSMListItem ────────────────────────────────────────────────────
// Standard list item with leading icon/avatar, text, and trailing content.
interface DSMListItemProps {
  icon?: LucideIcon;
  emoji?: string;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
  border?: boolean;
}

export function DSMListItem({
  icon: Icon, emoji, iconColor = "text-[var(--color-primary-600)] dark:text-[#809fff]", iconBg = "bg-[var(--color-primary-50)] dark:bg-[rgba(51,102,255,0.1)]",
  title, subtitle, trailing, onClick, className = "", border = true,
}: DSMListItemProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full text-left ${
        border ? "bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#2a2a2a]" : ""
      } ${onClick ? "hover:bg-gray-50 dark:hover:bg-[#252525] cursor-pointer active:scale-[0.99]" : ""} ${className}`}
    >
      {/* Leading */}
      {(Icon || emoji) && (
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          {emoji ? (
            <span className="text-lg">{emoji}</span>
          ) : Icon ? (
            <Icon className={`w-5 h-5 ${iconColor}`} />
          ) : null}
        </div>
      )}
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-900 dark:text-gray-100 truncate" style={{ fontWeight: 600 }}>{title}</div>
        {subtitle && <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{subtitle}</div>}
      </div>
      {/* Trailing */}
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </Tag>
  );
}

// ─── DSMNutritionBar ────────────────────────────────────────────────
// Compact macro nutrition display (calories + macros).
interface DSMNutritionBarProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  size?: "sm" | "md";
  className?: string;
}

export function DSMNutritionBar({ calories, protein, carbs, fat, size = "sm", className = "" }: DSMNutritionBarProps) {
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  return (
    <div className={`flex gap-1.5 flex-wrap ${className}`}>
      <DSMChip label={`${Math.round(calories)} kcal`} color="orange" variant="soft" size="xs" />
      <DSMChip label={`${Math.round(protein)}g F`} color="red" variant="soft" size="xs" />
      <DSMChip label={`${Math.round(carbs)}g Sz`} color="amber" variant="soft" size="xs" />
      <DSMChip label={`${Math.round(fat)}g Zs`} color="purple" variant="soft" size="xs" />
    </div>
  );
}

// ─── DSMMetricCard ──────────────────────────────────────────────────
// Compact metric display with icon, value, and label.
interface DSMMetricCardProps {
  icon?: LucideIcon;
  emoji?: string;
  value: string | number;
  label: string;
  valueColor?: string;
  iconColor?: string;
  iconBg?: string;
  className?: string;
  trend?: "up" | "down" | "neutral";
}

export function DSMMetricCard({
  icon: Icon, emoji, value, label, valueColor = "text-gray-900 dark:text-gray-100",
  iconColor = "text-[var(--color-primary-600)] dark:text-[#809fff]", iconBg = "bg-[var(--color-primary-50)] dark:bg-[rgba(51,102,255,0.1)]",
  className = "", trend,
}: DSMMetricCardProps) {
  return (
    <div className={`bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-100 dark:border-[#2a2a2a] p-3 ${className}`}>
      <div className="flex items-start gap-2.5">
        {(Icon || emoji) && (
          <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
            {emoji ? <span className="text-sm">{emoji}</span> : Icon ? <Icon className={`w-4 h-4 ${iconColor}`} /> : null}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-lg ${valueColor} truncate`} style={{ fontWeight: 800 }}>
            {value}
            {trend && (
              <span className={`text-[10px] ml-1 ${trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-gray-400 dark:text-gray-500"}`}>
                {trend === "up" ? "+" : trend === "down" ? "-" : "~"}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">{label}</div>
        </div>
      </div>
    </div>
  );
}

// ─── DSMInfoBanner ──────────────────────────────────────────────────
// Information, warning, or success banner with icon and text.
type BannerVariant = "info" | "success" | "warning" | "error";

interface DSMInfoBannerProps {
  variant?: BannerVariant;
  title?: string;
  message: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const BANNER_STYLES: Record<BannerVariant, { bg: string; border: string; iconColor: string; icon: LucideIcon }> = {
  info:    { bg: "bg-blue-50 dark:bg-blue-500/10",    border: "border-blue-200 dark:border-blue-500/20",    iconColor: "text-blue-500",    icon: Info },
  success: { bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20", iconColor: "text-emerald-500", icon: CheckCircle2 },
  warning: { bg: "bg-amber-50 dark:bg-amber-500/10",   border: "border-amber-200 dark:border-amber-500/20",   iconColor: "text-amber-500",   icon: AlertTriangle },
  error:   { bg: "bg-red-50 dark:bg-red-500/10",     border: "border-red-200 dark:border-red-500/20",     iconColor: "text-red-500",     icon: XCircle },
};

export function DSMInfoBanner({
  variant = "info", title, message, icon, action, className = "",
  dismissible, onDismiss,
}: DSMInfoBannerProps) {
  const style = BANNER_STYLES[variant];
  const BannerIcon = icon || style.icon;

  return (
    <div className={`${style.bg} rounded-xl p-3.5 border ${style.border} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <BannerIcon className={`w-4 h-4 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          {title && <div className="text-sm text-gray-900 dark:text-gray-100 mb-0.5" style={{ fontWeight: 600 }}>{title}</div>}
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{message}</p>
          {action && <div className="mt-2">{action}</div>}
        </div>
        {dismissible && onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0">
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── DSMActionCard ──────────────────────────────────────────────────
// Card with a gradient header strip and body content.
interface DSMActionCardProps {
  headerGradient?: string;
  headerIcon?: LucideIcon;
  headerLabel: string;
  children: ReactNode;
  className?: string;
}

export function DSMActionCard({
  headerGradient = "bg-gradient-to-r from-[#3366FF] to-[#12CFA6]",
  headerIcon: Icon,
  headerLabel,
  children,
  className = "",
}: DSMActionCardProps) {
  return (
    <div className={`bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2a2a2a] overflow-hidden ${className}`}>
      <div className={`${headerGradient} p-3`}>
        <div className="flex items-center gap-2 text-white">
          {Icon && <Icon className="w-4 h-4" />}
          <span className="text-sm font-bold text-white">{headerLabel}</span>
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

// ─── DSMFormField ───────────────────────────────────────────────────
// Label + input wrapper for form consistency.
interface DSMFormFieldProps {
  label: string;
  icon?: LucideIcon;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function DSMFormField({ label, icon: Icon, required, error, hint, children, className = "" }: DSMFormFieldProps) {
  return (
    <div className={className}>
      <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
      {hint && !error && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

// ─── DSMFeatureGrid ─────────────────────────────────────────────────
// Grid display for features/benefits with icons.
interface FeatureItem {
  icon: LucideIcon;
  label: string;
  description?: string;
  iconColor?: string;
  iconBg?: string;
}

interface DSMFeatureGridProps {
  features: FeatureItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function DSMFeatureGrid({ features, columns = 2, className = "" }: DSMFeatureGridProps) {
  const gridClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  }[columns];

  return (
    <div className={`grid ${gridClass} gap-3 ${className}`}>
      {features.map((f, i) => (
        <div key={i} className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-100 dark:border-[#2a2a2a] p-3 flex flex-col items-center text-center gap-2">
          <div className={`w-10 h-10 ${f.iconBg || "bg-[var(--color-primary-50)] dark:bg-[rgba(51,102,255,0.1)]"} rounded-xl flex items-center justify-center`}>
            <f.icon className={`w-5 h-5 ${f.iconColor || "text-[var(--color-primary-600)] dark:text-[#809fff]"}`} />
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300" style={{ fontWeight: 600 }}>{f.label}</div>
          {f.description && <div className="text-[10px] text-gray-400 dark:text-gray-500">{f.description}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── DSMPriceDisplay ────────────────────────────────────────────────
// Standardized price display with optional original price strikethrough.
interface DSMPriceDisplayProps {
  amount: number | string;
  currency?: string;
  period?: string;
  originalAmount?: number | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function DSMPriceDisplay({
  amount, currency = "lei", period, originalAmount, size = "md", className = "",
}: DSMPriceDisplayProps) {
  const sizeClass = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  }[size];

  return (
    <div className={`flex items-baseline gap-1.5 ${className}`}>
      {originalAmount && (
        <span className="text-gray-400 dark:text-gray-500 line-through text-sm">{originalAmount}</span>
      )}
      <span className={`${sizeClass} text-gray-900 dark:text-gray-100`} style={{ fontWeight: 800 }}>
        {amount}
      </span>
      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
        {currency}{period && ` / ${period}`}
      </span>
    </div>
  );
}