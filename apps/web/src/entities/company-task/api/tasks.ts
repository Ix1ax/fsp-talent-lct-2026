import { clientApi, ensureClientAccessToken } from '@/shared/api';

import type { CompanyTask, TaskPage, TaskSubmission } from '../model';

export type TaskFilters = {
  q?: string;
  status?: 'all' | 'open' | 'closed';
  specializationId?: number;
  gradeId?: number;
  submitted?: boolean;
};

export type SubmissionFilters = {
  status?: 'all' | 'submitted' | 'reviewed';
  sort?: 'newest' | 'score';
  companyId?: string;
  taskId?: string;
};

const get = async <T>(path: string, signal?: AbortSignal, params?: object) => {
  await ensureClientAccessToken();

  signal?.throwIfAborted();

  const { data } = await clientApi.get<T>(path, { signal, params });

  return data;
};

export const listTasks = (
  filters: TaskFilters,
  offset = 0,
  signal?: AbortSignal,
) => {
  return get<TaskPage<CompanyTask>>('/v1/tasks', signal, {
    ...filters,
    limit: 20,
    offset,
  });
};

export const getTask = (id: string, signal?: AbortSignal) => {
  return get<CompanyTask>(`/v1/tasks/${encodeURIComponent(id)}`, signal);
};

export const listMyTaskSubmissions = (
  filters: SubmissionFilters,
  offset = 0,
  signal?: AbortSignal,
) => {
  return get<TaskPage<TaskSubmission>>('/v1/me/task-submissions', signal, {
    ...filters,
    limit: 20,
    offset,
  });
};

export const getMyTaskSubmission = (id: string, signal?: AbortSignal) => {
  return get<TaskSubmission>(
    `/v1/me/task-submissions/${encodeURIComponent(id)}`,
    signal,
  );
};

export const submitTaskSolution = async (id: string, file: File) => {
  await ensureClientAccessToken();
  const body = new FormData();
  body.append('file', file);

  const { data } = await clientApi.post<TaskSubmission>(
    `/v1/tasks/${encodeURIComponent(id)}/submissions`,
    body,
    {
      timeout: 120_000,
    },
  );

  return data;
};

const download = async (path: string) => {
  await ensureClientAccessToken();

  const { data } = await clientApi.get<Blob>(path, {
    responseType: 'blob',
    timeout: 60_000,
  });

  return data;
};

export const downloadTask = (id: string) => {
  return download(`/v1/tasks/${encodeURIComponent(id)}/file`);
};

export const downloadMyTaskSolution = (id: string) => {
  return download(`/v1/me/task-submissions/${encodeURIComponent(id)}/file`);
};
