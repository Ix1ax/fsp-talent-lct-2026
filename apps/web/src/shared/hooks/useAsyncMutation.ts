'use client';

import { useCallback, useRef, useState } from 'react';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';

export const useAsyncMutation = () => {
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      if (running.current) throw new Error('Сохранение уже выполняется');
      running.current = true;

      setPending(true);
      setError('');

      try {
        return await operation();
      } catch (e) {
        setError(getApiErrorMessage(e));
        throw e;
      } finally {
        running.current = false;
        setPending(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(''), []);

  return { run, pending, error, clearError };
};
