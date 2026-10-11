'use client';

import { usePathname } from 'next/navigation';

import { STATIC_ROUTES } from '@/shared/contants';
import { PageWrapper, Skeleton } from '@/shared/ui';
import { AssessmentsLoading } from '@/screens/assessments';
import {
  CandidateCabinetLoading,
  CandidateFSPLoading,
  CandidateOffersLoading,
  CandidateProfileLoading,
  CandidateSurveyLoading,
  PROFILE_STEPS,
} from '@/screens/candidate';
import {
  TaskDetailsLoading,
  TasksLoading,
  TaskSubmissionLoading,
  TaskSubmissionsLoading,
} from '@/screens/company-tasks';

// Для страниц с динамическим заголовком, например прохождения теста.
const GenericLoading = () => {
  return (
    <PageWrapper role="status" aria-busy="true" aria-label="Загрузка">
      <span className="sr-only">Загрузка…</span>
      <div aria-hidden="true" className="grid gap-4">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
};

const isUnder = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

// Эта граница загрузки общая для всех страниц кандидата, поэтому каркас
// выбирается по адресу: у каждой страницы своя статичная шапка.
const CandidateRouteLoading = () => {
  const pathname = usePathname();

  if (pathname === STATIC_ROUTES.CANDIDATE) return <CandidateCabinetLoading />;
  if (
    PROFILE_STEPS.some(
      (step) => pathname === `${STATIC_ROUTES.CANDIDATE}/${step.id}`,
    )
  )
    return <CandidateProfileLoading />;
  if (pathname === STATIC_ROUTES.CANDIDATE_ASSESSMENTS)
    return <AssessmentsLoading />;
  if (pathname === STATIC_ROUTES.OFFERS) return <CandidateOffersLoading />;
  if (pathname === STATIC_ROUTES.CANDIDATE_SURVEY)
    return <CandidateSurveyLoading />;
  if (pathname === STATIC_ROUTES.CANDIDATE_FSP) return <CandidateFSPLoading />;
  if (pathname === STATIC_ROUTES.CANDIDATE_TASKS) return <TasksLoading />;
  if (isUnder(pathname, STATIC_ROUTES.CANDIDATE_TASKS))
    return <TaskDetailsLoading />;
  if (pathname === STATIC_ROUTES.CANDIDATE_TASK_SUBMISSIONS)
    return <TaskSubmissionsLoading />;
  if (isUnder(pathname, STATIC_ROUTES.CANDIDATE_TASK_SUBMISSIONS))
    return <TaskSubmissionLoading />;

  return <GenericLoading />;
};

export default CandidateRouteLoading;
