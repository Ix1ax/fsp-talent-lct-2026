import { describe, expect, it } from 'vitest';

import { createFocusGuard } from '../createFocusGuard';

const createBrowser = () => {
  const browser = new EventTarget();
  const document = new EventTarget();
  const values = new Map<string, string>();
  const state = { visibilityState: 'visible', focused: true };
  Object.assign(document, {
    get visibilityState() {
      return state.visibilityState;
    },
    hasFocus: () => state.focused,
  });
  Object.defineProperty(document, 'visibilityState', {
    get: () => state.visibilityState,
  });
  Object.assign(browser, {
    document,
    sessionStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  return { browser: browser as unknown as Window, document, state };
};
describe('focus guard', () => {
  it('counts blur and hidden as one departure and counts another after returning', () => {
    const { browser, document, state } = createBrowser();
    const guard = createFocusGuard({ limit: 2 });
    const stop = guard.start(browser);
    browser.dispatchEvent(new Event('blur'));
    state.visibilityState = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(guard.getSnapshot()).toBe(1);
    state.visibilityState = 'visible';
    browser.dispatchEvent(new Event('focus'));
    browser.dispatchEvent(new Event('blur'));
    expect(guard.getSnapshot()).toBe(2);
    stop();
  });
  it('preserves the counter for the attempt and removes listeners on cleanup', () => {
    const { browser } = createBrowser();
    const first = createFocusGuard({ limit: 2, storageKey: 'attempt' });
    const stop = first.start(browser);
    browser.dispatchEvent(new Event('blur'));
    stop();
    browser.dispatchEvent(new Event('blur'));
    expect(first.getSnapshot()).toBe(1);
    const restored = createFocusGuard({ limit: 2, storageKey: 'attempt' });
    const cleanup = restored.start(browser);
    expect(restored.getSnapshot()).toBe(1);
    browser.dispatchEvent(new Event('blur'));
    expect(restored.getSnapshot()).toBe(2);
    cleanup();
  });
  it('reports storage errors and continues counting in memory', () => {
    const { browser } = createBrowser();
    Object.defineProperty(browser, 'sessionStorage', {
      get: () => {
        throw new Error('Storage blocked');
      },
    });
    const guard = createFocusGuard({ limit: 2, storageKey: 'attempt' });
    const stop = guard.start(browser);
    expect(guard.getStorageError()).toContain('Не удалось сохранить');
    browser.dispatchEvent(new Event('blur'));
    expect(guard.getSnapshot()).toBe(1);
    browser.dispatchEvent(new Event('focus'));
    browser.dispatchEvent(new Event('blur'));
    expect(guard.getSnapshot()).toBe(2);
    stop();
  });
});
