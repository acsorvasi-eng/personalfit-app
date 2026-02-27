/**
 * ====================================================================
 * DSM UX PATTERNS - Advanced interaction patterns for optimized flows
 * ====================================================================
 * These are higher-level UX components that solve specific interaction
 * problems identified in user flow analysis:
 *
 * - DSMBottomSheet: Slide-up action panel (replaces full-page navigations)
 * - DSMCoachMark: First-use tooltip/onboarding overlay
 * - DSMQuickAction: Floating quick action button with radial menu
 * - DSMProgressSteps: Multi-step flow progress indicator
 * - DSMPullToAction: Pull-to-refresh/action gesture handler
 * - DSMSwipeAction: Swipe-to-reveal action on list items
 * - DSMFeedbackPulse: Micro-interaction feedback animation
 * ====================================================================
 */

import { ReactNode, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { X, Lightbulb } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── DSMBottomSheet ─────────────────────────────────────────────────
// Slide-up overlay panel. Replaces full-page navigations for quick actions.
// Supports snap points: "peek" (25%), "half" (50%), "full" (85%).
// Reduces navigation depth and preserves parent context.

interface DSMBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  snapPoint?: "peek" | "half" | "full";
  showHandle?: boolean;
  className?: string;
}

const SNAP_HEIGHTS = {
  peek: "35vh",
  half: "55vh",
  full: "90vh",
};

export function DSMBottomSheet({
  open, onClose, title, subtitle, icon: Icon, children,
  snapPoint = "half", showHandle = true, className = "",
}: DSMBottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1E1E1E] rounded-t-3xl shadow-2xl overflow-hidden ${className}`}
            style={{ maxHeight: SNAP_HEIGHTS[snapPoint] }}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-[#333]" />
              </div>
            )}

            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-[#2a2a2a]">
                <div className="flex items-center gap-3 min-w-0">
                  {Icon && (
                    <div className="w-9 h-9 bg-[var(--color-primary-50)] dark:bg-[rgba(51,102,255,0.1)] rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4.5 h-4.5 text-[var(--color-primary-600)] dark:text-[#809fff]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    {title && <div className="text-sm text-gray-900 dark:text-gray-100 truncate" style={{ fontWeight: 700 }}>{title}</div>}
                    {subtitle && <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{subtitle}</div>}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#252525] flex items-center justify-center flex-shrink-0 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: `calc(${SNAP_HEIGHTS[snapPoint]} - 100px)` }}>
              {children}
            </div>

            {/* Safe area spacer */}
            <div className="h-[env(safe-area-inset-bottom,8px)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── DSMCoachMark ───────────────────────────────────────────────────
// First-use discovery tooltip. Shows once per feature, then stored in localStorage.
// Used to teach long-press, swipe, and other non-obvious gestures.

interface DSMCoachMarkProps {
  id: string;                    // Unique localStorage key
  title: string;
  message: string;
  icon?: LucideIcon;
  position?: "top" | "bottom";   // Arrow direction
  onDismiss?: () => void;
  delay?: number;                // ms before showing
  className?: string;
  forceShow?: boolean;           // Override localStorage (for testing)
}

export function DSMCoachMark({
  id, title, message, icon: Icon, position = "bottom",
  onDismiss, delay = 800, className = "", forceShow = false,
}: DSMCoachMarkProps) {
  const [visible, setVisible] = useState(false);
  const storageKey = `coach_${id}`;

  useEffect(() => {
    if (forceShow) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }

    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [storageKey, delay, forceShow]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(storageKey, "true");
    onDismiss?.();
  }, [storageKey, onDismiss]);

  const CoachIcon = Icon || Lightbulb;
  const arrowClass = position === "top"
    ? "bottom-full mb-2"
    : "top-full mt-2";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: position === "top" ? 8 : -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className={`absolute ${arrowClass} left-1/2 -translate-x-1/2 z-50 ${className}`}
        >
          <div className="relative bg-white dark:bg-[#1E1E1E] text-gray-800 rounded-2xl px-4 py-3.5 shadow-xl border border-[var(--color-primary-200)]/60 dark:border-[rgba(51,102,255,0.3)] max-w-[280px] min-w-[210px]">
            {/* Speech bubble tail */}
            <div className={`absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white dark:bg-[#1E1E1E] border-[var(--color-primary-200)]/60 dark:border-[rgba(51,102,255,0.3)] rotate-45 ${
              position === "top" ? "-bottom-[7px] border-b border-r" : "-top-[7px] border-t border-l"
            }`} />

            <div className="relative flex items-start gap-2.5">
              <div className="w-8 h-8 bg-[var(--color-primary-50)] dark:bg-[rgba(51,102,255,0.1)] rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <CoachIcon className="w-4 h-4 text-[var(--primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-gray-900 mb-0.5" style={{ fontWeight: 700 }}>{title}</div>
                <div className="text-[12px] text-gray-500 leading-relaxed">{message}</div>
              </div>
              <button
                onClick={dismiss}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>

            {/* Got it button */}
            <button
              onClick={dismiss}
              className="w-full mt-3 py-2 bg-gradient-to-r from-[#3366FF] to-[#12CFA6] hover:from-[#2952cc] hover:to-[#0ea685] text-white rounded-xl text-[12px] font-bold transition-colors shadow-sm"
            >
              Értem! 👍
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── DSMProgressSteps ───────────────────────────────────────────────
// Multi-step flow progress indicator. Used for onboarding, checkout, etc.

interface ProgressStep {
  label: string;
  icon?: LucideIcon;
}

interface DSMProgressStepsProps {
  steps: ProgressStep[];
  currentStep: number;
  className?: string;
}

export function DSMProgressSteps({ steps, currentStep, className = "" }: DSMProgressStepsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = i < currentStep;

        return (
          <div key={i} className="flex items-center gap-1 flex-1">
            {/* Step dot/number */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
              isCompleted
                ? "bg-[var(--primary)] text-white"
                : isActive
                ? "bg-[var(--color-primary-100)] dark:bg-[rgba(51,102,255,0.15)] text-[var(--color-primary-600)] dark:text-[#809fff] ring-2 ring-[var(--color-primary-400)] ring-offset-1 dark:ring-offset-[#1E1E1E]"
                : "bg-gray-100 dark:bg-[#252525] text-gray-400 dark:text-gray-500"
            }`}>
              {isCompleted ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : step.icon ? (
                <step.icon className="w-3.5 h-3.5" />
              ) : (
                <span className="text-[11px] font-bold">{i + 1}</span>
              )}
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
                isCompleted ? "bg-[var(--color-primary-400)]" : "bg-gray-200 dark:bg-[#2a2a2a]"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── DSMFeedbackPulse ───────────────────────────────────────────────
// Micro-interaction: pulse animation on action completion.
// Wraps any element and triggers a pulse effect on demand.

interface DSMFeedbackPulseProps {
  trigger: boolean;
  color?: string;
  children: ReactNode;
  className?: string;
}

export function DSMFeedbackPulse({ trigger, color = "bg-[var(--color-primary-400)]", children, className = "" }: DSMFeedbackPulseProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <AnimatePresence>
        {trigger && (
          <motion.div
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`absolute inset-0 rounded-full ${color} pointer-events-none`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── DSMSwipeAction ─────────────────────────────────────────────────
// Swipe-to-reveal action on list items. Used for quick delete/archive.

interface DSMSwipeActionProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { icon: LucideIcon; color: string; label: string };
  rightAction?: { icon: LucideIcon; color: string; label: string };
  threshold?: number;
  className?: string;
}

export function DSMSwipeAction({
  children, onSwipeLeft, onSwipeRight,
  leftAction, rightAction, threshold = 80, className = "",
}: DSMSwipeActionProps) {
  const x = useMotionValue(0);
  const leftOpacity = useTransform(x, [-threshold, 0], [1, 0]);
  const rightOpacity = useTransform(x, [0, threshold], [0, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -threshold && onSwipeLeft) {
      onSwipeLeft();
    } else if (info.offset.x > threshold && onSwipeRight) {
      onSwipeRight();
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Left reveal (swipe right) */}
      {rightAction && (
        <motion.div
          style={{ opacity: rightOpacity }}
          className={`absolute inset-y-0 left-0 w-20 ${rightAction.color} flex items-center justify-center`}
        >
          <rightAction.icon className="w-5 h-5 text-white" />
        </motion.div>
      )}

      {/* Right reveal (swipe left) */}
      {leftAction && (
        <motion.div
          style={{ opacity: leftOpacity }}
          className={`absolute inset-y-0 right-0 w-20 ${leftAction.color} flex items-center justify-center`}
        >
          <leftAction.icon className="w-5 h-5 text-white" />
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: leftAction ? -120 : 0, right: rightAction ? 120 : 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="relative bg-white dark:bg-[#1E1E1E] z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}

// ─── DSMEmptyFlow ──────────────────────────────────────────────────
// Guides users when a section has no data — with actionable CTA.
// More contextual than DSMEmptyState: includes flow-specific guidance.

interface DSMEmptyFlowProps {
  emoji?: string;
  icon?: LucideIcon;
  title: string;
  steps: string[];
  actionLabel: string;
  onAction: () => void;
  className?: string;
}

export function DSMEmptyFlow({
  emoji, icon: Icon, title, steps, actionLabel, onAction, className = "",
}: DSMEmptyFlowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] p-6 text-center shadow-sm ${className}`}
    >
      {emoji && <div className="text-4xl mb-3">{emoji}</div>}
      {Icon && (
        <div className="w-14 h-14 mx-auto bg-[var(--color-primary-50)] dark:bg-[rgba(51,102,255,0.1)] rounded-2xl flex items-center justify-center mb-3">
          <Icon className="w-7 h-7 text-[var(--primary)]" />
        </div>
      )}
      <h3 className="text-gray-900 dark:text-gray-100 mb-3" style={{ fontWeight: 700 }}>{title}</h3>

      <div className="space-y-2 mb-5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5 text-left">
            <div className="w-5 h-5 bg-[var(--color-primary-100)] dark:bg-[rgba(51,102,255,0.15)] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] text-[var(--color-primary-600)] dark:text-[#809fff] font-bold">{i + 1}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{step}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onAction}
        className="w-full py-2.5 bg-gradient-to-r from-[#3366FF] to-[#12CFA6] text-white rounded-xl text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
        style={{ fontWeight: 700 }}
      >
        {actionLabel}
      </button>
    </motion.div>
  );
}

// ─── useCoachMarks hook ─────────────────────────────────────────────
// Manages coach mark visibility globally across the app.

export function useCoachMarks() {
  const isCoachSeen = useCallback((id: string): boolean => {
    return localStorage.getItem(`coach_${id}`) === "true";
  }, []);

  const markCoachSeen = useCallback((id: string) => {
    localStorage.setItem(`coach_${id}`, "true");
  }, []);

  const resetCoachMark = useCallback((id: string) => {
    localStorage.removeItem(`coach_${id}`);
  }, []);

  const resetAllCoachMarks = useCallback(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith("coach_"));
    keys.forEach(k => localStorage.removeItem(k));
  }, []);

  return { isCoachSeen, markCoachSeen, resetCoachMark, resetAllCoachMarks };
}