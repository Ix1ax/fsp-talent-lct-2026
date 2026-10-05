import 'server-only';

import { serverApi } from '@/shared/api/server';

import type { SessionUser } from '../model/types';

export async function getMe(): Promise<SessionUser> {
  const { data } = await serverApi.get<SessionUser>('/v1/me');
  return data;
}
