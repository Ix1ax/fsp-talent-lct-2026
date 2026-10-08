import { useState } from 'react';

import { ensureClientAccessToken } from '@/shared/api';

import { getResumeImportError } from '../lib/importError';
import { createResumeRecordSaver } from './createResumeRecordSaver';
import type { ResumeRecordStatus } from './types';

type ResumeRecordsOptions = {
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onSaved: () => void;
};

export const useResumeRecords = (options: ResumeRecordsOptions) => {
  const [statuses, setStatuses] = useState<Record<number, ResumeRecordStatus>>(
    {},
  );
  const [controller] = useState(() =>
    createResumeRecordSaver({
      isBusy: () => false,
      authenticate: ensureClientAccessToken,
      onBusyChange: options.onBusyChange,
      onStatus: (index, status) =>
        setStatuses((current) => ({ ...current, [index]: status })),
      onSaved: options.onSaved,
      getError: getResumeImportError,
    }),
  );
  return {
    statuses,
    dismiss: controller.dismiss,
    save: (index: number, action: () => Promise<{ id: string }>) =>
      controller.save(index, action, {
        isBusy: () => options.busy,
        onBusyChange: options.onBusyChange,
        onSaved: options.onSaved,
      }),
  };
};
