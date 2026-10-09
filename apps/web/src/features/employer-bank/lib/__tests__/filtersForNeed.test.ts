import { describe, expect, it } from 'vitest';

import type { EmployerNeed } from '@/entities/employer-need';

import { filtersForNeed, filtersMatchNeed } from '../filtersForNeed';

const need: EmployerNeed = {
  id: 'need',
  companyId: 'company',
  createdBy: 'owner',
  createdAt: '',
  title: 'Frontend',
  description: '',
  specializationId: 2,
  gradeId: null,
  salaryFromRub: 150000,
  salaryToRub: 200000,
  city: null,
  timezone: null,
  status: 'active',
  workFormatIds: [3],
  skills: [
    { skillId: 'react', required: true, weight: 1 },
    { skillId: 'ts', required: true, weight: 1 },
  ],
};

describe('search by company need', () => {
  it('unbinds after changing criteria and restores binding when all original conditions return', () => {
    const original = filtersForNeed(need);
    expect(filtersMatchNeed(original, need)).toBe(true);
    for (const patch of [
      { specializationId: 1 },
      { gradeId: 1 },
      { salaryMaxRub: 199999 },
      { workFormatIds: [] },
      { skillId: 'react' },
      { gradeStatus: 'confirmed' as const },
      { hasFspAchievements: false },
      { experienceMinMonths: 0 },
      { experienceMaxMonths: 12 },
    ])
      expect(filtersMatchNeed({ ...original, ...patch }, need)).toBe(false);
    expect(
      filtersMatchNeed(
        {
          ...original,
          gradeStatus: 'all',
          skillId: '',
          verifiedSkillOnly: false,
          experienceMinMonths: undefined,
        },
        need,
      ),
    ).toBe(true);
  });
  it('compares formats as a set and never matches only a subset of conditions', () => {
    const multiFormat = { ...need, workFormatIds: [1, 3] };
    const filters = filtersForNeed(multiFormat);
    expect(
      filtersMatchNeed({ ...filters, workFormatIds: [3, 1] }, multiFormat),
    ).toBe(true);
    expect(
      filtersMatchNeed({ ...filters, workFormatIds: [1] }, multiFormat),
    ).toBe(false);
  });
  it('applies the budget ceiling and formats without reducing multiple requirements to one skill', () => {
    const filters = filtersForNeed(need);
    expect(filters).toEqual({
      specializationId: 2,
      gradeId: undefined,
      salaryMaxRub: 200000,
      workFormatIds: [3],
    });
    filters.workFormatIds?.push(1);
    expect(need.workFormatIds).toEqual([3]);
    expect(filters.skillId).toBeUndefined();
  });
  it('preserves zero budgets and clears optional criteria when changing needs', () => {
    expect(
      filtersForNeed({ ...need, gradeId: 1, salaryToRub: 0 }),
    ).toMatchObject({ gradeId: 1, salaryMaxRub: 0 });
    expect(filtersForNeed({ ...need, salaryToRub: null })).toMatchObject({
      salaryMaxRub: 150000,
    });
    expect(
      filtersForNeed({
        ...need,
        salaryToRub: null,
        salaryFromRub: null,
        workFormatIds: [],
      }),
    ).toEqual({
      specializationId: 2,
      gradeId: undefined,
      salaryMaxRub: undefined,
      workFormatIds: [],
    });
  });
});
