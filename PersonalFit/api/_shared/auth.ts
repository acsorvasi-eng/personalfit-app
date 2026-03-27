/**
 * Shared Firebase Auth middleware for API endpoints.
 * Verifies the Firebase ID token from the Authorization header.
 */
import * as admin from 'firebase-admin';

// ─── Admin emails (server-side source of truth) ──────────────────
const ADMIN_EMAILS = ['acsorvasi@gmail.com', 'acsorvasi@yahoo.com'];

// ─── Singleton Firebase Admin init ───────────────────────────────
function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

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
  return admin.initializeApp();
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
 */
export async function verifyAuth(req: any): Promise<AuthResult> {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { status: 401, message: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.slice(7);
  if (!token) {
    throw { status: 401, message: 'Empty token' };
  }

  try {
    const app = getAdminApp();
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
  return admin.firestore(app);
}
