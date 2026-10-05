import { describe, expect, it } from 'vitest';
import { convertSnakeToCamel } from './convertSnakeToCamel';

describe('convertSnakeToCamel', () => {
  it('leaves primitives and null unchanged', () => {
    expect(convertSnakeToCamel(null)).toBe(null);
    expect(convertSnakeToCamel(undefined)).toBe(undefined);
    expect(convertSnakeToCamel(42)).toBe(42);
    expect(convertSnakeToCamel('user_id')).toBe('user_id');
    expect(convertSnakeToCamel(true)).toBe(true);
  });

  it('converts object keys to camelCase', () => {
    expect(convertSnakeToCamel({ user_id: 1, created_at: 'now' })).toEqual({
      userId: 1,
      createdAt: 'now',
    });
  });

  it('recursively converts nested objects', () => {
    expect(
      convertSnakeToCamel({
        user_id: 1,
        meta_data: { created_at: 'x', is_active: true },
      }),
    ).toEqual({
      userId: 1,
      metaData: { createdAt: 'x', isActive: true },
    });
  });

  it('maps array items', () => {
    expect(convertSnakeToCamel([{ user_id: 1 }, { user_id: 2 }])).toEqual([
      { userId: 1 },
      { userId: 2 },
    ]);
  });

  it('converts arrays nested in objects', () => {
    expect(
      convertSnakeToCamel({
        item_list: [{ item_id: 10 }, 'plain', 3],
      }),
    ).toEqual({
      itemList: [{ itemId: 10 }, 'plain', 3],
    });
  });

  it('does not convert keys of non-plain objects', () => {
    const date = new Date('2020-01-01T00:00:00.000Z');
    expect(convertSnakeToCamel(date)).toBe(date);
  });

  it('supports Object.create(null)', () => {
    const raw = Object.create(null) as Record<string, unknown>;
    raw.user_id = 7;

    expect(convertSnakeToCamel(raw)).toEqual({ userId: 7 });
  });
});
