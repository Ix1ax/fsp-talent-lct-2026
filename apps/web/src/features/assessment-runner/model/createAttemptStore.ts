import { ApiError } from '@/shared/api';
import type { AssessmentAttempt } from '@/entities/assessment';

import { getAssessmentError } from '../lib';

type AttemptSnapshot = {
  attempt: AssessmentAttempt;
  busy: boolean;
  resultLoading: boolean;
  closed: boolean;
  consentBlocked: boolean;
  error: string;
  answersRevision: number;
};

export const createAttemptStore = (initial: AssessmentAttempt) => {
  let snapshot: AttemptSnapshot = {
    attempt: initial,
    busy: false,
    resultLoading: false,
    closed: initial.status !== 'active' || !!initial.result,
    consentBlocked: false,
    error: '',
    answersRevision: 0,
  };

  const listeners = new Set<() => void>();

  const update = (patch: Partial<AttemptSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };

  const apply = (attempt: AssessmentAttempt) => {
    if (snapshot.closed && attempt.status === 'active' && !attempt.result)
      return;
    update({
      attempt,
      closed: !!attempt.result || attempt.status !== 'active',
    });
  };

  const handleError = (error: unknown, fallback: string) => {
    const code = error instanceof ApiError ? error.code : undefined;
    update({
      error: getAssessmentError(error, fallback),
      closed: snapshot.closed || code === 'attempt_closed',
      consentBlocked: snapshot.consentBlocked || code === 'consent_required',
    });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update,
    apply,
    handleError,
    answersChanged: () =>
      update({ answersRevision: snapshot.answersRevision + 1 }),
    canSave: () =>
      !snapshot.closed &&
      !snapshot.consentBlocked &&
      Date.now() < Date.parse(snapshot.attempt.deadlineAt),
  };
};

export type AttemptStore = ReturnType<typeof createAttemptStore>;
