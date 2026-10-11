import { ensureClientAccessToken } from '@/shared/api';
import { getCandidateEducations } from '@/entities/candidate/education';
import { getCandidateExperiences } from '@/entities/candidate/experience';
import { getCandidateFullProfileClient } from '@/entities/candidate/profile';

import { getSavedProfileSteps } from './getSavedProfileSteps';

export const loadProfileStepStatuses = async (signal: AbortSignal) => {
  await ensureClientAccessToken();
  signal.throwIfAborted();
  const full = await getCandidateFullProfileClient(signal);
  if (!full.profile) return getSavedProfileSteps(full);

  const [experience, education] = await Promise.all([
    getCandidateExperiences(signal),
    getCandidateEducations(signal),
  ]);

  return getSavedProfileSteps(
    full,
    experience.items.length,
    education.items.length,
  );
};
