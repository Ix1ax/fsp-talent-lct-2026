import { clientApi } from '@/shared/api/client';

import type { CandidateFullProfile } from '../model';

export const getCandidateFullProfileClient = async (
  signal?: AbortSignal,
): Promise<CandidateFullProfile> => {
  const { data } = await clientApi.get<CandidateFullProfile>(
    '/v1/me/profile/full',
    {
      headers: { 'Cache-Control': 'no-store' },
      signal,
    },
  );

  return data;
};
