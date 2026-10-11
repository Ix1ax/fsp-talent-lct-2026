import { RemoteState } from '@/shared/ui';
import { AssessmentRunner } from '@/features/assessment-runner';

import type { useAssessmentAttempt } from '../model';

interface AssessmentAttemptContentProps {
  state: ReturnType<typeof useAssessmentAttempt>;
}

export const AssessmentAttemptContent = ({
  state,
}: AssessmentAttemptContentProps) => {
  const { attempt, error, loading, retry } = state;
  return (
    <RemoteState
      loading={loading}
      error={error}
      retry={retry}
      loadingLabel="Загружаем попытку…"
      errorTitle="Попытка недоступна"
    >
      {attempt && (
        <AssessmentRunner key={attempt.id} initialAttempt={attempt} />
      )}
    </RemoteState>
  );
};
