import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setAuthTokens } from '@/shared/auth/server';

import { POST } from '../route';

vi.mock('@/shared/auth/server', () => ({ setAuthTokens: vi.fn() }));

const request = (body: unknown) =>
  new NextRequest('https://app.test/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('session route', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    null,
    [],
    1,
    { accessToken: 1, refreshToken: 'r' },
    { accessToken: 'a', refreshToken: [] },
    { accessToken: 'a', refreshToken: 'r', expiresIn: -1 },
    { accessToken: 'a', refreshToken: 'r', expiresIn: '300' },
    { accessToken: 'a\n', refreshToken: 'r' },
  ])('rejects malformed input %j with 400', async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: 'validation_error' },
    });
    expect(setAuthTokens).not.toHaveBeenCalled();
  });

  it('saves valid tokens', async () => {
    const tokens = {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 300,
    };
    expect((await POST(request(tokens))).status).toBe(200);
    expect(setAuthTokens).toHaveBeenCalledWith(tokens);
  });

  it('rejects invalid JSON', async () => {
    const invalid = new NextRequest('https://app.test/api/auth/session', {
      method: 'POST',
      body: '{',
    });
    expect((await POST(invalid)).status).toBe(400);
  });
});
