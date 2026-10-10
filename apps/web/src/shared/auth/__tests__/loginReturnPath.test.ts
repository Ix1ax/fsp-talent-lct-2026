import { describe, expect, it } from 'vitest';

import {
  rememberLoginReturnPath,
  takeLoginReturnPath,
} from '../loginReturnPath';

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};
describe('login return path', () => {
  it('preserves invitation token across sign-in and registration, consuming it once', () => {
    const store = storage();
    rememberLoginReturnPath('/employer/invitation?token=secret', store);
    expect(takeLoginReturnPath('/employer', store)).toBe(
      '/employer/invitation?token=secret',
    );
    expect(takeLoginReturnPath('/employer', store)).toBe('/employer');
  });
  it.each([
    '//evil.test',
    'https://evil.test',
    '/employer/../admin',
    '/employer-evil',
    '/candidate',
  ])('does not return an employer to %s', (path) => {
    const store = storage();
    rememberLoginReturnPath(path, store);
    expect(takeLoginReturnPath('/employer', store)).toBe('/employer');
  });
});
