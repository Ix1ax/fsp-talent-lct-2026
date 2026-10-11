import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminApiError } from '@/entities/admin';

import { useAdminMutation } from '../useAdminMutation';

const { setState } = vi.hoisted(() => ({ setState: vi.fn() }));
vi.mock('react', () => ({
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value, setState],
}));
beforeEach(() => vi.clearAllMocks());

describe('admin mutation lifecycle', () => {
  it.each(['timeout', 'network', 'http_error'])(
    'releases busy and permits resubmission after %s',
    async (code) => {
      const mutation = useAdminMutation();
      const error = new AdminApiError('Failed', 0, code);
      expect(await mutation.run(() => Promise.reject(error))).toBe(false);
      expect(setState).toHaveBeenCalledWith(error);
      expect(setState).toHaveBeenLastCalledWith(false);
      const save = vi.fn().mockResolvedValue(undefined);
      expect(await mutation.run(save)).toBe(true);
      expect(save).toHaveBeenCalledOnce();
      expect(setState).toHaveBeenLastCalledWith(false);
    },
  );
  it('blocks a second click until the first mutation settles', async () => {
    const mutation = useAdminMutation();
    let finish: () => void = () => {};
    const first = mutation.run(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const duplicate = vi.fn();
    expect(await mutation.run(duplicate)).toBe(false);
    expect(duplicate).not.toHaveBeenCalled();
    finish();
    expect(await first).toBe(true);
    expect(setState).toHaveBeenLastCalledWith(false);
  });
});
