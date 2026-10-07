import 'server-only';

import { serverApi } from '@/shared/api/server';

import type { CandidateFullProfile } from '../model';

export const getCandidateFullProfile =
  async (): Promise<CandidateFullProfile> => {
    const { data } = await serverApi.get<CandidateFullProfile>(
      '/v1/me/profile/full',
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
    return data;
  };
