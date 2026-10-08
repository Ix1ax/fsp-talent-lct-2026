import type { AssessmentAnswer } from '@/entities/assessment';

import type { AnswerState } from './createAnswerQueue';

export type QuestionProgress =
  'empty' | 'draft' | 'saving' | 'pending' | 'complete';

export const hasAssessmentAnswer = (answer?: AssessmentAnswer | null) =>
  !!(answer?.selected?.length || answer?.text?.trim());

export const getQuestionProgress = (
  state: AnswerState | undefined,
  reviewed: boolean,
): QuestionProgress => {
  if (!hasAssessmentAnswer(state?.answer)) return 'empty';
  if (state?.saving) return 'saving';
  if (
    state?.error ||
    JSON.stringify(state?.answer) !== JSON.stringify(state?.saved)
  )
    return 'pending';
  return reviewed ? 'complete' : 'draft';
};
