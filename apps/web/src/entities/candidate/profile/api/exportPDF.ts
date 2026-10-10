import {
  ApiError,
  clientApi,
  ensureClientAccessToken,
  toApiError,
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
    if (error instanceof ApiError && error.data instanceof Blob) {
      let body: unknown;
      try {
        body = JSON.parse(await error.data.text());
      } catch {
        throw error;
      }

      throw toApiError(error.status, body, error.message, error.headers);
    }

    throw error;
  }
};
