import { ensureClientAccessToken } from '@/shared/api';
import { getCandidateEducations } from '@/entities/candidate/education';
import { getCandidateExperiences } from '@/entities/candidate/experience';
import { getCandidateFullProfileClient } from '@/entities/candidate/profile';

import type { ProfileStep } from '../constants';
import { getSavedProfileSteps } from './getSavedProfileSteps';

export const loadProfileStepStatuses = async (signal: AbortSignal) => {
  await ensureClientAccessToken();
  signal.throwIfAborted();
  const full = await getCandidateFullProfileClient(signal);
  if (!full.profile) {
    return {
      savedSteps: getSavedProfileSteps(full),
      unavailableSteps: [] as ProfileStep[],
    };
  }

  const [experience, education] = await Promise.allSettled([
    getCandidateExperiences(signal),
    getCandidateEducations(signal),
  ]);

  const unavailableSteps: ProfileStep[] = [];

  if (experience.status === 'rejected') unavailableSteps.push('experience');
  if (education.status === 'rejected') unavailableSteps.push('education');

  return {
    unavailableSteps,
    savedSteps: getSavedProfileSteps(
      full,
      experience.status === 'fulfilled' ? experience.value.items.length : 0,
      education.status === 'fulfilled' ? education.value.items.length : 0,
    ),
  };
};
