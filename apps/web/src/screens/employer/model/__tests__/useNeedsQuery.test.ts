import { beforeEach, expect, it, vi } from 'vitest';

import type { EmployerNeed } from '@/entities/employer-need';

import type { EmployerGateway } from '../../lib/gateway';
import { useNeedsQuery } from '../useNeedsQuery';

const hooks = vi.hoisted(() => ({
  states: [] as unknown[],
  cursor: 0,
  effects: [] as (() => (() => void) | undefined)[],
}));
vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.states)) hooks.states[index] = initial;
    return [
      hooks.states[index],
      (value: unknown) => {
        hooks.states[index] = value;
      },
    ];
  },
  useEffect: (effect: () => (() => void) | undefined) => {
    hooks.effects.push(effect);
  },
}));
beforeEach(() => {
  hooks.states = [];
  hooks.cursor = 0;
  hooks.effects = [];
});
it('changing company hides old data immediately and ignores old list/detail replies', async () => {
  const listReplies = new Map<string, (page: unknown) => void>();
  const detailReplies = new Map<string, (need: unknown) => void>();
  const api = {
    needs: vi.fn(
      (id: string) =>
        new Promise((resolve) => {
          listReplies.set(id, resolve);
        }),
    ),
    need: vi.fn(
      (id: string) =>
        new Promise((resolve) => {
          detailReplies.set(id, resolve);
        }),
    ),
  } as unknown as EmployerGateway;
  const RenderQuery = (companyId: string) => {
    hooks.cursor = 0;
    hooks.effects = [];
    return useNeedsQuery({
      api,
      companyId,
      status: 'active',
      offset: 0,
      selectedId: 'selected',
      revision: 0,
      enabled: true,
    });
  };
  RenderQuery('A');
  const cleanupA = hooks.effects.map((effect) => effect());
  cleanupA.forEach((cleanup) => cleanup?.());
  expect(RenderQuery('B').items).toEqual([]);
  hooks.effects.forEach((effect) => effect());
  const needB = { id: 'selected', companyId: 'B' } as EmployerNeed;
  listReplies.get('B')!({ items: [needB], limit: 20 });
  detailReplies.get('B')!(needB);
  await Promise.resolve();
  const needA = { id: 'selected', companyId: 'A' } as EmployerNeed;
  listReplies.get('A')!({ items: [needA], limit: 20 });
  detailReplies.get('A')!(needA);
  await Promise.resolve();
  expect(RenderQuery('B').items).toEqual([needB]);
  expect(RenderQuery('B').selected).toEqual(needB);
});
