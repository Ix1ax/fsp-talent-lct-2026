/**
 * Allows only same-origin relative paths (`/...`).
 * Rejects protocol-relative (`//…`) and absolute URLs to prevent open redirects.
 */
export const sanitizeRedirectPath = (
  next: string | null | undefined,
): string => {
  if (!next) return '/';
  if (!next.startsWith('/')) return '/';
  if (next.startsWith('//')) return '/';
  if (next.includes('\\')) return '/';
  if (/[\u0000-\u0020\u007f]/.test(next)) return '/';
  const base = new URL('https://app.invalid');

  try {
    if (new URL(next, base).origin !== base.origin) return '/';
  } catch {
    return '/';
  }

  return next;
};
