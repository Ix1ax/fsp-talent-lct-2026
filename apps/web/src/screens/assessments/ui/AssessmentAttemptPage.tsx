'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, FadeIn } from '@/shared/ui';
import { AssessmentRunner } from '@/features/assessment-runner';

import { useAssessmentAttempt } from '../model';

interface AssessmentAttemptPageProps {
  attemptId: string;
}

export const AssessmentAttemptPage = ({
  attemptId,
}: AssessmentAttemptPageProps) => {
  const { attempt, error, loading } = useAssessmentAttempt(attemptId);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
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
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Загружаем попытку…</p>}
      {attempt && (
        <AssessmentRunner key={attempt.id} initialAttempt={attempt} />
      )}
    </main>
  );
};
