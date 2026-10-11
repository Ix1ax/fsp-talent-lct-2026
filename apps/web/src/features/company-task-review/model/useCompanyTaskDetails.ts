import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/shared/api';
import { useAsyncMutation, useRemoteData } from '@/shared/hooks';
import { toast } from '@/shared/ui';
import { type Company } from '@/entities/company';
import {
  closeCompanyTask,
  type CompanyTask,
  downloadCompanyTask,
  getCompanyTask,
} from '@/entities/company-task';

export type CompanyTaskDetailsOptions = {
  company: Company;
  taskId: string;
  onTaskChange: (task: CompanyTask) => void;
  onBusyChange: (busy: boolean) => void;
};

export const useCompanyTaskDetails = ({
  company,
  taskId,
  onTaskChange,
  onBusyChange,
}: CompanyTaskDetailsOptions) => {
  const load = useCallback(
    (signal: AbortSignal) => getCompanyTask(company.id, taskId, signal),
    [company.id, taskId],
  );
  const remote = useRemoteData(load);
  const task = remote.data;
  const mutation = useAsyncMutation();
  const [action, setAction] = useState<'download' | 'close' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const busy = mutation.pending || reviewBusy;
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  useEffect(() => () => request.current?.abort(), []);

  const download = async () => {
    if (!task || busy) return;
    const controller = new AbortController();
    request.current = controller;
    setAction('download');
    try {
      await mutation.run(async () => {
        const blob = await downloadCompanyTask(
          company.id,
          task.id,
          controller.signal,
        );
        controller.signal.throwIfAborted();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = task.file.originalName;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    } catch (error) {
      if (
        !controller.signal.aborted &&
        error instanceof ApiError &&
        error.status === 404
      )
        remote.retry();
    } finally {
      if (!controller.signal.aborted) setAction(null);
    }
  };

  const close = async () => {
    if (!task || busy) return false;
    const controller = new AbortController();
    request.current = controller;
    setAction('close');
    try {
      await mutation.run(async () => {
        const updated = await closeCompanyTask(
          company.id,
          task.id,
          controller.signal,
        );
        controller.signal.throwIfAborted();
        remote.updateData(() => updated);
        onTaskChange(updated);
        toast.success('Приём решений закрыт');
      });
      return true;
    } catch {
      return false;
    } finally {
      if (!controller.signal.aborted) setAction(null);
    }
  };

  return {
    remote,
    task,
    mutation,
    action,
    confirm,
    setConfirm,
    setReviewBusy,
    busy,
    download,
    close,
  };
};
