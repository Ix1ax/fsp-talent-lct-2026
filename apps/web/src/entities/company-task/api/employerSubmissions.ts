import {
  clientApi,
  ensureClientAccessToken,
  normalizeApiError,
} from '@/shared/api';

import type { TaskPage, TaskSubmission } from '../model';
import type { SubmissionFilters } from './tasks';

export type CompanySubmissionFilters = SubmissionFilters & {
  candidateId?: string;
  limit?: number;
  offset?: number;
};

export type ReviewTaskSubmissionInput = {
  score?: number;
  feedback?: string;
};

const submissionsPath = (companyId: string, taskId: string) => {
  return `/v1/companies/${encodeURIComponent(companyId)}/tasks/${encodeURIComponent(taskId)}/submissions`;
};

const submissionPath = (
  companyId: string,
  taskId: string,
  submissionId: string,
) => {
  return `${submissionsPath(companyId, taskId)}/${encodeURIComponent(submissionId)}`;
};

const authorize = async (signal?: AbortSignal) => {
  signal?.throwIfAborted();
  await ensureClientAccessToken();
  signal?.throwIfAborted();
};

export const listCompanyTaskSubmissions = async (
  companyId: string,
  taskId: string,
  { limit = 20, offset = 0, ...filters }: CompanySubmissionFilters = {},
  signal?: AbortSignal,
) => {
  await authorize(signal);

  const { data } = await clientApi.get<TaskPage<TaskSubmission>>(
    submissionsPath(companyId, taskId),
    { params: { ...filters, limit, offset }, signal },
  );

  return data;
};

export const getCompanyTaskSubmission = async (
  companyId: string,
  taskId: string,
  submissionId: string,
  signal?: AbortSignal,
) => {
  await authorize(signal);

  const { data } = await clientApi.get<TaskSubmission>(
    submissionPath(companyId, taskId, submissionId),
    { signal },
  );

  return data;
};

export const downloadCompanyTaskSolution = async (
  companyId: string,
  taskId: string,
  submissionId: string,
  signal?: AbortSignal,
) => {
  await authorize(signal);

  try {
    const { data } = await clientApi.get<Blob>(
      `${submissionPath(companyId, taskId, submissionId)}/file`,
      { responseType: 'blob', timeout: 60_000, signal },
    );

    return data;
  } catch (error) {
    throw await normalizeApiError(error);
  }
};

export const reviewCompanyTaskSubmission = async (
  companyId: string,
  taskId: string,
  submissionId: string,
  input: ReviewTaskSubmissionInput,
  signal?: AbortSignal,
) => {
  await authorize(signal);

  const { data } = await clientApi.patch<TaskSubmission>(
    `${submissionPath(companyId, taskId, submissionId)}/review`,
    input,
    { signal },
  );

  return data;
};
