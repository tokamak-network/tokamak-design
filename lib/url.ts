/**
 * Accept common URL shorthand and return a canonical http(s) URL string.
 * Returns null if the input can't be coerced into something domain-like.
 *
 * Examples:
 *   base.org              → https://base.org/
 *   www.base.org          → https://www.base.org/
 *   https://example.com   → https://example.com/
 *   ftp://example.com     → null (only http(s) allowed)
 *   "  hello world  "     → null
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
