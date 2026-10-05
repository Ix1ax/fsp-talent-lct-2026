/**
 * Allows only same-origin relative paths (`/...`).
 * Rejects protocol-relative (`//…`) and absolute URLs to prevent open redirects.
 */
export const sanitizeRedirectPath = (next: string | null | undefined): string => {
  if (!next) return '/';
  if (!next.startsWith('/')) return '/';
  if (next.startsWith('//')) return '/';
  if (next.includes('\\')) return '/';
  return next;
};

