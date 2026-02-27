/**
 * ====================================================================
 * Auth Layout — Layout for unauthenticated screens
 * ====================================================================
 * Used for Login, Register, Forgot Password, Splash, Onboarding, Terms.
 * No bottom navigation, no header — clean full-screen layout.
 */

import { Outlet } from 'react-router';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-[#121212] dark:via-[#121212] dark:to-[#121212]">
      <Outlet />
    </div>
  );
}

export default AuthLayout;
