import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAuthOrigin, validateAuthMutation } from '../request.server';

vi.mock('server-only', () => ({}));

afterEach(() => vi.unstubAllEnvs());

describe('trusted auth origin', () => {
  it('supports direct local access without proxy configuration', () => {
    vi.stubEnv('APP_ORIGIN', undefined);
    const request = new Request('http://localhost:5173/api/auth/logout', {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(validateAuthMutation(request)).toBeNull();
  });

  it('supports local server bound to 0.0.0.0 using request host header', () => {
    vi.stubEnv('APP_ORIGIN', undefined);
    const request = new Request('http://0.0.0.0:5173/api/auth/session', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        Host: 'localhost:5173',
        'Content-Type': 'application/json',
      },
    });
    expect(getAuthOrigin(request)).toBe('http://localhost:5173');
    expect(validateAuthMutation(request, true)).toBeNull();
  });

  it('does not trust forwarded headers', () => {
    vi.stubEnv('APP_ORIGIN', undefined);
    const request = new Request('https://app.test/api/auth/session', {
      headers: {
        Origin: 'https://evil.test',
        'X-Forwarded-Host': 'evil.test',
        'X-Forwarded-Proto': 'https',
        Forwarded: 'host=evil.test;proto=https',
      },
    });
    expect(getAuthOrigin(request)).toBe('https://app.test');
    expect(validateAuthMutation(request)?.status).toBe(403);
  });

  it.each([
    '',
    'null',
    'app.test',
    'https://user:pass@app.test',
    'https://app.test/path',
    'https://app.test?query=1',
    'https://app.test#hash',
    'ftp://app.test',
  ])('fails closed for invalid configured origin %s', (origin) => {
    vi.stubEnv('APP_ORIGIN', origin);
    const request = new Request('https://app.test/api/auth/session', {
      headers: { Origin: 'https://app.test' },
    });
    expect(validateAuthMutation(request)?.status).toBe(503);
  });

  it.each([
    'https://app.test/path',
    'https://user@app.test',
    'https://app.test, https://evil.test',
    'null',
  ])('rejects malformed request origin %s', (origin) => {
    vi.stubEnv('APP_ORIGIN', 'https://app.test');
    const request = new Request('https://app.test/api/auth/session', {
      headers: { Origin: origin },
    });
    expect(validateAuthMutation(request)?.status).toBe(403);
  });
});
