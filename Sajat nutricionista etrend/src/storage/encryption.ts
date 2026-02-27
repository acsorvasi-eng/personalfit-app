/**
 * ====================================================================
 * Storage Encryption — AES-256-GCM encryption at rest
 * ====================================================================
 * Uses the Web Crypto API (SubtleCrypto) for browser-native encryption.
 * No external dependencies. All keys derived via PBKDF2.
 *
 * Architecture:
 * 1. User provides a passphrase (or we derive from auth token)
 * 2. PBKDF2 derives an AES-256-GCM key from the passphrase + salt
 * 3. Each record is encrypted with a unique IV (12 bytes)
 * 4. Encrypted payload = base64(salt + iv + ciphertext + authTag)
 */

import { SECURITY } from '../core/constants';
import { logger } from '../core/config';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface EncryptedPayload {
  /** Base64-encoded encrypted data (salt + iv + ciphertext) */
  data: string;
  /** Algorithm identifier */
  algorithm: 'AES-256-GCM';
  /** PBKDF2 iteration count used */
  iterations: number;
}

// ═══════════════════════════════════════════════════════════════
// Key Derivation (PBKDF2)
// ═══════════════════════════════════════════════════════════════

/**
 * Derive an AES-256-GCM CryptoKey from a passphrase using PBKDF2.
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: SECURITY.PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: SECURITY.AES_KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// ═══════════════════════════════════════════════════════════════
// Encryption
// ═══════════════════════════════════════════════════════════════

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded payload containing salt + IV + ciphertext.
 */
export async function encrypt(plaintext: string, passphrase: string): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine salt (16) + iv (12) + ciphertext into one buffer
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return {
    data: bufferToBase64(combined),
    algorithm: 'AES-256-GCM',
    iterations: SECURITY.PBKDF2_ITERATIONS,
  };
}

// ═══════════════════════════════════════════════════════════════
// Decryption
// ═══════════════════════════════════════════════════════════════

/**
 * Decrypt an AES-256-GCM encrypted payload.
 */
export async function decrypt(payload: EncryptedPayload, passphrase: string): Promise<string> {
  const combined = base64ToBuffer(payload.data);

  // Extract salt (16 bytes), iv (12 bytes), and ciphertext
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const key = await deriveKey(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ═══════════════════════════════════════════════════════════════
// Convenience: Encrypt/Decrypt JSON objects
// ═══════════════════════════════════════════════════════════════

/**
 * Encrypt a JSON-serializable object.
 */
export async function encryptObject<T>(obj: T, passphrase: string): Promise<EncryptedPayload> {
  const json = JSON.stringify(obj);
  return encrypt(json, passphrase);
}

/**
 * Decrypt back to a typed object.
 */
export async function decryptObject<T>(payload: EncryptedPayload, passphrase: string): Promise<T> {
  const json = await decrypt(payload, passphrase);
  return JSON.parse(json) as T;
}

// ═══════════════════════════════════════════════════════════════
// Passphrase Hash (for verification without storing the passphrase)
// ═══════════════════════════════════════════════════════════════

/**
 * Create a SHA-256 hash of the passphrase for verification.
 * Store this in localStorage to verify user passphrase on re-entry.
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(passphrase));
  return bufferToBase64(new Uint8Array(hash));
}

/**
 * Verify a passphrase against a stored hash.
 */
export async function verifyPassphrase(passphrase: string, storedHash: string): Promise<boolean> {
  const hash = await hashPassphrase(passphrase);
  return hash === storedHash;
}

// ═══════════════════════════════════════════════════════════════
// Base64 Utilities
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

// ═══════════════════════════════════════════════════════════════
// Feature Check
// ═══════════════════════════════════════════════════════════════

/**
 * Check if the browser supports the Web Crypto API.
 */
export function isEncryptionSupported(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.encrypt === 'function'
  );
}
