import { clientApi } from '@/shared/api';

import type { SessionUser } from '../model';

export const getMeClient = async (): Promise<SessionUser> => {
  const { data } = await clientApi.get<SessionUser>('/v1/me');

  return data;
};
