import { describe, expect, it } from 'vitest';

import {
  type CandidateEducation,
  EDUCATION_LEVELS,
} from '@/entities/candidate';

import { educationSchema } from '../../constants';
import { toEducationFormValues, toEducationInput } from '../educationForm';

const record: CandidateEducation = {
  id: 'education',
  level: 'bachelor',
  institution: 'Университет',
  specialty: 'Информатика',
  graduationYear: 2024,
  createdAt: '',
  updatedAt: '',
};
const values = toEducationFormValues(record);

describe('education validation', () => {
  it.each(EDUCATION_LEVELS)('accepts backend level %s', (level) => {
    expect(educationSchema.safeParse({ ...values, level }).success).toBe(true);
  });
  it.each(['', 'school', 'unknown'])(
    'rejects missing or unsupported level %j',
    (level) => {
      const result = educationSchema.safeParse({ ...values, level });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues[0].path).toEqual(['level']);
    },
  );
  it.each(['', '1949', '2101', '2024.5', '2e3', ' 2024', '02024'])(
    'rejects invalid graduation year %j',
    (graduationYear) => {
      expect(
        educationSchema.safeParse({ ...values, graduationYear }).success,
      ).toBe(false);
    },
  );
  it.each(['1950', '2100'])(
    'allows boundary graduation year %s including future years',
    (graduationYear) => {
      expect(
        educationSchema.safeParse({ ...values, graduationYear }).success,
      ).toBe(true);
    },
  );
  it('requires a nonblank institution and accepts an empty specialty', () => {
    expect(
      educationSchema.safeParse({ ...values, institution: '   ' }).success,
    ).toBe(false);
    expect(
      educationSchema.safeParse({ ...values, specialty: '' }).success,
    ).toBe(true);
  });
  it.each(['institution', 'specialty'] as const)(
    'matches rune-based backend length limits for %s',
    (field) => {
      expect(
        educationSchema.safeParse({
          ...values,
          [field]: `  ${'🎓'.repeat(200)}  `,
        }).success,
      ).toBe(true);
      expect(
        educationSchema.safeParse({ ...values, [field]: 'Я'.repeat(201) })
          .success,
      ).toBe(false);
      expect(
        educationSchema.safeParse({ ...values, [field]: 'Текст\0' }).success,
      ).toBe(false);
    },
  );
});

describe('education form mapping', () => {
  it('preserves all fields when opening an existing record', () => {
    expect(values).toEqual({
      level: 'bachelor',
      institution: 'Университет',
      specialty: 'Информатика',
      graduationYear: '2024',
    });
  });
  it('starts a new record without preselecting an education level', () => {
    expect(toEducationFormValues()).toEqual({
      level: '',
      institution: '',
      specialty: '',
      graduationYear: '',
    });
  });
  it('sends a complete replacement, a numeric year and an explicitly cleared specialty', () => {
    expect(
      toEducationInput({
        ...values,
        institution: ' Университет ',
        specialty: '  ',
        graduationYear: '2100',
      }),
    ).toEqual({
      level: 'bachelor',
      institution: 'Университет',
      specialty: '',
      graduationYear: 2100,
    });
  });
  it('does not turn a missing level into a valid API payload', () => {
    expect(() => toEducationInput(toEducationFormValues())).toThrow(
      'Выберите уровень образования.',
    );
  });
});
