import { getClientCatalogs } from '@/entities/catalog';
import { loadCandidateOnboarding } from '@/features/candidate/onboarding';

export const loadCandidateSurvey = async (signal: AbortSignal) => {
  const [onboarding, catalogs] = await Promise.all([
    loadCandidateOnboarding(signal),
    getClientCatalogs(signal),
  ]);
  return { onboarding, catalogs };
};

export type CandidateSurveyData = Awaited<
  ReturnType<typeof loadCandidateSurvey>
>;
