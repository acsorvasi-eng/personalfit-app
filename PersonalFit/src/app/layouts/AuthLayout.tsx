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
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}

export default AuthLayout;
