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
        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-base flex-shrink-0">
          {emoji}
        </div>
      ) : icon ? (
        <DSMIcon icon={icon} size="sm" color={included ? "text-[var(--primary-hover)]" : "text-gray-400"} bgColor={included ? "bg-[var(--primary-light)]" : "bg-gray-100"} />
      ) : (
        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          included ? "bg-[var(--primary-light)]" : "bg-gray-100"
        }`}>
          {included ? (
            <Check className="w-3 h-3 text-[var(--primary-hover)]" />
          ) : (
            <Lock className="w-3 h-3 text-gray-400" />
          )}
        </div>
      )}
      <span className={`text-sm ${included ? "text-gray-700" : "text-gray-400"}`}>
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

export function DSMStatRow({ label, value, suffix, valueColor = "text-gray-800", action, className = "" }: DSMStatRowProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${valueColor}`}>
          {value}{suffix && <span className="text-gray-400 ml-0.5">{suffix}</span>}
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
  icon: Icon, emoji, iconColor = "text-[var(--primary-hover)]", iconBg = "bg-[var(--primary-light)]",
  title, subtitle, trailing, onClick, className = "", border = true,
}: DSMListItemProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full text-left ${
        border ? "bg-white border border-gray-100" : ""
      } ${onClick ? "hover:bg-gray-50 cursor-pointer active:scale-[0.99]" : ""} ${className}`}
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
        <div className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{title}</div>
        {subtitle && <div className="text-[11px] text-gray-400 truncate mt-0.5">{subtitle}</div>}
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
  const textSize = size === "sm" ? "text-2xs" : "text-xs";
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
  icon: Icon, emoji, value, label, valueColor = "text-gray-900",
  iconColor = "text-[var(--primary-hover)]", iconBg = "bg-[var(--primary-light)]",
  className = "", trend,
}: DSMMetricCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-3 ${className}`}>
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
              <span className={`text-2xs ml-1 ${trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-gray-400"}`}>
                {trend === "up" ? "+" : trend === "down" ? "-" : "~"}
              </span>
            )}
          </div>
          <div className="text-2xs text-gray-400 font-medium mt-0.5">{label}</div>
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
  info:    { bg: "bg-blue-50",    border: "border-blue-200",    iconColor: "text-blue-500",    icon: Info },
  success: { bg: "bg-emerald-50", border: "border-emerald-200", iconColor: "text-emerald-500", icon: CheckCircle2 },
  warning: { bg: "bg-amber-50",   border: "border-amber-200",   iconColor: "text-amber-500",   icon: AlertTriangle },
  error:   { bg: "bg-red-50",     border: "border-red-200",     iconColor: "text-red-500",     icon: XCircle },
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
          {title && <div className="text-sm text-gray-900 mb-0.5" style={{ fontWeight: 600 }}>{title}</div>}
          <p className="text-xs text-gray-600 leading-relaxed">{message}</p>
          {action && <div className="mt-2">{action}</div>}
        </div>
        {dismissible && onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
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
  headerGradient = "bg-primary",
  headerIcon: Icon,
  headerLabel,
  children,
  className = "",
}: DSMActionCardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
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
      <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-2xs text-red-500 mt-1">{error}</p>}
      {hint && !error && <p className="text-2xs text-gray-400 mt-1">{hint}</p>}
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
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col items-center text-center gap-2">
          <div className={`w-10 h-10 ${f.iconBg || "bg-[var(--primary-light)]"} rounded-xl flex items-center justify-center`}>
            <f.icon className={`w-5 h-5 ${f.iconColor || "text-[var(--primary-hover)]"}`} />
          </div>
          <div className="text-xs text-gray-700" style={{ fontWeight: 600 }}>{f.label}</div>
          {f.description && <div className="text-2xs text-gray-400">{f.description}</div>}
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
        <span className="text-gray-400 line-through text-sm">{originalAmount}</span>
      )}
      <span className={`${sizeClass} text-gray-900`} style={{ fontWeight: 800 }}>
        {amount}
      </span>
      <span className="text-xs text-gray-400 font-medium">
        {currency}{period && ` / ${period}`}
      </span>
    </div>
  );
}

// ─── DSMTabList ──────────────────────────────────────────────────────
// Replaces TabFilter, custom food category tabs, meal type selectors.
interface DSMTabListProps {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}

export function DSMTabList({ tabs, value, onChange, variant = 'pill', className = "" }: DSMTabListProps) {
  if (variant === 'underline') {
    return (
      <div className={`flex border-b border-border ${className}`}>
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
              ${value === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${value === tab.value
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── DSMMealCard ─────────────────────────────────────────────────────
// Replaces per-screen food/meal card patterns in Foods, UnifiedMenu, LogMeal.
interface DSMMealCardProps {
  title: string;
  subtitle?: string;
  calories?: number;
  macros?: { protein?: number; carbs?: number; fat?: number };
  imageUrl?: string;
  emoji?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  className?: string;
}

export function DSMMealCard({ title, subtitle, calories, macros, imageUrl, emoji, onPress, trailing, className = "" }: DSMMealCardProps) {
  return (
    <div
      onClick={onPress}
      className={`flex items-center gap-3 p-3 bg-background rounded-xl border border-border ${onPress ? 'active:bg-gray-50 cursor-pointer' : ''} ${className}`}
    >
      {(imageUrl || emoji) && (
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {imageUrl
            ? <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            : <span className="text-2xl">{emoji}</span>
          }
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        {(calories != null || macros) && (
          <div className="flex items-center gap-2 mt-1">
            {calories != null && <span className="text-xs text-gray-500">{calories} kcal</span>}
            {macros?.protein != null && <DSMChip label={`P ${macros.protein}g`} color="blue" size="sm" />}
            {macros?.carbs != null && <DSMChip label={`C ${macros.carbs}g`} color="amber" size="sm" />}
            {macros?.fat != null && <DSMChip label={`F ${macros.fat}g`} color="red" size="sm" />}
          </div>
        )}
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </div>
  );
}

// ─── DSMPremiumCard ──────────────────────────────────────────────────
// Replaces subscription plan cards in SubscriptionScreen, Checkout, PlanSetupScreen.
interface DSMPremiumCardProps {
  title: string;
  description?: string;
  price?: string;
  period?: string;
  badge?: string;
  features?: string[];
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

export function DSMPremiumCard({ title, description, price, period, badge, features, selected, onPress, className = "" }: DSMPremiumCardProps) {
  return (
    <div
      onClick={onPress}
      className={`relative p-4 rounded-2xl border-2 transition-all
        ${onPress ? 'cursor-pointer' : ''}
        ${selected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-gray-300'}
        ${className}`}
    >
      {badge && (
        <span className="absolute -top-2.5 left-4 bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading font-semibold text-foreground">{title}</h3>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
        {price && (
          <div className="text-right flex-shrink-0">
            <span className="text-lg font-bold text-foreground">{price}</span>
            {period && <span className="text-xs text-gray-500 block">{period}</span>}
          </div>
        )}
      </div>
      {features && features.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">✓</span>
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
