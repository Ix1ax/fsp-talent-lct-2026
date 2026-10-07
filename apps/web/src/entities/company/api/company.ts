import { clientApi } from '@/shared/api/client';
import type { Page } from '@/shared/api/types';

import type { Company, CompanyInput } from '../model';

export const getCompanies = async (offset = 0, signal?: AbortSignal) => {
  const { data } = await clientApi.get<Page<Company>>('/v1/companies', {
    params: { limit: 100, offset },
    signal,
  });

  return data;
};

export const createCompany = async (input: CompanyInput) => {
  const { data } = await clientApi.post<Company>('/v1/companies', input);

  return data;
};

export const updateCompany = async (
  id: string,
  input: Partial<CompanyInput>,
) => {
  const { data } = await clientApi.patch<Company>(`/v1/companies/${id}`, input);

  return data;
};
