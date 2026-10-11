import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CandidateProfileGate } from '../CandidateProfileGate';

const { query } = vi.hoisted(() => ({
  query: {
    loading: false,
    error: '',
    data: { profile: null as null | { id: string } },
    retry: vi.fn(),
  },
}));
vi.mock('@/shared/hooks', () => ({ useRemoteData: () => query }));

const render = () =>
  renderToStaticMarkup(
    createElement(
      CandidateProfileGate,
      null,
      createElement('p', null, 'Protected content'),
    ),
  );

describe('candidate profile gate', () => {
  beforeEach(() => {
    query.loading = false;
    query.error = '';
    query.data = { profile: null };
  });

  it('shows an empty state and profile link without mounting protected content', () => {
    const html = render();
    expect(html).toContain('Создайте профиль кандидата');
    expect(html).toContain('Заполнить профиль');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('Protected content');
  });

  it('mounts content for an existing profile', () => {
    query.data = { profile: { id: 'profile' } };
    expect(render()).toContain('Protected content');
  });

  it('preserves real loading failures', () => {
    query.error = 'Сервис временно недоступен';
    const html = render();
    expect(html).toContain('Сервис временно недоступен');
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('Создайте профиль кандидата');
  });

  it('does not show an empty state before profile loading completes', () => {
    query.loading = true;
    expect(render()).not.toContain('Создайте профиль кандидата');
    expect(render()).not.toContain('Protected content');
  });
});
