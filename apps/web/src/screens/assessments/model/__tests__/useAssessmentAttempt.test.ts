import { beforeEach, expect, it, vi } from 'vitest';

import type { AssessmentAttempt } from '@/entities/assessment';

import { useAssessmentAttempt } from '../useAssessmentAttempt';

const hooks = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  effects: [] as (() => () => void)[],
}));
const api = vi.hoisted(() => ({ getAssessmentAttempt: vi.fn() }));
vi.mock('@/entities/assessment', () => api);
vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [
      hooks.slots[index],
      (value: unknown) => {
        hooks.slots[index] =
          typeof value === 'function' ? value(hooks.slots[index]) : value;
      },
    ];
  },
  useEffect: (effect: () => () => void) => hooks.effects.push(effect),
}));
const RenderAttempt = (id = 'attempt') => {
  hooks.cursor = 0;
  hooks.effects = [];
  const state = useAssessmentAttempt(id);
  return { state, effect: hooks.effects[0] };
};
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
beforeEach(() => {
  hooks.slots = [];
  hooks.cursor = 0;
  hooks.effects = [];
  api.getAssessmentAttempt.mockReset();
});

it('retries a failed attempt load and clears the old error before requesting again', async () => {
  const attempt = { id: 'attempt' } as AssessmentAttempt;
  api.getAssessmentAttempt
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(attempt);
  const cleanup = RenderAttempt().effect();
  await flush();
  const failed = RenderAttempt().state;
  expect(failed.error).toContain('Не удалось загрузить попытку');
  expect(failed.loading).toBe(false);
  failed.retry();
  cleanup();
  const retry = RenderAttempt();
  expect(retry.state.loading).toBe(true);
  expect(retry.state.error).toBeUndefined();
  retry.effect();
  await flush();
  expect(api.getAssessmentAttempt).toHaveBeenCalledTimes(2);
  expect(RenderAttempt().state.attempt).toBe(attempt);
});

it('aborts an old request and ignores its late response after changing attempt', async () => {
  let resolve!: (attempt: AssessmentAttempt) => void;
  api.getAssessmentAttempt
    .mockImplementationOnce(
      () =>
        new Promise<AssessmentAttempt>((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValueOnce({ id: 'new' });
  const cleanup = RenderAttempt('old').effect();
  cleanup();
  expect(api.getAssessmentAttempt.mock.calls[0][1].aborted).toBe(true);
  const next = RenderAttempt('new');
  expect(next.state.loading).toBe(true);
  next.effect();
  await flush();
  resolve({ id: 'old' } as AssessmentAttempt);
  await flush();
  expect(RenderAttempt('new').state.attempt?.id).toBe('new');
});
