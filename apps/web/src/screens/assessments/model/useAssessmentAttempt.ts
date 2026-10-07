import { useEffect, useState } from 'react';

import {
  type AssessmentAttempt,
  getAssessmentAttempt,
} from '@/entities/assessment';

import { getAttemptErrorMessage } from '../lib';

type AttemptState = {
  attemptId: string;
  attempt?: AssessmentAttempt;
  error?: string;
};

export const useAssessmentAttempt = (attemptId: string) => {
  const [state, setState] = useState<AttemptState>({ attemptId });

  useEffect(() => {
    const controller = new AbortController();

    void getAssessmentAttempt(attemptId, controller.signal)
      .then((attempt) => {
        if (!controller.signal.aborted) setState({ attemptId, attempt });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({ attemptId, error: getAttemptErrorMessage(error) });
      });

    return () => controller.abort();
  }, [attemptId]);

  if (state.attemptId !== attemptId) {
    return { attempt: undefined, error: undefined, loading: true };
  }

  return {
    attempt: state.attempt,
    error: state.error,
    loading: !state.attempt && !state.error,
  };
};
