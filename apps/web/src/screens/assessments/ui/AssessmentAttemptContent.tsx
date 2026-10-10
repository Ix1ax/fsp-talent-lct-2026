import { AssessmentRunner } from '@/features/assessment-runner';

import type { useAssessmentAttempt } from '../model';

interface AssessmentAttemptContentProps {
  state: ReturnType<typeof useAssessmentAttempt>;
}

export const AssessmentAttemptContent = ({
  state,
}: AssessmentAttemptContentProps) => {
  const { attempt, error, loading } = state;
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Загружаем попытку…</p>}
      {attempt && (
        <AssessmentRunner key={attempt.id} initialAttempt={attempt} />
      )}
    </>
  );
};
