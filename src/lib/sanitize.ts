/**
 * Lightweight sanitizers for user-supplied values that end up in CSS or HTML src attributes.
 *
 * These run when project state is loaded from disk or localStorage so that maliciously
 * crafted project files cannot inject unexpected values into CSS properties or image URLs.
 *
 * CSS property note: React uses CSSOM property assignment (element.style.prop = value), so
 * semicolons and braces in a value cannot inject additional declarations. The character-set
 * guard here provides defense-in-depth for contexts that may differ (e.g. serialized HTML).
 */

/**
 * Only allow characters that appear in valid CSS color expressions.
 * Blocks: ; { } " ' ` / : < > | \ and other injection vectors.
 * Allows: hex (#fff, #rrggbb, #rrggbbaa), rgb/rgba/hsl/hsla/oklch/lab and all CSS named colors.
 */
const CSS_COLOR_RE = /^[a-zA-Z0-9#(), .%+\-]{1,50}$/;

export function sanitizeCssColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  if (!s || !CSS_COLOR_RE.test(s)) return undefined;
  return s;
}

/**
 * Allow only relative paths (e.g. /screenshots/en/01.png) or data: image URLs.
 * Blocks javascript:, vbscript:, data:text/html, and arbitrary remote URLs.
 */
const SAFE_REL_PATH_RE = /^\/[a-zA-Z0-9._\-/]+$/;

export function sanitizeImageSrc(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  if (!s) return undefined;
  // Relative path — Next.js public/ directory only
  if (SAFE_REL_PATH_RE.test(s)) return s;
  // Data URL — only image MIME types are allowed
  if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/.test(s)) return s;
  return undefined;
}

/**
 * Locale codes like "en", "fr", "zh-CN" — used as keys and path segments.
 */
const LOCALE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export function sanitizeLocale(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  if (!s || s.length > 10 || !LOCALE_RE.test(s)) return undefined;
  return s;
}
