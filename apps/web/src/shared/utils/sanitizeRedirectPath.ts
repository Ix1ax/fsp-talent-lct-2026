import { STATIC_ROUTES } from '@/shared/contants';

/**
 * Allows only same-origin relative paths (`/...`).
 * Rejects protocol-relative (`//…`) and absolute URLs to prevent open redirects.
 */
export const sanitizeRedirectPath = (
  next: string | null | undefined,
): string => {
  if (!next) return STATIC_ROUTES.HOME;
  if (!next.startsWith('/')) return STATIC_ROUTES.HOME;
  if (next.startsWith('//')) return STATIC_ROUTES.HOME;
  if (next.includes('\\')) return STATIC_ROUTES.HOME;
  if (/[\u0000-\u0020\u007f]/.test(next)) return STATIC_ROUTES.HOME;
  const base = new URL('https://app.invalid');

  try {
    if (new URL(next, base).origin !== base.origin) return STATIC_ROUTES.HOME;
  } catch {
    return STATIC_ROUTES.HOME;
  }

  return next;
};
