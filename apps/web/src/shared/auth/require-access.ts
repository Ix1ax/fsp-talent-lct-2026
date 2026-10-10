import 'server-only';

import { redirect } from 'next/navigation';

import { STATIC_ROUTES } from '@/shared/contants';
import { sanitizeRedirectPath } from '@/shared/utils';

import { getAccessToken, getRefreshToken } from './session.server';

export const requireAccessToken = async (nextPath: string): Promise<string> => {
  const token = await getAccessToken();
  if (token) return token;

  const next = sanitizeRedirectPath(nextPath);
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    redirect(`/api/auth/refresh?next=${encodeURIComponent(next)}`);
  }

  redirect(`${STATIC_ROUTES.LOGIN}?next=${encodeURIComponent(next)}`);
};
