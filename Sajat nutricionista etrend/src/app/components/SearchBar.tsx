/**
 * SearchBar - Design System Component
 *
 * Standardized search input for all screens.
 * Features a search icon, optional clear button,
 * rounded corners, and a subtle bottom accent line.
 *
 * Based on Figma DSM specification:
 * - Gray-50 background with rounded-xl border
 * - Search icon (left) + optional clear (right)
 * - Green accent bottom border on focus
 * - Inter font body text
 */

import { Search, X } from "lucide-react";

interface SearchBarProps {
  /** Current search value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Optional extra class names */
  className?: string;
  /** Show clear button when value is present */
  showClear?: boolean;
  /** Variant - 'default' has subtle bg, 'outlined' has border, 'glass' is for use on colored backgrounds */
  variant?: "default" | "outlined" | "glass";
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Keresés...",
  autoFocus = false,
  className = "",
  showClear = true,
  variant = "default",
}: SearchBarProps) {
  const variantClasses = {
    default:
      "bg-gray-50 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100",
    outlined:
      "bg-white border-2 border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100",
    glass:
      "bg-white/90 backdrop-blur-md border-2 border-white/20 focus-within:ring-4 focus-within:ring-white/50",
  };

  return (
    <div className={`relative group ${className}`} role="search" aria-label="Keresés">
      <div
        className={`flex items-center rounded-xl transition-all ${variantClasses[variant]}`}
      >
        <Search className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" aria-hidden="true" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label={placeholder}
          className="w-full bg-transparent py-3 pl-3 pr-4 focus:outline-none text-gray-900 placeholder-gray-400"
        />
        {showClear && value && (
          <button
            onClick={() => onChange("")}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors mr-2 flex-shrink-0"
            aria-label="Keresés törlése"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>
      {/* Subtle green bottom accent */}
      {variant === "default" && (
        <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-400 rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
      )}
    </div>
  );
}