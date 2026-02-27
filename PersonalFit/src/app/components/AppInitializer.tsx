/**
 * AppInitializer - Wraps the main app (Layout) routes.
 * Handles initial redirect logic for the onboarding flow.
 * Now delegates to AuthContext for flow state management.
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, getNextRoute } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Only check on the main app routes (not onboarding routes)
    if (location.pathname === '/' || 
        location.pathname === '/foods' || 
        location.pathname === '/shopping' || 
        location.pathname === '/profile' || 
        location.pathname === '/workout') {
      
      const nextRoute = getNextRoute();
      
      // If user hasn't completed the flow, redirect
      if (nextRoute !== '/') {
        navigate(nextRoute, { replace: true });
      }
    }
  }, [isLoading, navigate, location, getNextRoute]);

  return <>{children}</>;
}
