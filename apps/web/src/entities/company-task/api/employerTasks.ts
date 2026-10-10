import { clientApi, ensureClientAccessToken } from '@/shared/api';

import type { CompanyTask, TaskPage } from '../model';
import type { TaskFilters } from './tasks';

export type CompanyTaskFilters = Omit<TaskFilters, 'submitted'>;

export type CreateCompanyTaskInput = {
  title: string;
  description?: string;
  specializationId?: number;
  gradeId?: number;
  deadlineAt?: string;
  file: File;
};

export const createCompanyTask = async (
  companyId: string,
  input: CreateCompanyTaskInput,
) => {
  await ensureClientAccessToken();
  const body = new FormData();
  body.append('title', input.title);
  body.append('file', input.file);
  if (input.description) body.append('description', input.description);
  if (input.specializationId !== undefined)
    body.append('specialization_id', String(input.specializationId));
  if (input.gradeId !== undefined)
    body.append('grade_id', String(input.gradeId));
  if (input.deadlineAt) body.append('deadline_at', input.deadlineAt);
  const { data } = await clientApi.post<CompanyTask>(
    `/v1/companies/${encodeURIComponent(companyId)}/tasks`,
    body,
    { timeout: 120_000 },
  );
  return data;
};

export const listCompanyTasks = async (
  companyId: string,
  filters: CompanyTaskFilters = {},
  offset = 0,
  signal?: AbortSignal,
) => {
  signal?.throwIfAborted();
  await ensureClientAccessToken();
  signal?.throwIfAborted();

  const { data } = await clientApi.get<TaskPage<CompanyTask>>(
    `/v1/companies/${encodeURIComponent(companyId)}/tasks`,
    { params: { ...filters, limit: 20, offset }, signal },
  );

  return data;
};
