/**
 * PageFooter — Universal fixed footer for primary action (Design System Rule 2).
 * White background, 2px top border, shadow, safe-area inset.
 */

import { ReactNode } from "react";

export interface PageFooterProps {
  children: ReactNode;
}

export function PageFooter({ children }: PageFooterProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        padding: "1rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px))",
        background: "white",
        borderTop: "2px solid #e5e7eb",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
        zIndex: 50,
        boxSizing: "border-box",
      }}
      className=""
    >
      {children}
    </div>
  );
}

/** Primary action button style for use inside PageFooter (e.g. Save / Mentés). */
export function PageFooterPrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "1rem",
        borderRadius: "0.75rem",
        background: "#0d9488",
        color: "white",
        fontSize: "1rem",
        fontWeight: 700,
        border: "none",
        boxShadow: "0 4px 12px rgba(13,148,136,0.35)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
