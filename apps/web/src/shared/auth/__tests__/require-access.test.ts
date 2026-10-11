import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAccessToken } from '../require-access';
import { getAccessToken, getRefreshToken } from '../session.server';

vi.mock('server-only', () => ({}));
vi.mock('../session.server', () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
}));

const redirectMock = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    redirectMock(path);
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

describe('requireAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns accessToken when it is present', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('existing-token');

    const token = await requireAccessToken('/candidate');
    expect(token).toBe('existing-token');
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('redirects to refresh when accessToken is missing but refreshToken is present', async () => {
    vi.mocked(getAccessToken).mockResolvedValue(undefined);
    vi.mocked(getRefreshToken).mockResolvedValue('valid-refresh');

    await expect(requireAccessToken('/candidate/profile')).rejects.toThrow(
      'NEXT_REDIRECT:/api/auth/refresh?next=%2Fcandidate%2Fprofile',
    );
    expect(redirectMock).toHaveBeenCalledWith(
      '/api/auth/refresh?next=%2Fcandidate%2Fprofile',
    );
  });

  it('uses the auth route when the scoped refresh cookie is invisible to the page', async () => {
    vi.mocked(getAccessToken).mockResolvedValue(undefined);
    vi.mocked(getRefreshToken).mockResolvedValue(undefined);

    await expect(requireAccessToken('/candidate/profile')).rejects.toThrow(
      'NEXT_REDIRECT:/api/auth/refresh?next=%2Fcandidate%2Fprofile',
    );
    expect(redirectMock).toHaveBeenCalledWith(
      '/api/auth/refresh?next=%2Fcandidate%2Fprofile',
    );
  });
});
