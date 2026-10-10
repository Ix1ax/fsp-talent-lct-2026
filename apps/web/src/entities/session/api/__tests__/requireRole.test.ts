import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAuthTokens } from '@/shared/auth/server';

import { AuthUnavailableError } from '../../model';
import { loadSession } from '../loadSession';
import { requireRole, requireSessionUser } from '../requireRole';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/auth/server', () => ({
  clearAuthTokens: vi.fn(),
  requireAccessToken: vi.fn(),
}));
vi.mock('../loadSession', () => ({
  loadSession: vi.fn(),
}));

const redirectMock = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    redirectMock(path);
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

describe('requireSessionUser & requireRole', () => {
  it('redirects forbidden sessions without mutating cookies during server rendering', async () => {
    vi.mocked(clearAuthTokens).mockRejectedValueOnce(
      new Error(
        'Cookies can only be modified in a Server Action or Route Handler',
      ),
    );
    vi.mocked(loadSession).mockResolvedValue({
      kind: 'invalid',
      reason: 'forbidden',
      message: 'Forbidden',
    });
    await expect(requireSessionUser('/candidate/profile')).rejects.toThrow(
      'NEXT_REDIRECT:/login?next=%2Fcandidate%2Fprofile',
    );
    expect(clearAuthTokens).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the user when session is active and role matches', async () => {
    vi.mocked(loadSession).mockResolvedValue({
      kind: 'user',
      user: {
        id: '1',
        sub: 'sub-1',
        email: 'user@test',
        emailVerified: true,
        status: 'active',
        role: 'candidate',
      },
    });

    const user = await requireRole('candidate', '/candidate/profile');
    expect(user.id).toBe('1');
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('redirects user to their own role home route when role does not match', async () => {
    vi.mocked(loadSession).mockResolvedValue({
      kind: 'user',
      user: {
        id: '2',
        sub: 'sub-2',
        email: 'emp@test',
        emailVerified: true,
        status: 'active',
        role: 'employer',
      },
    });

    await expect(
      requireRole('candidate', '/candidate/profile'),
    ).rejects.toThrow('NEXT_REDIRECT:/employer');
    expect(redirectMock).toHaveBeenCalledWith('/employer');
  });

  it('throws AuthUnavailableError on temporary service failure without redirecting to login', async () => {
    vi.mocked(loadSession).mockResolvedValue({
      kind: 'unavailable',
      status: 503,
      code: 'service_unavailable',
      message: 'Сервис временно недоступен',
    });

    await expect(requireSessionUser('/candidate')).rejects.toThrow(
      AuthUnavailableError,
    );
    expect(redirectMock).not.toHaveBeenCalled();
    expect(clearAuthTokens).not.toHaveBeenCalled();
  });

  it('redirects to /login preserving nextPath when user is a guest', async () => {
    vi.mocked(loadSession).mockResolvedValue({ kind: 'guest' });

    await expect(requireSessionUser('/candidate/assessments')).rejects.toThrow(
      'NEXT_REDIRECT:/login?next=%2Fcandidate%2Fassessments',
    );
    expect(redirectMock).toHaveBeenCalledWith(
      '/login?next=%2Fcandidate%2Fassessments',
    );
  });

  it('redirects to refresh when session is invalid unauthorized with a refresh token', async () => {
    vi.mocked(loadSession).mockResolvedValue({
      kind: 'invalid',
      reason: 'unauthorized',
      message: 'Token expired',
      hasRefreshToken: true,
    });

    await expect(requireSessionUser('/candidate/profile')).rejects.toThrow(
      'NEXT_REDIRECT:/api/auth/refresh?next=%2Fcandidate%2Fprofile',
    );
    expect(redirectMock).toHaveBeenCalledWith(
      '/api/auth/refresh?next=%2Fcandidate%2Fprofile',
    );
    expect(clearAuthTokens).not.toHaveBeenCalled();
  });

  it('refreshes unauthorized sessions when the scoped cookie is invisible to the page', async () => {
    vi.mocked(loadSession).mockResolvedValue({
      kind: 'invalid',
      reason: 'unauthorized',
      message: 'Unauthorized',
      hasRefreshToken: false,
    });

    await expect(requireSessionUser('/candidate/profile')).rejects.toThrow(
      'NEXT_REDIRECT:/api/auth/refresh?next=%2Fcandidate%2Fprofile',
    );
    expect(clearAuthTokens).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith(
      '/api/auth/refresh?next=%2Fcandidate%2Fprofile',
    );
  });
});
