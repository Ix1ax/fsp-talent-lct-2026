import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearClientAccessToken, clearOidcUser } from '@/shared/auth';

import { logoutSession } from '../logoutSession';

const { signoutRedirect, getUser } = vi.hoisted(() => ({
  signoutRedirect: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock('@/shared/api/authConfig', () => ({
  getAuthConfig: vi.fn(async () => ({
    issuer: 'https://id.test',
    clientId: 'fsp-web',
  })),
}));
vi.mock('@/shared/auth', () => ({
  clearClientAccessToken: vi.fn(),
  clearOidcUser: vi.fn(),
  createOidcManager: vi.fn(() => ({ signoutRedirect, getUser })),
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
    getUser.mockResolvedValue({ id_token: 'id-token' });
    await logoutSession();
    expect(clearClientAccessToken).toHaveBeenCalledOnce();
    expect(clearOidcUser).toHaveBeenCalledOnce();
    expect(signoutRedirect).toHaveBeenCalledOnce();
    expect(signoutRedirect).toHaveBeenCalledWith({ id_token_hint: 'id-token' });
  });

  it('allows logout when the OIDC user is missing', async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    getUser.mockResolvedValue(null);
    await logoutSession();
    expect(signoutRedirect).toHaveBeenCalledWith({ id_token_hint: undefined });
  });

  it('keeps client state on a failed logout', async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 503 }));
    await expect(logoutSession()).rejects.toThrow(
      'Не удалось завершить сессию',
    );
    expect(clearClientAccessToken).not.toHaveBeenCalled();
    expect(clearOidcUser).not.toHaveBeenCalled();
    expect(signoutRedirect).not.toHaveBeenCalled();
  });
});
