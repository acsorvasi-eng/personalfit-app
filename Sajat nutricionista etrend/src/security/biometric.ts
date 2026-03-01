/**
 * ====================================================================
 * Security Biometric — WebAuthn-based biometric authentication
 * ====================================================================
 * Uses the Web Authentication API (WebAuthn / FIDO2) for:
 * - Fingerprint unlock
 * - Face recognition
 * - Device PIN
 *
 * All biometric data stays on-device (platform authenticator).
 * No server interaction required — fully offline.
 */

import { logger } from '../core/config';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface BiometricCredential {
  credentialId: string;
  publicKey: string;
  createdAt: string;
  lastUsed: string;
}

const BIOMETRIC_STORAGE_KEY = '__biometric_credential';

// ═══════════════════════════════════════════════════════════════
// Feature Detection
// ═══════════════════════════════════════════════════════════════

/**
 * Check if the browser supports WebAuthn with platform authenticator.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
  ) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Check if the user has already enrolled a biometric credential.
 */
export function isBiometricEnrolled(): boolean {
  return localStorage.getItem(BIOMETRIC_STORAGE_KEY) !== null;
}

// ═══════════════════════════════════════════════════════════════
// Registration (Enrollment)
// ═══════════════════════════════════════════════════════════════

/**
 * Enroll a new biometric credential using WebAuthn.
 * This creates a platform-bound credential (fingerprint/face).
 */
export async function enrollBiometric(userId: string, userName: string): Promise<boolean> {
  if (!(await isBiometricAvailable())) {
    logger.warn('[Biometric] Platform authenticator not available');
    return false;
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Sixth-Halt',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;

    if (!credential) {
      logger.warn('[Biometric] Enrollment cancelled by user');
      return false;
    }

    // Store credential ID for later verification
    const stored: BiometricCredential = {
      credentialId: bufferToBase64(new Uint8Array(credential.rawId)),
      publicKey: '', // In a real impl, extract from attestation
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };

    localStorage.setItem(BIOMETRIC_STORAGE_KEY, JSON.stringify(stored));
    logger.info('[Biometric] Enrollment successful');
    return true;
  } catch (err) {
    logger.error('[Biometric] Enrollment failed:', err);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Authentication (Verification)
// ═══════════════════════════════════════════════════════════════

/**
 * Verify the user's identity using biometric authentication.
 * Returns true if the biometric check passed.
 */
export async function verifyBiometric(): Promise<boolean> {
  if (!isBiometricEnrolled()) {
    logger.warn('[Biometric] No credential enrolled');
    return false;
  }

  try {
    const storedRaw = localStorage.getItem(BIOMETRIC_STORAGE_KEY);
    if (!storedRaw) return false;

    const stored: BiometricCredential = JSON.parse(storedRaw);
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credentialId = base64ToBuffer(stored.credentialId);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: 'public-key',
            id: credentialId,
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;

    if (!assertion) {
      logger.warn('[Biometric] Verification cancelled');
      return false;
    }

    // Update last used
    stored.lastUsed = new Date().toISOString();
    localStorage.setItem(BIOMETRIC_STORAGE_KEY, JSON.stringify(stored));

    logger.info('[Biometric] Verification successful');
    return true;
  } catch (err) {
    logger.error('[Biometric] Verification failed:', err);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Remove Enrollment
// ═══════════════════════════════════════════════════════════════

export function removeBiometricEnrollment(): void {
  localStorage.removeItem(BIOMETRIC_STORAGE_KEY);
  logger.info('[Biometric] Enrollment removed');
}

// ═══════════════════════════════════════════════════════════════
// Buffer Utilities
// ═══════════════════════════════════════════════════════════════

function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
