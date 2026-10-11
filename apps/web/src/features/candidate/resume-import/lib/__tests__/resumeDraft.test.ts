import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api';
import type { ResumeDraft } from '@/entities/candidate';

import {
  getImportRetryAt,
  getResumeChanges,
  getResumeFormPatches,
  getResumeImportError,
  sameResumeEducation,
  sameResumeExperience,
  sameResumeSkill,
  toResumeEducationValues,
} from '..';

const draft: ResumeDraft = {
  headline: 'Разработчик',
  city: '',
  summary: null,
  salaryMinRub: 0,
  workFormatIds: [],
  contacts: {
    fullName: '',
    email: 'new@example.test',
    phone: null,
    telegram: null,
  },
  experience: [],
  education: [],
  skills: [],
  languages: [],
};
describe('imported resume drafts', () => {
  it('keeps unrecognized fields, total experience and search status untouched', () => {
    const patches = getResumeFormPatches(draft);
    expect(patches.profile).toEqual({
      headline: 'Разработчик',
      salaryMinRub: '0',
    });
    expect(patches.contacts).toEqual({ email: 'new@example.test' });
    expect(patches.profile).not.toHaveProperty('experienceYears');
    expect(patches.profile).not.toHaveProperty('searchStatus');
  });
  it('compares against unsaved form values without mutating them', () => {
    const current = {
      profile: { headline: 'Мой черновик', salaryMinRub: '0' },
      contacts: { email: 'old@example.test' },
    };
    expect(getResumeChanges(draft, current)).toEqual([
      {
        label: 'Заголовок профиля',
        previous: 'Мой черновик',
        next: 'Разработчик',
      },
      {
        label: 'Email',
        previous: 'old@example.test',
        next: 'new@example.test',
      },
    ]);
    expect(current.profile.headline).toBe('Мой черновик');
  });
  it('leaves missing education fields empty for validation', () => {
    expect(
      toResumeEducationValues({
        level: null,
        institution: 'Университет',
        specialty: '',
        graduationYear: null,
      }),
    ).toEqual({
      level: '',
      institution: 'Университет',
      specialty: '',
      graduationYear: '',
    });
  });
  it('detects existing records by meaningful fields', () => {
    const experience = {
      company: 'Компания',
      position: 'Разработчик',
      startedOn: '2022-11',
      endedOn: null,
      description: '',
    };
    expect(
      sameResumeExperience(experience, {
        ...experience,
        company: ' компания ',
        description: 'other',
      }),
    ).toBe(true);
    expect(
      sameResumeExperience(experience, { ...experience, startedOn: '2023-11' }),
    ).toBe(false);
    const education = {
      level: 'master' as const,
      institution: 'МГУ',
      specialty: 'ИТ',
      graduationYear: 2030,
    };
    expect(
      sameResumeEducation(education, { ...education, institution: ' мгу ' }),
    ).toBe(true);
    expect(
      sameResumeSkill({ name: ' PostgreSQL ' }, { name: 'postgresql' }),
    ).toBe(true);
    expect(
      sameResumeSkill(
        { name: 'Alias', skillId: 'one' },
        { name: 'Canonical', skillId: 'one' },
      ),
    ).toBe(true);
  });
  it('supports both Retry-After formats and a default delay', () => {
    expect(getImportRetryAt('7', 1000)).toBe(8000);
    expect(
      getImportRetryAt(
        'Thu, 08 Oct 2026 00:00:05 GMT',
        Date.parse('2026-10-08T00:00:00Z'),
      ),
    ).toBe(Date.parse('2026-10-08T00:00:05Z'));
    expect(getImportRetryAt('invalid', 1000)).toBe(6000);
  });
  it.each([
    'consent_required',
    'resume_too_large',
    'resume_unrecognized',
    'import_busy',
  ])('explains %s', (code) => {
    expect(
      getResumeImportError(new ApiError(503, 'Backend message', code)),
    ).not.toBe('Backend message');
  });
});
