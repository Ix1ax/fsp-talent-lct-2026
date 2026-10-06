import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { refreshAuthTokens } from '../refresh';

vi.mock('server-only', () => ({}));

const fetchMock = vi.fn();

describe('refreshAuthTokens', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('OIDC_TOKEN_URL', 'https://id.test/token');
    vi.stubEnv('OIDC_CLIENT_ID', 'fsp-web');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('refreshes tokens with an explicit timeout', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 300,
      }),
    );
    expect(await refreshAuthTokens('old')).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 300,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://id.test/token',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns null only for a rejected refresh token', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: 'invalid_grant' }, { status: 400 }),
    );
    expect(await refreshAuthTokens('expired')).toBeNull();
  });

  it.each([401, 429, 500, 503])(
    'treats HTTP %i as temporary/configuration failure',
    async (status) => {
      fetchMock.mockResolvedValue(
        Response.json({ error: 'invalid_client' }, { status }),
      );
      await expect(refreshAuthTokens('valid')).rejects.toMatchObject({
        status: 503,
        code: 'auth_unavailable',
      });
    },
  );

  it('handles network failures without reporting an expired session', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await expect(refreshAuthTokens('valid')).rejects.toMatchObject({
      status: 503,
    });
  });

  it('rejects malformed provider responses', async () => {
    fetchMock.mockResolvedValue(Response.json({ access_token: 42 }));
    await expect(refreshAuthTokens('valid')).rejects.toMatchObject({
      status: 503,
    });
  });

  it('reports missing configuration without invalidating tokens', async () => {
    vi.stubEnv('OIDC_TOKEN_URL', '');
    await expect(refreshAuthTokens('valid')).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
