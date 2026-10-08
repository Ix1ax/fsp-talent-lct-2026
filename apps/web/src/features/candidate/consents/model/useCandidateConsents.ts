import { useEffect, useState } from 'react';

import { createConsentsController } from './createConsentsController';
import {
  INITIAL_CONSENTS_STATE,
  type UseCandidateConsentsOptions,
} from './types';

export const useCandidateConsents = (options: UseCandidateConsentsOptions) => {
  const [state, setState] = useState(INITIAL_CONSENTS_STATE);
  const [controller] = useState(() =>
    createConsentsController(options, setState),
  );

  useEffect(() => {
    controller.setOptions(options);
  }, [controller, options]);

  return {
    ...state,
    loadHistory: controller.loadHistory,
    retrySync: controller.retrySync,
    grant: controller.grant,
    revoke: controller.revoke,
  };
};
