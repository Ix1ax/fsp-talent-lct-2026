'use client';

import { useEffect, useState } from 'react';

import { getRecommendations } from '@/entities/employer-need';

import type { NeedMatchesResult } from './types';

export const useNeedMatches = (
  companyId: string,
  needId: string,
  load: typeof getRecommendations = getRecommendations,
) => {
  const [result, setResult] = useState<NeedMatchesResult | null>(null);

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
