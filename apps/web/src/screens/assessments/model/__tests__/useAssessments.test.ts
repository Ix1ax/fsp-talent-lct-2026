/* eslint-disable react-hooks/immutability -- The test renderer resets its simulated hook cursor between renders. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAssessments } from '../useAssessments';

const mocks = vi.hoisted(() => ({
  states: [] as unknown[],
  cursor: 0,
  effects: [] as (() => unknown)[],
  available: vi.fn(),
  current: vi.fn(),
}));
vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
  useState: (initial: unknown) => {
    const index = mocks.cursor++;
    if (!(index in mocks.states)) mocks.states[index] = initial;
    return [
      mocks.states[index],
      (next: unknown) => {
        mocks.states[index] =
          typeof next === 'function' ? next(mocks.states[index]) : next;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = mocks.cursor++;
    if (!(index in mocks.states)) mocks.states[index] = { current: initial };
    return mocks.states[index];
  },
  useEffect: (effect: () => unknown) => {
    mocks.effects.push(effect);
  },
}));
vi.mock('@/shared/hooks', () => ({
  useGuardedRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/entities/assessment', () => ({
  getAvailableAssessments: mocks.available,
  getCurrentAssessment: mocks.current,
  startAssessment: vi.fn(),
}));

const RenderAssessments = () => {
  mocks.cursor = 0;
  mocks.effects = [];
  return useAssessments();
};
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.states = [];
  mocks.current.mockResolvedValue({ id: 'attempt' });
  mocks.available.mockResolvedValue([{ canStart: true }]);
});

describe('assessment list reload', () => {
  it('clears the previous failure after a successful reload', async () => {
    mocks.available.mockRejectedValueOnce(new Error('offline'));
    RenderAssessments();
    mocks.effects[0]();
    await flush();
    expect(RenderAssessments().error).toBeTruthy();
    RenderAssessments().refresh();
    RenderAssessments();
    mocks.effects[0]();
    await flush();
    expect(RenderAssessments().error).toBe('');
    expect(RenderAssessments().loading).toBe(false);
  });
  it('does not show old tests or attempt while reloading or after a load failure', async () => {
    RenderAssessments();
    mocks.effects[0]();
    await flush();
    expect(RenderAssessments().current).toBe('attempt');
    RenderAssessments().refresh();
    mocks.available.mockRejectedValueOnce(new Error('offline'));
    RenderAssessments();
    mocks.effects[0]();
    expect(RenderAssessments().loading).toBe(true);
    expect(RenderAssessments().items).toEqual([]);
    expect(RenderAssessments().current).toBeUndefined();
    await flush();
    expect(RenderAssessments().items).toEqual([]);
    expect(RenderAssessments().error).toBeTruthy();
  });
});
