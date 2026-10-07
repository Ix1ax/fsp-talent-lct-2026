import { describe, expect, it, vi } from 'vitest';

import type { CandidateFullProfile } from '@/entities/candidate';

import { createProfileRefresh } from '../createProfileRefresh';

const deferred = () => {
  let resolve!: (value: CandidateFullProfile) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<CandidateFullProfile>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
const snapshot = { profile: null } as CandidateFullProfile;

describe('full profile refresh', () => {
  it('does not overwrite a mutation with a response started before saving', async () => {
    const pending = deferred();
    const apply = vi.fn();
    const controller = createProfileRefresh({
      load: () => pending.promise,
      apply,
    });
    const request = controller.refresh();
    controller.invalidate();
    pending.resolve(snapshot);
    await request;
    expect(apply).not.toHaveBeenCalled();
  });
  it('applies only the newest request even if the transport ignores cancellation', async () => {
    const old = deferred();
    const latest = deferred();
    const apply = vi.fn();
    const controller = createProfileRefresh({
      load: vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(latest.promise),
      apply,
    });
    const first = controller.refresh();
    const second = controller.refresh();
    latest.resolve(snapshot);
    await second;
    old.resolve({ ...snapshot });
    await first;
    expect(apply).toHaveBeenCalledExactlyOnceWith(snapshot);
  });
  it('ignores obsolete failures but exposes a current failure for retry', async () => {
    const old = deferred();
    const latest = deferred();
    const apply = vi.fn();
    const controller = createProfileRefresh({
      load: vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(latest.promise),
      apply,
    });
    const first = controller.refresh();
    const second = controller.refresh();
    old.reject(new Error('old'));
    await expect(first).resolves.toBeUndefined();
    latest.reject(new Error('current'));
    await expect(second).rejects.toThrow('current');
    expect(apply).not.toHaveBeenCalled();
  });
  it('does not apply a response after caller cancellation', async () => {
    const pending = deferred();
    const apply = vi.fn();
    const controller = createProfileRefresh({
      load: () => pending.promise,
      apply,
    });
    const signal = new AbortController();
    const request = controller.refresh(signal.signal);
    signal.abort();
    pending.resolve(snapshot);
    await request;
    expect(apply).not.toHaveBeenCalled();
  });
});
