import {
  clientApi,
  ensureClientAccessToken,
  normalizeApiError,
} from '@/shared/api';

export const exportCandidatePDF = async (signal?: AbortSignal) => {
  signal?.throwIfAborted();
  await ensureClientAccessToken();
  signal?.throwIfAborted();

  try {
    const { data } = await clientApi.get<Blob>('/v1/me/profile/export.pdf', {
      responseType: 'blob',
      timeout: 60_000,
      signal,
    });
    return data;
  } catch (error) {
    throw await normalizeApiError(error);
  }
};
