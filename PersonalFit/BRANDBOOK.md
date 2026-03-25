# nura — Brand & Design System

## Colors
- **Primary**: `#0d9488` (teal-600) — buttons, active states, progress
- **Primary dark**: `#0f766e` (teal-700) — headers, pressed states
- **Background**: `#FFFFFF` white
- **Text primary**: `#000000` or `#111111` — all main text
- **Text secondary**: `#6B7280` (gray-500) — descriptions, hints
- **Text muted**: `#9CA3AF` (gray-400) — timestamps, less important info
- **Border**: `#E5E7EB` (gray-200)
- **Card bg**: `#F9FAFB` (gray-50) — subtle card backgrounds
- **Alert/Error**: `#EF4444` (red-500) — only for delete, error, danger
- **Success**: `#0d9488` (teal) — reuse primary

## Forbidden colors
- No blue, no purple, no orange, no yellow for UI elements
- No gradient backgrounds
- No gray-300 or lighter for text (unreadable)

## Typography
- **Minimum font size**: 14px (0.875rem / text-sm) — nothing smaller anywhere
- **Body text**: 16px (1rem / text-base)
- **Small labels**: 14px (text-sm) — this is the absolute minimum
- **Section headers**: 18-20px (text-lg / text-xl), font-semibold
- **Page titles**: 24-28px (text-2xl), font-bold
- **Numbers/metrics**: 28-36px (text-3xl), font-bold
- **Font weight**: Regular (400) for body, Semibold (600) for labels, Bold (700) for titles
- **Italic**: Only for emphasis keywords in onboarding

## Spacing
- **Page padding**: 16-20px (px-4 / px-5)
- **Section gap**: 24px (space-y-6)
- **Card padding**: 16px (p-4)
- **Element gap within cards**: 12px (space-y-3)
- **Safe area**: always `env(safe-area-inset-top)` on headers

## Components
- **Buttons**: Full-width, h-14, rounded-2xl, font-semibold
  - Primary: bg-primary text-white
  - Secondary: bg-white border-2 border-gray-200 text-gray-700
  - Danger: bg-red-500 text-white (delete only)
- **Cards**: rounded-2xl, border border-gray-200, bg-white, p-4
- **Inputs**: h-12, rounded-2xl, border-2, text-base
- **Headers**: safe-area-inset-top padding, text-2xl font-bold
- **Close/Back buttons**: 40x40px touch target minimum

## Rules
1. No text smaller than 14px anywhere
2. All text must be #000, #111, #6B7280 or #9CA3AF — nothing lighter
3. Only teal, white, black, dark-gray, and red (for alerts) in the palette
4. Every overlay/modal gets safe-area padding
5. Minimum touch target: 44x44px
