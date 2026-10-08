import { clientApi } from '@/shared/api/client';

import type { CandidateExperience, CandidateExperiences } from '../model';

export type SaveCandidateExperienceInput = {
  company: string;
  position: string;
  startedOn: string;
  endedOn: string | null;
  description: string;
};

export const getCandidateExperiences = async (
  signal?: AbortSignal,
): Promise<CandidateExperiences> => {
  const { data } = await clientApi.get<CandidateExperiences>(
    '/v1/me/experience',
    {
      headers: { 'Cache-Control': 'no-store' },
      signal,
    },
  );

  return data;
};

export const addCandidateExperience = async (
  input: SaveCandidateExperienceInput,
): Promise<CandidateExperience> => {
  const { data } = await clientApi.post<CandidateExperience>(
    '/v1/me/experience',
    input,
  );

  return data;
};

export const saveCandidateExperience = async (
  id: string,
  input: SaveCandidateExperienceInput,
): Promise<CandidateExperience> => {
  const { data } = await clientApi.put<CandidateExperience>(
    `/v1/me/experience/${encodeURIComponent(id)}`,
    input,
  );

  return data;
};

export const deleteCandidateExperience = async (id: string): Promise<void> => {
  await clientApi.delete(`/v1/me/experience/${encodeURIComponent(id)}`);
};
