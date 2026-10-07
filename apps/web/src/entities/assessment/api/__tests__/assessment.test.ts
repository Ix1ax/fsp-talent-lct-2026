import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toApiError } from '@/shared/api/errors';

import {
  getAssessmentAttempt,
  getAvailableAssessments,
  getCurrentAssessment,
  saveAssessmentAnswer,
  startAssessment,
  submitAssessment,
} from '..';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('@/shared/api/client', () => ({
  clientApi: api,
  ensureClientAccessToken: vi.fn().mockResolvedValue(null),
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { items: [] } });
  api.post.mockResolvedValue({ data: { id: 'attempt' } });
  api.put.mockResolvedValue({});
});
describe('assessment API', () => {
  it('loads availability and attempts without caching', async () => {
    await getAvailableAssessments();
    await getCurrentAssessment();
    await getAssessmentAttempt('attempt');
    expect(api.get.mock.calls.map(([url]) => url)).toEqual([
      '/v1/me/assessments/available',
      '/v1/me/assessments/attempts/current',
      '/v1/me/assessments/attempts/attempt',
    ]);
    for (const [, config] of api.get.mock.calls)
      expect(config.headers['Cache-Control']).toBe('no-cache');
  });
  it('sends only start parameters and returns the created attempt', async () => {
    expect(await startAssessment({ specializationId: 1, gradeId: 2 })).toEqual({
      id: 'attempt',
    });
    expect(api.post).toHaveBeenCalledWith('/v1/me/assessments/attempts', {
      specializationId: 1,
      gradeId: 2,
    });
  });
  it('saves answers and submits without sending grading rules', async () => {
    await saveAssessmentAnswer('attempt', 'question', { selected: ['a'] });
    await submitAssessment('attempt');
    expect(api.put).toHaveBeenCalledWith(
      '/v1/me/assessments/attempts/attempt/answers/question',
      { selected: ['a'] },
    );
    expect(api.post).toHaveBeenCalledWith(
      '/v1/me/assessments/attempts/attempt/submit',
    );
  });
  it('preserves conflict details after snake case conversion', () => {
    const error = toApiError(
      409,
      {
        error: {
          code: 'attempt_active',
          message: 'Active',
          attempt_id: 'attempt',
          retry_at: '2026-10-14T12:00:00Z',
        },
      },
      'Error',
    );
    expect(error.attemptId).toBe('attempt');
    expect(error.retryAt).toBe('2026-10-14T12:00:00Z');
    expect(error.code).toBe('attempt_active');
  });
});
