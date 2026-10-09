import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/errors';
import {
  clearAuthTokens,
  getRefreshToken,
  refreshAuthTokens,
  setAuthTokens,
} from '@/shared/auth/server';

import { GET, POST } from '../route';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/auth/server', () => ({
  clearAuthTokens: vi.fn(),
  getRefreshToken: vi.fn(),
  refreshAuthTokens: vi.fn(),
  setAuthTokens: vi.fn(),
}));

const request = () =>
  new Request('https://app.test/api/auth/refresh', {
    method: 'POST',
    headers: { Origin: 'https://app.test' },
  });

describe('refresh route', () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('APP_ORIGIN', 'https://app.test');
    vi.mocked(getRefreshToken).mockResolvedValue('refresh');
  });

  it('keeps cookies on temporary provider failure', async () => {
    vi.mocked(refreshAuthTokens).mockRejectedValue(
      new ApiError(503, 'Недоступен', 'auth_unavailable'),
    );
    expect((await POST(request())).status).toBe(503);
    expect(clearAuthTokens).not.toHaveBeenCalled();
    expect(setAuthTokens).not.toHaveBeenCalled();
  });

  it('clears cookies when the refresh token is invalid', async () => {
    vi.mocked(refreshAuthTokens).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(clearAuthTokens).toHaveBeenCalledOnce();
  });

  it('does not redirect to an external origin after refresh', async () => {
    vi.mocked(refreshAuthTokens).mockResolvedValue({
      accessToken: 'new',
      expiresIn: 300,
    });
    const response = await GET(
      new NextRequest(
        'https://app.test/api/auth/refresh?next=%2F%0A%2Fevil.test',
      ),
    );
    expect(response.headers.get('location')).toBe('https://app.test/');
    expect(setAuthTokens).toHaveBeenCalledWith({
      accessToken: 'new',
      refreshToken: 'refresh',
      expiresIn: 300,
    });
  });

  it('rejects a cross-origin POST before reading or rotating tokens', async () => {
    const response = await POST(
      new Request('https://app.test/api/auth/refresh', {
        method: 'POST',
        headers: { Origin: 'https://evil.test' },
      }),
    );
    expect(response.status).toBe(403);
    expect(getRefreshToken).not.toHaveBeenCalled();
    expect(setAuthTokens).not.toHaveBeenCalled();
    expect(clearAuthTokens).not.toHaveBeenCalled();
  });

  it('uses the public origin for proxy redirects and rotates the refresh token', async () => {
    vi.mocked(refreshAuthTokens).mockResolvedValue({
      accessToken: 'new',
      refreshToken: 'rotated',
    });
    const response = await GET(
      new NextRequest(
        'http://web:3000/api/auth/refresh?next=/candidate/profile',
      ),
    );
    expect(response.headers.get('location')).toBe(
      'https://app.test/candidate/profile',
    );
    expect(setAuthTokens).toHaveBeenCalledWith({
      accessToken: 'new',
      refreshToken: 'rotated',
      expiresIn: undefined,
    });
  });

  it('preserves a safe return path', async () => {
    vi.mocked(refreshAuthTokens).mockResolvedValue({ accessToken: 'new' });
    const response = await GET(
      new NextRequest('https://app.test/api/auth/refresh?next=%2Fcandidate'),
    );
    expect(response.headers.get('location')).toBe('https://app.test/candidate');
  });

  it('returns a recoverable error on server-side refresh failure', async () => {
    vi.mocked(refreshAuthTokens).mockRejectedValue(new TypeError('network'));
    const response = await GET(
      new NextRequest('https://app.test/api/auth/refresh?next=/candidate'),
    );
    expect(response.status).toBe(503);
    expect(clearAuthTokens).not.toHaveBeenCalled();
  });

  it('redirects to /login preserving next when refresh token is invalid', async () => {
    vi.mocked(refreshAuthTokens).mockResolvedValue(null);
    const response = await GET(
      new NextRequest(
        'https://app.test/api/auth/refresh?next=/candidate/profile',
      ),
    );
    expect(response.headers.get('location')).toBe(
      'https://app.test/login?next=%2Fcandidate%2Fprofile',
    );
    expect(clearAuthTokens).toHaveBeenCalledOnce();
  });
});
