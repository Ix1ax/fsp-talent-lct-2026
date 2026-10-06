import 'server-only';

import { serverApi } from '@/shared/api/server';

import type { CandidateProfile } from '../model';

export const getCandidateProfile = async (): Promise<CandidateProfile> => {
  const { data } = await serverApi.get<CandidateProfile>('/v1/me/profile');

  return data;
};
