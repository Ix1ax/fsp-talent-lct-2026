'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';

type RemoteDataLoader<T> = (signal: AbortSignal) => Promise<T>;

type RemoteDataRequest<T> = {
  load: RemoteDataLoader<T>;
  revision: number;
  externalRevision: number;
};

type RemoteDataState<T> = RemoteDataRequest<T> & {
  data?: T;
  error: string;
  loading: boolean;
};

export const useRemoteData = <T>(
  load: RemoteDataLoader<T>,
  externalRevision = 0,
  enabled = true,
) => {
  const [state, setState] = useState<RemoteDataState<T>>({
    load,
    revision: -1,
    externalRevision: -1,
    error: '',
    loading: true,
  });
  const [revision, setRevision] = useState(0);
  const completed = useRef<RemoteDataRequest<T> | null>(null);

  useEffect(() => {
    if (
      !enabled ||
      (completed.current?.load === load &&
        completed.current.revision === revision &&
        completed.current.externalRevision === externalRevision)
    ) {
      return;
    }

    const controller = new AbortController();
    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          completed.current = { load, revision, externalRevision };
          setState({
            load,
            revision,
            externalRevision,
            data,
            error: '',
            loading: false,
          });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          completed.current = { load, revision, externalRevision };
          setState({
            load,
            revision,
            externalRevision,
            error: getApiErrorMessage(error),
            loading: false,
          });
        }
      });

    return () => controller.abort();
  }, [load, revision, externalRevision, enabled]);

  const current =
    state.load === load &&
    state.revision === revision &&
    state.externalRevision === externalRevision
      ? state
      : { loading: true, error: '', data: undefined };

  const updateData = useCallback(
    (update: (data: T) => T) => {
      setState((previous) => {
        if (
          previous.load !== load ||
          previous.revision !== revision ||
          previous.externalRevision !== externalRevision ||
          previous.data === undefined
        )
          return previous;
        return { ...previous, data: update(previous.data) };
      });
    },
    [load, revision, externalRevision],
  );

  return {
    ...current,
    updateData,
    loading: enabled && current.loading,
    retry: () => setRevision((v) => v + 1),
  };
};
