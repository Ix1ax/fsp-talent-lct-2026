import { clientApi, ensureClientAccessToken } from '@/shared/api/client';
import type { Page } from '@/shared/api/types';
import type { RecommendationPage } from '@/entities/employer-need/@x/employer-bank';

import type {
  BankCandidate,
  BankCandidateDetails,
  CandidateInteraction,
} from '../model';
import { bankFilterParams } from './filters';
import type { BankFilters } from './types';

export const getBankCandidates = async (
  companyId: string,
  filters: BankFilters,
  offset = 0,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<Page<BankCandidate> & { total: number }>(
    `/v1/companies/${companyId}/candidates`,
    { params: { ...bankFilterParams(filters), limit: 20, offset }, signal },
  );

  return data;
};

export const getBankCandidate = async (
  companyId: string,
  candidateId: string,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<BankCandidateDetails>(
    `/v1/companies/${companyId}/candidates/${candidateId}`,
    { signal },
  );

  return data;
};

export const getNeedCandidates = async (
  companyId: string,
  needId: string,
  filters: BankFilters,
  offset = 0,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<RecommendationPage>(
    `/v1/companies/${companyId}/needs/${needId}/candidates`,
    { params: { ...bankFilterParams(filters), limit: 20, offset }, signal },
  );

  return data;
};

export const viewBankCandidate = async (
  companyId: string,
  candidateId: string,
  signal?: AbortSignal,
) => {
  signal?.throwIfAborted();
  await ensureClientAccessToken();
  signal?.throwIfAborted();
  return (
    await clientApi.post<CandidateInteraction>(
      `/v1/companies/${encodeURIComponent(companyId)}/candidates/${encodeURIComponent(candidateId)}/view`,
      undefined,
      { signal },
    )
  ).data;
};
