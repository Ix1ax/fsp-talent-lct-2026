import {
  type CandidateFullProfile,
  getConsentPermissions,
} from '@/entities/candidate';

import type { ProfileStep } from '../constants';

export const getSavedProfileSteps = (
  full?: CandidateFullProfile,
  experienceCount = 0,
): ProfileStep[] => {
  if (!full) return [];
  const saved: ProfileStep[] = [];
  if (getConsentPermissions(full.consents).processing) saved.push('consents');
  if (full.profile) saved.push('profile');
  if (full.contacts) saved.push('contacts');
  if (full.profile && experienceCount > 0) saved.push('experience');
  if (full.skills.length > 0) saved.push('skills');
  if (full.readiness.readyToPublish) saved.push('readiness');
  return saved;
};
