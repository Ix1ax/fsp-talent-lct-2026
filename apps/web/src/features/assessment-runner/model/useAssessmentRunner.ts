import { useState, useSyncExternalStore } from 'react';

import { useCountdown, useUnsavedChanges } from '@/shared/hooks';
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

  const locked = remaining === 0 || state.closed || state.consentBlocked;

  useUnsavedChanges(!state.attempt.result && queue.dirty());
  useAssessmentResultPolling({
    enabled: !state.attempt.result && (remaining === 0 || state.closed),
    store,
    actions,
  });

  const update = (id: string, answer: AssessmentAnswer) => {
    if (!store.getSnapshot().busy && store.canSave()) queue.update(id, answer);
  };

  return { ...state, remaining, locked, queue, update, ...actions };
};
