import { describe, expect, it } from 'vitest';
import { snakeToCamel } from '../snakeToCamel';

describe('snakeToCamel', () => {
  it('converts snake_case to camelCase', () => {
    expect(snakeToCamel('user_id')).toBe('userId');
    expect(snakeToCamel('created_at')).toBe('createdAt');
  });

  it('converts kebab-case to camelCase', () => {
    expect(snakeToCamel('user-id')).toBe('userId');
    expect(snakeToCamel('created-at')).toBe('createdAt');
  });

  it('handles multiple separators', () => {
    expect(snakeToCamel('api_response_body')).toBe('apiResponseBody');
    expect(snakeToCamel('x-y-z')).toBe('xYZ');
  });

  it('leaves strings without separators unchanged', () => {
    expect(snakeToCamel('')).toBe('');
    expect(snakeToCamel('id')).toBe('id');
    expect(snakeToCamel('alreadyCamel')).toBe('alreadyCamel');
  });

  it('preserves letter case after separators', () => {
    expect(snakeToCamel('user_ID')).toBe('userID');
    expect(snakeToCamel('foo-Bar')).toBe('fooBar');
  });
});
