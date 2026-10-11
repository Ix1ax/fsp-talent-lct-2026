import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAuthTokens } from '../session.server';

const { set } = vi.hoisted(() => ({ set: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ set }) }));

beforeEach(() => {
  set.mockClear();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('SESSION_COOKIE_SECURE', undefined);
});

afterEach(() => vi.unstubAllEnvs());

describe('session cookies in deployed environments', () => {
  it.each([
    [undefined, true],
    ['true', true],
    ['false', false],
    ['invalid', true],
  ])('uses Secure=%s configuration safely', async (configured, secure) => {
    vi.stubEnv('SESSION_COOKIE_SECURE', configured);
    await setAuthTokens({
      accessToken: 'qa-access',
      refreshToken: 'qa-refresh',
      idToken: 'qa-id',
    });
    expect(set).toHaveBeenCalledTimes(3);
    for (const [, , options] of set.mock.calls)
      expect(options).toMatchObject({
        httpOnly: true,
        sameSite: 'lax',
        secure,
      });
  });
});
