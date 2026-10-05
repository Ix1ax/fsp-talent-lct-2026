import { describe, expect, it } from 'vitest';
import { convertCamelToSnake } from '../convertCamelToSnake';

describe('convertCamelToSnake', () => {
  it('converts object keys to snake_case', () => {
    expect(convertCamelToSnake({ userId: 1, createdAt: 'now' })).toEqual({
      user_id: 1,
      created_at: 'now',
    });
  });

  it('recursively converts nested objects and arrays', () => {
    expect(
      convertCamelToSnake({
        itemList: [{ itemId: 10 }],
      }),
    ).toEqual({
      item_list: [{ item_id: 10 }],
    });
  });

  it('leaves primitives unchanged', () => {
    expect(convertCamelToSnake(null)).toBe(null);
    expect(convertCamelToSnake('userId')).toBe('userId');
  });
});
