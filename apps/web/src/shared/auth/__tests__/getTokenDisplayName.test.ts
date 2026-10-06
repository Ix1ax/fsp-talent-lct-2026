import { describe, expect, it } from 'vitest';

import { getTokenDisplayName } from '../getTokenDisplayName';

const token = (claims: unknown) =>
  `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

describe('getTokenDisplayName', () => {
  it('uses the full name and preserves Unicode', () => {
    expect(getTokenDisplayName(token({ name: ' Иван Петров ' }))).toBe(
      'Иван Петров',
    );
  });
  it('combines given and family names when the full name is absent', () => {
    expect(
      getTokenDisplayName(token({ given_name: 'Иван', family_name: 'Петров' })),
    ).toBe('Иван Петров');
  });
  it('ignores malformed tokens and non-string names', () => {
    expect(getTokenDisplayName('invalid')).toBeUndefined();
    expect(getTokenDisplayName(token({ name: 42 }))).toBeUndefined();
    expect(getTokenDisplayName(token(null))).toBeUndefined();
  });
});
