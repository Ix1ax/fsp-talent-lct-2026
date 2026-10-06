import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Skill } from '@/entities/catalog';

import { getAllSkills } from '../getAllSkills';
import { getSkills } from '../getSkills';

vi.mock('server-only', () => ({}));
vi.mock('../getSkills', () => ({ getSkills: vi.fn() }));

const mockGetSkills = vi.mocked(getSkills);

const createSkill = (index: number): Skill => ({
  id: String(index),
  code: `skill-${index}`,
  name: `Skill ${index}`,
  aliases: [],
});

describe('getAllSkills', () => {
  beforeEach(() => mockGetSkills.mockReset());

  it('loads all matching skills across API pages', async () => {
    const firstItems = Array.from({ length: 100 }, (_, index) =>
      createSkill(index),
    );
    const lastItems = [createSkill(100)];
    mockGetSkills
      .mockResolvedValueOnce({ items: firstItems, limit: 100, offset: 0 })
      .mockResolvedValueOnce({ items: lastItems, limit: 100, offset: 100 });

    expect(await getAllSkills({ q: 'go' })).toEqual([
      ...firstItems,
      ...lastItems,
    ]);
    expect(mockGetSkills).toHaveBeenNthCalledWith(1, {
      q: 'go',
      limit: 100,
      offset: 0,
    });
    expect(mockGetSkills).toHaveBeenNthCalledWith(2, {
      q: 'go',
      limit: 100,
      offset: 100,
    });
    expect(mockGetSkills).toHaveBeenCalledTimes(2);
  });

  it('returns an empty list when there are no matches', async () => {
    mockGetSkills.mockResolvedValueOnce({ items: [], limit: 100, offset: 0 });
    expect(await getAllSkills({})).toEqual([]);
    expect(mockGetSkills).toHaveBeenCalledTimes(1);
  });

  it('rejects when a later API page fails instead of returning a partial list', async () => {
    const error = new Error('API unavailable');
    mockGetSkills
      .mockResolvedValueOnce({
        items: Array.from({ length: 100 }, (_, index) => createSkill(index)),
        limit: 100,
        offset: 0,
      })
      .mockRejectedValueOnce(error);

    await expect(getAllSkills({})).rejects.toThrow(error);
  });
});
