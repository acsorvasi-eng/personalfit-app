/**
 * PageHeader - Design System Component
 * 
 * Standardized header component for all main app screens.
 * Features a gradient background with rounded bottom corners,
 * icon + title/subtitle, optional action button, and stat cards.
 * 
 * Based on Figma DSM specification:
 * - Rounded bottom corners (rounded-b-3xl)
 * - White/20 icon container with backdrop blur
 * - Semi-transparent stat cards with large numbers
 * - Poppins font for titles (via theme.css h1/h2)
 * - Inter font for body text (via theme.css)
 */

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatItem {
  label: string;
  value: string | number;
  suffix?: string;
  onClick?: () => void;
  isAction?: boolean;
  /** Override the default bg/border classes for this stat card */
  bgClass?: string;
}

interface PageHeaderProps {
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Custom icon element (e.g., avatar, emoji, SVG) */
  iconElement?: ReactNode;
  /** Page title */
  title: string;
  /** Custom title element (overrides title string, e.g., editable input) */
  titleElement?: ReactNode;
  /** Subtitle / description */
  subtitle?: string;
  /** Tailwind gradient start class */
  gradientFrom?: string;
  /** Tailwind gradient middle class (optional) */
  gradientVia?: string;
  /** Tailwind gradient end class */
  gradientTo?: string;
  /** Optional action button (top-right) */
  action?: ReactNode;
  /** Optional stat cards displayed below title */
  stats?: StatItem[];
  /** Extra content below the header (e.g., search bar) */
  children?: ReactNode;
  /** Whether to apply rounded bottom corners (default: true) */
  roundedBottom?: boolean;
}

export function PageHeader({
  icon: Icon,
  iconElement,
  title,
  titleElement,
  subtitle,
  gradientFrom = 'from-[#3366FF]',
  gradientVia,
  gradientTo = 'to-[#12CFA6]',
  action,
  stats,
  children,
  roundedBottom = false
}: PageHeaderProps) {
  const gradientClasses = [
    'bg-gradient-to-br',
    gradientFrom,
    gradientVia || '',
    gradientTo
  ].filter(Boolean).join(' ');

  return (
    <div className={`${gradientClasses} ${roundedBottom ? 'rounded-b-3xl' : ''} shadow-lg text-white relative overflow-hidden`}>
      {/* Subtle decorative circles */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" aria-hidden="true" />
      <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full" aria-hidden="true" />
      {/* Extra decorative circle for desktop */}
      <div className="absolute top-1/2 left-1/3 w-56 h-56 bg-white/3 rounded-full hidden lg:block" aria-hidden="true" />

      <div className="relative z-10 px-4 pt-6 pb-4 sm:px-6 sm:pt-8 sm:pb-5 lg:px-8 lg:pt-10 lg:pb-6">
        {/* Top row: Icon + Title + Action */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Icon container */}
            {(Icon || iconElement) && (
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                {Icon ? <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" /> : iconElement}
              </div>
            )}

            {/* Title & Subtitle */}
            <div className="flex-1 min-w-0">
              {titleElement ? titleElement : (
                <h1 className="text-white truncate">{title}</h1>
              )}
              {subtitle && (
                <p className="text-white/80 text-xs sm:text-sm mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Action Button */}
          {action && (
            <div className="flex-shrink-0 ml-3">
              {action}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        {stats && stats.length > 0 && (
          <div className={`grid gap-2 sm:gap-3 mt-3 sm:mt-4 ${
            stats.length === 2 ? 'grid-cols-2' :
            stats.length === 3 ? 'grid-cols-3' :
            stats.length === 4 ? 'grid-cols-2 sm:grid-cols-4' :
            'grid-cols-2'
          }`}>
            {stats.map((stat, index) => {
              const isClickable = !!stat.onClick;
              return (
                <div
                  key={index}
                  onClick={stat.onClick}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stat.onClick?.(); } } : undefined}
                  className={`backdrop-blur-sm rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-center border transition-all ${
                    stat.bgClass
                      ? `${stat.bgClass} ${isClickable ? 'cursor-pointer hover:scale-[1.03] active:scale-95 shadow-lg ring-1 ring-white/20' : ''}`
                      : isClickable
                        ? 'bg-white/30 border-white/40 cursor-pointer hover:bg-white/40 hover:scale-[1.03] active:scale-95 shadow-lg ring-1 ring-white/20'
                        : 'bg-white/15 border-white/10'
                  }`}
                >
                  <div className={`text-xl sm:text-2xl font-black text-white tracking-tight ${
                    isClickable ? 'drop-shadow-md' : ''
                  }`}>
                    {stat.isAction ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-white/25 rounded-full text-2xl sm:text-3xl shadow-inner">
                        {stat.value}
                      </span>
                    ) : (
                      <>
                        {stat.value}
                        {stat.suffix && (
                          <span className="text-xs sm:text-sm font-semibold ml-1 opacity-80">{stat.suffix}</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className={`text-[11px] sm:text-[13px] mt-0.5 font-medium ${
                    isClickable ? 'text-white/90' : 'text-white/75'
                  }`}>{stat.label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Optional children (e.g. inline search) */}
        {children && <div className="mt-3 sm:mt-4">{children}</div>}
      </div>
    </div>
  );
}