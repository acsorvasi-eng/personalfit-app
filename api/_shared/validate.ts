/**
 * Shared input validation helpers for API endpoints.
 */

/** Validate that a string does not exceed maxLength. Returns trimmed string or throws. */
export function validateString(value: unknown, fieldName: string, maxLength = 50000): string {
  if (typeof value !== 'string') {
    throw { status: 400, message: `${fieldName} must be a string` };
  }
  if (value.length > maxLength) {
    throw { status: 400, message: `${fieldName} exceeds maximum length of ${maxLength}` };
  }
  return value.trim();
}

/** Validate that an array does not exceed maxItems. Returns the array or throws. */
export function validateArray(value: unknown, fieldName: string, maxItems = 100): any[] {
  if (!Array.isArray(value)) {
    throw { status: 400, message: `${fieldName} must be an array` };
  }
  if (value.length > maxItems) {
    throw { status: 400, message: `${fieldName} exceeds maximum of ${maxItems} items` };
  }
  return value;
}

/** Validate a number is within range. */
export function validateNumber(value: unknown, fieldName: string, min = 0, max = 100000): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw { status: 400, message: `${fieldName} must be a number between ${min} and ${max}` };
  }
  return n;
}

/** Validate request body size (rough check on JSON body). */
export function validateBodySize(body: any, maxBytes = 500000): void {
  try {
    const size = JSON.stringify(body || '').length;
    if (size > maxBytes) {
      throw { status: 413, message: 'Request body too large' };
    }
  } catch (e: any) {
    if (e?.status) throw e;
    // If stringify fails, body is likely too complex
    throw { status: 413, message: 'Request body too large or malformed' };
  }
}
