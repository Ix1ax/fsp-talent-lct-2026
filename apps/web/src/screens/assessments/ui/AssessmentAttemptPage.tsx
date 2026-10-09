'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

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
    <main className="container-page page-rhythm flex flex-1 flex-col gap-6">
      <Button asChild variant="outline" className="min-h-11 self-start">
        <Link href="/candidate/assessments">
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
