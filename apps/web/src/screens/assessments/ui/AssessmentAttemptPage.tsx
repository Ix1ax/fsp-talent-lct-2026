'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '@/shared/ui';
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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-8 sm:px-6 sm:py-10">
      <Button asChild variant="outline" className="self-start">
        <Link href="/candidate/assessments">
          <ArrowLeftIcon aria-hidden="true" />К списку тестов
        </Link>
      </Button>
      <h1 className="text-3xl font-semibold">Тестирование навыков</h1>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Загружаем попытку…</p>}
      {attempt && (
        <AssessmentRunner key={attempt.id} initialAttempt={attempt} />
      )}
    </main>
  );
};
