import { describe, expect, it } from 'vitest';

import type { CandidateProfile } from '@/entities/candidate';

import { profileSchema } from '../../model';
import {
  buildProfilePatch,
  mergeProfileDraft,
  toProfileFormValues,
  toProfileInput,
} from '../profileForm';

const validateProfile = (values: Parameters<typeof toProfileInput>[0]) => {
  const result = profileSchema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message]),
      );
};

const profile: CandidateProfile = {
  id: 'profile',
  avatarFileId: null,
  headline: 'Developer',
  summary: 'About',
  city: 'Казань',
  timezone: 'Europe/Moscow',
  experienceMonths: 12,
  salaryMinRub: 100000,
  searchStatus: 'hidden',
  workFormatIds: [1, 3],
  updatedAt: '2026-10-06T00:00:00Z',
};

describe('profile form', () => {
  it('merges only changed creation fields after a profile conflict', () => {
    const existing = { ...profile, searchStatus: 'open' as const };
    const draft = { ...toProfileFormValues(), headline: 'New headline' };
    const merged = mergeProfileDraft(existing, draft, ['headline']);
    expect(merged).toEqual({
      ...toProfileFormValues(existing),
      headline: 'New headline',
    });
    expect(buildProfilePatch(existing, merged)).toEqual({
      headline: 'New headline',
    });
  });
  it('keeps explicit clears and zero values in changed fields', () => {
    const draft = toProfileFormValues();
    const merged = mergeProfileDraft(profile, draft, [
      'summary',
      'experienceYears',
      'workFormatIds',
    ]);
    expect(buildProfilePatch(profile, merged)).toEqual({
      summary: null,
      experienceMonths: 0,
      workFormatIds: [],
    });
  });
  it('restores all server fields when the creation draft is unchanged', () => {
    const merged = mergeProfileDraft(profile, toProfileFormValues(), []);
    expect(buildProfilePatch(profile, merged)).toEqual({});
  });
  it('converts fractional years to integer months', () => {
    const values = { ...toProfileFormValues(), experienceYears: '1.5' };
    expect(profileSchema.safeParse(values).success).toBe(true);
    expect(toProfileInput(values).experienceMonths).toBe(18);
    expect(
      toProfileInput({ ...values, experienceYears: '1.2' }).experienceMonths,
    ).toBe(14);
  });
  it('renders years rounded to tenths', () => {
    expect(
      toProfileFormValues({ ...profile, experienceMonths: 16 }).experienceYears,
    ).toBe('1.3');
    expect(
      toProfileFormValues({ ...profile, experienceMonths: 20 }).experienceYears,
    ).toBe('1.7');
  });
  it('preserves every existing month value when experience is unchanged', () => {
    for (let months = 0; months <= 600; months++) {
      const original = { ...profile, experienceMonths: months };
      const values = toProfileFormValues(original);
      expect(buildProfilePatch(original, values)).toEqual({});
      expect(
        buildProfilePatch(original, { ...values, city: 'Москва' }),
      ).toEqual({
        city: 'Москва',
      });
    }
  });
  it('defaults new profiles to hidden with zero experience', () => {
    expect(toProfileInput(toProfileFormValues())).toMatchObject({
      searchStatus: 'hidden',
      experienceMonths: 0,
      salaryMinRub: null,
      workFormatIds: [],
    });
  });
  it('clears optional fields explicitly while preserving zero salary', () => {
    const values = {
      ...toProfileFormValues(profile),
      headline: '  ',
      summary: '',
      city: '',
      timezone: '',
      salaryMinRub: '0',
      workFormatIds: [],
    };
    expect(buildProfilePatch(profile, values)).toEqual({
      headline: null,
      summary: null,
      city: null,
      timezone: null,
      salaryMinRub: 0,
      workFormatIds: [],
    });
    expect(
      buildProfilePatch(profile, { ...values, salaryMinRub: '' }).salaryMinRub,
    ).toBeNull();
  });
  it('omits unchanged fields and ignores format ordering', () => {
    expect(
      buildProfilePatch(profile, {
        ...toProfileFormValues(profile),
        headline: ' Developer ',
        workFormatIds: [3, 1],
      }),
    ).toEqual({});
    expect(
      buildProfilePatch(profile, {
        ...toProfileFormValues(profile),
        searchStatus: 'open',
      }),
    ).toEqual({ searchStatus: 'open' });
  });
  it.each(['', '-1', '50.01', '1e2', 'NaN'])(
    'rejects invalid experience in years %s',
    (experienceYears) => {
      expect(
        validateProfile({ ...toProfileFormValues(), experienceYears })
          .experienceYears,
      ).toBeDefined();
    },
  );
  it.each(['-1', '1000000001', '1.5', 'Infinity'])(
    'rejects invalid salary %s',
    (salaryMinRub) => {
      expect(
        validateProfile({ ...toProfileFormValues(), salaryMinRub })
          .salaryMinRub,
      ).toBeDefined();
    },
  );
  it('accepts boundary values and counts Unicode characters', () => {
    expect(
      validateProfile({
        ...toProfileFormValues(),
        headline: '😀'.repeat(200),
        summary: 'x'.repeat(10000),
        city: 'x'.repeat(200),
        experienceYears: '50',
        salaryMinRub: '1000000000',
        timezone: 'Europe/Moscow',
      }),
    ).toEqual({});
  });
  it('rejects excessive text, null characters and invalid timezone', () => {
    expect(
      validateProfile({
        ...toProfileFormValues(),
        headline: 'x'.repeat(201),
        summary: '\0',
        timezone: 'Local',
      }),
    ).toMatchObject({
      headline: expect.any(String),
      summary: expect.any(String),
      timezone: expect.any(String),
    });
  });
  it('rejects duplicate and invalid work formats', () => {
    expect(
      validateProfile({ ...toProfileFormValues(), workFormatIds: [1, 1] })
        .workFormatIds,
    ).toBeDefined();
    expect(
      validateProfile({ ...toProfileFormValues(), workFormatIds: [0] })
        .workFormatIds,
    ).toBeDefined();
  });
});
