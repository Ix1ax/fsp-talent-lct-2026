'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, FadeIn, PageWrapper } from '@/shared/ui';

import { useAssessmentAttempt } from '../model';
import { AssessmentAttemptContent } from './AssessmentAttemptContent';

interface AssessmentAttemptPageProps {
  attemptId: string;
}

export const AssessmentAttemptPage = ({
  attemptId,
}: AssessmentAttemptPageProps) => {
  const state = useAssessmentAttempt(attemptId);

  return (
    <PageWrapper>
      <Button asChild variant="outline" className="min-h-11 self-start">
        <Link href={STATIC_ROUTES.CANDIDATE_ASSESSMENTS}>
          <ArrowLeftIcon aria-hidden="true" />К списку тестов
        </Link>
      </Button>
      <FadeIn>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Тестирование навыков
        </h1>
      </FadeIn>
      <AssessmentAttemptContent state={state} />
    </PageWrapper>
  );
};
