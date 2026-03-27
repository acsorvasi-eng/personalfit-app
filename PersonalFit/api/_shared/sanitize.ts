/**
 * Input sanitization for AI endpoints — defends against prompt injection.
 */

/**
 * Sanitize a user-provided text string:
 * - Strip control characters (except newline, tab)
 * - Limit length
 * - Escape prompt-breaking patterns
 */
export function sanitizeUserInput(text: unknown, maxLength = 50000): string {
  if (typeof text !== 'string') return '';
  let s = text
    // Remove control chars except \n and \t
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Truncate
    .slice(0, maxLength)
    .trim();

  // Escape common prompt injection patterns
  s = s.replace(/```/g, '');
  s = s.replace(/<\/?system>/gi, '');
  s = s.replace(/<\/?assistant>/gi, '');
  s = s.replace(/<\/?user>/gi, '');
  s = s.replace(/<\/?human>/gi, '');

  return s;
}

/**
 * Sanitize an array of strings.
 */
export function sanitizeArray(arr: unknown, maxItems = 100, maxItemLength = 500): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, maxItems)
    .map(item => sanitizeUserInput(item, maxItemLength))
    .filter(s => s.length > 0);
}

/**
 * Wrap user input in XML tags for clear prompt boundaries.
 */
export function wrapUserInput(label: string, value: string): string {
  return `<user_input label="${label}">${value}</user_input>`;
}
