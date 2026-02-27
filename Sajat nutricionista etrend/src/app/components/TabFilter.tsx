/**
 * TabFilter - Design System Component
 *
 * Horizontal scrollable pill/tab filter buttons.
 * Active tab is filled with primary green, inactive tabs
 * are outlined/light gray.
 *
 * Based on Figma DSM specification:
 * - Horizontal scroll with hidden scrollbar
 * - Active: bg-blue-500, white text, rounded-full, shadow
 * - Inactive: bg-white, border, text-gray-600, rounded-full
 * - Smooth transitions between states
 */

interface Tab {
  /** Unique key/value for the tab */
  key: string;
  /** Display label */
  label: string;
}

interface TabFilterProps {
  /** Array of tabs to display */
  tabs: Tab[];
  /** Currently active tab key */
  activeTab: string;
  /** Tab change handler */
  onTabChange: (tabKey: string) => void;
  /** Optional extra class names */
  className?: string;
  /** Variant - 'default' is green, 'glass' is for use on colored backgrounds */
  variant?: "default" | "glass";
  /** Size - 'sm' is compact, 'md' is standard */
  size?: "sm" | "md";
}

export function TabFilter({
  tabs,
  activeTab,
  onTabChange,
  className = "",
  variant = "default",
  size = "md",
}: TabFilterProps) {
  const sizeClasses = {
    sm: "px-4 py-1.5 text-[13px]",
    md: "px-5 py-2.5 text-[15px]",
  };

  const getTabClasses = (isActive: boolean) => {
    if (variant === "glass") {
      return isActive
        ? "bg-white text-[var(--primary)] shadow-lg font-semibold"
        : "bg-white/20 text-white hover:bg-white/30 font-medium";
    }

    return isActive
      ? "bg-gradient-to-r from-[#3366FF] to-[#12CFA6] text-white shadow-sm font-semibold"
      : "bg-white dark:bg-[#252525] border border-[var(--border)] text-[var(--muted-foreground)] dark:text-gray-300 hover:bg-[var(--color-gray-50)] dark:hover:bg-[#2a2a2a] hover:border-[var(--color-gray-300)] dark:hover:border-[#404040] font-medium";
  };

  return (
    <div
      className={`flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide ${className}`}
      role="tablist"
      aria-label="Szűrő kategóriák"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.key)}
            className={`rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 ${sizeClasses[size]} ${getTabClasses(isActive)}`}
            style={{ fontFamily: "var(--font-family-base)" }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Helper to create tabs from a string array.
 * Useful when tabs are simple string labels.
 */
export function createTabs(labels: string[]): Tab[] {
  return labels.map((label) => ({ key: label, label }));
}