import { beforeEach, expect, it, vi } from 'vitest';

import { AdminProvider } from '../index';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  me: vi.fn(),
  cacheSession: vi.fn(),
  effects: [] as (() => void | (() => void))[],
  warning: vi.fn(),
  setState: vi.fn(),
  removeItem: vi.fn(),
  stateIndex: 0,
}));
vi.mock('sonner', () => ({ toast: { warning: mocks.warning } }));
vi.mock('@/entities/admin', async (original) => ({
  ...(await original<typeof import('@/entities/admin')>()),
  adminLogout: mocks.logout,
  adminMe: mocks.me,
  setAdminCatalogSession: mocks.cacheSession,
  loginSchema: {
    safeParse: () => ({
      success: true,
      data: {
        access_token: 'old-token',
        expires_at: new Date(Date.now() + 60000).toISOString(),
      },
    }),
  },
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useEffect: (effect: () => void | (() => void)) => {
    mocks.effects.push(effect);
  },
  useRef: () => ({ current: 0 }),
  useCallback: (callback: unknown) => callback,
  useState: (initial: unknown) => [
    mocks.stateIndex++ === 0 ? { access_token: 'admin-token' } : initial,
    mocks.setState,
  ],
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.stateIndex = 0;
  mocks.effects = [];
  vi.stubGlobal('sessionStorage', {
    removeItem: mocks.removeItem,
    getItem: () => '{}',
  });
});
it('clears the local session before server logout settles and handles failure', async () => {
  let fail: (error: Error) => void = () => {};
  mocks.logout.mockImplementation(
    () =>
      new Promise((_, reject) => {
        fail = reject;
      }),
  );
  const provider = AdminProvider({ children: null });
  const pending = provider.props.value.logout();
  expect(mocks.removeItem).toHaveBeenCalledWith('fsp.admin.session');
  expect(mocks.setState).toHaveBeenCalledWith(null);
  expect(mocks.logout).toHaveBeenCalledWith('admin-token');
  fail(new Error('API unavailable'));
  await expect(pending).resolves.toBeUndefined();
  expect(mocks.warning).toHaveBeenCalledWith(
    'Вы вышли на этом устройстве. Сервер не подтвердил завершение сессии.',
  );
  vi.unstubAllGlobals();
});

it('does not restore the old cache session when adminMe finishes after logout', async () => {
  let complete!: (admin: unknown) => void;
  mocks.me.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  mocks.logout.mockResolvedValue(undefined);
  const provider = AdminProvider({ children: null });
  const cleanup = mocks.effects[1]();
  await provider.props.value.logout();
  complete({ id: 'old-admin' });
  await Promise.resolve();
  await Promise.resolve();
  expect(mocks.cacheSession).toHaveBeenCalledWith(null);
  expect(mocks.cacheSession).not.toHaveBeenCalledWith('old-token');
  expect(
    mocks.setState.mock.calls.some(
      ([value]) => value?.access_token === 'old-token',
    ),
  ).toBe(false);
  if (cleanup) cleanup();
  vi.unstubAllGlobals();
});
