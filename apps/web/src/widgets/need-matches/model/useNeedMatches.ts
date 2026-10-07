'use client';
import { useEffect, useState } from 'react';

import {
  listRecommendations,
  type RecommendationPage,
} from '@/entities/employer-need';
export const useNeedMatches = (
  companyId: string,
  needId: string,
  load: typeof listRecommendations = listRecommendations,
) => {
  const [result, setResult] = useState<{
    key: string;
    data: RecommendationPage | null;
    error: string;
  } | null>(null);
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const requestKey = [companyId, needId, offset, retry].join(':');
  const data = result?.key === requestKey ? result.data : null;
  const error = result?.key === requestKey ? result.error : '';
  useEffect(() => {
    const controller = new AbortController();
    load(companyId, needId, offset, controller.signal)
      .then((v) => {
        if (!controller.signal.aborted)
          setResult({ key: requestKey, data: v, error: '' });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({
            key: requestKey,
            data: null,
            error:
              'Подборка временно недоступна. Условия потребности сохранены.',
          });
      });
    return () => controller.abort();
  }, [load, companyId, needId, offset, retry, requestKey]);
  return {
    data,
    error,
    offset,
    setOffset,
    retry: () => setRetry((v) => v + 1),
  };
};
