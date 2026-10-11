'use client';

import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, PageHeader, PageWrapper } from '@/shared/ui';
import { CandidateOnboardingCard } from '@/features/candidate/onboarding';

import { CandidateDevelopmentLinks } from './CandidateDevelopmentLinks';
import { CandidateProfileStepLinks } from './CandidateProfileStepLinks';

export const CandidateProfileOverview = () => {
  return (
    <PageWrapper>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Content>
            <PageHeader.Title>Мой кабинет</PageHeader.Title>
            <PageHeader.Description>
              Заполните профиль по разделам. Вы можете начать с любого шага и
              вернуться к остальным позже. Публикацией профиля управляете вы.
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
      <CandidateOnboardingCard />
      <CandidateProfileStepLinks />
      <CandidateDevelopmentLinks />
    </PageWrapper>
  );
};
