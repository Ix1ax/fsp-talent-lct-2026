import { useState, useSyncExternalStore } from 'react';

import { useCountdown, useFocusGuard, useUnsavedChanges } from '@/shared/hooks';
import type {
  AssessmentAnswer,
  AssessmentAttempt,
} from '@/entities/assessment';

import { createAssessmentActions } from './createAssessmentActions';
import { createAssessmentAnswers } from './createAssessmentAnswers';
import { createAttemptStore } from './createAttemptStore';
import { useAssessmentResultPolling } from './useAssessmentResultPolling';

export const useAssessmentRunner = (initial: AssessmentAttempt) => {
  const [store] = useState(() => createAttemptStore(initial));
  const [queue] = useState(() => createAssessmentAnswers(initial, store));
  const [actions] = useState(() => createAssessmentActions(store, queue));
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const { timeLeft: remaining } = useCountdown(
    initial.timeLimitSec,
    initial.deadlineAt,
  );

  const { violations, limitReached, storageError } = useFocusGuard({
    enabled: !state.attempt.result && !state.closed && remaining > 0,
    storageKey: `assessment-focus:${initial.id}`,
    onLimitReached: actions.forceFinish,
  });
  const locked =
    limitReached || remaining === 0 || state.closed || state.consentBlocked;

  useUnsavedChanges(!state.attempt.result && queue.dirty());
  useAssessmentResultPolling({
    enabled: !state.attempt.result && (remaining === 0 || state.closed),
    store,
    actions,
  });

  const update = (id: string, answer: AssessmentAnswer) => {
    if (!limitReached && !store.getSnapshot().busy && store.canSave())
      queue.update(id, answer);
  };

  return {
    ...state,
    remaining,
    locked,
    violations,
    storageError,
    limitReached,
    queue,
    update,
    ...actions,
  };
};
