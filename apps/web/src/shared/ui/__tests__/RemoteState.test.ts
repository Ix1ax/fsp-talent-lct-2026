import { type ComponentProps, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { RemoteState } from '../RemoteState';

type Props = ComponentProps<typeof RemoteState>;
const render = (props: Partial<Props> = {}) => {
  const { children, ...state } = props;
  const content =
    'children' in props ? children : createElement('p', null, 'Содержимое');
  return renderToStaticMarkup(
    createElement(RemoteState, { loading: false, ...state }, content),
  );
};

describe('RemoteState', () => {
  it('prioritizes initial loading over stale errors, empty results and content', () => {
    const html = render({
      loading: true,
      error: 'Старая ошибка',
      empty: true,
      loadingLabel: 'Загружаем вакансии',
    });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем вакансии"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('Старая ошибка');
    expect(html).not.toContain('Содержимое');
    expect(html).not.toContain('Данных пока нет');
  });
  it('shows a failure instead of an empty result and keeps retry a non-submit button', () => {
    const html = render({
      error: 'Нет соединения',
      empty: true,
      retry: vi.fn(),
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain('Нет соединения');
    expect(html).toContain('type="button"');
    expect(html).toContain('Повторить');
    expect(html).not.toContain('Данных пока нет');
    expect(html).not.toContain('Содержимое');
  });
  it('does not offer retry without an available handler', () => {
    expect(render({ error: 'Ошибка' })).not.toContain('<button');
  });
  it('disables retry while another operation is pending', () => {
    expect(
      render({ error: 'Ошибка', retry: vi.fn(), retryDisabled: true }),
    ).toContain('disabled=""');
  });
  it('announces an empty loaded result without showing content', () => {
    const html = render({
      empty: true,
      emptyTitle: 'Ничего не найдено',
      emptyDescription: 'Измените фильтры',
    });
    expect(html).toContain('role="status"');
    expect(html).toContain('Ничего не найдено');
    expect(html).toContain('Измените фильтры');
    expect(html).not.toContain('Содержимое');
  });
  it('supports existing custom skeletons and empty-state actions', () => {
    expect(
      render({
        loading: true,
        loadingContent: createElement('div', null, 'Скелетон вакансий'),
      }),
    ).toContain('Скелетон вакансий');
    expect(
      render({
        empty: true,
        emptyContent: createElement(
          'button',
          { type: 'button' },
          'Создать вакансию',
        ),
      }),
    ).toContain('Создать вакансию');
  });
  it('renders content only when the request has completed successfully', () => {
    expect(render()).toContain('Содержимое');
    expect(render({ children: undefined })).toBe('');
  });
});
