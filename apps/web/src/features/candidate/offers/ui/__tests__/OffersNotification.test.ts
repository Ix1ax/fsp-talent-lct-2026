import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { useNewOffersCount } from '../../model';
import { OffersNotification } from '../OffersNotification';

vi.mock('../../model', () => ({
  useNewOffersCount: vi.fn(),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/candidate/offers' }));

const render = (count: number | null) => {
  vi.mocked(useNewOffersCount).mockReturnValue(count);
  return renderToStaticMarkup(createElement(OffersNotification));
};

describe('offers notification', () => {
  it('exposes the exact unread count and current destination to assistive technology', () => {
    const html = render(7);
    expect(html).toContain('href="/candidate/offers"');
    expect(html).toContain('aria-label="Входящие предложения: новых — 7"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('>7</span>');
  });

  it('caps the visual badge while preserving the actual accessible count', () => {
    const html = render(120);
    expect(html).toContain('>99+</span>');
    expect(html).toContain('новых — 120');
  });

  it.each([0, null])(
    'keeps the inbox reachable without claiming new offers for %s',
    (count) => {
      const html = render(count);
      expect(html).toContain('href="/candidate/offers"');
      expect(html).toContain('aria-label="Входящие предложения"');
      expect(html).not.toContain('новых —');
      expect(html).not.toContain('tabular-nums');
    },
  );
});
