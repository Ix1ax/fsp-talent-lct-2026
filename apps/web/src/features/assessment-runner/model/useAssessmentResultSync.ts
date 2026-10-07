import { useEffect, useState } from 'react';

import { CANDIDATE_DATA_UPDATED_EVENT } from '@/shared/contants';
import {
  type AssessmentResult,
  getAvailableAssessments,
} from '@/entities/assessment';
import { getCandidateFullProfileClient } from '@/entities/candidate-profile';

export const useAssessmentResultSync = (result: AssessmentResult | null) => {
  const [revision, setRevision] = useState(0);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    if (!result) return;
    const controller = new AbortController();

    const sync = async () => {
      const responses = await Promise.allSettled([
        getCandidateFullProfileClient(controller.signal),
        getAvailableAssessments(controller.signal),
      ]);

      if (controller.signal.aborted) return;

      window.dispatchEvent(new Event(CANDIDATE_DATA_UPDATED_EVENT));
      setSyncError(
        responses.some((response) => response.status === 'rejected')
          ? 'Результат сохранён, но не удалось обновить профиль или список тестов.'
          : '',
      );
    };
    void sync();
    return () => controller.abort();
  }, [result, revision]);

  return { syncError, retrySync: () => setRevision((value) => value + 1) };
};
