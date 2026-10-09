import { describe, expect, it } from 'vitest';

import { offerSchema } from '../offerSchema';

const input = {
  candidateId: 'a76cb614-f634-41d6-9d19-76874fbcc842',
  title: 'Разработчик',
  description: 'Разработка продукта',
  salaryFromRub: 100000,
  salaryToRub: 150000,
  contactEmail: 'hr@example.org',
  needId: null,
};
describe('offer salary and anonymous recipient', () => {
  it('requires both positive integer salary boundaries', () => {
    expect(offerSchema.safeParse(input).success).toBe(true);
    for (const salaryFromRub of [0, -1, 1.5, 1000000001, NaN])
      expect(offerSchema.safeParse({ ...input, salaryFromRub }).success).toBe(
        false,
      );
    expect(
      offerSchema.safeParse({ ...input, salaryToRub: 50000 }).success,
    ).toBe(false);
  });
  it('does not require a need and rejects missing salary or a non-profile UUID', () => {
    expect(offerSchema.safeParse({ ...input, needId: undefined }).success).toBe(
      true,
    );
    expect(
      offerSchema.safeParse({ ...input, salaryToRub: undefined }).success,
    ).toBe(false);
    expect(
      offerSchema.safeParse({ ...input, candidateId: 'keycloak-subject' })
        .success,
    ).toBe(false);
  });
});
