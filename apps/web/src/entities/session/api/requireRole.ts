import 'server-only';

import { redirect } from 'next/navigation';

import { clearAuthTokens, requireAccessToken } from '@/shared/auth/server';
import { STATIC_ROUTES } from '@/shared/contants';
import { sanitizeRedirectPath } from '@/shared/utils';

import type { SessionUser, UserRole } from '../model';
import { AuthUnavailableError, getRoleHomeRoute } from '../model';
import { loadSession } from './loadSession';

export const requireSessionUser = async (
  nextPath: string,
): Promise<SessionUser> => {
  const safeNext = sanitizeRedirectPath(nextPath);
  await requireAccessToken(safeNext);

  const session = await loadSession();

  if (session.kind === 'user') {
    return session.user;
  }

  if (session.kind === 'unavailable') {
    throw new AuthUnavailableError(session);
  }

  if (session.kind === 'invalid') {
    if (session.hasRefreshToken && session.reason === 'unauthorized') {
      redirect(`/api/auth/refresh?next=${encodeURIComponent(safeNext)}`);
    }
    await clearAuthTokens();
    redirect(`/login?next=${encodeURIComponent(safeNext)}`);
  }

  redirect(`/login?next=${encodeURIComponent(safeNext)}`);
};

export const requireRole = async (
  role: UserRole,
  nextPath: string,
): Promise<SessionUser> => {
  const user = await requireSessionUser(nextPath);

  if (!user.role) {
    redirect(STATIC_ROUTES.LOGIN);
  }

  if (user.role !== role) {
    redirect(getRoleHomeRoute(user.role));
  }

  return user;
};
