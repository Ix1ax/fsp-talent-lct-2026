import { clientApi, ensureClientAccessToken } from '@/shared/api';

import type { FSPProfile } from '../model';

const authorize = async (signal?: AbortSignal) => {
  signal?.throwIfAborted();
  await ensureClientAccessToken();
  signal?.throwIfAborted();
};

export const getFSP = async (signal?: AbortSignal) => {
  await authorize(signal);

  const { data } = await clientApi.get<FSPProfile>('/v1/me/fsp', { signal });

  return data;
};

export const unlinkFSP = async (signal?: AbortSignal): Promise<void> => {
  await authorize(signal);
  await clientApi.delete('/v1/me/fsp', { signal });
};

export const linkFSP = async (signal?: AbortSignal) => {
  await authorize(signal);

  const { data } = await clientApi.post<FSPProfile>(
    '/v1/me/fsp/link',
    undefined,
    { signal },
  );

  return data;
};

export const syncFSP = async (signal?: AbortSignal) => {
  await authorize(signal);

  const { data } = await clientApi.post<FSPProfile>(
    '/v1/me/fsp/sync',
    undefined,
    { signal },
  );

  return data;
};
