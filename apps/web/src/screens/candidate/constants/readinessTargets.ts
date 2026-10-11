import { CANDIDATE_ELEMENT_IDS } from '@/shared/contants';

import type { ProfileStep } from './steps';

export type ReadinessTarget = {
  step: ProfileStep;
  fieldId?: string;
};

export const READINESS_TARGETS: Readonly<Record<string, ReadinessTarget>> = {
  consent_processing: { step: 'consents' },
  consent_publication: { step: 'consents' },
  profile: { step: 'profile' },
  profile_created: { step: 'profile' },
  contacts: { step: 'contacts' },
  skills: { step: 'skills' },
  experience: { step: 'experience' },
  education: { step: 'education' },
  work_formats: {
    step: 'profile',
    fieldId: CANDIDATE_ELEMENT_IDS.profile.workFormats.hint,
  },
  work_format: {
    step: 'profile',
    fieldId: CANDIDATE_ELEMENT_IDS.profile.workFormats.hint,
  },
  search_status: {
    step: 'profile',
    fieldId: CANDIDATE_ELEMENT_IDS.profile.searchStatus.input,
  },
  summary: {
    step: 'profile',
    fieldId: CANDIDATE_ELEMENT_IDS.profile.summary.input,
  },
  salary: {
    step: 'profile',
    fieldId: CANDIDATE_ELEMENT_IDS.profile.salaryMinRub.input,
  },
  salary_min_rub: {
    step: 'profile',
    fieldId: CANDIDATE_ELEMENT_IDS.profile.salaryMinRub.input,
  },
  headline: {
    step: 'profile',
    fieldId: CANDIDATE_ELEMENT_IDS.profile.headline.input,
  },
  city: { step: 'profile', fieldId: CANDIDATE_ELEMENT_IDS.profile.city.input },
  avatar: { step: 'profile', fieldId: CANDIDATE_ELEMENT_IDS.avatar.section },
};
