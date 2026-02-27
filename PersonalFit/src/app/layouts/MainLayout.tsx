/**
 * ====================================================================
 * Main Layout — Primary app layout with bottom navigation
 * ====================================================================
 * Wraps all authenticated screens with consistent header, footer,
 * and safe-area handling for mobile. The 5-tab bottom navigation
 * is rendered here.
 *
 * This is a layout placeholder — the actual bottom nav is currently
 * in Layout.tsx / RootLayout.tsx. This file provides the new
 * architecture entry point for future refactoring.
 */

import { Outlet } from 'react-router';

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#0A0F1E]">
      {/* Main content area with bottom padding for nav */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
