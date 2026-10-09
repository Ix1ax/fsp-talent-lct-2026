import { describe, expect, it } from 'vitest';

import { areDraftValuesEqual } from '../draftValues';

describe('normalized draft comparison', () => {
  it('ignores surrounding whitespace, key order, and optional empty values', () => {
    expect(
      areDraftValuesEqual(
        { name: ' Name ', description: null },
        { description: '', name: 'Name' },
      ),
    ).toBe(true);
  });
  it('does not treat an invalid number as an unchanged optional value', () => {
    expect(areDraftValuesEqual({ salary: NaN }, { salary: null })).toBe(false);
  });
  it('detects nested edits and changed array membership', () => {
    expect(
      areDraftValuesEqual({ rows: [{ weight: 1 }] }, { rows: [{ weight: 2 }] }),
    ).toBe(false);
    expect(areDraftValuesEqual({ ids: [1, 2] }, { ids: [1] })).toBe(false);
  });
});
