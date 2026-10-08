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
  work_formats: { step: 'profile', fieldId: 'profile-work-formats-hint' },
  work_format: { step: 'profile', fieldId: 'profile-work-formats-hint' },
  search_status: { step: 'profile', fieldId: 'profile-search-status' },
  summary: { step: 'profile', fieldId: 'profile-summary' },
  salary: { step: 'profile', fieldId: 'profile-salaryMinRub' },
  salary_min_rub: { step: 'profile', fieldId: 'profile-salaryMinRub' },
  headline: { step: 'profile', fieldId: 'profile-headline' },
  city: { step: 'profile', fieldId: 'profile-city' },
  avatar: { step: 'profile', fieldId: 'candidate-avatar-section' },
};
