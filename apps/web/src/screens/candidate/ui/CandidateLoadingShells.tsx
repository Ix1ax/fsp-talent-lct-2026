'use client';

import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageWrapper,
  RemoteStateSkeleton,
  Skeleton,
  Stagger,
} from '@/shared/ui';

import { CANDIDATE_PAGE_HEADERS, PROFILE_STEPS } from '../constants';
import { CandidateDevelopmentLinks } from './CandidateDevelopmentLinks';
import { CandidatePageHeader } from './CandidatePageHeader';
import { CandidateCabinetHeader } from './CandidateProfileOverview';
import { ProfileStepItem } from './ProfileStepItem';

// Каркасы загрузки страниц кандидата: статичная шапка и подписи видны сразу,
// скелетон — только на месте данных с сервера.

interface LoadingRegionProps {
  label: string;
  children: ReactNode;
}

const LoadingRegion = ({ label, children }: LoadingRegionProps) => {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
};

interface CardSkeletonProps {
  lines?: number;
}

const CardSkeleton = ({ lines = 2 }: CardSkeletonProps) => {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-5 sm:p-6">
      <Skeleton className="h-5 w-40 max-w-full" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={index === lines - 1 ? 'h-4 w-2/3' : 'h-4 w-full'}
        />
      ))}
    </div>
  );
};

export const CandidateCabinetLoading = () => {
  return (
    <PageWrapper>
      <CandidateCabinetHeader />
      <LoadingRegion label="Загружаем следующий шаг">
        <CardSkeleton lines={2} />
      </LoadingRegion>
      {/* Разделы статичны: до ответа сервера статус «Проверяем…». */}
      <nav aria-label="Разделы профиля">
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROFILE_STEPS.map((step, index) => (
            <ProfileStepItem
              key={step.id}
              step={step}
              number={index + 1}
              status="Проверяем…"
            />
          ))}
        </Stagger>
      </nav>
      <CandidateDevelopmentLinks />
    </PageWrapper>
  );
};

export const CandidateProfileLoading = () => {
  return (
    <PageWrapper variant="page">
      <div className="flex flex-col gap-8">
        <CandidatePageHeader {...CANDIDATE_PAGE_HEADERS.profile} back={false} />
        <LoadingRegion label="Загружаем профиль">
          <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <ol className="grid content-start gap-1 rounded-xl border bg-card p-4 text-sm text-muted-foreground max-lg:hidden">
              {PROFILE_STEPS.map((step, index) => (
                <li key={step.id} className="rounded-lg px-3 py-2">
                  {index + 1}. {step.title}
                </li>
              ))}
            </ol>
            <CardSkeleton lines={5} />
          </div>
        </LoadingRegion>
      </div>
    </PageWrapper>
  );
};

export const CandidateOffersBodySkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Предложения работодателей</CardTitle>
      </CardHeader>
      <CardContent>
        <LoadingRegion label="Загружаем предложения">
          <div className="grid gap-4">
            <CardSkeleton lines={2} />
            <CardSkeleton lines={2} />
          </div>
        </LoadingRegion>
      </CardContent>
    </Card>
  );
};

export const CandidateOffersLoading = () => {
  return (
    <PageWrapper>
      <CandidatePageHeader {...CANDIDATE_PAGE_HEADERS.offers} />
      <CandidateOffersBodySkeleton />
    </PageWrapper>
  );
};

export const CandidateSurveyLoading = () => {
  return (
    <PageWrapper>
      <CandidatePageHeader {...CANDIDATE_PAGE_HEADERS.survey} />
      <LoadingRegion label="Загружаем опрос">
        <RemoteStateSkeleton />
      </LoadingRegion>
    </PageWrapper>
  );
};

export const CandidateFSPLoading = () => {
  return (
    <PageWrapper>
      <CandidatePageHeader {...CANDIDATE_PAGE_HEADERS.fsp} />
      <LoadingRegion label="Загружаем достижения">
        <div className="max-w-4xl">
          <RemoteStateSkeleton />
        </div>
      </LoadingRegion>
    </PageWrapper>
  );
};
