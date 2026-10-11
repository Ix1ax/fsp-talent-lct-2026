'use client';

import { FadeIn, PageWrapper } from '@/shared/ui';
import { CandidateFSP } from '@/features/candidate/fsp';

import { CANDIDATE_PAGE_HEADERS } from '../constants';
import { CandidatePageHeader } from './CandidatePageHeader';

export const CandidateFSPPage = () => {
  return (
    <PageWrapper>
      <CandidatePageHeader {...CANDIDATE_PAGE_HEADERS.fsp} />
      <FadeIn className="max-w-4xl">
        <CandidateFSP />
      </FadeIn>
    </PageWrapper>
  );
};
