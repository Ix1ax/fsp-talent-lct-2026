import { clientApi, ensureClientAccessToken } from '@/shared/api';

import type { AssessmentHistoryPage } from '../model';

export type AssessmentHistoryParams = {
  limit?: number;
  offset?: number;
};

export const getAssessmentHistory = async (
  { limit = 20, offset = 0 }: AssessmentHistoryParams = {},
  signal?: AbortSignal,
) => {
  signal?.throwIfAborted();
  await ensureClientAccessToken();
  signal?.throwIfAborted();

  const { data } = await clientApi.get<AssessmentHistoryPage>(
    '/v1/me/assessments/history',
    { params: { limit, offset }, signal },
  );

  return data;
};
