import { useEffect, useState } from 'react';

import {
  type AssessmentAttempt,
  getAssessmentAttempt,
} from '@/entities/assessment';

import { getAttemptErrorMessage } from '../lib';

type AttemptState = {
  attemptId: string;
  revision: number;
  attempt?: AssessmentAttempt;
  error?: string;
};

export const useAssessmentAttempt = (attemptId: string) => {
  const [revision, setRevision] = useState(0);
  const retry = () => setRevision((value) => value + 1);
  const [state, setState] = useState<AttemptState>({ attemptId, revision });

  useEffect(() => {
    const controller = new AbortController();

    void getAssessmentAttempt(attemptId, controller.signal)
      .then((attempt) => {
        if (!controller.signal.aborted)
          setState({ attemptId, revision, attempt });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            attemptId,
            revision,
            error: getAttemptErrorMessage(error),
          });
      });

    return () => controller.abort();
  }, [attemptId, revision]);

  if (state.attemptId !== attemptId || state.revision !== revision) {
    return { attempt: undefined, error: undefined, loading: true, retry };
  }

  return {
    retry,
    attempt: state.attempt,
    error: state.error,
    loading: !state.attempt && !state.error,
  };
};
