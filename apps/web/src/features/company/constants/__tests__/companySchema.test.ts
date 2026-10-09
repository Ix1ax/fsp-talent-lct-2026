import { describe, expect, it } from 'vitest';

import { companySchema, isValidInn } from '../companySchema';

describe('company profile validation matches backend', () => {
  it.each(['7707083893', '500100732259'])(
    'accepts checksum-valid INN %s',
    (inn) => expect(isValidInn(inn)).toBe(true),
  );
  it.each(['7707083894', '500100732258', '0000000000', '123', 'abcdefghij'])(
    'rejects invalid INN %s',
    (inn) => expect(isValidInn(inn)).toBe(false),
  );
  it('allows null optional fields and trims required values', () => {
    expect(
      companySchema.parse({
        name: ' Команда ',
        contactEmail: ' hr@example.org ',
        inn: null,
        contactUrl: null,
      }),
    ).toMatchObject({ name: 'Команда', contactEmail: 'hr@example.org' });
  });
  it.each(['ftp://example.org', 'https://user:secret@example.org', 'https://'])(
    'rejects unsupported contact link %s',
    (contactUrl) => {
      expect(
        companySchema.safeParse({
          name: 'Команда',
          contactEmail: 'hr@example.org',
          contactUrl,
        }).success,
      ).toBe(false);
    },
  );
});
