import { useEffect } from 'react';

import type { createAssessmentActions } from './createAssessmentActions';
import type { AttemptStore } from './createAttemptStore';

type ResultPollingOptions = {
  enabled: boolean;
  store: AttemptStore;
  actions: ReturnType<typeof createAssessmentActions>;
};

export const useAssessmentResultPolling = ({
  enabled,
  store,
  actions,
}: ResultPollingOptions) => {
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      const status = await actions.refreshResult(controller.signal);
      if (
        controller.signal.aborted ||
        status === 'completed' ||
        store.getSnapshot().attempt.result
      )
        return;
      if (status === 'pending' || status === 'busy') {
        timer = setTimeout(() => {
          void poll();
        }, 2000);
      }
    };

    void poll();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, store, actions]);
};
