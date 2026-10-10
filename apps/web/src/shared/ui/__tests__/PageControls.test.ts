import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PageControls } from '../PageControls';

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useEffect: (effect: () => void) => effect(),
}));

describe('пограничные состояния пагинации', () => {
  it('не предлагает пустую страницу после ровно 20 последних записей', () => {
    const html = renderToStaticMarkup(
      createElement(PageControls, {
        offset: 0,
        count: 20,
        hasMore: false,
        onPage: vi.fn(),
      }),
    );
    expect(html).toBe('');
  });
  it.each([
    { total: undefined, expected: 20 },
    { total: 20, expected: 0 },
    { total: 0, expected: 0 },
    { total: 21, expected: 20 },
  ])('возвращает с пустой страницы при total=$total', ({ total, expected }) => {
    const onPage = vi.fn();
    renderToStaticMarkup(
      createElement(PageControls, { offset: 40, count: 0, total, onPage }),
    );
    expect(onPage).toHaveBeenCalledWith(expected);
  });
  it('не меняет страницу во время загрузки', () => {
    const onPage = vi.fn();
    renderToStaticMarkup(
      createElement(PageControls, {
        offset: 40,
        count: 0,
        total: 0,
        pending: true,
        onPage,
      }),
    );
    expect(onPage).not.toHaveBeenCalled();
  });
});
