import { describe, expect, it } from 'vitest';

import { camelToSnake } from '../camelToSnake';

describe('camelToSnake', () => {
  it('converts camelCase to snake_case', () => {
    expect(camelToSnake('userId')).toBe('user_id');
    expect(camelToSnake('createdAt')).toBe('created_at');
  });

  it('handles multiple capitals', () => {
    expect(camelToSnake('apiResponseBody')).toBe('api_response_body');
  });

  it('leaves strings without capitals unchanged', () => {
    expect(camelToSnake('')).toBe('');
    expect(camelToSnake('id')).toBe('id');
  });
});
