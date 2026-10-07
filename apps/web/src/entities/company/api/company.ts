import { clientApi } from '@/shared/api/client';
import type { Page } from '@/shared/api/types';

import type { Company, CompanyInput } from '../model/types';
export const listCompanies = async (offset = 0, signal?: AbortSignal) =>
  (
    await clientApi.get<Page<Company>>('/v1/companies', {
      params: { limit: 100, offset },
      signal,
    })
  ).data;
export const createCompany = async (input: CompanyInput) =>
  (await clientApi.post<Company>('/v1/companies', input)).data;
export const updateCompany = async (id: string, input: Partial<CompanyInput>) =>
  (await clientApi.patch<Company>(`/v1/companies/${id}`, input)).data;
