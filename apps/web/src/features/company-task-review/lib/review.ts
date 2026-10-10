import { ApiError, getApiErrorMessage } from '@/shared/api';
import type { MemberRole } from '@/entities/company';
import type {
  ReviewTaskSubmissionInput,
  TaskSubmission,
} from '@/entities/company-task';

import { type TaskReviewFormValues, taskReviewSchema } from '../constants';

export const canReviewTaskSubmission = (role: MemberRole) =>
  role === 'owner' || role === 'recruiter';

export const getTaskReviewValues = (
  submission: Pick<TaskSubmission, 'score' | 'feedback'>,
): TaskReviewFormValues => ({
  score: submission.score === null ? '' : String(submission.score),
  feedback: submission.feedback ?? '',
});

export const getTaskReviewInput = (
  values: TaskReviewFormValues,
): ReviewTaskSubmissionInput => {
  const { score, feedback } = taskReviewSchema.parse(values);
  return {
    ...(score ? { score: Number(score) } : {}),
    ...(feedback ? { feedback } : {}),
  };
};

export const getTaskReviewError = (error: unknown) => {
  if (error instanceof ApiError && error.status === 404) {
    return 'Решение больше недоступно. Возможно, кандидат отозвал согласие на публикацию.';
  }
  return getApiErrorMessage(error);
};
