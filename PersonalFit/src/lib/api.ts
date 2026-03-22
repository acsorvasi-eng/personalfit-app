/** Base URL for API calls.
 * Web (Vercel): '' → relative paths work natively
 * Native app:  'https://personalfit-app.vercel.app' → full URL
 */
export const apiBase = (import.meta.env.VITE_API_BASE as string) || '';
