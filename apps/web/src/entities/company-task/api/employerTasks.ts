import {
  clientApi,
  ensureClientAccessToken,
  normalizeApiError,
} from '@/shared/api';

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

const taskPath = (companyId: string, taskId: string) =>
  `/v1/companies/${encodeURIComponent(companyId)}/tasks/${encodeURIComponent(taskId)}`;

const authorize = async (signal?: AbortSignal) => {
  signal?.throwIfAborted();
  await ensureClientAccessToken();
  signal?.throwIfAborted();
};

export const getCompanyTask = async (
  companyId: string,
  taskId: string,
  signal?: AbortSignal,
) => {
  await authorize(signal);
  const { data } = await clientApi.get<CompanyTask>(
    taskPath(companyId, taskId),
    { signal },
  );

  return data;
};

export const closeCompanyTask = async (
  companyId: string,
  taskId: string,
  signal?: AbortSignal,
) => {
  await authorize(signal);
  const { data } = await clientApi.post<CompanyTask>(
    `${taskPath(companyId, taskId)}/close`,
    undefined,
    { signal },
  );

  return data;
};

export const downloadCompanyTask = async (
  companyId: string,
  taskId: string,
  signal?: AbortSignal,
) => {
  await authorize(signal);
  try {
    const { data } = await clientApi.get<Blob>(
      `${taskPath(companyId, taskId)}/file`,
      {
        responseType: 'blob',
        timeout: 60_000,
        signal,
      },
    );

    return data;
  } catch (error) {
    throw await normalizeApiError(error);
  }
};
