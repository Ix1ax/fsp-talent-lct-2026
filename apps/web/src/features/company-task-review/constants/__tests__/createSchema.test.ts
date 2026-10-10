import { describe, expect, it } from 'vitest';

import { companyTaskSchema } from '../createSchema';

const input = () => ({
  title: ' Задание ',
  description: '',
  specializationId: '',
  gradeId: '',
  deadlineAt: '',
  file: new File(['condition'], 'condition.txt'),
});

describe('company task publication', () => {
  it('requires a title and a nonempty file but allows omitted optional fields', () => {
    expect(companyTaskSchema.parse(input()).title).toBe('Задание');
    expect(
      companyTaskSchema.safeParse({ ...input(), title: ' ' }).success,
    ).toBe(false);
    expect(
      companyTaskSchema.safeParse({ ...input(), file: undefined }).success,
    ).toBe(false);
    expect(
      companyTaskSchema.safeParse({
        ...input(),
        file: new File([], 'empty.txt'),
      }).success,
    ).toBe(false);
  });

  it('accepts 10 MiB and rejects files over the limit', () => {
    expect(
      companyTaskSchema.safeParse({
        ...input(),
        file: new File([new Uint8Array(10 * 1024 * 1024)], 'condition.zip'),
      }).success,
    ).toBe(true);
    expect(
      companyTaskSchema.safeParse({
        ...input(),
        file: new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'condition.zip'),
      }).success,
    ).toBe(false);
  });

  it('requires an optional deadline to be a valid future time', () => {
    for (const deadlineAt of [
      'invalid',
      new Date(Date.now() - 1000).toISOString(),
    ])
      expect(
        companyTaskSchema.safeParse({ ...input(), deadlineAt }).success,
      ).toBe(false);
    expect(
      companyTaskSchema.safeParse({
        ...input(),
        deadlineAt: new Date(Date.now() + 60_000).toISOString(),
      }).success,
    ).toBe(true);
  });
});
