import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/errors';

import { completeOidcCallback } from '../completeOidcCallback';

const mocks = vi.hoisted(() => ({
  signinCallback: vi.fn(),
  getMeClient: vi.fn(),
  clearOidcUser: vi.fn(),
  setClientAccessToken: vi.fn(),
}));
vi.mock('@/shared/api/authConfig', () => ({
  getAuthConfig: vi.fn(async () => ({
    issuer: 'https://id.test',
    clientId: 'fsp-web',
  })),
}));
vi.mock('@/shared/auth', () => ({
  createOidcManager: () => ({ signinCallback: mocks.signinCallback }),
  clearOidcUser: mocks.clearOidcUser,
  setClientAccessToken: mocks.setClientAccessToken,
}));
vi.mock('@/entities/session', () => ({ getMeClient: mocks.getMeClient }));

let attempt = 0;
const fetchMock = vi.fn();

describe('completeOidcCallback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.signinCallback.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 300,
    });
    mocks.getMeClient.mockResolvedValue({
      id: 'id',
      sub: 'sub',
      email: 'user@test',
      emailVerified: true,
      status: 'active',
      role: 'candidate',
    });
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('processes the same callback once when invoked twice', async () => {
    const url = `https://app.test/auth/callback?state=${++attempt}`;
    const first = completeOidcCallback(url);
    const second = completeOidcCallback(url);
    expect(first).toBe(second);
    expect(await first).toMatchObject({ status: 'authenticated' });
    expect(mocks.signinCallback).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.clearOidcUser).toHaveBeenCalledOnce();
  });

  it('preserves target next route from user state', async () => {
    mocks.signinCallback.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 300,
      state: { next: '/candidate/profile' },
    });
    const url = `https://app.test/auth/callback?state=${++attempt}`;
    const res = await completeOidcCallback(url);
    expect(res).toMatchObject({
      status: 'authenticated',
      next: '/candidate/profile',
    });
  });

  it('shows role selection for an unregistered user', async () => {
    mocks.getMeClient.mockRejectedValue(
      new ApiError(404, 'not registered', 'not_registered'),
    );
    expect(
      await completeOidcCallback(
        `https://app.test/auth/callback?state=${++attempt}`,
      ),
    ).toEqual({ status: 'role_chooser' });
  });

  it('does not authenticate if session persistence fails', async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 500 }));
    expect(
      await completeOidcCallback(
        `https://app.test/auth/callback?state=${++attempt}`,
      ),
    ).toMatchObject({ status: 'error' });
    expect(mocks.setClientAccessToken).not.toHaveBeenCalled();
    expect(mocks.getMeClient).not.toHaveBeenCalled();
  });
});
