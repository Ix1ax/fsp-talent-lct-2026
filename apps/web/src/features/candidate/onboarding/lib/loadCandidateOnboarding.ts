import { getAssessmentAttempt } from '@/entities/assessment';
import { getCandidateOnboarding } from '@/entities/candidate/profile';

export const loadCandidateOnboarding = async (signal: AbortSignal) => {
  const onboarding = await getCandidateOnboarding(signal);
  const attempt = onboarding.latestAttempt;
  if (
    attempt?.status === 'active' &&
    Date.parse(attempt.deadlineAt) <= Date.now()
  ) {
    await getAssessmentAttempt(attempt.id, signal);
    return getCandidateOnboarding(signal);
  }
  return onboarding;
};
