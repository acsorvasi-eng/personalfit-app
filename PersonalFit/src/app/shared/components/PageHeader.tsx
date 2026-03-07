/**
 * PageHeader — Universal header for every page (Design System Rule 1).
 * Full width, gradient, sticky, 48px top padding, optional close/back, stats, action.
 */

import { ReactNode } from "react";

export interface PageHeaderStatItem {
  label: string;
  value: string | number;
  suffix?: string;
  onClick?: () => void;
  isAction?: boolean;
}

export interface PageHeaderProps {
  title: string;
  titleElement?: ReactNode;
  subtitle?: string;
  onClose?: () => void;
  onBack?: () => void;
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
  onBack,
  stats,
  action,
  children,
}: PageHeaderProps) {
  return (
    <div
      style={{
        width: "100%",
        borderRadius: 0,
        paddingTop: "48px",
        paddingBottom: "1rem",
        paddingLeft: "1rem",
        paddingRight: "1rem",
        background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #14b8a6 100%)",
        color: "white",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxSizing: "border-box",
      }}
    >
      {(onClose ?? onBack) && (
        <button
          type="button"
          onClick={onClose ?? onBack}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            width: "2rem",
            height: "2rem",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "50%",
            color: "white",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1rem",
          }}
          aria-label={onClose ? "Close" : "Back"}
        >
          {onClose ? "✕" : "←"}
        </button>
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
        {action != null && <div style={{ flexShrink: 0 }}>{action}</div>}
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
              <div style={{ fontSize: "0.7rem", marginTop: 2, opacity: 0.9 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}
      {children != null && <div style={{ marginTop: "0.75rem" }}>{children}</div>}
    </div>
  );
}
