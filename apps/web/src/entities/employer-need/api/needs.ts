import { clientApi } from '@/shared/api/client';
import type { Page } from '@/shared/api/types';

import type {
  EmployerNeed,
  NeedInput,
  NeedStatus,
  RecommendationPage,
} from '../model/types';
const path = (companyId: string) => `/v1/companies/${companyId}/needs`;
export const listNeeds = async (
  companyId: string,
  status: NeedStatus,
  offset: number,
  signal?: AbortSignal,
) =>
  (
    await clientApi.get<Page<EmployerNeed>>(path(companyId), {
      params: { status, offset, limit: 20 },
      signal,
    })
  ).data;
export const getNeed = async (
  companyId: string,
  id: string,
  signal?: AbortSignal,
) =>
  (await clientApi.get<EmployerNeed>(`${path(companyId)}/${id}`, { signal }))
    .data;
export const createNeed = async (companyId: string, input: NeedInput) =>
  (await clientApi.post<EmployerNeed>(path(companyId), input)).data;
export const updateNeed = async (
  companyId: string,
  id: string,
  input: Partial<NeedInput>,
) =>
  (await clientApi.patch<EmployerNeed>(`${path(companyId)}/${id}`, input)).data;
export const archiveNeed = async (companyId: string, id: string) => {
  await clientApi.delete(`${path(companyId)}/${id}`);
};
export const listRecommendations = async (
  companyId: string,
  id: string,
  offset = 0,
  signal?: AbortSignal,
) =>
  (
    await clientApi.get<RecommendationPage>(
      `${path(companyId)}/${id}/candidates`,
      { params: { limit: 20, offset }, signal },
    )
  ).data;
