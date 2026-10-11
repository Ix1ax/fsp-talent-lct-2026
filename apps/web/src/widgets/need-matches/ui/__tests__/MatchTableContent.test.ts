import { type ComponentProps, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { MatchTableContent } from '../MatchTableContent';

type Props = ComponentProps<typeof MatchTableContent>;

const render = (data: Props['data'], error = '') =>
  renderToStaticMarkup(
    createElement(MatchTableContent, {
      data,
      error,
      offset: 0,
      retry: vi.fn(),
      catalogs: { specializations: [], grades: [], workFormats: [] },
    }),
  );

const emptyData: NonNullable<Props['data']> = {
  items: [],
  total: 0,
  limit: 20,
  offset: 0,
  needId: 'need',
  matchingMode: 'similarity',
  unassessedCriteria: [],
};

describe('MatchTableContent state priority', () => {
  it('shows an error before loading or stale data', () => {
    for (const data of [null, emptyData]) {
      const html = render(data, 'Подборка недоступна');
      expect(html).toContain('Подборка недоступна');
      expect(html).not.toContain('Загрузка подборки');
      expect(html).not.toContain('Пока нет подходящих кандидатов');
    }
  });
  it('distinguishes missing data from an empty loaded result', () => {
    expect(render(null)).toContain('Загрузка подборки');
    expect(render(emptyData)).toContain('Пока нет подходящих кандидатов');
  });
});
