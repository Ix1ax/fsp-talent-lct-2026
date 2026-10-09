import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { Skill } from '../types';
import { type SkillLoader, useSkillSearch } from '../useSkillSearch';
const hooks = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  effects: [] as (() => (() => void) | undefined)[],
}));
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
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());
const RenderSearch = (
  load: SkillLoader,
  query: string,
  selected: string[] = [],
  enabled = true,
) => {
  hooks.cursor = 0;
  hooks.effects = [];
  const result = useSkillSearch(load, query, selected, enabled);
  return { result, effect: hooks.effects[0] };
};
const skill = (id: string, name: string): Skill => ({
  id,
  name,
  code: id,
  aliases: [],
});
it('aborts obsolete search and never replaces newer results with a late reply', async () => {
  const replies = new Map<string, (items: Skill[]) => void>();
  const load = vi.fn(
    (q: string, signal?: AbortSignal) =>
      new Promise<Skill[]>((resolve) => {
        expect(signal?.aborted).toBe(false);
        replies.set(q, resolve);
      }),
  );
  const cleanup = RenderSearch(load, 'old').effect();
  await vi.advanceTimersByTimeAsync(300);
  cleanup?.();
  RenderSearch(load, 'new').effect();
  await vi.advanceTimersByTimeAsync(300);
  replies.get('new')!([skill('new', 'New')]);
  await Promise.resolve();
  replies.get('old')!([skill('old', 'Old')]);
  await Promise.resolve();
  expect(load.mock.calls[0][1]?.aborted).toBe(true);
  expect(RenderSearch(load, 'new').result.items.map((s) => s.id)).toEqual([
    'new',
  ]);
});
it('retains the selected name outside subsequent search results and falls back for unresolved IDs', async () => {
  const load = vi.fn(async (q: string) =>
    q === '51' ? [skill('51', 'Skill 51')] : [skill('1', 'Skill 1')],
  );
  const cleanup = RenderSearch(load, '51').effect();
  await vi.advanceTimersByTimeAsync(300);
  cleanup?.();
  RenderSearch(load, '', ['51', 'missing']).effect();
  await vi.advanceTimersByTimeAsync(0);
  const result = RenderSearch(load, '', ['51', 'missing']).result;
  expect(result.items.map((s) => s.id)).toEqual(['1']);
  expect(result.skills.find((s) => s.id === '51')?.name).toBe('Skill 51');
  expect(result.skills.find((s) => s.id === 'missing')?.name).toBe(
    'Навык missing',
  );
});
it('does not search hidden controls and exposes errors for explicit retry', async () => {
  const load = vi.fn(async () => {
    throw new Error('offline');
  });
  RenderSearch(load, '', [], false).effect();
  await vi.advanceTimersByTimeAsync(300);
  expect(load).not.toHaveBeenCalled();
  RenderSearch(load, '').effect();
  await vi.advanceTimersByTimeAsync(0);
  expect(RenderSearch(load, '').result.error).toBeTruthy();
  RenderSearch(load, '').result.retry();
  RenderSearch(load, '').effect();
  await vi.advanceTimersByTimeAsync(0);
  expect(load).toHaveBeenCalledTimes(2);
});
