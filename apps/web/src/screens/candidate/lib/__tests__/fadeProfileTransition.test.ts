import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fadeProfileTransition } from '../fadeProfileTransition';

const { animate, stop } = vi.hoisted(() => ({
  animate: vi.fn(),
  stop: vi.fn(),
}));
vi.mock('framer-motion', () => ({ animate }));

describe('profile section fade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    animate.mockReturnValue({ stop });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('switches only after fading out, without scrolling the current page', () => {
    const element = { style: { opacity: '' } } as HTMLElement;
    const changeSection = vi.fn();
    fadeProfileTransition(element, false, changeSection);
    expect(changeSection).not.toHaveBeenCalled();
    expect(animate).toHaveBeenCalledWith(
      element,
      { opacity: 0 },
      expect.objectContaining({ duration: 0.1 }),
    );
    animate.mock.calls[0][2].onComplete();
    expect(changeSection).toHaveBeenCalledOnce();
  });

  it('restores visibility when a transition is interrupted', () => {
    const element = { style: { opacity: '0.3' } } as HTMLElement;
    fadeProfileTransition(element, false)();
    expect(stop).toHaveBeenCalledOnce();
    expect(element.style.opacity).toBe('');
  });

  it('restores normal styling after the new section appears', () => {
    const element = { style: { opacity: '0' } } as HTMLElement;
    fadeProfileTransition(element, true);
    expect(animate).toHaveBeenCalledWith(
      element,
      { opacity: 1 },
      expect.objectContaining({ duration: 0.16 }),
    );
    animate.mock.calls[0][2].onComplete();
    expect(element.style.opacity).toBe('');
  });

  it('switches immediately and restores visibility with reduced motion', () => {
    window.matchMedia = () => ({ matches: true }) as MediaQueryList;
    const element = { style: { opacity: '0' } } as HTMLElement;
    const changeSection = vi.fn();
    fadeProfileTransition(element, false, changeSection);
    expect(animate).not.toHaveBeenCalled();
    expect(changeSection).toHaveBeenCalledOnce();
    expect(element.style.opacity).toBe('');
  });
});
