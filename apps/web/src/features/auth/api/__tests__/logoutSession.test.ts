import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearClientAccessToken, clearOidcUser } from '@/shared/auth';

import { logoutSession } from '../logoutSession';

vi.mock('@/shared/auth', () => ({
  clearClientAccessToken: vi.fn(),
  clearOidcUser: vi.fn(),
}));
const fetchMock = vi.fn();

describe('logoutSession', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('clears client and OIDC tokens after the server confirms logout', async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    await logoutSession();
    expect(clearClientAccessToken).toHaveBeenCalledOnce();
    expect(clearOidcUser).toHaveBeenCalledOnce();
  });

  it('keeps client state on a failed logout', async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 503 }));
    await expect(logoutSession()).rejects.toThrow(
      'Не удалось завершить сессию',
    );
    expect(clearClientAccessToken).not.toHaveBeenCalled();
    expect(clearOidcUser).not.toHaveBeenCalled();
  });
});
