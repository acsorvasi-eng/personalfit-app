/**
 * ====================================================================
 * DSMProfileTabs - Segmented tabs for Profile screen sections
 * ====================================================================
 * Reduces cognitive load by splitting the Profile page into:
 *   - Adatok (personal data + stats)
 *   - Haladas (weight chart + progress)
 *   - Fiokok (subscription, apps, settings)
 *
 * Follows 2026 UX best practice: progressive disclosure.
 * ====================================================================
 */

import { useState, ReactNode } from "react";
import { motion } from "framer-motion";

interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface DSMProfileTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  children: (activeTab: string) => ReactNode;
  className?: string;
  ariaLabel?: string;
  /** Pill style: light grey container, white active tab, no colors/gradients */
  variant?: "default" | "pill";
}

export function DSMProfileTabs({ tabs, defaultTab, children, className = "", ariaLabel, variant = "default" }: DSMProfileTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");

  const isPill = variant === "pill";

  return (
    <div className={className}>
      {/* Tab Strip */}
      <div
        role="tablist"
        aria-label={ariaLabel || "Profile sections"}
        style={isPill ? {
          display: "flex",
          background: "#f3f4f6",
          borderRadius: 999,
          padding: 4,
          margin: "1rem 0",
          gap: 2,
        } : undefined}
        className={!isPill ? "flex bg-gray-100 rounded-xl p-1 mb-4" : ""}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          if (isPill) {
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  borderRadius: 999,
                  border: "none",
                  background: isActive ? "white" : "transparent",
                  boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  color: isActive ? "#111827" : "#6b7280",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {tab.label}
              </button>
            );
          }
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 py-2 px-3 rounded-lg text-xs transition-all ${
                isActive ? "text-gray-900" : "text-gray-500"
              }`}
              style={{ fontWeight: isActive ? 700 : 500 }}
            >
              {isActive && (
                <motion.div
                  layoutId="profile-tab-indicator"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>{children(activeTab)}</div>
    </div>
  );
}

export const PROFILE_TABS: Tab[] = [
  { id: "data", label: "Adatok", icon: "📊" },
  { id: "progress", label: "Haladas", icon: "📈" },
  { id: "account", label: "Fiokom", icon: "⚙️" },
];
