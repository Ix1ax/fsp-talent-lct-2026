import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAuthTokens } from '@/shared/auth/server';

import { POST } from '../route';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/auth/server', () => ({ setAuthTokens: vi.fn() }));

const request = (body: unknown) =>
  new NextRequest('https://app.test/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
    body: JSON.stringify(body),
  });

describe('session route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('APP_ORIGIN', 'https://app.test');
  });
  afterEach(() => vi.unstubAllEnvs());

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
      headers: {
        Origin: 'https://app.test',
        'Content-Type': 'application/json',
      },
      body: '{',
    });
    expect((await POST(invalid)).status).toBe(400);
  });
});

describe('session request boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('APP_ORIGIN', 'https://app.test');
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ['https://evil.test', 'application/json', 403],
    ['https://app.test.evil.test', 'application/json', 403],
    ['http://app.test', 'application/json', 403],
    ['https://app.test:444', 'application/json', 403],
    ['null', 'application/json', 403],
    [null, 'application/json', 403],
    ['https://app.test', 'text/plain', 415],
    ['https://app.test', 'application/x-www-form-urlencoded', 415],
    ['https://app.test', 'multipart/form-data; boundary=test', 415],
    ['https://app.test', null, 415],
  ])(
    'rejects origin %s and content type %s before reading the body',
    async (origin, contentType, status) => {
      const headers = new Headers();
      if (origin) headers.set('Origin', origin);
      if (contentType) headers.set('Content-Type', contentType);
      const incoming = new NextRequest('https://app.test/api/auth/session', {
        method: 'POST',
        headers,
      });
      const read = vi.spyOn(incoming, 'json');
      expect((await POST(incoming)).status).toBe(status);
      expect(read).not.toHaveBeenCalled();
      expect(setAuthTokens).not.toHaveBeenCalled();
    },
  );

  it('accepts the configured public origin behind an internal proxy URL', async () => {
    const incoming = new NextRequest('http://web:3000/api/auth/session', {
      method: 'POST',
      headers: {
        Origin: 'https://app.test',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 300,
      }),
    });
    expect((await POST(incoming)).status).toBe(200);
    expect(setAuthTokens).toHaveBeenCalledOnce();
  });
});
