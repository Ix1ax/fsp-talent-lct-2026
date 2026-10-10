import { describe, expect, it } from 'vitest';

import { pluralizeRu } from '../pluralizeRu';

const forms = ['навык', 'навыка', 'навыков'] as const;

describe('pluralizeRu', () => {
  it.each([
    [1, '1 навык'],
    [2, '2 навыка'],
    [5, '5 навыков'],
    [11, '11 навыков'],
    [12, '12 навыков'],
    [21, '21 навык'],
    [104, '104 навыка'],
    [111, '111 навыков'],
  ])('%i → %s', (count, expected) => {
    expect(pluralizeRu(count, forms)).toBe(expected);
  });
});
