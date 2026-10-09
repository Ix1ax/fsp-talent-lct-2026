import { beforeEach, expect, it, vi } from 'vitest';

import { AdminProvider } from '../index';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  warning: vi.fn(),
  setState: vi.fn(),
  removeItem: vi.fn(),
  stateIndex: 0,
}));
vi.mock('sonner', () => ({ toast: { warning: mocks.warning } }));
vi.mock('@/entities/admin', () => ({ adminLogout: mocks.logout }));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useEffect: vi.fn(),
  useCallback: (callback: unknown) => callback,
  useState: (initial: unknown) => [
    mocks.stateIndex++ === 0 ? { access_token: 'admin-token' } : initial,
    mocks.setState,
  ],
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.stateIndex = 0;
  vi.stubGlobal('sessionStorage', { removeItem: mocks.removeItem });
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
