import { describe, expect, it } from 'vitest';

import { getNeedValidationStep } from '../getNeedValidationStep';

describe('need validation navigation', () => {
  it.each([
    'title',
    'specializationId',
    'gradeId',
    'skills',
    'workFormatIds',
    'salaryFromRub',
    'salaryToRub',
  ])('opens the brief for %s', (field) => {
    expect(getNeedValidationStep({ [field]: 'error' })).toBe(0);
  });
  it.each(['description', 'city', 'timezone'])(
    'opens conditions for %s',
    (field) => {
      expect(getNeedValidationStep({ [field]: 'error' })).toBe(1);
    },
  );
  it('opens the first invalid section when multiple sections have errors', () => {
    expect(
      getNeedValidationStep({ skills: 'error', description: 'error' }),
    ).toBe(0);
  });
});
