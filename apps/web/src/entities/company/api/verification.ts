import { clientApi, ensureClientAccessToken } from '@/shared/api';

import type { CompanyVerification } from '../model';

const path = (companyId: string) =>
  `/v1/companies/${encodeURIComponent(companyId)}/verification`;

const authorize = async (signal?: AbortSignal) => {
  signal?.throwIfAborted();
  await ensureClientAccessToken();
  signal?.throwIfAborted();
};

export const getCompanyVerification = async (
  companyId: string,
  signal?: AbortSignal,
) => {
  await authorize(signal);
  return (await clientApi.get<CompanyVerification>(path(companyId), { signal }))
    .data;
};

export const requestCompanyVerification = async (
  companyId: string,
  signal?: AbortSignal,
) => {
  await authorize(signal);
  return (
    await clientApi.post<CompanyVerification>(
      `${path(companyId)}/request`,
      undefined,
      { signal },
    )
  ).data;
};
