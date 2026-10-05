import { describe, expect, it } from 'vitest';

import { isObject } from '../isObject';

describe('isObject', () => {
  it('returns true for plain objects', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
  });

  it('returns true for Object.create(null)', () => {
    expect(isObject(Object.create(null))).toBe(true);
  });

  it('returns false for null and undefined', () => {
    expect(isObject(null)).toBe(false);
    expect(isObject(undefined)).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isObject(1)).toBe(false);
    expect(isObject('str')).toBe(false);
    expect(isObject(true)).toBe(false);
    expect(isObject(Symbol('x'))).toBe(false);
  });

  it('returns false for arrays and built-in objects', () => {
    expect(isObject([])).toBe(false);
    expect(isObject(new Date())).toBe(false);
    expect(isObject(new Map())).toBe(false);
    expect(isObject(/re/)).toBe(false);
  });
});
