/**
 * AppInitializer - Wraps the main app (Layout) routes.
 * Handles initial redirect logic for the onboarding flow.
 * Now delegates to AuthContext for flow state management.
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

const APP_ROUTES = ['/', '/foods', '/shopping', '/profile', '/workout'];

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, getNextRoute } = useAuth();
  const lastRedirect = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!APP_ROUTES.includes(location.pathname)) return;

    const nextRoute = getNextRoute();
    if (nextRoute === '/') return;
    // Prevent navigating to the same route twice in a row
    if (lastRedirect.current === nextRoute) return;

    lastRedirect.current = nextRoute;
    navigate(nextRoute, { replace: true });
  }, [isLoading, location.pathname, getNextRoute, navigate]);

  return <>{children}</>;
}
