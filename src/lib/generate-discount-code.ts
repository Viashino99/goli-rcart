const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type GenerateDiscountCodeOptions = {
  /**
   * Length of the random segment (after optional prefix).
   * Shopify manual codes are often 4–20 characters; default 10.
   */
  length?: number;
  /**
   * Optional prefix, uppercased and sanitized (letters, digits, hyphen only).
   * When set, output is `PREFIX-RANDOM` (e.g. `SAVE-K3M8PQ2N1`).
   */
  prefix?: string;
};

/**
 * Builds a fake discount code that *looks* like a typical Shopify-style code
 * (uppercase letters + digits). Not a real Shopify discount — for demos, UI,
 * and fixtures only.
 */
export function generateDiscountCode(
  options: GenerateDiscountCodeOptions = {},
): string {
  const length = Math.min(32, Math.max(4, options.length ?? 10));
  const rawPrefix = options.prefix?.trim() ?? "";
  const prefix = rawPrefix
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");

  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let body = "";
  for (let i = 0; i < length; i++) {
    body += CHARSET[bytes[i]! % CHARSET.length]!;
  }

  if (prefix) {
    return `${prefix}-${body}`;
  }

  return body;
}
