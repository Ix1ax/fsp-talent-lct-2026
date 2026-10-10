import { beforeEach, expect, it, vi } from 'vitest';

import { useRemoteData } from '../useRemoteData';
const hooks = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  effects: [] as (() => (() => void) | undefined)[],
}));
vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
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
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useEffect: (effect: () => (() => void) | undefined) =>
    hooks.effects.push(effect),
}));
beforeEach(() => {
  hooks.slots = [];
  hooks.cursor = 0;
  hooks.effects = [];
});
const RenderRemote = (
  load: (signal: AbortSignal) => Promise<string>,
  enabled = true,
  revision = 0,
) => {
  hooks.cursor = 0;
  hooks.effects = [];
  const result = useRemoteData(load, revision, enabled);
  return { result, effect: hooks.effects[0] };
};
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
it('loads only visible resources, reuses completed data, and explicitly retries', async () => {
  const load = vi.fn(async () => 'data');
  const hidden = RenderRemote(load, false);
  hidden.effect();
  expect(hidden.result.loading).toBe(false);
  expect(load).not.toHaveBeenCalled();
  RenderRemote(load).effect();
  await flush();
  expect(RenderRemote(load).result.data).toBe('data');
  RenderRemote(load, false).effect();
  RenderRemote(load).effect();
  expect(load).toHaveBeenCalledOnce();
  RenderRemote(load).result.retry();
  RenderRemote(load).effect();
  await flush();
  expect(load).toHaveBeenCalledTimes(2);
});
it('aborts hidden requests and ignores late results after company changes', async () => {
  let resolve!: (value: string) => void;
  const old = vi.fn(
    (signal: AbortSignal) =>
      new Promise<string>((done) => {
        resolve = done;
        expect(signal.aborted).toBe(false);
      }),
  );
  const cleanup = RenderRemote(old).effect();
  cleanup?.();
  expect(old.mock.calls[0][0].aborted).toBe(true);
  const next = vi.fn(async () => 'new company');
  RenderRemote(next).effect();
  await flush();
  resolve('old company');
  await flush();
  expect(RenderRemote(next).result.data).toBe('new company');
});
it('retains an error while hidden and retries only on request', async () => {
  const load = vi.fn(async () => {
    throw new Error('offline');
  });
  RenderRemote(load).effect();
  await flush();
  expect(RenderRemote(load).result.error).toBeTruthy();
  RenderRemote(load, false).effect();
  RenderRemote(load).effect();
  expect(load).toHaveBeenCalledOnce();
  RenderRemote(load).result.retry();
  RenderRemote(load).effect();
  await flush();
  expect(load).toHaveBeenCalledTimes(2);
});

it('patches completed data without refetching and ignores updates from an old scope', async () => {
  const loadA = vi.fn(async () => 'A');
  RenderRemote(loadA).effect();
  await flush();
  const updateA = RenderRemote(loadA).result.updateData;
  updateA((value) => value + ' patched');
  expect(RenderRemote(loadA).result.data).toBe('A patched');
  expect(loadA).toHaveBeenCalledOnce();
  const loadB = vi.fn(async () => 'B');
  RenderRemote(loadB).effect();
  await flush();
  updateA(() => 'stale A');
  expect(RenderRemote(loadB).result.data).toBe('B');
});
