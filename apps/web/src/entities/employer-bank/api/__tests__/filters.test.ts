import { describe, expect, it } from 'vitest';

import { bankFilterParams, validateBankFilters } from '../index';

describe('candidate bank filter contract', () => {
  it('encodes formats as CSV and removes empty filters', () => {
    expect(
      bankFilterParams({ workFormatIds: [1, 2], gradeStatus: 'all' }),
    ).toMatchObject({ workFormatIds: '1,2', gradeStatus: undefined });
    expect(
      bankFilterParams({ workFormatIds: [] }).workFormatIds,
    ).toBeUndefined();
  });
  it('requires a skill for verification even when the flag is false', () => {
    expect(
      bankFilterParams({ verifiedSkillOnly: false }).verifiedSkillOnly,
    ).toBeUndefined();
    expect(
      bankFilterParams({ skillId: 'skill', verifiedSkillOnly: false })
        .verifiedSkillOnly,
    ).toBe(false);
  });
  it('preserves zero salary, zero experience and a negative achievements filter', () => {
    expect(
      bankFilterParams({
        salaryMaxRub: 0,
        experienceMinMonths: 0,
        hasFspAchievements: false,
      }),
    ).toMatchObject({
      salaryMaxRub: 0,
      experienceMinMonths: 0,
      hasFspAchievements: false,
    });
  });
});

describe('invalid ranges are rejected before requesting the bank', () => {
  it('rejects inverted experience, values beyond 50 years and fractional salaries', () => {
    expect(
      validateBankFilters({ experienceMinMonths: 24, experienceMaxMonths: 12 }),
    ).toBeTruthy();
    expect(validateBankFilters({ experienceMaxMonths: 601 })).toBeTruthy();
    expect(validateBankFilters({ salaryMaxRub: 1.5 })).toBeTruthy();
    expect(
      validateBankFilters({ salaryMaxRub: 0, experienceMinMonths: 0 }),
    ).toBeNull();
  });
});
