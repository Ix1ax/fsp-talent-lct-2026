import { describe, expect, it } from 'vitest';

import { sanitizeRedirectPath } from '../sanitizeRedirectPath';

describe('sanitizeRedirectPath', () => {
  it('allows relative paths', () => {
    expect(sanitizeRedirectPath('/')).toBe('/');
    expect(sanitizeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(sanitizeRedirectPath('/a/b?x=1')).toBe('/a/b?x=1');
  });

  it('rejects open redirects', () => {
    expect(sanitizeRedirectPath(null)).toBe('/');
    expect(sanitizeRedirectPath('https://evil.test')).toBe('/');
    expect(sanitizeRedirectPath('//evil.test')).toBe('/');
    expect(sanitizeRedirectPath('/\\evil')).toBe('/');
    expect(sanitizeRedirectPath('dashboard')).toBe('/');
  });

  it.each([
    '/\n/evil.test',
    '/\t/evil.test',
    '/\r/evil.test',
    '/\u0000/evil.test',
  ])('rejects control characters in %j', (path) => {
    expect(sanitizeRedirectPath(path)).toBe('/');
  });

  it('preserves a relative path whose normalized pathname starts with two slashes', () => {
    const path = '/a/..//example.test';
    const result = sanitizeRedirectPath(path);
    expect(new URL(result, 'https://app.test').origin).toBe('https://app.test');
  });
});
