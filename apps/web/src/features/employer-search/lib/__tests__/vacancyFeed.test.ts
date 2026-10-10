import { describe, expect, it, vi } from 'vitest';

import type { EmployerNeed } from '@/entities/employer-need';

import {
  emptyVacancyFilters,
  filterVacancyFeed,
  loadStatusVacancies,
} from '../vacancyFeed';

const need = (patch: Partial<EmployerNeed> = {}): EmployerNeed => ({
  id: 'first',
  companyId: 'company',
  createdBy: 'user',
  createdAt: '2026-10-09T08:00:00Z',
  title: 'Frontend React',
  description: 'Команда продукта',
  specializationId: 1,
  gradeId: 2,
  salaryFromRub: null,
  salaryToRub: null,
  city: null,
  timezone: null,
  skills: [{ skillId: 'react', required: true, weight: 1 }],
  workFormatIds: [3],
  status: 'active',
  ...patch,
});
describe('vacancy feed', () => {
  it('reads all pages of the selected status, including matches after the first page', async () => {
    const wanted = need({ id: 'last', title: 'React developer' });
    const needs = vi.fn(async (_company, _status, offset) => ({
      items:
        offset === 0
          ? Array.from({ length: 20 }, (_, i) =>
              need({ id: String(i), title: 'Other role' }),
            )
          : [wanted],
    }));
    const items = await loadStatusVacancies(
      { needs },
      'company',
      'draft',
      new AbortController().signal,
    );
    expect(
      needs.mock.calls.map(([, status, offset]) => [status, offset]),
    ).toEqual([
      ['draft', 0],
      ['draft', 20],
    ]);
    expect(
      filterVacancyFeed(items, { ...emptyVacancyFilters(), query: ' REACT ' }),
    ).toEqual([wanted]);
  });
  it('combines specialization, grade, skill and any selected work format', () => {
    const expected = need();
    const items = [
      expected,
      need({ id: 'wrong-skill', skills: [] }),
      need({ id: 'wrong-grade', gradeId: null }),
      need({ id: 'wrong-format', workFormatIds: [1] }),
      need({ id: 'wrong-role', specializationId: 4 }),
    ];
    expect(
      filterVacancyFeed(items, {
        ...emptyVacancyFilters(),
        specializationId: 1,
        gradeId: 2,
        skillId: 'react',
        workFormatIds: [2, 3],
      }),
    ).toEqual([expected]);
  });
  it('sorts missing salaries after zero and compares the upper bound when present', () => {
    const items = [
      need({ id: 'missing' }),
      need({ id: 'zero', salaryFromRub: 0 }),
      need({ id: 'range', salaryFromRub: 100, salaryToRub: 200 }),
      need({ id: 'lower', salaryFromRub: 150 }),
    ];
    expect(
      filterVacancyFeed(items, {
        ...emptyVacancyFilters(),
        sort: 'salary',
      }).map((item) => item.id),
    ).toEqual(['range', 'lower', 'zero', 'missing']);
    expect(items[0].id).toBe('missing');
  });
  it('sorts actual timestamps across timezone offsets without mutating the source', () => {
    const items = [
      need({ id: 'older', createdAt: '2026-10-09T09:00:00+03:00' }),
      need({ id: 'newer', createdAt: '2026-10-09T07:00:00Z' }),
    ];
    expect(
      filterVacancyFeed(items, emptyVacancyFilters()).map((item) => item.id),
    ).toEqual(['newer', 'older']);
    expect(items[0].id).toBe('older');
  });
  it('does not present partial matches when a later page fails', async () => {
    const needs = vi.fn(async (_company, _status, offset) => {
      if (offset) throw new Error('API unavailable');
      return { items: Array.from({ length: 20 }, () => need()) };
    });
    await expect(
      loadStatusVacancies(
        { needs },
        'company',
        'active',
        new AbortController().signal,
      ),
    ).rejects.toThrow('API unavailable');
  });
  it('does not fetch after cancellation and rejects a response cancelled in flight', async () => {
    const controller = new AbortController();
    controller.abort();
    const needs = vi.fn();
    await expect(
      loadStatusVacancies({ needs }, 'company', 'active', controller.signal),
    ).rejects.toThrow();
    expect(needs).not.toHaveBeenCalled();
    const inFlight = new AbortController();
    await expect(
      loadStatusVacancies(
        {
          needs: async () => {
            inFlight.abort();
            return { items: [need()] };
          },
        },
        'company',
        'active',
        inFlight.signal,
      ),
    ).rejects.toThrow();
  });
});
