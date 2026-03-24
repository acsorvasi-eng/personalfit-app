/** Base URL for API calls.
 * Web (Vercel): '' → relative paths work natively
 * Native app:  'https://personalfit-app.vercel.app' → full URL
 * Detect native: capacitor:// (iOS) or https://localhost (Android)
 */
const isCapacitor = typeof window !== 'undefined' && (
  window.location.protocol === 'capacitor:' ||
  (window.location.protocol === 'https:' && window.location.hostname === 'localhost')
);
export const apiBase: string =
  (import.meta.env.VITE_API_BASE as string) ||
  (isCapacitor ? 'https://personalfit-app.vercel.app' : '');
