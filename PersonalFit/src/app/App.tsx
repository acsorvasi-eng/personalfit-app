/**
 * App - Root component
 * RouterProvider renders the router tree.
 * Providers (Theme, Language, Auth) are inside RootLayout so they're
 * accessible to all route components.
 *
 * Includes a global ErrorBoundary so any crash is displayed on screen
 * instead of a blank white page.
 */

import { Component, type ReactNode, type ErrorInfo, useState, useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";

// ─── Global Error Boundary ──────────────────────────────────────────
interface EBProps { children: ReactNode; }
interface EBState { error: Error | null; info: ErrorInfo | null; }

class ErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    console.error("[ErrorBoundary] Caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "monospace", background: "#1a1a2e", color: "#e0e0e0", minHeight: "100vh", overflow: "auto" }}>
          <h1 style={{ color: "#ff6b6b", fontSize: 20, marginBottom: 12 }}>⚠️ React Error Boundary Caught an Error</h1>
          <div style={{ background: "#16213e", border: "1px solid #e94560", borderRadius: 8, padding: 16, marginBottom: 16, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            <strong style={{ color: "#e94560" }}>{this.state.error.name}:</strong>{" "}
            {this.state.error.message}
          </div>
          <details open style={{ marginBottom: 16 }}>
            <summary style={{ cursor: "pointer", color: "#0f3460", fontWeight: "bold" }}>Stack Trace</summary>
            <pre style={{ background: "#0f3460", padding: 12, borderRadius: 8, fontSize: 11, lineHeight: 1.5, overflow: "auto", maxHeight: 400 }}>
              {this.state.error.stack}
            </pre>
          </details>
          {this.state.info?.componentStack && (
            <details style={{ marginBottom: 16 }}>
              <summary style={{ cursor: "pointer", color: "#0f3460", fontWeight: "bold" }}>Component Stack</summary>
              <pre style={{ background: "#0f3460", padding: 12, borderRadius: 8, fontSize: 11, lineHeight: 1.5, overflow: "auto", maxHeight: 300 }}>
                {this.state.info.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={() => { this.setState({ error: null, info: null }); window.location.reload(); }}
            style={{ background: "#e94560", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Module-level / unhandled error catcher ─────────────────────────
function GlobalErrorCatcher({ children }: { children: ReactNode }) {
  const [uncaughtError, setUncaughtError] = useState<string | null>(null);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Defer state update to avoid "Cannot update during render" cascade
      queueMicrotask(() => {
        setUncaughtError(`[window.onerror] ${event.message}\n\nSource: ${event.filename}:${event.lineno}:${event.colno}\n\nStack:\n${event.error?.stack || "(no stack)"}`);
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? `${reason.message}\n\n${reason.stack}` : String(reason);
      // Defer state update to avoid "Cannot update during render" cascade
      queueMicrotask(() => {
        setUncaughtError(`[Unhandled Promise Rejection]\n${msg}`);
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (uncaughtError) {
    return (
      <div style={{ padding: 24, fontFamily: "monospace", background: "#1a1a2e", color: "#e0e0e0", minHeight: "100vh", overflow: "auto" }}>
        <h1 style={{ color: "#ff6b6b", fontSize: 20, marginBottom: 12 }}>⚠️ Uncaught Global Error</h1>
        <pre style={{ background: "#16213e", border: "1px solid #e94560", borderRadius: 8, padding: 16, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
          {uncaughtError}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 16, background: "#e94560", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}
        >
          Reload App
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Root App ────────────────────────────────────────────────────────
export default function App() {
  return (
    <GlobalErrorCatcher>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </GlobalErrorCatcher>
  );
}