import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CandidateNeedHint } from '../CandidateNeedHint';

const render = (needsError = '', needsLoading = false) =>
  renderToStaticMarkup(
    createElement(CandidateNeedHint, {
      needs: [],
      needsError,
      needsLoading,
      busy: false,
      onNeeds: vi.fn(),
      onRetryNeeds: vi.fn(),
    }),
  );

describe('CandidateNeedHint state priority', () => {
  it('shows the error instead of an empty state, including during loading', () => {
    for (const loading of [true, false]) {
      const html = render('Нет соединения', loading);
      expect(html).toContain('Нет соединения');
      expect(html).toContain('Повторить загрузку');
      expect(html).not.toContain('Потребности компании');
    }
  });
  it('waits until loading ends before offering to create a need', () => {
    expect(render('', true)).not.toContain('Потребности компании');
    expect(render('', false)).toContain('Потребности компании');
  });
});
