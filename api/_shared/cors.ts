/**
 * Shared CORS handler with origin whitelist.
 */

const ALLOWED_ORIGINS = [
  'https://personalfit-app.vercel.app',
  'capacitor://localhost',   // Capacitor iOS
  'https://localhost',       // Capacitor Android
  'ionic://localhost',       // Ionic WebView fallback
  'http://localhost:5173',   // Vite dev server
  'http://localhost:3000',
  'http://localhost:3001',
];

/**
 * Set CORS headers with origin whitelist. Returns true if the request is an
 * OPTIONS preflight (caller should return immediately).
 */
export function handleCors(req: any, res: any): boolean {
  const origin = req.headers?.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
