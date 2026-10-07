import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssessmentAttempt } from '@/entities/assessment';

import { createAnswerQueue } from '../createAnswerQueue';
import { createAssessmentActions } from '../createAssessmentActions';
import { createAttemptStore } from '../createAttemptStore';

const api = vi.hoisted(() => ({ load: vi.fn(), submit: vi.fn() }));
vi.mock('@/entities/assessment', () => ({
  getAssessmentAttempt: api.load,
  submitAssessment: api.submit,
}));
const initial: AssessmentAttempt = {
  id: 'attempt',
  status: 'active',
  specializationId: 1,
  gradeId: 2,
  startedAt: '2026-10-07T12:00:00Z',
  deadlineAt: '2099-10-07T12:00:00Z',
  finishedAt: null,
  timeLimitSec: 600,
  questions: [],
  result: null,
};
const completed: AssessmentAttempt = {
  ...initial,
  status: 'completed',
  result: {
    passed: true,
    scorePercent: 90,
    passScore: 70,
    skills: [],
    category: null,
    retryAt: null,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  api.load.mockResolvedValue(completed);
  api.submit.mockResolvedValue(completed);
});
describe('attempt controller', () => {
  it('does not replace the result with a late active snapshot', () => {
    const store = createAttemptStore(initial);
    store.apply(completed);
    store.apply(initial);
    expect(store.getSnapshot().attempt).toBe(completed);
  });
  it('stops submission when saving fails and keeps the draft', async () => {
    const store = createAttemptStore(initial);
    const queue = createAnswerQueue({
      save: async () => false,
      onChange: store.answersChanged,
    });
    queue.initialize('question', { text: '' });
    queue.update('question', { text: 'draft' });
    const actions = createAssessmentActions(store, queue);
    expect(await actions.finish()).toBe(false);
    expect(api.submit).not.toHaveBeenCalled();
    expect(queue.dirty()).toBe(true);
    expect(store.getSnapshot().busy).toBe(false);
  });
  it('deduplicates submission while waiting for answers to save', async () => {
    let resolve!: () => void;
    const saving = new Promise<void>((done) => {
      resolve = done;
    });
    const store = createAttemptStore(initial);
    const queue = createAnswerQueue({
      save: () => saving,
      onChange: store.answersChanged,
    });
    queue.initialize('question', { text: '' });
    queue.update('question', { text: 'answer' });
    const actions = createAssessmentActions(store, queue);
    const finishing = actions.finish();
    expect(await actions.finish()).toBe(false);
    expect(api.submit).not.toHaveBeenCalled();
    resolve();
    expect(await finishing).toBe(true);
    expect(api.submit).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().attempt.result).toBe(completed.result);
  });
  it('reads the server result instead of submitting expired drafts', async () => {
    const store = createAttemptStore({
      ...initial,
      deadlineAt: '2000-01-01T00:00:00Z',
    });
    const save = vi.fn();
    const queue = createAnswerQueue({ save, onChange: store.answersChanged });
    const actions = createAssessmentActions(store, queue);
    expect(await actions.finish()).toBe(true);
    expect(api.load).toHaveBeenCalledTimes(1);
    expect(api.submit).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});
