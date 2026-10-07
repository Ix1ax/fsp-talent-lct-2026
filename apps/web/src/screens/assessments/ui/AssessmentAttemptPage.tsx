'use client';

import Link from 'next/link';

import { Button } from '@/shared/ui';
import { formatDate } from '@/shared/utils';

import { useAssessmentAttempt } from '../model';
import { AssessmentQuestions } from './AssessmentQuestions';

interface AssessmentAttemptPageProps {
  attemptId: string;
}

export const AssessmentAttemptPage = ({
  attemptId,
}: AssessmentAttemptPageProps) => {
  const { attempt, error, loading } = useAssessmentAttempt(attemptId);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <Button asChild variant="outline">
        <Link href="/candidate/assessments">К списку тестов</Link>
      </Button>
      <h1 className="text-3xl font-semibold">Попытка тестирования</h1>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Загружаем попытку…</p>}
      {attempt?.result && (
        <p>
          Результат: {attempt.result.scorePercent}%. Проходной балл:{' '}
          {attempt.result.passScore}%.{' '}
          {attempt.result.passed ? 'Тест пройден.' : 'Тест не пройден.'}
        </p>
      )}
      {attempt && !attempt.result && (
        <>
          <p>Дедлайн: {formatDate(attempt.deadlineAt)}</p>
          <p role="status">
            Попытка загружена. Интерфейс ответа на задания будет добавлен на
            следующем этапе.
          </p>
          <AssessmentQuestions questions={attempt.questions} />
        </>
      )}
    </main>
  );
};
