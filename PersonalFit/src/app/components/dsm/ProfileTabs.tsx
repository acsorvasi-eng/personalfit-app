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
}

export function DSMProfileTabs({ tabs, defaultTab, children, className = "", ariaLabel }: DSMProfileTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");

  return (
    <div className={className}>
      {/* Tab Strip */}
      <div className="flex bg-gray-100 dark:bg-[#252525] rounded-xl p-1 mb-4" role="tablist" aria-label={ariaLabel || "Profile sections"}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 py-2 px-3 rounded-lg text-xs transition-all ${
                isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"
              }`}
              style={{ fontWeight: isActive ? 700 : 500 }}
            >
              {isActive && (
                <motion.div
                  layoutId="profile-tab-indicator"
                  className="absolute inset-0 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-sm"
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