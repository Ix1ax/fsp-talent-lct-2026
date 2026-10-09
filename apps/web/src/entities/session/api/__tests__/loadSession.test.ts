import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/errors';
import { getTokenDisplayName } from '@/shared/auth/server';
import { getAccessToken, getRefreshToken } from '@/shared/auth/session.server';

import { getMe } from '../getMe';
import { loadSession } from '../loadSession';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/auth/session.server', () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
}));
vi.mock('@/shared/auth/server', () => ({
  getTokenDisplayName: vi.fn(),
}));
vi.mock('../getMe', () => ({
  getMe: vi.fn(),
}));

describe('loadSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns guest state when both tokens are missing', async () => {
    vi.mocked(getAccessToken).mockResolvedValue(undefined);
    vi.mocked(getRefreshToken).mockResolvedValue(undefined);

    const session = await loadSession();
    expect(session).toEqual({ kind: 'guest' });
    expect(getMe).not.toHaveBeenCalled();
  });

  it('returns invalid expired state when only access token is missing but refresh token exists', async () => {
    vi.mocked(getAccessToken).mockResolvedValue(undefined);
    vi.mocked(getRefreshToken).mockResolvedValue('valid-refresh');

    const session = await loadSession();
    expect(session).toEqual({
      kind: 'invalid',
      reason: 'token_expired',
      message: 'Сессия истекла',
      hasRefreshToken: true,
    });
    expect(getMe).not.toHaveBeenCalled();
  });

  it('returns user state when getMe succeeds', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('valid-access');
    vi.mocked(getRefreshToken).mockResolvedValue('valid-refresh');
    vi.mocked(getTokenDisplayName).mockReturnValue('Иван Иванов');
    vi.mocked(getMe).mockResolvedValue({
      id: 'usr-1',
      sub: 'sub-1',
      email: 'user@example.test',
      emailVerified: true,
      status: 'active',
      role: 'candidate',
    });

    const session = await loadSession();
    expect(session).toEqual({
      kind: 'user',
      user: {
        id: 'usr-1',
        sub: 'sub-1',
        email: 'user@example.test',
        emailVerified: true,
        status: 'active',
        role: 'candidate',
        name: 'Иван Иванов',
      },
    });
  });

  it('classifies 401 as invalid unauthorized session', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('stale-access');
    vi.mocked(getRefreshToken).mockResolvedValue('refresh');
    vi.mocked(getMe).mockRejectedValue(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const session = await loadSession();
    expect(session).toEqual({
      kind: 'invalid',
      reason: 'unauthorized',
      message: 'Unauthorized',
      hasRefreshToken: true,
    });
  });

  it('classifies 403 as invalid forbidden session', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('forbidden-access');
    vi.mocked(getRefreshToken).mockResolvedValue('refresh');
    vi.mocked(getMe).mockRejectedValue(
      new ApiError(403, 'Forbidden', 'forbidden'),
    );

    const session = await loadSession();
    expect(session).toEqual({
      kind: 'invalid',
      reason: 'forbidden',
      message: 'Forbidden',
      hasRefreshToken: true,
    });
  });

  it('classifies 503 as unavailable without marking session invalid', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('valid-token');
    vi.mocked(getRefreshToken).mockResolvedValue('refresh');
    vi.mocked(getTokenDisplayName).mockReturnValue('Тестовый Пользователь');
    vi.mocked(getMe).mockRejectedValue(
      new ApiError(503, 'Service Unavailable', 'service_unavailable'),
    );

    const session = await loadSession();
    expect(session).toMatchObject({
      kind: 'unavailable',
      status: 503,
      displayName: 'Тестовый Пользователь',
    });
  });

  it('classifies timeout as unavailable', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('valid-token');
    vi.mocked(getRefreshToken).mockResolvedValue('refresh');
    vi.mocked(getTokenDisplayName).mockReturnValue('Тестовый Пользователь');
    vi.mocked(getMe).mockRejectedValue(
      new ApiError(0, 'timeout of 10000ms exceeded', 'timeout'),
    );

    const session = await loadSession();
    expect(session).toMatchObject({
      kind: 'unavailable',
      code: 'timeout',
      status: 0,
      displayName: 'Тестовый Пользователь',
    });
    if (session.kind === 'unavailable') {
      expect(session.message).toContain('время ожидания');
    }
  });

  it('classifies network error as unavailable', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('valid-token');
    vi.mocked(getRefreshToken).mockResolvedValue('refresh');
    vi.mocked(getMe).mockRejectedValue(
      new ApiError(0, 'Network error', 'network'),
    );

    const session = await loadSession();
    expect(session).toMatchObject({
      kind: 'unavailable',
      code: 'network',
    });
  });
});
