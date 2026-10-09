'use client';

import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';

/** Loaders must be memoized; aborted responses never replace the current scope. */
export const useRemoteData = <T>(
  load: (signal: AbortSignal) => Promise<T>,
  externalRevision = 0,
) => {
  const [state, setState] = useState<{
    load: typeof load;
    revision: number;
    externalRevision: number;
    data?: T;
    error: string;
    loading: boolean;
  }>({ load, revision: -1, externalRevision: -1, error: '', loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({
            load,
            revision,
            externalRevision,
            data,
            error: '',
            loading: false,
          });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            load,
            revision,
            externalRevision,
            error: getApiErrorMessage(error),
            loading: false,
          });
      });
    return () => controller.abort();
  }, [load, revision, externalRevision]);
  const current =
    state.load === load &&
    state.revision === revision &&
    state.externalRevision === externalRevision
      ? state
      : { loading: true, error: '', data: undefined };
  return { ...current, retry: () => setRevision((v) => v + 1) };
};
