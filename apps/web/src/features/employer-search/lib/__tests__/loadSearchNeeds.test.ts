import { describe, expect, it, vi } from 'vitest';

import type { EmployerNeed } from '@/entities/employer-need';

import { filterSearchNeeds, loadSearchNeeds } from '../loadSearchNeeds';
const item = (title: string) => ({ title }) as EmployerNeed;
describe('поиск потребностей компании', () => {
  it('читает страницы каждого статуса, включая архив и черновики', async () => {
    const needs = vi.fn(async (_company, status, offset) => ({
      items:
        status === 'active' && offset === 0
          ? Array.from({ length: 20 }, () => item('Frontend'))
          : [item(status)],
    }));
    const items = await loadSearchNeeds(
      { needs },
      'company',
      new AbortController().signal,
    );
    expect(needs).toHaveBeenCalledTimes(4);
    expect(
      needs.mock.calls.some(
        ([, status, offset]) => status === 'active' && offset === 20,
      ),
    ).toBe(true);
    expect(items.map((need) => need.title)).toContain('archived');
    expect(items.map((need) => need.title)).toContain('draft');
  });
  it('не возвращает неполные результаты при сбое одной вкладки', async () => {
    const needs = vi.fn(async (_company, status) => {
      if (status === 'draft') throw new Error('API unavailable');
      return { items: [item('Frontend')] };
    });
    await expect(
      loadSearchNeeds({ needs }, 'company', new AbortController().signal),
    ).rejects.toThrow('API unavailable');
  });
  it('останавливает запросы при отмене', async () => {
    const controller = new AbortController();
    controller.abort();
    const needs = vi.fn();
    await expect(
      loadSearchNeeds({ needs }, 'company', controller.signal),
    ).rejects.toThrow();
    expect(needs).not.toHaveBeenCalled();
  });
  it('ищет без учёта регистра и краевых пробелов', () => {
    expect(
      filterSearchNeeds(
        [item('Аналитик данных'), item('Frontend')],
        '  ДАННЫХ ',
      ),
    ).toEqual([item('Аналитик данных')]);
  });
});
