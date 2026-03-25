import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Add CORS headers for Capacitor native apps (capacitor://localhost) */
export function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/** Handle OPTIONS preflight — call at top of every handler */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
