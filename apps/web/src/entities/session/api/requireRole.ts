import 'server-only';

import { redirect } from 'next/navigation';

import { requireAccessToken } from '@/shared/auth/server';
import { STATIC_ROUTES } from '@/shared/contants';

import type { SessionUser, UserRole } from '../model';
import { getRoleHomeRoute } from '../model';
import { loadSession } from './loadSession';

export const requireSessionUser = async (
  nextPath: string,
): Promise<SessionUser> => {
  await requireAccessToken(nextPath);

  const session = await loadSession();

  if (session.kind !== 'user') {
    redirect(STATIC_ROUTES.LOGIN);
  }

  return session.user;
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
