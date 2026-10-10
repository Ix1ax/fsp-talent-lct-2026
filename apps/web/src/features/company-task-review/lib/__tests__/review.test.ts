import { describe, expect, it } from 'vitest';

import { taskReviewSchema } from '../../constants';
import {
  canReviewTaskSubmission,
  getTaskReviewInput,
  getTaskReviewValues,
} from '../review';

describe('company task review', () => {
  it('allows only the owner and recruiter to review', () => {
    expect(canReviewTaskSubmission('owner')).toBe(true);
    expect(canReviewTaskSubmission('recruiter')).toBe(true);
    expect(canReviewTaskSubmission('viewer')).toBe(false);
  });

  it('preserves a zero score and omits fields cleared on repeat review', () => {
    expect(getTaskReviewValues({ score: 0, feedback: null })).toEqual({
      score: '0',
      feedback: '',
    });
    expect(getTaskReviewInput({ score: '0', feedback: '  ' })).toEqual({
      score: 0,
    });
    expect(
      getTaskReviewInput({ score: '', feedback: ' Хорошая работа ' }),
    ).toEqual({ feedback: 'Хорошая работа' });
  });

  it('requires at least one result and rejects invalid scores', () => {
    for (const score of ['', '-1', '101', '0.5', 'NaN']) {
      expect(taskReviewSchema.safeParse({ score, feedback: ' ' }).success).toBe(
        false,
      );
    }
    expect(
      taskReviewSchema.safeParse({ score: '100', feedback: '' }).success,
    ).toBe(true);
    expect(
      taskReviewSchema.safeParse({ score: '', feedback: 'a'.repeat(5001) })
        .success,
    ).toBe(false);
  });
});
