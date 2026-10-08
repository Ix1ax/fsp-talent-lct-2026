import { clientApi } from '@/shared/api/client';

import type {
  CandidateEducation,
  CandidateEducations,
  EducationLevel,
} from '../model';

export type SaveCandidateEducationInput = {
  level: EducationLevel;
  institution: string;
  specialty: string;
  graduationYear: number;
};

export const getCandidateEducations = async (
  signal?: AbortSignal,
): Promise<CandidateEducations> => {
  const { data } = await clientApi.get<CandidateEducations>(
    '/v1/me/education',
    {
      headers: { 'Cache-Control': 'no-store' },
      signal,
    },
  );

  return data;
};

export const addCandidateEducation = async (
  input: SaveCandidateEducationInput,
  signal?: AbortSignal,
): Promise<CandidateEducation> => {
  const { data } = await clientApi.post<CandidateEducation>(
    '/v1/me/education',
    input,
    { signal },
  );

  return data;
};

export const saveCandidateEducation = async (
  id: string,
  input: SaveCandidateEducationInput,
  signal?: AbortSignal,
): Promise<CandidateEducation> => {
  const { data } = await clientApi.put<CandidateEducation>(
    `/v1/me/education/${encodeURIComponent(id)}`,
    input,
    { signal },
  );

  return data;
};

export const deleteCandidateEducation = async (
  id: string,
  signal?: AbortSignal,
): Promise<void> => {
  await clientApi.delete(`/v1/me/education/${encodeURIComponent(id)}`, {
    signal,
  });
};
