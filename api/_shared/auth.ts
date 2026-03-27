/**
 * Shared Firebase Auth middleware for API endpoints.
 * Verifies the Firebase ID token from the Authorization header.
 *
 * When FIREBASE_ADMIN_KEY is not set AND GOOGLE_APPLICATION_CREDENTIALS
 * is not set, auth verification is skipped with a warning — this keeps the
 * API functional until the service-account key is provisioned.
 */
import * as admin from 'firebase-admin';

// ─── Admin emails (server-side source of truth) ──────────────────
const ADMIN_EMAILS = ['acsorvasi@gmail.com', 'acsorvasi@yahoo.com'];

// ─── Whether we have real credentials ────────────────────────────
let _adminInitFailed = false;

// ─── Singleton Firebase Admin init ───────────────────────────────
function getAdminApp(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!;
  if (_adminInitFailed) return null;

  const keyB64 = process.env.FIREBASE_ADMIN_KEY;
  if (keyB64) {
    try {
      const credential = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'));
      return admin.initializeApp({ credential: admin.credential.cert(credential) });
    } catch (e) {
      console.warn('[auth] Firebase Admin cert init failed, trying default:', e);
    }
  }

  // Fallback: auto-init (works when GOOGLE_APPLICATION_CREDENTIALS is set)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      return admin.initializeApp();
    } catch (e) {
      console.warn('[auth] Firebase Admin default init failed:', e);
    }
  }

  // No credentials available — mark as failed so we don't retry
  console.warn('[auth] No Firebase Admin credentials found (FIREBASE_ADMIN_KEY / GOOGLE_APPLICATION_CREDENTIALS). Auth verification will be skipped.');
  _adminInitFailed = true;
  return null;
}

// ─── Auth result type ────────────────────────────────────────────
export interface AuthResult {
  uid: string;
  email: string | undefined;
  isAdmin: boolean;
}

/**
 * Verify the Firebase ID token from the request Authorization header.
 * Throws an object with { status, message } on failure.
 *
 * When Firebase Admin is not configured (no credentials), the function
 * returns a fallback AuthResult so the API stays functional.
 */
export async function verifyAuth(req: any): Promise<AuthResult> {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';

  const app = getAdminApp();

  // ── No Firebase Admin credentials → skip verification ──────────
  if (!app) {
    console.warn('[auth] Firebase Admin not configured — skipping token verification');
    // Try to extract UID from the JWT payload (unverified) so rate-limiting still works
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    let uid = 'anonymous';
    let email: string | undefined;
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        uid = payload.user_id || payload.sub || 'anonymous';
        email = payload.email;
      } catch { /* ignore decode errors */ }
    }
    const isAdmin = !!email && ADMIN_EMAILS.includes(email.toLowerCase());
    return { uid, email, isAdmin };
  }

  // ── Normal verification path ───────────────────────────────────
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { status: 401, message: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.slice(7);
  if (!token) {
    throw { status: 401, message: 'Empty token' };
  }

  try {
    const decoded = await admin.auth(app).verifyIdToken(token);
    const email = decoded.email;
    const isAdmin = !!email && ADMIN_EMAILS.includes(email.toLowerCase());

    return {
      uid: decoded.uid,
      email,
      isAdmin,
    };
  } catch (err: any) {
    console.error('[auth] Token verification failed:', err.message);
    throw { status: 401, message: 'Invalid or expired token' };
  }
}

/**
 * Helper: send a 401 response for auth failures.
 */
export function sendAuthError(res: any, err: any): void {
  const status = err?.status || 401;
  const message = err?.message || 'Unauthorized';
  res.status(status).json({ error: message });
}

/** Get the Firestore instance from the admin app. */
export function getFirestore(): admin.firestore.Firestore {
  const app = getAdminApp();
  if (!app) {
    throw new Error('[auth] Firebase Admin not configured — Firestore is unavailable');
  }
  return admin.firestore(app);
}
