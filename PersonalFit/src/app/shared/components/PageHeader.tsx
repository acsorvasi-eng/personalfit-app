/**
 * PageHeader — Universal header for every page (Design System Rule 1).
 * Full width, gradient, sticky, safe-area-aware top padding, optional X close (top right), stats, action.
 * Top padding = env(safe-area-inset-top) + 0.5rem — fits perfectly under iOS & Android status bars.
 * Navigation rule: subpages use onClose only (X button); never use back arrows (←).
 */

import { ReactNode } from "react";
import { X } from "lucide-react";

export interface PageHeaderStatItem {
  label: string;
  value: ReactNode;
  suffix?: string;
  onClick?: () => void;
  isAction?: boolean;
}

export interface PageHeaderProps {
  title: string;
  titleElement?: ReactNode;
  subtitle?: string;
  /** If provided, shows X close button top right (subpages only). Main tabs have no close button. */
  onClose?: () => void;
  /** Optional right-side element (e.g. extra actions). Close button is separate. */
  rightElement?: ReactNode;
  /** Optional stat cards row below title */
  stats?: PageHeaderStatItem[];
  /** Optional top-right action (e.g. AI button) */
  action?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({
  title,
  titleElement,
  subtitle,
  onClose,
  rightElement,
  stats,
  action,
  children,
}: PageHeaderProps) {
  return (
    <div
      style={{
        width: "100%",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)",
        color: "white",
        paddingTop: "calc(env(safe-area-inset-top, 20px) + 0.5rem)",
        paddingBottom: "1.25rem",
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "calc(env(safe-area-inset-top, 20px) + 0.5rem)",
            right: "1rem",
            width: "2rem",
            height: "2rem",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
            zIndex: 10,
          }}
          aria-label="Close"
        >
          <X size={18} color="white" />
        </button>
      )}
      {rightElement != null && (
        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 20px) + 0.5rem)", right: onClose ? "3.5rem" : "1rem" }}>
          {rightElement}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {titleElement != null ? (
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "white" }}>{titleElement}</div>
          ) : (
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "white" }}>{title}</h1>
          )}
          {subtitle && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "rgba(255,255,255,0.8)" }}>{subtitle}</p>
          )}
        </div>
        {action != null && <div style={{ flexShrink: 0, marginRight: onClose ? '2.5rem' : 0 }}>{action}</div>}
      </div>
      {stats != null && stats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`, gap: "0.5rem", marginTop: "0.75rem" }}>
          {stats.map((stat, i) => (
            <div
              key={i}
              role={stat.onClick ? "button" : undefined}
              onClick={stat.onClick}
              onKeyDown={stat.onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stat.onClick?.(); } } : undefined}
              tabIndex={stat.onClick ? 0 : undefined}
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: "0.75rem",
                padding: "0.5rem 0.75rem",
                textAlign: "center",
                cursor: stat.onClick ? "pointer" : undefined,
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                {stat.isAction ? <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "rgba(255,255,255,0.25)", borderRadius: "50%" }}>{stat.value}</span> : <>{stat.value}{stat.suffix != null ? ` ${stat.suffix}` : ""}</>}
              </div>
              <div style={{ fontSize: "0.75rem", marginTop: 2, opacity: 0.9 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}
      {children != null && <div style={{ marginTop: "0.75rem" }}>{children}</div>}
    </div>
  );
}
