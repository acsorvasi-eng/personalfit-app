/**
 * Global lightweight toast system for auto-save feedback.
 * No context needed — use showToast() from anywhere.
 */

import { useState, useEffect } from "react";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
  duration?: number;
}

export function showToast(
  message: string,
  type: "success" | "info" | "warning" = "success"
) {
  window.dispatchEvent(
    new CustomEvent("showToast", {
      detail: {
        id: Date.now().toString(),
        message,
        type,
        duration: 2500,
      },
    })
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const toast = (e as CustomEvent<ToastMessage>).detail;
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration ?? 2500);
    };
    window.addEventListener("showToast", handler);
    return () => window.removeEventListener("showToast", handler);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "6rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background:
              toast.type === "success"
                ? "#111827"
                : toast.type === "warning"
                  ? "#92400e"
                  : "#1e40af",
            color: "white",
            padding: "0.625rem 1.25rem",
            borderRadius: "999px",
            fontSize: "0.875rem",
            fontWeight: 500,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            whiteSpace: "nowrap",
            animation: "toastIn 0.25s ease-out",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            minWidth: "200px",
            maxWidth: "90vw",
            textAlign: "center",
          }}
        >
          {toast.type === "success" && "✓"}
          {toast.type === "warning" && "⚠️"}
          {toast.type === "info" && "ℹ️"}
          {toast.message}
        </div>
      ))}
    </div>
  );
}
