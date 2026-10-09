import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@/shared/api';
import { CANDIDATE_DATA_UPDATED_EVENT } from '@/shared/contants';
import { useGuardedRouter } from '@/shared/hooks';
import {
  type AvailableAssessment,
  getAvailableAssessments,
  getCurrentAssessment,
  startAssessment,
} from '@/entities/assessment';

import { getAssessmentLoadError, getAssessmentStartError } from '../lib';

export const useAssessments = () => {
  const router = useGuardedRouter();

  const [items, setItems] = useState<AvailableAssessment[]>([]);
  const [current, setCurrent] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'load' | 'start'>('load');
  const [selected, setSelected] = useState<AvailableAssessment>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      const [available, attempt] = await Promise.all([
        getAvailableAssessments(controller.signal),
        getCurrentAssessment(controller.signal).catch((err: unknown) => {
          if (err instanceof ApiError && err.code === 'attempt_not_found')
            return null;
          throw err;
        }),
      ]);

      if (controller.signal.aborted) return;
      setItems(available);
      setCurrent(attempt?.id);
    };

    void load()
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setErrorType('load');
        setError(getAssessmentLoadError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const reloadList = () => setReload((value) => value + 1);
    window.addEventListener(CANDIDATE_DATA_UPDATED_EVENT, reloadList);
    return () =>
      window.removeEventListener(CANDIDATE_DATA_UPDATED_EVENT, reloadList);
  }, []);

  const start = async () => {
    if (!selected || lock.current) return;

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      const attempt = await startAssessment({
        stackSkillId: selected.stackSkillId,
        specializationId: selected.specializationId,
        gradeId: selected.gradeId,
      });
      router.push(`/candidate/assessments/${attempt.id}`);
      setSelected(undefined);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.code === 'attempt_active' &&
        err.attemptId
      ) {
        router.replace(`/candidate/assessments/${err.attemptId}`);
        return;
      }
      if (
        err instanceof ApiError &&
        (err.code === 'network' || err.code === 'timeout' || err.status >= 500)
      ) {
        try {
          const activeAttempt = await getCurrentAssessment();
          if (activeAttempt.id) {
            router.replace(`/candidate/assessments/${activeAttempt.id}`);
            return;
          }
        } catch {
          // Keep the start error when the recovery check also fails.
        }
      }
      setErrorType('start');
      setError(getAssessmentStartError(err));
      setSelected(undefined);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const refresh = () => {
    if (lock.current || loading) return;
    setLoading(true);
    setError('');
    setReload((value) => value + 1);
  };

  const select = (test: AvailableAssessment) => {
    if (!loading && !lock.current && !current && test.canStart)
      setSelected(test);
  };

  const close = () => {
    if (!lock.current) setSelected(undefined);
  };

  return {
    items,
    current,
    loading,
    error,
    errorType,
    selected,
    busy,
    refresh,
    select,
    close,
    start,
  };
};
