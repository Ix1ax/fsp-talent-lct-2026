import { normalizePage, type Page } from '@/shared/api';
import { clientApi } from '@/shared/api/client';

import type {
  EmployerNeed,
  NeedInput,
  NeedStatus,
  RecommendationPage,
} from '../model';

const path = (companyId: string) => `/v1/companies/${companyId}/needs`;

export const getNeeds = async (
  companyId: string,
  status: NeedStatus,
  offset: number,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<Page<EmployerNeed>>(path(companyId), {
    params: { status, offset, limit: 21 },
    signal,
  });

  return normalizePage(data);
};

export const getNeed = async (
  companyId: string,
  id: string,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<EmployerNeed>(
    `${path(companyId)}/${id}`,
    {
      signal,
    },
  );

  return data;
};

export const createNeed = async (companyId: string, input: NeedInput) => {
  const { data } = await clientApi.post<EmployerNeed>(path(companyId), input);

  return data;
};

export const updateNeed = async (
  companyId: string,
  id: string,
  input: Partial<NeedInput>,
) => {
  const { data } = await clientApi.patch<EmployerNeed>(
    `${path(companyId)}/${id}`,
    input,
  );

  return data;
};

export const archiveNeed = async (companyId: string, id: string) => {
  await clientApi.delete(`${path(companyId)}/${id}`);
};

export const getRecommendations = async (
  companyId: string,
  id: string,
  offset = 0,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<RecommendationPage>(
    `${path(companyId)}/${id}/candidates`,
    { params: { limit: 20, offset }, signal },
  );

  return data;
};
