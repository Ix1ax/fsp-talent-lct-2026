import { describe, expect, it, vi } from 'vitest';

import {
  createUnsavedChangesGuard,
  leavesCurrentPage,
  preservesDraft,
} from '../unsavedChangesGuard';

const createBrowser = () => {
  const listeners = new Map<string, Set<(event: Event) => void>>();
  const focus = { isConnected: true, focus: vi.fn() };
  const location = { href: 'https://app.test/candidate/profile' };
  const entries: { url: string; state: Record<string, unknown> }[] = [
    { url: location.href, state: {} },
  ];
  let index = 0;
  const emit = (type: string, event: Event) => {
    listeners.get(type)?.forEach((listener) => listener(event));
  };
  const addEventListener = vi.fn((type, listener) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(listener);
  });
  const removeEventListener = vi.fn((type, listener) =>
    listeners.get(type)?.delete(listener),
  );
  const history = {
    get state() {
      return entries[index].state;
    },
    pushState(state: Record<string, unknown>, _unused: string, url: string) {
      entries.splice(index + 1);
      index++;
      location.href = new URL(url, location.href).href;
      entries.push({ url: location.href, state });
    },
    replaceState(state: Record<string, unknown>, _unused: string, url: string) {
      location.href = new URL(url, location.href).href;
      entries[index] = { url: location.href, state };
    },
    go: vi.fn((delta: number) => {
      index += delta;
      location.href = entries[index].url;
      const event = new Event('popstate');
      Object.assign(event, { state: history.state });
      emit('popstate', event);
    }),
  };
  const browser = {
    location,
    history,
    confirm: vi.fn(() => false),
    addEventListener,
    removeEventListener,
    requestAnimationFrame: (callback: () => void) => {
      callback();
      return 1;
    },
    document: { activeElement: focus, addEventListener, removeEventListener },
  } as unknown as Window;
  const unload = () => {
    const event = new Event('beforeunload', { cancelable: true });
    emit('beforeunload', event);
    return event.defaultPrevented;
  };
  const click = (href: string) => {
    const event = new Event('click', { cancelable: true });
    Object.assign(event, { button: 0 });
    Object.defineProperty(event, 'target', {
      value: {
        closest: () => ({
          hasAttribute: () => false,
          getAttribute: (name: string) => (name === 'href' ? href : null),
        }),
      },
    });
    emit('click', event);
    return event;
  };
  return { browser, history, emit, focus, unload, click };
};

describe('unsaved changes navigation', () => {
  it('distinguishes page changes from hash links and retained profile steps', () => {
    expect(
      leavesCurrentPage('#field', 'https://app.test/candidate/profile'),
    ).toBe(false);
    expect(
      leavesCurrentPage('/guides', 'https://app.test/candidate/profile'),
    ).toBe(true);
    expect(
      preservesDraft(
        '/candidate/contacts',
        'https://app.test/candidate/profile',
        ['/candidate/profile', '/candidate/contacts'],
      ),
    ).toBe(true);
    expect(
      preservesDraft(
        '/candidate/assessments',
        'https://app.test/candidate/profile',
        ['/candidate/profile'],
      ),
    ).toBe(false);
    expect(
      preservesDraft(
        'https://other.test/candidate/profile',
        'https://app.test/candidate/profile',
        ['/candidate/profile'],
      ),
    ).toBe(false);
  });
  it('combines several forms, unregisters independently, and protects reload', () => {
    const { browser, unload } = createBrowser();
    const guard = createUnsavedChangesGuard(browser);
    const first = guard.register();
    const second = guard.register();
    expect(unload()).toBe(true);
    first();
    expect(unload()).toBe(true);
    second();
    expect(unload()).toBe(false);
    guard.dispose();
    expect(browser.removeEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    );
  });
  it('blocks links and programmed navigation, and restores focus on refusal', () => {
    const { browser, click, emit, focus } = createBrowser();
    const guard = createUnsavedChangesGuard(browser);
    guard.register();
    emit('pointerdown', new Event('pointerdown'));
    expect(click('/guides').defaultPrevented).toBe(true);
    expect(focus.focus).toHaveBeenCalledWith({ preventScroll: true });
    const action = vi.fn();
    expect(guard.navigate('/guides', action)).toBe(false);
    expect(action).not.toHaveBeenCalled();
    vi.mocked(browser.confirm).mockReturnValue(true);
    expect(guard.navigate('/guides', action)).toBe(true);
    expect(action).toHaveBeenCalledOnce();
  });
  it('asks once for a full-page link, but protects the next reload', () => {
    const { browser, click, unload } = createBrowser();
    const guard = createUnsavedChangesGuard(browser);
    guard.register();
    vi.mocked(browser.confirm).mockReturnValue(true);
    expect(click('https://other.test').defaultPrevented).toBe(false);
    expect(unload()).toBe(false);
    expect(browser.confirm).toHaveBeenCalledOnce();
    expect(unload()).toBe(true);
  });
  it('does not suppress an unrelated reload after an approved SPA commit', () => {
    const { browser, click, unload } = createBrowser();
    const guard = createUnsavedChangesGuard(browser);
    guard.register();
    vi.mocked(browser.confirm).mockReturnValue(true);
    click('/guides');
    browser.history.pushState({}, '', '/guides');
    expect(unload()).toBe(true);
  });
  it('does not confirm twice when a link delegates to a local button action', async () => {
    const { browser, click } = createBrowser();
    const guard = createUnsavedChangesGuard(browser);
    guard.register();
    vi.mocked(browser.confirm).mockReturnValue(true);
    const event = click('/employer');
    event.preventDefault();
    const action = vi.fn();
    guard.discard(true, action);
    expect(browser.confirm).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledOnce();
    await Promise.resolve();
    guard.discard(true, action);
    expect(browser.confirm).toHaveBeenCalledTimes(2);
  });
  it('permits one approved logout unload and cancels approval on failure', () => {
    const { browser, unload } = createBrowser();
    const guard = createUnsavedChangesGuard(browser);
    guard.register();
    const cancel = guard.approveUnload();
    cancel();
    expect(unload()).toBe(true);
    guard.approveUnload();
    expect(unload()).toBe(false);
    expect(unload()).toBe(true);
  });
  it('permits retained steps but still asks when another form would be lost', () => {
    const { browser } = createBrowser();
    const guard = createUnsavedChangesGuard(browser);
    guard.register({
      preserveWithin: ['/candidate/profile', '/candidate/contacts'],
    });
    const action = vi.fn();
    expect(guard.navigate('/candidate/contacts', action)).toBe(true);
    expect(browser.confirm).not.toHaveBeenCalled();
    guard.register();
    expect(guard.navigate('/candidate/contacts', action)).toBe(false);
    expect(browser.confirm).toHaveBeenCalledOnce();
  });
  it('restores the exact history entry when Back or Forward is refused', () => {
    const { browser, history } = createBrowser();
    const guard = createUnsavedChangesGuard(browser);
    browser.history.pushState({}, '', '/guides');
    browser.history.pushState({}, '', '/employer');
    const unregister = guard.register();
    history.go(-1);
    expect(browser.location.href).toBe('https://app.test/employer');
    expect(history.go).toHaveBeenLastCalledWith(1);
    unregister();
    history.go(-1);
    guard.register();
    history.go(1);
    expect(browser.location.href).toBe('https://app.test/guides');
    expect(history.go).toHaveBeenLastCalledWith(-1);
    vi.mocked(browser.confirm).mockReturnValue(true);
    history.go(1);
    expect(browser.location.href).toBe('https://app.test/employer');
  });
  it('keeps indices consecutive when Next retains a disposed wrapper across remount', () => {
    const { browser, history } = createBrowser();
    const first = createUnsavedChangesGuard(browser);
    const wrappedPush = browser.history.pushState;
    const wrappedReplace = browser.history.replaceState;
    // Model Next's parent effect capturing our methods before Strict cleanup.
    browser.history.pushState = (...args) => wrappedPush(...args);
    browser.history.replaceState = (...args) => wrappedReplace(...args);
    first.dispose();
    const second = createUnsavedChangesGuard(browser);
    browser.history.pushState({}, '', '/guides');
    browser.history.pushState({}, '', '/employer');
    history.go(-1);
    browser.history.pushState({}, '', '/admin');
    second.register();
    history.go(-1);
    expect(browser.location.href).toBe('https://app.test/admin');
    expect(history.go).toHaveBeenLastCalledWith(1);
    second.dispose();
  });
  it('avoids a second confirmation when a local cancel invokes a guarded route', () => {
    const { browser } = createBrowser();
    const guard = createUnsavedChangesGuard(browser);
    guard.register();
    vi.mocked(browser.confirm).mockReturnValue(true);
    const action = vi.fn();
    guard.discard(true, () => guard.navigate('/guides', action));
    expect(browser.confirm).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledOnce();
  });
});
