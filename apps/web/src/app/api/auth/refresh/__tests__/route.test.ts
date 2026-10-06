import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/errors';
import {
  clearAuthTokens,
  getRefreshToken,
  refreshAuthTokens,
  setAuthTokens,
} from '@/shared/auth/server';

import { GET, POST } from '../route';

vi.mock('@/shared/auth/server', () => ({
  clearAuthTokens: vi.fn(),
  getRefreshToken: vi.fn(),
  refreshAuthTokens: vi.fn(),
  setAuthTokens: vi.fn(),
}));

describe('refresh route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRefreshToken).mockResolvedValue('refresh');
  });

  it('keeps cookies on temporary provider failure', async () => {
    vi.mocked(refreshAuthTokens).mockRejectedValue(
      new ApiError(503, 'Недоступен', 'auth_unavailable'),
    );
    expect((await POST()).status).toBe(503);
    expect(clearAuthTokens).not.toHaveBeenCalled();
    expect(setAuthTokens).not.toHaveBeenCalled();
  });

  it('clears cookies when the refresh token is invalid', async () => {
    vi.mocked(refreshAuthTokens).mockResolvedValue(null);
    expect((await POST()).status).toBe(401);
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
});
