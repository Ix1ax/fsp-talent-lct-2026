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
});
