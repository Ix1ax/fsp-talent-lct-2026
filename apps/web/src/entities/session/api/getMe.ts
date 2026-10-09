import 'server-only';

import { cache } from 'react';

import { serverApi } from '@/shared/api/server';

import type { SessionUser } from '../model/types';

export const getMe = cache(async (): Promise<SessionUser> => {
  const { data } = await serverApi.get<SessionUser>('/v1/me');

  return data;
});
