import { ApiError, toApiError } from './errors';

/** Decode JSON errors returned by endpoints requested with responseType: 'blob'. */
export const normalizeApiError = async (error: unknown): Promise<unknown> => {
  if (!(error instanceof ApiError) || !(error.data instanceof Blob))
    return error;

  try {
    const body: unknown = JSON.parse(await error.data.text());
    return toApiError(error.status, body, error.message, error.headers);
  } catch {
    return error;
  }
};
