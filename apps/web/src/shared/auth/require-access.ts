import 'server-only';

import { redirect } from 'next/navigation';

import { sanitizeRedirectPath } from '@/shared/utils';

import { getAccessToken } from './session.server';

export const requireAccessToken = async (nextPath: string): Promise<string> => {
  const token = await getAccessToken();
  if (token) return token;

  const next = sanitizeRedirectPath(nextPath);
  redirect(`/api/auth/refresh?next=${encodeURIComponent(next)}`);
};
