'use client';

import { useEffect, useState } from 'react';

import { taskErrorMessage } from '@/features/task-solution';

type TaskQueryResult<T> = {
  load: (signal: AbortSignal) => Promise<T>;
  revision: number;
  data?: T;
  error?: string;
};

type TaskQueryOptions = {
  keepPreviousData?: boolean;
};

export const useTaskQuery = <T>(
  load: (signal: AbortSignal) => Promise<T>,
  { keepPreviousData = false }: TaskQueryOptions = {},
) => {
  const [revision, setRevision] = useState(0);

  const [result, setResult] = useState<TaskQueryResult<T>>();

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ load, revision, data });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setResult({ load, revision, error: taskErrorMessage(cause) });
      });
    return () => controller.abort();
  }, [load, revision]);

  const current =
    result?.load === load && result.revision === revision ? result : undefined;
  const pending = !current;

  return {
    data: pending && keepPreviousData ? result?.data : current?.data,
    error: current?.error,
    pending,
    retry: () => setRevision((value) => value + 1),
  };
};
