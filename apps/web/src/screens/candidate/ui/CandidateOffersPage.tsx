import { PageWrapper } from '@/shared/ui';
import { IncomingOffers } from '@/features/candidate';
import { CandidateProfileGate } from '@/features/candidate/profile';

export const CandidateOffersPage = () => {
  return (
    <PageWrapper>
      <CandidateProfileGate>
        <IncomingOffers />
      </CandidateProfileGate>
    </PageWrapper>
  );
};
