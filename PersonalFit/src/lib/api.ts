/** Base URL for API calls.
 * Web (Vercel): '' → relative paths work natively
 * Native app:  'https://personalfit-app.vercel.app' → full URL
 * Detect native: capacitor:// (iOS) or https://localhost (Android)
 */
import { auth } from '../firebase';

const isCapacitor = typeof window !== 'undefined' && (
  window.location.protocol === 'capacitor:' ||
  (window.location.protocol === 'https:' && window.location.hostname === 'localhost')
);
export const apiBase: string =
  (import.meta.env.VITE_API_BASE as string) ||
  (isCapacitor ? 'https://personalfit-app.vercel.app' : '');

/**
 * Get auth headers with the current user's Firebase ID token.
 * Returns an object suitable for spreading into fetch headers.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      return { Authorization: `Bearer ${token}` };
    }
  } catch (e) {
    console.warn('[api] Failed to get auth token:', e);
  }
  return {};
}

/**
 * Authenticated fetch wrapper — adds Firebase ID token automatically.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const authHeaders = await getAuthHeaders();
  for (const [key, value] of Object.entries(authHeaders)) {
    headers.set(key, value);
  }
  return fetch(url, { ...options, headers });
}
