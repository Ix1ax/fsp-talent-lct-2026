import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  AnimatedCounter,
  Collapse,
  FadeIn,
  LoadingText,
  PageTransition,
} from '../index';

describe('accessible motion fallbacks', () => {
  it('keeps server-rendered content visible before the motion preference is known', () => {
    const html = renderToStaticMarkup(createElement(FadeIn, {}, 'Content'));
    expect(html).toContain('Content');
    expect(html).not.toContain('opacity:0');
    expect(html).not.toContain('translateY');
  });

  it('keeps a closed form mounted and removes it from keyboard and screen-reader access', () => {
    const html = renderToStaticMarkup(
      createElement(
        Collapse,
        { open: false },
        createElement('input', { defaultValue: 'Draft' }),
      ),
    );
    expect(html).toContain('value="Draft"');
    expect(html).toContain('inert=""');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('height:0');
  });

  it('exposes the complete loading phrase as one status rather than individual letters', () => {
    const html = renderToStaticMarkup(
      createElement(LoadingText, { text: 'Завершение входа…' }),
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('<span class="sr-only">Завершение входа…</span>');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('opacity:0.3');
  });

  it('gives screen readers the final counter value separately from animated digits', () => {
    const html = renderToStaticMarkup(
      createElement(AnimatedCounter, { value: 42 }),
    );
    expect(html).toContain('<span class="sr-only">42</span>');
    expect(html).toContain('aria-hidden="true"');
  });

  it('renders page transition content before client effects run', () => {
    const html = renderToStaticMarkup(
      createElement(
        PageTransition,
        { transitionKey: 'profile' },
        createElement('input', { defaultValue: 'Draft' }),
      ),
    );
    expect(html).toContain('value="Draft"');
    expect(html).not.toContain('opacity:0');
  });
});
