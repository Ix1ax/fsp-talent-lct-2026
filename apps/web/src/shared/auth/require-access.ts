import 'server-only';

import { redirect } from 'next/navigation';

import { sanitizeRedirectPath } from '@/shared/utils';

import { getAccessToken } from './session.server';

export const requireAccessToken = async (nextPath: string): Promise<string> => {
  const token = await getAccessToken();
  if (token) return token;

  const next = sanitizeRedirectPath(nextPath);
  // The refresh cookie is scoped to /api/auth and is absent on page requests.
  // The route handler can inspect it and safely update cookies or redirect to login.
  redirect(`/api/auth/refresh?next=${encodeURIComponent(next)}`);
};
