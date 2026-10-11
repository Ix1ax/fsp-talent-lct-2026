import { clientApi, ensureClientAccessToken } from '@/shared/api';

import type {
  AssessmentAnswer,
  AssessmentAttempt,
  AvailableAssessment,
} from '../model';

export type StartAssessmentInput = {
  stackSkillId: string;
  specializationId: number;
  gradeId: number;
};

const base = '/v1/me/assessments';
const noStore = { headers: { 'Cache-Control': 'no-cache' } };

export const getAvailableAssessments = async (signal?: AbortSignal) => {
  await ensureClientAccessToken();

  signal?.throwIfAborted();

  const { data } = await clientApi.get<{ items: AvailableAssessment[] }>(
    `${base}/available`,
    { ...noStore, signal },
  );

  return data.items;
};

export const startAssessment = async (input: StartAssessmentInput) => {
  await ensureClientAccessToken();

  const { data } = await clientApi.post<AssessmentAttempt>(
    `${base}/attempts`,
    input,
  );

  return data;
};

export const getCurrentAssessment = async (signal?: AbortSignal) => {
  await ensureClientAccessToken();
  signal?.throwIfAborted();

  const { data } = await clientApi.get<AssessmentAttempt>(
    `${base}/attempts/current`,
    { ...noStore, signal },
  );

  return data;
};

export const getAssessmentAttempt = async (
  id: string,
  signal?: AbortSignal,
) => {
  await ensureClientAccessToken();
  signal?.throwIfAborted();

  const { data } = await clientApi.get<AssessmentAttempt>(
    `${base}/attempts/${encodeURIComponent(id)}`,
    { ...noStore, signal },
  );

  return data;
};

export const saveAssessmentAnswer = async (
  id: string,
  questionId: string,
  answer: AssessmentAnswer,
): Promise<void> => {
  await ensureClientAccessToken();
  await clientApi.put(
    `${base}/attempts/${encodeURIComponent(id)}/answers/${encodeURIComponent(questionId)}`,
    answer,
  );
};

export const submitAssessment = async (id: string) => {
  await ensureClientAccessToken();

  const { data } = await clientApi.post<AssessmentAttempt>(
    `${base}/attempts/${encodeURIComponent(id)}/submit`,
  );

  return data;
};
export { type AssessmentHistoryParams, getAssessmentHistory } from './history';
