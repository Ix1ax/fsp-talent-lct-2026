import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthBootstrap } from '../AuthBootstrap';

const mocks = vi.hoisted(() => ({
  clear: vi.fn(),
  ensure: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  error: vi.fn(),
  push: vi.fn(),
  pathname: '/',
  revision: 0,
  ref: { current: null as unknown },
  effects: [] as Array<() => void | (() => void)>,
}));
vi.mock('react', () => ({
  useRef: () => mocks.ref,
  useEffect: (effect: () => void | (() => void)) => mocks.effects.push(effect),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock('sonner', () => ({ toast: { error: mocks.error } }));
vi.mock('@/shared/api', () => ({ ensureClientAccessToken: mocks.ensure }));
vi.mock('@/shared/auth', () => ({
  clearOidcUser: mocks.clear,
  getClientSessionRevision: () => mocks.revision,
  onSessionExpired: mocks.subscribe,
}));
const mount = () => {
  mocks.effects = [];
  AuthBootstrap({ children: null });
  const cleanups = mocks.effects.map((effect) => effect());
  return () => cleanups.forEach((cleanup) => cleanup?.());
};
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = '/';
  mocks.revision = 0;
  mocks.ref.current = null;
  mocks.clear.mockResolvedValue(undefined);
  mocks.ensure.mockResolvedValue(null);
  mocks.subscribe.mockReturnValue(mocks.unsubscribe);
  vi.stubGlobal('window', new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());
describe('AuthBootstrap lifecycle', () => {
  it.each(['cleanup', 'offline', '503'])(
    'handles %s rejection and retries only on reconnect',
    async (failure) => {
      const error = new Error(failure);
      if (failure === 'cleanup') mocks.clear.mockRejectedValueOnce(error);
      else mocks.ensure.mockRejectedValueOnce(error);
      const cleanup = mount();
      await settle();
      expect(mocks.error).toHaveBeenCalledOnce();
      cleanup();
      mocks.pathname = '/guides';
      const cleanupNext = mount();
      await settle();
      expect(mocks.clear).toHaveBeenCalledOnce();
      window.dispatchEvent(new Event('online'));
      await settle();
      expect(mocks.clear).toHaveBeenCalledTimes(2);
      cleanupNext();
    },
  );
  it('reuses the pending attempt in Strict Mode and across guest navigation', async () => {
    const cleanup = mount();
    cleanup();
    const strictCleanup = mount();
    await settle();
    strictCleanup();
    mocks.pathname = '/guides';
    const nextCleanup = mount();
    await settle();
    expect(mocks.clear).toHaveBeenCalledOnce();
    expect(mocks.ensure).toHaveBeenCalledOnce();
    expect(mocks.error).not.toHaveBeenCalled();
    nextCleanup();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(3);
  });
  it('reports a temporary failure after the Strict Mode effect restarts', async () => {
    mocks.ensure.mockRejectedValueOnce(new Error('offline'));
    mount()();
    const cleanup = mount();
    await settle();
    expect(mocks.error).toHaveBeenCalledOnce();
    cleanup();
    window.dispatchEvent(new Event('online'));
    await settle();
    expect(mocks.ensure).toHaveBeenCalledOnce();
  });
  it('redirects on session expiration and removes the subscription', () => {
    const cleanup = mount();
    mocks.subscribe.mock.calls[0][0]();
    expect(mocks.push).toHaveBeenCalledWith('/login');
    cleanup();
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });
  it('restores an authenticated session on mount', async () => {
    mocks.ensure.mockResolvedValue('token');
    const cleanup = mount();
    await settle();
    expect(mocks.ensure).toHaveBeenCalledOnce();
    expect(mocks.push).not.toHaveBeenCalled();
    cleanup();
  });
  it.each(['/admin', '/admin/accounts', '/demo/employer', '/auth/callback'])(
    'skips bootstrap on %s',
    async (path) => {
      mocks.pathname = path;
      const cleanup = mount();
      await settle();
      expect(mocks.clear).not.toHaveBeenCalled();
      expect(mocks.ensure).not.toHaveBeenCalled();
      expect(mocks.subscribe).toHaveBeenCalledTimes(
        path === '/auth/callback' ? 1 : 0,
      );
      cleanup();
    },
  );
  it('does not restore after auth changes while OIDC cleanup is pending', async () => {
    let finish: () => void = () => {};
    mocks.clear.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const cleanup = mount();
    mocks.revision++;
    finish();
    await settle();
    expect(mocks.ensure).not.toHaveBeenCalled();
    cleanup();
  });
});
