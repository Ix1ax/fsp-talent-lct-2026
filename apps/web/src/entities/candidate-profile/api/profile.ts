import { clientApi } from '@/shared/api/client';
import { ApiError, toApiError } from '@/shared/api/errors';

import {
  type CandidateProfile,
  notifyCandidateAvatarUpdated,
  type SearchStatus,
} from '../model';

export type CreateCandidateProfileInput = {
  headline: string | null;
  summary: string | null;
  city: string | null;
  timezone: string | null;
  experienceMonths: number;
  salaryMinRub: number | null;
  searchStatus: SearchStatus;
  workFormatIds: number[];
};

export type UpdateCandidateProfileInput = {
  headline?: string | null;
  summary?: string | null;
  city?: string | null;
  timezone?: string | null;
  experienceMonths?: number;
  salaryMinRub?: number | null;
  searchStatus?: SearchStatus;
  workFormatIds?: number[];
};

export const getCandidateProfileClient =
  async (): Promise<CandidateProfile> => {
    const { data } = await clientApi.get<CandidateProfile>('/v1/me/profile');
    return data;
  };

export const createCandidateProfile = async (
  input: CreateCandidateProfileInput,
): Promise<CandidateProfile> => {
  const { data } = await clientApi.post<CandidateProfile>(
    '/v1/me/profile',
    input,
  );
  return data;
};

export const updateCandidateProfile = async (
  input: UpdateCandidateProfileInput,
): Promise<CandidateProfile> => {
  const { data } = await clientApi.patch<CandidateProfile>(
    '/v1/me/profile',
    input,
  );
  return data;
};

export const uploadCandidateAvatar = async (
  file: File,
): Promise<CandidateProfile> => {
  const body = new FormData();
  body.append('file', file);
  const { data } = await clientApi.put<CandidateProfile>(
    '/v1/me/profile/avatar',
    body,
  );
  notifyCandidateAvatarUpdated();
  return data;
};

export const getCandidateAvatar = async (
  signal?: AbortSignal,
): Promise<Blob> => {
  try {
    const { data } = await clientApi.get<Blob>('/v1/me/profile/avatar', {
      responseType: 'blob',
      signal,
    });
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.data instanceof Blob) {
      const body: unknown = await error.data
        .text()
        .then(JSON.parse)
        .catch(() => undefined);
      throw toApiError(error.status, body, error.message);
    }
    throw error;
  }
};

export const deleteCandidateAvatar = async (): Promise<void> => {
  await clientApi.delete('/v1/me/profile/avatar');
  notifyCandidateAvatarUpdated();
};
