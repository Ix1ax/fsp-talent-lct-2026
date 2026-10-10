import { describe, expect, it } from 'vitest';

import { normalizePage } from '../normalizePage';

describe('страницы без total', () => {
  it.each([0, 1, 19, 20, 21])('обрабатывает %i записей API', (count) => {
    const page = normalizePage({
      items: Array.from({ length: count }, (_, i) => i),
      limit: 21,
      offset: 40,
    });
    expect(page.items).toHaveLength(Math.min(count, 20));
    expect(page.hasMore).toBe(count > 20);
    expect(page.offset).toBe(40);
    expect(page.limit).toBe(20);
  });
  it('не теряет дополнительную запись на следующей странице', () => {
    const source = Array.from({ length: 40 }, (_, i) => i);
    const first = normalizePage({
      items: source.slice(0, 21),
      limit: 21,
      offset: 0,
    });
    const last = normalizePage({
      items: source.slice(20, 41),
      limit: 21,
      offset: 20,
    });
    expect([...first.items, ...last.items]).toEqual(source);
    expect(first.hasMore).toBe(true);
    expect(last.hasMore).toBe(false);
  });
});
