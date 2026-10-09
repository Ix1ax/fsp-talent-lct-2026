'use client';

import { useEffect, useRef, useState } from 'react';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';

/** Loaders must be memoized; aborted responses never replace the current scope. */
export const useRemoteData = <T>(
  load: (signal: AbortSignal) => Promise<T>,
  externalRevision = 0,
  enabled = true,
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
  const completed = useRef<{
    load: typeof load;
    revision: number;
    externalRevision: number;
  } | null>(null);
  useEffect(() => {
    if (
      !enabled ||
      (completed.current?.load === load &&
        completed.current.revision === revision &&
        completed.current.externalRevision === externalRevision)
    )
      return;
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
  return {
    ...current,
    loading: enabled && current.loading,
    retry: () => setRevision((v) => v + 1),
  };
};
