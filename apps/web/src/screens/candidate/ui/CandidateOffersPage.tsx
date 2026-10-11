import { PageWrapper } from '@/shared/ui';
import { IncomingOffers } from '@/features/candidate';
import { CandidateProfileGate } from '@/features/candidate/profile';

import { CANDIDATE_PAGE_HEADERS } from '../constants';
import { CandidateOffersBodySkeleton } from './CandidateLoadingShells';
import { CandidatePageHeader } from './CandidatePageHeader';

// Шапка вне проверки профиля: пока она идёт, видна сразу.
export const CandidateOffersPage = () => {
  return (
    <PageWrapper>
      <CandidatePageHeader {...CANDIDATE_PAGE_HEADERS.offers} />
      <CandidateProfileGate fallback={<CandidateOffersBodySkeleton />}>
        <IncomingOffers />
      </CandidateProfileGate>
    </PageWrapper>
  );
};
