import { describe, expect, it } from 'vitest';

import { parseSoftSkills, surveySchema } from '../surveySchema';
const values = {
  stackSkillId: '00000000-0000-4000-8000-000000000001',
  industry: ' IT ',
  specializationId: 1,
  gradeId: 2,
  softSkills: '',
};
describe('candidate survey validation', () => {
  it('requires catalog selections and industry, allowing no soft skills', () => {
    expect(surveySchema.parse(values).industry).toBe('IT');
    expect(parseSoftSkills('')).toEqual([]);
    for (const patch of [
      { stackSkillId: '' },
      { specializationId: 0 },
      { gradeId: 0 },
      { industry: '  ' },
    ])
      expect(surveySchema.safeParse({ ...values, ...patch }).success).toBe(
        false,
      );
  });
  it('normalizes lines and rejects duplicates after trimming', () => {
    expect(parseSoftSkills('  Командная работа \n\nПланирование\n')).toEqual([
      'Командная работа',
      'Планирование',
    ]);
    expect(
      surveySchema.safeParse({
        ...values,
        softSkills: 'Работа в команде\n Работа в команде ',
      }).success,
    ).toBe(false);
  });
  it('checks count and per-item length at API limits', () => {
    expect(
      surveySchema.safeParse({
        ...values,
        softSkills: Array.from({ length: 20 }, (_, i) => `Навык ${i}`).join(
          '\n',
        ),
      }).success,
    ).toBe(true);
    expect(
      surveySchema.safeParse({
        ...values,
        softSkills: Array.from({ length: 21 }, (_, i) => `Навык ${i}`).join(
          '\n',
        ),
      }).success,
    ).toBe(false);
    expect(
      surveySchema.safeParse({ ...values, softSkills: 'a'.repeat(101) })
        .success,
    ).toBe(false);
  });
});
