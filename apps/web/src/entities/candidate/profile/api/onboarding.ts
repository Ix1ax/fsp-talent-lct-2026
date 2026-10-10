import { clientApi, ensureClientAccessToken } from '@/shared/api';

import type { CandidateOnboarding, CandidateSurvey } from '../model';

export type CandidateSurveyInput = {
  stackSkillId: string;
  industry: string;
  specializationId: number;
  gradeId: number;
  softSkills?: string[];
};

export const getCandidateOnboarding = async (signal?: AbortSignal) => {
  signal?.throwIfAborted();
  await ensureClientAccessToken();
  signal?.throwIfAborted();

  const { data } = await clientApi.get<CandidateOnboarding>(
    '/v1/me/profile/onboarding',
    { signal, headers: { 'Cache-Control': 'no-cache' } },
  );

  return data;
};

export const putCandidateSurvey = async (
  input: CandidateSurveyInput,
  signal?: AbortSignal,
) => {
  signal?.throwIfAborted();
  await ensureClientAccessToken();
  signal?.throwIfAborted();

  const { data } = await clientApi.put<CandidateSurvey>(
    '/v1/me/profile/onboarding',
    input,
    { signal },
  );

  return data;
};
