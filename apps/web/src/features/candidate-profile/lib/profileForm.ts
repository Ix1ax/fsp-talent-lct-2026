import type { CandidateProfile } from '@/entities/candidate-profile';
import type {
  CreateCandidateProfileInput,
  UpdateCandidateProfileInput,
} from '@/entities/candidate-profile';

import type { ProfileFormValues } from '../model';

export const toProfileFormValues = (
  profile?: CandidateProfile,
): ProfileFormValues => ({
  headline: profile?.headline ?? '',
  summary: profile?.summary ?? '',
  city: profile?.city ?? '',
  timezone: profile?.timezone ?? '',
  experienceYears: String(
    Number(((profile?.experienceMonths ?? 0) / 12).toFixed(1)),
  ),
  salaryMinRub: profile?.salaryMinRub?.toString() ?? '',
  searchStatus: profile?.searchStatus ?? 'hidden',
  workFormatIds: [...(profile?.workFormatIds ?? [])],
});

const optionalText = (value: string): string | null => value.trim() || null;

export const mergeProfileDraft = (
  profile: CandidateProfile,
  draft: ProfileFormValues,
  changedFields: (keyof ProfileFormValues)[],
): ProfileFormValues => ({
  ...toProfileFormValues(profile),
  ...Object.fromEntries(changedFields.map((key) => [key, draft[key]])),
});

export const toProfileInput = (
  values: ProfileFormValues,
): CreateCandidateProfileInput => ({
  headline: optionalText(values.headline),
  summary: optionalText(values.summary),
  city: optionalText(values.city),
  timezone: optionalText(values.timezone),
  experienceMonths: Math.round(Number(values.experienceYears) * 12),
  salaryMinRub: values.salaryMinRub === '' ? null : Number(values.salaryMinRub),
  searchStatus: values.searchStatus,
  workFormatIds: [...values.workFormatIds],
});

export const buildProfilePatch = (
  profile: CandidateProfile,
  values: ProfileFormValues,
): UpdateCandidateProfileInput => {
  const current = toProfileInput(toProfileFormValues(profile));
  const next = toProfileInput(values);
  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => {
      const previous = current[key as keyof CreateCandidateProfileInput];
      if (Array.isArray(value) && Array.isArray(previous))
        return (
          [...value].sort((a, b) => a - b).join(',') !==
          [...previous].sort((a, b) => a - b).join(',')
        );
      return value !== previous;
    }),
  );
};
