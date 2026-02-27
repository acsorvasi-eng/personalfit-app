import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";

interface GuardProps {
  children: ReactNode;
}

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[var(--color-primary-50)] to-white dark:from-[#121212] dark:to-[#121212]">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" aria-label="Loading" />
    </div>
  );
}

/**
 * ProtectedRoute
 * Guards authenticated sections of the app.
 * - While auth state is loading → full-screen spinner
 * - If not authenticated → redirect to /splash
 * - If authenticated → render children
 */
export function ProtectedRoute({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/splash" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

/**
 * OnboardingGuard
 * Prevents logged-in users from seeing onboarding screens again.
 * - While auth state is loading → full-screen spinner
 * - If authenticated → redirect to main app (/)
 * - If not authenticated → render onboarding children
 */
export function OnboardingGuard({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

