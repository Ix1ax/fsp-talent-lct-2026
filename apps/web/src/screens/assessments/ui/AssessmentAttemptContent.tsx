import { AsyncState } from '@/shared/ui';
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
      {error && (
        <AsyncState error title="Попытка недоступна" description={error} />
      )}
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Загружаем попытку…
        </p>
      )}
      {attempt && (
        <AssessmentRunner key={attempt.id} initialAttempt={attempt} />
      )}
    </>
  );
};
