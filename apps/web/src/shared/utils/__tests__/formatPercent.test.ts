import { describe, expect, it } from 'vitest';

import { formatPercent } from '../formatPercent';

describe('formatPercent', () => {
  it.each([
    [3.57, '3,57%'],
    [60, '60%'],
    [33.3333, '33,33%'],
    [0, '0%'],
  ])('%d → %s', (value, expected) => {
    expect(formatPercent(value)).toBe(expected);
  });
});
