'use client';

import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, PageHeader, PageWrapper } from '@/shared/ui';
import { CandidateOnboardingCard } from '@/features/candidate/onboarding';

import { CANDIDATE_PAGE_HEADERS } from '../constants';
import { CandidateDevelopmentLinks } from './CandidateDevelopmentLinks';
import { CandidateProfileStepLinks } from './CandidateProfileStepLinks';

export const CandidateCabinetHeader = () => {
  return (
    <PageHeader>
      <PageHeader.Row>
        <PageHeader.Content>
          <PageHeader.Title>
            {CANDIDATE_PAGE_HEADERS.cabinet.title}
          </PageHeader.Title>
          <PageHeader.Description>
            {CANDIDATE_PAGE_HEADERS.cabinet.description}
          </PageHeader.Description>
        </PageHeader.Content>
        {/* На телефоне эти разделы есть в нижней навигации, а «Следующий шаг» должен попадать в первый экран. */}
        <PageHeader.Actions className="grid w-full grid-cols-1 max-sm:hidden sm:grid-cols-2 lg:w-auto lg:grid-cols-1">
          <Button asChild variant="outline">
            <Link href={STATIC_ROUTES.OFFERS}>Входящие предложения</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={STATIC_ROUTES.CANDIDATE_TASKS}>Задания компаний</Link>
          </Button>
        </PageHeader.Actions>
      </PageHeader.Row>
    </PageHeader>
  );
};

export const CandidateProfileOverview = () => {
  return (
    <PageWrapper>
      <CandidateCabinetHeader />
      <CandidateOnboardingCard />
      <CandidateProfileStepLinks />
      <CandidateDevelopmentLinks />
    </PageWrapper>
  );
};
