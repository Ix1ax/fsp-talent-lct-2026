import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAuthTokens } from '@/shared/auth/server';

import { GET, POST } from '../route';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/auth/server', () => ({ clearAuthTokens: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('APP_ORIGIN', 'https://app.test');
});
afterEach(() => vi.unstubAllEnvs());

describe('logout boundary', () => {
  it('clears cookies for the existing same-origin POST flow', async () => {
    const response = await POST(
      new Request('http://web:3000/api/auth/logout', {
        method: 'POST',
        headers: { Origin: 'https://app.test' },
      }),
    );
    expect(response.status).toBe(200);
    expect(clearAuthTokens).toHaveBeenCalledOnce();
  });

  it.each([undefined, 'null', 'https://evil.test'])(
    'does not clear cookies for origin %s',
    async (origin) => {
      const response = await POST(
        new Request('https://app.test/api/auth/logout', {
          method: 'POST',
          headers: origin ? { Origin: origin } : {},
        }),
      );
      expect(response.status).toBe(403);
      expect(clearAuthTokens).not.toHaveBeenCalled();
    },
  );

  it('does not mutate the session on GET', () => {
    const response = GET();
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(clearAuthTokens).not.toHaveBeenCalled();
  });
});
